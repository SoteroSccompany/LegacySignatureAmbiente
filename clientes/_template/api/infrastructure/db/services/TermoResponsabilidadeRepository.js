
require('dotenv/config');
const knex = require("../config/databaseConection")();
const moment = require('moment');
const Log = require('../../../@core/usecase/Logs/databaseLog');
const ErrorStackParser = require('error-stack-parser');
const dateNow = require('../../gateways/functions/data/getToday');
const BaseRepository = require('.');
const { views, confiDoisFatores } = require('../../../certs');
const logs = require('../../../Logs');

class TermoResponsabilidadeRepository extends BaseRepository {

    constructor() {
        super({ tableName: 'tab_termo_responsabilidade', knexOrTransaction: knex })
    }

    async createTermoResponsabilidade(data) {
        try {
            const response = await knex('tab_termo_responsabilidade').insert(data)
            return { status: true, data: response, msg: "TermoResponsabilidade criado com sucesso!" }
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
                descricaoDoErro: 'Exeption estourada. RepositorioTermoResponsabilidade - createTermoResponsabilidade',
                linhaDoErro: lineError,
                nomeDoArquivo: fileName,
                data_criacao: dateNow(),
            }
            logs.getInstance().fatal(dataLog, 'Erro no RepositorioTermoResponsabilidade - createTermoResponsabilidade')
            return { status: false, error: error, msg: "Não foi possivel criar o TermoResponsabilidade!" }
        }
    }

    async createTermoResponsabilidadeAceite(data, trx) {
        try {
            await trx('tab_aceite_termo_responsabilidade').insert(data)
            return { status: true, msg: "TermoResponsabilidade criado com sucesso!" }
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
                descricaoDoErro: 'Exeption estourada. RepositorioTermoResponsabilidade - createTermoResponsabilidade',
                linhaDoErro: lineError,
                nomeDoArquivo: fileName,
                data_criacao: dateNow(),
            }
            logs.getInstance().fatal(dataLog, 'Erro no RepositorioTermoResponsabilidade - createTermoResponsabilidade')
            return { status: false, error: error, msg: "Não foi possivel criar o TermoResponsabilidade!" }
        }
    }

    async createTermoResponsabilidadeUpdateDesafio(data, trx) {
        try {
            await trx('tab_termo_responsabilidade').insert(data.termo)
            await trx('tab_desafio_autenticacao').update(data.desafio).where('user_id', data.desafio.user_id).andWhere('tipo_desafio', confiDoisFatores.desafio.cadastro_termo_responsabilidade)
                .andWhere('usado', false).andWhere('deletado', false);
            return { status: true, msg: "Termo de responsabilidade inserido com sucesso" }
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
                descricaoDoErro: 'Exeption estourada. RepositorioTermoResponsabilidade - createTermoResponsabilidade',
                linhaDoErro: lineError,
                nomeDoArquivo: fileName,
                data_criacao: dateNow(),
            }
            logs.getInstance().fatal(dataLog, 'Erro no RepositorioTermoResponsabilidade - createTermoResponsabilidade')
            return { status: false, error: error, msg: "Não foi possivel criar o TermoResponsabilidade!" }
        }
    }

    async updateTermoResponsabilidade(data) {
        try {
            const check = await this.getTermoResponsabilidadeById(data)
            if (check.status && check.exit) {
                const response = await knex('tab_termo_responsabilidade').update(data).where('id', data.id)
                return { status: true, data: response, msg: "TermoResponsabilidade atualizado com sucesso!" }
            } else {
                return { status: false, msg: "TermoResponsabilidade não encontrado!" }
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
                descricaoDoErro: 'Exeption estourada. RepositorioTermoResponsabilidade - updateTermoResponsabilidade',
                linhaDoErro: lineError,
                nomeDoArquivo: fileName,
                data_criacao: dateNow(),
            }
            logs.getInstance().fatal(dataLog, 'Erro no RepositorioTermoResponsabilidade - updateTermoResponsabilidade')
            return { status: false, error: error, msg: "Não foi possivel atualizar o TermoResponsabilidade!" }
        }
    }

    async deleteTermoResponsabilidade(data) {
        try {
            const check = await this.getTermoResponsabilidadeById(data)
            if (check.status && check.exit) {
                const response = await knex('tab_termo_responsabilidade').update({ deletado: true, data_atualizacao: dateNow() }).where('id', data.id)
                return { status: true, data: response, msg: "TermoResponsabilidade deletado com sucesso!" }
            } else {
                return { status: false, msg: "TermoResponsabilidade não encontrado!" }
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
                descricaoDoErro: 'Exeption estourada. RepositorioTermoResponsabilidade - deleteTermoResponsabilidade',
                linhaDoErro: lineError,
                nomeDoArquivo: fileName,
                data_criacao: dateNow(),
            }
            logs.getInstance().fatal(dataLog, 'Erro no RepositorioTermoResponsabilidade - deleteTermoResponsabilidade')
            return { status: false, error: error, msg: "Não foi possivel deletar o TermoResponsabilidade!" }
        }
    }

    async getTermoResponsabilidade() {
        try {
            const response = await knex('tab_termo_responsabilidade').select('*').where('deletado', false)
            if (response.length > 0) {
                return { status: true, exit: true, data: response, msg: "TermoResponsabilidade encontrado com sucesso!" }
            } else {
                return { status: true, exit: false, msg: "TermoResponsabilidade não encontrado!" }
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
                descricaoDoErro: 'Exeption estourada. RepositorioTermoResponsabilidade - getTermoResponsabilidade',
                linhaDoErro: lineError,
                nomeDoArquivo: fileName,
                data_criacao: dateNow(),
            }
            logs.getInstance().fatal(dataLog, 'Erro no RepositorioTermoResponsabilidade - getTermoResponsabilidade')
            return { status: false, error: error, msg: "Não foi possivel buscar o TermoResponsabilidade!" }
        }

    }


    async getTermoResponsabilidadeById(data) {
        try {
            const response = await knex('tab_termo_responsabilidade').select('*').where('id', data.id).andWhere('deletado', false).first();
            if (response) {
                return { status: true, exit: true, data: response, msg: "TermoResponsabilidade encontrado com sucesso!" }
            } else {
                return { status: true, exit: false, msg: "TermoResponsabilidade não encontrado!" }
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
                descricaoDoErro: 'Exeption estourada. RepositorioTermoResponsabilidade - getTermoResponsabilidadeById',
                linhaDoErro: lineError,
                nomeDoArquivo: fileName,
                data_criacao: dateNow(),
            }
            logs.getInstance().fatal(dataLog, 'Erro no RepositorioTermoResponsabilidade - getTermoResponsabilidadeById')
            return { status: false, error: error, msg: "Não foi possivel buscar o TermoResponsabilidade!" }
        }

    }

    async getTermoResponsabilidadeByIdAndTipo(data) {
        try {
            const response = await knex('tab_termo_responsabilidade').select([
                'id',
                'ativo'
            ]).where('id', data.id).andWhere('tipo_termo', data.tipo_termo)
                .andWhere('deletado', false).first();
            if (response) {
                response.ativo = response.ativo === 1 ? true : false
                return { status: true, exit: true, data: response, msg: "TermoResponsabilidade encontrado com sucesso!" }
            } else {
                return { status: true, exit: false, msg: "TermoResponsabilidade não encontrado!" }
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
                descricaoDoErro: 'Exeption estourada. RepositorioTermoResponsabilidade - getTermoResponsabilidadeById',
                linhaDoErro: lineError,
                nomeDoArquivo: fileName,
                data_criacao: dateNow(),
            }
            logs.getInstance().fatal(dataLog, 'Erro no RepositorioTermoResponsabilidade - getTermoResponsabilidadeById')
            return { status: false, error: error, msg: "Não foi possivel buscar o TermoResponsabilidade!" }
        }

    }

    async getTermoResponsabilidadeAceiteByUserIdAndTermoId(data) {
        try {
            const response = await knex('tab_aceite_termo_responsabilidade').select('*').where('termo_id', data.termo_id).andWhere('user_id', data.user_id).andWhere('deletado', false).first();
            if (response) {
                return { status: true, exit: true, data: response, msg: "TermoResponsabilidade encontrado com sucesso!" }
            } else {
                return { status: true, exit: false, msg: "TermoResponsabilidade não encontrado!" }
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
                descricaoDoErro: 'Exeption estourada. RepositorioTermoResponsabilidade - getTermoResponsabilidadeById',
                linhaDoErro: lineError,
                nomeDoArquivo: fileName,
                data_criacao: dateNow(),
            }
            logs.getInstance().fatal(dataLog, 'Erro no RepositorioTermoResponsabilidade - getTermoResponsabilidadeById')
            return { status: false, error: error, msg: "Não foi possivel buscar o TermoResponsabilidade!" }
        }

    }

    async getTermoResponsabilidadeAceiteByUserIdTermoIdAndDocumentoId(data) {
        try {
            const response = await knex('tab_aceite_termo_responsabilidade').select('*').where('termo_id', data.termo_id).andWhere('user_id', data.user_id).andWhere('documento_id', data.documento_id).andWhere('deletado', false).first();
            if (response) {
                return { status: true, exit: true, data: response, msg: "TermoResponsabilidade encontrado com sucesso!" }
            } else {
                return { status: true, exit: false, msg: "TermoResponsabilidade não encontrado!" }
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
                descricaoDoErro: 'Exeption estourada. RepositorioTermoResponsabilidade - getTermoResponsabilidadeById',
                linhaDoErro: lineError,
                nomeDoArquivo: fileName,
                data_criacao: dateNow(),
            }
            logs.getInstance().fatal(dataLog, 'Erro no RepositorioTermoResponsabilidade - getTermoResponsabilidadeById')
            return { status: false, error: error, msg: "Não foi possivel buscar o TermoResponsabilidade!" }
        }

    }

    async getTotalAceiteTermoResponsabilidade(data) {
        try {
            const response = await knex('tab_aceite_termo_responsabilidade').count('id as total').where('termo_id', data.termo_id).andWhere('deletado', false).first();
            if (response) {
                return { status: true, exit: true, data: response, msg: "TermoResponsabilidade encontrado com sucesso!" }
            } else {
                return { status: true, exit: false, msg: "TermoResponsabilidade não encontrado!" }
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
                descricaoDoErro: 'Exeption estourada. RepositorioTermoResponsabilidade - getTermoResponsabilidadeById',
                linhaDoErro: lineError,
                nomeDoArquivo: fileName,
                data_criacao: dateNow(),
            }
            logs.getInstance().fatal(dataLog, 'Erro no RepositorioTermoResponsabilidade - getTermoResponsabilidadeById')
            return { status: false, error: error, msg: "Não foi possivel buscar o TermoResponsabilidade!" }
        }

    }

    async getTermoResponsabilidadeByTipo(data) {
        try {
            const response = await knex('tab_termo_responsabilidade').select('*').where('tipo_termo', data.tipo_termo).andWhere('deletado', false).first();
            if (response) {
                return { status: true, exit: true, data: response, msg: "TermoResponsabilidade encontrado com sucesso!" }
            } else {
                return { status: true, exit: false, msg: "TermoResponsabilidade não encontrado!" }
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
                descricaoDoErro: 'Exeption estourada. RepositorioTermoResponsabilidade - getTermoResponsabilidadeById',
                linhaDoErro: lineError,
                nomeDoArquivo: fileName,
                data_criacao: dateNow(),
            }
            logs.getInstance().fatal(dataLog, 'Erro no RepositorioTermoResponsabilidade - getTermoResponsabilidadeById')
            return { status: false, error: error, msg: "Não foi possivel buscar o TermoResponsabilidade!" }
        }

    }

    async getTermoResponsabilidadeByQuery(data) {
        try {
            const resp = await this.getByQuery(data)
            if (!resp.status) return { status: false, data: [], msg: "Não foi possivel buscar o TermoResponsabilidade!" }
            return { status: true, data: resp.data, msg: resp.msg }
        } catch (error) {
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(error);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            Log({ ...data, error, descricaoDoErro: 'Exeption estourada. RepositorioTermoResponsabilidade - getTermoResponsabilidadeByLimit', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            return { status: false, error: error, msg: "Não foi possivel buscar o TermoResponsabilidade!" }
        }

    }

    async getTermoResponsabilidadeByQueryIdHistorico(data, field, condition) {
        try {
            const resp = await this.getByQueryTableUniqWhere(data, view_historico, field, condition)
            if (!resp.status) return { status: false, data: [], msg: "Não foi possivel buscar o TermoResponsabilidade!" }
            return { status: true, data: resp.data, msg: resp.msg }
        } catch (error) {
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(error);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            Log({ ...data, error, descricaoDoErro: 'Exeption estourada. RepositorioTermoResponsabilidade - getTermoResponsabilidadeByLimit', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            return { status: false, error: error, msg: "Não foi possivel buscar o TermoResponsabilidade!" }
        }

    }


}

module.exports = new TermoResponsabilidadeRepository();

