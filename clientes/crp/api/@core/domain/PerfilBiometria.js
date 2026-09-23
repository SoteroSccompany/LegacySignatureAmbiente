
const uuid = require('uuid');
const dateNow = require('../../infrastructure/gateways/functions/data/getToday');
class PerfilBiometriaDomain {

    constructor(data) {
        this.id = data.id ? data.id : uuid.v4()
        this.rosto_embeddign = data.rosto_embeddign
        this.bucket_wip_path = data.bucket_wip_path
        this.termo_id = data.termo_id
        this.perfil_id = data.perfil_id
        this.desafio_id = data.desafio_id
        this.aprovado_por = data.aprovado_por
        this.aprovado_em = data.aprovado_em
        this.data_atualizacao = data.data_atualizacao ? data.data_atualizacao : dateNow()
        this.data_criacao = data.data_criacao ? data.data_criacao : dateNow()
        this.deletado = data.deletado ? data.deletado : false

    }

    getPerfilBiometria() {
        return {
            id: this.id,
            rosto_embeddign: this.rosto_embeddign,
            bucket_wip_path: this.bucket_wip_path,
            termo_id: this.termo_id,
            perfil_id: this.perfil_id,
            aprovado_por: this.aprovado_por,
            aprovado_em: this.aprovado_em,
            desafio_id: this.desafio_id,
            data_atualizacao: this.data_atualizacao,
            data_criacao: this.data_criacao,
            deletado: this.deletado

        }
    }

    setPerfilBiometria(data) {
        this.id = data.id ? data.id : this.id
        this.rosto_embeddign = data.rosto_embeddign ? data.rosto_embeddign : this.rosto_embeddign
        this.bucket_wip_path = data.bucket_wip_path ? data.bucket_wip_path : this.bucket_wip_path
        this.termo_id = data.termo_id ? data.termo_id : this.termo_id
        this.perfil_id = data.perfil_id ? data.perfil_id : this.perfil_id
        this.desafio_id = data.desafio_id ? data.desafio_id : this.desafio_id
        this.aprovado_por = data.aprovado_por ? data.aprovado_por : this.aprovado_por
        this.aprovado_em = data.aprovado_em ? data.aprovado_em : this.aprovado_em
        this.data_atualizacao = data.data_atualizacao ? data.data_atualizacao : this.data_atualizacao
        this.data_criacao = data.data_criacao ? data.data_criacao : this.data_criacao
        this.deletado = data.deletado ? data.deletado : this.deletado
        return this.getPerfilBiometria()
    }

}

module.exports = PerfilBiometriaDomain;
