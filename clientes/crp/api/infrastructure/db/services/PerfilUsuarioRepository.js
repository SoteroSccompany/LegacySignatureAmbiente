
require('dotenv/config');
const knex = require("../config/databaseConection")();
const moment = require('moment');
const Log = require('../../../@core/usecase/Logs/databaseLog');
const ErrorStackParser = require('error-stack-parser');
const dateNow = require('../../gateways/functions/data/getToday');
const BaseRepository = require('.');
const { views } = require('../../../certs');
const logs = require('../../../Logs');

class PerfilUsuarioRepository extends BaseRepository {

    constructor() {
        super({ tableName: 'tab_perfil_usuario', knexOrTransaction: knex })
    }

    async createPerfilUsuario(data) {
        try {
            const response = await knex('tab_perfil_usuario').insert(data)
            return { status: true, data: response, msg: "PerfilUsuario criado com sucesso!" }
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
                descricaoDoErro: 'Exeption estourada. RepositorioPerfilUsuario - createPerfilUsuario',
                linhaDoErro: lineError,
                nomeDoArquivo: fileName,
                data_criacao: dateNow(),
            }
            logs.getInstance().fatal(dataLog, 'Erro no RepositorioPerfilUsuario - createPerfilUsuario')
            return { status: false, error: error, msg: "Não foi possivel criar o PerfilUsuario!" }
        }
    }

    async createPerfilUsuarioTrx(data, trx) {
        try {
            await trx('tab_perfil_usuario').insert(data)
            return { status: true, msg: "Perfil de usuario criado com sucesso!" }
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
                descricaoDoErro: 'Exeption estourada. RepositorioPerfilUsuario - createPerfilUsuario',
                linhaDoErro: lineError,
                nomeDoArquivo: fileName,
                data_criacao: dateNow(),
            }
            logs.getInstance().fatal(dataLog, 'Erro no RepositorioPerfilUsuario - createPerfilUsuario')
            return { status: false, error: error, msg: "Não foi possivel criar o perfil, tente novamente em instantes!" }
        }
    }

    async updatePerfilUsuario(data) {
        try {
            const check = await this.getPerfilUsuarioById(data)
            if (check.status && check.exit) {
                const response = await knex('tab_perfil_usuario').update(data).where('id', data.id)
                return { status: true, data: response, msg: "PerfilUsuario atualizado com sucesso!" }
            } else {
                return { status: false, msg: "PerfilUsuario não encontrado!" }
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
                descricaoDoErro: 'Exeption estourada. RepositorioPerfilUsuario - updatePerfilUsuario',
                linhaDoErro: lineError,
                nomeDoArquivo: fileName,
                data_criacao: dateNow(),
            }
            logs.getInstance().fatal(dataLog, 'Erro no RepositorioPerfilUsuario - updatePerfilUsuario')
            return { status: false, error: error, msg: "Não foi possivel atualizar o PerfilUsuario!" }
        }
    }

    async deletePerfilUsuario(data) {
        try {
            const check = await this.getPerfilUsuarioById(data)
            if (check.status && check.exit) {
                const response = await knex('tab_perfil_usuario').update({ deletado: true, data_atualizacao: dateNow() }).where('id', data.id)
                return { status: true, data: response, msg: "PerfilUsuario deletado com sucesso!" }
            } else {
                return { status: false, msg: "PerfilUsuario não encontrado!" }
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
                descricaoDoErro: 'Exeption estourada. RepositorioPerfilUsuario - deletePerfilUsuario',
                linhaDoErro: lineError,
                nomeDoArquivo: fileName,
                data_criacao: dateNow(),
            }
            logs.getInstance().fatal(dataLog, 'Erro no RepositorioPerfilUsuario - deletePerfilUsuario')
            return { status: false, error: error, msg: "Não foi possivel deletar o PerfilUsuario!" }
        }
    }

    async getPerfilUsuario() {
        try {
            const response = await knex('tab_perfil_usuario').select('*').where('deletado', false)
            if (response.length > 0) {
                return { status: true, exit: true, data: response, msg: "PerfilUsuario encontrado com sucesso!" }
            } else {
                return { status: true, exit: false, msg: "PerfilUsuario não encontrado!" }
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
                descricaoDoErro: 'Exeption estourada. RepositorioPerfilUsuario - getPerfilUsuario',
                linhaDoErro: lineError,
                nomeDoArquivo: fileName,
                data_criacao: dateNow(),
            }
            logs.getInstance().fatal(dataLog, 'Erro no RepositorioPerfilUsuario - getPerfilUsuario')
            return { status: false, error: error, msg: "Não foi possivel buscar o PerfilUsuario!" }
        }

    }


    async getPerfilUsuarioById(data) {
        try {
            const response = await knex('tab_perfil_usuario').select('*').where('id', data.id).andWhere('deletado', false)
            if (response.length > 0) {
                return { status: true, exit: true, data: response[0], msg: "PerfilUsuario encontrado com sucesso!" }
            } else {
                return { status: true, exit: false, msg: "PerfilUsuario não encontrado!" }
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
                descricaoDoErro: 'Exeption estourada. RepositorioPerfilUsuario - getPerfilUsuarioById',
                linhaDoErro: lineError,
                nomeDoArquivo: fileName,
                data_criacao: dateNow(),
            }
            logs.getInstance().fatal(dataLog, 'Erro no RepositorioPerfilUsuario - getPerfilUsuarioById')
            return { status: false, error: error, msg: "Não foi possivel buscar o PerfilUsuario!" }
        }

    }

    async getPerfilUsuarioByUserId(data) {
        try {
            const response = await knex('tab_perfil_usuario').select('*').where('user_id', data.user_id).andWhere('deletado', false).first()
            if (response) {
                return { status: true, exit: true, data: response, msg: "PerfilUsuario encontrado com sucesso!" }
            } else {
                return { status: true, exit: false, msg: "PerfilUsuario não encontrado!" }
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
                descricaoDoErro: 'Exeption estourada. RepositorioPerfilUsuario - getPerfilUsuarioById',
                linhaDoErro: lineError,
                nomeDoArquivo: fileName,
                data_criacao: dateNow(),
            }
            logs.getInstance().fatal(dataLog, 'Erro no RepositorioPerfilUsuario - getPerfilUsuarioById')
            return { status: false, error: error, msg: "Não foi possivel buscar o PerfilUsuario!" }
        }

    }

    async getPerfilUsuarioByCpf(data) {
        try {
            const response = await knex('tab_perfil_usuario').select('*').where('cpf_bindex', data.cpf_bindex).andWhere('deletado', false).first()
            if (response) {
                return { status: true, exit: true, data: response, msg: "PerfilUsuario encontrado com sucesso!" }
            } else {
                return { status: true, exit: false, msg: "PerfilUsuario não encontrado!" }
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
                descricaoDoErro: 'Exeption estourada. RepositorioPerfilUsuario - getPerfilUsuarioById',
                linhaDoErro: lineError,
                nomeDoArquivo: fileName,
                data_criacao: dateNow(),
            }
            logs.getInstance().fatal(dataLog, 'Erro no RepositorioPerfilUsuario - getPerfilUsuarioById')
            return { status: false, error: error, msg: "Não foi possivel buscar o PerfilUsuario!" }
        }

    }

    async getPerfilUsuarioByQuery(data) {
        try {
            const resp = await this.getByQuery(data)
            if (!resp.status) return { status: true, data: [], msg: "Não foi possivel buscar o PerfilUsuario!" }
            return { status: true, data: resp.data, msg: resp.msg }
        } catch (error) {
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(error);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            Log({ ...data, error, descricaoDoErro: 'Exeption estourada. RepositorioPerfilUsuario - getPerfilUsuarioByLimit', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            return { status: false, error: error, msg: "Não foi possivel buscar o PerfilUsuario!" }
        }

    }

    async getPerfilUsuarioByQueryIdHistorico(data, field, condition) {
        try {
            const resp = await this.getByQueryTableUniqWhere(data, view_historico, field, condition)
            if (!resp.status) return { status: true, data: [], msg: "Não foi possivel buscar o PerfilUsuario!" }
            return { status: true, data: resp.data, msg: resp.msg }
        } catch (error) {
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(error);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            Log({ ...data, error, descricaoDoErro: 'Exeption estourada. RepositorioPerfilUsuario - getPerfilUsuarioByLimit', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            return { status: false, error: error, msg: "Não foi possivel buscar o PerfilUsuario!" }
        }

    }


}

module.exports = new PerfilUsuarioRepository();

