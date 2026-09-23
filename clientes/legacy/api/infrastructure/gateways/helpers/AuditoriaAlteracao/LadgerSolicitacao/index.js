const crypto = require('crypto');
const moment = require('moment');
const JsZip = require('jszip');
const dateNow = require('../../../functions/data/getToday');
const { buckets, historico } = require('../../../../../certs');
const bucketGateway = require('../../../Bucket');
const serverSignGateway = require('../../../ServerSign');
const domainAuditoriaLedgerSolicitacao = require('../../../../../@core/domain/AuditoriaLedgerSolicitacao');
const domainHistorico = require('../../../../../@core/domain/Historico');

class LedgerSolicitacao {

    #trx;
    #solicitacao_inicial;//Antes das modificacoes

    constructor(trx) {
        if (!trx) {
            throw new Error('LedgerSolicitacao exige uma transação knex');
        }
        this.#trx = trx;
    }

    Initialize(solicitacao) { //Gera um "lock" para saber o estado. 
        this.#solicitacao_inicial = solicitacao;
    }


    async GravarAuditoriaModificacao({ solicitacao, tipo_evento, sequencia, meta_data, solicitacao_update }) {
        if (!solicitacao?.id) throw new ErrorLedgerSolicitacao('solicitacao.id é obrigatório');
        if (solicitacao.id !== this.#solicitacao_inicial.id) throw new ErrorLedgerSolicitacao('A solicitação fornecida não corresponde à solicitação inicial registrada.');
        if (!tipo_evento || sequencia == null) throw new ErrorLedgerSolicitacao('tipo_evento e sequencia são obrigatórios');
        if (!meta_data || typeof meta_data !== 'object') throw new ErrorLedgerSolicitacao('meta_data é obrigatório e deve ser um objeto');
        if (typeof sequencia !== 'number') throw new ErrorLedgerSolicitacao('sequencia deve ser um número');
        if (typeof tipo_evento !== 'string') throw new ErrorLedgerSolicitacao('tipo_evento deve ser uma string');
        const ladgerAnterior = await this.#trx('tab_auditoria_ledger_solicitacao')
            .where('solicitacao_id', solicitacao.id)
            .where('deletado', false)
            .orderBy('sequencia', 'desc')
            .first();
        if (!ladgerAnterior) throw new ErrorLedgerSolicitacao('Não foi possível encontrar o último registro de auditoria para esta solicitação.');
        const bucketVault = bucketGateway.Vault();
        const payload = solicitacao;
        const body = Buffer.from(JSON.stringify(payload));
        const hashPayload = crypto.createHash('sha256').update(body).digest('hex');
        const object_name = `SolicitacaoDocumento-${solicitacao.id}.json`;
        const objectNameCms = `SolicitacaoDocumento-${solicitacao.id}.cms`;
        const basePath = bucketVault.applyRootPrefix(`${buckets.valt}/${buckets.pastas.solicitacao_ledger}/${solicitacao.id}`)
        const auditoriaLedger = new domainAuditoriaLedgerSolicitacao({
            solicitacao_id: solicitacao.id,
            documento_id: solicitacao.documento_id,
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
        if (!carimbo.status) throw new ErrorLedgerSolicitacao(carimbo.msg || 'Falha ao carimbar hash da auditoria');
        const bodyJson = Buffer.from(JSON.stringify(solicitacao));
        const bodyCms = Buffer.from(carimbo.data.cms_base64, 'base64');
        const zip = new JsZip();
        zip.file(object_name, bodyJson);
        zip.file(objectNameCms, bodyCms);
        const bodyZip = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
        const timeStamp = moment().format('YYYYMMDDHHmmss');
        const objectNameZip = `${basePath}/SolicitacaoDocumento-${timeStamp}-${auditoriaLedger.id}.zip`;
        const saveBucket = await bucketVault.salvarArquivo({
            objectName: objectNameZip,
            fileStream: bodyZip,
            size: bodyZip.length,
            contentType: 'application/zip'
        });
        if (!saveBucket.status) throw new ErrorLedgerSolicitacao(saveBucket.msg || 'Falha ao gravar zip da auditoria no vault');
        const selarDoc = await bucketVault.selarDocumento({ documentoId: objectNameZip });
        if (!selarDoc.status) throw new ErrorLedgerSolicitacao(selarDoc.msg || 'Falha ao selar zip da auditoria no vault');
        auditoriaLedger.object_name = objectNameZip;
        if (solicitacao_update && typeof solicitacao_update === 'object') {
            await this.#trx('tab_solicitacao_documento').where('id', solicitacao.id).update(solicitacao_update);
        } else {
            await this.#trx('tab_solicitacao_documento').where('id', solicitacao.id).update({
                status: solicitacao.status,
                data_atualizacao: solicitacao.data_atualizacao,
                meta_dados: typeof solicitacao.meta_dados === 'object' ? JSON.stringify(solicitacao.meta_dados) : solicitacao.meta_dados
            });
        }
        await this.#trx('tab_auditoria_ledger_solicitacao').insert(auditoriaLedger.getAuditoriaLedgerSolicitacao());
        await this.#trx('tab_historico').insert(new domainHistorico({
            transformacao: historico.trnasformcao.update.value,
            dado_anterior: this.#solicitacao_inicial,
            dado_atual: { ...solicitacao },
            data_criacao: dateNow(),
            user_id: solicitacao.user_id,
        }).getHistorico());
        await this.#trx('tab_historico').insert(new domainHistorico({
            transformacao: historico.trnasformcao.create.value,
            dado_atual: auditoriaLedger,
            data_criacao: auditoriaLedger.data_criacao,
            user_id: solicitacao.user_id,
        }).getHistorico());

    }
}

module.exports = LedgerSolicitacao;


class ErrorLedgerSolicitacao extends Error {
    constructor(message) {
        super(message);
        this.name = 'ErrorLedgerSolicitacao';
    }
}
