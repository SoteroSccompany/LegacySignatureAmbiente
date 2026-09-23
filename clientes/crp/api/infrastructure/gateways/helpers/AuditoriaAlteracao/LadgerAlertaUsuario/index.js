const crypto = require('crypto');
const moment = require('moment');
const JsZip = require('jszip');
const dateNow = require('../../../functions/data/getToday');
const { buckets, historico } = require('../../../../../certs');
const bucketGateway = require('../../../Bucket');
const serverSignGateway = require('../../../ServerSign');
const domainAuditoriaLedgerAlertaUsuario = require('../../../../../@core/domain/AuditoriaLedgerAlertaUsuario');
const domainHistorico = require('../../../../../@core/domain/Historico');

class LedgerAlertaUsuario {

    #trx;

    constructor(trx) {
        if (!trx) {
            throw new Error('LedgerAlertaUsuario exige uma transação knex');
        }
        this.#trx = trx;
    }

    async GravarAuditoriaCriacao({ alerta, tipo_evento, sequencia, meta_data, user_id }) {
        if (!alerta?.id) throw new ErrorLedgerAlertaUsuario('alerta.id é obrigatório');
        if (!alerta?.user_id) throw new ErrorLedgerAlertaUsuario('alerta.user_id é obrigatório');
        if (!tipo_evento || sequencia == null) throw new ErrorLedgerAlertaUsuario('tipo_evento e sequencia são obrigatórios');
        if (!meta_data || typeof meta_data !== 'object') throw new ErrorLedgerAlertaUsuario('meta_data é obrigatório e deve ser um objeto');
        if (typeof sequencia !== 'number') throw new ErrorLedgerAlertaUsuario('sequencia deve ser um número');
        if (typeof tipo_evento !== 'string') throw new ErrorLedgerAlertaUsuario('tipo_evento deve ser uma string');
        const bucketVault = bucketGateway.Vault();
        const payload = alerta;
        const body = Buffer.from(JSON.stringify(payload));
        const hashPayload = crypto.createHash('sha256').update(body).digest('hex');
        const object_name = `AlertaUsuario-${alerta.id}.json`;
        const objectNameCms = `AlertaUsuario-${alerta.id}.cms`;
        const basePath = bucketVault.applyRootPrefix(`${buckets.valt}/${buckets.pastas.alerta_usuario_ledger}/${alerta.id}`);
        const auditoriaLedger = new domainAuditoriaLedgerAlertaUsuario({
            alerta_usuario_id: alerta.id,
            usuario_id: alerta.user_id,
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
        if (!carimbo.status) throw new ErrorLedgerAlertaUsuario(carimbo.msg || 'Falha ao carimbar hash da auditoria');
        const bodyJson = Buffer.from(JSON.stringify(alerta));
        const bodyCms = Buffer.from(carimbo.data.cms_base64, 'base64');
        const zip = new JsZip();
        zip.file(object_name, bodyJson);
        zip.file(objectNameCms, bodyCms);
        const bodyZip = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
        const timeStamp = moment().format('YYYYMMDDHHmmss');
        const objectNameZip = `${basePath}/AlertaUsuario-${timeStamp}-${auditoriaLedger.id}.zip`;
        const saveBucket = await bucketVault.salvarArquivo({
            objectName: objectNameZip,
            fileStream: bodyZip,
            size: bodyZip.length,
            contentType: 'application/zip'
        });
        if (!saveBucket.status) throw new ErrorLedgerAlertaUsuario(saveBucket.msg || 'Falha ao gravar zip da auditoria no vault');
        const selarDoc = await bucketVault.selarDocumento({ documentoId: objectNameZip });
        if (!selarDoc.status) throw new ErrorLedgerAlertaUsuario(selarDoc.msg || 'Falha ao selar zip da auditoria no vault');
        auditoriaLedger.object_name = objectNameZip;
        await this.#trx('tab_auditoria_ledger_alerta_usuario').insert(auditoriaLedger.getAuditoriaLedgerAlertaUsuario());
        await this.#trx('tab_historico').insert(new domainHistorico({
            transformacao: historico.trnasformcao.create.value,
            dado_atual: auditoriaLedger,
            data_criacao: auditoriaLedger.criado_em,
            user_id: user_id || alerta.user_id,
        }).getHistorico());
    }
}

module.exports = LedgerAlertaUsuario;

class ErrorLedgerAlertaUsuario extends Error {
    constructor(message) {
        super(message);
        this.name = 'ErrorLedgerAlertaUsuario';
    }
}
