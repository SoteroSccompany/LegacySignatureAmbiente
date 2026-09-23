
require('dotenv/config');
const authUser = require('./authUser');
const repositorioChave = require('../../db/services/ChaveIntegracaoRepository');
const repositorioUsuario = require('../../db/services/UsuarioRepositorio');
const repositorioLogin = require('../../db/services/LoginRepositorio');
const dateNow = require('../functions/data/getToday');
const { roles } = require('../../../certs/index');
const { SHA } = require('../crypt/sha');

const HEADER_CHAVE = 'x-integracao-key';
// Mesmos escopos emitidos em createChaveIntegracaoUseCase: solicitante (dono
// pede) e signatário (dono assina). Pedido de documento só passa com solicitante.
const ESCOPO_ADDON_SOLICITANTE = 'addon_solicitante';
const ESCOPO_ADDON_SIGNATARIO = 'addon_signatario';

// Valida a chave de integração do header. Devolve { status, msg } ou { status: true, chave, usuario }.
const validarChave = async (req) => {
    const segredo = req.headers[HEADER_CHAVE];
    if (!segredo || typeof segredo !== 'string') return { status: false, msg: "Unauthorized" }
    if (!segredo.startsWith('lsak_')) return { status: false, msg: "Unauthorized" }
    const sha = new SHA(process.env.SHA);
    const checkChave = await repositorioChave.getChaveIntegracaoByHash({ hash: sha.hash(segredo) })
    if (!checkChave.status) return { status: false, msg: "Ocorreu um erro interno, tente novamente em instantes." }
    if (!checkChave.exit) return { status: false, msg: "Unauthorized" }
    const chave = checkChave.data;
    if (chave.revogada) return { status: false, msg: "Chave de integração revogada." }
    if (chave.prefixo !== segredo.slice(0, 12)) return { status: false, msg: "Unauthorized" }
    const checkUsuario = await repositorioUsuario.getById({ id: chave.user_id })
    if (!checkUsuario.status) return { status: false, msg: "Ocorreu um erro interno, tente novamente em instantes." }
    if (!checkUsuario.exit) return { status: false, msg: "Unauthorized" }
    const usuario = checkUsuario.data[0];
    if (usuario.bloqueado) return { status: false, msg: "Usuário bloqueado. Entre em contato com o suporte." }
    if (usuario.email !== chave.email_usuario) return { status: false, msg: "Unauthorized" }
    return { status: true, chave, usuario }
}

const montarIntegracao = (chave, usuario) => ({
    chave_id: chave.id,
    user_id: chave.user_id,
    desafio_id: chave.desafio_id,
    session_id: chave.session_id,
    escopo: chave.escopo,
    email: usuario.email,
    role: usuario.role,
});

class authIntegracao {

    // Rotas de solicitante (pedido de documento): só chave com escopo solicitante,
    // ou sessão gerente. Pedir não exige ser signatário do documento.
    async gerente(req, res, next) {
        if (!req.headers[HEADER_CHAVE]) return authUser.gerente(req, res, next);
        try {
            const validacao = await validarChave(req);
            if (!validacao.status) return res.status(403).json({ status: false, msg: validacao.msg })
            if (validacao.usuario.role !== roles.admin && validacao.usuario.role !== roles.user) return res.status(403).json({ status: false, msg: "Unauthorized" })
            if (validacao.chave.escopo !== ESCOPO_ADDON_SOLICITANTE) return res.status(403).json({ status: false, msg: "Chave sem permissão para solicitar assinatura." })
            req.integracao = montarIntegracao(validacao.chave, validacao.usuario);
            repositorioChave.updateUltimoUso({ id: validacao.chave.id, ultimo_uso: dateNow() })
            next();
        } catch (err) {
            console.log(err)
            return res.status(403).json({ status: false, msg: "Unauthorized" })
        }
    }

