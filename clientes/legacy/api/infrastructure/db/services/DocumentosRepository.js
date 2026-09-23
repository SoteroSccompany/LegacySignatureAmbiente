
require('dotenv/config');
const knex = require("../config/databaseConection")();
const moment = require('moment');
const Log = require('../../../@core/usecase/Logs/databaseLog');
const ErrorStackParser = require('error-stack-parser');
const dateNow = require('../../gateways/functions/data/getToday');
const BaseRepository = require('.');
const { views } = require('../../../certs');
const logs = require('../../../Logs');

class DocumentosRepository extends BaseRepository {

    constructor() {
        super({ tableName: 'tab_documentos', knexOrTransaction: knex })
    }

    async createDocumentos(data) {
        try {
            const response = await knex('tab_documentos').insert(data)
            return { status: true, data: response, msg: "Documentos criado com sucesso!" }
        } catch (error) {
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(error);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            const dataLog = {
                data_recive: JSON.stringify(data),
                err: error,
                descricaoDoErro: 'Exeption estourada. RepositorioDocumentos - createDocumentos',
                linhaDoErro: lineError,
                nomeDoArquivo: fileName,
                data_criacao: dateNow(),
            }
            logs.getInstance().fatal(dataLog, 'Erro no RepositorioDocumentos - createDocumentos')
            return { status: false, error: error, msg: "Não foi possivel criar o Documentos!" }
        }
    }

    async updateDocumentos(data) {
        try {
            const check = await this.getDocumentosById(data)
            if (check.status && check.exit) {
                const response = await knex('tab_documentos').update(data).where('id', data.id)
                return { status: true, data: response, msg: "Documentos atualizado com sucesso!" }
            } else {
                return { status: false, msg: "Documentos não encontrado!" }
            }
        } catch (error) {
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(error);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            const dataLog = {
                data_recive: JSON.stringify(data),
                err: error,
                descricaoDoErro: 'Exeption estourada. RepositorioDocumentos - updateDocumentos',
                linhaDoErro: lineError,
                nomeDoArquivo: fileName,
                data_criacao: dateNow(),
            }
            logs.getInstance().fatal(dataLog, 'Erro no RepositorioDocumentos - updateDocumentos')
            return { status: false, error: error, msg: "Não foi possivel atualizar o Documentos!" }
        }
    }

    async deleteDocumentos(data) {
        try {
            const check = await this.getDocumentosById(data)
            if (check.status && check.exit) {
                const response = await knex('tab_documentos').update({ deletado: true, data_atualizacao: dateNow() }).where('id', data.id)
                return { status: true, data: response, msg: "Documentos deletado com sucesso!" }
            } else {
                return { status: false, msg: "Documentos não encontrado!" }
            }
        } catch (error) {
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(error);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            const dataLog = {
                data_recive: JSON.stringify(data),
                err: error,
                descricaoDoErro: 'Exeption estourada. RepositorioDocumentos - deleteDocumentos',
                linhaDoErro: lineError,
                nomeDoArquivo: fileName,
                data_criacao: dateNow(),
            }
            logs.getInstance().fatal(dataLog, 'Erro no RepositorioDocumentos - deleteDocumentos')
            return { status: false, error: error, msg: "Não foi possivel deletar o Documentos!" }
        }
    }

    async getDocumentos() {
        try {
            const response = await knex('tab_documentos').select('*').where('deletado', false)
            if (response.length > 0) {
                return { status: true, exit: true, data: response, msg: "Documentos encontrado com sucesso!" }
            } else {
                return { status: true, exit: false, msg: "Documentos não encontrado!" }
            }
        } catch (error) {
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(error);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            const dataLog = {
                err: error,
                descricaoDoErro: 'Exeption estourada. RepositorioDocumentos - getDocumentos',
                linhaDoErro: lineError,
                nomeDoArquivo: fileName,
                data_criacao: dateNow(),
            }
            logs.getInstance().fatal(dataLog, 'Erro no RepositorioDocumentos - getDocumentos')
            return { status: false, error: error, msg: "Não foi possivel buscar o Documentos!" }
        }

    }


    async getDocumentosById(data) {
        try {
            const response = await knex('tab_documentos').select('*').where('id', data.id).andWhere('deletado', false)
            if (response.length > 0) {
                return { status: true, exit: true, data: response[0], msg: "Documentos encontrado com sucesso!" }
            } else {
                return { status: true, exit: false, msg: "Documentos não encontrado!" }
            }
        } catch (error) {
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(error);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            const dataLog = {
                data_recive: data,
                err: error,
                descricaoDoErro: 'Exeption estourada. RepositorioDocumentos - getDocumentosById',
                linhaDoErro: lineError,
                nomeDoArquivo: fileName,
                data_criacao: dateNow(),
            }
            logs.getInstance().fatal(dataLog, 'Erro no RepositorioDocumentos - getDocumentosById')
            return { status: false, error: error, msg: "Não foi possivel buscar o Documentos!" }
        }

    }

    async getDocumentosByQuery(data) {
        try {
            const resp = await this.getByQuery(data)
            if (!resp.status) return { status: true, data: [], msg: "Não foi possivel buscar o Documentos!" }
            return { status: true, data: resp.data, msg: resp.msg }
        } catch (error) {
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(error);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            Log({ ...data, error, descricaoDoErro: 'Exeption estourada. RepositorioDocumentos - getDocumentosByLimit', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            return { status: false, error: error, msg: "Não foi possivel buscar o Documentos!" }
        }

    }

    async getDocumentosByQueryIdHistorico(data, field, condition) {
        try {
            const resp = await this.getByQueryTableUniqWhere(data, view_historico, field, condition)
            if (!resp.status) return { status: true, data: [], msg: "Não foi possivel buscar o Documentos!" }
            return { status: true, data: resp.data, msg: resp.msg }
        } catch (error) {
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(error);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            Log({ ...data, error, descricaoDoErro: 'Exeption estourada. RepositorioDocumentos - getDocumentosByLimit', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            return { status: false, error: error, msg: "Não foi possivel buscar o Documentos!" }
        }

    }


}

module.exports = new DocumentosRepository();

