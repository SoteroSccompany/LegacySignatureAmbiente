
const ErrorStackParser = require('error-stack-parser');
const logs = require('../../../../Logs')
const dateNowFunction = require('../../functions/data/getToday');
const APIUAU = require('../config/index');
const { isArray } = require('lodash');
const moment = require('moment');
const { statusApp, statusAplication } = require('../../../../certs/index');

class RecebidosController extends APIUAU {

    constructor() {
        super();
    }

    async GetRecebidos(data, isRetry = false) {
        try {
            let empresa = `${data.codigo_empreendimento}|${data.codigo_obra}`;
            let dataInicial = statusAplication.status === statusApp.prod ? data.data_inicial : moment().subtract(1, 'year').format('YYYY-MM-DD');
            const response = await this.api.post(`/RotinasGerais/ExecutarConsultaGeral`, {
                Id: 13,
                Personalizado: 1,
                Parameters: [
                    `EmpresaObra`, `'${empresa}'`,
                    "DataInicio", `'${dataInicial}'`,
                    "DataTermino", `'${data.data_final}'`

                ]
            });
            if (response.data.length === 0) return { status: true, exit: false, msg: 'Recebidos' }
            return { status: true, data: this.OutputMapper(response.data) }
        } catch (err) {
            if (err.response) {
                if (err.response.status === 404) return { status: true, exit: false, msg: 'Obra não encontrada' }
                if (err.response.status === 401 && !isRetry) {
                    await this.Load(true);
                    return this.GetRecebidos(data, true);
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
            // Detecta o separador decimal pelo que aparece por último (suporta BR "1.234,56" e en-US "1,234.56").
            if (hasComma && hasDot) {
                s = s.lastIndexOf(',') > s.lastIndexOf('.')
                    ? s.replace(/\./g, '').replace(',', '.')
                    : s.replace(/,/g, '');
            } else if (hasComma) {
                s = s.replace(',', '.');
            }
            // Só ponto (1234.56) ou sem separador: o ponto é decimal (NÃO remover — antes inflava 100x).
            s = s.replace(/[^\d.-]/g, '');
            const parsed = parseFloat(s);
            return isNaN(parsed) ? 0 : parsed;
        };

        const mapItem = (item) => ({
            identificador: item.NumVend_Rec || '',
            empresa_ven: item.Empresa_VRec ? String(item.Empresa_VRec) : '',
            obra_ven: item.Obra_VRec || '',
            venda: item.NumVend_Rec ? String(item.NumVend_Rec) : '',
            // Nome do cliente (Pessoas.nome_pes); cai para nome fantasia e, por último, o código.
            cliente: item.nome_pes || item.NomeFant_Pes || (item.Cliente_Rec ? String(item.Cliente_Rec) : ''),
            data_comp: item.Data_Rec ? item.Data_Rec.split('T')[0] : null,
            tipo: item.descr_tv || '',
            parcela: item.QualParc || '1/1',
            fim_mes: item.DataVenci_Rec ? item.DataVenci_Rec.split('T')[0] : null,
            vlr_parcela: parseNumber(item.VlrVenc),
            principal: parseNumber(item.TotPrinc),
            juros: parseNumber(item.TotJurParc),
            correcao: parseNumber(item.Correcao),
            multa_atr: parseNumber(item.Multa),
            juros_atr: parseNumber(item.JurosAtraso),
            corr_atr: parseNumber(item.CorrecaoAtr),
            outros: parseNumber(item.Outros),
            acres_desc: parseNumber(item.AcresDesc),
            total_dep: parseNumber(item.TotalDep),
            // Não depositado = valor previsto da parcela (VlrVenc) menos o efetivamente depositado (TotalDep).
            // Antes ambos recebiam TotalDep (duplicação). Clamp em 0 para evitar negativos por arredondamento.
            total_n_dep: Math.max(parseNumber(item.VlrVenc) - parseNumber(item.TotalDep), 0),
            vlrreceber: item.VlrVenc ? String(item.VlrVenc) : '0.00',
            vlrrecebido: item.TotalDep ? String(item.TotalDep) : '0.00',
            recebercorrantec: item.ReceberCorrAntec ? String(item.ReceberCorrAntec) : '0.00',
            recebercorr: item.ReceberCorr ? String(item.ReceberCorr) : '0.00',
            recebidocorr: item.RecebidoCorr ? String(item.RecebidoCorr) : '0.00',
            totalconf: parseNumber(item.TotalDep),
            vlrtotalproduto: parseNumber(item.TotParcel),
            desconto_ven: parseNumber(item.Desconto),
            acescimo_ven: parseNumber(item.AcresDesc),
            vlrtotvenda: parseNumber(item.TotalDep),
            totvendajuros: parseNumber(item.TotParcel)
        });

        return Array.isArray(data) ? data.map(mapItem) : mapItem(data);
    }

}


module.exports = RecebidosController;