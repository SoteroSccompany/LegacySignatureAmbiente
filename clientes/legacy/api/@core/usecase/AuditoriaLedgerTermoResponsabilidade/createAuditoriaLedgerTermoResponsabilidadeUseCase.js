
    const repository = require('../../../infrastructure/db/services/AuditoriaLedgerTermoResponsabilidadeRepository');
    const domain = require('../../domain/AuditoriaLedgerTermoResponsabilidade');
    const logExeption = require('../Logs/exeption/exeptionAuditoriaLedgerTermoResponsabilidade');
    const dateNow = require('../../../infrastructure/gateways/functions/data/getToday');
    const ErrorStackParser = require('error-stack-parser');


    class createAuditoriaLedgerTermoResponsabilidadeUseCase {

        async indexAuditoriaLedgerTermoResponsabilidade(data) {
            try {
                const objAuditoriaLedgerTermoResponsabilidade = new domain({...data, data_criacao: dateNow()})
                const response = await repository.createAuditoriaLedgerTermoResponsabilidade(objAuditoriaLedgerTermoResponsabilidade)
                   return {
                    status: response.status,
                    object: objAuditoriaLedgerTermoResponsabilidade,
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
                logExeption({ descricaoDoErro: 'Exeption estourada. use case AuditoriaLedgerTermoResponsabilidade - createAuditoriaLedgerTermoResponsabilidadeUseCase - indexAuditoriaLedgerTermoResponsabilidade', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
                return {status: false, msg:'Erro interno do servidor, log gerado'}
            }
        }     



    }

    module.exports = new createAuditoriaLedgerTermoResponsabilidadeUseCase();

    