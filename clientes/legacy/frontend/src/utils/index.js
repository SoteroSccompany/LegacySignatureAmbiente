import axios from 'axios'
import { jsonConfig } from '../Config'
import { IDENTITY_STATE_KEY } from '../services/identity/types'

const functions = {
    formatCpf: (cpf) => {
        return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4")

    }
}

const clearLocalSession = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('permisssion')
    localStorage.removeItem('cliente')
    localStorage.removeItem('usuario')
    localStorage.removeItem('userEmail')
    localStorage.removeItem('userId')
    localStorage.removeItem('pending2FA')
    localStorage.removeItem('identityPartial')
    localStorage.removeItem('biometriaObrigatoria')
    sessionStorage.removeItem(IDENTITY_STATE_KEY)
}

// Cache curto do csrfToken na aba: evita serializar um GET /csrftoken antes de
// cada POST da cerimônia (ex.: 2FA -> foto -> statusFoto em sequência rápida).
let csrfTokenCache = null;
let csrfTokenCacheExpiraEm = 0;
const CSRF_CACHE_MS = 60000;
const CSRF_TIMEOUT_MS = 10000;

const csrfInterceptor = async (config) => {
    const method = config.method?.toUpperCase();
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
        if (csrfTokenCache && Date.now() < csrfTokenCacheExpiraEm) {
            config.headers['X-CSRF-Token'] = csrfTokenCache;
            return config;
        }
        // Timeout explícito: sem isso, uma falha muda de rede/proxy no
        // /csrftoken pendura a Promise e o POST nunca resolve nem rejeita.
        try {
            const { data } = await axios.get(`${jsonConfig.urlAPI}/csrftoken`, {
                withCredentials: true,
                timeout: CSRF_TIMEOUT_MS,
                headers: {
                    "proxyauthorization": jsonConfig.APIKEY,
                }
            });
            csrfTokenCache = data.csrfToken;
            csrfTokenCacheExpiraEm = Date.now() + CSRF_CACHE_MS;
            config.headers['X-CSRF-Token'] = csrfTokenCache;
        } catch (error) {
            csrfTokenCache = null;
            csrfTokenCacheExpiraEm = 0;
            return Promise.reject(error);
        }
    }
    return config;
};

// 401 ou revokeLogin: sessão morreu no backend — limpa o estado local e volta pro login.
// Fluxos públicos (/assinar, /verificar) tratam o 401 na própria view — não são o login do painel.
const sessionInterceptor = (error) => {
    const status = error?.response?.status;
    const revoke = error?.response?.data?.revokeLogin === true;
    const path = window.location.pathname;
    const fluxoPublico = path.startsWith('/assinar') || path.startsWith('/verificar');
    if ((status === 401 || revoke) && !fluxoPublico) {
        clearLocalSession();
        if (window.location.pathname !== '/') {
            window.location.assign('/');
        }
    }
    return Promise.reject(error);
};

const buildInstance = (baseURL) => {
    const instance = axios.create({
        baseURL,
        withCredentials: true,
        headers: {
            "proxyauthorization": jsonConfig.APIKEY
        }
    });
    instance.interceptors.request.use(csrfInterceptor, (error) => {
        console.log(error)
        return Promise.reject(error);
    });
    instance.interceptors.response.use((response) => response, sessionInterceptor);
    return instance;
};

const conection = {
    // rotas do painel (/api/admin via proxy /signature/admin)
    auth: () => buildInstance(`${jsonConfig.urlAPI}/admin`),
    noAuth: () => buildInstance(`${jsonConfig.urlAPI}/admin`),
    // rotas públicas da raiz da API (ex.: /verificar/:codigo)
    raiz: () => buildInstance(`${jsonConfig.urlAPI}`),
}

const truncate = (str, n) => {
    return (str.length > n) ? str.substr(0, n - 1) + '...' : str;
};

const formatCpf = (cpf) => {
    return cpf?.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4")

}


export { functions, conection, truncate, formatCpf, clearLocalSession }
