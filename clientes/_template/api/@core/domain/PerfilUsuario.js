
const uuid = require('uuid');
const dateNow = require('../../infrastructure/gateways/functions/data/getToday');
const { status_perfil_usuario, etapas_perfil_usuario } = require('../../certs');
class PerfilUsuarioDomain {

    constructor(data) {
        this.id = data.id ? data.id : uuid.v4()
        this.nome = data.nome ? data.nome : null
        this.cpf = data.cpf ? data.cpf : null
        this.cpf_bindex = data.cpf_bindex ? data.cpf_bindex : null

        this.telefone = data.telefone ? data.telefone : null
        this.status = data.status ? data.status : status_perfil_usuario.pendente
        this.etapa = data.etapa ? data.etapa : etapas_perfil_usuario.dados


        this.dados_extra = data.dados_extra ? data.dados_extra : null
        this.user_id = data.user_id ? data.user_id : null
        this.desafio_id = data.desafio_id ? data.desafio_id : null
        this.data_atualizacao = data.data_atualizacao ? data.data_atualizacao : dateNow()
        this.data_criacao = data.data_criacao ? data.data_criacao : dateNow()
        this.deletado = data.deletado === true || data.deletado === false ? data.deletado : false

    }

    getPerfilUsuario() {
        return {
            id: this.id,
            nome: this.nome,
            cpf: this.cpf,
            cpf_bindex: this.cpf_bindex,
            status: this.status,
            etapa: this.etapa,
            telefone: this.telefone,
            dados_extra: this.dados_extra,
            user_id: this.user_id,
            desafio_id: this.desafio_id,
            data_atualizacao: this.data_atualizacao,
            data_criacao: this.data_criacao,
            deletado: this.deletado,

        }
    }

    setPerfilUsuario(data) {
        this.id = data.id ? data.id : this.id
        this.nome = data.nome ? data.nome : this.nome
        this.cpf = data.cpf ? data.cpf : this.cpf
        this.cpf_bindex = data.cpf_bindex ? data.cpf_bindex : this.cpf_bindex
        this.telefone = data.telefone ? data.telefone : this.telefone
        this.status = data.status ? data.status : this.status
        this.etapa = data.etapa ? data.etapa : this.etapa
        this.dados_extra = data.dados_extra ? data.dados_extra : this.dados_extra
        this.user_id = data.user_id ? data.user_id : this.user_id
        this.desafio_id = data.desafio_id ? data.desafio_id : this.desafio_id
        this.data_atualizacao = dateNow()
        this.data_criacao = data.data_criacao ? data.data_criacao : this.data_criacao
        this.deletado = data.deletado === true || data.deletado === false ? data.deletado : false
        return this.getPerfilUsuario()
    }

}

module.exports = PerfilUsuarioDomain;
