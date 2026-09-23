
const repositoryUsers = require("../../../infrastructure/db/services/UsuarioRepositorio");
const userDomain = require("../../domain/Usuario");
const getUser = require('./getUsuario')
const logExeption = require('../Logs/exeption/exeptionUser')
const dateNow = require('../../../infrastructure/gateways/functions/data/getToday')
const ErrorStackParser = require('error-stack-parser');
const { roles, assinaturaSessao } = require('../../../certs')


class bloquearUsuario {


    async index(data) {
        try {
            const domain = new userDomain(data);
            const user = await getUser.getById(domain);
            if (user.status) {
                domain.setUser(user.user);
                if (domain.role == roles.admin) return { status: false, msg: 'Administrador não pode ser bloqueado' }
                domain.setUser({ bloqueado: domain.bloqueado == 1 ? 0 : 1 })
                const response = await repositoryUsers.changeBlock(domain);
                if (response.status) {
                    return { status: true, msg: response.msg };
                } else {
                    return { status: false, msg: response.msg };
                }
            } else {
                return { status: user.status, msg: user.err };
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


    async ChangeRole(data) {
        try {
            if (!assinaturaSessao.biometriaObrigatoria && parseInt(data.role) === roles.supervisor) return { status: false, msg: "Papel supervisor só é permitido quando a biometria é obrigatória." }
            const domain = new userDomain(data);
            const user = await getUser.getById(domain);
            if (user.status) {
                if (user.user.role == roles.admin) return { status: false, msg: 'Administrador não pode ser alterado status' }
                const response = await repositoryUsers.changeRole(domain);
                if (response.status) {
                    return { status: true, msg: response.msg };
                } else {
                    return { status: false, err: response.msg };
                }
            } else {
                return { status: user.status, err: user.err };
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

module.exports = new bloquearUsuario()
