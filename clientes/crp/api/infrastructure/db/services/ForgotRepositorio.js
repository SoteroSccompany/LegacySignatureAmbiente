
require('dotenv/config');
const knex = require("../config/databaseConection")();
const Log = require('../../../@core/usecase/Logs/databaseLog')
const moment = require('moment')
const ErrorStackParser = require('error-stack-parser');
const dateNow = require('../../gateways/functions/data/getToday')
const { roles, views } = require('../../../certs');
const BaseRepository = require('.');
class ForgotRepositorio extends BaseRepository {

    constructor() {
        super({ knexOrTransaction: knex, tableName: 'tab_perdeu_senha' })
    }

    async create(data) {
        const check = await this.getByUserId({ id: data.user_id });
        if (check.status == false) {
            try {
                await knex('tab_perdeu_senha').insert({ id: data.id, token: data.token, user_id: data.user_id, data_criacao: moment(new Date()).format('YYYY/MM/DD HH:mm:ss'), data_atualizacao: moment(new Date()).format('YYYY/MM/DD HH:mm:ss'), deletado: 0 });
                return { status: true, msg: "Token criado com sucesso!" };

            } catch (error) {
                let lineError = '0';
                let fileName = '0';
                const stackFrames = ErrorStackParser.parse(error);
                if (stackFrames.length > 0) {
                    lineError = stackFrames[0].lineNumber;
                    fileName = stackFrames[0].fileName;
                }
                Log({ ...data, error, descricaoDoErro: 'Exeption estourada. Repositorio forgotToken', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
                return { status: false, error: error, msg: "Erro ao criar token!" };
            }

        } else {
            try {
                const del = await this.deleteByUserId(check.token.user_id);
                if (del.status) {
                    try {
                        await knex('tab_perdeu_senha').insert({
                            id: data.id, token: data.token, user_id: data.user_id, data_criacao: moment(new Date()).format('YYYY/MM/DD HH:mm:ss'),
                            data_atualizacao: moment(new Date()).format('YYYY/MM/DD HH:mm:ss'), deletado: false
                        });
                        return { status: true, msg: "Token criado com sucesso!" };

                    } catch (error) {
                        console.log(error)
                        let lineError = '0';
                        let fileName = '0';
                        const stackFrames = ErrorStackParser.parse(error);
                        if (stackFrames.length > 0) {
                            lineError = stackFrames[0].lineNumber;
                            fileName = stackFrames[0].fileName;
                        }
                        Log({ ...data, error, descricaoDoErro: 'Exeption estourada. Repositorio forgotToken', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
                        return { status: false, error: error, msg: "Erro ao criar token!" };
                    }
                } else {
                    return { status: false, error: del.error, msg: "Erro ao criar token!" };
                }
            } catch (error) {
                console.log(error)
                let lineError = '0';
                let fileName = '0';
                const stackFrames = ErrorStackParser.parse(error);
                if (stackFrames.length > 0) {
                    lineError = stackFrames[0].lineNumber;
                    fileName = stackFrames[0].fileName;
                }
                Log({ ...data, error, descricaoDoErro: 'Exeption estourada. Repositorio forgotToken', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
                return { status: false, error: error, msg: "Erro ao criar token!" };
            }
        }
    }

    async getByToken(data) {
        try {
            const token = await knex('tab_perdeu_senha').select(["token"]).where({ token: data.token }).andWhere({ deletado: 0 });
            if (token.length > 0) {
                return { status: true, exit: true, msg: "Token encontrado!", data: token[0] };
            } else {
                return { status: false, exit: false, msg: "Token não encontrado!" };
            }
        } catch (error) {
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(error);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            Log({ ...data, error, descricaoDoErro: 'Exeption estourada. Repositorio forgotToken', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            return { status: false, error: error, msg: "Erro ao buscar Token!" };
        }
    }

    async getByLimit(data) {
        try {
            return await super.getByQueryTable(data, views.viewForgot);
        } catch (error) {
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(error);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            Log({ ...data, error, descricaoDoErro: 'Exeption estourada. Repositorio forgotToken', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            return { status: false, error: error, msg: "Erro ao buscar Token!" };
        }
    }

    async getByLimitQuery(data) {
        try {
            const token = await knex('tab_perdeu_senha').select([
                'tab_perdeu_senha.*',
                'tab_usuarios.email as email',
            ]).where({ "tab_perdeu_senha.deletado": 0 })
                .andWhere('tab_usuarios.email', 'like', `%${data.query}%`)
                .whereNot('tab_usuarios.role', roles.system).andWhereNot('tab_usuarios.role', roles.cliente)
                .limit(data.limit).offset(data.offset).orderBy('tab_perdeu_senha.data_criacao', 'desc')
                .innerJoin('tab_usuarios', 'tab_usuarios.id', 'tab_perdeu_senha.user_id')
            if (token.length > 0) {
                return { status: true, exit: true, msg: "Solicitações de recuperação de senha localizados!", data: token };
            } else {
                return { status: false, exit: false, msg: "Solicitações de recuperação de senha não encontrados!" };
            }
        } catch (error) {
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(error);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            Log({ ...data, error, descricaoDoErro: 'Exeption estourada. Repositorio forgotToken', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            return { status: false, error: error, msg: "Erro ao buscar Token!" };
        }
    }

    async getByLimitCliente(data) {
        try {
            const token = await knex('tab_perdeu_senha').select([
                'tab_perdeu_senha.*',
                'tab_usuarios.email as email',
                'TabPerfilClientes.nome as nome'
            ]).where({ "tab_perdeu_senha.deletado": 0 })
                .whereNot('tab_usuarios.role', roles.system).andWhereNot('tab_usuarios.role', roles.admin).andWhereNot('tab_usuarios.role', roles.administrativo).andWhereNot('tab_usuarios.role', roles.operacional).andWhereNot('tab_usuarios.role', roles.financeiro)
                .andWhere('TabPerfilClientes.cliente_id', data.cliente_id)
                .innerJoin('tab_usuarios', 'tab_usuarios.id', 'tab_perdeu_senha.user_id')
                .innerJoin('TabPerfilClientes', 'TabPerfilClientes.user_id', 'tab_usuarios.id')
                .limit(data.limit).offset(data.offset).orderBy('tab_perdeu_senha.data_criacao', 'desc')
            if (token.length > 0) {
                return { status: true, exit: true, msg: "Solicitações de recuperação de senha localizados!", data: token };
            } else {
                return { status: false, exit: false, msg: "Solicitações de recuperação de senha não encontrados!" };
            }
        } catch (error) {
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(error);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            Log({ ...data, error, descricaoDoErro: 'Exeption estourada. Repositorio forgotToken', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            return { status: false, error: error, msg: "Erro ao buscar Token!" };
        }
    }

    async getByLimitQueryCliente(data) {
        try {
            const token = await knex('tab_perdeu_senha').select([
                'tab_perdeu_senha.*',
                'tab_usuarios.email as email',
                'TabPerfilClientes.nome as nome'
            ]).where({ "tab_perdeu_senha.deletado": 0 })
                .andWhere('tab_usuarios.email', 'like', `%${data.query}%`)
                .whereNot('tab_usuarios.role', roles.system).andWhereNot('tab_usuarios.role', roles.admin).andWhereNot('tab_usuarios.role', roles.administrativo).andWhereNot('tab_usuarios.role', roles.operacional).andWhereNot('tab_usuarios.role', roles.financeiro).andWhere('TabPerfilClientes.cliente_id', data.cliente_id)

                .orWhere('TabPerfilClientes.nome', 'like', `%${data.query}%`).andWhere({ "tab_perdeu_senha.deletado": 0 })
                .whereNot('tab_usuarios.role', roles.system).andWhereNot('tab_usuarios.role', roles.admin).andWhereNot('tab_usuarios.role', roles.administrativo).andWhereNot('tab_usuarios.role', roles.operacional).andWhereNot('tab_usuarios.role', roles.financeiro)

                .andWhere('TabPerfilClientes.cliente_id', data.cliente_id)
                .innerJoin('tab_usuarios', 'tab_usuarios.id', 'tab_perdeu_senha.user_id')
                .innerJoin('TabPerfilClientes', 'TabPerfilClientes.user_id', 'tab_usuarios.id')
                .limit(data.limit).offset(data.offset).orderBy('tab_perdeu_senha.data_criacao', 'desc')
            if (token.length > 0) {
                return { status: true, exit: true, msg: "Solicitações de recuperação de senha localizados!", data: token };
            } else {
                return { status: false, exit: false, msg: "Solicitações de recuperação de senha não encontrados!" };
            }
        } catch (error) {
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(error);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            Log({ ...data, error, descricaoDoErro: 'Exeption estourada. Repositorio forgotToken', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            return { status: false, error: error, msg: "Erro ao buscar Token!" };
        }
    }

    async getByUserId(data) {
        try {
            const token = await knex('tab_perdeu_senha').select().where({ user_id: data.id }).andWhere({ deletado: 0 });
            if (token.length > 0) {
                return { status: true, exit: true, msg: "Token encontrado!", token: token[0] };
            } else {
                return { status: false, exit: false, msg: "Token não encontrado!" };
            }
        } catch (error) {
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(error);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            Log({ ...data, error, descricaoDoErro: 'Exeption estourada. Repositorio forgotToken', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            return { status: false, error: error, msg: "Erro ao buscar Token!" };
        }
    }

    async delete(data) {
        try {
            await knex('tab_perdeu_senha').update({ deletado: 1, data_atualizacao: dateNow() }).where({ token: data });
            return { status: true, msg: "Token deletado com sucesso!" };
        } catch (error) {
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(error);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            Log({ ...data, error, descricaoDoErro: 'Exeption estourada. Repositorio forgotToken', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            return { status: false, error: error, msg: "Erro ao deletar token!" };
        }
    }

    async deleteByUserId(data) {
        try {
            await knex('tab_perdeu_senha').update({ deletado: 1, data_atualizacao: dateNow() }).where({ user_id: data });
            return { status: true, msg: "Token deletado com sucesso!" };
        } catch (error) {
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(error);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            Log({ ...data, error, descricaoDoErro: 'Exeption estourada. Repositorio forgotToken', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            return { status: false, error: error, msg: "Erro ao deletar token!" };
        }
    }
}

module.exports = new ForgotRepositorio();
