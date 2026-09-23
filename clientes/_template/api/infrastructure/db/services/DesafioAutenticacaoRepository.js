
require('dotenv/config');
const knex = require("../config/databaseConection")();
const moment = require('moment');
const Log = require('../../../@core/usecase/Logs/databaseLog');
const ErrorStackParser = require('error-stack-parser');
const dateNow = require('../../gateways/functions/data/getToday');
const BaseRepository = require('.');
const { views, confiDoisFatores, statusSignatario } = require('../../../certs');
const logs = require('../../../Logs');

class DesafioAutenticacaoRepository extends BaseRepository {

    constructor() {
        super({ tableName: 'tab_desafio_autenticacao', knexOrTransaction: knex })
    }

    async createDesafioAutenticacao(data) {
        try {
            const trx = await knex.transaction();
            try {
                await trx('tab_desafio_autenticacao').update({
                    expira_em: moment().format('YYYY-MM-DD HH:mm:ss'), deletado: true
                }).where('user_id', data.desafio.user_id).andWhere('usado', false).andWhere('deletado', false);
                await trx('tab_desafio_autenticacao').insert(data.desafio)
                await trx('tab_usuarios').update({ codigo_hash: data.codigo_hash, data_atualizacao: dateNow(), desafio_id: data.desafio.id }).where('id', data.desafio.user_id)
                await trx.commit();
                return { status: true, msg: "DesafioAutenticacao criado com sucesso!" }
            } catch (error) {
                await trx.rollback();
                return { status: false, error: error, msg: "Não foi possivel criar o DesafioAutenticacao!" }
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
                descricaoDoErro: 'Exeption estourada. RepositorioDesafioAutenticacao - createDesafioAutenticacao',
                linhaDoErro: lineError,
                nomeDoArquivo: fileName,
                data_criacao: dateNow(),
            }
            logs.getInstance().fatal(dataLog, 'Erro no RepositorioDesafioAutenticacao - createDesafioAutenticacao')
            return { status: false, error: error, msg: "Não foi possivel criar o DesafioAutenticacao!" }
        }
    }

    async createDesafio(data, trxExterna = null) {
        try {
            const trx = trxExterna || await knex.transaction();
            try {
                await trx('tab_desafio_autenticacao').update({
                    expira_em: moment().format('YYYY-MM-DD HH:mm:ss'), deletado: true
                }).where('user_id', data.desafio.user_id).andWhere('usado', false).andWhere('deletado', false);
                await trx('tab_desafio_autenticacao').insert(data.desafio)
                if (!trxExterna) await trx.commit();
                return { status: true, msg: "Desafio de prfil criado com sucesso!" }
            } catch (error) {
                console.log(error)
                if (!trxExterna) await trx.rollback();
                return { status: false, error: error, msg: "Não foi possivel criar o Desafio!" }
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
                descricaoDoErro: 'Exeption estourada. RepositorioDesafioAutenticacao - createDesafioAutenticacao',
                linhaDoErro: lineError,
                nomeDoArquivo: fileName,
                data_criacao: dateNow(),
            }
            logs.getInstance().fatal(dataLog, 'Erro no RepositorioDesafioAutenticacao - createDesafioAutenticacao')
            return { status: false, error: error, msg: "Não foi possivel criar o DesafioAutenticacao!" }
        }
    }

    async updateDesafioCreatePerfil(data, trxExterna = null) {
        try {
            const trx = trxExterna || await knex.transaction();
            try {
                await trx('tab_desafio_autenticacao').update(data.desafio).where('user_id', data.desafio.user_id).andWhere('tipo_desafio', confiDoisFatores.desafio.perfilUsuario)
                    .andWhere('usado', false).andWhere('deletado', false);
                await trx('tab_perfil_usuario').insert(data.perfil)
                await trx('tab_signatarios').update({
                    perfil_id: data.perfil.id,
                    status: statusSignatario.pendente,
                }).where('user_id', data.desafio.user_id).whereNull('perfil_id').andWhere('deletado', false);
                await trx('tab_usuario_staging').update({
                    perfil_ok: true,
                }).where('user_id', data.desafio.user_id).andWhere('deletado', false);
                if (!trxExterna) await trx.commit();
                return { status: true, msg: "Desafio de prfil criado com sucesso!" }
            } catch (error) {
                console.log(error)
                if (!trxExterna) await trx.rollback();
                return { status: false, error: error, msg: "Não foi possivel atualizar os dados!" }
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
                descricaoDoErro: 'Exeption estourada. RepositorioDesafioAutenticacao - createDesafioAutenticacao',
                linhaDoErro: lineError,
                nomeDoArquivo: fileName,
                data_criacao: dateNow(),
            }
            logs.getInstance().fatal(dataLog, 'Erro no RepositorioDesafioAutenticacao - createDesafioAutenticacao')
            return { status: false, error: error, msg: "Não foi possivel criar o DesafioAutenticacao!" }
        }
    }

