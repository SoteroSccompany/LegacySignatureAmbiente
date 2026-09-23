
const uuid = require('uuid');
const dateNow = require('../../infrastructure/gateways/functions/data/getToday');

class SignatarioDomain {

    constructor(data) {
        this.id = data.id ? data.id : uuid.v4()
        this.documento_id = data.documento_id
        this.user_id = data.user_id
        this.perfil_id = data.perfil_id
        this.ordem = data.ordem === undefined ? null : data.ordem
        this.status = data.status
        this.data_criacao = data.data_criacao ? data.data_criacao : dateNow()
        this.data_atualizacao = data.data_atualizacao ? data.data_atualizacao : dateNow()
        this.deletado = data.deletado === true || data.deletado === false ? data.deletado : false
    }

    getSignatario() {
        return {
            id: this.id,
            documento_id: this.documento_id,
            user_id: this.user_id,
            perfil_id: this.perfil_id,
            ordem: this.ordem,
            status: this.status,
            data_criacao: this.data_criacao,
            data_atualizacao: this.data_atualizacao,
            deletado: this.deletado,
        }
    }

    setSignatario(data) {
        this.id = data.id ? data.id : this.id
        this.documento_id = data.documento_id ? data.documento_id : this.documento_id
        this.user_id = data.user_id ? data.user_id : this.user_id
        this.perfil_id = data.perfil_id ? data.perfil_id : this.perfil_id
        this.ordem = data.ordem !== undefined ? data.ordem : this.ordem
        this.status = data.status ? data.status : this.status
        this.data_criacao = data.data_criacao ? data.data_criacao : this.data_criacao
        this.data_atualizacao = data.data_atualizacao ? data.data_atualizacao : dateNow()
        this.deletado = data.deletado === true || data.deletado === false ? data.deletado : this.deletado
        return this.getSignatario()
    }

}

module.exports = SignatarioDomain;
