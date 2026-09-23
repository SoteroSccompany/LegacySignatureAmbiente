
const repository = require('../../../infrastructure/db/services/BrokerRepository');
const domain = require('../../domain/Broker');
const logExeption = require('../Logs/exeption/exeptionBroker');
const dateNow = require('../../../infrastructure/gateways/functions/data/getToday');
const ErrorStackParser = require('error-stack-parser');
const getUseCase = require('./getBrokerUseCase');
const CheckObjects = require('../../../infrastructure/gateways/helpers/CheckObjects');


class updateBrokerUseCase {

    async indexBroker(data) {
        try {
            const objBroker = new domain(data)
            const checkBroker = await getUseCase.getBrokerById(data)
            if (!checkBroker.status && !checkBroker.response.status) return { status: false, msg: 'Erro interno, tente novamente mais tarde.' }
            if (!checkBroker.status) return { status: false, msg: 'Broker não encontrado.' }
            if (CheckObjects.isSameObject(objBroker, checkBroker.data)) return { status: false, msg: 'Nenhum dado foi alterado.' }
            const response = await repository.updateBroker(objBroker)
            return {
                status: response.status,
                oldObject: checkBroker.data,
                object: objBroker,
                msg: response.msg
            }
        } catch (err) {
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(err);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            logExeption({ descricaoDoErro: 'Exeption estourada. use case Broker', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            return { status: false, msg: 'Erro interno do servidor, log gerado' }
        }
    }

    async indexBrokerInterno(data, trx) {
        await repository.updateBrokerInterno(data, trx)
    }

    async indexBrokerInternoData(data) {
        await repository.indexBrokerInternoData(data)
    }



}

module.exports = new updateBrokerUseCase();

