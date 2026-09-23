const ErrorStackParser = require('error-stack-parser');
const { PostPolicy } = require('minio');
const logs = require('../../../../Logs');
const dateNow = require('../../functions/data/getToday');
const BucketConfig = require('../config');
const { hashSha256FromStream, pipeStreamTo } = require('../helpers/streamPipeline');

const DEFAULT_UPLOAD_EXPIRES_SECONDS = 15 * 60;
const DEFAULT_UPLOAD_MAX_BYTES = 100 * 1024 * 1024;

class WipController extends BucketConfig {

    async urlUploadPut({ documentoId, expiresInSeconds = DEFAULT_UPLOAD_EXPIRES_SECONDS }) {
        try {
            if (!documentoId) {
                return { status: false, msg: 'documentoId é obrigatório' };
            }

            const client = this.client;
            if (!client) {
                return { status: false, msg: 'Client do bucket não inicializado' };
            }

            const objectName = this.objectName(documentoId);
            const url = await client.presignedPutObject(
                this.wipBucket,
                objectName,
                expiresInSeconds
            );

            return {
                status: true,
                data: {
                    method: 'PUT',
                    bucket: this.wipBucket,
                    objectName,
                    url,
                    expiresInSeconds,
                    headers: {
                        'Content-Type': 'application/pdf',
                    },
                },
                msg: 'URL pré-assinada de upload (PUT) gerada com sucesso',
            };
        } catch (error) {
            return this.#handleError(error, 'urlUploadPut', 'Erro ao gerar URL pré-assinada PUT do WIP');
        }
    }

    async urlUploadPost({
        documentoId,
        expiresInSeconds = DEFAULT_UPLOAD_EXPIRES_SECONDS,
        maxBytes = DEFAULT_UPLOAD_MAX_BYTES,
    }) {
        try {
            if (!documentoId) {
                return { status: false, msg: 'documentoId é obrigatório' };
            }

            const client = this.client;
            if (!client) {
                return { status: false, msg: 'Client do bucket não inicializado' };
            }

            const objectName = this.objectName(documentoId);
            const policy = new PostPolicy();
            policy.setBucket(this.wipBucket);
            policy.setKey(objectName);
            policy.setContentType('application/pdf');
            policy.setContentLengthRange(1, maxBytes);
            policy.setExpires(new Date(Date.now() + expiresInSeconds * 1000));

            const { postURL, formData } = await client.presignedPostPolicy(policy);

            return {
                status: true,
                data: {
                    method: 'POST',
                    bucket: this.wipBucket,
                    objectName,
                    postURL,
                    formData,
                    fileField: 'file',
                    expiresInSeconds,
                    maxBytes,
                },
                msg: 'URL pré-assinada de upload (POST) gerada com sucesso',
            };
        } catch (error) {
            return this.#handleError(error, 'urlUploadPost', 'Erro ao gerar URL pré-assinada POST do WIP');
        }
    }