    // Alta de usuários pelo Addon: só chave cujo dono é admin, ou sessão admin.
    async admin(req, res, next) {
        if (!req.headers[HEADER_CHAVE]) return authUser.admin(req, res, next);
        try {
            const validacao = await validarChave(req);
            if (!validacao.status) return res.status(403).json({ status: false, msg: validacao.msg })
            if (validacao.usuario.role !== roles.admin) return res.status(403).json({ status: false, msg: "Unauthorized" })
            req.integracao = montarIntegracao(validacao.chave, validacao.usuario);
            repositorioChave.updateUltimoUso({ id: validacao.chave.id, ultimo_uso: dateNow() })
            next();
        } catch (err) {
            console.log(err)
            return res.status(403).json({ status: false, msg: "Unauthorized" })
        }
    }

    // Leituras compartilhadas (download, termos): chave de gerente ou sessão 2FA de qualquer usuário.
    async All2FA(req, res, next) {
        if (!req.headers[HEADER_CHAVE]) return authUser.All2FA(req, res, next);
        try {
            const validacao = await validarChave(req);
            if (!validacao.status) return res.status(403).json({ status: false, msg: validacao.msg })
            if (validacao.usuario.role !== roles.admin && validacao.usuario.role !== roles.user) return res.status(403).json({ status: false, msg: "Unauthorized" })
            req.integracao = montarIntegracao(validacao.chave, validacao.usuario);
            repositorioChave.updateUltimoUso({ id: validacao.chave.id, ultimo_uso: dateNow() })
            next();
        } catch (err) {
            console.log(err)
            return res.status(403).json({ status: false, msg: "Unauthorized" })
        }
    }

    // Cerimônia (/assinatura/*): chave do signatário (addon_signatario) ou do
    // gerente quando ele mesmo é o signatário do documento (addon_solicitante
    // também assina). Sem senha — a própria lsak_ substitui o login por cookie.
    // Vinculo user_id === signatário do documento continua conferido dentro do
    // use case de assinatura (tab_signatarios), igual à sessão por cookie.
    async assinatura(req, res, next) {
        if (!req.headers[HEADER_CHAVE]) return authUser.All2FA(req, res, next);
        try {
            const validacao = await validarChave(req);
            if (!validacao.status) return res.status(403).json({ status: false, msg: validacao.msg })
            if (validacao.usuario.role !== roles.admin && validacao.usuario.role !== roles.user) return res.status(403).json({ status: false, msg: "Unauthorized" })
            if (validacao.chave.escopo !== ESCOPO_ADDON_SIGNATARIO && validacao.chave.escopo !== ESCOPO_ADDON_SOLICITANTE) return res.status(403).json({ status: false, msg: "Unauthorized" })
            req.integracao = montarIntegracao(validacao.chave, validacao.usuario);
            // A cerimônia guarda progresso em tab_login.session_id (mesmo ponteiro do login por
            // cookie). Sem isso, sessaoAssinatura recusa com "Dado incorreto" na primeira chamada.
            const checkLogin = await repositorioLogin.getLoginByUserId({ id: validacao.usuario.id })
            if (checkLogin.status && checkLogin.exit && checkLogin.data.session_id !== req.session.id) {
                await repositorioLogin.updateSessionId({ user_id: validacao.usuario.id, session_id: req.session.id })
            }
            const assinaturaEmAndamento = req.session.user && req.session.user.id === validacao.usuario.id ? req.session.user.assinatura : undefined;
            req.session.user = {
                id: validacao.usuario.id,
                email: validacao.usuario.email,
                role: validacao.usuario.role,
                integracao: true,
                assinatura: assinaturaEmAndamento,
            };
            repositorioChave.updateUltimoUso({ id: validacao.chave.id, ultimo_uso: dateNow() })
            next();
        } catch (err) {
            console.log(err)
            return res.status(403).json({ status: false, msg: "Unauthorized" })
        }
    }

}

module.exports = new authIntegracao();
