

const fs = require('fs');
const crypt = require('../key/crypt')
require('dotenv/config');


const authMiddleware = async (req, res, next) => {
    try {
        if (req.headers['proxyauthorization'] === undefined || req.headers['proxyauthorization'] === null || req.headers['proxyauthorization'] === "" ||
            req.headers['proxyauthorization'] === " " || req.headers['proxyauthorization'] === "null") return res.status(403).json({ status: false, msg: "Token não informado" });
        const token = req.headers['proxyauthorization'].split(' ')[1];
        if (token === undefined || token === null || token === "" || token === " " || token === "null" || token === "undefined") return res.status(403).json({ status: false, msg: "Token não informado" });
        const tokenVerify = crypt.verify({ type: "keyproxy", dto: token });
        if (tokenVerify.status) {
            if (tokenVerify.token == process.env.PROXYKEY) {
                next();
            } else {
                res.status(403).json({ status: false, msg: "Token inválidoProxy1" });
            }
        } else {
            res.status(403).json({ status: false, msg: "Token inválidoProxy3" });
        }
    } catch (err) {
        const msgFile = `Erro ao conferir chave de acesso: ${err.message}\n${err.stack}\n`;
        fs.appendFileSync('logMiddlewareAuth.log', String(msgFile));
        return res.status(403).json({ status: false, msg: "Token inválidoProxy2" });
    }
}


module.exports = {
    proxy: authMiddleware
};