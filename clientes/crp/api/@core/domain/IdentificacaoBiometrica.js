
const uuid = require('uuid');
const dateNow = require('../../infrastructure/gateways/functions/data/getToday');
class IdentificacaoBiometricaDomain {

    constructor(data) {
        this.id = data.id ? data.id : uuid.v4()
        this.documento_id = data.documento_id
        this.user_id = data.user_id
        this.signatario_id = data.signatario_id
        this.perfil_biometria_id = data.perfil_biometria_id
        this.desafio_id = data.desafio_id
        this.bucket_wip_path = data.bucket_wip_path
        this.payload_sha256 = data.payload_sha256
        this.status = data.status
        this.data_atualizacao = data.data_atualizacao ? data.data_atualizacao : dateNow()
        this.data_criacao = data.data_criacao
    }

    getIdentificacaoBiometrica() {
        return {
            id: this.id,
            documento_id: this.documento_id,
            user_id: this.user_id,
            signatario_id: this.signatario_id,
            perfil_biometria_id: this.perfil_biometria_id,
            desafio_id: this.desafio_id,
            bucket_wip_path: this.bucket_wip_path,
            payload_sha256: this.payload_sha256,
            status: this.status,
            data_atualizacao: this.data_atualizacao,
            data_criacao: this.data_criacao,

        }
    }

    setIdentificacaoBiometrica(data) {
        this.id = data.id ? data.id : this.id
        this.documento_id = data.documento_id ? data.documento_id : this.documento_id
        this.user_id = data.user_id ? data.user_id : this.user_id
        this.signatario_id = data.signatario_id ? data.signatario_id : this.signatario_id
        this.perfil_biometria_id = data.perfil_biometria_id ? data.perfil_biometria_id : this.perfil_biometria_id
        this.desafio_id = data.desafio_id ? data.desafio_id : this.desafio_id
        this.bucket_wip_path = data.bucket_wip_path ? data.bucket_wip_path : this.bucket_wip_path
        this.payload_sha256 = data.payload_sha256 ? data.payload_sha256 : this.payload_sha256
        this.status = data.status ? data.status : this.status
        this.data_atualizacao = data.data_atualizacao ? data.data_atualizacao : this.data_atualizacao
        this.data_criacao = data.data_criacao ? data.data_criacao : this.data_criacao

        return this.getIdentificacaoBiometrica()
    }

}

module.exports = IdentificacaoBiometricaDomain;
