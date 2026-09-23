
const ErrorStackParser = require('error-stack-parser');
const dateNow = require('../gateways/functions/data/getToday');
const createUseCase = require('../../@core/usecase/Assinatura/createAssinaturaUseCase');
const createAssinatura = require('../../@core/usecase/Assinatura/createAssinatura');
const logs = require('../../Logs');
const { SHA } = require('../gateways/crypt/sha');


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
        body: JSON.stringify(req.body || {}),
    }, `Erro no AssinaturaController - ${metodo}`);
}

class AssinaturaController {

    async postSessao(req, res) {
        try {
            const { documento_id } = req.body;
            if (!documento_id) return res.status(400).json({ status: false, msg: 'O campo de documento é obrigatório' });
            const sha = new SHA(process.env.SHA);
            const userAgent = req.headers['user-agent'] || 'unknown';
            const response = await createAssinatura.sessaoAssinatura({
                documento_id: documento_id,
                solicitacao_ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
                solicitacao_porta_logica: req.socket.remotePort,
                user_agent_hash: sha.encrypt(userAgent),
                user_id: req.session.user.id,
            }, req.session, sha);

            return res.status(response.status ? 200 : 400).json(response);
        } catch (err) {
            logErroController(err, req, 'postSessao');
            return res.status(500).json({ status: false, msg: 'Erro interno no servidor' });
        }
    }

    async postSessao2FA(req, res) {
        try {
            const { token } = req.body;
            if (!token) return res.status(400).json({ status: false, msg: 'Token é obrigatório' });
            const sha = new SHA(process.env.SHA);
            const userAgent = req.headers['user-agent'] || 'unknown';
            const response = await createAssinatura.confirmarSessaoAssinatura({
                token: token,
                solicitacao_ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
                solicitacao_porta_logica: req.socket.remotePort,
                user_agent_hash: sha.encrypt(userAgent),
            }, req.session, sha);

            return res.status(response.status ? 200 : 400).json(response);
        } catch (err) {
            logErroController(err, req, 'postSessao2FA');
            return res.status(500).json({ status: false, msg: 'Erro interno no servidor' });
        }
    }

    async postConfirmarRecebimentoFoto(req, res) {
        try {
            const { id_identificador } = req.body;
            if (!id_identificador) return res.status(400).json({ status: false, msg: 'Id do identificador é obrigatório' });
            const sha = new SHA(process.env.SHA);
            const userAgent = req.headers['user-agent'] || 'unknown';
            const response = await createAssinatura.confirmarRecebimento({
                solicitacao_ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
                solicitacao_porta_logica: req.socket.remotePort,
                user_agent_hash: sha.encrypt(userAgent),
                id_identificador: id_identificador,
            }, req.session, sha);

            return res.status(response.status ? 200 : 400).json(response);
        } catch (err) {
            logErroController(err, req, 'postSessao2FA');
            return res.status(500).json({ status: false, msg: 'Erro interno no servidor' });
        }
    }

    async getStatusFoto(req, res) {
        try {
            if (!req.session.user) return res.status(400).json({ status: false, msg: 'Sessão expirada, faça login novamente.' });
            const { documento_id } = req.query;
            // Sessão da cerimônia pode ter se perdido (novo login, cookie recriado) no meio
            // do polling — reconstrói via progresso em vez de recusar de cara.
            if (!req.session.user.assinatura && documento_id) {
                const progresso = await createAssinatura.carregarProgressoSessao({ documento_id, user_id: req.session.user.id }, req.session);
                if (!progresso.status) return res.status(400).json(progresso);
            }
            if (!req.session.user.assinatura) return res.status(403).json({ status: false, msg: 'Sessão não autorizada para este documento.' });
            const response = await createUseCase.getStatusFotoBiometria({
                documento_id: req.session.user.assinatura.documento_id,
                signatario_id: req.session.user.assinatura.signatario_id,
                user_id: req.session.user.id,
            });
            return res.status(response.status ? 200 : 400).json(response);
        } catch (err) {
            logErroController(err, req, 'getStatusFoto');
            return res.status(500).json({ status: false, msg: 'Erro interno no servidor' });
        }
    }

    async getProgressoSessao(req, res) {
        try {
            if (!req.session.user) return res.status(400).json({ status: false, msg: 'Sessão expirada, faça login novamente.' });
            const { documento_id } = req.query;
            if (!documento_id) return res.status(400).json({ status: false, msg: 'documento_id é obrigatório' });
            const response = await createAssinatura.carregarProgressoSessao({
                documento_id,
                user_id: req.session.user.id,
            }, req.session);
            return res.status(response.status ? 200 : 400).json(response);
        } catch (err) {
            logErroController(err, req, 'getProgressoSessao');
            return res.status(500).json({ status: false, msg: 'Erro interno no servidor' });
        }
    }

