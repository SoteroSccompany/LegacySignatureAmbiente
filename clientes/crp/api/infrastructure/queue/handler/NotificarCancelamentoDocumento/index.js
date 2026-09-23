const moment = require('moment');
const {
    statusBroker,
    rabbitMQ,
    maxRetryReprocessBroker,
    statusDocumentos,
    statusSignatario,
    alertaUsuario,
    eventoSistema,
    eventoAuditoria,
} = require('../../../../certs');
const { parseBrokerMessageEnvelope, normalizeMetaDados } = require('../../../gateways/functions/brokerMessageEnvelope');
const dateNow = require('../../../gateways/functions/data/getToday');
const logs = require('../../../../Logs');
const sendEmail = require('../../../../@core/usecase/Mail/enviarEmail');
const domainAlertaUsuario = require('../../../../@core/domain/AlertaUsuario');
const domainEvento = require('../../../../@core/domain/Evento');
const LedgerEvento = require('../../../gateways/helpers/AuditoriaAlteracao/LadgerEvento');

// Worker de notificação de cancelamento de documento. Nunca decide status de
// documento/signatário — o cancelarDocumentoUseCase já fez isso antes de publicar.
// Aqui só relemos o banco (nunca confiamos no payload) e enviamos o e-mail.
class NotificarCancelamentoDocumento {

    #rabbitmq;
    #knex;
    #metaDados;
    trx = null;
    status = false;
    reprocessar = false;
    delayMs = rabbitMQ.defaultDelay;

    constructor(rabbit, knex) {
        this.#rabbitmq = rabbit;
        this.#knex = knex;
        this.#metaDados = normalizeMetaDados(rabbit.broker.meta_dados);
        this.mountMetaDados();
    }

    mountMetaDados() {
        if (!this.#metaDados) {
            this.#metaDados = { tentativas: 0 };
        }
        if (this.#metaDados.tentativas === undefined) {
            this.#metaDados.tentativas = 0;
        }
    }

    async processar() {
        let payload = null;
        let evento = null;
        try {
            payload = this.#lerPayload();
            if (!payload) return await this.#finalizarSemRetentativa('Mensagem sem os dados obrigatórios do cancelamento');

            if (this.#metaDados.email_enviado_em) {
                return await this.#finalizarComSucesso(`Notificação de cancelamento já enviada anteriormente para o signatário ${payload.signatario_id}`);
            }

            // Não confia no payload: relê o signatário e o documento no banco.
            const signatario = await this.#knex('tab_signatarios').select('*')
                .where('id', payload.signatario_id)
                .first();
            if (!signatario) return await this.#finalizarSemRetentativa('Signatário não encontrado.');
            if (signatario.documento_id !== payload.documento_id) {
                return await this.#finalizarSemRetentativa('Signatário não corresponde ao payload.');
            }
            if (signatario.status !== statusSignatario.cancelado) {
                return await this.#finalizarSemRetentativa(`Signatário em status inesperado para notificação de cancelamento: ${signatario.status}`);
            }
            const documento = await this.#knex('tab_documentos').select('*').where('id', payload.documento_id).first();
            if (!documento) return await this.#finalizarSemRetentativa('Documento não encontrado.');
            if (documento.status !== statusDocumentos.documento_cancelado) {
                return await this.#finalizarSemRetentativa(`Documento em status inesperado para notificação de cancelamento: ${documento.status}`);
            }

            const jaEnviado = await this.#knex('tab_evento')
                .where('signatario_id', payload.signatario_id)
                .where('tipo', eventoSistema.tipos.notificacao_cancelamento_documento)
                .where('status', eventoSistema.status.enviado)
                .first();
            if (jaEnviado) {
                this.#metaDados.email_enviado_em = dateNow();
                this.#metaDados.evento_id = jaEnviado.id;
                return await this.#finalizarComSucesso(`Notificação de cancelamento já registrada como enviada para o signatário ${payload.signatario_id}`);
            }

            const identidade = await this.#resolverIdentidade(signatario);
            if (!identidade.status) return await this.#finalizarSemRetentativa(identidade.msg);

            const criado = await this.#garantirEventoPendente(payload, documento, signatario, identidade.data);
            if (!criado.status) return await this.#finalizarComRetentativa(criado.msg);
            evento = criado.evento;

            const envio = await sendEmail.sendEmailDocumentoCancelado({
                email: identidade.data.email,
                nome: identidade.data.nome,
                documento_id: payload.documento_id,
            });
            if (!envio?.status) {
                return await this.#finalizarComRetentativa(envio?.msg || 'Falha ao enviar e-mail de cancelamento', payload, evento);
            }

            const posEnvio = await this.#registrarSucesso(evento, payload, identidade.data);
            if (!posEnvio.status) {
                return await this.#finalizarComRetentativa(posEnvio.msg, payload, evento);
            }

            this.#metaDados.email_enviado_em = dateNow();
            this.#metaDados.email_destino = identidade.data.email;
            this.#metaDados.evento_id = evento.id;
            await this.#finalizarComSucesso(`Notificação de cancelamento enviada para ${identidade.data.email}`);
        } catch (err) {
            console.log(err);
            logs.getInstance().error({ err }, 'Erro ao processar NotificarCancelamentoDocumento');
            await this.#rollbackTrx();
            await this.#finalizarComRetentativa(err.message, payload, evento);
        }
    }

