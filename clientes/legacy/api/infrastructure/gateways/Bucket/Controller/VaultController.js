const ErrorStackParser = require('error-stack-parser');
const logs = require('../../../../Logs');
const dateNow = require('../../functions/data/getToday');
const BucketConfig = require('../config');
const { hashSha256FromStream, pipeStreamTo } = require('../helpers/streamPipeline');

class VaultController extends BucketConfig {

    async selarDocumentoFromWip({ documentoId, removerDoWip = true }) {
        try {
            if (!documentoId) {
                return { status: false, msg: 'documentoId é obrigatório' };
            }

            const client = this.client;
            if (!client) {
                return { status: false, msg: 'Client do bucket não inicializado' };
            }

            const objectName = this.objectName(documentoId);
            const copySource = `/${this.wipBucket}/${objectName}`;

            await client.copyObject(
                this.vaultBucket,
                objectName,
                copySource
            );

            const retentionYears = Number(process.env.BUCKET_RETENTION_YEARS) || 5;
            const retainUntilDate = new Date();
            retainUntilDate.setFullYear(retainUntilDate.getFullYear() + retentionYears);

            await client.putObjectRetention(this.vaultBucket, objectName, {
                mode: 'COMPLIANCE',
                retainUntilDate: retainUntilDate.toISOString(),
            });

            if (removerDoWip) {
                await client.removeObject(this.wipBucket, objectName);
            }

            return {
                status: true,
                data: {
                    bucket: this.vaultBucket,
                    objectName,
                    origem: {
                        bucket: this.wipBucket,
                        objectName,
                    },
                    removidoDoWip: removerDoWip,
                },
                msg: 'Documento selado no Vault com sucesso',
            };
        } catch (error) {
            if (error.code === 'NoSuchKey' || error.code === 'NotFound') {
                return { status: false, msg: 'PDF de origem não encontrado no WIP Bucket' };
            }
            return this.#handleError(error, 'selarDocumento', 'Erro ao selar documento no Vault Bucket');
        }
    }

    async selarDocumento({ documentoId }) {
        try {
            if (!documentoId) return { status: false, msg: 'documentoId é obrigatório' };
            const client = this.client;
            if (!client) return { status: false, msg: 'Client do bucket não inicializado' };
            const objectName = this.objectName(documentoId);
            const retentionYears = Number(process.env.BUCKET_RETENTION_YEARS) || 5;
            const retainUntilDate = new Date();
            retainUntilDate.setFullYear(retainUntilDate.getFullYear() + retentionYears);
            await client.putObjectRetention(this.vaultBucket, objectName, {
                mode: 'COMPLIANCE',
                retainUntilDate: retainUntilDate.toISOString(),
            });
            return {
                status: true,
                data: {
                    bucket: this.vaultBucket,
                    objectName
                },
                msg: 'Documento selado no Vault com sucesso',
            };
        } catch (error) {
            if (error.code === 'NoSuchKey' || error.code === 'NotFound') {
                return { status: false, msg: 'Documetno de origem não encontrado no WIP Bucket' };
            }
            return this.#handleError(error, 'selarDocumento', 'Erro ao selar documento no Vault Bucket');
        }
    }

    async copiarDoWip({ documentoId, objectName: objectNameExplicito }) {
        try {
            if (!documentoId && !objectNameExplicito) {
                return { status: false, msg: 'documentoId é obrigatório' };
            }

            const client = this.client;
            if (!client) {
                return { status: false, msg: 'Client do bucket não inicializado' };
            }

            const objectName = objectNameExplicito || this.objectName(documentoId);
            const copySource = `/${this.wipBucket}/${objectName}`;

            await client.copyObject(
                this.vaultBucket,
                objectName,
                copySource
            );

            return {
                status: true,
                data: {
                    bucket: this.vaultBucket,
                    objectName,
                    origem: {
                        bucket: this.wipBucket,
                        objectName,
                    },
                },
                msg: 'Documento copiado do WIP para o Vault com sucesso',
            };
        } catch (error) {
            if (error.code === 'NoSuchKey' || error.code === 'NotFound') {
                return { status: false, msg: 'PDF de origem não encontrado no WIP Bucket' };
            }
            return this.#handleError(error, 'copiarDoWip', 'Erro ao copiar documento do WIP para o Vault');
        }
    }

    async urlDownloadGet({ objectName, expiresInSeconds = 3600 }) {
        try {
            if (!objectName) {
                return { status: false, msg: 'objectName é obrigatório' };
            }

            const client = this.client;
            if (!client) {
                return { status: false, msg: 'Client do bucket não inicializado' };
            }

            const key = this.objectName(objectName);
            const url = await client.presignedGetObject(
                this.vaultBucket,
                key,
                expiresInSeconds
            );

            return {
                status: true,
                data: {
                    method: 'GET',
                    bucket: this.vaultBucket,
                    objectName: key,
                    url,
                    expiresInSeconds,
                },
                msg: 'URL pré-assinada de download (GET) gerada com sucesso',
            };
        } catch (error) {
            return this.#handleError(error, 'urlDownloadGet', 'Erro ao gerar URL pré-assinada GET do Vault');
        }
    }

