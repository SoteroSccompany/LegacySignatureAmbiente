const moment = require('moment');
const { statusBroker, rabbitMQ, statusSolicitacao, statusDocumentos, eventoAuditoria, maxRetryReprocessBroker, statusAplication, statusApp, objetoAuditoria, historico } = require('../../../../certs')
const { parseBrokerMessageEnvelope, normalizeMetaDados } = require('../../../gateways/functions/brokerMessageEnvelope');
const { hashSha256FromStream } = require('../../../gateways/Bucket/helpers/streamPipeline');
const bucketGateway = require('../../../gateways/Bucket');
const serverSignGateway = require('../../../gateways/ServerSign');
const domainDocumentos = require('../../../../@core/domain/Documentos');
const domainSolicitacao = require('../../../../@core/domain/SolicitacaoDocumento');
const dateNow = require('../../../gateways/functions/data/getToday');
const logs = require('../../../../Logs');
const LedgerSolicitacao = require('../../../gateways/helpers/AuditoriaAlteracao/LadgerSolicitacao/index');
const LedgerDocumento = require('../../../gateways/helpers/AuditoriaAlteracao/LadgerDocumento/index');
const LedgerDocumentoPdf = require('../../../gateways/helpers/AuditoriaAlteracao/LadgerDocumentoPdf/index');
const domainDocumentoVerificacao = require('../../../../@core/domain/DocumentoVerificacao');
const domainHistorico = require('../../../../@core/domain/Historico');
const documentoVerificacaoRepository = require('../../../db/services/DocumentoVerificacaoRepository');
const { gerarCodigoVerificacao } = require('../../../gateways/functions/documentoVerificacao');

class ProcessarHashInicial {

    #rabbitmq;
    #knex;
    #metaDados;
    trx = null;
    status = false;
    reprocessar = false;
    dispatcher = null;
    delayMs = rabbitMQ.defaultDelay;
    hashOriginal = null;
    documento = null;
    ledger = null;


    constructor(rabbit, knex) {
        this.#rabbitmq = rabbit;
        this.#knex = knex;
        this.#metaDados = normalizeMetaDados(rabbit.broker.meta_dados);
        this.mountMetaDados();
    }

    mountMetaDados() {
        if (!this.#metaDados) {
            this.#metaDados = { tentativas: 0 }
        }
        if (this.#metaDados.tentativas === undefined) {
            this.#metaDados.tentativas = 0;
        }
    }

