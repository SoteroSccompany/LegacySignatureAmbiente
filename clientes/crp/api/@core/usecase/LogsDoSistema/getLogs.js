
const repository = require('../../../infrastructure/db/services/LogsDoSistemRepositorio')
const logExeption = require('../Logs/exeption/exeptionLogs.js')
const dateNow = require('../../../infrastructure/gateways/functions/data/getToday')
const ErrorStackParser = require('error-stack-parser');
class getLog {

    async getAllLogs(data) {
        try {
            const response = await repository.getAll(data);
            if (response.status && response.exit) {
                return { status: true, logs: response.logs }
            } else {
                return { status: false, msg: 'Nenhum Log encontrado!' }
            }
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

    async getLogsByQuery(data) {
        try {
            const response = await repository.getLogsByQuery(data);
            if (response.status) {
                return response
            } else {
                return { status: false, msg: 'Nenhum Log encontrado!' }
            }
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

    async getById(data) {
        try {
            const response = await repository.getById(data);
            if (response.status && response.exit) {
                return { status: true, logs: response.response }
            } else {
                return { status: false, msg: 'Nenhum Log encontrado!' }
            }
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


module.exports = new getLog();
