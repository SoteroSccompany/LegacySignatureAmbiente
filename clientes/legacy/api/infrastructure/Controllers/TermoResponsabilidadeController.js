

const logExeption = require('../../@core/usecase/Logs/exeption/exeptionTermoResponsabilidade');
const ErrorStackParser = require('error-stack-parser');
const dateNow = require('../gateways/functions/data/getToday');
const getUseCase = require('../../@core/usecase/TermoResponsabilidade/getTermoResponsabilidadeUseCase');
const createUseCase = require('../../@core/usecase/TermoResponsabilidade/createTermoResponsabilidadeUseCase');
const updateUseCase = require('../../@core/usecase/TermoResponsabilidade/updateTermoResponsabilidadeUseCase');
const deleteUseCase = require('../../@core/usecase/TermoResponsabilidade/deleteTermoResponsabilidadeUseCase');
const historicoUseCase = require('../../@core/usecase/Historico/createHistoricoUseCase');
const { historico, tipo_termo_responsabilidade } = require('../../certs')
const SearchParams = require('../gateways/helpers/SearchParams');
const logs = require('../../Logs')

class TermoResponsabilidadeController {

    async getTermoResponsabilidade(req, res) {
        try {
            const id = req.params.id
            if (id === undefined || id === null || id === '' || id === ' ') return res.status(400).json({ status: false, msg: 'Id não pode ser vazio' })
            const response = await getUseCase.getTermoResponsabilidadeById({ id })
            if (response.status) return res.status(200).json({ status: response.status, data: response.data, msg: response.msg })
            const status = response.response.status === false ? 400 : 404
            res.status(status).json({ status: response.status, msg: response.msg })
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
            logs.getInstance().error(dataLogs, 'Erro no TermoResponsabilidadeController - getTermoResponsabilidade')
            res.status(500).json({ status: false, msg: 'Erro interno no servidor' })
        }

    }

    async getTermoResponsabilidadeByQuery(req, res) {
        try {

            const searchParams = new SearchParams(req.query)
            const response = await getUseCase.getTermoResponsabilidadeByQuery(searchParams)
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
            logs.getInstance().error(dataLogs, 'Erro no TermoResponsabilidadeController - getTermoResponsabilidadeByQuery')
            res.status(500).json({ status: false, msg: 'Erro interno no servidor' })
        }

    }

    async getTermoResponsabilidadeByQueryIdHistorico(req, res) {
        try {
            const id = req.params.id
            if (id === undefined || id === null || id === '' || id === ' ') return res.status(400).json({ status: false, msg: 'id não pode ser vazio' })
            const searchParams = new SearchParams(req.query)
            const response = await getUseCase.getTermoResponsabilidadeByQueryIdHistorico(searchParams, id)
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
            logs.getInstance().error(dataLogs, 'Erro no TermoResponsabilidadeController - getTermoResponsabilidadeByQueryIdHistorico')
            res.status(500).json({ status: false, msg: 'Erro interno no servidor' })

        }

    }

    async solicitacaoPostTermoResponsabilidade(req, res) {
        try {
            if (!req.session.user) return res.status(400).json({ status: false, msg: "Sessão expirada, faça login novamente." })
            var data = { user_id: req.session.user.id, sessao_id: req.session.id, solicitacao_ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress, solicitacao_porta_logica: req.socket.remotePort, userAgent: req.headers['user-agent'] };
            const response = await createUseCase.solicitacaoTermoResponsabilidade(data)
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
            logs.getInstance().error(dataLogs, 'Erro no TermoResponsabilidadeController - postTermoResponsabilidade')
            res.status(500).json({ status: false, msg: 'Erro interno no servidor' })
        }
    }

    async postTermoResponsabilidade(req, res) {
        try {
            const allData = req.body
            if (allData.titulo_termo === undefined || allData.titulo_termo === null || allData.titulo_termo === '' || allData.titulo_termo === ' ') return res.status(400).json({ status: false, msg: 'Campo titulo_termo não pode ser vazio' })
            if (allData.descricao_termo === undefined || allData.descricao_termo === null || allData.descricao_termo === '' || allData.descricao_termo === ' ') return res.status(400).json({ status: false, msg: 'Campo descricao_termo não pode ser vazio' })
            if (allData.token === undefined || allData.token === ' ' || allData.token === ' ' || allData.token === null) return res.status(400).json({ status: false, msg: "O token de acesso deve ser enviado." })
            if (allData.tipo_termo === undefined || allData.tipo_termo === null || allData.tipo_termo === '' || allData.tipo_termo === ' ') return res.status(400).json({ status: false, msg: 'Campo tipo_termo não pode ser vazio' })
            if (allData.tipo_termo !== tipo_termo_responsabilidade.termo_documento && allData.tipo_termo !== tipo_termo_responsabilidade.termo_concetimento_foto) return res.status(400).json({ status: false, msg: 'Tipo do termo deve ser para documento ou documentação pessoal' })
            var data = { user_id: req.session.user.id, sessao_id: req.session.id, solicitacao_ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress, solicitacao_porta_logica: req.socket.remotePort, userAgent: req.headers['user-agent'] };
            const response = await createUseCase.indexTermoResponsabilidade({ ...allData, request_user: data })
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
            logs.getInstance().error(dataLogs, 'Erro no TermoResponsabilidadeController - postTermoResponsabilidade')
            res.status(500).json({ status: false, msg: 'Erro interno no servidor' })
        }
    }

