
const repositoryUsers = require("../../../infrastructure/db/services/UsuarioRepositorio");
const userLoginDomain = require("../../domain/login");
const crypt = require("../../../infrastructure/gateways/crypt/CriptClass.crypt");
const logExeption = require('../Logs/exeption/exeptionUser')
const dateNow = require('../../../infrastructure/gateways/functions/data/getToday')
const ErrorStackParser = require('error-stack-parser');

class checkEmail {

    async checkEmail(email) {
        try {
            const domain = new userLoginDomain(email);
            const decode = crypt.verify({ dto: domain.token, type: "auth" });
            if (decode.status == false) return { status: false, msg: 'Token inválido' }
            domain.setLogin(decode.token)
            const changeAuth = await this.change(domain);
            if (changeAuth.status == true) {
                return { status: true, msg: changeAuth.msg }
            } else {
                return { status: false, msg: changeAuth.msg }
            }
        } catch (err) {
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(err);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            logExeption({ descricaoDoErro: 'Exeption estourada. use case User', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            return { status: false, msg: 'Erro interno do servidor, log gerado' }
        }
    }

    async change(domain) {
        try {
            const persistChange = await repositoryUsers.EmailAuth(domain);
            if (persistChange.status == true) {
                return { status: true, msg: persistChange.msg }
            } else {
                return { status: false, msg: persistChange.msg }
            }
        } catch (err) {
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(err);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            logExeption({ descricaoDoErro: 'Exeption estourada. use case User', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            return { status: false, msg: 'Erro interno do servidor, log gerado' }
        }
    }


}

module.exports = new checkEmail()
