
    const repository = require('../../../infrastructure/db/services/AuditoriaLedgerSolicitacaoRepository');
    const domain = require('../../domain/AuditoriaLedgerSolicitacao');
    const logExeption = require('../Logs/exeption/exeptionAuditoriaLedgerSolicitacao');
    const dateNow = require('../../../infrastructure/gateways/functions/data/getToday');
    const ErrorStackParser = require('error-stack-parser');
    const getUseCase = require('./getAuditoriaLedgerSolicitacaoUseCase');


    class deleteAuditoriaLedgerSolicitacaoUseCase {

        async indexAuditoriaLedgerSolicitacao(data) {
            try {
                const checkAuditoriaLedgerSolicitacao = await getUseCase.getAuditoriaLedgerSolicitacaoById(data)
                if(!checkAuditoriaLedgerSolicitacao.status && !checkAuditoriaLedgerSolicitacao.response.status) return {status: false, msg: 'Erro ao encontrar AuditoriaLedgerSolicitacao, tente novamente mais tarde.'}
                if(!checkAuditoriaLedgerSolicitacao.status)  return {status: false, msg: 'AuditoriaLedgerSolicitacao não encontrado.'}
                const objAuditoriaLedgerSolicitacao = new domain(data)
                const response = await repository.deleteAuditoriaLedgerSolicitacao(objAuditoriaLedgerSolicitacao)
                return {
                    status: response.status,
                    object: checkAuditoriaLedgerSolicitacao.data,
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
                logExeption({ descricaoDoErro: 'Exeption estourada. use case AuditoriaLedgerSolicitacao - deleteAuditoriaLedgerSolicitacaoUseCase -indexAuditoriaLedgerSolicitacao ', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
                return {status: false, msg:'Erro interno do servidor, log gerado'}
            }
        }     



    }

    module.exports = new deleteAuditoriaLedgerSolicitacaoUseCase();

    