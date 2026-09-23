
require('dotenv/config');
const knex = require("../config/databaseConection")();
const ErrorStackParser = require('error-stack-parser');
const dateNow = require('../../gateways/functions/data/getToday');
const logs = require('../../../Logs');

class PedidoRepository {

    async createPedidoTrx(data, trx) {
        try {
            await trx('tab_pedido').insert(data)
            return { status: true, msg: "Pedido criado com sucesso!" }
        } catch (error) {
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(error);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            logs.getInstance().fatal({ err: error, linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow() }, 'Erro no PedidoRepository - createPedidoTrx')
            return { status: false, error: error, msg: "Não foi possivel criar o pedido!" }
        }
    }

    async getPedidoById(data) {
        try {
            const response = await knex('tab_pedido').select('*').where('id', data.id).andWhere('deletado', false).first()
            if (response) {
                return { status: true, exit: true, data: response, msg: "Pedido encontrado com sucesso!" }
            } else {
                return { status: true, exit: false, msg: "Pedido não encontrado!" }
            }
        } catch (error) {
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(error);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            logs.getInstance().fatal({ err: error, linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow() }, 'Erro no PedidoRepository - getPedidoById')
            return { status: false, error: error, msg: "Não foi possivel buscar o pedido!" }
        }
    }

    async getPedidoByDocumentoId(data) {
        try {
            const response = await knex('tab_pedido').select('*').where('documento_id', data.documento_id).andWhere('deletado', false).first()
            if (response) {
                return { status: true, exit: true, data: response, msg: "Pedido encontrado com sucesso!" }
            } else {
                return { status: true, exit: false, msg: "Pedido não encontrado!" }
            }
        } catch (error) {
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(error);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            logs.getInstance().fatal({ err: error, linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow() }, 'Erro no PedidoRepository - getPedidoByDocumentoId')
            return { status: false, error: error, msg: "Não foi possivel buscar o pedido!" }
        }
    }

    async getPedidosByInstalacaoId(data) {
        try {
            const response = await knex('tab_pedido').select('*')
                .where('instalacao_id', data.instalacao_id).andWhere('deletado', false)
                .orderBy('data_criacao', 'desc').limit(data.limit || 50).offset(data.offset || 0)
            return { status: true, exit: response.length > 0, data: response, msg: "Pedidos listados com sucesso!" }
        } catch (error) {
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(error);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            logs.getInstance().fatal({ err: error, linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow() }, 'Erro no PedidoRepository - getPedidosByInstalacaoId')
            return { status: false, error: error, msg: "Não foi possivel listar os pedidos!" }
        }
    }

    // signatarios_json guarda { nome, email, campos_extras } por destinatário
    // (createPedidoUseCase). Filtro em JS, sem JSON_CONTAINS — mesmo estilo do
    // resto do repositório.
    async getPedidosByEmailSignatario(data) {
        try {
            const email = String(data.email || '').trim().toLowerCase();
            const response = await knex('tab_pedido').select('*')
                .whereNotNull('documento_id').andWhere('deletado', false)
                .orderBy('data_criacao', 'desc')
            const pendencias = response.filter((pedido) => {
                let signatarios = [];
                try {
                    signatarios = typeof pedido.signatarios_json === 'string' ? JSON.parse(pedido.signatarios_json) : (pedido.signatarios_json || []);
                } catch (err) {
                    signatarios = [];
                }
                return signatarios.some((s) => String(s.email || '').trim().toLowerCase() === email);
            });
            return { status: true, exit: pendencias.length > 0, data: pendencias, msg: "Pendências listadas com sucesso!" }
        } catch (error) {
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(error);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            logs.getInstance().fatal({ err: error, linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow() }, 'Erro no PedidoRepository - getPedidosByEmailSignatario')
            return { status: false, error: error, msg: "Não foi possivel listar as pendências de assinatura!" }
        }
    }

    async updatePedido(data) {
        try {
            const check = await this.getPedidoById(data)
            if (check.status && check.exit) {
                const response = await knex('tab_pedido').update(data).where('id', data.id)
                return { status: true, data: response, msg: "Pedido atualizado com sucesso!" }
            } else {
                return { status: false, msg: "Pedido não encontrado!" }
            }
        } catch (error) {
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(error);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            logs.getInstance().fatal({ err: error, linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow() }, 'Erro no PedidoRepository - updatePedido')
            return { status: false, error: error, msg: "Não foi possivel atualizar o pedido!" }
        }
    }

}

module.exports = new PedidoRepository();
