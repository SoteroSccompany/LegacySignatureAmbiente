
const uuid = require('uuid');
const dateNow = require('../../infrastructure/gateways/functions/data/getToday');
class RequestsDomain {

    constructor(data) {
        this.id = data.id ? data.id : uuid.v4()
        this.method = data.method
        this.endpoint = data.endpoint
        this.ip = data.ip ? data.ip : '127.0.0.1'
        this.body = data.body
        this.query = data.query
        this.params = data.params
        this.headers = data.headers
        this.files = data.files ? JSON.stringify(data.files) : JSON.stringify([])
        this.status_code = data.status_code
        this.duration_ms = data.duration_ms
        this.user_id = data.user_id ? data.user_id : null
        this.data_criacao = data.data_criacao
        this.data_atualizacao = data.data_atualizacao ? data.data_atualizacao : dateNow()
        this.deletado = data.deletado === true || data.deletado === false ? data.deletado : false

    }

    getRequests() {
        return {
            id: this.id,
            method: this.method,
            endpoint: this.endpoint,
            ip: this.ip,
            body: this.body,
            query: this.query,
            params: this.params,
            headers: this.headers,
            files: this.files,
            status_code: this.status_code,
            duration_ms: this.duration_ms,
            user_id: this.user_id,
            data_criacao: this.data_criacao,
            data_atualizacao: this.data_atualizacao,
            deletado: this.deletado,

        }
    }

    setRequests(data) {
        this.id = data.id ? data.id : this.id
        this.method = data.method ? data.method : this.method
        this.endpoint = data.endpoint ? data.endpoint : this.endpoint
        this.ip = data.ip ? data.ip : this.ip
        this.body = data.body ? data.body : this.body
        this.query = data.query ? data.query : this.query
        this.params = data.params ? data.params : this.params
        this.headers = data.headers ? data.headers : this.headers
        this.files = data.files ? JSON.stringify(data.files) : this.files
        this.status_code = data.status_code ? data.status_code : this.status_code
        this.duration_ms = data.duration_ms ? data.duration_ms : this.duration_ms
        this.user_id = data.user_id ? data.user_id : this.user_id
        this.data_criacao = data.data_criacao ? data.data_criacao : this.data_criacao
        this.data_atualizacao = data.data_atualizacao ? data.data_atualizacao : this.data_atualizacao
        this.deletado = data.deletado === true || data.deletado === false ? data.deletado : false

        return this.getRequests()
    }

}

module.exports = RequestsDomain;
