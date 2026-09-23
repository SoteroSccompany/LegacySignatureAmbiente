
require('dotenv/config');
const knex = require("../config/databaseConection")();
const ErrorStackParser = require('error-stack-parser');
const dateNow = require('../../gateways/functions/data/getToday');
const BaseRepository = require('.');
const logs = require('../../../Logs');

class DocumentoVerificacaoRepository extends BaseRepository {

    constructor() {
        super({ tableName: 'tab_documento_verificacao', knexOrTransaction: knex })
    }

    async create(data, trx = null) {
        try {
            const db = trx || knex;
            await db('tab_documento_verificacao').insert(data);
            return { status: true, msg: "Código de verificação criado com sucesso!" }
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
                descricaoDoErro: 'Exeption estourada. DocumentoVerificacaoRepository - create',
                linhaDoErro: lineError,
                nomeDoArquivo: fileName,
                data_criacao: dateNow(),
            }, 'Erro no DocumentoVerificacaoRepository - create')
            return { status: false, error, msg: "Não foi possível criar o código de verificação!" }
        }
    }

    async getByDocumentoId(data, trx = null) {
        try {
            const db = trx || knex;
            const response = await db('tab_documento_verificacao')
                .select('*')
                .where('documento_id', data.documento_id)
                .andWhere('deletado', false)
                .first();
            if (response) return { status: true, exit: true, data: response, msg: "Código de verificação encontrado com sucesso!" }
            return { status: true, exit: false, msg: "Código de verificação não encontrado!" }
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
                descricaoDoErro: 'Exeption estourada. DocumentoVerificacaoRepository - getByDocumentoId',
                linhaDoErro: lineError,
                nomeDoArquivo: fileName,
                data_criacao: dateNow(),
            }, 'Erro no DocumentoVerificacaoRepository - getByDocumentoId')
            return { status: false, error, msg: "Não foi possível buscar o código de verificação!" }
        }
    }

    async getByCodigo(data, trx = null) {
        try {
            const db = trx || knex;
            const response = await db('tab_documento_verificacao')
                .select('*')
                .where('codigo_verificacao', data.codigo_verificacao)
                .andWhere('deletado', false)
                .first();
            if (response) return { status: true, exit: true, data: response, msg: "Código de verificação encontrado com sucesso!" }
            return { status: true, exit: false, msg: "Código de verificação não encontrado!" }
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
                descricaoDoErro: 'Exeption estourada. DocumentoVerificacaoRepository - getByCodigo',
                linhaDoErro: lineError,
                nomeDoArquivo: fileName,
                data_criacao: dateNow(),
            }, 'Erro no DocumentoVerificacaoRepository - getByCodigo')
            return { status: false, error, msg: "Não foi possível buscar o código de verificação!" }
        }
    }

}

module.exports = new DocumentoVerificacaoRepository();
