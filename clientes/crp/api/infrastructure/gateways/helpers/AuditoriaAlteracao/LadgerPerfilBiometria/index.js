const crypto = require('crypto');
const moment = require('moment');
const JsZip = require('jszip');
const dateNow = require('../../../functions/data/getToday');
const { buckets, historico } = require('../../../../../certs');
const bucketGateway = require('../../../Bucket');
const serverSignGateway = require('../../../ServerSign');
const domainAuditoriaLedgerPerfilBiometria = require('../../../../../@core/domain/AuditoriaLedgerPerfilBiometria');
const domainHistorico = require('../../../../../@core/domain/Historico');

class LedgerPerfilBiometria {

    #trx;
    #biometria_inicial;

    constructor(trx) {
        if (!trx) {
            throw new Error('LedgerPerfilBiometria exige uma transação knex');
        }
        this.#trx = trx;
    }

    Initialize(biometria) {
        this.#biometria_inicial = biometria;
    }

    async GravarAuditoriaCriacao({ biometria, tipo_evento, sequencia, meta_data, user_id }) {
        if (!biometria?.id) throw new ErrorLedgerPerfilBiometria('biometria.id é obrigatório');
        if (!biometria?.perfil_id) throw new ErrorLedgerPerfilBiometria('biometria.perfil_id é obrigatório');
        if (!biometria?.termo_id) throw new ErrorLedgerPerfilBiometria('biometria.termo_id é obrigatório');
        if (!biometria?.desafio_id) throw new ErrorLedgerPerfilBiometria('biometria.desafio_id é obrigatório');
        if (!tipo_evento || sequencia == null) throw new ErrorLedgerPerfilBiometria('tipo_evento e sequencia são obrigatórios');
        if (!meta_data || typeof meta_data !== 'object') throw new ErrorLedgerPerfilBiometria('meta_data é obrigatório e deve ser um objeto');
        if (typeof sequencia !== 'number') throw new ErrorLedgerPerfilBiometria('sequencia deve ser um número');
        if (typeof tipo_evento !== 'string') throw new ErrorLedgerPerfilBiometria('tipo_evento deve ser uma string');
        const bucketVault = bucketGateway.Vault();
        const payload = biometria;
        const body = Buffer.from(JSON.stringify(payload));
        const hashPayload = crypto.createHash('sha256').update(body).digest('hex');
        const object_name = `PerfilBiometria-${biometria.id}.json`;
        const objectNameCms = `PerfilBiometria-${biometria.id}.cms`;
        const basePath = bucketVault.applyRootPrefix(`${buckets.valt}/${buckets.pastas.perfil_biometria}/${biometria.id}`);
        const auditoriaLedger = new domainAuditoriaLedgerPerfilBiometria({
            perfil_biometria_id: biometria.id,
            perfil_id: biometria.perfil_id,
            termo_id: biometria.termo_id,
            desafio_id: biometria.desafio_id,
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
        if (!carimbo.status) throw new ErrorLedgerPerfilBiometria(carimbo.msg || 'Falha ao carimbar hash da auditoria');
        const bodyJson = Buffer.from(JSON.stringify(biometria));
        const bodyCms = Buffer.from(carimbo.data.cms_base64, 'base64');
        const zip = new JsZip();
        zip.file(object_name, bodyJson);
        zip.file(objectNameCms, bodyCms);
        const bodyZip = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
        const timeStamp = moment().format('YYYYMMDDHHmmss');
        const objectNameZip = `${basePath}/PerfilBiometria-${timeStamp}-${auditoriaLedger.id}.zip`;
        const saveBucket = await bucketVault.salvarArquivo({
            objectName: objectNameZip,
            fileStream: bodyZip,
            size: bodyZip.length,
            contentType: 'application/zip'
        });
        if (!saveBucket.status) throw new ErrorLedgerPerfilBiometria(saveBucket.msg || 'Falha ao gravar zip da auditoria no vault');
        const selarDoc = await bucketVault.selarDocumento({ documentoId: objectNameZip });
        if (!selarDoc.status) throw new ErrorLedgerPerfilBiometria(selarDoc.msg || 'Falha ao selar zip da auditoria no vault');
        auditoriaLedger.object_name = objectNameZip;
        await this.#trx('tab_auditoria_ledger_perfil_biometria').insert(auditoriaLedger.getAuditoriaLedgerPerfilBiometria());
        await this.#trx('tab_historico').insert(new domainHistorico({
            transformacao: historico.trnasformcao.create.value,
            dado_atual: auditoriaLedger,
            data_criacao: auditoriaLedger.criado_em,
            user_id,
        }).getHistorico());
    }

    async GravarAuditoriaModificacao({ biometria, tipo_evento, sequencia, meta_data, biometria_update, user_id }) {
        if (!biometria?.id) throw new ErrorLedgerPerfilBiometria('biometria.id é obrigatório');
        if (!biometria?.perfil_id) throw new ErrorLedgerPerfilBiometria('biometria.perfil_id é obrigatório');
        if (!biometria?.termo_id) throw new ErrorLedgerPerfilBiometria('biometria.termo_id é obrigatório');
        if (!biometria?.desafio_id) throw new ErrorLedgerPerfilBiometria('biometria.desafio_id é obrigatório');
        if (!this.#biometria_inicial?.id) throw new ErrorLedgerPerfilBiometria('Initialize(biometria) é obrigatório antes da modificação');
        if (biometria.id !== this.#biometria_inicial.id) throw new ErrorLedgerPerfilBiometria('A biometria fornecida não corresponde à biometria inicial registrada.');
        if (!tipo_evento || sequencia == null) throw new ErrorLedgerPerfilBiometria('tipo_evento e sequencia são obrigatórios');
        if (!meta_data || typeof meta_data !== 'object') throw new ErrorLedgerPerfilBiometria('meta_data é obrigatório e deve ser um objeto');
        if (typeof sequencia !== 'number') throw new ErrorLedgerPerfilBiometria('sequencia deve ser um número');
        if (typeof tipo_evento !== 'string') throw new ErrorLedgerPerfilBiometria('tipo_evento deve ser uma string');
        const ladgerAnterior = await this.#trx('tab_auditoria_ledger_perfil_biometria')
            .where('perfil_biometria_id', biometria.id)
            .where('deletado', false)
            .orderBy('sequencia', 'desc')
            .first();
        if (!ladgerAnterior) throw new ErrorLedgerPerfilBiometria('Não foi possível encontrar o último registro de auditoria para esta biometria.');
        const bucketVault = bucketGateway.Vault();
        const payload = biometria;
        const body = Buffer.from(JSON.stringify(payload));
        const hashPayload = crypto.createHash('sha256').update(body).digest('hex');
        const object_name = `PerfilBiometria-${biometria.id}.json`;
        const objectNameCms = `PerfilBiometria-${biometria.id}.cms`;
        const basePath = bucketVault.applyRootPrefix(`${buckets.valt}/${buckets.pastas.perfil_biometria}/${biometria.id}`);
        const auditoriaLedger = new domainAuditoriaLedgerPerfilBiometria({
            perfil_biometria_id: biometria.id,
            perfil_id: biometria.perfil_id,
            termo_id: biometria.termo_id,
            desafio_id: biometria.desafio_id,
            tipo_evento,
            payload_sha256: hashPayload,
            sequencia: ladgerAnterior.sequencia + 1,
            metadata_json: meta_data,
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
        if (!carimbo.status) throw new ErrorLedgerPerfilBiometria(carimbo.msg || 'Falha ao carimbar hash da auditoria');
        const bodyJson = Buffer.from(JSON.stringify(biometria));
        const bodyCms = Buffer.from(carimbo.data.cms_base64, 'base64');
        const zip = new JsZip();
        zip.file(object_name, bodyJson);
        zip.file(objectNameCms, bodyCms);
        const bodyZip = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
        const timeStamp = moment().format('YYYYMMDDHHmmss');
        const objectNameZip = `${basePath}/PerfilBiometria-${timeStamp}-${auditoriaLedger.id}.zip`;
        const saveBucket = await bucketVault.salvarArquivo({
            objectName: objectNameZip,
            fileStream: bodyZip,
            size: bodyZip.length,
            contentType: 'application/zip'
        });
        if (!saveBucket.status) throw new ErrorLedgerPerfilBiometria(saveBucket.msg || 'Falha ao gravar zip da auditoria no vault');
        const selarDoc = await bucketVault.selarDocumento({ documentoId: objectNameZip });
        if (!selarDoc.status) throw new ErrorLedgerPerfilBiometria(selarDoc.msg || 'Falha ao selar zip da auditoria no vault');
        auditoriaLedger.object_name = objectNameZip;
        if (biometria_update && typeof biometria_update === 'object') {
            await this.#trx('tab_perfil_biometria').where('id', biometria.id).update(biometria_update);
        }
        await this.#trx('tab_auditoria_ledger_perfil_biometria').insert(auditoriaLedger.getAuditoriaLedgerPerfilBiometria());
        await this.#trx('tab_historico').insert(new domainHistorico({
            transformacao: historico.trnasformcao.update.value,
            dado_antigo: this.#biometria_inicial,
            dado_atual: { ...biometria },
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

module.exports = LedgerPerfilBiometria;

class ErrorLedgerPerfilBiometria extends Error {
    constructor(message) {
        super(message);
        this.name = 'ErrorLedgerPerfilBiometria';
    }
}
