
    const repository = require('../../../infrastructure/db/services/TermoResponsabilidadeRepository');
    const domain = require('../../domain/TermoResponsabilidade');
    const logExeption = require('../Logs/exeption/exeptionTermoResponsabilidade');
    const dateNow = require('../../../infrastructure/gateways/functions/data/getToday');
    const ErrorStackParser = require('error-stack-parser');
    const getUseCase = require('./getTermoResponsabilidadeUseCase');


    class deleteTermoResponsabilidadeUseCase {

        async indexTermoResponsabilidade(data) {
            try {
                const checkTermoResponsabilidade = await getUseCase.getTermoResponsabilidadeById(data)
                if(!checkTermoResponsabilidade.status && !checkTermoResponsabilidade.response.status) return {status: false, msg: 'Erro ao encontrar TermoResponsabilidade, tente novamente mais tarde.'}
                if(!checkTermoResponsabilidade.status)  return {status: false, msg: 'TermoResponsabilidade não encontrado.'}
                const objTermoResponsabilidade = new domain(data)
                const response = await repository.deleteTermoResponsabilidade(objTermoResponsabilidade)
                return {
                    status: response.status,
                    object: checkTermoResponsabilidade.data,
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
                logExeption({ descricaoDoErro: 'Exeption estourada. use case TermoResponsabilidade - deleteTermoResponsabilidadeUseCase -indexTermoResponsabilidade ', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
                return {status: false, msg:'Erro interno do servidor, log gerado'}
            }
        }     



    }

    module.exports = new deleteTermoResponsabilidadeUseCase();

    