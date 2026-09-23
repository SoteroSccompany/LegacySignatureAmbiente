
const uuid = require('uuid');
const dateNow = require('../../infrastructure/gateways/functions/data/getToday');

class HistoricoDomain {

    constructor(data) {
        this.id = data.id ? data.id : uuid.v4()
        this.objeto_id = data.dado_atual.id
        this.transformacao = data.transformacao
        this.dado_atual = JSON.stringify(data.dado_atual)
        this.dado_antigo = data.dado_antigo ? JSON.stringify(data.dado_antigo) : null
        this.user_id = data.user_id
        this.data_criacao = data.data_criacao ? data.data_criacao : dateNow()
        this.data_atualizacao = data.data_atualizacao ? data.data_atualizacao : dateNow()
        this.deletado = data.deletado === true || data.deletado === false ? data.deletado : false

    }

    getHistorico() {
        return {
            id: this.id,
            objeto_id: this.objeto_id,
            transformacao: this.transformacao,
            dado_atual: JSON.parse(this.dado_atual),
            dado_antigo: this.dado_antigo ? JSON.parse(this.dado_antigo) : null,
            user_id: this.user_id,
            data_criacao: this.data_criacao,
            data_atualizacao: this.data_atualizacao,
            deletado: this.deletado,

        }
    }

    setHistorico(data) {
        this.id = data.id ? data.id : this.id
        this.objeto_id = data.objeto_id ? data.objeto_id : this.objeto_id
        this.transformacao = data.transformacao ? data.transformacao : this.transformacao
        this.dado_atual = data.dado_atual ? JSON.stringify(data.dado_atual) : this.dado_atual
        this.dado_antigo = data.dado_antigo ? JSON.stringify(data.dado_antigo) : this.dado_antigo
        this.user_id = data.user_id ? data.user_id : this.user_id
        this.data_criacao = data.data_criacao ? data.data_criacao : this.data_criacao
        this.data_atualizacao = data.data_atualizacao ? data.data_atualizacao : this.data_atualizacao
        this.deletado = data.deletado === true || data.deletado === false ? data.deletado : false

        return this.getHistorico()
    }

}

module.exports = HistoricoDomain;
