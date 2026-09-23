   
        require('dotenv/config');
        const knex = require("../config/databaseConection")();
        const moment = require('moment');
        const Log = require('../../../@core/usecase/Logs/databaseLog');
        const ErrorStackParser = require('error-stack-parser');
        const dateNow = require('../../gateways/functions/data/getToday');
        const BaseRepository = require('.');
        const { views } = require('../../../certs');
        const logs = require('../../../Logs');

        class AuditoriaLedgerTermoResponsabilidadeRepository extends BaseRepository {

            constructor() {
                super({ tableName: 'tab_auditoria_ledger_termo_responsabilidade', knexOrTransaction: knex })
            }

            async createAuditoriaLedgerTermoResponsabilidade(data) {
                try {
                    const response = await knex('tab_auditoria_ledger_termo_responsabilidade').insert(data)
                    return { status: true, data: response, msg: "AuditoriaLedgerTermoResponsabilidade criado com sucesso!" }
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
                        descricaoDoErro: 'Exeption estourada. RepositorioAuditoriaLedgerTermoResponsabilidade - createAuditoriaLedgerTermoResponsabilidade',
                        linhaDoErro: lineError,
                        nomeDoArquivo: fileName,
                        data_criacao: dateNow(),
                    }
                    logs.getInstance().fatal(dataLog, 'Erro no RepositorioAuditoriaLedgerTermoResponsabilidade - createAuditoriaLedgerTermoResponsabilidade')
                    return { status: false, error: error, msg: "Não foi possivel criar o AuditoriaLedgerTermoResponsabilidade!" }
                }
            }

            async updateAuditoriaLedgerTermoResponsabilidade(data) {
                try {
                    const check = await this.getAuditoriaLedgerTermoResponsabilidadeById(data)
                    if (check.status && check.exit) {
                    const response = await knex('tab_auditoria_ledger_termo_responsabilidade').update(data).where('id', data.id)
                        return { status: true, data: response, msg: "AuditoriaLedgerTermoResponsabilidade atualizado com sucesso!" }
                    }else{
                        return { status: false,  msg: "AuditoriaLedgerTermoResponsabilidade não encontrado!" }
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
                        descricaoDoErro: 'Exeption estourada. RepositorioAuditoriaLedgerTermoResponsabilidade - updateAuditoriaLedgerTermoResponsabilidade',
                        linhaDoErro: lineError,
                        nomeDoArquivo: fileName,
                        data_criacao: dateNow(),
                    }
                    logs.getInstance().fatal(dataLog, 'Erro no RepositorioAuditoriaLedgerTermoResponsabilidade - updateAuditoriaLedgerTermoResponsabilidade')    
                    return { status: false, error: error, msg: "Não foi possivel atualizar o AuditoriaLedgerTermoResponsabilidade!" }
                }
            }

            async deleteAuditoriaLedgerTermoResponsabilidade(data) {
                try {
                    const check = await this.getAuditoriaLedgerTermoResponsabilidadeById(data)
                    if (check.status && check.exit) {
                        const response = await knex('tab_auditoria_ledger_termo_responsabilidade').update({ deletado: true, data_atualizacao: dateNow() }).where('id', data.id)
                        return { status: true, data: response, msg: "AuditoriaLedgerTermoResponsabilidade deletado com sucesso!" }
                    }else{
                        return { status: false, msg: "AuditoriaLedgerTermoResponsabilidade não encontrado!" }
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
                        descricaoDoErro: 'Exeption estourada. RepositorioAuditoriaLedgerTermoResponsabilidade - deleteAuditoriaLedgerTermoResponsabilidade',
                        linhaDoErro: lineError,
                        nomeDoArquivo: fileName,
                        data_criacao: dateNow(),
                    }
                    logs.getInstance().fatal(dataLog, 'Erro no RepositorioAuditoriaLedgerTermoResponsabilidade - deleteAuditoriaLedgerTermoResponsabilidade')
                    return { status: false, error: error, msg: "Não foi possivel deletar o AuditoriaLedgerTermoResponsabilidade!" }
                }
            }

            async getAuditoriaLedgerTermoResponsabilidade() {
                try {
                    const response = await knex('tab_auditoria_ledger_termo_responsabilidade').select('*').where('deletado', false)
                    if(response.length > 0){
                        return { status: true, exit:true, data: response, msg: "AuditoriaLedgerTermoResponsabilidade encontrado com sucesso!" }
                    }else{
                        return { status: true, exit:false,  msg: "AuditoriaLedgerTermoResponsabilidade não encontrado!" }
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
                            descricaoDoErro: 'Exeption estourada. RepositorioAuditoriaLedgerTermoResponsabilidade - getAuditoriaLedgerTermoResponsabilidade',
                            linhaDoErro: lineError,
                            nomeDoArquivo: fileName,
                            data_criacao: dateNow(),
                        }
                        logs.getInstance().fatal(dataLog, 'Erro no RepositorioAuditoriaLedgerTermoResponsabilidade - getAuditoriaLedgerTermoResponsabilidade')    
                        return { status: false, error: error, msg: "Não foi possivel buscar o AuditoriaLedgerTermoResponsabilidade!" }
                    }

                }
            

            async getAuditoriaLedgerTermoResponsabilidadeById(data) {
                try {
                    const response = await knex('tab_auditoria_ledger_termo_responsabilidade').select('*').where('id', data.id).andWhere('deletado', false)
                    if(response.length > 0){
                        return { status: true, exit:true, data: response[0], msg: "AuditoriaLedgerTermoResponsabilidade encontrado com sucesso!" }
                    }else{
                        return { status: true, exit:false,  msg: "AuditoriaLedgerTermoResponsabilidade não encontrado!" }
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
                        descricaoDoErro: 'Exeption estourada. RepositorioAuditoriaLedgerTermoResponsabilidade - getAuditoriaLedgerTermoResponsabilidadeById',
                        linhaDoErro: lineError,
                        nomeDoArquivo: fileName,
                        data_criacao: dateNow(),
                    }
                    logs.getInstance().fatal(dataLog, 'Erro no RepositorioAuditoriaLedgerTermoResponsabilidade - getAuditoriaLedgerTermoResponsabilidadeById')    
                    return { status: false, error: error, msg: "Não foi possivel buscar o AuditoriaLedgerTermoResponsabilidade!" }
                }

            }

            async getAuditoriaLedgerTermoResponsabilidadeByQuery(data) {
                try {                   
                    const resp = await this.getByQuery(data)
                    if (!resp.status) return { status: true, data: [], msg: "Não foi possivel buscar o AuditoriaLedgerTermoResponsabilidade!" } 
                    return { status: true, data: resp.data, msg: resp.msg }
                }catch (error) {
                    let lineError = '0';
                    let fileName = '0';
                    const stackFrames = ErrorStackParser.parse(error);
                    if (stackFrames.length > 0) {
                        lineError = stackFrames[0].lineNumber;
                        fileName = stackFrames[0].fileName;
                    }
                    Log({...data, error, descricaoDoErro: 'Exeption estourada. RepositorioAuditoriaLedgerTermoResponsabilidade - getAuditoriaLedgerTermoResponsabilidadeByLimit', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
                    return { status: false, error: error, msg: "Não foi possivel buscar o AuditoriaLedgerTermoResponsabilidade!" }
                }

            }

            async getAuditoriaLedgerTermoResponsabilidadeByQueryIdHistorico(data, field, condition) {
                try {                   
                    const resp = await this.getByQueryTableUniqWhere(data, view_historico, field, condition)
                    if (!resp.status) return { status: true, data: [], msg: "Não foi possivel buscar o AuditoriaLedgerTermoResponsabilidade!" } 
                    return { status: true, data: resp.data, msg: resp.msg }
                }catch (error) {
                    let lineError = '0';
                    let fileName = '0';
                    const stackFrames = ErrorStackParser.parse(error);
                    if (stackFrames.length > 0) {
                        lineError = stackFrames[0].lineNumber;
                        fileName = stackFrames[0].fileName;
                    }
                    Log({...data, error, descricaoDoErro: 'Exeption estourada. RepositorioAuditoriaLedgerTermoResponsabilidade - getAuditoriaLedgerTermoResponsabilidadeByLimit', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
                    return { status: false, error: error, msg: "Não foi possivel buscar o AuditoriaLedgerTermoResponsabilidade!" }
                }

            }
            

        }

        module.exports = new AuditoriaLedgerTermoResponsabilidadeRepository();    
    
    