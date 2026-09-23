
const repositorioOauthDrive = require('../../../infrastructure/db/services/OauthDriveRepository');
const googleOAuth = require('../../../infrastructure/gateways/GoogleOAuth');
const dateNow = require('../../../infrastructure/gateways/functions/data/getToday');
const { SHA } = require('../../../infrastructure/gateways/crypt/sha');
const { googleOAuth: configOAuth } = require('../../../config');
const ErrorStackParser = require('error-stack-parser');
const logs = require('../../../Logs');

// Estado do fluxo (e-mail + validade) viaja cifrado no próprio parâmetro
// state — sem tabela nova pra isso, reaproveita o mesmo SHA da chave_api.
const STATE_TTL_MS = 10 * 60 * 1000;

class oauthDriveUseCase {

    iniciarAutorizacao(data) {
        try {
            if (!data.email || data.email.trim() === '') return { status: false, msg: "E-mail não pode ser vazio." }
            if (!configOAuth.clientId || !configOAuth.clientSecret || !configOAuth.redirectUri) {
                return { status: false, msg: "Autorização do Drive não configurada. Contate o administrador." }
            }
            const email = data.email.trim().toLowerCase();
            const sha = new SHA();
            const state = sha.encrypt(JSON.stringify({ email, exp: Date.now() + STATE_TTL_MS }));
            const url = googleOAuth.montarUrlAutorizacao({ email, state });
            return { status: true, data: { url } }
        } catch (err) {
            console.log(err)
            return { status: false, msg: 'Erro interno do servidor, log gerado' }
        }
    }

    async concluirAutorizacao(data) {
        try {
            if (!data.code || !data.state) return { status: false, msg: "Retorno do Google incompleto." }
            const sha = new SHA();
            let estado;
            try {
                estado = JSON.parse(sha.decrypt(data.state));
            } catch (err) {
                return { status: false, msg: "Sessão de autorização inválida. Abra 'Autorizar Drive' novamente no Addon." }
            }
            if (!estado.email || !estado.exp) return { status: false, msg: "Sessão de autorização inválida. Abra 'Autorizar Drive' novamente no Addon." }
            if (Date.now() > estado.exp) return { status: false, msg: "Sessão de autorização expirada. Abra 'Autorizar Drive' novamente no Addon." }

            const tokens = await googleOAuth.trocarCodigoPorTokens(data.code);
            if (!tokens.status) return { status: false, msg: tokens.msg }
            if (!tokens.data.refresh_token) {
                return { status: false, msg: "O Google não devolveu permissão permanente. Revogue o acesso anterior em myaccount.google.com/permissions e tente de novo." }
            }
            // Segunda checagem: o e-mail de fato autorizado no Google tem que
            // ser o mesmo que abriu o fluxo — não confiar só no login_hint.
            const confirmaEmail = await googleOAuth.obterEmail(tokens.data.access_token);
            if (!confirmaEmail.status) return { status: false, msg: confirmaEmail.msg }
            if (confirmaEmail.data.email !== estado.email) {
                return { status: false, msg: `A conta autorizada no Google (${confirmaEmail.data.email}) não é a mesma que iniciou a autorização (${estado.email}).` }
            }

            const persist = await repositorioOauthDrive.salvarConsentimento({
                email: estado.email,
                refresh_token: sha.encrypt(tokens.data.refresh_token),
                autorizado_em: dateNow(),
            })
            if (!persist.status) return { status: false, msg: "Ocorreu um erro interno, tente novamente em instantes." }
            return { status: true, msg: `Drive autorizado para ${estado.email}. Pode voltar ao Addon e vincular a chave.` }
        } catch (err) {
            console.log(err)
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(err);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            logs.getInstance().error({ linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), err }, 'Erro no oauthDriveUseCase - concluirAutorizacao')
            return { status: false, msg: 'Erro interno do servidor, log gerado' }
        }
    }

}

module.exports = new oauthDriveUseCase();
