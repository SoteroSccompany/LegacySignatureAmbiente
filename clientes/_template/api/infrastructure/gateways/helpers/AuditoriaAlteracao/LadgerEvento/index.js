const crypto = require('crypto');
const moment = require('moment');
const JsZip = require('jszip');
const dateNow = require('../../../functions/data/getToday');
const { buckets, historico } = require('../../../../../certs');
const bucketGateway = require('../../../Bucket');
const serverSignGateway = require('../../../ServerSign');
const domainAuditoriaLedgerEvento = require('../../../../../@core/domain/AuditoriaLedgerEvento');
const domainHistorico = require('../../../../../@core/domain/Historico');

class LedgerEvento {

    #trx;
    #evento_inicial;

    constructor(trx) {
        if (!trx) {
            throw new Error('LedgerEvento exige uma transação knex');
        }
        this.#trx = trx;
    }

    Initialize(evento) {
        this.#evento_inicial = evento;
    }

    async GravarAuditoriaCriacao({ evento, tipo_evento, sequencia, meta_data, user_id }) {
        if (!evento?.id) throw new ErrorLedgerEvento('evento.id é obrigatório');
        if (!tipo_evento || sequencia == null) throw new ErrorLedgerEvento('tipo_evento e sequencia são obrigatórios');
        if (!meta_data || typeof meta_data !== 'object') throw new ErrorLedgerEvento('meta_data é obrigatório e deve ser um objeto');
        if (typeof sequencia !== 'number') throw new ErrorLedgerEvento('sequencia deve ser um número');
        if (typeof tipo_evento !== 'string') throw new ErrorLedgerEvento('tipo_evento deve ser uma string');

        const bucketVault = bucketGateway.Vault();
        const payload = evento;
        const body = Buffer.from(JSON.stringify(payload));
        const hashPayload = crypto.createHash('sha256').update(body).digest('hex');
        const object_name = `Evento-${evento.id}.json`;
        const objectNameCms = `Evento-${evento.id}.cms`;
        const basePath = bucketVault.applyRootPrefix(`${buckets.valt}/${buckets.pastas.evento_ledger}/${evento.id}`);
        const auditoriaLedger = new domainAuditoriaLedgerEvento({
            evento_id: evento.id,
            documento_id: evento.documento_id,
            solicitacao_id: evento.solicitacao_id,
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
        if (!carimbo.status) throw new ErrorLedgerEvento(carimbo.msg || 'Falha ao carimbar hash da auditoria');
        const bodyJson = Buffer.from(JSON.stringify(evento));
        const bodyCms = Buffer.from(carimbo.data.cms_base64, 'base64');
        const zip = new JsZip();
        zip.file(object_name, bodyJson);
        zip.file(objectNameCms, bodyCms);
        const bodyZip = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
        const timeStamp = moment().format('YYYYMMDDHHmmss');
        const objectNameZip = `${basePath}/Evento-${timeStamp}-${auditoriaLedger.id}.zip`;
        const saveBucket = await bucketVault.salvarArquivo({
            objectName: objectNameZip,
            fileStream: bodyZip,
            size: bodyZip.length,
            contentType: 'application/zip'
        });
        if (!saveBucket.status) throw new ErrorLedgerEvento(saveBucket.msg || 'Falha ao gravar zip da auditoria no vault');
        const selarDoc = await bucketVault.selarDocumento({ documentoId: objectNameZip });
        if (!selarDoc.status) throw new ErrorLedgerEvento(selarDoc.msg || 'Falha ao selar zip da auditoria no vault');
        auditoriaLedger.object_name = objectNameZip;
        await this.#trx('tab_auditoria_ledger_evento').insert(auditoriaLedger.getAuditoriaLedgerEvento());
        await this.#trx('tab_historico').insert(new domainHistorico({
            transformacao: historico.trnasformcao.create.value,
            dado_atual: auditoriaLedger,
            data_criacao: auditoriaLedger.criado_em,
            user_id,
        }).getHistorico());
    }

    async GravarAuditoriaModificacao({ evento, tipo_evento, sequencia, meta_data, evento_update, user_id }) {
        if (!evento?.id) throw new ErrorLedgerEvento('evento.id é obrigatório');
        if (!this.#evento_inicial?.id) throw new ErrorLedgerEvento('Initialize(evento) é obrigatório antes da modificação');
        if (evento.id !== this.#evento_inicial.id) throw new ErrorLedgerEvento('O evento fornecido não corresponde ao evento inicial registrado.');
        if (!tipo_evento || sequencia == null) throw new ErrorLedgerEvento('tipo_evento e sequencia são obrigatórios');
        if (!meta_data || typeof meta_data !== 'object') throw new ErrorLedgerEvento('meta_data é obrigatório e deve ser um objeto');
        if (typeof sequencia !== 'number') throw new ErrorLedgerEvento('sequencia deve ser um número');
        if (typeof tipo_evento !== 'string') throw new ErrorLedgerEvento('tipo_evento deve ser uma string');
        const ladgerAnterior = await this.#trx('tab_auditoria_ledger_evento')
            .where('evento_id', evento.id)
            .where('deletado', false)
            .orderBy('sequencia', 'desc')
            .first();
        if (!ladgerAnterior) throw new ErrorLedgerEvento('Não foi possível encontrar o último registro de auditoria para este evento.');
        const bucketVault = bucketGateway.Vault();
        const payload = evento;
        const body = Buffer.from(JSON.stringify(payload));
        const hashPayload = crypto.createHash('sha256').update(body).digest('hex');
        const object_name = `Evento-${evento.id}.json`;
        const objectNameCms = `Evento-${evento.id}.cms`;
        const basePath = bucketVault.applyRootPrefix(`${buckets.valt}/${buckets.pastas.evento_ledger}/${evento.id}`);
        const auditoriaLedger = new domainAuditoriaLedgerEvento({
            evento_id: evento.id,
            documento_id: evento.documento_id,
            solicitacao_id: evento.solicitacao_id,
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
        if (!carimbo.status) throw new ErrorLedgerEvento(carimbo.msg || 'Falha ao carimbar hash da auditoria');
        const bodyJson = Buffer.from(JSON.stringify(evento));
        const bodyCms = Buffer.from(carimbo.data.cms_base64, 'base64');
        const zip = new JsZip();
        zip.file(object_name, bodyJson);
        zip.file(objectNameCms, bodyCms);
        const bodyZip = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
        const timeStamp = moment().format('YYYYMMDDHHmmss');
        const objectNameZip = `${basePath}/Evento-${timeStamp}-${auditoriaLedger.id}.zip`;
        const saveBucket = await bucketVault.salvarArquivo({
            objectName: objectNameZip,
            fileStream: bodyZip,
            size: bodyZip.length,
            contentType: 'application/zip'
        });
        if (!saveBucket.status) throw new ErrorLedgerEvento(saveBucket.msg || 'Falha ao gravar zip da auditoria no vault');
        const selarDoc = await bucketVault.selarDocumento({ documentoId: objectNameZip });
        if (!selarDoc.status) throw new ErrorLedgerEvento(selarDoc.msg || 'Falha ao selar zip da auditoria no vault');
        auditoriaLedger.object_name = objectNameZip;
        if (evento_update && typeof evento_update === 'object') {
            await this.#trx('tab_evento').where('id', evento.id).update(evento_update);
        }
        await this.#trx('tab_auditoria_ledger_evento').insert(auditoriaLedger.getAuditoriaLedgerEvento());
        await this.#trx('tab_historico').insert(new domainHistorico({
            transformacao: historico.trnasformcao.update.value,
            dado_antigo: this.#evento_inicial,
            dado_atual: { ...evento },
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

module.exports = LedgerEvento;

class ErrorLedgerEvento extends Error {
    constructor(message) {
        super(message);
        this.name = 'ErrorLedgerEvento';
    }
}
