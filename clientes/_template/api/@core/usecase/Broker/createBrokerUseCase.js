
    const repository = require('../../../infrastructure/db/services/BrokerRepository');
    const domain = require('../../domain/Broker');
    const logExeption = require('../Logs/exeption/exeptionBroker');
    const dateNow = require('../../../infrastructure/gateways/functions/data/getToday');
    const ErrorStackParser = require('error-stack-parser');


    class createBrokerUseCase {

        async indexBroker(data) {
            try {
                const objBroker = new domain({...data, data_criacao: dateNow()})
                const response = await repository.createBroker(objBroker)
                   return {
                    status: response.status,
                    object: objBroker,
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
                logExeption({ descricaoDoErro: 'Exeption estourada. use case Broker - createBrokerUseCase - indexBroker', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
                return {status: false, msg:'Erro interno do servidor, log gerado'}
            }
        }     



    }

    module.exports = new createBrokerUseCase();

    