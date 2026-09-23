require('dotenv/config');
const checkUser = require("../../../@core/usecase/Usuario/checkUser");
const { cookies } = require("../../../certs")
const logOutUsecase = require('../../../@core/usecase/Login/logout');

// 2FA concluído nesta sessão: desafio_id só é gravado no login2FA
const desafioConfirmado = (req) => Boolean(req.session && req.session.user && req.session.user.desafio_id);


class authUser {

    async admin(req, res, next) {
        if (!req.session.csrf) return res.status(403).json({ status: false, msg: "Token inválido." })
        if (!req.session.user) return res.status(403).json({ status: false, msg: "Token inválido." })
        const token = req.cookies[cookies.token];
        if (token === undefined || token === 'undefined' || token === null || token === '' || token === ' ') {
            if (req.session.user.token) logOutUsecase.deleteByToken({ token: req.session.user.token })
            res.clearCookie(cookies.state)
            res.clearCookie(cookies.token)
            req.session.destroy();
            return res.status(403).json({ status: false, msg: "Token inválido." })
        }
        if (req.session.user.token !== token) {
            logOutUsecase.deleteByToken({ token: req.session.user.token })
            res.clearCookie(cookies.state)
            res.clearCookie(cookies.token)
            req.session.destroy();
            return res.status(403).json({ status: false, msg: "Token inválido." })
        }
        if (req.session.user.state !== req.cookies[cookies.state]) {
            logOutUsecase.deleteByToken({ token: req.session.user.token })
            req.session.destroy();
            res.clearCookie(cookies.state)
            res.clearCookie(cookies.token)
            return res.status(403).json({ status: false, msg: "Token inválido." })
        }
        if (!desafioConfirmado(req)) return res.status(403).json({ status: false, revokeLogin: true, msg: "Autenticação de dois fatores pendente. Faça o login novamente." })
        const response = await checkUser.admin(token, req, res);
        if (response.status) {
            if (req.session) {
                req.session.touch();
            }
            next();
        } else {
            if (response.distroy) {
                req.session.destroy();
                res.clearCookie(cookies.state)
                res.clearCookie(cookies.token)
                res.clearCookie(process.env.COOKIE_NAME);
                return res.status(403).json({ status: false, msg: `Acesso negado: ${response.msg}` })
            }
            res.status(403)
            res.send({ status: false, msg: `Erro com o acesso: ${response.msg}` })
        }
    }

    async aprovadorBiometria(req, res, next) {
        if (!req.session.csrf) return res.status(403).json({ status: false, msg: "Token inválido." })
        if (!req.session.user) return res.status(403).json({ status: false, msg: "Token inválido." })
        const token = req.cookies[cookies.token];
        if (token === undefined || token === 'undefined' || token === null || token === '' || token === ' ') {
            if (req.session.user.token) logOutUsecase.deleteByToken({ token: req.session.user.token })
            res.clearCookie(cookies.state)
            res.clearCookie(cookies.token)
            req.session.destroy();
            return res.status(403).json({ status: false, msg: "Token inválido." })
        }
        if (req.session.user.token !== token) {
            logOutUsecase.deleteByToken({ token: req.session.user.token })
            res.clearCookie(cookies.state)
            res.clearCookie(cookies.token)
            req.session.destroy();
            return res.status(403).json({ status: false, msg: "Token inválido." })
        }
        if (req.session.user.state !== req.cookies[cookies.state]) {
            logOutUsecase.deleteByToken({ token: req.session.user.token })
            req.session.destroy();
            res.clearCookie(cookies.state)
            res.clearCookie(cookies.token)
            return res.status(403).json({ status: false, msg: "Token inválido." })
        }
        if (!desafioConfirmado(req)) return res.status(403).json({ status: false, revokeLogin: true, msg: "Autenticação de dois fatores pendente. Faça o login novamente." })
        const response = await checkUser.aprovadorBiometria(token, req, res);
        if (response.status) {
            if (req.session) {
                req.session.touch();
            }
            next();
        } else {
            if (response.distroy) {
                req.session.destroy();
                res.clearCookie(cookies.state)
                res.clearCookie(cookies.token)
                res.clearCookie(process.env.COOKIE_NAME);
                return res.status(403).json({ status: false, msg: `Acesso negado: ${response.msg}` })
            }
            res.status(403)
            res.send({ status: false, msg: `Erro com o acesso: ${response.msg}` })
        }
    }


