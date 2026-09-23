

const repository = require('../../../infrastructure/db/services/HistoricoRepository');
const domain = require('../../domain/Historico');
const logExeption = require('../Logs/exeption/exeptionHistorico');
const dateNow = require('../../../infrastructure/gateways/functions/data/getToday');
const ErrorStackParser = require('error-stack-parser');


class getHistoricoUseCase {

    async getHistorico() {
        try {
            const response = await repository.getHistorico()
            if (response.status && response.exit) {
                return { status: true, data: response.data, msg: response.msg }
            } else {
                return { status: false, msg: response.msg, response }
            }
        } catch (err) {
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(err);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            logExeption({ descricaoDoErro: 'Exeption estourada. use case Historico - getHistoricoUseCase -getHistorico', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            return { status: false, msg: 'Erro interno do servidor, log gerado' }
        }
    }


    async getHistoricoById(data) {
        try {
            const response = await repository.getHistoricoById(data)
            if (response.status && response.exit) {
                return { status: true, data: response.data, msg: response.msg }
            } else {
                return { status: false, msg: response.msg, response }
            }
        } catch (err) {
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(err);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            logExeption({ descricaoDoErro: 'Exeption estourada. use case Historico - getHistoricoUseCase - getHistoricoById', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            return { status: false, msg: 'Erro interno do servidor, log gerado' }
        }
    }

    async getHistoricoByLimit(data) {
        try {
            const response = await repository.getHistoricoByLimit(data)
            if (response.status && response.exit) {
                return { status: true, data: response.data, msg: response.msg }
            } else {
                return { status: false, msg: response.msg, response }
            }
        } catch (err) {
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(err);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            logExeption({ descricaoDoErro: 'Exeption estourada. use case Historico- getHistoricoUseCase - getHistoricoByLimit', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            return { status: false, msg: 'Erro interno do servidor, log gerado' }
        }
    }



}

module.exports = new getHistoricoUseCase();