    async processar() {
        let solicitacao = null;
        try {
            const payload = this.#lerPayload();
            if (!payload) return await this.#finalizarSemRetentativa('Mensagem sem os dados obrigatórios do documento');
            solicitacao = await this.#knex('tab_solicitacao_documento')
                .select('*')
                .where('id', payload.solicitacao_id)
                .first();
            if (!solicitacao) return await this.#finalizarSemRetentativa(`Solicitação ${payload.solicitacao_id} não encontrada`);
            const objectNameLinha = `${solicitacao.bucket_wip_path}/${solicitacao.object_name}`;
            if (objectNameLinha !== payload.object_name) return await this.#finalizarSemRetentativa('Solicitação não corresponde ao payload.');
            if (payload.bucket_wip_path && payload.bucket_wip_path !== solicitacao.bucket_wip_path) return await this.#finalizarSemRetentativa('Solicitação não corresponde ao payload.');
            if (payload.user_id && solicitacao.user_id !== payload.user_id) return await this.#finalizarSemRetentativa('Solicitação não corresponde ao payload.');
            const metaDadosSolicitacao = normalizeMetaDados(solicitacao.meta_dados) || {};
            const termoLinha = solicitacao.termo_id || metaDadosSolicitacao.termo_id || null;
            if (termoLinha && payload.termo_id && termoLinha !== payload.termo_id) return await this.#finalizarSemRetentativa('Solicitação não corresponde ao payload.');
            if (solicitacao.status === statusSolicitacao.upload_concluido) return await this.#finalizarComSucesso('Solicitação já processada anteriormente');
            if (solicitacao.status !== statusSolicitacao.processamento_hash_inicial) return await this.#finalizarSemRetentativa(`Solicitação ${solicitacao.id} em status inválido para o hash inicial: ${solicitacao.status}`);
            const arquivo = await bucketGateway.Wip().obterArquivo({ objectName: objectNameLinha });
            if (!arquivo.status) return await this.#finalizarComRetentativa(arquivo.msg, solicitacao);

            this.hashOriginal = await hashSha256FromStream(arquivo.data.stream);
            const carimbo = await serverSignGateway.Carimbo().carimbarHash({ hashHex: this.hashOriginal });
            if (!carimbo.status && serverSignGateway.obrigatorio) {
                return await this.#finalizarComRetentativa(carimbo.msg, solicitacao);
            }
            if (!carimbo.status) {
                logs.getInstance().warn({
                    solicitacao_id: solicitacao.id,
                    hash: this.hashOriginal,
                    msg: carimbo.msg,
                }, 'SignServer indisponível: hash inicial registrado sem carimbo');
                if (statusAplication.status === statusApp.prod) {
                    await this.#registrarFalhaNaSolicitacao(solicitacao, carimbo.msg);
                }
                return await this.#finalizarComRetentativa(carimbo.msg, solicitacao);
            }

            const persistencia = await this.#persistir({ payload, solicitacao, carimbo });
            if (persistencia.concorrencia) return await this.#finalizarComSucesso(persistencia.msg);
            if (persistencia.semRetry) return await this.#finalizarSemRetentativa(persistencia.msg);
            if (!persistencia.status) return await this.#finalizarComRetentativa(persistencia.msg, solicitacao);
            await this.#finalizarComSucesso(`Hash inicial gerado para o documento ${this.documento.id}`);
        } catch (err) {
            console.log(err);
            logs.getInstance().error({ err: err }, 'Erro ao processar ProcessarHashInicial');
            await this.#rollbackTrx();
            await this.#finalizarComRetentativa(err.message, solicitacao);
        }
    }

    #lerPayload() {
        try {
            const envelope = parseBrokerMessageEnvelope(this.#rabbitmq.broker.message);
            const payload = envelope.data || envelope;
            if (!payload.solicitacao_id || !payload.object_name || !payload.documento_nome) return null;
            return payload;
        } catch (err) {
            logs.getInstance().error({ err: err }, 'Não foi possível interpretar a mensagem do ProcessarHashInicial');
            return null;
        }
    }

