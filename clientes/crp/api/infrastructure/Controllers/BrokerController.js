

const logExeption = require('../../@core/usecase/Logs/exeption/exeptionBroker');
const ErrorStackParser = require('error-stack-parser');
const dateNow = require('../gateways/functions/data/getToday');
const getUseCase = require('../../@core/usecase/Broker/getBrokerUseCase');
const createUseCase = require('../../@core/usecase/Broker/createBrokerUseCase');
const updateUseCase = require('../../@core/usecase/Broker/updateBrokerUseCase');
const deleteUseCase = require('../../@core/usecase/Broker/deleteBrokerUseCase');
const historicoUseCase = require('../../@core/usecase/Historico/createHistoricoUseCase');
const { historico } = require('../../certs')
const SearchParams = require('../gateways/helpers/SearchParams');
const logs = require('../../Logs')

class BrokerController {

    async getBroker(req, res) {
        try {
            const id = req.params.id
            if (id === undefined || id === null || id === '' || id === ' ') return res.status(400).json({ status: false, msg: 'Id não pode ser vazio' })
            const response = await getUseCase.getBrokerById({ id })
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
            logs.getInstance().error(dataLogs, 'Erro no BrokerController - getBroker')
            res.status(500).json({ status: false, msg: 'Erro interno no servidor', error: err })
        }

    }

    async getBrokerByQuery(req, res) {
        try {

            const searchParams = new SearchParams(req.query)
            const response = await getUseCase.getBrokerByQuery(searchParams)
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
            logs.getInstance().error(dataLogs, 'Erro no BrokerController - getBrokerByQuery')
            res.status(500).json({ status: false, msg: 'Erro interno no servidor', error: err })
        }

    }

    async getBrokerByQueryIdHistorico(req, res) {
        try {
            const id = req.params.id
            if (id === undefined || id === null || id === '' || id === ' ') return res.status(400).json({ status: false, msg: 'id não pode ser vazio' })
            const searchParams = new SearchParams(req.query)
            const response = await getUseCase.getBrokerByQueryIdHistorico(searchParams, id)
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
            logs.getInstance().error(dataLogs, 'Erro no BrokerController - getBrokerByQueryIdHistorico')
            res.status(500).json({ status: false, msg: 'Erro interno no servidor', error: err })

        }

    }

    async postBroker(req, res) {
        try {
            const allData = req.body
            if (allData.exchange === undefined || allData.exchange === null || allData.exchange === '' || allData.exchange === ' ') return res.status(400).json({ status: false, msg: 'Campo exchange não pode ser vazio' })
            if (allData.delayMs === undefined || allData.delayMs === null || allData.delayMs === '' || allData.delayMs === ' ') return res.status(400).json({ status: false, msg: 'Campo delayMs não pode ser vazio' })
            if (allData.fila === undefined || allData.fila === null || allData.fila === '' || allData.fila === ' ') return res.status(400).json({ status: false, msg: 'Campo fila não pode ser vazio' })
            if (allData.key === undefined || allData.key === null || allData.key === '' || allData.key === ' ') return res.status(400).json({ status: false, msg: 'Campo key não pode ser vazio' })
            if (allData.message === undefined || allData.message === null || allData.message === '' || allData.message === ' ') return res.status(400).json({ status: false, msg: 'Campo message não pode ser vazio' })
            if (allData.status === undefined || allData.status === null || allData.status === '' || allData.status === ' ') return res.status(400).json({ status: false, msg: 'Campo status não pode ser vazio' })
            if (allData.tentativas === undefined || allData.tentativas === null || allData.tentativas === '' || allData.tentativas === ' ') return res.status(400).json({ status: false, msg: 'Campo tentativas não pode ser vazio' })
            if (allData.ultima_tentativa === undefined || allData.ultima_tentativa === null || allData.ultima_tentativa === '' || allData.ultima_tentativa === ' ') return res.status(400).json({ status: false, msg: 'Campo ultima_tentativa não pode ser vazio' })

            const response = await createUseCase.indexBroker(allData)
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
            logs.getInstance().error(dataLogs, 'Erro no BrokerController - postBroker')
            res.status(500).json({ status: false, msg: 'Erro interno no servidor', error: err })
        }
    }

    async patchBroker(req, res) {
        try {
            const id = req.params.id
            const allData = req.body
            if (id === undefined || id === null || id === '' || id === ' ') return res.status(400).json({ status: false, msg: 'Campo id não pode ser vazio' })
            if (allData.exchange === undefined || allData.exchange === null || allData.exchange === '' || allData.exchange === ' ') return res.status(400).json({ status: false, msg: 'Campo exchange não pode ser vazio' })
            if (allData.delayMs === undefined || allData.delayMs === null || allData.delayMs === '' || allData.delayMs === ' ') return res.status(400).json({ status: false, msg: 'Campo delayMs não pode ser vazio' })
            if (allData.fila === undefined || allData.fila === null || allData.fila === '' || allData.fila === ' ') return res.status(400).json({ status: false, msg: 'Campo fila não pode ser vazio' })
            if (allData.key === undefined || allData.key === null || allData.key === '' || allData.key === ' ') return res.status(400).json({ status: false, msg: 'Campo key não pode ser vazio' })
            if (allData.message === undefined || allData.message === null || allData.message === '' || allData.message === ' ') return res.status(400).json({ status: false, msg: 'Campo message não pode ser vazio' })
            if (allData.status === undefined || allData.status === null || allData.status === '' || allData.status === ' ') return res.status(400).json({ status: false, msg: 'Campo status não pode ser vazio' })
            if (allData.tentativas === undefined || allData.tentativas === null || allData.tentativas === '' || allData.tentativas === ' ') return res.status(400).json({ status: false, msg: 'Campo tentativas não pode ser vazio' })
            if (allData.ultima_tentativa === undefined || allData.ultima_tentativa === null || allData.ultima_tentativa === '' || allData.ultima_tentativa === ' ') return res.status(400).json({ status: false, msg: 'Campo ultima_tentativa não pode ser vazio' })
            const response = await updateUseCase.indexBroker({ ...allData, id })
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
            logs.getInstance().error(dataLogs, 'Erro no BrokerController - patchBroker')
            res.status(500).json({ status: false, msg: 'Erro interno no servidor', error: err })

        }
    }


    async deleteBroker(req, res) {
        try {
            const id = req.params.id
            if (id === undefined || id === null || id === '' || id === ' ') return res.status(400).json({ status: false, msg: 'Campo id não pode ser vazio' })
            const response = await deleteUseCase.indexBroker({ id })
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
            logs.getInstance().error(dataLogs, 'Erro no BrokerController - deleteBroker')
            res.status(500).json({ status: false, msg: 'Erro interno no servidor', error: err })

        }
    }


}

module.exports = new BrokerController();



