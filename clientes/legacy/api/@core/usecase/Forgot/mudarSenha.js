
const repositoryUser = require("../../../infrastructure/db/services/UsuarioRepositorio");
const domain = require("../../../@core/domain/Usuario");
const usecaseCheckForgot = require("./hidratarForgot");
const crypt = require("../../../infrastructure/gateways/crypt/CriptClass.crypt");
const bcrypt = require("bcrypt");
const logExeption = require('../Logs/exeption/exeptionForgot')
const dateNow = require('../../../infrastructure/gateways/functions/data/getToday');
const ErrorStackParser = require('error-stack-parser');
const { recovery } = require('../../../certs')
const moment = require('moment');


class changePssword {


    async index(dto) {
        try {
            const user = new domain(dto);
            const check = await usecaseCheckForgot.check(user);
            if (!check.status) return { status: false, msg: check.msg }
            const timeRequest = moment().diff(check.data.data_criacao, recovery.type);
            if (timeRequest >= recovery.maxTime) {
                usecaseCheckForgot.dell(user);
                return { status: false, msg: "Tempo expirado" }
            }
            const decode = crypt.verify({ dto: user.tokenValidator, type: "recovery" });
            if (!decode.status) return { status: false, msg: decode.msg }
            const compare = decode.token.id === user.id ? true : false;
            if (!compare) return { status: false, msg: "Token invalido" }
            const salt = bcrypt.genSaltSync(10);
            const hash = bcrypt.hashSync(user.senha, salt);
            user.setUser({ senha: hash });
            const change = await repositoryUser.updatePassword(user);
            if (change.status == true) {
                const dellLog = await usecaseCheckForgot.dell(user);
                if (dellLog.status == true) {
                    return { status: true, msg: change.msg };
                } else {
                    return { status: false, msg: dellLog.msg };
                }
            } else {
                return { status: false, msg: change.msg };
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


    async changePass(data) {
        try {
            const userDomain = new domain(data);
            const decode = crypt.verify({ dto: data.tokenValidator, type: "login" });
            userDomain.setUser({ id: decode.token.id });
            const checkUser = await repositoryUser.getById(userDomain);
            if (checkUser.status == true) {
                const compare = await bcrypt.compare(data.senha, checkUser.data[0].senha);
                if (compare) {
                    const salt = bcrypt.genSaltSync(10);
                    const hash = bcrypt.hashSync(data.novaSenha, salt);
                    userDomain.setUser({ senha: hash });
                    const change = await repositoryUser.updatePassword(userDomain);
                    if (change.status == true) {
                        return { status: true, msg: change.msg };
                    } else {
                        return { status: false, err: change.error, msg: change.msg };
                    }
                } else {
                    return { status: false, msg: "Não autorizado" };
                }
            } else {
                return { status: false, msg: checkUser.msg };
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

module.exports = new changePssword();
