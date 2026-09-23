
    const repository = require('../../../infrastructure/db/services/AceiteTermoResponsabilidadeRepository');
    const domain = require('../../domain/AceiteTermoResponsabilidade');
    const logExeption = require('../Logs/exeption/exeptionAceiteTermoResponsabilidade');
    const dateNow = require('../../../infrastructure/gateways/functions/data/getToday');
    const ErrorStackParser = require('error-stack-parser');
    const getUseCase = require('./getAceiteTermoResponsabilidadeUseCase');


    class deleteAceiteTermoResponsabilidadeUseCase {

        async indexAceiteTermoResponsabilidade(data) {
            try {
                const checkAceiteTermoResponsabilidade = await getUseCase.getAceiteTermoResponsabilidadeById(data)
                if(!checkAceiteTermoResponsabilidade.status && !checkAceiteTermoResponsabilidade.response.status) return {status: false, msg: 'Erro ao encontrar AceiteTermoResponsabilidade, tente novamente mais tarde.'}
                if(!checkAceiteTermoResponsabilidade.status)  return {status: false, msg: 'AceiteTermoResponsabilidade não encontrado.'}
                const objAceiteTermoResponsabilidade = new domain(data)
                const response = await repository.deleteAceiteTermoResponsabilidade(objAceiteTermoResponsabilidade)
                return {
                    status: response.status,
                    object: checkAceiteTermoResponsabilidade.data,
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
                logExeption({ descricaoDoErro: 'Exeption estourada. use case AceiteTermoResponsabilidade - deleteAceiteTermoResponsabilidadeUseCase -indexAceiteTermoResponsabilidade ', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
                return {status: false, msg:'Erro interno do servidor, log gerado'}
            }
        }     



    }

    module.exports = new deleteAceiteTermoResponsabilidadeUseCase();

    