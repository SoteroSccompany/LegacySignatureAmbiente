
const ErrorStackParser = require('error-stack-parser');
const dateNow = require('../gateways/functions/data/getToday');
const oauthDriveUseCase = require('../../@core/usecase/OauthDrive/oauthDriveUseCase');
const logs = require('../../Logs');

// Consentimento do usuário pro Drive (obrigatório antes do vínculo da lsak_).
// O card do Addon abre /oauth/start com OpenLink; o callback é público (o
// próprio Google chega aqui) e devolve uma página curta, sem JSON.
class OauthController {

    async getStart(req, res) {
        try {
            const email = req.query.email;
            if (!email || String(email).trim() === '') return res.status(400).send(paginaOauth(false, 'Informe o e-mail da conta Google antes de autorizar o Drive.'))
            const response = oauthDriveUseCase.iniciarAutorizacao({ email: String(email) })
            if (!response.status) return res.status(400).send(paginaOauth(false, response.msg))
            return res.redirect(response.data.url)
        } catch (err) {
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(err);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            logs.getInstance().error({ linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), err }, 'Erro no OauthController - getStart')
            res.status(500).send(paginaOauth(false, 'Erro interno no servidor.'))
        }
    }

    async getCallback(req, res) {
        try {
            const { code, state, error } = req.query;
            if (error) return res.status(400).send(paginaOauth(false, `Autorização recusada no Google: ${error}`))
            if (!code || !state) return res.status(400).send(paginaOauth(false, 'Parâmetros de retorno do Google ausentes.'))
            const response = await oauthDriveUseCase.concluirAutorizacao({ code: String(code), state: String(state) })
            res.status(response.status ? 200 : 400).send(paginaOauth(response.status, response.msg))
        } catch (err) {
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(err);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            logs.getInstance().error({ linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), err }, 'Erro no OauthController - getCallback')
            res.status(500).send(paginaOauth(false, 'Erro interno no servidor.'))
        }
    }

}

function paginaOauth(sucesso, mensagem) {
    const cor = sucesso ? '#188038' : '#c5221f';
    const titulo = sucesso ? 'Drive autorizado' : 'Não foi possível autorizar';
    const texto = String(mensagem || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>` +
        `body{font-family:Arial,sans-serif;background:#f0f2f5;margin:0;padding:40px;color:#202124}` +
        `.box{max-width:480px;margin:0 auto;background:#fff;border:1px solid #dadce0;border-radius:8px;padding:28px}` +
        `h1{font-size:20px;margin:0 0 12px;color:${cor}}p{margin:0;line-height:1.5;color:#5f6368}` +
        `</style></head><body><div class="box"><h1>${titulo}</h1><p>${texto}</p>` +
        `<p style="margin-top:16px">Pode voltar ao Addon e continuar por lá.</p></div></body></html>`;
}

module.exports = new OauthController();
