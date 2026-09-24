
require("dotenv/config")
const knex = require('../../../infrastructure/db/config/databaseConection')();
const repositoryUsers = require("../../../infrastructure/db/services/UsuarioRepositorio");
const repositoryDesafio = require("../../../infrastructure/db/services/DesafioAutenticacaoRepository");
const repositoryStaging = require("../../../infrastructure/db/services/UsuarioStagingRepository");
const userLoginDomain = require("../../domain/login");
const userDomain = require("../../domain/Usuario");
const desafioDoamain = require('../../domain/DesafioAutenticacao');
const bcrypt = require("bcrypt");
const moment = require('moment');
const crypt = require("../../../infrastructure/gateways/crypt/CriptClass.crypt");
const generateLog = require("./gerarLogin");
const logExeption = require('../Logs/exeption/exeptionLogin');
const dateNow = require('../../../infrastructure/gateways/functions/data/getToday');
const ErrorStackParser = require('error-stack-parser');
const { systemUser, roles, statusUsuarioStaging } = require('../../../certs/index');
const { cookies, bussines, statusAplication, statusApp, confiDoisFatores, eventoAuditoria } = require('../../../certs')
const crypto = require('crypto')
const { SHA } = require('../../../infrastructure/gateways/crypt/sha');
const LedgerUsuario = require('../../../infrastructure/gateways/helpers/AuditoriaAlteracao/LadgerUsuario');
const LedgerUsuarioStaging = require('../../../infrastructure/gateways/helpers/AuditoriaAlteracao/LadgerUsuarioStaging');
const LedgerDesafioAutenticacao = require('../../../infrastructure/gateways/helpers/AuditoriaAlteracao/LadgerDesafioAutenticacao');
const LedgerLogin = require('../../../infrastructure/gateways/helpers/AuditoriaAlteracao/LadgerLogin');
const authenticator = require('otplib');
const Logger = require("../../../Logs");

class loginUser {

    async nonce(req, res) {
        try {
            const nonce = crypto.randomBytes(16).toString('base64');
            const secure = statusAplication.status === statusApp.prod ? true : false;
            req.session.user = { nonce };
            res.clearCookie(cookies.nonce)
            res.cookie(cookies.nonce, nonce, { httpOnly: true, secure, sameSite: 'lax', maxAge: 1000 * 60 * 60 * 2 })
            req.session.save();
            return res.status(200).json({ status: true, msg: "Concluído" })
        } catch (_) {
            return res.status(500).json({ status: false, msg: "Erro interno, tente novamente mais tarde" })
        }
    }

