   
        require('dotenv/config');
        const knex = require("../config/databaseConection")();
        const moment = require('moment');
        const Log = require('../../../@core/usecase/Logs/databaseLog');
        const ErrorStackParser = require('error-stack-parser');
        const dateNow = require('../../gateways/functions/data/getToday');
        const BaseRepository = require('.');
        const { views } = require('../../../certs');
        const logs = require('../../../Logs');

        class AuditoriaLedgerPerfilBiometriaRepository extends BaseRepository {

            constructor() {
                super({ tableName: 'tab_auditoria_ledger_perfil_biometria', knexOrTransaction: knex })
            }

            async createAuditoriaLedgerPerfilBiometria(data) {
                try {
                    const response = await knex('tab_auditoria_ledger_perfil_biometria').insert(data)
                    return { status: true, data: response, msg: "AuditoriaLedgerPerfilBiometria criado com sucesso!" }
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
                        descricaoDoErro: 'Exeption estourada. RepositorioAuditoriaLedgerPerfilBiometria - createAuditoriaLedgerPerfilBiometria',
                        linhaDoErro: lineError,
                        nomeDoArquivo: fileName,
                        data_criacao: dateNow(),
                    }
                    logs.getInstance().fatal(dataLog, 'Erro no RepositorioAuditoriaLedgerPerfilBiometria - createAuditoriaLedgerPerfilBiometria')
                    return { status: false, error: error, msg: "Não foi possivel criar o AuditoriaLedgerPerfilBiometria!" }
                }
            }

            async updateAuditoriaLedgerPerfilBiometria(data) {
                try {
                    const check = await this.getAuditoriaLedgerPerfilBiometriaById(data)
                    if (check.status && check.exit) {
                    const response = await knex('tab_auditoria_ledger_perfil_biometria').update(data).where('id', data.id)
                        return { status: true, data: response, msg: "AuditoriaLedgerPerfilBiometria atualizado com sucesso!" }
                    }else{
                        return { status: false,  msg: "AuditoriaLedgerPerfilBiometria não encontrado!" }
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
                        descricaoDoErro: 'Exeption estourada. RepositorioAuditoriaLedgerPerfilBiometria - updateAuditoriaLedgerPerfilBiometria',
                        linhaDoErro: lineError,
                        nomeDoArquivo: fileName,
                        data_criacao: dateNow(),
                    }
                    logs.getInstance().fatal(dataLog, 'Erro no RepositorioAuditoriaLedgerPerfilBiometria - updateAuditoriaLedgerPerfilBiometria')    
                    return { status: false, error: error, msg: "Não foi possivel atualizar o AuditoriaLedgerPerfilBiometria!" }
                }
            }

            async deleteAuditoriaLedgerPerfilBiometria(data) {
                try {
                    const check = await this.getAuditoriaLedgerPerfilBiometriaById(data)
                    if (check.status && check.exit) {
                        const response = await knex('tab_auditoria_ledger_perfil_biometria').update({ deletado: true, data_atualizacao: dateNow() }).where('id', data.id)
                        return { status: true, data: response, msg: "AuditoriaLedgerPerfilBiometria deletado com sucesso!" }
                    }else{
                        return { status: false, msg: "AuditoriaLedgerPerfilBiometria não encontrado!" }
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
                        descricaoDoErro: 'Exeption estourada. RepositorioAuditoriaLedgerPerfilBiometria - deleteAuditoriaLedgerPerfilBiometria',
                        linhaDoErro: lineError,
                        nomeDoArquivo: fileName,
                        data_criacao: dateNow(),
                    }
                    logs.getInstance().fatal(dataLog, 'Erro no RepositorioAuditoriaLedgerPerfilBiometria - deleteAuditoriaLedgerPerfilBiometria')
                    return { status: false, error: error, msg: "Não foi possivel deletar o AuditoriaLedgerPerfilBiometria!" }
                }
            }

            async getAuditoriaLedgerPerfilBiometria() {
                try {
                    const response = await knex('tab_auditoria_ledger_perfil_biometria').select('*').where('deletado', false)
                    if(response.length > 0){
                        return { status: true, exit:true, data: response, msg: "AuditoriaLedgerPerfilBiometria encontrado com sucesso!" }
                    }else{
                        return { status: true, exit:false,  msg: "AuditoriaLedgerPerfilBiometria não encontrado!" }
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
                            descricaoDoErro: 'Exeption estourada. RepositorioAuditoriaLedgerPerfilBiometria - getAuditoriaLedgerPerfilBiometria',
                            linhaDoErro: lineError,
                            nomeDoArquivo: fileName,
                            data_criacao: dateNow(),
                        }
                        logs.getInstance().fatal(dataLog, 'Erro no RepositorioAuditoriaLedgerPerfilBiometria - getAuditoriaLedgerPerfilBiometria')    
                        return { status: false, error: error, msg: "Não foi possivel buscar o AuditoriaLedgerPerfilBiometria!" }
                    }

                }
            

            async getAuditoriaLedgerPerfilBiometriaById(data) {
                try {
                    const response = await knex('tab_auditoria_ledger_perfil_biometria').select('*').where('id', data.id).andWhere('deletado', false)
                    if(response.length > 0){
                        return { status: true, exit:true, data: response[0], msg: "AuditoriaLedgerPerfilBiometria encontrado com sucesso!" }
                    }else{
                        return { status: true, exit:false,  msg: "AuditoriaLedgerPerfilBiometria não encontrado!" }
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
                        descricaoDoErro: 'Exeption estourada. RepositorioAuditoriaLedgerPerfilBiometria - getAuditoriaLedgerPerfilBiometriaById',
                        linhaDoErro: lineError,
                        nomeDoArquivo: fileName,
                        data_criacao: dateNow(),
                    }
                    logs.getInstance().fatal(dataLog, 'Erro no RepositorioAuditoriaLedgerPerfilBiometria - getAuditoriaLedgerPerfilBiometriaById')    
                    return { status: false, error: error, msg: "Não foi possivel buscar o AuditoriaLedgerPerfilBiometria!" }
                }

            }

            async getAuditoriaLedgerPerfilBiometriaByQuery(data) {
                try {                   
                    const resp = await this.getByQuery(data)
                    if (!resp.status) return { status: true, data: [], msg: "Não foi possivel buscar o AuditoriaLedgerPerfilBiometria!" } 
                    return { status: true, data: resp.data, msg: resp.msg }
                }catch (error) {
                    let lineError = '0';
                    let fileName = '0';
                    const stackFrames = ErrorStackParser.parse(error);
                    if (stackFrames.length > 0) {
                        lineError = stackFrames[0].lineNumber;
                        fileName = stackFrames[0].fileName;
                    }
                    Log({...data, error, descricaoDoErro: 'Exeption estourada. RepositorioAuditoriaLedgerPerfilBiometria - getAuditoriaLedgerPerfilBiometriaByLimit', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
                    return { status: false, error: error, msg: "Não foi possivel buscar o AuditoriaLedgerPerfilBiometria!" }
                }

            }

            async getAuditoriaLedgerPerfilBiometriaByQueryIdHistorico(data, field, condition) {
                try {                   
                    const resp = await this.getByQueryTableUniqWhere(data, view_historico, field, condition)
                    if (!resp.status) return { status: true, data: [], msg: "Não foi possivel buscar o AuditoriaLedgerPerfilBiometria!" } 
                    return { status: true, data: resp.data, msg: resp.msg }
                }catch (error) {
                    let lineError = '0';
                    let fileName = '0';
                    const stackFrames = ErrorStackParser.parse(error);
                    if (stackFrames.length > 0) {
                        lineError = stackFrames[0].lineNumber;
                        fileName = stackFrames[0].fileName;
                    }
                    Log({...data, error, descricaoDoErro: 'Exeption estourada. RepositorioAuditoriaLedgerPerfilBiometria - getAuditoriaLedgerPerfilBiometriaByLimit', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
                    return { status: false, error: error, msg: "Não foi possivel buscar o AuditoriaLedgerPerfilBiometria!" }
                }

            }
            

        }

        module.exports = new AuditoriaLedgerPerfilBiometriaRepository();    
    
    
