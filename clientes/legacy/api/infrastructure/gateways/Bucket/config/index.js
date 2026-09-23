require('dotenv/config');
const { Client } = require('minio');
const ErrorStackParser = require('error-stack-parser');
const logs = require('../../../../Logs');
const dateNow = require('../../functions/data/getToday');

class BucketConfig {

    static #instance = null;
    #client = null;

    constructor() {
        this.validate();
    }

    validate() {
        if (this.#client !== null) return;

        const endPoint = process.env.BUCKET_HOST;
        const accessKey = process.env.BUCKET_ACCESS_KEY || process.env.BUCKET_ROOT_USER;
        const secretKey = process.env.BUCKET_SECRET_KEY || process.env.BUCKET_ROOT_PASSWORD;

        if (!endPoint || !accessKey || !secretKey) {
            logs.getInstance().error({
                message: 'BUCKET_HOST / BUCKET_ACCESS_KEY / BUCKET_SECRET_KEY não configurados',
                data_criacao: dateNow(),
                data_atualizacao: dateNow(),
                deletado: false,
            }, 'Configuração do bucket incompleta');
            return;
        }

        this.#client = new Client({
            endPoint,
            port: Number(process.env.BUCKET_PORT) || 8333,
            useSSL: process.env.BUCKET_USE_SSL === 'true',
            accessKey,
            secretKey,
        });
    }

    static getInstance() {
        if (!BucketConfig.#instance) {
            BucketConfig.#instance = new BucketConfig();
        }
        return BucketConfig.#instance;
    }

    get client() {
        this.validate();
        return this.#client;
    }

    get wipBucket() {
        return process.env.BUCKET_NAME_WIP || 'wip-signatureexperts';
    }

    get vaultBucket() {
        return process.env.BUCKET_NAME_VAULT || 'vault-signatureexperts';
    }

    objectName(documentoId) {
        if (!documentoId) {
            throw new Error('documentoId é obrigatório para montar o objectName');
        }
        // O prefixo de aplicação (APLICATION_NAME) é aplicado na origem, quando o path é
        // montado (Documentos/foto de perfil/selfie da cerimônia) — não aqui. Vários métodos
        // do WipController/VaultController (obterArquivo, validarImagem, validarMagicPdf,
        // salvarArquivo) recebem objectName pronto e usam ele direto no client, sem passar por
        // este método; prefixar aqui de novo duplicaria o prefixo só na metade dos casos e
        // quebraria a leitura do que foi gravado. Mantém identidade de propósito.
        return `${documentoId}`;
    }

    // BUCKET_ROOT_PREFIX (isolamento por cliente no bucket compartilhado) segue a mesma regra
    // do comentário acima: aplicar aqui de novo duplicaria o prefixo, já que este método não é
    // o único caminho de escrita. Por isso applyRootPrefix é chamado uma única vez, na origem
    // de cada basePath/objectName (Ladger*, usecases de Documentos/PerfilBiometria/Assinatura),
    // nunca dentro de objectName() ou dos Controllers.
    applyRootPrefix(path) {
        const rootPrefix = process.env.BUCKET_ROOT_PREFIX;
        return rootPrefix ? `${rootPrefix}/${path}` : path;
    }

    async healthCheck() {
        try {
            const client = this.client;
            if (!client) {
                return { status: false, msg: 'Client do bucket não inicializado. Verifique as variáveis BUCKET_*.' };
            }
            const wipExists = await client.bucketExists(this.wipBucket);
            const vaultExists = await client.bucketExists(this.vaultBucket);
            return {
                status: wipExists && vaultExists,
                data: {
                    wip: { name: this.wipBucket, exists: wipExists },
                    vault: { name: this.vaultBucket, exists: vaultExists },
                },
                msg: wipExists && vaultExists
                    ? 'Bucket conectado e buckets disponíveis'
                    : 'Bucket conectado, mas um ou mais buckets não existem',
            };
        } catch (error) {
            return this.#handleError(error, 'healthCheck', 'Erro ao verificar conexão com o bucket');
        }
    }

    #handleError(error, method, msg) {
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
            descricaoDoErro: `Exeption estourada. BucketConfig - ${method}`,
            linhaDoErro: lineError,
            nomeDoArquivo: fileName,
            data_criacao: dateNow(),
            data_atualizacao: dateNow(),
            deletado: false,
        }, msg);
        return { status: false, error, msg };
    }
}

module.exports = BucketConfig;
