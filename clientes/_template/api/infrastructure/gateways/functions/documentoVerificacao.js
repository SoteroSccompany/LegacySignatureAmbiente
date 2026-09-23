const crypto = require('crypto');

/**
 * Código de verificação matemático do documento: um HMAC-SHA256 derivado de `documento_id` + `hash_original`
 * (âncora imutável, gravada uma única vez na criação do documento). Qualquer parte que conheça o segredo
 * consegue recalcular o mesmo código a partir dos dados atuais do documento e confirmar que o vínculo
 * código -> documento não foi adulterado no banco.
 */

function segredo() {
    const s = process.env.DOCUMENTO_VERIFICACAO_SECRET;
    if (!s) throw new Error('DOCUMENTO_VERIFICACAO_SECRET não configurado');
    return s;
}

function formatarCodigo(hex) {
    const bloco = hex.substring(0, 20).toUpperCase();
    return bloco.match(/.{1,5}/g).join('-');
}

function gerarCodigoVerificacao({ documento_id, hash_original }) {
    if (!documento_id || !hash_original) throw new Error('documento_id e hash_original são obrigatórios para gerar o código de verificação');
    const hmac = crypto.createHmac('sha256', segredo())
        .update(`${documento_id}:${hash_original}`)
        .digest('hex');
    return formatarCodigo(hmac);
}

function validarCodigoVerificacao({ documento_id, hash_original, codigo_verificacao }) {
    if (!codigo_verificacao) return false;
    const esperado = gerarCodigoVerificacao({ documento_id, hash_original });
    const bufferEsperado = Buffer.from(esperado);
    const bufferRecebido = Buffer.from(String(codigo_verificacao));
    if (bufferEsperado.length !== bufferRecebido.length) return false;
    return crypto.timingSafeEqual(bufferEsperado, bufferRecebido);
}

module.exports = {
    gerarCodigoVerificacao,
    validarCodigoVerificacao,
};
