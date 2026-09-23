
require('dotenv/config');
const knex = require("../config/databaseConection")();
// const moment = require('moment')
const Log = require('../../../@core/usecase/Logs/databaseLog')
const ErrorStackParser = require('error-stack-parser');
const dateNow = require('../../gateways/functions/data/getToday')

class ArquivosRepository {

    async createArquivos(data) {
        try {
            const response = await knex('tab_arquivos').insert(data)
            return { status: true, data: response, msg: "Arquivos criado com sucesso!" }
        } catch (error) {
            console.log(error)
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(error);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            Log({ ...data, error, descricaoDoErro: 'Exeption estourada. RepositorioArquivos - createArquivos', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            return { status: false, error: error, msg: "Não foi possivel criar o Arquivos!" }
        }
    }

    async createArquivosCliente(data) {
        try {
            const response = await knex('tab_arquivosCliente').insert(data)
            return { status: true, data: response, msg: "Arquivos criado com sucesso!" }
        } catch (error) {
            console.log(error)
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(error);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            Log({ ...data, error, descricaoDoErro: 'Exeption estourada. RepositorioArquivos - createArquivos', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            return { status: false, error: error, msg: "Não foi possivel criar o Arquivos!" }
        }
    }

    async updateArquivos(data) {
        try {
            const check = await this.getArquivosById(data)
            if (check.status && check.exit) {
                const response = await knex('tab_arquivos').update(data).where('id', data.id)
                return { status: true, data: response, msg: "Arquivos atualizado com sucesso!" }
            } else {
                return { status: false, data: undefined, msg: "Arquivos não encontrado!" }
            }
        } catch (error) {
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(error);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            Log({ ...data, error, descricaoDoErro: 'Exeption estourada. RepositorioArquivos - updateArquivos', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            return { status: false, error: error, msg: "Não foi possivel atualizar o Arquivos!" }
        }
    }

    async updateArquivosCliente(data) {
        try {
            const check = await this.getArquivosByIdCliente(data)
            if (check.status && check.exit) {
                const response = await knex('tab_arquivosCliente').update(data).where('id', data.id)
                return { status: true, data: response, msg: "Arquivos atualizado com sucesso!" }
            } else {
                return { status: false, data: undefined, msg: "Arquivos não encontrado!" }
            }
        } catch (error) {
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(error);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            Log({ ...data, error, descricaoDoErro: 'Exeption estourada. RepositorioArquivos - updateArquivos', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            return { status: false, error: error, msg: "Não foi possivel atualizar o Arquivos!" }
        }
    }

    async deleteArquivos(data) {
        try {
            const check = await this.getArquivosById(data)
            if (check.status && check.exit) {
                const response = await knex('tab_arquivos').update({ deletado: true, data_atualizacao: dateNow() }).where('id', data.id)
                return { status: true, data: response, msg: "Arquivos deletado com sucesso!" }
            } else {
                return { status: false, data: undefined, msg: "Arquivos não encontrado!" }
            }
        } catch (error) {
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(error);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            Log({ ...data, error, descricaoDoErro: 'Exeption estourada. RepositorioArquivos - deleteArquivos', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            return { status: false, error: error, msg: "Não foi possivel deletar o Arquivos!" }
        }
    }

    async deleteArquivosCliente(data) {
        try {
            const response = await knex('tab_arquivosCliente').update({ deletado: true, data_atualizacao: dateNow() }).where('id', data.id)
            return { status: true, data: response, msg: "Arquivos deletado com sucesso!" }
        } catch (error) {
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(error);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            Log({ ...data, error, descricaoDoErro: 'Exeption estourada. RepositorioArquivos - deleteArquivos', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            return { status: false, error: error, msg: "Não foi possivel deletar o Arquivos!" }
        }
    }

    async getArquivos() {
        try {
            const response = await knex('tab_arquivos').select('*').where('deletado', false)
            if (response.length > 0) {
                return { status: true, exit: true, data: response, msg: "Arquivos encontrado com sucesso!" }
            } else {
                return { status: true, exit: false, data: response, msg: "Arquivos não encontrado!" }
            }
        } catch (error) {
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(error);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            Log({ error, descricaoDoErro: 'Exeption estourada. RepositorioArquivos - getArquivos', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            return { status: false, error: error, msg: "Não foi possivel buscar o Arquivos!" }
        }

    }


    async getArquivosByIdCliente(data) {
        try {
            const response = await knex('tab_arquivosCliente').select('*').where('id', data.id).andWhere('deletado', false)
            if (response.length > 0) {
                return { status: true, exit: true, data: response[0], msg: "Arquivos encontrado com sucesso!" }
            } else {
                return { status: true, exit: false, data: response, msg: "Arquivos não encontrado!" }
            }
        } catch (error) {
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(error);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            Log({ ...data, error, descricaoDoErro: 'Exeption estourada. RepositorioArquivos - getArquivosById', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            return { status: false, error: error, msg: "Não foi possivel buscar o Arquivos!" }
        }

    }


    async getArquivosById(data) {
        try {
            const response = await knex('tab_arquivos').select('*').where('id', data.id).andWhere('deletado', false)
            if (response.length > 0) {
                return { status: true, exit: true, data: response[0], msg: "Arquivos encontrado com sucesso!" }
            } else {
                return { status: true, exit: false, data: response, msg: "Arquivos não encontrado!" }
            }
        } catch (error) {
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(error);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            Log({ ...data, error, descricaoDoErro: 'Exeption estourada. RepositorioArquivos - getArquivosById', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            return { status: false, error: error, msg: "Não foi possivel buscar o Arquivos!" }
        }

    }

    async getArquivosByLimit(data) {
        try {
            const response = await knex('tab_arquivos').select('*').where('deletado', false)
                .limit(data.limit).offset(data.offset).orderBy('data_criacao', 'desc')
            if (response.length > 0) {
                const qnt = await knex.count("id as total").where({ deletado: false }).table('tab_arquivos');
                const totalPage = Math.ceil(qnt[0].total / data.limit);
                return { status: true, exit: true, data: response, msg: "Arquivos encontrados com sucesso!", pages: totalPage, totalRegisters: qnt[0].total }
            } else {
                return { status: true, exit: false, data: response, msg: "Arquivos não encontrado!" }
            }
        } catch (error) {
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(error);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            Log({ ...data, error, descricaoDoErro: 'Exeption estourada. RepositorioArquivos - getArquivosByLimit', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            return { status: false, error: error, msg: "Não foi possivel buscar o Arquivos!" }
        }

    }


}

module.exports = new ArquivosRepository();

