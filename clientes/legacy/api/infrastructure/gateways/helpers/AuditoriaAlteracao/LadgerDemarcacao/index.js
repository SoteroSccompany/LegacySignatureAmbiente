const crypto = require('crypto');
const moment = require('moment');
const JsZip = require('jszip');
const dateNow = require('../../../functions/data/getToday');
const { buckets, historico } = require('../../../../../certs');
const bucketGateway = require('../../../Bucket');
const serverSignGateway = require('../../../ServerSign');
const domainAuditoriaLedgerDemarcacao = require('../../../../../@core/domain/AuditoriaLedgerDemarcacao');
const domainHistorico = require('../../../../../@core/domain/Historico');

class LedgerDemarcacao {

    #trx;
    #demarcacao_inicial;

    constructor(trx) {
        if (!trx) {
            throw new Error('LedgerDemarcacao exige uma transação knex');
        }
        this.#trx = trx;
    }

    Initialize(demarcacao) {
        this.#demarcacao_inicial = demarcacao;
    }

    async GravarAuditoriaCriacao({ demarcacao, documento_id, tipo_evento, sequencia, meta_data, user_id }) {
        if (!demarcacao?.id) throw new ErrorLedgerDemarcacao('demarcacao.id é obrigatório');
        if (!documento_id) throw new ErrorLedgerDemarcacao('documento_id é obrigatório');
        if (!tipo_evento || sequencia == null) throw new ErrorLedgerDemarcacao('tipo_evento e sequencia são obrigatórios');
        if (!meta_data || typeof meta_data !== 'object') throw new ErrorLedgerDemarcacao('meta_data é obrigatório e deve ser um objeto');
        if (typeof sequencia !== 'number') throw new ErrorLedgerDemarcacao('sequencia deve ser um número');
        if (typeof tipo_evento !== 'string') throw new ErrorLedgerDemarcacao('tipo_evento deve ser uma string');
        const bucketVault = bucketGateway.Vault();
        const payload = demarcacao;
        const body = Buffer.from(JSON.stringify(payload));
        const hashPayload = crypto.createHash('sha256').update(body).digest('hex');
        const object_name = `DemarcacaoAssinatura-${demarcacao.id}.json`;
        const objectNameCms = `DemarcacaoAssinatura-${demarcacao.id}.cms`;
        const basePath = bucketVault.applyRootPrefix(`${buckets.valt}/${buckets.pastas.demarcacao_ledger}/${demarcacao.id}`);
        const auditoriaLedger = new domainAuditoriaLedgerDemarcacao({
            demarcacao_id: demarcacao.id,
            documento_id,
            tipo_evento,
            sequencia,
            metadata_json: meta_data,
            payload_sha256: hashPayload,
            hash_registro_anterior: null,
            bucket_path: basePath,
            auditoria_ledger_origem: null,
            criado_em: dateNow(),
        });
        auditoriaLedger.metadata_json.payload_sha256 = hashPayload;
        auditoriaLedger.metadata_json.object_json_name = object_name;
        auditoriaLedger.metadata_json.object_cms_name = objectNameCms;
        auditoriaLedger.metadata_json.bucket_path = basePath;
        const hashObjeto = auditoriaLedger.calcularHashAtual();
        const carimbo = await serverSignGateway.Carimbo().carimbarHash({ hashHex: hashObjeto });
        if (!carimbo.status) throw new ErrorLedgerDemarcacao(carimbo.msg || 'Falha ao carimbar hash da auditoria');
        const bodyJson = Buffer.from(JSON.stringify(demarcacao));
        const bodyCms = Buffer.from(carimbo.data.cms_base64, 'base64');
        const zip = new JsZip();
        zip.file(object_name, bodyJson);
        zip.file(objectNameCms, bodyCms);
        const bodyZip = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
        const timeStamp = moment().format('YYYYMMDDHHmmss');
        const objectNameZip = `${basePath}/DemarcacaoAssinatura-${timeStamp}-${auditoriaLedger.id}.zip`;
        const saveBucket = await bucketVault.salvarArquivo({
            objectName: objectNameZip,
            fileStream: bodyZip,
            size: bodyZip.length,
            contentType: 'application/zip'
        });
        if (!saveBucket.status) throw new ErrorLedgerDemarcacao(saveBucket.msg || 'Falha ao gravar zip da auditoria no vault');
        const selarDoc = await bucketVault.selarDocumento({ documentoId: objectNameZip });
        if (!selarDoc.status) throw new ErrorLedgerDemarcacao(selarDoc.msg || 'Falha ao selar zip da auditoria no vault');
        auditoriaLedger.object_name = objectNameZip;
        await this.#trx('tab_auditoria_ledger_demarcacao').insert(auditoriaLedger.getAuditoriaLedgerDemarcacao());
        await this.#trx('tab_historico').insert(new domainHistorico({
            transformacao: historico.trnasformcao.create.value,
            dado_atual: auditoriaLedger,
            data_criacao: auditoriaLedger.criado_em,
            user_id,
        }).getHistorico());
    }

    async GravarAuditoriaModificacao({ demarcacao, documento_id, tipo_evento, sequencia, meta_data, user_id }) {
        if (!demarcacao?.id) throw new ErrorLedgerDemarcacao('demarcacao.id é obrigatório');
        if (!documento_id) throw new ErrorLedgerDemarcacao('documento_id é obrigatório');
        if (!this.#demarcacao_inicial?.id) throw new ErrorLedgerDemarcacao('Initialize(demarcacao) é obrigatório antes da modificação');
        if (demarcacao.id !== this.#demarcacao_inicial.id) throw new ErrorLedgerDemarcacao('A demarcação fornecida não corresponde à demarcação inicial registrada.');
        if (!tipo_evento || sequencia == null) throw new ErrorLedgerDemarcacao('tipo_evento e sequencia são obrigatórios');
        if (!meta_data || typeof meta_data !== 'object') throw new ErrorLedgerDemarcacao('meta_data é obrigatório e deve ser um objeto');
        if (typeof sequencia !== 'number') throw new ErrorLedgerDemarcacao('sequencia deve ser um número');
        if (typeof tipo_evento !== 'string') throw new ErrorLedgerDemarcacao('tipo_evento deve ser uma string');
        const ladgerAnterior = await this.#trx('tab_auditoria_ledger_demarcacao')
            .where('demarcacao_id', demarcacao.id)
            .where('deletado', false)
            .orderBy('sequencia', 'desc')
            .first();
        if (!ladgerAnterior) throw new ErrorLedgerDemarcacao('Não foi possível encontrar o último registro de auditoria para esta demarcação.');
        const bucketVault = bucketGateway.Vault();
        const payload = demarcacao;
        const body = Buffer.from(JSON.stringify(payload));
        const hashPayload = crypto.createHash('sha256').update(body).digest('hex');
        const object_name = `DemarcacaoAssinatura-${demarcacao.id}.json`;
        const objectNameCms = `DemarcacaoAssinatura-${demarcacao.id}.cms`;
        const basePath = bucketVault.applyRootPrefix(`${buckets.valt}/${buckets.pastas.demarcacao_ledger}/${demarcacao.id}`);
        const auditoriaLedger = new domainAuditoriaLedgerDemarcacao({
            demarcacao_id: demarcacao.id,
            documento_id,
            tipo_evento,
            sequencia: ladgerAnterior?.sequencia + 1,
            metadata_json: meta_data,
            payload_sha256: hashPayload,
            hash_atual: ladgerAnterior.hash_atual,
            bucket_path: basePath,
            hash_registro_anterior: ladgerAnterior.hash_atual,
            auditoria_ledger_origem: ladgerAnterior.id,
            criado_em: dateNow(),
        });
        auditoriaLedger.metadata_json.payload_sha256 = hashPayload;
        auditoriaLedger.metadata_json.object_json_name = object_name;
        auditoriaLedger.metadata_json.object_cms_name = objectNameCms;
        auditoriaLedger.metadata_json.bucket_path = basePath;
        const hashObjeto = auditoriaLedger.calcularHashAtual();
        const carimbo = await serverSignGateway.Carimbo().carimbarHash({ hashHex: hashObjeto });
        if (!carimbo.status) throw new ErrorLedgerDemarcacao(carimbo.msg || 'Falha ao carimbar hash da auditoria');
        const bodyJson = Buffer.from(JSON.stringify(demarcacao));
        const bodyCms = Buffer.from(carimbo.data.cms_base64, 'base64');
        const zip = new JsZip();
        zip.file(object_name, bodyJson);
        zip.file(objectNameCms, bodyCms);
        const bodyZip = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
        const timeStamp = moment().format('YYYYMMDDHHmmss');
        const objectNameZip = `${basePath}/DemarcacaoAssinatura-${timeStamp}-${auditoriaLedger.id}.zip`;
        const saveBucket = await bucketVault.salvarArquivo({
            objectName: objectNameZip,
            fileStream: bodyZip,
            size: bodyZip.length,
            contentType: 'application/zip'
        });
        if (!saveBucket.status) throw new ErrorLedgerDemarcacao(saveBucket.msg || 'Falha ao gravar zip da auditoria no vault');
        const selarDoc = await bucketVault.selarDocumento({ documentoId: objectNameZip });
        if (!selarDoc.status) throw new ErrorLedgerDemarcacao(selarDoc.msg || 'Falha ao selar zip da auditoria no vault');
        auditoriaLedger.object_name = objectNameZip;
        await this.#trx('tab_auditoria_ledger_demarcacao').insert(auditoriaLedger.getAuditoriaLedgerDemarcacao());
        await this.#trx('tab_historico').insert(new domainHistorico({
            transformacao: historico.trnasformcao.update.value,
            dado_antigo: this.#demarcacao_inicial,
            dado_atual: { ...demarcacao },
            data_criacao: dateNow(),
            user_id,
        }).getHistorico());
        await this.#trx('tab_historico').insert(new domainHistorico({
            transformacao: historico.trnasformcao.create.value,
            dado_atual: auditoriaLedger,
            data_criacao: auditoriaLedger.criado_em,
            user_id,
        }).getHistorico());
    }
}

module.exports = LedgerDemarcacao;

class ErrorLedgerDemarcacao extends Error {
    constructor(message) {
        super(message);
        this.name = 'ErrorLedgerDemarcacao';
    }
}
