
const ErrorStackParser = require('error-stack-parser');
const dateNow = require('../gateways/functions/data/getToday');
const createUseCase = require('../../@core/usecase/Signatarios/createSignatariosUseCase');
const historicoUseCase = require('../../@core/usecase/Historico/createHistoricoUseCase');
const { historico } = require('../../certs');
const logs = require('../../Logs');
const { SHA } = require('../gateways/crypt/sha');

class SignatariosController {

    async postSignatarios(req, res) {
        try {
            if (!req.session.user && !req.integracao) return res.status(401).json({ status: false, msg: 'Usuário não autenticado' });
            const documento_id = req.params.id || req.body.documento_id;
            if (!documento_id) return res.status(400).json({ status: false, msg: 'documento_id é obrigatório' });
            const signatarios = Array.isArray(req.body) ? req.body : req.body.signatarios;
            if (!Array.isArray(signatarios) || signatarios.length === 0) return res.status(400).json({ status: false, msg: 'Informe o array de signatários' });
            const sha = new SHA(process.env.SHA);
            const userAgent = req.headers['user-agent'] || 'unknown';
            const response = await createUseCase.indexSignatarios({
                documento_id,
                signatarios,
                user_id: req.integracao ? req.integracao.user_id : req.session.user.id,
                desafio_id: req.integracao ? req.integracao.desafio_id : req.session.user.desafio_id,
                sessao_id: req.integracao ? req.integracao.session_id : req.session.id,
                solicitacao_ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
                solicitacao_porta_logica: req.socket.remotePort,
                user_agent_hash: sha.encrypt(userAgent),
                integracao: req.integracao ? { chave_id: req.integracao.chave_id } : null,
            });
            if (response.status) {
                return res.status(200).json({
                    status: response.status,
                    msg: response.msg,
                });
            }
            if (response.revokeLogin && !req.integracao) {
                req.session.user = null;
                req.session.destroy();
            }
            return res.status(400).json({ status: response.status, msg: response.msg });
        } catch (err) {
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
                body: JSON.stringify(req.body),
            }, 'Erro no SignatariosController - postSignatarios');
            return res.status(500).json({ status: false, msg: 'Erro interno no servidor', error: err });
        }
    }

}

module.exports = new SignatariosController();
