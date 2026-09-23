
    const repository = require('../../../infrastructure/db/services/SolicitacaoDocumentoRepository');
    const domain = require('../../domain/SolicitacaoDocumento');
    const logExeption = require('../Logs/exeption/exeptionSolicitacaoDocumento');
    const dateNow = require('../../../infrastructure/gateways/functions/data/getToday');
    const ErrorStackParser = require('error-stack-parser');


    class createSolicitacaoDocumentoUseCase {

        async indexSolicitacaoDocumento(data) {
            try {
                const objSolicitacaoDocumento = new domain({...data, data_criacao: dateNow()})
                const response = await repository.createSolicitacaoDocumento(objSolicitacaoDocumento)
                   return {
                    status: response.status,
                    object: objSolicitacaoDocumento,
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
                logExeption({ descricaoDoErro: 'Exeption estourada. use case SolicitacaoDocumento - createSolicitacaoDocumentoUseCase - indexSolicitacaoDocumento', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
                return {status: false, msg:'Erro interno do servidor, log gerado'}
            }
        }     



    }

    module.exports = new createSolicitacaoDocumentoUseCase();

    