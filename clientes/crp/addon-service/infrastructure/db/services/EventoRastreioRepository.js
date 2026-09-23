
require('dotenv/config');
const knex = require("../config/databaseConection")();
const ErrorStackParser = require('error-stack-parser');
const dateNow = require('../../gateways/functions/data/getToday');
const logs = require('../../../Logs');

class EventoRastreioRepository {

    async createEventoTrx(data, trx) {
        try {
            await trx('tab_evento_rastreio').insert(data)
            return { status: true, msg: "Evento de rastreio registrado com sucesso!" }
        } catch (error) {
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(error);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            logs.getInstance().fatal({ err: error, linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow() }, 'Erro no EventoRastreioRepository - createEventoTrx')
            return { status: false, error: error, msg: "Não foi possivel registrar o evento de rastreio!" }
        }
    }

    async createEvento(data) {
        try {
            await knex('tab_evento_rastreio').insert(data)
            return { status: true, msg: "Evento de rastreio registrado com sucesso!" }
        } catch (error) {
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(error);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            logs.getInstance().fatal({ err: error, linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow() }, 'Erro no EventoRastreioRepository - createEvento')
            return { status: false, error: error, msg: "Não foi possivel registrar o evento de rastreio!" }
        }
    }

    async getEventoByPedidoIdETipo(data) {
        try {
            const response = await knex('tab_evento_rastreio').select('*').where('pedido_id', data.pedido_id).andWhere('tipo_evento', data.tipo_evento).andWhere('deletado', false).first()
            if (response) {
                return { status: true, exit: true, data: response, msg: "Evento encontrado com sucesso!" }
            } else {
                return { status: true, exit: false, msg: "Evento não encontrado!" }
            }
        } catch (error) {
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(error);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            logs.getInstance().fatal({ err: error, linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow() }, 'Erro no EventoRastreioRepository - getEventoByPedidoIdETipo')
            return { status: false, error: error, msg: "Não foi possivel buscar o evento do pedido!" }
        }
    }

    async getEventosByPedidoId(data) {
        try {
            const response = await knex('tab_evento_rastreio').select('*').where('pedido_id', data.pedido_id).andWhere('deletado', false).orderBy('data_criacao', 'asc')
            return { status: true, exit: response.length > 0, data: response, msg: "Eventos listados com sucesso!" }
        } catch (error) {
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(error);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            logs.getInstance().fatal({ err: error, linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow() }, 'Erro no EventoRastreioRepository - getEventosByPedidoId')
            return { status: false, error: error, msg: "Não foi possivel listar os eventos do pedido!" }
        }
    }

}

module.exports = new EventoRastreioRepository();
