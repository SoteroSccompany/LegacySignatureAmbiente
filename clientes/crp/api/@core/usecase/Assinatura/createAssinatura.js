
const knex = require('../../../infrastructure/db/config/databaseConection.js')();
const authenticator = require('otplib');
const ErrorStackParser = require('error-stack-parser');
const dateNow = require('../../../infrastructure/gateways/functions/data/getToday.js');
const logExeption = require('../Logs/exeption/exeptionDocumentos.js');
const repositorioUsuario = require('../../../infrastructure/db/services/UsuarioRepositorio.js');
const repositorioPerfil = require('../../../infrastructure/db/services/PerfilUsuarioRepository.js');
const repositorioDesafio = require('../../../infrastructure/db/services/DesafioAutenticacaoRepository.js');
const domainDesafio = require('../../domain/DesafioAutenticacao.js');
const domainIdentificacaoBiometrica = require('../../domain/IdentificacaoBiometrica.js');
const {
    applicationName,
    confiDoisFatores,
    rabbitMQ,
    buckets,
    statusAplication,
    statusApp,
    eventoAuditoria,
    objetoAuditoria,
    historico,
    statusBiometriaAssinatura,
    assinaturaSessao
} = require('../../../certs/index.js');
const { SHA } = require('../../../infrastructure/gateways/crypt/sha/index.js');
const bucketGateway = require('../../../infrastructure/gateways/Bucket/index.js');
const FaceMatch = require('../../../infrastructure/gateways/FaceMatch/index.js');
const urlPublicaBucket = require('../../../infrastructure/gateways/Bucket/helpers/urlPublica.js');
const RabbitMQ = require('../../../infrastructure/gateways/rabbitmq/index.js');
const MessageDispatcher = require('../../../infrastructure/gateways/helpers/Dispatchers/Messages/index.js');
const moment = require('moment');
const LedgerDesafioAutenticacao = require('../../../infrastructure/gateways/helpers/AuditoriaAlteracao/LadgerDesafioAutenticacao/index.js');
const LedgerDocumentoPdf = require('../../../infrastructure/gateways/helpers/AuditoriaAlteracao/LadgerDocumentoPdf/index.js');
const LedgerSignatario = require('../../../infrastructure/gateways/helpers/AuditoriaAlteracao/LadgerSignatario/index.js');
const SessionSave = require('../../../infrastructure/gateways/helpers/SessionSave/index.js');
const domainHistorico = require('../../domain/Historico.js');
const LadgerIdentificacaoBiometria = require('../../../infrastructure/gateways/helpers/AuditoriaAlteracao/LadgerIdentificacaoBiometrica/index.js');
const Log = require('../../../Logs/index.js');

class createAssinaturaUseCase {

    #rabbitMQ = null;
    historico = [];

    constructor() {
        this.historico = [];
        this.#rabbitMQ = RabbitMQ.getInstance();
    }

