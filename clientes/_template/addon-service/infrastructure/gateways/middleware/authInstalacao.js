
require('dotenv/config');
const repositorioInstalacao = require('../../db/services/InstalacaoRepository');
const dateNow = require('../functions/data/getToday');
const { statusInstalacao } = require('../../../config');
const { SHA } = require('../crypt/sha');

// Credencial de instalação do Addon (lsic_...). O Apps Script manda no header
// x-instalacao-key. A chave de integração da API nunca sai do serviço.
module.exports = async (req, res, next) => {
    try {
        const credencial = req.headers['x-instalacao-key'];
        if (!credencial || typeof credencial !== 'string') return res.status(403).json({ status: false, msg: "Unauthorized" })
        if (!credencial.startsWith('lsic_')) return res.status(403).json({ status: false, msg: "Unauthorized" })
        const sha = new SHA();
        const checkInstalacao = await repositorioInstalacao.getInstalacaoByCredencialHash({ credencial_hash: sha.hash(credencial) })
        if (!checkInstalacao.status) return res.status(500).json({ status: false, msg: "Ocorreu um erro interno, tente novamente em instantes." })
        if (!checkInstalacao.exit) return res.status(403).json({ status: false, msg: "Unauthorized" })
        const instalacao = checkInstalacao.data;
        if (instalacao.status !== statusInstalacao.ativa) return res.status(403).json({ status: false, msg: "Instalação revogada. Entre em contato com o administrador." })
        if (instalacao.credencial_prefixo !== credencial.slice(0, 12)) return res.status(403).json({ status: false, msg: "Unauthorized" })
        req.instalacao = {
            id: instalacao.id,
            nome: instalacao.nome,
            email_usuario: instalacao.email_usuario,
            chave_admin: instalacao.chave_admin === 1 || instalacao.chave_admin === true,
            escopo: instalacao.escopo,
            pasta_raiz_drive: instalacao.pasta_raiz_drive,
            chave_api: sha.decrypt(instalacao.chave_api),
            chave_api_prefixo: instalacao.chave_api_prefixo,
        };
        repositorioInstalacao.updateUltimoUso({ id: instalacao.id, ultimo_uso: dateNow() })
        next();
    } catch (err) {
        console.log(err)
        return res.status(403).json({ status: false, msg: "Unauthorized" })
    }
}