    async gerente(req, res, next) {
        if (!req.session.csrf) return res.status(403).json({ status: false, msg: "Token inválido." })
        if (!req.session.user) return res.status(403).json({ status: false, msg: "Token inválido." })
        const token = req.cookies[cookies.token];
        if (token === undefined || token === 'undefined' || token === null || token === '' || token === ' ') {
            if (req.session.user.token) logOutUsecase.deleteByToken({ token: req.session.user.token })
            res.clearCookie(cookies.state)
            res.clearCookie(cookies.token)
            req.session.destroy();
            return res.status(403).json({ status: false, msg: "Token inválido." })
        }
        if (req.session.user.token !== token) {
            logOutUsecase.deleteByToken({ token: req.session.user.token })
            res.clearCookie(cookies.state)
            res.clearCookie(cookies.token)
            req.session.destroy();
            return res.status(403).json({ status: false, msg: "Token inválido." })
        }
        if (req.session.user.state !== req.cookies[cookies.state]) {
            logOutUsecase.deleteByToken({ token: req.session.user.token })
            req.session.destroy();
            res.clearCookie(cookies.state)
            res.clearCookie(cookies.token)
            return res.status(403).json({ status: false, msg: "Token inválido." })
        }
        if (!desafioConfirmado(req)) return res.status(403).json({ status: false, revokeLogin: true, msg: "Autenticação de dois fatores pendente. Faça o login novamente." })
        const response = await checkUser.gerente(token, req, res);
        if (response.status) {
            if (req.session) {
                req.session.touch();
            }
            next();
        } else {
            if (response.distroy) {
                req.session.destroy();
                res.clearCookie(cookies.state)
                res.clearCookie(cookies.token)
                res.clearCookie(process.env.COOKIE_NAME);
                return res.status(403).json({ status: false, msg: `Acesso negado: ${response.msg}` })
            }
            res.status(403)
            res.send({ status: false, msg: `Erro com o acesso: ${response.msg}` })
        }
    }

    async operacional(req, res, next) {
        if (!req.session.csrf) return res.status(403).json({ status: false, msg: "Token inválido." })
        if (!req.session.user) return res.status(403).json({ status: false, msg: "Token inválido." })
        const token = req.cookies[cookies.token];
        if (token === undefined || token === 'undefined' || token === null || token === '' || token === ' ') {
            if (req.session.user.token) logOutUsecase.deleteByToken({ token: req.session.user.token })
            res.clearCookie(cookies.state)
            res.clearCookie(cookies.token)
            req.session.destroy();
            return res.status(403).json({ status: false, msg: "Token inválido." })
        }
        if (req.session.user.token !== token) {
            logOutUsecase.deleteByToken({ token: req.session.user.token })
            res.clearCookie(cookies.state)
            res.clearCookie(cookies.token)
            req.session.destroy();
            return res.status(403).json({ status: false, msg: "Token inválido." })
        }
        if (req.session.user.state !== req.cookies[cookies.state]) {
            logOutUsecase.deleteByToken({ token: req.session.user.token })
            req.session.destroy();
            res.clearCookie(cookies.state)
            res.clearCookie(cookies.token)
            return res.status(403).json({ status: false, msg: "Token inválido." })
        }
        if (!desafioConfirmado(req)) return res.status(403).json({ status: false, revokeLogin: true, msg: "Autenticação de dois fatores pendente. Faça o login novamente." })
        const response = await checkUser.operacional(token, req, res);
        if (response.status) {
            if (req.session) {
                req.session.touch();
            }
            next();
        } else {
            if (response.distroy) {
                req.session.destroy();
                res.clearCookie(cookies.state)
                res.clearCookie(cookies.token)
                res.clearCookie(process.env.COOKIE_NAME);
                return res.status(403).json({ status: false, msg: `Acesso negado: ${response.msg}` })
            }
            res.status(403)
            res.send({ status: false, msg: `Erro com o acesso: ${response.msg}` })
        }
    }



