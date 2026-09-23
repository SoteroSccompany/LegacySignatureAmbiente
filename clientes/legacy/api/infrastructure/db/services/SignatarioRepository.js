
require('dotenv/config');
const knex = require("../config/databaseConection")();
const ErrorStackParser = require('error-stack-parser');
const dateNow = require('../../gateways/functions/data/getToday');
const BaseRepository = require('.');
const logs = require('../../../Logs');

class SignatarioRepository extends BaseRepository {

    constructor() {
        super({ tableName: 'tab_signatarios', knexOrTransaction: knex })
    }

    async createSignatario(data, trx = null) {
        try {
            const db = trx || knex;
            await db('tab_signatarios').insert(data)
            return { status: true, msg: "Signatario criado com sucesso!" }
        } catch (error) {
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(error);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            logs.getInstance().fatal({
                data_recive: JSON.stringify(data),
                err: error,
                descricaoDoErro: 'Exeption estourada. RepositorioSignatario - createSignatario',
                linhaDoErro: lineError,
                nomeDoArquivo: fileName,
                data_criacao: dateNow(),
            }, 'Erro no RepositorioSignatario - createSignatario')
            return { status: false, error, msg: "Não foi possivel criar o Signatario!" }
        }
    }

    async getSignatariosByDocumentoId(data) {
        try {
            const response = await knex('tab_signatarios').select('*')
                .where('documento_id', data.documento_id)
                .andWhere('deletado', false)
            if (response.length > 0) {
                return { status: true, exit: true, data: response, msg: "Signatarios encontrados com sucesso!" }
            }
            return { status: true, exit: false, data: [], msg: "Nenhum signatario encontrado!" }
        } catch (error) {
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(error);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            logs.getInstance().fatal({
                data_recive: data,
                err: error,
                descricaoDoErro: 'Exeption estourada. RepositorioSignatario - getSignatariosByDocumentoId',
                linhaDoErro: lineError,
                nomeDoArquivo: fileName,
                data_criacao: dateNow(),
            }, 'Erro no RepositorioSignatario - getSignatariosByDocumentoId')
            return { status: false, error, msg: "Não foi possivel buscar os Signatarios!" }
        }
    }

}

module.exports = new SignatarioRepository();