    async createDesafioAutenticacao(data) {
        try {
            const trx = await knex.transaction();
            try {
                await trx('tab_desafio_autenticacao').update({
                    expira_em: moment().format('YYYY-MM-DD HH:mm:ss'), deletado: true
                }).where('user_id', data.desafio.user_id).andWhere('usado', false).andWhere('deletado', false);
                await trx('tab_desafio_autenticacao').insert(data.desafio)
                await trx('tab_usuarios').update({ codigo_hash: data.codigo_hash, data_atualizacao: dateNow(), desafio_id: data.desafio.id }).where('id', data.desafio.user_id)
                await trx.commit();
                return { status: true, msg: "DesafioAutenticacao criado com sucesso!" }
            } catch (error) {
                await trx.rollback();
                return { status: false, error: error, msg: "Não foi possivel criar o DesafioAutenticacao!" }
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
                descricaoDoErro: 'Exeption estourada. RepositorioDesafioAutenticacao - createDesafioAutenticacao',
                linhaDoErro: lineError,
                nomeDoArquivo: fileName,
                data_criacao: dateNow(),
            }
            logs.getInstance().fatal(dataLog, 'Erro no RepositorioDesafioAutenticacao - createDesafioAutenticacao')
            return { status: false, error: error, msg: "Não foi possivel criar o DesafioAutenticacao!" }
        }
    }

    async createDesafioAutenticacaoInicialCreateDesafio(data, trxExterna = null) {
        try {
            const trx = trxExterna || await knex.transaction();
            try {
                await trx('tab_desafio_autenticacao').update({
                    expira_em: moment().format('YYYY-MM-DD HH:mm:ss'), deletado: true
                }).where('user_id', data.desafio.user_id).andWhere('usado', false).andWhere('deletado', false);
                await trx('tab_desafio_autenticacao').insert(data.desafio)
                await trx('tab_usuarios').update({ codigo_hash: data.codigo_hash, data_atualizacao: dateNow() }).where('id', data.desafio.user_id)
                if (!trxExterna) await trx.commit();
                return { status: true, msg: "DesafioAutenticacao criado com sucesso!" }
            } catch (error) {
                if (!trxExterna) await trx.rollback();
                return { status: false, error: error, msg: "Não foi possivel criar o DesafioAutenticacao!" }
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
                descricaoDoErro: 'Exeption estourada. RepositorioDesafioAutenticacao - createDesafioAutenticacao',
                linhaDoErro: lineError,
                nomeDoArquivo: fileName,
                data_criacao: dateNow(),
            }
            logs.getInstance().fatal(dataLog, 'Erro no RepositorioDesafioAutenticacao - createDesafioAutenticacao')
            return { status: false, error: error, msg: "Não foi possivel criar o DesafioAutenticacao!" }
        }
    }