    async indexTermoResponsabilidadeAceiteCadastroImagem(req, res) {
        try {
            const allData = req.body
            if (allData.termo_id === undefined || allData.termo_id === null || allData.termo_id === '' || allData.termo_id === ' ') return res.status(400).json({ status: false, msg: 'Campo de identificação do termo não pode ser vazio' })
            var data = {
                user_id: req.session.user.id,
                sessao_id: req.session.id,
                solicitacao_ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
                solicitacao_porta_logica: req.socket.remotePort,
                userAgent: req.headers['user-agent'],
                assinatura: req.session.user.assinatura || null,
                integracao: req.integracao || null,
            };
            const aceito_em = dateNow()
            allData.aceito_em = aceito_em;
            allData.documento_id = allData.documento_id ? allData.documento_id : null;
            const response = await createUseCase.indexTermoResponsabilidadeAceiteCadastroImagem({ ...allData, request_user: data })
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
            logs.getInstance().error(dataLogs, 'Erro no TermoResponsabilidadeController - postTermoResponsabilidade')
            res.status(500).json({ status: false, msg: 'Erro interno no servidor' })
        }
    }

    async patchTermoResponsabilidade(req, res) {
        try {
            const id = req.params.id
            const allData = req.body
            if (id === undefined || id === null || id === '' || id === ' ') return res.status(400).json({ status: false, msg: 'Campo id não pode ser vazio' })
            if (allData.titulo_termo === undefined || allData.titulo_termo === null || allData.titulo_termo === '' || allData.titulo_termo === ' ') return res.status(400).json({ status: false, msg: 'Campo titulo_termo não pode ser vazio' })
            if (allData.descricao_termo === undefined || allData.descricao_termo === null || allData.descricao_termo === '' || allData.descricao_termo === ' ') return res.status(400).json({ status: false, msg: 'Campo descricao_termo não pode ser vazio' })
            if (allData.ativo === undefined || allData.ativo === null || allData.ativo === '' || allData.ativo === ' ') return res.status(400).json({ status: false, msg: 'Campo ativo não pode ser vazio' })
            if (allData.token === undefined || allData.token === null || allData.token === '' || allData.token === ' ') return res.status(400).json({ status: false, msg: "O token de acesso deve ser enviado." })
            var requestUser = { user_id: req.session.user.id, sessao_id: req.session.id, solicitacao_ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress, solicitacao_porta_logica: req.socket.remotePort, userAgent: req.headers['user-agent'] };
            const response = await updateUseCase.indexTermoResponsabilidade({ ...allData, id, request_user: requestUser })
            if (response.status) {
                if (!response.oldObject || !response.object) throw new Error('oldObject e object estao undefined')
                historicoUseCase.indexHistorico({
                    transformacao: historico.trnasformcao.update.value,
                    dado_atual: response.object,
                    dado_antigo: response.oldObject,
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
                body: JSON.stringify(req.body),
                id: req.params.id
            }
            logs.getInstance().error(dataLogs, 'Erro no TermoResponsabilidadeController - patchTermoResponsabilidade')
            res.status(500).json({ status: false, msg: 'Erro interno no servidor' })

        }
    }


    async deleteTermoResponsabilidade(req, res) {
        try {
            const id = req.params.id
            if (id === undefined || id === null || id === '' || id === ' ') return res.status(400).json({ status: false, msg: 'Campo id não pode ser vazio' })
            const response = await deleteUseCase.indexTermoResponsabilidade({ id })
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
            logs.getInstance().error(dataLogs, 'Erro no TermoResponsabilidadeController - deleteTermoResponsabilidade')
            res.status(500).json({ status: false, msg: 'Erro interno no servidor' })

        }
    }


}

module.exports = new TermoResponsabilidadeController();



