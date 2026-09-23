
const ErrorStackParser = require('error-stack-parser');
const logs = require('../../../../Logs')
const dateNowFunction = require('../../functions/data/getToday');
const APIUAU = require('../config/index');
const { statusApp, statusAplication } = require('../../../../certs/index');
const { isArray } = require('lodash');
const moment = require('moment');

class AReceberController extends APIUAU {

    constructor() {
        super();
    }

    async GetAReceber(data, isRetry = false) {
        try {
            let empresa = `${data.codigo_empreendimento}|${data.codigo_obra}`
            let dataInicial = statusAplication.status === statusApp.prod ? data.data_inicial : moment().subtract(6, 'year').format('YYYY-MM-DD');
            // A Receber é a carteira FUTURA: a janela precisa avançar no tempo (a SQL filtra Data_Prc BETWEEN
            // inicio AND fim). Se o fim fosse "hoje", nenhuma parcela "a vencer" seria trazida -> 100% vencido.
            let dataFinal = moment(statusAplication.status === statusApp.prod ? data.data_final : undefined).add(15, 'years').format('YYYY-MM-DD');
            const response = await this.api.post(`/RotinasGerais/ExecutarConsultaGeral`, {
                Id: 15,
                Personalizado: 1,
                Parameters: [
                    `EmpresaObra`, `'${empresa}'`,
                    "DataInicio", `'${dataInicial}'`,
                    "DataFim", `'${dataFinal}'`

                ]
            });
            if (response.data.length === 0) return { status: true, exit: false, msg: 'Recebidos' }
            return { status: true, data: this.OutputMapper(response.data) }
        } catch (err) {
            if (err.response) {
                if (err.response.status === 404) return { status: true, exit: false, msg: 'Obra não encontrada' }
                if (err.response.status === 401 && !isRetry) {
                    await this.Load(true);
                    return this.GetAReceber(data, true);
                }
                if (err.response.status === 400 || err.response.status === 500 || err.response.status === 403) return { status: false, msg: err.response.data.message || 'Erro ao conectar com a API UAU!' }
            }
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(err);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            logs.getInstance().error({ err, created_at: dateNowFunction(), updated_at: dateNowFunction(), isDeleted: false }, "Erro ao realizar a busca na api uau")
            return {
                status: false, msg: 'Erro ao conectar com a API UAU!'
            }

        }
    }

    OutputMapper(data) {
        const parseNumber = (val) => {
            if (val === null || val === undefined || val === "" || val === "-" || val === " ") return 0;
            if (typeof val === 'number') return Number.isFinite(val) ? val : 0;
            let s = val.toString().trim();
            const hasComma = s.includes(',');
            const hasDot = s.includes('.');
            if (hasComma && hasDot) {
                s = s.lastIndexOf(',') > s.lastIndexOf('.')
                    ? s.replace(/\./g, '').replace(',', '.')
                    : s.replace(/,/g, '');
            } else if (hasComma) {
                s = s.replace(',', '.');
            }
            s = s.replace(/[^\d.-]/g, '');
            const parsed = parseFloat(s);
            return isNaN(parsed) ? 0 : parsed;
        };



        // Chave natural da parcela no UAU (grão correto p/ deduplicação): a venda sozinha
        // (NumVend_prc) se repete em todas as parcelas do contrato. A combinação abaixo
        // identifica unicamente cada parcela.
        const chaveParcela = (item) => [
            item.NumVend_prc,
            item.NumParc_Prc,
            item.NumParcGer_Prc,
            item.Tipo_Prc,
        ].map((v) => (v === null || v === undefined ? '' : String(v))).join('_');

        const mapItem = (item) => {
            return {
                venda: item.NumVend_prc !== null && item.NumVend_prc !== undefined ? String(item.NumVend_prc) : '',
                // Nome do cliente (Pessoas.nome_pes); cai para nome fantasia / cobrança e, por último, o código.
                cliente: item.nome_pes || item.NomeFant_Pes || item.NomePessoaCc || (item.Cliente_Prc ? String(item.Cliente_Prc) : ''),
                identificador: chaveParcela(item),
                tipo: item.descr_tv || '',
                parcela: item.QualParc || '1/1',
                status: item.Status_Prc !== null ? String(item.Status_Prc) : '0',
                empresa_ven: item.Empresa_ven ? String(item.Empresa_ven) : '',
                obra_ven: item.Obra_Ven || '',
                vencimento: item.Data_Prc ? item.Data_Prc.split('T')[0] : null,
                venc_pror: item.DataPror_Prc ? item.DataPror_Prc.split('T')[0] : null,
                fim_mes: item.DtParc_Prc ? item.DtParc_Prc.split('T')[0] : null,
                recebercorrantec: item.DataBaseResiduo_Ven ? item.DataBaseResiduo_Ven.split('T')[0] : null,
                // Decomposição original da parcela preservada (sem achatar tudo em Valor_Prc):
                principal: parseNumber(item.Valor_Prc),
                juros_comp: parseNumber(item.JurosParc_Prc),
                correcao: parseNumber(item.CorrecaoAtr_Ven),
                residuo: parseNumber(item.ValorResiduo_Prc),
                juros_atraso: parseNumber(item.Juros_Ven),
                multa_atraso: parseNumber(item.Multa_Ven),
                outros: parseNumber(item.ValorTaxaBol_prc),
                vlr_parcela: parseNumber(item.Valor_Prc), // valor da parcela
                vlrreceber: item.Valor_Prc ? String(item.Valor_Prc) : '0.00',
                vlrrecebido: '0.00',
                recebercorr: '0.00',
                recebidocorr: 0,
                // Campos de total da VENDA não existem no grão de parcela: não replicar Valor_Prc aqui.
                totalconf: 0,
                vlrtotalproduto: 0,
                desconto_ven: parseNumber(item.ValDescontoCusta_prc),
                acescimo_ven: parseNumber(item.ValorTaxaBol_prc),
                vlrtotvenda: 0,
                totvendajuros: 0,
            };
        };

        // Suporte caso a resposta venha encapsulada no nó .data do Axios
        const targetData = data.data ? data.data : data;

        return Array.isArray(targetData) ? targetData.map(mapItem) : mapItem(targetData);
    }

}


module.exports = AReceberController;