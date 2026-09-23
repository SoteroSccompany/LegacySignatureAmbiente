
require('dotenv/config');
const knex = require("../config/databaseConection")();
const Log = require('../../../@core/usecase/Logs/databaseLog')
const ErrorStackParser = require('error-stack-parser');
const dateNow = require('../../gateways/functions/data/getToday')
const { roles, views } = require('../../../certs');
const BaseRepository = require('.');

class RepositoryUsers extends BaseRepository {

    constructor() {
        super({ knexOrTransaction: knex, tableName: 'tab_usuarios' });
    }


    async blockUser(data) {
        try {
            const check = await this.getById(data);
            if (check.status && check.exit) {
                await knex.update({ bloqueado: 1, data_atualizacao: dateNow() }).where({ id: data.id }).table('tab_usuarios');
                return { status: true, msg: "Usuário bloqueado com sucesso!" };
            } else {
                return { status: false, msg: "Usuário não encontrado!" };
            }
        } catch (error) {
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(error);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            Log({ ...data, error, descricaoDoErro: 'Exeption estourada. Repositorio user', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            return { status: false, error: error, msg: "Erro ao bloquear usuário!" };
        }
    }

    async create(data) {
        try {

            await knex.insert({
                id: data.id, email: data.email, senha: data.senha, data_criacao: data.data_criacao,
                data_atualizacao: data.data_criacao, role: data.role, email_verificado: data.email_verificado, bloqueado: data.bloqueado,
                deletado: false
            }).table('tab_usuarios');
            return { status: true, msg: "Usuário criado com sucesso!" };
        } catch (error) {
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(error);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            Log({ ...data, error, descricaoDoErro: 'Exeption estourada. Repositorio user', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            return { status: false, error: error, msg: "Erro ao criar usuário!" };
        }
    }

    async createTrx(data, trx) {
        try {
            await trx.insert({
                id: data.id, email: data.email, senha: data.senha, data_criacao: data.data_criacao, dois_fatores: false,
                data_atualizacao: data.data_criacao, role: data.role, email_verificado: data.email_verificado, bloqueado: data.bloqueado,
                trocar_senha: data.trocar_senha,
                deletado: false
            }).table('tab_usuarios');
            return { status: true, msg: "Usuário criado com sucesso!" };
        } catch (error) {
            console.log(error)
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(error);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            Log({ ...data, error, descricaoDoErro: 'Exeption estourada. Repositorio user', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            return { status: false, error: error, msg: "Erro ao criar usuário!" };
        }
    }

    async createCliente(data) {
        try {
            const trx = await knex.transaction();
            try {
                await trx('tab_usuarios').insert(data.user);
                await trx('TabPerfilClientes').insert(data.perfil);
                await trx.commit();
                return { status: true, msg: "Usuário criado com sucesso!" };
            } catch (err) {
                console.log(err)
                await trx.rollback();
                return { status: false, error: err, msg: "Erro ao criar usuário!" };
            }
        } catch (error) {
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(error);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            Log({ ...data, error, descricaoDoErro: 'Exeption estourada. Repositorio user', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            return { status: false, error: error, msg: "Erro ao criar usuário!" };
        }
    }


    async updateCliente(data) {
        try {
            const trx = await knex.transaction();
            try {
                await trx('tab_usuarios').update(data.user).where({ id: data.user.id });
                await trx('TabPerfilClientes').update(data.perfil).where({ id: data.perfil.id });
                await trx.commit();
                return { status: true, msg: "Usuário atualizado com sucesso!" };
            } catch (err) {
                console.log(err)
                await trx.rollback();
                return { status: false, error: err, msg: "Erro ao criar usuário!" };
            }
        } catch (error) {
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(error);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            Log({ ...data, error, descricaoDoErro: 'Exeption estourada. Repositorio user', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            return { status: false, error: error, msg: "Erro ao criar usuário!" };
        }
    }

    async getByEmail(data) {
        try {
            const user = await knex.select(
                'tab_usuarios.id', 'tab_usuarios.email', 'tab_usuarios.dois_fatores', 'tab_usuarios.codigo_hash', 'tab_usuarios.email', 'tab_usuarios.email', 'tab_usuarios.senha', 'tab_usuarios.role', 'tab_usuarios.email_verificado', 'tab_usuarios.bloqueado', 'tab_usuarios.data_criacao', 'tab_usuarios.data_atualizacao', 'tab_usuarios.trocar_senha',
            ).where({ "tab_usuarios.email": data.email }).andWhere({ "tab_usuarios.deletado": 0 })
                .table('tab_usuarios');
            if (user.length > 0) {
                return { status: true, exit: true, msg: "Usuário encontrado!", data: user[0] };
            } else {
                return { status: true, exit: false, msg: "Usuário não encontrado!" };
            }
        } catch (error) {
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(error);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            Log({ ...data, error, descricaoDoErro: 'Exeption estourada. Repositorio user', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            return { status: false, error: error, msg: "Erro ao buscar usuário!" };
        }
    }

    async getById(data) {
        try {
            const user = await knex.select().where({ id: data.id }).andWhere({ deletado: 0 }).table('tab_usuarios');
            if (user.length > 0) {
                return { status: true, exit: true, msg: "Usuário encontrado!", data: user };
            } else {
                return { status: true, exit: false, msg: "Usuário não encontrado!" };
            }
        } catch (error) {
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(error);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            Log({ ...data, error, descricaoDoErro: 'Exeption estourada. Repositorio user', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            return { status: false, error: error, msg: "Erro ao buscar usuário!" };
        }
    }

    async getAll() {
        try {

            const user = await knex.select('id', 'email', 'bloqueado', 'email_verificado', 'role', 'data_criacao', 'data_atualizacao').where({ deletado: 0 }).table('tab_usuarios');
            if (user.length > 0) {
                return { status: true, exit: true, msg: "Usuário encontrado!", data: user };
            } else {
                return { status: true, exit: false, msg: "Usuário não encontrado!" };
            }
        } catch (error) {
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(error);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            Log({ error, descricaoDoErro: 'Exeption estourada. Repositorio user', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            return { status: false, error: error, msg: "Erro ao buscar usuário!" };
        }
    }

    async getAllAdmin() {
        try {
            const user = await knex.select().where({ deletado: 0 }).andWhere({ role: 0 }).table('tab_usuarios');
            if (user.length > 0) {
                return { status: true, exit: true, msg: "Usuário encontrado!", data: user };
            } else {
                return { status: true, exit: false, msg: "Usuário não encontrado!" };
            }
        } catch (error) {
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(error);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            Log({ error, descricaoDoErro: 'Exeption estourada. Repositorio user', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            return { status: false, error: error, msg: "Erro ao buscar usuário!" };
        }
    }

    async getAllLimitInter(data) {
        try {

            const user = await knex('tab_usuarios').select('id', 'email', 'bloqueado', 'email_verificado', 'role', 'data_criacao', 'data_atualizacao').where({ deletado: 0 })
                .whereNot({ role: roles.cliente }).andWhereNot({ role: roles.clienteOperacional }).andWhereNot({ role: roles.clientePrestador }).andWhereNot({ role: roles.system })
                .limit(data.limit).offset(data.offset).orderBy('data_criacao', 'desc');
            if (user.length > 0) {
                const qnt = await knex.count("id as total").where({ deletado: false }).table('tab_usuarios');
                const totalPage = Math.ceil(qnt[0].total / data.limit);
                return { status: true, exit: true, data: user, msg: "Usuarios encontrados com sucesso!", pages: totalPage, totalRegisters: qnt[0].total }
            } else {
                return { status: false, exit: false, msg: "Usuário não encontrado!" };
            }
        } catch (error) {
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(error);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            Log({ ...data, error, descricaoDoErro: 'Exeption estourada. Repositorio user', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            return { status: false, error: error, msg: "Erro ao buscar usuário!" };
        }
    }

    async getAllLimitInterClienteGet(data) {
        try {
            const user = await knex('view_clientes_usuarios').where({ 'view_clientes_usuarios.cliente_id': data.cliente_id }).andWhere({ 'view_clientes_usuarios.deletado': 0 })
                .limit(data.limit).offset(data.offset).orderBy('view_clientes_usuarios.data_criacao', 'desc');
            if (user.length > 0) {
                return { status: true, exit: true, data: user, msg: "Usuarios encontrados com sucesso!" }
            } else {
                return { status: false, msg: "Nenhum usuário encontrado!" }
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
            Log({ ...data, error, descricaoDoErro: 'Exeption estourada. Repositorio user', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            return { status: false, error: error, msg: "Erro ao buscar usuário!" };
        }
    }

    async getCountClientesUser(data) {
        try {
            const user = await knex('view_clientes_usuarios').where({ 'view_clientes_usuarios.cliente_id': data.cliente_id })
                .andWhere({ 'view_clientes_usuarios.deletado': 0 }).andWhere({ 'view_clientes_usuarios.bloqueado': 0 })
                .whereNot({ 'view_clientes_usuarios.role': roles.clientePrestador })
                .count('view_clientes_usuarios.id as total');
            if (user.length > 0) {
                return { status: true, exit: true, data: user[0].total, msg: "Usuarios encontrados com sucesso!" }
            } else {
                return { status: false, msg: "Nenhum usuário encontrado!" }
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
            Log({ ...data, error, descricaoDoErro: 'Exeption estourada. Repositorio user', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            return { status: false, error: error, msg: "Erro ao buscar usuário!" };
        }
    }

    async getAllLimitInterClienteQueryGet(data) {
        try {
            const user = await knex('view_clientes_usuarios')
                .where({ 'view_clientes_usuarios.cliente_id': data.cliente_id }).andWhere({ 'view_clientes_usuarios.deletado': 0 }).andWhere('view_clientes_usuarios.email', 'like', `%${data.query}%`)
                .orWhere('view_clientes_usuarios.nome', 'like', `%${data.query}%`).andWhere({ 'view_clientes_usuarios.deletado': 0 }).andWhere({ 'view_clientes_usuarios.cliente_id': data.cliente_id })
                .orWhere('view_clientes_usuarios.cpf', 'like', `%${data.query.replace(/\D/g, '')}%`).andWhere({ 'view_clientes_usuarios.deletado': 0 }).andWhere({ 'view_clientes_usuarios.cliente_id': data.cliente_id })
                .orWhere('view_clientes_usuarios.cep', 'like', `%${data.query.replace(/\D/g, '')}%`).andWhere({ 'view_clientes_usuarios.deletado': 0 }).andWhere({ 'view_clientes_usuarios.cliente_id': data.cliente_id })
                .orWhere('view_clientes_usuarios.telefone', 'like', `%${data.query.replace(/\D/g, '')}%`).andWhere({ 'view_clientes_usuarios.deletado': 0 }).andWhere({ 'view_clientes_usuarios.cliente_id': data.cliente_id })
                .limit(data.limit).offset(data.offset).orderBy('view_clientes_usuarios.data_criacao', 'desc');
            if (user.length > 0) {
                return { status: true, exit: true, data: user, msg: "Usuarios encontrados com sucesso!" }
            } else {
                return { status: false, exit: false, msg: "Usuário não encontrado!" };
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
            Log({ ...data, error, descricaoDoErro: 'Exeption estourada. Repositorio user', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            return { status: false, error: error, msg: "Erro ao buscar usuário!" };
        }
    }

    async getAllLimitInterCliente(data) {
        try {
            const user = await knex('tab_usuarios').select('tab_usuarios.id', 'TabPerfilClientes.nome', 'tab_usuarios.email', 'tab_usuarios.bloqueado', 'tab_usuarios.email_verificado', 'tab_usuarios.role', 'tab_usuarios.data_criacao', 'tab_usuarios.data_atualizacao').where({ "tab_usuarios.deletado": 0 })
                .whereNot({ "tab_usuarios.role": roles.admin }).andWhereNot({ "tab_usuarios.role": roles.administrativo }).andWhereNot({ "tab_usuarios.role": roles.financeiro }).andWhereNot({ "tab_usuarios.role": roles.system }).andWhereNot({ "tab_usuarios.role": roles.operacional })
                .andWhere('TabPerfilClientes.cliente_id', data.cliente_id).innerJoin('TabPerfilClientes', 'TabPerfilClientes.user_id', 'tab_usuarios.id')
                .limit(data.limit).offset(data.offset).orderBy('tab_usuarios.data_criacao', 'desc');
            if (user.length > 0) {
                const qnt = await knex.count("id as total").where({ deletado: false }).table('tab_usuarios');
                const totalPage = Math.ceil(qnt[0].total / data.limit);
                return { status: true, exit: true, data: user, msg: "Usuarios encontrados com sucesso!", pages: totalPage, totalRegisters: qnt[0].total }
            } else {
                return { status: false, exit: false, msg: "Usuário não encontrado!" };
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
            Log({ ...data, error, descricaoDoErro: 'Exeption estourada. Repositorio user', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            return { status: false, error: error, msg: "Erro ao buscar usuário!" };
        }
    }

    async getAllLimitInterClienteQuery(data) {
        try {
            const user = await knex('tab_usuarios').select('tab_usuarios.id', 'TabPerfilClientes.nome', 'tab_usuarios.email', 'tab_usuarios.bloqueado', 'tab_usuarios.email_verificado', 'tab_usuarios.role', 'tab_usuarios.data_criacao', 'tab_usuarios.data_atualizacao')
                .where({ "tab_usuarios.deletado": 0 })
                .whereNot({ "tab_usuarios.role": roles.admin }).andWhereNot({ "tab_usuarios.role": roles.administrativo }).andWhereNot({ "tab_usuarios.role": roles.financeiro }).andWhereNot({ "tab_usuarios.role": roles.system }).andWhereNot({ "tab_usuarios.role": roles.operacional })
                .andWhere('TabPerfilClientes.cliente_id', data.cliente_id).andWhere('tab_usuarios.email', 'like', `%${data.query}%`)

                .orWhere('TabPerfilClientes.nome', 'like', `%${data.query}%`).andWhere({ "tab_usuarios.deletado": 0 }).andWhere({ "tab_usuarios.deletado": 0 })
                .whereNot({ "tab_usuarios.role": roles.admin }).andWhereNot({ "tab_usuarios.role": roles.administrativo }).andWhereNot({ "tab_usuarios.role": roles.financeiro }).andWhereNot({ "tab_usuarios.role": roles.system }).andWhereNot({ "tab_usuarios.role": roles.operacional })

                .andWhere('TabPerfilClientes.cliente_id', data.cliente_id).innerJoin('TabPerfilClientes', 'TabPerfilClientes.user_id', 'tab_usuarios.id')
                .limit(data.limit).offset(data.offset).orderBy('tab_usuarios.data_criacao', 'desc');
            if (user.length > 0) {
                const qnt = await knex.count("id as total").where({ deletado: false }).table('tab_usuarios');
                const totalPage = Math.ceil(qnt[0].total / data.limit);
                return { status: true, exit: true, data: user, msg: "Usuarios encontrados com sucesso!", pages: totalPage, totalRegisters: qnt[0].total }
            } else {
                return { status: false, exit: false, msg: "Usuário não encontrado!" };
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
            Log({ ...data, error, descricaoDoErro: 'Exeption estourada. Repositorio user', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            return { status: false, error: error, msg: "Erro ao buscar usuário!" };
        }
    }

    async getUsuarioQuery(data) {
        try {
            return await super.getByQueryTableUniqWhereNot(data, 'tab_usuarios', 'role', roles.system);
        } catch (error) {
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(error);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            Log({ ...data, error, descricaoDoErro: 'Exeption estourada. Repositorio user', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            return { status: false, error: error, msg: "Erro ao buscar usuário!" };
        }
    }

    async getUsuarioQueryEmail(data) {
        try {
            return await super.getByQueryTable(data, views.view_troca_email);
        } catch (error) {
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(error);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            Log({ ...data, error, descricaoDoErro: 'Exeption estourada. Repositorio user', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            return { status: false, error: error, msg: "Erro ao buscar usuário!" };
        }
    }

    async EmailAuth(data) {
        try {
            const user = await knex.select().where({ id: data.id }).andWhere({ deletado: 0 }).table('tab_usuarios');
            if (user.length > 0) {
                if (user[0].email_verificado === 0) {
                    try {

                        await knex.update({ email_verificado: 1, bloqueado: 0, data_atualizacao: dateNow() }).where({ id: data.id }).andWhere({ deletado: 0 }).table('tab_usuarios');
                        return { status: true, exit: true, msg: "Email autenticado com sucesso!" };
                    } catch (error) {
                        Log({ error: { error }, identifier: 'Erro Reposistorio User: EmailAuth' })
                        return { status: false, error: error, msg: "Erro ao autenticar email!" };
                    }
                } else {
                    return { status: false, exit: true, msg: "Email já autenticado!" };
                }
            } else {
                return { status: false, exit: false, msg: "Usuário não encontrado!" };
            }
        } catch (error) {
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(error);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            Log({ ...data, error, descricaoDoErro: 'Exeption estourada. Repositorio user', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            return { status: false, error: error, msg: "Erro ao buscar usuário!" };
        }
    }

    async updatePassword(data) {
        try {
            const check = await this.getById(data);
            if (check.status && check.exit) {
                const trx = await knex.transaction();
                try {
                    await trx.update({ senha: data.senha, trocar_senha: false, data_atualizacao: dateNow() }).where({ id: data.id }).table('tab_usuarios');
                    await trx.update({ deletado: true, data_atualizacao: dateNow() }).where({ user_id: data.id }).table('tab_perdeu_senha');
                    await trx.commit();
                    return { status: true, msg: "Senha atualizada com sucesso!" };
                } catch (err) {
                    typeof err;
                    await trx.rollback();
                    return { status: false, msg: "Erro ao atualizar senha!" };
                }
            } else {
                return { status: false, msg: "Usuário não encontrado!" };
            }
        } catch (error) {
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(error);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            Log({ ...data, error, descricaoDoErro: 'Exeption estourada. Repositorio user', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            return { status: false, error: error, msg: "Erro ao atualizar senha!" };
        }
    }

    async changeEmail(data) {
        try {
            const check = await this.getById(data);
            if (check.status && check.exit) {
                await knex.update({ email: data.email, data_atualizacao: dateNow() }).where({ id: data.id }).table('tab_usuarios');
                return { status: true, msg: "E-mail atualizado com sucesso!" };
            } else {
                return { status: false, msg: "Usuário não encontrado!" };
            }
        } catch (error) {
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(error);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            Log({ ...data, error, descricaoDoErro: 'Exeption estourada. Repositorio user', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            return { status: false, error: error, msg: "Erro ao atualizar e-mail!" };
        }

    }

    async changeBlock(data) {
        try {
            const check = await this.getById(data);
            if (check.status && check.exit) {
                await knex.update({ bloqueado: data.bloqueado, data_atualizacao: dateNow() }).where({ id: data.id }).table('tab_usuarios');
                const msg = data.bloqueado == 1 ? "Usuário bloqueado com sucesso!" : "Usuário desbloqueado com sucesso!";
                return { status: true, msg };
            } else {
                return { status: false, msg: "Usuário não encontrado!" };
            }
        } catch (error) {
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(error);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            Log({ ...data, error, descricaoDoErro: 'Exeption estourada. Repositorio user', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            return { status: false, error: error, msg: "Erro ao atualizar status!" };
        }

    }

    async changeRole(data) {
        try {
            const check = await this.getById(data);
            if (check.status && check.exit) {
                await knex.update({ role: data.role, data_atualizacao: dateNow() }).where({ id: data.id }).table('tab_usuarios');
                return { status: true, msg: "Permissão atualizada com sucesso!" };
            } else {
                return { status: false, msg: "Usuário não encontrado!" };
            }
        } catch (error) {
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(error);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            Log({ ...data, error, descricaoDoErro: 'Exeption estourada. Repositorio user', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            return { status: false, error: error, msg: "Erro ao atualizar status!" };
        }

    }

    async delete(data) {
        try {
            delete data.tokenValidator;
            delete data.novaSenha;
            const check = await this.getById(data);
            if (check.status && check.exit) {
                const trx = await knex.transaction();
                try {
                    await trx('tab_usuarios').update(data).where({ id: data.id });
                    await trx('tab_login').update({ deletado: true, data_atualizacao: dateNow() }).where({ user_id: data.id });
                    await trx.commit();
                    return { status: true, msg: "Usuário deletado com sucesso!" };
                } catch (err) {
                    await trx.rollback();
                    return { status: false, msg: "Erro ao deletar Data!" };
                }
            } else {
                return { status: false, msg: "Usuário não encontrado!" };
            }
        } catch (error) {
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(error);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            Log({ ...data, error, descricaoDoErro: 'Exeption estourada. Repositorio user', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            return { status: false, error: error, msg: "Erro ao deletar Data!" };
        }
    }





}

module.exports = new RepositoryUsers();
