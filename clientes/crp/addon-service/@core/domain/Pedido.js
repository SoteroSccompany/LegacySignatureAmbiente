
const uuid = require('uuid');
const dateNow = require('../../infrastructure/gateways/functions/data/getToday');
const { statusPedido } = require('../../config');

class PedidoDomain {

    constructor(data) {
        this.id = data.id ? data.id : uuid.v4()
        this.instalacao_id = data.instalacao_id ? data.instalacao_id : null
        this.titulo = data.titulo ? data.titulo : null
        this.solicitacao_id = data.solicitacao_id ? data.solicitacao_id : null
        this.documento_id = data.documento_id ? data.documento_id : null
        this.termo_id = data.termo_id ? data.termo_id : null
        this.pasta_processo_drive_id = data.pasta_processo_drive_id ? data.pasta_processo_drive_id : null
        this.status = data.status ? data.status : statusPedido.validando
        this.erro_msg = data.erro_msg ? data.erro_msg : null
        this.hash_original = data.hash_original ? data.hash_original : null
        this.hash_assinado = data.hash_assinado ? data.hash_assinado : null
        this.signatarios_json = data.signatarios_json ? data.signatarios_json : null
        this.data_atualizacao = data.data_atualizacao ? data.data_atualizacao : dateNow()
        this.data_criacao = data.data_criacao ? data.data_criacao : dateNow()
        this.deletado = data.deletado === true || data.deletado === false ? data.deletado : false
    }

    getPedido() {
        return {
            id: this.id,
            instalacao_id: this.instalacao_id,
            titulo: this.titulo,
            solicitacao_id: this.solicitacao_id,
            documento_id: this.documento_id,
            termo_id: this.termo_id,
            pasta_processo_drive_id: this.pasta_processo_drive_id,
            status: this.status,
            erro_msg: this.erro_msg,
            hash_original: this.hash_original,
            hash_assinado: this.hash_assinado,
            signatarios_json: this.signatarios_json,
            data_atualizacao: this.data_atualizacao,
            data_criacao: this.data_criacao,
            deletado: this.deletado,
        }
    }

    setPedido(data) {
        this.solicitacao_id = data.solicitacao_id ? data.solicitacao_id : this.solicitacao_id
        this.documento_id = data.documento_id ? data.documento_id : this.documento_id
        this.termo_id = data.termo_id ? data.termo_id : this.termo_id
        this.status = data.status ? data.status : this.status
        this.erro_msg = data.erro_msg ? data.erro_msg : this.erro_msg
        this.hash_original = data.hash_original ? data.hash_original : this.hash_original
        this.hash_assinado = data.hash_assinado ? data.hash_assinado : this.hash_assinado
        this.data_atualizacao = dateNow()
        return this.getPedido()
    }

}

module.exports = PedidoDomain;
