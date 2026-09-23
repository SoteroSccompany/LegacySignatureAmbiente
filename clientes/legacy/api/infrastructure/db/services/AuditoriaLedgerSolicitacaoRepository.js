   
        require('dotenv/config');
        const knex = require("../config/databaseConection")();
        const moment = require('moment');
        const Log = require('../../../@core/usecase/Logs/databaseLog');
        const ErrorStackParser = require('error-stack-parser');
        const dateNow = require('../../gateways/functions/data/getToday');
        const BaseRepository = require('.');
        const { views } = require('../../../certs');
        const logs = require('../../../Logs');

        class AuditoriaLedgerSolicitacaoRepository extends BaseRepository {

            constructor() {
                super({ tableName: 'tab_auditoria_ledger_solicitacao', knexOrTransaction: knex })
            }

            async createAuditoriaLedgerSolicitacao(data) {
                try {
                    const response = await knex('tab_auditoria_ledger_solicitacao').insert(data)
                    return { status: true, data: response, msg: "AuditoriaLedgerSolicitacao criado com sucesso!" }
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
                        descricaoDoErro: 'Exeption estourada. RepositorioAuditoriaLedgerSolicitacao - createAuditoriaLedgerSolicitacao',
                        linhaDoErro: lineError,
                        nomeDoArquivo: fileName,
                        data_criacao: dateNow(),
                    }
                    logs.getInstance().fatal(dataLog, 'Erro no RepositorioAuditoriaLedgerSolicitacao - createAuditoriaLedgerSolicitacao')
                    return { status: false, error: error, msg: "Não foi possivel criar o AuditoriaLedgerSolicitacao!" }
                }
            }

            async updateAuditoriaLedgerSolicitacao(data) {
                try {
                    const check = await this.getAuditoriaLedgerSolicitacaoById(data)
                    if (check.status && check.exit) {
                    const response = await knex('tab_auditoria_ledger_solicitacao').update(data).where('id', data.id)
                        return { status: true, data: response, msg: "AuditoriaLedgerSolicitacao atualizado com sucesso!" }
                    }else{
                        return { status: false,  msg: "AuditoriaLedgerSolicitacao não encontrado!" }
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
                        descricaoDoErro: 'Exeption estourada. RepositorioAuditoriaLedgerSolicitacao - updateAuditoriaLedgerSolicitacao',
                        linhaDoErro: lineError,
                        nomeDoArquivo: fileName,
                        data_criacao: dateNow(),
                    }
                    logs.getInstance().fatal(dataLog, 'Erro no RepositorioAuditoriaLedgerSolicitacao - updateAuditoriaLedgerSolicitacao')    
                    return { status: false, error: error, msg: "Não foi possivel atualizar o AuditoriaLedgerSolicitacao!" }
                }
            }

            async deleteAuditoriaLedgerSolicitacao(data) {
                try {
                    const check = await this.getAuditoriaLedgerSolicitacaoById(data)
                    if (check.status && check.exit) {
                        const response = await knex('tab_auditoria_ledger_solicitacao').update({ deletado: true, data_atualizacao: dateNow() }).where('id', data.id)
                        return { status: true, data: response, msg: "AuditoriaLedgerSolicitacao deletado com sucesso!" }
                    }else{
                        return { status: false, msg: "AuditoriaLedgerSolicitacao não encontrado!" }
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
                        descricaoDoErro: 'Exeption estourada. RepositorioAuditoriaLedgerSolicitacao - deleteAuditoriaLedgerSolicitacao',
                        linhaDoErro: lineError,
                        nomeDoArquivo: fileName,
                        data_criacao: dateNow(),
                    }
                    logs.getInstance().fatal(dataLog, 'Erro no RepositorioAuditoriaLedgerSolicitacao - deleteAuditoriaLedgerSolicitacao')
                    return { status: false, error: error, msg: "Não foi possivel deletar o AuditoriaLedgerSolicitacao!" }
                }
            }

            async getAuditoriaLedgerSolicitacao() {
                try {
                    const response = await knex('tab_auditoria_ledger_solicitacao').select('*').where('deletado', false)
                    if(response.length > 0){
                        return { status: true, exit:true, data: response, msg: "AuditoriaLedgerSolicitacao encontrado com sucesso!" }
                    }else{
                        return { status: true, exit:false,  msg: "AuditoriaLedgerSolicitacao não encontrado!" }
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
                            descricaoDoErro: 'Exeption estourada. RepositorioAuditoriaLedgerSolicitacao - getAuditoriaLedgerSolicitacao',
                            linhaDoErro: lineError,
                            nomeDoArquivo: fileName,
                            data_criacao: dateNow(),
                        }
                        logs.getInstance().fatal(dataLog, 'Erro no RepositorioAuditoriaLedgerSolicitacao - getAuditoriaLedgerSolicitacao')    
                        return { status: false, error: error, msg: "Não foi possivel buscar o AuditoriaLedgerSolicitacao!" }
                    }

                }
            

            async getAuditoriaLedgerSolicitacaoById(data) {
                try {
                    const response = await knex('tab_auditoria_ledger_solicitacao').select('*').where('id', data.id).andWhere('deletado', false)
                    if(response.length > 0){
                        return { status: true, exit:true, data: response[0], msg: "AuditoriaLedgerSolicitacao encontrado com sucesso!" }
                    }else{
                        return { status: true, exit:false,  msg: "AuditoriaLedgerSolicitacao não encontrado!" }
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
                        descricaoDoErro: 'Exeption estourada. RepositorioAuditoriaLedgerSolicitacao - getAuditoriaLedgerSolicitacaoById',
                        linhaDoErro: lineError,
                        nomeDoArquivo: fileName,
                        data_criacao: dateNow(),
                    }
                    logs.getInstance().fatal(dataLog, 'Erro no RepositorioAuditoriaLedgerSolicitacao - getAuditoriaLedgerSolicitacaoById')    
                    return { status: false, error: error, msg: "Não foi possivel buscar o AuditoriaLedgerSolicitacao!" }
                }

            }

            async getAuditoriaLedgerSolicitacaoByQuery(data) {
                try {                   
                    const resp = await this.getByQuery(data)
                    if (!resp.status) return { status: true, data: [], msg: "Não foi possivel buscar o AuditoriaLedgerSolicitacao!" } 
                    return { status: true, data: resp.data, msg: resp.msg }
                }catch (error) {
                    let lineError = '0';
                    let fileName = '0';
                    const stackFrames = ErrorStackParser.parse(error);
                    if (stackFrames.length > 0) {
                        lineError = stackFrames[0].lineNumber;
                        fileName = stackFrames[0].fileName;
                    }
                    Log({...data, error, descricaoDoErro: 'Exeption estourada. RepositorioAuditoriaLedgerSolicitacao - getAuditoriaLedgerSolicitacaoByLimit', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
                    return { status: false, error: error, msg: "Não foi possivel buscar o AuditoriaLedgerSolicitacao!" }
                }

            }

            async getAuditoriaLedgerSolicitacaoByQueryIdHistorico(data, field, condition) {
                try {                   
                    const resp = await this.getByQueryTableUniqWhere(data, view_historico, field, condition)
                    if (!resp.status) return { status: true, data: [], msg: "Não foi possivel buscar o AuditoriaLedgerSolicitacao!" } 
                    return { status: true, data: resp.data, msg: resp.msg }
                }catch (error) {
                    let lineError = '0';
                    let fileName = '0';
                    const stackFrames = ErrorStackParser.parse(error);
                    if (stackFrames.length > 0) {
                        lineError = stackFrames[0].lineNumber;
                        fileName = stackFrames[0].fileName;
                    }
                    Log({...data, error, descricaoDoErro: 'Exeption estourada. RepositorioAuditoriaLedgerSolicitacao - getAuditoriaLedgerSolicitacaoByLimit', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
                    return { status: false, error: error, msg: "Não foi possivel buscar o AuditoriaLedgerSolicitacao!" }
                }

            }
            

        }

        module.exports = new AuditoriaLedgerSolicitacaoRepository();    
    
    