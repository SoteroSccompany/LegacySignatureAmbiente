const crypto = require('crypto');
const moment = require('moment');
const JsZip = require('jszip');
const dateNow = require('../../../functions/data/getToday');
const { buckets, historico } = require('../../../../../certs');
const bucketGateway = require('../../../Bucket');
const serverSignGateway = require('../../../ServerSign');
const domainAuditoriaLedgerPerfilUsuario = require('../../../../../@core/domain/AuditoriaLedgerPerfilUsuario');
const domainHistorico = require('../../../../../@core/domain/Historico');

class LedgerPerfilUsuario {

    #trx;
    #perfil_inicial;

    constructor(trx) {
        if (!trx) {
            throw new Error('LedgerPerfilUsuario exige uma transação knex');
        }
        this.#trx = trx;
    }

    Initialize(perfil) {
        this.#perfil_inicial = perfil;
    }

    async GravarAuditoriaCriacao({ perfil, tipo_evento, sequencia, meta_data, user_id }) {
        if (!perfil?.id) throw new ErrorLedgerPerfilUsuario('perfil.id é obrigatório');
        if (!perfil?.user_id) throw new ErrorLedgerPerfilUsuario('perfil.user_id é obrigatório');
        if (!tipo_evento || sequencia == null) throw new ErrorLedgerPerfilUsuario('tipo_evento e sequencia são obrigatórios');
        if (!meta_data || typeof meta_data !== 'object') throw new ErrorLedgerPerfilUsuario('meta_data é obrigatório e deve ser um objeto');
        if (typeof sequencia !== 'number') throw new ErrorLedgerPerfilUsuario('sequencia deve ser um número');
        if (typeof tipo_evento !== 'string') throw new ErrorLedgerPerfilUsuario('tipo_evento deve ser uma string');

        const bucketVault = bucketGateway.Vault();
        const payload = perfil;
        const body = Buffer.from(JSON.stringify(payload));
        const hashPayload = crypto.createHash('sha256').update(body).digest('hex');
        const object_name = `PerfilUsuario-${perfil.id}.json`;
        const objectNameCms = `PerfilUsuario-${perfil.id}.cms`;
        const basePath = bucketVault.applyRootPrefix(`${buckets.valt}/${buckets.pastas.perfil_usuario_ledger}/${perfil.id}`);
        const auditoriaLedger = new domainAuditoriaLedgerPerfilUsuario({
            perfil_id: perfil.id,
            usuario_id: perfil.user_id,
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
        if (!carimbo.status) throw new ErrorLedgerPerfilUsuario(carimbo.msg || 'Falha ao carimbar hash da auditoria');
        const bodyJson = Buffer.from(JSON.stringify(perfil));
        const bodyCms = Buffer.from(carimbo.data.cms_base64, 'base64');
        const zip = new JsZip();
        zip.file(object_name, bodyJson);
        zip.file(objectNameCms, bodyCms);
        const bodyZip = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
        const timeStamp = moment().format('YYYYMMDDHHmmss');
        const objectNameZip = `${basePath}/PerfilUsuario-${timeStamp}-${auditoriaLedger.id}.zip`;
        const saveBucket = await bucketVault.salvarArquivo({
            objectName: objectNameZip,
            fileStream: bodyZip,
            size: bodyZip.length,
            contentType: 'application/zip'
        });
        if (!saveBucket.status) throw new ErrorLedgerPerfilUsuario(saveBucket.msg || 'Falha ao gravar zip da auditoria no vault');
        const selarDoc = await bucketVault.selarDocumento({ documentoId: objectNameZip });
        if (!selarDoc.status) throw new ErrorLedgerPerfilUsuario(selarDoc.msg || 'Falha ao selar zip da auditoria no vault');
        auditoriaLedger.object_name = objectNameZip;
        await this.#trx('tab_auditoria_ledger_perfil_usuario').insert(auditoriaLedger.getAuditoriaLedgerPerfilUsuario());
        await this.#trx('tab_historico').insert(new domainHistorico({
            transformacao: historico.trnasformcao.create.value,
            dado_atual: auditoriaLedger,
            data_criacao: auditoriaLedger.criado_em,
            user_id: user_id || perfil.user_id,
        }).getHistorico());
    }

    async GravarAuditoriaModificacao({ perfil, tipo_evento, sequencia, meta_data, perfil_update, user_id }) {
        if (!perfil?.id) throw new ErrorLedgerPerfilUsuario('perfil.id é obrigatório');
        if (!perfil?.user_id) throw new ErrorLedgerPerfilUsuario('perfil.user_id é obrigatório');
        if (!this.#perfil_inicial?.id) throw new ErrorLedgerPerfilUsuario('Initialize(perfil) é obrigatório antes da modificação');
        if (perfil.id !== this.#perfil_inicial.id) throw new ErrorLedgerPerfilUsuario('O perfil fornecido não corresponde ao perfil inicial registrado.');
        if (!tipo_evento || sequencia == null) throw new ErrorLedgerPerfilUsuario('tipo_evento e sequencia são obrigatórios');
        if (!meta_data || typeof meta_data !== 'object') throw new ErrorLedgerPerfilUsuario('meta_data é obrigatório e deve ser um objeto');
        if (typeof sequencia !== 'number') throw new ErrorLedgerPerfilUsuario('sequencia deve ser um número');
        if (typeof tipo_evento !== 'string') throw new ErrorLedgerPerfilUsuario('tipo_evento deve ser uma string');
        const ladgerAnterior = await this.#trx('tab_auditoria_ledger_perfil_usuario')
            .where('perfil_id', perfil.id)
            .where('deletado', false)
            .orderBy('sequencia', 'desc')
            .first();
        if (!ladgerAnterior) throw new ErrorLedgerPerfilUsuario('Não foi possível encontrar o último registro de auditoria para este perfil.');
        const bucketVault = bucketGateway.Vault();
        const payload = perfil;
        const body = Buffer.from(JSON.stringify(payload));
        const hashPayload = crypto.createHash('sha256').update(body).digest('hex');
        const object_name = `PerfilUsuario-${perfil.id}.json`;
        const objectNameCms = `PerfilUsuario-${perfil.id}.cms`;
        const basePath = bucketVault.applyRootPrefix(`${buckets.valt}/${buckets.pastas.perfil_usuario_ledger}/${perfil.id}`);
        const auditoriaLedger = new domainAuditoriaLedgerPerfilUsuario({
            perfil_id: perfil.id,
            usuario_id: perfil.user_id,
            tipo_evento,
            sequencia: ladgerAnterior.sequencia + 1,
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
        if (!carimbo.status) throw new ErrorLedgerPerfilUsuario(carimbo.msg || 'Falha ao carimbar hash da auditoria');
        const bodyJson = Buffer.from(JSON.stringify(perfil));
        const bodyCms = Buffer.from(carimbo.data.cms_base64, 'base64');
        const zip = new JsZip();
        zip.file(object_name, bodyJson);
        zip.file(objectNameCms, bodyCms);
        const bodyZip = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
        const timeStamp = moment().format('YYYYMMDDHHmmss');
        const objectNameZip = `${basePath}/PerfilUsuario-${timeStamp}-${auditoriaLedger.id}.zip`;
        const saveBucket = await bucketVault.salvarArquivo({
            objectName: objectNameZip,
            fileStream: bodyZip,
            size: bodyZip.length,
            contentType: 'application/zip'
        });
        if (!saveBucket.status) throw new ErrorLedgerPerfilUsuario(saveBucket.msg || 'Falha ao gravar zip da auditoria no vault');
        const selarDoc = await bucketVault.selarDocumento({ documentoId: objectNameZip });
        if (!selarDoc.status) throw new ErrorLedgerPerfilUsuario(selarDoc.msg || 'Falha ao selar zip da auditoria no vault');
        auditoriaLedger.object_name = objectNameZip;
        if (perfil_update && typeof perfil_update === 'object') {
            await this.#trx('tab_perfil_usuario').where('id', perfil.id).update(perfil_update);
        }
        await this.#trx('tab_auditoria_ledger_perfil_usuario').insert(auditoriaLedger.getAuditoriaLedgerPerfilUsuario());
        await this.#trx('tab_historico').insert(new domainHistorico({
            transformacao: historico.trnasformcao.update.value,
            dado_antigo: this.#perfil_inicial,
            dado_atual: { ...perfil },
            data_criacao: dateNow(),
            user_id: user_id || perfil.user_id,
        }).getHistorico());
        await this.#trx('tab_historico').insert(new domainHistorico({
            transformacao: historico.trnasformcao.create.value,
            dado_atual: auditoriaLedger,
            data_criacao: auditoriaLedger.criado_em,
            user_id: user_id || perfil.user_id,
        }).getHistorico());
    }
}

module.exports = LedgerPerfilUsuario;

class ErrorLedgerPerfilUsuario extends Error {
    constructor(message) {
        super(message);
        this.name = 'ErrorLedgerPerfilUsuario';
    }
}