    async sessaoAssinatura(data, session, sha) {
        try {
            const trx = await knex.transaction();
            try {
                const documento = await trx('tab_documentos').select('*').where('id', data.documento_id).first();
                if (!documento) throw new ErrorCreateSignatario('Documento não localizado ou não disponível para assinatura.');
                let exigeBiometria = assinaturaSessao.biometriaObrigatoria;
                if (!exigeBiometria) {
                    const solicitacaoMeta = await trx('tab_solicitacao_documento').select('meta_dados').where('documento_id', data.documento_id).first();
                    if (solicitacaoMeta && solicitacaoMeta.meta_dados != null) {
                        const meta = typeof solicitacaoMeta.meta_dados === 'string' ? JSON.parse(solicitacaoMeta.meta_dados) : solicitacaoMeta.meta_dados;
                        exigeBiometria = meta != null && meta.reconhecimento_facial === true;
                    }
                }
                const user = await trx('tab_usuarios').select('*').where('id', data.user_id).andWhere('deletado', false).first();
                if (!user) throw new ErrorCreateSignatario('Usuário não localizado.');
                const perfil = await trx('tab_perfil_usuario').select('*').where('user_id', user.id).andWhere('deletado', false).first();
                if (!perfil) throw new ErrorCreateSignatario('Perfil não cadastrado, complete seu cadastro antes de assinar o documento.', null, { next_step: 'CRIAR_PERFIL' });
                const checkBiometria = await this.#biometriaCadastrada(perfil.id, trx, true, exigeBiometria);
                if (!checkBiometria.status) throw new ErrorCreateSignatario(checkBiometria.msg, null, checkBiometria.data);





                const login = await trx('tab_login').select('*').where('user_id', user.id).andWhere('deletado', false).first();
                if (login && (login.session_id !== session.id)) throw new ErrorCreateSignatario('Dado incorreto ou cadastro incompleto, tente novamente em instantes.');
                const signatario = await trx('tab_signatarios').select('*').where('documento_id', data.documento_id).andWhere('user_id', user.id).andWhere('deletado', false).first();
                if (!signatario) throw new ErrorCreateSignatario('Dado incorreto ou cadastro incompleto, tente novamente em instantes.');
                // Termo antes do desafio anterior: retomar uma sessão viva não pode
                // pular o aceite do termo (mesma ordem de carregarProgressoSessao).
                const termoSignatario = await trx('tab_aceite_termo_responsabilidade').select('id').where('user_id', user.id).andWhere('termo_id', documento.termo_id).andWhere('documento_id', documento.id).andWhere('deletado', false).first();
                if (!termoSignatario) throw new ErrorCreateSignatario('Termo de responsabilidade não aceito, aceite o termo antes de assinar o documento.', null, { termo_id: documento.termo_id, documento_id: documento.id, next_step: 'ACEITAR_TERMO' });
                const desafioAnterior = await trx('tab_desafio_autenticacao').select('*')
                    .where('user_id', user.id)
                    .andWhere('document_id', data.documento_id)
                    .andWhere('tipo_desafio', confiDoisFatores.desafio.assinatura)
                    .andWhere('deletado', false)
                    .orderBy('criado_em', 'desc')
                    .first();
                if (desafioAnterior) {
                    const identificacaoAnterior = await trx('tab_identificacao_biometrica').select('*')
                        .where('documento_id', data.documento_id)
                        .andWhere('signatario_id', signatario.id)
                        .andWhere('user_id', user.id)
                        .andWhere('deletado', false)
                        .orderBy('data_criacao', 'desc')
                        .first();
                    // Identificação viva não é erro: devolve o progresso atual (mesmo contrato do GET progresso)
                    // em vez de recusar — assim quem já passou do OTP não precisa refazer o desafio pra retomar.
                    if (identificacaoAnterior && [statusBiometriaAssinatura.aguardando_validacao, statusBiometriaAssinatura.validado].includes(Number(identificacaoAnterior.status))) {
                        session.user.assinatura = {
                            documento_id: data.documento_id,
                            signatario_id: signatario.id,
                            pending_2fa: false,
                            termo_aceite_id: termoSignatario.id,
                            identificacao_biometrica_id: identificacaoAnterior.id,
                        }
                        const saved = await SessionSave.exec(session);
                        await trx.rollback();
                        if (!saved) return { status: false, msg: 'Ocorreu um erro interno, tente novamente em instantes.' }
                        return {
                            status: true,
                            msg: 'Sessão de assinatura já em andamento.',
                            data: { etapa: identificacaoAnterior.status, documento_id: data.documento_id, signatario_id: signatario.id, identificacao_id: identificacaoAnterior.id },
                        }
                    }
                    if (identificacaoAnterior && Number(identificacaoAnterior.status) === statusBiometriaAssinatura.aguardando_imagem) {
                        const minutosDesdeFoto = moment().diff(moment(identificacaoAnterior.data_criacao), 'minutes');
                        if (minutosDesdeFoto < assinaturaSessao.limiteMinutos) {
                            const bucket = bucketGateway.Wip();
                            const url = await bucket.urlUploadPut({
                                documentoId: identificacaoAnterior.bucket_wip_path,
                                expiresInSeconds: buckets.temp_url_expiration,
                            });
                            if (!url.status) { await trx.rollback(); return { status: false, msg: 'Não foi possível gerar a URL de upload da biometria.' } }
                            session.user.assinatura = {
                                documento_id: data.documento_id,
                                signatario_id: signatario.id,
                                pending_2fa: false,
                                termo_aceite_id: termoSignatario.id,
                                identificacao_biometrica_id: identificacaoAnterior.id,
                            }
                            const saved = await SessionSave.exec(session);
                            await trx.rollback();
                            if (!saved) return { status: false, msg: 'Ocorreu um erro interno, tente novamente em instantes.' }
                            delete url.data.objectName;
                            delete url.data.bucket;
                            delete url.data.expiresInSeconds;
                            url.data.url = urlPublicaBucket(url.data.url);
                            return {
                                status: true,
                                msg: 'Sessão de assinatura já em andamento.',
                                data: { ...url.data, etapa: identificacaoAnterior.status, documento_id: data.documento_id, signatario_id: signatario.id, identificacao_id: identificacaoAnterior.id },
                            }
                        }
                    }
                    // Biometria não exigida neste documento: não existe identificacaoAnterior
                    // (nunca é criada nesse modo) — o próprio desafio já confirmado é o sinal
                    // de etapa concluída. Reabrir a sessão não deve descartar o OTP já validado.
                    if (!exigeBiometria && (desafioAnterior.usado === 1 || desafioAnterior.usado === true)) {
                        session.user.assinatura = {
                            documento_id: data.documento_id,
                            signatario_id: signatario.id,
                            pending_2fa: false,
                            termo_aceite_id: termoSignatario.id,
                            identificacao_biometrica_id: null,
                        }
                        const saved = await SessionSave.exec(session);
                        await trx.rollback();
                        if (!saved) return { status: false, msg: 'Ocorreu um erro interno, tente novamente em instantes.' }
                        return {
                            status: true,
                            msg: 'Sessão de assinatura já em andamento.',
                            data: { etapa: statusBiometriaAssinatura.validado, documento_id: data.documento_id, signatario_id: signatario.id, identificacao_id: null },
                        }
                    }
                    await trx('tab_desafio_autenticacao').where('id', desafioAnterior.id).update({ deletado: true });
                    await trx('tab_historico').insert(new domainHistorico({
                        transformacao: historico.trnasformcao.delete.value,
                        dado_atual: { ...desafioAnterior, deletado: true },
                        user_id: user.id,
                    }).getHistorico());
                    if (identificacaoAnterior) {
                        await trx('tab_identificacao_biometrica').where('id', identificacaoAnterior.id).update({ deletado: true, data_atualizacao: dateNow() });
                        await trx('tab_historico').insert(new domainHistorico({
                            transformacao: historico.trnasformcao.delete.value,
                            dado_atual: { ...identificacaoAnterior, deletado: true },
                            user_id: user.id,
                        }).getHistorico());
                    }
                }
                const plainSecret = sha.decrypt(user.codigo_hash);
                const code = await authenticator.generate({ secret: plainSecret, epochTolerance: 60 });
                const desafio = new domainDesafio({
                    user_id: user.id,
                    document_id: data.documento_id,
                    sessao_id: session.id,
                    tipo_desafio: confiDoisFatores.desafio.assinatura,
                    usado: false,
                    solicitacao_ip: data.solicitacao_ip || '0.0.0.0',
                    solicitacao_porta_logica: data.solicitacao_porta_logica || 0,
                    solicitacao_user_agent_hash: data.user_agent_hash || 'assinatura-web',
                });
                if (statusAplication.status === statusApp.dev) {
                    console.log(code);
                }
                desafio.desafio_hash = sha.encrypt(code);
                const criado = await repositorioDesafio.createDesafio({ desafio: desafio.getDesafioAutenticacao() }, trx);
                if (!criado.status) throw new Error(criado.msg || 'Não foi possível iniciar a autenticação da assinatura.');
                const auditoriaDesafio = new LedgerDesafioAutenticacao(trx);
                await auditoriaDesafio.GravarAuditoriaCriacao({
                    desafio: desafio.getDesafioAutenticacao(),
                    tipo_evento: eventoAuditoria.desafio_assinatura_documento_criado.label,
                    sequencia: eventoAuditoria.desafio_assinatura_documento_criado.sequencia,
                    meta_data: { tipo_desafio: confiDoisFatores.desafio.assinatura, documento_id: data.documento_id, signatario_id: signatario.id, termo_aceite_id: termoSignatario.id },
                    user_id: user.id,
                });
                const solicitacaoVinculo = await trx('tab_solicitacao_documento').select('id').where('documento_id', documento.id).first();
                if (!solicitacaoVinculo) throw new ErrorCreateSignatario('Ocorreu um erro interno, tente novamente em instantes.');
                const ultimoElo = await trx('tab_auditoria_ledger')
                    .where(function () { this.where('documento_id', documento.id).orWhere('solicitacao_id', solicitacaoVinculo.id) })
                    .where('deletado', false)
                    .orderBy('sequencia', 'desc')
                    .first();
                const sequenciaElo = ultimoElo ? Number(ultimoElo.sequencia) + 1 : eventoAuditoria.sessao_assinatura_aberta.sequencia;
                await new LedgerDocumentoPdf(trx).GravarEvento({
                    solicitacao_id: solicitacaoVinculo.id,
                    documento_id: documento.id,
                    objeto_tipo: objetoAuditoria.desafio_autenticacao,
                    objeto_id: desafio.id,
                    objeto: desafio.getDesafioAutenticacao(),
                    objeto_anterior: null,
                    desafio_acesso_id: desafio.id,
                    tipo_evento: eventoAuditoria.sessao_assinatura_aberta.label,
                    sequencia: sequenciaElo,
                    meta_data: { tipo_desafio: confiDoisFatores.desafio.assinatura, documento_id: data.documento_id, signatario_id: signatario.id, termo_aceite_id: termoSignatario.id },
                    hash_documento_inicial: (ultimoElo && ultimoElo.hash_documento_final) || documento.hash_original,
                    hash_documento_final: (ultimoElo && ultimoElo.hash_documento_final) || documento.hash_original,
                    hash_registro_anterior: ultimoElo ? ultimoElo.hash_atual : null,
                    user_id: user.id,
                });
                session.user.assinatura = {
                    documento_id: data.documento_id,
                    signatario_id: signatario.id,
                    pending_2fa: true,
                    termo_aceite_id: termoSignatario.id,
                }
                await trx.commit();
                try {
                    const saved = await SessionSave.exec(session);
                    if (!saved) console.log('SessionSave falhou após commit em sessaoAssinatura');
                } catch (errSave) {
                    console.log(errSave);
                }
                return { status: true, msg: "Sessao para assinatura iniciada." }
            } catch (err) {
                console.log(err)
                await trx.rollback();
                if (err?.name === 'ErrorLedgerDocumentoPdf' || err?.name === 'ErrorLedgerDesafioAutenticacao') {
                    return { status: false, msg: 'Ocorreu um erro interno de auditoria, tente novamente em instantes.' }
                }
                const mensagem = err.name === 'ErrorCreateSignatario' ? err.message : 'Ocorreu um erro interno, tente novamente em instantes.';
                if (err.log) {
                    Log.getInstance().error(err, err.log);
                }
                return { status: false, msg: mensagem, data: err.data || undefined }
            }
        } catch (err) {
            console.log(err)
            return this.#erro(err, 'sessaoAssinatura');
        }
    }

