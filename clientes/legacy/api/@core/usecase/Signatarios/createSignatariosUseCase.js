
const knex = require('../../../infrastructure/db/config/databaseConection')();
const domainSignatario = require('../../domain/Signatario');
const domainDemarcacao = require('../../domain/DemarcacaoAssinatura');
const domainStaging = require('../../domain/UsuarioStaging');
const domainLedger = require('../../domain/AuditoriaLedger');
const domainHistorico = require('../../domain/Historico');
const logExeption = require('../Logs/exeption/exeptionSignatarios');
const dateNow = require('../../../infrastructure/gateways/functions/data/getToday');
const ErrorStackParser = require('error-stack-parser');
const repositorioLogin = require('../../../infrastructure/db/services/LoginRepositorio');
const repositorioDesafio = require('../../../infrastructure/db/services/DesafioAutenticacaoRepository');
const repositorioChaveIntegracao = require('../../../infrastructure/db/services/ChaveIntegracaoRepository');
const repositorioUsuario = require('../../../infrastructure/db/services/UsuarioRepositorio');
const repositorioPerfil = require('../../../infrastructure/db/services/PerfilUsuarioRepository');
const repositorioSignatario = require('../../../infrastructure/db/services/SignatarioRepository');
const repositorioDemarcacao = require('../../../infrastructure/db/services/DemarcacaoAssinaturaRepository');
const LedgerSignatario = require('../../../infrastructure/gateways/helpers/AuditoriaAlteracao/LadgerSignatario');
const LedgerDemarcacao = require('../../../infrastructure/gateways/helpers/AuditoriaAlteracao/LadgerDemarcacao');
const LedgerDocumento = require('../../../infrastructure/gateways/helpers/AuditoriaAlteracao/LadgerDocumento');
const LedgerDocumentoPdf = require('../../../infrastructure/gateways/helpers/AuditoriaAlteracao/LadgerDocumentoPdf');
const LedgerSolicitacao = require('../../../infrastructure/gateways/helpers/AuditoriaAlteracao/LadgerSolicitacao');
const LedgerUsuarioStaging = require('../../../infrastructure/gateways/helpers/AuditoriaAlteracao/LadgerUsuarioStaging');
const RabbitMQ = require('../../../infrastructure/gateways/rabbitmq');
const MessageDispatcher = require('../../../infrastructure/gateways/helpers/Dispatchers/Messages');
const {
    statusDocumentos,
    statusSolicitacao,
    statusSignatario,
    statusUsuarioStaging,
    origemUsuarioStaging,
    tipoDemarcacao,
    confiDoisFatores,
    eventoAuditoria,
    objetoAuditoria,
    roles,
    historico,
    rabbitMQ,
    quadro_assinatura_tamanho
} = require('../../../certs/index.js');
const { SHA } = require('../../../infrastructure/gateways/crypt/sha');
const bcrypt = require('bcrypt');
const uuid = require('uuid');
const logs = require('../../../Logs');
const CreateIdentidadeUsecase = require('./createIdentidade.js');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

class createSignatariosUseCase {

    #rabbitMQ = null;
    payload = null;
    metadado = null;
    historico = [];

    constructor() {
        this.payload = null;
        this.metadado = null;
        this.historico = [];
        this.#rabbitMQ = RabbitMQ.getInstance();
    }


