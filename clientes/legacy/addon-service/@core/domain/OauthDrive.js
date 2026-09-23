
const uuid = require('uuid');
const dateNow = require('../../infrastructure/gateways/functions/data/getToday');

// Consentimento do usuário para o Drive (drive + email), exigido antes do
// vínculo da lsak_ e de qualquer pedido — a SA impersona com DWD, mas só
// depois que a própria conta autoriza pelo /oauth/start.
class OauthDriveDomain {

    constructor(data) {
        this.id = data.id ? data.id : uuid.v4()
        this.email = data.email ? data.email : null
        this.refresh_token = data.refresh_token ? data.refresh_token : null
        this.autorizado_em = data.autorizado_em ? data.autorizado_em : dateNow()
        this.data_atualizacao = data.data_atualizacao ? data.data_atualizacao : dateNow()
        this.data_criacao = data.data_criacao ? data.data_criacao : dateNow()
        this.deletado = data.deletado === true || data.deletado === false ? data.deletado : false
    }

    getOauthDrive() {
        return {
            id: this.id,
            email: this.email,
            refresh_token: this.refresh_token,
            autorizado_em: this.autorizado_em,
            data_atualizacao: this.data_atualizacao,
            data_criacao: this.data_criacao,
            deletado: this.deletado,
        }
    }

}

module.exports = OauthDriveDomain;
