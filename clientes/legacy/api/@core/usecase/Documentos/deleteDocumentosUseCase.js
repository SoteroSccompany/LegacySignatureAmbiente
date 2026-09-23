
    const repository = require('../../../infrastructure/db/services/DocumentosRepository');
    const domain = require('../../domain/Documentos');
    const logExeption = require('../Logs/exeption/exeptionDocumentos');
    const dateNow = require('../../../infrastructure/gateways/functions/data/getToday');
    const ErrorStackParser = require('error-stack-parser');
    const getUseCase = require('./getDocumentosUseCase');


    class deleteDocumentosUseCase {

        async indexDocumentos(data) {
            try {
                const checkDocumentos = await getUseCase.getDocumentosById(data)
                if(!checkDocumentos.status && !checkDocumentos.response.status) return {status: false, msg: 'Erro ao encontrar Documentos, tente novamente mais tarde.'}
                if(!checkDocumentos.status)  return {status: false, msg: 'Documentos não encontrado.'}
                const objDocumentos = new domain(data)
                const response = await repository.deleteDocumentos(objDocumentos)
                return {
                    status: response.status,
                    object: checkDocumentos.data,
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
                logExeption({ descricaoDoErro: 'Exeption estourada. use case Documentos - deleteDocumentosUseCase -indexDocumentos ', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
                return {status: false, msg:'Erro interno do servidor, log gerado'}
            }
        }     



    }

    module.exports = new deleteDocumentosUseCase();

    