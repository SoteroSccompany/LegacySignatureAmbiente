
const repositorylog = require("../../../infrastructure/db/services/ForgotRepositorio");
const logExeption = require('../Logs/exeption/exeptionForgot')
const dateNow = require('../../../infrastructure/gateways/functions/data/getToday');
const ErrorStackParser = require('error-stack-parser');
const { recovery, URLSITE } = require('../../../certs')
const moment = require('moment');

class forgotPassword {


    async index(data) {
        try {
            const response = await repositorylog.getByLimit(data)
            if (response.status) {
                for await (const item of response.data) {
                    const timeRequest = moment().diff(item.data_criacao, recovery.type);
                    if (timeRequest >= recovery.maxTime) {
                        item.expire = true
                    } else {
                        item.expire = false
                    }
                    item.url = `${URLSITE}/recuperarSenha/${item.token}`
                    delete item.token
                }
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
            logExeption({ descricaoDoErro: 'Exeption estourada. use case forgot', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            return { status: false, msg: 'Erro interno do servidor, log gerado' }
        }

    }

    async query(data) {
        try {
            const response = await repositorylog.getByLimitQuery(data)
            if (response.status && response.exit) {
                for await (const item of response.data) {
                    const timeRequest = moment().diff(item.data_criacao, recovery.type);
                    if (timeRequest >= recovery.maxTime) {
                        item.expire = true
                    } else {
                        item.expire = false
                    }
                    item.url = `${URLSITE}/recuperarSenha/${item.token}`
                    delete item.token
                }
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
            logExeption({ descricaoDoErro: 'Exeption estourada. use case forgot', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            return { status: false, msg: 'Erro interno do servidor, log gerado' }
        }

    }



}

module.exports = new forgotPassword();
