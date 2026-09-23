
const uuid = require('uuid');
const dateNow = require('../../infrastructure/gateways/functions/data/getToday');
class BrokerDomain {

    constructor(data) {
        this.id = data.id ? data.id : uuid.v4()
        this.exchange = data.exchange
        this.delayMs = data.delayMs
        this.fila = data.fila
        this.key = data.key
        this.message = data.message
        this.status = data.status
        this.tentativas = data.tentativas
        this.ultima_tentativa = data.ultima_tentativa
        this.meta_dados = data.meta_dados ? data.meta_dados : null
        this.data_criacao = data.data_criacao
        this.data_atualizacao = data.data_atualizacao ? data.data_atualizacao : dateNow()
        this.deletado = data.deletado === true || data.deletado === false ? data.deletado : false

    }

    getBroker() {
        return {
            id: this.id,
            exchange: this.exchange,
            delayMs: this.delayMs,
            fila: this.fila,
            key: this.key,
            message: this.message,
            status: this.status,
            tentativas: this.tentativas,
            ultima_tentativa: this.ultima_tentativa,
            meta_dados: this.meta_dados,
            data_criacao: this.data_criacao,
            data_atualizacao: this.data_atualizacao,
            deletado: this.deletado,

        }
    }

    setBroker(data) {
        this.id = data.id ? data.id : this.id
        this.exchange = data.exchange ? data.exchange : this.exchange
        this.delayMs = data.delayMs ? data.delayMs : this.delayMs
        this.fila = data.fila ? data.fila : this.fila
        this.key = data.key ? data.key : this.key
        this.message = data.message ? data.message : this.message
        this.status = data.status ? data.status : this.status
        this.tentativas = data.tentativas ? data.tentativas : this.tentativas
        this.ultima_tentativa = data.ultima_tentativa ? data.ultima_tentativa : this.ultima_tentativa
        this.meta_dados = data.meta_dados ? data.meta_dados : this.meta_dados
        this.data_criacao = data.data_criacao ? data.data_criacao : this.data_criacao
        this.data_atualizacao = data.data_atualizacao ? data.data_atualizacao : this.data_atualizacao
        this.deletado = data.deletado === true || data.deletado === false ? data.deletado : false
        return this.getBroker()
    }

}

module.exports = BrokerDomain;
