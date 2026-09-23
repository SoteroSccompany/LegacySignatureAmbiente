
require('dotenv/config');
const knex = require("../config/databaseConection")();
const moment = require('moment');
const Log = require('../../../@core/usecase/Logs/databaseLog');
const ErrorStackParser = require('error-stack-parser');
const dateNow = require('../../gateways/functions/data/getToday');
const BaseRepository = require('.');

const { views } = require('../../../certs');
const logs = require('../../../Logs');

class BrokerRepository extends BaseRepository {

    constructor() {
        super({ tableName: 'tab_broker', knexOrTransaction: knex })
    }

    async createBroker(data) {
        try {
            const response = await knex('tab_broker').insert(data)
            return { status: true, data: response, msg: "Broker criado com sucesso!" }
        } catch (error) {
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(error);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            const dataLog = {
                data_recive: JSON.stringify(data),
                err: error,
                descricaoDoErro: 'Exeption estourada. RepositorioBroker - createBroker',
                linhaDoErro: lineError,
                nomeDoArquivo: fileName,
                data_criacao: dateNow(),
            }
            logs.getInstance().fatal(dataLog, 'Erro no RepositorioBroker - createBroker')
            return { status: false, error: error, msg: "Não foi possivel criar o Broker!" }
        }
    }

    async updateBroker(data) {
        try {
            const check = await this.getBrokerById(data)
            if (check.status && check.exit) {
                const response = await knex('tab_broker').update(data).where('id', data.id)
                return { status: true, data: response, msg: "Broker atualizado com sucesso!" }
            } else {
                return { status: false, msg: "Broker não encontrado!" }
            }
        } catch (error) {
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(error);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            const dataLog = {
                data_recive: JSON.stringify(data),
                err: error,
                descricaoDoErro: 'Exeption estourada. RepositorioBroker - updateBroker',
                linhaDoErro: lineError,
                nomeDoArquivo: fileName,
                data_criacao: dateNow(),
            }
            logs.getInstance().fatal(dataLog, 'Erro no RepositorioBroker - updateBroker')
            return { status: false, error: error, msg: "Não foi possivel atualizar o Broker!" }
        }
    }

    async updateBrokerInterno(data, trx) {
        try {
            const isString = typeof data.broker.message === 'string' || data.broker.message instanceof String;
            data.broker.message = isString ? data.message : JSON.stringify(data.broker.message);
            await trx('tab_broker').update(data.broker).where('id', data.broker.id)
        } catch (error) {
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(error);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            const dataLog = {
                data_recive: JSON.stringify(data),
                err: error,
                descricaoDoErro: 'Exeption estourada. RepositorioBroker - updateBroker',
                linhaDoErro: lineError,
                nomeDoArquivo: fileName,
                data_criacao: dateNow(),
            }
            logs.getInstance().fatal(dataLog, 'Erro no RepositorioBroker - updateBroker')
            return { status: false, error: error, msg: "Não foi possivel atualizar o Broker!" }
        }
    }

    async indexBrokerInternoData(data) {
        try {
            await knex('tab_broker').update(data.broker).where('id', data.broker.id)
        } catch (error) {
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(error);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            const dataLog = {
                data_recive: JSON.stringify(data),
                err: error,
                descricaoDoErro: 'Exeption estourada. RepositorioBroker - updateBroker',
                linhaDoErro: lineError,
                nomeDoArquivo: fileName,
                data_criacao: dateNow(),
            }
            logs.getInstance().fatal(dataLog, 'Erro no RepositorioBroker - updateBroker')
            return { status: false, error: error, msg: "Não foi possivel atualizar o Broker!" }
        }
    }

    async deleteBroker(data) {
        try {
            const check = await this.getBrokerById(data)
            if (check.status && check.exit) {
                const response = await knex('tab_broker').update({ deletado: true, data_atualizacao: dateNow() }).where('id', data.id)
                return { status: true, data: response, msg: "Broker deletado com sucesso!" }
            } else {
                return { status: false, msg: "Broker não encontrado!" }
            }
        } catch (error) {
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(error);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            const dataLog = {
                data_recive: JSON.stringify(data),
                err: error,
                descricaoDoErro: 'Exeption estourada. RepositorioBroker - deleteBroker',
                linhaDoErro: lineError,
                nomeDoArquivo: fileName,
                data_criacao: dateNow(),
            }
            logs.getInstance().fatal(dataLog, 'Erro no RepositorioBroker - deleteBroker')
            return { status: false, error: error, msg: "Não foi possivel deletar o Broker!" }
        }
    }

    async getBroker() {
        try {
            const response = await knex('tab_broker').select('*').where('deletado', false)
            if (response.length > 0) {
                return { status: true, exit: true, data: response, msg: "Broker encontrado com sucesso!" }
            } else {
                return { status: true, exit: false, msg: "Broker não encontrado!" }
            }
        } catch (error) {
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(error);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            const dataLog = {
                err: error,
                descricaoDoErro: 'Exeption estourada. RepositorioBroker - getBroker',
                linhaDoErro: lineError,
                nomeDoArquivo: fileName,
                data_criacao: dateNow(),
            }
            logs.getInstance().fatal(dataLog, 'Erro no RepositorioBroker - getBroker')
            return { status: false, error: error, msg: "Não foi possivel buscar o Broker!" }
        }

    }


