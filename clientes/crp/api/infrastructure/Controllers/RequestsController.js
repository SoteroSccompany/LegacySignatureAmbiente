

const logExeption = require('../../@core/usecase/Logs/exeption/exeptionRequests');
const ErrorStackParser = require('error-stack-parser');
const dateNow = require('../gateways/functions/data/getToday');
const getUseCase = require('../../@core/usecase/Requests/getRequestsUseCase');
const createUseCase = require('../../@core/usecase/Requests/createRequestsUseCase');
const updateUseCase = require('../../@core/usecase/Requests/updateRequestsUseCase');
const deleteUseCase = require('../../@core/usecase/Requests/deleteRequestsUseCase');
const historicoUseCase = require('../../@core/usecase/Historico/createHistoricoUseCase');
const { historico } = require('../../certs')
const SearchParams = require('../gateways/helpers/SearchParams');

class RequestsController {

    async getRequests(req, res) {
        try {
            const id = req.params.id
            if (id !== undefined && id !== null && id !== '' && id !== ' ') {
                const response = await getUseCase.getRequestsById({ id })
                if (response.status) {
                    res.status(200).json({ status: response.status, data: response.data, msg: response.msg })
                } else {
                    res.status(400).json({ status: response.status, msg: response.msg })
                }

            } else {
                return res.status(400).json({ status: false, msg: 'Id não pode ser vazio' })
            }
        } catch (err) {
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(err);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            logExeption({ descricaoDoErro: 'Exeption estourada. Controller Requests - getRequests', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            res.status(500).json({ status: false, msg: 'Erro interno no servidor', error: err })

        }

    }

    async getRequestsByQuery(req, res) {
        try {

            const searchParams = new SearchParams(req.query)
            const response = await getUseCase.getRequestsByQuery(searchParams)
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
            logExeption({ descricaoDoErro: 'Exeption estourada. Controller Requests - getRequestsLimit', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            res.status(500).json({ status: false, msg: 'Erro interno no servidor', error: err })

        }

    }

    async postRequests(req, res) {
        try {
            const allData = req.body
            const token = req.cookies['authorization']
            if (token === undefined || token === null || token === '' || token === ' ') return res.status(400).json({ status: false, msg: 'Token não pode ser vazio' })
            if (allData.method === undefined || allData.method === null || allData.method === '' || allData.method === ' ') return res.status(400).json({ status: false, msg: 'Campo method não pode ser vazio' })
            if (allData.endpoint === undefined || allData.endpoint === null || allData.endpoint === '' || allData.endpoint === ' ') return res.status(400).json({ status: false, msg: 'Campo endpoint não pode ser vazio' })
            if (allData.ip === undefined || allData.ip === null || allData.ip === '' || allData.ip === ' ') return res.status(400).json({ status: false, msg: 'Campo ip não pode ser vazio' })
            if (allData.body === undefined || allData.body === null || allData.body === '' || allData.body === ' ') return res.status(400).json({ status: false, msg: 'Campo body não pode ser vazio' })
            if (allData.headers === undefined || allData.headers === null || allData.headers === '' || allData.headers === ' ') return res.status(400).json({ status: false, msg: 'Campo headers não pode ser vazio' })
            if (allData.status_code === undefined || allData.status_code === null || allData.status_code === '' || allData.status_code === ' ') return res.status(400).json({ status: false, msg: 'Campo status_code não pode ser vazio' })
            if (allData.duration_ms === undefined || allData.duration_ms === null || allData.duration_ms === '' || allData.duration_ms === ' ') return res.status(400).json({ status: false, msg: 'Campo duration_ms não pode ser vazio' })

            const response = await createUseCase.indexRequests(allData)
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
            logExeption({ descricaoDoErro: 'Exeption estourada. Controller Requests - postRequests', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            res.status(500).json({ status: false, msg: 'Erro interno no servidor', error: err })

        }
    }

    async putRequests(req, res) {
        try {
            const id = req.params.id
            const allData = req.body
            if (id === undefined || id === null || id === '' || id === ' ') return res.status(400).json({ status: false, msg: 'Campo id não pode ser vazio' })
            if (allData.method === undefined || allData.method === null || allData.method === '' || allData.method === ' ') return res.status(400).json({ status: false, msg: 'Campo method não pode ser vazio' })
            if (allData.endpoint === undefined || allData.endpoint === null || allData.endpoint === '' || allData.endpoint === ' ') return res.status(400).json({ status: false, msg: 'Campo endpoint não pode ser vazio' })
            if (allData.ip === undefined || allData.ip === null || allData.ip === '' || allData.ip === ' ') return res.status(400).json({ status: false, msg: 'Campo ip não pode ser vazio' })
            if (allData.body === undefined || allData.body === null || allData.body === '' || allData.body === ' ') return res.status(400).json({ status: false, msg: 'Campo body não pode ser vazio' })
            if (allData.headers === undefined || allData.headers === null || allData.headers === '' || allData.headers === ' ') return res.status(400).json({ status: false, msg: 'Campo headers não pode ser vazio' })
            if (allData.status_code === undefined || allData.status_code === null || allData.status_code === '' || allData.status_code === ' ') return res.status(400).json({ status: false, msg: 'Campo status_code não pode ser vazio' })
            if (allData.duration_ms === undefined || allData.duration_ms === null || allData.duration_ms === '' || allData.duration_ms === ' ') return res.status(400).json({ status: false, msg: 'Campo duration_ms não pode ser vazio' })

            const response = await updateUseCase.indexRequests({ ...allData, id })
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
            logExeption({ descricaoDoErro: 'Exeption estourada. Controller Requests - putRequests', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            res.status(500).json({ status: false, msg: 'Erro interno no servidor', error: err })

        }
    }


    async deleteRequests(req, res) {
        try {
            const token = req.cookies['authorization']
            if (token === undefined || token === null || token === '' || token === ' ') return res.status(400).json({ status: false, msg: 'Token não pode ser vazio' })
            const id = req.params.id
            if (id === undefined || id === null || id === '' || id === ' ') return res.status(400).json({ status: false, msg: 'Campo id não pode ser vazio' })
            const response = await deleteUseCase.indexRequests({ id })
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
            logExeption({ descricaoDoErro: 'Exeption estourada. Controller Requests - deleteRequests', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            res.status(500).json({ status: false, msg: 'Erro interno no servidor', error: err })

        }
    }

    async getRequestsMetrics(req, res) {
        try {
            const response = await getUseCase.getRequestsMetrics()
            if (response.status) {
                res.status(200).json({ status: response.status, data: response.data, msg: response.msg })
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
            logExeption({ descricaoDoErro: 'Exeption estourada. Controller Requests - getRequestsMetrics', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            res.status(500).json({ status: false, msg: 'Erro interno no servidor', error: err })
        }
    }


}

module.exports = new RequestsController();



