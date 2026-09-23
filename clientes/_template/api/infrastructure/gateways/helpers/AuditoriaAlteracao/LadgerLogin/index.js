const crypto = require('crypto');
const moment = require('moment');
const JsZip = require('jszip');
const dateNow = require('../../../functions/data/getToday');
const { buckets, historico } = require('../../../../../certs');
const bucketGateway = require('../../../Bucket');
const serverSignGateway = require('../../../ServerSign');
const domainAuditoriaLedgerLogin = require('../../../../../@core/domain/AuditoriaLedgerLogin');
const domainHistorico = require('../../../../../@core/domain/Historico');

class LedgerLogin {

    #trx;
    #login_inicial;

    constructor(trx) {
        if (!trx) {
            throw new Error('LedgerLogin exige uma transação knex');
        }
        this.#trx = trx;
    }

    Initialize(login) {
        this.#login_inicial = login;
    }

    async GravarAuditoriaCriacao({ login, tipo_evento, sequencia, meta_data, user_id }) {
        if (!login?.id) throw new ErrorLedgerLogin('login.id é obrigatório');
        if (!login?.user_id) throw new ErrorLedgerLogin('login.user_id é obrigatório');
        if (!tipo_evento || sequencia == null) throw new ErrorLedgerLogin('tipo_evento e sequencia são obrigatórios');
        if (!meta_data || typeof meta_data !== 'object') throw new ErrorLedgerLogin('meta_data é obrigatório e deve ser um objeto');
        if (typeof sequencia !== 'number') throw new ErrorLedgerLogin('sequencia deve ser um número');
        if (typeof tipo_evento !== 'string') throw new ErrorLedgerLogin('tipo_evento deve ser uma string');

        const bucketVault = bucketGateway.Vault();
        const payload = login;
        const body = Buffer.from(JSON.stringify(payload));
        const hashPayload = crypto.createHash('sha256').update(body).digest('hex');
        const object_name = `Login-${login.id}.json`;
        const objectNameCms = `Login-${login.id}.cms`;
        const basePath = bucketVault.applyRootPrefix(`${buckets.valt}/${buckets.pastas.login_ledger}/${login.id}`);
        const auditoriaLedger = new domainAuditoriaLedgerLogin({
            login_id: login.id,
            usuario_id: login.user_id,
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
        if (!carimbo.status) throw new ErrorLedgerLogin(carimbo.msg || 'Falha ao carimbar hash da auditoria');
        const bodyJson = Buffer.from(JSON.stringify(login));
        const bodyCms = Buffer.from(carimbo.data.cms_base64, 'base64');
        const zip = new JsZip();
        zip.file(object_name, bodyJson);
        zip.file(objectNameCms, bodyCms);
        const bodyZip = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
        const timeStamp = moment().format('YYYYMMDDHHmmss');
        const objectNameZip = `${basePath}/Login-${timeStamp}-${auditoriaLedger.id}.zip`;
        const saveBucket = await bucketVault.salvarArquivo({
            objectName: objectNameZip,
            fileStream: bodyZip,
            size: bodyZip.length,
            contentType: 'application/zip'
        });
        if (!saveBucket.status) throw new ErrorLedgerLogin(saveBucket.msg || 'Falha ao gravar zip da auditoria no vault');
        const selarDoc = await bucketVault.selarDocumento({ documentoId: objectNameZip });
        if (!selarDoc.status) throw new ErrorLedgerLogin(selarDoc.msg || 'Falha ao selar zip da auditoria no vault');
        auditoriaLedger.object_name = objectNameZip;
        await this.#trx('tab_auditoria_ledger_login').insert(auditoriaLedger.getAuditoriaLedgerLogin());
        await this.#trx('tab_historico').insert(new domainHistorico({
            transformacao: historico.trnasformcao.create.value,
            dado_atual: auditoriaLedger,
            data_criacao: auditoriaLedger.criado_em,
            user_id: user_id || login.user_id,
        }).getHistorico());
    }

    async GravarAuditoriaModificacao({ login, tipo_evento, sequencia, meta_data, login_update, user_id }) {
        if (!login?.id) throw new ErrorLedgerLogin('login.id é obrigatório');
        if (!login?.user_id) throw new ErrorLedgerLogin('login.user_id é obrigatório');
        if (!this.#login_inicial?.id) throw new ErrorLedgerLogin('Initialize(login) é obrigatório antes da modificação');
        if (login.id !== this.#login_inicial.id) throw new ErrorLedgerLogin('O login fornecido não corresponde ao login inicial registrado.');
        if (!tipo_evento || sequencia == null) throw new ErrorLedgerLogin('tipo_evento e sequencia são obrigatórios');
        if (!meta_data || typeof meta_data !== 'object') throw new ErrorLedgerLogin('meta_data é obrigatório e deve ser um objeto');
        if (typeof sequencia !== 'number') throw new ErrorLedgerLogin('sequencia deve ser um número');
        if (typeof tipo_evento !== 'string') throw new ErrorLedgerLogin('tipo_evento deve ser uma string');
        const ladgerAnterior = await this.#trx('tab_auditoria_ledger_login')
            .where('login_id', login.id)
            .where('deletado', false)
            .orderBy('sequencia', 'desc')
            .first();
        if (!ladgerAnterior) throw new ErrorLedgerLogin('Não foi possível encontrar o último registro de auditoria para este login.');
        const bucketVault = bucketGateway.Vault();
        const payload = login;
        const body = Buffer.from(JSON.stringify(payload));
        const hashPayload = crypto.createHash('sha256').update(body).digest('hex');
        const object_name = `Login-${login.id}.json`;
        const objectNameCms = `Login-${login.id}.cms`;
        const basePath = bucketVault.applyRootPrefix(`${buckets.valt}/${buckets.pastas.login_ledger}/${login.id}`);
        const auditoriaLedger = new domainAuditoriaLedgerLogin({
            login_id: login.id,
            usuario_id: login.user_id,
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
        if (!carimbo.status) throw new ErrorLedgerLogin(carimbo.msg || 'Falha ao carimbar hash da auditoria');
        const bodyJson = Buffer.from(JSON.stringify(login));
        const bodyCms = Buffer.from(carimbo.data.cms_base64, 'base64');
        const zip = new JsZip();
        zip.file(object_name, bodyJson);
        zip.file(objectNameCms, bodyCms);
        const bodyZip = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
        const timeStamp = moment().format('YYYYMMDDHHmmss');
        const objectNameZip = `${basePath}/Login-${timeStamp}-${auditoriaLedger.id}.zip`;
        const saveBucket = await bucketVault.salvarArquivo({
            objectName: objectNameZip,
            fileStream: bodyZip,
            size: bodyZip.length,
            contentType: 'application/zip'
        });
        if (!saveBucket.status) throw new ErrorLedgerLogin(saveBucket.msg || 'Falha ao gravar zip da auditoria no vault');
        const selarDoc = await bucketVault.selarDocumento({ documentoId: objectNameZip });
        if (!selarDoc.status) throw new ErrorLedgerLogin(selarDoc.msg || 'Falha ao selar zip da auditoria no vault');
        auditoriaLedger.object_name = objectNameZip;
        if (login_update && typeof login_update === 'object') {
            await this.#trx('tab_login').where('id', login.id).update(login_update);
        }
        await this.#trx('tab_auditoria_ledger_login').insert(auditoriaLedger.getAuditoriaLedgerLogin());
        await this.#trx('tab_historico').insert(new domainHistorico({
            transformacao: historico.trnasformcao.update.value,
            dado_antigo: this.#login_inicial,
            dado_atual: { ...login },
            data_criacao: dateNow(),
            user_id: user_id || login.user_id,
        }).getHistorico());
        await this.#trx('tab_historico').insert(new domainHistorico({
            transformacao: historico.trnasformcao.create.value,
            dado_atual: auditoriaLedger,
            data_criacao: auditoriaLedger.criado_em,
            user_id: user_id || login.user_id,
        }).getHistorico());
    }
}

module.exports = LedgerLogin;

class ErrorLedgerLogin extends Error {
    constructor(message) {
        super(message);
        this.name = 'ErrorLedgerLogin';
    }
}
