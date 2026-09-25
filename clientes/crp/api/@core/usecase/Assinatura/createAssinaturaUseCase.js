
const knex = require('../../../infrastructure/db/config/databaseConection.js')();
const bcrypt = require('bcrypt');
const authenticator = require('otplib');
const ErrorStackParser = require('error-stack-parser');
const dateNow = require('../../../infrastructure/gateways/functions/data/getToday.js');
const logExeption = require('../Logs/exeption/exeptionDocumentos.js');
const repositorioUsuario = require('../../../infrastructure/db/services/UsuarioRepositorio.js');
const repositorioPerfil = require('../../../infrastructure/db/services/PerfilUsuarioRepository.js');
const repositorioPerfilBiometria = require('../../../infrastructure/db/services/PerfilBiometriaRepository.js');
const repositorioDemarcacao = require('../../../infrastructure/db/services/DemarcacaoAssinaturaRepository.js');
const repositorioDesafio = require('../../../infrastructure/db/services/DesafioAutenticacaoRepository.js');
const repositorioDocumentoVerificacao = require('../../../infrastructure/db/services/DocumentoVerificacaoRepository.js');
const domainDesafio = require('../../domain/DesafioAutenticacao.js');
const domainEvento = require('../../domain/Evento.js');
const {
    applicationName,
    confiDoisFatores,
    statusDocumentos,
    statusSignatario,
    modoEstampaAssinatura,
    rabbitMQ,
    buckets,
    statusAplication,
    statusApp,
    eventoAuditoria,
    objetoAuditoria,
    eventoSistema,
    estampaAssinatura,
    tentativasAcesso,
    statusBiometriaAssinatura,
    assinaturaSessao,
    historico
} = require('../../../certs/index.js');
const { SHA } = require('../../../infrastructure/gateways/crypt/sha/index.js');
const bucketGateway = require('../../../infrastructure/gateways/Bucket/index.js');
const urlPublicaBucket = require('../../../infrastructure/gateways/Bucket/helpers/urlPublica.js');
const RabbitMQ = require('../../../infrastructure/gateways/rabbitmq/index.js');
const MessageDispatcher = require('../../../infrastructure/gateways/helpers/Dispatchers/Messages/index.js');
const { mascararCpf } = require('../../../infrastructure/gateways/PdfSign/aplicarAssinaturaPdf.js');
const moment = require('moment');
const LedgerDesafioAutenticacao = require('../../../infrastructure/gateways/helpers/AuditoriaAlteracao/LadgerDesafioAutenticacao/index.js');
const LedgerSignatario = require('../../../infrastructure/gateways/helpers/AuditoriaAlteracao/LadgerSignatario/index.js');
const LedgerEvento = require('../../../infrastructure/gateways/helpers/AuditoriaAlteracao/LadgerEvento/index.js');
const LedgerDocumentoPdf = require('../../../infrastructure/gateways/helpers/AuditoriaAlteracao/LadgerDocumentoPdf/index.js');
const SessionSave = require('../../../infrastructure/gateways/helpers/SessionSave/index.js');
const domainHistorico = require('../../domain/Historico.js');
const LadgerUsuario = require('../../../infrastructure/gateways/helpers/AuditoriaAlteracao/LadgerUsuario/index.js');
const Log = require('../../../Logs/index.js');

class createAssinaturaUseCase {

    #rabbitMQ = null;
    historico = [];

    constructor() {
        this.historico = [];
        this.#rabbitMQ = RabbitMQ.getInstance();
    }

