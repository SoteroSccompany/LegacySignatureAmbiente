
require('dotenv/config');
const knex = require("../config/databaseConection")();
const moment = require('moment');
const Log = require('../../../@core/usecase/Logs/databaseLog');
const ErrorStackParser = require('error-stack-parser');
const dateNow = require('../../gateways/functions/data/getToday');
const BaseRepository = require('.');
const { views } = require('../../../certs');

class RequestsRepository extends BaseRepository {

    constructor() {
        super({ tableName: 'tab_requests', knexOrTransaction: knex })
    }

    async createRequests(data) {
        try {
            const response = await knex('tab_requests').insert(data)
            return { status: true, data: response, msg: "Requests criado com sucesso!" }
        } catch (error) {
            console.log(error)
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(error);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            Log({ ...data, error, descricaoDoErro: 'Exeption estourada. RepositorioRequests - createRequests', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            return { status: false, error: error, msg: "Não foi possivel criar o Requests!" }
        }
    }

    async updateRequests(data) {
        try {
            const check = await this.getRequestsById(data)
            if (check.status && check.exit) {
                const response = await knex('tab_requests').update(data).where('id', data.id)
                return { status: true, data: response, msg: "Requests atualizado com sucesso!" }
            } else {
                return { status: false, msg: "Requests não encontrado!" }
            }
        } catch (error) {
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(error);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            Log({ ...data, descricaoDoErro: 'Exeption estourada. RepositorioRequests - updateRequests', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            return { status: false, error: error, msg: "Não foi possivel atualizar o Requests!" }
        }
    }

    async deleteRequests(data) {
        try {
            const check = await this.getRequestsById(data)
            if (check.status && check.exit) {
                const response = await knex('tab_requests').update({ deletado: true, data_atualizacao: dateNow() }).where('id', data.id)
                return { status: true, data: response, msg: "Requests deletado com sucesso!" }
            } else {
                return { status: false, data: response, msg: "Requests não encontrado!" }
            }
        } catch (error) {
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(error);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            Log({ ...data, error, descricaoDoErro: 'Exeption estourada. RepositorioRequests - deleteRequests', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            return { status: false, error: error, msg: "Não foi possivel deletar o Requests!" }
        }
    }

    async getRequests() {
        try {
            const response = await knex('tab_requests').select('*').where('deletado', false)
            if (response.length > 0) {
                return { status: true, exit: true, data: response, msg: "Requests encontrado com sucesso!" }
            } else {
                return { status: true, exit: false, data: response, msg: "Requests não encontrado!" }
            }
        } catch (error) {
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(error);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            Log({ error, descricaoDoErro: 'Exeption estourada. RepositorioRequests - getRequests', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            return { status: false, error: error, msg: "Não foi possivel buscar o Requests!" }
        }

    }


    async getRequestsById(data) {
        try {
            const response = await knex('tab_requests').select('*').where('id', data.id).andWhere('deletado', false)
            if (response.length > 0) {
                return { status: true, exit: true, data: response[0], msg: "Requests encontrado com sucesso!" }
            } else {
                return { status: true, exit: false, data: response, msg: "Requests não encontrado!" }
            }
        } catch (error) {
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(error);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            Log({ ...data, error, descricaoDoErro: 'Exeption estourada. RepositorioRequests - getRequestsById', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            return { status: false, error: error, msg: "Não foi possivel buscar o Requests!" }
        }

    }

    async getRequestsByQuery(data) {
        try {
            const resp = await this.getByQueryTable(data, views.view_requests)
            if (!resp.status) return { status: true, data: [], msg: "Não foi possivel buscar o Requests!" }
            return { status: true, data: resp.data, msg: resp.msg }
        } catch (error) {
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(error);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            Log({ ...data, error, descricaoDoErro: 'Exeption estourada. RepositorioRequests - getRequestsByLimit', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            return { status: false, error: error, msg: "Não foi possivel buscar o Requests!" }
        }

    }

    async getRequestsMetrics() {
        try {
            const metrics = await knex.raw(`
                SELECT 
                    COUNT(*) as total_requests,
                    COUNT(CASE WHEN status_code >= 200 AND status_code < 300 THEN 1 END) as success_requests,
                    COUNT(CASE WHEN status_code >= 400 AND status_code < 500 THEN 1 END) as client_errors,
                    COUNT(CASE WHEN status_code >= 500 THEN 1 END) as server_errors,
                    AVG(duration_ms) as avg_duration_ms,
                    MAX(duration_ms) as max_duration_ms,
                    MIN(duration_ms) as min_duration_ms,
                    COUNT(DISTINCT user_email) as unique_users,
                    COUNT(DISTINCT endpoint) as unique_endpoints,
                    COUNT(DISTINCT method) as unique_methods
                FROM view_request_users 
                WHERE deletado = 0
            `)

            const methodStats = await knex.raw(`
                SELECT 
                    method,
                    COUNT(*) as count,
                    AVG(duration_ms) as avg_duration_ms
                FROM view_request_users 
                WHERE deletado = 0
                GROUP BY method
                ORDER BY count DESC
            `)

            const endpointStats = await knex.raw(`
                SELECT 
                    endpoint,
                    COUNT(*) as count,
                    AVG(duration_ms) as avg_duration_ms
                FROM view_request_users 
                WHERE deletado = 0
                GROUP BY endpoint
                ORDER BY count DESC
                LIMIT 10
            `)

            const statusCodeStats = await knex.raw(`
                SELECT 
                    status_code,
                    COUNT(*) as count
                FROM view_request_users 
                WHERE deletado = 0
                GROUP BY status_code
                ORDER BY count DESC
            `)

            return {
                status: true,
                data: {
                    general: metrics[0][0],
                    methods: methodStats[0],
                    endpoints: endpointStats[0],
                    statusCodes: statusCodeStats[0]
                },
                msg: "Métricas de requests obtidas com sucesso!"
            }
        } catch (error) {
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(error);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            Log({ error, descricaoDoErro: 'Exeption estourada. RepositorioRequests - getRequestsMetrics', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            return { status: false, error: error, msg: "Não foi possivel obter as métricas de requests!" }
        }
    }


}

module.exports = new RequestsRepository();

