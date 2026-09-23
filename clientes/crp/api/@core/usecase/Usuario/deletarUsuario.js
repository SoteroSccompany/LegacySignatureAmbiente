
const repositoryUsers = require("../../../infrastructure/db/services/UsuarioRepositorio");
const userDomain = require("../../domain/Usuario");
const crypt = require("../../../infrastructure/gateways/crypt/CriptClass.crypt");
const getUser = require('./getUsuario')
const logExeption = require('../Logs/exeption/exeptionUser')
const dateNow = require('../../../infrastructure/gateways/functions/data/getToday')
const ErrorStackParser = require('error-stack-parser');
const { roles } = require('../../../certs')


class deletarUsuario {

    async index(data) {
        try {
            const decode = await crypt.verify({ dto: data.token, type: "login" });
            if (!decode.status) return { status: false, msg: 'Ops, parece que ocorreu um erro ao verificar o cliente' }
            const checkUser = await getUser.getById({ id: decode.token.id });
            if (!checkUser.status) return { status: false, msg: 'Usuário não encontrado' }
            const checkUserDelete = await getUser.getById({ id: data.id });
            if (!checkUserDelete.status) return { status: false, msg: 'Usuário não encontrado' }
            if (checkUser.user.id === checkUserDelete.user.id) return { status: false, msg: 'Você não pode deletar o seu próprio usuário' }
            if (checkUserDelete.user.role === roles.admin || checkUserDelete.user.role === roles.system) return { status: false, msg: 'Você não pode deletar esse usuário' }
            const user = new userDomain({ ...checkUserDelete.user, deletado: true, data_atualizacao: dateNow() });
            return repositoryUsers.delete(user);
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

module.exports = new deletarUsuario()
