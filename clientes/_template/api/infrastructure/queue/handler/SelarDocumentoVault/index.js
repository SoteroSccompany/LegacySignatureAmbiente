const crypto = require('crypto');
const moment = require('moment');
const {
    statusBroker,
    rabbitMQ,
    maxRetryReprocessBroker,
    eventoAuditoria,
    statusDocumentos,
} = require('../../../../certs');
const { parseBrokerMessageEnvelope, normalizeMetaDados } = require('../../../gateways/functions/brokerMessageEnvelope');
const dateNow = require('../../../gateways/functions/data/getToday');
const logs = require('../../../../Logs');
const bucketGateway = require('../../../gateways/Bucket');
const { streamToBuffer } = require('../../../gateways/PdfSign/aplicarAssinaturaPdf');
const LedgerDocumento = require('../../../gateways/helpers/AuditoriaAlteracao/LadgerDocumento');

// Copia o PDF já finalizado do WIP para o Vault e só então trava a retenção COMPLIANCE
// (Object Lock é irreversível). Passagem 1 (sem lock) confere se o documento está pronto e
// se o hash do WIP ainda bate com hash_final; passagem 2 (com lock) reconfere sob a trava,
// copia, reconfere o hash da cópia e só depois trava. Não apaga nada do WIP (fica para depois).
class SelarDocumentoVault {

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
        if (!this.#metaDados) this.#metaDados = { tentativas: 0 };
        if (this.#metaDados.tentativas === undefined) this.#metaDados.tentativas = 0;
    }

    async processar() {
        try {
            const payload = this.#lerPayload();
            if (!payload) return await this.#finalizarSemRetentativa('Mensagem sem os dados obrigatórios do documento.');

            const documento = await this.#knex('tab_documentos')
                .select('id', 'status', 'hash_final', 'bucket_wip_path', 'bucket_valt_path')
                .where('id', payload.documento_id)
                .first();
            if (!documento) return await this.#finalizarSemRetentativa('Documento não localizado.');
            if (documento.bucket_valt_path) return await this.#finalizarComSucesso(`Documento ${documento.id} já selado no Vault.`);
            if (documento.status !== statusDocumentos.documento_assinado) {
                return await this.#finalizarSemRetentativa(`Documento em status inválido para selagem no Vault: ${documento.status}`);
            }
            if (!documento.hash_final) return await this.#finalizarSemRetentativa('Documento sem hash_final, não pode ser selado no Vault.');

            const ultimoEloSelado = await this.#knex('tab_auditoria_ledger')
                .where('documento_id', documento.id)
                .andWhere('tipo_evento', eventoAuditoria.documento_selado.label)
                .andWhere('deletado', false)
                .orderBy('sequencia', 'desc')
                .first();
            if (!ultimoEloSelado) return await this.#finalizarSemRetentativa('Documento sem elo DOCUMENTO_SELADO na trilha mestre, não pode ser selado no Vault.');

            const magicWip = await bucketGateway.Wip().validarMagicPdf({ objectName: documento.bucket_wip_path });
            if (!magicWip.status) return await this.#finalizarSemRetentativa(magicWip.msg);

            const arquivoWip = await bucketGateway.Wip().obterArquivo({ objectName: documento.bucket_wip_path });
            if (!arquivoWip.status) return await this.#finalizarComRetentativa(arquivoWip.msg);
            const bufferWip = await streamToBuffer(arquivoWip.data.stream);
            const hashWip = crypto.createHash('sha256').update(bufferWip).digest('hex');
            const bufferHashWip = Buffer.from(hashWip);
            const bufferHashFinal = Buffer.from(String(documento.hash_final));
            const hashWipConfere = bufferHashWip.length === bufferHashFinal.length && crypto.timingSafeEqual(bufferHashWip, bufferHashFinal);
            if (!hashWipConfere) return await this.#finalizarSemRetentativa('Hash do arquivo no WIP não corresponde ao hash_final do documento.');

            this.trx = await this.#knex.transaction();
            try {
                const travado = await this.trx('tab_documentos').select('*').where('id', documento.id).forUpdate().first();
                if (!travado) throw new ErrorSelarDocumentoVault('Documento não localizado.', false);
                if (travado.bucket_valt_path) {
                    await this.trx.commit();
                    this.trx = null;
                    return await this.#finalizarComSucesso(`Documento ${travado.id} já selado no Vault.`);
                }
                if (travado.status !== statusDocumentos.documento_assinado || travado.hash_final !== documento.hash_final) {
                    throw new ErrorSelarDocumentoVault('Documento mudou de estado antes da selagem no Vault.', false);
                }
                const oldDocumento = { ...travado };

                const copia = await bucketGateway.Vault().copiarDoWip({ objectName: travado.bucket_wip_path });
                if (!copia.status) throw new ErrorSelarDocumentoVault(copia.msg || 'Falha ao copiar documento do WIP para o Vault.');

                const arquivoVault = await bucketGateway.Vault().obterArquivo({ objectName: travado.bucket_wip_path });
                if (!arquivoVault.status) throw new ErrorSelarDocumentoVault(arquivoVault.msg || 'Falha ao ler documento recém-copiado no Vault.');
                const bufferVault = await streamToBuffer(arquivoVault.data.stream);
                const hashVault = crypto.createHash('sha256').update(bufferVault).digest('hex');
                const bufferHashVault = Buffer.from(hashVault);
                const hashVaultConfere = bufferHashVault.length === bufferHashFinal.length && crypto.timingSafeEqual(bufferHashVault, bufferHashFinal);
                if (!hashVaultConfere) {
                    throw new ErrorSelarDocumentoVault('Hash do documento copiado no Vault não corresponde ao hash_final, cópia não foi travada.', false);
                }

                // Só chega aqui depois do hash da cópia bater com o hash_final oficial. Object Lock
                // COMPLIANCE é irreversível — não travar antes dessa reconferência.
                const retencao = await bucketGateway.Vault().selarDocumento({ documentoId: travado.bucket_wip_path });
                if (!retencao.status) throw new ErrorSelarDocumentoVault(retencao.msg || 'Falha ao aplicar retenção COMPLIANCE no Vault.');

                const novoDocumentoEstado = { ...travado, bucket_valt_path: travado.bucket_wip_path };

                const ultimaLedgerDocumento = await this.trx('tab_auditoria_ledger_documento')
                    .where('documento_id', travado.id)
                    .where('deletado', false)
                    .orderBy('sequencia', 'desc')
                    .first();
                const sequenciaDocumento = ultimaLedgerDocumento
                    ? Number(ultimaLedgerDocumento.sequencia) + 1
                    : eventoAuditoria.documento_selado.sequencia;

                const auditoriaDocumento = new LedgerDocumento(this.trx);
                auditoriaDocumento.Initialize(oldDocumento);
                await auditoriaDocumento.GravarAuditoriaModificacao({
                    documento: novoDocumentoEstado,
                    tipo_evento: eventoAuditoria.documento_selado.label,
                    sequencia: sequenciaDocumento,
                    meta_data: {
                        bucket_valt_path: novoDocumentoEstado.bucket_valt_path,
                        hash_final: travado.hash_final,
                        origem: 'wip',
                    },
                    documento_update: {
                        bucket_valt_path: novoDocumentoEstado.bucket_valt_path,
                    },
                    user_id: payload.user_id || null,
                });

                await this.trx.commit();
                this.trx = null;
            } catch (err) {
                console.log(err);
                await this.#rollbackTrx();
                if (err.name === 'ErrorSelarDocumentoVault' && err.retry === false) {
                    return await this.#finalizarSemRetentativa(err.message);
                }
                return await this.#finalizarComRetentativa(err.message);
            }
            // WIP não é apagado nesta tarefa (fica intacto até a leva de limpeza ser aberta).
            return await this.#finalizarComSucesso(`Documento ${documento.id} selado no Vault com guarda WORM.`);
        } catch (err) {
            console.log(err);
            logs.getInstance().error({ err }, 'Erro ao processar SelarDocumentoVault');
            await this.#rollbackTrx();
            await this.#finalizarComRetentativa(err.message);
        }
    }

    #lerPayload() {
        try {
            const envelope = parseBrokerMessageEnvelope(this.#rabbitmq.broker.message);
            const payload = envelope.data || envelope;
            if (!payload.documento_id) return null;
            return payload;
        } catch (err) {
            logs.getInstance().error({ err }, 'Não foi possível interpretar a mensagem do SelarDocumentoVault');
            return null;
        }
    }

    async #finalizarComSucesso(msg) {
        this.status = true;
        this.reprocessar = false;
        this.#metaDados.tentativas = 0;
        logs.getInstance().info({ meta_dados: this.#metaDados }, msg);
        await this.#salvarBroker(statusBroker.processed);
    }

    async #finalizarSemRetentativa(msg) {
        this.status = false;
        this.reprocessar = false;
        await this.#rollbackTrx();
        logs.getInstance().error({ meta_dados: this.#metaDados }, `SelarDocumentoVault descartado: ${msg}`);
        await this.#salvarBroker(statusBroker.failedNotRetry);
    }

    async #finalizarComRetentativa(msg) {
        this.status = false;
        this.#metaDados.tentativas += 1;
        this.reprocessar = this.#metaDados.tentativas <= maxRetryReprocessBroker;
        this.delayMs = rabbitMQ.defaultDelay * Math.pow(2, this.#metaDados.tentativas);
        await this.#rollbackTrx();
        logs.getInstance().error({ tentativas: this.#metaDados.tentativas }, `Falha no SelarDocumentoVault: ${msg}`);
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
            logs.getInstance().error({ err: error }, 'Erro ao salvar o broker do SelarDocumentoVault');
        }
    }
}

class ErrorSelarDocumentoVault extends Error {
    constructor(message, retry) {
        super(message);
        this.name = 'ErrorSelarDocumentoVault';
        this.retry = retry !== false;
    }
}

module.exports = SelarDocumentoVault;
