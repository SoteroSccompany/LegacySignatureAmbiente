
const useCaseUser = require("../../@core/usecase/Usuario/criarUsuario.js");
const useCaseGetUser = require("../../@core/usecase/Usuario/getUsuario");
const useCaseUserLogin = require("../../@core/usecase/Login/login.js");
const useCaseCheckEmail = require("../../@core/usecase/Usuario/checkEmail.js");
const usecaseForgotPassword = require("../../@core/usecase/Forgot/forgotPassword.js");
const changePass = require("../../@core/usecase/Forgot/mudarSenha.js");
const changeEmail = require("../../@core/usecase/Usuario/mudarEmail.js")
const changeEmailConfirm = require("../../@core/usecase/Usuario/mudarEmailConfirm.js");
const useCaseLogOut = require("../../@core/usecase/Login/logout");
const logExeption = require('../../@core/usecase/Logs/exeption/exeptionUser')
const dateNow = require('../gateways/functions/data/getToday')
const ErrorStackParser = require('error-stack-parser');
const useCaseBlock = require('../../@core/usecase/Usuario/bloquearUsuario')
const useCaseDelete = require('../../@core/usecase/Usuario/deletarUsuario.js')
const useCaseDoisFatores = require('../../@core/usecase/DesafioAutenticacao/createDesafioAutenticacaoUseCase.js')
const historicoUseCase = require('../../@core/usecase/Historico/createHistoricoUseCase');
const { roles, systemUser, cookies, historico, statusAplication, statusApp, assinaturaSessao } = require('../../certs/index');
const SearchParams = require("../gateways/helpers/SearchParams/index.js");
class UsersController {


    async verifyLogin(req, res) {
        res.status(200)
        res.json({ status: true, msg: "Logado", biometria_obrigatoria: assinaturaSessao.biometriaObrigatoria })
    }

