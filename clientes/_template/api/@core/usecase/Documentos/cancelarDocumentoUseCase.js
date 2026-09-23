
const knex = require('../../../infrastructure/db/config/databaseConection.js')();
const moment = require('moment');
const ErrorStackParser = require('error-stack-parser');
const logExeption = require('../Logs/exeption/exeptionDocumentos');
const dateNow = require('../../../infrastructure/gateways/functions/data/getToday');
const domainHistorico = require('../../domain/Historico');
const repositorioUsuario = require('../../../infrastructure/db/services/UsuarioRepositorio');
const LedgerDocumento = require('../../../infrastructure/gateways/helpers/AuditoriaAlteracao/LadgerDocumento');
const LedgerSolicitacao = require('../../../infrastructure/gateways/helpers/AuditoriaAlteracao/LadgerSolicitacao');
const LedgerSignatario = require('../../../infrastructure/gateways/helpers/AuditoriaAlteracao/LadgerSignatario');
const LedgerDocumentoPdf = require('../../../infrastructure/gateways/helpers/AuditoriaAlteracao/LadgerDocumentoPdf');
const RabbitMQ = require('../../../infrastructure/gateways/rabbitmq');
const MessageDispatcher = require('../../../infrastructure/gateways/helpers/Dispatchers/Messages');
const logs = require('../../../Logs');
const {
    statusDocumentos,
    statusSolicitacao,
    statusSignatario,
    roles,
    eventoAuditoria,
    objetoAuditoria,
    historico,
    rabbitMQ,
} = require('../../../certs/index.js');

// Signatários que ainda não chegaram a um estado terminal de sucesso. Quem já
// assinou (statusSignatario.assinado) nunca entra nesta lista e nunca é tocado.
const STATUS_SIGNATARIO_CANCELAVEIS = [statusSignatario.pendente, statusSignatario.processando, statusSignatario.aguardando_onboarding, statusSignatario.erro];

class cancelarDocumentoUseCase {

    #rabbitMQ = null;

    constructor() {
        this.#rabbitMQ = RabbitMQ.getInstance();
    }

