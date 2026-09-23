
    const repository = require('../../../infrastructure/db/services/RequestsRepository');
    const domain = require('../../domain/Requests');
    const logExeption = require('../Logs/exeption/exeptionRequests');
    const dateNow = require('../../../infrastructure/gateways/functions/data/getToday');
    const ErrorStackParser = require('error-stack-parser');
    const getUseCase = require('./getRequestsUseCase');


    class deleteRequestsUseCase {

        async indexRequests(data) {
            try {
                const checkRequests = await getUseCase.getRequestsById(data)
                if(!checkRequests.status && !checkRequests.response.status) return {status: false, msg: 'Erro ao encontrar Requests, tente novamente mais tarde.'}
                if(!checkRequests.status)  return {status: false, msg: 'Requests não encontrado.'}
                const objRequests = new domain(data)
                const response = await repository.deleteRequests(objRequests)
                return {
                    status: response.status,
                    object: checkRequests.data,
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
                logExeption({ descricaoDoErro: 'Exeption estourada. use case Requests - deleteRequestsUseCase -indexRequests ', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
                return {status: false, msg:'Erro interno do servidor, log gerado'}
            }
        }     



    }

    module.exports = new deleteRequestsUseCase();

    