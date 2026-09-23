const ServerSignConfig = require('../config');
const dateNow = require('../../functions/data/getToday');

const HASH_SHA256_HEX = /^[a-f0-9]{64}$/i;

class CarimboController extends ServerSignConfig {

    async carimbarHash({ hashHex }) {
        try {
            if (!hashHex || !HASH_SHA256_HEX.test(hashHex)) {
                return { status: false, msg: 'hashHex deve ser um SHA-256 em hexadecimal (64 caracteres)' };
            }

            const digestBase64 = Buffer.from(hashHex, 'hex').toString('base64');
            const response = await this.api.post(`/workers/${this.workerCarimbo}/process`, {
                data: digestBase64,
                encoding: 'BASE64',
                metaData: {
                    CLIENTSIDE_HASHDIGESTALGORITHM: this.algoritmoHash,
                },
            });

            const cmsBase64 = response.data?.data || null;
            if (!cmsBase64) {
                return { status: false, msg: 'SignServer não retornou o pacote CMS do carimbo' };
            }

            return {
                status: true,
                data: {
                    worker: this.workerCarimbo,
                    algoritmo: this.algoritmoHash,
                    hash_carimbado: hashHex,
                    cms_base64: cmsBase64,
                    archive_id: response.data?.archiveId || null,
                    request_id: response.data?.requestId || null,
                    carimbado_em: dateNow(),
                },
                msg: 'Hash carimbado com sucesso pelo SignServer',
            };
        } catch (error) {
            const detalhe = error.response?.data ? JSON.stringify(error.response.data) : error.message;
            return this.handleError(error, 'carimbarHash', `Erro ao carimbar hash no SignServer: ${detalhe}`);
        }
    }
}

module.exports = CarimboController;
