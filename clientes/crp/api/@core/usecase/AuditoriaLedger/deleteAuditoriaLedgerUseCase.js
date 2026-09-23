
    const repository = require('../../../infrastructure/db/services/AuditoriaLedgerRepository');
    const domain = require('../../domain/AuditoriaLedger');
    const logExeption = require('../Logs/exeption/exeptionAuditoriaLedger');
    const dateNow = require('../../../infrastructure/gateways/functions/data/getToday');
    const ErrorStackParser = require('error-stack-parser');
    const getUseCase = require('./getAuditoriaLedgerUseCase');


    class deleteAuditoriaLedgerUseCase {

        async indexAuditoriaLedger(data) {
            try {
                const checkAuditoriaLedger = await getUseCase.getAuditoriaLedgerById(data)
                if(!checkAuditoriaLedger.status && !checkAuditoriaLedger.response.status) return {status: false, msg: 'Erro ao encontrar AuditoriaLedger, tente novamente mais tarde.'}
                if(!checkAuditoriaLedger.status)  return {status: false, msg: 'AuditoriaLedger não encontrado.'}
                const objAuditoriaLedger = new domain(data)
                const response = await repository.deleteAuditoriaLedger(objAuditoriaLedger)
                return {
                    status: response.status,
                    object: checkAuditoriaLedger.data,
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
                logExeption({ descricaoDoErro: 'Exeption estourada. use case AuditoriaLedger - deleteAuditoriaLedgerUseCase -indexAuditoriaLedger ', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
                return {status: false, msg:'Erro interno do servidor, log gerado'}
            }
        }     



    }

    module.exports = new deleteAuditoriaLedgerUseCase();

    