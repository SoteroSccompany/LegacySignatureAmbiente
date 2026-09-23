const fs = require('fs');

const generateUpdateUseCaseFile = (domain) => {
    if (domain === undefined || domain === ' ' || domain === '' || domain === null) return { status: false, msg: 'Domain não pode ser vazio!' }
    const contentFile = `
    const repository = require('../../../infrastructure/db/services/${domain}Repository');
    const domain = require('../../domain/${domain}');
    const logExeption = require('../Logs/exeption/exeption${domain}');
    const dateNow = require('../../../infrastructure/gateways/functions/data/getToday');
    const ErrorStackParser = require('error-stack-parser');
    const getUseCase = require('./get${domain}UseCase');
    const CheckObjects = require('../../../infrastructure/gateways/helpers/CheckObjects');


    class update${domain}UseCase {

        async index${domain}(data) {
            try {
                const obj${domain} = new domain(data)
                const check${domain} = await getUseCase.get${domain}ById(data)
                if(!check${domain}.status && !check${domain}.response.status) return {status: false, msg: 'Erro interno, tente novamente mais tarde.'}
                if(!check${domain}.status) return {status: false, msg: '${domain} não encontrado.'}
                if(CheckObjects.isSameObject(obj${domain}, check${domain}.data)) return {status: false, msg: 'Nenhum dado foi alterado.'}
                const response = await repository.update${domain}(obj${domain})
                return {
                    status: response.status,
                    oldObject: check${domain}.data,
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
                logExeption({ descricaoDoErro: 'Exeption estourada. use case ${domain}', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
                return {status: false, msg:'Erro interno do servidor, log gerado'}
            }
        }     



    }

    module.exports = new update${domain}UseCase();

    `

    fs.writeFileSync(`../@core/usecase/${domain}/update${domain}UseCase.js`, contentFile, (err) => {
        if (err) throw err;
        if (!err) console.log(`update${domain}UseCase.js criado e salvo!`);
    });


};


module.exports = generateUpdateUseCaseFile;
