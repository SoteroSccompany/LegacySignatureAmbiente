const fs = require('fs');

const generateGetUseCaseFile = (domain) => {
    if (domain === undefined || domain === ' ' || domain === '' || domain === null) return { status: false, msg: 'Domain não pode ser vazio!' }

    const contentFile = `

    const repository = require('../../../infrastructure/db/services/${domain}Repository');
    const domain = require('../../domain/${domain}');
    const logExeption = require('../Logs/exeption/exeption${domain}');
    const dateNow = require('../../../infrastructure/gateways/functions/data/getToday');
    const ErrorStackParser = require('error-stack-parser');
    const { historico } = require('../../../certs');


    class get${domain}UseCase {

        async get${domain}() {
            try {
                const response = await repository.get${domain}()
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
                logExeption({ descricaoDoErro: 'Exeption estourada. use case ${domain} - get${domain}UseCase -get${domain}', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
                return {status: false, msg:'Erro interno do servidor, log gerado'}
            }
        }


        async get${domain}ById(data) {
            try{
                const response = await repository.get${domain}ById(data)
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
                logExeption({ descricaoDoErro: 'Exeption estourada. use case ${domain} - get${domain}UseCase - get${domain}ById', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
                return {status: false, msg:'Erro interno do servidor, log gerado'}
            }
        }

        async get${domain}ByQuery(data) {
            try{
                const response = await repository.get${domain}ByQuery(data)
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
                logExeption({ descricaoDoErro: 'Exeption estourada. use case ${domain}- get${domain}UseCase - get${domain}ByLimit', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
                return {status: false, msg:'Erro interno do servidor, log gerado'}
            }
        }

        async get${domain}ByQueryIdHistorico(data, id) {
            try{
            const response = await repository.get${domain}ByQueryIdHistorico(data, "objeto_id", id)
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
                logExeption({ descricaoDoErro: 'Exeption estourada. use case ${domain}- get${domain}UseCase - get${domain}ByLimit', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
                return {status: false, msg:'Erro interno do servidor, log gerado'}
            }
        }



    }

    module.exports = new get${domain}UseCase();

    `

    fs.writeFileSync(`../@core/usecase/${domain}/get${domain}UseCase.js`, contentFile, (err) => {
        if (err) throw err;
        if (!err) console.log(`get${domain}UseCase.js criado e salvo!`);
    });



    return contentFile


};


module.exports = generateGetUseCaseFile;
