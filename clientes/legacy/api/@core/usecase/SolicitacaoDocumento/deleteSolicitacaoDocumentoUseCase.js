
    const repository = require('../../../infrastructure/db/services/SolicitacaoDocumentoRepository');
    const domain = require('../../domain/SolicitacaoDocumento');
    const logExeption = require('../Logs/exeption/exeptionSolicitacaoDocumento');
    const dateNow = require('../../../infrastructure/gateways/functions/data/getToday');
    const ErrorStackParser = require('error-stack-parser');
    const getUseCase = require('./getSolicitacaoDocumentoUseCase');


    class deleteSolicitacaoDocumentoUseCase {

        async indexSolicitacaoDocumento(data) {
            try {
                const checkSolicitacaoDocumento = await getUseCase.getSolicitacaoDocumentoById(data)
                if(!checkSolicitacaoDocumento.status && !checkSolicitacaoDocumento.response.status) return {status: false, msg: 'Erro ao encontrar SolicitacaoDocumento, tente novamente mais tarde.'}
                if(!checkSolicitacaoDocumento.status)  return {status: false, msg: 'SolicitacaoDocumento não encontrado.'}
                const objSolicitacaoDocumento = new domain(data)
                const response = await repository.deleteSolicitacaoDocumento(objSolicitacaoDocumento)
                return {
                    status: response.status,
                    object: checkSolicitacaoDocumento.data,
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
                logExeption({ descricaoDoErro: 'Exeption estourada. use case SolicitacaoDocumento - deleteSolicitacaoDocumentoUseCase -indexSolicitacaoDocumento ', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
                return {status: false, msg:'Erro interno do servidor, log gerado'}
            }
        }     



    }

    module.exports = new deleteSolicitacaoDocumentoUseCase();

    