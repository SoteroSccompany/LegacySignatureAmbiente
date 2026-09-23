
    const repository = require('../../../infrastructure/db/services/HistoricoRepository');
    const domain = require('../../domain/Historico');
    const logExeption = require('../Logs/exeption/exeptionHistorico');
    const dateNow = require('../../../infrastructure/gateways/functions/data/getToday');
    const ErrorStackParser = require('error-stack-parser');


    class deleteHistoricoUseCase {

        async indexHistorico(data) {
            try {
                const objHistorico = new domain(data)
                const response = await repository.deleteHistorico(objHistorico)
                return response
            }catch(err){            
                let lineError = '0';
                let fileName = '0';
                const stackFrames = ErrorStackParser.parse(err);
                if (stackFrames.length > 0) {
                    lineError = stackFrames[0].lineNumber;
                    fileName = stackFrames[0].fileName;
                }
                logExeption({ descricaoDoErro: 'Exeption estourada. use case Historico - deleteHistoricoUseCase -indexHistorico ', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
                return {status: false, msg:'Erro interno do servidor, log gerado'}
            }
        }     



    }

    module.exports = new deleteHistoricoUseCase();

    