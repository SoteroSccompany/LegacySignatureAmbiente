
const repositorylog = require("../../../infrastructure/db/services/ForgotRepositorio");
const crypt = require("../../../infrastructure/gateways/crypt/CriptClass.crypt");
const domain = require("../../domain/Forgot");
const logExeption = require('../Logs/exeption/exeptionForgot')
const dateNow = require('../../../infrastructure/gateways/functions/data/getToday');
const ErrorStackParser = require('error-stack-parser');


class checkForgot {

    async check(data) {
        try {
            const forgot = new domain({ token: data.tokenValidator });
            const decode = crypt.verify({ dto: forgot.token, type: "recovery" });
            if (decode.status) {
                data.setUser({ id: decode.token.id });
                const checkRepository = await repositorylog.getByUserId(data)
                if (checkRepository.status) {
                    data.setUser({ tokenValidator: checkRepository.token.token })
                    return { status: true, data: checkRepository.token };
                } else {
                    return { status: false, err: checkRepository.msg };
                }
            } else {
                return { status: false, err: decode.err, msg: "Token inválido" };
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

    async dell(data) {
        try {
            const dell = await repositorylog.deleteByUserId(data.id);
            if (dell.status) {
                return { status: true, msg: dell.msg };
            } else {
                return { status: false, msg: dell.msg };
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

module.exports = new checkForgot();
