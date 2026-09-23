

const logExeption = require('../../@core/usecase/Logs/exeption/exeptionForgot')
const ErrorStackParser = require('error-stack-parser');
const dateNow = require('../gateways/functions/data/getToday')
const getUseCase = require('../../@core/usecase/Forgot/getForgotUseCase');
const SearchParams = require('../gateways/helpers/SearchParams');

class ForgotController {


    async getForgotLimit(req, res) {
        try {
            const params = new SearchParams(req.query)
            const response = await getUseCase.index(params)
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
            logExeption({ descricaoDoErro: 'Exeption estourada. Controller ForgotCliente - getForgotLimit', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            res.status(500).json({ status: false, msg: 'Erro interno no servidor', error: err })

        }

    }

    async getForgotQuery(req, res) {
        try {
            const { limit, offset, query } = req.params
            const checkNumLimit = Number(limit)
            const checkNumOffset = Number(offset)
            if (isNaN(checkNumLimit) || isNaN(checkNumOffset)) return res.status(400).json({ status: false, msg: 'Limit e offset devem ser numeros' })
            if (limit === undefined || limit === null || limit === '' || limit === ' ') return res.status(400).json({ status: false, msg: 'Limit não pode ser vazio' })
            if (offset === undefined || offset === null || offset === '' || offset === ' ') return res.status(400).json({ status: false, msg: 'Offset não pode ser vazio' })
            if (query === undefined || query === null || query === '' || query === ' ') return res.status(400).json({ status: false, msg: 'Query não pode ser vazio' })
            const response = await getUseCase.query({ limit, offset, query })
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
            logExeption({ descricaoDoErro: 'Exeption estourada. Controller ForgotCliente - getForgotLimit', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            res.status(500).json({ status: false, msg: 'Erro interno no servidor', error: err })

        }

    }



}

module.exports = new ForgotController();



