
    const repository = require('../../../infrastructure/db/services/BrokerRepository');
    const domain = require('../../domain/Broker');
    const logExeption = require('../Logs/exeption/exeptionBroker');
    const dateNow = require('../../../infrastructure/gateways/functions/data/getToday');
    const ErrorStackParser = require('error-stack-parser');
    const getUseCase = require('./getBrokerUseCase');


    class deleteBrokerUseCase {

        async indexBroker(data) {
            try {
                const checkBroker = await getUseCase.getBrokerById(data)
                if(!checkBroker.status && !checkBroker.response.status) return {status: false, msg: 'Erro ao encontrar Broker, tente novamente mais tarde.'}
                if(!checkBroker.status)  return {status: false, msg: 'Broker não encontrado.'}
                const objBroker = new domain(data)
                const response = await repository.deleteBroker(objBroker)
                return {
                    status: response.status,
                    object: checkBroker.data,
                    msg: response.msg
                }
            }catch(err){            
                let lineError = '0';
                let fileName = '0';
                const stackFrames = ErrorStackParser.parse(err);
                if (stackFrames.length > 0) {
                    lineError = stackFrames[0].lineNumber;
                    fileName = stackFrames[0].fileName;
                }
                logExeption({ descricaoDoErro: 'Exeption estourada. use case Broker - deleteBrokerUseCase -indexBroker ', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
                return {status: false, msg:'Erro interno do servidor, log gerado'}
            }
        }     



    }

    module.exports = new deleteBrokerUseCase();

    