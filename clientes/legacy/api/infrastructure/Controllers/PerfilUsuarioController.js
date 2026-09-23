

const logExeption = require('../../@core/usecase/Logs/exeption/exeptionPerfilUsuario');
const ErrorStackParser = require('error-stack-parser');
const dateNow = require('../gateways/functions/data/getToday');
const getUseCase = require('../../@core/usecase/PerfilUsuario/getPerfilUsuarioUseCase');
const createUseCase = require('../../@core/usecase/PerfilUsuario/createPerfilUsuarioUseCase');
const updateUseCase = require('../../@core/usecase/PerfilUsuario/updatePerfilUsuarioUseCase');
const deleteUseCase = require('../../@core/usecase/PerfilUsuario/deletePerfilUsuarioUseCase');
const historicoUseCase = require('../../@core/usecase/Historico/createHistoricoUseCase');
const { historico } = require('../../certs')
const SearchParams = require('../gateways/helpers/SearchParams');
const logs = require('../../Logs')
const validator = require('cpf-cnpj-validator');

class PerfilUsuarioController {

    async getPerfilUsuario(req, res) {
        try {
            if (!req.session.user) return res.status(400).json({ status: false, msg: "Sessão expirada, faça login novamente." })
            const response = await getUseCase.getPerfilUsuarioByUserId({ user_id: req.session.user.id })
            if (response.status) return res.status(200).json(response)
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
            logs.getInstance().error(dataLogs, 'Erro no PerfilUsuarioController - getPerfilUsuario')
            res.status(500).json({ status: false, msg: 'Erro interno no servidor' })
        }

    }

    async getPerfilUsuarioSolicitacao(req, res) {
        try {
            if (!req.session.user) return res.status(400).json({ status: false, msg: "Sessão expirada, faça login novamente." })
            var data = { user_id: req.session.user.id, sessao_id: req.session.id, solicitacao_ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress, solicitacao_porta_logica: req.socket.remotePort, userAgent: req.headers['user-agent'] };
            const response = await createUseCase.indexPerfilUsuario(data)
            if (response.status) return res.status(200).json({ status: true, msg: "Autenticacao solicitada com sucesso" })
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
            logs.getInstance().error(dataLogs, 'Erro no PerfilUsuarioController - getPerfilUsuario')
            res.status(500).json({ status: false, msg: 'Erro interno no servidor' })
        }

    }

    async getPerfilUsuarioByQuery(req, res) {
        try {

            const searchParams = new SearchParams(req.query)
            const response = await getUseCase.getPerfilUsuarioByQuery(searchParams)
            if (response.status) {
                res.status(200).json(response)
            } else {
                res.status(400).json(response)
            }
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
                query: JSON.stringify(req.query)
            }
            logs.getInstance().error(dataLogs, 'Erro no PerfilUsuarioController - getPerfilUsuarioByQuery')
            res.status(500).json({ status: false, msg: 'Erro interno no servidor' })
        }

    }

    async getPerfilUsuarioByQueryIdHistorico(req, res) {
        try {
            const id = req.params.id
            if (id === undefined || id === null || id === '' || id === ' ') return res.status(400).json({ status: false, msg: 'id não pode ser vazio' })
            const searchParams = new SearchParams(req.query)
            const response = await getUseCase.getPerfilUsuarioByQueryIdHistorico(searchParams, id)
            if (response.status) {
                res.status(200).json(response)
            } else {
                res.status(400).json(response)
            }
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
                query: JSON.stringify(req.query)
            }
            logs.getInstance().error(dataLogs, 'Erro no PerfilUsuarioController - getPerfilUsuarioByQueryIdHistorico')
            res.status(500).json({ status: false, msg: 'Erro interno no servidor' })

        }

    }

    async postPerfilUsuario(req, res) {
        try {
            let allData = req.body
            let { nome, cpf, dados_extra, token, telefone } = allData;
            if (!token || !nome || !cpf || !telefone) return res.status(400).json({ status: false, msg: "Campos obrigatórios não preenchidos." })
            var data = { user_id: req.session.user.id, sessao_id: req.session.id, solicitacao_ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress, solicitacao_porta_logica: req.socket.remotePort, userAgent: req.headers['user-agent'] };
            if (nome.length < 3) return res.status(400).json({ status: false, msg: "Campo nome deve ter no mínimo 3 caracteres." })
            if (!validator.cpf.isValid(cpf)) return res.status(400).json({ status: false, msg: "Campo cpf inválido." })
            if (token.length !== 6) return res.status(400).json({ status: false, msg: "Token inválido." })
            telefone = telefone.replace(/\D/g, '');
            if (telefone.length < 10 || telefone.length > 11) return res.status(400).json({ status: false, msg: "Campo telefone inválido." })
            cpf = cpf.replace(/\D/g, '');
            if (dados_extra && typeof dados_extra === 'object') {
                dados_extra = JSON.stringify(dados_extra)
            } else { dados_extra = JSON.stringify({}) }
            data.nome = nome;
            data.cpf = cpf;
            data.telefone = telefone;
            data.dados_extra = dados_extra;
            allData = { ...data }
            allData.token = token;
            const response = await createUseCase.validarPerfilUsuario(allData)
            if (response.status) {
                if (!response.object) throw new Error('oldObject e object estao undefined')
                historicoUseCase.indexHistorico({
                    transformacao: historico.trnasformcao.create.value,
                    dado_atual: response.object,
                    user_id: req.session.user.id
                })
                res.status(200).json({ status: response.status, msg: response.msg })
            } else {
                res.status(400).json({ status: response.status, msg: response.msg })
            }
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
                body: JSON.stringify(req.body)
            }
            logs.getInstance().error(dataLogs, 'Erro no PerfilUsuarioController - postPerfilUsuario')
            res.status(500).json({ status: false, msg: 'Erro interno no servidor' })
        }
    }


    async deletePerfilUsuario(req, res) {
        try {
            const id = req.params.id
            if (id === undefined || id === null || id === '' || id === ' ') return res.status(400).json({ status: false, msg: 'Campo id não pode ser vazio' })
            const response = await deleteUseCase.indexPerfilUsuario({ id })
            if (response.status) {
                if (!response.object) throw new Error('oldObject e object estao undefined')
                historicoUseCase.indexHistorico({
                    transformacao: historico.trnasformcao.delete.value,
                    dado_atual: response.object,
                    user_id: req.session.user.id
                })
                res.status(200).json({ status: response.status, msg: response.msg })
            } else {
                res.status(400).json({ status: response.status, msg: response.msg })
            }
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
            logs.getInstance().error(dataLogs, 'Erro no PerfilUsuarioController - deletePerfilUsuario')
            res.status(500).json({ status: false, msg: 'Erro interno no servidor' })

        }
    }


}

module.exports = new PerfilUsuarioController();