    async obterPdf({ documentoId }) {
        try {
            if (!documentoId) {
                return { status: false, msg: 'documentoId é obrigatório' };
            }

            const client = this.client;
            if (!client) {
                return { status: false, msg: 'Client do bucket não inicializado' };
            }

            const objectName = this.objectName(documentoId);
            const stream = await client.getObject(this.vaultBucket, objectName);

            return {
                status: true,
                data: {
                    bucket: this.vaultBucket,
                    objectName,
                    stream,
                },
                msg: 'PDF obtido do Vault com sucesso',
            };
        } catch (error) {
            if (error.code === 'NoSuchKey' || error.code === 'NotFound') {
                return { status: false, msg: 'PDF não encontrado no Vault Bucket' };
            }
            return this.#handleError(error, 'obterPdf', 'Erro ao obter PDF do Vault Bucket');
        }
    }

    async obterArquivo({ objectName }) {
        try {
            if (!objectName) {
                return { status: false, msg: 'objectName é obrigatório' };
            }

            const client = this.client;
            if (!client) {
                return { status: false, msg: 'Client do bucket não inicializado' };
            }

            const stream = await client.getObject(this.vaultBucket, objectName);

            return {
                status: true,
                data: {
                    bucket: this.vaultBucket,
                    objectName,
                    stream,
                },
                msg: 'Arquivo obtido do Vault com sucesso',
            };
        } catch (error) {
            if (error.code === 'NoSuchKey' || error.code === 'NotFound') {
                return { status: false, msg: 'Arquivo não encontrado no Vault Bucket' };
            }
            return this.#handleError(error, 'obterArquivo', 'Erro ao obter arquivo do Vault Bucket');
        }
    }

    async calcularHashSha256({ documentoId }) {
        try {
            const result = await this.obterPdf({ documentoId });
            if (!result.status) return result;

            const sha256 = await hashSha256FromStream(result.data.stream);
            return {
                status: true,
                data: {
                    bucket: result.data.bucket,
                    objectName: result.data.objectName,
                    sha256,
                    algorithm: 'sha256',
                },
                msg: 'Hash SHA-256 do PDF no Vault calculado com sucesso',
            };
        } catch (error) {
            return this.#handleError(error, 'calcularHashSha256', 'Erro ao calcular hash SHA-256 do PDF no Vault');
        }
    }

    async pipePara({ documentoId, destination }) {
        try {
            if (!destination) {
                return { status: false, msg: 'destination (Writable) é obrigatório' };
            }

            const result = await this.obterPdf({ documentoId });
            if (!result.status) return result;

            await pipeStreamTo(result.data.stream, destination);
            return {
                status: true,
                data: {
                    bucket: result.data.bucket,
                    objectName: result.data.objectName,
                },
                msg: 'PDF do Vault encaminhado via stream com sucesso',
            };
        } catch (error) {
            return this.#handleError(error, 'pipePara', 'Erro ao encaminhar PDF do Vault via stream');
        }
    }

    async statPdf({ documentoId }) {
        try {
            if (!documentoId) {
                return { status: false, msg: 'documentoId é obrigatório' };
            }

            const client = this.client;
            if (!client) {
                return { status: false, msg: 'Client do bucket não inicializado' };
            }

            const objectName = this.objectName(documentoId);
            const stat = await client.statObject(this.vaultBucket, objectName);

            return {
                status: true,
                data: {
                    bucket: this.vaultBucket,
                    objectName,
                    ...stat,
                },
                msg: 'Metadados do PDF no Vault obtidos com sucesso',
            };
        } catch (error) {
            if (error.code === 'NoSuchKey' || error.code === 'NotFound') {
                return { status: false, msg: 'PDF não encontrado no Vault Bucket' };
            }
            return this.#handleError(error, 'statPdf', 'Erro ao obter metadados do PDF no Vault Bucket');
        }
    }

    async salvarArquivo({ objectName, fileStream, size, contentType = 'application/octet-stream', meta = {} }) {
        try {
            if (!objectName || !fileStream) {
                return { status: false, msg: 'objectName e fileStream são obrigatórios' };
            }

            const client = this.client;
            if (!client) {
                return { status: false, msg: 'Client do bucket não inicializado' };
            }

            const objectSize = size
                ?? (Buffer.isBuffer(fileStream) || fileStream instanceof Uint8Array
                    ? fileStream.length
                    : undefined);

            const etag = await client.putObject(
                this.vaultBucket,
                objectName,
                fileStream,
                objectSize,
                {
                    'Content-Type': contentType,
                    ...meta,
                }
            );

            return {
                status: true,
                data: {
                    bucket: this.vaultBucket,
                    objectName,
                    etag,
                    contentType,
                },
                msg: 'Arquivo gravado no WIP com sucesso',
            };
        } catch (error) {
            console.log(error);
            return this.#handleError(error, 'salvarArquivo', 'Erro ao gravar arquivo no WIP Bucket');
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
            descricaoDoErro: `Exeption estourada. VaultController - ${method}`,
            linhaDoErro: lineError,
            nomeDoArquivo: fileName,
            data_criacao: dateNow(),
            data_atualizacao: dateNow(),
            deletado: false,
        }, msg);
        return { status: false, error, msg };
    }
}

module.exports = VaultController;
