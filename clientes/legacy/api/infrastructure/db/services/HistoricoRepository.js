
require('dotenv/config');
const knex = require("../config/databaseConection")();
const moment = require('moment');
const Log = require('../../../@core/usecase/Logs/databaseLog');
const ErrorStackParser = require('error-stack-parser');
const dateNow = require('../../gateways/functions/data/getToday');

class HistoricoRepository {

    async createHistorico(data) {
        try {
            const response = await knex('tab_historico').insert(data)
            return { status: true, data: response, msg: "Historico criado com sucesso!" }
        } catch (error) {
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(error);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            Log({ ...data, error, descricaoDoErro: 'Exeption estourada. RepositorioHistorico - createHistorico', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            return { status: false, error: error, msg: "Não foi possivel criar o Historico!" }
        }
    }

    async updateHistorico(data) {
        try {
            const check = await this.getHistoricoById(data)
            if (check.status && check.exit) {
                const response = await knex('tab_historico').update(data).where('id', data.id)
                return { status: true, data: response, msg: "Historico atualizado com sucesso!" }
            } else {
                return { status: false, msg: "Historico não encontrado!" }
            }
        } catch (error) {
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(error);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            Log({ ...data, descricaoDoErro: 'Exeption estourada. RepositorioHistorico - updateHistorico', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            return { status: false, error: error, msg: "Não foi possivel atualizar o Historico!" }
        }
    }

    async deleteHistorico(data) {
        try {
            const check = await this.getHistoricoById(data)
            if (check.status && check.exit) {
                const response = await knex('tab_historico').update({ deletado: true, data_atualizacao: dateNow() }).where('id', data.id)
                return { status: true, data: response, msg: "Historico deletado com sucesso!" }
            } else {
                return { status: false, data: response, msg: "Historico não encontrado!" }
            }
        } catch (error) {
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(error);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            Log({ ...data, error, descricaoDoErro: 'Exeption estourada. RepositorioHistorico - deleteHistorico', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            return { status: false, error: error, msg: "Não foi possivel deletar o Historico!" }
        }
    }

    async getHistorico() {
        try {
            const response = await knex('tab_historico').select('*').where('deletado', false)
            if (response.length > 0) {
                return { status: true, exit: true, data: response, msg: "Historico encontrado com sucesso!" }
            } else {
                return { status: true, exit: false, data: response, msg: "Historico não encontrado!" }
            }
        } catch (error) {
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(error);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            Log({ error, descricaoDoErro: 'Exeption estourada. RepositorioHistorico - getHistorico', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            return { status: false, error: error, msg: "Não foi possivel buscar o Historico!" }
        }

    }


    async getHistoricoById(data) {
        try {
            const response = await knex('tab_historico').select('*').where('id', data.id).andWhere('deletado', false)
            if (response.length > 0) {
                return { status: true, exit: true, data: response[0], msg: "Historico encontrado com sucesso!" }
            } else {
                return { status: true, exit: false, data: response, msg: "Historico não encontrado!" }
            }
        } catch (error) {
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(error);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            Log({ ...data, error, descricaoDoErro: 'Exeption estourada. RepositorioHistorico - getHistoricoById', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            return { status: false, error: error, msg: "Não foi possivel buscar o Historico!" }
        }

    }

    async getHistoricoByLimit(data) {
        try {
            const response = await knex('tab_historico').select('*').where('deletado', false)
                .limit(data.limit).offset(data.offset).orderBy('data_criacao', 'desc')
            if (response.length > 0) {
                const qnt = await knex('tab_historico').count("id as total").where({ deletado: false });
                const totalPage = Math.ceil(qnt[0].total / data.limit);
                return { status: true, exit: true, data: response, msg: "Historico encontrados com sucesso!", pages: totalPage, totalRegisters: qnt[0].total }
            } else {
                return { status: true, exit: false, data: response, msg: "Historico não encontrado!" }
            }
        } catch (error) {
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(error);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            Log({ ...data, error, descricaoDoErro: 'Exeption estourada. RepositorioHistorico - getHistoricoByLimit', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            return { status: false, error: error, msg: "Não foi possivel buscar o Historico!" }
        }

    }


}

module.exports = new HistoricoRepository();

