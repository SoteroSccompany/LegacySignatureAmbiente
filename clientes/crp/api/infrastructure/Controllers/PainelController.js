
const ErrorStackParser = require('error-stack-parser');
const dateNow = require('../gateways/functions/data/getToday');
const painelUseCase = require('../../@core/usecase/Painel/painelUseCase');
const logs = require('../../Logs');

function logErroController(err, req, metodo) {
    let lineError = '0';
    let fileName = '0';
    const stackFrames = ErrorStackParser.parse(err);
    if (stackFrames.length > 0) {
        lineError = stackFrames[0].lineNumber;
        fileName = stackFrames[0].fileName;
    }
    logs.getInstance().error({
        linhaDoErro: lineError,
        nomeDoArquivo: fileName,
        data_criacao: dateNow(),
        err: err,
        query: JSON.stringify(req.query || {}),
    }, `Erro no PainelController - ${metodo}`);
}

class PainelController {

    async getSolicitacoes(req, res) {
        try {
            const response = await painelUseCase.listarSolicitacoes({
                user_id: req.integracao ? req.integracao.user_id : req.session.user.id,
                limit: req.query.limit,
                offset: req.query.offset,
                status: req.query.status || null,
            });
            return res.status(response.status ? 200 : 400).json(response);
        } catch (err) {
            logErroController(err, req, 'getSolicitacoes');
            return res.status(500).json({ status: false, msg: 'Erro interno no servidor' });
        }
    }

    async getSolicitacaoDetalhe(req, res) {
        try {
            const id = req.params.id;
            if (!id) return res.status(400).json({ status: false, msg: 'Id não pode ser vazio' });
            const response = await painelUseCase.detalheSolicitacao({
                user_id: req.integracao ? req.integracao.user_id : req.session.user.id,
                id,
            });
            return res.status(response.status ? 200 : 400).json(response);
        } catch (err) {
            logErroController(err, req, 'getSolicitacaoDetalhe');
            return res.status(500).json({ status: false, msg: 'Erro interno no servidor' });
        }
    }

    async getContratos(req, res) {
        try {
            const response = await painelUseCase.listarContratos({
                user_id: req.session.user.id,
                limit: req.query.limit,
                offset: req.query.offset,
            });
            return res.status(response.status ? 200 : 400).json(response);
        } catch (err) {
            logErroController(err, req, 'getContratos');
            return res.status(500).json({ status: false, msg: 'Erro interno no servidor' });
        }
    }

    async getDocumentoDownload(req, res) {
        try {
            const documento_id = req.params.id;
            if (!documento_id) return res.status(400).json({ status: false, msg: 'Id não pode ser vazio' });
            const response = await painelUseCase.getDownloadDocumento({
                user_id: req.integracao ? req.integracao.user_id : req.session.user.id,
                documento_id,
            });
            return res.status(response.status ? 200 : 400).json(response);
        } catch (err) {
            logErroController(err, req, 'getDocumentoDownload');
            return res.status(500).json({ status: false, msg: 'Erro interno no servidor' });
        }
    }

    async getUsuariosBusca(req, res) {
        try {
            const q = req.query.q;
            if (q === undefined || q === null || q === '' || q === ' ') {
                return res.status(400).json({ status: false, msg: 'Informe o termo de busca (q).' });
            }
            const response = await painelUseCase.buscarUsuariosParaSignatario({
                user_id: req.integracao ? req.integracao.user_id : req.session.user.id,
                q,
                limit: req.query.limit,
            });
            return res.status(response.status ? 200 : 400).json(response);
        } catch (err) {
            logErroController(err, req, 'getUsuariosBusca');
            return res.status(500).json({ status: false, msg: 'Erro interno no servidor' });
        }
    }

}

module.exports = new PainelController();