    async getDocumento(req, res) {
        try {
            if (!req.session.user) return res.status(400).json({ status: false, msg: 'Sessão expirada, faça login novamente.' });
            const documento_id = req.params.id;
            if (!documento_id) return res.status(400).json({ status: false, msg: 'documento_id é obrigatório' });
            // Sem sessão da cerimônia (ou de outro documento) reconstrói via progresso —
            // FaceMatch já validado ou signatário já assinado não deve exigir refazer o OTP.
            if (!req.session.user.assinatura || req.session.user.assinatura.documento_id !== documento_id) {
                const progresso = await createAssinatura.carregarProgressoSessao({ documento_id, user_id: req.session.user.id }, req.session);
                if (!progresso.status) return res.status(400).json(progresso);
            }
            if (!req.session.user.assinatura || req.session.user.assinatura.documento_id !== documento_id) {
                return res.status(403).json({ status: false, msg: 'Sessão não autorizada para este documento.' });
            }

            const response = await createUseCase.getDocumentoAssinatura({
                user_id: req.session.user.id,
                documento_id,
            });
            return res.status(response.status ? 200 : 400).json(response);
        } catch (err) {
            logErroController(err, req, 'getDocumento');
            return res.status(500).json({ status: false, msg: 'Erro interno no servidor' });
        }
    }

    async postEstampaUploadUrl(req, res) {
        try {
            if (!req.session.user) return res.status(400).json({ status: false, msg: 'Sessão expirada, faça login novamente.' });
            const documento_id = req.params.id;
            if (!documento_id) return res.status(400).json({ status: false, msg: 'documento_id é obrigatório' });
            if (!req.session.user.assinatura || req.session.user.assinatura.documento_id !== documento_id) {
                const progresso = await createAssinatura.carregarProgressoSessao({ documento_id, user_id: req.session.user.id }, req.session);
                if (!progresso.status) return res.status(400).json(progresso);
            }
            if (!req.session.user.assinatura || req.session.user.assinatura.documento_id !== documento_id) return res.status(403).json({ status: false, msg: 'Sessão não autorizada para este documento.' });
            const response = await createUseCase.getUploadEstampaUrl({
                documento_id,
                signatario_id: req.session.user.assinatura.signatario_id,
                user_id: req.session.user.id,
            });
            return res.status(response.status ? 200 : 400).json(response);
        } catch (err) {
            logErroController(err, req, 'postEstampaUploadUrl');
            return res.status(500).json({ status: false, msg: 'Erro interno no servidor' });
        }
    }

    async postAssinar(req, res) {
        try {
            if (!req.session.user) return res.status(400).json({ status: false, msg: 'Sessão expirada, faça login novamente.' });
            const documento_id = req.params.id;
            if (!documento_id) return res.status(400).json({ status: false, msg: 'documento_id é obrigatório' });
            if (!req.session.user.assinatura || req.session.user.assinatura.documento_id !== documento_id) {
                const progresso = await createAssinatura.carregarProgressoSessao({ documento_id, user_id: req.session.user.id }, req.session);
                if (!progresso.status) return res.status(400).json(progresso);
            }
            if (!req.session.user.assinatura || req.session.user.assinatura.documento_id !== documento_id) return res.status(403).json({ status: false, msg: 'Sessão não autorizada para este documento.' });
            const { id } = req.body;
            if (!id) return res.status(400).json({ status: false, msg: 'Id do processo de estampa é obrigatório.' });
            const response = await createUseCase.solicitarAssinatura({
                user_id: req.session.user.id,
                documento_id,
                signatario_id: req.session.user.assinatura.signatario_id,
                id,
            });
            return res.status(response.status ? 200 : 400).json(response);
        } catch (err) {
            logErroController(err, req, 'postAssinar');
            return res.status(500).json({ status: false, msg: 'Erro interno no servidor' });
        }
    }

    async getStatus(req, res) {
        try {
            if (!req.session.user) return res.status(400).json({ status: false, msg: 'Sessão expirada, faça login novamente.' });
            const documento_id = req.params.id;
            if (!documento_id) return res.status(400).json({ status: false, msg: 'documento_id é obrigatório' });
            // Sem check de req.session.user.assinatura de propósito: signatário já
            // processando/assinado deve poder consultar o status mesmo sem a sessão da
            // cerimônia viva — getStatusAssinatura já restringe por user_id no where.
            const response = await createUseCase.getStatusAssinatura({
                user_id: req.session.user.id,
                documento_id,
            });
            return res.status(response.status ? 200 : 400).json(response);
        } catch (err) {
            logErroController(err, req, 'getStatus');
            return res.status(500).json({ status: false, msg: 'Erro interno no servidor' });
        }
    }

    async getDownload(req, res) {
        try {
            if (!req.session.user) return res.status(400).json({ status: false, msg: 'Sessão expirada, faça login novamente.' });
            const documento_id = req.params.id;
            if (!documento_id) return res.status(400).json({ status: false, msg: 'documento_id é obrigatório' });
            const response = await createUseCase.getStatusAssinatura({
                user_id: req.session.user.id,
                documento_id,
            });
            if (!response.status) return res.status(400).json(response);
            if (!response.data?.download_url) {
                return res.status(400).json({ status: false, msg: 'PDF assinado ainda não disponível.' });
            }
            return res.status(200).json({
                status: true,
                msg: 'URL de download gerada',
                data: { url: response.data.download_url },
            });
        } catch (err) {
            logErroController(err, req, 'getDownload');
            return res.status(500).json({ status: false, msg: 'Erro interno no servidor' });
        }
    }

}

module.exports = new AssinaturaController();
