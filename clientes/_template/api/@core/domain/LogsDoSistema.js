
const uuid = require('uuid')
const dateNow = require('../../infrastructure/gateways/functions/data/getToday')


class LogsDoSistema {

    constructor(data) {
        this.id = data.id ? data.id : uuid.v4();
        this.descricaoDoErro = data.descricaoDoErro ? data.descricaoDoErro : '';
        this.linhaDoErro = data.linhaDoErro ? data.linhaDoErro : '';
        this.nomeDoArquivo = data.nomeDoArquivo ? data.nomeDoArquivo : '';
        this.data_criacao = data.data_criacao ? data.data_criacao : dateNow();
        this.data_atualizacao = data.data_atualizacao ? data.data_atualizacao : dateNow();
        this.deletado = data.deletado === 0 || data.deletado === '0' || data.deletado === true || data.deletado === false ? data.deletado : false;
    }


    getLogsDoSistema() {
        return {
            id: this.id,
            descricaoDoErro: this.descricaoDoErro,
            linhaDoErro: this.linhaDoErro,
            nomeDoArquivo: this.nomeDoArquivo,
            data_criacao: this.data_criacao,
            data_atualizacao: this.data_atualizacao,
            deletado: this.deletado

        }
    }

    setLogsDoSistema(data) {
        this.id = data.id ? data.id : uuid.v4();
        this.descricaoDoErro = data.descricaoDoErro ? data.descricaoDoErro : '';
        this.linhaDoErro = data.linhaDoErro ? data.linhaDoErro : '';
        this.nomeDoArquivo = data.nomeDoArquivo ? data.nomeDoArquivo : '';
        this.data_criacao = data.data_criacao ? data.data_criacao : dateNow();
        this.data_atualizacao = data.data_atualizacao ? data.data_atualizacao : dateNow();
        this.deletado = data.deletado === 0 || data.deletado === '0' || data.deletado === true || data.deletado === false ? data.deletado : false;
    }


}

module.exports = LogsDoSistema;

