
    const repository = require('../../../infrastructure/db/services/AceiteTermoResponsabilidadeRepository');
    const domain = require('../../domain/AceiteTermoResponsabilidade');
    const logExeption = require('../Logs/exeption/exeptionAceiteTermoResponsabilidade');
    const dateNow = require('../../../infrastructure/gateways/functions/data/getToday');
    const ErrorStackParser = require('error-stack-parser');
    const getUseCase = require('./getAceiteTermoResponsabilidadeUseCase');
    const CheckObjects = require('../../../infrastructure/gateways/helpers/CheckObjects');


    class updateAceiteTermoResponsabilidadeUseCase {

        async indexAceiteTermoResponsabilidade(data) {
            try {
                const objAceiteTermoResponsabilidade = new domain(data)
                const checkAceiteTermoResponsabilidade = await getUseCase.getAceiteTermoResponsabilidadeById(data)
                if(!checkAceiteTermoResponsabilidade.status && !checkAceiteTermoResponsabilidade.response.status) return {status: false, msg: 'Erro interno, tente novamente mais tarde.'}
                if(!checkAceiteTermoResponsabilidade.status) return {status: false, msg: 'AceiteTermoResponsabilidade não encontrado.'}
                if(CheckObjects.isSameObject(objAceiteTermoResponsabilidade, checkAceiteTermoResponsabilidade.data)) return {status: false, msg: 'Nenhum dado foi alterado.'}
                const response = await repository.updateAceiteTermoResponsabilidade(objAceiteTermoResponsabilidade)
                return {
                    status: response.status,
                    oldObject: checkAceiteTermoResponsabilidade.data,
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
                logExeption({ descricaoDoErro: 'Exeption estourada. use case AceiteTermoResponsabilidade', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
                return {status: false, msg:'Erro interno do servidor, log gerado'}
            }
        }     



    }

    module.exports = new updateAceiteTermoResponsabilidadeUseCase();

    