    async login(data, req, res, metadata) {
        try {
            if (data.email === systemUser.email) return { status: false, msg: 'Ops! Parece que ocorreu um erro, tente novamente mais tarde.' }
            if (!req.session.user) return { status: false, msg: "Tente novamente mais tarde. Indisponível" }
            if (!req.session.user.nonce) return { status: false, msg: "Tente novamente mais tarde. Indisponível" }
            const nonce = req.cookies[cookies.nonce];
            if (!nonce) return { status: false, msg: "Ops! Parece que ocorreu um erro, tente novamente mais tarde. nonce" }
            if (nonce !== req.session.user.nonce) return { status: false, msg: "Ops! Parece que ocorreu um erro, tente novamente mais tarde. nonce dif" }
            const login = new userLoginDomain({ ...data, id: null });
            let checkUser = await repositoryUsers.getByEmail(login);
            if (checkUser.status == false) return { status: false, msg: "Estamos passando por uma instabilidade momentanea, tente novamente em isntantes." }
            if (checkUser.exit === false) return { status: false, msg: "Algum dado está incorreto, revise os dados e tente novamente." }
            const user = checkUser.data;
            const trocaSenhaUser = user.trocar_senha === 1 || user.trocar_senha === true;
            login.setLogin({ user_id: checkUser.data.id, senha: checkUser.data.senha, role: checkUser.data.role, email_verificado: checkUser.data.email_verificado, bloqueado: checkUser.data.bloqueado });
            const checkPermission = this.permission(login);
            if (checkPermission.email_verificado == false) return { status: false, msg: 'E-mail de usuário não validado.' }
            if (checkPermission.bloqueado == true) return { status: false, msg: "Usuário bloqueado" }
            if (checkPermission.email_verificado == false || checkPermission.bloqueado == true) return { status: false, msg: "Ocorreu um erro ao tentar fazer login, tente novamete mais tarde." }
            const checkPassword = await bcrypt.compare(data.senha, login.senha);
            if (checkPassword) {
                if (trocaSenhaUser) {
                    const novaInformada = data.novaSenha !== '' && data.novaSenha !== null && data.novaSenha !== undefined
                    if (!novaInformada) {
                        return {
                            status: true,
                            objects: [],
                            data: {
                                user: user.email,
                                trocar_senha: true,
                                next_step: 'REDEFINIR_SENHA',
                            }
                        }
                    }
                    if (data.confirmacaoNovaSenha === '' || data.confirmacaoNovaSenha === null || data.confirmacaoNovaSenha === undefined) return { status: false, msg: "A confirmação da nova senha é obrigatória." }
                    if (data.novaSenha !== data.confirmacaoNovaSenha) return { status: false, msg: "A nova senha e a confirmação da nova senha não coincidem." }
                    if (data.novaSenha === data.senha) return { status: false, msg: "A nova senha não pode ser igual à senha temporária." }
                    if (!this.#isStrongPassword(data.novaSenha)) return { status: false, msg: "A nova senha não atende aos requisitos de segurança. Ela deve ter pelo menos 8 caracteres, incluindo letras maiúsculas, minúsculas, números e caracteres especiais." }
                }
                const trxLogin = await knex.transaction();
                const state = crypto.randomBytes(16).toString('base64');
                const token = crypt.create({ dto: { ...checkUser.data, state }, type: "loginAccess" });
                let temDoisFatores = false;
                let temPerfil = false;
                const objects = [];
                let trocarSenha = false;
                let next_step = 'OK';
                try {
                    //Aqui vai ter a funcao e caso merda, retornar com a transaction fechada.
                    if (trocaSenhaUser) {
                        const { status } = await this.#trocaSenhaUsuario(user, data.novaSenha, metadata, trxLogin);
                        if (!status) return { status: false, msg: "Ocorreu um erro interno, tente novamente em instantes." }
                    }
                    const { doisFatores } = await this.#temDoisFatores(checkUser.data, trxLogin);
                    const { temPerfil: perfilExistente } = await this.#temPerfil(checkUser.data, trxLogin);
                    const transito = (perfilExistente && doisFatores) ? true : false;
                    temDoisFatores = doisFatores;
                    temPerfil = perfilExistente;
                    login.setLogin({ token: token.token, refresh_token: token.refreshToken, session_id: req.session.id, transito });
                    let desafio = null;
                    let desafioPayload = null;
                    objects.push({ object: login })
                    if (doisFatores) {
                        desafio = await this.GenerateDesafioAutenticacao(req, req.session.id, checkUser.data);
                        desafioPayload = desafio.getDesafioAutenticacao();
                        const checkDesafioFeito = await repositoryDesafio.getDesafioAutenticacaoBySessionAndUserIdUsadoCadastro({ sessao_id: req.session.id, user_id: checkUser.data.id });
                        if (!checkDesafioFeito.status) return { status: false, msg: "Erro interno, tente novamente em instantes." };
                        objects.push({ object: desafio })
                    }
                    // Se trocaSenhaUser já foi tratado acima nesta mesma requisição, a senha nova
                    // já está persistida - checkUser.data.trocar_senha ainda reflete o dado antigo
                    // (lido antes da troca), então não pode ser usado para decidir o next_step aqui.
                    const mustChangePassword = trocaSenhaUser ? false : (checkUser.data.trocar_senha === 1 || checkUser.data.trocar_senha === true);
                    if (mustChangePassword) next_step = 'REDEFINIR_SENHA';
                    else if (!doisFatores) next_step = 'SETUP_2FA';
                    else next_step = 'LOGIN_2FA';
                    trocarSenha = mustChangePassword;
                    const logGen = await generateLog.generateLog({ login, desafio: desafioPayload }, trxLogin);
                    if (!logGen.status) {
                        await trxLogin.rollback();
                        return { status: false, msg: logGen.msg || 'Erro interno, tente novamente em instantes.' }
                    }
                    if (desafioPayload) {
                        const auditoriaDesafio = new LedgerDesafioAutenticacao(trxLogin);
                        await auditoriaDesafio.GravarAuditoriaCriacao({
                            desafio: desafioPayload,
                            tipo_evento: eventoAuditoria.desafio_criado.label,
                            sequencia: eventoAuditoria.desafio_criado.sequencia,
                            meta_data: { tipo_desafio: confiDoisFatores.desafio.login, sessao_id: req.session.id, login_id: login.id, metadata },
                            user_id: checkUser.data.id,
                        });
                    }
                    const loginPayload = login.getLogin ? login.getLogin() : { ...login };
                    delete loginPayload.senha;
                    const auditoriaLogin = new LedgerLogin(trxLogin);
                    await auditoriaLogin.GravarAuditoriaCriacao({
                        login: loginPayload,
                        tipo_evento: eventoAuditoria.login_criado.label,
                        sequencia: eventoAuditoria.login_criado.sequencia,
                        meta_data: {
                            session_id: req.session.id,
                            next_step,
                            desafio_id: desafioPayload ? desafioPayload.id : null,
                        },
                        user_id: checkUser.data.id,
                    });
                    await trxLogin.commit();
                } catch (error) {
                    console.log(error);
                    await trxLogin.rollback();
                    if (
                        error?.name === 'ErrorLedgerDesafioAutenticacao'
                        || error?.name === 'ErrorLedgerLogin'
                        || error?.name === 'ErrorLedgerUsuario'
                    ) {
                        console.log(error);
                        return { status: false, msg: 'Ocorreu um erro interno de auditoria, tente novamente em instantes.' }
                    }
                    return { status: false, msg: error.message || 'Erro interno, tente novamente em instantes.' }
                }
                const nomePermissao = Object.keys(roles).find(key => roles[key] === checkUser.data.role);
                const secure = statusAplication.status === statusApp.prod ? true : false;
                // token e refreshToken precisam ir pra sessão e pro cookie em prod e em dev -
                // authUser.All/All2FA compara req.session.user.token com o cookie cookies.token
                // em qualquer ambiente; sem isso, nenhuma rota autenticada funciona em produção.
                req.session.user = {
                    id: checkUser.data.id,
                    email: checkUser.data.email,
                    role: checkUser.data.role,
                    state: state,
                    nonce: null,
                    token: login.token,
                    refreshToken: login.refresh_token,
                    doisFatores: temDoisFatores,
                    temPerfil: temPerfil,
                }
                res.cookie(cookies.token, login.token, { httpOnly: true, secure, sameSite: 'lax', maxAge: 1000 * 60 * 60 * 2 })
                res.clearCookie(cookies.nonce)
                res.cookie(cookies.state, state, { httpOnly: true, secure, sameSite: 'lax', maxAge: 1000 * 60 * 60 * 2 })
                req.session.save();
                return {
                    status: true,
                    objects: objects,
                    data: {
                        user: login.email,
                        permissao: nomePermissao.toUpperCase(),
                        dois_fatores: temDoisFatores,
                        trocar_senha: trocarSenha,
                        next_step,
                    }
                }
            } else {
                let msg = `Acesso negado, revise os dados.`
                if (!req.session.errorPassword) req.session.errorPassword = 1;
                else req.session.errorPassword++;
                if (req.session.errorPassword >= bussines.limiteSenha) {
                    repositoryUsers.changeBlock({ id: checkUser.data.id, bloqueado: 1 })
                    req.session.destroy();
                    res.clearCookie(cookies.state);
                    msg = "Usuário bloqueado, entre em contato com o suporte"
                } else {
                    msg = `O usuário será bloqueado após ${bussines.limiteSenha - req.session.errorPassword} tentativas`
                }
                return { status: false, msg }
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
            logExeption({ descricaoDoErro: 'Exeption estourada. use case logsSystem', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            return { status: false, msg: 'Erro interno do servidor, log gerado' }
        }
    }

    async #trocaSenhaUsuario(usuario, novaSenha, metadata, trx) {
        try {
            const salt = bcrypt.genSaltSync(10);
            const senhaHash = bcrypt.hashSync(novaSenha, salt);
            const oldUser = { ...usuario };
            usuario.senha = senhaHash;
            usuario.trocar_senha = false;
            usuario.data_atualizacao = dateNow();
            await trx('tab_usuarios').where('id', usuario.id).update({
                senha: usuario.senha,
                trocar_senha: usuario.trocar_senha,
                data_atualizacao: usuario.data_atualizacao
            });
            const auditoriaUsuario = new LedgerUsuario(trx);
            auditoriaUsuario.Initialize(oldUser)
            await auditoriaUsuario.GravarAuditoriaModificacao({
                usuario: usuario,
                tipo_evento: eventoAuditoria.usuario_senha_real.label,
                sequencia: eventoAuditoria.usuario_senha_real.sequencia,
                meta_data: {
                    user_id: usuario.id,
                    email: usuario.email,
                    role: usuario.role,
                    trocar_senha: usuario.trocar_senha
                },
                user_id: usuario.id || null,
            });
            return { status: true }
        } catch (err) {
            await trx.rollback();
            Logger.getInstance().error(`Erro ao trocar senha do usuário ${usuario.email}: ${err.message}`);
            return { status: false }
        }
    }

    permission(login) {
        const email_verificado = login.email_verificado === 1 ? true : false;
        const bloqueado = login.bloqueado === 1 ? true : false;
        return { email_verificado, bloqueado }
    }

    async #temDoisFatores(user, trx) {
        const earlyHave2Fatores = user.dois_fatores === 1 || user.codigo_hash ? true : false;
        if (!earlyHave2Fatores) return { doisFatores: false, msg: "Usuário não possui autenticação de dois fatores configurada." }
        const checkData = await trx('tab_desafio_autenticacao').where('user_id', user.id).where('tipo_desafio', confiDoisFatores.desafio.autenticacaoCadastro)
            .andWhere('usado', true).where('deletado', false).first();
        if (!checkData) return { doisFatores: false, msg: "Usuário não possui autenticação de dois fatores configurada." }
        return { doisFatores: true, msg: "Usuário possui autenticação de dois fatores configurada." }

    }

    async #temPerfil(user, trx) {
        const checkData = await trx('tab_perfil_usuario').where('user_id', user.id).where('deletado', false).first();
        if (!checkData) return { temPerfil: false, msg: "Usuário não possui perfil configurado." }
        return { temPerfil: true, msg: "Usuário possui perfil configurado." }

    }

    async GenerateDesafioAutenticacao(req, sessao_id, user) {
        const porta_logica = req.socket.remotePort;
        const sha = new SHA();
        const plainSecret = sha.decrypt(user.codigo_hash);
        const codigoEsperado = await authenticator.generate({ secret: plainSecret, epochTolerance: 60 });
        if (statusAplication.status !== statusApp.prod) console.log(`Código de dois fatores para o usuário ${user.email}: ${codigoEsperado}`);
        const desafio_hash = sha.hash(codigoEsperado);
        const userAgent = sha.encrypt(req.headers['user-agent']);
        const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        return new desafioDoamain({
            user_id: user.id, sessao_id, solicitacao_ip: ip, desafio_hash, solicitacao_porta_logica: porta_logica,
            solicitacao_user_agent_hash: userAgent, tipo_desafio: confiDoisFatores.desafio.login
        });
    }

    #isStrongPassword(password) {
        const minLength = 8;
        const hasUpperCase = /[A-Z]/.test(password);
        const hasLowerCase = /[a-z]/.test(password);
        const hasNumber = /[0-9]/.test(password);
        const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
        if (password.length < minLength) return false;
        if (!hasUpperCase || !hasLowerCase || !hasNumber || !hasSpecialChar) return false;
        return true;
    }



}

module.exports = new loginUser();
