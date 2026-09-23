const Log = require('../../../@core/usecase/Logs/databaseLog');
const ErrorStackParser = require('error-stack-parser');
const dateNow = require('../../gateways/functions/data/getToday');


class BaseRepository {

    #knexOrTransaction;
    #tableName;


    constructor(props) {
        this.#knexOrTransaction = props.knexOrTransaction;
        this.#tableName = props.tableName;
    }

    async GetAll() {
        try {
            const data = await this.#knexOrTransaction(this.#tableName).where({ deletado: false });
            return { status: true, data, msg: "Busca realizada com sucesso!" }
        } catch (error) {
            console.log(error)
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(error);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            Log({ ...data, error, descricaoDoErro: 'Exeption estourada. RepositorioEquipamentos - getEquipamentosByLimit', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            return { status: false, error: error, msg: "Não foi possivel realizar a busca!" }
        }
    }


    async getByQuery(data) {
        try {
            // Validação dos parâmetros obrigatórios
            if (!data.sort || !data.sort_dir) {
                return { status: false, error: 'Parâmetros sort e sort_dir são obrigatórios', msg: "Parâmetros inválidos!" }
            }

            // Validação do sort_dir
            if (!['asc', 'desc'].includes(data.sort_dir.toLowerCase())) {
                return { status: false, error: 'sort_dir deve ser "asc" ou "desc"', msg: "Parâmetros inválidos!" }
            }

            // Verificar se a coluna de ordenação existe
            const colunaExiste = await this.#knexOrTransaction.schema.hasColumn(this.#tableName, data.sort);
            if (!colunaExiste) {
                return { status: false, error: `Coluna "${data.sort}" não existe na tabela`, msg: "Parâmetros inválidos!" }
            }

            // Validar page e per_page
            const page = parseInt(data.page) || 0;
            const perPage = parseInt(data.per_page) || 15;

            const query = this.#knexOrTransaction(this.#tableName)
                .where({ deletado: false })
                .orderBy(data.sort, data.sort_dir)
                .limit(perPage)
                .offset(page);

            // Validação do filtro apenas se não for null e não for string vazia
            if (data.filter && data.filter.trim() !== '' && data.search && data.search.trim() !== '') {
                const colunas = await this.#knexOrTransaction.schema.hasColumn(this.#tableName, data.filter);
                if (colunas) {
                    query.andWhere(function () {
                        this.orWhere(data.filter, 'like', `%${data.search.trim()}%`)
                            .andWhere('deletado', false);
                    });
                }
            }

            const results = await query;
            const msg = results.length > 0 ? "Busca realizada com sucesso!" : "Nenhum registro encontrado!";
            const status = results.length > 0;
            return { status, data: results, msg }
        } catch (error) {
            console.log(error)
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(error);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            Log({ ...data, error, descricaoDoErro: 'Exeption estourada. RepositorioEquipamentos - getEquipamentosByLimit', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            return { status: false, error: error, msg: "Não foi possivel realizar a busca!" }
        }

    }

    async getByQueryTable(data, tableName) {
        try {
            // Validação dos parâmetros obrigatórios
            if (!data.sort || !data.sort_dir) {
                return { status: false, error: 'Parâmetros sort e sort_dir são obrigatórios', msg: "Parâmetros inválidos!" }
            }

            // Validação do sort_dir
            if (!['asc', 'desc'].includes(data.sort_dir.toLowerCase())) {
                return { status: false, error: 'sort_dir deve ser "asc" ou "desc"', msg: "Parâmetros inválidos!" }
            }

            // Verificar se a coluna de ordenação existe
            const colunaExiste = await this.#knexOrTransaction.schema.hasColumn(tableName, data.sort);
            if (!colunaExiste) {
                return { status: false, error: `Coluna "${data.sort}" não existe na tabela`, msg: "Parâmetros inválidos!" }
            }

            // Validar page e per_page
            const page = parseInt(data.page) || 0;
            const perPage = parseInt(data.per_page) || 15;

            const query = this.#knexOrTransaction(tableName)
                .where({ deletado: false })
                .orderBy(data.sort, data.sort_dir)
                .limit(perPage)
                .offset(page);

            // Validação do filtro apenas se não for null e não for string vazia
            if (data.filter && data.search && data.filter.trim() !== '' && data.search.trim() !== '') {
                const colunas = await this.#knexOrTransaction.schema.hasColumn(tableName, data.filter);
                if (colunas) {
                    query.andWhere(function () {
                        this.orWhere(data.filter, 'like', `%${data.search.trim()}%`)
                            .andWhere('deletado', false);
                    });
                }
            }
            const results = await query;
            const msg = results.length > 0 ? "Busca realizada com sucesso!" : "Nenhum registro encontrado!";
            const status = results.length > 0;
            return { status, data: results, msg }
        } catch (error) {
            console.log(error)
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(error);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            Log({ ...data, error, descricaoDoErro: 'Exeption estourada. RepositorioEquipamentos - getEquipamentosByLimit', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            return { status: false, error: error, msg: "Não foi possivel realizar a busca!" }
        }

    }

    async getByQueryTableUniqWhere(data, tableName, field, condition) {
        try {
            // Validação dos parâmetros obrigatórios
            if (!data.sort || !data.sort_dir) {
                return { status: false, error: 'Parâmetros sort e sort_dir são obrigatórios', msg: "Parâmetros inválidos!" }
            }

            // Validação do sort_dir
            if (!['asc', 'desc'].includes(data.sort_dir.toLowerCase())) {
                return { status: false, error: 'sort_dir deve ser "asc" ou "desc"', msg: "Parâmetros inválidos!" }
            }

            // Verificar se a coluna de ordenação existe
            const colunaExiste = await this.#knexOrTransaction.schema.hasColumn(tableName, data.sort);
            if (!colunaExiste) {
                return { status: false, error: `Coluna "${data.sort}" não existe na tabela`, msg: "Parâmetros inválidos!" }
            }

            // Validar page e per_page
            const page = parseInt(data.page) || 0;
            const perPage = parseInt(data.per_page) || 15;

            const query = this.#knexOrTransaction(tableName)
                .where({ deletado: false })
                .andWhere(field, condition)
                .orderBy(data.sort, data.sort_dir)
                .limit(perPage)
                .offset(page);

            // Validação do filtro apenas se não for null e não for string vazia
            if (data.search && data.filter) {
                const colunas = await this.#knexOrTransaction.schema.hasColumn(tableName, data.sort);
                if (colunas) {
                    query.andWhere(function () {
                        const string = data.search.replace(/'/g, "''").replace(/;/g, "").replace(/--/g, "").replace(/"/g, "").replace(/`/g, "").replace("%", "").replace("_", "").replace("=", "").replace("<", "")
                        this.orWhere(data.filter, 'like', `%${string}%`)
                            .andWhere('deletado', false);
                    });
                }
            }
            const results = await query;
            const msg = results.length > 0 ? "Busca realizada com sucesso!" : "Nenhum registro encontrado!";
            const status = results.length > 0;
            return { status, data: results, msg }
        } catch (error) {
            console.log(error)
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(error);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            Log({ ...data, error, descricaoDoErro: 'Exeption estourada. RepositorioEquipamentos - getEquipamentosByLimit', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            return { status: false, error: error, msg: "Não foi possivel realizar a busca!" }
        }

    }

    async getByQueryTableMultipleWhere(data, tableName, conditions) {//[[field, condition], [field, condition]]}
        try {
            // Validação dos parâmetros obrigatórios
            if (!data.sort || !data.sort_dir) {
                return { status: false, error: 'Parâmetros sort e sort_dir são obrigatórios', msg: "Parâmetros inválidos!" }
            }

            // Validação do sort_dir
            if (!['asc', 'desc'].includes(data.sort_dir.toLowerCase())) {
                return { status: false, error: 'sort_dir deve ser "asc" ou "desc"', msg: "Parâmetros inválidos!" }
            }

            // Verificar se a coluna de ordenação existe
            const colunaExiste = await this.#knexOrTransaction.schema.hasColumn(tableName, data.sort);
            if (!colunaExiste) {
                return { status: false, error: `Coluna "${data.sort}" não existe na tabela`, msg: "Parâmetros inválidos!" }
            }

            // Validar page e per_page
            const page = parseInt(data.page) || 0;
            const perPage = parseInt(data.per_page) || 15;

            const query = this.#knexOrTransaction(tableName)
                .where({ deletado: false })
                .andWhere(function () {
                    conditions.forEach(condition => {
                        this.andWhere(condition[0], condition[1]);
                    });
                })
                .orderBy(data.sort, data.sort_dir)
                .limit(perPage)
                .offset(page);


            if (data.search && data.filter) {
                const colunas = await this.#knexOrTransaction.schema.hasColumn(tableName, data.sort);
                if (colunas) {
                    query.andWhere(function () {
                        const string = data.search.replace(/'/g, "''").replace(/;/g, "").replace(/--/g, "").replace(/"/g, "").replace(/`/g, "").replace("%", "").replace("_", "").replace("=", "").replace("<", "")
                        this.orWhere(data.filter, 'like', `%${string.trim()}%`)
                            .andWhere('deletado', false);
                    });
                }
            }
            const results = await query;
            const msg = results.length > 0 ? "Busca realizada com sucesso!" : "Nenhum registro encontrado!";
            const status = results.length > 0;
            return { status, data: results, msg }
        } catch (error) {
            console.log(error)
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(error);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            Log({ ...data, error, descricaoDoErro: 'Exeption estourada. RepositorioEquipamentos - getEquipamentosByLimit', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            return { status: false, error: error, msg: "Não foi possivel realizar a busca!" }
        }

    }

    async getByQueryTableUniqWhereNot(data, tableName, field, condition) {
        try {
            // Validação dos parâmetros obrigatórios
            if (!data.sort || !data.sort_dir) {
                return { status: false, error: 'Parâmetros sort e sort_dir são obrigatórios', msg: "Parâmetros inválidos!" }
            }

            // Validação do sort_dir
            if (!['asc', 'desc'].includes(data.sort_dir.toLowerCase())) {
                return { status: false, error: 'sort_dir deve ser "asc" ou "desc"', msg: "Parâmetros inválidos!" }
            }

            // Verificar se a coluna de ordenação existe
            const colunaExiste = await this.#knexOrTransaction.schema.hasColumn(tableName, data.sort);
            if (!colunaExiste) {
                return { status: false, error: `Coluna "${data.sort}" não existe na tabela`, msg: "Parâmetros inválidos!" }
            }

            // Validar page e per_page
            const page = parseInt(data.page) || 0;
            const perPage = parseInt(data.per_page) || 15;

            const query = this.#knexOrTransaction(tableName)
                .where({ deletado: false })
                .whereNot(field, condition)
                .orderBy(data.sort, data.sort_dir)
                .limit(perPage)
                .offset(page);

            // Validação do filtro apenas se não for null e não for string vazia
            if (data.search && data.filter) {
                const colunas = await this.#knexOrTransaction.schema.hasColumn(tableName, data.sort);
                if (colunas) {
                    query.andWhere(function () {
                        const string = data.search.replace(/'/g, "''").replace(/;/g, "").replace(/--/g, "").replace(/"/g, "").replace(/`/g, "").replace("%", "").replace("_", "").replace("=", "").replace("<", "")
                        this.orWhere(data.filter, 'like', `%${string}%`)
                            .andWhere('deletado', false);
                    });
                }
            }
            const results = await query;
            const msg = results.length > 0 ? "Busca realizada com sucesso!" : "Nenhum registro encontrado!";
            const status = results.length > 0;
            return { status, data: results, msg }
        } catch (error) {
            console.log(error)
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(error);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            Log({ ...data, error, descricaoDoErro: 'Exeption estourada. RepositorioEquipamentos - getEquipamentosByLimit', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            return { status: false, error: error, msg: "Não foi possivel realizar a busca!" }
        }

    }

    async getByQueryTableUniqWhereOr(data, tableName, field, otherField, condition) {
        try {
            // Validação dos parâmetros obrigatórios
            if (!data.sort || !data.sort_dir) {
                return { status: false, error: 'Parâmetros sort e sort_dir são obrigatórios', msg: "Parâmetros inválidos!" }
            }

            // Validação do sort_dir
            if (!['asc', 'desc'].includes(data.sort_dir.toLowerCase())) {
                return { status: false, error: 'sort_dir deve ser "asc" ou "desc"', msg: "Parâmetros inválidos!" }
            }

            // Verificar se a coluna de ordenação existe
            const colunaExiste = await this.#knexOrTransaction.schema.hasColumn(tableName, data.sort);
            if (!colunaExiste) {
                return { status: false, error: `Coluna "${data.sort}" não existe na tabela`, msg: "Parâmetros inválidos!" }
            }

            // Validar page e per_page
            const page = parseInt(data.page) || 0;
            const perPage = parseInt(data.per_page) || 15;

            const query = this.#knexOrTransaction(tableName)
                .where({ deletado: false })
                .andWhere(field, condition)
                .orWhere(otherField, condition).andWhere({ deletado: false })
                .orderBy(data.sort, data.sort_dir)
                .limit(perPage)
                .offset(page);

            // Validação do filtro apenas se não for null e não for string vazia
            if (data.search && data.filter) {
                const colunas = await this.#knexOrTransaction.schema.hasColumn(tableName, data.sort);
                if (colunas) {
                    query.andWhere(function () {
                        const string = data.search.replace(/'/g, "''").replace(/;/g, "").replace(/--/g, "").replace(/"/g, "").replace(/`/g, "").replace("%", "").replace("_", "").replace("=", "").replace("<", "")
                        this.orWhere(data.filter, 'like', `%${string}%`)
                            .andWhere('deletado', false);
                    });
                }
            }
            const results = await query;
            const msg = results.length > 0 ? "Busca realizada com sucesso!" : "Nenhum registro encontrado!";
            const status = results.length > 0;
            return { status, data: results, msg }
        } catch (error) {
            console.log(error)
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(error);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            Log({ ...data, error, descricaoDoErro: 'Exeption estourada. RepositorioEquipamentos - getEquipamentosByLimit', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            return { status: false, error: error, msg: "Não foi possivel realizar a busca!" }
        }

    }

    get tableName() {
        return this.#tableName;
    }

}

module.exports = BaseRepository;