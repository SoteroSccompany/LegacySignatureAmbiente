require('dotenv/config');
const axios = require('axios');
const ErrorStackParser = require('error-stack-parser');
const logs = require('../../../../Logs');
const dateNow = require('../../functions/data/getToday');

class FaceMatchConfig {

    static #instance = null;
    #api = null;

    constructor() {
        this.validate();
    }

    validate() {
        if (this.#api !== null) return;
        const host = this.host;
        const port = this.port;
        if (!host || !port) {
            logs.getInstance().error({
                message: 'FACE_HOST / FACE_PORT não configurados',
                data_criacao: dateNow(),
                data_atualizacao: dateNow(),
                deletado: false,
            }, 'Configuração do FaceMatch incompleta');
            return;
        }
        const protocolo = this.useSSL ? 'https' : 'http';
        this.#api = axios.create({
            baseURL: `${protocolo}://${host}:${port}`,
            timeout: this.timeout,
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
            },
        });
    }

    static getInstance() {
        if (!FaceMatchConfig.#instance) {
            FaceMatchConfig.#instance = new FaceMatchConfig();
        }
        return FaceMatchConfig.#instance;
    }

    get api() {
        this.validate();
        return this.#api;
    }

    get host() {
        return process.env.FACE_HOST;
    }

    get port() {
        return Number(process.env.FACE_PORT) || 8085;
    }

    get useSSL() {
        return process.env.FACE_USE_SSL === 'true';
    }

    get timeout() {
        return Number(process.env.FACE_TIMEOUT) || 30000;
    }

    get tolerance() {
        return Number(process.env.FACE_TOLERANCE) || 1.128;
    }

    get rotas() {
        return {
            health: { method: 'GET', path: '/health' },
            vectorize: { method: 'POST', path: '/vectorize' },
            verifyMatch: { method: 'POST', path: '/verify-match' },
        };
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
            error: { message: error.message, code: error.code, status: error.response?.status },
            message: error.message,
            descricaoDoErro: `Exeption estourada. FaceMatch - ${method}`,
            linhaDoErro: lineError,
            nomeDoArquivo: fileName,
            data_criacao: dateNow(),
            data_atualizacao: dateNow(),
            deletado: false,
        }, msg);
        return { status: false, msg };
    }
}

module.exports = FaceMatchConfig;
