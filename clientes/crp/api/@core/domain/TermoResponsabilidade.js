
const uuid = require('uuid');
const dateNow = require('../../infrastructure/gateways/functions/data/getToday');
const moment = require('moment');
class TermoResponsabilidadeDomain {

    constructor(data) {
        this.id = data.id ? data.id : uuid.v4()
        this.titulo_termo = data.titulo_termo
        this.descricao_termo = data.descricao_termo
        this.desafio_id = data.desafio_id
        this.tipo_termo = data.tipo_termo
        this.versao = data.versao ? data.versao : `1/${moment().format('YYYY_MMDDHHmm')}`
        this.ativo = data.ativo ? data.ativo : true
        this.data_criacao = data.data_criacao
        this.data_atualizacao = data.data_atualizacao ? data.data_atualizacao : dateNow()
        this.deletado = data.deletado === true || data.deletado === false ? data.deletado : false

    }

    getTermoResponsabilidade() {
        return {
            id: this.id,
            titulo_termo: this.titulo_termo,
            descricao_termo: this.descricao_termo,
            desafio_id: this.desafio_id,
            tipo_termo: this.tipo_termo,
            versao: this.versao,
            ativo: this.ativo,
            data_criacao: this.data_criacao,
            data_atualizacao: this.data_atualizacao,
            deletado: this.deletado,
        }
    }

    setTermoResponsabilidade(data) {
        this.id = data.id ? data.id : this.id
        this.titulo_termo = data.titulo_termo ? data.titulo_termo : this.titulo_termo
        this.descricao_termo = data.descricao_termo ? data.descricao_termo : this.descricao_termo
        this.desafio_id = data.desafio_id ? data.desafio_id : this.desafio_id
        this.ativo = data.ativo ? data.ativo : this.ativo
        this.versao = data.versao ? data.versao : this.versao
        this.tipo_termo = data.tipo_termo ? data.tipo_termo : this.tipo_termo
        this.data_criacao = data.data_criacao ? data.data_criacao : this.data_criacao
        this.data_atualizacao = data.data_atualizacao ? data.data_atualizacao : this.data_atualizacao
        this.deletado = data.deletado === true || data.deletado === false ? data.deletado : false
        return this.getTermoResponsabilidade()
    }

}

module.exports = TermoResponsabilidadeDomain;
