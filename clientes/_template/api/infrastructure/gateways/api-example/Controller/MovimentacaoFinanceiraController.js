
const ErrorStackParser = require('error-stack-parser');
const logs = require('../../../../Logs')
const dateNowFunction = require('../../functions/data/getToday');
const APIUAU = require('../config/index');
const { isArray } = require('lodash');
const { statusAplication, statusApp } = require('../../../../certs/index');
const moment = require('moment');

class MovimentacaoFinanceira extends APIUAU {

    constructor() {
        super();
    }

    async GetMovimentacoesFinanceira(data, isRetry = false) {
        try {
            let empresa = `${data.codigo_empreendimento}|${data.codigo_obra}`;
            let dataInicial = statusAplication.status === statusApp.prod ? data.data_inicial : moment().subtract(1, 'year').format('YYYY-MM-DD');
            const response = await this.api.post(`/RotinasGerais/ExecutarConsultaGeral`, {
                Id: 11,
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
                    return this.GetMovimentacoesFinanceira(data, true);
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

        const mapItem = (item) => ({
            identificador: item.Chave1,
            descempresa: item.DescEmpresa || '',
            obra: item.Obra || '',
            descobra: item.DescObra || '',
            item: item.Item || '',
            comppl_des: item.CompPl_Des || '',
            descr_comp: item.Descr_Comp || '',
            cap_des: item.Cap_Des || item.Codigo_CAP ? String(item.Cap_Des || item.Codigo_CAP) : null,
            desccap_des: item.DescCap_Des || item.Centro_Custo || null,
            insumopl_des: item.InsumoPl_Des || '',
            descinspl_des: item.DescInsPl_Des || '',
            natureza: item.Natureza || '',
            grupo: item.Grupo || item.Grupo_Despesa || item.Macro_Categoria || item.GrupoIdx_Prc || '',
            macro_categoria: item.Macro_Categoria || '',
            grupo_despesa: item.Grupo_Despesa || '',
            centro_custo: item.Centro_Custo || item.DescCap_Des || null,
            cass: item.Cass || item.Cass_Es || '',
            ano: item.Ano || (item.Vencimento ? item.Vencimento.split('-')[0] : ''), // Extrai o ano do vencimento se a API omitir
            colunas1: item.Colunas1 || '',
            nominal: item.Nominal || '',
            fornecedor: item.Fornecedor || '',
            cnpj: item.CNPJ || '',
            nf: item.NF || '',
            processo: item.Processo || '',
            oc: item.OC || null,
            cotacao: item.Cotacao || null,
            banco: item.Banco ? String(item.Banco) : '',
            agencia: item.Agencia || '',
            conta: item.Conta || '',
            cheque: item.Cheque || '',
            bancoconta: item.BancoConta || '',
            numerobanco: item.numeroBanco ? String(item.numeroBanco) : '',
            nome_banco: item.Nome_banco || '',
            chave_venda: item.Chave_Venda || '',
            chave1: item.Chave1 || '',
            origem: item.Origem || '',
            tipoparc: item.TipoParc || '',
            produtopl_des: item.ProdutoPl_Des !== undefined ? String(item.ProdutoPl_Des) : '0',
            produto: item.Produto || '',
            relatorio: item.Relatorio ? String(item.Relatorio) : '2',
            identificador_unid: item.Identificador_unid || '',
            inicio: item.Inicio ? item.Inicio.split('T')[0] : null,
            fim: item.Fim ? item.Fim.split('T')[0] : null,
            vencimento: item.Vencimento ? item.Vencimento.split('T')[0] : null,
            emissao: item.Emissao ? item.Emissao.split('T')[0] : null,
            dtnf: item.DtNF ? item.DtNF.split('T')[0] : null,
            fim_mes: item.Fim_Mes ? item.Fim_Mes.split('T')[0] : null,
            valor: parseNumber(item.Valor),
            valornf: parseNumber(item.ValorNF),
            saldo_consolidado_investidor: parseNumber(item.Saldo_Consolidado_Investidor),
        });
        const targetData = data.data ? data.data : data;

        return Array.isArray(targetData) ? targetData.map(mapItem) : mapItem(targetData);
    }

}


module.exports = MovimentacaoFinanceira;