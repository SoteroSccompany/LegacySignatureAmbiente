
const ErrorStackParser = require('error-stack-parser');
const dateNow = require('../gateways/functions/data/getToday');
const createInstalacaoUseCase = require('../../@core/usecase/Instalacao/createInstalacaoUseCase');
const logs = require('../../Logs');

// Vínculo self-service: o próprio usuário do Workspace cola a lsak_ que o
// gerente emitiu (ou a dele, se ele mesmo for gerente). Sem tela de admin.
class InstalacaoController {

    async postVincular(req, res) {
        try {
            const { chave_api, email_google, tem_credencial } = req.body;
            if (!chave_api || chave_api.trim() === '') return res.status(400).json({ status: false, msg: 'Campo chave_api não pode ser vazio' })
            if (!email_google || email_google.trim() === '') return res.status(400).json({ status: false, msg: 'Campo email_google não pode ser vazio' })
            const response = await createInstalacaoUseCase.indexInstalacao({
                nome: email_google.trim(),
                chave_api: chave_api.trim(),
                email_usuario: email_google.trim(),
                tem_credencial: tem_credencial === true,
            })
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
            logs.getInstance().error({ linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), err }, 'Erro no InstalacaoController - postVincular')
            res.status(500).json({ status: false, msg: 'Erro interno no servidor' })
        }
    }

    async getEu(req, res) {
        try {
            const response = await createInstalacaoUseCase.getEu({ instalacao: req.instalacao })
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
            logs.getInstance().error({ linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), err }, 'Erro no InstalacaoController - getEu')
            res.status(500).json({ status: false, msg: 'Erro interno no servidor' })
        }
    }

}

module.exports = new InstalacaoController();
