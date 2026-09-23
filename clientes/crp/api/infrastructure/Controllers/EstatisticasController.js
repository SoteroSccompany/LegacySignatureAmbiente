

const logExeption = require('../../@core/usecase/Logs/exeption/exeptionEstatisticas');
const ErrorStackParser = require('error-stack-parser');
const dateNow = require('../gateways/functions/data/getToday');
const getEstatisticas = require('../../@core/usecase/Estatisticas/index');
const updateEstatisticas = require('../../@core/usecase/Estatisticas/update');


class EstatisticasController {

    async getEventos(req, res) {
        try {
            const response = await getEstatisticas.eventos();
            if (!response.status) return res.status(400).json(response)
            updateEstatisticas.eventos()
            res.status(200).json(response)
        } catch (err) {
            console.log(err)
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(err);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            logExeption({ descricaoDoErro: 'Exeption estourada. Controller Estatisticas - getPlanos', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            res.status(500).json({ status: false, msg: 'Erro interno no servidor', error: err })
        }
    }

    async getDashBoard(req, res) {
        try {
            const response = await getEstatisticas.dashBoard();
            if (!response.status) return res.status(400).json(response)
            updateEstatisticas.dashBoard()
            res.status(200).json(response)
        } catch (err) {
            console.log(err)
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(err);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            logExeption({ descricaoDoErro: 'Exeption estourada. Controller Estatisticas - getPlanos', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            res.status(500).json({ status: false, msg: 'Erro interno no servidor', error: err })
        }
    }

    async getInvestidores(req, res) {
        try {
            const response = await getEstatisticas.getInvestidores();
            if (!response.status) return res.status(400).json(response)
            updateEstatisticas.getInvestidores()
            res.status(200).json(response)
        } catch (err) {
            console.log(err)
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(err);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            logExeption({ descricaoDoErro: 'Exeption estourada. Controller Estatisticas - getPlanos', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            res.status(500).json({ status: false, msg: 'Erro interno no servidor', error: err })
        }
    }

    async getEmpreendimentos(req, res) {
        try {
            const response = await getEstatisticas.getEmpreendimentos();
            if (!response.status) return res.status(400).json(response)
            updateEstatisticas.getEmpreendimentos()
            res.status(200).json(response)
        } catch (err) {
            console.log(err)
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(err);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            logExeption({ descricaoDoErro: 'Exeption estourada. Controller Estatisticas - getPlanos', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            res.status(500).json({ status: false, msg: 'Erro interno no servidor', error: err })
        }
    }

    async getLogs(req, res) {
        try {
            const response = await getEstatisticas.logs();
            if (!response.status) return res.status(400).json(response)
            updateEstatisticas.logs()
            res.status(200).json(response)
        } catch (err) {
            console.log(err)
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(err);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            logExeption({ descricaoDoErro: 'Exeption estourada. Controller Estatisticas - getPlanos', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            res.status(500).json({ status: false, msg: 'Erro interno no servidor', error: err })
        }
    }

    async getCron(req, res) {
        try {
            const response = await getEstatisticas.cron();
            if (!response.status) return res.status(400).json(response)
            updateEstatisticas.cron()
            res.status(200).json(response)
        } catch (err) {
            console.log(err)
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(err);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            logExeption({ descricaoDoErro: 'Exeption estourada. Controller Estatisticas - getPlanos', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            res.status(500).json({ status: false, msg: 'Erro interno no servidor', error: err })
        }
    }

    async getRecuperacaoSenha(req, res) {
        try {
            const response = await getEstatisticas.recuperacaoSenha();
            if (!response.status) return res.status(400).json(response)
            updateEstatisticas.recuperacaoSenha()
            res.status(200).json(response)
        } catch (err) {
            console.log(err)
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(err);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            logExeption({ descricaoDoErro: 'Exeption estourada. Controller Estatisticas - getPlanos', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            res.status(500).json({ status: false, msg: 'Erro interno no servidor', error: err })
        }
    }

    async getUsuarios(req, res) {
        try {
            const response = await getEstatisticas.usuarios();
            if (!response.status) return res.status(400).json(response)
            updateEstatisticas.usuarios()
            res.status(200).json(response)
        } catch (err) {
            console.log(err)
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(err);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            logExeption({ descricaoDoErro: 'Exeption estourada. Controller Estatisticas - getPlanos', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            res.status(500).json({ status: false, msg: 'Erro interno no servidor', error: err })
        }
    }

    async getMovimentacaoObra(req, res) {
        try {
            const { obra_id } = req.query
            if (!obra_id) return res.status(400).json({ status: false, msg: 'Campo obra_id é obrigatório' })
            const response = await getEstatisticas.getMovimentacaoObra(obra_id)
            if (!response.status) return res.status(400).json(response)
            updateEstatisticas.getMovimentacaoObra(obra_id)
            res.status(200).json(response)
        } catch (err) {
            console.log(err)
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(err);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            logExeption({ descricaoDoErro: 'Exeption estourada. Controller Estatisticas - getMovimentacaoObra', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            res.status(500).json({ status: false, msg: 'Erro interno no servidor', error: err })
        }
    }

    async getAReceberObra(req, res) {
        try {
            const { obra_id } = req.query
            if (!obra_id) return res.status(400).json({ status: false, msg: 'Campo obra_id é obrigatório' })
            const response = await getEstatisticas.getAReceberObra(obra_id)
            if (!response.status) return res.status(400).json(response)
            updateEstatisticas.getAReceberObra(obra_id)
            res.status(200).json(response)
        } catch (err) {
            console.log(err)
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(err);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            logExeption({ descricaoDoErro: 'Exeption estourada. Controller Estatisticas - getAReceberObra', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            res.status(500).json({ status: false, msg: 'Erro interno no servidor', error: err })
        }
    }

    async getRecebidosObra(req, res) {
        try {
            const { obra_id } = req.query
            if (!obra_id) return res.status(400).json({ status: false, msg: 'Campo obra_id é obrigatório' })
            const response = await getEstatisticas.getRecebidosObra(obra_id)
            if (!response.status) return res.status(400).json(response)
            updateEstatisticas.getRecebidosObra(obra_id)
            res.status(200).json(response)
        } catch (err) {
            console.log(err)
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(err);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            logExeption({ descricaoDoErro: 'Exeption estourada. Controller Estatisticas - getRecebidosObra', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            res.status(500).json({ status: false, msg: 'Erro interno no servidor', error: err })
        }
    }

    async getVendasObra(req, res) {
        try {
            const { obra_id } = req.query
            if (!obra_id) return res.status(400).json({ status: false, msg: 'Campo obra_id é obrigatório' })
            const response = await getEstatisticas.getVendasObra(obra_id)
            if (!response.status) return res.status(400).json(response)
            updateEstatisticas.getVendasObra(obra_id)
            res.status(200).json(response)
        } catch (err) {
            console.log(err)
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(err);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            logExeption({ descricaoDoErro: 'Exeption estourada. Controller Estatisticas - getVendasObra', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            res.status(500).json({ status: false, msg: 'Erro interno no servidor', error: err })
        }
    }

    async getEstoqueObra(req, res) {
        try {
            const { obra_id } = req.query
            if (!obra_id) return res.status(400).json({ status: false, msg: 'Campo obra_id é obrigatório' })
            const response = await getEstatisticas.getEstoqueObra(obra_id)
            if (!response.status) return res.status(400).json(response)
            updateEstatisticas.getEstoqueObra(obra_id)
            res.status(200).json(response)
        } catch (err) {
            console.log(err)
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(err);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            logExeption({ descricaoDoErro: 'Exeption estourada. Controller Estatisticas - getEstoqueObra', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            res.status(500).json({ status: false, msg: 'Erro interno no servidor', error: err })
        }
    }

}

module.exports = new EstatisticasController();



