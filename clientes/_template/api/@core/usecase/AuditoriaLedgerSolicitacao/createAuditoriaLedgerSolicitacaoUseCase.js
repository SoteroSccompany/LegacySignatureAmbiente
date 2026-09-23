
    const repository = require('../../../infrastructure/db/services/AuditoriaLedgerSolicitacaoRepository');
    const domain = require('../../domain/AuditoriaLedgerSolicitacao');
    const logExeption = require('../Logs/exeption/exeptionAuditoriaLedgerSolicitacao');
    const dateNow = require('../../../infrastructure/gateways/functions/data/getToday');
    const ErrorStackParser = require('error-stack-parser');


    class createAuditoriaLedgerSolicitacaoUseCase {

        async indexAuditoriaLedgerSolicitacao(data) {
            try {
                const objAuditoriaLedgerSolicitacao = new domain({...data, data_criacao: dateNow()})
                const response = await repository.createAuditoriaLedgerSolicitacao(objAuditoriaLedgerSolicitacao)
                   return {
                    status: response.status,
                    object: objAuditoriaLedgerSolicitacao,
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
                logExeption({ descricaoDoErro: 'Exeption estourada. use case AuditoriaLedgerSolicitacao - createAuditoriaLedgerSolicitacaoUseCase - indexAuditoriaLedgerSolicitacao', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
                return {status: false, msg:'Erro interno do servidor, log gerado'}
            }
        }     



    }

    module.exports = new createAuditoriaLedgerSolicitacaoUseCase();

    