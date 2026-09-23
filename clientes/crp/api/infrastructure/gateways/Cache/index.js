const Logs = require('../../../@core/usecase/Logs/redis')
const dateNow = require('../functions/data/getToday')
const ErrorStackParser = require('error-stack-parser');
const ConfigCache = require('./config')

class Cache extends ConfigCache {

    constructor() {
        super()
    }

    async setCache({ key, value, expiration }) {
        try {
            const redisCache = await super.cache();
            await redisCache.set(key, value, 'EX', expiration)
        } catch (error) {
            console.log(error)
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(error);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            Logs({ error, message: error.message, descricaoDoErro: 'Exeption estourada. Cache - setCache', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
        }
    }

    async setCacheIncryBy({ key, value }) {
        try {
            const redisCache = await super.cache();
            await redisCache.incr(key)
        } catch (error) {
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(error);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            Logs({ error, message: error.message, descricaoDoErro: 'Exeption estourada. Cache - setCacheIncryBy', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
        }
    }

    async getCache({ key }) {
        try {
            const redisCache = await super.cache();
            return await redisCache.get(key)
        } catch (error) {
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(error);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            Logs({ error, message: error.message, descricaoDoErro: 'Exeption estourada. Cache - getCache', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
        }
    }

    async deleteCache({ key }) {
        try {
            const redisCache = await super.cache();
            return await redisCache.del(key)
        } catch (error) {
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(error);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            Logs({ error, message: error.message, descricaoDoErro: 'Exeption estourada. Cache - deleteCache', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
        }
    }

    async deleteCacheByPrefix({ prefix }) {
        try {
            const redisCache = await super.cache();
            let cursor = 0;
            let deletedCount = 0;

            do {
                // SCAN para encontrar chaves com o prefixo
                const result = await redisCache.scan(cursor, 'MATCH', `${prefix}*`, 'COUNT', '100');
                cursor = result[0];
                const keys = result[1];

                // Deletar as chaves encontradas
                if (keys.length > 0) {
                    const deleted = await redisCache.del(...keys);
                    deletedCount += deleted;
                }
            } while (cursor !== '0');

            return { status: true, deletedCount, msg: `${deletedCount} chaves deletadas com prefixo ${prefix}` };
        } catch (error) {
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(error);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            Logs({ error, message: error.message, descricaoDoErro: 'Exeption estourada. Cache - deleteCacheByPrefix', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            return { status: false, msg: 'Erro ao deletar cache por prefixo' };
        }
    }

}

module.exports = Cache