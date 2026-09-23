const dateNow = require('../../../infrastructure/gateways/functions/data/getToday.js')
const ErrorStackParser = require('error-stack-parser');
const logExeption = require('../Logs/exeption/exeptionEstatisticas.js')
const repositoryDataSystem = require('../../../infrastructure/db/services/EstatisticasRepository.js');

class DataSystem {

    async getEmpreendimentos() {
        try {
            const getStatisticReponse = await repositoryDataSystem.getStatisticsNamePage({ pagina: `empreendimentos` })
            if (!getStatisticReponse.status) return { status: false, msg: 'Erro ao buscar dados de estatisticas' }
            const JsonJson = JSON.parse(getStatisticReponse.data.dataEstatisticas)
            const isNull = Object.keys(JsonJson).length === 0 ? true : false;
            if (isNull) {
                const response = await repositoryDataSystem.getEmpreendimentos();
                if (!response.status) return response
                const StatisticsDb = JSON.stringify(response.data)
                const objUpdate = {
                    id: getStatisticReponse.data.id,
                    dataEstatisticas: StatisticsDb,
                    data_atualizacao: dateNow()
                }
                const responseUpdate = await repositoryDataSystem.updateEstatisticas(objUpdate)
                if (!responseUpdate.status) return { status: false, msg: 'Erro ao atualizar dados de estatisticas' }
                return { status: true, msg: 'Busca de dados realizado com sucesso', data: response.data }
            } else {
                const dataJsonStatistic = JSON.parse(getStatisticReponse.data.dataEstatisticas)
                return { status: true, msg: 'Busca de dados  realizado com sucesso =)', data: dataJsonStatistic }
            }
        } catch (err) {
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(err);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            logExeption({ descricaoDoErro: 'Exeption estourada. use case Estatisticas ', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            return { status: false, msg: 'Erro interno do servidor, log gerado' }

        }
    }

    async getInvestidores() {
        try {
            const getStatisticReponse = await repositoryDataSystem.getStatisticsNamePage({ pagina: `investidores` })
            if (!getStatisticReponse.status) return { status: false, msg: 'Erro ao buscar dados de estatisticas' }
            const JsonJson = JSON.parse(getStatisticReponse.data.dataEstatisticas)
            const isNull = Object.keys(JsonJson).length === 0 ? true : false;
            if (isNull) {
                const response = await repositoryDataSystem.getInvestidores();
                if (!response.status) return response
                const StatisticsDb = JSON.stringify(response.data)
                const objUpdate = {
                    id: getStatisticReponse.data.id,
                    dataEstatisticas: StatisticsDb,
                    data_atualizacao: dateNow()
                }
                const responseUpdate = await repositoryDataSystem.updateEstatisticas(objUpdate)
                if (!responseUpdate.status) return { status: false, msg: 'Erro ao atualizar dados de estatisticas' }
                return { status: true, msg: 'Busca de dados realizado com sucesso', data: response.data }
            } else {
                const dataJsonStatistic = JSON.parse(getStatisticReponse.data.dataEstatisticas)
                return { status: true, msg: 'Busca de dados  realizado com sucesso =)', data: dataJsonStatistic }
            }
        } catch (err) {
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(err);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            logExeption({ descricaoDoErro: 'Exeption estourada. use case Estatisticas ', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            return { status: false, msg: 'Erro interno do servidor, log gerado' }

        }
    }

    async dashBoard() {
        try {
            const getStatisticReponse = await repositoryDataSystem.getStatisticsNamePage({ pagina: `dashBoard` })
            if (!getStatisticReponse.status) return { status: false, msg: 'Erro ao buscar dados de estatisticas' }
            const JsonJson = JSON.parse(getStatisticReponse.data.dataEstatisticas)
            const isNull = Object.keys(JsonJson).length === 0 ? true : false;
            if (isNull) {
                const response = await repositoryDataSystem.getDashBoard();
                if (!response.status) return response
                const StatisticsDb = JSON.stringify(response.data)
                const objUpdate = {
                    id: getStatisticReponse.data.id,
                    dataEstatisticas: StatisticsDb,
                    data_atualizacao: dateNow()
                }
                const responseUpdate = await repositoryDataSystem.updateEstatisticas(objUpdate)
                if (!responseUpdate.status) return { status: false, msg: 'Erro ao atualizar dados de estatisticas' }
                return { status: true, msg: 'Busca de dados realizado com sucesso', data: response.data }
            } else {
                const dataJsonStatistic = JSON.parse(getStatisticReponse.data.dataEstatisticas)
                return { status: true, msg: 'Busca de dados  realizado com sucesso =)', data: dataJsonStatistic }
            }
        } catch (err) {
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(err);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            logExeption({ descricaoDoErro: 'Exeption estourada. use case Estatisticas ', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            return { status: false, msg: 'Erro interno do servidor, log gerado' }

        }
    }

    async logs() {
        try {
            const getStatisticReponse = await repositoryDataSystem.getStatisticsNamePage({ pagina: 'logs' })
            if (!getStatisticReponse.status) return { status: false, msg: 'Erro ao buscar dados de estatisticas' }
            const JsonJson = JSON.parse(getStatisticReponse.data.dataEstatisticas)
            const isNull = Object.keys(JsonJson).length === 0 ? true : false;
            if (isNull) {
                const response = await repositoryDataSystem.getEstatisticasLogs();
                if (!response.status) return response
                const StatisticsDb = JSON.stringify(response.data)
                const objUpdate = {
                    id: getStatisticReponse.data.id,
                    dataEstatisticas: StatisticsDb,
                    data_atualizacao: dateNow()
                }
                const responseUpdate = await repositoryDataSystem.updateEstatisticas(objUpdate)
                if (!responseUpdate.status) return { status: false, msg: 'Erro ao atualizar dados de estatisticas' }
                return { status: true, msg: 'Busca de dados realizado com sucesso', data: response.data }
            } else {
                const dataJsonStatistic = JSON.parse(getStatisticReponse.data.dataEstatisticas)
                return { status: true, msg: 'Busca de dados  realizado com sucesso =)', data: dataJsonStatistic }
            }
        } catch (err) {
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(err);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            logExeption({ descricaoDoErro: 'Exeption estourada. use case Estatisticas ', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            return { status: false, msg: 'Erro interno do servidor, log gerado' }

        }
    }

    async recuperacaoSenha() {
        try {
            const getStatisticReponse = await repositoryDataSystem.getStatisticsNamePage({ pagina: 'recuperacaoSenha' })
            if (!getStatisticReponse.status) return { status: false, msg: 'Erro ao buscar dados de estatisticas' }
            const JsonJson = JSON.parse(getStatisticReponse.data.dataEstatisticas)
            const isNull = Object.keys(JsonJson).length === 0 ? true : false;
            if (isNull) {
                const response = await repositoryDataSystem.getEstatisticasRecuperacaoSenha();
                if (!response.status) return response
                const StatisticsDb = JSON.stringify(response.data)
                const objUpdate = {
                    id: getStatisticReponse.data.id,
                    dataEstatisticas: StatisticsDb,
                    data_atualizacao: dateNow()
                }
                const responseUpdate = await repositoryDataSystem.updateEstatisticas(objUpdate)
                if (!responseUpdate.status) return { status: false, msg: 'Erro ao atualizar dados de estatisticas' }
                return { status: true, msg: 'Busca de dados realizado com sucesso', data: response.data }
            } else {
                const dataJsonStatistic = JSON.parse(getStatisticReponse.data.dataEstatisticas)
                return { status: true, msg: 'Busca de dados  realizado com sucesso =)', data: dataJsonStatistic }
            }
        } catch (err) {
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(err);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            logExeption({ descricaoDoErro: 'Exeption estourada. use case Estatisticas ', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            return { status: false, msg: 'Erro interno do servidor, log gerado' }

        }
    }

    async usuarios() {
        try {
            const getStatisticReponse = await repositoryDataSystem.getStatisticsNamePage({ pagina: 'usuarios' })
            if (!getStatisticReponse.status) return { status: false, msg: 'Erro ao buscar dados de estatisticas' }
            const JsonJson = JSON.parse(getStatisticReponse.data.dataEstatisticas)
            const isNull = Object.keys(JsonJson).length === 0 ? true : false;
            if (isNull) {
                const response = await repositoryDataSystem.getEstatisticasUsuarios();
                if (!response.status) return response
                const StatisticsDb = JSON.stringify(response.data)
                const objUpdate = {
                    id: getStatisticReponse.data.id,
                    dataEstatisticas: StatisticsDb,
                    data_atualizacao: dateNow()
                }
                const responseUpdate = await repositoryDataSystem.updateEstatisticas(objUpdate)
                if (!responseUpdate.status) return { status: false, msg: 'Erro ao atualizar dados de estatisticas' }
                return { status: true, msg: 'Busca de dados realizado com sucesso', data: response.data }
            } else {
                const dataJsonStatistic = JSON.parse(getStatisticReponse.data.dataEstatisticas)
                return { status: true, msg: 'Busca de dados  realizado com sucesso =)', data: dataJsonStatistic }
            }
        } catch (err) {
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(err);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            logExeption({ descricaoDoErro: 'Exeption estourada. use case Estatisticas ', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            return { status: false, msg: 'Erro interno do servidor, log gerado' }

        }
    }

    async getEstoqueObra(obra_id) {
        try {
            const pagina = `estoque_${obra_id}`
            const getStatisticReponse = await repositoryDataSystem.getStatisticsNamePage({ pagina })
            if (!getStatisticReponse.status) return { status: false, msg: 'Erro ao buscar dados de estatisticas' }
            const cached = JSON.parse(getStatisticReponse.data.dataEstatisticas)
            const isNull = Object.keys(cached).length === 0
            if (isNull) {
                const response = await repositoryDataSystem.getEstatisticasEstoque(obra_id)
                if (!response.status) return response
                const objUpdate = {
                    id: getStatisticReponse.data.id,
                    dataEstatisticas: JSON.stringify(response.data),
                    data_atualizacao: dateNow()
                }
                const responseUpdate = await repositoryDataSystem.updateEstatisticas(objUpdate)
                if (!responseUpdate.status) return { status: false, msg: 'Erro ao atualizar dados de estatisticas' }
                return { status: true, msg: response.msg, data: response.data }
            }
            return { status: true, msg: 'Busca de dados realizado com sucesso', data: cached }
        } catch (err) {
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(err);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            logExeption({ descricaoDoErro: 'Exeption estourada. use case Estatisticas - getEstoqueObra', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            return { status: false, msg: 'Erro interno do servidor, log gerado' }
        }
    }

    async getMovimentacaoObra(obra_id) {
        try {
            const pagina = `movimentacao_${obra_id}`
            const getStatisticReponse = await repositoryDataSystem.getStatisticsNamePage({ pagina })
            if (!getStatisticReponse.status) return { status: false, msg: 'Erro ao buscar dados de estatisticas' }
            const cached = JSON.parse(getStatisticReponse.data.dataEstatisticas)
            const isNull = Object.keys(cached).length === 0
            if (isNull) {
                const response = await repositoryDataSystem.getEstatisticasMovimentacao(obra_id)
                if (!response.status) return response
                const objUpdate = {
                    id: getStatisticReponse.data.id,
                    dataEstatisticas: JSON.stringify(response.data),
                    data_atualizacao: dateNow()
                }
                const responseUpdate = await repositoryDataSystem.updateEstatisticas(objUpdate)
                if (!responseUpdate.status) return { status: false, msg: 'Erro ao atualizar dados de estatisticas' }
                return { status: true, msg: response.msg, data: response.data }
            }
            return { status: true, msg: 'Busca de dados realizado com sucesso', data: cached }
        } catch (err) {
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(err);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            logExeption({ descricaoDoErro: 'Exeption estourada. use case Estatisticas - getMovimentacaoObra', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            return { status: false, msg: 'Erro interno do servidor, log gerado' }
        }
    }

    async getAReceberObra(obra_id) {
        try {
            const pagina = `a_receber_${obra_id}`
            const getStatisticReponse = await repositoryDataSystem.getStatisticsNamePage({ pagina })
            if (!getStatisticReponse.status) return { status: false, msg: 'Erro ao buscar dados de estatisticas' }
            const cached = JSON.parse(getStatisticReponse.data.dataEstatisticas)
            const isNull = Object.keys(cached).length === 0
            if (isNull) {
                const response = await repositoryDataSystem.getEstatisticasAReceber(obra_id)
                if (!response.status) return response
                const objUpdate = {
                    id: getStatisticReponse.data.id,
                    dataEstatisticas: JSON.stringify(response.data),
                    data_atualizacao: dateNow()
                }
                const responseUpdate = await repositoryDataSystem.updateEstatisticas(objUpdate)
                if (!responseUpdate.status) return { status: false, msg: 'Erro ao atualizar dados de estatisticas' }
                return { status: true, msg: response.msg, data: response.data }
            }
            return { status: true, msg: 'Busca de dados realizado com sucesso', data: cached }
        } catch (err) {
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(err);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            logExeption({ descricaoDoErro: 'Exeption estourada. use case Estatisticas - getAReceberObra', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            return { status: false, msg: 'Erro interno do servidor, log gerado' }
        }
    }

    async getRecebidosObra(obra_id) {
        try {
            const pagina = `recebidos_${obra_id}`
            const getStatisticReponse = await repositoryDataSystem.getStatisticsNamePage({ pagina })
            if (!getStatisticReponse.status) return { status: false, msg: 'Erro ao buscar dados de estatisticas' }
            const cached = JSON.parse(getStatisticReponse.data.dataEstatisticas)
            const isNull = Object.keys(cached).length === 0
            if (isNull) {
                const response = await repositoryDataSystem.getEstatisticasRecebidos(obra_id)
                if (!response.status) return response
                const objUpdate = {
                    id: getStatisticReponse.data.id,
                    dataEstatisticas: JSON.stringify(response.data),
                    data_atualizacao: dateNow()
                }
                const responseUpdate = await repositoryDataSystem.updateEstatisticas(objUpdate)
                if (!responseUpdate.status) return { status: false, msg: 'Erro ao atualizar dados de estatisticas' }
                return { status: true, msg: response.msg, data: response.data }
            }
            return { status: true, msg: 'Busca de dados realizado com sucesso', data: cached }
        } catch (err) {
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(err);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            logExeption({ descricaoDoErro: 'Exeption estourada. use case Estatisticas - getRecebidosObra', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            return { status: false, msg: 'Erro interno do servidor, log gerado' }
        }
    }

    async getVendasObra(obra_id) {
        try {
            const pagina = `vendas_${obra_id}`
            const getStatisticReponse = await repositoryDataSystem.getStatisticsNamePage({ pagina })
            if (!getStatisticReponse.status) return { status: false, msg: 'Erro ao buscar dados de estatisticas' }
            const cached = JSON.parse(getStatisticReponse.data.dataEstatisticas)
            const isNull = Object.keys(cached).length === 0
            if (isNull) {
                const response = await repositoryDataSystem.getEstatisticasVendas(obra_id)
                if (!response.status) return response
                const objUpdate = {
                    id: getStatisticReponse.data.id,
                    dataEstatisticas: JSON.stringify(response.data),
                    data_atualizacao: dateNow()
                }
                const responseUpdate = await repositoryDataSystem.updateEstatisticas(objUpdate)
                if (!responseUpdate.status) return { status: false, msg: 'Erro ao atualizar dados de estatisticas' }
                return { status: true, msg: response.msg, data: response.data }
            }
            return { status: true, msg: 'Busca de dados realizado com sucesso', data: cached }
        } catch (err) {
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(err);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            logExeption({ descricaoDoErro: 'Exeption estourada. use case Estatisticas - getVendasObra', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            return { status: false, msg: 'Erro interno do servidor, log gerado' }
        }
    }

    async eventos() {
        try {
            const getStatisticReponse = await repositoryDataSystem.getStatisticsNamePage({ pagina: 'eventos' })
            if (!getStatisticReponse.status) return { status: false, msg: 'Erro ao buscar dados de estatisticas' }
            const JsonJson = JSON.parse(getStatisticReponse.data.dataEstatisticas)
            const isNull = Object.keys(JsonJson).length === 0 ? true : false;
            if (isNull) {
                const response = await repositoryDataSystem.getEstatisticasEventos();
                if (!response.status) return response
                const StatisticsDb = JSON.stringify(response.data)
                const objUpdate = {
                    id: getStatisticReponse.data.id,
                    dataEstatisticas: StatisticsDb,
                    data_atualizacao: dateNow()
                }
                const responseUpdate = await repositoryDataSystem.updateEstatisticas(objUpdate)
                if (!responseUpdate.status) return { status: false, msg: 'Erro ao atualizar dados de estatisticas' }
                return { status: true, msg: 'Busca de dados realizado com sucesso', data: response.data }
            } else {
                const dataJsonStatistic = JSON.parse(getStatisticReponse.data.dataEstatisticas)
                return { status: true, msg: 'Busca de dados  realizado com sucesso =)', data: dataJsonStatistic }
            }
        } catch (err) {
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(err);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            logExeption({ descricaoDoErro: 'Exeption estourada. use case Estatisticas ', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            return { status: false, msg: 'Erro interno do servidor, log gerado' }

        }
    }


}

module.exports = new DataSystem()