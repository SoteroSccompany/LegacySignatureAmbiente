const uuid = require('uuid');
const dateNow = require('../../infrastructure/gateways/functions/data/getToday');

class AlertaUsuarioDomain {

    constructor(data) {
        this.id = data.id ? data.id : uuid.v4()
        this.user_id = data.user_id
        this.tipo = data.tipo
        this.titulo = data.titulo
        this.mensagem = data.mensagem
        this.referencia_tipo = data.referencia_tipo || null
        this.referencia_id = data.referencia_id || null
        this.evento_id = data.evento_id || null
        this.meta_dados = data.meta_dados || null
        this.lido = data.lido === true || data.lido === false ? data.lido : false
        this.criado_em = data.criado_em ? data.criado_em : dateNow()
        this.deletado = data.deletado === true || data.deletado === false ? data.deletado : false
    }

    getAlertaUsuario() {
        return {
            id: this.id,
            user_id: this.user_id,
            tipo: this.tipo,
            titulo: this.titulo,
            mensagem: this.mensagem,
            referencia_tipo: this.referencia_tipo,
            referencia_id: this.referencia_id,
            evento_id: this.evento_id,
            meta_dados: this.meta_dados,
            lido: this.lido,
            criado_em: this.criado_em,
            deletado: this.deletado,
        }
    }
}

module.exports = AlertaUsuarioDomain;
