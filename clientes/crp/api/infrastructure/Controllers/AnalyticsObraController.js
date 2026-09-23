/**
 * Feito pelo agente netexperts
 * Módulo: AnalyticsObra — painel analítico read-only
 * Data: 2026-06-14
 *
 * Controller fino, APENAS métodos GET. Nenhum endpoint de escrita.
 * Respostas no padrão { status, data, msg }.
 */

const logExeption = require('../../@core/usecase/Logs/exeption/exeptionEstatisticas');
const ErrorStackParser = require('error-stack-parser');
const dateNow = require('../gateways/functions/data/getToday');
const analyticsObra = require('../../@core/usecase/AnalyticsObra/index');
const { resolveInvestidorObraId } = require('../gateways/helpers/analyticsObraAccess');

const handleError = (err, metodo, res) => {
    let lineError = '0';
    let fileName = '0';
    const stackFrames = ErrorStackParser.parse(err);
    if (stackFrames.length > 0) {
        lineError = stackFrames[0].lineNumber;
        fileName = stackFrames[0].fileName;
    }
    logExeption({ descricaoDoErro: `Exeption estourada. AnalyticsObraController - ${metodo}`, linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false });
    res.status(500).json({ status: false, msg: 'Erro interno no servidor', error: err });
};

// Função livre — Express não preserva `this` ao registrar handlers da classe.
const resolveObraIdForRequest = async (req, obraIdParam, res) => {
    const investidorId = req.session?.investidor?.id;
    if (!investidorId) return obraIdParam;
    const resolved = await resolveInvestidorObraId(investidorId, obraIdParam);
    if (!resolved) {
        res.status(403).json({ status: false, msg: 'Acesso negado a esta obra.' });
        return null;
    }
    return resolved;
};

class AnalyticsObraController {

    async getResumo(req, res) {
        try {
            const { obraId: obraIdParam } = req.params;
            if (!obraIdParam) return res.status(400).json({ status: false, msg: 'Campo obraId é obrigatório' });
            const obraId = await resolveObraIdForRequest(req, obraIdParam, res);
            if (!obraId) return;
            const { inicio, fim } = req.query;
            const response = await analyticsObra.resumo(obraId, { inicio, fim });
            if (!response.status) return res.status(400).json(response);
            res.status(200).json(response);
        } catch (err) {
            handleError(err, 'getResumo', res);
        }
    }

    async getArea(req, res) {
        try {
            const { obraId: obraIdParam, area } = req.params;
            if (!obraIdParam) return res.status(400).json({ status: false, msg: 'Campo obraId é obrigatório' });
            const obraId = await resolveObraIdForRequest(req, obraIdParam, res);
            if (!obraId) return;
            if (!analyticsObra.isAreaValida(area)) return res.status(400).json({ status: false, msg: 'Área inválida' });
            const { inicio, fim, ano, search, page, per_page } = req.query;
            const response = await analyticsObra.area(obraId, area, { inicio, fim, ano, search, page, per_page });
            if (!response.status) return res.status(400).json(response);
            res.status(200).json(response);
        } catch (err) {
            handleError(err, 'getArea', res);
        }
    }

    async getDetalhes(req, res) {
        try {
            const { obraId: obraIdParam, area } = req.params;
            if (!obraIdParam) return res.status(400).json({ status: false, msg: 'Campo obraId é obrigatório' });
            const obraId = await resolveObraIdForRequest(req, obraIdParam, res);
            if (!obraId) return;
            if (!analyticsObra.isAreaValida(area)) return res.status(400).json({ status: false, msg: 'Área inválida' });
            const { page, per_page, sort, sort_dir, filter, search, inicio, fim } = req.query;
            const response = await analyticsObra.detalhes(obraId, area, { page, per_page, sort, sort_dir, filter, search, inicio, fim });
            if (!response.status) return res.status(400).json(response);
            res.status(200).json(response);
        } catch (err) {
            handleError(err, 'getDetalhes', res);
        }
    }

    async getVendaContrato(req, res) {
        try {
            const { obraId: obraIdParam } = req.params;
            const { contrato } = req.query;
            if (!obraIdParam) return res.status(400).json({ status: false, msg: 'Campo obraId é obrigatório' });
            const obraId = await resolveObraIdForRequest(req, obraIdParam, res);
            if (!obraId) return;
            if (!contrato) return res.status(400).json({ status: false, msg: 'Campo contrato é obrigatório' });
            const response = await analyticsObra.vendaContrato(obraId, { contrato });
            if (!response.status) return res.status(400).json(response);
            res.status(200).json(response);
        } catch (err) {
            handleError(err, 'getVendaContrato', res);
        }
    }

    async getEstoqueUnidade(req, res) {
        try {
            const { obraId: obraIdParam } = req.params;
            const { identificador, id, fim } = req.query;
            if (!obraIdParam) return res.status(400).json({ status: false, msg: 'Campo obraId é obrigatório' });
            const obraId = await resolveObraIdForRequest(req, obraIdParam, res);
            if (!obraId) return;
            if (!id && !identificador) return res.status(400).json({ status: false, msg: 'Campo id ou identificador é obrigatório' });
            const response = await analyticsObra.estoqueUnidade(obraId, { id, identificador, fim });
            if (!response.status) return res.status(400).json(response);
            res.status(200).json(response);
        } catch (err) {
            handleError(err, 'getEstoqueUnidade', res);
        }
    }
}

module.exports = new AnalyticsObraController();
