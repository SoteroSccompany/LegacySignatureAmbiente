
const ErrorStackParser = require('error-stack-parser');
const logs = require('../../../../Logs')
const dateNowFunction = require('../../functions/data/getToday');
const APIUAU = require('../config/index');
const { isArray } = require('lodash');
const { statusApp, statusAplication } = require('../../../../certs/index');
const moment = require('moment');

class VendasController extends APIUAU {

    constructor() {
        super();
    }

    async GetVendas(data, isRetry = false) {
        try {
            let empresa = `${data.codigo_empreendimento}|${data.codigo_obra}`;
            const response = await this.api.post(`/RotinasGerais/ExecutarConsultaGeral`, {
                Id: 10,
                Personalizado: 1,
                Parameters: [
                    `EmpresaObra`, `'${empresa}'`,
                    "DataInicio", `'${data.data_inicial}'`,
                    "DataTermino", `'${data.data_final}'`

                ]
            });
            if (response.data.length === 0) return { status: true, exit: false, msg: 'Vendas' }
            return { status: true, data: this.OutputMapper(response.data) }
        } catch (err) {
            if (err.response) {
                if (err.response.status === 404) return { status: true, exit: false, msg: 'Obra não encontrada' }
                if (err.response.status === 401 && !isRetry) {
                    await this.Load(true);
                    return this.GetVendas(data, true);
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

        const mapItem = (item) => {

            return {
                identificador: item.Chave,
                desc_emp: item.Desc_Emp || '',
                empresa: item.Empresa || '',
                obra_ven: item.Obra_Ven || '',
                descr_obr: item.Descr_Obr || '',
                obra: item.Obra || '',
                cliente_ven: item.Cliente_Ven ? String(item.Cliente_Ven) : '',
                nome_pes: item.Nome_Pes || '',
                cliente: item.Cliente || '',
                data_ven: item.Data_Ven ? item.Data_Ven.split('T')[0] : null,
                num_ven: item.Num_Ven ? String(item.Num_Ven) : '',
                // Status da venda (ex.: "0 - NORMAL", "1 - CANCELADA") — usado p/ excluir canceladas do VGV.
                status: item.Status ? String(item.Status) : '',
                // Mês/Ano inteiros já fornecidos pelo SQL (evita parsing frágil de string nas séries).
                mes_venda: (item.MesVenda !== null && item.MesVenda !== undefined && item.MesVenda !== '') ? parseInt(item.MesVenda) : null,
                ano_venda: (item.AnoVenda !== null && item.AnoVenda !== undefined && item.AnoVenda !== '') ? parseInt(item.AnoVenda) : null,
                identificador_unid: item.Identificador_Unid || null,
                bloco: item.Bloco || null,
                qtde_unid: item.Qtde_Unid ? String(item.Qtde_Unid) : '0',
                vlrvendido: item.VlrVendido ? String(item.VlrVendido) : '0.00',
                vlrreceber: item.VlrReceber ? String(item.VlrReceber) : '0.00',
                vlrrecebido: item.VlrRecebido ? String(item.VlrRecebido) : '0.00',
                recebercorr: item.ReceberCorr ? String(item.ReceberCorr) : '0.00',
                recebidocorr: item.RecebidoCorr ? String(item.RecebidoCorr) : '0.00',
                recebercorrantec: item.ReceberCorrAntec ? String(item.ReceberCorrAntec) : '0.00',
                vlrvendidocess: parseNumber(item.VlrVendidoCess),
                totalconf: parseNumber(item.TotalConf),
                vlrtotalproduto: parseNumber(item.VlrTotalProduto),
                desconto_ven: parseNumber(item.Desconto_Ven),
                acescimo_ven: parseNumber(item.Acescimo_Ven),
                vlrtotvenda: parseNumber(item.vlrTotVenda),
                totvendajuros: parseNumber(item.TotVendaJuros)
            };
        };

        return Array.isArray(data) ? data.map(mapItem) : mapItem(data);
    }
}


module.exports = VendasController;