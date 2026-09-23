
    const repository = require('../../../infrastructure/db/services/RequestsRepository');
    const domain = require('../../domain/Requests');
    const logExeption = require('../Logs/exeption/exeptionRequests');
    const dateNow = require('../../../infrastructure/gateways/functions/data/getToday');
    const ErrorStackParser = require('error-stack-parser');


    class createRequestsUseCase {

        async indexRequests(data) {
            try {
                const objRequests = new domain({...data, data_criacao: dateNow()})
                const response = await repository.createRequests(objRequests)
                   return {
                    status: response.status,
                    object: objRequests,
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
                logExeption({ descricaoDoErro: 'Exeption estourada. use case Requests - createRequestsUseCase - indexRequests', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
                return {status: false, msg:'Erro interno do servidor, log gerado'}
            }
        }     



    }

    module.exports = new createRequestsUseCase();

    