
require('dotenv/config');
const knex = require("../config/databaseConection")();
const moment = require('moment');
const Log = require('../../../@core/usecase/Logs/databaseLog');
const ErrorStackParser = require('error-stack-parser');
const dateNow = require('../../gateways/functions/data/getToday');
const BaseRepository = require('.');
const { views } = require('../../../certs');
const logs = require('../../../Logs');

class AcessoInvestidorRepository extends BaseRepository {

    constructor() {
        super({ tableName: 'tab_acesso_investidor', knexOrTransaction: knex })
    }

    async createAcessoInvestidor(data) {
        try {
            const response = await knex('tab_acesso_investidor').insert(data)
            return { status: true, data: response, msg: "AcessoInvestidor criado com sucesso!" }
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
                descricaoDoErro: 'Exeption estourada. RepositorioAcessoInvestidor - createAcessoInvestidor',
                linhaDoErro: lineError,
                nomeDoArquivo: fileName,
                data_criacao: dateNow(),
            }
            logs.getInstance().fatal(dataLog, 'Erro no RepositorioAcessoInvestidor - createAcessoInvestidor')
            return { status: false, error: error, msg: "Não foi possivel criar o AcessoInvestidor!" }
        }
    }

    async updateAcessoInvestidorLogin(data) {
        try {
            const trx = await knex.transaction();
            try {
                await trx('tab_acesso_investidor').update(data).where('id', data.id)
                await trx('tab_acesso_investidor').update({ data_atualizacao: dateNow(), deletado: true }).where('investidor_id', data.investidor_id).andWhere('id', '!=', data.id)
                await trx.commit();
                return { status: true, msg: "AcessoInvestidor atualizado com sucesso!" }
            } catch (err) {
                await trx.rollback();
                return { status: false, err, msg: "Não foi possivel atualizar o AcessoInvestidor!" }
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
                descricaoDoErro: 'Exeption estourada. RepositorioAcessoInvestidor - updateAcessoInvestidor',
                linhaDoErro: lineError,
                nomeDoArquivo: fileName,
                data_criacao: dateNow(),
            }
            logs.getInstance().fatal(dataLog, 'Erro no RepositorioAcessoInvestidor - updateAcessoInvestidor')
            return { status: false, error: error, msg: "Não foi possivel atualizar o AcessoInvestidor!" }
        }
    }

    async updateAcessoInvestidor(data) {
        try {
            const check = await this.getAcessoInvestidorById(data)
            if (check.status && check.exit) {
                const response = await knex('tab_acesso_investidor').update(data).where('id', data.id)
                return { status: true, data: response, msg: "AcessoInvestidor atualizado com sucesso!" }
            } else {
                return { status: false, msg: "AcessoInvestidor não encontrado!" }
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
                descricaoDoErro: 'Exeption estourada. RepositorioAcessoInvestidor - updateAcessoInvestidor',
                linhaDoErro: lineError,
                nomeDoArquivo: fileName,
                data_criacao: dateNow(),
            }
            logs.getInstance().fatal(dataLog, 'Erro no RepositorioAcessoInvestidor - updateAcessoInvestidor')
            return { status: false, error: error, msg: "Não foi possivel atualizar o AcessoInvestidor!" }
        }
    }

    async deleteByToken(data) {
        try {
            await knex('tab_acesso_investidor').update({ deletado: true, data_atualizacao: dateNow() }).where('token', data.token)
            return { status: true, msg: "AcessoInvestidor deletado com sucesso!" }
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
                descricaoDoErro: 'Exeption estourada. RepositorioAcessoInvestidor - deleteAcessoInvestidor',
                linhaDoErro: lineError,
                nomeDoArquivo: fileName,
                data_criacao: dateNow(),
            }
            logs.getInstance().fatal(dataLog, 'Erro no RepositorioAcessoInvestidor - deleteAcessoInvestidor')
            return { status: false, error: error, msg: "Não foi possivel deletar o AcessoInvestidor!" }
        }
    }

    async deleteAcessoInvestidorByInvestidorId(data) {
        try {
            const response = await knex('tab_acesso_investidor').update({ deletado: true, data_atualizacao: dateNow() }).where('investidor_id', data.investidor_id)
            return { status: true, data: response, msg: "AcessoInvestidor deletado com sucesso!" }
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
                descricaoDoErro: 'Exeption estourada. RepositorioAcessoInvestidor - deleteAcessoInvestidor',
                linhaDoErro: lineError,
                nomeDoArquivo: fileName,
                data_criacao: dateNow(),
            }
            logs.getInstance().fatal(dataLog, 'Erro no RepositorioAcessoInvestidor - deleteAcessoInvestidor')
            return { status: false, error: error, msg: "Não foi possivel deletar o AcessoInvestidor!" }
        }
    }

    async deleteAcessoInvestidor(data) {
        try {
            const check = await this.getAcessoInvestidorById(data)
            if (check.status && check.exit) {
                const response = await knex('tab_acesso_investidor').update({ deletado: true, data_atualizacao: dateNow() }).where('id', data.id)
                return { status: true, data: response, msg: "AcessoInvestidor deletado com sucesso!" }
            } else {
                return { status: false, msg: "AcessoInvestidor não encontrado!" }
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
                descricaoDoErro: 'Exeption estourada. RepositorioAcessoInvestidor - deleteAcessoInvestidor',
                linhaDoErro: lineError,
                nomeDoArquivo: fileName,
                data_criacao: dateNow(),
            }
            logs.getInstance().fatal(dataLog, 'Erro no RepositorioAcessoInvestidor - deleteAcessoInvestidor')
            return { status: false, error: error, msg: "Não foi possivel deletar o AcessoInvestidor!" }
        }
    }

    async getAcessoInvestidor() {
        try {
            const response = await knex('tab_acesso_investidor').select('*').where('deletado', false)
            if (response.length > 0) {
                return { status: true, exit: true, data: response, msg: "AcessoInvestidor encontrado com sucesso!" }
            } else {
                return { status: true, exit: false, msg: "AcessoInvestidor não encontrado!" }
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
                descricaoDoErro: 'Exeption estourada. RepositorioAcessoInvestidor - getAcessoInvestidor',
                linhaDoErro: lineError,
                nomeDoArquivo: fileName,
                data_criacao: dateNow(),
            }
            logs.getInstance().fatal(dataLog, 'Erro no RepositorioAcessoInvestidor - getAcessoInvestidor')
            return { status: false, error: error, msg: "Não foi possivel buscar o AcessoInvestidor!" }
        }

    }


    async getAcessoInvestidorByToken(data) {
        try {
            const response = await knex('tab_acesso_investidor').select('*').where('token', data.token).andWhere('deletado', false)
            if (response.length > 0) {
                return { status: true, exit: true, data: response[0], msg: "AcessoInvestidor encontrado com sucesso!" }
            } else {
                return { status: true, exit: false, msg: "AcessoInvestidor não encontrado!" }
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
                descricaoDoErro: 'Exeption estourada. RepositorioAcessoInvestidor - getAcessoInvestidorById',
                linhaDoErro: lineError,
                nomeDoArquivo: fileName,
                data_criacao: dateNow(),
            }
            logs.getInstance().fatal(dataLog, 'Erro no RepositorioAcessoInvestidor - getAcessoInvestidorById')
            return { status: false, error: error, msg: "Não foi possivel buscar o AcessoInvestidor!" }
        }

    }

    async getAcessoInvestidorById(data) {
        try {
            const response = await knex('tab_acesso_investidor').select('*').where('id', data.id).andWhere('deletado', false)
            if (response.length > 0) {
                return { status: true, exit: true, data: response[0], msg: "AcessoInvestidor encontrado com sucesso!" }
            } else {
                return { status: true, exit: false, msg: "AcessoInvestidor não encontrado!" }
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
                descricaoDoErro: 'Exeption estourada. RepositorioAcessoInvestidor - getAcessoInvestidorById',
                linhaDoErro: lineError,
                nomeDoArquivo: fileName,
                data_criacao: dateNow(),
            }
            logs.getInstance().fatal(dataLog, 'Erro no RepositorioAcessoInvestidor - getAcessoInvestidorById')
            return { status: false, error: error, msg: "Não foi possivel buscar o AcessoInvestidor!" }
        }

    }

    async getAcessoInvestidorByInvestidorIdAndToken(data) {
        try {
            const response = await knex('tab_acesso_investidor').select('*').where('investidor_id', data.investidor_id).andWhere('deletado', false).andWhere('token', data.token)
            if (response.length > 0) {
                return { status: true, exit: true, data: response[0], msg: "AcessoInvestidor encontrado com sucesso!" }
            } else {
                return { status: true, exit: false, msg: "AcessoInvestidor não encontrado!" }
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
                descricaoDoErro: 'Exeption estourada. RepositorioAcessoInvestidor - getAcessoInvestidorById',
                linhaDoErro: lineError,
                nomeDoArquivo: fileName,
                data_criacao: dateNow(),
            }
            logs.getInstance().fatal(dataLog, 'Erro no RepositorioAcessoInvestidor - getAcessoInvestidorById')
            return { status: false, error: error, msg: "Não foi possivel buscar o AcessoInvestidor!" }
        }

    }

    async getAcessoInvestidorByInvestidorId(data) {
        try {
            const response = await knex('tab_acesso_investidor').select('*').where('investidor_id', data.investidor_id).andWhere('deletado', false)
            if (response.length > 0) {
                return { status: true, exit: true, data: response[0], msg: "AcessoInvestidor encontrado com sucesso!" }
            } else {
                return { status: true, exit: false, msg: "AcessoInvestidor não encontrado!" }
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
                descricaoDoErro: 'Exeption estourada. RepositorioAcessoInvestidor - getAcessoInvestidorById',
                linhaDoErro: lineError,
                nomeDoArquivo: fileName,
                data_criacao: dateNow(),
            }
            logs.getInstance().fatal(dataLog, 'Erro no RepositorioAcessoInvestidor - getAcessoInvestidorById')
            return { status: false, error: error, msg: "Não foi possivel buscar o AcessoInvestidor!" }
        }

    }

    async getAcessoInvestidorByQuery(data) {
        try {
            const resp = await this.getByQuery(data)
            if (!resp.status) return { status: true, data: [], msg: "Não foi possivel buscar o AcessoInvestidor!" }
            return { status: true, data: resp.data, msg: resp.msg }
        } catch (error) {
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(error);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            Log({ ...data, error, descricaoDoErro: 'Exeption estourada. RepositorioAcessoInvestidor - getAcessoInvestidorByLimit', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            return { status: false, error: error, msg: "Não foi possivel buscar o AcessoInvestidor!" }
        }

    }

    async getAcessoInvestidorByQueryIdHistorico(data, field, condition) {
        try {
            const resp = await this.getByQueryTableUniqWhere(data, views.view_historico, field, condition)
            if (!resp.status) return { status: true, data: [], msg: "Não foi possivel buscar o AcessoInvestidor!" }
            return { status: true, data: resp.data, msg: resp.msg }
        } catch (error) {
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(error);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            Log({ ...data, error, descricaoDoErro: 'Exeption estourada. RepositorioAcessoInvestidor - getAcessoInvestidorByLimit', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            return { status: false, error: error, msg: "Não foi possivel buscar o AcessoInvestidor!" }
        }

    }


}

module.exports = new AcessoInvestidorRepository();

