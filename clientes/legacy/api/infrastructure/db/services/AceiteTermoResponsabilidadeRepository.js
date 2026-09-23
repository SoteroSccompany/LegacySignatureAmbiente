
require('dotenv/config');
const knex = require("../config/databaseConection")();
const moment = require('moment');
const Log = require('../../../@core/usecase/Logs/databaseLog');
const ErrorStackParser = require('error-stack-parser');
const dateNow = require('../../gateways/functions/data/getToday');
const BaseRepository = require('.');
const { views } = require('../../../certs');
const logs = require('../../../Logs');

class AceiteTermoResponsabilidadeRepository extends BaseRepository {

    constructor() {
        super({ tableName: 'tab_aceite_termo_responsabilidade', knexOrTransaction: knex })
    }

    async createAceiteTermoResponsabilidade(data) {
        try {
            const response = await knex('tab_aceite_termo_responsabilidade').insert(data)
            return { status: true, data: response, msg: "AceiteTermoResponsabilidade criado com sucesso!" }
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
                descricaoDoErro: 'Exeption estourada. RepositorioAceiteTermoResponsabilidade - createAceiteTermoResponsabilidade',
                linhaDoErro: lineError,
                nomeDoArquivo: fileName,
                data_criacao: dateNow(),
            }
            logs.getInstance().fatal(dataLog, 'Erro no RepositorioAceiteTermoResponsabilidade - createAceiteTermoResponsabilidade')
            return { status: false, error: error, msg: "Não foi possivel criar o AceiteTermoResponsabilidade!" }
        }
    }

    async updateAceiteTermoResponsabilidade(data) {
        try {
            const check = await this.getAceiteTermoResponsabilidadeById(data)
            if (check.status && check.exit) {
                const response = await knex('tab_aceite_termo_responsabilidade').update(data).where('id', data.id)
                return { status: true, data: response, msg: "AceiteTermoResponsabilidade atualizado com sucesso!" }
            } else {
                return { status: false, msg: "AceiteTermoResponsabilidade não encontrado!" }
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
                descricaoDoErro: 'Exeption estourada. RepositorioAceiteTermoResponsabilidade - updateAceiteTermoResponsabilidade',
                linhaDoErro: lineError,
                nomeDoArquivo: fileName,
                data_criacao: dateNow(),
            }
            logs.getInstance().fatal(dataLog, 'Erro no RepositorioAceiteTermoResponsabilidade - updateAceiteTermoResponsabilidade')
            return { status: false, error: error, msg: "Não foi possivel atualizar o AceiteTermoResponsabilidade!" }
        }
    }

    async deleteAceiteTermoResponsabilidade(data) {
        try {
            const check = await this.getAceiteTermoResponsabilidadeById(data)
            if (check.status && check.exit) {
                const response = await knex('tab_aceite_termo_responsabilidade').update({ deletado: true, data_atualizacao: dateNow() }).where('id', data.id)
                return { status: true, data: response, msg: "AceiteTermoResponsabilidade deletado com sucesso!" }
            } else {
                return { status: false, msg: "AceiteTermoResponsabilidade não encontrado!" }
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
                descricaoDoErro: 'Exeption estourada. RepositorioAceiteTermoResponsabilidade - deleteAceiteTermoResponsabilidade',
                linhaDoErro: lineError,
                nomeDoArquivo: fileName,
                data_criacao: dateNow(),
            }
            logs.getInstance().fatal(dataLog, 'Erro no RepositorioAceiteTermoResponsabilidade - deleteAceiteTermoResponsabilidade')
            return { status: false, error: error, msg: "Não foi possivel deletar o AceiteTermoResponsabilidade!" }
        }
    }

    async getAceiteTermoResponsabilidade() {
        try {
            const response = await knex('tab_aceite_termo_responsabilidade').select('*').where('deletado', false)
            if (response.length > 0) {
                return { status: true, exit: true, data: response, msg: "AceiteTermoResponsabilidade encontrado com sucesso!" }
            } else {
                return { status: true, exit: false, msg: "AceiteTermoResponsabilidade não encontrado!" }
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
                descricaoDoErro: 'Exeption estourada. RepositorioAceiteTermoResponsabilidade - getAceiteTermoResponsabilidade',
                linhaDoErro: lineError,
                nomeDoArquivo: fileName,
                data_criacao: dateNow(),
            }
            logs.getInstance().fatal(dataLog, 'Erro no RepositorioAceiteTermoResponsabilidade - getAceiteTermoResponsabilidade')
            return { status: false, error: error, msg: "Não foi possivel buscar o AceiteTermoResponsabilidade!" }
        }

    }


    async getAceiteTermoResponsabilidadeByUserIdAndTermoId(data) {
        try {
            const response = await knex('tab_aceite_termo_responsabilidade').select('*').where('termo_id', data.termo_id).andWhere('user_id', data.user_id).first();
            if (response) {
                return { status: true, exit: true, data: response, msg: "AceiteTermoResponsabilidade encontrado com sucesso!" }
            } else {
                return { status: true, exit: false, msg: "AceiteTermoResponsabilidade não encontrado!" }
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
                descricaoDoErro: 'Exeption estourada. RepositorioAceiteTermoResponsabilidade - getAceiteTermoResponsabilidadeById',
                linhaDoErro: lineError,
                nomeDoArquivo: fileName,
                data_criacao: dateNow(),
            }
            logs.getInstance().fatal(dataLog, 'Erro no RepositorioAceiteTermoResponsabilidade - getAceiteTermoResponsabilidadeById')
            return { status: false, error: error, msg: "Não foi possivel buscar o AceiteTermoResponsabilidade!" }
        }

    }

    async getAceiteTermoResponsabilidadeById(data) {
        try {
            const response = await knex('tab_aceite_termo_responsabilidade').select('*').where('id', data.id).andWhere('deletado', false)
            if (response.length > 0) {
                return { status: true, exit: true, data: response[0], msg: "AceiteTermoResponsabilidade encontrado com sucesso!" }
            } else {
                return { status: true, exit: false, msg: "AceiteTermoResponsabilidade não encontrado!" }
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
                descricaoDoErro: 'Exeption estourada. RepositorioAceiteTermoResponsabilidade - getAceiteTermoResponsabilidadeById',
                linhaDoErro: lineError,
                nomeDoArquivo: fileName,
                data_criacao: dateNow(),
            }
            logs.getInstance().fatal(dataLog, 'Erro no RepositorioAceiteTermoResponsabilidade - getAceiteTermoResponsabilidadeById')
            return { status: false, error: error, msg: "Não foi possivel buscar o AceiteTermoResponsabilidade!" }
        }

    }

    async getAceiteTermoResponsabilidadeByQuery(data) {
        try {
            const resp = await this.getByQuery(data)
            if (!resp.status) return { status: true, data: [], msg: "Não foi possivel buscar o AceiteTermoResponsabilidade!" }
            return { status: true, data: resp.data, msg: resp.msg }
        } catch (error) {
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(error);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            Log({ ...data, error, descricaoDoErro: 'Exeption estourada. RepositorioAceiteTermoResponsabilidade - getAceiteTermoResponsabilidadeByLimit', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            return { status: false, error: error, msg: "Não foi possivel buscar o AceiteTermoResponsabilidade!" }
        }

    }

    async getAceiteTermoResponsabilidadeByQueryIdHistorico(data, field, condition) {
        try {
            const resp = await this.getByQueryTableUniqWhere(data, view_historico, field, condition)
            if (!resp.status) return { status: true, data: [], msg: "Não foi possivel buscar o AceiteTermoResponsabilidade!" }
            return { status: true, data: resp.data, msg: resp.msg }
        } catch (error) {
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(error);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            Log({ ...data, error, descricaoDoErro: 'Exeption estourada. RepositorioAceiteTermoResponsabilidade - getAceiteTermoResponsabilidadeByLimit', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            return { status: false, error: error, msg: "Não foi possivel buscar o AceiteTermoResponsabilidade!" }
        }

    }


}

module.exports = new AceiteTermoResponsabilidadeRepository();