    async getDocumentoAssinatura(data) {
        try {
            if (!data.user_id || !data.documento_id) return { status: false, msg: 'Sessão inválida.' }

            const gate = await this.#gateOnboarding(data.user_id);
            if (!gate.status) return gate;

            const documento = await knex('tab_documentos').select('*').where('id', data.documento_id).first();
            if (!documento) return { status: false, msg: 'Documento não encontrado.' }
            if (![statusDocumentos.documento_aguardando_assinatura, statusDocumentos.documento_assinado].includes(documento.status)) {
                return { status: false, msg: 'Documento não está disponível para assinatura.' }
            }

            const signatario = await knex('tab_signatarios')
                .select('*')
                .where('documento_id', data.documento_id)
                .andWhere('user_id', data.user_id)
                .andWhere('deletado', false)
                .first();
            if (!signatario) return { status: false, msg: 'Signatário não encontrado para este documento.' }

            if (signatario.ordem != null) {
                const anteriores = await knex('tab_signatarios')
                    .select('id', 'nome', 'ordem', 'status')
                    .where('documento_id', data.documento_id)
                    .andWhere('deletado', false)
                    .whereNotNull('ordem')
                    .andWhere('ordem', '<', signatario.ordem)
                    .whereNotIn('status', [statusSignatario.assinado]);
                if (anteriores.length > 0) {
                    return {
                        status: false,
                        msg: `Aguarde a assinatura de: ${anteriores.map((a) => a.nome).join(', ')}`,
                    }
                }
            }

            const dem = await repositorioDemarcacao.getDemarcacoesBySignatarioId({ signatario_id: signatario.id });
            if (!dem.status) return { status: false, msg: 'Erro ao buscar demarcações.' }

            let cpfPlain = '';
            try {
                const sha = new SHA(process.env.SHA);
                cpfPlain = sha.decrypt(signatario.cpf);
            } catch {
                cpfPlain = '';
            }

            const urlPdf = documento.bucket_valt_path
                ? await bucketGateway.Vault().urlDownloadGet({
                    objectName: documento.bucket_valt_path,
                    expiresInSeconds: buckets.temp_url_expiration * 10,
                })
                : await bucketGateway.Wip().urlDownloadGet({
                    objectName: documento.bucket_wip_path,
                    expiresInSeconds: buckets.temp_url_expiration * 10,
                });
            if (!urlPdf.status) return { status: false, msg: urlPdf.msg }

            return {
                status: true,
                msg: 'Documento carregado para assinatura.',
                data: {
                    documento: {
                        id: documento.id,
                        nome: documento.documento_nome,
                        status: documento.status,
                        hash_original: documento.hash_original,
                    },
                    signatario: {
                        id: signatario.id,
                        nome: signatario.nome,
                        email: signatario.email,
                        cpf_mascarado: mascararCpf(cpfPlain),
                        ordem: signatario.ordem,
                        status: signatario.status,
                        modo_visual: signatario.modo_visual,
                    },
                    demarcacoes: dem.data || [],
                    pdf_url: urlPublicaBucket(urlPdf.data.url),
                    modos: modoEstampaAssinatura,
                },
            }
        } catch (err) {
            console.log(err)
            return this.#erro(err, 'getDocumentoAssinatura');
        }
    }

