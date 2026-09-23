
require('dotenv/config');
const knex = require("../config/databaseConection")();
const ErrorStackParser = require('error-stack-parser');
const dateNow = require('../../gateways/functions/data/getToday');
const BaseRepository = require('.');
const { statusUsuarioStaging } = require('../../../certs');
const logs = require('../../../Logs');

class UsuarioStagingRepository extends BaseRepository {

    constructor() {
        super({ tableName: 'tab_usuario_staging', knexOrTransaction: knex })
    }

    async createStaging(data, trx = null) {
        try {
            const db = trx || knex;
            await db('tab_usuario_staging').insert({
                ...data,
                meta_dados: JSON.stringify(data.meta_dados || {}),
            });
            return { status: true, msg: "Staging de usuário criado com sucesso!" }
        } catch (error) {
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(error);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            logs.getInstance().fatal({
                err: error,
                descricaoDoErro: 'Exeption estourada. UsuarioStagingRepository - createStaging',
                linhaDoErro: lineError,
                nomeDoArquivo: fileName,
                data_criacao: dateNow(),
            }, 'Erro no UsuarioStagingRepository - createStaging')
            return { status: false, error, msg: "Não foi possível criar o staging de usuário!" }
        }
    }

    async getPendenteByEmail(data, trx = null) {
        try {
            const db = trx || knex;
            const response = await db('tab_usuario_staging')
                .select('*')
                .where('email', data.email)
                .andWhere('status', statusUsuarioStaging.pendente)
                .andWhere('deletado', false)
                .orderBy('criado_em', 'desc')
                .first();
            if (response) {
                if (typeof response.meta_dados === 'string') response.meta_dados = JSON.parse(response.meta_dados);
                return { status: true, exit: true, data: response, msg: "Staging encontrado com sucesso!" }
            }
            return { status: true, exit: false, msg: "Staging não encontrado!" }
        } catch (error) {
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(error);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            logs.getInstance().fatal({
                err: error,
                descricaoDoErro: 'Exeption estourada. UsuarioStagingRepository - getPendenteByEmail',
                linhaDoErro: lineError,
                nomeDoArquivo: fileName,
                data_criacao: dateNow(),
            }, 'Erro no UsuarioStagingRepository - getPendenteByEmail')
            return { status: false, error, msg: "Não foi possível buscar o staging de usuário!" }
        }
    }

    async getById(data, trx = null) {
        try {
            const db = trx || knex;
            const response = await db('tab_usuario_staging').select('*').where('id', data.id).andWhere('deletado', false).first();
            if (response) {
                if (typeof response.meta_dados === 'string') response.meta_dados = JSON.parse(response.meta_dados);
                return { status: true, exit: true, data: response, msg: "Staging encontrado com sucesso!" }
            }
            return { status: true, exit: false, msg: "Staging não encontrado!" }
        } catch (error) {
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(error);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            logs.getInstance().fatal({
                err: error,
                descricaoDoErro: 'Exeption estourada. UsuarioStagingRepository - getById',
                linhaDoErro: lineError,
                nomeDoArquivo: fileName,
                data_criacao: dateNow(),
            }, 'Erro no UsuarioStagingRepository - getById')
            return { status: false, error, msg: "Não foi possível buscar o staging de usuário!" }
        }
    }

    async marcarPromovido(data, trx = null) {
        try {
            const db = trx || knex;
            await db('tab_usuario_staging').update({
                status: statusUsuarioStaging.promovido,
                user_id: data.user_id,
                atualizado_em: dateNow(),
            }).where('id', data.id);
            return { status: true, msg: "Staging promovido com sucesso!" }
        } catch (error) {
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(error);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            logs.getInstance().fatal({
                err: error,
                descricaoDoErro: 'Exeption estourada. UsuarioStagingRepository - marcarPromovido',
                linhaDoErro: lineError,
                nomeDoArquivo: fileName,
                data_criacao: dateNow(),
            }, 'Erro no UsuarioStagingRepository - marcarPromovido')
            return { status: false, error, msg: "Não foi possível promover o staging de usuário!" }
        }
    }

}

module.exports = new UsuarioStagingRepository();
