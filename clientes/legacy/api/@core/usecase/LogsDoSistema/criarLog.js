
const domain = require('../../domain/LogsDoSistema')
const repository = require('../../../infrastructure/db/services/LogsDoSistemRepositorio')
const logExeption = require('../Logs/exeption/exeptionLogs.js')
const dateNow = require('../../../infrastructure/gateways/functions/data/getToday')
const ErrorStackParser = require('error-stack-parser');

class createLogUseCase {

    async createLog(data) {
        try {
            const log = new domain(data);
            const response = await repository.create(log);
            return response;

        } catch (err) {
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(err);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            logExeption({ descricaoDoErro: 'Exeption estourada. use case logsSystem', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            return { status: false, msg: 'Erro interno do servidor, log gerado' }
        }
    }

}


module.exports = new createLogUseCase();
