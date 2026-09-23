
require('dotenv/config');
const knex = require("../config/databaseConection")();
const ErrorStackParser = require('error-stack-parser');
const dateNow = require('../../gateways/functions/data/getToday');
const logs = require('../../../Logs');

class ArquivoDriveRepository {

    async createArquivoDriveTrx(data, trx) {
        try {
            await trx('tab_arquivo_drive').insert(data)
            return { status: true, msg: "Arquivo do Drive registrado com sucesso!" }
        } catch (error) {
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(error);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            logs.getInstance().fatal({ err: error, linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow() }, 'Erro no ArquivoDriveRepository - createArquivoDriveTrx')
            return { status: false, error: error, msg: "Não foi possivel registrar o arquivo do Drive!" }
        }
    }

    async createArquivoDrive(data) {
        try {
            await knex('tab_arquivo_drive').insert(data)
            return { status: true, msg: "Arquivo do Drive registrado com sucesso!" }
        } catch (error) {
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(error);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            logs.getInstance().fatal({ err: error, linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow() }, 'Erro no ArquivoDriveRepository - createArquivoDrive')
            return { status: false, error: error, msg: "Não foi possivel registrar o arquivo do Drive!" }
        }
    }

    async getArquivosByPedidoId(data) {
        try {
            const response = await knex('tab_arquivo_drive').select('*').where('pedido_id', data.pedido_id).andWhere('deletado', false)
            return { status: true, exit: response.length > 0, data: response, msg: "Arquivos listados com sucesso!" }
        } catch (error) {
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(error);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            logs.getInstance().fatal({ err: error, linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow() }, 'Erro no ArquivoDriveRepository - getArquivosByPedidoId')
            return { status: false, error: error, msg: "Não foi possivel listar os arquivos do pedido!" }
        }
    }

}

module.exports = new ArquivoDriveRepository();
