
const uuid = require('uuid');
const dateNow = require('../../infrastructure/gateways/functions/data/getToday')
class ArquivosDomain {

    constructor(data) {
        this.id = data.id ? data.id : uuid.v4()
        this.nomeArquivo = data.nomeArquivo
        this.path = data.path
        this.tamanhoArquivo = data.tamanhoArquivo
        this.tipoArquivo = data.tipoArquivo
        this.data_criacao = data.data_criacao
        this.data_atualizacao = data.data_atualizacao ? data.data_atualizacao : dateNow()
        this.deletado = data.deletado === true || data.deletado === false ? data.deletado : false

    }

    getArquivos() {
        return {
            id: this.id,
            nomeArquivo: this.nomeArquivo,
            path: this.path,
            tamanhoArquivo: this.tamanhoArquivo,
            tipoArquivo: this.tipoArquivo,
            data_criacao: this.data_criacao,
            data_atualizacao: this.data_atualizacao,
            deletado: this.deletado,

        }
    }

    setArquivos(data) {
        this.id = data.id ? data.id : this.id
        this.nomeArquivo = data.nomeArquivo ? data.nomeArquivo : this.nomeArquivo
        this.path = data.path ? data.path : this.path
        this.tamanhoArquivo = data.tamanhoArquivo ? data.tamanhoArquivo : this.tamanhoArquivo
        this.tipoArquivo = data.tipoArquivo ? data.tipoArquivo : this.tipoArquivo
        this.data_criacao = data.data_criacao ? data.data_criacao : this.data_criacao
        this.data_atualizacao = data.data_atualizacao ? data.data_atualizacao : this.data_atualizacao
        this.deletado = data.deletado === true || data.deletado === false ? data.deletado : false

        return this.getArquivos()
    }

}

module.exports = ArquivosDomain;
