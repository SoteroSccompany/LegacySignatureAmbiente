
const uuid = require('uuid');
const dateNow = require('../../infrastructure/gateways/functions/data/getToday');

class DemarcacaoAssinaturaDomain {

    constructor(data) {
        this.id = data.id ? data.id : uuid.v4()
        this.signatario_id = data.signatario_id
        this.tipo = data.tipo
        this.pagina = data.pagina
        this.x = data.x
        this.y = data.y
        this.largura = data.largura
        this.altura = data.altura
        this.pdf = data.pdf
        this.pagina_tamanho = data.pagina_tamanho
        this.data_criacao = data.data_criacao ? data.data_criacao : dateNow()
        this.deletado = data.deletado === true || data.deletado === false ? data.deletado : false
    }

    getDemarcacaoAssinatura() {
        return {
            id: this.id,
            signatario_id: this.signatario_id,
            tipo: this.tipo,
            pagina: this.pagina,
            x: this.x,
            y: this.y,
            largura: this.largura,
            altura: this.altura,
            pdf: this.pdf,
            pagina_tamanho: this.pagina_tamanho,
            data_criacao: this.data_criacao,
            deletado: this.deletado,
        }
    }

    setDemarcacaoAssinatura(data) {
        this.id = data.id ? data.id : this.id
        this.signatario_id = data.signatario_id ? data.signatario_id : this.signatario_id
        this.tipo = data.tipo ? data.tipo : this.tipo
        this.pagina = data.pagina !== undefined ? data.pagina : this.pagina
        this.x = data.x !== undefined ? data.x : this.x
        this.y = data.y !== undefined ? data.y : this.y
        this.largura = data.largura !== undefined ? data.largura : this.largura
        this.altura = data.altura !== undefined ? data.altura : this.altura
        this.pdf = data.pdf ? data.pdf : this.pdf
        this.pagina_tamanho = data.pagina_tamanho ? data.pagina_tamanho : this.pagina_tamanho
        this.data_criacao = data.data_criacao ? data.data_criacao : this.data_criacao
        this.deletado = data.deletado === true || data.deletado === false ? data.deletado : this.deletado
        return this.getDemarcacaoAssinatura()
    }

}

module.exports = DemarcacaoAssinaturaDomain;
