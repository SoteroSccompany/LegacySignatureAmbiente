
const repositoryLog = require("../../../infrastructure/db/services/LoginRepositorio");
const logExeption = require('../Logs/exeption/exeptionLogin')
const dateNow = require('../../../infrastructure/gateways/functions/data/getToday')
const ErrorStackParser = require('error-stack-parser');

class generateLog {

    async generateLog(data, trxExterna = null) {
        try {
            const log = await repositoryLog.create(data, trxExterna)
            if (log.status) {
                return { status: true }
            } else {
                return { status: false, msg: log.msg }
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

module.exports = new generateLog();
