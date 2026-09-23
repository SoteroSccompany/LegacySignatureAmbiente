
const domain = require("../../domain/Forgot");
const repositorylog = require("../../../infrastructure/db/services/ForgotRepositorio");
const getUser = require("../Usuario/getUsuario");
const crypt = require("../../../infrastructure/gateways/crypt/CriptClass.crypt");
const sendEmail_usecase = require("../Mail/enviarEmail");
const logExeption = require('../Logs/exeption/exeptionForgot')
const dateNow = require('../../../infrastructure/gateways/functions/data/getToday');
const ErrorStackParser = require('error-stack-parser');

class forgotPassword {



    async forgotPassword(dto) {
        try {
            const forgot = new domain(dto.forgot);
            const check = await getUser.index(dto.user);
            if (check.status === true) {
                const tokenGen = crypt.create({ dto: check.user, type: "recovery" });
                forgot.setForgot({ token: tokenGen, user_id: check.user.id });
                const token = await repositorylog.create(forgot);
                if (token.status) {
                    sendEmail_usecase.sendEmailRecovery(forgot)
                    return { status: true, msg: 'Link para recuperacao de e-mail enviado com sucesso.' }
                } else {
                    return { status: false, err: token.msg };
                }
            } else {
                return { status: false, err: "Não será possível realizar a troca de senha! Entre em contato com o suporte." }
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
