const dateNow = require('../../../infrastructure/gateways/functions/data/getToday.js');
const ErrorStackParser = require('error-stack-parser');
const logExeption = require('../Logs/exeption/exeptionEstatisticas.js');
const repositoryDataSystem = require('../../../infrastructure/db/services/EstatisticasRepository.js');
const lineError = require('../../../infrastructure/gateways/functions/lineError/index.js');

class DataSystemCalc {

    #usuarios = false;
    #recuperacaoSenha = false;
    #logs = false;
    #dashBoard = false;
    #investidores = false;
    #empreendimentos = false;
    #estoqueEmCalculo = new Set();
    #vendasEmCalculo = new Set();
    #recebidosEmCalculo = new Set();
    #aReceberEmCalculo = new Set();
    #movimentacaoEmCalculo = new Set();


    async dashBoard() {
        try {
            //Aqui comeca o processo de insercao no banco de dados e ajustes
            if (this.#dashBoard == true) {
                return;
            }
            const getStatisticReponse = await repositoryDataSystem.getStatisticsNamePage({ pagina: `dashBoard` })
            if (!getStatisticReponse.status) return { status: false, msg: 'Erro ao buscar dados de estatisticas' }
            this.#dashBoard = true
            const response = await repositoryDataSystem.getDashBoard();
            if (!response.status) {
                logExeption({ descricaoDoErro: 'Exeption estourada. Erro ao buscar dados dashBoard', linhaDoErro: lineError(), nomeDoArquivo: 'updateData - dashBoard', data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            }
            const StatisticsDb = JSON.stringify(response.data)
            const objUpdate = {
                id: getStatisticReponse.data.id,
                dataEstatisticas: StatisticsDb,
                data_atualizacao: dateNow()
            }
            const responseUpdate = await repositoryDataSystem.updateEstatisticas(objUpdate)
            if (!responseUpdate.status) {
                logExeption({ descricaoDoErro: 'Exeption estourada. use case DataSystem projetos. Erro ao realizar calculo e dashBoard - dashBoard', linhaDoErro: lineError(), nomeDoArquivo: 'updateData - recuperacaoSenha', data_criacao: dateNow(), data_atualizacao: dateNow(), deletados: false })
            }
            this.#dashBoard = false
        } catch (err) {
            this.#dashBoard = false
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(err);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            logExeption({ descricaoDoErro: 'Exeption estourada. use case update Estatisticas ', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            return { status: false, msg: 'Erro interno do servidor, log gerado' }

        }
    }

    async getInvestidores() {
        try {
            //Aqui comeca o processo de insercao no banco de dados e ajustes
            if (this.#investidores == true) {
                return;
            }
            const getStatisticReponse = await repositoryDataSystem.getStatisticsNamePage({ pagina: `investidores` })
            if (!getStatisticReponse.status) return { status: false, msg: 'Erro ao buscar dados de estatisticas' }
            this.#investidores = true
            const response = await repositoryDataSystem.getInvestidores();
            if (!response.status) {
                logExeption({ descricaoDoErro: 'Exeption estourada. Erro ao buscar dados investidores', linhaDoErro: lineError(), nomeDoArquivo: 'updateData - investidores', data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            }
            const StatisticsDb = JSON.stringify(response.data)
            const objUpdate = {
                id: getStatisticReponse.data.id,
                dataEstatisticas: StatisticsDb,
                data_atualizacao: dateNow()
            }
            const responseUpdate = await repositoryDataSystem.updateEstatisticas(objUpdate)
            if (!responseUpdate.status) {
                logExeption({ descricaoDoErro: 'Exeption estourada. use case DataSystem projetos. Erro ao realizar calculo e investidores - investidores', linhaDoErro: lineError(), nomeDoArquivo: 'updateData - recuperacaoSenha', data_criacao: dateNow(), data_atualizacao: dateNow(), deletados: false })
            }
            this.#investidores = false
        } catch (err) {
            this.#investidores = false
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(err);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            logExeption({ descricaoDoErro: 'Exeption estourada. use case update Estatisticas ', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            return { status: false, msg: 'Erro interno do servidor, log gerado' }

        }
    }

    async getEmpreendimentos() {
        try {
            //Aqui comeca o processo de insercao no banco de dados e ajustes
            if (this.#empreendimentos == true) {
                return;
            }
            const getStatisticReponse = await repositoryDataSystem.getStatisticsNamePage({ pagina: `empreendimentos` })
            if (!getStatisticReponse.status) return { status: false, msg: 'Erro ao buscar dados de estatisticas' }
            this.#empreendimentos = true
            const response = await repositoryDataSystem.getEmpreendimentos();
            if (!response.status) {
                logExeption({ descricaoDoErro: 'Exeption estourada. Erro ao buscar dados empreendimentos', linhaDoErro: lineError(), nomeDoArquivo: 'updateData - empreendimentos', data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            }
            const StatisticsDb = JSON.stringify(response.data)
            const objUpdate = {
                id: getStatisticReponse.data.id,
                dataEstatisticas: StatisticsDb,
                data_atualizacao: dateNow()
            }
            const responseUpdate = await repositoryDataSystem.updateEstatisticas(objUpdate)
            if (!responseUpdate.status) {
                logExeption({ descricaoDoErro: 'Exeption estourada. use case DataSystem projetos. Erro ao realizar calculo e empreendimentos - empreendimentos', linhaDoErro: lineError(), nomeDoArquivo: 'updateData - recuperacaoSenha', data_criacao: dateNow(), data_atualizacao: dateNow(), deletados: false })
            }
            this.#empreendimentos = false
        } catch (err) {
            this.#empreendimentos = false
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(err);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            logExeption({ descricaoDoErro: 'Exeption estourada. use case update Estatisticas ', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            return { status: false, msg: 'Erro interno do servidor, log gerado' }

        }
    }

    async logs() {
        try {
            //Aqui comeca o processo de insercao no banco de dados e ajustes
            if (this.#logs == true) {
                return;
            }
            const getStatisticReponse = await repositoryDataSystem.getStatisticsNamePage({ pagina: `logs` })
            if (!getStatisticReponse.status) return { status: false, msg: 'Erro ao buscar dados de estatisticas' }
            this.#logs = true
            const response = await repositoryDataSystem.getEstatisticasLogs();
            if (!response.status) {
                logExeption({ descricaoDoErro: 'Exeption estourada. Erro ao buscar dados logs', linhaDoErro: lineError(), nomeDoArquivo: 'updateData - logs', data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            }
            const StatisticsDb = JSON.stringify(response.data)
            const objUpdate = {
                id: getStatisticReponse.data.id,
                dataEstatisticas: StatisticsDb,
                data_atualizacao: dateNow()
            }
            const responseUpdate = await repositoryDataSystem.updateEstatisticas(objUpdate)
            if (!responseUpdate.status) {
                logExeption({ descricaoDoErro: 'Exeption estourada. use case DataSystem projetos. Erro ao realizar calculo e logs - logs', linhaDoErro: lineError(), nomeDoArquivo: 'updateData - recuperacaoSenha', data_criacao: dateNow(), data_atualizacao: dateNow(), deletados: false })
            }
            this.#logs = false
        } catch (err) {
            this.#logs = false
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(err);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            logExeption({ descricaoDoErro: 'Exeption estourada. use case update Estatisticas ', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            return { status: false, msg: 'Erro interno do servidor, log gerado' }

        }
    }

    async recuperacaoSenha() {
        try {
            //Aqui comeca o processo de insercao no banco de dados e ajustes
            if (this.#recuperacaoSenha == true) {
                return;
            }
            const getStatisticReponse = await repositoryDataSystem.getStatisticsNamePage({ pagina: `recuperacaoSenha` })
            if (!getStatisticReponse.status) return { status: false, msg: 'Erro ao buscar dados de estatisticas' }
            this.#recuperacaoSenha = true
            const response = await repositoryDataSystem.getEstatisticasRecuperacaoSenha();
            if (!response.status) {
                logExeption({ descricaoDoErro: 'Exeption estourada. Erro ao buscar dados recuperacaoSenha', linhaDoErro: lineError(), nomeDoArquivo: 'updateData - recuperacaoSenha', data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            }
            const StatisticsDb = JSON.stringify(response.data)
            const objUpdate = {
                id: getStatisticReponse.data.id,
                dataEstatisticas: StatisticsDb,
                data_atualizacao: dateNow()
            }
            const responseUpdate = await repositoryDataSystem.updateEstatisticas(objUpdate)
            if (!responseUpdate.status) {
                logExeption({ descricaoDoErro: 'Exeption estourada. use case DataSystem projetos. Erro ao realizar calculo e recuperacaoSenha - recuperacaoSenha', linhaDoErro: lineError(), nomeDoArquivo: 'updateData - recuperacaoSenha', data_criacao: dateNow(), data_atualizacao: dateNow(), deletados: false })
            }
            this.#recuperacaoSenha = false
        } catch (err) {
            this.#recuperacaoSenha = false
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(err);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            logExeption({ descricaoDoErro: 'Exeption estourada. use case update Estatisticas ', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            return { status: false, msg: 'Erro interno do servidor, log gerado' }

        }
    }

    async getEstoqueObra(obra_id) {
        if (!this.#estoqueEmCalculo.has(obra_id)) {
            this.#estoqueEmCalculo.add(obra_id)
        }
        try {
            const pagina = `estoque_${obra_id}`
            const getStatisticReponse = await repositoryDataSystem.getStatisticsNamePage({ pagina })
            if (!getStatisticReponse.status) return
            const response = await repositoryDataSystem.getEstatisticasEstoque(obra_id)
            if (!response.status) {
                logExeption({ descricaoDoErro: 'Erro ao buscar dados de estoque para atualização', linhaDoErro: lineError(), nomeDoArquivo: 'updateData - getEstoqueObra', data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
                return
            }
            const objUpdate = {
                id: getStatisticReponse.data.id,
                dataEstatisticas: JSON.stringify(response.data),
                data_atualizacao: dateNow()
            }
            const responseUpdate = await repositoryDataSystem.updateEstatisticas(objUpdate)
            if (!responseUpdate.status) {
                logExeption({ descricaoDoErro: 'Erro ao persistir estatísticas de estoque', linhaDoErro: lineError(), nomeDoArquivo: 'updateData - getEstoqueObra', data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            }
        } catch (err) {
            let lineErrorValue = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(err);
            if (stackFrames.length > 0) {
                lineErrorValue = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            logExeption({ descricaoDoErro: 'Exeption estourada. use case update Estatisticas - getEstoqueObra', linhaDoErro: lineErrorValue, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
        } finally {
            this.#estoqueEmCalculo.delete(obra_id)
        }
    }

    async getMovimentacaoObra(obra_id) {
        if (this.#movimentacaoEmCalculo.has(obra_id)) return
        this.#movimentacaoEmCalculo.add(obra_id)
        try {
            const pagina = `movimentacao_${obra_id}`
            const getStatisticReponse = await repositoryDataSystem.getStatisticsNamePage({ pagina })
            if (!getStatisticReponse.status) return
            const response = await repositoryDataSystem.getEstatisticasMovimentacao(obra_id)
            if (!response.status) {
                logExeption({ descricaoDoErro: 'Erro ao buscar dados de movimentação para atualização', linhaDoErro: '0', nomeDoArquivo: 'updateData - getMovimentacaoObra', data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
                return
            }
            const objUpdate = {
                id: getStatisticReponse.data.id,
                dataEstatisticas: JSON.stringify(response.data),
                data_atualizacao: dateNow()
            }
            const responseUpdate = await repositoryDataSystem.updateEstatisticas(objUpdate)
            if (!responseUpdate.status) {
                logExeption({ descricaoDoErro: 'Erro ao persistir estatísticas de movimentação', linhaDoErro: '0', nomeDoArquivo: 'updateData - getMovimentacaoObra', data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            }
        } catch (err) {
            let lineErrorValue = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(err);
            if (stackFrames.length > 0) {
                lineErrorValue = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            logExeption({ descricaoDoErro: 'Exeption estourada. use case update Estatisticas - getMovimentacaoObra', linhaDoErro: lineErrorValue, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
        } finally {
            this.#movimentacaoEmCalculo.delete(obra_id)
        }
    }

    async getAReceberObra(obra_id) {
        if (this.#aReceberEmCalculo.has(obra_id)) return
        this.#aReceberEmCalculo.add(obra_id)
        try {
            const pagina = `a_receber_${obra_id}`
            const getStatisticReponse = await repositoryDataSystem.getStatisticsNamePage({ pagina })
            if (!getStatisticReponse.status) return
            const response = await repositoryDataSystem.getEstatisticasAReceber(obra_id)
            if (!response.status) {
                logExeption({ descricaoDoErro: 'Erro ao buscar dados de a receber para atualização', linhaDoErro: lineError(), nomeDoArquivo: 'updateData - getAReceberObra', data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
                return
            }
            const objUpdate = {
                id: getStatisticReponse.data.id,
                dataEstatisticas: JSON.stringify(response.data),
                data_atualizacao: dateNow()
            }
            const responseUpdate = await repositoryDataSystem.updateEstatisticas(objUpdate)
            if (!responseUpdate.status) {
                logExeption({ descricaoDoErro: 'Erro ao persistir estatísticas de a receber', linhaDoErro: lineError(), nomeDoArquivo: 'updateData - getAReceberObra', data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            }
        } catch (err) {
            let lineErrorValue = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(err);
            if (stackFrames.length > 0) {
                lineErrorValue = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            logExeption({ descricaoDoErro: 'Exeption estourada. use case update Estatisticas - getAReceberObra', linhaDoErro: lineErrorValue, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
        } finally {
            this.#aReceberEmCalculo.delete(obra_id)
        }
    }

    async getRecebidosObra(obra_id) {
        if (!this.#recebidosEmCalculo.has(obra_id)) {
            this.#recebidosEmCalculo.add(obra_id)
        }
        try {
            const pagina = `recebidos_${obra_id}`
            const getStatisticReponse = await repositoryDataSystem.getStatisticsNamePage({ pagina })
            if (!getStatisticReponse.status) return
            const response = await repositoryDataSystem.getEstatisticasRecebidos(obra_id)
            if (!response.status) {
                logExeption({ descricaoDoErro: 'Erro ao buscar dados de recebidos para atualização', linhaDoErro: lineError(), nomeDoArquivo: 'updateData - getRecebidosObra', data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
                return
            }
            const objUpdate = {
                id: getStatisticReponse.data.id,
                dataEstatisticas: JSON.stringify(response.data),
                data_atualizacao: dateNow()
            }
            const responseUpdate = await repositoryDataSystem.updateEstatisticas(objUpdate)
            if (!responseUpdate.status) {
                logExeption({ descricaoDoErro: 'Erro ao persistir estatísticas de recebidos', linhaDoErro: lineError(), nomeDoArquivo: 'updateData - getRecebidosObra', data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            }
        } catch (err) {
            let lineErrorValue = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(err);
            if (stackFrames.length > 0) {
                lineErrorValue = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            logExeption({ descricaoDoErro: 'Exeption estourada. use case update Estatisticas - getRecebidosObra', linhaDoErro: lineErrorValue, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
        } finally {
            this.#recebidosEmCalculo.delete(obra_id)
        }
    }

    async getVendasObra(obra_id) {
        if (!this.#vendasEmCalculo.has(obra_id)) {
            this.#vendasEmCalculo.add(obra_id)
        }
        try {
            const pagina = `vendas_${obra_id}`
            const getStatisticReponse = await repositoryDataSystem.getStatisticsNamePage({ pagina })
            if (!getStatisticReponse.status) return
            const response = await repositoryDataSystem.getEstatisticasVendas(obra_id)
            if (!response.status) {
                logExeption({ descricaoDoErro: 'Erro ao buscar dados de vendas para atualização', linhaDoErro: lineError(), nomeDoArquivo: 'updateData - getVendasObra', data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
                return
            }
            const objUpdate = {
                id: getStatisticReponse.data.id,
                dataEstatisticas: JSON.stringify(response.data),
                data_atualizacao: dateNow()
            }
            const responseUpdate = await repositoryDataSystem.updateEstatisticas(objUpdate)
            if (!responseUpdate.status) {
                logExeption({ descricaoDoErro: 'Erro ao persistir estatísticas de vendas', linhaDoErro: lineError(), nomeDoArquivo: 'updateData - getVendasObra', data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            }
        } catch (err) {
            let lineErrorValue = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(err);
            if (stackFrames.length > 0) {
                lineErrorValue = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            logExeption({ descricaoDoErro: 'Exeption estourada. use case update Estatisticas - getVendasObra', linhaDoErro: lineErrorValue, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
        } finally {
            this.#vendasEmCalculo.delete(obra_id)
        }
    }

    async usuarios() {
        try {
            //Aqui comeca o processo de insercao no banco de dados e ajustes
            if (this.#usuarios == true) {
                return;
            }
            const getStatisticReponse = await repositoryDataSystem.getStatisticsNamePage({ pagina: `usuarios` })
            if (!getStatisticReponse.status) return { status: false, msg: 'Erro ao buscar dados de estatisticas' }
            this.#usuarios = true
            const response = await repositoryDataSystem.getEstatisticasUsuarios();
            if (!response.status) {
                logExeption({ descricaoDoErro: 'Exeption estourada. Erro ao buscar dados usuarios', linhaDoErro: lineError(), nomeDoArquivo: 'updateData - usuarios', data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            }
            const StatisticsDb = JSON.stringify(response.data)
            const objUpdate = {
                id: getStatisticReponse.data.id,
                dataEstatisticas: StatisticsDb,
                data_atualizacao: dateNow()
            }
            const responseUpdate = await repositoryDataSystem.updateEstatisticas(objUpdate)
            if (!responseUpdate.status) {
                logExeption({ descricaoDoErro: 'Exeption estourada. use case DataSystem projetos. Erro ao realizar calculo e usuarios - usuarios', linhaDoErro: lineError(), nomeDoArquivo: 'updateData - usuarios', data_criacao: dateNow(), data_atualizacao: dateNow(), deletados: false })
            }
            this.#usuarios = false
        } catch (err) {
            this.#usuarios = false
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(err);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            logExeption({ descricaoDoErro: 'Exeption estourada. use case update Estatisticas ', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            return { status: false, msg: 'Erro interno do servidor, log gerado' }

        }
    }

}

module.exports = new DataSystemCalc()