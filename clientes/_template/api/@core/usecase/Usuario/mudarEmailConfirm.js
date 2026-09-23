
const repositoryMailChange = require("../../../infrastructure/db/services/MudarEmailRepositorio");
const repositoryUsers = require("../../../infrastructure/db/services/UsuarioRepositorio");
const CriptClassCrypt = require("../../../infrastructure/gateways/crypt/CriptClass.crypt");
const domainUser = require("../../domain/Usuario");
const domaiEmail = require("../../domain/mudarEmail");
const logExeption = require('../Logs/exeption/exeptionUser')
const dateNow = require('../../../infrastructure/gateways/functions/data/getToday')
const ErrorStackParser = require('error-stack-parser');


class ChangeEmailConfirm {


    async change(data) {
        try {
            const domain = new domaiEmail(data);
            const TokenUserHydrate = await this.hydrate(domain)
            if (TokenUserHydrate.status) {
                return { status: true, msg: "E-mail alterado com sucesso! Faça login novamente." };
            } else {
                return { status: false, msg: TokenUserHydrate.msg, danger: true };
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
            logExeption({ descricaoDoErro: 'Exeption estourada. use case User', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            return { status: false, msg: 'Erro interno do servidor, log gerado' }
        }
    }

    async hydrate(data) {
        try {

            const idUser = CriptClassCrypt.verify({ dto: data.token, type: "mailChange" });
            if (idUser.status) {
                data.setEmail({ user_id: idUser.token.user_id })
                const checkUser = await repositoryMailChange.getByUserId({ id: data.user_id })
                if (checkUser.status && checkUser.exit) {
                    data.setEmail({ novoEmail: checkUser.email[0].novoEmail, antigoEmail: checkUser.email[0].antigoEmail })
                    const userCpf = await repositoryUsers.getByEmail({ email: data.antigoEmail });
                    if (userCpf.exit) {
                        const domainuser = new domainUser(userCpf.data);
                        domainuser.setUser({ email: data.novoEmail })
                        const delChange = await repositoryMailChange.deleteChange(domainuser);
                        if (delChange.status) {
                            return { status: true, msg: 'E-mail alterado com sucesso!' };
                        } else {
                            return { status: false, data: delChange, msg: delChange.msg }
                        }
                    } else {
                        return { status: false, msg: userCpf.msg }
                    }
                } else {
                    return { status: false, danger: true, msg: checkUser.msg }
                }
            } else {
                return { status: false, msg: 'Verificação inválida' }
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
            logExeption({ descricaoDoErro: 'Exeption estourada. use case User', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            return { status: false, msg: 'Erro interno do servidor, log gerado' }
        }

    }

    async checkLink(data) {
        try {
            const idUser = CriptClassCrypt.verify({ dto: data.token, type: "mailChange" });
            if (idUser.status) {
                data.user_id = idUser.token.user_id;
                const checkUser = await repositoryMailChange.getByUserId({ id: data.user_id })
                if (checkUser.status && checkUser.exit) {
                    return { status: true, msg: 'Verificação valida' };
                } else {
                    return { status: false, danger: true, msg: 'Link inválido' }
                }
            } else {
                return { status: false, msg: 'Verificação invalida' }
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
            logExeption({ descricaoDoErro: 'Exeption estourada. use case User', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            return { status: false, msg: 'Erro interno do servidor, log gerado' }
        }

    }




}

module.exports = new ChangeEmailConfirm();