    async #persistir({ payload, solicitacao, carimbo }) {
        this.trx = await this.#knex.transaction();
        try {
            const solicitacaoTravada = await this.trx('tab_solicitacao_documento')
                .select('*')
                .where('id', solicitacao.id)
                .forUpdate()
                .first();

            if (!solicitacaoTravada) {
                await this.#rollbackTrx();
                return { status: false, semRetry: true, msg: 'Solicitação não encontrada após o lock' };
            }
            if (solicitacaoTravada.status === statusSolicitacao.upload_concluido) {
                await this.trx.commit();
                this.trx = null;
                return { status: true, concorrencia: true, msg: 'Solicitação já processada por outro worker' };
            }
            if (solicitacaoTravada.status !== statusSolicitacao.processamento_hash_inicial) {
                await this.#rollbackTrx();
                return { status: false, semRetry: true, msg: `Solicitação ${solicitacaoTravada.id} em status inválido para o hash inicial: ${solicitacaoTravada.status}` };
            }

            const objectNameTravada = `${solicitacaoTravada.bucket_wip_path}/${solicitacaoTravada.object_name}`;
            if (objectNameTravada !== payload.object_name) {
                await this.#rollbackTrx();
                return { status: false, semRetry: true, msg: 'Solicitação não corresponde ao payload.' };
            }
            if (payload.bucket_wip_path && payload.bucket_wip_path !== solicitacaoTravada.bucket_wip_path) {
                await this.#rollbackTrx();
                return { status: false, semRetry: true, msg: 'Solicitação não corresponde ao payload.' };
            }
            if (payload.user_id && solicitacaoTravada.user_id !== payload.user_id) {
                await this.#rollbackTrx();
                return { status: false, semRetry: true, msg: 'Solicitação não corresponde ao payload.' };
            }
            const metaDadosTravada = normalizeMetaDados(solicitacaoTravada.meta_dados) || {};
            const termoTravado = solicitacaoTravada.termo_id || metaDadosTravada.termo_id || null;
            if (termoTravado && payload.termo_id && termoTravado !== payload.termo_id) {
                await this.#rollbackTrx();
                return { status: false, semRetry: true, msg: 'Solicitação não corresponde ao payload.' };
            }

            const oldSolicitacao = { ...solicitacaoTravada };
            const solicitacaoDomain = new domainSolicitacao(solicitacaoTravada);

            const documento = new domainDocumentos({
                documento_nome: solicitacaoTravada.object_name,
                nome_documento: metaDadosTravada.nome_documento || payload.nome_documento,
                bucket_wip_path: objectNameTravada,
                bucket_valt_path: null,
                status: statusDocumentos.documento_recebido,
                hash_original: this.hashOriginal,
                termo_id: termoTravado || payload.termo_id,
                hash_final: null,
                hash_final_em: null,
                criado_em: dateNow(),
            });
            await this.trx('tab_documentos').insert(documento.getDocumentos());
            const codigoVerificacao = gerarCodigoVerificacao({
                documento_id: documento.id,
                hash_original: this.hashOriginal,
            });
            const documentoVerificacao = new domainDocumentoVerificacao({
                documento_id: documento.id,
                codigo_verificacao: codigoVerificacao,
                hash_referencia: this.hashOriginal,
            });
            const criacaoVerificacao = await documentoVerificacaoRepository.create(documentoVerificacao.getDocumentoVerificacao(), this.trx);
            if (!criacaoVerificacao.status) throw new Error(criacaoVerificacao.msg || 'Falha ao gravar o código de verificação do documento');
            const auditoriaDocumentoDados = new LedgerDocumento(this.trx);
            await auditoriaDocumentoDados.GravarAuditoriaCriacao({
                documento: documento.getDocumentos(),
                tipo_evento: eventoAuditoria.documento_dados_criado.label,
                sequencia: eventoAuditoria.documento_dados_criado.sequencia,
                meta_data: {
                    solicitacao_id: solicitacaoDomain.id,
                    hash_original: this.hashOriginal,
                    bucket_wip_path: objectNameTravada,
                    status: statusDocumentos.documento_recebido,
                },
                user_id: solicitacaoDomain.user_id,
            });

            const metadata = this.#montarMetadata({ payload, solicitacao: solicitacaoDomain, carimbo });
            await new LedgerDocumentoPdf(this.trx).AncorarDocumento({
                solicitacao_id: solicitacaoDomain.id,
                documento_id: documento.id,
                hash_documento_inicial: this.hashOriginal,
                hash_documento_final: this.hashOriginal,
                user_id: solicitacaoDomain.user_id,
            });
            const ultimoElo = await this.trx('tab_auditoria_ledger')
                .where(function () { this.where('documento_id', documento.id).orWhere('solicitacao_id', solicitacaoDomain.id) })
                .where('deletado', false)
                .orderBy('sequencia', 'desc')
                .first();
            const sequencia = ultimoElo ? Number(ultimoElo.sequencia) + 1 : eventoAuditoria.documento_recebido.sequencia;
            const auditoriaDocumentoPdf = new LedgerDocumentoPdf(this.trx);
            const ledgerDocumento = await auditoriaDocumentoPdf.GravarEvento({
                solicitacao_id: solicitacaoDomain.id,
                documento_id: documento.id,
                objeto_tipo: objetoAuditoria.documento,
                objeto_id: documento.id,
                objeto: documento.getDocumentos(),
                objeto_anterior: null,
                desafio_acesso_id: payload.desafio_id || solicitacaoDomain.desafio_id || null,
                tipo_evento: eventoAuditoria.documento_recebido.label,
                sequencia,
                meta_data: {
                    solicitacao_id: metadata.solicitacao_id,
                    documento_id: documento.id,
                    hash_original: this.hashOriginal,
                    status: statusDocumentos.documento_recebido,
                    object_name: metadata.object_name,
                    bucket_wip_path: metadata.bucket_wip_path,
                    size: metadata.size,
                    etag: metadata.etag,
                    content_type: metadata.content_type,
                },
                hash_documento_inicial: this.hashOriginal,
                hash_documento_final: this.hashOriginal,
                hash_registro_anterior: ultimoElo ? ultimoElo.hash_atual : null,
                user_id: solicitacaoDomain.user_id,
            });
            await this.trx('tab_historico').insert(new domainHistorico({
                transformacao: historico.trnasformcao.create.value,
                dado_atual: documento.getDocumentos(),
                data_criacao: documento.criado_em,
                user_id: solicitacaoDomain.user_id,
            }).getHistorico());

            solicitacaoDomain.documento_id = documento.id;
            solicitacaoDomain.status = statusSolicitacao.upload_concluido;
            solicitacaoDomain.erro_msg = null;
            solicitacaoDomain.data_atualizacao = dateNow();

            const metaDadosSolicitacao = normalizeMetaDados(solicitacaoDomain.meta_dados) || {};
            const ultimaLedgerSolicitacao = await this.trx('tab_auditoria_ledger_solicitacao')
                .where('solicitacao_id', solicitacaoDomain.id)
                .where('deletado', false)
                .orderBy('criado_em', 'desc')
                .first();
            const sequenciaSolicitacao = ultimaLedgerSolicitacao
                ? Number(ultimaLedgerSolicitacao.sequencia) + 1
                : (eventoAuditoria.upload_concluido_processado?.sequencia || 2);

            const auditoriaSolicitacao = new LedgerSolicitacao(this.trx);
            auditoriaSolicitacao.Initialize(oldSolicitacao);
            await auditoriaSolicitacao.GravarAuditoriaModificacao({
                solicitacao: solicitacaoDomain.getSolicitacaoDocumento(),
                tipo_evento: statusSolicitacao.upload_concluido,
                sequencia: sequenciaSolicitacao,
                meta_data: {
                    ...metaDadosSolicitacao,
                    object_name: payload.object_name,
                    bucket_wip_path: solicitacaoDomain.bucket_wip_path,
                    documento_id: documento.id,
                    hash_original: this.hashOriginal,
                    size: payload.size || null,
                    etag: payload.etag || null,
                    content_type: payload.content_type || null,
                },
                solicitacao_update: {
                    documento_id: documento.id,
                    status: statusSolicitacao.upload_concluido,
                    erro_msg: null,
                    data_atualizacao: solicitacaoDomain.data_atualizacao,
                },
            });

            await this.trx.commit();
            this.trx = null;
            this.documento = documento.getDocumentos();
            this.ledger = ledgerDocumento;
            return { status: true, msg: 'Documento e ledger persistidos com sucesso' };
        } catch (error) {
            await this.#rollbackTrx();
            logs.getInstance().error({ err: error }, 'Erro ao persistir o hash inicial do documento');
            if (error?.name === 'ErrorLedgerSolicitacao') {
                return { status: false, msg: `Erro de auditoria da solicitação: ${error.message}` };
            }
            if (error?.name === 'ErrorLedgerDocumento') {
                return { status: false, msg: `Erro de auditoria do documento: ${error.message}` };
            }
            if (error?.name === 'ErrorLedgerDocumentoPdf') {
                return { status: false, msg: `Erro de auditoria da trilha do PDF: ${error.message}` };
            }
            return { status: false, msg: `Erro ao persistir o hash inicial: ${error.message}` };
        }
    }

    #montarMetadata({ payload, solicitacao, carimbo }) {
        const metaDadosSolicitacao = normalizeMetaDados(solicitacao.meta_dados) || {};
        return {
            solicitacao_id: solicitacao.id,
            user_id: solicitacao.user_id,
            sessao_id: solicitacao.sessao_id,
            object_name: payload.object_name,
            documento_nome: payload.documento_nome,
            nome_documento: payload.nome_documento,
            bucket_wip_path: solicitacao.bucket_wip_path,
            size: payload.size || null,
            etag: payload.etag || null,
            content_type: payload.content_type || null,
            ip: metaDadosSolicitacao.solicitacao_ip || null,
            porta_logica: metaDadosSolicitacao.solicitacao_porta_logica || null,
            user_agent: metaDadosSolicitacao.userAgent || null,
            carimbo: carimbo.status
                ? carimbo.data
                : { status: false, erro: carimbo.msg, verificado_em: dateNow() },
        };
    }

    async #finalizarComSucesso(msg) {
        this.status = true;
        this.reprocessar = false;
        this.#metaDados.tentativas = 0;
        logs.getInstance().info({ hash: this.hashOriginal }, msg);
        await this.#salvarBroker(statusBroker.processed);
    }

    async #finalizarSemRetentativa(msg) {
        this.status = false;
        this.reprocessar = false;
        await this.#rollbackTrx();
        logs.getInstance().error({ meta_dados: this.#metaDados }, `ProcessarHashInicial descartado: ${msg}`);
        await this.#salvarBroker(statusBroker.failedNotRetry);
    }

    async #finalizarComRetentativa(msg, solicitacao = null) {
        this.status = false;
        this.#metaDados.tentativas += 1;
        this.reprocessar = this.#metaDados.tentativas <= maxRetryReprocessBroker;
        this.delayMs = rabbitMQ.defaultDelay * Math.pow(2, this.#metaDados.tentativas);
        await this.#rollbackTrx();
        logs.getInstance().error({ tentativas: this.#metaDados.tentativas }, `Falha no ProcessarHashInicial: ${msg}`);
        if (!this.reprocessar && solicitacao) await this.#registrarFalhaNaSolicitacao(solicitacao, msg);
        await this.#salvarBroker(this.reprocessar ? statusBroker.pending : statusBroker.failedNotRetry);
    }

    async #registrarFalhaNaSolicitacao(solicitacao, msg) {
        const trx = await this.#knex.transaction();
        try {
            const atual = await trx('tab_solicitacao_documento')
                .select('*')
                .where('id', solicitacao.id)
                .forUpdate()
                .first();
            if (!atual) {
                await trx.rollback();
                return;
            }

            const oldSolicitacao = { ...atual };
            const solicitacaoDomain = new domainSolicitacao(atual);
            solicitacaoDomain.status = statusSolicitacao.erro_hash_inicial;
            solicitacaoDomain.erro_msg = String(msg).substring(0, 500);
            solicitacaoDomain.data_atualizacao = dateNow();

            const metaDadosSolicitacao = normalizeMetaDados(solicitacaoDomain.meta_dados) || {};
            const ultimaLedgerSolicitacao = await trx('tab_auditoria_ledger_solicitacao')
                .where('solicitacao_id', solicitacaoDomain.id)
                .where('deletado', false)
                .orderBy('criado_em', 'desc')
                .first();
            const sequenciaSolicitacao = ultimaLedgerSolicitacao
                ? Number(ultimaLedgerSolicitacao.sequencia) + 1
                : (eventoAuditoria.erro_hash_inicial?.sequencia || 3);

            const auditoriaSolicitacao = new LedgerSolicitacao(trx);
            auditoriaSolicitacao.Initialize(oldSolicitacao);
            await auditoriaSolicitacao.GravarAuditoriaModificacao({
                solicitacao: solicitacaoDomain.getSolicitacaoDocumento(),
                tipo_evento: eventoAuditoria.erro_hash_inicial?.label || statusSolicitacao.erro_hash_inicial,
                sequencia: sequenciaSolicitacao,
                meta_data: {
                    ...metaDadosSolicitacao,
                    erro_msg: solicitacaoDomain.erro_msg,
                    hash_original: this.hashOriginal,
                },
                solicitacao_update: {
                    status: statusSolicitacao.erro_hash_inicial,
                    erro_msg: solicitacaoDomain.erro_msg,
                    data_atualizacao: solicitacaoDomain.data_atualizacao,
                },
            });

            await trx.commit();
        } catch (error) {
            await trx.rollback();
            logs.getInstance().error({ err: error }, 'Erro ao registrar falha na solicitação de documento');
        }
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
            logs.getInstance().error({ err: error }, 'Erro ao salvar o broker do ProcessarHashInicial');
        }
    }

}

module.exports = ProcessarHashInicial;
