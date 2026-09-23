
require('dotenv/config');
const axios = require('axios');
const { googleOAuth } = require('../../../config');
const logs = require('../../../Logs');

// Consentimento do usuário (tipo "Aplicativo da Web") pro Drive — código de
// autorização + troca por tokens. Sem lib googleapis, igual ao resto do serviço.
class GoogleOAuth {

    montarUrlAutorizacao({ email, state }) {
        const params = new URLSearchParams({
            client_id: googleOAuth.clientId,
            redirect_uri: googleOAuth.redirectUri,
            response_type: 'code',
            access_type: 'offline',
            prompt: 'consent',
            include_granted_scopes: 'true',
            scope: googleOAuth.scope,
            login_hint: email,
            state,
        });
        return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
    }

    async trocarCodigoPorTokens(code) {
        try {
            const response = await axios.post('https://oauth2.googleapis.com/token', new URLSearchParams({
                client_id: googleOAuth.clientId,
                client_secret: googleOAuth.clientSecret,
                redirect_uri: googleOAuth.redirectUri,
                grant_type: 'authorization_code',
                code,
            }), { validateStatus: () => true });
            if (response.status !== 200 || !response.data || !response.data.access_token) {
                logs.getInstance().error({ statusHttp: response.status }, 'GoogleOAuth - trocarCodigoPorTokens falhou');
                return { status: false, msg: "O Google recusou o código de autorização. Abra 'Autorizar Drive' novamente no Addon." }
            }
            return { status: true, data: response.data }
        } catch (error) {
            logs.getInstance().error({ err: error.message }, 'GoogleOAuth - trocarCodigoPorTokens');
            return { status: false, msg: "Falha ao trocar o código de autorização com o Google." }
        }
    }

    async obterEmail(accessToken) {
        try {
            const response = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
                headers: { authorization: `Bearer ${accessToken}` },
                validateStatus: () => true,
            });
            if (response.status !== 200 || !response.data || !response.data.email) {
                return { status: false, msg: "Não foi possível confirmar o e-mail autorizado no Google." }
            }
            return { status: true, data: { email: response.data.email.trim().toLowerCase() } }
        } catch (error) {
            logs.getInstance().error({ err: error.message }, 'GoogleOAuth - obterEmail');
            return { status: false, msg: "Falha ao confirmar o e-mail autorizado no Google." }
        }
    }

}

module.exports = new GoogleOAuth();
