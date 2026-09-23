
const repositoryLog = require("../../../infrastructure/db/services/LoginRepositorio");
const logExeption = require('../Logs/exeption/exeptionLogin')
const dateNow = require('../../../infrastructure/gateways/functions/data/getToday')
const ErrorStackParser = require('error-stack-parser');
const crypt = require('../../../infrastructure/gateways/crypt/CriptClass.crypt')


class logOut {

    async index(data) {
        try {
            const decode = await crypt.verify({ dto: data.tokenValidator, type: "login" })
            if (!decode.status) return { status: false, msg: decode.msg }
            const response = await repositoryLog.deleteByUserIdLogOut({ user_id: decode.token.id })
            if (response.status) {
                return { status: true, msg: "Logout realizado com sucesso" }
            } else {
                return { status: false, msg: response.msg }
            }
        } catch (err) {
            console.log(err)
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(err);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            logExeption({ descricaoDoErro: 'Exeption estourada. use case login', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            return { status: false, msg: 'Erro interno do servidor, log gerado' }
        }
    }

    async deleteTimeOut(data) {
        try {
            const response = await repositoryLog.deleteByUserId(data)
            if (response.status) {
                return { status: true, msg: "Logout realizado com sucesso" }
            } else {
                return { status: false, msg: response.msg }
            }
        } catch (err) {
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(err);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            logExeption({ descricaoDoErro: 'Exeption estourada. use case login', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            return { status: false, msg: 'Erro interno do servidor, log gerado' }
        }
    }

    async deleteByToken(data) {
        try {
            return await repositoryLog.deleteByToken(data);
        } catch (err) {
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(err);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            logExeption({ descricaoDoErro: 'Exeption estourada. use case login', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            return { status: false, msg: 'Erro interno do servidor, log gerado' }
        }
    }

    async deleteAcessoLeitorById(data) {
        try {
            return await repositoryLog.deleteAcessoLeitorById(data);
        } catch (err) {
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(err);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            logExeption({ descricaoDoErro: 'Exeption estourada. use case login', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            return { status: false, msg: 'Erro interno do servidor, log gerado' }
        }
    }
}

module.exports = new logOut();
