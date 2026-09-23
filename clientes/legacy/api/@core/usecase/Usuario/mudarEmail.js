
const repositoryMailChange = require("../../../infrastructure/db/services/MudarEmailRepositorio");
const repositoryUsers = require("../../../infrastructure/db/services/UsuarioRepositorio");
const CriptClassCrypt = require("../../../infrastructure/gateways/crypt/CriptClass.crypt");
const email = require("../../domain/mudarEmail");
const mail = require("../Mail/enviarEmail");
const bcrypt = require("bcrypt");
const logExeption = require('../Logs/exeption/exeptionUser')
const dateNow = require('../../../infrastructure/gateways/functions/data/getToday')
const ErrorStackParser = require('error-stack-parser');


class ChangeEmail {
    async change(dto) {
        try {
            const domain = new email(dto);
            const TokenUserHydrate = await this.hydrate(domain)
            if (TokenUserHydrate.status) {
                const token = CriptClassCrypt.create({ dto: domain, type: "mailChange" });
                domain.setEmail({ token: token });
                mail.enviarEmailMudancaEmail(domain);
                return { status: true, msg: "Solicitação de troca de e-mail recebiba. Acesse seu e-mail e confirme a troca de e-mail" };
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
            const idUser = CriptClassCrypt.verify({ dto: data.token, type: "login" });
            data.setEmail({ user_id: idUser.token.id })
            if (idUser.status) {
                const checkEmailChange = await repositoryMailChange.getByUserId({ id: data.user_id });
                if (!checkEmailChange.status) return { status: false, msg: checkEmailChange.msg }
                // if (checkEmailChange.status && checkEmailChange.exit) return { status: false, msg: 'Já existe uma solicitação de troca de e-mail em andamento' }
                const checkEmail = await repositoryUsers.getByEmail({ email: data.antigoEmail })
                if (checkEmail.status && !checkEmail.exit) {
                    const checkUser = await repositoryUsers.getById({ id: data.user_id });
                    if (checkUser.status && checkUser.exit) {
                        if (data.antigoEmail === checkUser.data[0].email) {
                            return { status: false, msg: "O e-mail informado é o mesmo do seu e-mail atual" }
                        } else {
                            data.setEmail({ antigoEmail: checkUser.data[0].email });
                            const checkPass = await bcrypt.compare(data.senha, checkUser.data[0].senha);
                            if (checkPass) {
                                const changeEmailDb = await repositoryMailChange.create(data);
                                if (changeEmailDb.status) {
                                    return { status: true };
                                } else {
                                    return { status: false };
                                }
                            } else {
                                return { status: false, msg: "Senha incorreta", danger: true }
                            }
                        }
                    } else {
                        return { status: false, danger: true, msg: 'Erro ao buscar usuário' }
                    }
                } else {
                    return { status: false, danger: true, msg: 'E-mail já cadastrado' }
                }

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

module.exports = new ChangeEmail();
