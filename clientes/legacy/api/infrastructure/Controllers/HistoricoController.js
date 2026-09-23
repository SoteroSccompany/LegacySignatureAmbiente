

const logExeption = require('../../@core/usecase/Logs/exeption/exeptionHistorico');
const ErrorStackParser = require('error-stack-parser');
const dateNow = require('../gateways/functions/data/getToday');
const getUseCase = require('../../@core/usecase/Historico/getHistoricoUseCase');
const createUseCase = require('../../@core/usecase/Historico/createHistoricoUseCase');
const updateUseCase = require('../../@core/usecase/Historico/updateHistoricoUseCase');
const deleteUseCase = require('../../@core/usecase/Historico/deleteHistoricoUseCase');

class HistoricoController {

    async getHistorico(req, res) {
        try {
            const id = req.params.id
            if (id !== undefined && id !== null && id !== '' && id !== ' ') {
                const response = await getUseCase.getHistoricoById({ id })
                if (response.status) {
                    res.status(200).json(response)
                } else {
                    res.status(400).json(response)
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
            logExeption({ descricaoDoErro: 'Exeption estourada. Controller Historico - getHistorico', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            res.status(500).json({ status: false, msg: 'Erro interno no servidor', error: err })

        }

    }

    async getHistoricoLimit(req, res) {
        try {
            const { limit, offset } = req.params
            const checkNumLimit = Number(limit)
            const checkNumOffset = Number(offset)
            if (isNaN(checkNumLimit) || isNaN(checkNumOffset)) return res.status(400).json({ status: false, msg: 'Limit e offset devem ser numeros' })
            if (limit === undefined || limit === null || limit === '' || limit === ' ') return res.status(400).json({ status: false, msg: 'Limit não pode ser vazio' })
            if (offset === undefined || offset === null || offset === '' || offset === ' ') return res.status(400).json({ status: false, msg: 'Offset não pode ser vazio' })
            const response = await getUseCase.getHistoricoByLimit({ limit, offset })
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
            logExeption({ descricaoDoErro: 'Exeption estourada. Controller Historico - getHistoricoLimit', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            res.status(500).json({ status: false, msg: 'Erro interno no servidor', error: err })

        }

    }

    async postHistorico(req, res) {
        try {
            const allData = req.body
            const token = req.cookies['authorization']
            if (token === undefined || token === null || token === '' || token === ' ') return res.status(400).json({ status: false, msg: 'Token não pode ser vazio' })
            if (allData.transformacao === undefined || allData.transformacao === null || allData.transformacao === '' || allData.transformacao === ' ') return res.status(400).json({ status: false, msg: 'Campo transformacao não pode ser vazio' })
            if (allData.dado_atual === undefined || allData.dado_atual === null || allData.dado_atual === '' || allData.dado_atual === ' ') return res.status(400).json({ status: false, msg: 'Campo dado_atual não pode ser vazio' })
            if (allData.dado_antigo === undefined || allData.dado_antigo === null || allData.dado_antigo === '' || allData.dado_antigo === ' ') return res.status(400).json({ status: false, msg: 'Campo dado_antigo não pode ser vazio' })
            if (allData.user_id === undefined || allData.user_id === null || allData.user_id === '' || allData.user_id === ' ') return res.status(400).json({ status: false, msg: 'Campo user_id não pode ser vazio' })

            const response = await createUseCase.indexHistorico(allData)
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
            logExeption({ descricaoDoErro: 'Exeption estourada. Controller Historico - postHistorico', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            res.status(500).json({ status: false, msg: 'Erro interno no servidor', error: err })

        }
    }

    async putHistorico(req, res) {
        try {
            const id = req.params.id
            const allData = req.body
            if (id === undefined || id === null || id === '' || id === ' ') return res.status(400).json({ status: false, msg: 'Campo id não pode ser vazio' })
            if (allData.transformacao === undefined || allData.transformacao === null || allData.transformacao === '' || allData.transformacao === ' ') return res.status(400).json({ status: false, msg: 'Campo transformacao não pode ser vazio' })
            if (allData.dado_atual === undefined || allData.dado_atual === null || allData.dado_atual === '' || allData.dado_atual === ' ') return res.status(400).json({ status: false, msg: 'Campo dado_atual não pode ser vazio' })
            if (allData.dado_antigo === undefined || allData.dado_antigo === null || allData.dado_antigo === '' || allData.dado_antigo === ' ') return res.status(400).json({ status: false, msg: 'Campo dado_antigo não pode ser vazio' })
            if (allData.user_id === undefined || allData.user_id === null || allData.user_id === '' || allData.user_id === ' ') return res.status(400).json({ status: false, msg: 'Campo user_id não pode ser vazio' })

            const response = await updateUseCase.indexHistorico({ ...allData, id })
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
            logExeption({ descricaoDoErro: 'Exeption estourada. Controller Historico - putHistorico', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            res.status(500).json({ status: false, msg: 'Erro interno no servidor', error: err })

        }
    }


    async deleteHistorico(req, res) {
        try {
            const token = req.cookies['authorization']
            if (token === undefined || token === null || token === '' || token === ' ') return res.status(400).json({ status: false, msg: 'Token não pode ser vazio' })
            const id = req.params.id
            if (id === undefined || id === null || id === '' || id === ' ') return res.status(400).json({ status: false, msg: 'Campo id não pode ser vazio' })
            const response = await deleteUseCase.indexHistorico({ id })
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
            logExeption({ descricaoDoErro: 'Exeption estourada. Controller Historico - deleteHistorico', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            res.status(500).json({ status: false, msg: 'Erro interno no servidor', error: err })

        }
    }


}

module.exports = new HistoricoController();



