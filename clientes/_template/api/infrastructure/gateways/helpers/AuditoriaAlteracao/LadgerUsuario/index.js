const crypto = require('crypto');
const moment = require('moment');
const JsZip = require('jszip');
const dateNow = require('../../../functions/data/getToday');
const { buckets, historico } = require('../../../../../certs');
const bucketGateway = require('../../../Bucket');
const serverSignGateway = require('../../../ServerSign');
const domainAuditoriaLedgerUsuario = require('../../../../../@core/domain/AuditoriaLedgerUsuario');
const domainHistorico = require('../../../../../@core/domain/Historico');

class LedgerUsuario {

    #trx;
    #usuario_inicial;

    constructor(trx) {
        if (!trx) {
            throw new Error('LedgerUsuario exige uma transação knex');
        }
        this.#trx = trx;
    }

    Initialize(usuario) {
        this.#usuario_inicial = usuario;
    }

    async GravarAuditoriaCriacao({ usuario, tipo_evento, sequencia, meta_data, user_id }) {
        if (!usuario?.id) throw new ErrorLedgerUsuario('usuario.id é obrigatório');
        if (!tipo_evento || sequencia == null) throw new ErrorLedgerUsuario('tipo_evento e sequencia são obrigatórios');
        if (!meta_data || typeof meta_data !== 'object') throw new ErrorLedgerUsuario('meta_data é obrigatório e deve ser um objeto');
        if (typeof sequencia !== 'number') throw new ErrorLedgerUsuario('sequencia deve ser um número');
        if (typeof tipo_evento !== 'string') throw new ErrorLedgerUsuario('tipo_evento deve ser uma string');

        const bucketVault = bucketGateway.Vault();
        const payload = usuario;
        const body = Buffer.from(JSON.stringify(payload));
        const hashPayload = crypto.createHash('sha256').update(body).digest('hex');
        const object_name = `Usuario-${usuario.id}.json`;
        const objectNameCms = `Usuario-${usuario.id}.cms`;
        const basePath = bucketVault.applyRootPrefix(`${buckets.valt}/${buckets.pastas.usuario_ledger}/${usuario.id}`);
        const auditoriaLedger = new domainAuditoriaLedgerUsuario({
            usuario_id: usuario.id,
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
        if (!carimbo.status) throw new ErrorLedgerUsuario(carimbo.msg || 'Falha ao carimbar hash da auditoria');
        const bodyJson = Buffer.from(JSON.stringify(usuario));
        const bodyCms = Buffer.from(carimbo.data.cms_base64, 'base64');
        const zip = new JsZip();
        zip.file(object_name, bodyJson);
        zip.file(objectNameCms, bodyCms);
        const bodyZip = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
        const timeStamp = moment().format('YYYYMMDDHHmmss');
        const objectNameZip = `${basePath}/Usuario-${timeStamp}-${auditoriaLedger.id}.zip`;
        const saveBucket = await bucketVault.salvarArquivo({
            objectName: objectNameZip,
            fileStream: bodyZip,
            size: bodyZip.length,
            contentType: 'application/zip'
        });
        if (!saveBucket.status) throw new ErrorLedgerUsuario(saveBucket.msg || 'Falha ao gravar zip da auditoria no vault');
        const selarDoc = await bucketVault.selarDocumento({ documentoId: objectNameZip });
        if (!selarDoc.status) throw new ErrorLedgerUsuario(selarDoc.msg || 'Falha ao selar zip da auditoria no vault');
        auditoriaLedger.object_name = objectNameZip;
        await this.#trx('tab_auditoria_ledger_usuario').insert(auditoriaLedger.getAuditoriaLedgerUsuario());
        await this.#trx('tab_historico').insert(new domainHistorico({
            transformacao: historico.trnasformcao.create.value,
            dado_atual: auditoriaLedger,
            data_criacao: auditoriaLedger.criado_em,
            user_id: user_id || usuario.id,
        }).getHistorico());
    }

    async GravarAuditoriaModificacao({ usuario, tipo_evento, sequencia, meta_data, usuario_update, user_id }) {
        if (!usuario?.id) throw new ErrorLedgerUsuario('usuario.id é obrigatório');
        if (!this.#usuario_inicial?.id) throw new ErrorLedgerUsuario('Initialize(usuario) é obrigatório antes da modificação');
        if (usuario.id !== this.#usuario_inicial.id) throw new ErrorLedgerUsuario('O usuário fornecido não corresponde ao usuário inicial registrado.');
        if (!tipo_evento || sequencia == null) throw new ErrorLedgerUsuario('tipo_evento e sequencia são obrigatórios');
        if (!meta_data || typeof meta_data !== 'object') throw new ErrorLedgerUsuario('meta_data é obrigatório e deve ser um objeto');
        if (typeof sequencia !== 'number') throw new ErrorLedgerUsuario('sequencia deve ser um número');
        if (typeof tipo_evento !== 'string') throw new ErrorLedgerUsuario('tipo_evento deve ser uma string');
        const ladgerAnterior = await this.#trx('tab_auditoria_ledger_usuario')
            .where('usuario_id', usuario.id)
            .where('deletado', false)
            .orderBy('sequencia', 'desc')
            .first();
        // Usuários pré-existentes ao mecanismo de ledger não possuem registro de gênese;
        // nesse caso a própria modificação inicia a cadeia (bootstrap), sem quebrar o fluxo legado.
        if (!ladgerAnterior) meta_data.bootstrap_legado = true;
        const bucketVault = bucketGateway.Vault();
        const payload = usuario;
        const body = Buffer.from(JSON.stringify(payload));
        const hashPayload = crypto.createHash('sha256').update(body).digest('hex');
        const object_name = `Usuario-${usuario.id}.json`;
        const objectNameCms = `Usuario-${usuario.id}.cms`;
        const basePath = bucketVault.applyRootPrefix(`${buckets.valt}/${buckets.pastas.usuario_ledger}/${usuario.id}`);
        const auditoriaLedger = new domainAuditoriaLedgerUsuario({
            usuario_id: usuario.id,
            tipo_evento,
            sequencia: ladgerAnterior ? ladgerAnterior?.sequencia + 1 : sequencia,
            metadata_json: meta_data,
            payload_sha256: hashPayload,
            hash_atual: ladgerAnterior?.hash_atual,
            bucket_path: basePath,
            hash_registro_anterior: ladgerAnterior?.hash_atual || null,
            auditoria_ledger_origem: ladgerAnterior?.id || null,
            criado_em: dateNow(),
        });
        auditoriaLedger.metadata_json.payload_sha256 = hashPayload;
        auditoriaLedger.metadata_json.object_json_name = object_name;
        auditoriaLedger.metadata_json.object_cms_name = objectNameCms;
        auditoriaLedger.metadata_json.bucket_path = basePath;
        const hashObjeto = auditoriaLedger.calcularHashAtual();
        const carimbo = await serverSignGateway.Carimbo().carimbarHash({ hashHex: hashObjeto });
        if (!carimbo.status) throw new ErrorLedgerUsuario(carimbo.msg || 'Falha ao carimbar hash da auditoria');
        const bodyJson = Buffer.from(JSON.stringify(usuario));
        const bodyCms = Buffer.from(carimbo.data.cms_base64, 'base64');
        const zip = new JsZip();
        zip.file(object_name, bodyJson);
        zip.file(objectNameCms, bodyCms);
        const bodyZip = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
        const timeStamp = moment().format('YYYYMMDDHHmmss');
        const objectNameZip = `${basePath}/Usuario-${timeStamp}-${auditoriaLedger.id}.zip`;
        const saveBucket = await bucketVault.salvarArquivo({
            objectName: objectNameZip,
            fileStream: bodyZip,
            size: bodyZip.length,
            contentType: 'application/zip'
        });
        if (!saveBucket.status) throw new ErrorLedgerUsuario(saveBucket.msg || 'Falha ao gravar zip da auditoria no vault');
        const selarDoc = await bucketVault.selarDocumento({ documentoId: objectNameZip });
        if (!selarDoc.status) throw new ErrorLedgerUsuario(selarDoc.msg || 'Falha ao selar zip da auditoria no vault');
        auditoriaLedger.object_name = objectNameZip;
        if (usuario_update && typeof usuario_update === 'object') {
            await this.#trx('tab_usuarios').where('id', usuario.id).update(usuario_update);
        }
        await this.#trx('tab_auditoria_ledger_usuario').insert(auditoriaLedger.getAuditoriaLedgerUsuario());
        await this.#trx('tab_historico').insert(new domainHistorico({
            transformacao: historico.trnasformcao.update.value,
            dado_antigo: this.#usuario_inicial,
            dado_atual: { ...usuario },
            data_criacao: dateNow(),
            user_id: user_id || usuario.id,
        }).getHistorico());
        await this.#trx('tab_historico').insert(new domainHistorico({
            transformacao: historico.trnasformcao.create.value,
            dado_atual: auditoriaLedger,
            data_criacao: auditoriaLedger.criado_em,
            user_id: user_id || usuario.id,
        }).getHistorico());
    }
}

module.exports = LedgerUsuario;

class ErrorLedgerUsuario extends Error {
    constructor(message) {
        super(message);
        this.name = 'ErrorLedgerUsuario';
    }
}
