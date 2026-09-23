
require('dotenv/config');
const crypto = require('crypto');

// Admin do serviço: token fixo do operador (ADMIN_TOKEN), só para vincular
// chave e gerenciar instalações. Não é o admin da plataforma LegacySignature.
module.exports = (req, res, next) => {
    const token = req.headers['x-admin-token'];
    if (!process.env.ADMIN_TOKEN) return res.status(403).json({ status: false, msg: "Admin do serviço não configurado." })
    if (!token || typeof token !== 'string') return res.status(403).json({ status: false, msg: "Unauthorized" })
    const recebido = crypto.createHash('sha256').update(token).digest();
    const esperado = crypto.createHash('sha256').update(process.env.ADMIN_TOKEN).digest();
    if (!crypto.timingSafeEqual(recebido, esperado)) return res.status(403).json({ status: false, msg: "Unauthorized" })
    next();
}
