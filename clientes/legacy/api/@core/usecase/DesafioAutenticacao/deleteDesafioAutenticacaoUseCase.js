
    const repository = require('../../../infrastructure/db/services/DesafioAutenticacaoRepository');
    const domain = require('../../domain/DesafioAutenticacao');
    const logExeption = require('../Logs/exeption/exeptionDesafioAutenticacao');
    const dateNow = require('../../../infrastructure/gateways/functions/data/getToday');
    const ErrorStackParser = require('error-stack-parser');
    const getUseCase = require('./getDesafioAutenticacaoUseCase');


    class deleteDesafioAutenticacaoUseCase {

        async indexDesafioAutenticacao(data) {
            try {
                const checkDesafioAutenticacao = await getUseCase.getDesafioAutenticacaoById(data)
                if(!checkDesafioAutenticacao.status && !checkDesafioAutenticacao.response.status) return {status: false, msg: 'Erro ao encontrar DesafioAutenticacao, tente novamente mais tarde.'}
                if(!checkDesafioAutenticacao.status)  return {status: false, msg: 'DesafioAutenticacao não encontrado.'}
                const objDesafioAutenticacao = new domain(data)
                const response = await repository.deleteDesafioAutenticacao(objDesafioAutenticacao)
                return {
                    status: response.status,
                    object: checkDesafioAutenticacao.data,
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
                logExeption({ descricaoDoErro: 'Exeption estourada. use case DesafioAutenticacao - deleteDesafioAutenticacaoUseCase -indexDesafioAutenticacao ', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
                return {status: false, msg:'Erro interno do servidor, log gerado'}
            }
        }     



    }

    module.exports = new deleteDesafioAutenticacaoUseCase();

    