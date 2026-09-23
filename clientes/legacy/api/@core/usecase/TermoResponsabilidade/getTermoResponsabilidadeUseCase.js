

const repository = require('../../../infrastructure/db/services/TermoResponsabilidadeRepository');
const domain = require('../../domain/TermoResponsabilidade');
const logExeption = require('../Logs/exeption/exeptionTermoResponsabilidade');
const dateNow = require('../../../infrastructure/gateways/functions/data/getToday');
const ErrorStackParser = require('error-stack-parser');
const { historico } = require('../../../certs');
const { SHA } = require('../../../infrastructure/gateways/crypt/sha');

class getTermoResponsabilidadeUseCase {

    async getTermoResponsabilidade() {
        try {
            const response = await repository.getTermoResponsabilidade()
            if (response.status && response.exit) {
                return { status: true, data: response.data, msg: response.msg }
            } else {
                return { status: false, msg: response.msg, response }
            }
        } catch (err) {
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(err);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            logExeption({ descricaoDoErro: 'Exeption estourada. use case TermoResponsabilidade - getTermoResponsabilidadeUseCase -getTermoResponsabilidade', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            return { status: false, msg: 'Erro interno do servidor, log gerado' }
        }
    }


    async getTermoResponsabilidadeById(data) {
        try {
            const response = await repository.getTermoResponsabilidadeById(data)
            if (response.status && response.exit) {
                return { status: true, data: response.data, msg: response.msg }
            } else {
                return { status: false, msg: response.msg, response }
            }
        } catch (err) {
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(err);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            logExeption({ descricaoDoErro: 'Exeption estourada. use case TermoResponsabilidade - getTermoResponsabilidadeUseCase - getTermoResponsabilidadeById', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            return { status: false, msg: 'Erro interno do servidor, log gerado' }
        }
    }

    async getTermoResponsabilidadeByQuery(data) {
        try {
            const sha = new SHA(process.env.SHA);
            const response = await repository.getTermoResponsabilidadeByQuery(data)
            if (response.status) {
                for (const item of response.data) {
                    item.descricao_termo = await sha.decrypt(item.descricao_termo);
                    item.ativo = item.ativo === 1 ? true : false;
                    delete item.deletado;
                    delete item.data_atualizacao;
                    delete item.desafio_id;
                }
                return { status: true, data: response.data, msg: response.msg }
            } else {
                return { status: false, msg: response.msg, response }
            }
        } catch (err) {
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(err);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            logExeption({ descricaoDoErro: 'Exeption estourada. use case TermoResponsabilidade- getTermoResponsabilidadeUseCase - getTermoResponsabilidadeByLimit', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            return { status: false, msg: 'Erro interno do servidor, log gerado' }
        }
    }

    async getTermoResponsabilidadeByQueryIdHistorico(data, id) {
        try {
            const response = await repository.getTermoResponsabilidadeByQueryIdHistorico(data, "objeto_id", id)
            if (response.status) {
                response.data.forEach(item => {
                    item.transformacao = historico.trnasformcao.create.value === item.transformacao ? historico.trnasformcao.create.label :
                        historico.trnasformcao.update.value === item.transformacao ? historico.trnasformcao.update.label :
                            historico.trnasformcao.delete.value === item.transformacao ? historico.trnasformcao.delete.label : item.transformacao;
                    item.dado_atual = JSON.parse(item.dado_atual);
                    item.dado_antigo = JSON.parse(item.dado_antigo);
                });
                return { status: true, data: response.data, msg: response.msg }
            } else {
                return { status: false, msg: response.msg, response }
            }
        } catch (err) {
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(err);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            logExeption({ descricaoDoErro: 'Exeption estourada. use case TermoResponsabilidade- getTermoResponsabilidadeUseCase - getTermoResponsabilidadeByLimit', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            return { status: false, msg: 'Erro interno do servidor, log gerado' }
        }
    }



}

module.exports = new getTermoResponsabilidadeUseCase();

