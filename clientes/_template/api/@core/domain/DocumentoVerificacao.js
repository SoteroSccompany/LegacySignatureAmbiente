const uuid = require('uuid');
const moment = require('moment');
const dateNow = require('../../infrastructure/gateways/functions/data/getToday');

class DocumentoVerificacaoDomain {

    constructor(data) {
        this.id = data.id ? data.id : uuid.v4()
        this.documento_id = data.documento_id
        this.codigo_verificacao = data.codigo_verificacao
        this.hash_referencia = data.hash_referencia
        this.criado_em = data.criado_em ? moment(data.criado_em).format('YYYY-MM-DD HH:mm:ss') : dateNow()
        this.deletado = data.deletado === true || data.deletado === false ? data.deletado : false
    }

    getDocumentoVerificacao() {
        return {
            id: this.id,
            documento_id: this.documento_id,
            codigo_verificacao: this.codigo_verificacao,
            hash_referencia: this.hash_referencia,
            criado_em: this.criado_em ? moment(this.criado_em).format('YYYY-MM-DD HH:mm:ss') : this.criado_em,
            deletado: this.deletado,
        }
    }
}

module.exports = DocumentoVerificacaoDomain;
