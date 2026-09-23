
require('dotenv/config');
const axios = require('axios');
const crypto = require('crypto');
const { drive, googleSA } = require('../../../config');
const logs = require('../../../Logs');

const base64url = (input) => Buffer.from(input).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

// Google Drive REST v3 com a conta de serviço (domain-wide delegation): o
// serviço nunca guarda token de usuário — assina um JWT com sub=email da
// instalação e troca por access_token, impersonando o Drive dela.
class DriveGateway {

    #tokenCache = new Map();

    async #accessToken(email) {
        if (!email) return { status: false, msg: "E-mail para impersonar no Drive não informado." }
        if (!googleSA.clientEmail || !googleSA.privateKey) {
            return { status: false, msg: "Conta de serviço do Drive não configurada. Contate o administrador." }
        }
        const chave = email.trim().toLowerCase();
        const cache = this.#tokenCache.get(chave);
        if (cache && cache.exp > Date.now() + 30000) return { status: true, data: cache.token }
        try {
            const agora = Math.floor(Date.now() / 1000);
            const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
            const claim = base64url(JSON.stringify({
                iss: googleSA.clientEmail,
                sub: chave,
                scope: googleSA.scope,
                aud: googleSA.tokenUrl,
                iat: agora,
                exp: agora + 3600,
            }));
            const assinador = crypto.createSign('RSA-SHA256');
            assinador.update(`${header}.${claim}`);
            const assinatura = assinador.sign(googleSA.privateKey).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
            const jwt = `${header}.${claim}.${assinatura}`;
            const response = await axios.post(googleSA.tokenUrl, new URLSearchParams({
                grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
                assertion: jwt,
            }), { validateStatus: () => true });
            if (response.status !== 200 || !response.data || !response.data.access_token) {
                logs.getInstance().error({ statusHttp: response.status, email: chave }, 'DriveGateway - accessToken da SA falhou');
                return { status: false, msg: `Falha ao autenticar a conta de serviço no Drive de ${chave}. Confira a delegação em todo o domínio no Admin do Workspace.` }
            }
            const token = response.data.access_token;
            const exp = Date.now() + (Number(response.data.expires_in || 3600) * 1000);
            this.#tokenCache.set(chave, { token, exp });
            return { status: true, data: token }
        } catch (error) {
            logs.getInstance().error({ err: error.message }, 'DriveGateway - accessToken');
            return { status: false, msg: "Falha ao autenticar a conta de serviço no Drive." }
        }
    }

    async getMetadados({ email, fileId }) {
        const token = await this.#accessToken(email);
        if (!token.status) return token;
        try {
            const response = await axios.get(`${drive.apiUrl}/files/${fileId}`, {
                params: { fields: 'id,name,mimeType,size,parents,shortcutDetails,trashed', supportsAllDrives: true },
                headers: { authorization: `Bearer ${token.data}` },
                validateStatus: () => true,
            });
            if (response.status === 404) return { status: true, exit: false, msg: "Arquivo não encontrado no Drive." }
            if (response.status !== 200) return { status: false, msg: "Falha ao consultar o Drive." }
            return { status: true, exit: true, data: response.data, msg: "Metadados obtidos com sucesso." }
        } catch (error) {
            logs.getInstance().error({ err: error.message }, 'DriveGateway - getMetadados');
            return { status: false, msg: "Falha ao consultar o Drive." }
        }
    }

    async baixarArquivo({ email, fileId }) {
        const token = await this.#accessToken(email);
        if (!token.status) return token;
        try {
            const response = await axios.get(`${drive.apiUrl}/files/${fileId}`, {
                params: { alt: 'media', supportsAllDrives: true },
                headers: { authorization: `Bearer ${token.data}` },
                responseType: 'arraybuffer',
                maxContentLength: drive.maxBytes,
                validateStatus: () => true,
            });
            if (response.status === 404) return { status: true, exit: false, msg: "Arquivo não encontrado no Drive." }
            if (response.status !== 200) return { status: false, msg: "Falha ao baixar o arquivo do Drive." }
            const buffer = Buffer.from(response.data);
            const sha256 = crypto.createHash('sha256').update(buffer).digest('hex');
            return { status: true, exit: true, data: { buffer, sha256, tamanho: buffer.length }, msg: "Arquivo baixado com sucesso." }
        } catch (error) {
            logs.getInstance().error({ err: error.message }, 'DriveGateway - baixarArquivo');
            return { status: false, msg: "Falha ao baixar o arquivo do Drive." }
        }
    }

    async uploadArquivo({ email, nome, parentId, buffer, contentType }) {
        const token = await this.#accessToken(email);
        if (!token.status) return token;
        try {
            const boundary = `addonservice${Date.now()}`;
            const metadata = JSON.stringify({ name: nome, parents: [parentId] });
            const corpo = Buffer.concat([
                Buffer.from(`--${boundary}\r\ncontent-type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n--${boundary}\r\ncontent-type: ${contentType}\r\n\r\n`),
                buffer,
                Buffer.from(`\r\n--${boundary}--`),
            ]);
            const response = await axios.post(`${drive.uploadUrl}/files`, corpo, {
                params: { uploadType: 'multipart', supportsAllDrives: true, fields: 'id,name,size,parents' },
                headers: {
                    authorization: `Bearer ${token.data}`,
                    'content-type': `multipart/related; boundary=${boundary}`,
                },
                maxBodyLength: Infinity,
                validateStatus: () => true,
            });
            if (response.status !== 200) return { status: false, msg: "Falha ao gravar o arquivo no Drive." }
            return { status: true, data: response.data, msg: "Arquivo gravado no Drive com sucesso." }
        } catch (error) {
            logs.getInstance().error({ err: error.message }, 'DriveGateway - uploadArquivo');
            return { status: false, msg: "Falha ao gravar o arquivo no Drive." }
        }
    }

    async criarPasta({ email, nome, parentId }) {
        const token = await this.#accessToken(email);
        if (!token.status) return token;
        try {
            const response = await axios.post(`${drive.apiUrl}/files`, {
                name: nome,
                mimeType: drive.mimePasta,
                parents: parentId ? [parentId] : undefined,
            }, {
                params: { supportsAllDrives: true, fields: 'id,name' },
                headers: { authorization: `Bearer ${token.data}` },
                validateStatus: () => true,
            });
            if (response.status !== 200) return { status: false, msg: "Falha ao criar a pasta no Drive." }
            return { status: true, data: response.data, msg: "Pasta criada com sucesso." }
        } catch (error) {
            logs.getInstance().error({ err: error.message }, 'DriveGateway - criarPasta');
            return { status: false, msg: "Falha ao criar a pasta no Drive." }
        }
    }

    async copiarArquivo({ email, fileId, parentId, nome }) {
        const token = await this.#accessToken(email);
        if (!token.status) return token;
        try {
            const response = await axios.post(`${drive.apiUrl}/files/${fileId}/copy`, {
                name: nome,
                parents: [parentId],
            }, {
                params: { supportsAllDrives: true, fields: 'id,name,size' },
                headers: { authorization: `Bearer ${token.data}` },
                validateStatus: () => true,
            });
            if (response.status !== 200) return { status: false, msg: "Falha ao copiar o arquivo no Drive." }
            return { status: true, data: response.data, msg: "Arquivo copiado com sucesso." }
        } catch (error) {
            logs.getInstance().error({ err: error.message }, 'DriveGateway - copiarArquivo');
            return { status: false, msg: "Falha ao copiar o arquivo no Drive." }
        }
    }

    // ID configurado ou nome — procura antes de criar (raiz não pode duplicar a cada pedido).
    async buscarPastaPorNome({ email, nome }) {
        const token = await this.#accessToken(email);
        if (!token.status) return token;
        try {
            const nomeEscapado = String(nome).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
            const response = await axios.get(`${drive.apiUrl}/files`, {
                params: {
                    q: `name = '${nomeEscapado}' and mimeType = '${drive.mimePasta}' and trashed = false`,
                    fields: 'files(id,name)',
                    supportsAllDrives: true,
                    includeItemsFromAllDrives: true,
                },
                headers: { authorization: `Bearer ${token.data}` },
                validateStatus: () => true,
            });
            if (response.status !== 200) return { status: false, msg: "Falha ao localizar a pasta no Drive." }
            const arquivos = response.data && Array.isArray(response.data.files) ? response.data.files : [];
            return { status: true, exit: arquivos.length > 0, data: arquivos[0] || null, msg: "Busca concluída." }
        } catch (error) {
            logs.getInstance().error({ err: error.message }, 'DriveGateway - buscarPastaPorNome');
            return { status: false, msg: "Falha ao localizar a pasta no Drive." }
        }
    }

}

module.exports = new DriveGateway();
