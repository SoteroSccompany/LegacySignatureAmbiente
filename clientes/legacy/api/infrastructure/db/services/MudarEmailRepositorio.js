
require('dotenv/config');
const knex = require("../config/databaseConection")();
const Log = require('../../../@core/usecase/Logs/databaseLog')
const dateNow = require('../../gateways/functions/data/getToday')

class MudarEmailRepositorio {

    async create(data) {
        const check = await this.getByUserId({ id: data.user_id });
        if (check.status && check.exit) {
            await this.delete({ id: data.user_id });
        }
        try {
            delete data.senha
            delete data.token
            await knex('tab_mudar_email').insert({ ...data, user_id: data.user_id, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: 0 });
            return { status: true, msg: "Token criado com sucesso!" };
        } catch (error) {
            console.log(error)
            Log({ error: { error }, identifier: 'Erro Reposistorio repositoryMailChange: ' + data.id })
            return { status: false, error: error, msg: "Erro ao criar token!" };
        }

    }
    async getByUserId(data) {
        try {
            const token = await knex('tab_mudar_email').select().where({ user_id: data.id }).andWhere({ deletado: 0 });
            if (token.length > 0) {
                return { status: true, exit: true, msg: "Troca de e-mail encontrado!", email: token };
            } else {
                return { status: true, exit: false, msg: "Troca de e-mail não encontrado!" };
            }
        } catch (error) {
            Log({ error: { error }, identifier: 'Erro Reposistorio repositoryMailChange: ' + data.id })
            return { status: false, error: error, msg: "Erro ao buscar Troca de e-mail!" };
        }
    }

    async deleteChange(data) {
        try {
            const trx = await knex.transaction();
            try {
                await trx('tab_usuarios').update({ email: data.email, data_atualizacao: dateNow() }).where({ id: data.id });
                await trx('tab_mudar_email').update({ deletado: 1, data_atualizacao: dateNow() }).where({ user_id: data.id });
                await trx('tab_login').delete().where({ user_id: data.id });
                await trx.commit();
                return { status: true, msg: "Token deletado com sucesso!" };
            } catch (err) {
                await trx.rollback();
                return { status: false, error: err, msg: "Erro ao deletar token!" };
            }
        } catch (err) {
            Log({ error: { err }, identifier: 'Erro Reposistorio repositoryMailChange: ' + data.id })
            return { status: false, error: err, msg: "Erro ao deletar token!" };
        }
    }

    async delete(data) {
        try {
            const trx = await knex.transaction();
            try {
                await trx('tab_mudar_email').update({ deletado: 1, data_atualizacao: dateNow() }).where({ user_id: data.id });
                await trx('tab_login').delete().where({ user_id: data.id });
                await trx.commit();
                return { status: true, msg: "Token deletado com sucesso!" };
            } catch (err) {
                await trx.rollback();
                return { status: false, error: err, msg: "Erro ao deletar token!" };
            }
        } catch (err) {
            Log({ error: { err }, identifier: 'Erro Reposistorio repositoryMailChange: ' + data.id })
            return { status: false, error: err, msg: "Erro ao deletar token!" };
        }
    }




}

module.exports = new MudarEmailRepositorio();
