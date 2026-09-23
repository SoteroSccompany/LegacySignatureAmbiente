
const ErrorStackParser = require('error-stack-parser');
const dateNow = require('../gateways/functions/data/getToday');
const createUsuarioAddonUseCase = require('../../@core/usecase/Usuario/createUsuarioAddonUseCase');
const logs = require('../../Logs');

class UsuarioController {

    async postUsuario(req, res) {
        try {
            const { email, role } = req.body;
            if (email == null || email == "" || email == " " || email == undefined) return res.status(400).json({ status: false, msg: "Email não pode ser vazio" });
            if (isNaN(role)) return res.status(400).json({ status: false, msg: "Role não pode ser vazio" });
            const response = await createUsuarioAddonUseCase.indexUsuario({ instalacao: req.instalacao, email, role })
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
            logs.getInstance().error({ linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), err }, 'Erro no UsuarioController - postUsuario')
            res.status(500).json({ status: false, msg: 'Erro interno no servidor' })
        }
    }

    async getUsuarios(req, res) {
        try {
            const response = await createUsuarioAddonUseCase.listarUsuarios({
                instalacao: req.instalacao,
                page: req.query.page,
                per_page: req.query.per_page,
            })
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
            logs.getInstance().error({ linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), err }, 'Erro no UsuarioController - getUsuarios')
            res.status(500).json({ status: false, msg: 'Erro interno no servidor' })
        }
    }

}

module.exports = new UsuarioController();