    async indexCancelarDocumento(data) {
        try {
            if (!data.documento_id) return { status: false, msg: "documento_id é obrigatório." }
            if (!data.user_id) return { status: false, msg: "Usuário não autenticado." }
            const checkUsuario = await repositorioUsuario.getById({ id: data.user_id })
            if (!checkUsuario.status) return { status: false, msg: "Ocorreu um erro interno, tente novamente em instantes." }
            if (!checkUsuario.exit) return { status: false, revokeLogin: true, msg: "Usuario não encontrado. Entre em contato com o suporte." }
            const usuario = checkUsuario.data[0];
            if (usuario.bloqueado) return { status: false, revokeLogin: true, msg: "Usuário bloqueado. Entre em contato com o suporte." }
            const documento = await knex('tab_documentos').select('*').where('id', data.documento_id).first();
            if (!documento) return { status: false, msg: "Documento não encontrado." }
            const solicitacao = await knex('tab_solicitacao_documento').select('*')
                .where('documento_id', data.documento_id)
                .orderBy('data_criacao', 'desc')
                .first();
            if (!solicitacao) return { status: false, msg: "Solicitação do documento não encontrada." }
            // Dono da solicitação OU admin — nunca só um dos dois ângulos.
            if (usuario.role !== roles.admin && solicitacao.user_id !== data.user_id) return { status: false, msg: "Você não tem permissão para cancelar este documento." }
            if (documento.status === statusDocumentos.documento_assinado) return { status: false, msg: "Documento já assinado não pode ser cancelado." }
            if (documento.status === statusDocumentos.documento_cancelado) return { status: false, msg: "Documento já está cancelado." }
            if (solicitacao.status === statusSolicitacao.cancelado) return { status: false, msg: "Documento já está cancelado." }

            const trx = await knex.transaction();
            const notificacoes = [];
            try {
                // Segunda leitura, agora com lock — entre a primeira leitura e o lock o
                // último signatário pode ter terminado de assinar e virado o documento.
                const documentoTravado = await trx('tab_documentos').select('*').where('id', data.documento_id).forUpdate().first();
                if (!documentoTravado) {
                    await trx.rollback();
                    return { status: false, msg: "Documento não encontrado." }
                }
                if (documentoTravado.status === statusDocumentos.documento_assinado) {
                    await trx.rollback();
                    return { status: false, msg: "Documento já assinado não pode ser cancelado." }
                }
                if (documentoTravado.status === statusDocumentos.documento_cancelado) {
                    await trx.rollback();
                    return { status: false, msg: "Documento já está cancelado." }
                }
                const solicitacaoTravada = await trx('tab_solicitacao_documento').select('*').where('id', solicitacao.id).forUpdate().first();
                if (!solicitacaoTravada) {
                    await trx.rollback();
                    return { status: false, msg: "Solicitação do documento não encontrada." }
                }
                if (solicitacaoTravada.status === statusSolicitacao.cancelado) {
                    await trx.rollback();
                    return { status: false, msg: "Documento já está cancelado." }
                }
                const signatariosCancelaveis = await trx('tab_signatarios').select('*')
                    .where('documento_id', data.documento_id)
                    .andWhere('deletado', false)
                    .whereIn('status', STATUS_SIGNATARIO_CANCELAVEIS)
                    .forUpdate();

                const oldDocumento = { ...documentoTravado, criado_em: moment(documentoTravado.criado_em).format('YYYY-MM-DD HH:mm:ss') };
                const novoDocumento = { ...oldDocumento, status: statusDocumentos.documento_cancelado };
                const ultimaLedgerDocumento = await trx('tab_auditoria_ledger_documento')
                    .where('documento_id', data.documento_id)
                    .where('deletado', false)
                    .orderBy('sequencia', 'desc')
                    .first();
                const sequenciaDocumento = ultimaLedgerDocumento ? Number(ultimaLedgerDocumento.sequencia) + 1 : eventoAuditoria.documento_cancelado.sequencia;
                const auditoriaDocumento = new LedgerDocumento(trx);
                auditoriaDocumento.Initialize(oldDocumento);
                await auditoriaDocumento.GravarAuditoriaModificacao({
                    documento: novoDocumento,
                    tipo_evento: eventoAuditoria.documento_cancelado.label,
                    sequencia: sequenciaDocumento,
                    meta_data: {
                        status_anterior: oldDocumento.status,
                        status_novo: statusDocumentos.documento_cancelado,
                        cancelado_por: data.user_id,
                        total_signatarios_cancelados: signatariosCancelaveis.length,
                    },
                    documento_update: {
                        status: statusDocumentos.documento_cancelado,
                    },
                    user_id: data.user_id,
                });

                const oldSolicitacao = {
                    ...solicitacaoTravada,
                    data_criacao: moment(solicitacaoTravada.data_criacao).format('YYYY-MM-DD HH:mm:ss'),
                    data_atualizacao: moment(solicitacaoTravada.data_atualizacao).format('YYYY-MM-DD HH:mm:ss'),
                };
                const novaSolicitacao = { ...oldSolicitacao, status: statusSolicitacao.cancelado, data_atualizacao: dateNow() };
                const ultimaLedgerSolicitacao = await trx('tab_auditoria_ledger_solicitacao')
                    .where('solicitacao_id', solicitacaoTravada.id)
                    .where('deletado', false)
                    .orderBy('sequencia', 'desc')
                    .first();
                const sequenciaSolicitacao = ultimaLedgerSolicitacao ? Number(ultimaLedgerSolicitacao.sequencia) + 1 : eventoAuditoria.solicitacao_cancelada.sequencia;
                const auditoriaSolicitacao = new LedgerSolicitacao(trx);
                auditoriaSolicitacao.Initialize(oldSolicitacao);
                await auditoriaSolicitacao.GravarAuditoriaModificacao({
                    solicitacao: novaSolicitacao,
                    tipo_evento: eventoAuditoria.solicitacao_cancelada.label,
                    sequencia: sequenciaSolicitacao,
                    meta_data: {
                        documento_id: data.documento_id,
                        cancelado_por: data.user_id,
                        total_signatarios_cancelados: signatariosCancelaveis.length,
                    },
                    solicitacao_update: {
                        status: statusSolicitacao.cancelado,
                        data_atualizacao: novaSolicitacao.data_atualizacao,
                    },
                });

                await trx('tab_historico').insert(new domainHistorico({
                    transformacao: historico.trnasformcao.update.value,
                    dado_antigo: oldDocumento,
                    dado_atual: { ...novoDocumento },
                    user_id: data.user_id,
                }).getHistorico());
                await trx('tab_historico').insert(new domainHistorico({
                    transformacao: historico.trnasformcao.update.value,
                    dado_antigo: oldSolicitacao,
                    dado_atual: { ...novaSolicitacao },
                    user_id: data.user_id,
                }).getHistorico());

                // Espelha o cancelamento na cadeia mestre (tab_auditoria_ledger), mesmo
                // padrão usado em createSignatariosUseCase para documento_pronto_assinatura.
                let ultimoElo = await trx('tab_auditoria_ledger')
                    .where(function () { this.where('documento_id', data.documento_id).orWhere('solicitacao_id', solicitacaoTravada.id) })
                    .where('deletado', false)
                    .orderBy('sequencia', 'desc')
                    .first();
                const auditoriaCadeia = new LedgerDocumentoPdf(trx);
                const sequenciaCadeiaDocumento = ultimoElo ? Number(ultimoElo.sequencia) + 1 : eventoAuditoria.documento_cancelado.sequencia;
                ultimoElo = await auditoriaCadeia.GravarEvento({
                    solicitacao_id: solicitacaoTravada.id,
                    documento_id: data.documento_id,
                    objeto_tipo: objetoAuditoria.documento,
                    objeto_id: data.documento_id,
                    objeto: novoDocumento,
                    objeto_anterior: oldDocumento,
                    desafio_acesso_id: null,
                    tipo_evento: eventoAuditoria.documento_cancelado.label,
                    sequencia: sequenciaCadeiaDocumento,
                    meta_data: {
                        status_anterior: oldDocumento.status,
                        status_novo: statusDocumentos.documento_cancelado,
                        cancelado_por: data.user_id,
                    },
                    hash_documento_inicial: documentoTravado.hash_original,
                    hash_documento_final: documentoTravado.hash_original,
                    hash_registro_anterior: ultimoElo ? ultimoElo.hash_atual : null,
                    user_id: data.user_id,
                });

                for (const signatario of signatariosCancelaveis) {
                    const oldSignatario = {
                        ...signatario,
                        data_criacao: moment(signatario.data_criacao).format('YYYY-MM-DD HH:mm:ss'),
                        data_atualizacao: moment(signatario.data_atualizacao).format('YYYY-MM-DD HH:mm:ss'),
                    };
                    const novoSignatario = { ...oldSignatario, status: statusSignatario.cancelado, data_atualizacao: dateNow() };
                    await trx('tab_signatarios').update({
                        status: novoSignatario.status,
                        data_atualizacao: novoSignatario.data_atualizacao,
                    }).where('id', signatario.id);
                    const ultimaLedgerSignatario = await trx('tab_auditoria_ledger_signatario')
                        .where('signatario_id', signatario.id)
                        .where('deletado', false)
                        .orderBy('sequencia', 'desc')
                        .first();
                    const sequenciaSignatario = ultimaLedgerSignatario ? Number(ultimaLedgerSignatario.sequencia) + 1 : eventoAuditoria.signatario_cancelado.sequencia;
                    const auditoriaSignatario = new LedgerSignatario(trx);
                    auditoriaSignatario.Initialize(oldSignatario);
                    await auditoriaSignatario.GravarAuditoriaModificacao({
                        signatario: novoSignatario,
                        tipo_evento: eventoAuditoria.signatario_cancelado.label,
                        sequencia: sequenciaSignatario,
                        meta_data: {
                            documento_id: data.documento_id,
                            status_anterior: oldSignatario.status,
                            status_novo: statusSignatario.cancelado,
                            cancelado_por: data.user_id,
                        },
                        user_id: data.user_id,
                    });
                    const sequenciaCadeiaSignatario = ultimoElo ? Number(ultimoElo.sequencia) + 1 : eventoAuditoria.signatario_cancelado.sequencia;
                    ultimoElo = await auditoriaCadeia.GravarEvento({
                        solicitacao_id: solicitacaoTravada.id,
                        documento_id: data.documento_id,
                        objeto_tipo: objetoAuditoria.signatario,
                        objeto_id: signatario.id,
                        objeto: novoSignatario,
                        objeto_anterior: oldSignatario,
                        desafio_acesso_id: null,
                        tipo_evento: eventoAuditoria.signatario_cancelado.label,
                        sequencia: sequenciaCadeiaSignatario,
                        meta_data: {
                            documento_id: data.documento_id,
                            signatario_id: signatario.id,
                            status_anterior: oldSignatario.status,
                            status_novo: statusSignatario.cancelado,
                        },
                        hash_documento_inicial: documentoTravado.hash_original,
                        hash_documento_final: documentoTravado.hash_original,
                        hash_registro_anterior: ultimoElo ? ultimoElo.hash_atual : null,
                        user_id: data.user_id,
                    });
                    await trx('tab_historico').insert(new domainHistorico({
                        transformacao: historico.trnasformcao.update.value,
                        dado_antigo: oldSignatario,
                        dado_atual: { ...novoSignatario },
                        user_id: data.user_id,
                    }).getHistorico());
                    notificacoes.push({ signatario_id: signatario.id });
                }

                await trx.commit();

                // Fila de e-mail só depois do commit. Falha ao publicar só loga, não desfaz o cancelamento.
                try {
                    const dispatcher = new MessageDispatcher(this.#rabbitMQ, []);
                    for (const n of notificacoes) {
                        dispatcher.addItem({
                            exchange: rabbitMQ.queues.notificarcancelamentodocumento.exchange,
                            routingKey: rabbitMQ.queues.notificarcancelamentodocumento.routingKey,
                            jsonMessage: {
                                documento_id: data.documento_id,
                                signatario_id: n.signatario_id,
                                solicitante_user_id: data.user_id,
                            },
                            delayMs: rabbitMQ.defaultDelay,
                        });
                    }
                    await dispatcher.dispatch();
                } catch (dispatchErr) {
                    logs.getInstance().error({ err: dispatchErr, documento_id: data.documento_id }, 'Falha ao enfileirar notificação de cancelamento após commit');
                }

                return { status: true, msg: "Documento cancelado com sucesso.", object: novoDocumento, oldObject: oldDocumento }
            } catch (error) {
                console.log(error)
                await trx.rollback();
                if (
                    error?.name === 'ErrorLedgerDocumento'
                    || error?.name === 'ErrorLedgerSolicitacao'
                    || error?.name === 'ErrorLedgerSignatario'
                    || error?.name === 'ErrorLedgerDocumentoPdf'
                ) {
                    return { status: false, msg: 'Ocorreu um erro interno de auditoria, tente novamente em instantes.' }
                }
                return { status: false, msg: "Ocorreu um erro interno, tente novamente em instantes." }
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
            logExeption({ descricaoDoErro: 'Exeption estourada. use case Documentos - cancelarDocumentoUseCase - indexCancelarDocumento', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            return { status: false, msg: 'Erro interno do servidor, log gerado' }
        }
    }

}

module.exports = new cancelarDocumentoUseCase();
