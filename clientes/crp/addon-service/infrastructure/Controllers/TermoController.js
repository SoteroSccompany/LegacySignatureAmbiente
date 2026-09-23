
const ErrorStackParser = require('error-stack-parser');
const dateNow = require('../gateways/functions/data/getToday');
const getTermoUseCase = require('../../@core/usecase/Termo/getTermoUseCase');
const logs = require('../../Logs');

class TermoController {

    async getTermos(req, res) {
        try {
            const response = await getTermoUseCase.listarTermos({ instalacao: req.instalacao })
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
            logs.getInstance().error({ linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), err }, 'Erro no TermoController - getTermos')
            res.status(500).json({ status: false, msg: 'Erro interno no servidor' })
        }
    }

}

module.exports = new TermoController();
