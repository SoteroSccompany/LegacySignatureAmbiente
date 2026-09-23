
const uuid = require('uuid');
class Login {

    constructor(data) {
        this.id = data.id ? data.id : uuid.v4();
        this.session_id = data.session_id ? data.session_id : '';
        this.email = data.email ? data.email : '';
        this.senha = data.senha ? data.senha : '';
        this.token = data.token ? data.token : '';
        this.transito = data.transito ? data.transito : false;
        this.refresh_token = data.refresh_token ? data.refresh_token : '';
        this.desafio_id = data.desafio_id ? data.desafio_id : '';
        this.user_id = data.user_id ? data.user_id : '';
        this.email_verificado = data.email_verificado ? data.email_verificado : '';
        this.bloqueado = data.bloqueado ? data.bloqueado : '';
        this.role = data.role ? data.role : '';
    }

    getLogin() {
        const user = {
            id: this.id,
            session_id: this.session_id,
            token: this.token,
            refresh_token: this.refresh_token,
            user_id: this.user_id,
            transito: this.transito,
            email: this.email,
            senha: this.senha,
            desafio_id: this.desafio_id,
            email_verificado: this.email_verificado,
            bloqueado: this.bloqueado,
            role: this.role
        };
        return user;
    }

    getLoginUpdate() {
        return {
            id: this.id,
            token: this.token,
            desafio_id: this.desafio_id,
            transito: this.transito,
            data_atualizacao: this.data_atualizacao,
        }
    }

    setLogin(data) {
        this.id = data.id ? data.id : this.id;
        this.session_id = data.session_id ? data.session_id : this.session_id;
        this.email = data.email ? data.email : this.email;
        this.senha = data.senha ? data.senha : this.senha;
        this.token = data.token ? data.token : this.token;
        this.transito = data.transito === true || data.transito === false ? data.transito : this.transito;
        this.refresh_token = data.refresh_token ? data.refresh_token : this.refresh_token;
        this.user_id = data.user_id ? data.user_id : this.user_id;
        this.email_verificado = data.email_verificado >= 0 ? data.email_verificado : this.email_verificado;
        this.desafio_id = data.desafio_id ? data.desafio_id : this.desafio_id;
        this.bloqueado = data.bloqueado >= 0 ? data.bloqueado : this.bloqueado;
        this.role = data.role ? data.role : this.role;
        return this.getLogin();
    }



}

module.exports = Login;