    async confirmarSessaoAssinatura(data, sessao, sha) {
        try {
            if (!sessao.user.assinatura || !sessao.user.assinatura.documento_id || !sessao.user.assinatura.signatario_id) return { status: false, msg: 'Sessão inválida para assinatura.' }
            const trx = await knex.transaction();
            try {
                let exigeBiometria = assinaturaSessao.biometriaObrigatoria;
                if (!exigeBiometria) {
                    const solicitacaoMeta = await trx('tab_solicitacao_documento').select('meta_dados').where('documento_id', sessao.user.assinatura.documento_id).first();
                    if (solicitacaoMeta && solicitacaoMeta.meta_dados != null) {
                        const meta = typeof solicitacaoMeta.meta_dados === 'string' ? JSON.parse(solicitacaoMeta.meta_dados) : solicitacaoMeta.meta_dados;
                        exigeBiometria = meta != null && meta.reconhecimento_facial === true;
                    }
                }
                const desafio = await trx('tab_desafio_autenticacao').select('*').where('user_id', sessao.user.id)
                    .andWhere('tipo_desafio', confiDoisFatores.desafio.assinatura)
                    .andWhere('usado', false)
                    .andWhere('deletado', false)
                    .orderBy('criado_em', 'desc')
                    .first();
                if (!desafio) {
                    // Biometria não exigida neste documento: não existe tab_identificacao_biometrica —
                    // um desafio já confirmado (2ª chamada do /2fa, refresh etc.) é o próprio sinal
                    // de etapa concluída, idempotente.
                    if (!exigeBiometria) {
                        const desafioConfirmado = await trx('tab_desafio_autenticacao').select('id').where('user_id', sessao.user.id)
                            .andWhere('document_id', sessao.user.assinatura.documento_id)
                            .andWhere('tipo_desafio', confiDoisFatores.desafio.assinatura)
                            .andWhere('usado', true)
                            .andWhere('deletado', false)
                            .orderBy('criado_em', 'desc')
                            .first();
                        if (desafioConfirmado) {
                            await trx.rollback();
                            return { status: true, msg: 'Autenticação da assinatura já confirmada.', data: { etapa: statusBiometriaAssinatura.validado, id: null } }
                        }
                    }
                    // Desafio já usado (2ª chamada do /2fa, refresh no meio da câmera etc.) — se a
                    // identificação da sessão ainda estiver viva, devolve o estado atual em vez de
                    // recusar de novo. OTP inválido continua caindo no throw abaixo, sem desafio pendente.
                    const identificacaoViva = await trx('tab_identificacao_biometrica').select('*')
                        .where('documento_id', sessao.user.assinatura.documento_id)
                        .andWhere('signatario_id', sessao.user.assinatura.signatario_id)
                        .andWhere('user_id', sessao.user.id)
                        .andWhere('deletado', false)
                        .orderBy('data_criacao', 'desc')
                        .first();
                    if (!identificacaoViva) throw new ErrorCreateSignatario('Desafio não encontrado ou já utilizado.');
                    if (Number(identificacaoViva.status) === statusBiometriaAssinatura.aguardando_imagem) {
                        const bucket = bucketGateway.Wip();
                        const url = await bucket.urlUploadPut({
                            documentoId: identificacaoViva.bucket_wip_path,
                            expiresInSeconds: buckets.temp_url_expiration,
                        });
                        if (!url.status) throw new ErrorCreateSignatario('Não foi possível gerar a URL de upload da biometria.');
                        await trx.rollback();
                        delete url.data.objectName;
                        delete url.data.bucket;
                        delete url.data.expiresInSeconds;
                        url.data.url = urlPublicaBucket(url.data.url);
                        return { status: true, msg: "Sessao para assinatura confirmada. Realize o reconhecimento facial", data: { ...url.data, id: identificacaoViva.id } }
                    }
                    await trx.rollback();
                    const msgEtapa = Number(identificacaoViva.status) === statusBiometriaAssinatura.negado
                        ? 'Reconhecimento facial não validado.'
                        : 'Reconhecimento facial em andamento.';
                    return { status: true, msg: msgEtapa, data: { etapa: identificacaoViva.status, id: identificacaoViva.id } }
                }
                const oldDesafio = { ...desafio };
                if (desafio.document_id !== sessao.user.assinatura.documento_id) {
                    await trx.rollback();
                    return { status: false, msg: 'Ocorreu um erro interno, tente novamente em instantes.' }
                }
                const documento = await trx('tab_documentos').select('*').where('id', desafio.document_id).first();
                const signatario = await trx('tab_signatarios').select('*').where('documento_id', desafio.document_id).andWhere('user_id', sessao.user.id).andWhere('deletado', false).first();
                const usuario = await trx('tab_usuarios').select('*').where('id', sessao.user.id).andWhere('deletado', false).first();
                if (!documento || !signatario || !usuario) throw new ErrorCreateSignatario('Dados do signatário ou documento não encontrados.');
                if (signatario.id !== sessao.user.assinatura.signatario_id) {
                    await trx.rollback();
                    return { status: false, msg: 'Ocorreu um erro interno, tente novamente em instantes.' }
                }
                const perfil = await trx('tab_perfil_usuario').select('*').where('user_id', usuario.id).andWhere('deletado', false).first();
                if (!perfil) throw new ErrorCreateSignatario('Perfil não cadastrado, complete seu cadastro antes de assinar o documento.', null, { next_step: 'CRIAR_PERFIL' });
                if (signatario.perfil_id !== perfil.id) {
                    // Signatário com perfil_id desatualizado (ex.: perfil vinculado depois do convite)
                    // — relinca em vez de recusar o /2fa com "biometria não cadastrada".
                    const relink = await this.#relinkSignatarioPerfil(signatario, perfil.id, sessao.user.id, trx);
                    if (!relink.status) throw new ErrorCreateSignatario(relink.msg);
                    signatario.perfil_id = perfil.id;
                }
                const checkBiometria = await this.#biometriaCadastrada(perfil.id, trx, true, exigeBiometria);
                if (!checkBiometria.status) throw new ErrorCreateSignatario(checkBiometria.msg, null, checkBiometria.data);

                const biometria = checkBiometria.biometria;
                const identificacaoAnterior = await trx('tab_identificacao_biometrica').select('*')
                    .where('documento_id', desafio.document_id)
                    .andWhere('signatario_id', signatario.id)
                    .andWhere('user_id', sessao.user.id)
                    .andWhere('deletado', false)
                    .orderBy('data_criacao', 'desc')
                    .first();
                // Desafio ainda não usado com identificação já validada é estado inconsistente
                // (não deveria coexistir), mas retomar em vez de travar: manda pro PDF.
                if (identificacaoAnterior && Number(identificacaoAnterior.status) === statusBiometriaAssinatura.validado) {
                    await trx.rollback();
                    return { status: true, msg: 'Reconhecimento facial já validado.', data: { etapa: identificacaoAnterior.status, id: identificacaoAnterior.id } }
                }
                const minutosDesdeInicio = moment().diff(moment(desafio.criado_em), 'minutes');
                if (minutosDesdeInicio >= assinaturaSessao.limiteMinutos) throw new ErrorCreateSignatario('Ocorreu um erro interno, tente novamente em instantes.');
                const hashToken = sha.encrypt(data.token);
                if ((statusApp.prod === statusAplication.status) && (hashToken !== desafio.desafio_hash)) {
                    await trx.rollback();
                    return { status: false, msg: "Código inválido" }
                }
                const plainSecret = sha.decrypt(usuario.codigo_hash);
                const isValid = await authenticator.verify({
                    token: data.token, secret: plainSecret, label: `${applicationName}:${usuario.email}`, issuer: applicationName, epochTolerance: 60
                });
                if ((isValid.valid === false) && (statusApp.prod === statusAplication.status)) {
                    await trx.rollback();
                    return { status: false, msg: "Código de autenticação inválido." }
                }
                desafio.confirmacao_ip = data.solicitacao_ip;
                desafio.criado_em = moment(desafio.criado_em).format('YYYY-MM-DD HH:mm:ss');
                desafio.expira_em = moment(desafio.expira_em).format('YYYY-MM-DD HH:mm:ss');
                desafio.confirmacao_porta_logica = data.solicitacao_porta_logica;
                desafio.confirmacao_user_agent_hash = data.user_agent_hash;
                desafio.usado = true;
                desafio.consumido_em = dateNow();
                // Sem facial neste documento: OTP confirmado já encerra a autenticação — não cria
                // tab_identificacao_biometrica nem pede foto, marca a sessão como validada direto.
                const identificacao = exigeBiometria
                    ? new domainIdentificacaoBiometrica({
                        documento_id: desafio.document_id,
                        status: statusBiometriaAssinatura.aguardando_imagem,
                        signatario_id: signatario.id,
                        user_id: sessao.user.id,
                        bucket_wip_path: bucketGateway.Wip().applyRootPrefix(`${buckets.aplicationName}/${buckets.pastas.perfil_biometria}/${documento.id}/${signatario.id}/foto`),
                        perfil_biometria_id: biometria.id,
                        desafio_id: desafio.id,
                        data_criacao: dateNow(),
                    })
                    : null;
                if (identificacao) await trx('tab_identificacao_biometrica').insert(identificacao.getIdentificacaoBiometrica());
                await trx('tab_desafio_autenticacao').where('id', desafio.id).update(desafio);
                const ladgerDesaifio = new LedgerDesafioAutenticacao(trx);
                ladgerDesaifio.Initialize(oldDesafio);
                await ladgerDesaifio.GravarAuditoriaModificacao({
                    desafio: desafio,
                    tipo_evento: eventoAuditoria.desafio_assinatura_documento_confirmado.label,
                    sequencia: eventoAuditoria.desafio_assinatura_documento_confirmado.sequencia,
                    meta_data: { tipo_desafio: confiDoisFatores.desafio.assinatura, documento_id: desafio.document_id, signatario_id: signatario.id },
                    user_id: sessao.user.id,
                });
                if (identificacao) {
                    const ladgerIdentificacao = new LadgerIdentificacaoBiometria(trx);
                    await ladgerIdentificacao.GravarAuditoriaCriacao({
                        identificacao: identificacao.getIdentificacaoBiometrica(),
                        tipo_evento: eventoAuditoria.identificacao_biometria_criada.label,
                        sequencia: eventoAuditoria.identificacao_biometria_criada.sequencia,
                        meta_data: { documento_id: desafio.document_id, signatario_id: signatario.id, desafio_id: desafio.id },
                        user_id: sessao.user.id,
                    });
                }
                const solicitacaoVinculo = await trx('tab_solicitacao_documento').select('id').where('documento_id', documento.id).first();
                if (!solicitacaoVinculo) throw new ErrorCreateSignatario('Ocorreu um erro interno, tente novamente em instantes.');
                const ultimoElo = await trx('tab_auditoria_ledger')
                    .where(function () { this.where('documento_id', documento.id).orWhere('solicitacao_id', solicitacaoVinculo.id) })
                    .where('deletado', false)
                    .orderBy('sequencia', 'desc')
                    .first();
                const sequenciaElo = ultimoElo ? Number(ultimoElo.sequencia) + 1 : eventoAuditoria.sessao_assinatura_confirmada.sequencia;
                await new LedgerDocumentoPdf(trx).GravarEvento({
                    solicitacao_id: solicitacaoVinculo.id,
                    documento_id: documento.id,
                    objeto_tipo: objetoAuditoria.desafio_autenticacao,
                    objeto_id: desafio.id,
                    objeto: desafio,
                    objeto_anterior: oldDesafio,
                    desafio_acesso_id: desafio.id,
                    tipo_evento: eventoAuditoria.sessao_assinatura_confirmada.label,
                    sequencia: sequenciaElo,
                    meta_data: { tipo_desafio: confiDoisFatores.desafio.assinatura, documento_id: desafio.document_id, signatario_id: signatario.id, identificacao_id: identificacao ? identificacao.id : null },
                    hash_documento_inicial: (ultimoElo && ultimoElo.hash_documento_final) || documento.hash_original,
                    hash_documento_final: (ultimoElo && ultimoElo.hash_documento_final) || documento.hash_original,
                    hash_registro_anterior: ultimoElo ? ultimoElo.hash_atual : null,
                    user_id: sessao.user.id,
                });
                const hist1 = new domainHistorico({
                    dado_antigo: oldDesafio,
                    transformacao: historico.trnasformcao.update.value,
                    dado_atual: { ...desafio },
                    user_id: sessao.user.id,
                });
                await trx('tab_historico').insert(hist1.getHistorico());
                // Sem biometria: sessão termina aqui, direto pro PDF — sem foto, sem URL de upload.
                if (!identificacao) {
                    sessao.user.assinatura.identificacao_biometrica_id = null;
                    await trx.commit();
                    try {
                        const saved = await SessionSave.exec(sessao);
                        if (!saved) console.log('SessionSave falhou após commit em confirmarSessaoAssinatura');
                    } catch (errSave) {
                        console.log(errSave);
                    }
                    return { status: true, msg: 'Sessão para assinatura confirmada.', data: { etapa: statusBiometriaAssinatura.validado, id: null } }
                }
                const hist2 = new domainHistorico({
                    transformacao: historico.trnasformcao.create.value,
                    dado_antigo: null,
                    dado_atual: { ...identificacao.getIdentificacaoBiometrica() },
                    user_id: sessao.user.id,
                });
                await trx('tab_historico').insert(hist2.getHistorico());
                const bucket = bucketGateway.Wip();
                const url = await bucket.urlUploadPut({
                    documentoId: identificacao.bucket_wip_path,
                    expiresInSeconds: buckets.temp_url_expiration,
                });
                if (!url.status) throw new ErrorCreateSignatario('Não foi possível gerar a URL de upload da biometria.');
                sessao.user.assinatura.identificacao_biometrica_id = identificacao.id;
                delete url.data.objectName;
                delete url.data.bucket;
                delete url.data.expiresInSeconds;
                url.data.url = urlPublicaBucket(url.data.url);
                await trx.commit();
                try {
                    const saved = await SessionSave.exec(sessao);
                    if (!saved) console.log('SessionSave falhou após commit em confirmarSessaoAssinatura');
                } catch (errSave) {
                    console.log(errSave);
                }
                return { status: true, msg: "Sessao para assinatura confirmada. Realize o reconhecimento facial", data: { ...url.data, id: identificacao.id } }

            } catch (err) {
                console.log(err)
                await trx.rollback();
                if (err?.name === 'ErrorLedgerDocumentoPdf' || err?.name === 'ErrorLedgerDesafioAutenticacao' || err?.name === 'ErrorLedgerIdentificacaoBiometrica') {
                    return { status: false, msg: 'Ocorreu um erro interno de auditoria, tente novamente em instantes.' }
                }
                const mensagem = err.name === 'ErrorCreateSignatario' ? err.message : 'Ocorreu um erro interno, tente novamente em instantes.';
                if (err.log) {
                    Log.getInstance().error(err, err.log);
                }
                return { status: false, msg: mensagem, data: err.data || undefined }
            }
        } catch (err) {
            console.log(err)
            return this.#erro(err, 'confirmarSessaoAssinatura');
        }
    }

