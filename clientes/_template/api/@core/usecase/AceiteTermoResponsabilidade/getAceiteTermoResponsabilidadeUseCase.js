

    const repository = require('../../../infrastructure/db/services/AceiteTermoResponsabilidadeRepository');
    const domain = require('../../domain/AceiteTermoResponsabilidade');
    const logExeption = require('../Logs/exeption/exeptionAceiteTermoResponsabilidade');
    const dateNow = require('../../../infrastructure/gateways/functions/data/getToday');
    const ErrorStackParser = require('error-stack-parser');
    const { historico } = require('../../../certs');


    class getAceiteTermoResponsabilidadeUseCase {

        async getAceiteTermoResponsabilidade() {
            try {
                const response = await repository.getAceiteTermoResponsabilidade()
                if(response.status && response.exit){
                    return {status: true, data: response.data, msg: response.msg}
                }else{
                    return {status: false, msg: response.msg, response}
                }
            }catch(err){            
                let lineError = '0';
                let fileName = '0';
                const stackFrames = ErrorStackParser.parse(err);
                if (stackFrames.length > 0) {
                    lineError = stackFrames[0].lineNumber;
                    fileName = stackFrames[0].fileName;
                }
                logExeption({ descricaoDoErro: 'Exeption estourada. use case AceiteTermoResponsabilidade - getAceiteTermoResponsabilidadeUseCase -getAceiteTermoResponsabilidade', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
                return {status: false, msg:'Erro interno do servidor, log gerado'}
            }
        }


        async getAceiteTermoResponsabilidadeById(data) {
            try{
                const response = await repository.getAceiteTermoResponsabilidadeById(data)
                if(response.status && response.exit){
                    return {status: true, data: response.data, msg: response.msg}
                }else{
                    return {status: false, msg: response.msg, response}
                }
            }catch(err){            
                let lineError = '0';
                let fileName = '0';
                const stackFrames = ErrorStackParser.parse(err);
                if (stackFrames.length > 0) {
                    lineError = stackFrames[0].lineNumber;
                    fileName = stackFrames[0].fileName;
                }
                logExeption({ descricaoDoErro: 'Exeption estourada. use case AceiteTermoResponsabilidade - getAceiteTermoResponsabilidadeUseCase - getAceiteTermoResponsabilidadeById', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
                return {status: false, msg:'Erro interno do servidor, log gerado'}
            }
        }

        async getAceiteTermoResponsabilidadeByQuery(data) {
            try{
                const response = await repository.getAceiteTermoResponsabilidadeByQuery(data)
                if(response.status){
                    return {status: true, data: response.data, msg: response.msg}
                }else{
                    return {status: false, msg: response.msg, response}
                }
            }catch(err){            
                let lineError = '0';
                let fileName = '0';
                const stackFrames = ErrorStackParser.parse(err);
                if (stackFrames.length > 0) {
                    lineError = stackFrames[0].lineNumber;
                    fileName = stackFrames[0].fileName;
                }
                logExeption({ descricaoDoErro: 'Exeption estourada. use case AceiteTermoResponsabilidade- getAceiteTermoResponsabilidadeUseCase - getAceiteTermoResponsabilidadeByLimit', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
                return {status: false, msg:'Erro interno do servidor, log gerado'}
            }
        }

        async getAceiteTermoResponsabilidadeByQueryIdHistorico(data, id) {
            try{
            const response = await repository.getAceiteTermoResponsabilidadeByQueryIdHistorico(data, "objeto_id", id)
            if (response.status) {
                response.data.forEach(item => {
                    item.transformacao = historico.trnasformcao.create.value === item.transformacao ? historico.trnasformcao.create.label :
                        historico.trnasformcao.update.value === item.transformacao ? historico.trnasformcao.update.label :
                            historico.trnasformcao.delete.value === item.transformacao ? historico.trnasformcao.delete.label : item.transformacao;
                    item.dado_atual = JSON.parse(item.dado_atual);
                    item.dado_antigo = JSON.parse(item.dado_antigo);
                });
                return { status: true, data: response.data, msg: response.msg }
            } else {
                return { status: false, msg: response.msg, response }
            }
            }catch(err){            
                let lineError = '0';
                let fileName = '0';
                const stackFrames = ErrorStackParser.parse(err);
                if (stackFrames.length > 0) {
                    lineError = stackFrames[0].lineNumber;
                    fileName = stackFrames[0].fileName;
                }
                logExeption({ descricaoDoErro: 'Exeption estourada. use case AceiteTermoResponsabilidade- getAceiteTermoResponsabilidadeUseCase - getAceiteTermoResponsabilidadeByLimit', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
                return {status: false, msg:'Erro interno do servidor, log gerado'}
            }
        }



    }

    module.exports = new getAceiteTermoResponsabilidadeUseCase();

    