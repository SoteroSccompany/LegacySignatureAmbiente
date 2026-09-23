const uuid = require('uuid');
const moment = require('moment');
const dateNow = require('../../infrastructure/gateways/functions/data/getToday');

class DocumentoValidacaoDomain {

    constructor(data) {
        this.id = data.id ? data.id : uuid.v4()
        this.documento_id = data.documento_id
        this.codigo_consultado = data.codigo_consultado
        this.hash_documento_enviado = data.hash_documento_enviado
        this.veredito = data.veredito
        this.hash_conferido_com = data.hash_conferido_com
        this.auditoria_ledger_id = data.auditoria_ledger_id
        this.ip = data.ip
        this.porta_logica = data.porta_logica
        this.user_agent = data.user_agent
        this.data_criacao = data.data_criacao ? moment(data.data_criacao).format('YYYY-MM-DD HH:mm:ss') : dateNow()
        this.deletado = data.deletado === true || data.deletado === false ? data.deletado : false
    }

    getDocumentoValidacao() {
        return {
            id: this.id,
            documento_id: this.documento_id,
            codigo_consultado: this.codigo_consultado,
            hash_documento_enviado: this.hash_documento_enviado,
            veredito: this.veredito,
            hash_conferido_com: this.hash_conferido_com,
            auditoria_ledger_id: this.auditoria_ledger_id,
            ip: this.ip,
            porta_logica: this.porta_logica,
            user_agent: this.user_agent,
            data_criacao: this.data_criacao ? moment(this.data_criacao).format('YYYY-MM-DD HH:mm:ss') : this.data_criacao,
            deletado: this.deletado,
        }
    }
}

module.exports = DocumentoValidacaoDomain;
