
const uuid = require('uuid');
const dateNow = require('../../infrastructure/gateways/functions/data/getToday');
const moment = require('moment');
const { confiDoisFatores } = require('../../certs/index')


class DesafioAutenticacaoDomain {

    constructor(data) {
        this.id = data.id ? data.id : uuid.v4()
        this.user_id = data.user_id
        this.document_id = data.document_id
        this.sessao_id = data.sessao_id
        this.tipo_desafio = data.tipo_desafio
        this.desafio_hash = data.desafio_hash
        this.usado = data.usado ? data.usado : false
        this.criado_em = moment().format('YYYY-MM-DD HH:mm:ss');
        this.expira_em = moment(this.criado_em).add(confiDoisFatores.time, confiDoisFatores.timeType).format('YYYY-MM-DD HH:mm:ss');
        this.consumido_em = data.consumido_em;
        this.solicitacao_ip = data.solicitacao_ip
        this.solicitacao_porta_logica = data.solicitacao_porta_logica
        this.solicitacao_user_agent_hash = data.solicitacao_user_agent_hash
        this.confirmacao_ip = data.confirmacao_ip
        this.confirmacao_porta_logica = data.confirmacao_porta_logica
        this.confirmacao_user_agent_hash = data.confirmacao_user_agent_hash
        this.deletado = data.deletado === true || data.deletado === false ? data.deletado : false

    }

    getDesafioAutenticacao() {
        return {
            id: this.id,
            user_id: this.user_id,
            document_id: this.document_id,
            sessao_id: this.sessao_id,
            desafio_hash: this.desafio_hash,
            tipo_desafio: this.tipo_desafio,
            usado: this.usado,
            expira_em: moment(this.expira_em).format('YYYY-MM-DD HH:mm:ss'),
            criado_em: moment(this.criado_em).format('YYYY-MM-DD HH:mm:ss'),
            consumido_em: this.consumido_em ? moment(this.consumido_em).format('YYYY-MM-DD HH:mm:ss') : null,
            solicitacao_ip: this.solicitacao_ip,
            solicitacao_porta_logica: this.solicitacao_porta_logica,
            solicitacao_user_agent_hash: this.solicitacao_user_agent_hash,
            confirmacao_ip: this.confirmacao_ip,
            confirmacao_porta_logica: this.confirmacao_porta_logica,
            confirmacao_user_agent_hash: this.confirmacao_user_agent_hash,
            deletado: this.deletado,

        }
    }

    setDesafioAutenticacao(data) {
        this.id = data.id ? data.id : this.id
        this.user_id = data.user_id ? data.user_id : this.user_id
        this.document_id = data.document_id ? data.document_id : this.document_id
        this.sessao_id = data.sessao_id ? data.sessao_id : this.sessao_id
        this.tipo_desafio = data.tipo_desafio ? data.tipo_desafio : this.tipo_desafio
        this.desafio_hash = data.desafio_hash ? data.desafio_hash : this.desafio_hash
        this.usado = data.usado ? data.usado : this.usado
        this.expira_em = data.expira_em ? moment(data.expira_em).format('YYYY-MM-DD HH:mm:ss') : this.expira_em
        this.criado_em = data.criado_em ? moment(data.criado_em).format('YYYY-MM-DD HH:mm:ss') : this.criado_em
        this.consumido_em = data.consumido_em ? moment(data.consumido_em).format('YYYY-MM-DD HH:mm:ss') : this.consumido_em
        this.solicitacao_ip = data.solicitacao_ip ? data.solicitacao_ip : this.solicitacao_ip
        this.solicitacao_porta_logica = data.solicitacao_porta_logica ? data.solicitacao_porta_logica : this.solicitacao_porta_logica
        this.solicitacao_user_agent_hash = data.solicitacao_user_agent_hash ? data.solicitacao_user_agent_hash : this.solicitacao_user_agent_hash
        this.confirmacao_ip = data.confirmacao_ip ? data.confirmacao_ip : this.confirmacao_ip
        this.confirmacao_porta_logica = data.confirmacao_porta_logica ? data.confirmacao_porta_logica : this.confirmacao_porta_logica
        this.confirmacao_user_agent_hash = data.confirmacao_user_agent_hash ? data.confirmacao_user_agent_hash : this.confirmacao_user_agent_hash
        this.deletado = data.deletado === true || data.deletado === false ? data.deletado : false

        return this.getDesafioAutenticacao()
    }

}

module.exports = DesafioAutenticacaoDomain;
