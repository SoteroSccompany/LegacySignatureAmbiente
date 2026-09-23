   
        require('dotenv/config');
        const knex = require("../config/databaseConection")();
        const moment = require('moment');
        const Log = require('../../../@core/usecase/Logs/databaseLog');
        const ErrorStackParser = require('error-stack-parser');
        const dateNow = require('../../gateways/functions/data/getToday');
        const BaseRepository = require('.');
        const { views } = require('../../../certs');
        const logs = require('../../../Logs');

        class IdentificacaoBiometricaRepository extends BaseRepository {

            constructor() {
                super({ tableName: 'tab_identificacao_biometrica', knexOrTransaction: knex })
            }

            async createIdentificacaoBiometrica(data) {
                try {
                    const response = await knex('tab_identificacao_biometrica').insert(data)
                    return { status: true, data: response, msg: "IdentificacaoBiometrica criado com sucesso!" }
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
                        descricaoDoErro: 'Exeption estourada. RepositorioIdentificacaoBiometrica - createIdentificacaoBiometrica',
                        linhaDoErro: lineError,
                        nomeDoArquivo: fileName,
                        data_criacao: dateNow(),
                    }
                    logs.getInstance().fatal(dataLog, 'Erro no RepositorioIdentificacaoBiometrica - createIdentificacaoBiometrica')
                    return { status: false, error: error, msg: "Não foi possivel criar o IdentificacaoBiometrica!" }
                }
            }

            async updateIdentificacaoBiometrica(data) {
                try {
                    const check = await this.getIdentificacaoBiometricaById(data)
                    if (check.status && check.exit) {
                    const response = await knex('tab_identificacao_biometrica').update(data).where('id', data.id)
                        return { status: true, data: response, msg: "IdentificacaoBiometrica atualizado com sucesso!" }
                    }else{
                        return { status: false,  msg: "IdentificacaoBiometrica não encontrado!" }
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
                        descricaoDoErro: 'Exeption estourada. RepositorioIdentificacaoBiometrica - updateIdentificacaoBiometrica',
                        linhaDoErro: lineError,
                        nomeDoArquivo: fileName,
                        data_criacao: dateNow(),
                    }
                    logs.getInstance().fatal(dataLog, 'Erro no RepositorioIdentificacaoBiometrica - updateIdentificacaoBiometrica')    
                    return { status: false, error: error, msg: "Não foi possivel atualizar o IdentificacaoBiometrica!" }
                }
            }

            async deleteIdentificacaoBiometrica(data) {
                try {
                    const check = await this.getIdentificacaoBiometricaById(data)
                    if (check.status && check.exit) {
                        const response = await knex('tab_identificacao_biometrica').update({ deletado: true, data_atualizacao: dateNow() }).where('id', data.id)
                        return { status: true, data: response, msg: "IdentificacaoBiometrica deletado com sucesso!" }
                    }else{
                        return { status: false, msg: "IdentificacaoBiometrica não encontrado!" }
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
                        descricaoDoErro: 'Exeption estourada. RepositorioIdentificacaoBiometrica - deleteIdentificacaoBiometrica',
                        linhaDoErro: lineError,
                        nomeDoArquivo: fileName,
                        data_criacao: dateNow(),
                    }
                    logs.getInstance().fatal(dataLog, 'Erro no RepositorioIdentificacaoBiometrica - deleteIdentificacaoBiometrica')
                    return { status: false, error: error, msg: "Não foi possivel deletar o IdentificacaoBiometrica!" }
                }
            }

            async getIdentificacaoBiometrica() {
                try {
                    const response = await knex('tab_identificacao_biometrica').select('*').where('deletado', false)
                    if(response.length > 0){
                        return { status: true, exit:true, data: response, msg: "IdentificacaoBiometrica encontrado com sucesso!" }
                    }else{
                        return { status: true, exit:false,  msg: "IdentificacaoBiometrica não encontrado!" }
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
                            descricaoDoErro: 'Exeption estourada. RepositorioIdentificacaoBiometrica - getIdentificacaoBiometrica',
                            linhaDoErro: lineError,
                            nomeDoArquivo: fileName,
                            data_criacao: dateNow(),
                        }
                        logs.getInstance().fatal(dataLog, 'Erro no RepositorioIdentificacaoBiometrica - getIdentificacaoBiometrica')    
                        return { status: false, error: error, msg: "Não foi possivel buscar o IdentificacaoBiometrica!" }
                    }

                }
            

            async getIdentificacaoBiometricaById(data) {
                try {
                    const response = await knex('tab_identificacao_biometrica').select('*').where('id', data.id).andWhere('deletado', false)
                    if(response.length > 0){
                        return { status: true, exit:true, data: response[0], msg: "IdentificacaoBiometrica encontrado com sucesso!" }
                    }else{
                        return { status: true, exit:false,  msg: "IdentificacaoBiometrica não encontrado!" }
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
                        descricaoDoErro: 'Exeption estourada. RepositorioIdentificacaoBiometrica - getIdentificacaoBiometricaById',
                        linhaDoErro: lineError,
                        nomeDoArquivo: fileName,
                        data_criacao: dateNow(),
                    }
                    logs.getInstance().fatal(dataLog, 'Erro no RepositorioIdentificacaoBiometrica - getIdentificacaoBiometricaById')    
                    return { status: false, error: error, msg: "Não foi possivel buscar o IdentificacaoBiometrica!" }
                }

            }

            async getIdentificacaoBiometricaByQuery(data) {
                try {                   
                    const resp = await this.getByQuery(data)
                    if (!resp.status) return { status: true, data: [], msg: "Não foi possivel buscar o IdentificacaoBiometrica!" } 
                    return { status: true, data: resp.data, msg: resp.msg }
                }catch (error) {
                    let lineError = '0';
                    let fileName = '0';
                    const stackFrames = ErrorStackParser.parse(error);
                    if (stackFrames.length > 0) {
                        lineError = stackFrames[0].lineNumber;
                        fileName = stackFrames[0].fileName;
                    }
                    Log({...data, error, descricaoDoErro: 'Exeption estourada. RepositorioIdentificacaoBiometrica - getIdentificacaoBiometricaByLimit', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
                    return { status: false, error: error, msg: "Não foi possivel buscar o IdentificacaoBiometrica!" }
                }

            }

            async getIdentificacaoBiometricaByQueryIdHistorico(data, field, condition) {
                try {                   
                    const resp = await this.getByQueryTableUniqWhere(data, view_historico, field, condition)
                    if (!resp.status) return { status: true, data: [], msg: "Não foi possivel buscar o IdentificacaoBiometrica!" } 
                    return { status: true, data: resp.data, msg: resp.msg }
                }catch (error) {
                    let lineError = '0';
                    let fileName = '0';
                    const stackFrames = ErrorStackParser.parse(error);
                    if (stackFrames.length > 0) {
                        lineError = stackFrames[0].lineNumber;
                        fileName = stackFrames[0].fileName;
                    }
                    Log({...data, error, descricaoDoErro: 'Exeption estourada. RepositorioIdentificacaoBiometrica - getIdentificacaoBiometricaByLimit', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
                    return { status: false, error: error, msg: "Não foi possivel buscar o IdentificacaoBiometrica!" }
                }

            }
            

        }

        module.exports = new IdentificacaoBiometricaRepository();    
    
    