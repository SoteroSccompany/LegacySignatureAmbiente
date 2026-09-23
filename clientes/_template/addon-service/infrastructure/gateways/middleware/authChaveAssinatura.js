
require('dotenv/config');
const repositorioInstalacao = require('../../db/services/InstalacaoRepository');
const { statusInstalacao } = require('../../../config');
const { SHA } = require('../crypt/sha');

// Cerimônia (Web App): sem login, sem cookie, sem Redis. Quem valida de fato
// é a API (authIntegracao.assinatura) — aqui só resolve qual lsak_ vai no
// x-integracao-key da chamada seguinte. Duas origens:
// 1) x-integracao-key: a própria lsak_ do signatário, colada na tela (quem
//    entra só pelo link do convite, sem conta vinculada nesta máquina).
// 2) x-instalacao-key: a lsic_ já vinculada nesta conta Google — decifra a
//    lsak_ salva na instalação, mesma resolução do authInstalacao. Evita
//    colar a lsak_ de novo quando quem assina já vinculou a própria conta.
module.exports = async (req, res, next) => {
    try {
        const chaveIntegracao = req.headers['x-integracao-key'];
        if (chaveIntegracao && typeof chaveIntegracao === 'string' && chaveIntegracao.startsWith('lsak_')) {
            req.chaveAssinatura = chaveIntegracao;
            return next();
        }
        const credencial = req.headers['x-instalacao-key'];
        if (!credencial || typeof credencial !== 'string' || !credencial.startsWith('lsic_')) {
            return res.status(403).json({ status: false, msg: "Chave de assinatura não informada. Cole a chave de integração para continuar." })
        }
        const sha = new SHA();
        const checkInstalacao = await repositorioInstalacao.getInstalacaoByCredencialHash({ credencial_hash: sha.hash(credencial) })
        if (!checkInstalacao.status) return res.status(500).json({ status: false, msg: "Ocorreu um erro interno, tente novamente em instantes." })
        if (!checkInstalacao.exit) return res.status(403).json({ status: false, msg: "Unauthorized" })
        const instalacao = checkInstalacao.data;
        if (instalacao.status !== statusInstalacao.ativa) return res.status(403).json({ status: false, msg: "Instalação revogada. Entre em contato com o administrador." })
        if (instalacao.credencial_prefixo !== credencial.slice(0, 12)) return res.status(403).json({ status: false, msg: "Unauthorized" })
        req.chaveAssinatura = sha.decrypt(instalacao.chave_api);
        next();
    } catch (err) {
        console.log(err)
        return res.status(403).json({ status: false, msg: "Unauthorized" })
    }
}
