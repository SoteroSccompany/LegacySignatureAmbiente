const moment = require('moment');
const {
    statusBroker,
    rabbitMQ,
    maxRetryReprocessBroker,
    alertaUsuario,
    applicationName,
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
const LedgerAlertaUsuario = require('../../../gateways/helpers/AuditoriaAlteracao/LadgerAlertaUsuario');

class DistribuirConviteSignatario {

    #rabbitmq;
    #knex;
    #metaDados;
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
            if (!payload) return await this.#finalizarSemRetentativa('Mensagem sem os dados obrigatórios do convite');

            if (this.#metaDados.email_enviado_em) {
                return await this.#finalizarComSucesso(`Convite já enviado anteriormente para ${payload.email}`);
            }
            const jaEnviado = await this.#knex('tab_evento')
                .where('signatario_id', payload.signatario_id)
                .where('tipo', eventoSistema.tipos.convite_email_signatario)
                .where('status', eventoSistema.status.enviado)
                .first();
            if (jaEnviado) {
                this.#metaDados.email_enviado_em = dateNow();
                this.#metaDados.evento_id = jaEnviado.id;
                return await this.#finalizarComSucesso(`Convite já registrado como enviado para ${payload.email}`);
            }

            const contexto = await this.#carregarContexto(payload);
            if (!contexto.status) return await this.#finalizarSemRetentativa(contexto.msg);

            const criado = await this.#garantirEventoPendente(payload, contexto.data);
            if (!criado.status) return await this.#finalizarComRetentativa(criado.msg, payload, criado.evento || null);
            evento = criado.evento;

            const envio = await sendEmail.sendEmailConviteSignatario(payload);
            if (!envio?.status) {
                return await this.#finalizarComRetentativa(envio?.msg || 'Falha ao enviar e-mail de convite', payload, evento);
            }

            const posEnvio = await this.#registrarSucesso(evento, payload);
            if (!posEnvio.status) {
                return await this.#finalizarComRetentativa(posEnvio.msg, payload, evento);
            }

            this.#metaDados.email_enviado_em = dateNow();
            this.#metaDados.email_destino = payload.email;
            this.#metaDados.evento_id = evento.id;
            await this.#finalizarComSucesso(`Convite enviado para ${payload.email}`);
        } catch (err) {
            console.log(err);
            logs.getInstance().error({ err }, 'Erro ao processar DistribuirConviteSignatario');
            await this.#finalizarComRetentativa(err.message, payload, evento);
        }
    }

    #lerPayload() {
        try {
            const envelope = parseBrokerMessageEnvelope(this.#rabbitmq.broker.message);
            const payload = envelope.data || envelope;
            if (
                !payload.signatario_id
                || !payload.documento_id
                || !payload.solicitacao_id
                || !payload.email
                || !payload.nome
                || !payload.solicitante_user_id
                || !payload.tipo
                || (!payload.destinatario_user_id && payload.tipo !== 'criar_conta')
            ) {
                return null;
            }
            return payload;
        } catch (err) {
            logs.getInstance().error({ err }, 'Não foi possível interpretar a mensagem do DistribuirConviteSignatario');
            return null;
        }
    }

    async #carregarContexto(payload) {
        try {
            const solicitacao = await this.#knex('tab_solicitacao_documento')
                .select('*')
                .where('id', payload.solicitacao_id)
                .first();
            if (!solicitacao) return { status: false, msg: 'Solicitação não encontrada para o convite' };
            if (solicitacao.documento_id !== payload.documento_id) {
                return { status: false, msg: 'Solicitação não corresponde ao documento do convite' };
            }
            const signatario = await this.#knex('tab_signatarios')
                .select('*')
                .where('id', payload.signatario_id)
                .first();
            if (!signatario) return { status: false, msg: 'Signatário não encontrado para o convite' };
            return { status: true, data: { solicitacao, signatario } };
        } catch (error) {
            logs.getInstance().error({ err: error }, 'Erro ao carregar contexto do convite');
            return { status: false, msg: 'Erro ao carregar contexto do convite' };
        }
    }

    async #garantirEventoPendente(payload, contexto) {
        let trx = null;
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

            trx = await this.#knex.transaction();
            const titulo = 'Convite para assinar documento';
            const mensagem = `Você foi adicionado como signatário do documento ${payload.documento_id}.`;
            const evento = new domainEvento({
                tipo: eventoSistema.tipos.convite_email_signatario,
                status: eventoSistema.status.pendente,
                solicitacao_id: payload.solicitacao_id,
                documento_id: payload.documento_id,
                signatario_id: payload.signatario_id,
                origem_tipo: eventoSistema.origem.solicitacao,
                origem_id: payload.solicitacao_id,
                destinatario_user_id: payload.destinatario_user_id || contexto.signatario.user_id,
                canal: eventoSistema.canais.email,
                titulo,
                mensagem,
                meta_dados: {
                    email_destino: payload.email,
                    tipo_convite: payload.tipo,
                    broker_id: this.#rabbitmq.broker?.id || null,
                    aplicacao: applicationName,
                },
                criado_em: dateNow(),
                atualizado_em: dateNow(),
            });
            await trx('tab_evento').insert({
                ...evento.getEvento(),
                meta_dados: JSON.stringify(evento.meta_dados),
            });
            const auditoria = new LedgerEvento(trx);
            await auditoria.GravarAuditoriaCriacao({
                evento: evento.getEvento(),
                tipo_evento: eventoAuditoria.evento_criado.label,
                sequencia: eventoAuditoria.evento_criado.sequencia,
                meta_data: {
                    solicitacao_id: payload.solicitacao_id,
                    documento_id: payload.documento_id,
                    signatario_id: payload.signatario_id,
                    canal: eventoSistema.canais.email,
                },
                user_id: payload.solicitante_user_id,
            });
            await trx.commit();
            this.#metaDados.evento_id = evento.id;
            await this.#salvarBroker(this.#rabbitmq.broker.status ?? statusBroker.pending);
            return { status: true, evento: evento.getEvento() };
        } catch (error) {
            if (trx) await trx.rollback();
            console.log(error);
            logs.getInstance().error({ err: error }, 'Erro ao criar evento de convite');
            return {
                status: false,
                msg: error?.name === 'ErrorLedgerEvento'
                    ? `Erro de auditoria do evento: ${error.message}`
                    : (error.message || 'Erro ao criar evento de convite'),
                evento: null,
            };
        }
    }

    async #registrarSucesso(evento, payload) {
        const trx = await this.#knex.transaction();
        try {
            const atual = await trx('tab_evento').where('id', evento.id).forUpdate().first();
            if (!atual) {
                await trx.rollback();
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
            const ultima = await trx('tab_auditoria_ledger_evento')
                .where('evento_id', evento.id)
                .where('deletado', false)
                .orderBy('criado_em', 'desc')
                .first();
            const sequencia = ultima
                ? Number(ultima.sequencia) + 1
                : eventoAuditoria.evento_email_enviado.sequencia;
            const auditoria = new LedgerEvento(trx);
            auditoria.Initialize(oldEvento);
            await auditoria.GravarAuditoriaModificacao({
                evento: newEvento,
                tipo_evento: eventoAuditoria.evento_email_enviado.label,
                sequencia,
                meta_data: {
                    solicitacao_id: payload.solicitacao_id,
                    documento_id: payload.documento_id,
                    email_destino: payload.email,
                },
                evento_update: {
                    status: eventoSistema.status.enviado,
                    atualizado_em: newEvento.atualizado_em,
                },
                user_id: payload.solicitante_user_id,
            });
            if (payload.destinatario_user_id) {
                const alerta = new domainAlertaUsuario({
                    user_id: payload.destinatario_user_id,
                    tipo: alertaUsuario.tipos.convite_assinatura_recebido,
                    titulo: newEvento.titulo || 'Convite para assinar documento',
                    mensagem: newEvento.mensagem || `Você foi adicionado como signatário do documento ${payload.documento_id}.`,
                    referencia_tipo: alertaUsuario.referencia.evento,
                    referencia_id: evento.id,
                    evento_id: evento.id,
                    meta_dados: {
                        documento_id: payload.documento_id,
                        solicitacao_id: payload.solicitacao_id,
                        signatario_id: payload.signatario_id,
                        email_destino: payload.email,
                    },
                    criado_em: dateNow(),
                });
                await trx('tab_alerta_usuario').insert({
                    ...alerta.getAlertaUsuario(),
                    meta_dados: JSON.stringify(alerta.meta_dados),
                });
            }
            await trx.commit();
            return { status: true };
        } catch (error) {
            await trx.rollback();
            console.log(error);
            logs.getInstance().error({ err: error }, 'Erro ao registrar sucesso do convite');
            return {
                status: false,
                msg: error?.name === 'ErrorLedgerEvento'
                    ? `Erro de auditoria do evento: ${error.message}`
                    : (error.message || 'Erro ao registrar sucesso do convite'),
            };
        }
    }

    async #registrarFalhaEvento(evento, payload, msg) {
        if (!evento?.id) return;
        const trx = await this.#knex.transaction();
        try {
            const atual = await trx('tab_evento').where('id', evento.id).forUpdate().first();
            if (!atual) {
                await trx.rollback();
                return;
            }
            if (atual.status === eventoSistema.status.falha || atual.status === eventoSistema.status.enviado) {
                await trx.rollback();
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
            const ultima = await trx('tab_auditoria_ledger_evento')
                .where('evento_id', evento.id)
                .where('deletado', false)
                .orderBy('criado_em', 'desc')
                .first();
            const sequencia = ultima
                ? Number(ultima.sequencia) + 1
                : eventoAuditoria.evento_email_falha.sequencia;
            const auditoria = new LedgerEvento(trx);
            auditoria.Initialize(oldEvento);
            await auditoria.GravarAuditoriaModificacao({
                evento: newEvento,
                tipo_evento: eventoAuditoria.evento_email_falha.label,
                sequencia,
                meta_data: {
                    solicitacao_id: payload.solicitacao_id,
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
            await trx.commit();
        } catch (error) {
            await trx.rollback();
            logs.getInstance().error({ err: error }, 'Erro ao registrar falha do evento de convite');
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
        logs.getInstance().error({ meta_dados: this.#metaDados }, `DistribuirConviteSignatario descartado: ${msg}`);
        await this.#salvarBroker(statusBroker.failedNotRetry);
    }

    async #finalizarComRetentativa(msg, payload = null, evento = null) {
        this.status = false;
        this.#metaDados.tentativas += 1;
        this.reprocessar = this.#metaDados.tentativas <= maxRetryReprocessBroker;
        this.delayMs = rabbitMQ.defaultDelay * Math.pow(2, this.#metaDados.tentativas);
        logs.getInstance().error({ tentativas: this.#metaDados.tentativas }, `Falha no DistribuirConviteSignatario: ${msg}`);
        if (!this.reprocessar && payload) {
            await this.#registrarFalhaEvento(evento, payload, msg);
            await this.#registrarAlertaFalha(payload, msg, evento);
        }
        await this.#salvarBroker(this.reprocessar ? statusBroker.pending : statusBroker.failedNotRetry);
    }

    async #registrarAlertaFalha(payload, msg, evento = null) {
        try {
            const alerta = new domainAlertaUsuario({
                user_id: payload.solicitante_user_id,
                tipo: alertaUsuario.tipos.falha_envio_convite_signatario,
                titulo: 'Falha ao enviar convite ao signatário',
                mensagem: `Não foi possível enviar o e-mail de convite para ${payload.nome} (${payload.email}) no documento ${payload.documento_id}.`,
                referencia_tipo: evento?.id ? alertaUsuario.referencia.evento : alertaUsuario.referencia.signatario,
                referencia_id: evento?.id || payload.signatario_id,
                evento_id: evento?.id || this.#metaDados.evento_id || null,
                meta_dados: {
                    documento_id: payload.documento_id,
                    solicitacao_id: payload.solicitacao_id,
                    email_destino: payload.email,
                    erro_msg: String(msg).substring(0, 500),
                    broker_id: this.#rabbitmq.broker?.id || null,
                    tipo_convite: payload.tipo,
                    aplicacao: applicationName,
                },
                criado_em: dateNow(),
            });
            const trx = await this.#knex.transaction();
            try {
                await trx('tab_alerta_usuario').insert({
                    ...alerta.getAlertaUsuario(),
                    meta_dados: JSON.stringify(alerta.meta_dados),
                });
                const auditoriaAlerta = new LedgerAlertaUsuario(trx);
                await auditoriaAlerta.GravarAuditoriaCriacao({
                    alerta: alerta.getAlertaUsuario(),
                    tipo_evento: eventoAuditoria.alerta_usuario_criado.label,
                    sequencia: eventoAuditoria.alerta_usuario_criado.sequencia,
                    meta_data: {
                        documento_id: payload.documento_id,
                        solicitacao_id: payload.solicitacao_id,
                        signatario_id: payload.signatario_id,
                    },
                    user_id: payload.solicitante_user_id,
                });
                await trx.commit();
            } catch (trxError) {
                await trx.rollback();
                throw trxError;
            }
            logs.getInstance().error({
                signatario_id: payload.signatario_id,
                solicitante_user_id: payload.solicitante_user_id,
                evento_id: evento?.id,
                msg,
            }, 'Alerta de falha de convite registrado para o solicitante');
        } catch (error) {
            logs.getInstance().error({ err: error }, 'Erro ao registrar alerta de falha de convite');
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
            logs.getInstance().error({ err: error }, 'Erro ao salvar o broker do DistribuirConviteSignatario');
        }
    }
}

module.exports = DistribuirConviteSignatario;
