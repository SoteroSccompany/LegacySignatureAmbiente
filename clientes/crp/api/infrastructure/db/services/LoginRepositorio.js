
require('dotenv/config');
const knex = require("../config/databaseConection")();
const Log = require('../../../@core/usecase/Logs/databaseLog')
const ErrorStackParser = require('error-stack-parser');
const dateNow = require('../../gateways/functions/data/getToday');
const { confiDoisFatores } = require('../../../certs/index');
class RepositoryUsers {

    async create(data, trxExterna = null) {
        try {
            const trx = trxExterna || await knex.transaction();
            try {
                await trx('tab_login').update({ data_atualizacao: dateNow(), deletado: 1 }).where({ user_id: data.login.user_id });
                await trx('tab_perdeu_senha').update({ data_atualizacao: dateNow(), deletado: 1 }).where({ user_id: data.login.user_id });
                await trx('tab_login').update({ data_atualizacao: dateNow(), deletado: 1 }).where({ refresh_token: data.login.refresh_token });
                if (data.desafio) {
                    await trx('tab_desafio_autenticacao').update({ deletado: 1 }).where("user_id", data.login.user_id)
                        .andWhere("tipo_desafio", confiDoisFatores.desafio.login).andWhere("usado", false).andWhere("deletado", 0);
                    await trx('tab_desafio_autenticacao').insert(data.desafio);
                }
                await trx.insert({
                    id: data.login.id,
                    token: data.login.token,
                    refresh_token: data.login.refresh_token,
                    user_id: data.login.user_id,
                    transito: data.login.transito,
                    session_id: data.login.session_id,
                    desafio_id: data.desafio ? data.desafio.id : null,
                    data_criacao: dateNow(),
                    data_atualizacao: dateNow(),
                    deletado: 0
                }).table('tab_login');
                if (!trxExterna) await trx.commit();
                return { status: true, msg: "Log criado com sucesso!" };
            } catch (error) {
                console.log(error)
                if (!trxExterna) await trx.rollback();
                return { status: false, error: error, msg: "Erro ao criar Token!" };
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
            return { status: false, error: error, msg: "Erro ao criar usuário!" };
        }
    }

    async getById(data) {
        try {
            const user = await knex('tab_login').select().where({ id: data.id }).andWhere({ deletado: 0 });
            if (user.length > 0) {
                return { status: true, exit: true, msg: "Token encontrado!", data: user };
            } else {
                return { status: true, exit: false, msg: "Token não encontrado!" };
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

    async getByUserId(data) {
        try {
            const user = await knex('tab_login').select(['tab_login.*', 'tab_usuarios.role']).where({ "tab_login.user_id": data.id }).andWhere({ "tab_login.deletado": 0 })
                .innerJoin('tab_usuarios', 'tab_usuarios.id', 'tab_login.user_id');
            if (user.length > 0) {
                return { status: true, exit: true, msg: "Token encontrado!", data: user };
            } else {
                return { status: true, exit: false, msg: "Token não encontrado!" };
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

    async getUserId(data) {
        try {
            const user = await knex('tab_login').select('id', 'desafio_id', 'session_id').where({ "user_id": data.id }).andWhere({ "tab_login.deletado": 0 }).first();
            if (user) return { status: true, data: user };
            return { status: false, msg: "Login não localizado, realize autenticação novamente!" };
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

    async getLoginByUserId(data) {
        try {
            const user = await knex('tab_login').select(['tab_login.*', 'tab_usuarios.role']).where({ "tab_login.user_id": data.id }).andWhere({ "tab_login.deletado": 0 })
                .innerJoin('tab_usuarios', 'tab_usuarios.id', 'tab_login.user_id').first();
            if (user) {
                return { status: true, exit: true, msg: "Token encontrado!", data: user };
            } else {
                return { status: true, exit: false, msg: "Token não encontrado!" };
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

    async getByToken(data) {
        try {
            const user = await knex('tab_login').select().where({ token: data.token }).andWhere({ deletado: 0 });
            if (user.length > 0) {
                return { status: true, exit: true, msg: "Token encontrado!", data: user };
            } else {
                return { status: true, exit: false, msg: "Token não encontrado!" };
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
            return { status: false, error: error, msg: "Erro ao buscar token!" };
        }
    }

    async updateSessionId(data) {
        try {
            await knex('tab_login').update({ session_id: data.session_id, data_atualizacao: dateNow() }).where({ user_id: data.user_id }).andWhere({ deletado: 0 });
            return { status: true, exit: true, msg: "Session id atualizado!" };

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
            return { status: false, error: error, msg: "Erro ao atualizar o session id do login!" };
        }

    }


    async updateTimeToken(data) {
        try {
            await knex('tab_login').update({ data_atualizacao: data.data_atualizacao }).where({ id: data.id }).andWhere({ deletado: 0 });
            return { status: true, exit: true, msg: "Token encontrado!" };

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
            return { status: false, error: error, msg: "Erro ao realizar o logOut!" };
        }

    }


    async getByTokenOnly(data) {
        try {
            const user = await knex('tab_login').select().where({ token: data.token }).andWhere({ deletado: 0 }).first();
            if (user) {
                return { status: true, exit: true, msg: "Token encontrado!", data: user };
            } else {
                return { status: true, exit: false, msg: "Token não encontrado!" };
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
            return { status: false, error: error, msg: "Erro ao buscar token!" };
        }
    }

    async updateToken(data) {
        try {
            await knex('tab_login').update({ token: data.token }).where({ refresh_token: data.refresh_token }).andWhere({ deletado: 0 });
            return { status: true, exit: true, msg: "Token encontrado!" };

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
            return { status: false, error: error, msg: "Erro ao realizar o logOut!" };
        }

    }

    async deleteByUserId(data) {
        try {
            const checkToken = await this.getByToken(data)
            if (!checkToken.exit) return { status: false, msg: "Token não encontrado!" };
            await knex('tab_login').update({ deletado: true, data_atualizacao: dateNow() }).where({ user_id: data.user_id }).andWhere({ deletado: 0 });
            return { status: true, exit: true, msg: "Token encontrado!" };

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
            return { status: false, error: error, msg: "Erro ao realizar o logOut!" };
        }
    }

    async deleteByToken(data) {
        try {
            // await knex('tab_login').update({ deletado: true, data_atualizacao: dateNow() }).where({ token: data.token }).andWhere({ deletado: 0 });
            // return { status: true, exit: true, msg: "Token encontrado!" };
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
            return { status: false, error: error, msg: "Erro ao realizar o logOut!" };
        }
    }

    async deleteAcessoLeitorById(data) {
        try {
            await knex('TabLeitoresAcesso').update({ deletado: true, data_atualizacao: dateNow() }).where({ leitor_id: data.id }).andWhere({ deletado: 0 });
            return { status: true, exit: true, msg: "Token encontrado!" };
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
            return { status: false, error: error, msg: "Erro ao realizar o logOut!" };
        }
    }

    async deleteByUserIdLogOut(data) {
        try {
            await knex('tab_login').update({ deletado: 1, data_atualizacao: dateNow() }).where({ user_id: data.user_id }).andWhere({ deletado: 0 });
            return { status: true, exit: true, msg: "LogOut realizado!" };

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
            return { status: false, error: error, msg: "Erro ao realizar o logOut!" };
        }
    }

    async deleteToken(data) {
        try {
            const checkToken = await this.getByToken(data)
            if (!checkToken.exit) return { status: false, msg: "Token não encontrado!" };
            await knex('tab_login').delete().where({ token: data.token }).andWhere({ deletado: 0 });
            return { status: true, exit: true, msg: "Token encontrado!" };

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
            return { status: false, error: error, msg: "Erro ao realizar o logOut!" };
        }
    }



}

module.exports = new RepositoryUsers();
