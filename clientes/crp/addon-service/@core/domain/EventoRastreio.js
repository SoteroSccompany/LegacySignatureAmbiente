
const uuid = require('uuid');
const dateNow = require('../../infrastructure/gateways/functions/data/getToday');

class EventoRastreioDomain {

    constructor(data) {
        this.id = data.id ? data.id : uuid.v4()
        this.instalacao_id = data.instalacao_id ? data.instalacao_id : null
        this.pedido_id = data.pedido_id ? data.pedido_id : null
        this.tipo_evento = data.tipo_evento ? data.tipo_evento : null
        this.meta_dados = data.meta_dados ? JSON.stringify(data.meta_dados) : null
        this.data_criacao = data.data_criacao ? data.data_criacao : dateNow()
        this.deletado = data.deletado === true || data.deletado === false ? data.deletado : false
    }

    getEventoRastreio() {
        return {
            id: this.id,
            instalacao_id: this.instalacao_id,
            pedido_id: this.pedido_id,
            tipo_evento: this.tipo_evento,
            meta_dados: this.meta_dados,
            data_criacao: this.data_criacao,
            deletado: this.deletado,
        }
    }

}

module.exports = EventoRastreioDomain;
