
    const repository = require('../../../infrastructure/db/services/AceiteTermoResponsabilidadeRepository');
    const domain = require('../../domain/AceiteTermoResponsabilidade');
    const logExeption = require('../Logs/exeption/exeptionAceiteTermoResponsabilidade');
    const dateNow = require('../../../infrastructure/gateways/functions/data/getToday');
    const ErrorStackParser = require('error-stack-parser');


    class createAceiteTermoResponsabilidadeUseCase {

        async indexAceiteTermoResponsabilidade(data) {
            try {
                const objAceiteTermoResponsabilidade = new domain({...data, data_criacao: dateNow()})
                const response = await repository.createAceiteTermoResponsabilidade(objAceiteTermoResponsabilidade)
                   return {
                    status: response.status,
                    object: objAceiteTermoResponsabilidade,
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
                logExeption({ descricaoDoErro: 'Exeption estourada. use case AceiteTermoResponsabilidade - createAceiteTermoResponsabilidadeUseCase - indexAceiteTermoResponsabilidade', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
                return {status: false, msg:'Erro interno do servidor, log gerado'}
            }
        }     



    }

    module.exports = new createAceiteTermoResponsabilidadeUseCase();

    