const crypto = require('crypto');
const moment = require('moment');
const JsZip = require('jszip');
const dateNow = require('../../../functions/data/getToday');
const { buckets, historico } = require('../../../../../certs');
const bucketGateway = require('../../../Bucket');
const serverSignGateway = require('../../../ServerSign');
const domainAuditoriaLedgerIdentificacaoBiometrica = require('../../../../../@core/domain/AuditoriaLedgerIdentificacaoBiometrica');
const domainHistorico = require('../../../../../@core/domain/Historico');

class LedgerIdentificacaoBiometrica {

    #trx;
    #identificacao_inicial;

    constructor(trx) {
        if (!trx) {
            throw new Error('LedgerIdentificacaoBiometrica exige uma transação knex');
        }
        this.#trx = trx;
    }

    Initialize(identificacao) {
        this.#identificacao_inicial = identificacao;
    }

    async GravarAuditoriaCriacao({ identificacao, tipo_evento, sequencia, meta_data, user_id }) {
        if (!identificacao?.id) throw new ErrorLedgerIdentificacaoBiometrica('identificacao.id é obrigatório');
        if (!identificacao?.documento_id) throw new ErrorLedgerIdentificacaoBiometrica('identificacao.documento_id é obrigatório');
        if (!identificacao?.user_id) throw new ErrorLedgerIdentificacaoBiometrica('identificacao.user_id é obrigatório');
        if (!identificacao?.signatario_id) throw new ErrorLedgerIdentificacaoBiometrica('identificacao.signatario_id é obrigatório');
        if (!identificacao?.perfil_biometria_id) throw new ErrorLedgerIdentificacaoBiometrica('identificacao.perfil_biometria_id é obrigatório');
        if (!identificacao?.desafio_id) throw new ErrorLedgerIdentificacaoBiometrica('identificacao.desafio_id é obrigatório');
        if (!tipo_evento || sequencia == null) throw new ErrorLedgerIdentificacaoBiometrica('tipo_evento e sequencia são obrigatórios');
        if (!meta_data || typeof meta_data !== 'object') throw new ErrorLedgerIdentificacaoBiometrica('meta_data é obrigatório e deve ser um objeto');
        if (typeof sequencia !== 'number') throw new ErrorLedgerIdentificacaoBiometrica('sequencia deve ser um número');
        if (typeof tipo_evento !== 'string') throw new ErrorLedgerIdentificacaoBiometrica('tipo_evento deve ser uma string');
        const bucketVault = bucketGateway.Vault();
        const payload = identificacao;
        const body = Buffer.from(JSON.stringify(payload));
        const hashPayload = crypto.createHash('sha256').update(body).digest('hex');
        const object_name = `IdentificacaoBiometrica-${identificacao.id}.json`;
        const objectNameCms = `IdentificacaoBiometrica-${identificacao.id}.cms`;
        const basePath = bucketVault.applyRootPrefix(`${buckets.valt}/${buckets.pastas.identificacao_biometrica_ledger}/${identificacao.id}`);
        const auditoriaLedger = new domainAuditoriaLedgerIdentificacaoBiometrica({
            identificacao_biometrica_id: identificacao.id,
            documento_id: identificacao.documento_id,
            usuario_id: identificacao.user_id,
            signatario_id: identificacao.signatario_id,
            perfil_biometria_id: identificacao.perfil_biometria_id,
            desafio_id: identificacao.desafio_id,
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
        if (!carimbo.status) throw new ErrorLedgerIdentificacaoBiometrica(carimbo.msg || 'Falha ao carimbar hash da auditoria');
        const bodyJson = Buffer.from(JSON.stringify(identificacao));
        const bodyCms = Buffer.from(carimbo.data.cms_base64, 'base64');
        const zip = new JsZip();
        zip.file(object_name, bodyJson);
        zip.file(objectNameCms, bodyCms);
        const bodyZip = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
        const timeStamp = moment().format('YYYYMMDDHHmmss');
        const objectNameZip = `${basePath}/IdentificacaoBiometrica-${timeStamp}-${auditoriaLedger.id}.zip`;
        const saveBucket = await bucketVault.salvarArquivo({
            objectName: objectNameZip,
            fileStream: bodyZip,
            size: bodyZip.length,
            contentType: 'application/zip'
        });
        if (!saveBucket.status) throw new ErrorLedgerIdentificacaoBiometrica(saveBucket.msg || 'Falha ao gravar zip da auditoria no vault');
        const selarDoc = await bucketVault.selarDocumento({ documentoId: objectNameZip });
        if (!selarDoc.status) throw new ErrorLedgerIdentificacaoBiometrica(selarDoc.msg || 'Falha ao selar zip da auditoria no vault');
        auditoriaLedger.object_name = objectNameZip;
        await this.#trx('tab_auditoria_ledger_identificacao_biometrica').insert(auditoriaLedger.getAuditoriaLedgerIdentificacaoBiometrica());
        await this.#trx('tab_historico').insert(new domainHistorico({
            transformacao: historico.trnasformcao.create.value,
            dado_atual: auditoriaLedger,
            data_criacao: auditoriaLedger.criado_em,
            user_id: user_id || identificacao.user_id,
        }).getHistorico());
    }

    async GravarAuditoriaModificacao({ identificacao, tipo_evento, sequencia, meta_data, identificacao_update, user_id }) {
        if (!identificacao?.id) throw new ErrorLedgerIdentificacaoBiometrica('identificacao.id é obrigatório');
        if (!identificacao?.documento_id) throw new ErrorLedgerIdentificacaoBiometrica('identificacao.documento_id é obrigatório');
        if (!identificacao?.user_id) throw new ErrorLedgerIdentificacaoBiometrica('identificacao.user_id é obrigatório');
        if (!identificacao?.signatario_id) throw new ErrorLedgerIdentificacaoBiometrica('identificacao.signatario_id é obrigatório');
        if (!identificacao?.perfil_biometria_id) throw new ErrorLedgerIdentificacaoBiometrica('identificacao.perfil_biometria_id é obrigatório');
        if (!identificacao?.desafio_id) throw new ErrorLedgerIdentificacaoBiometrica('identificacao.desafio_id é obrigatório');
        if (!this.#identificacao_inicial?.id) throw new ErrorLedgerIdentificacaoBiometrica('Initialize(identificacao) é obrigatório antes da modificação');
        if (identificacao.id !== this.#identificacao_inicial.id) throw new ErrorLedgerIdentificacaoBiometrica('A identificação fornecida não corresponde à identificação inicial registrada.');
        if (!tipo_evento || sequencia == null) throw new ErrorLedgerIdentificacaoBiometrica('tipo_evento e sequencia são obrigatórios');
        if (!meta_data || typeof meta_data !== 'object') throw new ErrorLedgerIdentificacaoBiometrica('meta_data é obrigatório e deve ser um objeto');
        if (typeof sequencia !== 'number') throw new ErrorLedgerIdentificacaoBiometrica('sequencia deve ser um número');
        if (typeof tipo_evento !== 'string') throw new ErrorLedgerIdentificacaoBiometrica('tipo_evento deve ser uma string');
        const ladgerAnterior = await this.#trx('tab_auditoria_ledger_identificacao_biometrica')
            .where('identificacao_biometrica_id', identificacao.id)
            .where('deletado', false)
            .orderBy('sequencia', 'desc')
            .first();
        if (!ladgerAnterior) throw new ErrorLedgerIdentificacaoBiometrica('Não foi possível encontrar o último registro de auditoria para esta identificação.');
        const bucketVault = bucketGateway.Vault();
        const payload = identificacao;
        const body = Buffer.from(JSON.stringify(payload));
        const hashPayload = crypto.createHash('sha256').update(body).digest('hex');
        const object_name = `IdentificacaoBiometrica-${identificacao.id}.json`;
        const objectNameCms = `IdentificacaoBiometrica-${identificacao.id}.cms`;
        const basePath = bucketVault.applyRootPrefix(`${buckets.valt}/${buckets.pastas.identificacao_biometrica_ledger}/${identificacao.id}`);
        const auditoriaLedger = new domainAuditoriaLedgerIdentificacaoBiometrica({
            identificacao_biometrica_id: identificacao.id,
            documento_id: identificacao.documento_id,
            usuario_id: identificacao.user_id,
            signatario_id: identificacao.signatario_id,
            perfil_biometria_id: identificacao.perfil_biometria_id,
            desafio_id: identificacao.desafio_id,
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
        if (!carimbo.status) throw new ErrorLedgerIdentificacaoBiometrica(carimbo.msg || 'Falha ao carimbar hash da auditoria');
        const bodyJson = Buffer.from(JSON.stringify(identificacao));
        const bodyCms = Buffer.from(carimbo.data.cms_base64, 'base64');
        const zip = new JsZip();
        zip.file(object_name, bodyJson);
        zip.file(objectNameCms, bodyCms);
        const bodyZip = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
        const timeStamp = moment().format('YYYYMMDDHHmmss');
        const objectNameZip = `${basePath}/IdentificacaoBiometrica-${timeStamp}-${auditoriaLedger.id}.zip`;
        const saveBucket = await bucketVault.salvarArquivo({
            objectName: objectNameZip,
            fileStream: bodyZip,
            size: bodyZip.length,
            contentType: 'application/zip'
        });
        if (!saveBucket.status) throw new ErrorLedgerIdentificacaoBiometrica(saveBucket.msg || 'Falha ao gravar zip da auditoria no vault');
        const selarDoc = await bucketVault.selarDocumento({ documentoId: objectNameZip });
        if (!selarDoc.status) throw new ErrorLedgerIdentificacaoBiometrica(selarDoc.msg || 'Falha ao selar zip da auditoria no vault');
        auditoriaLedger.object_name = objectNameZip;
        if (identificacao_update && typeof identificacao_update === 'object') {
            await this.#trx('tab_identificacao_biometrica').where('id', identificacao.id).update(identificacao_update);
        }
        await this.#trx('tab_auditoria_ledger_identificacao_biometrica').insert(auditoriaLedger.getAuditoriaLedgerIdentificacaoBiometrica());
        await this.#trx('tab_historico').insert(new domainHistorico({
            transformacao: historico.trnasformcao.update.value,
            dado_antigo: this.#identificacao_inicial,
            dado_atual: { ...identificacao },
            data_criacao: dateNow(),
            user_id: user_id || identificacao.user_id,
        }).getHistorico());
        await this.#trx('tab_historico').insert(new domainHistorico({
            transformacao: historico.trnasformcao.create.value,
            dado_atual: auditoriaLedger,
            data_criacao: auditoriaLedger.criado_em,
            user_id: user_id || identificacao.user_id,
        }).getHistorico());
    }
}

module.exports = LedgerIdentificacaoBiometrica;

class ErrorLedgerIdentificacaoBiometrica extends Error {
    constructor(message) {
        super(message);
        this.name = 'ErrorLedgerIdentificacaoBiometrica';
    }
}
