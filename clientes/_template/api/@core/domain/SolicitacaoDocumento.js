
const uuid = require('uuid');
const moment = require('moment');
const dateNow = require('../../infrastructure/gateways/functions/data/getToday');
class SolicitacaoDocumentoDomain {

    constructor(data) {
        this.id = data.id ? data.id : uuid.v4()
        this.user_id = data.user_id
        this.status = data.status
        this.object_name = data.object_name
        this.bucket_wip_path = data.bucket_wip_path
        this.desafio_id = data.desafio_id
        this.erro_msg = data.erro_msg
        this.meta_dados = data.meta_dados
        this.sessao_id = data.sessao_id
        this.documento_id = data.documento_id || null
        this.solicitacao_origem_id = data.solicitacao_origem_id || null
        this.data_criacao = data.data_criacao ? moment(data.data_criacao).format('YYYY-MM-DD HH:mm:ss') : dateNow()
        this.data_atualizacao = data.data_atualizacao ? moment(data.data_atualizacao).format('YYYY-MM-DD HH:mm:ss') : dateNow()

    }

    getSolicitacaoDocumento() {
        return {
            id: this.id,
            user_id: this.user_id,
            status: this.status,
            object_name: this.object_name,
            bucket_wip_path: this.bucket_wip_path,
            desafio_id: this.desafio_id,
            erro_msg: this.erro_msg,
            meta_dados: this.meta_dados,
            sessao_id: this.sessao_id,
            documento_id: this.documento_id,
            solicitacao_origem_id: this.solicitacao_origem_id,
            data_criacao: this.data_criacao ? moment(this.data_criacao).format('YYYY-MM-DD HH:mm:ss') : this.data_criacao,
            data_atualizacao: this.data_atualizacao ? moment(this.data_atualizacao).format('YYYY-MM-DD HH:mm:ss') : this.data_atualizacao,

        }
    }

    setSolicitacaoDocumento(data) {
        this.id = data.id ? data.id : this.id
        this.user_id = data.user_id ? data.user_id : this.user_id
        this.status = data.status ? data.status : this.status
        this.object_name = data.object_name ? data.object_name : this.object_name
        this.bucket_wip_path = data.bucket_wip_path ? data.bucket_wip_path : this.bucket_wip_path
        this.desafio_id = data.desafio_id ? data.desafio_id : this.desafio_id
        this.erro_msg = data.erro_msg ? data.erro_msg : this.erro_msg
        this.meta_dados = data.meta_dados ? data.meta_dados : this.meta_dados
        this.sessao_id = data.sessao_id ? data.sessao_id : this.sessao_id
        this.documento_id = data.documento_id !== undefined ? data.documento_id : this.documento_id
        this.solicitacao_origem_id = data.solicitacao_origem_id !== undefined ? data.solicitacao_origem_id : this.solicitacao_origem_id
        this.data_criacao = data.data_criacao ? moment(data.data_criacao).format('YYYY-MM-DD HH:mm:ss') : this.data_criacao
        this.data_atualizacao = data.data_atualizacao ? moment(data.data_atualizacao).format('YYYY-MM-DD HH:mm:ss') : this.data_atualizacao

        return this.getSolicitacaoDocumento()
    }

}

module.exports = SolicitacaoDocumentoDomain;
