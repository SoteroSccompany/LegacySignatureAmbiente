
require('dotenv/config');
const knex = require("../config/databaseConection")();
const ErrorStackParser = require('error-stack-parser');
const dateNow = require('../../gateways/functions/data/getToday');
const BaseRepository = require('.');
const logs = require('../../../Logs');

class DemarcacaoAssinaturaRepository extends BaseRepository {

    constructor() {
        super({ tableName: 'tab_demarcacoes_assinatura', knexOrTransaction: knex })
    }

    async createDemarcacaoAssinatura(data, trx = null) {
        try {
            const db = trx || knex;
            const payload = {
                ...data,
                pdf: typeof data.pdf === 'string' ? data.pdf : JSON.stringify(data.pdf),
                pagina_tamanho: typeof data.pagina_tamanho === 'string'
                    ? data.pagina_tamanho
                    : JSON.stringify(data.pagina_tamanho),
            }
            await db('tab_demarcacoes_assinatura').insert(payload)
            return { status: true, msg: "DemarcacaoAssinatura criada com sucesso!" }
        } catch (error) {
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(error);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            logs.getInstance().fatal({
                data_recive: JSON.stringify(data),
                err: error,
                descricaoDoErro: 'Exeption estourada. RepositorioDemarcacaoAssinatura - createDemarcacaoAssinatura',
                linhaDoErro: lineError,
                nomeDoArquivo: fileName,
                data_criacao: dateNow(),
            }, 'Erro no RepositorioDemarcacaoAssinatura - createDemarcacaoAssinatura')
            return { status: false, error, msg: "Não foi possivel criar a DemarcacaoAssinatura!" }
        }
    }

    async getDemarcacoesBySignatarioId(data) {
        try {
            const response = await knex('tab_demarcacoes_assinatura').select('*')
                .where('signatario_id', data.signatario_id)
                .andWhere('deletado', false)
            if (response.length > 0) {
                return { status: true, exit: true, data: response, msg: "Demarcacoes encontradas com sucesso!" }
            }
            return { status: true, exit: false, data: [], msg: "Nenhuma demarcacao encontrada!" }
        } catch (error) {
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(error);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            logs.getInstance().fatal({
                data_recive: data,
                err: error,
                descricaoDoErro: 'Exeption estourada. RepositorioDemarcacaoAssinatura - getDemarcacoesBySignatarioId',
                linhaDoErro: lineError,
                nomeDoArquivo: fileName,
                data_criacao: dateNow(),
            }, 'Erro no RepositorioDemarcacaoAssinatura - getDemarcacoesBySignatarioId')
            return { status: false, error, msg: "Não foi possivel buscar as Demarcacoes!" }
        }
    }

}

module.exports = new DemarcacaoAssinaturaRepository();