    async getBrokerByIdInternal(data) {
        try {
            const response = await knex('tab_broker').select('id', 'exchange', 'key', 'status', 'meta_dados').where('id', data.id).andWhere('deletado', false)
            if (response.length > 0) {
                return { status: true, exit: true, data: response[0], msg: "Broker encontrado com sucesso!" }
            } else {
                return { status: true, exit: false, msg: "Broker não encontrado!" }
            }
        } catch (error) {
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(error);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            const dataLog = {
                data_recive: data,
                err: error,
                descricaoDoErro: 'Exeption estourada. RepositorioBroker - getBrokerById',
                linhaDoErro: lineError,
                nomeDoArquivo: fileName,
                data_criacao: dateNow(),
            }
            logs.getInstance().fatal(dataLog, 'Erro no RepositorioBroker - getBrokerById')
            return { status: false, error: error, msg: "Não foi possivel buscar o Broker!" }
        }

    }

    async getBrokerLoad(data) {
        try {
            const response = await knex('tab_broker').select([
                'tab_broker.id as broker_id',
                'tab_broker.exchange',
                'tab_broker.key',
                'tab_broker.delayMs',
                'tab_broker.fila',
                'tab_broker.key',
                'tab_broker.message',
                'tab_broker.status',
                'tab_broker.tentativas',
                'tab_broker.ultima_tentativa',
                'tab_broker.meta_dados',
                'tab_broker.data_atualizacao as data_atualizacao_broker',
                'tab_broker.data_criacao as data_criacao_broker'
            ]).where('tab_broker.id', data.id).andWhere('tab_broker.deletado', false);
            if (response.length > 0) {
                return { status: true, exit: true, data: response[0], msg: "Broker encontrado com sucesso!" }
            } else {
                return { status: true, exit: false, msg: "Broker não encontrado!" }
            }
        } catch (error) {
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(error);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            const dataLog = {
                data_recive: data,
                err: error,
                descricaoDoErro: 'Exeption estourada. RepositorioBroker - getBrokerById',
                linhaDoErro: lineError,
                nomeDoArquivo: fileName,
                data_criacao: dateNow(),
            }
            logs.getInstance().fatal(dataLog, 'Erro no RepositorioBroker - getBrokerById')
            return { status: false, error: error, msg: "Não foi possivel buscar o Broker!" }
        }

    }

    async getBrokerById(data) {
        try {
            const response = await knex('tab_broker').select([
                'tab_broker.*',
                'tab_configuracao_busca.tipo_intervalo_tempo',
                'tab_configuracao_busca.intervalo_tempo',
            ]).where('tab_broker.id', data.id).andWhere('tab_broker.deletado', false)
                .leftJoin('tab_configuracao_busca', 'tab_configuracao_busca.id', 'tab_broker.configuracao_obra_id');
            if (response.length > 0) {
                return { status: true, exit: true, data: response[0], msg: "Broker encontrado com sucesso!" }
            } else {
                return { status: true, exit: false, msg: "Broker não encontrado!" }
            }
        } catch (error) {
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(error);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            const dataLog = {
                data_recive: data,
                err: error,
                descricaoDoErro: 'Exeption estourada. RepositorioBroker - getBrokerById',
                linhaDoErro: lineError,
                nomeDoArquivo: fileName,
                data_criacao: dateNow(),
            }
            logs.getInstance().fatal(dataLog, 'Erro no RepositorioBroker - getBrokerById')
            return { status: false, error: error, msg: "Não foi possivel buscar o Broker!" }
        }

    }

    async getBrokerByQuery(data) {
        try {
            const resp = await this.getByQuery(data)
            if (!resp.status) return { status: true, data: [], msg: "Não foi possivel buscar o Broker!" }
            return { status: true, data: resp.data, msg: resp.msg }
        } catch (error) {
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(error);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            Log({ ...data, error, descricaoDoErro: 'Exeption estourada. RepositorioBroker - getBrokerByLimit', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            return { status: false, error: error, msg: "Não foi possivel buscar o Broker!" }
        }

    }

    async getBrokerByQueryIdHistorico(data, field, condition) {
        try {
            const resp = await this.getByQueryTableUniqWhere(data, views.view_historico, field, condition)
            if (!resp.status) return { status: true, data: [], msg: "Não foi possivel buscar o Broker!" }
            return { status: true, data: resp.data, msg: resp.msg }
        } catch (error) {
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(error);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            Log({ ...data, error, descricaoDoErro: 'Exeption estourada. RepositorioBroker - getBrokerByLimit', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            return { status: false, error: error, msg: "Não foi possivel buscar o Broker!" }
        }

    }


}

module.exports = new BrokerRepository();

