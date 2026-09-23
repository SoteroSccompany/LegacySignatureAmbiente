
const uuid = require('uuid');
const dateNow = require('../../infrastructure/gateways/functions/data/getToday');

class ChaveIntegracaoDomain {

    constructor(data) {
        this.id = data.id ? data.id : uuid.v4()
        this.user_id = data.user_id ? data.user_id : null
        this.prefixo = data.prefixo ? data.prefixo : null
        this.hash = data.hash ? data.hash : null
        this.escopo = data.escopo ? data.escopo : null
        this.email_usuario = data.email_usuario ? data.email_usuario : null
        this.desafio_id = data.desafio_id ? data.desafio_id : null
        this.session_id = data.session_id ? data.session_id : null
        this.ultimo_uso = data.ultimo_uso ? data.ultimo_uso : null
        this.revogada = data.revogada === true || data.revogada === false ? data.revogada : false
        this.data_atualizacao = data.data_atualizacao ? data.data_atualizacao : dateNow()
        this.data_criacao = data.data_criacao ? data.data_criacao : dateNow()
        this.deletado = data.deletado === true || data.deletado === false ? data.deletado : false
    }

    getChaveIntegracao() {
        return {
            id: this.id,
            user_id: this.user_id,
            prefixo: this.prefixo,
            hash: this.hash,
            escopo: this.escopo,
            email_usuario: this.email_usuario,
            desafio_id: this.desafio_id,
            session_id: this.session_id,
            ultimo_uso: this.ultimo_uso,
            revogada: this.revogada,
            data_atualizacao: this.data_atualizacao,
            data_criacao: this.data_criacao,
            deletado: this.deletado,
        }
    }

    setChaveIntegracao(data) {
        this.ultimo_uso = data.ultimo_uso ? data.ultimo_uso : this.ultimo_uso
        this.revogada = data.revogada === true || data.revogada === false ? data.revogada : this.revogada
        this.data_atualizacao = dateNow()
        return this.getChaveIntegracao()
    }

}

module.exports = ChaveIntegracaoDomain;
