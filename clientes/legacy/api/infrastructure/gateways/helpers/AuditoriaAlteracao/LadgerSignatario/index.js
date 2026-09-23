const crypto = require('crypto');
const moment = require('moment');
const JsZip = require('jszip');
const dateNow = require('../../../functions/data/getToday');
const { buckets, historico } = require('../../../../../certs');
const bucketGateway = require('../../../Bucket');
const serverSignGateway = require('../../../ServerSign');
const domainAuditoriaLedgerSignatario = require('../../../../../@core/domain/AuditoriaLedgerSignatario');
const domainHistorico = require('../../../../../@core/domain/Historico');

class LedgerSignatario {

    #trx;
    #signatario_inicial;

    constructor(trx) {
        if (!trx) {
            throw new Error('LedgerSignatario exige uma transação knex');
        }
        this.#trx = trx;
    }

    Initialize(signatario) {
        this.#signatario_inicial = signatario;
    }

    async GravarAuditoriaCriacao({ signatario, tipo_evento, sequencia, meta_data, user_id }) {
        if (!signatario?.id) throw new ErrorLedgerSignatario('signatario.id é obrigatório');
        if (!tipo_evento || sequencia == null) throw new ErrorLedgerSignatario('tipo_evento e sequencia são obrigatórios');
        if (!meta_data || typeof meta_data !== 'object') throw new ErrorLedgerSignatario('meta_data é obrigatório e deve ser um objeto');
        if (typeof sequencia !== 'number') throw new ErrorLedgerSignatario('sequencia deve ser um número');
        if (typeof tipo_evento !== 'string') throw new ErrorLedgerSignatario('tipo_evento deve ser uma string');
        const bucketVault = bucketGateway.Vault();
        const payload = signatario;
        const body = Buffer.from(JSON.stringify(payload));
        const hashPayload = crypto.createHash('sha256').update(body).digest('hex');
        const object_name = `Signatario-${signatario.id}.json`;
        const objectNameCms = `Signatario-${signatario.id}.cms`;
        const basePath = bucketVault.applyRootPrefix(`${buckets.valt}/${buckets.pastas.signatario_ledger}/${signatario.id}`);
        const auditoriaLedger = new domainAuditoriaLedgerSignatario({
            signatario_id: signatario.id,
            documento_id: signatario.documento_id,
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
        if (!carimbo.status) throw new ErrorLedgerSignatario(carimbo.msg || 'Falha ao carimbar hash da auditoria');
        const bodyJson = Buffer.from(JSON.stringify(signatario));
        const bodyCms = Buffer.from(carimbo.data.cms_base64, 'base64');
        const zip = new JsZip();
        zip.file(object_name, bodyJson);
        zip.file(objectNameCms, bodyCms);
        const bodyZip = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
        const timeStamp = moment().format('YYYYMMDDHHmmss');
        const objectNameZip = `${basePath}/Signatario-${timeStamp}-${auditoriaLedger.id}.zip`;
        const saveBucket = await bucketVault.salvarArquivo({
            objectName: objectNameZip,
            fileStream: bodyZip,
            size: bodyZip.length,
            contentType: 'application/zip'
        });
        if (!saveBucket.status) throw new ErrorLedgerSignatario(saveBucket.msg || 'Falha ao gravar zip da auditoria no vault');
        const selarDoc = await bucketVault.selarDocumento({ documentoId: objectNameZip });
        if (!selarDoc.status) throw new ErrorLedgerSignatario(selarDoc.msg || 'Falha ao selar zip da auditoria no vault');
        auditoriaLedger.object_name = objectNameZip;
        await this.#trx('tab_auditoria_ledger_signatario').insert(auditoriaLedger.getAuditoriaLedgerSignatario());
        await this.#trx('tab_historico').insert(new domainHistorico({
            transformacao: historico.trnasformcao.create.value,
            dado_atual: auditoriaLedger,
            data_criacao: auditoriaLedger.criado_em,
            user_id: user_id || signatario.user_id,
        }).getHistorico());
    }

    async GravarAuditoriaModificacao({ signatario, tipo_evento, sequencia, meta_data, user_id }) {
        if (!signatario?.id) throw new ErrorLedgerSignatario('signatario.id é obrigatório');
        if (!this.#signatario_inicial?.id) throw new ErrorLedgerSignatario('Initialize(signatario) é obrigatório antes da modificação');
        if (signatario.id !== this.#signatario_inicial.id) throw new ErrorLedgerSignatario('O signatário fornecido não corresponde ao signatário inicial registrado.');
        if (!tipo_evento || sequencia == null) throw new ErrorLedgerSignatario('tipo_evento e sequencia são obrigatórios');
        if (!meta_data || typeof meta_data !== 'object') throw new ErrorLedgerSignatario('meta_data é obrigatório e deve ser um objeto');
        if (typeof sequencia !== 'number') throw new ErrorLedgerSignatario('sequencia deve ser um número');
        if (typeof tipo_evento !== 'string') throw new ErrorLedgerSignatario('tipo_evento deve ser uma string');
        const ladgerAnterior = await this.#trx('tab_auditoria_ledger_signatario')
            .where('signatario_id', signatario.id)
            .where('deletado', false)
            .orderBy('sequencia', 'desc')
            .first();
        if (!ladgerAnterior) throw new ErrorLedgerSignatario('Não foi possível encontrar o último registro de auditoria para este signatário.');
        const bucketVault = bucketGateway.Vault();
        const payload = signatario;
        const body = Buffer.from(JSON.stringify(payload));
        const hashPayload = crypto.createHash('sha256').update(body).digest('hex');
        const object_name = `Signatario-${signatario.id}.json`;
        const objectNameCms = `Signatario-${signatario.id}.cms`;
        const basePath = bucketVault.applyRootPrefix(`${buckets.valt}/${buckets.pastas.signatario_ledger}/${signatario.id}`);
        const auditoriaLedger = new domainAuditoriaLedgerSignatario({
            signatario_id: signatario.id,
            documento_id: signatario.documento_id,
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
        if (!carimbo.status) throw new ErrorLedgerSignatario(carimbo.msg || 'Falha ao carimbar hash da auditoria');
        const bodyJson = Buffer.from(JSON.stringify(signatario));
        const bodyCms = Buffer.from(carimbo.data.cms_base64, 'base64');
        const zip = new JsZip();
        zip.file(object_name, bodyJson);
        zip.file(objectNameCms, bodyCms);
        const bodyZip = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
        const timeStamp = moment().format('YYYYMMDDHHmmss');
        const objectNameZip = `${basePath}/Signatario-${timeStamp}-${auditoriaLedger.id}.zip`;
        const saveBucket = await bucketVault.salvarArquivo({
            objectName: objectNameZip,
            fileStream: bodyZip,
            size: bodyZip.length,
            contentType: 'application/zip'
        });
        if (!saveBucket.status) throw new ErrorLedgerSignatario(saveBucket.msg || 'Falha ao gravar zip da auditoria no vault');
        const selarDoc = await bucketVault.selarDocumento({ documentoId: objectNameZip });
        if (!selarDoc.status) throw new ErrorLedgerSignatario(selarDoc.msg || 'Falha ao selar zip da auditoria no vault');
        auditoriaLedger.object_name = objectNameZip;
        await this.#trx('tab_auditoria_ledger_signatario').insert(auditoriaLedger.getAuditoriaLedgerSignatario());
        await this.#trx('tab_historico').insert(new domainHistorico({
            transformacao: historico.trnasformcao.update.value,
            dado_antigo: this.#signatario_inicial,
            dado_atual: { ...signatario },
            data_criacao: dateNow(),
            user_id: user_id || signatario.user_id,
        }).getHistorico());
        await this.#trx('tab_historico').insert(new domainHistorico({
            transformacao: historico.trnasformcao.create.value,
            dado_atual: auditoriaLedger,
            data_criacao: auditoriaLedger.criado_em,
            user_id: user_id || signatario.user_id,
        }).getHistorico());
    }
}

module.exports = LedgerSignatario;

class ErrorLedgerSignatario extends Error {
    constructor(message) {
        super(message);
        this.name = 'ErrorLedgerSignatario';
    }
}
