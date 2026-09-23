
    const repository = require('../../../infrastructure/db/services/AuditoriaLedgerRepository');
    const domain = require('../../domain/AuditoriaLedger');
    const logExeption = require('../Logs/exeption/exeptionAuditoriaLedger');
    const dateNow = require('../../../infrastructure/gateways/functions/data/getToday');
    const ErrorStackParser = require('error-stack-parser');
    const getUseCase = require('./getAuditoriaLedgerUseCase');
    const CheckObjects = require('../../../infrastructure/gateways/helpers/CheckObjects');


    class updateAuditoriaLedgerUseCase {

        async indexAuditoriaLedger(data) {
            try {
                const objAuditoriaLedger = new domain(data)
                const checkAuditoriaLedger = await getUseCase.getAuditoriaLedgerById(data)
                if(!checkAuditoriaLedger.status && !checkAuditoriaLedger.response.status) return {status: false, msg: 'Erro interno, tente novamente mais tarde.'}
                if(!checkAuditoriaLedger.status) return {status: false, msg: 'AuditoriaLedger não encontrado.'}
                if(CheckObjects.isSameObject(objAuditoriaLedger, checkAuditoriaLedger.data)) return {status: false, msg: 'Nenhum dado foi alterado.'}
                const response = await repository.updateAuditoriaLedger(objAuditoriaLedger)
                return {
                    status: response.status,
                    oldObject: checkAuditoriaLedger.data,
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
                logExeption({ descricaoDoErro: 'Exeption estourada. use case AuditoriaLedger', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
                return {status: false, msg:'Erro interno do servidor, log gerado'}
            }
        }     



    }

    module.exports = new updateAuditoriaLedgerUseCase();

    