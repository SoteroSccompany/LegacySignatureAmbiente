
const uuid = require('uuid');
const dateNow = require('../../infrastructure/gateways/functions/data/getToday');

class ArquivoDriveDomain {

    constructor(data) {
        this.id = data.id ? data.id : uuid.v4()
        this.pedido_id = data.pedido_id ? data.pedido_id : null
        this.tipo = data.tipo ? data.tipo : null
        this.drive_file_id = data.drive_file_id ? data.drive_file_id : null
        this.nome = data.nome ? data.nome : null
        this.tamanho = data.tamanho ? data.tamanho : null
        this.mime_type = data.mime_type ? data.mime_type : null
        this.sha256 = data.sha256 ? data.sha256 : null
        this.data_atualizacao = data.data_atualizacao ? data.data_atualizacao : dateNow()
        this.data_criacao = data.data_criacao ? data.data_criacao : dateNow()
        this.deletado = data.deletado === true || data.deletado === false ? data.deletado : false
    }

    getArquivoDrive() {
        return {
            id: this.id,
            pedido_id: this.pedido_id,
            tipo: this.tipo,
            drive_file_id: this.drive_file_id,
            nome: this.nome,
            tamanho: this.tamanho,
            mime_type: this.mime_type,
            sha256: this.sha256,
            data_atualizacao: this.data_atualizacao,
            data_criacao: this.data_criacao,
            deletado: this.deletado,
        }
    }

}

module.exports = ArquivoDriveDomain;
