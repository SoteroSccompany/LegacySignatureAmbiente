require('dotenv/config');
const Logs = require('../../../../@core/usecase/Logs/redis')
const dateNow = require('../../functions/data/getToday')
const ErrorStackParser = require('error-stack-parser');
const redis = require('ioredis');


class ConfigCache {

    #redisConect;

    constructor() {
        try {
            this.#redisConect = new redis({
                host: process.env.REDIS_HOST,
                port: process.env.REDIS_PORT,
                password: process.env.REDIS_PASS,
                keyPrefix: process.env.REDIS_KEY_PREFIX || ''
            });
            this.#redisConect.on('error', (error) => {
                let lineError = '0';
                let fileName = '0';
                const stackFrames = ErrorStackParser.parse(error);
                if (stackFrames.length > 0) {
                    lineError = stackFrames[0].lineNumber;
                    fileName = stackFrames[0].fileName;
                }
                Logs({ error, message: error.message, descricaoDoErro: 'Exeption estourada. ConfigCache - Error on', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            });
        } catch (error) {
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(error);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            Logs({ error, message: error.message, descricaoDoErro: 'Exeption estourada. ConfigCache', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
        }
    }

    async cache() {
        return this.#redisConect;
    }


}

module.exports = ConfigCache