const fs = require('fs');

const generateCreateUseCaseFile = (domain) => {
    if (domain === undefined || domain === ' ' || domain === '' || domain === null) return { status: false, msg: 'Domain não pode ser vazio!' }

    const contentFile = `
    const repository = require('../../../infrastructure/db/services/${domain}Repository');
    const domain = require('../../domain/${domain}');
    const logExeption = require('../Logs/exeption/exeption${domain}');
    const dateNow = require('../../../infrastructure/gateways/functions/data/getToday');
    const ErrorStackParser = require('error-stack-parser');


    class create${domain}UseCase {

        async index${domain}(data) {
            try {
                const obj${domain} = new domain({...data, data_criacao: dateNow()})
                const response = await repository.create${domain}(obj${domain})
                   return {
                    status: response.status,
                    object: obj${domain},
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
                logExeption({ descricaoDoErro: 'Exeption estourada. use case ${domain} - create${domain}UseCase - index${domain}', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
                return {status: false, msg:'Erro interno do servidor, log gerado'}
            }
        }     



    }

    module.exports = new create${domain}UseCase();

    `


    fs.writeFileSync(`../@core/usecase/${domain}/create${domain}UseCase.js`, contentFile, (err) => {
        if (err) throw err;
        if (!err) console.log(`create${domain}UseCase.js criado e salvo!`);
    });


};


module.exports = generateCreateUseCaseFile;
