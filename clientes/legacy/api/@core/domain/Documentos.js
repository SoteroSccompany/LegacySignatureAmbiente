
const uuid = require('uuid');
const moment = require('moment');
const dateNow = require('../../infrastructure/gateways/functions/data/getToday');
class DocumentosDomain {

    constructor(data) {
        this.id = data.id ? data.id : uuid.v4()
        this.nome_documento = data.nome_documento
        this.documento_nome = data.documento_nome
        this.bucket_wip_path = data.bucket_wip_path
        this.bucket_valt_path = data.bucket_valt_path
        this.status = data.status
        this.termo_id = data.termo_id
        this.hash_original = data.hash_original
        this.hash_final = data.hash_final
        this.hash_final_em = data.hash_final_em ? moment(data.hash_final_em).format('YYYY-MM-DD HH:mm:ss') : data.hash_final_em
        this.criado_em = data.criado_em ? moment(data.criado_em).format('YYYY-MM-DD HH:mm:ss') : dateNow()
    }

    getDocumentos() {
        return {
            id: this.id,
            nome_documento: this.nome_documento,
            documento_nome: this.documento_nome,
            bucket_wip_path: this.bucket_wip_path,
            bucket_valt_path: this.bucket_valt_path,
            status: this.status,
            termo_id: this.termo_id,
            hash_original: this.hash_original,
            hash_final: this.hash_final,
            hash_final_em: this.hash_final_em ? moment(this.hash_final_em).format('YYYY-MM-DD HH:mm:ss') : this.hash_final_em,
            criado_em: this.criado_em ? moment(this.criado_em).format('YYYY-MM-DD HH:mm:ss') : this.criado_em,

        }
    }

    setDocumentos(data) {
        this.id = data.id ? data.id : this.id
        this.nome_documento = data.nome_documento ? data.nome_documento : this.nome_documento
        this.documento_nome = data.documento_nome ? data.documento_nome : this.documento_nome
        this.bucket_wip_path = data.bucket_wip_path ? data.bucket_wip_path : this.bucket_wip_path
        this.bucket_valt_path = data.bucket_valt_path ? data.bucket_valt_path : this.bucket_valt_path
        this.status = data.status ? data.status : this.status
        this.termo_id = data.termo_id ? data.termo_id : this.termo_id
        this.hash_original = data.hash_original ? data.hash_original : this.hash_original
        this.hash_final = data.hash_final ? data.hash_final : this.hash_final
        this.hash_final_em = data.hash_final_em ? moment(data.hash_final_em).format('YYYY-MM-DD HH:mm:ss') : this.hash_final_em
        this.criado_em = data.criado_em ? moment(data.criado_em).format('YYYY-MM-DD HH:mm:ss') : this.criado_em

        return this.getDocumentos()
    }

}

module.exports = DocumentosDomain;
