
const uuid = require('uuid');
const dateNow = require('../../infrastructure/gateways/functions/data/getToday');
const { statusInstalacao } = require('../../config');

class InstalacaoDomain {

    constructor(data) {
        this.id = data.id ? data.id : uuid.v4()
        this.nome = data.nome ? data.nome : null
        this.chave_api = data.chave_api ? data.chave_api : null
        this.chave_api_prefixo = data.chave_api_prefixo ? data.chave_api_prefixo : null
        this.email_usuario = data.email_usuario ? data.email_usuario : null
        this.chave_admin = data.chave_admin === true || data.chave_admin === false ? data.chave_admin : false
        this.escopo = data.escopo ? data.escopo : null
        this.credencial_hash = data.credencial_hash ? data.credencial_hash : null
        this.credencial_prefixo = data.credencial_prefixo ? data.credencial_prefixo : null
        this.pasta_raiz_drive = data.pasta_raiz_drive ? data.pasta_raiz_drive : null
        this.status = data.status ? data.status : statusInstalacao.ativa
        this.ultimo_uso = data.ultimo_uso ? data.ultimo_uso : null
        this.data_atualizacao = data.data_atualizacao ? data.data_atualizacao : dateNow()
        this.data_criacao = data.data_criacao ? data.data_criacao : dateNow()
        this.deletado = data.deletado === true || data.deletado === false ? data.deletado : false
    }

    getInstalacao() {
        return {
            id: this.id,
            nome: this.nome,
            chave_api: this.chave_api,
            chave_api_prefixo: this.chave_api_prefixo,
            email_usuario: this.email_usuario,
            chave_admin: this.chave_admin,
            escopo: this.escopo,
            credencial_hash: this.credencial_hash,
            credencial_prefixo: this.credencial_prefixo,
            pasta_raiz_drive: this.pasta_raiz_drive,
            status: this.status,
            ultimo_uso: this.ultimo_uso,
            data_atualizacao: this.data_atualizacao,
            data_criacao: this.data_criacao,
            deletado: this.deletado,
        }
    }

    setInstalacao(data) {
        this.status = data.status ? data.status : this.status
        this.ultimo_uso = data.ultimo_uso ? data.ultimo_uso : this.ultimo_uso
        this.pasta_raiz_drive = data.pasta_raiz_drive ? data.pasta_raiz_drive : this.pasta_raiz_drive
        this.data_atualizacao = dateNow()
        return this.getInstalacao()
    }

}

module.exports = InstalacaoDomain;
