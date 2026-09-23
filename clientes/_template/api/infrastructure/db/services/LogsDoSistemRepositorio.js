
const knex = require("../config/databaseConection")(process.env.DATABASEWPPREV);
const Log = require('../../../@core/usecase/Logs/databaseLog')
const ErrorStackParser = require('error-stack-parser');
const dateNow = require('../../gateways/functions/data/getToday');
const BaseRepository = require(".");


class LogsDoSistemRepositorio extends BaseRepository {


    constructor() {
        super({ tableName: 'tab_logs_do_sistema', knexOrTransaction: knex })
    }


    async getAll() {
        try {
            const response = await knex.select().where({ deletado: 0 }).table('tab_logs_do_sistema').orderBY('data_criacao', 'desc')
            if (response.length > 0) {
                return { status: true, exit: true, logs: response }
            } else {
                return { status: true, exit: false, msg: 'Nenhum Log encontrado!' }
            }
        } catch (err) {
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(err);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            Log({ err, descricaoDoErro: 'Exeption estourada. Repositorio LogsSystem', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            return { status: false, exit: false, error: err, msg: 'Erro ao buscar dados de LogsSystem!' }
        }
    }

    async getLogsByQuery(data) {
        try {
            const resp = await this.getByQuery(data)
            if (!resp.status) return { status: true, data: [], msg: `${resp.msg} da marca.` }
            return { status: true, data: resp.data, msg: resp.msg }
        } catch (err) {
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(err);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            Log({ ...data, err, descricaoDoErro: 'Exeption estourada. Repositorio LogsSystem', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            return { status: false, exit: false, error: err, msg: 'Erro ao buscar dados de LogsSystem!' }
        }
    }

    async getById(data) {
        try {
            const response = await knex('tab_logs_do_sistema').select().where({ id: data.id })
            if (response.length > 0) {
                return { status: true, exit: true, response: response[0] }
            } else {
                return { status: true, exit: false, msg: 'Nenhum Log encontrado!' }
            }
        } catch (err) {
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(err);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            Log({ ...data, err, descricaoDoErro: 'Exeption estourada. Repositorio LogsSystem', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            return { status: false, exit: false, error: err, msg: 'Erro ao buscar dados de LogsSystem!' }
        }
    }

    async getBydata_atualizacao(data) {
        try {
            const response = await knex('tab_logs_do_sistema').select().where({ data_atualizacao: data.data_atualizacao })
            if (response.length > 0) {
                return { status: true, exit: true, response: response[0] }
            } else {
                return { status: true, exit: false, msg: 'Nenhum Log encontrado!' }
            }
        } catch (err) {
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(err);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            Log({ ...data, err, descricaoDoErro: 'Exeption estourada. Repositorio LogsSystem', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            return { status: false, exit: false, error: err, msg: 'Erro ao buscar dados de LogsSystem!' }
        }
    }

    async data_criacao(data) {
        try {
            const response = await knex('tab_logs_do_sistema').select().where({ data_criacao: data.created })
            if (response.length > 0) {
                return { status: true, exit: true, id: response }
            } else {
                return { status: true, exit: false, msg: 'Nenhum Log encontrado!' }
            }
        } catch (err) {
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(err);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            Log({ ...data, err, descricaoDoErro: 'Exeption estourada. Repositorio LogsSystem', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            return { status: false, exit: false, error: err, msg: 'Erro ao buscar dados de LogsSystem!' }
        }
    }

    async create(data) {
        try {
            await knex('tab_logs_do_sistema').insert(data)
            return { status: true, msg: 'Log criado com sucesso' }
        } catch (err) {
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(err);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            Log({ ...data, err, descricaoDoErro: 'Exeption estourada. Repositorio LogsSystem', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            return { status: false, exit: false, error: err, msg: 'Erro ao buscar dados de LogsSystem!' }
        }
    }

    async update(data) {
        try {
            await knex.where({ id: data.id }).update(data).table('tab_logs_do_sistema')
            return { status: true, id: data.id }
        } catch (err) {
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(err);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            Log({ ...data, err, descricaoDoErro: 'Exeption estourada. Repositorio LogsSystem', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            return { status: false, exit: false, error: err, msg: 'Erro ao buscar dados de LogsSystem!' }
        }
    }

    async delete(data) {
        try {
            const check = await this.getById(data)
            if (!check.status) return { status: false, msg: 'Erro ao buscar dados de LogsSystem!' }
            if (!check.exit) return { status: false, msg: 'Log não encontrado!' }
            await knex.where({ id: data.id }).update({ deletado: 1, data_atualizacao: dateNow() }).table('tab_logs_do_sistema')
            return { status: true, msg: 'Log deletado com sucesso' }
        } catch (err) {
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(err);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            Log({ ...data, err, descricaoDoErro: 'Exeption estourada. Repositorio LogsSystem', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            return { status: false, exit: false, error: err, msg: 'Erro ao buscar dados de LogsSystem!' }
        }
    }

}


module.exports = new LogsDoSistemRepositorio();
