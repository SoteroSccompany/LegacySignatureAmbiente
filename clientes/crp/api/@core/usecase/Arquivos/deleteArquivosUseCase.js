
const repository = require('../../../infrastructure/db/services/ArquivosRepository')
const domain = require('../../domain/Arquivos')
const logExeption = require('../Logs/exeption/exeptionArquivos')
const dateNow = require('../../../infrastructure/gateways/functions/data/getToday')
const ErrorStackParser = require('error-stack-parser');
const fs = require('fs');
const getFile = require('./getArquivosUseCase')

class deleteArquivosUseCase {

    async indexArquivos(data) {
        try {
            const objArquivos = new domain(data)
            const checkFile = await getFile.getArquivosById({ id: objArquivos.id })
            if (!checkFile.status) return { status: false, msg: 'Arquivo não encontrado' }
            const response = await repository.deleteArquivos(objArquivos)
            if (response.status) {
                fs.unlinkSync(checkFile.data.path)
                return { status: true, msg: 'Arquivo deletado com sucesso' }
            } else {
                return { status: false, msg: 'Erro ao deletar arquivo' }
            }
        } catch (err) {
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(err);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            logExeption({ descricaoDoErro: 'Exeption estourada. use case Arquivos - deleteArquivosUseCase -indexArquivos ', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            return { status: false, msg: 'Erro interno do servidor, log gerado' }
        }
    }


}

module.exports = new deleteArquivosUseCase();