    async indexSignatarios(data) {
        try {
            this.historico = [];
            this.payload = null;
            this.metadado = null;
            if (!data.documento_id) return { status: false, msg: "documento_id é obrigatório." }
            if (!Array.isArray(data.signatarios) || data.signatarios.length === 0) return { status: false, msg: "Informe ao menos um signatário." }
            if (!data.user_id) return { status: false, msg: "Usuário não autenticado." }
            if (!data.desafio_id) return { status: false, revokeLogin: true, msg: "Autenticação de dois fatores inválida." }
            //Via chave de integração a verdade da sessão humana é a chave gravada no banco, não o cookie do browser.
            if (data.integracao) {
                const checkChave = await repositorioChaveIntegracao.getChaveIntegracaoById({ id: data.integracao.chave_id })
                if (!checkChave.status) return { status: false, msg: "Ocorreu um erro interno, tente novamente em instantes." }
                if (!checkChave.exit) return { status: false, msg: "Chave de integração não encontrada." }
                if (checkChave.data.revogada) return { status: false, msg: "Chave de integração revogada." }
                if (checkChave.data.user_id !== data.user_id) return { status: false, msg: "Chave de integração não pertence ao usuário." }
                if (!checkChave.data.desafio_id || checkChave.data.desafio_id !== data.desafio_id) return { status: false, msg: "Chave de integração inválida." }
                if (checkChave.data.session_id !== data.sessao_id) return { status: false, msg: "Chave de integração inválida." }
            } else {
                const checkLogin = await repositorioLogin.getLoginByUserId({ id: data.user_id })
                if (!checkLogin.status) return { status: false, msg: "Ocorreu um erro interno, tente novamente em instantes." }
                if (!checkLogin.exit) return { status: false, revokeLogin: true, msg: "Usuario não encontrado. Entre em contato com o suporte." }
                const login = checkLogin.data;
                if (!login.desafio_id) return { status: false, revokeLogin: true, msg: "Autenticação de dois fatores inválida." }
                if (login.desafio_id !== data.desafio_id) return { status: false, revokeLogin: true, msg: "Autenticação de dois fatores inválida. Faça o login novamente." }
                if (login.session_id !== data.sessao_id) return { status: false, revokeLogin: true, msg: "Sessão inválida. Faça o login novamente." }
                if (login.user_id !== data.user_id) return { status: false, revokeLogin: true, msg: "Usuário inválido. Faça o login novamente." }
            }
            const repositorioDesafioResponse = await repositorioDesafio.getDesafioAutenticacaoById({ id: data.desafio_id })
            if (!repositorioDesafioResponse.status) return { status: false, msg: "Ocorreu um erro interno, tente novamente em instantes." }
            if (!repositorioDesafioResponse.exit) return { status: false, revokeLogin: true, msg: "Autenticação de dois fatores inválida." }
            const desafio = repositorioDesafioResponse.data;
            if (desafio.tipo_desafio !== confiDoisFatores.desafio.login) return { status: false, revokeLogin: true, msg: "Autenticação de dois fatores inválida." }
            const documento = await knex('tab_documentos').select('*').where('id', data.documento_id).first();
            if (!documento) return { status: false, msg: "Documento não encontrado ou não está pronto para cadastro de signatários." }
            const solicitacao = await knex('tab_solicitacao_documento').select('*')
                .where('documento_id', data.documento_id)
                .orderBy('data_criacao', 'desc')
                .first();
            if (!solicitacao) return { status: false, msg: "Solicitação do documento não encontrada ou ainda não concluiu o processamento." }
            if (solicitacao.user_id !== data.user_id) return { status: false, revokeLogin: true, msg: "Usuário inválido. Faça o login novamente." }
            const existentes = await repositorioSignatario.getSignatariosByDocumentoId({ documento_id: data.documento_id });
            if (!existentes.status) return { status: false, msg: "Ocorreu um erro interno, tente novamente em instantes." }
            if (existentes.exit) return { status: true, msg: "Signatários já cadastrados para este documento." }
            if (documento.status !== statusDocumentos.documento_recebido) return { status: false, msg: "Documento não encontrado ou não está pronto para cadastro de signatários." }
            if (solicitacao.status !== statusSolicitacao.upload_concluido) return { status: false, msg: "Solicitação do documento não encontrada ou ainda não concluiu o processamento." }
            if (!documento.hash_original) return { status: false, msg: "Ocorreu um erro interno de auditoria, tente novamente em instantes." }
            const resolucaoAutoAssinatura = await this.#resolverAutoAssinatura(data);
            if (!resolucaoAutoAssinatura.status) return resolucaoAutoAssinatura;
            const validacaoPayload = this.#validarPayload(data.signatarios);
            if (!validacaoPayload.status) return validacaoPayload;
            const sha = new SHA(process.env.SHA);
            this.metadado = {
                user_id: data.user_id,
                desafio_id: data.desafio_id,
                sessao_id: data.sessao_id,
                solicitacao_ip: data.solicitacao_ip,
                user_agent_hash: data.user_agent_hash,
            }
            const resolucoes = [];

            const trx = await knex.transaction();
            const criados = [];
            const notificacoes = [];
            const objects = [];
            try {
                const documentoTravado = await trx('tab_documentos').select('status').where('id', data.documento_id).forUpdate().first();
                if (!documentoTravado) {
                    await trx.rollback();
                    return { status: false, msg: "Documento não encontrado ou não está pronto para cadastro de signatários." }
                }
                if (documentoTravado.status !== statusDocumentos.documento_recebido) {
                    await trx.rollback();
                    if (documentoTravado.status === statusDocumentos.documento_aguardando_assinatura) return { status: true, msg: "Signatários já cadastrados para este documento." }
                    return { status: false, msg: "Documento não encontrado ou não está pronto para cadastro de signatários." }
                }
                const existentesTravado = await trx('tab_signatarios').where('documento_id', data.documento_id).andWhere('deletado', false).first();
                if (existentesTravado) {
                    await trx.rollback();
                    return { status: true, msg: "Signatários já cadastrados para este documento." }
                }
                const identidadeResponse = await this.#resolverIdentidade(sha, trx);
                if (identidadeResponse.status === false) {
                    await trx.rollback();
                    return { status: false, msg: identidadeResponse.msg };
                }
                let ultimoElo = await trx('tab_auditoria_ledger')
                    .where(function () { this.where('documento_id', data.documento_id).orWhere('solicitacao_id', solicitacao.id) })
                    .where('deletado', false)
                    .orderBy('sequencia', 'desc')
                    .first();
                const auditoriaCadeia = new LedgerDocumentoPdf(trx);
                for (const item of this.payload) {
                    let userId = item.data.user_id;
                    let perfilId = item.data.perfil_id;
                    let senhaTemporaria = null;
                    let stagingId = null;
                    let stagingSnapshot = null;
                    const signatario = new domainSignatario({
                        documento_id: data.documento_id,
                        user_id: userId,
                        perfil_id: perfilId,
                        ordem: item.data.ordem,
                        status: (userId && perfilId) ? statusSignatario.pendente : statusSignatario.aguardando_onboarding,
                    });
                    const respSignatario = await repositorioSignatario.createSignatario(signatario.getSignatario(), trx);
                    this.historico.push(new domainHistorico({
                        transformacao: historico.trnasformcao.create.value,
                        dado_atual: signatario.getSignatario(),
                        user_id: data.user_id
                    }));
                    if (!respSignatario.status) throw new Error(respSignatario.msg);
                    const auditoriaSignatario = new LedgerSignatario(trx);
                    await auditoriaSignatario.GravarAuditoriaCriacao({
                        signatario: signatario.getSignatario(),
                        tipo_evento: eventoAuditoria.signatario_criado.label,
                        sequencia: eventoAuditoria.signatario_criado.sequencia,
                        meta_data: {
                            documento_id: data.documento_id,
                            ordem: signatario.ordem,
                            acao_identidade: item.data.acao,
                            total_demarcacoes: item.sign.length,
                        },
                        user_id: data.user_id,
                    });
                    const sequenciaSignatario = ultimoElo ? Number(ultimoElo.sequencia) + 1 : eventoAuditoria.signatario_adicionado.sequencia;
                    ultimoElo = await auditoriaCadeia.GravarEvento({
                        solicitacao_id: solicitacao.id,
                        documento_id: data.documento_id,
                        objeto_tipo: objetoAuditoria.signatario,
                        objeto_id: signatario.id,
                        objeto: signatario.getSignatario(),
                        objeto_anterior: null,
                        desafio_acesso_id: data.desafio_id,
                        tipo_evento: eventoAuditoria.signatario_adicionado.label,
                        sequencia: sequenciaSignatario,
                        meta_data: {
                            documento_id: data.documento_id,
                            ordem: signatario.ordem,
                            acao_identidade: item.data.acao,
                            total_demarcacoes: item.sign.length,
                        },
                        hash_documento_inicial: documento.hash_original,
                        hash_documento_final: documento.hash_original,
                        hash_registro_anterior: ultimoElo ? ultimoElo.hash_atual : null,
                        user_id: data.user_id,
                    });
                    const demarcacoes = [];
                    for (const mark of item.sign) {
                        const demarcacao = new domainDemarcacao({
                            signatario_id: signatario.id,
                            tipo: mark.tipo,
                            pagina: mark.pagina,
                            x: mark.x,
                            y: mark.y,
                            largura: mark.largura,
                            altura: mark.altura,
                            pdf: mark.pdf,
                            pagina_tamanho: mark.pagina_tamanho,
                        });
                        const respDem = await repositorioDemarcacao.createDemarcacaoAssinatura(demarcacao.getDemarcacaoAssinatura(), trx);
                        this.historico.push(new domainHistorico({
                            transformacao: historico.trnasformcao.create.value,
                            dado_atual: demarcacao.getDemarcacaoAssinatura(),
                            user_id: data.user_id
                        }));
                        if (!respDem.status) throw new Error(respDem.msg);
                        const auditoriaDemarcacao = new LedgerDemarcacao(trx);
                        await auditoriaDemarcacao.GravarAuditoriaCriacao({
                            demarcacao: demarcacao.getDemarcacaoAssinatura(),
                            documento_id: data.documento_id,
                            tipo_evento: eventoAuditoria.demarcacao_criada.label,
                            sequencia: eventoAuditoria.demarcacao_criada.sequencia,
                            meta_data: {
                                documento_id: data.documento_id,
                                signatario_id: signatario.id,
                                tipo: demarcacao.tipo,
                                pagina: demarcacao.pagina,
                            },
                            user_id: data.user_id,
                        });
                        const sequenciaDemarcacao = ultimoElo ? Number(ultimoElo.sequencia) + 1 : eventoAuditoria.demarcacao_definida.sequencia;
                        ultimoElo = await auditoriaCadeia.GravarEvento({
                            solicitacao_id: solicitacao.id,
                            documento_id: data.documento_id,
                            objeto_tipo: objetoAuditoria.demarcacao,
                            objeto_id: demarcacao.id,
                            objeto: demarcacao.getDemarcacaoAssinatura(),
                            objeto_anterior: null,
                            desafio_acesso_id: data.desafio_id,
                            tipo_evento: eventoAuditoria.demarcacao_definida.label,
                            sequencia: sequenciaDemarcacao,
                            meta_data: {
                                documento_id: data.documento_id,
                                signatario_id: signatario.id,
                                tipo: demarcacao.tipo,
                                pagina: demarcacao.pagina,
                            },
                            hash_documento_inicial: documento.hash_original,
                            hash_documento_final: documento.hash_original,
                            hash_registro_anterior: ultimoElo ? ultimoElo.hash_atual : null,
                            user_id: data.user_id,
                        });
                        demarcacoes.push(demarcacao.getDemarcacaoAssinatura());
                    }
                    criados.push({
                        ...signatario.getSignatario(),
                        acao_identidade: item.data.acao,
                        demarcacoes,
                        nome: item.data.nome,
                        email: item.data.email
                    });
                    notificacoes.push(this.#notification({
                        tipo: item.data.acao,
                        signatario_id: signatario.id,
                        documento_id: data.documento_id,
                        solicitacao_id: solicitacao.id,
                        email: item.data.email,
                        nome: item.data.nome,
                        solicitante_user_id: data.user_id,
                        destinatario_user_id: item.data.user_id,
                        senha_temporaria: item.data.senhaEmail,
                    }));
                }
                const oldDocumento = { ...documento };
                const newDocumento = { ...documento, status: statusDocumentos.documento_aguardando_assinatura };
                const ultimaLedgerDocumentoDados = await trx('tab_auditoria_ledger_documento')
                    .where('documento_id', data.documento_id)
                    .where('deletado', false)
                    .orderBy('criado_em', 'desc')
                    .first();
                const sequenciaDocumentoDados = ultimaLedgerDocumentoDados
                    ? Number(ultimaLedgerDocumentoDados.sequencia) + 1
                    : eventoAuditoria.documento_dados_pronto.sequencia;
                const auditoriaDocumentoDados = new LedgerDocumento(trx);
                auditoriaDocumentoDados.Initialize(oldDocumento);
                await auditoriaDocumentoDados.GravarAuditoriaModificacao({
                    documento: newDocumento,
                    tipo_evento: eventoAuditoria.documento_dados_pronto.label,
                    sequencia: sequenciaDocumentoDados,
                    meta_data: {
                        total_signatarios: criados.length,
                        status_anterior: oldDocumento.status,
                        status_novo: statusDocumentos.documento_aguardando_assinatura,
                    },
                    documento_update: {
                        status: statusDocumentos.documento_aguardando_assinatura,
                    },
                    user_id: data.user_id,
                });
                const sequenciaDocumentoPronto = ultimoElo ? Number(ultimoElo.sequencia) + 1 : eventoAuditoria.documento_pronto_assinatura.sequencia;
                ultimoElo = await auditoriaCadeia.GravarEvento({
                    solicitacao_id: solicitacao.id,
                    documento_id: data.documento_id,
                    objeto_tipo: objetoAuditoria.documento,
                    objeto_id: data.documento_id,
                    objeto: newDocumento,
                    objeto_anterior: oldDocumento,
                    desafio_acesso_id: data.desafio_id,
                    tipo_evento: eventoAuditoria.documento_pronto_assinatura.label,
                    sequencia: sequenciaDocumentoPronto,
                    meta_data: {
                        total_signatarios: criados.length,
                        status_anterior: oldDocumento.status,
                        status_novo: statusDocumentos.documento_aguardando_assinatura,
                    },
                    hash_documento_inicial: documento.hash_original,
                    hash_documento_final: documento.hash_original,
                    hash_registro_anterior: ultimoElo ? ultimoElo.hash_atual : null,
                    user_id: data.user_id,
                });
                const oldSolicitacao = { ...solicitacao };
                const newSolicitacao = {
                    ...solicitacao,
                    status: statusSolicitacao.solicitado_assinatura,
                    data_atualizacao: dateNow(),
                };
                const ultimaLedgerSolicitacao = await trx('tab_auditoria_ledger_solicitacao')
                    .where('solicitacao_id', solicitacao.id)
                    .where('deletado', false)
                    .orderBy('criado_em', 'desc')
                    .first();
                const sequenciaSolicitacao = ultimaLedgerSolicitacao
                    ? Number(ultimaLedgerSolicitacao.sequencia) + 1
                    : eventoAuditoria.assinatura_solicitada.sequencia;
                const auditoriaSolicitacao = new LedgerSolicitacao(trx);
                auditoriaSolicitacao.Initialize(oldSolicitacao);
                await auditoriaSolicitacao.GravarAuditoriaModificacao({
                    solicitacao: newSolicitacao,
                    tipo_evento: statusSolicitacao.solicitado_assinatura,
                    sequencia: sequenciaSolicitacao,
                    meta_data: {
                        documento_id: data.documento_id,
                        total_signatarios: criados.length,
                        signatario_ids: criados.map((s) => s.id),
                        signatarios: criados.map((s) => ({
                            id: s.id,
                            nome: s.nome,
                            email: s.email,
                            ordem: s.ordem,
                            acao_identidade: s.acao_identidade,
                            total_demarcacoes: s.demarcacoes.length,
                        }))
                    },
                    solicitacao_update: {
                        status: statusSolicitacao.solicitado_assinatura,
                        data_atualizacao: newSolicitacao.data_atualizacao,
                    },
                });
                if (this.historico.length > 0) {
                    for (const item of this.historico) {
                        await trx('tab_historico').insert(item);
                    }
                }
                await trx.commit()
                try {
                    const dispatcher = new MessageDispatcher(this.#rabbitMQ, []);
                    for (const n of notificacoes) {
                        dispatcher.addItem({
                            exchange: rabbitMQ.queues.distribuirconvitesignatario.exchange,
                            routingKey: rabbitMQ.queues.distribuirconvitesignatario.routingKey,
                            jsonMessage: n,
                            delayMs: rabbitMQ.defaultDelay,
                        });
                    }
                    await dispatcher.dispatch();
                } catch (dispatchErr) {
                    logs.getInstance().fatal({
                        err: dispatchErr,
                        documento_id: data.documento_id,
                        total: notificacoes.length,
                    }, 'Falha ao enfileirar convites de signatário após commit');
                }
                return {
                    status: true,
                    msg: "Signatários cadastrados com sucesso."
                }
            } catch (error) {
                await trx.rollback();
                if (
                    error?.name === 'ErrorLedgerSignatario'
                    || error?.name === 'ErrorLedgerDemarcacao'
                    || error?.name === 'ErrorLedgerDocumento'
                    || error?.name === 'ErrorLedgerDocumentoPdf'
                    || error?.name === 'ErrorLedgerSolicitacao'
                    || error?.name === 'ErrorLedgerUsuarioStaging'
                ) {
                    console.log(error);
                    return { status: false, msg: 'Ocorreu um erro interno de auditoria, tente novamente em instantes.' }
                }
                throw error;
            }
        } catch (err) {
            console.log(err)
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(err);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            logExeption({
                descricaoDoErro: 'Exeption estourada. use case Signatarios - createSignatariosUseCase - indexSignatarios',
                linhaDoErro: lineError,
                nomeDoArquivo: fileName,
                data_criacao: dateNow(),
                data_atualizacao: dateNow(),
                deletado: false,
            })
            return { status: false, msg: 'Erro interno do servidor, log gerado' }
        }
    }


    async #resolverAutoAssinatura(data) {
        const autoAssinaturaItens = data.signatarios.filter((item) => item?.data?.auto_assinatura === true);
        if (autoAssinaturaItens.length > 1) return { status: false, msg: "Apenas um signatário pode ser marcado como autoassinatura por vez." }
        if (autoAssinaturaItens.length === 0) return { status: true }
        const checkPerfil = await repositorioPerfil.getPerfilUsuarioByUserId({ user_id: data.user_id })
        if (!checkPerfil.status) return { status: false, msg: "Ocorreu um erro interno, tente novamente em instantes." }
        if (!checkPerfil.exit) return { status: false, msg: "Complete seu cadastro de perfil antes de se adicionar como signatário." }
        const checkUsuario = await repositorioUsuario.getById({ id: data.user_id })
        if (!checkUsuario.status) return { status: false, msg: "Ocorreu um erro interno, tente novamente em instantes." }
        if (!checkUsuario.exit) return { status: false, msg: "Usuário não encontrado." }
        const perfil = checkPerfil.data;
        const usuario = checkUsuario.data[0];
        const sha = new SHA(process.env.SHA);
        const cpfPlain = sha.decrypt(perfil.cpf);
        const item = autoAssinaturaItens[0];
        item.data = { ...item.data, nome: perfil.nome, cpf: cpfPlain, telefone: perfil.telefone, email: usuario.email };
        return { status: true }
    }

    async #resolverIdentidade(sha, trx) {
        const cadastrado = [];
        const usuarioCadastrado = [];
        const semCadastro = [];
        for await (const item of this.payload) {
            const dataSignatario = item.data;
            const cpf_bindex = sha.generateBlindIndex(dataSignatario.cpf);
            const [checkPerfilCpf, checkUsuario] = await Promise.all([
                repositorioPerfil.getPerfilUsuarioByCpf({ cpf_bindex }),
                repositorioUsuario.getByEmail({ email: dataSignatario.email })
            ]);
            if (!checkPerfilCpf.status) return { status: false, msg: "Ocorreu um erro interno, tente novamente em instantes." }
            if (!checkUsuario.status) return { status: false, msg: "Ocorreu um erro interno, tente novamente em instantes." }
            if (checkPerfilCpf.exit && checkUsuario.exit) cadastrado.push({ ...dataSignatario, perfil_id: checkPerfilCpf.data.id, user_id: checkUsuario.data.id });
            if (!checkPerfilCpf.exit && checkUsuario.exit) usuarioCadastrado.push({ ...dataSignatario, user_id: checkUsuario.data.id })
            if (!checkPerfilCpf.exit && !checkUsuario.exit) semCadastro.push({ ...dataSignatario })
        }
        if (usuarioCadastrado.length > 0 || semCadastro.length > 0) {
            const identidade = new CreateIdentidadeUsecase({ trx, sha });
            if (usuarioCadastrado.length > 0) {
                const metadadoPerfil = { ...this.metadado, acao: 'criar_perfil_signatario' };
                const result = await identidade.CreateProfileSignatario(usuarioCadastrado, metadadoPerfil, this.historico);
                if (!result) return { status: false, msg: "Não foi possível criar o perfil dos signatários. Tente novamente em instantes." }
                this.payload = this.payload.map((item) => {
                    const found = usuarioCadastrado.find((u) => u.cpf === item.data.cpf);
                    if (found) {
                        return {
                            ...item, data: {
                                ...item.data, user_id: found.user_id,
                                perfil_id: found.perfil_id, acao: "criar_perfil"
                            }
                        };
                    }
                    return item;
                });
            }
            if (semCadastro.length > 0) {
                const metadadoCadastro = { ...this.metadado, acao: 'criar_usuario_signatario' };
                const result = await identidade.CreateUsuarioSignatario(semCadastro, metadadoCadastro, this.historico);
                if (!result) return { status: false, msg: "Não foi possível criar o perfil dos signatários. Tente novamente em instantes." }
                this.payload = this.payload.map((item) => {
                    const found = semCadastro.find((u) => u.cpf === item.data.cpf);
                    if (found) return { ...item, data: { ...item.data, perfil_id: found.perfil_id, user_id: found.user_id, acao: "criar_conta", senhaEmail: found.senhaEmail } };
                    return item;
                });
            }
        }
        if (cadastrado.length > 0) {
            this.payload = this.payload.map((item) => {
                const found = cadastrado.find((u) => u.cpf === item.data.cpf);
                if (found) return { ...item, data: { ...item.data, perfil_id: found.perfil_id, user_id: found.user_id, acao: "convite" } };
                return item;
            });
        }
        return { status: true }
    }


    #validarPayload(signatarios) {
        const maisDeUmaAssinatura = signatarios.some((item) => Array.isArray(item.sign) && item.sign.length > 1);
        if (maisDeUmaAssinatura) return { status: false, msg: "Não é permitido mais de uma demarcação por signatário." };
        for (const item of signatarios) {
            const altura = item.sign[0].pdf.altura;
            const largura = item.sign[0].pdf.largura;
            if (altura !== quadro_assinatura_tamanho.altura || largura !== quadro_assinatura_tamanho.largura) return { status: false, msg: `Demarcação de ${item.data.nome} com tamanho inválido. Altura: ${altura}, Largura: ${largura}.` }
        }
        for (let i = 0; i < signatarios.length; i++) {
            const markA = signatarios[i].sign[0];
            for (let j = i + 1; j < signatarios.length; j++) {
                const markB = signatarios[j].sign[0];
                if (!this.#boxesColidem(markA, markB)) continue;
                const nomeA = signatarios[i].data.nome;
                const nomeB = signatarios[j].data.nome;
                return {
                    status: false,
                    msg: `Demarcações de ${nomeA} e ${nomeB} se sobrepõem na página ${markA.pagina}.`,
                };
            }
        }
        const normalizados = [];
        const cpfs = new Set();
        const emails = new Set();
        const telefones = new Set();
        for (let i = 0; i < signatarios.length; i++) {
            const item = signatarios[i];
            if (!item || !item.data) return { status: false, msg: `Signatário na posição ${i} sem data.` }
            const nome = (item.data.nome || '').trim();
            const email = (item.data.email || '').trim().toLowerCase();
            const cpfDigits = String(item.data.cpf || '').replace(/\D/g, '');
            const telefone = (item.data.telefone || '').trim();
            const telefoneDigits = telefone.replace(/\D/g, '');
            if (!nome) return { status: false, msg: `Nome obrigatório no signatário ${i + 1}.` }
            if (!telefoneDigits) return { status: false, msg: `Telefone é um campo obrigatório. Ausente no signatario ${nome}.` }
            if (telefoneDigits.length < 10 || telefoneDigits.length > 11) return { status: false, msg: `Telefone inválido no signatário ${nome}.` }
            if (!email || !EMAIL_REGEX.test(email)) return { status: false, msg: `E-mail inválido no signatário ${i + 1}.` }
            if (cpfDigits.length !== 11) return { status: false, msg: `CPF inválido no signatário ${i + 1}.` }
            if (cpfs.has(cpfDigits)) return { status: false, msg: `CPF duplicado na lista de signatários.` }
            if (emails.has(email)) return { status: false, msg: `E-mail duplicado na lista de signatários.` }
            if (telefones.has(telefoneDigits)) return { status: false, msg: `Telefone duplicado na lista de signatários.` }
            cpfs.add(cpfDigits);
            emails.add(email);
            telefones.add(telefoneDigits);
            if (!Array.isArray(item.sign) || item.sign.length === 0 || item.sign.length > 1) return { status: false, msg: `Signatário ${nome} precisa de uma demarcação.` }
            const signs = [];
            for (let j = 0; j < item.sign.length; j++) {
                const mark = item.sign[j];
                const tipo = mark.tipo || tipoDemarcacao.assinatura;
                if (![tipoDemarcacao.assinatura, tipoDemarcacao.rubrica].includes(tipo)) return { status: false, msg: `Tipo de demarcação inválido para ${nome}.` }
                if (!mark.pagina || Number(mark.pagina) < 1) return { status: false, msg: `Página inválida na demarcação de ${nome}.` }
                const campos = ['x', 'y', 'largura', 'altura'];
                for (const campo of campos) {
                    const valor = Number(mark[campo]);
                    if (Number.isNaN(valor) || valor < 0 || valor > 1) return { status: false, msg: `Coordenada ${campo} inválida na demarcação de ${nome}.` }
                }
                if (!mark.pdf || !mark.pagina_tamanho) return { status: false, msg: `Demarcação de ${nome} sem pdf/pagina_tamanho.` }
                if (Object.keys(mark.pdf).length !== 6) return { status: false, msg: `Demarcação de ${nome} sem pdf/pagina_tamanho.` }
                if (mark.pdf.x < 0 || isNaN(mark.pdf.x)) return { status: false, msg: `Coordenada x inválida na demarcação de ${nome}.` }
                if (mark.pdf.y < 0 || isNaN(mark.pdf.y)) return { status: false, msg: `Coordenada y inválida na demarcação de ${nome}.` }
                if (mark.pdf.largura < 0 || isNaN(mark.pdf.largura)) return { status: false, msg: `Coordenada largura inválida na demarcação de ${nome}.` }
                if (mark.pdf.altura < 0 || isNaN(mark.pdf.altura)) return { status: false, msg: `Coordenada altura inválida na demarcação de ${nome}.` }
                if (mark.pdf.origem !== 'bottom-left' && mark.pdf.origem !== 'top-left' && mark.pdf.origem !== 'bottom-right' && mark.pdf.origem !== 'top-right') return { status: false, msg: `Origem inválida na demarcação de ${nome}.` }
                if (mark.pdf.unidade !== 'pt') return { status: false, msg: `Unidade inválida na demarcação de ${nome}.` }
                signs.push({
                    tipo,
                    pagina: Number(mark.pagina),
                    x: Number(mark.x),
                    y: Number(mark.y),
                    largura: Number(mark.largura),
                    altura: Number(mark.altura),
                    pdf: mark.pdf,
                    pagina_tamanho: mark.pagina_tamanho,
                });
            }
            let ordem = item.data.ordem === undefined || item.data.ordem === null ? null : Number(item.data.ordem);
            if (ordem && (!Number.isInteger(ordem) || ordem < 1)) return { status: false, msg: `Ordem inválida para o signatário ${nome}.` }
            // Link opcional do convite (cerimônia do Workspace). Só http/https; vazio = e-mail aponta pro site.
            let linkAssinatura = (item.data.link_assinatura || '').trim();
            if (linkAssinatura && (!/^https?:\/\//.test(linkAssinatura) || linkAssinatura.length > 2000)) return { status: false, msg: `Link de assinatura inválido no signatário ${nome}.` }
            if (!linkAssinatura) linkAssinatura = null;
            normalizados.push({
                data: { nome, email, cpf: cpfDigits, telefone: telefoneDigits, ordem, link_assinatura: linkAssinatura },
                sign: signs,
            });
        }
        this.payload = normalizados;
        return { status: true }
    }

    #boxesColidem(a, b) {
        if (Number(a.pagina) !== Number(b.pagina)) return false;
        const dx = Math.abs(Number(a.pdf.x) - Number(b.pdf.x));
        const dy = Math.abs(Number(a.pdf.y) - Number(b.pdf.y));
        return dx < quadro_assinatura_tamanho.largura
            && dy < quadro_assinatura_tamanho.altura;
    }


    #notification(data) {
        switch (data.tipo) {
            case 'criar_conta':
                return {
                    tipo: 'criar_conta',
                    signatario_id: data.signatario_id,
                    documento_id: data.documento_id,
                    solicitacao_id: data.solicitacao_id,
                    email: data.email,
                    nome: data.nome,
                    solicitante_user_id: data.solicitante_user_id,
                    destinatario_user_id: data.destinatario_user_id,
                    senha_temporaria: data.senha_temporaria,
                };
            case 'criar_perfil':
                return {
                    tipo: 'criar_perfil',
                    signatario_id: data.signatario_id,
                    documento_id: data.documento_id,
                    solicitacao_id: data.solicitacao_id,
                    email: data.email,
                    nome: data.nome,
                    solicitante_user_id: data.solicitante_user_id,
                    destinatario_user_id: data.destinatario_user_id,
                };
            case 'convite':
                return {
                    tipo: 'convite',
                    signatario_id: data.signatario_id,
                    documento_id: data.documento_id,
                    solicitacao_id: data.solicitacao_id,
                    email: data.email,
                    nome: data.nome,
                    solicitante_user_id: data.solicitante_user_id,
                    destinatario_user_id: data.destinatario_user_id,
                };
            default:
                throw new Error(`Tipo de notificação inválido: ${data.tipo}`);

        }

    }

}

module.exports = new createSignatariosUseCase();