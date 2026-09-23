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
const bucketGateway = require('../../../gateways/Bucket');
const { streamToBuffer } = require('../../../gateways/PdfSign/aplicarAssinaturaPdf');

// Worker: após o último assinar, envia o PDF final por e-mail a todos os signatários.
class EnviarDocumentoAssinadoSignatarios {

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
        if (!Array.isArray(this.#metaDados.enviados_signatario_ids)) {
            this.#metaDados.enviados_signatario_ids = [];
        }
    }

    async processar() {
        let payload = null;
        try {
            payload = this.#lerPayload();
            if (!payload) return await this.#finalizarSemRetentativa('Mensagem sem os dados obrigatórios do documento assinado');

            if (this.#metaDados.email_enviado_em) {
                return await this.#finalizarComSucesso(`E-mails do documento assinado já enviados anteriormente para o documento ${payload.documento_id}`);
            }

            const documento = await this.#knex('tab_documentos').select('*').where('id', payload.documento_id).first();
            if (!documento) return await this.#finalizarSemRetentativa('Documento não encontrado.');
            if (documento.status !== statusDocumentos.documento_assinado) {
                return await this.#finalizarSemRetentativa(`Documento em status inesperado para envio do PDF: ${documento.status}`);
            }
            if (!documento.bucket_wip_path) {
                return await this.#finalizarSemRetentativa('Documento sem caminho WIP do PDF final.');
            }

            const solicitacao = await this.#knex('tab_solicitacao_documento').select('*').where('documento_id', documento.id).first();
            if (!solicitacao) return await this.#finalizarSemRetentativa('Solicitação do documento não encontrada.');

            const solicitante_user_id = payload.solicitante_user_id || solicitacao.user_id || null;
            if (!solicitante_user_id) {
                return await this.#finalizarSemRetentativa('Solicitante do documento não encontrado para auditoria do e-mail.');
            }

            const signatarios = await this.#knex('tab_signatarios')
                .select('*')
                .where('documento_id', documento.id)
                .andWhere('deletado', false)
                .whereIn('status', [statusSignatario.assinado]);
            if (!signatarios.length) {
                return await this.#finalizarSemRetentativa('Nenhum signatário assinado encontrado para envio do PDF.');
            }

            const arquivo = await bucketGateway.Wip().obterArquivo({ objectName: documento.bucket_wip_path });
            if (!arquivo.status) return await this.#finalizarComRetentativa(arquivo.msg || 'Falha ao obter PDF final no WIP');
            const pdfBuffer = await streamToBuffer(arquivo.data.stream);
            if (!pdfBuffer || !pdfBuffer.length) {
                return await this.#finalizarComRetentativa('PDF final vazio no WIP');
            }

            let falhaEnvio = null;
            for (const signatario of signatarios) {
                if (this.#metaDados.enviados_signatario_ids.includes(signatario.id)) continue;

                const jaEnviado = await this.#knex('tab_evento')
                    .where('signatario_id', signatario.id)
                    .where('documento_id', documento.id)
                    .where('tipo', eventoSistema.tipos.documento_assinado_email_signatario)
                    .where('status', eventoSistema.status.enviado)
                    .where('deletado', false)
                    .first();
                if (jaEnviado) {
                    this.#metaDados.enviados_signatario_ids.push(signatario.id);
                    continue;
                }

                const identidade = await this.#resolverIdentidade(signatario);
                if (!identidade.status) {
                    falhaEnvio = identidade.msg;
                    break;
                }

                const criado = await this.#garantirEventoPendente({
                    documento,
                    solicitacao,
                    signatario,
                    identidade: identidade.data,
                    solicitante_user_id,
                });
                if (!criado.status) {
                    falhaEnvio = criado.msg;
                    break;
                }

                const envio = await sendEmail.sendEmailDocumentoAssinado({
                    email: identidade.data.email,
                    nome: identidade.data.nome,
                    documento_id: documento.id,
                    documento_nome: documento.documento_nome || documento.nome_documento || null,
                    pdfBuffer,
                });
                if (!envio?.status) {
                    falhaEnvio = envio?.msg || `Falha ao enviar e-mail para ${identidade.data.email}`;
                    break;
                }

                const posEnvio = await this.#registrarSucesso(criado.evento, {
                    documento_id: documento.id,
                    signatario_id: signatario.id,
                    solicitante_user_id,
                    email: identidade.data.email,
                    nome: identidade.data.nome,
                });
                if (!posEnvio.status) {
                    falhaEnvio = posEnvio.msg;
                    break;
                }

