

const repository = require('../../../infrastructure/db/services/PerfilUsuarioRepository');
const domain = require('../../domain/PerfilUsuario');
const logExeption = require('../Logs/exeption/exeptionPerfilUsuario');
const dateNow = require('../../../infrastructure/gateways/functions/data/getToday');
const ErrorStackParser = require('error-stack-parser');
const { historico } = require('../../../certs');


class getPerfilUsuarioUseCase {

    async getPerfilUsuario() {
        try {
            const response = await repository.getPerfilUsuario()
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
            logExeption({ descricaoDoErro: 'Exeption estourada. use case PerfilUsuario - getPerfilUsuarioUseCase -getPerfilUsuario', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            return { status: false, msg: 'Erro interno do servidor, log gerado' }
        }
    }


    async getPerfilUsuarioById(data) {
        try {
            const response = await repository.getPerfilUsuarioById(data)
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
            logExeption({ descricaoDoErro: 'Exeption estourada. use case PerfilUsuario - getPerfilUsuarioUseCase - getPerfilUsuarioById', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            return { status: false, msg: 'Erro interno do servidor, log gerado' }
        }
    }

    async getPerfilUsuarioByUserId(data) {
        try {
            const response = await repository.getPerfilUsuarioByUserId(data)
            if (response.status && response.exit) {
                return { status: true, data: response.data, msg: response.msg }
            } else {
                if (response.status) return { status: true, msg: "Perfil não cadastrado, solicite em seguida para cadastrar o perfil do usuário." }
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
            logExeption({ descricaoDoErro: 'Exeption estourada. use case PerfilUsuario - getPerfilUsuarioUseCase - getPerfilUsuarioById', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            return { status: false, msg: 'Erro interno do servidor, log gerado' }
        }
    }

    async getPerfilUsuarioByQuery(data) {
        try {
            const response = await repository.getPerfilUsuarioByQuery(data)
            if (response.status) {
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
            logExeption({ descricaoDoErro: 'Exeption estourada. use case PerfilUsuario- getPerfilUsuarioUseCase - getPerfilUsuarioByLimit', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            return { status: false, msg: 'Erro interno do servidor, log gerado' }
        }
    }

    async getPerfilUsuarioByQueryIdHistorico(data, id) {
        try {
            const response = await repository.getPerfilUsuarioByQueryIdHistorico(data, "objeto_id", id)
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
            logExeption({ descricaoDoErro: 'Exeption estourada. use case PerfilUsuario- getPerfilUsuarioUseCase - getPerfilUsuarioByLimit', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            return { status: false, msg: 'Erro interno do servidor, log gerado' }
        }
    }



}

module.exports = new getPerfilUsuarioUseCase();

