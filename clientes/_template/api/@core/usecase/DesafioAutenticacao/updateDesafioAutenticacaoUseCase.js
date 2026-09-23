
    const repository = require('../../../infrastructure/db/services/DesafioAutenticacaoRepository');
    const domain = require('../../domain/DesafioAutenticacao');
    const logExeption = require('../Logs/exeption/exeptionDesafioAutenticacao');
    const dateNow = require('../../../infrastructure/gateways/functions/data/getToday');
    const ErrorStackParser = require('error-stack-parser');
    const getUseCase = require('./getDesafioAutenticacaoUseCase');
    const CheckObjects = require('../../../infrastructure/gateways/helpers/CheckObjects');


    class updateDesafioAutenticacaoUseCase {

        async indexDesafioAutenticacao(data) {
            try {
                const objDesafioAutenticacao = new domain(data)
                const checkDesafioAutenticacao = await getUseCase.getDesafioAutenticacaoById(data)
                if(!checkDesafioAutenticacao.status && !checkDesafioAutenticacao.response.status) return {status: false, msg: 'Erro interno, tente novamente mais tarde.'}
                if(!checkDesafioAutenticacao.status) return {status: false, msg: 'DesafioAutenticacao não encontrado.'}
                if(CheckObjects.isSameObject(objDesafioAutenticacao, checkDesafioAutenticacao.data)) return {status: false, msg: 'Nenhum dado foi alterado.'}
                const response = await repository.updateDesafioAutenticacao(objDesafioAutenticacao)
                return {
                    status: response.status,
                    oldObject: checkDesafioAutenticacao.data,
                    object: objDesafioAutenticacao,
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
                logExeption({ descricaoDoErro: 'Exeption estourada. use case DesafioAutenticacao', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
                return {status: false, msg:'Erro interno do servidor, log gerado'}
            }
        }     



    }

    module.exports = new updateDesafioAutenticacaoUseCase();

    