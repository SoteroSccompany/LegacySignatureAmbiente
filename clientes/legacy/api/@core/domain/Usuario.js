
const uuid = require('uuid');
class usuarios {

    constructor(data) {
        this.id = data.id !== undefined ? data.id : uuid.v4();
        this.email = data.email ? data.email : '';
        this.dois_fatores = data.dois_fatores ? data.dois_fatores : false;
        this.segredo_dois_fatores = data.segredo_dois_fatores;
        this.email_verificado = data.email_verificado
        this.senha = data.senha ? data.senha : '';
        this.data_criacao = data.data_criacao ? data.data_criacao : '';
        this.data_atualizacao = data.data_atualizacao ? data.data_atualizacao : '';
        this.role = data.role;
        this.bloqueado_descricao = data.bloqueado_descricao;
        this.bloqueado = data.bloqueado == 0 || data.bloqueado > 0 ? data.bloqueado : '';
        this.codigo_hash = data.codigo_hash;
        this.tokenValidator = data.tokenValidator ? data.tokenValidator : '';
        this.novaSenha = data.novaSenha ? data.novaSenha : "";
        this.trocar_senha = data.trocar_senha ? data.trocar_senha : false;
        this.deletado = data.deletado ? data.deletado : false;
    }

    getUser() {
        const user = {
            id: this.id,
            email: this.email,
            senha: this.senha,
            data_criacao: this.data_criacao,
            role: this.role,
            bloqueado: this.bloqueado,
            bloqueado_descricao: this.bloqueado_descricao,
            dois_fatores: this.dois_fatores,
            segredo_dois_fatores: this.segredo_dois_fatores,
            email_verificado: this.email_verificado,
            codigo_hash: this.codigo_hash,
            data_atualizacao: this.data_atualizacao,
            trocar_senha: this.trocar_senha,
            deletado: this.deletado

        };
        return user;
    }

    setUser(data) {
        this.id = data.id ? data.id : this.id;
        this.email = data.email ? data.email : this.email;
        this.email_verificado = data.email_verificado ? data.email_verificado : this.email_verificado;
        this.dois_fatores = data.dois_fatores ? data.dois_fatores : this.dois_fatores;
        this.segredo_dois_fatores = data.segredo_dois_fatores ? data.segredo_dois_fatores : this.segredo_dois_fatores;
        this.senha = data.senha ? data.senha : this.senha;
        this.data_criacao = data.data_criacao ? data.data_criacao : this.data_criacao;
        this.data_atualizacao = data.data_atualizacao ? data.data_atualizacao : this.data_atualizacao;
        this.role = data.role ? data.role : this.role;
        this.bloqueado = data.bloqueado == 0 || data.bloqueado > 0 ? data.bloqueado : this.bloqueado;
        this.tokenValidator = data.tokenValidator ? data.tokenValidator : this.tokenValidator;
        this.novaSenha = data.novaSenha ? data.novaSenha : this.novaSenha;
        this.codigo_hash = data.codigo_hash ? data.codigo_hash : this.codigo_hash;
        this.trocar_senha = data.trocar_senha === true || data.trocar_senha === false ? data.trocar_senha : this.trocar_senha;
        this.deletado = data.deletado ? data.deletado : this.deletado;
        return this.getUser()
    }



}

module.exports = usuarios;
