
    const repository = require('../../../infrastructure/db/services/AuditoriaLedgerTermoResponsabilidadeRepository');
    const domain = require('../../domain/AuditoriaLedgerTermoResponsabilidade');
    const logExeption = require('../Logs/exeption/exeptionAuditoriaLedgerTermoResponsabilidade');
    const dateNow = require('../../../infrastructure/gateways/functions/data/getToday');
    const ErrorStackParser = require('error-stack-parser');
    const getUseCase = require('./getAuditoriaLedgerTermoResponsabilidadeUseCase');


    class deleteAuditoriaLedgerTermoResponsabilidadeUseCase {

        async indexAuditoriaLedgerTermoResponsabilidade(data) {
            try {
                const checkAuditoriaLedgerTermoResponsabilidade = await getUseCase.getAuditoriaLedgerTermoResponsabilidadeById(data)
                if(!checkAuditoriaLedgerTermoResponsabilidade.status && !checkAuditoriaLedgerTermoResponsabilidade.response.status) return {status: false, msg: 'Erro ao encontrar AuditoriaLedgerTermoResponsabilidade, tente novamente mais tarde.'}
                if(!checkAuditoriaLedgerTermoResponsabilidade.status)  return {status: false, msg: 'AuditoriaLedgerTermoResponsabilidade não encontrado.'}
                const objAuditoriaLedgerTermoResponsabilidade = new domain(data)
                const response = await repository.deleteAuditoriaLedgerTermoResponsabilidade(objAuditoriaLedgerTermoResponsabilidade)
                return {
                    status: response.status,
                    object: checkAuditoriaLedgerTermoResponsabilidade.data,
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
                logExeption({ descricaoDoErro: 'Exeption estourada. use case AuditoriaLedgerTermoResponsabilidade - deleteAuditoriaLedgerTermoResponsabilidadeUseCase -indexAuditoriaLedgerTermoResponsabilidade ', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
                return {status: false, msg:'Erro interno do servidor, log gerado'}
            }
        }     



    }

    module.exports = new deleteAuditoriaLedgerTermoResponsabilidadeUseCase();

    