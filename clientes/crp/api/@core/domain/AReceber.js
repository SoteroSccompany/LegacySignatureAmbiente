
const uuid = require('uuid');
const dateNow = require('../../infrastructure/gateways/functions/data/getToday');
class AReceberDomain {

    constructor(data) {
        this.id = data.id ? data.id : uuid.v4()
        this.obra_id = data.obra_id
        this.venda = data.venda
        this.cliente = data.cliente
        this.identificador = data.identificador
        this.tipo = data.tipo
        this.parcela = data.parcela
        this.status = data.status
        this.vencimento = data.vencimento
        this.venc_pror = data.venc_pror
        this.fim_mes = data.fim_mes
        this.principal = data.principal
        this.juros_comp = data.juros_comp
        this.correcao = data.correcao
        this.residuo = data.residuo
        this.juros_atraso = data.juros_atraso
        this.multa_atraso = data.multa_atraso
        this.outros = data.outros
        this.vlr_parcela = data.vlr_parcela
        this.vlrreceber = data.vlrreceber
        this.vlrrecebido = data.vlrrecebido
        this.recebercorrantec = data.recebercorrantec
        this.recebercorr = data.recebercorr
        this.recebidocorr = data.recebidocorr
        this.totalconf = data.totalconf
        this.vlrtotalproduto = data.vlrtotalproduto
        this.desconto_ven = data.desconto_ven
        this.acescimo_ven = data.acescimo_ven
        this.vlrtotvenda = data.vlrtotvenda
        this.totvendajuros = data.totvendajuros
        this.data_criacao = data.data_criacao
        this.data_atualizacao = data.data_atualizacao ? data.data_atualizacao : dateNow()
        this.deletado = data.deletado === true || data.deletado === false ? data.deletado : false

    }

    getAReceber() {
        return {
            id: this.id,
            obra_id: this.obra_id,
            venda: this.venda,
            cliente: this.cliente,
            identificador: this.identificador,
            tipo: this.tipo,
            parcela: this.parcela,
            status: this.status,
            vencimento: this.vencimento,
            venc_pror: this.venc_pror,
            fim_mes: this.fim_mes,
            principal: this.principal,
            juros_comp: this.juros_comp,
            correcao: this.correcao,
            residuo: this.residuo,
            juros_atraso: this.juros_atraso,
            multa_atraso: this.multa_atraso,
            outros: this.outros,
            vlr_parcela: this.vlr_parcela,
            vlrreceber: this.vlrreceber,
            vlrrecebido: this.vlrrecebido,
            recebercorrantec: this.recebercorrantec,
            recebercorr: this.recebercorr,
            recebidocorr: this.recebidocorr,
            totalconf: this.totalconf,
            vlrtotalproduto: this.vlrtotalproduto,
            desconto_ven: this.desconto_ven,
            acescimo_ven: this.acescimo_ven,
            vlrtotvenda: this.vlrtotvenda,
            totvendajuros: this.totvendajuros,
            data_criacao: this.data_criacao,
            data_atualizacao: this.data_atualizacao,
            deletado: this.deletado,

        }
    }

    setAReceber(data) {
        this.id = data.id ? data.id : this.id
        this.obra_id = data.obra_id ? data.obra_id : this.obra_id
        this.venda = data.venda ? data.venda : this.venda
        this.cliente = data.cliente ? data.cliente : this.cliente
        this.identificador = data.identificador ? data.identificador : this.identificador
        this.tipo = data.tipo ? data.tipo : this.tipo
        this.parcela = data.parcela ? data.parcela : this.parcela
        this.status = data.status ? data.status : this.status
        this.vencimento = data.vencimento ? data.vencimento : this.vencimento
        this.venc_pror = data.venc_pror ? data.venc_pror : this.venc_pror
        this.fim_mes = data.fim_mes ? data.fim_mes : this.fim_mes
        this.principal = data.principal ? data.principal : this.principal
        this.juros_comp = data.juros_comp ? data.juros_comp : this.juros_comp
        this.correcao = data.correcao ? data.correcao : this.correcao
        this.residuo = data.residuo ? data.residuo : this.residuo
        this.juros_atraso = data.juros_atraso ? data.juros_atraso : this.juros_atraso
        this.multa_atraso = data.multa_atraso ? data.multa_atraso : this.multa_atraso
        this.outros = data.outros ? data.outros : this.outros
        this.vlr_parcela = data.vlr_parcela ? data.vlr_parcela : this.vlr_parcela
        this.vlrreceber = data.vlrreceber ? data.vlrreceber : this.vlrreceber
        this.vlrrecebido = data.vlrrecebido ? data.vlrrecebido : this.vlrrecebido
        this.recebercorrantec = data.recebercorrantec ? data.recebercorrantec : this.recebercorrantec
        this.recebercorr = data.recebercorr ? data.recebercorr : this.recebercorr
        this.recebidocorr = data.recebidocorr ? data.recebidocorr : this.recebidocorr
        this.totalconf = data.totalconf ? data.totalconf : this.totalconf
        this.vlrtotalproduto = data.vlrtotalproduto ? data.vlrtotalproduto : this.vlrtotalproduto
        this.desconto_ven = data.desconto_ven ? data.desconto_ven : this.desconto_ven
        this.acescimo_ven = data.acescimo_ven ? data.acescimo_ven : this.acescimo_ven
        this.vlrtotvenda = data.vlrtotvenda ? data.vlrtotvenda : this.vlrtotvenda
        this.totvendajuros = data.totvendajuros ? data.totvendajuros : this.totvendajuros
        this.data_criacao = data.data_criacao ? data.data_criacao : this.data_criacao
        this.data_atualizacao = data.data_atualizacao ? data.data_atualizacao : this.data_atualizacao
        this.deletado = data.deletado === true || data.deletado === false ? data.deletado : false

        return this.getAReceber()
    }

}

module.exports = AReceberDomain;
