
const ErrorStackParser = require('error-stack-parser');
const dateNow = require('../gateways/functions/data/getToday');
const createPedidoUseCase = require('../../@core/usecase/Pedido/createPedidoUseCase');
const getPedidoUseCase = require('../../@core/usecase/Pedido/getPedidoUseCase');
const logs = require('../../Logs');

class PedidoController {

    async postPedido(req, res) {
        try {
            const { titulo, termo_id, arquivo_origem_id, signatarios, areas } = req.body;
            if (!titulo || titulo.trim() === '') return res.status(400).json({ status: false, msg: 'Campo titulo não pode ser vazio' })
            if (!arquivo_origem_id) return res.status(400).json({ status: false, msg: 'Campo arquivo_origem_id não pode ser vazio' })
            if (!Array.isArray(signatarios) || signatarios.length === 0) return res.status(400).json({ status: false, msg: 'Informe o array de signatários' })
            if (!Array.isArray(areas) || areas.length === 0) return res.status(400).json({ status: false, msg: 'Informe as áreas de assinatura' })
            const response = await createPedidoUseCase.indexPedido({
                instalacao: req.instalacao,
                titulo,
                termo_id: termo_id || null,
                arquivo_origem_id,
                signatarios,
                areas,
            })
            if (response.status) return res.status(200).json({ status: true, msg: response.msg, data: response.data })
            res.status(400).json({ status: response.status, msg: response.msg })
        } catch (err) {
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(err);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            logs.getInstance().error({ linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), err }, 'Erro no PedidoController - postPedido')
            res.status(500).json({ status: false, msg: 'Erro interno no servidor' })
        }
    }

    async getPedidos(req, res) {
        try {
            const response = await getPedidoUseCase.listarPedidos({
                instalacao: req.instalacao,
                limit: req.query.limit,
                offset: req.query.offset,
            })
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
            logs.getInstance().error({ linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), err }, 'Erro no PedidoController - getPedidos')
            res.status(500).json({ status: false, msg: 'Erro interno no servidor' })
        }
    }

    async getPendencias(req, res) {
        try {
            const response = await getPedidoUseCase.listarPendenciasAssinatura({ instalacao: req.instalacao })
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
            logs.getInstance().error({ linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), err }, 'Erro no PedidoController - getPendencias')
            res.status(500).json({ status: false, msg: 'Erro interno no servidor' })
        }
    }

    // Gravar o assinado no Drive usa a conta de serviço (sub=e-mail da instalação) — sem token no body.
    async postPedidoStatus(req, res) {
        try {
            const id = req.params.id
            if (id === undefined || id === null || id === '' || id === ' ') return res.status(400).json({ status: false, msg: 'Id não pode ser vazio' })
            const response = await getPedidoUseCase.statusPedido({
                instalacao: req.instalacao,
                id,
            })
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
            logs.getInstance().error({ linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), err }, 'Erro no PedidoController - postPedidoStatus')
            res.status(500).json({ status: false, msg: 'Erro interno no servidor' })
        }
    }

}

module.exports = new PedidoController();
