
require('dotenv/config');
const crypto = require('crypto');

// Convite da cerimônia: HMAC com o segredo local do serviço. O Web App não
// aceita documento_id solto — o link do e-mail carrega o HMAC e a validação
// acontece no /assinatura/convite e no login.
const hmacConvite = (documentoId, pedidoId, email) => {
    return crypto.createHmac('sha256', process.env.SHA)
        .update(`${documentoId}|${pedidoId}|${String(email || '').trim().toLowerCase()}`)
        .digest('hex');
};

const montarLinkAssinatura = (webappUrl, documentoId, pedidoId, email) => {
    const emailNormalizado = String(email || '').trim().toLowerCase();
    return `${webappUrl}${webappUrl.indexOf('?') >= 0 ? '&' : '?'}modo=assinar`
        + `&documento_id=${encodeURIComponent(documentoId)}`
        + `&pedido_id=${encodeURIComponent(pedidoId)}`
        + `&email=${encodeURIComponent(emailNormalizado)}`
        + `&convite=${hmacConvite(documentoId, pedidoId, emailNormalizado)}`;
};

module.exports = { hmacConvite, montarLinkAssinatura };
