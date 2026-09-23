
require('dotenv/config');
const knex = require("../config/databaseConection")();
const moment = require('moment');
const Log = require('../../../@core/usecase/Logs/databaseLog');
const ErrorStackParser = require('error-stack-parser');
const dateNow = require('../../gateways/functions/data/getToday');
const uuid = require('uuid');
const { roles, recovery } = require('../../../certs');
const logs = require('../../../Logs');
class EstatisticasRepository {


    async createEstatisticas(data) {
        try {
            const response = await knex('tab_estatisticas').insert(data)
            return { status: true, data: response, msg: "Estatisticas criado com sucesso!" }
        } catch (error) {
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(error);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            Log({ ...data, error, descricaoDoErro: 'Exeption estourada. RepositorioEstatisticas - createEstatisticas', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            return { status: false, error: error, msg: "Não foi possivel criar o Estatisticas!" }
        }
    }

    async updateEstatisticas(data) {
        try {
            await knex('tab_estatisticas').update(data).where('id', data.id)
            return { status: true, msg: "Estatisticas atualizado com sucesso!" }
        } catch (error) {
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(error);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            Log({ ...data, descricaoDoErro: 'Exeption estourada. RepositorioEstatisticas - updateEstatisticas', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            return { status: false, error: error, msg: "Não foi possivel atualizar o Estatisticas!" }
        }
    }

    async getStatisticsNamePage(data) {
        try {
            const response = await knex('tab_estatisticas').select('*').where('pagina', data.pagina).andWhere('deletado', false)
            if (response.length > 0) {
                return { status: true, data: response[0], msg: "Estatisticas encontrado com sucesso!" }
            } else {
                const jsonBlankPage = {}
                const objStatistics = {
                    id: uuid.v4(),
                    pagina: data.pagina,
                    dataEstatisticas: JSON.stringify(jsonBlankPage),
                    data_criacao: dateNow(),
                    data_atualizacao: dateNow(),
                    deletado: false
                }
                const response = await this.createEstatisticas(objStatistics)
                if (response.status) {
                    return { status: true, data: objStatistics, msg: "Estatisticas não encontrado!" }
                } else {
                    return { status: false, data: response, msg: "Estatisticas não encontrado!" }
                }
            }
        } catch (error) {
            console.log(error)
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(error);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            Log({ ...data, error, descricaoDoErro: 'Exeption estourada. RepositorioEstatisticas - getStatisticsNamePage', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            return { status: false, error: error, msg: "Não foi possivel buscar o Estatisticas!" }
        }

    }


    async getEstatisticasRecuperacaoSenha(data) {
        try {
            const dateTimeExpire = moment().subtract(recovery.maxTime, recovery.type).format('YYYY-MM-DD HH:mm')

            const formatExpireTime = knex.raw('DATE_FORMAT(?, "%Y-%m-%d %H:%i")', [dateTimeExpire]);

            const totalSolicitacoes = await knex('tab_perdeu_senha').count('tab_perdeu_senha.id as total').where('tab_perdeu_senha.deletado', false)
                .whereNot('tab_usuarios.role', roles.system)
                .innerJoin('tab_usuarios', 'tab_perdeu_senha.user_id', 'tab_usuarios.id')

            const totalExpirados = await knex('tab_perdeu_senha').count('tab_perdeu_senha.id as total').where('tab_perdeu_senha.deletado', false)
                .whereNot('tab_usuarios.role', roles.system)
                .whereRaw('DATE_FORMAT(tab_perdeu_senha.data_criacao, "%Y-%m-%d %H:%i") < ?', formatExpireTime)
                .innerJoin('tab_usuarios', 'tab_perdeu_senha.user_id', 'tab_usuarios.id')

            const totalAtivos = await knex('tab_perdeu_senha').count('tab_perdeu_senha.id as total').where('tab_perdeu_senha.deletado', false)
                .whereNot('tab_usuarios.role', roles.system)
                .whereRaw('DATE_FORMAT(tab_perdeu_senha.data_criacao, "%Y-%m-%d %H:%i") >= ?', formatExpireTime)
                .innerJoin('tab_usuarios', 'tab_perdeu_senha.user_id', 'tab_usuarios.id')

            return {
                status: true,
                data: [
                    { title: "Total de Solicitações", value: totalSolicitacoes[0].total },
                    { title: "Total de Links Expirados", value: totalExpirados[0].total },
                    { title: "Total de Links Ativos", value: totalAtivos[0].total }
                ],
                msg: "Estatisticas encontrado com sucesso!"
            }
        } catch (error) {
            console.log(error)
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(error);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            Log({ ...data, error, descricaoDoErro: 'Exeption estourada. RepositorioEstatisticas - getStatisticsAssinaturas', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            return { status: false, error: error, msg: "Não foi possivel buscar o Estatisticas!" }
        }

    }

    async getEstatisticasUsuarios(data) {
        try {
            const totalUsuariosAdmin = await knex('tab_usuarios').count('id as total').where('deletado', false).andWhere('role', roles.admin)
            const totalUsuariosNotAdmin = await knex('tab_usuarios').count('id as total').where('deletado', false).whereNot('role', roles.admin)
                .andWhereNot('role', roles.system).andWhereNot('role', roles.admin);
            const totalUsuariosBloqueados = await knex("tab_usuarios").count('id as total').where('deletado', false).andWhere('bloqueado', true)
            const totalUsuariosAtivos = await knex("tab_usuarios").count('id as total').where('deletado', false).andWhere('bloqueado', false).andWhereNot('role', roles.system)
            return {
                status: true,
                data: [
                    { title: "Total de Administradores", value: totalUsuariosAdmin[0].total },
                    { title: "Total de não Administradores", value: totalUsuariosNotAdmin[0].total },
                    { title: "Total de Bloqueados", value: totalUsuariosBloqueados[0].total },
                    { title: "Total de Ativos", value: totalUsuariosAtivos[0].total }
                ],
                msg: "Estatisticas encontrado com sucesso!"
            }
        } catch (error) {
            console.log(error)
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(error);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            Log({ ...data, error, descricaoDoErro: 'Exeption estourada. RepositorioEstatisticas - getStatisticsAssinaturas', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            return { status: false, error: error, msg: "Não foi possivel buscar o Estatisticas!" }
        }

    }


    async getEstatisticasLogs(data) {
        try {
            const totalLogs = await knex('tab_logs_do_sistema').count('id as total').where('deletado', false)
            return {
                status: true,
                data: [
                    { title: "Total de Logs", value: totalLogs[0].total }
                ],
                msg: "Estatisticas encontrado com sucesso!"
            }
        } catch (error) {
            console.log(error)
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(error);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            Log({ ...data, error, descricaoDoErro: 'Exeption estourada. RepositorioEstatisticas - getStatisticsAssinaturas', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            return { status: false, error: error, msg: "Não foi possivel buscar o Estatisticas!" }
        }

    }

    async getDashBoard() {
        try {
            const totalSolicitacoes = await knex('tab_solicitacao_documento').count('id as total')
            const aguardandoAssinatura = await knex('tab_documentos').count('id as total').where('status', 'DOCUMENTO_AGUARDANDO_ASSINATURA')
            const documentosAssinados = await knex('tab_documentos').count('id as total').where('status', 'DOCUMENTO_ASSINADO')
            const signatariosPendentes = await knex('tab_signatarios').count('id as total').whereIn('status', ['PENDING', 'PROCESSING', 'AGUARDANDO_ONBOARDING']).andWhere('deletado', false)

            return {
                status: true,
                data: [
                    { title: "Solicitações", value: totalSolicitacoes[0].total },
                    { title: "Aguardando assinatura", value: aguardandoAssinatura[0].total },
                    { title: "Documentos assinados", value: documentosAssinados[0].total },
                    { title: "Signatários pendentes", value: signatariosPendentes[0].total }
                ],
                msg: "Estatisticas encontrado com sucesso!"
            }
        } catch (error) {
            console.log(error)
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(error);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            Log({ error, descricaoDoErro: 'Exeption estourada. RepositorioEstatisticas - getStatisticsAssinaturas', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            return { status: false, error: error, msg: "Não foi possivel buscar o Estatisticas!" }
        }

    }

    async getInvestidores() {
        try {
            const totalInvestidores = await knex('tab_investidores').count('id as total').where('deletado', false)
            const totalInvestidoresAtivos = await knex('tab_investidores').count('id as total').where('deletado', false).where('bloqueado', 1);
            const totalInvestidoresInativos = await knex('tab_investidores').count('id as total').where('deletado', false).where('bloqueado', 0);

            return {
                status: true,
                data: [
                    { title: "Total de Investidores", value: totalInvestidores[0].total },
                    { title: "Total de Investidores Ativos", value: totalInvestidoresAtivos[0].total },
                    { title: "Total de Investidores Inativos", value: totalInvestidoresInativos[0].total }
                ],
                msg: "Estatisticas encontrado com sucesso!"
            }
        } catch (error) {
            console.log(error)
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(error);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            Log({ error, descricaoDoErro: 'Exeption estourada. RepositorioEstatisticas - getStatisticsAssinaturas', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            return { status: false, error: error, msg: "Não foi possivel buscar o Estatisticas!" }
        }

    }

    async getEmpreendimentos() {
        try {
            const totalInvestidores = await knex('tab_empreendimento').count('id as total').where('deletado', false);


            return {
                status: true,
                data: [
                    { title: "Total dos empreendimentos", value: totalInvestidores[0].total }
                ],
                msg: "Estatisticas encontrado com sucesso!"
            }
        } catch (error) {
            console.log(error)
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(error);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            Log({ error, descricaoDoErro: 'Exeption estourada. RepositorioEstatisticas - getStatisticsAssinaturas', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            return { status: false, error: error, msg: "Não foi possivel buscar o Estatisticas!" }
        }

    }


    async getEstatisticasEstoque(obra_id) {
        try {
            const [agregados, top5] = await Promise.all([
                knex('tab_estoque_obra')
                    .where({ obra_id, deletado: false })
                    .select(
                        knex.raw('COUNT(*) as total'),
                        knex.raw('MAX(valor_minimo) as maior_valor'),
                        knex.raw('MIN(valor_minimo) as menor_valor'),
                        knex.raw('ROUND(AVG(valor_minimo), 2) as valor_medio'),
                        knex.raw("SUM(CASE WHEN LOWER(descricao_status) LIKE '%vendid%' THEN 1 ELSE 0 END) as vendidos"),
                        knex.raw("SUM(CASE WHEN LOWER(descricao_status) LIKE '%disponiv%' OR LOWER(descricao_status) LIKE '%dispon\u00edv%' THEN 1 ELSE 0 END) as disponiveis"),
                        knex.raw("SUM(CASE WHEN LOWER(descricao_status) LIKE '%quita%' THEN 1 ELSE 0 END) as quitados")
                    )
                    .first(),
                knex('tab_estoque_obra')
                    .where({ obra_id, deletado: false })
                    .select('identificador', 'valor_minimo', 'descricao_status', 'estoque')
                    .orderBy('valor_minimo', 'desc')
                    .limit(5)
            ])

            return {
                status: true,
                data: {
                    cards: [
                        { title: 'Total de Unidades', value: agregados.total },
                        { title: 'Maior Preço', value: agregados.maior_valor },
                        { title: 'Menor Valor', value: agregados.menor_valor },
                        { title: 'Valor Médio', value: agregados.valor_medio },
                    ],
                    statusCards: [
                        { title: 'Disponíveis', value: agregados.disponiveis },
                        { title: 'Vendidos', value: agregados.vendidos },
                        { title: 'Quitados', value: agregados.quitados },
                    ],
                    top5
                },
                msg: 'Estatísticas de estoque encontradas com sucesso!'
            }
        } catch (error) {
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(error);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            Log({ error, descricaoDoErro: 'Exeption estourada. RepositorioEstatisticas - getEstatisticasEstoque', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            return { status: false, error, msg: 'Não foi possivel buscar as estatísticas de estoque!' }
        }
    }

    async getEstatisticasVendas(obra_id) {
        try {
            const [agregados, graficoMensal] = await Promise.all([
                knex('tab_vendas')
                    .where({ obra_id, deletado: false })
                    .whereNotNull('recebidocorr')
                    .where(knex.raw("TRIM(recebidocorr) != ''"))
                    .select(
                        knex.raw('COUNT(*) as total_vendas'),
                        knex.raw('ROUND(SUM(CAST(recebidocorr AS DECIMAL(15,2))), 2) as vgv'),
                        knex.raw('MAX(CAST(recebidocorr AS DECIMAL(15,2))) as maior_venda'),
                        knex.raw('MIN(CAST(recebidocorr AS DECIMAL(15,2))) as menor_venda'),
                        knex.raw('ROUND(AVG(CAST(recebidocorr AS DECIMAL(15,2))), 2) as valor_medio'),
                        knex.raw('COUNT(DISTINCT num_ven) as contratos_ativos')
                    )
                    .first(),
                knex('tab_vendas')
                    .where({ obra_id, deletado: false })
                    .whereNotNull('recebercorrantec')
                    .where(knex.raw("TRIM(recebercorrantec) != ''"))
                    .whereNotNull('recebidocorr')
                    .where(knex.raw("TRIM(recebidocorr) != ''"))
                    .select(
                        knex.raw(`DATE_FORMAT(
                            COALESCE(
                                STR_TO_DATE(NULLIF(TRIM(recebercorrantec), ''), '%m/%d/%Y'),
                                STR_TO_DATE(NULLIF(TRIM(recebercorrantec), ''), '%d/%m/%Y'),
                                STR_TO_DATE(NULLIF(TRIM(recebercorrantec), ''), '%Y-%m-%d')
                            ), '%Y-%m') as mes_ano`),
                        knex.raw(`MIN(DATE_FORMAT(
                            COALESCE(
                                STR_TO_DATE(NULLIF(TRIM(recebercorrantec), ''), '%m/%d/%Y'),
                                STR_TO_DATE(NULLIF(TRIM(recebercorrantec), ''), '%d/%m/%Y'),
                                STR_TO_DATE(NULLIF(TRIM(recebercorrantec), ''), '%Y-%m-%d')
                            ), '%m/%Y')) as label`),
                        knex.raw('ROUND(SUM(CAST(NULLIF(TRIM(recebidocorr), \'\') AS DECIMAL(15,2))), 2) as total'),
                        knex.raw('COUNT(*) as quantidade')
                    )
                    .groupByRaw(`DATE_FORMAT(
                        COALESCE(
                            STR_TO_DATE(NULLIF(TRIM(recebercorrantec), ''), '%m/%d/%Y'),
                            STR_TO_DATE(NULLIF(TRIM(recebercorrantec), ''), '%d/%m/%Y'),
                            STR_TO_DATE(NULLIF(TRIM(recebercorrantec), ''), '%Y-%m-%d')
                        ), '%Y-%m')`)
                    .orderByRaw(`DATE_FORMAT(
                        COALESCE(
                            STR_TO_DATE(NULLIF(TRIM(recebercorrantec), ''), '%m/%d/%Y'),
                            STR_TO_DATE(NULLIF(TRIM(recebercorrantec), ''), '%d/%m/%Y'),
                            STR_TO_DATE(NULLIF(TRIM(recebercorrantec), ''), '%Y-%m-%d')
                        ), '%Y-%m') ASC`)
                    .havingRaw("mes_ano IS NOT NULL")
            ])

            return {
                status: true,
                data: {
                    cards: [
                        { title: 'Número de Vendas', value: agregados.total_vendas },
                        { title: 'VGV Total', value: agregados.vgv },
                        { title: 'Maior Venda', value: agregados.maior_venda },
                        { title: 'Menor Venda', value: agregados.menor_venda },
                        { title: 'Valor Médio', value: agregados.valor_medio },
                        { title: 'Contratos Ativos', value: agregados.contratos_ativos },
                    ],
                    graficoMensal: graficoMensal.filter(r => r.mes_ano !== null)
                },
                msg: 'Estatísticas de vendas encontradas com sucesso!'
            }
        } catch (error) {
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(error);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            Log({ error, descricaoDoErro: 'Exeption estourada. RepositorioEstatisticas - getEstatisticasVendas', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            return { status: false, error, msg: 'Não foi possivel buscar as estatísticas de vendas!' }
        }
    }

    async getEstatisticasMovimentacao(obra_id) {
        try {
            const isReceita = `(UPPER(COALESCE(natureza,'')) LIKE '%RECEI%' OR UPPER(COALESCE(origem,'')) LIKE '%RECEB%')`
            const isDespesa = `(UPPER(COALESCE(natureza,'')) NOT LIKE '%RECEI%' AND UPPER(COALESCE(origem,'')) NOT LIKE '%RECEB%')`

            const [agregados, graficoRaw, dreRaw] = await Promise.all([
                knex('tab_movimentacao_financeira')
                    .where({ obra_id, deletado: false })
                    .whereNotNull('valor')
                    .whereRaw('ABS(valor) > 0')
                    .select(
                        knex.raw(`ROUND(SUM(CASE WHEN ${isReceita} THEN ABS(valor) ELSE 0 END), 2) as total_receitas`),
                        knex.raw(`ROUND(SUM(CASE WHEN ${isDespesa} THEN ABS(valor) ELSE 0 END), 2) as total_despesas`),
                        knex.raw('COUNT(*) as total_lancamentos')
                    )
                    .first(),

                knex('tab_movimentacao_financeira')
                    .where({ obra_id, deletado: false })
                    .whereNotNull('vencimento')
                    .whereNotNull('valor')
                    .whereRaw('ABS(valor) > 0')
                    .select(
                        knex.raw("DATE_FORMAT(vencimento, '%Y-%m') as mes_ano"),
                        knex.raw("MIN(DATE_FORMAT(vencimento, '%m/%Y')) as label"),
                        knex.raw(`ROUND(SUM(CASE WHEN ${isReceita} THEN ABS(valor) ELSE 0 END), 2) as receitas`),
                        knex.raw(`ROUND(SUM(CASE WHEN ${isDespesa} THEN ABS(valor) ELSE 0 END), 2) as despesas`),
                        knex.raw('COUNT(*) as quantidade')
                    )
                    .groupByRaw("DATE_FORMAT(vencimento, '%Y-%m')")
                    .orderByRaw("DATE_FORMAT(vencimento, '%Y-%m') ASC")
                    .havingRaw("mes_ano IS NOT NULL"),

                knex('tab_movimentacao_financeira')
                    .where({ obra_id, deletado: false })
                    .whereNotNull('valor')
                    .whereRaw('ABS(valor) > 0')
                    .select(
                        knex.raw(`CASE WHEN ${isReceita} THEN 'RECEITA' ELSE 'DESPESA' END as tipo`),
                        knex.raw("COALESCE(NULLIF(TRIM(grupo), ''), 'Sem Categoria') as categoria"),
                        knex.raw('ROUND(SUM(ABS(valor)), 2) as total'),
                        knex.raw('COUNT(*) as quantidade')
                    )
                    .groupByRaw(`CASE WHEN ${isReceita} THEN 'RECEITA' ELSE 'DESPESA' END, COALESCE(NULLIF(TRIM(grupo), ''), 'Sem Categoria')`)
                    .orderByRaw('tipo ASC, total DESC')
            ])

            // Saldo acumulado calculado em JS
            let saldoAcumulado = 0
            const graficoMensal = graficoRaw.map(row => {
                const receitas = parseFloat(row.receitas || 0)
                const despesas = parseFloat(row.despesas || 0)
                const saldo_inicial = saldoAcumulado
                const saldo = parseFloat((receitas - despesas).toFixed(2))
                saldoAcumulado = parseFloat((saldoAcumulado + saldo).toFixed(2))
                return {
                    mes_ano: row.mes_ano,
                    label: row.label,
                    receitas,
                    despesas,
                    saldo,
                    saldo_inicial,
                    saldo_final: saldoAcumulado,
                    quantidade: row.quantidade,
                }
            })

            const totalReceitas = parseFloat(agregados.total_receitas || 0)
            const totalDespesas = parseFloat(agregados.total_despesas || 0)

            const dre = {
                receitas: dreRaw.filter(r => r.tipo === 'RECEITA'),
                despesas: dreRaw.filter(r => r.tipo === 'DESPESA'),
                totalReceitas,
                totalDespesas,
                resultado: parseFloat((totalReceitas - totalDespesas).toFixed(2)),
            }

            return {
                status: true,
                data: {
                    cards: [
                        { title: 'Total Receitas', value: totalReceitas },
                        { title: 'Total Despesas', value: totalDespesas },
                        { title: 'Saldo Líquido', value: parseFloat((totalReceitas - totalDespesas).toFixed(2)) },
                        { title: 'Lançamentos', value: parseInt(agregados.total_lancamentos || 0) },
                    ],
                    graficoMensal,
                    dre,
                },
                msg: 'Estatísticas de movimentação encontradas com sucesso!'
            }
        } catch (error) {
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(error);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            Log({ error, descricaoDoErro: 'Exeption estourada. RepositorioEstatisticas - getEstatisticasMovimentacao', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            return { status: false, error, msg: 'Não foi possivel buscar as estatísticas de movimentação!' }
        }
    }

    async getEstatisticasAReceber(obra_id) {
        try {
            const [agregados, graficoMensal] = await Promise.all([
                knex('tab_a_receber')
                    .where({ obra_id, deletado: false })
                    .whereNotNull('vlr_parcela')
                    .where('vlr_parcela', '>', 0)
                    .select(
                        knex.raw('ROUND(SUM(vlr_parcela), 2) as total_a_receber'),
                        knex.raw("ROUND(SUM(CASE WHEN UPPER(COALESCE(status,'')) LIKE '%VENCID%' THEN vlr_parcela ELSE 0 END), 2) as vencido"),
                        knex.raw("ROUND(SUM(CASE WHEN UPPER(COALESCE(status,'')) NOT LIKE '%VENCID%' THEN vlr_parcela ELSE 0 END), 2) as a_vencer"),
                        knex.raw('COUNT(DISTINCT venda) as contratos_ativos'),
                        knex.raw('MAX(vlr_parcela) as maior_parcela'),
                        knex.raw('ROUND(AVG(vlr_parcela), 2) as valor_medio')
                    )
                    .first(),
                knex('tab_a_receber')
                    .where({ obra_id, deletado: false })
                    .whereNotNull('vencimento')
                    .whereNotNull('vlr_parcela')
                    .where('vlr_parcela', '>', 0)
                    .select(
                        knex.raw("DATE_FORMAT(vencimento, '%Y-%m') as mes_ano"),
                        knex.raw("MIN(DATE_FORMAT(vencimento, '%m/%Y')) as label"),
                        knex.raw('ROUND(SUM(vlr_parcela), 2) as total'),
                        knex.raw('COUNT(*) as quantidade')
                    )
                    .groupByRaw("DATE_FORMAT(vencimento, '%Y-%m')")
                    .orderByRaw("DATE_FORMAT(vencimento, '%Y-%m') ASC")
                    .havingRaw("mes_ano IS NOT NULL")
            ])

            return {
                status: true,
                data: {
                    cards: [
                        { title: 'Total a Receber', value: agregados.total_a_receber },
                        { title: 'Valor Vencido', value: agregados.vencido },
                        { title: 'A Vencer', value: agregados.a_vencer },
                        { title: 'Contratos Ativos', value: agregados.contratos_ativos },
                        { title: 'Maior Parcela', value: agregados.maior_parcela },
                        { title: 'Valor Médio', value: agregados.valor_medio },
                    ],
                    graficoMensal: graficoMensal.filter(r => r.mes_ano !== null)
                },
                msg: 'Estatísticas de a receber encontradas com sucesso!'
            }
        } catch (error) {
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(error);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            Log({ error, descricaoDoErro: 'Exeption estourada. RepositorioEstatisticas - getEstatisticasAReceber', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            return { status: false, error, msg: 'Não foi possivel buscar as estatísticas de a receber!' }
        }
    }

    async getEstatisticasRecebidos(obra_id) {
        try {
            const [agregados, graficoMensal] = await Promise.all([
                knex('tab_recebidos')
                    .where({ obra_id, deletado: false })
                    .whereNotNull('total_dep')
                    .where('total_dep', '>', 0)
                    .select(
                        knex.raw('COUNT(*) as parcelas_recebidas'),
                        knex.raw('ROUND(SUM(total_dep), 2) as total_recebido'),
                        knex.raw('ROUND(SUM(COALESCE(total_n_dep, 0)), 2) as nao_depositado'),
                        knex.raw('MAX(total_dep) as maior_recebimento'),
                        knex.raw('MIN(total_dep) as menor_recebimento'),
                        knex.raw('ROUND(AVG(total_dep), 2) as valor_medio')
                    )
                    .first(),
                knex('tab_recebidos')
                    .where({ obra_id, deletado: false })
                    .whereNotNull('data_comp')
                    .whereNotNull('total_dep')
                    .where('total_dep', '>', 0)
                    .select(
                        knex.raw("DATE_FORMAT(data_comp, '%Y-%m') as mes_ano"),
                        knex.raw("MIN(DATE_FORMAT(data_comp, '%m/%Y')) as label"),
                        knex.raw('ROUND(SUM(total_dep), 2) as total'),
                        knex.raw('COUNT(*) as quantidade')
                    )
                    .groupByRaw("DATE_FORMAT(data_comp, '%Y-%m')")
                    .orderByRaw("DATE_FORMAT(data_comp, '%Y-%m') ASC")
                    .havingRaw("mes_ano IS NOT NULL")
            ])

            return {
                status: true,
                data: {
                    cards: [
                        { title: 'Parcelas Recebidas', value: agregados.parcelas_recebidas },
                        { title: 'Total Recebido', value: agregados.total_recebido },
                        { title: 'Não Depositado', value: agregados.nao_depositado },
                        { title: 'Maior Recebimento', value: agregados.maior_recebimento },
                        { title: 'Menor Recebimento', value: agregados.menor_recebimento },
                        { title: 'Valor Médio', value: agregados.valor_medio },
                    ],
                    graficoMensal: graficoMensal.filter(r => r.mes_ano !== null)
                },
                msg: 'Estatísticas de recebidos encontradas com sucesso!'
            }
        } catch (error) {
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(error);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            Log({ error, descricaoDoErro: 'Exeption estourada. RepositorioEstatisticas - getEstatisticasRecebidos', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            return { status: false, error, msg: 'Não foi possivel buscar as estatísticas de recebidos!' }
        }
    }

    async getEstatisticasEventos(data) {
        try {
            const totalEventos = await knex('TabEventos').count('id as total').where('deletado', false)
            const totalEventosAtivos = await knex('TabEventos').count('id as total').where('deletado', false).where('status', 1);
            const totalEventosInativos = await knex('TabEventos').count('id as total').where('deletado', false).where('status', 0);
            return {
                status: true,
                data: [
                    { title: "Total de Eventos", value: totalEventos[0].total },
                    { title: "Total de Eventos Ativos", value: totalEventosAtivos[0].total },
                    { title: "Total de Eventos Inativos", value: totalEventosInativos[0].total }
                ],
                msg: "Estatisticas encontrado com sucesso!"
            }
        } catch (error) {
            console.log(error)
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(error);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            Log({ ...data, error, descricaoDoErro: 'Exeption estourada. RepositorioEstatisticas - getStatisticsAssinaturas', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            return { status: false, error: error, msg: "Não foi possivel buscar o Estatisticas!" }
        }

    }

}

module.exports = new EstatisticasRepository();

