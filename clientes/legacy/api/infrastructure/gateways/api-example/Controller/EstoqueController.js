
const ErrorStackParser = require('error-stack-parser');
const logs = require('../../../../Logs')
const dateNowFunction = require('../../functions/data/getToday');
const APIUAU = require('../config/index');
const { isArray } = require('lodash');
const { statusApp, statusAplication } = require('../../../../certs/index');
const moment = require('moment');

class EstoqueController extends APIUAU {

    constructor() {
        super();
    }

    async GetEstoqueLimit(obra_id, limit, offset) {
        try {
            const response = await this.api.get(`/estoque/${obra_id}?limit=${limit}&offset=${offset}`);
            return { status: true, total: response.data.total, data: this.normalizeData(response.data.data) }
        } catch (err) {
            if (err.response) {
                if (err.response.status === 404) {
                    return { status: true, exit: false, msg: 'Obra não encontrada' }
                }
                if (err.response.status === 400 || err.response.status === 500 || err.response.status === 401 || err.response.status === 403) {
                    return { status: false, msg: err.response.data.message || 'Erro ao conectar com a API UAU!' }
                }
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

    async GetEstoque(data, isRetry = false) {
        try {
            let empresa = data.codigo_empreendimento;
            const response = await this.api.post(`/RotinasGerais/ExecutarConsultaGeral`, {
                // Id: 145,
                Id: 146,
                Personalizado: 1,
                Parameters: [
                    `Empresa`, `'${empresa}'`
                ]
            });
            if (response.data.length === 0) return { status: true, exit: false, msg: 'Estoque' }
            return { status: true, data: this.normalizeData(response.data) }
        } catch (err) {
            if (err.response) {
                if (err.response.status === 404) return { status: true, exit: false, msg: 'Obra não encontrada' }
                if (err.response.status === 401 && !isRetry) {
                    await this.Load(true);
                    return this.GetEstoque(data, true);
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

    normalizeData(data) {
        const mapSingleItem = (item) => {
            const parseMoney = (value) => {
                if (value === null || value === undefined || value === '' || value === '-' || value === ' ') return 0;
                if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
                let s = value.toString().trim();
                const hasComma = s.includes(',');
                const hasDot = s.includes('.');
                // Detecta o separador decimal pelo último símbolo (BR "1.234,56" ou en-US "1,234.56").
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

            return {
                id_externo: item.IdUnico,
                empresa: item.Empresa_unid || 'NA',
                numero_pessoa: item.NumPer_unid ? parseInt(item.NumPer_unid) : 0,
                obra: item.Obra_unid || 'NA',
                identificador: item.Identificador_unid || 'NA',
                quantidade: item.Qtde_unid ? parseInt(item.Qtde_unid) : 0,
                tabela_preco: item.Codigo_unid || '',
                percentual_categoria: item.PorcentPr_Unid ? parseInt(item.PorcentPr_Unid) : 0,
                preco_minimo: parseMoney(item.PrecoMin),
                valor_minimo: parseMoney(item.PrecoMin),
                status: item.Vendido_unid ? parseInt(item.Vendido_unid) : 0,
                descricao_status: item.Descr_status || 'Disponível',
                unidade_dacao_venda: String(item.Prod_unid ?? 0), //Código da unidade.
                tipo_contrato: String(item.TipoContrato_udt ?? 0),
                tipologia: item.Desc_csup || 'NA',
                tipologia_producao: item.Descricao_tipprod || 'NA',
                data_cadastro: item.DataCad_unid ? moment(item.DataCad_unid).format('YYYY-MM-DD') : moment().format('YYYY-MM-DD'),
                tipo_unidade_multipropriedade: String(item.TipoUnidMultipropriedade_udt ?? 0),
                caucionado: null,
                area: item.FracaoIdeal_unid ? parseFloat(item.FracaoIdeal_unid) : null,
                zoneamento: null,
                estoque: item.Qtde_unid ? parseFloat(item.Qtde_unid) : null
            };
        };

        if (Array.isArray(data)) {
            return data.map(item => mapSingleItem(item));
        } else {
            return mapSingleItem(data);
        }
    }

}


module.exports = EstoqueController;