    async confirmarRecebimento(data, sessao, sha) {
        try {
            if (!sessao.user.assinatura || !sessao.user.assinatura.documento_id || !sessao.user.assinatura.signatario_id) return { status: false, msg: 'Sessão inválida para assinatura.' }
            const trx = await knex.transaction();
            let identificacao = null;
            try {
                identificacao = await trx('tab_identificacao_biometrica').select('*').where('id', data.id_identificador).andWhere('deletado', false).first();
                if (!identificacao || Number(identificacao.status) != statusBiometriaAssinatura.aguardando_imagem
                    || identificacao.user_id !== sessao.user.id
                    || identificacao.documento_id !== sessao.user.assinatura.documento_id
                    || identificacao.signatario_id !== sessao.user.assinatura.signatario_id) {
                    throw new ErrorCreateSignatario('Ocorreu um erro interno, tente novamente em instantes.');
                }
                const desafioVinculado = await trx('tab_desafio_autenticacao').select('id').where('id', identificacao.desafio_id).first();
                if (!desafioVinculado) throw new ErrorCreateSignatario('Ocorreu um erro interno, tente novamente em instantes.');
                const minutosDesdeInicio = moment().diff(moment(identificacao.data_criacao), 'minutes');
                if (minutosDesdeInicio >= assinaturaSessao.limiteMinutos) throw new ErrorCreateSignatario('Sessão de assinatura expirada. Inicie a assinatura novamente.');
                const oldIdentificacao = { ...identificacao };
                const documento = await trx('tab_documentos').select('*').where('id', sessao.user.assinatura.documento_id).first();
                if (!documento) throw new ErrorCreateSignatario('Documento não localizado ou não disponível para assinatura.');
                let exigeBiometria = assinaturaSessao.biometriaObrigatoria;
                if (!exigeBiometria) {
                    const solicitacaoMeta = await trx('tab_solicitacao_documento').select('meta_dados').where('documento_id', sessao.user.assinatura.documento_id).first();
                    if (solicitacaoMeta && solicitacaoMeta.meta_dados != null) {
                        const meta = typeof solicitacaoMeta.meta_dados === 'string' ? JSON.parse(solicitacaoMeta.meta_dados) : solicitacaoMeta.meta_dados;
                        exigeBiometria = meta != null && meta.reconhecimento_facial === true;
                    }
                }
                const user = await trx('tab_usuarios').select('*').where('id', sessao.user.id).andWhere('deletado', false).first();
                if (!user) throw new ErrorCreateSignatario('Usuário não localizado.');
                const perfil = await trx('tab_perfil_usuario').select('*').where('user_id', user.id).andWhere('deletado', false).first();
                if (!perfil) throw new ErrorCreateSignatario('Perfil não cadastrado, complete seu cadastro antes de assinar o documento.', null, { next_step: 'CRIAR_PERFIL' });
                const checkBiometria = await this.#biometriaCadastrada(perfil.id, trx, true, exigeBiometria);
                if (!checkBiometria.status) throw new ErrorCreateSignatario(checkBiometria.msg, null, checkBiometria.data);
                const login = await trx('tab_login').select('*').where('user_id', user.id).andWhere('deletado', false).first();
                if (login && (login.session_id !== sessao.id)) {
                    // Cookie recriado enquanto o dono da linha continua o mesmo usuário —
                    // atualiza o ponteiro em vez de recusar (mesmo espírito do progresso).
                    await trx('tab_login').where('id', login.id).update({ session_id: sessao.id, data_atualizacao: dateNow() });
                }
                const signatario = await trx('tab_signatarios').select('*').where('documento_id', sessao.user.assinatura.documento_id).andWhere('user_id', user.id).andWhere('deletado', false).first();
                if (!signatario) throw new ErrorCreateSignatario('Dado incorreto ou cadastro incompleto, tente novamente em instantes.');
                const termoSignatario = await trx('tab_aceite_termo_responsabilidade').select('id').where('user_id', user.id).andWhere('termo_id', documento.termo_id).andWhere('documento_id', documento.id).andWhere('deletado', false).first();
                if (!termoSignatario) throw new ErrorCreateSignatario('Termo de responsabilidade não aceito, aceite o termo antes de assinar o documento.', null, { termo_id: documento.termo_id, documento_id: documento.id, next_step: 'ACEITAR_TERMO' });
                const bucket = bucketGateway.Wip();
                const checkImagem = await bucket.validarImagem({ objectName: identificacao.bucket_wip_path });
                if (!checkImagem.status) throw new ErrorCreateSignatario(checkImagem.msg);
                identificacao.status = statusBiometriaAssinatura.aguardando_validacao;
                identificacao.data_criacao = moment(identificacao.data_criacao).format('YYYY-MM-DD HH:mm:ss');
                identificacao.data_atualizacao = dateNow();
                await trx('tab_identificacao_biometrica').where('id', identificacao.id).update(identificacao);
                const ladgerIdentificacao = new LadgerIdentificacaoBiometria(trx);
                ladgerIdentificacao.Initialize(oldIdentificacao);
                await ladgerIdentificacao.GravarAuditoriaModificacao({
                    identificacao: identificacao,
                    tipo_evento: eventoAuditoria.identificacao_biometria_confirmada.label,
                    sequencia: eventoAuditoria.identificacao_biometria_confirmada.sequencia,
                    meta_data: { documento_id: identificacao.documento_id, signatario_id: identificacao.signatario_id, desafio_id: identificacao.desafio_id },
                    user_id: sessao.user.id,
                });
                const solicitacaoVinculo = await trx('tab_solicitacao_documento').select('id').where('documento_id', documento.id).first();
                if (!solicitacaoVinculo) throw new ErrorCreateSignatario('Ocorreu um erro interno, tente novamente em instantes.');
                const ultimoElo = await trx('tab_auditoria_ledger')
                    .where(function () { this.where('documento_id', documento.id).orWhere('solicitacao_id', solicitacaoVinculo.id) })
                    .where('deletado', false)
                    .orderBy('sequencia', 'desc')
                    .first();
                const sequenciaElo = ultimoElo ? Number(ultimoElo.sequencia) + 1 : eventoAuditoria.biometria_recebida.sequencia;
                await new LedgerDocumentoPdf(trx).GravarEvento({
                    solicitacao_id: solicitacaoVinculo.id,
                    documento_id: documento.id,
                    objeto_tipo: objetoAuditoria.identificacao_biometrica,
                    objeto_id: identificacao.id,
                    objeto: identificacao,
                    objeto_anterior: oldIdentificacao,
                    desafio_acesso_id: identificacao.desafio_id,
                    tipo_evento: eventoAuditoria.biometria_recebida.label,
                    sequencia: sequenciaElo,
                    meta_data: { documento_id: identificacao.documento_id, signatario_id: identificacao.signatario_id, desafio_id: identificacao.desafio_id },
                    hash_documento_inicial: (ultimoElo && ultimoElo.hash_documento_final) || documento.hash_original,
                    hash_documento_final: (ultimoElo && ultimoElo.hash_documento_final) || documento.hash_original,
                    hash_registro_anterior: ultimoElo ? ultimoElo.hash_atual : null,
                    user_id: sessao.user.id,
                });
                const hist1 = new domainHistorico({
                    dado_antigo: oldIdentificacao,
                    transformacao: historico.trnasformcao.update.value,
                    dado_atual: { ...identificacao },
                    user_id: sessao.user.id,
                });
                await trx('tab_historico').insert(hist1.getHistorico());
                await trx.commit();
            } catch (err) {
                console.log(err)
                await trx.rollback();
                if (err?.name === 'ErrorLedgerDocumentoPdf' || err?.name === 'ErrorLedgerIdentificacaoBiometrica') {
                    return { status: false, msg: 'Ocorreu um erro interno de auditoria, tente novamente em instantes.' }
                }
                const mensagem = err.name === 'ErrorCreateSignatario' ? err.message : 'Ocorreu um erro interno, tente novamente em instantes.';
                if (err.log) {
                    Log.getInstance().error(err, err.log);
                }
                return { status: false, msg: mensagem, data: err.data || undefined }
            }
            // Fila só depois do commit — falha de publish não desfaz a identificação já em aguardando_validacao.
            try {
                const dispatcher = new MessageDispatcher(this.#rabbitMQ, []);
                dispatcher.addItem({
                    exchange: rabbitMQ.queues.processar_biometria.exchange,
                    routingKey: rabbitMQ.queues.processar_biometria.routingKey,
                    jsonMessage: {
                        identificacao_id: identificacao.id,
                        documento_id: identificacao.documento_id,
                        signatario_id: identificacao.signatario_id,
                        user_id: sessao.user.id,
                        bucket_wip_path: identificacao.bucket_wip_path,
                    },
                    delayMs: rabbitMQ.defaultDelay,
                });
                await dispatcher.dispatch();
            } catch (errDispatch) {
                console.log(errDispatch);
                Log.getInstance().error({ err: errDispatch, identificacao_id: identificacao && identificacao.id }, 'Falha ao publicar processar_biometria após confirmarRecebimento');
            }
            return { status: true, msg: 'Recebimento da foto confirmado com sucesso.' }
        } catch (err) {
            console.log(err)
            return this.#erro(err, 'confirmarRecebimento');
        }
    }

    async carregarProgressoSessao(data, session) {
        try {
            if (!data.documento_id || !data.user_id) return { status: false, msg: 'Sessão inválida.' }
            const documento = await knex('tab_documentos').select('*').where('id', data.documento_id).first();
            if (!documento) return { status: false, msg: 'Documento não localizado ou não disponível para assinatura.' }
            let exigeBiometria = assinaturaSessao.biometriaObrigatoria;
            if (!exigeBiometria) {
                const solicitacaoMeta = await knex('tab_solicitacao_documento').select('meta_dados').where('documento_id', data.documento_id).first();
                if (solicitacaoMeta && solicitacaoMeta.meta_dados != null) {
                    const meta = typeof solicitacaoMeta.meta_dados === 'string' ? JSON.parse(solicitacaoMeta.meta_dados) : solicitacaoMeta.meta_dados;
                    exigeBiometria = meta != null && meta.reconhecimento_facial === true;
                }
            }
            const user = await knex('tab_usuarios').select('*').where('id', data.user_id).andWhere('deletado', false).first();
            if (!user) return { status: false, msg: 'Usuário não localizado.' }
            const perfil = await knex('tab_perfil_usuario').select('*').where('user_id', user.id).andWhere('deletado', false).first();
            if (!perfil) return { status: false, msg: 'Perfil não cadastrado, complete seu cadastro antes de assinar o documento.', data: { next_step: 'CRIAR_PERFIL' } }
            const checkBiometria = await this.#biometriaCadastrada(perfil.id, knex, false, exigeBiometria);
            if (!checkBiometria.status) return { status: false, msg: checkBiometria.msg, data: checkBiometria.data }
            const login = await knex('tab_login').select('*').where('user_id', user.id).andWhere('deletado', false).first();
            if (login && (login.session_id !== session.id)) {
                // Cookie recriado (aba ociosa, novo login) enquanto o dono da linha continua o
                // mesmo usuário da sessão atual — atualiza o ponteiro em vez de recusar a
                // cerimônia com "dado incorreto" (mesmo espírito do relink de perfil_id abaixo).
                await knex('tab_login').where('id', login.id).update({ session_id: session.id, data_atualizacao: dateNow() });
            }
            const signatario = await knex('tab_signatarios').select('*').where('documento_id', data.documento_id).andWhere('user_id', user.id).andWhere('deletado', false).first();
            if (!signatario) return { status: false, msg: 'Dado incorreto ou cadastro incompleto, tente novamente em instantes.' }

            if (signatario.user_id !== user.id) return { status: false, msg: 'Dado incorreto ou cadastro incompleto, tente novamente em instantes.' }
            if (signatario.perfil_id !== perfil.id) {
                // Signatário com perfil_id desatualizado (ex.: perfil vinculado depois do convite)
                // — relinca em vez de recusar o progresso com "dado incorreto".
                const trxRelink = await knex.transaction();
                try {
                    const relink = await this.#relinkSignatarioPerfil(signatario, perfil.id, user.id, trxRelink);
                    if (!relink.status) { await trxRelink.rollback(); return { status: false, msg: relink.msg } }
                    await trxRelink.commit();
                    signatario.perfil_id = perfil.id;
                } catch (error) {
                    await trxRelink.rollback();
                    console.log(error);
                    return { status: false, msg: 'Ocorreu um erro interno, tente novamente em instantes.' }
                }
            }
            const termoSignatario = await knex('tab_aceite_termo_responsabilidade').select('id').where('user_id', user.id).andWhere('termo_id', documento.termo_id).andWhere('documento_id', documento.id).andWhere('deletado', false).first();
            if (!termoSignatario) return { status: false, msg: 'Termo de responsabilidade não aceito, aceite o termo antes de assinar o documento.', data: { termo_id: documento.termo_id, documento_id: documento.id, next_step: 'ACEITAR_TERMO' } }
            const identificacaoAtual = await knex('tab_identificacao_biometrica').select('*')
                .where('documento_id', data.documento_id)
                .andWhere('signatario_id', signatario.id)
                .andWhere('user_id', user.id)
                .andWhere('deletado', false)
                .orderBy('data_criacao', 'desc')
                .first();
            if (identificacaoAtual && [statusBiometriaAssinatura.validado, statusBiometriaAssinatura.aguardando_validacao].includes(Number(identificacaoAtual.status))) {
                session.user.assinatura = {
                    documento_id: data.documento_id,
                    signatario_id: signatario.id,
                    pending_2fa: false,
                    termo_aceite_id: termoSignatario.id,
                    identificacao_biometrica_id: identificacaoAtual.id,
                }
                const saved = await SessionSave.exec(session);
                if (!saved) return { status: false, msg: 'Ocorreu um erro interno, tente novamente em instantes.' }
                if (Number(identificacaoAtual.status) === statusBiometriaAssinatura.aguardando_validacao && identificacaoAtual.bucket_wip_path) {
                    try {
                        const dispatcher = new MessageDispatcher(this.#rabbitMQ, []);
                        dispatcher.addItem({
                            exchange: rabbitMQ.queues.processar_biometria.exchange,
                            routingKey: rabbitMQ.queues.processar_biometria.routingKey,
                            jsonMessage: {
                                identificacao_id: identificacaoAtual.id,
                                documento_id: identificacaoAtual.documento_id,
                                signatario_id: identificacaoAtual.signatario_id,
                                user_id: user.id,
                                bucket_wip_path: identificacaoAtual.bucket_wip_path,
                            },
                            delayMs: rabbitMQ.defaultDelay,
                        });
                        await dispatcher.dispatch();
                    } catch (errDispatch) {
                        console.log(errDispatch);
                        Log.getInstance().error({ err: errDispatch, identificacao_id: identificacaoAtual.id }, 'Falha ao republicar processar_biometria no progresso da assinatura');
                    }
                }
                return {
                    status: true,
                    msg: 'Progresso da assinatura carregado.',
                    data: { etapa: identificacaoAtual.status, documento_id: data.documento_id, signatario_id: signatario.id, identificacao_id: identificacaoAtual.id },
                }
            }
            if (identificacaoAtual && Number(identificacaoAtual.status) === statusBiometriaAssinatura.aguardando_imagem) {
                const desafioVinculado = await knex('tab_desafio_autenticacao').select('id').where('id', identificacaoAtual.desafio_id).first();
                const minutosDesdeInicio = moment().diff(moment(identificacaoAtual.data_criacao), 'minutes');
                if (desafioVinculado && minutosDesdeInicio < assinaturaSessao.limiteMinutos) {
                    const bucket = bucketGateway.Wip();
                    const url = await bucket.urlUploadPut({
                        documentoId: identificacaoAtual.bucket_wip_path,
                        expiresInSeconds: buckets.temp_url_expiration,
                    });
                    if (!url.status) return { status: false, msg: 'Não foi possível gerar a URL de upload da biometria.' }
                    session.user.assinatura = {
                        documento_id: data.documento_id,
                        signatario_id: signatario.id,
                        pending_2fa: false,
                        termo_aceite_id: termoSignatario.id,
                        identificacao_biometrica_id: identificacaoAtual.id,
                    }
                    const saved = await SessionSave.exec(session);
                    if (!saved) return { status: false, msg: 'Ocorreu um erro interno, tente novamente em instantes.' }
                    delete url.data.objectName;
                    delete url.data.bucket;
                    delete url.data.expiresInSeconds;
                    url.data.url = urlPublicaBucket(url.data.url);
                    return {
                        status: true,
                        msg: 'Progresso da assinatura carregado.',
                        data: { ...url.data, etapa: identificacaoAtual.status, documento_id: data.documento_id, signatario_id: signatario.id, identificacao_id: identificacaoAtual.id },
                    }
                }
            }
            if (identificacaoAtual && Number(identificacaoAtual.status) === statusBiometriaAssinatura.negado) {
                const desafioVinculado = await knex('tab_desafio_autenticacao').select('criado_em').where('id', identificacaoAtual.desafio_id).first();
                const minutosDesdeInicio = desafioVinculado ? moment().diff(moment(desafioVinculado.criado_em), 'minutes') : assinaturaSessao.limiteMinutos;
                if (minutosDesdeInicio < assinaturaSessao.limiteMinutos) {
                    return {
                        status: true,
                        msg: 'Progresso da assinatura carregado.',
                        data: { etapa: identificacaoAtual.status, documento_id: data.documento_id, signatario_id: signatario.id, identificacao_id: identificacaoAtual.id },
                    }
                }
            }
            // Biometria não exigida neste documento: nunca existe identificacaoAtual pra consultar —
            // o desafio de assinatura já confirmado é o próprio sinal de etapa concluída, sem limite
            // de tempo (mesmo espírito do identificacaoAtual.status === validado acima, que também não expira).
            if (!exigeBiometria) {
                const desafioConfirmado = await knex('tab_desafio_autenticacao').select('id')
                    .where('user_id', user.id)
                    .andWhere('document_id', data.documento_id)
                    .andWhere('tipo_desafio', confiDoisFatores.desafio.assinatura)
                    .andWhere('usado', true)
                    .andWhere('deletado', false)
                    .orderBy('criado_em', 'desc')
                    .first();
                if (desafioConfirmado) {
                    session.user.assinatura = {
                        documento_id: data.documento_id,
                        signatario_id: signatario.id,
                        pending_2fa: false,
                        termo_aceite_id: termoSignatario.id,
                        identificacao_biometrica_id: null,
                    }
                    const saved = await SessionSave.exec(session);
                    if (!saved) return { status: false, msg: 'Ocorreu um erro interno, tente novamente em instantes.' }
                    return {
                        status: true,
                        msg: 'Progresso da assinatura carregado.',
                        data: { etapa: statusBiometriaAssinatura.validado, documento_id: data.documento_id, signatario_id: signatario.id, identificacao_id: null },
                    }
                }
            }
            const desafioAtual = await knex('tab_desafio_autenticacao').select('*')
                .where('user_id', user.id)
                .andWhere('document_id', data.documento_id)
                .andWhere('tipo_desafio', confiDoisFatores.desafio.assinatura)
                .andWhere('usado', false)
                .andWhere('deletado', false)
                .orderBy('criado_em', 'desc')
                .first();
            if (desafioAtual) {
                const minutosDesdeInicio = moment().diff(moment(desafioAtual.criado_em), 'minutes');
                if (minutosDesdeInicio < assinaturaSessao.limiteMinutos) {
                    session.user.assinatura = {
                        documento_id: data.documento_id,
                        signatario_id: signatario.id,
                        pending_2fa: true,
                        termo_aceite_id: termoSignatario.id,
                    }
                    const saved = await SessionSave.exec(session);
                    if (!saved) return { status: false, msg: 'Ocorreu um erro interno, tente novamente em instantes.' }
                    return {
                        status: true,
                        msg: 'Progresso da assinatura carregado.',
                        data: { etapa: 'otp', documento_id: data.documento_id, signatario_id: signatario.id, identificacao_id: null },
                    }
                }
            }
            return {
                status: true,
                msg: 'Nenhuma sessão de assinatura em andamento.',
                data: { etapa: null, documento_id: data.documento_id, signatario_id: signatario.id, identificacao_id: null },
            }
        } catch (err) {
            console.log(err)
            return this.#erro(err, 'carregarProgressoSessao');
        }
    }

    // getDocumentoAssinatura, solicitarAssinatura, getStatusAssinatura e getUploadEstampaUrl
    // (fluxo de PDF/estampa/status da cerimônia) vivem em createAssinaturaUseCase.js, que é
    // quem o AssinaturaController de fato chama para essas etapas — essa classe cuida só da
    // sessão de autenticação/biometria (sessaoAssinatura, confirmarSessaoAssinatura,
    // confirmarRecebimento, carregarProgressoSessao).

    async #biometriaCadastrada(perfilId, queryable, curarEmbedding = true, exigeBiometria = assinaturaSessao.biometriaObrigatoria) {
        // Flag true (ou meta reconhecimento_facial): exige perfil biométrico aprovado.
        // Sem exigência: assinatura passa só pelo desafio OTP.
        if (!exigeBiometria) return { status: true, biometria: null }
        const biometria = await queryable('tab_perfil_biometria').select('*')
            .where('perfil_id', perfilId)
            .andWhere('deletado', false)
            .orderBy('data_criacao', 'desc')
            .first();
        if (!biometria) return { status: false, msg: 'Biometria não cadastrada, complete seu cadastro antes de assinar o documento.', data: { next_step: 'CADASTRAR_BIOMETRIA' } }
        if (!biometria.aprovado_por) return { status: false, msg: 'Cadastro biométrico em análise, aguarde a aprovação antes de assinar o documento.' }
        if (biometria.rosto_embeddign) return { status: true, biometria }
        if (!biometria.bucket_wip_path) return { status: false, msg: 'Cadastro biométrico incompleto, contate o suporte para reenviar sua foto de referência.' }
        // GET de progresso é somente leitura (carregarProgressoSessao chama com
        // curarEmbedding=false): a linha já existe, segue sem vetorizar agora — vetorizar aqui
        // estouraria o FaceMatch numa aba fria só pra exibir a etapa. Quem confirma de fato o
        // desafio (sessaoAssinatura/confirmarSessaoAssinatura/confirmarRecebimento) cura o embedding.
        if (!curarEmbedding) return { status: true, biometria }
        // Cadastro aprovado sem embedding (aprovação manual/legado) — cura agora a partir da
        // foto de referência ainda no WIP, no mesmo padrão do worker ProcessarBiometria.
        const checkFotoPerfil = await bucketGateway.Wip().obterArquivoBase64({ objectName: biometria.bucket_wip_path });
        if (!checkFotoPerfil.status) return { status: false, msg: 'Ocorreu um erro interno, tente novamente em instantes.' }
        const vetorPerfil = await FaceMatch.vectorize({ image_base64: checkFotoPerfil.data.image_base64 });
        if (!vetorPerfil.status) return { status: false, msg: 'Ocorreu um erro interno, tente novamente em instantes.' }
        biometria.rosto_embeddign = JSON.stringify(vetorPerfil.data.embedding);
        biometria.bucket_wip_path = null;
        biometria.data_atualizacao = dateNow();
        await queryable('tab_perfil_biometria').where('id', biometria.id).update({
            rosto_embeddign: biometria.rosto_embeddign,
            bucket_wip_path: null,
            data_atualizacao: biometria.data_atualizacao,
        });
        return { status: true, biometria }
    }

    async #relinkSignatarioPerfil(signatario, perfilId, userId, trx) {
        try {
            const oldSignatario = { ...signatario };
            const atualizado = { ...signatario, perfil_id: perfilId, data_atualizacao: dateNow() };
            await trx('tab_signatarios').where('id', signatario.id).update({ perfil_id: perfilId, data_atualizacao: atualizado.data_atualizacao });
            const ultimaLedgerSignatario = await trx('tab_auditoria_ledger_signatario')
                .where('signatario_id', signatario.id)
                .where('deletado', false)
                .orderBy('sequencia', 'desc')
                .first();
            const sequenciaSignatario = ultimaLedgerSignatario
                ? Number(ultimaLedgerSignatario.sequencia) + 1
                : eventoAuditoria.signatario_perfil_vinculado.sequencia;
            const auditoriaSignatario = new LedgerSignatario(trx);
            auditoriaSignatario.Initialize(oldSignatario);
            await auditoriaSignatario.GravarAuditoriaModificacao({
                signatario: atualizado,
                tipo_evento: eventoAuditoria.signatario_perfil_vinculado.label,
                sequencia: sequenciaSignatario,
                meta_data: { perfil_id: perfilId, motivo: 'relink_assinatura' },
                user_id: userId,
            });
            await trx('tab_historico').insert(new domainHistorico({
                transformacao: historico.trnasformcao.update.value,
                dado_antigo: oldSignatario,
                dado_atual: atualizado,
                user_id: userId,
            }).getHistorico());
            return { status: true }
        } catch (error) {
            if (error?.name === 'ErrorLedgerSignatario') {
                console.log(error);
                return { status: false, msg: 'Ocorreu um erro interno de auditoria, tente novamente em instantes.' }
            }
            return { status: false, msg: error.message || 'Ocorreu um erro interno, tente novamente em instantes.' }
        }
    }

    async #gateOnboarding(user_id) {
        const checkUser = await repositorioUsuario.getById({ id: user_id });
        if (!checkUser.status) return { status: false, msg: 'Ocorreu um erro interno, tente novamente em instantes.' }
        if (!checkUser.exit) return { status: false, msg: 'Usuário não encontrado.' }
        const user = checkUser.data[0];
        if (user.trocar_senha === 1 || user.trocar_senha === true) {
            return { status: false, msg: 'Conclua a redefinição de senha antes de acessar o documento.' }
        }
        if (!user.codigo_hash || user.dois_fatores !== 1) {
            return { status: false, msg: 'Configure a autenticação de dois fatores antes de acessar o documento.' }
        }
        const checkPerfil = await repositorioPerfil.getPerfilUsuarioByUserId({ user_id });
        if (!checkPerfil.status) return { status: false, msg: 'Ocorreu um erro interno, tente novamente em instantes.' }
        if (!checkPerfil.exit) return { status: false, msg: 'Complete seu cadastro de perfil antes de acessar o documento.' }
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
    constructor(message, log, data) {
        super(message);
        this.name = 'ErrorCreateSignatario';
        this.log = log || null;
        this.data = data || null;
    }
}

module.exports = new createAssinaturaUseCase();