    async createDesafioAutenticacaoInicial(data, trxExterna = null) {
        try {
            const trx = trxExterna || await knex.transaction();
            try {
                await trx('tab_desafio_autenticacao').update({
                    expira_em: moment().format('YYYY-MM-DD HH:mm:ss'), deletado: true
                }).where('user_id', data.desafio.user_id).andWhere('usado', false).andWhere('deletado', false);
                await trx('tab_desafio_autenticacao').insert(data.desafio)
                await trx('tab_usuarios').update({ codigo_hash: data.codigo_hash, data_atualizacao: dateNow(), desafio_id: data.desafio.id }).where('id', data.desafio.user_id)
                if (!trxExterna) await trx.commit();
                return { status: true, msg: "DesafioAutenticacao criado com sucesso!" }
            } catch (error) {
                if (!trxExterna) await trx.rollback();
                return { status: false, error: error, msg: "Não foi possivel criar o DesafioAutenticacao!" }
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
                descricaoDoErro: 'Exeption estourada. RepositorioDesafioAutenticacao - createDesafioAutenticacao',
                linhaDoErro: lineError,
                nomeDoArquivo: fileName,
                data_criacao: dateNow(),
            }
            logs.getInstance().fatal(dataLog, 'Erro no RepositorioDesafioAutenticacao - createDesafioAutenticacao')
            return { status: false, error: error, msg: "Não foi possivel criar o DesafioAutenticacao!" }
        }
    }

    async updateDesafioAutenticacao(data, user, trxExterna = null) {
        try {
            const trx = trxExterna || await knex.transaction();
            try {
                await trx('tab_desafio_autenticacao').update(data).where('id', data.id)
                if (user && user.id) {
                    await trx('tab_usuarios').update(user).where('id', user.id)
                }
                if (!trxExterna) await trx.commit();
                return { status: true, msg: "DesafioAutenticacao atualizado com sucesso!" }
            } catch (error) {
                if (!trxExterna) await trx.rollback();
                return { status: false, error: error, msg: "Não foi possivel atualizar o DesafioAutenticacao!" }
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
                descricaoDoErro: 'Exeption estourada. RepositorioDesafioAutenticacao - updateDesafioAutenticacao',
                linhaDoErro: lineError,
                nomeDoArquivo: fileName,
                data_criacao: dateNow(),
            }
            logs.getInstance().fatal(dataLog, 'Erro no RepositorioDesafioAutenticacao - updateDesafioAutenticacao')
            return { status: false, error: error, msg: "Não foi possivel atualizar o DesafioAutenticacao!" }
        }
    }

    async updateDesafioAutenticacaoELogin(data, user, trxExterna = null, login) {
        try {
            const trx = trxExterna || await knex.transaction();
            try {
                await trx('tab_desafio_autenticacao').update(data).where('id', data.id)
                if (user && user.id) {
                    await trx('tab_usuarios').update(user).where('id', user.id)
                }
                await trx('tab_login').update(login).where('id', login.id)
                if (!trxExterna) await trx.commit();
                return { status: true, msg: "DesafioAutenticacao atualizado com sucesso!" }
            } catch (error) {
                console.log(error)
                if (!trxExterna) await trx.rollback();
                return { status: false, error: error, msg: "Não foi possivel atualizar o DesafioAutenticacao!" }
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
                descricaoDoErro: 'Exeption estourada. RepositorioDesafioAutenticacao - updateDesafioAutenticacao',
                linhaDoErro: lineError,
                nomeDoArquivo: fileName,
                data_criacao: dateNow(),
            }
            logs.getInstance().fatal(dataLog, 'Erro no RepositorioDesafioAutenticacao - updateDesafioAutenticacao')
            return { status: false, error: error, msg: "Não foi possivel atualizar o DesafioAutenticacao!" }
        }
    }

