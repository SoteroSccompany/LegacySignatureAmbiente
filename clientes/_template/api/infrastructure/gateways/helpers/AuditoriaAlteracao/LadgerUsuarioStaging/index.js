const crypto = require('crypto');
const moment = require('moment');
const JsZip = require('jszip');
const dateNow = require('../../../functions/data/getToday');
const { buckets, historico } = require('../../../../../certs');
const bucketGateway = require('../../../Bucket');
const serverSignGateway = require('../../../ServerSign');
const domainAuditoriaLedgerUsuarioStaging = require('../../../../../@core/domain/AuditoriaLedgerUsuarioStaging');
const domainHistorico = require('../../../../../@core/domain/Historico');

class LedgerUsuarioStaging {

    #trx;
    #usuario_staging_inicial;

    constructor(trx) {
        if (!trx) {
            throw new Error('LedgerUsuarioStaging exige uma transação knex');
        }
        this.#trx = trx;
    }

    Initialize(usuarioStaging) {
        this.#usuario_staging_inicial = usuarioStaging;
    }

    async GravarAuditoriaCriacao({ usuario_staging, tipo_evento, sequencia, meta_data, user_id }) {
        if (!usuario_staging?.id) throw new ErrorLedgerUsuarioStaging('usuario_staging.id é obrigatório');
        if (!tipo_evento || sequencia == null) throw new ErrorLedgerUsuarioStaging('tipo_evento e sequencia são obrigatórios');
        if (!meta_data || typeof meta_data !== 'object') throw new ErrorLedgerUsuarioStaging('meta_data é obrigatório e deve ser um objeto');
        if (typeof sequencia !== 'number') throw new ErrorLedgerUsuarioStaging('sequencia deve ser um número');
        if (typeof tipo_evento !== 'string') throw new ErrorLedgerUsuarioStaging('tipo_evento deve ser uma string');

        const bucketVault = bucketGateway.Vault();
        const payload = usuario_staging;
        const body = Buffer.from(JSON.stringify(payload));
        const hashPayload = crypto.createHash('sha256').update(body).digest('hex');
        const object_name = `UsuarioStaging-${usuario_staging.id}.json`;
        const objectNameCms = `UsuarioStaging-${usuario_staging.id}.cms`;
        const basePath = bucketVault.applyRootPrefix(`${buckets.valt}/${buckets.pastas.usuario_staging_ledger}/${usuario_staging.id}`);
        const auditoriaLedger = new domainAuditoriaLedgerUsuarioStaging({
            usuario_staging_id: usuario_staging.id,
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
        if (!carimbo.status) throw new ErrorLedgerUsuarioStaging(carimbo.msg || 'Falha ao carimbar hash da auditoria');
        const bodyJson = Buffer.from(JSON.stringify(usuario_staging));
        const bodyCms = Buffer.from(carimbo.data.cms_base64, 'base64');
        const zip = new JsZip();
        zip.file(object_name, bodyJson);
        zip.file(objectNameCms, bodyCms);
        const bodyZip = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
        const timeStamp = moment().format('YYYYMMDDHHmmss');
        const objectNameZip = `${basePath}/UsuarioStaging-${timeStamp}-${auditoriaLedger.id}.zip`;
        const saveBucket = await bucketVault.salvarArquivo({
            objectName: objectNameZip,
            fileStream: bodyZip,
            size: bodyZip.length,
            contentType: 'application/zip'
        });
        if (!saveBucket.status) throw new ErrorLedgerUsuarioStaging(saveBucket.msg || 'Falha ao gravar zip da auditoria no vault');
        const selarDoc = await bucketVault.selarDocumento({ documentoId: objectNameZip });
        if (!selarDoc.status) throw new ErrorLedgerUsuarioStaging(selarDoc.msg || 'Falha ao selar zip da auditoria no vault');
        auditoriaLedger.object_name = objectNameZip;
        await this.#trx('tab_auditoria_ledger_usuario_staging').insert(auditoriaLedger.getAuditoriaLedgerUsuarioStaging());
        await this.#trx('tab_historico').insert(new domainHistorico({
            transformacao: historico.trnasformcao.create.value,
            dado_atual: auditoriaLedger,
            data_criacao: auditoriaLedger.criado_em,
            user_id,
        }).getHistorico());
    }

    async GravarAuditoriaModificacao({ usuario_staging, tipo_evento, sequencia, meta_data, usuario_staging_update, user_id }) {
        if (!usuario_staging?.id) throw new ErrorLedgerUsuarioStaging('usuario_staging.id é obrigatório');
        if (!this.#usuario_staging_inicial?.id) throw new ErrorLedgerUsuarioStaging('Initialize(usuario_staging) é obrigatório antes da modificação');
        if (usuario_staging.id !== this.#usuario_staging_inicial.id) throw new ErrorLedgerUsuarioStaging('O usuário staging fornecido não corresponde ao usuário staging inicial registrado.');
        if (!tipo_evento || sequencia == null) throw new ErrorLedgerUsuarioStaging('tipo_evento e sequencia são obrigatórios');
        if (!meta_data || typeof meta_data !== 'object') throw new ErrorLedgerUsuarioStaging('meta_data é obrigatório e deve ser um objeto');
        if (typeof sequencia !== 'number') throw new ErrorLedgerUsuarioStaging('sequencia deve ser um número');
        if (typeof tipo_evento !== 'string') throw new ErrorLedgerUsuarioStaging('tipo_evento deve ser uma string');
        const ladgerAnterior = await this.#trx('tab_auditoria_ledger_usuario_staging')
            .where('usuario_staging_id', usuario_staging.id)
            .where('deletado', false)
            .orderBy('sequencia', 'desc')
            .first();
        if (!ladgerAnterior) throw new ErrorLedgerUsuarioStaging('Não foi possível encontrar o último registro de auditoria para este usuário staging.');
        const bucketVault = bucketGateway.Vault();
        const payload = usuario_staging;
        const body = Buffer.from(JSON.stringify(payload));
        const hashPayload = crypto.createHash('sha256').update(body).digest('hex');
        const object_name = `UsuarioStaging-${usuario_staging.id}.json`;
        const objectNameCms = `UsuarioStaging-${usuario_staging.id}.cms`;
        const basePath = bucketVault.applyRootPrefix(`${buckets.valt}/${buckets.pastas.usuario_staging_ledger}/${usuario_staging.id}`);
        const auditoriaLedger = new domainAuditoriaLedgerUsuarioStaging({
            usuario_staging_id: usuario_staging.id,
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
        if (!carimbo.status) throw new ErrorLedgerUsuarioStaging(carimbo.msg || 'Falha ao carimbar hash da auditoria');
        const bodyJson = Buffer.from(JSON.stringify(usuario_staging));
        const bodyCms = Buffer.from(carimbo.data.cms_base64, 'base64');
        const zip = new JsZip();
        zip.file(object_name, bodyJson);
        zip.file(objectNameCms, bodyCms);
        const bodyZip = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
        const timeStamp = moment().format('YYYYMMDDHHmmss');
        const objectNameZip = `${basePath}/UsuarioStaging-${timeStamp}-${auditoriaLedger.id}.zip`;
        const saveBucket = await bucketVault.salvarArquivo({
            objectName: objectNameZip,
            fileStream: bodyZip,
            size: bodyZip.length,
            contentType: 'application/zip'
        });
        if (!saveBucket.status) throw new ErrorLedgerUsuarioStaging(saveBucket.msg || 'Falha ao gravar zip da auditoria no vault');
        const selarDoc = await bucketVault.selarDocumento({ documentoId: objectNameZip });
        if (!selarDoc.status) throw new ErrorLedgerUsuarioStaging(selarDoc.msg || 'Falha ao selar zip da auditoria no vault');
        auditoriaLedger.object_name = objectNameZip;
        if (usuario_staging_update && typeof usuario_staging_update === 'object') {
            await this.#trx('tab_usuario_staging').where('id', usuario_staging.id).update(usuario_staging_update);
        }
        await this.#trx('tab_auditoria_ledger_usuario_staging').insert(auditoriaLedger.getAuditoriaLedgerUsuarioStaging());
        await this.#trx('tab_historico').insert(new domainHistorico({
            transformacao: historico.trnasformcao.update.value,
            dado_antigo: this.#usuario_staging_inicial,
            dado_atual: { ...usuario_staging },
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

module.exports = LedgerUsuarioStaging;

class ErrorLedgerUsuarioStaging extends Error {
    constructor(message) {
        super(message);
        this.name = 'ErrorLedgerUsuarioStaging';
    }
}
