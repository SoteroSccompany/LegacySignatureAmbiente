const crypto = require('crypto');
const moment = require('moment');
const JsZip = require('jszip');
const dateNow = require('../../../functions/data/getToday');
const { buckets, historico } = require('../../../../../certs');
const bucketGateway = require('../../../Bucket');
const serverSignGateway = require('../../../ServerSign');
const domainAuditoriaLedgerAceiteTermoResponsabilidade = require('../../../../../@core/domain/AuditoriaLedgerAceiteTermoResponsabilidade');
const domainHistorico = require('../../../../../@core/domain/Historico');

class LedgerAceiteTermoResponsabilidade {

    #trx;
    #aceite_inicial;

    constructor(trx) {
        if (!trx) {
            throw new Error('LedgerAceiteTermoResponsabilidade exige uma transação knex');
        }
        this.#trx = trx;
    }

    Initialize(aceite) {
        this.#aceite_inicial = aceite;
    }

    async GravarAuditoriaCriacao({ aceite, tipo_evento, sequencia, meta_data, user_id }) {
        if (!aceite?.id) throw new ErrorLedgerAceiteTermoResponsabilidade('aceite.id é obrigatório');
        if (!aceite?.termo_id) throw new ErrorLedgerAceiteTermoResponsabilidade('aceite.termo_id é obrigatório');
        if (!aceite?.user_id) throw new ErrorLedgerAceiteTermoResponsabilidade('aceite.user_id é obrigatório');
        if (!tipo_evento || sequencia == null) throw new ErrorLedgerAceiteTermoResponsabilidade('tipo_evento e sequencia são obrigatórios');
        if (!meta_data || typeof meta_data !== 'object') throw new ErrorLedgerAceiteTermoResponsabilidade('meta_data é obrigatório e deve ser um objeto');
        if (typeof sequencia !== 'number') throw new ErrorLedgerAceiteTermoResponsabilidade('sequencia deve ser um número');
        if (typeof tipo_evento !== 'string') throw new ErrorLedgerAceiteTermoResponsabilidade('tipo_evento deve ser uma string');
        const bucketVault = bucketGateway.Vault();
        const payload = aceite;
        const body = Buffer.from(JSON.stringify(payload));
        const hashPayload = crypto.createHash('sha256').update(body).digest('hex');
        const object_name = `AceiteTermo-${aceite.id}.json`;
        const objectNameCms = `AceiteTermo-${aceite.id}.cms`;
        const basePath = bucketVault.applyRootPrefix(`${buckets.valt}/${buckets.pastas.aceite_termo_responsabilidade}/${aceite.id}`);
        const auditoriaLedger = new domainAuditoriaLedgerAceiteTermoResponsabilidade({
            aceite_id: aceite.id,
            termo_id: aceite.termo_id,
            usuario_id: aceite.user_id,
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
        if (!carimbo.status) throw new ErrorLedgerAceiteTermoResponsabilidade(carimbo.msg || 'Falha ao carimbar hash da auditoria');
        const bodyJson = Buffer.from(JSON.stringify(aceite));
        const bodyCms = Buffer.from(carimbo.data.cms_base64, 'base64');
        const zip = new JsZip();
        zip.file(object_name, bodyJson);
        zip.file(objectNameCms, bodyCms);
        const bodyZip = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
        const timeStamp = moment().format('YYYYMMDDHHmmss');
        const objectNameZip = `${basePath}/AceiteTermo-${timeStamp}-${auditoriaLedger.id}.zip`;
        const saveBucket = await bucketVault.salvarArquivo({
            objectName: objectNameZip,
            fileStream: bodyZip,
            size: bodyZip.length,
            contentType: 'application/zip'
        });
        if (!saveBucket.status) throw new ErrorLedgerAceiteTermoResponsabilidade(saveBucket.msg || 'Falha ao gravar zip da auditoria no vault');
        const selarDoc = await bucketVault.selarDocumento({ documentoId: objectNameZip });
        if (!selarDoc.status) throw new ErrorLedgerAceiteTermoResponsabilidade(selarDoc.msg || 'Falha ao selar zip da auditoria no vault');
        auditoriaLedger.object_name = objectNameZip;
        await this.#trx('tab_auditoria_ledger_aceite_termo_responsabilidade').insert(auditoriaLedger.getAuditoriaLedgerAceiteTermoResponsabilidade());
        await this.#trx('tab_historico').insert(new domainHistorico({
            transformacao: historico.trnasformcao.create.value,
            dado_atual: auditoriaLedger,
            data_criacao: auditoriaLedger.criado_em,
            user_id: user_id || aceite.user_id,
        }).getHistorico());
    }
}

module.exports = LedgerAceiteTermoResponsabilidade;

class ErrorLedgerAceiteTermoResponsabilidade extends Error {
    constructor(message) {
        super(message);
        this.name = 'ErrorLedgerAceiteTermoResponsabilidade';
    }
}
