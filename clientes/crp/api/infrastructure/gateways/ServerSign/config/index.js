require('dotenv/config');
const axios = require('axios');
const ErrorStackParser = require('error-stack-parser');
const logs = require('../../../../Logs');
const dateNow = require('../../functions/data/getToday');
const { serverSign } = require('../../../../certs');

class ServerSignConfig {

    static #instance = null;
    #api = null;

    constructor() {
        this.validate();
    }

    validate() {
        if (this.#api !== null) return;

        this.#api = axios.create({
            baseURL: `${this.baseUrl}/signserver/rest/v1`,
            timeout: serverSign.timeout,
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
        });
    }

    static getInstance() {
        if (!ServerSignConfig.#instance) {
            ServerSignConfig.#instance = new ServerSignConfig();
        }
        return ServerSignConfig.#instance;
    }

    get api() {
        this.validate();
        return this.#api;
    }

    get baseUrl() {
        const protocolo = serverSign.useSSL ? 'https' : 'http';
        return `${protocolo}://${serverSign.host}:${serverSign.port}`;
    }

    get workerCarimbo() {
        return serverSign.workers.carimbo;
    }

    get algoritmoHash() {
        return serverSign.algoritmoHash;
    }

    get obrigatorio() {
        return serverSign.obrigatorio;
    }

    async healthCheck() {
        try {
            const response = await this.api.get('/signserver/healthcheck/signserverhealth', {
                baseURL: this.baseUrl,
                responseType: 'text',
            });
            const resultado = String(response.data || '').trim();
            return {
                status: resultado === 'ALLOK',
                data: { resultado, url: this.baseUrl },
                msg: resultado === 'ALLOK'
                    ? 'SignServer disponível'
                    : `SignServer respondeu com estado inesperado: ${resultado}`,
            };
        } catch (error) {
            return this.handleError(error, 'healthCheck', 'Erro ao verificar conexão com o SignServer');
        }
    }

    handleError(error, method, msg) {
        let lineError = '0';
        let fileName = '0';
        const stackFrames = ErrorStackParser.parse(error);
        if (stackFrames.length > 0) {
            lineError = stackFrames[0].lineNumber;
            fileName = stackFrames[0].fileName;
        }
        logs.getInstance().error({
            error,
            message: error.message,
            descricaoDoErro: `Exeption estourada. ServerSign - ${method}`,
            linhaDoErro: lineError,
            nomeDoArquivo: fileName,
            data_criacao: dateNow(),
            data_atualizacao: dateNow(),
            deletado: false,
        }, msg);
        return { status: false, error, msg };
    }
}

module.exports = ServerSignConfig;
