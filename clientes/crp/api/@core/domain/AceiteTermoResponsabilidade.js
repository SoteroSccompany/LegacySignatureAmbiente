
const uuid = require('uuid');
const dateNow = require('../../infrastructure/gateways/functions/data/getToday');
class AceiteTermoResponsabilidadeDomain {

    constructor(data) {
        this.id = data.id ? data.id : uuid.v4()
        this.termo_id = data.termo_id
        this.user_id = data.user_id
        this.login_id = data.login_id
        this.termo_hash = data.termo_hash
        this.aceito_em = data.aceito_em
        this.documento_id = data.documento_id ? data.documento_id : null
        this.signatario_id = data.signatario_id ? data.signatario_id : null
        this.data_criacao = data.data_criacao

    }

    getAceiteTermoResponsabilidade() {
        return {
            id: this.id,
            termo_id: this.termo_id,
            user_id: this.user_id,
            login_id: this.login_id,
            termo_hash: this.termo_hash,
            aceito_em: this.aceito_em,
            documento_id: this.documento_id,
            signatario_id: this.signatario_id,
            data_criacao: this.data_criacao
        }
    }

    setAceiteTermoResponsabilidade(data) {
        this.id = data.id ? data.id : this.id
        this.termo_id = data.termo_id ? data.termo_id : this.termo_id
        this.user_id = data.user_id ? data.user_id : this.user_id
        this.login_id = data.login_id ? data.login_id : this.login_id
        this.termo_hash = data.termo_hash ? data.termo_hash : this.termo_hash
        this.aceito_em = data.aceito_em ? data.aceito_em : this.aceito_em
        this.documento_id = data.documento_id ? data.documento_id : this.documento_id
        this.signatario_id = data.signatario_id ? data.signatario_id : this.signatario_id
        this.data_criacao = data.data_criacao ? data.data_criacao : this.data_criacao

        return this.getAceiteTermoResponsabilidade()
    }

}

module.exports = AceiteTermoResponsabilidadeDomain;
