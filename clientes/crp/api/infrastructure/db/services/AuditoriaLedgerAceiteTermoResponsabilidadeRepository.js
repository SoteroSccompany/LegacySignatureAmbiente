   
        require('dotenv/config');
        const knex = require("../config/databaseConection")();
        const moment = require('moment');
        const Log = require('../../../@core/usecase/Logs/databaseLog');
        const ErrorStackParser = require('error-stack-parser');
        const dateNow = require('../../gateways/functions/data/getToday');
        const BaseRepository = require('.');
        const { views } = require('../../../certs');
        const logs = require('../../../Logs');

        class AuditoriaLedgerAceiteTermoResponsabilidadeRepository extends BaseRepository {

            constructor() {
                super({ tableName: 'tab_auditoria_ledger_aceite_termo_responsabilidade', knexOrTransaction: knex })
            }

            async createAuditoriaLedgerAceiteTermoResponsabilidade(data) {
                try {
                    const response = await knex('tab_auditoria_ledger_aceite_termo_responsabilidade').insert(data)
                    return { status: true, data: response, msg: "AuditoriaLedgerAceiteTermoResponsabilidade criado com sucesso!" }
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
                        descricaoDoErro: 'Exeption estourada. RepositorioAuditoriaLedgerAceiteTermoResponsabilidade - createAuditoriaLedgerAceiteTermoResponsabilidade',
                        linhaDoErro: lineError,
                        nomeDoArquivo: fileName,
                        data_criacao: dateNow(),
                    }
                    logs.getInstance().fatal(dataLog, 'Erro no RepositorioAuditoriaLedgerAceiteTermoResponsabilidade - createAuditoriaLedgerAceiteTermoResponsabilidade')
                    return { status: false, error: error, msg: "Não foi possivel criar o AuditoriaLedgerAceiteTermoResponsabilidade!" }
                }
            }

            async updateAuditoriaLedgerAceiteTermoResponsabilidade(data) {
                try {
                    const check = await this.getAuditoriaLedgerAceiteTermoResponsabilidadeById(data)
                    if (check.status && check.exit) {
                    const response = await knex('tab_auditoria_ledger_aceite_termo_responsabilidade').update(data).where('id', data.id)
                        return { status: true, data: response, msg: "AuditoriaLedgerAceiteTermoResponsabilidade atualizado com sucesso!" }
                    }else{
                        return { status: false,  msg: "AuditoriaLedgerAceiteTermoResponsabilidade não encontrado!" }
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
                        descricaoDoErro: 'Exeption estourada. RepositorioAuditoriaLedgerAceiteTermoResponsabilidade - updateAuditoriaLedgerAceiteTermoResponsabilidade',
                        linhaDoErro: lineError,
                        nomeDoArquivo: fileName,
                        data_criacao: dateNow(),
                    }
                    logs.getInstance().fatal(dataLog, 'Erro no RepositorioAuditoriaLedgerAceiteTermoResponsabilidade - updateAuditoriaLedgerAceiteTermoResponsabilidade')    
                    return { status: false, error: error, msg: "Não foi possivel atualizar o AuditoriaLedgerAceiteTermoResponsabilidade!" }
                }
            }

            async deleteAuditoriaLedgerAceiteTermoResponsabilidade(data) {
                try {
                    const check = await this.getAuditoriaLedgerAceiteTermoResponsabilidadeById(data)
                    if (check.status && check.exit) {
                        const response = await knex('tab_auditoria_ledger_aceite_termo_responsabilidade').update({ deletado: true, data_atualizacao: dateNow() }).where('id', data.id)
                        return { status: true, data: response, msg: "AuditoriaLedgerAceiteTermoResponsabilidade deletado com sucesso!" }
                    }else{
                        return { status: false, msg: "AuditoriaLedgerAceiteTermoResponsabilidade não encontrado!" }
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
                        descricaoDoErro: 'Exeption estourada. RepositorioAuditoriaLedgerAceiteTermoResponsabilidade - deleteAuditoriaLedgerAceiteTermoResponsabilidade',
                        linhaDoErro: lineError,
                        nomeDoArquivo: fileName,
                        data_criacao: dateNow(),
                    }
                    logs.getInstance().fatal(dataLog, 'Erro no RepositorioAuditoriaLedgerAceiteTermoResponsabilidade - deleteAuditoriaLedgerAceiteTermoResponsabilidade')
                    return { status: false, error: error, msg: "Não foi possivel deletar o AuditoriaLedgerAceiteTermoResponsabilidade!" }
                }
            }

            async getAuditoriaLedgerAceiteTermoResponsabilidade() {
                try {
                    const response = await knex('tab_auditoria_ledger_aceite_termo_responsabilidade').select('*').where('deletado', false)
                    if(response.length > 0){
                        return { status: true, exit:true, data: response, msg: "AuditoriaLedgerAceiteTermoResponsabilidade encontrado com sucesso!" }
                    }else{
                        return { status: true, exit:false,  msg: "AuditoriaLedgerAceiteTermoResponsabilidade não encontrado!" }
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
                            descricaoDoErro: 'Exeption estourada. RepositorioAuditoriaLedgerAceiteTermoResponsabilidade - getAuditoriaLedgerAceiteTermoResponsabilidade',
                            linhaDoErro: lineError,
                            nomeDoArquivo: fileName,
                            data_criacao: dateNow(),
                        }
                        logs.getInstance().fatal(dataLog, 'Erro no RepositorioAuditoriaLedgerAceiteTermoResponsabilidade - getAuditoriaLedgerAceiteTermoResponsabilidade')    
                        return { status: false, error: error, msg: "Não foi possivel buscar o AuditoriaLedgerAceiteTermoResponsabilidade!" }
                    }

                }
            

            async getAuditoriaLedgerAceiteTermoResponsabilidadeById(data) {
                try {
                    const response = await knex('tab_auditoria_ledger_aceite_termo_responsabilidade').select('*').where('id', data.id).andWhere('deletado', false)
                    if(response.length > 0){
                        return { status: true, exit:true, data: response[0], msg: "AuditoriaLedgerAceiteTermoResponsabilidade encontrado com sucesso!" }
                    }else{
                        return { status: true, exit:false,  msg: "AuditoriaLedgerAceiteTermoResponsabilidade não encontrado!" }
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
                        descricaoDoErro: 'Exeption estourada. RepositorioAuditoriaLedgerAceiteTermoResponsabilidade - getAuditoriaLedgerAceiteTermoResponsabilidadeById',
                        linhaDoErro: lineError,
                        nomeDoArquivo: fileName,
                        data_criacao: dateNow(),
                    }
                    logs.getInstance().fatal(dataLog, 'Erro no RepositorioAuditoriaLedgerAceiteTermoResponsabilidade - getAuditoriaLedgerAceiteTermoResponsabilidadeById')    
                    return { status: false, error: error, msg: "Não foi possivel buscar o AuditoriaLedgerAceiteTermoResponsabilidade!" }
                }

            }

            async getAuditoriaLedgerAceiteTermoResponsabilidadeByQuery(data) {
                try {                   
                    const resp = await this.getByQuery(data)
                    if (!resp.status) return { status: true, data: [], msg: "Não foi possivel buscar o AuditoriaLedgerAceiteTermoResponsabilidade!" } 
                    return { status: true, data: resp.data, msg: resp.msg }
                }catch (error) {
                    let lineError = '0';
                    let fileName = '0';
                    const stackFrames = ErrorStackParser.parse(error);
                    if (stackFrames.length > 0) {
                        lineError = stackFrames[0].lineNumber;
                        fileName = stackFrames[0].fileName;
                    }
                    Log({...data, error, descricaoDoErro: 'Exeption estourada. RepositorioAuditoriaLedgerAceiteTermoResponsabilidade - getAuditoriaLedgerAceiteTermoResponsabilidadeByLimit', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
                    return { status: false, error: error, msg: "Não foi possivel buscar o AuditoriaLedgerAceiteTermoResponsabilidade!" }
                }

            }

            async getAuditoriaLedgerAceiteTermoResponsabilidadeByQueryIdHistorico(data, field, condition) {
                try {                   
                    const resp = await this.getByQueryTableUniqWhere(data, view_historico, field, condition)
                    if (!resp.status) return { status: true, data: [], msg: "Não foi possivel buscar o AuditoriaLedgerAceiteTermoResponsabilidade!" } 
                    return { status: true, data: resp.data, msg: resp.msg }
                }catch (error) {
                    let lineError = '0';
                    let fileName = '0';
                    const stackFrames = ErrorStackParser.parse(error);
                    if (stackFrames.length > 0) {
                        lineError = stackFrames[0].lineNumber;
                        fileName = stackFrames[0].fileName;
                    }
                    Log({...data, error, descricaoDoErro: 'Exeption estourada. RepositorioAuditoriaLedgerAceiteTermoResponsabilidade - getAuditoriaLedgerAceiteTermoResponsabilidadeByLimit', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
                    return { status: false, error: error, msg: "Não foi possivel buscar o AuditoriaLedgerAceiteTermoResponsabilidade!" }
                }

            }
            

        }

        module.exports = new AuditoriaLedgerAceiteTermoResponsabilidadeRepository();    
    
    