    async solicitarAssinatura(data) {
        try {
            if (!data.user_id || !data.documento_id || !data.signatario_id || !data.id) return { status: false, msg: 'Sessão inválida.' }
            const gate = await this.#gateOnboarding(data.user_id);
            if (!gate.status) return gate;
            const modo = modoEstampaAssinatura.dados;
            const documento = await knex('tab_documentos').select('*').where('id', data.documento_id).first();
            if (!documento) return { status: false, msg: 'Documento não encontrado.' }
            if (documento.status !== statusDocumentos.documento_aguardando_assinatura) return { status: false, msg: 'Documento não está aguardando assinatura.' }
            if (!documento.termo_id) return { status: false, msg: 'Documento sem termo de responsabilidade vinculado.' }
            const user = await knex('tab_usuarios').select('*').where('id', data.user_id).andWhere('deletado', false).first();
            if (!user) return { status: false, msg: 'Usuário não localizado.' }
            const perfil = await knex('tab_perfil_usuario').select('*').where('user_id', user.id).andWhere('deletado', false).first();
            if (!perfil) return { status: false, msg: 'Perfil não cadastrado, complete seu cadastro antes de assinar o documento.', data: { next_step: 'CRIAR_PERFIL' } }
            if (assinaturaSessao.biometriaObrigatoria) {
                const biometria = await knex('tab_perfil_biometria').select('*').where('perfil_id', perfil.id).andWhere('deletado', false).first();
                if (!biometria) return { status: false, msg: 'Biometria não cadastrada, complete seu cadastro antes de assinar o documento.', data: { next_step: 'CADASTRAR_BIOMETRIA' } }
                if (!biometria.aprovado_por) return { status: false, msg: 'Cadastro biométrico em análise, aguarde a aprovação antes de assinar o documento.' }
                if (!biometria.rosto_embeddign && !biometria.bucket_wip_path) return { status: false, msg: 'Cadastro biométrico incompleto, contate o suporte para reenviar sua foto de referência.' }
            }
            const signatario = await knex('tab_signatarios')
                .select('*')
                .where('documento_id', data.documento_id)
                .andWhere('user_id', data.user_id)
                .andWhere('deletado', false)
                .first();
            if (!signatario) return { status: false, msg: 'Signatário não encontrado.' }
            if (signatario.id !== data.signatario_id) return { status: false, msg: 'Sessão não autorizada para este documento.' }
            const termoSignatario = await knex('tab_aceite_termo_responsabilidade').select('id').where('user_id', user.id).andWhere('termo_id', documento.termo_id).andWhere('documento_id', documento.id).andWhere('deletado', false).first();
            if (!termoSignatario) return { status: false, msg: 'Termo de responsabilidade não aceito, aceite o termo antes de assinar o documento.', data: { termo_id: documento.termo_id, documento_id: documento.id, next_step: 'ACEITAR_TERMO' } }
            // Biometria desligada: não existe linha em tab_identificacao_biometrica (nunca é criada
            // nesse modo) — o desafio de assinatura confirmado é o único gate de autenticação.
            let identificacao = null;
            let desafio = null;
            if (assinaturaSessao.biometriaObrigatoria) {
                identificacao = await knex('tab_identificacao_biometrica').select('*')
                    .where('documento_id', data.documento_id)
                    .andWhere('signatario_id', signatario.id)
                    .andWhere('user_id', user.id)
                    .andWhere('deletado', false)
                    .orderBy('data_criacao', 'desc')
                    .first();
                if (!identificacao || Number(identificacao.status) !== statusBiometriaAssinatura.validado) return { status: false, msg: 'Reconhecimento facial não confirmado, tente novamente em instantes.' }
                desafio = identificacao.desafio_id
                    ? await knex('tab_desafio_autenticacao').select('id', 'tipo_desafio', 'usado', 'user_id', 'document_id').where('id', identificacao.desafio_id).andWhere('deletado', false).first()
                    : null;
            } else {
                desafio = await knex('tab_desafio_autenticacao').select('id', 'tipo_desafio', 'usado', 'user_id', 'document_id')
                    .where('user_id', data.user_id)
                    .andWhere('document_id', data.documento_id)
                    .andWhere('tipo_desafio', confiDoisFatores.desafio.assinatura)
                    .andWhere('usado', true)
                    .andWhere('deletado', false)
                    .orderBy('criado_em', 'desc')
                    .first();
            }
            if (!desafio || desafio.tipo_desafio !== confiDoisFatores.desafio.assinatura || desafio.usado !== 1 && desafio.usado !== true
                || desafio.user_id !== data.user_id || desafio.document_id !== data.documento_id) return { status: false, msg: 'Autenticação do documento não confirmada.' }
            // Reconferência independente: mesmo com biometria confirmada, o desafio de 2FA/assinatura
            // tem que estar de fato confirmado — não basta o desafio_id pendurado na identificação.
            const desafiAutenticacao = await knex('tab_desafio_autenticacao')
                .select('id', 'tipo_desafio', 'usado', 'user_id', 'document_id')
                .where('user_id', data.user_id)
                .andWhere('document_id', data.documento_id)
                .andWhere('tipo_desafio', confiDoisFatores.desafio.assinatura)
                .andWhere('usado', true)
                .andWhere('deletado', false)
                .orderBy('criado_em', 'desc')
                .first();
            if (!desafiAutenticacao || desafiAutenticacao.tipo_desafio !== confiDoisFatores.desafio.assinatura || desafiAutenticacao.usado !== 1 && desafiAutenticacao.usado !== true
                || desafiAutenticacao.user_id !== data.user_id || desafiAutenticacao.document_id !== data.documento_id) return { status: false, msg: 'Autenticação do documento não confirmada.' }
            const evento = await knex('tab_evento').select('id', 'tipo', 'documento_id', 'signatario_id').where('id', data.id).andWhere('deletado', false).first();
            if (!evento || evento.tipo !== eventoSistema.tipos.estampa_upload_solicitada || evento.documento_id !== data.documento_id || evento.signatario_id !== data.signatario_id) return { status: false, msg: 'Identificador do processo de assinatura inválido.' }
            // Assinado/processando não bloqueia: idempotente, devolve sucesso pro front seguir pro /status.
            if (signatario.status === statusSignatario.assinado) return { status: true, msg: 'Este signatário já assinou o documento.', data: { status: signatario.status } }
            if (signatario.status === statusSignatario.processando) {
                // Republica o job — worker é idempotente em status terminal; falha de publish só loga.
                let desafioId = desafio && desafio.id ? desafio.id : signatario.desafio_acesso_id;
                if (!desafioId) {
                    const desafioBanco = await knex('tab_desafio_autenticacao').select('id')
                        .where('user_id', data.user_id)
                        .andWhere('document_id', data.documento_id)
                        .andWhere('tipo_desafio', confiDoisFatores.desafio.assinatura)
                        .andWhere('usado', true)
                        .andWhere('deletado', false)
                        .orderBy('criado_em', 'desc')
                        .first();
                    desafioId = desafioBanco ? desafioBanco.id : null;
                }
                let estampaTextoRepub = null;
                try {
                    estampaTextoRepub = signatario.estampa_texto_json
                        ? (typeof signatario.estampa_texto_json === 'string'
                            ? JSON.parse(signatario.estampa_texto_json)
                            : signatario.estampa_texto_json)
                        : null;
                } catch (_) { estampaTextoRepub = null; }
                const objectNameRepub = documento.bucket_wip_path || null;
                try {
                    const dispatcher = new MessageDispatcher(this.#rabbitMQ, []);
                    dispatcher.addItem({
                        exchange: rabbitMQ.queues.aplicarassinatura.exchange,
                        routingKey: rabbitMQ.queues.aplicarassinatura.routingKey,
                        jsonMessage: {
                            documento_id: documento.id,
                            signatario_id: signatario.id,
                            user_id: data.user_id,
                            desafio_id: desafioId,
                            identificacao_id: identificacao ? identificacao.id : null,
                            evento_id: evento.id,
                            modo: signatario.modo_visual || modo,
                            estampa_object_name: signatario.estampa_object_name || null,
                            object_name: objectNameRepub,
                            estampa_texto: estampaTextoRepub,
                        },
                        delayMs: rabbitMQ.defaultDelay,
                    });
                    await dispatcher.dispatch();
                } catch (errDispatch) {
                    console.log(errDispatch);
                    Log.getInstance().error({ err: errDispatch, signatario_id: signatario.id }, 'Falha ao republicar aplicarassinatura em solicitarAssinatura');
                }
                return { status: true, msg: 'Assinatura já está em processamento.', data: { status: signatario.status } }
            }
            if (signatario.ordem != null) {
                const pendentes = await knex('tab_signatarios')
                    .where('documento_id', data.documento_id)
                    .andWhere('deletado', false)
                    .whereNotNull('ordem')
                    .andWhere('ordem', '<', signatario.ordem)
                    .whereNotIn('status', [statusSignatario.assinado])
                    .count({ total: 'id' })
                    .first();
                if (Number(pendentes.total) > 0) {
                    return { status: false, msg: 'Ainda há signatários anteriores pendentes.' }
                }
            }
            let cpfPlain = '';
            try {
                const sha = new SHA(process.env.SHA);
                cpfPlain = sha.decrypt(perfil.cpf);
            } catch {
                cpfPlain = '';
            }
            if (cpfPlain === null || cpfPlain === undefined || cpfPlain === '') return { status: false, msg: 'CPF do signatário inválido.' }
            if (cpfPlain.length !== 11) return { status: false, msg: 'CPF do signatário inválido.' }
            const documentoVerificacao = await repositorioDocumentoVerificacao.getByDocumentoId({ documento_id: documento.id });
            if (!documentoVerificacao.status) return { status: false, msg: 'Ocorreu um erro interno, tente novamente em instantes.' }
            if (!documentoVerificacao.exit) return { status: false, msg: 'Código de verificação do documento não encontrado.' }
            if (!documentoVerificacao.data.codigo_verificacao) return { status: false, msg: 'Código de verificação do documento não encontrado.' }
            const estampaTexto = {
                nome: signatario.nome || perfil.nome,
                cpf_mascarado: mascararCpf(cpfPlain),
                data_hora: dateNow(),
                legenda: estampaAssinatura.legendaPadrao,
                codigo_verificacao: documentoVerificacao.data.codigo_verificacao,
            };
            const trxSignatario = await knex.transaction();
            try {
                const oldSignatario = { ...signatario };
                signatario.status = statusSignatario.processando;
                signatario.modo_visual = modo;
                signatario.estampa_object_name = null;
                signatario.estampa_texto_json = JSON.stringify(estampaTexto);
                signatario.desafio_acesso_id = desafio.id;
                signatario.data_atualizacao = dateNow();
                await trxSignatario('tab_signatarios').update({
                    status: statusSignatario.processando,
                    modo_visual: modo,
                    estampa_object_name: null,
                    estampa_texto_json: JSON.stringify(estampaTexto),
                    desafio_acesso_id: desafio.id,
                    data_atualizacao: dateNow(),
                }).where('id', signatario.id);
                const ultimaLedgerSignatario = await trxSignatario('tab_auditoria_ledger_signatario')
                    .where('signatario_id', signatario.id)
                    .where('deletado', false)
                    .orderBy('sequencia', 'desc')
                    .first();
                const sequenciaSignatario = ultimaLedgerSignatario
                    ? Number(ultimaLedgerSignatario.sequencia) + 1
                    : eventoAuditoria.signatario_processando.sequencia;
                const auditoriaSignatario = new LedgerSignatario(trxSignatario);
                auditoriaSignatario.Initialize(oldSignatario);
                await auditoriaSignatario.GravarAuditoriaModificacao({
                    signatario: {
                        ...signatario,
                        status: statusSignatario.processando,
                        modo_visual: modo,
                        estampa_object_name: null,
                        desafio_acesso_id: desafio.id,
                    },
                    tipo_evento: eventoAuditoria.signatario_processando.label,
                    sequencia: sequenciaSignatario,
                    meta_data: { documento_id: data.documento_id, modo, desafio_id: desafio.id, identificacao_id: identificacao ? identificacao.id : null },
                    user_id: data.user_id,
                });
                const histSignatario = new domainHistorico({
                    dado_antigo: oldSignatario,
                    transformacao: historico.trnasformcao.update.value,
                    dado_atual: { ...signatario },
                    user_id: data.user_id,
                });
                await trxSignatario('tab_historico').insert(histSignatario.getHistorico());
                const solicitacaoVinculo = await trxSignatario('tab_solicitacao_documento').select('id').where('documento_id', documento.id).first();
                if (!solicitacaoVinculo) throw new ErrorCreateSignatario('Ocorreu um erro interno, tente novamente em instantes.');
                const ultimoElo = await trxSignatario('tab_auditoria_ledger')
                    .where(function () { this.where('documento_id', documento.id).orWhere('solicitacao_id', solicitacaoVinculo.id) })
                    .where('deletado', false)
                    .orderBy('sequencia', 'desc')
                    .first();
                const sequenciaCadeia = ultimoElo ? Number(ultimoElo.sequencia) + 1 : eventoAuditoria.assinatura_solicitada.sequencia;
                const hashDocumentoAtual = (ultimoElo && ultimoElo.hash_documento_final)
                    ? ultimoElo.hash_documento_final
                    : documento.hash_original;
                await new LedgerDocumentoPdf(trxSignatario).GravarEvento({
                    solicitacao_id: solicitacaoVinculo.id,
                    documento_id: documento.id,
                    objeto_tipo: objetoAuditoria.signatario,
                    objeto_id: signatario.id,
                    objeto: { ...signatario },
                    objeto_anterior: oldSignatario,
                    desafio_acesso_id: desafio.id || null,
                    tipo_evento: eventoAuditoria.assinatura_solicitada.label,
                    sequencia: sequenciaCadeia,
                    meta_data: { documento_id: data.documento_id, modo, desafio_id: desafio.id, identificacao_id: identificacao ? identificacao.id : null },
                    hash_documento_inicial: hashDocumentoAtual,
                    hash_documento_final: hashDocumentoAtual,
                    hash_registro_anterior: ultimoElo ? ultimoElo.hash_atual : null,
                    user_id: data.user_id,
                });
                await trxSignatario.commit();
            } catch (error) {
                await trxSignatario.rollback();
                if (error?.name === 'ErrorLedgerSignatario' || error?.name === 'ErrorLedgerDocumentoPdf') {
                    console.log(error);
                    return { status: false, msg: 'Ocorreu um erro interno de auditoria, tente novamente em instantes.' }
                }
                return { status: false, msg: error.message || 'Erro ao solicitar assinatura.' }
            }
            try {
                const dispatcher = new MessageDispatcher(this.#rabbitMQ, []);
                dispatcher.addItem({
                    exchange: rabbitMQ.queues.aplicarassinatura.exchange,
                    routingKey: rabbitMQ.queues.aplicarassinatura.routingKey,
                    jsonMessage: {
                        documento_id: documento.id,
                        signatario_id: signatario.id,
                        user_id: data.user_id,
                        desafio_id: desafio.id,
                        identificacao_id: identificacao ? identificacao.id : null,
                        evento_id: evento.id,
                        modo,
                        estampa_object_name: null,
                        object_name: documento.bucket_wip_path,
                        estampa_texto: estampaTexto,
                    },
                    delayMs: rabbitMQ.defaultDelay,
                });
                await dispatcher.dispatch();
            } catch (errDispatch) {
                console.log(errDispatch);
                Log.getInstance().error({ err: errDispatch, signatario_id: signatario.id }, 'Falha ao publicar aplicarassinatura após solicitarAssinatura');
            }
            return {
                status: true,
                msg: 'Assinatura enfileirada para processamento.',
                data: {
                    signatario_id: signatario.id,
                    status: statusSignatario.processando,
                },
            }
        } catch (err) {
            console.log(err)
            return this.#erro(err, 'solicitarAssinatura');
        }
    }

    async getStatusAssinatura(data) {
        try {
            const signatario = await knex('tab_signatarios')
                .select('id', 'status', 'modo_visual', 'assinado_em', 'hash_pdf_apos', 'documento_id')
                .where('documento_id', data.documento_id)
                .andWhere('user_id', data.user_id)
                .andWhere('deletado', false)
                .first();
            if (!signatario) return { status: false, msg: 'Signatário não encontrado.' }

            const documento = await knex('tab_documentos')
                .select('id', 'status', 'documento_nome', 'bucket_wip_path', 'bucket_valt_path')
                .where('id', data.documento_id)
                .first();

            // Download: Vault se já selado; se assinado sem vault, republica selagem e serve WIP se houver.
            let downloadUrl = null;
            if (documento && documento.status === statusDocumentos.documento_assinado) {
                if (documento.bucket_valt_path) {
                    const urlPdf = await bucketGateway.Vault().urlDownloadGet({
                        objectName: documento.bucket_valt_path,
                        expiresInSeconds: buckets.temp_url_expiration * 10,
                    });
                    if (urlPdf.status) downloadUrl = urlPublicaBucket(urlPdf.data.url);
                } else {
                    try {
                        const dispatcher = new MessageDispatcher(this.#rabbitMQ, []);
                        dispatcher.addItem({
                            exchange: rabbitMQ.queues.selardocumentovault.exchange,
                            routingKey: rabbitMQ.queues.selardocumentovault.routingKey,
                            jsonMessage: { documento_id: documento.id, user_id: data.user_id },
                            delayMs: rabbitMQ.defaultDelay,
                        });
                        await dispatcher.dispatch();
                    } catch (errDispatch) {
                        console.log(errDispatch);
                        Log.getInstance().error({ err: errDispatch, documento_id: documento.id }, 'Falha ao publicar selardocumentovault em getStatusAssinatura');
                    }
                    if (documento.bucket_wip_path) {
                        const urlPdf = await bucketGateway.Wip().urlDownloadGet({
                            objectName: documento.bucket_wip_path,
                            expiresInSeconds: buckets.temp_url_expiration * 10,
                        });
                        if (urlPdf.status) downloadUrl = urlPublicaBucket(urlPdf.data.url);
                    }
                }
            }

            return {
                status: true,
                msg: 'Status da assinatura',
                data: {
                    signatario,
                    documento,
                    download_url: downloadUrl,
                },
            }
        } catch (err) {
            console.log(err)
            return this.#erro(err, 'getStatusAssinatura');
        }
    }

    async getStatusFotoBiometria(data) {
        try {
            if (!data.documento_id || !data.signatario_id || !data.user_id) return { status: false, msg: 'Sessão inválida.' }
            const identificacao = await knex('tab_identificacao_biometrica').select('id', 'status')
                .where('documento_id', data.documento_id)
                .andWhere('signatario_id', data.signatario_id)
                .andWhere('user_id', data.user_id)
                .andWhere('deletado', false)
                .orderBy('data_criacao', 'desc')
                .first();
            if (!identificacao) {
                if (!assinaturaSessao.biometriaObrigatoria) {
                    return {
                        status: true,
                        msg: 'Status da biometria da assinatura.',
                        data: { processado: true, status: statusBiometriaAssinatura.validado },
                    }
                }
                return { status: true, msg: 'Biometria ainda não enviada.', data: { processado: false, status: null } }
            }
            const statusFoto = Number(identificacao.status);
            const processado = [statusBiometriaAssinatura.validado, statusBiometriaAssinatura.negado].includes(statusFoto);
            return {
                status: true,
                msg: 'Status da biometria da assinatura.',
                data: { processado, status: statusFoto, id: identificacao.id },
            }
        } catch (err) {
            console.log(err)
            return this.#erro(err, 'getStatusFotoBiometria');
        }
    }

    async getUploadEstampaUrl(data) {
        try {
            if (!data.documento_id || !data.signatario_id || !data.user_id) return { status: false, msg: 'Documento e signatário são obrigatórios.' }
            const documento = await knex('tab_documentos').select('*').where('id', data.documento_id).first();
            if (!documento) return { status: false, msg: 'Documento não encontrado.' }
            if (!documento.termo_id) return { status: false, msg: 'Documento sem termo de responsabilidade vinculado.' }
            const user = await knex('tab_usuarios').select('*').where('id', data.user_id).andWhere('deletado', false).first();
            if (!user) return { status: false, msg: 'Usuário não localizado.' }
            const perfil = await knex('tab_perfil_usuario').select('*').where('user_id', user.id).andWhere('deletado', false).first();
            if (!perfil) return { status: false, msg: 'Perfil não cadastrado, complete seu cadastro antes de assinar o documento.', data: { next_step: 'CRIAR_PERFIL' } }
            if (assinaturaSessao.biometriaObrigatoria) {
                const biometria = await knex('tab_perfil_biometria').select('*').where('perfil_id', perfil.id).andWhere('deletado', false).first();
                if (!biometria) return { status: false, msg: 'Biometria não cadastrada, complete seu cadastro antes de assinar o documento.', data: { next_step: 'CADASTRAR_BIOMETRIA' } }
                if (!biometria.aprovado_por) return { status: false, msg: 'Cadastro biométrico em análise, aguarde a aprovação antes de assinar o documento.' }
                if (!biometria.rosto_embeddign && !biometria.bucket_wip_path) return { status: false, msg: 'Cadastro biométrico incompleto, contate o suporte para reenviar sua foto de referência.' }
            }
            const signatario = await knex('tab_signatarios').select('*').where('documento_id', data.documento_id).andWhere('user_id', user.id).andWhere('deletado', false).first();
            if (!signatario) return { status: false, msg: 'Signatário não encontrado para este documento.' }
            if (signatario.id !== data.signatario_id) return { status: false, msg: 'Sessão não autorizada para este documento.' }
            const termoSignatario = await knex('tab_aceite_termo_responsabilidade').select('id').where('user_id', user.id).andWhere('termo_id', documento.termo_id).andWhere('documento_id', documento.id).andWhere('deletado', false).first();
            if (!termoSignatario) return { status: false, msg: 'Termo de responsabilidade não aceito, aceite o termo antes de assinar o documento.', data: { termo_id: documento.termo_id, documento_id: documento.id, next_step: 'ACEITAR_TERMO' } }
            // Biometria desligada: sem linha em tab_identificacao_biometrica, o desafio de
            // assinatura confirmado é o único gate de autenticação (mesma regra de solicitarAssinatura).
            let identificacao = null;
            let desafio = null;
            if (assinaturaSessao.biometriaObrigatoria) {
                identificacao = await knex('tab_identificacao_biometrica').select('*')
                    .where('documento_id', data.documento_id)
                    .andWhere('signatario_id', signatario.id)
                    .andWhere('user_id', user.id)
                    .andWhere('deletado', false)
                    .orderBy('data_criacao', 'desc')
                    .first();
                if (!identificacao || Number(identificacao.status) !== statusBiometriaAssinatura.validado) return { status: false, msg: 'Reconhecimento facial não confirmado, tente novamente em instantes.' }
                desafio = identificacao.desafio_id
                    ? await knex('tab_desafio_autenticacao').select('id', 'tipo_desafio', 'usado', 'user_id', 'document_id').where('id', identificacao.desafio_id).andWhere('deletado', false).first()
                    : null;
            } else {
                desafio = await knex('tab_desafio_autenticacao').select('id', 'tipo_desafio', 'usado', 'user_id', 'document_id')
                    .where('user_id', data.user_id)
                    .andWhere('document_id', data.documento_id)
                    .andWhere('tipo_desafio', confiDoisFatores.desafio.assinatura)
                    .andWhere('usado', true)
                    .andWhere('deletado', false)
                    .orderBy('criado_em', 'desc')
                    .first();
            }
            if (!desafio || desafio.tipo_desafio !== confiDoisFatores.desafio.assinatura || desafio.usado !== 1 && desafio.usado !== true
                || desafio.user_id !== data.user_id || desafio.document_id !== data.documento_id) {
                return { status: false, msg: 'Autenticação do documento não confirmada.' }
            }
            // Reconferência independente: mesmo com biometria confirmada, o desafio de 2FA/assinatura
            // tem que estar de fato confirmado — não basta o desafio_id pendurado na identificação.
            const desafiAutenticacao = await knex('tab_desafio_autenticacao')
                .select('id', 'tipo_desafio', 'usado', 'user_id', 'document_id')
                .where('user_id', data.user_id)
                .andWhere('document_id', data.documento_id)
                .andWhere('tipo_desafio', confiDoisFatores.desafio.assinatura)
                .andWhere('usado', true)
                .andWhere('deletado', false)
                .orderBy('criado_em', 'desc')
                .first();
            if (!desafiAutenticacao || desafiAutenticacao.tipo_desafio !== confiDoisFatores.desafio.assinatura || desafiAutenticacao.usado !== 1 && desafiAutenticacao.usado !== true
                || desafiAutenticacao.user_id !== data.user_id || desafiAutenticacao.document_id !== data.documento_id) {
                return { status: false, msg: 'Autenticação do documento não confirmada.' }
            }
            // Presign antes da trx: se a URL falhar, não deixa evento órfão.
            const objectName = bucketGateway.Wip().applyRootPrefix(`assinaturas/${data.documento_id}/${data.signatario_id}.png`);
            const url = await bucketGateway.Wip().urlUploadPut({
                documentoId: objectName,
                expiresInSeconds: buckets.temp_url_expiration * 5,
            });
            if (!url.status) return { status: false, msg: url.msg }
            const eventoExistente = await knex('tab_evento').select('id')
                .where('documento_id', data.documento_id)
                .andWhere('signatario_id', data.signatario_id)
                .andWhere('tipo', eventoSistema.tipos.estampa_upload_solicitada)
                .andWhere('deletado', false)
                .first();
            if (eventoExistente) {
                return {
                    status: true,
                    msg: 'URL de upload da estampa gerada',
                    data: {
                        id: eventoExistente.id,
                        object_name: url.data.objectName || objectName,
                        url: urlPublicaBucket(url.data.url),
                        headers: {
                            ...(url.data.headers || {}),
                            'Content-Type': 'image/png',
                        },
                    },
                }
            }
            const trxEvento = await knex.transaction();
            let evento = null;
            try {
                const solicitacaoVinculo = await trxEvento('tab_solicitacao_documento').select('id').where('documento_id', documento.id).first();
                if (!solicitacaoVinculo) throw new ErrorCreateSignatario('Ocorreu um erro interno, tente novamente em instantes.');
                evento = new domainEvento({
                    tipo: eventoSistema.tipos.estampa_upload_solicitada,
                    status: eventoSistema.status.pendente,
                    solicitacao_id: solicitacaoVinculo.id,
                    documento_id: data.documento_id,
                    signatario_id: data.signatario_id,
                    origem_tipo: eventoSistema.origem.signatario,
                    origem_id: data.signatario_id,
                    destinatario_user_id: data.user_id || null,
                    canal: eventoSistema.canais.sistema,
                    titulo: 'Upload de estampa de assinatura solicitado',
                    mensagem: `Estampa de assinatura solicitada para o documento ${data.documento_id}.`,
                    meta_dados: { documento_id: data.documento_id, signatario_id: data.signatario_id },
                });
                await trxEvento('tab_evento').insert({
                    ...evento.getEvento(),
                    meta_dados: JSON.stringify(evento.meta_dados),
                });
                const auditoriaEvento = new LedgerEvento(trxEvento);
                await auditoriaEvento.GravarAuditoriaCriacao({
                    evento: evento.getEvento(),
                    tipo_evento: eventoAuditoria.evento_criado.label,
                    sequencia: eventoAuditoria.evento_criado.sequencia,
                    meta_data: { documento_id: data.documento_id, signatario_id: data.signatario_id, canal: eventoSistema.canais.sistema },
                    user_id: data.user_id || null,
                });
                const ultimoElo = await trxEvento('tab_auditoria_ledger')
                    .where(function () { this.where('documento_id', documento.id).orWhere('solicitacao_id', solicitacaoVinculo.id) })
                    .where('deletado', false)
                    .orderBy('sequencia', 'desc')
                    .first();
                const sequenciaCadeia = ultimoElo ? Number(ultimoElo.sequencia) + 1 : eventoAuditoria.estampa_solicitada.sequencia;
                const hashDocumentoAtual = (ultimoElo && ultimoElo.hash_documento_final)
                    ? ultimoElo.hash_documento_final
                    : documento.hash_original;
                await new LedgerDocumentoPdf(trxEvento).GravarEvento({
                    solicitacao_id: solicitacaoVinculo.id,
                    documento_id: documento.id,
                    objeto_tipo: objetoAuditoria.evento,
                    objeto_id: evento.id,
                    objeto: evento.getEvento(),
                    objeto_anterior: null,
                    desafio_acesso_id: desafio.id || null,
                    tipo_evento: eventoAuditoria.estampa_solicitada.label,
                    sequencia: sequenciaCadeia,
                    meta_data: { documento_id: data.documento_id, signatario_id: data.signatario_id, evento_id: evento.id },
                    hash_documento_inicial: hashDocumentoAtual,
                    hash_documento_final: hashDocumentoAtual,
                    hash_registro_anterior: ultimoElo ? ultimoElo.hash_atual : null,
                    user_id: data.user_id,
                });
                await trxEvento.commit();
            } catch (error) {
                await trxEvento.rollback();
                if (error?.name === 'ErrorLedgerEvento' || error?.name === 'ErrorLedgerDocumentoPdf') {
                    console.log(error);
                    return { status: false, msg: 'Ocorreu um erro interno de auditoria, tente novamente em instantes.' }
                }
                return { status: false, msg: error.message || 'Erro ao registrar solicitação de upload da estampa.' }
            }

            return {
                status: true,
                msg: 'URL de upload da estampa gerada',
                data: {
                    id: evento.id,
                    object_name: url.data.objectName || objectName,
                    url: urlPublicaBucket(url.data.url),
                    headers: {
                        ...(url.data.headers || {}),
                        'Content-Type': 'image/png',
                    },
                },
            }
        } catch (err) {
            console.log(err)
            return this.#erro(err, 'getUploadEstampaUrl');
        }
    }

    async #gateOnboarding(user_id) {
        const checkUser = await repositorioUsuario.getById({ id: user_id });
        if (!checkUser.status) return { status: false, msg: 'Ocorreu um erro interno, tente novamente em instantes.' }
        if (!checkUser.exit) return { status: false, msg: 'Usuário não encontrado.' }
        const user = checkUser.data[0];
        if (user.trocar_senha === 1 || user.trocar_senha === true) {
            return { status: false, msg: 'Conclua a redefinição de senha antes de acessar o documento.', data: { next_step: 'REDEFINIR_SENHA' } }
        }
        if (!user.codigo_hash || user.dois_fatores !== 1) {
            return { status: false, msg: 'Configure a autenticação de dois fatores antes de acessar o documento.', data: { next_step: 'SETUP_2FA' } }
        }
        const checkPerfil = await repositorioPerfil.getPerfilUsuarioByUserId({ user_id });
        if (!checkPerfil.status) return { status: false, msg: 'Ocorreu um erro interno, tente novamente em instantes.' }
        if (!checkPerfil.exit) return { status: false, msg: 'Complete seu cadastro de perfil antes de acessar o documento.', data: { next_step: 'CRIAR_PERFIL' } }
        return { status: true }
    }

    #erro(err, metodo) {
        let lineError = '0';
        let fileName = '0';
        const stackFrames = ErrorStackParser.parse(err);
        if (stackFrames.length > 0) {
            lineError = stackFrames[0].lineNumber;
            fileName = stackFrames[0].fileName;
        }
        logExeption({
            descricaoDoErro: `Exeption estourada. use case Assinatura - ${metodo}`,
            linhaDoErro: lineError,
            nomeDoArquivo: fileName,
            data_criacao: dateNow(),
            data_atualizacao: dateNow(),
            deletado: false,
        });
        return { status: false, msg: 'Erro interno do servidor, log gerado' }
    }

}


class ErrorCreateSignatario extends Error {
    constructor(message, log) {
        super(message);
        this.name = 'ErrorCreateSignatario';
        this.log = log || null;
    }
}

module.exports = new createAssinaturaUseCase();
