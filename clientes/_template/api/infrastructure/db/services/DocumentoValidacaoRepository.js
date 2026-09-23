
require('dotenv/config');
const knex = require("../config/databaseConection")();
const ErrorStackParser = require('error-stack-parser');
const dateNow = require('../../gateways/functions/data/getToday');
const BaseRepository = require('.');
const logs = require('../../../Logs');

class DocumentoValidacaoRepository extends BaseRepository {

    constructor() {
        super({ tableName: 'tab_documento_validacao', knexOrTransaction: knex })
    }

    async create(data, trx = null) {
        try {
            const db = trx || knex;
            await db('tab_documento_validacao').insert(data);
            return { status: true, msg: "Validação de documento criada com sucesso!" }
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
                descricaoDoErro: 'Exeption estourada. DocumentoValidacaoRepository - create',
                linhaDoErro: lineError,
                nomeDoArquivo: fileName,
                data_criacao: dateNow(),
            }, 'Erro no DocumentoValidacaoRepository - create')
            return { status: false, error, msg: "Não foi possível criar a validação do documento!" }
        }
    }

    async getById(data, trx = null) {
        try {
            const db = trx || knex;
            const response = await db('tab_documento_validacao')
                .select('*')
                .where('id', data.id)
                .andWhere('deletado', false)
                .first();
            if (response) return { status: true, exit: true, data: response, msg: "Validação de documento encontrada com sucesso!" }
            return { status: true, exit: false, msg: "Validação de documento não encontrada!" }
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
                descricaoDoErro: 'Exeption estourada. DocumentoValidacaoRepository - getById',
                linhaDoErro: lineError,
                nomeDoArquivo: fileName,
                data_criacao: dateNow(),
            }, 'Erro no DocumentoValidacaoRepository - getById')
            return { status: false, error, msg: "Não foi possível buscar a validação do documento!" }
        }
    }

    async getByDocumentoId(data, trx = null) {
        try {
            const db = trx || knex;
            const response = await db('tab_documento_validacao')
                .select('*')
                .where('documento_id', data.documento_id)
                .andWhere('deletado', false);
            if (response.length > 0) return { status: true, exit: true, data: response, msg: "Validações de documento encontradas com sucesso!" }
            return { status: true, exit: false, data: [], msg: "Nenhuma validação de documento encontrada!" }
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
                descricaoDoErro: 'Exeption estourada. DocumentoValidacaoRepository - getByDocumentoId',
                linhaDoErro: lineError,
                nomeDoArquivo: fileName,
                data_criacao: dateNow(),
            }, 'Erro no DocumentoValidacaoRepository - getByDocumentoId')
            return { status: false, error, msg: "Não foi possível buscar as validações do documento!" }
        }
    }

}

module.exports = new DocumentoValidacaoRepository();
