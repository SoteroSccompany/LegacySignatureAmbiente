const FaceMatchConfig = require('./config');

class FaceMatchGateway extends FaceMatchConfig {

    #msgErro(error, fallback) {
        return error.response?.data?.msg || fallback;
    }

    async healthCheck() {
        return this.health();
    }

    async health() {
        try {
            if (!this.api) return { status: false, msg: 'Client do FaceMatch não inicializado. Verifique FACE_HOST e FACE_PORT.' };
            const response = await this.api.get(this.rotas.health.path);
            const data = response.data || {};
            const ok = data.status === 'ok' && data.models_loaded === true;
            return {
                status: ok,
                data,
                msg: ok ? 'FaceMatch disponível' : 'FaceMatch respondeu com estado inesperado',
            };
        } catch (error) {
            return this.handleError(error, 'health', this.#msgErro(error, 'Erro ao verificar conexão com o FaceMatch'));
        }
    }

    async vectorize({ image_base64 }) {
        try {
            if (!image_base64 || typeof image_base64 !== 'string') {
                return { status: false, msg: 'image_base64 é obrigatório' };
            }
            if (!this.api) return { status: false, msg: 'Client do FaceMatch não inicializado. Verifique FACE_HOST e FACE_PORT.' };
            const response = await this.api.post(this.rotas.vectorize.path, { image_base64 });
            const data = response.data || {};
            if (!data.success || !Array.isArray(data.embedding)) {
                return { status: false, msg: data.msg || 'Falha ao vetorizar a imagem.' };
            }
            return {
                status: true,
                data: {
                    embedding: data.embedding,
                    embedding_dim: data.embedding_dim,
                },
                msg: 'Embedding gerado com sucesso',
            };
        } catch (error) {
            return this.handleError(error, 'vectorize', this.#msgErro(error, 'Erro ao vetorizar imagem no FaceMatch'));
        }
    }

    async verifyMatch({ image_base64, stored_embedding, tolerance }) {
        try {
            if (!image_base64 || typeof image_base64 !== 'string') {
                return { status: false, msg: 'image_base64 é obrigatório' };
            }
            let embedding = stored_embedding;
            if (typeof embedding === 'string') {
                try {
                    embedding = JSON.parse(embedding);
                } catch {
                    return { status: false, msg: 'stored_embedding inválido.' };
                }
            }
            if (!Array.isArray(embedding) || embedding.length === 0) return { status: false, msg: 'stored_embedding é obrigatório e deve ser um array.' };
            if (!this.api) return { status: false, msg: 'Client do FaceMatch não inicializado. Verifique FACE_HOST e FACE_PORT.' };
            const payload = { image_base64, stored_embedding: embedding, tolerance: this.tolerance };
            const response = await this.api.post(this.rotas.verifyMatch.path, payload);
            const data = response.data || {};
            if (!data.success) {
                return { status: false, msg: data.msg || 'Falha ao verificar correspondência facial.' };
            }
            return {
                status: true,
                data: {
                    match: data.match === true,
                    distance: data.distance,
                    tolerance: data.tolerance,
                    cosine: data.cosine,
                },
                msg: data.match === true ? 'Rosto correspondente' : 'Rosto não correspondente',
            };
        } catch (error) {
            return this.handleError(error, 'verifyMatch', this.#msgErro(error, 'Erro ao verificar correspondência no FaceMatch'));
        }
    }
}

module.exports = new FaceMatchGateway();
