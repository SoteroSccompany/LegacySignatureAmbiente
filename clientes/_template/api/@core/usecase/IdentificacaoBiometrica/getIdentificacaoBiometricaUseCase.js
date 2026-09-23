

    const repository = require('../../../infrastructure/db/services/IdentificacaoBiometricaRepository');
    const domain = require('../../domain/IdentificacaoBiometrica');
    const logExeption = require('../Logs/exeption/exeptionIdentificacaoBiometrica');
    const dateNow = require('../../../infrastructure/gateways/functions/data/getToday');
    const ErrorStackParser = require('error-stack-parser');
    const { historico } = require('../../../certs');


    class getIdentificacaoBiometricaUseCase {

        async getIdentificacaoBiometrica() {
            try {
                const response = await repository.getIdentificacaoBiometrica()
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
                logExeption({ descricaoDoErro: 'Exeption estourada. use case IdentificacaoBiometrica - getIdentificacaoBiometricaUseCase -getIdentificacaoBiometrica', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
                return {status: false, msg:'Erro interno do servidor, log gerado'}
            }
        }


        async getIdentificacaoBiometricaById(data) {
            try{
                const response = await repository.getIdentificacaoBiometricaById(data)
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
                logExeption({ descricaoDoErro: 'Exeption estourada. use case IdentificacaoBiometrica - getIdentificacaoBiometricaUseCase - getIdentificacaoBiometricaById', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
                return {status: false, msg:'Erro interno do servidor, log gerado'}
            }
        }

        async getIdentificacaoBiometricaByQuery(data) {
            try{
                const response = await repository.getIdentificacaoBiometricaByQuery(data)
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
                logExeption({ descricaoDoErro: 'Exeption estourada. use case IdentificacaoBiometrica- getIdentificacaoBiometricaUseCase - getIdentificacaoBiometricaByLimit', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
                return {status: false, msg:'Erro interno do servidor, log gerado'}
            }
        }

        async getIdentificacaoBiometricaByQueryIdHistorico(data, id) {
            try{
            const response = await repository.getIdentificacaoBiometricaByQueryIdHistorico(data, "objeto_id", id)
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
                logExeption({ descricaoDoErro: 'Exeption estourada. use case IdentificacaoBiometrica- getIdentificacaoBiometricaUseCase - getIdentificacaoBiometricaByLimit', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
                return {status: false, msg:'Erro interno do servidor, log gerado'}
            }
        }



    }

    module.exports = new getIdentificacaoBiometricaUseCase();

    