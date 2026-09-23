
const repository = require('../../../infrastructure/db/services/ArquivosRepository')
const domain = require('../../domain/Arquivos')
const logExeption = require('../Logs/exeption/exeptionArquivos')
const dateNow = require('../../../infrastructure/gateways/functions/data/getToday')
const ErrorStackParser = require('error-stack-parser');
const fs = require('fs');
const deleteArquivos = require('./deleteArquivosUseCase')
const deleteFiles = require('../../../infrastructure/gateways/functions/deleteFile');
class createArquivosUseCase {

    async indexArquivos(data) {
        try {
            const objArquivos = new domain({ ...data, data_criacao: dateNow() })
            const response = await repository.createArquivos(objArquivos)
            if (response.status) {
                return { status: true, msg: 'Arquivo criado com sucesso', data: objArquivos }
            } else {
                fs.unlinkSync(data.path)
                return { status: false, msg: 'Erro ao criar arquivo', data: response }
            }
        } catch (err) {
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(err);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            logExeption({ descricaoDoErro: 'Exeption estourada. use case Arquivos - createArquivosUseCase - indexArquivos', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            return { status: false, msg: 'Erro interno do servidor, log gerado' }
        }
    }

    async indexArquivosSystema(data) {
        try {
            const objArquivos = new domain({ ...data, data_criacao: dateNow() })
            const response = await repository.createArquivos(objArquivos)
            if (response.status) {
                return { status: true, msg: 'Arquivo criado com sucesso', data: objArquivos }
            } else {
                fs.unlinkSync(data.path)
                return { status: false, msg: 'Erro ao criar arquivo', data: response }
            }
        } catch (err) {
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(err);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            logExeption({ descricaoDoErro: 'Exeption estourada. use case Arquivos - createArquivosUseCase - indexArquivos', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            return { status: false, msg: 'Erro interno do servidor, log gerado' }
        }
    }

    async bulkInsert(arquivos) {
        try {
            const arquivosCriados = []
            for (const data of arquivos) {
                const objArquivos = new domain({ ...data, data_criacao: dateNow() })
                const response = await repository.createArquivos(objArquivos)
                if (response.status) {
                    const domainPath = data.path.split('/').slice(1)[2];
                    arquivosCriados.push({ ...objArquivos.getArquivos(), domainPath })
                } else {
                    if (arquivosCriados.length > 0) {
                        arquivosCriados.forEach((arquivo) => {
                            deleteArquivos.indexArquivos({ id: arquivo.id })
                        })
                    }
                    fs.unlinkSync(data.path)
                    return { status: false, msg: 'Erro ao criar arquivo', data: response }
                }
            }
            return { status: true, msg: 'Arquivos criados com sucesso', data: arquivosCriados }
        } catch (err) {
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(err);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            logExeption({ descricaoDoErro: 'Exeption estourada. use case Arquivos - createArquivosUseCase - indexArquivos', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            return { status: false, msg: 'Erro interno do servidor, log gerado' }
        }
    }

    async bulkObject(arquivos) {
        try {
            const arquivosCriados = []
            for (const data of arquivos) {
                const objArquivos = new domain({ ...data, data_criacao: dateNow() })
                arquivosCriados.push(objArquivos.getArquivos())
            }
            return { status: true, msg: 'Arquivos criados com sucesso', data: arquivosCriados }
        } catch (err) {
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(err);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            logExeption({ descricaoDoErro: 'Exeption estourada. use case Arquivos - createArquivosUseCase - indexArquivos', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            return { status: false, msg: 'Erro interno do servidor, log gerado' }
        }
    }

    async ComprovanteEntrega(data) {
        try {
            const objArquivos = new domain({ ...data, data_criacao: dateNow() })
            const response = await repository.createArquivos(objArquivos)
            if (response.status) {
                return { status: true, msg: 'Arquivo criado com sucesso', data: objArquivos }
            } else {
                fs.unlinkSync(data.path)
                return { status: false, msg: 'Erro ao criar arquivo', data: response }
            }
        } catch (err) {
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(err);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            logExeption({ descricaoDoErro: 'Exeption estourada. use case Arquivos - createArquivosUseCase - indexArquivos', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            return { status: false, msg: 'Erro interno do servidor, log gerado' }
        }
    }




}

module.exports = new createArquivosUseCase();

