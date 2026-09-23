
    const repository = require('../../../infrastructure/db/services/DocumentosRepository');
    const domain = require('../../domain/Documentos');
    const logExeption = require('../Logs/exeption/exeptionDocumentos');
    const dateNow = require('../../../infrastructure/gateways/functions/data/getToday');
    const ErrorStackParser = require('error-stack-parser');
    const getUseCase = require('./getDocumentosUseCase');
    const CheckObjects = require('../../../infrastructure/gateways/helpers/CheckObjects');


    class updateDocumentosUseCase {

        async indexDocumentos(data) {
            try {
                const objDocumentos = new domain(data)
                const checkDocumentos = await getUseCase.getDocumentosById(data)
                if(!checkDocumentos.status && !checkDocumentos.response.status) return {status: false, msg: 'Erro interno, tente novamente mais tarde.'}
                if(!checkDocumentos.status) return {status: false, msg: 'Documentos não encontrado.'}
                if(CheckObjects.isSameObject(objDocumentos, checkDocumentos.data)) return {status: false, msg: 'Nenhum dado foi alterado.'}
                const response = await repository.updateDocumentos(objDocumentos)
                return {
                    status: response.status,
                    oldObject: checkDocumentos.data,
                    object: objDocumentos,
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
                logExeption({ descricaoDoErro: 'Exeption estourada. use case Documentos', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
                return {status: false, msg:'Erro interno do servidor, log gerado'}
            }
        }     



    }

    module.exports = new updateDocumentosUseCase();

    