
require('dotenv/config');
const knex = require("../config/databaseConection")();
const ErrorStackParser = require('error-stack-parser');
const dateNow = require('../../gateways/functions/data/getToday');
const logs = require('../../../Logs');

class ChaveIntegracaoRepository {

    async createChaveIntegracao(data, trxExterna = null) {
        try {
            const qb = trxExterna || knex;
            await qb('tab_chave_integracao').insert(data)
            return { status: true, msg: "Chave de integração criada com sucesso!" }
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
                descricaoDoErro: 'Exeption estourada. ChaveIntegracaoRepository - createChaveIntegracao',
                linhaDoErro: lineError,
                nomeDoArquivo: fileName,
                data_criacao: dateNow(),
            }
            logs.getInstance().fatal(dataLog, 'Erro no ChaveIntegracaoRepository - createChaveIntegracao')
            return { status: false, error: error, msg: "Não foi possivel criar a chave de integração!" }
        }
    }

    async getChaveIntegracaoById(data) {
        try {
            const response = await knex('tab_chave_integracao').select('*').where('id', data.id).andWhere('deletado', false).first()
            if (response) {
                return { status: true, exit: true, data: response, msg: "Chave de integração encontrada com sucesso!" }
            } else {
                return { status: true, exit: false, msg: "Chave de integração não encontrada!" }
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
                descricaoDoErro: 'Exeption estourada. ChaveIntegracaoRepository - getChaveIntegracaoById',
                linhaDoErro: lineError,
                nomeDoArquivo: fileName,
                data_criacao: dateNow(),
            }
            logs.getInstance().fatal(dataLog, 'Erro no ChaveIntegracaoRepository - getChaveIntegracaoById')
            return { status: false, error: error, msg: "Não foi possivel buscar a chave de integração!" }
        }
    }

    async getChaveIntegracaoByHash(data) {
        try {
            const response = await knex('tab_chave_integracao').select('*').where('hash', data.hash).andWhere('deletado', false).first()
            if (response) {
                return { status: true, exit: true, data: response, msg: "Chave de integração encontrada com sucesso!" }
            } else {
                return { status: true, exit: false, msg: "Chave de integração não encontrada!" }
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
                descricaoDoErro: 'Exeption estourada. ChaveIntegracaoRepository - getChaveIntegracaoByHash',
                linhaDoErro: lineError,
                nomeDoArquivo: fileName,
                data_criacao: dateNow(),
            }
            logs.getInstance().fatal(dataLog, 'Erro no ChaveIntegracaoRepository - getChaveIntegracaoByHash')
            return { status: false, error: error, msg: "Não foi possivel buscar a chave de integração!" }
        }
    }

    async getChavesIntegracaoByUserId(data) {
        try {
            const response = await knex('tab_chave_integracao')
                .select('id', 'user_id', 'prefixo', 'escopo', 'email_usuario', 'ultimo_uso', 'revogada', 'data_criacao', 'data_atualizacao')
                .where('user_id', data.user_id).andWhere('deletado', false).orderBy('data_criacao', 'desc')
            if (response.length > 0) {
                return { status: true, exit: true, data: response, msg: "Chaves de integração encontradas com sucesso!" }
            } else {
                return { status: true, exit: false, data: [], msg: "Nenhuma chave de integração encontrada!" }
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
                descricaoDoErro: 'Exeption estourada. ChaveIntegracaoRepository - getChavesIntegracaoByUserId',
                linhaDoErro: lineError,
                nomeDoArquivo: fileName,
                data_criacao: dateNow(),
            }
            logs.getInstance().fatal(dataLog, 'Erro no ChaveIntegracaoRepository - getChavesIntegracaoByUserId')
            return { status: false, error: error, msg: "Não foi possivel buscar as chaves de integração!" }
        }
    }

    // Emitir de novo para o mesmo dono invalida todas as ativas dele. Devolve as
    // linhas de antes da revogação (sem hash) para o historico do use case.
    async revogarChavesAtivasByUserId(data, trxExterna = null) {
        try {
            const qb = trxExterna || knex;
            const ativas = await qb('tab_chave_integracao')
                .select('id', 'user_id', 'prefixo', 'escopo', 'email_usuario', 'desafio_id', 'session_id', 'ultimo_uso', 'revogada', 'data_criacao', 'data_atualizacao', 'deletado')
                .where('user_id', data.user_id).andWhere('revogada', false).andWhere('deletado', false)
            if (ativas.length > 0) {
                await qb('tab_chave_integracao').update({ revogada: true, data_atualizacao: dateNow() })
                    .where('user_id', data.user_id).andWhere('revogada', false).andWhere('deletado', false)
            }
            return { status: true, data: ativas, msg: "Chaves ativas revogadas com sucesso!" }
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
                descricaoDoErro: 'Exeption estourada. ChaveIntegracaoRepository - revogarChavesAtivasByUserId',
                linhaDoErro: lineError,
                nomeDoArquivo: fileName,
                data_criacao: dateNow(),
            }
            logs.getInstance().fatal(dataLog, 'Erro no ChaveIntegracaoRepository - revogarChavesAtivasByUserId')
            return { status: false, error: error, msg: "Não foi possivel revogar as chaves ativas do usuário!" }
        }
    }

    async updateChaveIntegracao(data) {
        try {
            const check = await this.getChaveIntegracaoById(data)
            if (check.status && check.exit) {
                const response = await knex('tab_chave_integracao').update(data).where('id', data.id)
                return { status: true, data: response, msg: "Chave de integração atualizada com sucesso!" }
            } else {
                return { status: false, msg: "Chave de integração não encontrada!" }
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
                descricaoDoErro: 'Exeption estourada. ChaveIntegracaoRepository - updateChaveIntegracao',
                linhaDoErro: lineError,
                nomeDoArquivo: fileName,
                data_criacao: dateNow(),
            }
            logs.getInstance().fatal(dataLog, 'Erro no ChaveIntegracaoRepository - updateChaveIntegracao')
            return { status: false, error: error, msg: "Não foi possivel atualizar a chave de integração!" }
        }
    }

    async updateUltimoUso(data) {
        try {
            await knex('tab_chave_integracao').update({ ultimo_uso: data.ultimo_uso, data_atualizacao: data.ultimo_uso }).where('id', data.id)
            return { status: true, msg: "Último uso atualizado com sucesso!" }
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
                descricaoDoErro: 'Exeption estourada. ChaveIntegracaoRepository - updateUltimoUso',
                linhaDoErro: lineError,
                nomeDoArquivo: fileName,
                data_criacao: dateNow(),
            }
            logs.getInstance().fatal(dataLog, 'Erro no ChaveIntegracaoRepository - updateUltimoUso')
            return { status: false, error: error, msg: "Não foi possivel atualizar o último uso da chave!" }
        }
    }

}

module.exports = new ChaveIntegracaoRepository();
