const fs = require('fs');


const generateRepositoryFile = async (domain, table) => {

    if (domain !== '' && table !== '' && domain !== undefined && table !== undefined && domain !== null && table !== null) {
        const contentFile =
            `   
        require('dotenv/config');
        const knex = require("../config/databaseConection")();
        const moment = require('moment');
        const Log = require('../../../@core/usecase/Logs/databaseLog');
        const ErrorStackParser = require('error-stack-parser');
        const dateNow = require('../../gateways/functions/data/getToday');
        const BaseRepository = require('.');
        const { views } = require('../../../certs');
        const logs = require('../../../Logs');

        class ${domain}Repository extends BaseRepository {

            constructor() {
                super({ tableName: '${table}', knexOrTransaction: knex })
            }

            async create${domain}(data) {
                try {
                    const response = await knex('${table}').insert(data)
                    return { status: true, data: response, msg: "${domain} criado com sucesso!" }
                }catch (error) {
                    let lineError = '0';
                    let fileName = '0';
                    const stackFrames = ErrorStackParser.parse(error);
                    if (stackFrames.length > 0) {
                        lineError = stackFrames[0].lineNumber;
                        fileName = stackFrames[0].fileName;
                    }
                    const dataLog = {
                        data_recive: JSON.stringify(data),
                        err: error,
                        descricaoDoErro: 'Exeption estourada. Repositorio${domain} - create${domain}',
                        linhaDoErro: lineError,
                        nomeDoArquivo: fileName,
                        data_criacao: dateNow(),
                    }
                    logs.getInstance().fatal(dataLog, 'Erro no Repositorio${domain} - create${domain}')
                    return { status: false, error: error, msg: "Não foi possivel criar o ${domain}!" }
                }
            }

            async update${domain}(data) {
                try {
                    const check = await this.get${domain}ById(data)
                    if (check.status && check.exit) {
                    const response = await knex('${table}').update(data).where('id', data.id)
                        return { status: true, data: response, msg: "${domain} atualizado com sucesso!" }
                    }else{
                        return { status: false,  msg: "${domain} não encontrado!" }
                    }
                }catch (error) {
                    let lineError = '0';
                    let fileName = '0';
                    const stackFrames = ErrorStackParser.parse(error);
                    if (stackFrames.length > 0) {
                        lineError = stackFrames[0].lineNumber;
                        fileName = stackFrames[0].fileName;
                    }
                    const dataLog = {
                        data_recive: JSON.stringify(data),
                        err: error,
                        descricaoDoErro: 'Exeption estourada. Repositorio${domain} - update${domain}',
                        linhaDoErro: lineError,
                        nomeDoArquivo: fileName,
                        data_criacao: dateNow(),
                    }
                    logs.getInstance().fatal(dataLog, 'Erro no Repositorio${domain} - update${domain}')    
                    return { status: false, error: error, msg: "Não foi possivel atualizar o ${domain}!" }
                }
            }

            async delete${domain}(data) {
                try {
                    const check = await this.get${domain}ById(data)
                    if (check.status && check.exit) {
                        const response = await knex('${table}').update({ deletado: true, data_atualizacao: dateNow() }).where('id', data.id)
                        return { status: true, data: response, msg: "${domain} deletado com sucesso!" }
                    }else{
                        return { status: false, msg: "${domain} não encontrado!" }
                    }
                }catch (error) {
                    let lineError = '0';
                    let fileName = '0';
                    const stackFrames = ErrorStackParser.parse(error);
                    if (stackFrames.length > 0) {
                        lineError = stackFrames[0].lineNumber;
                        fileName = stackFrames[0].fileName;
                    }
                    const dataLog = {
                        data_recive: JSON.stringify(data),
                        err: error,
                        descricaoDoErro: 'Exeption estourada. Repositorio${domain} - delete${domain}',
                        linhaDoErro: lineError,
                        nomeDoArquivo: fileName,
                        data_criacao: dateNow(),
                    }
                    logs.getInstance().fatal(dataLog, 'Erro no Repositorio${domain} - delete${domain}')
                    return { status: false, error: error, msg: "Não foi possivel deletar o ${domain}!" }
                }
            }

            async get${domain}() {
                try {
                    const response = await knex('${table}').select('*').where('deletado', false)
                    if(response.length > 0){
                        return { status: true, exit:true, data: response, msg: "${domain} encontrado com sucesso!" }
                    }else{
                        return { status: true, exit:false,  msg: "${domain} não encontrado!" }
                    }
                }catch (error) {
                        let lineError = '0';
                        let fileName = '0';
                        const stackFrames = ErrorStackParser.parse(error);
                        if (stackFrames.length > 0) {
                            lineError = stackFrames[0].lineNumber;
                            fileName = stackFrames[0].fileName;
                        }
                        const dataLog = {
                            err: error,
                            descricaoDoErro: 'Exeption estourada. Repositorio${domain} - get${domain}',
                            linhaDoErro: lineError,
                            nomeDoArquivo: fileName,
                            data_criacao: dateNow(),
                        }
                        logs.getInstance().fatal(dataLog, 'Erro no Repositorio${domain} - get${domain}')    
                        return { status: false, error: error, msg: "Não foi possivel buscar o ${domain}!" }
                    }

                }
            

            async get${domain}ById(data) {
                try {
                    const response = await knex('${table}').select('*').where('id', data.id).andWhere('deletado', false)
                    if(response.length > 0){
                        return { status: true, exit:true, data: response[0], msg: "${domain} encontrado com sucesso!" }
                    }else{
                        return { status: true, exit:false,  msg: "${domain} não encontrado!" }
                    }
                }catch (error) {
                    let lineError = '0';
                    let fileName = '0';
                    const stackFrames = ErrorStackParser.parse(error);
                    if (stackFrames.length > 0) {
                        lineError = stackFrames[0].lineNumber;
                        fileName = stackFrames[0].fileName;
                    }
                    const dataLog = {
                        data_recive: data,
                        err: error,
                        descricaoDoErro: 'Exeption estourada. Repositorio${domain} - get${domain}ById',
                        linhaDoErro: lineError,
                        nomeDoArquivo: fileName,
                        data_criacao: dateNow(),
                    }
                    logs.getInstance().fatal(dataLog, 'Erro no Repositorio${domain} - get${domain}ById')    
                    return { status: false, error: error, msg: "Não foi possivel buscar o ${domain}!" }
                }

            }

            async get${domain}ByQuery(data) {
                try {                   
                    const resp = await this.getByQuery(data)
                    if (!resp.status) return { status: true, data: [], msg: "Não foi possivel buscar o ${domain}!" } 
                    return { status: true, data: resp.data, msg: resp.msg }
                }catch (error) {
                    let lineError = '0';
                    let fileName = '0';
                    const stackFrames = ErrorStackParser.parse(error);
                    if (stackFrames.length > 0) {
                        lineError = stackFrames[0].lineNumber;
                        fileName = stackFrames[0].fileName;
                    }
                    Log({...data, error, descricaoDoErro: 'Exeption estourada. Repositorio${domain} - get${domain}ByLimit', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
                    return { status: false, error: error, msg: "Não foi possivel buscar o ${domain}!" }
                }

            }

            async get${domain}ByQueryIdHistorico(data, field, condition) {
                try {                   
                    const resp = await this.getByQueryTableUniqWhere(data, view_historico, field, condition)
                    if (!resp.status) return { status: true, data: [], msg: "Não foi possivel buscar o ${domain}!" } 
                    return { status: true, data: resp.data, msg: resp.msg }
                }catch (error) {
                    let lineError = '0';
                    let fileName = '0';
                    const stackFrames = ErrorStackParser.parse(error);
                    if (stackFrames.length > 0) {
                        lineError = stackFrames[0].lineNumber;
                        fileName = stackFrames[0].fileName;
                    }
                    Log({...data, error, descricaoDoErro: 'Exeption estourada. Repositorio${domain} - get${domain}ByLimit', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
                    return { status: false, error: error, msg: "Não foi possivel buscar o ${domain}!" }
                }

            }
            

        }

        module.exports = new ${domain}Repository();    
    
    `

        fs.writeFileSync(`../infrastructure/db/services/${domain}Repository.js`, contentFile, (err) => {
            if (err) throw err;
            if (!err) console.log(`${domain}Repository.js criado e salvo!`);
        });
    } else {
        console.log('Faltam parametros para gerar o arquivo de repositorio')
        return
    }

}

module.exports = generateRepositoryFile;