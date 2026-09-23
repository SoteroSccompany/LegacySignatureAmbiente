
const ErrorStackParser = require('error-stack-parser');
const dateNow = require('../gateways/functions/data/getToday');
const cerimoniaUseCase = require('../../@core/usecase/AssinaturaSessao/cerimoniaSignatarioUseCase');
const logs = require('../../Logs');

// Helper no módulo: as rotas registram os métodos soltos e o this se perde.
const dados = (req) => ({ chave_api: req.chaveAssinatura, email: req.query.email || req.body.email || null });

const responder = (res, response) => {
    if (!response.status) return res.status(400).json({ status: false, msg: response.msg })
    res.status(response.statusHttp).json(response.body)
};

const logErro = (err, metodo) => {
    let lineError = '0';
    let fileName = '0';
    const stackFrames = ErrorStackParser.parse(err);
    if (stackFrames.length > 0) {
        lineError = stackFrames[0].lineNumber;
        fileName = stackFrames[0].fileName;
    }
    logs.getInstance().error({ linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), err }, `Erro no CerimoniaController - ${metodo}`);
};

// Cerimônia do signatário no Web App, autenticada com a própria lsak_ (sem
// senha). Cada rota repassa o corpo da API como veio (mesmo contrato
// msg/data/next_step do site). Onboarding (perfil, TOTP, foto de referência)
// é feito no site, antes de pedir/receber a chave — não entra aqui.
class CerimoniaController {

    async getTermos(req, res) {
        try {
            responder(res, await cerimoniaUseCase.listarTermos({ ...dados(req), filter: req.query.filter, search: req.query.search }))
        } catch (err) {
            logErro(err, 'getTermos')
            res.status(500).json({ status: false, msg: 'Erro interno no servidor' })
        }
    }

    async postTermoAceite(req, res) {
        try {
            const { termo_id } = req.body;
            if (!termo_id) return res.status(400).json({ status: false, msg: 'termo_id não pode ser vazio' })
            responder(res, await cerimoniaUseCase.aceitarTermo({ ...dados(req), termo_id }))
        } catch (err) {
            logErro(err, 'postTermoAceite')
            res.status(500).json({ status: false, msg: 'Erro interno no servidor' })
        }
    }

    async getProgresso(req, res) {
        try {
            const documento_id = req.query.documento_id;
            responder(res, await cerimoniaUseCase.progressoSessao({ ...dados(req), documento_id }))
        } catch (err) {
            logErro(err, 'getProgresso')
            res.status(500).json({ status: false, msg: 'Erro interno no servidor' })
        }
    }

    async postSessao(req, res) {
        try {
            const documento_id = req.body.documento_id;
            if (!documento_id) return res.status(400).json({ status: false, msg: 'documento_id não pode ser vazio' })
            responder(res, await cerimoniaUseCase.criarSessaoAssinatura({ ...dados(req), documento_id }))
        } catch (err) {
            logErro(err, 'postSessao')
            res.status(500).json({ status: false, msg: 'Erro interno no servidor' })
        }
    }

    async postSessao2FA(req, res) {
        try {
            const { token } = req.body;
            if (!token || String(token).trim() === '') return res.status(400).json({ status: false, msg: 'Token não pode ser vazio' })
            responder(res, await cerimoniaUseCase.confirmar2FAAssinatura({ ...dados(req), token }))
        } catch (err) {
            logErro(err, 'postSessao2FA')
            res.status(500).json({ status: false, msg: 'Erro interno no servidor' })
        }
    }

    async postConfirmarFoto(req, res) {
        try {
            const { id_identificador, documento_id, foto } = req.body;
            if (!id_identificador) return res.status(400).json({ status: false, msg: 'id_identificador não pode ser vazio' })
            responder(res, await cerimoniaUseCase.confirmarFoto({ ...dados(req), id_identificador, documento_id, foto }))
        } catch (err) {
            logErro(err, 'postConfirmarFoto')
            res.status(500).json({ status: false, msg: 'Erro interno no servidor' })
        }
    }

    async getStatusFoto(req, res) {
        try {
            const documento_id = req.query.documento_id;
            responder(res, await cerimoniaUseCase.statusFoto({ ...dados(req), documento_id }))
        } catch (err) {
            logErro(err, 'getStatusFoto')
            res.status(500).json({ status: false, msg: 'Erro interno no servidor' })
        }
    }

    async getDocumento(req, res) {
        try {
            const id = req.params.id
            if (id === undefined || id === null || id === '' || id === ' ') return res.status(400).json({ status: false, msg: 'Id não pode ser vazio' })
            responder(res, await cerimoniaUseCase.getDocumento({ ...dados(req), documento_id: id }))
        } catch (err) {
            logErro(err, 'getDocumento')
            res.status(500).json({ status: false, msg: 'Erro interno no servidor' })
        }
    }

    async getDocumentoPdf(req, res) {
        try {
            const id = req.params.id
            if (id === undefined || id === null || id === '' || id === ' ') return res.status(400).json({ status: false, msg: 'Id não pode ser vazio' })
            const response = await cerimoniaUseCase.baixarPdfPreview({ ...dados(req), documento_id: id })
            if (!response.status) return res.status(400).json({ status: false, msg: response.msg })
            res.setHeader('Content-Type', 'application/pdf')
            res.setHeader('Cache-Control', 'no-store')
            res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin')
            res.send(response.data)
        } catch (err) {
            logErro(err, 'getDocumentoPdf')
            res.status(500).json({ status: false, msg: 'Erro interno no servidor' })
        }
    }

    async postEstampaUrl(req, res) {
        try {
            const id = req.params.id
            if (id === undefined || id === null || id === '' || id === ' ') return res.status(400).json({ status: false, msg: 'Id não pode ser vazio' })
            responder(res, await cerimoniaUseCase.estampaUrl({ ...dados(req), documento_id: id }))
        } catch (err) {
            logErro(err, 'postEstampaUrl')
            res.status(500).json({ status: false, msg: 'Erro interno no servidor' })
        }
    }

    async postAssinar(req, res) {
        try {
            const id = req.params.id
            if (id === undefined || id === null || id === '' || id === ' ') return res.status(400).json({ status: false, msg: 'Id não pode ser vazio' })
            if (!req.body.id) return res.status(400).json({ status: false, msg: 'Identificador do processo não pode ser vazio' })
            responder(res, await cerimoniaUseCase.assinar({ ...dados(req), documento_id: id, id: req.body.id }))
        } catch (err) {
            logErro(err, 'postAssinar')
            res.status(500).json({ status: false, msg: 'Erro interno no servidor' })
        }
    }

    async getStatusAssinatura(req, res) {
        try {
            const id = req.params.id
            if (id === undefined || id === null || id === '' || id === ' ') return res.status(400).json({ status: false, msg: 'Id não pode ser vazio' })
            responder(res, await cerimoniaUseCase.statusAssinatura({ ...dados(req), documento_id: id }))
        } catch (err) {
            logErro(err, 'getStatusAssinatura')
            res.status(500).json({ status: false, msg: 'Erro interno no servidor' })
        }
    }

    async getDownload(req, res) {
        try {
            const id = req.params.id
            if (id === undefined || id === null || id === '' || id === ' ') return res.status(400).json({ status: false, msg: 'Id não pode ser vazio' })
            responder(res, await cerimoniaUseCase.downloadAssinado({ ...dados(req), documento_id: id }))
        } catch (err) {
            logErro(err, 'getDownload')
            res.status(500).json({ status: false, msg: 'Erro interno no servidor' })
        }
    }

}

module.exports = new CerimoniaController();
