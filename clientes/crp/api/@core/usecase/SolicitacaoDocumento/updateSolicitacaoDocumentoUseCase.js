
    const repository = require('../../../infrastructure/db/services/SolicitacaoDocumentoRepository');
    const domain = require('../../domain/SolicitacaoDocumento');
    const logExeption = require('../Logs/exeption/exeptionSolicitacaoDocumento');
    const dateNow = require('../../../infrastructure/gateways/functions/data/getToday');
    const ErrorStackParser = require('error-stack-parser');
    const getUseCase = require('./getSolicitacaoDocumentoUseCase');
    const CheckObjects = require('../../../infrastructure/gateways/helpers/CheckObjects');


    class updateSolicitacaoDocumentoUseCase {

        async indexSolicitacaoDocumento(data) {
            try {
                const objSolicitacaoDocumento = new domain(data)
                const checkSolicitacaoDocumento = await getUseCase.getSolicitacaoDocumentoById(data)
                if(!checkSolicitacaoDocumento.status && !checkSolicitacaoDocumento.response.status) return {status: false, msg: 'Erro interno, tente novamente mais tarde.'}
                if(!checkSolicitacaoDocumento.status) return {status: false, msg: 'SolicitacaoDocumento não encontrado.'}
                if(CheckObjects.isSameObject(objSolicitacaoDocumento, checkSolicitacaoDocumento.data)) return {status: false, msg: 'Nenhum dado foi alterado.'}
                const response = await repository.updateSolicitacaoDocumento(objSolicitacaoDocumento)
                return {
                    status: response.status,
                    oldObject: checkSolicitacaoDocumento.data,
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
                logExeption({ descricaoDoErro: 'Exeption estourada. use case SolicitacaoDocumento', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
                return {status: false, msg:'Erro interno do servidor, log gerado'}
            }
        }     



    }

    module.exports = new updateSolicitacaoDocumentoUseCase();

    