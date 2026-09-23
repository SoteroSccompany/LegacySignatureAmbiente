
require('dotenv/config');
const axios = require('axios');
const { legacyApi } = require('../../../config');
const logs = require('../../../Logs');

class ApiLegacy {

    // Um cookie/CSRF por lsak_ (chave '__svc' pras chamadas sem chave, ex.: OAuth,
    // handshake de instalação). Antes era uma instância só pro processo inteiro:
    // a cerimônia de um signatário e o card/vínculo de outro pisavam no mesmo
    // cookie e a sessão de assinatura (session.user.assinatura) da API sumia
    // no meio do OTP/selfie/PAdES.
    #jars = new Map();

    #jarKey(chave) {
        return chave || '__svc';
    }

    async #handshake(jarKey) {
        const bruto = process.env.KEY_API || legacyApi.apikey;
        const apikey = bruto.startsWith('Bearer ') ? bruto : `Bearer ${bruto}`;
        const response = await axios.get(`${legacyApi.url}/api/csrftoken`, {
            headers: { apikey },
            validateStatus: () => true,
        });
        if (response.status !== 200 || !response.data || !response.data.csrfToken) {
            logs.getInstance().error({ statusHttp: response.status }, 'ApiLegacy - handshake csrf falhou');
            return { status: false, msg: "Ocorreu um erro interno, tente novamente em instantes." }
        }
        const setCookie = response.headers['set-cookie'];
        if (!Array.isArray(setCookie) || setCookie.length === 0) return { status: false, msg: "Ocorreu um erro interno, tente novamente em instantes." }
        this.#jars.set(jarKey, {
            cookies: setCookie.map((c) => c.split(';')[0]).join('; '),
            csrf: response.data.csrfToken,
        });
        return { status: true }
    }

    async #request(metodo, path, body, chave, tentativa) {
        const jarKey = this.#jarKey(chave);
        let jar = this.#jars.get(jarKey);
        if (!jar) {
            const handshake = await this.#handshake(jarKey);
            if (!handshake.status) return { status: false, statusHttp: 0, msg: handshake.msg }
            jar = this.#jars.get(jarKey);
        }
        const bruto = process.env.KEY_API || legacyApi.apikey;
        const apikey = bruto.startsWith('Bearer ') ? bruto : `Bearer ${bruto}`;
        const headers = {
            apikey,
            cookie: jar.cookies,
            'x-csrf-token': jar.csrf,
            'content-type': 'application/json',
        };
        if (chave) headers['x-integracao-key'] = chave;
        const response = await axios({
            method: metodo,
            url: `${legacyApi.url}${path}`,
            data: body,
            headers,
            validateStatus: () => true,
            maxBodyLength: Infinity,
        });
        // 403 de negócio (chave revogada, sessão da cerimônia, permissão) sempre vem
        // no envelope {status,msg} da própria API — não é csrf/sessão do serviço e
        // não pode apagar o jar, senão mata a sessão de assinatura no meio do PAdES.
        // Só um 403 sem esse envelope (csurf/sessão do serviço mesmo) refaz o handshake.
        const erroDeNegocio = response.data && typeof response.data === 'object' && typeof response.data.msg === 'string';
        if (response.status === 403 && !erroDeNegocio && tentativa !== true) {
            this.#jars.delete(jarKey);
            return this.#request(metodo, path, body, chave, true);
        }
        return {
            status: response.status >= 200 && response.status < 300,
            statusHttp: response.status,
            data: response.data,
            msg: response.data?.msg || null,
        }
    }

    async get(path, chave) {
        return this.#request('get', path, undefined, chave, false);
    }

    async post(path, body, chave) {
        return this.#request('post', path, body, chave, false);
    }

    async put(path, body, chave) {
        return this.#request('put', path, body, chave, false);
    }

    // A API reescreve o MinIO interno pra BUCKET_PUBLIC_URL (localhost:7749) — serve
    // o browser no host. Daqui de dentro do Docker localhost é o próprio container.
    #urlBucketNaRedeDocker(url) {
        if (!url) return url;
        const host = process.env.PROXY_HOST || 'proxysignature';
        return String(url).replace(/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i, `http://${host}$2`);
    }

    // PUT do PDF na URL presignada do bucket (fora da API, sem cookie/apikey)
    async putArquivoPresign(url, buffer, contentType) {
        try {
            const response = await axios.put(this.#urlBucketNaRedeDocker(url), buffer, {
                headers: { 'content-type': contentType || 'application/pdf' },
                maxBodyLength: Infinity,
                validateStatus: () => true,
            });
            if (response.status < 200 || response.status >= 300) return { status: false, statusHttp: response.status, msg: "Falha no upload do arquivo para o bucket." }
            return { status: true, statusHttp: response.status, msg: "Upload concluído." }
        } catch (error) {
            logs.getInstance().error({ err: error.message }, 'ApiLegacy - putArquivoPresign');
            return { status: false, statusHttp: 0, msg: "Falha no upload do arquivo para o bucket." }
        }
    }

    // GET binário de URL pública/presignada (download do assinado)
    async getArquivoUrl(url) {
        try {
            const response = await axios.get(this.#urlBucketNaRedeDocker(url), {
                responseType: 'arraybuffer',
                maxContentLength: Infinity,
                validateStatus: () => true,
            });
            if (response.status !== 200) return { status: false, statusHttp: response.status, msg: "Falha ao baixar o arquivo." }
            return { status: true, statusHttp: response.status, data: Buffer.from(response.data) }
        } catch (error) {
            logs.getInstance().error({ err: error.message }, 'ApiLegacy - getArquivoUrl');
            return { status: false, statusHttp: 0, msg: "Falha ao baixar o arquivo." }
        }
    }

}

module.exports = new ApiLegacy();
