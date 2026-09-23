
const useCaseGet = require('../../@core/usecase/LogsDoSistema/getLogs');
const useCaseDelete = require('../../@core/usecase/LogsDoSistema/deleteLogs');
const dateNow = require('../gateways/functions/data/getToday')
// const moment = require('moment')
const ErrorStackParser = require('error-stack-parser');
const Log = require('../../@core/usecase/Logs/exeption/exeptionLogLogs');
const SearchParams = require('../gateways/helpers/SearchParams');



class LogsDoSistema {


    async getLogsByQuery(req, res) {
        try {
            const params = new SearchParams(req.query)
            const response = await useCaseGet.getLogsByQuery(params)
            if (response.status) {
                return res.status(200).json(response)
            } else {
                return res.status(400).json(response)
            }
        } catch (err) {
            console.log(err)
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(err);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            Log({ descricaoDoErro: 'Exeption estourada. Controller logsSystem', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            return res.status(500).json({ status: false, exit: false, error: err, msg: 'Erro ao buscar dados de invoices!' })
        }
    }

    async get(req, res) {
        try {
            const auth = req.headers.authorization
            if (auth === undefined || auth === null || auth === '' || auth === ' ') return res.status(403).json({ status: false, msg: 'Token não pode ser vazio' })
            const token = auth.split(' ')[1]
            if (token === undefined || token === 'undefined' || token === null || token === '' || token === ' ') return res.status(403).json({ status: false, msg: 'Token não pode ser vazio' })
            const id = req.params.id
            if (id === null || id === undefined || id === '' || id === ' ') {
                return res.status(400).json({ status: false, exit: false, error: 'Id não pode ser nulo!', msg: 'Erro ao buscar dados de invoices!' })
            } else {
                const response = await useCaseGet.getById({ id })
                if (response.status) {
                    return res.status(200).json({ status: true, data: response.logs, msg: response.msg })
                } else {
                    return res.status(400).json(response)
                }
            }
        } catch (err) {
            console.log(err)
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(err);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            Log({ descricaoDoErro: 'Exeption estourada. Controller logsSystem', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            return res.status(500).json({ status: false, exit: false, error: err, msg: 'Erro ao buscar dados de invoices!' })
        }
    }

    async delete(req, res) {
        try {
            const auth = req.headers.authorization
            if (auth === undefined || auth === null || auth === '' || auth === ' ') return res.status(403).json({ status: false, msg: 'Token não pode ser vazio' })
            const token = auth.split(' ')[1]
            if (token === undefined || token === 'undefined' || token === null || token === '' || token === ' ') return res.status(403).json({ status: false, msg: 'Token não pode ser vazio' })
            const id = req.params.id
            if (id === null || id === undefined || id === '' || id === ' ') {
                return res.status(400).json({ status: false, exit: false, error: 'Id não pode ser nulo!', msg: 'Erro ao buscar dados de invoices!' })
            } else {
                const response = await useCaseDelete.index({ id })
                if (response.status) {
                    return res.status(200).json({ status: true, data: response.logs, msg: response.msg })
                } else {
                    return res.status(400).json(response)
                }
            }
        } catch (err) {
            console.log(err)
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(err);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            Log({ descricaoDoErro: 'Exeption estourada. Controller logsSystem', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            return res.status(500).json({ status: false, exit: false, error: err, msg: 'Erro ao buscar dados de invoices!' })
        }
    }

    async getWithLimit(req, res) {
        try {
            const { limit, offset } = req.params
            const checkNumLimit = Number(limit)
            const checkNumOffset = Number(offset)
            if (isNaN(checkNumLimit) || isNaN(checkNumOffset)) return res.status(400).json({ status: false, msg: 'Limit e offset devem ser numeros' })
            if (limit === undefined || limit === null || limit === '' || limit === ' ') return res.status(400).json({ status: false, msg: 'Limit não pode ser vazio' })
            if (offset === undefined || offset === null || offset === '' || offset === ' ') return res.status(400).json({ status: false, msg: 'Offset não pode ser vazio' })
            const response = await useCaseGet.getWithLimit({ limit, offset })
            if (response.status) {
                return res.status(200).json(response)
            } else {
                return res.status(400).json(response)
            }
        } catch (err) {
            console.log(err)
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(err);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            Log({ descricaoDoErro: 'Exeption estourada. Controller logsSystem', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            return res.status(500).json({ status: false, exit: false, error: err, msg: 'Erro ao buscar dados de invoices!' })
        }
    }






}

module.exports = new LogsDoSistema();
