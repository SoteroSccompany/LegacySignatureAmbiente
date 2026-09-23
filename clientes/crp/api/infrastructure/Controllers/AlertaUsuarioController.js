
const ErrorStackParser = require('error-stack-parser');
const dateNow = require('../gateways/functions/data/getToday');
const listAlertasUsuarioUseCase = require('../../@core/usecase/AlertaUsuario/listAlertasUsuarioUseCase');
const logs = require('../../Logs');

class AlertaUsuarioController {

    async getAlertas(req, res) {
        try {
            if (!req.session.user) return res.status(401).json({ status: false, msg: 'Usuário não autenticado' });
            const response = await listAlertasUsuarioUseCase.indexAlertas({
                user_id: req.session.user.id,
                limit: req.query.limit,
                offset: req.query.offset,
                lido: req.query.lido,
            });
            if (response.status) {
                return res.status(200).json({
                    status: response.status,
                    msg: response.msg,
                    data: response.data,
                    paginacao: response.paginacao,
                });
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
            }, 'Erro no AlertaUsuarioController - getAlertas');
            return res.status(500).json({ status: false, msg: 'Erro interno no servidor' });
        }
    }

    async patchAlertaLido(req, res) {
        try {
            if (!req.session.user) return res.status(401).json({ status: false, msg: 'Usuário não autenticado' });
            const id = req.params.id;
            if (!id) return res.status(400).json({ status: false, msg: 'Id não pode ser vazio' });
            const response = await listAlertasUsuarioUseCase.marcarLido({
                user_id: req.session.user.id,
                id,
            });
            return res.status(response.status ? 200 : 400).json(response);
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
            }, 'Erro no AlertaUsuarioController - patchAlertaLido');
            return res.status(500).json({ status: false, msg: 'Erro interno no servidor' });
        }
    }

}

module.exports = new AlertaUsuarioController();
