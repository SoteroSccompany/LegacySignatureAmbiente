
const ErrorStackParser = require('error-stack-parser');
const dateNow = require('../gateways/functions/data/getToday');
const createSessaoSignatarioUseCase = require('../../@core/usecase/AssinaturaSessao/createSessaoSignatarioUseCase');
const logs = require('../../Logs');

// Entrada da cerimônia. Sem login/senha: o Web App valida o convite e, na
// sequência, a própria lsak_ do signatário — nada fica guardado aqui.
class AssinaturaSessaoController {

    async getConvite(req, res) {
        try {
            const { documento_id, pedido_id, email, convite } = req.query;
            if (!documento_id || !pedido_id || !email || !convite) return res.status(400).json({ status: false, msg: 'Convite inválido' })
            const response = await createSessaoSignatarioUseCase.validarConvite({ documento_id, pedido_id, email, convite })
            if (response.status) return res.status(200).json({ status: true, msg: response.msg, data: response.data })
            res.status(400).json({ status: response.status, msg: response.msg })
        } catch (err) {
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(err);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            logs.getInstance().error({ linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), err }, 'Erro no AssinaturaSessaoController - getConvite')
            res.status(500).json({ status: false, msg: 'Erro interno no servidor' })
        }
    }

    async postValidarChave(req, res) {
        try {
            const { documento_id, pedido_id, email, convite, chave_api } = req.body;
            if (!documento_id || !pedido_id || !email || !convite) return res.status(400).json({ status: false, msg: 'Convite inválido' })
            if (!chave_api || chave_api.trim() === '') return res.status(400).json({ status: false, msg: 'Cole a chave de integração para continuar.' })
            const response = await createSessaoSignatarioUseCase.validarChaveConvite({ documento_id, pedido_id, email, convite, chave_api: chave_api.trim() })
            if (response.status) return res.status(200).json({ status: true, msg: response.msg, data: response.data })
            res.status(400).json({ status: response.status, msg: response.msg })
        } catch (err) {
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(err);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            logs.getInstance().error({ linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), err }, 'Erro no AssinaturaSessaoController - postValidarChave')
            res.status(500).json({ status: false, msg: 'Erro interno no servidor' })
        }
    }

    // Conta Google já com lsic_ vinculada (authInstalacao) — sem colar a lsak_ de novo.
    async postValidarInstalacao(req, res) {
        try {
            const { documento_id, pedido_id, email, convite } = req.body;
            if (!documento_id || !pedido_id || !email || !convite) return res.status(400).json({ status: false, msg: 'Convite inválido' })
            const response = await createSessaoSignatarioUseCase.validarConviteInstalacao({ documento_id, pedido_id, email, convite, instalacao: req.instalacao })
            if (response.status) return res.status(200).json({ status: true, msg: response.msg, data: response.data })
            res.status(400).json({ status: response.status, msg: response.msg })
        } catch (err) {
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(err);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            logs.getInstance().error({ linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), err }, 'Erro no AssinaturaSessaoController - postValidarInstalacao')
            res.status(500).json({ status: false, msg: 'Erro interno no servidor' })
        }
    }

}

module.exports = new AssinaturaSessaoController();
