const redis = require('../Redis/index');

const JANELA_SEGUNDOS = 120;
const LIMITE_REQUISICOES = 30;

module.exports = async (req, res, next) => {
    try {
        const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        if (!ip) return next();
        const chave = `ratelimit:verificar:${ip}`;
        const total = await redis.incr(chave);
        if (total === 1) await redis.expire(chave, JANELA_SEGUNDOS);
        if (total > LIMITE_REQUISICOES) return res.status(429).json({ status: false, msg: 'Muitas requisições. Tente novamente em instantes.' })
        next();
    } catch (err) {
        console.log(err);
        next();
    }
}
