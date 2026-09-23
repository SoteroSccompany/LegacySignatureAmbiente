
require('dotenv/config');
const knex = require("../config/databaseConection")();
const ErrorStackParser = require('error-stack-parser');
const dateNow = require('../../gateways/functions/data/getToday');
const logs = require('../../../Logs');

class OauthDriveRepository {

    async getByEmail(data) {
        try {
            const response = await knex('tab_oauth_drive').select('*').where('email', data.email).andWhere('deletado', false).first()
            if (response) {
                return { status: true, exit: true, data: response, msg: "Consentimento do Drive encontrado com sucesso!" }
            } else {
                return { status: true, exit: false, msg: "Consentimento do Drive não encontrado!" }
            }
        } catch (error) {
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(error);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            logs.getInstance().fatal({ err: error, linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow() }, 'Erro no OauthDriveRepository - getByEmail')
            return { status: false, error: error, msg: "Não foi possivel buscar o consentimento do Drive!" }
        }
    }

    // Cada e-mail tem uma linha só: nova autorização substitui o refresh anterior
    // (mesmo espírito da lsak_/lsic_ — vínculo novo sobrepõe o antigo).
    async salvarConsentimento(data) {
        try {
            const check = await this.getByEmail({ email: data.email })
            if (!check.status) return { status: false, msg: "Não foi possivel salvar o consentimento do Drive!" }
            if (check.exit) {
                await knex('tab_oauth_drive').update({
                    refresh_token: data.refresh_token,
                    autorizado_em: data.autorizado_em,
                    data_atualizacao: dateNow(),
                }).where('id', check.data.id)
                return { status: true, msg: "Consentimento do Drive atualizado com sucesso!" }
            }
            const domainOauthDrive = require('../../../@core/domain/OauthDrive');
            await knex('tab_oauth_drive').insert(new domainOauthDrive({
                email: data.email,
                refresh_token: data.refresh_token,
                autorizado_em: data.autorizado_em,
            }).getOauthDrive())
            return { status: true, msg: "Consentimento do Drive criado com sucesso!" }
        } catch (error) {
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(error);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            logs.getInstance().fatal({ err: error, linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow() }, 'Erro no OauthDriveRepository - salvarConsentimento')
            return { status: false, error: error, msg: "Não foi possivel salvar o consentimento do Drive!" }
        }
    }

}

module.exports = new OauthDriveRepository();