    // Signatário pode ainda não ter e-mail/nome próprios (denormalizados) preenchidos;
    // nesse caso busca a verdade em tab_usuarios/tab_perfil_usuario pelas FKs do signatário.
    async #resolverIdentidade(signatario) {
        let email = signatario.email || null;
        let nome = signatario.nome || null;
        if ((!email || !nome) && signatario.user_id) {
            const usuario = await this.#knex('tab_usuarios').select('email').where('id', signatario.user_id).andWhere('deletado', false).first();
            if (usuario && !email) email = usuario.email;
        }
        if (!nome && signatario.perfil_id) {
            const perfil = await this.#knex('tab_perfil_usuario').select('nome').where('id', signatario.perfil_id).andWhere('deletado', false).first();
            if (perfil) nome = perfil.nome;
        }
        if (!email) return { status: false, msg: 'Signatário sem e-mail cadastrado para notificação de cancelamento.' };
        if (!nome) nome = 'Signatário';
        return { status: true, data: { email, nome } };
    }

    #lerPayload() {
        try {
            const envelope = parseBrokerMessageEnvelope(this.#rabbitmq.broker.message);
            const payload = envelope.data || envelope;
            if (!payload.signatario_id || !payload.documento_id || !payload.solicitante_user_id) {
                return null;
            }
            return payload;
        } catch (err) {
            logs.getInstance().error({ err }, 'Não foi possível interpretar a mensagem do NotificarCancelamentoDocumento');
            return null;
        }
    }

    async #garantirEventoPendente(payload, documento, signatario, identidade) {
        this.trx = null;
        try {
            if (this.#metaDados.evento_id) {
                const existente = await this.#knex('tab_evento')
                    .where('id', this.#metaDados.evento_id)
                    .where('deletado', false)
                    .first();
                if (existente) {
                    if (typeof existente.meta_dados === 'string') {
                        existente.meta_dados = JSON.parse(existente.meta_dados);
                    }
                    return { status: true, evento: existente };
                }
            }

            this.trx = await this.#knex.transaction();
            const solicitacaoVinculo = await this.trx('tab_solicitacao_documento').select('id').where('documento_id', payload.documento_id).first();
            if (!solicitacaoVinculo) {
                await this.trx.rollback();
                this.trx = null;
                return { status: false, msg: 'Solicitação do documento não encontrada para o cancelamento.' };
            }
            const titulo = 'Documento cancelado';
            const mensagem = `O documento ${payload.documento_id} foi cancelado pelo solicitante.`;
            const evento = new domainEvento({
                tipo: eventoSistema.tipos.notificacao_cancelamento_documento,
                status: eventoSistema.status.pendente,
                solicitacao_id: solicitacaoVinculo.id,
                documento_id: payload.documento_id,
                signatario_id: payload.signatario_id,
                origem_tipo: eventoSistema.origem.signatario,
                origem_id: payload.signatario_id,
                destinatario_user_id: signatario.user_id || null,
                canal: eventoSistema.canais.email,
                titulo,
                mensagem,
                meta_dados: {
                    email_destino: identidade.email,
                    broker_id: this.#rabbitmq.broker?.id || null,
                },
                criado_em: dateNow(),
                atualizado_em: dateNow(),
            });
            await this.trx('tab_evento').insert({
                ...evento.getEvento(),
                meta_dados: JSON.stringify(evento.meta_dados),
            });
            const auditoria = new LedgerEvento(this.trx);
            await auditoria.GravarAuditoriaCriacao({
                evento: evento.getEvento(),
                tipo_evento: eventoAuditoria.evento_criado.label,
                sequencia: eventoAuditoria.evento_criado.sequencia,
                meta_data: {
                    documento_id: payload.documento_id,
                    signatario_id: payload.signatario_id,
                    canal: eventoSistema.canais.email,
                },
                user_id: payload.solicitante_user_id,
            });
            await this.trx.commit();
            this.trx = null;
            this.#metaDados.evento_id = evento.id;
            await this.#salvarBroker(this.#rabbitmq.broker.status ?? statusBroker.pending);
            return { status: true, evento: evento.getEvento() };
        } catch (error) {
            await this.#rollbackTrx();
            console.log(error);
            logs.getInstance().error({ err: error }, 'Erro ao criar evento de notificação de cancelamento');
            return {
                status: false,
                msg: error?.name === 'ErrorLedgerEvento'
                    ? `Erro de auditoria do evento: ${error.message}`
                    : (error.message || 'Erro ao criar evento de notificação de cancelamento'),
            };
        }
    }

    async #registrarSucesso(evento, payload, identidade) {
        this.trx = await this.#knex.transaction();
        try {
            const atual = await this.trx('tab_evento').where('id', evento.id).forUpdate().first();
            if (!atual) {
                await this.trx.rollback();
                this.trx = null;
                return { status: false, msg: 'Evento não encontrado após envio' };
            }
            if (typeof atual.meta_dados === 'string') {
                atual.meta_dados = JSON.parse(atual.meta_dados);
            }
            const oldEvento = { ...atual };
            const newEvento = {
                ...atual,
                status: eventoSistema.status.enviado,
                atualizado_em: dateNow(),
            };
            const ultima = await this.trx('tab_auditoria_ledger_evento')
                .where('evento_id', evento.id)
                .where('deletado', false)
                .orderBy('criado_em', 'desc')
                .first();
            const sequencia = ultima
                ? Number(ultima.sequencia) + 1
                : eventoAuditoria.evento_email_enviado.sequencia;
            const auditoria = new LedgerEvento(this.trx);
            auditoria.Initialize(oldEvento);
            await auditoria.GravarAuditoriaModificacao({
                evento: newEvento,
                tipo_evento: eventoAuditoria.evento_email_enviado.label,
                sequencia,
                meta_data: {
                    documento_id: payload.documento_id,
                    email_destino: identidade.email,
                },
                evento_update: {
                    status: eventoSistema.status.enviado,
                    atualizado_em: newEvento.atualizado_em,
                },
                user_id: payload.solicitante_user_id,
            });
            if (newEvento.destinatario_user_id) {
                const alerta = new domainAlertaUsuario({
                    user_id: newEvento.destinatario_user_id,
                    tipo: alertaUsuario.tipos.documento_cancelado,
                    titulo: newEvento.titulo || 'Documento cancelado',
                    mensagem: newEvento.mensagem || `O documento ${payload.documento_id} foi cancelado pelo solicitante.`,
                    referencia_tipo: alertaUsuario.referencia.evento,
                    referencia_id: evento.id,
                    evento_id: evento.id,
                    meta_dados: {
                        documento_id: payload.documento_id,
                        signatario_id: payload.signatario_id,
                        email_destino: identidade.email,
                    },
                    criado_em: dateNow(),
                });
                await this.trx('tab_alerta_usuario').insert({
                    ...alerta.getAlertaUsuario(),
                    meta_dados: JSON.stringify(alerta.meta_dados),
                });
            }
            await this.trx.commit();
            this.trx = null;
            return { status: true };
        } catch (error) {
            await this.#rollbackTrx();
            console.log(error);
            logs.getInstance().error({ err: error }, 'Erro ao registrar sucesso da notificação de cancelamento');
            return {
                status: false,
                msg: error?.name === 'ErrorLedgerEvento'
                    ? `Erro de auditoria do evento: ${error.message}`
                    : (error.message || 'Erro ao registrar sucesso da notificação de cancelamento'),
            };
        }
    }

    async #registrarFalhaEvento(evento, payload, msg) {
        if (!evento?.id) return;
        this.trx = await this.#knex.transaction();
        try {
            const atual = await this.trx('tab_evento').where('id', evento.id).forUpdate().first();
            if (!atual) {
                await this.trx.rollback();
                this.trx = null;
                return;
            }
            if (atual.status === eventoSistema.status.falha || atual.status === eventoSistema.status.enviado) {
                await this.trx.rollback();
                this.trx = null;
                return;
            }
            if (typeof atual.meta_dados === 'string') {
                atual.meta_dados = JSON.parse(atual.meta_dados);
            }
            const oldEvento = { ...atual };
            const newEvento = {
                ...atual,
                status: eventoSistema.status.falha,
                atualizado_em: dateNow(),
                meta_dados: {
                    ...(atual.meta_dados || {}),
                    erro_msg: String(msg).substring(0, 500),
                },
            };
            const ultima = await this.trx('tab_auditoria_ledger_evento')
                .where('evento_id', evento.id)
                .where('deletado', false)
                .orderBy('criado_em', 'desc')
                .first();
            const sequencia = ultima
                ? Number(ultima.sequencia) + 1
                : eventoAuditoria.evento_email_falha.sequencia;
            const auditoria = new LedgerEvento(this.trx);
            auditoria.Initialize(oldEvento);
            await auditoria.GravarAuditoriaModificacao({
                evento: newEvento,
                tipo_evento: eventoAuditoria.evento_email_falha.label,
                sequencia,
                meta_data: {
                    documento_id: payload.documento_id,
                    erro_msg: String(msg).substring(0, 500),
                },
                evento_update: {
                    status: eventoSistema.status.falha,
                    atualizado_em: newEvento.atualizado_em,
                    meta_dados: JSON.stringify(newEvento.meta_dados),
                },
                user_id: payload.solicitante_user_id,
            });
            await this.trx.commit();
            this.trx = null;
        } catch (error) {
            await this.#rollbackTrx();
            logs.getInstance().error({ err: error }, 'Erro ao registrar falha da notificação de cancelamento');
        }
    }

    async #finalizarComSucesso(msg) {
        this.status = true;
        this.reprocessar = false;
        this.#metaDados.tentativas = 0;
        logs.getInstance().info({ email: this.#metaDados.email_destino }, msg);
        await this.#salvarBroker(statusBroker.processed);
    }

    async #finalizarSemRetentativa(msg) {
        this.status = false;
        this.reprocessar = false;
        await this.#rollbackTrx();
        logs.getInstance().error({ meta_dados: this.#metaDados }, `NotificarCancelamentoDocumento descartado: ${msg}`);
        await this.#salvarBroker(statusBroker.failedNotRetry);
    }

    async #finalizarComRetentativa(msg, payload = null, evento = null) {
        this.status = false;
        this.#metaDados.tentativas += 1;
        this.reprocessar = this.#metaDados.tentativas <= maxRetryReprocessBroker;
        this.delayMs = rabbitMQ.defaultDelay * Math.pow(2, this.#metaDados.tentativas);
        await this.#rollbackTrx();
        logs.getInstance().error({ tentativas: this.#metaDados.tentativas }, `Falha no NotificarCancelamentoDocumento: ${msg}`);
        if (!this.reprocessar && payload) {
            await this.#registrarFalhaEvento(evento, payload, msg);
        }
        await this.#salvarBroker(this.reprocessar ? statusBroker.pending : statusBroker.failedNotRetry);
    }

    async #rollbackTrx() {
        if (!this.trx) return;
        try {
            await this.trx.rollback();
        } catch (_) {
            // transação já encerrada
        } finally {
            this.trx = null;
        }
    }

    async #salvarBroker(status) {
        try {
            this.#rabbitmq.broker.status = status;
            this.#rabbitmq.broker.delayMs = this.delayMs;
            this.#rabbitmq.broker.meta_dados = JSON.stringify({ ...this.#metaDados });
            this.#rabbitmq.broker.data_atualizacao = moment().format('YYYY-MM-DD HH:mm:ss');
            await this.#rabbitmq.saveBroker(this.#knex);
        } catch (error) {
            logs.getInstance().error({ err: error }, 'Erro ao salvar o broker do NotificarCancelamentoDocumento');
        }
    }
}

module.exports = NotificarCancelamentoDocumento;