    async deleteDesafioAutenticacaoByUserId(data) {
        try {
            await knex('tab_desafio_autenticacao').update({ deletado: true, data_atualizacao: dateNow() }).where('user_id', data.user_id)
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
                descricaoDoErro: 'Exeption estourada. RepositorioDesafioAutenticacao - deleteDesafioAutenticacao',
                linhaDoErro: lineError,
                nomeDoArquivo: fileName,
                data_criacao: dateNow(),
            }
            logs.getInstance().fatal(dataLog, 'Erro no RepositorioDesafioAutenticacao - deleteDesafioAutenticacao')
            return { status: false, error: error, msg: "Não foi possivel deletar o DesafioAutenticacao!" }
        }
    }

    async deleteDesafioAutenticacao(data) {
        try {
            const check = await this.getDesafioAutenticacaoById(data)
            if (check.status && check.exit) {
                const response = await knex('tab_desafio_autenticacao').update({ deletado: true, data_atualizacao: dateNow() }).where('id', data.id)
                return { status: true, data: response, msg: "DesafioAutenticacao deletado com sucesso!" }
            } else {
                return { status: false, msg: "DesafioAutenticacao não encontrado!" }
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
                descricaoDoErro: 'Exeption estourada. RepositorioDesafioAutenticacao - deleteDesafioAutenticacao',
                linhaDoErro: lineError,
                nomeDoArquivo: fileName,
                data_criacao: dateNow(),
            }
            logs.getInstance().fatal(dataLog, 'Erro no RepositorioDesafioAutenticacao - deleteDesafioAutenticacao')
            return { status: false, error: error, msg: "Não foi possivel deletar o DesafioAutenticacao!" }
        }
    }

    async getDesafioAutenticacao() {
        try {
            const response = await knex('tab_desafio_autenticacao').select('*').where('deletado', false)
            if (response.length > 0) {
                return { status: true, exit: true, data: response, msg: "DesafioAutenticacao encontrado com sucesso!" }
            } else {
                return { status: true, exit: false, msg: "DesafioAutenticacao não encontrado!" }
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
                descricaoDoErro: 'Exeption estourada. RepositorioDesafioAutenticacao - getDesafioAutenticacao',
                linhaDoErro: lineError,
                nomeDoArquivo: fileName,
                data_criacao: dateNow(),
            }
            logs.getInstance().fatal(dataLog, 'Erro no RepositorioDesafioAutenticacao - getDesafioAutenticacao')
            return { status: false, error: error, msg: "Não foi possivel buscar o DesafioAutenticacao!" }
        }

    }


    async getDesafioAutenticacaoById(data) {
        try {
            const response = await knex('tab_desafio_autenticacao').select('*').where('id', data.id).andWhere('deletado', false).first();
            if (response) {
                return { status: true, exit: true, data: response, msg: "DesafioAutenticacao encontrado com sucesso!" }
            } else {
                return { status: true, exit: false, msg: "DesafioAutenticacao não encontrado!" }
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
                descricaoDoErro: 'Exeption estourada. RepositorioDesafioAutenticacao - getDesafioAutenticacaoById',
                linhaDoErro: lineError,
                nomeDoArquivo: fileName,
                data_criacao: dateNow(),
            }
            logs.getInstance().fatal(dataLog, 'Erro no RepositorioDesafioAutenticacao - getDesafioAutenticacaoById')
            return { status: false, error: error, msg: "Não foi possivel buscar o DesafioAutenticacao!" }
        }

    }

    async getDesafioAutenticacaoByTipoSessionAndUserIdNaoUsado(data) {
        try {
            const response = await knex('tab_desafio_autenticacao').select('*').where('user_id', data.user_id)
                .andWhere('tipo_desafio', data.tipo_desafio)
                .andWhere('sessao_id', data.sessao_id)
                .andWhere('usado', false)
                .andWhere('deletado', false)
                .orderBy('criado_em', 'desc')
                .first()
            if (response) {
                return { status: true, exit: true, data: response, msg: "DesafioAutenticacao encontrado com sucesso!" }
            } else {
                return { status: true, exit: false, msg: "DesafioAutenticacao não encontrado!" }
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
                descricaoDoErro: 'Exeption estourada. RepositorioDesafioAutenticacao - getDesafioAutenticacaoById',
                linhaDoErro: lineError,
                nomeDoArquivo: fileName,
                data_criacao: dateNow(),
            }
            logs.getInstance().fatal(dataLog, 'Erro no RepositorioDesafioAutenticacao - getDesafioAutenticacaoById')
            return { status: false, error: error, msg: "Não foi possivel buscar o DesafioAutenticacao!" }
        }

    }

    async getDesafioAutenticacaoByTipoSessionAndUserIdUsado(data) {
        try {
            const response = await knex('tab_desafio_autenticacao').select('*').where('user_id', data.user_id)
                .andWhere('tipo_desafio', data.tipo_desafio)
                .andWhere('sessao_id', data.sessao_id)
                .andWhere('usado', true)
                .andWhere('deletado', false)
                .orderBy('criado_em', 'desc')
                .first()
            if (response) {
                return { status: true, exit: true, data: response, msg: "DesafioAutenticacao encontrado com sucesso!" }
            } else {
                return { status: true, exit: false, msg: "DesafioAutenticacao não encontrado!" }
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
                descricaoDoErro: 'Exeption estourada. RepositorioDesafioAutenticacao - getDesafioAutenticacaoById',
                linhaDoErro: lineError,
                nomeDoArquivo: fileName,
                data_criacao: dateNow(),
            }
            logs.getInstance().fatal(dataLog, 'Erro no RepositorioDesafioAutenticacao - getDesafioAutenticacaoById')
            return { status: false, error: error, msg: "Não foi possivel buscar o DesafioAutenticacao!" }
        }

    }

    async getDesafioAutenticacaoByTipoAndUserIdNaoUsado(data) {
        try {
            const response = await knex('tab_desafio_autenticacao').select('*').where('user_id', data.user_id)
                .andWhere('tipo_desafio', data.tipo_desafio)
                .andWhere('usado', false)
                .andWhere('deletado', false)
                .orderBy('criado_em', 'desc')
                .first()
            if (response) {
                return { status: true, exit: true, data: response, msg: "DesafioAutenticacao encontrado com sucesso!" }
            } else {
                return { status: true, exit: false, msg: "DesafioAutenticacao não encontrado!" }
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
                descricaoDoErro: 'Exeption estourada. RepositorioDesafioAutenticacao - getDesafioAutenticacaoById',
                linhaDoErro: lineError,
                nomeDoArquivo: fileName,
                data_criacao: dateNow(),
            }
            logs.getInstance().fatal(dataLog, 'Erro no RepositorioDesafioAutenticacao - getDesafioAutenticacaoById')
            return { status: false, error: error, msg: "Não foi possivel buscar o DesafioAutenticacao!" }
        }

    }

    async getDesafioAutenticacaoByTipoAndUserIdUsado(data) {
        try {
            const response = await knex('tab_desafio_autenticacao').select('*').where('user_id', data.user_id)
                .andWhere('tipo_desafio', data.tipo_desafio)
                .andWhere('usado', true)
                .andWhere('deletado', false)
                .orderBy('criado_em', 'desc')
                .first()
            if (response) {
                return { status: true, exit: true, data: response, msg: "DesafioAutenticacao encontrado com sucesso!" }
            } else {
                return { status: true, exit: false, msg: "DesafioAutenticacao não encontrado!" }
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
                descricaoDoErro: 'Exeption estourada. RepositorioDesafioAutenticacao - getDesafioAutenticacaoById',
                linhaDoErro: lineError,
                nomeDoArquivo: fileName,
                data_criacao: dateNow(),
            }
            logs.getInstance().fatal(dataLog, 'Erro no RepositorioDesafioAutenticacao - getDesafioAutenticacaoById')
            return { status: false, error: error, msg: "Não foi possivel buscar o DesafioAutenticacao!" }
        }

    }

    async getDesafioAutenticacaoBySessionAndUserIdNaoUsado(data) {
        try {
            const response = await knex('tab_desafio_autenticacao').select('*').where('user_id', data.user_id).andWhere('sessao_id', data.sessao_id).andWhere('usado', false).andWhere('deletado', false).orderBy('criado_em', 'desc')
                .first()
            if (response) {
                return { status: true, exit: true, data: response, msg: "DesafioAutenticacao encontrado com sucesso!" }
            } else {
                return { status: true, exit: false, msg: "DesafioAutenticacao não encontrado!" }
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
                descricaoDoErro: 'Exeption estourada. RepositorioDesafioAutenticacao - getDesafioAutenticacaoById',
                linhaDoErro: lineError,
                nomeDoArquivo: fileName,
                data_criacao: dateNow(),
            }
            logs.getInstance().fatal(dataLog, 'Erro no RepositorioDesafioAutenticacao - getDesafioAutenticacaoById')
            return { status: false, error: error, msg: "Não foi possivel buscar o DesafioAutenticacao!" }
        }

    }

    async getDesafioAutenticacaoBySessionAndUserIdUsado(data) {
        try {
            const response = await knex('tab_desafio_autenticacao').select('*').where('user_id', data.user_id).andWhere('sessao_id', data.sessao_id).andWhere('usado', true).andWhere('deletado', false).orderBy('criado_em', 'desc')
                .first()
            if (response) {
                return { status: true, exit: true, data: response, msg: "DesafioAutenticacao encontrado com sucesso!" }
            } else {
                return { status: true, exit: false, msg: "DesafioAutenticacao não encontrado!" }
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
                descricaoDoErro: 'Exeption estourada. RepositorioDesafioAutenticacao - getDesafioAutenticacaoById',
                linhaDoErro: lineError,
                nomeDoArquivo: fileName,
                data_criacao: dateNow(),
            }
            logs.getInstance().fatal(dataLog, 'Erro no RepositorioDesafioAutenticacao - getDesafioAutenticacaoById')
            return { status: false, error: error, msg: "Não foi possivel buscar o DesafioAutenticacao!" }
        }

    }

    async getDesafioAutenticacaoBySessionAndUserIdUsadoCadastro(data) {
        try {
            const response = await knex('tab_desafio_autenticacao').select('*').where('user_id', data.user_id).andWhere('tipo_desafio', confiDoisFatores.desafio.autenticacaoCadastro).andWhere('usado', true).andWhere('deletado', false).orderBy('criado_em', 'desc')
                .first()
            if (response) {
                return { status: true, exit: true, data: response, msg: "DesafioAutenticacao encontrado com sucesso!" }
            } else {
                return { status: true, exit: false, msg: "DesafioAutenticacao não encontrado!" }
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
                descricaoDoErro: 'Exeption estourada. RepositorioDesafioAutenticacao - getDesafioAutenticacaoById',
                linhaDoErro: lineError,
                nomeDoArquivo: fileName,
                data_criacao: dateNow(),
            }
            logs.getInstance().fatal(dataLog, 'Erro no RepositorioDesafioAutenticacao - getDesafioAutenticacaoById')
            return { status: false, error: error, msg: "Não foi possivel buscar o DesafioAutenticacao!" }
        }

    }

    async getDesafioAutenticacaoBySessionAndUserId(data) {
        try {
            const response = await knex('tab_desafio_autenticacao').select('*').where('user_id', data.user_id).andWhere('sessao_id', data.sessao_id).andWhere('usado', true).andWhere('deletado', false).orderBy('criado_em', 'desc')
                .first()
            if (response) {
                return { status: true, exit: true, data: response, msg: "DesafioAutenticacao encontrado com sucesso!" }
            } else {
                return { status: true, exit: false, msg: "DesafioAutenticacao não encontrado!" }
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
                descricaoDoErro: 'Exeption estourada. RepositorioDesafioAutenticacao - getDesafioAutenticacaoById',
                linhaDoErro: lineError,
                nomeDoArquivo: fileName,
                data_criacao: dateNow(),
            }
            logs.getInstance().fatal(dataLog, 'Erro no RepositorioDesafioAutenticacao - getDesafioAutenticacaoById')
            return { status: false, error: error, msg: "Não foi possivel buscar o DesafioAutenticacao!" }
        }

    }


    async getDesafioAutenticacaoByQuery(data) {
        try {
            const resp = await this.getByQuery(data)
            if (!resp.status) return { status: true, data: [], msg: "Não foi possivel buscar o DesafioAutenticacao!" }
            return { status: true, data: resp.data, msg: resp.msg }
        } catch (error) {
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(error);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            Log({ ...data, error, descricaoDoErro: 'Exeption estourada. RepositorioDesafioAutenticacao - getDesafioAutenticacaoByLimit', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            return { status: false, error: error, msg: "Não foi possivel buscar o DesafioAutenticacao!" }
        }

    }

    async getDesafioAutenticacaoByQueryIdHistorico(data, field, condition) {
        try {
            const resp = await this.getByQueryTableUniqWhere(data, view_historico, field, condition)
            if (!resp.status) return { status: true, data: [], msg: "Não foi possivel buscar o DesafioAutenticacao!" }
            return { status: true, data: resp.data, msg: resp.msg }
        } catch (error) {
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(error);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            Log({ ...data, error, descricaoDoErro: 'Exeption estourada. RepositorioDesafioAutenticacao - getDesafioAutenticacaoByLimit', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            return { status: false, error: error, msg: "Não foi possivel buscar o DesafioAutenticacao!" }
        }

    }


}

module.exports = new DesafioAutenticacaoRepository();

