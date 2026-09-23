
    const repository = require('../../../infrastructure/db/services/AuditoriaLedgerSolicitacaoRepository');
    const domain = require('../../domain/AuditoriaLedgerSolicitacao');
    const logExeption = require('../Logs/exeption/exeptionAuditoriaLedgerSolicitacao');
    const dateNow = require('../../../infrastructure/gateways/functions/data/getToday');
    const ErrorStackParser = require('error-stack-parser');
    const getUseCase = require('./getAuditoriaLedgerSolicitacaoUseCase');
    const CheckObjects = require('../../../infrastructure/gateways/helpers/CheckObjects');


    class updateAuditoriaLedgerSolicitacaoUseCase {

        async indexAuditoriaLedgerSolicitacao(data) {
            try {
                const objAuditoriaLedgerSolicitacao = new domain(data)
                const checkAuditoriaLedgerSolicitacao = await getUseCase.getAuditoriaLedgerSolicitacaoById(data)
                if(!checkAuditoriaLedgerSolicitacao.status && !checkAuditoriaLedgerSolicitacao.response.status) return {status: false, msg: 'Erro interno, tente novamente mais tarde.'}
                if(!checkAuditoriaLedgerSolicitacao.status) return {status: false, msg: 'AuditoriaLedgerSolicitacao não encontrado.'}
                if(CheckObjects.isSameObject(objAuditoriaLedgerSolicitacao, checkAuditoriaLedgerSolicitacao.data)) return {status: false, msg: 'Nenhum dado foi alterado.'}
                const response = await repository.updateAuditoriaLedgerSolicitacao(objAuditoriaLedgerSolicitacao)
                return {
                    status: response.status,
                    oldObject: checkAuditoriaLedgerSolicitacao.data,
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
                logExeption({ descricaoDoErro: 'Exeption estourada. use case AuditoriaLedgerSolicitacao', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
                return {status: false, msg:'Erro interno do servidor, log gerado'}
            }
        }     



    }

    module.exports = new updateAuditoriaLedgerSolicitacaoUseCase();

    