
const ErrorStackParser = require('error-stack-parser');
const dateNow = require('../gateways/functions/data/getToday');
const createInstalacaoUseCase = require('../../@core/usecase/Instalacao/createInstalacaoUseCase');
const logs = require('../../Logs');

class AdminController {

    async postInstalacao(req, res) {
        try {
            const { nome, chave_api, email_usuario, pasta_raiz_drive } = req.body;
            if (!nome || nome.trim() === '') return res.status(400).json({ status: false, msg: 'Campo nome não pode ser vazio' })
            if (!chave_api || chave_api.trim() === '') return res.status(400).json({ status: false, msg: 'Campo chave_api não pode ser vazio' })
            const response = await createInstalacaoUseCase.indexInstalacao({ nome, chave_api: chave_api.trim(), email_usuario, pasta_raiz_drive })
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
            logs.getInstance().error({ linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), err }, 'Erro no AdminController - postInstalacao')
            res.status(500).json({ status: false, msg: 'Erro interno no servidor' })
        }
    }

    async getInstalacoes(req, res) {
        try {
            const response = await createInstalacaoUseCase.listarInstalacoes()
            if (response.status) return res.status(200).json({ status: true, data: response.data, msg: response.msg })
            res.status(400).json({ status: response.status, msg: response.msg })
        } catch (err) {
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(err);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            logs.getInstance().error({ linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), err }, 'Erro no AdminController - getInstalacoes')
            res.status(500).json({ status: false, msg: 'Erro interno no servidor' })
        }
    }

    async deleteInstalacao(req, res) {
        try {
            const id = req.params.id
            if (id === undefined || id === null || id === '' || id === ' ') return res.status(400).json({ status: false, msg: 'Id não pode ser vazio' })
            const response = await createInstalacaoUseCase.revogarInstalacao({ id })
            if (response.status) return res.status(200).json({ status: true, msg: response.msg })
            res.status(400).json({ status: response.status, msg: response.msg })
        } catch (err) {
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(err);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            logs.getInstance().error({ linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), err }, 'Erro no AdminController - deleteInstalacao')
            res.status(500).json({ status: false, msg: 'Erro interno no servidor' })
        }
    }

}

module.exports = new AdminController();
