const crypto = require('crypto');
const moment = require('moment');
const JsZip = require('jszip');
const dateNow = require('../../../functions/data/getToday');
const { buckets, historico } = require('../../../../../certs');
const bucketGateway = require('../../../Bucket');
const serverSignGateway = require('../../../ServerSign');
const domainAuditoriaLedger = require('../../../../../@core/domain/AuditoriaLedger');
const domainHistorico = require('../../../../../@core/domain/Historico');

// Trilha mestre (tab_auditoria_ledger): cadeia de eventos do processo de
// assinatura (objeto + arquivo). Só GravarEvento e AncorarDocumento — sem
// Initialize e sem GravarAuditoriaModificacao. sequencia e
// hash_registro_anterior continuam por conta de quem chama.
class LedgerDocumentoPdf {

    #trx;

    constructor(trx) {
        if (!trx) {
            throw new ErrorLedgerDocumentoPdf('LedgerDocumentoPdf exige uma transação knex');
        }
        this.#trx = trx;
    }

    async GravarEvento({
        solicitacao_id, documento_id,
        objeto_tipo,
        objeto_id,
        objeto,
        objeto_anterior,
        desafio_acesso_id,
        tipo_evento,
        sequencia,
        meta_data,
        hash_documento_inicial, hash_documento_final,
        hash_registro_anterior,
        user_id,
    }) {
        if (!tipo_evento || sequencia == null) throw new ErrorLedgerDocumentoPdf('tipo_evento e sequencia são obrigatórios');
        if (!meta_data || typeof meta_data !== 'object') throw new ErrorLedgerDocumentoPdf('meta_data é obrigatório e deve ser um objeto');
        if (typeof sequencia !== 'number') throw new ErrorLedgerDocumentoPdf('sequencia deve ser um número');
        if (typeof tipo_evento !== 'string') throw new ErrorLedgerDocumentoPdf('tipo_evento deve ser uma string');
        if (!solicitacao_id && !documento_id) throw new ErrorLedgerDocumentoPdf('solicitacao_id ou documento_id é obrigatório');
        if (!objeto_tipo) throw new ErrorLedgerDocumentoPdf('objeto_tipo é obrigatório');
        if (!objeto_id) throw new ErrorLedgerDocumentoPdf('objeto_id é obrigatório');

        const hash_objeto_final = objeto != null
            ? crypto.createHash('sha256').update(JSON.stringify(objeto)).digest('hex')
            : null;
        const hash_objeto_inicial = objeto_anterior != null
            ? crypto.createHash('sha256').update(JSON.stringify(objeto_anterior)).digest('hex')
            : null;
        const hash_bytes_pdf = hash_documento_final ? hash_documento_final : null;

        const auditoriaLedger = new domainAuditoriaLedger({
            solicitacao_id: solicitacao_id || null,
            documento_id: documento_id || null,
            objeto_tipo,
            objeto_id,
            desafio_acesso_id: desafio_acesso_id || null,
            tipo_evento,
            sequencia,
            metadata_json: meta_data,
            hash_objeto_inicial,
            hash_objeto_final,
            hash_documento_inicial: hash_documento_inicial || null,
            hash_documento_final: hash_documento_final || null,
            hash_bytes_pdf,
            hash_registro_anterior: hash_registro_anterior || null,
            criado_em: dateNow(),
        });
        auditoriaLedger.calcularHashAtual();

        const payload = {
            id: auditoriaLedger.id,
            solicitacao_id: auditoriaLedger.solicitacao_id,
            documento_id: auditoriaLedger.documento_id,
            objeto_tipo: auditoriaLedger.objeto_tipo,
            objeto_id: auditoriaLedger.objeto_id,
            desafio_acesso_id: auditoriaLedger.desafio_acesso_id,
            tipo_evento: auditoriaLedger.tipo_evento,
            sequencia: auditoriaLedger.sequencia,
            metadata_json: meta_data,
            hash_objeto_inicial: auditoriaLedger.hash_objeto_inicial,
            hash_objeto_final: auditoriaLedger.hash_objeto_final,
            hash_documento_inicial: auditoriaLedger.hash_documento_inicial,
            hash_documento_final: auditoriaLedger.hash_documento_final,
            hash_bytes_pdf: auditoriaLedger.hash_bytes_pdf,
            hash_registro_anterior: auditoriaLedger.hash_registro_anterior,
            hash_atual: auditoriaLedger.hash_atual,
            criado_em: auditoriaLedger.criado_em,
        };
        const body = Buffer.from(JSON.stringify(payload));
        const hashPayload = crypto.createHash('sha256').update(body).digest('hex');
        const object_name = `DocumentoPdf-${auditoriaLedger.id}.json`;
        const objectNameCms = `DocumentoPdf-${auditoriaLedger.id}.cms`;
        const bucketVault = bucketGateway.Vault();
        const basePath = bucketVault.applyRootPrefix(documento_id
            ? `${buckets.valt}/${buckets.pastas.documento_pdf_ledger}/${documento_id}`
            : `${buckets.valt}/${buckets.pastas.documento_pdf_ledger}/solicitacao/${solicitacao_id}`);

        const carimbo = await serverSignGateway.Carimbo().carimbarHash({ hashHex: auditoriaLedger.hash_atual });
        if (!carimbo.status) throw new ErrorLedgerDocumentoPdf(carimbo.msg || 'Falha ao carimbar hash da auditoria');

        const bodyCms = Buffer.from(carimbo.data.cms_base64, 'base64');
        const zip = new JsZip();
        zip.file(object_name, body);
        zip.file(objectNameCms, bodyCms);
        const bodyZip = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
        const timeStamp = moment().format('YYYYMMDDHHmmss');
        const objectNameZip = `${basePath}/DocumentoPdf-${timeStamp}-${auditoriaLedger.id}.zip`;
        const saveBucket = await bucketVault.salvarArquivo({
            objectName: objectNameZip,
            fileStream: bodyZip,
            size: bodyZip.length,
            contentType: 'application/zip',
        });
        if (!saveBucket.status) throw new ErrorLedgerDocumentoPdf(saveBucket.msg || 'Falha ao gravar zip da auditoria no vault');
        const selarDoc = await bucketVault.selarDocumento({ documentoId: objectNameZip });
        if (!selarDoc.status) throw new ErrorLedgerDocumentoPdf(selarDoc.msg || 'Falha ao selar zip da auditoria no vault');

        auditoriaLedger.payload_sha256 = hashPayload;
        auditoriaLedger.bucket_path = basePath;
        auditoriaLedger.object_name = objectNameZip;

        await this.#trx('tab_auditoria_ledger').insert({
            ...auditoriaLedger.getAuditoriaLedger(),
            metadata_json: JSON.stringify(meta_data),
        });
        await this.#trx('tab_historico').insert(new domainHistorico({
            transformacao: historico.trnasformcao.create.value,
            dado_atual: auditoriaLedger,
            data_criacao: auditoriaLedger.criado_em,
            user_id,
        }).getHistorico());

        return auditoriaLedger.getAuditoriaLedger();
    }

    async AncorarDocumento({ solicitacao_id, documento_id, hash_documento_inicial, hash_documento_final, user_id }) {
        if (!solicitacao_id) throw new ErrorLedgerDocumentoPdf('solicitacao_id é obrigatório');
        if (!documento_id) throw new ErrorLedgerDocumentoPdf('documento_id é obrigatório');

        const elos = await this.#trx('tab_auditoria_ledger')
            .where('solicitacao_id', solicitacao_id)
            .whereNull('documento_id')
            .where('deletado', false)
            .orderBy('sequencia', 'asc')
            .forUpdate();
        if (!elos || elos.length === 0) {
            console.log('AncorarDocumento: nenhum elo pendente para solicitacao_id', solicitacao_id);
            throw new ErrorLedgerDocumentoPdf('Não há elos pendentes de ancoragem para esta solicitação.');
        }

        let hashAnteriorRecalculado = null;
        for (const elo of elos) {
            const oldElo = { ...elo };
            let meta = elo.metadata_json;
            if (typeof meta === 'string') meta = JSON.parse(meta);
            meta = (meta && typeof meta === 'object') ? { ...meta } : {};
            meta.hash_atual_pre_ancoragem = elo.hash_atual;
            meta.ancorado_em = dateNow();

            const auditoriaLedger = new domainAuditoriaLedger({
                id: elo.id,
                solicitacao_id: elo.solicitacao_id,
                documento_id,
                objeto_tipo: elo.objeto_tipo,
                objeto_id: elo.objeto_id,
                desafio_acesso_id: elo.desafio_acesso_id,
                tipo_evento: elo.tipo_evento,
                sequencia: elo.sequencia,
                metadata_json: meta,
                hash_objeto_inicial: elo.hash_objeto_inicial,
                hash_objeto_final: elo.hash_objeto_final,
                hash_documento_inicial: hash_documento_inicial || null,
                hash_documento_final: hash_documento_final || null,
                hash_bytes_pdf: hash_documento_final ? hash_documento_final : (elo.hash_bytes_pdf || null),
                hash_registro_anterior: hashAnteriorRecalculado,
                payload_sha256: elo.payload_sha256,
                bucket_path: elo.bucket_path,
                object_name: elo.object_name,
                criado_em: elo.criado_em,
            });
            auditoriaLedger.calcularHashAtual();

            const payload = {
                id: auditoriaLedger.id,
                solicitacao_id: auditoriaLedger.solicitacao_id,
                documento_id: auditoriaLedger.documento_id,
                objeto_tipo: auditoriaLedger.objeto_tipo,
                objeto_id: auditoriaLedger.objeto_id,
                desafio_acesso_id: auditoriaLedger.desafio_acesso_id,
                tipo_evento: auditoriaLedger.tipo_evento,
                sequencia: auditoriaLedger.sequencia,
                metadata_json: meta,
                hash_objeto_inicial: auditoriaLedger.hash_objeto_inicial,
                hash_objeto_final: auditoriaLedger.hash_objeto_final,
                hash_documento_inicial: auditoriaLedger.hash_documento_inicial,
                hash_documento_final: auditoriaLedger.hash_documento_final,
                hash_bytes_pdf: auditoriaLedger.hash_bytes_pdf,
                hash_registro_anterior: auditoriaLedger.hash_registro_anterior,
                hash_atual: auditoriaLedger.hash_atual,
                criado_em: auditoriaLedger.criado_em,
            };
            const body = Buffer.from(JSON.stringify(payload));
            const hashPayload = crypto.createHash('sha256').update(body).digest('hex');
            const object_name = `DocumentoPdf-${auditoriaLedger.id}.json`;
            const objectNameCms = `DocumentoPdf-${auditoriaLedger.id}.cms`;
            const bucketVault = bucketGateway.Vault();
            const basePath = bucketVault.applyRootPrefix(`${buckets.valt}/${buckets.pastas.documento_pdf_ledger}/${documento_id}`);

            const carimbo = await serverSignGateway.Carimbo().carimbarHash({ hashHex: auditoriaLedger.hash_atual });
            if (!carimbo.status) throw new ErrorLedgerDocumentoPdf(carimbo.msg || 'Falha ao carimbar hash da auditoria');

            const bodyCms = Buffer.from(carimbo.data.cms_base64, 'base64');
            const zip = new JsZip();
            zip.file(object_name, body);
            zip.file(objectNameCms, bodyCms);
            const bodyZip = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
            const timeStamp = moment().format('YYYYMMDDHHmmss');
            const objectNameZip = `${basePath}/DocumentoPdf-${timeStamp}-${auditoriaLedger.id}.zip`;
            const saveBucket = await bucketVault.salvarArquivo({
                objectName: objectNameZip,
                fileStream: bodyZip,
                size: bodyZip.length,
                contentType: 'application/zip',
            });
            if (!saveBucket.status) throw new ErrorLedgerDocumentoPdf(saveBucket.msg || 'Falha ao gravar zip da auditoria no vault');
            const selarDoc = await bucketVault.selarDocumento({ documentoId: objectNameZip });
            if (!selarDoc.status) throw new ErrorLedgerDocumentoPdf(selarDoc.msg || 'Falha ao selar zip da auditoria no vault');

            auditoriaLedger.payload_sha256 = hashPayload;
            auditoriaLedger.bucket_path = basePath;
            auditoriaLedger.object_name = objectNameZip;

            await this.#trx('tab_auditoria_ledger').where('id', auditoriaLedger.id).update({
                ...auditoriaLedger.getAuditoriaLedger(),
                metadata_json: JSON.stringify(meta),
            });
            await this.#trx('tab_historico').insert(new domainHistorico({
                transformacao: historico.trnasformcao.update.value,
                dado_antigo: oldElo,
                dado_atual: auditoriaLedger.getAuditoriaLedger(),
                data_criacao: dateNow(),
                user_id,
            }).getHistorico());

            hashAnteriorRecalculado = auditoriaLedger.hash_atual;
        }
    }
}

module.exports = LedgerDocumentoPdf;

class ErrorLedgerDocumentoPdf extends Error {
    constructor(message) {
        super(message);
        this.name = 'ErrorLedgerDocumentoPdf';
    }
}
