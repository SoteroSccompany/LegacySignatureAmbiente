
require('dotenv/config');
const knex = require("../config/databaseConection")();
const moment = require('moment');
const Log = require('../../../@core/usecase/Logs/databaseLog');
const ErrorStackParser = require('error-stack-parser');
const dateNow = require('../../gateways/functions/data/getToday');
const BaseRepository = require('.');
const { views } = require('../../../certs');
const logs = require('../../../Logs');

class SolicitacaoDocumentoRepository extends BaseRepository {

    constructor() {
        super({ tableName: 'tab_solicitacao_documento', knexOrTransaction: knex })
    }

    async createSolicitacaoDocumento(data) {
        try {
            const response = await knex('tab_solicitacao_documento').insert(data)
            return { status: true, data: response, msg: "SolicitacaoDocumento criado com sucesso!" }
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
                descricaoDoErro: 'Exeption estourada. RepositorioSolicitacaoDocumento - createSolicitacaoDocumento',
                linhaDoErro: lineError,
                nomeDoArquivo: fileName,
                data_criacao: dateNow(),
            }
            logs.getInstance().fatal(dataLog, 'Erro no RepositorioSolicitacaoDocumento - createSolicitacaoDocumento')
            return { status: false, error: error, msg: "Não foi possivel criar o SolicitacaoDocumento!" }
        }
    }

    async createSolicitacaoDocumentoTrx(trx, data) {
        try {
            const response = await trx('tab_solicitacao_documento').insert(data)
            return { status: true, data: response, msg: "SolicitacaoDocumento criado com sucesso!" }
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
                descricaoDoErro: 'Exeption estourada. RepositorioSolicitacaoDocumento - createSolicitacaoDocumento',
                linhaDoErro: lineError,
                nomeDoArquivo: fileName,
                data_criacao: dateNow(),
            }
            logs.getInstance().fatal(dataLog, 'Erro no RepositorioSolicitacaoDocumento - createSolicitacaoDocumento')
            return { status: false, error: error, msg: "Não foi possivel criar o SolicitacaoDocumento!" }
        }
    }

    async updateSolicitacaoDocumento(data) {
        try {
            const check = await this.getSolicitacaoDocumentoById(data)
            if (check.status && check.exit) {
                const response = await knex('tab_solicitacao_documento').update(data).where('id', data.id)
                return { status: true, data: response, msg: "SolicitacaoDocumento atualizado com sucesso!" }
            } else {
                return { status: false, msg: "SolicitacaoDocumento não encontrado!" }
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
                descricaoDoErro: 'Exeption estourada. RepositorioSolicitacaoDocumento - updateSolicitacaoDocumento',
                linhaDoErro: lineError,
                nomeDoArquivo: fileName,
                data_criacao: dateNow(),
            }
            logs.getInstance().fatal(dataLog, 'Erro no RepositorioSolicitacaoDocumento - updateSolicitacaoDocumento')
            return { status: false, error: error, msg: "Não foi possivel atualizar o SolicitacaoDocumento!" }
        }
    }

    async deleteSolicitacaoDocumento(data) {
        try {
            const check = await this.getSolicitacaoDocumentoById(data)
            if (check.status && check.exit) {
                const response = await knex('tab_solicitacao_documento').update({ deletado: true, data_atualizacao: dateNow() }).where('id', data.id)
                return { status: true, data: response, msg: "SolicitacaoDocumento deletado com sucesso!" }
            } else {
                return { status: false, msg: "SolicitacaoDocumento não encontrado!" }
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
                descricaoDoErro: 'Exeption estourada. RepositorioSolicitacaoDocumento - deleteSolicitacaoDocumento',
                linhaDoErro: lineError,
                nomeDoArquivo: fileName,
                data_criacao: dateNow(),
            }
            logs.getInstance().fatal(dataLog, 'Erro no RepositorioSolicitacaoDocumento - deleteSolicitacaoDocumento')
            return { status: false, error: error, msg: "Não foi possivel deletar o SolicitacaoDocumento!" }
        }
    }

    async getSolicitacaoDocumento() {
        try {
            const response = await knex('tab_solicitacao_documento').select('*').where('deletado', false)
            if (response.length > 0) {
                return { status: true, exit: true, data: response, msg: "SolicitacaoDocumento encontrado com sucesso!" }
            } else {
                return { status: true, exit: false, msg: "SolicitacaoDocumento não encontrado!" }
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
                descricaoDoErro: 'Exeption estourada. RepositorioSolicitacaoDocumento - getSolicitacaoDocumento',
                linhaDoErro: lineError,
                nomeDoArquivo: fileName,
                data_criacao: dateNow(),
            }
            logs.getInstance().fatal(dataLog, 'Erro no RepositorioSolicitacaoDocumento - getSolicitacaoDocumento')
            return { status: false, error: error, msg: "Não foi possivel buscar o SolicitacaoDocumento!" }
        }

    }


    async getSolicitacaoDocumentoById(data) {
        try {
            const response = await knex('tab_solicitacao_documento').select('*').where('id', data.id)
            if (response.length > 0) {
                return { status: true, exit: true, data: response[0], msg: "SolicitacaoDocumento encontrado com sucesso!" }
            } else {
                return { status: true, exit: false, msg: "SolicitacaoDocumento não encontrado!" }
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
                descricaoDoErro: 'Exeption estourada. RepositorioSolicitacaoDocumento - getSolicitacaoDocumentoById',
                linhaDoErro: lineError,
                nomeDoArquivo: fileName,
                data_criacao: dateNow(),
            }
            logs.getInstance().fatal(dataLog, 'Erro no RepositorioSolicitacaoDocumento - getSolicitacaoDocumentoById')
            return { status: false, error: error, msg: "Não foi possivel buscar o SolicitacaoDocumento!" }
        }

    }

    async getSolicitacaoDocumentoByUserSessionDesafioIdAndObjectNameStatus(data) {
        try {
            const response = await knex('tab_solicitacao_documento').select('*').where('user_id', data.user_id)
                .andWhere('sessao_id', data.sessao_id).andWhere('desafio_id', data.desafio_id).andWhere('object_name', data.object_name)
                .andWhere('status', data.status)
                .first()
            if (response) {
                return { status: true, exit: true, data: response, msg: "SolicitacaoDocumento encontrado com sucesso!" }
            } else {
                return { status: true, exit: false, msg: "SolicitacaoDocumento não encontrado!" }
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
                descricaoDoErro: 'Exeption estourada. RepositorioSolicitacaoDocumento - getSolicitacaoDocumentoById',
                linhaDoErro: lineError,
                nomeDoArquivo: fileName,
                data_criacao: dateNow(),
            }
            logs.getInstance().fatal(dataLog, 'Erro no RepositorioSolicitacaoDocumento - getSolicitacaoDocumentoById')
            return { status: false, error: error, msg: "Não foi possivel buscar o SolicitacaoDocumento!" }
        }

    }

    async getSolicitacaoDocumentoByQuery(data) {
        try {
            const resp = await this.getByQuery(data)
            if (!resp.status) return { status: true, data: [], msg: "Não foi possivel buscar o SolicitacaoDocumento!" }
            return { status: true, data: resp.data, msg: resp.msg }
        } catch (error) {
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(error);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            Log({ ...data, error, descricaoDoErro: 'Exeption estourada. RepositorioSolicitacaoDocumento - getSolicitacaoDocumentoByLimit', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            return { status: false, error: error, msg: "Não foi possivel buscar o SolicitacaoDocumento!" }
        }

    }

    async getSolicitacaoDocumentoByQueryIdHistorico(data, field, condition) {
        try {
            const resp = await this.getByQueryTableUniqWhere(data, view_historico, field, condition)
            if (!resp.status) return { status: true, data: [], msg: "Não foi possivel buscar o SolicitacaoDocumento!" }
            return { status: true, data: resp.data, msg: resp.msg }
        } catch (error) {
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(error);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            Log({ ...data, error, descricaoDoErro: 'Exeption estourada. RepositorioSolicitacaoDocumento - getSolicitacaoDocumentoByLimit', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            return { status: false, error: error, msg: "Não foi possivel buscar o SolicitacaoDocumento!" }
        }

    }


}

module.exports = new SolicitacaoDocumentoRepository();

