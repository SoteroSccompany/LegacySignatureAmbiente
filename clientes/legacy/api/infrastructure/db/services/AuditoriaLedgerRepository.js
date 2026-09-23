   
        require('dotenv/config');
        const knex = require("../config/databaseConection")();
        const moment = require('moment');
        const Log = require('../../../@core/usecase/Logs/databaseLog');
        const ErrorStackParser = require('error-stack-parser');
        const dateNow = require('../../gateways/functions/data/getToday');
        const BaseRepository = require('.');
        const { views } = require('../../../certs');
        const logs = require('../../../Logs');

        class AuditoriaLedgerRepository extends BaseRepository {

            constructor() {
                super({ tableName: 'tab_auditoria_ledger', knexOrTransaction: knex })
            }

            async createAuditoriaLedger(data) {
                try {
                    const response = await knex('tab_auditoria_ledger').insert(data)
                    return { status: true, data: response, msg: "AuditoriaLedger criado com sucesso!" }
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
                        descricaoDoErro: 'Exeption estourada. RepositorioAuditoriaLedger - createAuditoriaLedger',
                        linhaDoErro: lineError,
                        nomeDoArquivo: fileName,
                        data_criacao: dateNow(),
                    }
                    logs.getInstance().fatal(dataLog, 'Erro no RepositorioAuditoriaLedger - createAuditoriaLedger')
                    return { status: false, error: error, msg: "Não foi possivel criar o AuditoriaLedger!" }
                }
            }

            async updateAuditoriaLedger(data) {
                try {
                    const check = await this.getAuditoriaLedgerById(data)
                    if (check.status && check.exit) {
                    const response = await knex('tab_auditoria_ledger').update(data).where('id', data.id)
                        return { status: true, data: response, msg: "AuditoriaLedger atualizado com sucesso!" }
                    }else{
                        return { status: false,  msg: "AuditoriaLedger não encontrado!" }
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
                        descricaoDoErro: 'Exeption estourada. RepositorioAuditoriaLedger - updateAuditoriaLedger',
                        linhaDoErro: lineError,
                        nomeDoArquivo: fileName,
                        data_criacao: dateNow(),
                    }
                    logs.getInstance().fatal(dataLog, 'Erro no RepositorioAuditoriaLedger - updateAuditoriaLedger')    
                    return { status: false, error: error, msg: "Não foi possivel atualizar o AuditoriaLedger!" }
                }
            }

            async deleteAuditoriaLedger(data) {
                try {
                    const check = await this.getAuditoriaLedgerById(data)
                    if (check.status && check.exit) {
                        const response = await knex('tab_auditoria_ledger').update({ deletado: true, data_atualizacao: dateNow() }).where('id', data.id)
                        return { status: true, data: response, msg: "AuditoriaLedger deletado com sucesso!" }
                    }else{
                        return { status: false, msg: "AuditoriaLedger não encontrado!" }
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
                        descricaoDoErro: 'Exeption estourada. RepositorioAuditoriaLedger - deleteAuditoriaLedger',
                        linhaDoErro: lineError,
                        nomeDoArquivo: fileName,
                        data_criacao: dateNow(),
                    }
                    logs.getInstance().fatal(dataLog, 'Erro no RepositorioAuditoriaLedger - deleteAuditoriaLedger')
                    return { status: false, error: error, msg: "Não foi possivel deletar o AuditoriaLedger!" }
                }
            }

            async getAuditoriaLedger() {
                try {
                    const response = await knex('tab_auditoria_ledger').select('*').where('deletado', false)
                    if(response.length > 0){
                        return { status: true, exit:true, data: response, msg: "AuditoriaLedger encontrado com sucesso!" }
                    }else{
                        return { status: true, exit:false,  msg: "AuditoriaLedger não encontrado!" }
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
                            descricaoDoErro: 'Exeption estourada. RepositorioAuditoriaLedger - getAuditoriaLedger',
                            linhaDoErro: lineError,
                            nomeDoArquivo: fileName,
                            data_criacao: dateNow(),
                        }
                        logs.getInstance().fatal(dataLog, 'Erro no RepositorioAuditoriaLedger - getAuditoriaLedger')    
                        return { status: false, error: error, msg: "Não foi possivel buscar o AuditoriaLedger!" }
                    }

                }
            

            async getAuditoriaLedgerById(data) {
                try {
                    const response = await knex('tab_auditoria_ledger').select('*').where('id', data.id).andWhere('deletado', false)
                    if(response.length > 0){
                        return { status: true, exit:true, data: response[0], msg: "AuditoriaLedger encontrado com sucesso!" }
                    }else{
                        return { status: true, exit:false,  msg: "AuditoriaLedger não encontrado!" }
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
                        descricaoDoErro: 'Exeption estourada. RepositorioAuditoriaLedger - getAuditoriaLedgerById',
                        linhaDoErro: lineError,
                        nomeDoArquivo: fileName,
                        data_criacao: dateNow(),
                    }
                    logs.getInstance().fatal(dataLog, 'Erro no RepositorioAuditoriaLedger - getAuditoriaLedgerById')    
                    return { status: false, error: error, msg: "Não foi possivel buscar o AuditoriaLedger!" }
                }

            }

            async getAuditoriaLedgerByQuery(data) {
                try {                   
                    const resp = await this.getByQuery(data)
                    if (!resp.status) return { status: true, data: [], msg: "Não foi possivel buscar o AuditoriaLedger!" } 
                    return { status: true, data: resp.data, msg: resp.msg }
                }catch (error) {
                    let lineError = '0';
                    let fileName = '0';
                    const stackFrames = ErrorStackParser.parse(error);
                    if (stackFrames.length > 0) {
                        lineError = stackFrames[0].lineNumber;
                        fileName = stackFrames[0].fileName;
                    }
                    Log({...data, error, descricaoDoErro: 'Exeption estourada. RepositorioAuditoriaLedger - getAuditoriaLedgerByLimit', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
                    return { status: false, error: error, msg: "Não foi possivel buscar o AuditoriaLedger!" }
                }

            }

            async getAuditoriaLedgerByQueryIdHistorico(data, field, condition) {
                try {                   
                    const resp = await this.getByQueryTableUniqWhere(data, view_historico, field, condition)
                    if (!resp.status) return { status: true, data: [], msg: "Não foi possivel buscar o AuditoriaLedger!" } 
                    return { status: true, data: resp.data, msg: resp.msg }
                }catch (error) {
                    let lineError = '0';
                    let fileName = '0';
                    const stackFrames = ErrorStackParser.parse(error);
                    if (stackFrames.length > 0) {
                        lineError = stackFrames[0].lineNumber;
                        fileName = stackFrames[0].fileName;
                    }
                    Log({...data, error, descricaoDoErro: 'Exeption estourada. RepositorioAuditoriaLedger - getAuditoriaLedgerByLimit', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
                    return { status: false, error: error, msg: "Não foi possivel buscar o AuditoriaLedger!" }
                }

            }
            

        }

        module.exports = new AuditoriaLedgerRepository();    
    
    