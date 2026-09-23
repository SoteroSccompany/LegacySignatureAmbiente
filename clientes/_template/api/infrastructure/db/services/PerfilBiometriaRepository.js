
require('dotenv/config');
const knex = require("../config/databaseConection")();
const moment = require('moment');
const Log = require('../../../@core/usecase/Logs/databaseLog');
const ErrorStackParser = require('error-stack-parser');
const dateNow = require('../../gateways/functions/data/getToday');
const BaseRepository = require('.');
const { views, etapas_perfil_usuario } = require('../../../certs');
const logs = require('../../../Logs');

class PerfilBiometriaRepository extends BaseRepository {

    constructor() {
        super({ tableName: 'tab_perfil_biometria', knexOrTransaction: knex })
    }

    async createPerfilBiometria(data, trx) {
        try {
            await trx('tab_perfil_usuario').update({ ...data.perfil }).where('id', data.perfil.id)
            await trx('tab_desafio_autenticacao').update({ ...data.desafio }).where('id', data.desafio.id)
            await trx('tab_perfil_biometria').insert(data.perfilBiometria)
            return true;
        } catch (error) {
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
                descricaoDoErro: 'Exeption estourada. RepositorioPerfilBiometria - createPerfilBiometria',
                linhaDoErro: lineError,
                nomeDoArquivo: fileName,
                data_criacao: dateNow(),
            }
            logs.getInstance().fatal(dataLog, 'Erro no RepositorioPerfilBiometria - createPerfilBiometria')
            return false;
        }
    }

    async atualizarPerfilBiometriaSolicitacao(data, trx) {
        try {
            await trx('tab_perfil_usuario').update({ ...data.perfil }).where('id', data.perfil.id)
            await trx('tab_desafio_autenticacao').update({ ...data.desafio }).where('id', data.desafio.id)
            await trx('tab_perfil_biometria').update({ ...data.perfilBiometria }).where('id', data.perfilBiometria.id)
            if (data.desafioBiometria) {
                await trx('tab_desafio_autenticacao').update({ ...data.desafioBiometria }).where('id', data.desafioBiometria.id)
            }
            return true;
        } catch (error) {
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
                descricaoDoErro: 'Exeption estourada. RepositorioPerfilBiometria - createPerfilBiometria',
                linhaDoErro: lineError,
                nomeDoArquivo: fileName,
                data_criacao: dateNow(),
            }
            logs.getInstance().fatal(dataLog, 'Erro no RepositorioPerfilBiometria - createPerfilBiometria')
            return false;
        }
    }

    async updatePerfilBiometria(data) {
        try {
            const check = await this.getPerfilBiometriaById(data)
            if (check.status && check.exit) {
                const response = await knex('tab_perfil_biometria').update(data).where('id', data.id)
                return { status: true, data: response, msg: "PerfilBiometria atualizado com sucesso!" }
            } else {
                return { status: false, msg: "PerfilBiometria não encontrado!" }
            }
        } catch (error) {
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
                descricaoDoErro: 'Exeption estourada. RepositorioPerfilBiometria - updatePerfilBiometria',
                linhaDoErro: lineError,
                nomeDoArquivo: fileName,
                data_criacao: dateNow(),
            }
            logs.getInstance().fatal(dataLog, 'Erro no RepositorioPerfilBiometria - updatePerfilBiometria')
            return { status: false, error: error, msg: "Não foi possivel atualizar o PerfilBiometria!" }
        }
    }

    async deletePerfilBiometria(data) {
        try {
            const check = await this.getPerfilBiometriaById(data)
            if (check.status && check.exit) {
                const response = await knex('tab_perfil_biometria').update({ data_atualizacao: dateNow(), deletado: true }).where('id', data.id)
                return { status: true, data: response, msg: "PerfilBiometria deletado com sucesso!" }
            } else {
                return { status: false, msg: "PerfilBiometria não encontrado!" }
            }
        } catch (error) {
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
                descricaoDoErro: 'Exeption estourada. RepositorioPerfilBiometria - deletePerfilBiometria',
                linhaDoErro: lineError,
                nomeDoArquivo: fileName,
                data_criacao: dateNow(),
            }
            logs.getInstance().fatal(dataLog, 'Erro no RepositorioPerfilBiometria - deletePerfilBiometria')
            return { status: false, error: error, msg: "Não foi possivel deletar o PerfilBiometria!" }
        }
    }

    async getPerfilBiometria() {
        try {
            const response = await knex('tab_perfil_biometria').select('*').andWhere('deletado', false)
            if (response.length > 0) {
                return { status: true, exit: true, data: response, msg: "PerfilBiometria encontrado com sucesso!" }
            } else {
                return { status: true, exit: false, msg: "PerfilBiometria não encontrado!" }
            }
        } catch (error) {
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(error);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            const dataLog = {
                err: error,
                descricaoDoErro: 'Exeption estourada. RepositorioPerfilBiometria - getPerfilBiometria',
                linhaDoErro: lineError,
                nomeDoArquivo: fileName,
                data_criacao: dateNow(),
            }
            logs.getInstance().fatal(dataLog, 'Erro no RepositorioPerfilBiometria - getPerfilBiometria')
            return { status: false, error: error, msg: "Não foi possivel buscar o PerfilBiometria!" }
        }

    }


    async getPerfilBiometriaById(data) {
        try {
            const response = await knex('tab_perfil_biometria').select('*').where('id', data.id).andWhere('deletado', false)
            if (response.length > 0) {
                return { status: true, exit: true, data: response[0], msg: "PerfilBiometria encontrado com sucesso!" }
            } else {
                return { status: true, exit: false, msg: "PerfilBiometria não encontrado!" }
            }
        } catch (error) {
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
                descricaoDoErro: 'Exeption estourada. RepositorioPerfilBiometria - getPerfilBiometriaById',
                linhaDoErro: lineError,
                nomeDoArquivo: fileName,
                data_criacao: dateNow(),
            }
            logs.getInstance().fatal(dataLog, 'Erro no RepositorioPerfilBiometria - getPerfilBiometriaById')
            return { status: false, error: error, msg: "Não foi possivel buscar o PerfilBiometria!" }
        }

    }

    async getPerfilBiometriaByPerfilId(data) {
        try {
            const response = await knex('tab_perfil_biometria').select('*').where('perfil_id', data.perfil_id).andWhere('deletado', false)
            if (response.length > 0) {
                return { status: true, exit: true, data: response[0], msg: "PerfilBiometria encontrado com sucesso!" }
            } else {
                return { status: true, exit: false, msg: "PerfilBiometria não encontrado!" }
            }
        } catch (error) {
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
                descricaoDoErro: 'Exeption estourada. RepositorioPerfilBiometria - getPerfilBiometriaById',
                linhaDoErro: lineError,
                nomeDoArquivo: fileName,
                data_criacao: dateNow(),
            }
            logs.getInstance().fatal(dataLog, 'Erro no RepositorioPerfilBiometria - getPerfilBiometriaById')
            return { status: false, error: error, msg: "Não foi possivel buscar o PerfilBiometria!" }
        }

    }

    async getPendentesAprovacao() {
        try {
            const response = await knex('tab_perfil_biometria as biometria')
                .select(
                    'biometria.id', 'biometria.perfil_id', 'biometria.data_criacao',
                    'perfil.nome', 'perfil.user_id',
                    'usuario.email'
                )
                .innerJoin('tab_perfil_usuario as perfil', 'perfil.id', 'biometria.perfil_id')
                .innerJoin('tab_usuarios as usuario', 'usuario.id', 'perfil.user_id')
                .whereNull('biometria.aprovado_por')
                .andWhere('biometria.deletado', false)
                .andWhere('perfil.deletado', false)
                .andWhere('perfil.etapa', etapas_perfil_usuario.facial)
                .orderBy('biometria.data_criacao', 'asc');
            if (response.length > 0) {
                return { status: true, exit: true, data: response, msg: "Pendentes de aprovação encontrados com sucesso!" }
            } else {
                return { status: true, exit: false, data: [], msg: "Nenhuma biometria pendente de aprovação." }
            }
        } catch (error) {
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(error);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            const dataLog = {
                err: error,
                descricaoDoErro: 'Exeption estourada. RepositorioPerfilBiometria - getPendentesAprovacao',
                linhaDoErro: lineError,
                nomeDoArquivo: fileName,
                data_criacao: dateNow(),
            }
            logs.getInstance().fatal(dataLog, 'Erro no RepositorioPerfilBiometria - getPendentesAprovacao')
            return { status: false, error: error, msg: "Não foi possivel buscar as biometrias pendentes de aprovação!" }
        }
    }

    async getPerfilBiometriaByQuery(data) {
        try {
            const resp = await this.getByQuery(data)
            if (!resp.status) return { status: true, data: [], msg: "Não foi possivel buscar o PerfilBiometria!" }
            return { status: true, data: resp.data, msg: resp.msg }
        } catch (error) {
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(error);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            Log({ ...data, error, descricaoDoErro: 'Exeption estourada. RepositorioPerfilBiometria - getPerfilBiometriaByLimit', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow() })
            return { status: false, error: error, msg: "Não foi possivel buscar o PerfilBiometria!" }
        }

    }

    async getPerfilBiometriaByQueryIdHistorico(data, field, condition) {
        try {
            const resp = await this.getByQueryTableUniqWhere(data, view_historico, field, condition)
            if (!resp.status) return { status: true, data: [], msg: "Não foi possivel buscar o PerfilBiometria!" }
            return { status: true, data: resp.data, msg: resp.msg }
        } catch (error) {
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(error);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            Log({ ...data, error, descricaoDoErro: 'Exeption estourada. RepositorioPerfilBiometria - getPerfilBiometriaByLimit', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow() })
            return { status: false, error: error, msg: "Não foi possivel buscar o PerfilBiometria!" }
        }

    }


}

module.exports = new PerfilBiometriaRepository();

