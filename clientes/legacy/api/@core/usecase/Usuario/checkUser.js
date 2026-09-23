
const repositoryLog = require("../../../infrastructure/db/services/LoginRepositorio");
const getUser = require('./getUsuario')
const crypt = require("../../../infrastructure/gateways/crypt/CriptClass.crypt");
const logExeption = require('../Logs/exeption/exeptionUser')
const dateNow = require('../../../infrastructure/gateways/functions/data/getToday')
const ErrorStackParser = require('error-stack-parser');
const { roles, bussines, statusAplication, statusApp, cookies } = require('../../../certs/index')
const moment = require('moment')
const logOutUsecase = require('../../usecase/Login/logout');

class checkUser {


    async admin(token, req, res) {
        try {
            const checkSecurity = await this.security(token, req, res);
            if (!checkSecurity.status) return checkSecurity;
            if (checkSecurity.user.trocar_senha === 1 || checkSecurity.user.trocar_senha === true) {
                return { status: false, msg: "É necessário redefinir sua senha antes de continuar." }
            }
            const now = moment().format('YYYY-MM-DD HH:mm:ss');
            const data = (roles[checkSecurity.permission] == roles.admin) ? { status: true } : { status: false, msg: "Ops, parece que ocorreu um erro! Tente novamente mais tardevl" };
            const difUpdate = moment(now).diff(moment(checkSecurity.data.data_atualizacao), bussines.timeTypeLogin);
            const haveMore15MinUpdated = difUpdate > bussines.timeLogin;
            if (!haveMore15MinUpdated) {
                await repositoryLog.updateTimeToken({ id: checkSecurity.data.id, data_atualizacao: now })
                return data;
            } else {
                statusAplication.status == statusApp.prod ? await repositoryLog.deleteByUserId({ user_id: checkSecurity.data.user_id, token: token }) : await repositoryLog.updateTimeToken({ id: checkSecurity.data.id, data_atualizacao: now })
                let distroy = statusAplication.status == statusApp.prod ? true : false;
                return { status: false, distroy, msg: 'Faça login novamente' }
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

    async aprovadorBiometria(token, req, res) {
        try {
            const checkSecurity = await this.security(token, req, res);
            if (!checkSecurity.status) return checkSecurity;
            if (checkSecurity.user.trocar_senha === 1 || checkSecurity.user.trocar_senha === true) {
                return { status: false, msg: "É necessário redefinir sua senha antes de continuar." }
            }
            const now = moment().format('YYYY-MM-DD HH:mm:ss');
            const data = (roles[checkSecurity.permission] == roles.supervisor || roles[checkSecurity.permission] == roles.admin) ? { status: true } : { status: false, msg: "Ops, parece que ocorreu um erro! Tente novamente mais tardevl" };
            const difUpdate = moment(now).diff(moment(checkSecurity.data.data_atualizacao), bussines.timeTypeLogin);
            const haveMore15MinUpdated = difUpdate > bussines.timeLogin;
            if (!haveMore15MinUpdated) {
                await repositoryLog.updateTimeToken({ id: checkSecurity.data.id, data_atualizacao: now })
                return data;
            } else {
                statusAplication.status == statusApp.prod ? await repositoryLog.deleteByUserId({ user_id: checkSecurity.data.user_id, token: token }) : await repositoryLog.updateTimeToken({ id: checkSecurity.data.id, data_atualizacao: now })
                let distroy = statusAplication.status == statusApp.prod ? true : false;
                return { status: false, distroy, msg: 'Faça login novamente' }
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

    async gerente(token, req, res) {
        try {
            const checkSecurity = await this.security(token, req, res);
            if (!checkSecurity.status) return checkSecurity;
            if (checkSecurity.user.trocar_senha === 1 || checkSecurity.user.trocar_senha === true) {
                return { status: false, msg: "É necessário redefinir sua senha antes de continuar." }
            }
            const now = moment().format('YYYY-MM-DD HH:mm:ss');
            // admin ⊃ user ⊃ supervisor (gerente é alias de user); signer nunca acessa esta camada.
            const data = (roles[checkSecurity.permission] == roles.admin || roles[checkSecurity.permission] == roles.user || roles[checkSecurity.permission] == roles.supervisor) ? { status: true } : { status: false, msg: "Ops, parece que ocorreu um erro! Tente novamente mais tardevl" };
            const difUpdate = moment(now).diff(moment(checkSecurity.data.data_atualizacao), bussines.timeTypeLogin);
            const haveMore15MinUpdated = difUpdate > bussines.timeLogin;
            if (!haveMore15MinUpdated) {
                await repositoryLog.updateTimeToken({ id: checkSecurity.data.id, data_atualizacao: now })
                return data;
            } else {
                statusAplication.status == statusApp.prod ? await repositoryLog.deleteByUserId({ user_id: checkSecurity.data.user_id, token: token }) : await repositoryLog.updateTimeToken({ id: checkSecurity.data.id, data_atualizacao: now })
                let distroy = statusAplication.status == statusApp.prod ? true : false;
                return { status: false, distroy, msg: 'Faça login novamente' }
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

    async operacional(token, req, res) {
        try {
            const checkSecurity = await this.security(token, req, res);
            if (!checkSecurity.status) return checkSecurity;
            const now = moment().format('YYYY-MM-DD HH:mm:ss');
            const data = (roles[checkSecurity.permission] == roles.admin || roles[checkSecurity.permission] == roles.gerente || roles[checkSecurity.permission] == roles.operacional) ? { status: true } : { status: false, msg: "Ops, parece que ocorreu um erro! Tente novamente mais tardevl" };
            const difUpdate = moment(now).diff(moment(checkSecurity.data.data_atualizacao), bussines.timeTypeLogin);
            const haveMore15MinUpdated = difUpdate > bussines.timeLogin;
            if (!haveMore15MinUpdated) {
                await repositoryLog.updateTimeToken({ id: checkSecurity.data.id, data_atualizacao: now })
                return data;
            } else {
                statusAplication.status == statusApp.prod ? await repositoryLog.deleteByUserId({ user_id: checkSecurity.data.user_id, token: token }) : await repositoryLog.updateTimeToken({ id: checkSecurity.data.id, data_atualizacao: now })
                let distroy = statusAplication.status == statusApp.prod ? true : false;
                return { status: false, distroy, msg: 'Faça login novamente' }
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


    async allUser(token, req, res) {
        try {
            const checkSecurity = await this.security(token, req, res);
            if (!checkSecurity.status) return checkSecurity;
            const data = { status: true }
            const now = moment().format('YYYY-MM-DD HH:mm:ss');
            const difUpdate = moment(now).diff(moment(checkSecurity.data.data_atualizacao), bussines.timeTypeLogin);
            const haveMore15MinUpdated = difUpdate > bussines.timeLogin;
            if (!haveMore15MinUpdated) {
                await repositoryLog.updateTimeToken({ id: checkSecurity.data.id, data_atualizacao: now })
                return data;
            } else {
                statusAplication.status == statusApp.prod ? await repositoryLog.deleteByUserId({ user_id: checkSecurity.data.user_id, token: token }) : await repositoryLog.updateTimeToken({ id: checkSecurity.data.id, data_atualizacao: now })
                let distroy = statusAplication.status == statusApp.prod ? true : false;
                return { status: false, distroy, msg: 'Faça login novamente' }
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

    async security(token, req, res) {
        try {
            const checktoken = await repositoryLog.getByTokenOnly({ token: token })
            if (!checktoken.status) return { status: false, distroy: true, msg: "Ocorreu um erro, tente novamente mais tarde." }
            if (!checktoken.exit) return { status: false, distroy: true, msg: "Token inválido." }
            const decode = crypt.verify({ dto: token, type: "login" });
            if (!decode.status && !decode.expired) return { status: false, msg: "Não autorizado" }
            if (decode.expired) {
                const decodeRefreshToken = crypt.verify({ dto: req.session.user.refreshToken, type: "refreshToken" })
                if (!decodeRefreshToken.status && !decodeRefreshToken.expired) return { status: false, msg: "Tente novamente mais tarde." }
                if (decodeRefreshToken.expired) {
                    logOutUsecase.deleteByToken({ token: req.session.user.token })
                    return { status: false, distroy: true, msg: "Token expirado, faça login novamente." }
                }
                const newToken = crypt.create({ dto: decode.token, type: "login" })
                const response = await repositoryLog.updateToken({ token: newToken, refresh_token: req.session.user.refreshToken })
                if (!response) return { status: false, msg: "Ocorreu um erro, tente novamente mais tarde" }
                req.session.user.token = newToken;
                const secure = statusAplication.status === statusApp.prod ? true : false;
                res.cookie(cookies.token, newToken, { httpOnly: true, secure, sameSite: 'lax', maxAge: 1000 * 60 * 60 * 2 })
            }
            const dataCheck = await repositoryLog.getByUserId(decode.token);
            if (!dataCheck.status) return { status: false, msg: "Erro ao buscar o token de acesso" }
            if (!dataCheck.exit) {
                repositoryLog.deleteByToken({ token })
                return { status: false, distroy: true, msg: "Realize login novamente" }
            }
            const tokenCheck = dataCheck.data[0].token;
            const decodeCheck = crypt.verify({ dto: tokenCheck, type: "login" })
            if (decode.token.id === decodeCheck.token.id) {
                const checkUserData = await getUser.getById({ id: decode.token.id })
                if (!checkUserData.status) return { status: false, msg: checkUserData.msg }
                if (checkUserData.user.bloqueado === 1) return { status: false, msg: 'Usuário bloqueado' }
                const checkPermission = Object.keys(roles).find(key => roles[key] === checkUserData.user.role)
                if (!checkPermission) return { status: false, msg: 'Ops, parece que ocorreu um erro! Tente novamente mais tardevl' }
                return { status: true, data: dataCheck.data[0], user: checkUserData.user, permission: checkPermission }
            } else {
                repositoryLog.deleteByUserIdLogOut({ user_id: decode.token.id })
                return { status: false, distroy: true, msg: "Faca login novamente" };
            }
        } catch (err) {
            return { status: false }
        }
    }


}

module.exports = new checkUser();
