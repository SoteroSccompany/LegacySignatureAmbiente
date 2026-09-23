const crypto = require('crypto');
const moment = require('moment');
const JsZip = require('jszip');
const dateNow = require('../../../functions/data/getToday');
const { buckets, historico } = require('../../../../../certs');
const bucketGateway = require('../../../Bucket');
const serverSignGateway = require('../../../ServerSign');
const domainAuditoriaLedgerDocumento = require('../../../../../@core/domain/AuditoriaLedgerDocumento');
const domainHistorico = require('../../../../../@core/domain/Historico');

class LedgerDocumento {

    #trx;
    #documento_inicial;

    constructor(trx) {
        if (!trx) {
            throw new Error('LedgerDocumento exige uma transação knex');
        }
        this.#trx = trx;
    }

    Initialize(documento) {
        this.#documento_inicial = documento;
    }

    async GravarAuditoriaCriacao({ documento, tipo_evento, sequencia, meta_data, user_id }) {
        if (!documento?.id) throw new ErrorLedgerDocumento('documento.id é obrigatório');
        if (!tipo_evento || sequencia == null) throw new ErrorLedgerDocumento('tipo_evento e sequencia são obrigatórios');
        if (!meta_data || typeof meta_data !== 'object') throw new ErrorLedgerDocumento('meta_data é obrigatório e deve ser um objeto');
        if (typeof sequencia !== 'number') throw new ErrorLedgerDocumento('sequencia deve ser um número');
        if (typeof tipo_evento !== 'string') throw new ErrorLedgerDocumento('tipo_evento deve ser uma string');

        const bucketVault = bucketGateway.Vault();
        const payload = documento;
        const body = Buffer.from(JSON.stringify(payload));
        const hashPayload = crypto.createHash('sha256').update(body).digest('hex');
        const object_name = `DocumentoDados-${documento.id}.json`;
        const objectNameCms = `DocumentoDados-${documento.id}.cms`;
        const basePath = bucketVault.applyRootPrefix(`${buckets.valt}/${buckets.pastas.documento_dados_ledger}/${documento.id}`);
        const auditoriaLedger = new domainAuditoriaLedgerDocumento({
            documento_id: documento.id,
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
        if (!carimbo.status) throw new ErrorLedgerDocumento(carimbo.msg || 'Falha ao carimbar hash da auditoria');
        const bodyJson = Buffer.from(JSON.stringify(documento));
        const bodyCms = Buffer.from(carimbo.data.cms_base64, 'base64');
        const zip = new JsZip();
        zip.file(object_name, bodyJson);
        zip.file(objectNameCms, bodyCms);
        const bodyZip = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
        const timeStamp = moment().format('YYYYMMDDHHmmss');
        const objectNameZip = `${basePath}/DocumentoDados-${timeStamp}-${auditoriaLedger.id}.zip`;
        const saveBucket = await bucketVault.salvarArquivo({
            objectName: objectNameZip,
            fileStream: bodyZip,
            size: bodyZip.length,
            contentType: 'application/zip'
        });
        if (!saveBucket.status) throw new ErrorLedgerDocumento(saveBucket.msg || 'Falha ao gravar zip da auditoria no vault');
        const selarDoc = await bucketVault.selarDocumento({ documentoId: objectNameZip });
        if (!selarDoc.status) throw new ErrorLedgerDocumento(selarDoc.msg || 'Falha ao selar zip da auditoria no vault');
        auditoriaLedger.object_name = objectNameZip;
        await this.#trx('tab_auditoria_ledger_documento').insert(auditoriaLedger.getAuditoriaLedgerDocumento());
        await this.#trx('tab_historico').insert(new domainHistorico({
            transformacao: historico.trnasformcao.create.value,
            dado_atual: auditoriaLedger,
            data_criacao: auditoriaLedger.criado_em,
            user_id,
        }).getHistorico());
    }

    async GravarAuditoriaModificacao({ documento, tipo_evento, sequencia, meta_data, documento_update, user_id }) {
        if (!documento?.id) throw new ErrorLedgerDocumento('documento.id é obrigatório');
        if (!this.#documento_inicial?.id) throw new ErrorLedgerDocumento('Initialize(documento) é obrigatório antes da modificação');
        if (documento.id !== this.#documento_inicial.id) throw new ErrorLedgerDocumento('O documento fornecido não corresponde ao documento inicial registrado.');
        if (!tipo_evento || sequencia == null) throw new ErrorLedgerDocumento('tipo_evento e sequencia são obrigatórios');
        if (!meta_data || typeof meta_data !== 'object') throw new ErrorLedgerDocumento('meta_data é obrigatório e deve ser um objeto');
        if (typeof sequencia !== 'number') throw new ErrorLedgerDocumento('sequencia deve ser um número');
        if (typeof tipo_evento !== 'string') throw new ErrorLedgerDocumento('tipo_evento deve ser uma string');
        const ladgerAnterior = await this.#trx('tab_auditoria_ledger_documento')
            .where('documento_id', documento.id)
            .where('deletado', false)
            .orderBy('sequencia', 'desc')
            .first();
        if (!ladgerAnterior) throw new ErrorLedgerDocumento('Não foi possível encontrar o último registro de auditoria para este documento.');
        const bucketVault = bucketGateway.Vault();
        const payload = documento;
        const body = Buffer.from(JSON.stringify(payload));
        const hashPayload = crypto.createHash('sha256').update(body).digest('hex');
        const object_name = `DocumentoDados-${documento.id}.json`;
        const objectNameCms = `DocumentoDados-${documento.id}.cms`;
        const basePath = bucketVault.applyRootPrefix(`${buckets.valt}/${buckets.pastas.documento_dados_ledger}/${documento.id}`);
        const auditoriaLedger = new domainAuditoriaLedgerDocumento({
            documento_id: documento.id,
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
        if (!carimbo.status) throw new ErrorLedgerDocumento(carimbo.msg || 'Falha ao carimbar hash da auditoria');
        const bodyJson = Buffer.from(JSON.stringify(documento));
        const bodyCms = Buffer.from(carimbo.data.cms_base64, 'base64');
        const zip = new JsZip();
        zip.file(object_name, bodyJson);
        zip.file(objectNameCms, bodyCms);
        const bodyZip = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
        const timeStamp = moment().format('YYYYMMDDHHmmss');
        const objectNameZip = `${basePath}/DocumentoDados-${timeStamp}-${auditoriaLedger.id}.zip`;
        const saveBucket = await bucketVault.salvarArquivo({
            objectName: objectNameZip,
            fileStream: bodyZip,
            size: bodyZip.length,
            contentType: 'application/zip'
        });
        if (!saveBucket.status) throw new ErrorLedgerDocumento(saveBucket.msg || 'Falha ao gravar zip da auditoria no vault');
        const selarDoc = await bucketVault.selarDocumento({ documentoId: objectNameZip });
        if (!selarDoc.status) throw new ErrorLedgerDocumento(selarDoc.msg || 'Falha ao selar zip da auditoria no vault');
        auditoriaLedger.object_name = objectNameZip;
        if (documento_update && typeof documento_update === 'object') {
            await this.#trx('tab_documentos').where('id', documento.id).update(documento_update);
        }
        await this.#trx('tab_auditoria_ledger_documento').insert(auditoriaLedger.getAuditoriaLedgerDocumento());
        await this.#trx('tab_historico').insert(new domainHistorico({
            transformacao: historico.trnasformcao.update.value,
            dado_antigo: this.#documento_inicial,
            dado_atual: { ...documento },
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

module.exports = LedgerDocumento;

class ErrorLedgerDocumento extends Error {
    constructor(message) {
        super(message);
        this.name = 'ErrorLedgerDocumento';
    }
}