    async All(req, res, next) {
        try {
            if (!req.session.csrf) return res.status(403).json({ status: false, msg: "Token inválido.2" })
            if (!req.session.user) return res.status(403).json({ status: false, msg: "Token inválido.1" })
            const token = req.cookies[cookies.token];
            if (token === undefined || token === 'undefined' || token === null || token === '' || token === ' ') {
                if (req.session.user.token) logOutUsecase.deleteByToken({ token: req.session.user.token })
                res.clearCookie(cookies.state)
                res.clearCookie(cookies.token)
                req.session.destroy();
                return res.status(403).json({ status: false, msg: "Token inválido.3" })
            }
            if (req.session.user.token !== token) {
                logOutUsecase.deleteByToken({ token: req.session.user.token })
                res.clearCookie(cookies.state)
                res.clearCookie(cookies.token)
                req.session.destroy();
                return res.status(403).json({ status: false, msg: "Token inválido." })
            }
            if (req.session.user.state !== req.cookies[cookies.state]) {
                logOutUsecase.deleteByToken({ token: req.session.user.token })
                req.session.destroy();
                res.clearCookie(cookies.state)
                res.clearCookie(cookies.token)
                return res.status(403).json({ status: false, msg: "Token inválido." })


            }
            const response = await checkUser.allUser(token, req, res);
            if (response.status) {
                if (req.session) {
                    req.session.touch();
                }
                next();
            } else {
                if (response.distroy) {
                    req.session.destroy();
                    res.clearCookie(cookies.state)
                    res.clearCookie(cookies.token)
                    res.clearCookie(process.env.COOKIE_NAME);
                    return res.status(403).json({ status: false, msg: `Acesso negado: ${response.msg}` })
                }
                res.status(403)
                res.send({ status: false, msg: `Erro com o acesso: ${response.msg}` })
            }
        } catch (err) {
            return res.status(403).json({ status: false, msg: "Token inválido." })
        }
    }


    // Igual ao All, mas exige 2FA concluído na sessão (rotas pós-onboarding).
    // Não usar em: login2FA, dois-fatores/config, changePassword, logOut, check.
    async All2FA(req, res, next) {
        try {
            if (!req.session.csrf) return res.status(403).json({ status: false, msg: "Token inválido." })
            if (!req.session.user) return res.status(403).json({ status: false, msg: "Token inválido." })
            const token = req.cookies[cookies.token];
            if (token === undefined || token === 'undefined' || token === null || token === '' || token === ' ') {
                if (req.session.user.token) logOutUsecase.deleteByToken({ token: req.session.user.token })
                res.clearCookie(cookies.state)
                res.clearCookie(cookies.token)
                req.session.destroy();
                return res.status(403).json({ status: false, msg: "Token inválido." })
            }
            if (req.session.user.token !== token) {
                logOutUsecase.deleteByToken({ token: req.session.user.token })
                res.clearCookie(cookies.state)
                res.clearCookie(cookies.token)
                req.session.destroy();
                return res.status(403).json({ status: false, msg: "Token inválido." })
            }
            if (req.session.user.state !== req.cookies[cookies.state]) {
                logOutUsecase.deleteByToken({ token: req.session.user.token })
                req.session.destroy();
                res.clearCookie(cookies.state)
                res.clearCookie(cookies.token)
                return res.status(403).json({ status: false, msg: "Token inválido." })
            }
            if (!desafioConfirmado(req)) return res.status(403).json({ status: false, revokeLogin: true, msg: "Autenticação de dois fatores pendente. Faça o login novamente." })
            const response = await checkUser.allUser(token, req, res);
            if (response.status) {
                if (req.session) {
                    req.session.touch();
                }
                next();
            } else {
                if (response.distroy) {
                    req.session.destroy();
                    res.clearCookie(cookies.state)
                    res.clearCookie(cookies.token)
                    res.clearCookie(process.env.COOKIE_NAME);
                    return res.status(403).json({ status: false, msg: `Acesso negado: ${response.msg}` })
                }
                res.status(403)
                res.send({ status: false, msg: `Erro com o acesso: ${response.msg}` })
            }
        } catch (err) {
            return res.status(403).json({ status: false, msg: "Token inválido." })
        }
    }



}


module.exports = new authUser();