                this.#metaDados.enviados_signatario_ids.push(signatario.id);
            }

            if (falhaEnvio) {
                return await this.#finalizarComRetentativa(falhaEnvio, payload);
            }

            this.#metaDados.email_enviado_em = dateNow();
            this.#metaDados.documento_id = documento.id;
            await this.#finalizarComSucesso(`PDF assinado enviado aos signatários do documento ${documento.id}`);
        } catch (err) {
            console.log(err);
            logs.getInstance().error({ err }, 'Erro ao processar EnviarDocumentoAssinadoSignatarios');
            await this.#rollbackTrx();
            await this.#finalizarComRetentativa(err.message, payload);
        }
    }

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
        if (!nome && signatario.user_id) {
            const perfilUser = await this.#knex('tab_perfil_usuario').select('nome').where('user_id', signatario.user_id).andWhere('deletado', false).first();
            if (perfilUser) nome = perfilUser.nome;
        }
        if (!email) return { status: false, msg: `Signatário ${signatario.id} sem e-mail cadastrado para envio do PDF.` };
        if (!nome) nome = 'Signatário';
        return { status: true, data: { email, nome } };
    }

    #lerPayload() {
        try {
            const envelope = parseBrokerMessageEnvelope(this.#rabbitmq.broker.message);
            const payload = envelope.data || envelope;
            if (!payload.documento_id) return null;
            return payload;
        } catch (err) {
            logs.getInstance().error({ err }, 'Não foi possível interpretar a mensagem do EnviarDocumentoAssinadoSignatarios');
            return null;
        }
    }

    async #garantirEventoPendente({ documento, solicitacao, signatario, identidade, solicitante_user_id }) {
        this.trx = null;
        try {
            const existente = await this.#knex('tab_evento')
                .where('signatario_id', signatario.id)
                .where('documento_id', documento.id)
                .where('tipo', eventoSistema.tipos.documento_assinado_email_signatario)
                .where('deletado', false)
                .whereIn('status', [eventoSistema.status.pendente, eventoSistema.status.falha])
                .orderBy('criado_em', 'desc')
                .first();
            if (existente) {
                if (typeof existente.meta_dados === 'string') {
                    existente.meta_dados = JSON.parse(existente.meta_dados);
                }
                return { status: true, evento: existente };
            }

            this.trx = await this.#knex.transaction();
            const titulo = 'Documento assinado';
            const mensagem = `O documento ${documento.id} foi assinado por todos e o PDF foi enviado por e-mail.`;
            const evento = new domainEvento({
                tipo: eventoSistema.tipos.documento_assinado_email_signatario,
                status: eventoSistema.status.pendente,
                solicitacao_id: solicitacao.id,
                documento_id: documento.id,
                signatario_id: signatario.id,
                origem_tipo: eventoSistema.origem.signatario,
                origem_id: signatario.id,
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
                    documento_id: documento.id,
                    signatario_id: signatario.id,
                    canal: eventoSistema.canais.email,
                },
                user_id: solicitante_user_id,
            });
            await this.trx.commit();
            this.trx = null;
            return { status: true, evento: evento.getEvento() };
        } catch (error) {
            await this.#rollbackTrx();
            console.log(error);
            logs.getInstance().error({ err: error }, 'Erro ao criar evento de envio do documento assinado');
            return {
                status: false,
                msg: error?.name === 'ErrorLedgerEvento'
                    ? `Erro de auditoria do evento: ${error.message}`
                    : (error.message || 'Erro ao criar evento de envio do documento assinado'),
            };
        }
    }

    async #registrarSucesso(evento, dados) {
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
                    documento_id: dados.documento_id,
                    email_destino: dados.email,
                },
                evento_update: {
                    status: eventoSistema.status.enviado,
                    atualizado_em: newEvento.atualizado_em,
                },
                user_id: dados.solicitante_user_id,
            });
            if (newEvento.destinatario_user_id) {
                const alerta = new domainAlertaUsuario({
                    user_id: newEvento.destinatario_user_id,
                    tipo: alertaUsuario.tipos.documento_assinado_recebido,
                    titulo: newEvento.titulo || 'Documento assinado',
                    mensagem: newEvento.mensagem || `O documento ${dados.documento_id} foi assinado e o PDF foi enviado por e-mail.`,
                    referencia_tipo: alertaUsuario.referencia.evento,
                    referencia_id: evento.id,
                    evento_id: evento.id,
                    meta_dados: {
                        documento_id: dados.documento_id,
                        signatario_id: dados.signatario_id,
                        email_destino: dados.email,
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
            logs.getInstance().error({ err: error }, 'Erro ao registrar sucesso do envio do documento assinado');
            return {
                status: false,
                msg: error?.name === 'ErrorLedgerEvento'
                    ? `Erro de auditoria do evento: ${error.message}`
                    : (error.message || 'Erro ao registrar sucesso do envio do documento assinado'),
            };
        }
    }

    async #finalizarComSucesso(msg) {
        this.status = true;
        this.reprocessar = false;
        this.#metaDados.tentativas = 0;
        logs.getInstance().info({ documento_id: this.#metaDados.documento_id }, msg);
        await this.#salvarBroker(statusBroker.processed);
    }

    async #finalizarSemRetentativa(msg) {
        this.status = false;
        this.reprocessar = false;
        await this.#rollbackTrx();
        logs.getInstance().error({ meta_dados: this.#metaDados }, `EnviarDocumentoAssinadoSignatarios descartado: ${msg}`);
        await this.#salvarBroker(statusBroker.failedNotRetry);
    }

    async #finalizarComRetentativa(msg, payload = null) {
        this.status = false;
        this.#metaDados.tentativas += 1;
        this.reprocessar = this.#metaDados.tentativas <= maxRetryReprocessBroker;
        this.delayMs = rabbitMQ.defaultDelay * Math.pow(2, this.#metaDados.tentativas);
        await this.#rollbackTrx();
        logs.getInstance().error({ tentativas: this.#metaDados.tentativas, documento_id: payload?.documento_id }, `Falha no EnviarDocumentoAssinadoSignatarios: ${msg}`);
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
            logs.getInstance().error({ err: error }, 'Erro ao salvar o broker do EnviarDocumentoAssinadoSignatarios');
        }
    }
}

module.exports = EnviarDocumentoAssinadoSignatarios;