    async salvarPdfEmAndamento({ documentoId, pdfStream, size, meta = {} }) {
        try {
            if (!documentoId || !pdfStream) {
                return { status: false, msg: 'documentoId e pdfStream são obrigatórios' };
            }

            const client = this.client;
            if (!client) {
                return { status: false, msg: 'Client do bucket não inicializado' };
            }

            const objectName = this.objectName(documentoId);
            const objectSize = size
                ?? (Buffer.isBuffer(pdfStream) || pdfStream instanceof Uint8Array
                    ? pdfStream.length
                    : undefined);

            const etag = await client.putObject(
                this.wipBucket,
                objectName,
                pdfStream,
                objectSize,
                {
                    'Content-Type': 'application/pdf',
                    ...meta,
                }
            );

            return {
                status: true,
                data: {
                    bucket: this.wipBucket,
                    objectName,
                    etag,
                },
                msg: 'PDF gravado no WIP com sucesso',
            };
        } catch (error) {
            return this.#handleError(error, 'salvarPdfEmAndamento', 'Erro ao gravar PDF no WIP Bucket');
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
                this.wipBucket,
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
                    bucket: this.wipBucket,
                    objectName,
                    etag,
                    contentType,
                },
                msg: 'Arquivo gravado no WIP com sucesso',
            };
        } catch (error) {
            return this.#handleError(error, 'salvarArquivo', 'Erro ao gravar arquivo no WIP Bucket');
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

            const stream = await client.getObject(this.wipBucket, objectName);

            return {
                status: true,
                data: {
                    bucket: this.wipBucket,
                    objectName,
                    stream,
                },
                msg: 'Arquivo obtido do WIP com sucesso',
            };
        } catch (error) {
            if (error.code === 'NoSuchKey' || error.code === 'NotFound') {
                return { status: false, notfound: true, msg: 'Arquivo não encontrado no WIP Bucket' };
            }
            return this.#handleError(error, 'obterArquivo', 'Erro ao obter arquivo do WIP Bucket');
        }
    }

    async obterArquivoBase64({ objectName }) {
        try {
            if (!objectName) {
                return { status: false, msg: 'objectName é obrigatório' };
            }
            const client = this.client;
            if (!client) {
                return { status: false, msg: 'Client do bucket não inicializado' };
            }

            const stream = await client.getObject(this.wipBucket, objectName);
            const chunks = [];
            for await (const chunk of stream) {
                chunks.push(chunk);
            }
            const buffer = Buffer.concat(chunks);
            if (!buffer.length) {
                return { status: false, msg: 'Arquivo vazio no WIP Bucket' };
            }

            const header = buffer.subarray(0, 12);
            let contentType = null;
            if (header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff) contentType = 'image/jpeg';
            else if (header[0] === 0x89 && header.toString('ascii', 1, 4) === 'PNG') contentType = 'image/png';
            else if (header.toString('ascii', 0, 4) === 'RIFF' && header.toString('ascii', 8, 12) === 'WEBP') contentType = 'image/webp';
            if (!contentType) {
                return { status: false, msg: 'A foto enviada não é JPEG, PNG ou WebP.' };
            }

            const image_base64 = `data:${contentType};base64,${buffer.toString('base64')}`;
            return {
                status: true,
                data: {
                    bucket: this.wipBucket,
                    objectName,
                    contentType,
                    image_base64,
                },
                msg: 'Arquivo obtido do WIP em base64 com sucesso',
            };
        } catch (error) {
            if (error.code === 'NoSuchKey' || error.code === 'NotFound') {
                return { status: false, notfound: true, msg: 'Arquivo não encontrado no WIP Bucket' };
            }
            return this.#handleError(error, 'obterArquivoBase64', 'Erro ao obter arquivo do WIP em base64');
        }
    }
    async validarMagicPdf({ objectName }) {
        try {
            if (!objectName) {
                return { status: false, msg: 'objectName é obrigatório' };
            }

            const client = this.client;
            if (!client) {
                return { status: false, msg: 'Client do bucket não inicializado' };
            }

            const stat = await client.statObject(this.wipBucket, objectName);
            if (!stat || !stat.size || Number(stat.size) < 5) {
                return { status: false, msg: 'Arquivo vazio ou inválido no WIP Bucket' };
            }

            const stream = await client.getPartialObject(this.wipBucket, objectName, 0, 5);
            const header = await new Promise((resolve, reject) => {
                const chunks = [];
                stream.on('data', chunk => chunks.push(chunk));
                stream.on('error', reject);
                stream.on('end', () => resolve(Buffer.concat(chunks)));
            });

            const magic = header.toString('utf8');
            if (magic !== '%PDF-') {
                return {
                    status: false,
                    msg: 'O arquivo enviado não é um PDF válido',
                    data: { bucket: this.wipBucket, objectName, magic },
                };
            }

            return {
                status: true,
                data: {
                    bucket: this.wipBucket,
                    objectName,
                    size: Number(stat.size),
                    etag: stat.etag,
                    contentType: stat.metaData?.['content-type'] || stat.metaData?.['Content-Type'] || null,
                },
                msg: 'Header PDF validado com sucesso',
            };
        } catch (error) {
            if (error.code === 'NoSuchKey' || error.code === 'NotFound') {
                return { status: false, msg: 'Arquivo não encontrado no WIP Bucket. Envie o PDF antes de confirmar.' };
            }
            return this.#handleError(error, 'validarMagicPdf', 'Erro ao validar header PDF no WIP Bucket');
        }
    }

    async validarImagem({ objectName }) {
        try {
            if (!objectName) return { status: false, msg: 'objectName é obrigatório' };
            const client = this.client;
            if (!client) return { status: false, msg: 'Client do bucket não inicializado' };
            const stat = await client.statObject(this.wipBucket, objectName);
            if (!stat || !stat.size || Number(stat.size) < 12) return { status: false, msg: 'Arquivo vazio ou inválido no WIP Bucket' };
            // const header = await client.getPartialObject(this.wipBucket, objectName, 0, 12);
            let contentType = null;
            // console.log('validarImagem', header)

            const stream = await client.getPartialObject(this.wipBucket, objectName, 0, 12);
            const header = await new Promise((resolve, reject) => {
                const chunks = [];
                stream.on('data', chunk => chunks.push(chunk));
                stream.on('error', reject);
                stream.on('end', () => resolve(Buffer.concat(chunks)));
            });
            if (header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff) contentType = 'image/jpeg';
            else if (header[0] === 0x89 && header.toString('ascii', 1, 4) === 'PNG') contentType = 'image/png';
            else if (header.toString('ascii', 0, 4) === 'RIFF' && header.toString('ascii', 8, 12) === 'WEBP') contentType = 'image/webp';
            if (!contentType) return { status: false, msg: 'A foto enviada não é JPEG, PNG ou WebP.' };
            return {
                status: true,
                data: { objectName, size: Number(stat.size), etag: stat.etag, contentType },
            };
        } catch (error) {
            if (error.code === 'NoSuchKey' || error.code === 'NotFound') {
                return { status: false, msg: 'Arquivo não encontrado no WIP Bucket. Envie a foto antes de confirmar.' };
            }
            return this.#handleError(error, 'validarMagicImagem', 'Erro ao validar header da foto no WIP Bucket');
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
            const stream = await client.getObject(this.wipBucket, objectName);

            return {
                status: true,
                data: {
                    bucket: this.wipBucket,
                    objectName,
                    stream,
                },
                msg: 'PDF obtido do WIP com sucesso',
            };
        } catch (error) {
            if (error.code === 'NoSuchKey' || error.code === 'NotFound') {
                return { status: false, msg: 'PDF não encontrado no WIP Bucket' };
            }
            return this.#handleError(error, 'obterPdf', 'Erro ao obter PDF do WIP Bucket');
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
                msg: 'Hash SHA-256 do PDF no WIP calculado com sucesso',
            };
        } catch (error) {
            return this.#handleError(error, 'calcularHashSha256', 'Erro ao calcular hash SHA-256 do PDF no WIP');
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
                msg: 'PDF do WIP encaminhado via stream com sucesso',
            };
        } catch (error) {
            return this.#handleError(error, 'pipePara', 'Erro ao encaminhar PDF do WIP via stream');
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
            const stat = await client.statObject(this.wipBucket, objectName);

            return {
                status: true,
                data: {
                    bucket: this.wipBucket,
                    objectName,
                    ...stat,
                },
                msg: 'Metadados do PDF no WIP obtidos com sucesso',
            };
        } catch (error) {
            if (error.code === 'NoSuchKey' || error.code === 'NotFound') {
                return { status: false, msg: 'PDF não encontrado no WIP Bucket' };
            }
            return this.#handleError(error, 'statPdf', 'Erro ao obter metadados do PDF no WIP Bucket');
        }
    }

    async removerPdf({ documentoId }) {
        return this.remove({ documentoId });
    }

    async remove({ documentoId }) {
        try {
            if (!documentoId) {
                return { status: false, msg: 'documentoId é obrigatório' };
            }

            const client = this.client;
            if (!client) {
                return { status: false, msg: 'Client do bucket não inicializado' };
            }

            const objectName = this.objectName(documentoId);
            await client.removeObject(this.wipBucket, objectName);

            return {
                status: true,
                data: {
                    bucket: this.wipBucket,
                    objectName,
                },
                msg: 'Arquivo removido do WIP com sucesso',
            };
        } catch (error) {
            return this.#handleError(error, 'removerFile', 'Erro ao remover arquivo do WIP Bucket');
        }
    }

    async urlTemporariaUpload({ documentoId, expiresInSeconds = 3600 }) {
        try {
            if (!documentoId) {
                return { status: false, msg: 'documentoId é obrigatório' };
            }

            const client = this.client;
            if (!client) {
                return { status: false, msg: 'Client do bucket não inicializado' };
            }

            const objectName = this.objectName(documentoId);
            const url = await client.presignedPutObject(
                this.wipBucket,
                objectName,
                expiresInSeconds
            );

            return {
                status: true,
                data: {
                    bucket: this.wipBucket,
                    objectName,
                    url,
                    expiresInSeconds,
                },
                msg: 'URL pré-assinada do WIP gerada com sucesso',
            };
        } catch (error) {
            return this.#handleError(error, 'urlAssinada', 'Erro ao gerar URL pré-assinada do WIP');
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
                this.wipBucket,
                key,
                expiresInSeconds
            );

            return {
                status: true,
                data: {
                    method: 'GET',
                    bucket: this.wipBucket,
                    objectName: key,
                    url,
                    expiresInSeconds,
                },
                msg: 'URL pré-assinada de download (GET) gerada com sucesso',
            };
        } catch (error) {
            return this.#handleError(error, 'urlDownloadGet', 'Erro ao gerar URL pré-assinada GET do WIP');
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
            descricaoDoErro: `Exeption estourada. WipController - ${method}`,
            linhaDoErro: lineError,
            nomeDoArquivo: fileName,
            data_criacao: dateNow(),
            data_atualizacao: dateNow(),
            deletado: false,
        }, msg);
        return { status: false, error, msg };
    }
}

module.exports = WipController;