    async getAllUser(req, res) {
        try {
            const auth = req.headers.authorization
            if (auth === undefined || auth === null || auth === '' || auth === ' ') return res.status(403).json({ status: false, msg: 'Token não pode ser vazio' })
            const token = auth.split(' ')[1]
            if (token === undefined || token === 'undefined' || token === null || token === '' || token === ' ') return res.status(403).json({ status: false, msg: 'Token não pode ser vazio' })

            const response = await useCaseGetUser.getAll()
            if (response.status) {
                res.status(200)
                res.json(response)
            } else {
                res.status(400)
                res.json(response)
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
            logExeption({ descricaoDoErro: 'Exeption estourada. Controller user', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            res.status(500).send({ msg: "Erro interno" })
        }

    }

    async forgotPassword(req, res) {
        try {
            if (req.body.email === undefined || req.body.email == "" || req.body.email === " ") {
                res.status(400)
                res.json({ status: false, msg: "Email invalido" })
            } else {
                if (req.body.email === systemUser.email) return res.status(400).json({ status: false, msg: 'Ops! Parece que ocorreu um erro, tente novamente mais tarde.' })

                const dto = req.body
                const dtoUse = req.body
                const usecase = await usecaseForgotPassword.forgotPassword({ forgot: dto, user: dtoUse })
                if (usecase.status) {
                    res.status(200)
                    res.json(usecase)
                } else {
                    res.status(400)
                    res.json(usecase)
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
            logExeption({ descricaoDoErro: 'Exeption estourada. Controller user', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            res.status(500).send({ msg: "Erro interno" })
        }

    }


    async createUser(req, res) {
        try {
            const { email, role } = req.body
            if (email == null || email == "" || email == " " || email == undefined) return res.status(400).json({ status: false, msg: "Email não pode ser vazio" });
            if (isNaN(role)) return res.status(400).json({ status: false, msg: "Role não pode ser vazio" });
            if (parseInt(role) !== roles.admin && parseInt(role) !== roles.user && parseInt(role) !== roles.signer && parseInt(role) !== roles.supervisor) return res.status(400).json({ status: false, msg: 'Permissão inválida. Cadastro pelo painel aceita apenas admin, user, signer ou supervisor.' })
            if (!assinaturaSessao.biometriaObrigatoria && parseInt(role) === roles.supervisor) return res.status(400).json({ status: false, msg: "Papel supervisor só é permitido quando a biometria é obrigatória." })
            var userDto = { email, data_criacao: dateNow(), role, user_id: req.session?.user?.id || req.integracao?.user_id || null }
            const response = await useCaseUser.create(userDto)
            if (!response.status) return res.status(400).json(response)
            if (!response.object) throw new Error('oldObject e object estao undefined')
            historicoUseCase.indexHistorico({
                transformacao: historico.trnasformcao.create.value,
                dado_atual: response.object,
                user_id: req.session?.user?.id || req.integracao?.user_id
            })
            return res.status(200).json({ status: true, msg: "Usuário criado com sucesso. As orientações de acesso foram enviadas para o e-mail do usuário" })
        } catch (err) {
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(err);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            logExeption({ descricaoDoErro: 'Exeption estourada. Controller user', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            res.status(500).send({ msg: "Erro interno" })
        }
    }

    async UpdateRoleUser(req, res) {
        try {
            const token = req.cookies['authorization']
            if (token === undefined || token === 'undefined' || token === null || token === '' || token === ' ') return res.status(403).json({ status: false, msg: 'Token não pode ser vazio' })
            const { role } = req.body
            const { id } = req.params
            if (id == null || id == "" || id == " " || id == undefined) {
                res.status(400);
                res.json({ status: false, msg: "Id do usuário não pode ser vazio" });
            } else if (isNaN(role)) {
                res.status(400);
                res.json({ status: false, msg: "Role não pode ser vazio" });
            } else {
                var userDto = { id, data_atualizacao: dateNow(), role }
                const response = await useCaseBlock.ChangeRole(userDto)
                if (response.status) {
                    res.status(200)
                    res.json(response)
                } else {
                    res.status(400)
                    res.json(response)
                }
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
            logExeption({ descricaoDoErro: 'Exeption estourada. Controller user', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            res.status(500).send({ msg: "Erro interno" })
        }
    }

    async login(req, res) {
        try {
            const { email, senha } = req.body;
            if (email == null || email == "" || email == " " || email == undefined) return res.status(400).json({ status: false, msg: "Email não pode ser vazio" });
            if (senha == null || senha == "" || senha == " " || senha == undefined) return res.status(400).json({ status: false, msg: "Senha não pode ser vazio" });
            if (email === systemUser.email) return res.status(400).json({ status: false, msg: 'Ops! Parece que ocorreu um erro, tente novamente mais tarde.' })
            res.clearCookie(cookies.state)
            res.clearCookie(cookies.token)
            const metadata = { sessao_id: req.session.id, solicitacao_ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress, solicitacao_porta_logica: req.socket.remotePort, userAgent: req.headers['user-agent'] };
            var userDto = req.body
            const response = await useCaseUserLogin.login(userDto, req, res, metadata)
            if (!response.status) {
                if (statusApp.prod === statusAplication.status) {
                    res.clearCookie(cookies.state)
                    res.clearCookie(cookies.token)
                    if (req.session.user) {
                        req.session.user.state = null;
                        req.session.user.token = null;
                        req.session.user.nonce = null;
                    }
                }
                return res.status(400).json({ status: false, msg: response.msg })
            }
            for (const object of response.objects) {
                historicoUseCase.indexHistorico({
                    transformacao: historico.trnasformcao.create.value,
                    dado_atual: object.object,
                    user_id: req.session.user.id
                })
            }
            return res.status(200).json({ status: response.status, data: response.data })
        } catch (err) {
            console.log(err)
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(err);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            logExeption({ descricaoDoErro: 'Exeption estourada. Controller user', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            res.status(500).send({ msg: "Erro interno" })
        }
    }

    async login2FA(req, res) {
        try {
            if (!req.session.user) return res.status(400).json({ status: false, msg: "Sessão expirada, faça login novamente." })
            if (!req.session.user.state) return res.status(400).json({ status: false, msg: "Sessão expirada, faça login novamente." })
            if (!req.session.user.id) return res.status(400).json({ status: false, msg: "Sessão expirada, faça login novamente." })
            if (!req.session.user.email) return res.status(400).json({ status: false, msg: "Sessão expirada, faça login novamente." })
            if (!req.session.user.doisFatores) return res.status(400).json({ status: false, msg: "Sessão expirada, faça login novamente." })
            if (!req.session.id) return res.status(400).json({ status: false, msg: "Sessão expirada, faça login novamente." })
            const { token } = req.body;
            const user_id = req.session.user.id;
            var userDto = { token, user_id, sessao_id: req.session.id, solicitacao_ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress, solicitacao_porta_logica: req.socket.remotePort, userAgent: req.headers['user-agent'] };
            const response = await useCaseDoisFatores.ConfirmacaoDesafioLogin(userDto)
            if (!response.status) {
                res.clearCookie(cookies.state)
                if (req.session.user && response.deleteLogin) {
                    req.session.user = null;
                }
                return res.status(400).json({ status: false, msg: response.msg })
            }
            for (const object of response.objects) {
                historicoUseCase.indexHistorico({
                    transformacao: historico.trnasformcao.create.value,
                    dado_atual: object.object,
                    user_id: req.session.user.id
                })
            }
            req.session.user.desafio_id = response.desafio;
            req.session.user.token = response.tokens.token;
            req.session.user.refresh_token = response.tokens.refresh_token;
            const secure = statusAplication.status === statusApp.prod ? true : false;
            res.cookie(cookies.token, response.tokens.token, { httpOnly: true, secure, sameSite: 'lax', maxAge: 1000 * 60 * 60 * 2 })
            return req.session.save((err) => {
                if (err) {
                    return res.status(500).json({ status: false, msg: 'Erro ao salvar sessão' });
                }
                return res.status(200).json({ status: response.status, msg: "Logado", next_step: response.next_step });
            });
        } catch (err) {
            console.log(err)
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(err);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            logExeption({ descricaoDoErro: 'Exeption estourada. Controller user', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            res.status(500).send({ msg: "Erro interno" })
        }
    }


    async getDoisFatoresConfig(req, res) {
        try {
            if (req.session.user.doisFatores) return res.status(200).json({ status: true, msg: "Autenticação de dois fatores já configurada." })
            const porta_logica = req.socket.remotePort;
            const userAgent = req.headers['user-agent'];
            const user_id = req.session.user.id;
            const sessao_id = req.session.id;
            const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
            const response = await useCaseDoisFatores.indexDesafioAutenticacao({ user_id, sessao_id, solicitacao_porta_logica: porta_logica, userAgent, solicitacao_ip: ip })
            if (!response.status) return res.status(400).json({ status: false, msg: response.msg })
            historicoUseCase.indexHistorico({
                transformacao: historico.trnasformcao.create.value,
                dado_atual: response.object,
                user_id: req.session.user.id
            })
            return res.status(200).json({ status: response.status, qrcode: response.qrcode })
        } catch (err) {
            console.log(err)
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(err);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            logExeption({ descricaoDoErro: 'Exeption estourada. Controller user', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            res.status(500).send({ msg: "Erro interno" })
        }
    }

    async confirmacaoDoisFatoresConfig(req, res) {
        try {
            if (req.session.user.doisFatores) return res.status(200).json({ status: true, msg: "Autenticação de dois fatores já configurada." })
            const { token } = req.body;
            if (token === undefined || token == "" || token === " ") return res.status(400).json({ status: false, msg: "Token inválido" })
            const porta_logica = req.socket.remotePort;
            const userAgent = req.headers['user-agent'];
            const user_id = req.session.user.id;
            const sessao_id = req.session.id;
            const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
            const response = await useCaseDoisFatores.ConfirmacaoDesafioAutenticacao({ user_id, sessao_id, solicitacao_porta_logica: porta_logica, userAgent, solicitacao_ip: ip, token })
            if (!response.status) return res.status(400).json({ status: false, msg: response.msg })
            for (const object of response.objects) {
                historicoUseCase.indexHistorico({
                    transformacao: historico.trnasformcao.update.value,
                    dado_antigo: object.oldObject,
                    dado_atual: object.object,
                    user_id: req.session.user.id
                })
            }
            return res.status(200).send({ status: true, msg: response.msg, recovery_codes: response.recovery_codes })
        } catch (err) {
            console.log(err)
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(err);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            logExeption({ descricaoDoErro: 'Exeption estourada. Controller user', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            res.status(500).send({ msg: "Erro interno" })
        }
    }

    async loginNonce(req, res) {
        try {
            res.clearCookie(cookies.state)
            res.clearCookie(cookies.token)
            res.clearCookie(cookies.nonce)
            req.session.user = null;
            return await useCaseUserLogin.nonce(req, res)
        } catch (err) {
            console.log(err)
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(err);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            logExeption({ descricaoDoErro: 'Exeption estourada. Controller user', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            res.status(500).send({ msg: "Erro interno" })
        }
    }

    async authEmail(req, res) {
        try {
            const token = req.params.token
            if (token === undefined || token == "" || token === " ") {
                res.status(400)
                res.json({ status: false, msg: "Token invalido" })
            } else {
                const dtolog = { token }
                const reponse = await useCaseCheckEmail.checkEmail(dtolog)
                if (reponse.status) {
                    res.status(200);
                    res.json(reponse);
                } else {
                    res.status(400);
                    res.json(reponse);
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
            logExeption({ descricaoDoErro: 'Exeption estourada. Controller user', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            res.status(500).send({ msg: "Erro interno" })
        }

    }

    async changePasswordForgot(req, res) {
        try {
            const { token, senha } = req.body
            if (token === undefined || token == "" || token === " ") {
                res.status(400)
                res.json({ status: false, msg: "Token inválido" })
            } else if (senha === undefined || senha == "" || senha === " ") {
                res.status(400)
                res.json({ status: false, msg: "Senha inválida" })
            } else {
                const dtoUse = { tokenValidator: token, senha }
                const usecase = await changePass.index(dtoUse)
                if (usecase.status) {
                    res.status(200)
                    res.json(usecase)
                } else {
                    res.status(400)
                    res.json(usecase)
                }
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
            logExeption({ descricaoDoErro: 'Exeption estourada. Controller user', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            res.status(500).send({ msg: "Erro interno" })
        }
    }

    async logOut(req, res) {
        try {
            var token = req.cookies['authorization']
            const dtoUse = { tokenValidator: token }
            const result = await useCaseLogOut.index(dtoUse)
            if (result.status) {
                res.clearCookie(cookies.state)
                res.clearCookie(cookies.token)
                req.session.destroy();
                res.status(200)
                res.json(result)
            } else {
                res.status(400)
                res.json(result)
            }

        } catch (err) {
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(err);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            logExeption({ descricaoDoErro: 'Exeption estourada. Controller user', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            res.status(500).send({ msg: "Erro interno" })
        }

    }

    async changeEmail(req, res) {
        try {
            if (req.body.email == null || req.body.email == "" || req.body.email == " " || req.body.email == undefined) {
                res.status(400);
                res.json({ status: false, msg: "Email não pode ser vazio" });
            } else if (req.body.senha == null || req.body.senha == "" || req.body.senha == " " || req.body.senha == undefined) {
                res.status(400);
                res.json({ status: false, msg: "Senha nao pode ser nula" });

            } else {
                const token = req.cookies['authorization']
                const dataChange = { novoEmail: req.body.email, token: token, senha: req.body.senha };
                const emailDto = dataChange;
                const data = await changeEmail.change(emailDto);
                if (data.status) {
                    res.status(200);
                    res.json(data);
                } else {
                    //Deslogar o usuario e caso de erro de senha
                    res.status(400);
                    res.json(data);
                }
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
            logExeption({ descricaoDoErro: 'Exeption estourada. Controller user', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            res.status(500).send({ msg: "Erro interno" })
        }
    }

    async resetEmailConfirm(req, res) {
        try {

            if (req.params.token === null || req.params.token === "" || req.params.token === " " || req.params.token === undefined) {
                res.status(400);
                res.json({ status: false, msg: "Link inválido" });
            } else {
                const dto = { token: req.params.token };
                const data = await changeEmailConfirm.change(dto);
                if (data.status) {
                    res.status(200);
                    res.json(data);
                } else {
                    res.status(400);
                    res.json(data);
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
            logExeption({ descricaoDoErro: 'Exeption estourada. Controller user', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            res.status(500).send({ msg: "Erro interno" })
        }
    }

    async checkLink(req, res) {
        try {

            if (req.params.token === null || req.params.token === "" || req.params.token === " " || req.params.token === undefined) {
                res.status(400);
                res.json({ status: false, msg: "Link inválido" });
            } else {
                const dto = { token: req.params.token };
                const data = await changeEmailConfirm.checkLink(dto);
                if (data.status) {
                    res.status(200);
                    res.json(data);
                } else {
                    res.status(400);
                    res.json(data);
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
            logExeption({ descricaoDoErro: 'Exeption estourada. Controller user', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            res.status(500).send({ msg: "Erro interno" })
        }
    }

    async changePassword(req, res) {
        try {

            const { senha, novaSenha } = req.body
            if (req.headers["authorization"] === undefined || req.headers["authorization"] == "" || req.headers["authorization"] === " ") {
                res.status(400)
                res.json({ status: false, msg: "Token invalido" })
            } else if (senha === undefined || senha == "" || senha === " ") {
                res.status(400)
                res.json({ status: false, msg: "Senha invalida" })
            } else if (novaSenha === undefined || novaSenha == "" || novaSenha === " ") {
                res.status(400)
                res.json({ status: false, msg: "Nova senha invalida" })
            } else if (novaSenha === senha) {
                res.status(400)
                res.json({ status: false, msg: "Nova senha não pode ser igual a senha antiga" })
            } else {
                var token = req.cookies['authorization']
                const dtoUse = { tokenValidator: token, senha, novaSenha }
                const usecase = await changePass.changePass(dtoUse)
                res.status(200)
                res.json(usecase)
            }
        } catch (err) {
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(err);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            logExeption({ descricaoDoErro: 'Exeption estourada. Controller user', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            res.status(500).send({ msg: "Erro interno" })
        }
    }

    async changePasswordLoged(req, res) {
        try {

            const { senha, novaSenha } = req.body
            if (senha === undefined || senha == "" || senha === " ") {
                res.status(400)
                res.json({ status: false, msg: "Senha invalida" })
            } else if (novaSenha === undefined || novaSenha == "" || novaSenha === " ") {
                res.status(400)
                res.json({ status: false, msg: "Nova senha invalida" })
            } else if (novaSenha === senha) {
                res.status(400)
                res.json({ status: false, msg: "Nova senha não pode ser igual a senha antiga" })
            } else {
                if (senha === novaSenha) return res.status(400).json({ status: false, msg: "Nova senha não pode ser igual a senha antiga" })
                if (novaSenha.length < 8) return res.status(400).json({ status: false, msg: "Nova senha deve ter no mínimo 8 caracteres" })
                const senhaForte = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
                if (!senhaForte.test(novaSenha)) {
                    return res.status(400).json({
                        status: false,
                        msg: "Nova senha deve ter no mínimo 8 caracteres, com letra, número e símbolo.",
                    })
                }
                var token = req.cookies['authorization'];
                const dtoUse = { tokenValidator: token, senha, novaSenha }
                const usecase = await changePass.changePass(dtoUse)
                if (usecase.status) {
                    return res.status(200).json(usecase)
                } else {
                    res.status(400)
                    res.json(usecase)
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
            logExeption({ descricaoDoErro: 'Exeption estourada. Controller user', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            res.status(500).send({ msg: "Erro interno" })
        }
    }

    async getById(req, res) {
        try {
            const auth = req.headers.authorization
            if (auth === undefined || auth === null || auth === '' || auth === ' ') return res.status(403).json({ status: false, msg: 'Token não pode ser vazio' })
            const token = auth.split(' ')[1]
            if (token === undefined || token === 'undefined' || token === null || token === '' || token === ' ') return res.status(403).json({ status: false, msg: 'Token não pode ser vazio' })
            const id = req.params.id
            if (id === undefined || id === null || id === '' || id === ' ') return res.status(400).json({ status: false, msg: 'Id não pode ser vazio' })
            const data = await useCaseGetUser.getById({ id });
            if (data.status) {
                res.status(200);
                res.json({ status: true, data: data.user, msg: data.msg });
            } else {
                res.status(400);
                res.json(data);
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
            logExeption({ descricaoDoErro: 'Exeption estourada. Controller user', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            res.status(500).send({ msg: "Erro interno" })
        }
    }

    async getAllLimitInter(req, res) {
        try {
            const { limit, offset } = req.params
            const checkNumLimit = Number(limit)
            const checkNumOffset = Number(offset)
            if (isNaN(checkNumLimit) || isNaN(checkNumOffset)) return res.status(400).json({ status: false, msg: 'Limit e offset devem ser numeros' })
            if (limit === undefined || limit === null || limit === '' || limit === ' ') return res.status(400).json({ status: false, msg: 'Limit não pode ser vazio' })
            if (offset === undefined || offset === null || offset === '' || offset === ' ') return res.status(400).json({ status: false, msg: 'Offset não pode ser vazio' })
            const data = await useCaseGetUser.getAllLimitInter({ limit, offset });
            if (data.status) {
                res.status(200);
                res.json(data);
            } else {
                res.status(400);
                res.json(data);
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
            logExeption({ descricaoDoErro: 'Exeption estourada. Controller user', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            res.status(500).send({ msg: "Erro interno" })
        }
    }

    async getUsuarioQuery(req, res) {
        try {
            const params = new SearchParams(req.query)
            const data = await useCaseGetUser.getUsuarioQuery(params);
            if (data.status) {
                res.status(200);
                res.json(data);
            } else {
                res.status(400);
                res.json(data);
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
            logExeption({ descricaoDoErro: 'Exeption estourada. Controller user', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            res.status(500).send({ msg: "Erro interno" })
        }
    }

    async getUsuarioQueryEmail(req, res) {
        try {
            const params = new SearchParams(req.query)
            const data = await useCaseGetUser.getUsuarioQueryEmail(params);
            if (data.status) {
                res.status(200);
                res.json(data);
            } else {
                res.status(400);
                res.json(data);
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
            logExeption({ descricaoDoErro: 'Exeption estourada. Controller user', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            res.status(500).send({ msg: "Erro interno" })
        }
    }

    async blockUnlock(req, res) {
        try {
            const id = req.params.id
            if (id === undefined || id == "" || id === " ") {
                res.status(400)
                res.json({ status: false, msg: "Id invalido" })
            } else {
                const dtolog = { id }
                const reponse = await useCaseBlock.index(dtolog)
                if (reponse.status) {
                    res.status(200);
                    res.json(reponse);
                } else {
                    res.status(400);
                    res.json(reponse);
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
            logExeption({ descricaoDoErro: 'Exeption estourada. Controller user', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            res.status(500).send({ msg: "Erro interno" })
        }
    }


    async chageRole(req, res) {
        try {
            const id = req.params.id
            const { role } = req.body
            if (id === undefined || id == "" || id === " ") return res.status(400).json({ status: false, msg: "Id invalido" })
            if (role === undefined || role == "" || role === " ") return res.status(400).json({ status: false, msg: "Permissão inválida" })
            if (Object.keys(roles).find(key => roles[key] == role) === undefined) return res.status(400).json({ status: false, msg: "Permissão inválida" })
            if (role === roles.system) return res.status(400).json({ status: false, msg: "Permissão inválida" })
            if (!assinaturaSessao.biometriaObrigatoria && Number(role) === roles.supervisor) return res.status(400).json({ status: false, msg: "Papel supervisor só é permitido quando a biometria é obrigatória." })
            const dtolog = { id, role }
            const reponse = await useCaseBlock.ChangeRole(dtolog)
            if (reponse.status) {
                res.status(200);
                res.json(reponse);
            } else {
                res.status(400);
                res.json(reponse);
            }

        } catch (err) {
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(err);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            logExeption({ descricaoDoErro: 'Exeption estourada. Controller user', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            res.status(500).send({ msg: "Erro interno" })
        }
    }

    async deleteUser(req, res) {
        try {
            const token = req.cookies[cookies.token]
            if (token === undefined || token === 'undefined' || token === null || token === '' || token === ' ') return res.status(403).json({ status: false, msg: 'Token não pode ser vazio' })
            const id = req.params.id
            if (id === undefined || id == "" || id === " ") return res.status(400).json({ status: false, msg: "Id invalido" })
            const dtolog = { id, token }
            const reponse = await useCaseDelete.index(dtolog)
            if (reponse.status) {
                res.status(200);
                res.json(reponse);
            } else {
                res.status(400);
                res.json(reponse);
            }

        } catch (err) {
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(err);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            logExeption({ descricaoDoErro: 'Exeption estourada. Controller user', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            res.status(500).send({ msg: "Erro interno" })
        }
    }
}

module.exports = new UsersController();

