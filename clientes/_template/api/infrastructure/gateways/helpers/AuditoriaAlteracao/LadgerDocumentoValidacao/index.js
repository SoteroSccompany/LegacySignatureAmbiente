const crypto = require('crypto');
const moment = require('moment');
const JsZip = require('jszip');
const dateNow = require('../../../functions/data/getToday');
const { buckets, historico } = require('../../../../../certs');
const bucketGateway = require('../../../Bucket');
const serverSignGateway = require('../../../ServerSign');
const domainAuditoriaLedgerDocumentoValidacao = require('../../../../../@core/domain/AuditoriaLedgerDocumentoValidacao');
const domainHistorico = require('../../../../../@core/domain/Historico');

class LedgerDocumentoValidacao {

    #trx;
    #validacao_inicial;

    constructor(trx) {
        if (!trx) {
            throw new ErrorLedgerDocumentoValidacao('LedgerDocumentoValidacao exige uma transação knex');
        }
        this.#trx = trx;
    }

    Initialize(validacao) {
        this.#validacao_inicial = validacao;
    }

    async GravarAuditoriaCriacao({ validacao, tipo_evento, sequencia, meta_data, user_id }) {
        if (!validacao?.id) throw new ErrorLedgerDocumentoValidacao('validacao.id é obrigatório');
        if (!tipo_evento || sequencia == null) throw new ErrorLedgerDocumentoValidacao('tipo_evento e sequencia são obrigatórios');
        if (!meta_data || typeof meta_data !== 'object') throw new ErrorLedgerDocumentoValidacao('meta_data é obrigatório e deve ser um objeto');
        if (typeof sequencia !== 'number') throw new ErrorLedgerDocumentoValidacao('sequencia deve ser um número');
        if (typeof tipo_evento !== 'string') throw new ErrorLedgerDocumentoValidacao('tipo_evento deve ser uma string');

        const bucketVault = bucketGateway.Vault();
        const payload = validacao;
        const body = Buffer.from(JSON.stringify(payload));
        const hashPayload = crypto.createHash('sha256').update(body).digest('hex');
        const object_name = `DocumentoValidacao-${validacao.id}.json`;
        const objectNameCms = `DocumentoValidacao-${validacao.id}.cms`;
        const basePath = bucketVault.applyRootPrefix(`${buckets.valt}/${buckets.pastas.documento_validacao_ledger}/${validacao.id}`);
        const auditoriaLedger = new domainAuditoriaLedgerDocumentoValidacao({
            documento_validacao_id: validacao.id,
            documento_id: validacao.documento_id || null,
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
        if (!carimbo.status) throw new ErrorLedgerDocumentoValidacao(carimbo.msg || 'Falha ao carimbar hash da auditoria');
        const bodyJson = Buffer.from(JSON.stringify(validacao));
        const bodyCms = Buffer.from(carimbo.data.cms_base64, 'base64');
        const zip = new JsZip();
        zip.file(object_name, bodyJson);
        zip.file(objectNameCms, bodyCms);
        const bodyZip = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
        const timeStamp = moment().format('YYYYMMDDHHmmss');
        const objectNameZip = `${basePath}/DocumentoValidacao-${timeStamp}-${auditoriaLedger.id}.zip`;
        const saveBucket = await bucketVault.salvarArquivo({
            objectName: objectNameZip,
            fileStream: bodyZip,
            size: bodyZip.length,
            contentType: 'application/zip'
        });
        if (!saveBucket.status) throw new ErrorLedgerDocumentoValidacao(saveBucket.msg || 'Falha ao gravar zip da auditoria no vault');
        const selarDoc = await bucketVault.selarDocumento({ documentoId: objectNameZip });
        if (!selarDoc.status) throw new ErrorLedgerDocumentoValidacao(selarDoc.msg || 'Falha ao selar zip da auditoria no vault');
        auditoriaLedger.object_name = objectNameZip;
        await this.#trx('tab_auditoria_ledger_documento_validacao').insert(auditoriaLedger.getAuditoriaLedgerDocumentoValidacao());
        await this.#trx('tab_historico').insert(new domainHistorico({
            transformacao: historico.trnasformcao.create.value,
            dado_atual: auditoriaLedger,
            data_criacao: auditoriaLedger.criado_em,
            user_id,
        }).getHistorico());
    }

    async GravarAuditoriaModificacao({ validacao, tipo_evento, sequencia, meta_data, validacao_update, user_id }) {
        if (!validacao?.id) throw new ErrorLedgerDocumentoValidacao('validacao.id é obrigatório');
        if (!this.#validacao_inicial?.id) throw new ErrorLedgerDocumentoValidacao('Initialize(validacao) é obrigatório antes da modificação');
        if (validacao.id !== this.#validacao_inicial.id) throw new ErrorLedgerDocumentoValidacao('A validação fornecida não corresponde à validação inicial registrada.');
        if (!tipo_evento || sequencia == null) throw new ErrorLedgerDocumentoValidacao('tipo_evento e sequencia são obrigatórios');
        if (!meta_data || typeof meta_data !== 'object') throw new ErrorLedgerDocumentoValidacao('meta_data é obrigatório e deve ser um objeto');
        if (typeof sequencia !== 'number') throw new ErrorLedgerDocumentoValidacao('sequencia deve ser um número');
        if (typeof tipo_evento !== 'string') throw new ErrorLedgerDocumentoValidacao('tipo_evento deve ser uma string');
        const ladgerAnterior = await this.#trx('tab_auditoria_ledger_documento_validacao')
            .where('documento_validacao_id', validacao.id)
            .where('deletado', false)
            .orderBy('sequencia', 'desc')
            .first();
        if (!ladgerAnterior) throw new ErrorLedgerDocumentoValidacao('Não foi possível encontrar o último registro de auditoria para esta validação.');
        const bucketVault = bucketGateway.Vault();
        const payload = validacao;
        const body = Buffer.from(JSON.stringify(payload));
        const hashPayload = crypto.createHash('sha256').update(body).digest('hex');
        const object_name = `DocumentoValidacao-${validacao.id}.json`;
        const objectNameCms = `DocumentoValidacao-${validacao.id}.cms`;
        const basePath = bucketVault.applyRootPrefix(`${buckets.valt}/${buckets.pastas.documento_validacao_ledger}/${validacao.id}`);
        const auditoriaLedger = new domainAuditoriaLedgerDocumentoValidacao({
            documento_validacao_id: validacao.id,
            documento_id: validacao.documento_id || null,
            tipo_evento,
            sequencia: Number(ladgerAnterior.sequencia) + 1,
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
        if (!carimbo.status) throw new ErrorLedgerDocumentoValidacao(carimbo.msg || 'Falha ao carimbar hash da auditoria');
        const bodyJson = Buffer.from(JSON.stringify(validacao));
        const bodyCms = Buffer.from(carimbo.data.cms_base64, 'base64');
        const zip = new JsZip();
        zip.file(object_name, bodyJson);
        zip.file(objectNameCms, bodyCms);
        const bodyZip = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
        const timeStamp = moment().format('YYYYMMDDHHmmss');
        const objectNameZip = `${basePath}/DocumentoValidacao-${timeStamp}-${auditoriaLedger.id}.zip`;
        const saveBucket = await bucketVault.salvarArquivo({
            objectName: objectNameZip,
            fileStream: bodyZip,
            size: bodyZip.length,
            contentType: 'application/zip'
        });
        if (!saveBucket.status) throw new ErrorLedgerDocumentoValidacao(saveBucket.msg || 'Falha ao gravar zip da auditoria no vault');
        const selarDoc = await bucketVault.selarDocumento({ documentoId: objectNameZip });
        if (!selarDoc.status) throw new ErrorLedgerDocumentoValidacao(selarDoc.msg || 'Falha ao selar zip da auditoria no vault');
        auditoriaLedger.object_name = objectNameZip;
        if (validacao_update && typeof validacao_update === 'object') {
            await this.#trx('tab_documento_validacao').where('id', validacao.id).update(validacao_update);
        }
        await this.#trx('tab_auditoria_ledger_documento_validacao').insert(auditoriaLedger.getAuditoriaLedgerDocumentoValidacao());
        await this.#trx('tab_historico').insert(new domainHistorico({
            transformacao: historico.trnasformcao.update.value,
            dado_antigo: this.#validacao_inicial,
            dado_atual: { ...validacao },
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

module.exports = LedgerDocumentoValidacao;

class ErrorLedgerDocumentoValidacao extends Error {
    constructor(message) {
        super(message);
        this.name = 'ErrorLedgerDocumentoValidacao';
    }
}
