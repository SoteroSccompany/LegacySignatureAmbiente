
require('dotenv/config');
const crypto = require('crypto');
const repositorioPedido = require('../../../infrastructure/db/services/PedidoRepository');
const apiLegacy = require('../../../infrastructure/gateways/ApiLegacy');
const { hmacConvite } = require('../../../infrastructure/gateways/functions/convite');
const { urlSite } = require('../../../config');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Entrada da cerimônia. Sem login/senha: o convite HMAC identifica o
// documento e o e-mail esperado; a lsak_ colada pelo signatário é quem prova
// quem ele é (conferida contra o e-mail do convite via /integracao/me).
class createSessaoSignatarioUseCase {

    async validarConvite(data) {
        try {
            if (!data.documento_id || !data.pedido_id || !data.email || !data.convite) return { status: false, msg: "Convite inválido." }
            const email = data.email.trim().toLowerCase();
            if (!EMAIL_REGEX.test(email)) return { status: false, msg: "Convite inválido." }
            const esperado = hmacConvite(data.documento_id, data.pedido_id, email);
            const recebido = String(data.convite);
            if (recebido.length !== esperado.length) return { status: false, msg: "Convite inválido ou expirado." }
            if (!crypto.timingSafeEqual(Buffer.from(recebido, 'utf8'), Buffer.from(esperado, 'utf8'))) return { status: false, msg: "Convite inválido ou expirado." }
            // Segunda fonte: o pedido tem que existir e apontar para o mesmo documento.
            const checkPedido = await repositorioPedido.getPedidoById({ id: data.pedido_id })
            if (!checkPedido.status) return { status: false, msg: "Ocorreu um erro interno, tente novamente em instantes." }
            if (!checkPedido.exit) return { status: false, msg: "Convite inválido ou expirado." }
            if (checkPedido.data.documento_id !== data.documento_id) return { status: false, msg: "Convite inválido ou expirado." }
            return { status: true, msg: "Convite válido.", data: { documento_id: data.documento_id, titulo: checkPedido.data.titulo, site: urlSite } }
        } catch (err) {
            console.log(err)
            return { status: false, msg: 'Erro interno do servidor, log gerado' }
        }
    }

    // Convite bate; agora confere se a lsak_ colada é da mesma pessoa convidada.
    // A lsak_ do solicitante do pedido não serve pra assinar no lugar do signatário
    // — aqui é só o e-mail; quem de fato bloqueia isso é o vínculo signatário x
    // documento dentro da API (tab_signatarios), na primeira chamada da cerimônia.
    async validarChaveConvite(data) {
        try {
            const convite = await this.validarConvite(data);
            if (!convite.status) return convite;
            if (!data.chave_api || typeof data.chave_api !== 'string' || !data.chave_api.startsWith('lsak_')) {
                return { status: false, msg: "Cole a chave de integração para continuar." }
            }
            const checkMe = await apiLegacy.get('/api/admin/integracao/me', data.chave_api)
            if (checkMe.statusHttp === 403) return { status: false, msg: "A API recusou a chave de integração. Confira se ela está ativa." }
            if (!checkMe.status) return { status: false, msg: "Ocorreu um erro interno ao validar a chave, tente novamente em instantes." }
            const dadosChave = checkMe.data?.data || {};
            const emailConvite = data.email.trim().toLowerCase();
            if (!dadosChave.email || dadosChave.email.trim().toLowerCase() !== emailConvite) {
                return { status: false, msg: "Esta chave pertence a outro e-mail. Cole a chave gerada para você." }
            }
            return { status: true, msg: "Chave válida.", data: { ...convite.data, escopo: dadosChave.escopo } }
        } catch (err) {
            console.log(err)
            return { status: false, msg: 'Erro interno do servidor, log gerado' }
        }
    }

    // Entrada sem colar a lsak_: a conta Google já tem lsic_ vinculada
    // (authInstalacao já autenticou). Só falta confirmar que o convite é
    // desta mesma pessoa — segunda fonte de verdade além do HMAC, mesmo
    // espírito de validarChaveConvite (e-mail do convite === e-mail da conta).
    async validarConviteInstalacao(data) {
        try {
            const convite = await this.validarConvite(data);
            if (!convite.status) return convite;
            if (!data.instalacao || !data.instalacao.email_usuario) return { status: false, msg: "Instalação não autenticada." }
            const emailConvite = data.email.trim().toLowerCase();
            const emailInstalacao = String(data.instalacao.email_usuario).trim().toLowerCase();
            if (emailInstalacao !== emailConvite) return { status: false, msg: "Este convite pertence a outro e-mail. Cole a chave de integração da pessoa convidada." }
            return { status: true, msg: "Convite válido.", data: { ...convite.data, escopo: data.instalacao.escopo } }
        } catch (err) {
            console.log(err)
            return { status: false, msg: 'Erro interno do servidor, log gerado' }
        }
    }

}

module.exports = new createSessaoSignatarioUseCase();
