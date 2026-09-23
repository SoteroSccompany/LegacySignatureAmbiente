
const uuid = require('uuid');
const dateNow = require('../../infrastructure/gateways/functions/data/getToday');
const { statusUsuarioStaging } = require('../../certs/index');

class UsuarioStagingDomain {

    constructor(data) {
        this.id = data.id ? data.id : uuid.v4()
        this.email = data.email ? data.email : ''
        this.senha_hash = data.senha_hash ? data.senha_hash : ''
        this.role = data.role
        this.origem = data.origem
        this.origem_id = data.origem_id ? data.origem_id : null
        this.status = data.status ? data.status : statusUsuarioStaging.pendente
        this.senha_redefinida = data.senha_redefinida ? data.senha_redefinida : false
        this.dois_fatores_ok = data.dois_fatores_ok ? data.dois_fatores_ok : false
        this.perfil_ok = data.perfil_ok ? data.perfil_ok : false
        this.user_id = data.user_id ? data.user_id : null
        this.nome = data.nome ? data.nome : null
        this.cpf_encrypt = data.cpf_encrypt ? data.cpf_encrypt : null
        this.cpf_bindex = data.cpf_bindex ? data.cpf_bindex : null
        this.meta_dados = data.meta_dados ? data.meta_dados : {}
        this.criado_em = data.criado_em ? data.criado_em : dateNow()
        this.atualizado_em = data.atualizado_em ? data.atualizado_em : dateNow()
        this.expira_em = data.expira_em ? data.expira_em : null
        this.deletado = data.deletado === true || data.deletado === false ? data.deletado : false
    }

    getUsuarioStaging() {
        return {
            id: this.id,
            email: this.email,
            senha_hash: this.senha_hash,
            role: this.role,
            origem: this.origem,
            origem_id: this.origem_id,
            status: this.status,
            senha_redefinida: this.senha_redefinida,
            dois_fatores_ok: this.dois_fatores_ok,
            perfil_ok: this.perfil_ok,
            user_id: this.user_id,
            nome: this.nome,
            cpf_encrypt: this.cpf_encrypt,
            cpf_bindex: this.cpf_bindex,
            meta_dados: this.meta_dados,
            criado_em: this.criado_em,
            atualizado_em: this.atualizado_em,
            expira_em: this.expira_em,
            deletado: this.deletado,
        }
    }

    setUsuarioStaging(data) {
        this.id = data.id ? data.id : this.id
        this.email = data.email ? data.email : this.email
        this.senha_hash = data.senha_hash ? data.senha_hash : this.senha_hash
        this.role = data.role !== undefined ? data.role : this.role
        this.status = data.status ? data.status : this.status
        this.senha_redefinida = data.senha_redefinida === true || data.senha_redefinida === false ? data.senha_redefinida : this.senha_redefinida
        this.dois_fatores_ok = data.dois_fatores_ok === true || data.dois_fatores_ok === false ? data.dois_fatores_ok : this.dois_fatores_ok
        this.perfil_ok = data.perfil_ok === true || data.perfil_ok === false ? data.perfil_ok : this.perfil_ok
        this.user_id = data.user_id ? data.user_id : this.user_id
        this.atualizado_em = dateNow()
        this.deletado = data.deletado === true || data.deletado === false ? data.deletado : this.deletado
        return this.getUsuarioStaging()
    }

}

module.exports = UsuarioStagingDomain;
