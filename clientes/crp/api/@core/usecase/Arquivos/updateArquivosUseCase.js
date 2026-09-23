
const repository = require('../../../infrastructure/db/services/ArquivosRepository')
const domain = require('../../domain/Arquivos')
const logExeption = require('../Logs/exeption/exeptionArquivos')
const dateNow = require('../../../infrastructure/gateways/functions/data/getToday')
const ErrorStackParser = require('error-stack-parser');
const getFile = require('./getArquivosUseCase')
const fs = require('fs');
class updateArquivosUseCase {


    async bulkUpdate(datas) {
        try {
            let dadosAlterados = []
            for await (const data of datas) {
                const objArquivos = new domain(data)
                const checkArquivo = await getFile.getArquivosById({ id: objArquivos.id })
                if (!checkArquivo.status) {
                    fs.unlinkSync(data.path)
                    continue;
                }
                objArquivos.setArquivos({ ...checkArquivo.data, ...objArquivos, data_criacao: checkArquivo.data.data_criacao, id: checkArquivo.data.id })
                const response = await repository.updateArquivos(objArquivos)
                if (response.status) {
                    fs.unlinkSync(checkArquivo.data.path)
                    dadosAlterados.push({ oldObject: checkArquivo.data, object: objArquivos })
                    continue;
                } else {
                    fs.unlinkSync(data.path)
                    continue;
                }
            }
            if (dadosAlterados.length) {
                return { status: true, data: dadosAlterados, msg: 'Arquivos atualizados com sucesso' }
            } else return { status: false, msg: 'Nenhum arquivo foi atualizado' }
        } catch (err) {
            console.log(err);
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(err);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            logExeption({ descricaoDoErro: 'Exeption estourada. use case Arquivos', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            return { status: false, msg: 'Erro interno do servidor, log gerado' }
        }
    }

    async indexArquivos(data) {
        try {
            const objArquivos = new domain(data)
            const checkArquivo = await getFile.getArquivosById({ id: objArquivos.id })
            if (!checkArquivo.status) {
                fs.unlinkSync(data.path)
                return { status: false, msg: 'Arquivo não encontrado' }
            }
            objArquivos.setArquivos({ ...checkArquivo.data, ...objArquivos, data_criacao: checkArquivo.data.data_criacao, id: checkArquivo.data.id })
            const response = await repository.updateArquivos(objArquivos)
            if (response.status) {
                fs.unlinkSync(checkArquivo.data.path)
                return { status: true, data: { oldArquivo: checkArquivo.data, newArquivo: objArquivos }, msg: 'Arquivo atualizado com sucesso' }
            } else {
                fs.unlinkSync(data.path)
                return { status: false, msg: 'Erro ao atualizar arquivo' }
            }
        } catch (err) {
            console.log(err);
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(err);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            logExeption({ descricaoDoErro: 'Exeption estourada. use case Arquivos', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            return { status: false, msg: 'Erro interno do servidor, log gerado' }
        }
    }

    async indexArquivosCliente(data) {
        try {
            const objArquivos = new domain(data)
            const checkArquivo = await getFile.getArquivosByIdCliente({ id: objArquivos.id })
            if (!checkArquivo.status) {
                fs.unlinkSync(data.path)
                return { status: false, msg: 'Arquivo não encontrado' }
            }
            objArquivos.setArquivos({ ...checkArquivo.data, ...objArquivos, data_criacao: checkArquivo.data.data_criacao, id: checkArquivo.data.id })
            const response = await repository.updateArquivosCliente(objArquivos)
            if (response.status) {
                fs.unlinkSync(checkArquivo.data.path)
                return { status: true, data: { oldArquivo: checkArquivo.data, newArquivo: objArquivos }, msg: 'Arquivo atualizado com sucesso' }
            } else {
                fs.unlinkSync(data.path)
                return { status: false, msg: 'Erro ao atualizar arquivo' }
            }
        } catch (err) {
            console.log(err);
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(err);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            logExeption({ descricaoDoErro: 'Exeption estourada. use case Arquivos', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            return { status: false, msg: 'Erro interno do servidor, log gerado' }
        }
    }



}

module.exports = new updateArquivosUseCase();

