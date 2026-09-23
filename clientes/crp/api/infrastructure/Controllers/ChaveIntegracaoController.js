
const ErrorStackParser = require('error-stack-parser');
const dateNow = require('../gateways/functions/data/getToday');
const createUseCase = require('../../@core/usecase/ChaveIntegracao/createChaveIntegracaoUseCase');
const historicoUseCase = require('../../@core/usecase/Historico/createHistoricoUseCase');
const { historico } = require('../../certs');
const logs = require('../../Logs');

class ChaveIntegracaoController {

    async postChave(req, res) {
        try {
            if (!req.session.user) return res.status(400).json({ status: false, msg: "Sessão expirada, faça login novamente." })
            const data = {
                user_id: req.session.user.id,
                desafio_id: req.session.user.desafio_id,
                session_id: req.session.id,
                alvo_user_id: req.body.alvo_user_id || null,
            };
            // O historico já é gravado dentro da trx do use case (própria emissão + cada chave revogada).
            const response = await createUseCase.indexChaveIntegracao(data)
            if (response.status) return res.status(200).json({ status: true, msg: response.msg, data: response.data })
            if (response.revokeLogin) {
                req.session.user = null;
                req.session.destroy();
            }
            res.status(400).json({ status: response.status, msg: response.msg })
        } catch (err) {
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(err);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            const dataLogs = {
                linhaDoErro: lineError,
                nomeDoArquivo: fileName,
                data_criacao: dateNow(),
                err: err,
            }
            logs.getInstance().error(dataLogs, 'Erro no ChaveIntegracaoController - postChave')
            res.status(500).json({ status: false, msg: 'Erro interno no servidor' })
        }
    }

    async postSolicitacao(req, res) {
        try {
            if (!req.session.user) return res.status(400).json({ status: false, msg: "Sessão expirada, faça login novamente." })
            const response = await createUseCase.solicitarChave({ user_id: req.session.user.id })
            if (response.status) return res.status(200).json({ status: true, msg: response.msg })
            if (response.revokeLogin) {
                req.session.user = null;
                req.session.destroy();
            }
            res.status(400).json({ status: response.status, msg: response.msg })
        } catch (err) {
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(err);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            const dataLogs = {
                linhaDoErro: lineError,
                nomeDoArquivo: fileName,
                data_criacao: dateNow(),
                err: err,
            }
            logs.getInstance().error(dataLogs, 'Erro no ChaveIntegracaoController - postSolicitacao')
            res.status(500).json({ status: false, msg: 'Erro interno no servidor' })
        }
    }

    async getMe(req, res) {
        try {
            if (!req.integracao) return res.status(400).json({ status: false, msg: "Chave de integração não informada." })
            const response = await createUseCase.getMinhaChave({ integracao: req.integracao })
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
            const dataLogs = {
                linhaDoErro: lineError,
                nomeDoArquivo: fileName,
                data_criacao: dateNow(),
                err: err,
            }
            logs.getInstance().error(dataLogs, 'Erro no ChaveIntegracaoController - getMe')
            res.status(500).json({ status: false, msg: 'Erro interno no servidor' })
        }
    }

    async getUsuariosDestino(req, res) {
        try {
            if (!req.session.user) return res.status(400).json({ status: false, msg: "Sessão expirada, faça login novamente." })
            const response = await createUseCase.listarUsuariosDestino({ user_id: req.session.user.id })
            if (response.status) return res.status(200).json({ status: true, data: response.data, msg: response.msg })
            if (response.revokeLogin) {
                req.session.user = null;
                req.session.destroy();
            }
            res.status(400).json({ status: response.status, msg: response.msg })
        } catch (err) {
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(err);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            const dataLogs = {
                linhaDoErro: lineError,
                nomeDoArquivo: fileName,
                data_criacao: dateNow(),
                err: err,
            }
            logs.getInstance().error(dataLogs, 'Erro no ChaveIntegracaoController - getUsuariosDestino')
            res.status(500).json({ status: false, msg: 'Erro interno no servidor' })
        }
    }

    async getChaves(req, res) {
        try {
            if (!req.session.user) return res.status(400).json({ status: false, msg: "Sessão expirada, faça login novamente." })
            const response = await createUseCase.listarChaves({ user_id: req.session.user.id })
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
            const dataLogs = {
                linhaDoErro: lineError,
                nomeDoArquivo: fileName,
                data_criacao: dateNow(),
                err: err,
            }
            logs.getInstance().error(dataLogs, 'Erro no ChaveIntegracaoController - getChaves')
            res.status(500).json({ status: false, msg: 'Erro interno no servidor' })
        }
    }

    async deleteChave(req, res) {
        try {
            if (!req.session.user) return res.status(400).json({ status: false, msg: "Sessão expirada, faça login novamente." })
            const id = req.params.id
            if (id === undefined || id === null || id === '' || id === ' ') return res.status(400).json({ status: false, msg: 'Id não pode ser vazio' })
            const response = await createUseCase.revogarChave({ id, user_id: req.session.user.id })
            if (response.status) {
                if (!response.object) throw new Error('oldObject e object estao undefined')
                historicoUseCase.indexHistorico({
                    transformacao: historico.trnasformcao.update.value,
                    dado_antigo: response.oldObject,
                    dado_atual: response.object,
                    user_id: req.session.user.id
                })
                return res.status(200).json({ status: true, msg: response.msg })
            }
            if (response.revokeLogin) {
                req.session.user = null;
                req.session.destroy();
            }
            res.status(400).json({ status: response.status, msg: response.msg })
        } catch (err) {
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(err);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            const dataLogs = {
                linhaDoErro: lineError,
                nomeDoArquivo: fileName,
                data_criacao: dateNow(),
                err: err,
                id: req.params.id
            }
            logs.getInstance().error(dataLogs, 'Erro no ChaveIntegracaoController - deleteChave')
            res.status(500).json({ status: false, msg: 'Erro interno no servidor' })
        }
    }

}

module.exports = new ChaveIntegracaoController();
