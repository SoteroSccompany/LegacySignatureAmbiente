
const ErrorStackParser = require('error-stack-parser');
const dateNow = require('../gateways/functions/data/getToday');
const gerarCertificadoAuditoriaUseCase = require('../../@core/usecase/AuditoriaLedger/gerarCertificadoAuditoriaUseCase');
const validarDocumentoEnviadoUseCase = require('../../@core/usecase/AuditoriaLedger/validarDocumentoEnviadoUseCase');
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
    }, `Erro no AuditoriaCertificadoController - ${metodo}`);
}

class AuditoriaCertificadoController {

    async getPorCodigo(req, res) {
        try {
            const codigo_verificacao = req.params.codigo;
            if (!codigo_verificacao) return res.status(400).json({ status: false, msg: 'codigo é obrigatório' });
            const verificacaoProfunda = req.query.profundo !== 'false';
            const response = await gerarCertificadoAuditoriaUseCase.executar({
                codigo_verificacao,
                verificacao_profunda: verificacaoProfunda,
            });
            return res.status(response.status ? 200 : 400).json(response);
        } catch (err) {
            logErroController(err, req, 'getPorCodigo');
            return res.status(500).json({ status: false, msg: 'Erro interno no servidor' });
        }
    }

    async getPorDocumentoId(req, res) {
        try {
            const documento_id = req.params.id;
            if (!documento_id) return res.status(400).json({ status: false, msg: 'documento_id é obrigatório' });
            const verificacaoProfunda = req.query.profundo !== 'false';
            const response = await gerarCertificadoAuditoriaUseCase.executar({
                documento_id,
                verificacao_profunda: verificacaoProfunda,
            });
            return res.status(response.status ? 200 : 400).json(response);
        } catch (err) {
            logErroController(err, req, 'getPorDocumentoId');
            return res.status(500).json({ status: false, msg: 'Erro interno no servidor' });
        }
    }

    async validarDocumentoEnviado(req, res) {
        try {
            const codigo_verificacao = req.params.codigo;
            if (codigo_verificacao === undefined || codigo_verificacao === null || codigo_verificacao === '' || codigo_verificacao === ' ') return res.status(400).json({ status: false, msg: 'codigo é obrigatório' });
            const buffer = Buffer.isBuffer(req.body) ? req.body : null;
            if (!buffer || buffer.length === 0) return res.status(400).json({ status: false, msg: 'Arquivo PDF é obrigatório.' });
            const response = await validarDocumentoEnviadoUseCase.validarDocumentoEnviado({
                codigo_verificacao,
                buffer,
                ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
                porta_logica: req.socket.remotePort,
                user_agent: req.headers['user-agent'],
            });
            if (response.status) {
                return res.status(200).json({
                    status: true,
                    msg: response.msg,
                    data: {
                        veredito: response.data.veredito,
                        hash_documento_enviado: response.data.hash_documento_enviado,
                        hash_conferido_com: response.data.hash_conferido_com,
                        elo: response.data.elo,
                    },
                });
            }
            return res.status(400).json({ status: false, msg: response.msg });
        } catch (err) {
            logErroController(err, req, 'validarDocumentoEnviado');
            return res.status(500).json({ status: false, msg: 'Erro interno no servidor' });
        }
    }

}

module.exports = new AuditoriaCertificadoController();
