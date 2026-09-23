const uuid = require('uuid');
const dateNow = require('../../infrastructure/gateways/functions/data/getToday');

class EventoDomain {

    constructor(data) {
        this.id = data.id ? data.id : uuid.v4()
        this.tipo = data.tipo
        this.status = data.status
        this.solicitacao_id = data.solicitacao_id
        this.documento_id = data.documento_id
        this.signatario_id = data.signatario_id || null
        this.origem_tipo = data.origem_tipo
        this.origem_id = data.origem_id
        this.destinatario_user_id = data.destinatario_user_id || null
        this.canal = data.canal
        this.titulo = data.titulo
        this.mensagem = data.mensagem
        this.meta_dados = data.meta_dados || null
        this.criado_em = data.criado_em ? data.criado_em : dateNow()
        this.atualizado_em = data.atualizado_em ? data.atualizado_em : dateNow()
        this.deletado = data.deletado === true || data.deletado === false ? data.deletado : false
    }

    getEvento() {
        return {
            id: this.id,
            tipo: this.tipo,
            status: this.status,
            solicitacao_id: this.solicitacao_id,
            documento_id: this.documento_id,
            signatario_id: this.signatario_id,
            origem_tipo: this.origem_tipo,
            origem_id: this.origem_id,
            destinatario_user_id: this.destinatario_user_id,
            canal: this.canal,
            titulo: this.titulo,
            mensagem: this.mensagem,
            meta_dados: this.meta_dados,
            criado_em: this.criado_em,
            atualizado_em: this.atualizado_em,
            deletado: this.deletado,
        }
    }
}

module.exports = EventoDomain;
