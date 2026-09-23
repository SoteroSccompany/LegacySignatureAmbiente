
    const repository = require('../../../infrastructure/db/services/AuditoriaLedgerRepository');
    const domain = require('../../domain/AuditoriaLedger');
    const logExeption = require('../Logs/exeption/exeptionAuditoriaLedger');
    const dateNow = require('../../../infrastructure/gateways/functions/data/getToday');
    const ErrorStackParser = require('error-stack-parser');


    class createAuditoriaLedgerUseCase {

        async indexAuditoriaLedger(data) {
            try {
                const objAuditoriaLedger = new domain({...data, data_criacao: dateNow()})
                const response = await repository.createAuditoriaLedger(objAuditoriaLedger)
                   return {
                    status: response.status,
                    object: objAuditoriaLedger,
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
                logExeption({ descricaoDoErro: 'Exeption estourada. use case AuditoriaLedger - createAuditoriaLedgerUseCase - indexAuditoriaLedger', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
                return {status: false, msg:'Erro interno do servidor, log gerado'}
            }
        }     



    }

    module.exports = new createAuditoriaLedgerUseCase();

    