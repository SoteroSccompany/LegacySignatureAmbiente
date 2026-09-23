
    const repository = require('../../../infrastructure/db/services/IdentificacaoBiometricaRepository');
    const domain = require('../../domain/IdentificacaoBiometrica');
    const logExeption = require('../Logs/exeption/exeptionIdentificacaoBiometrica');
    const dateNow = require('../../../infrastructure/gateways/functions/data/getToday');
    const ErrorStackParser = require('error-stack-parser');


    class createIdentificacaoBiometricaUseCase {

        async indexIdentificacaoBiometrica(data) {
            try {
                const objIdentificacaoBiometrica = new domain({...data, data_criacao: dateNow()})
                const response = await repository.createIdentificacaoBiometrica(objIdentificacaoBiometrica)
                   return {
                    status: response.status,
                    object: objIdentificacaoBiometrica,
                    msg: response.msg
                }
            }catch(err){            
                let lineError = '0';
                let fileName = '0';
                const stackFrames = ErrorStackParser.parse(err);
                if (stackFrames.length > 0) {
                    lineError = stackFrames[0].lineNumber;
                    fileName = stackFrames[0].fileName;
                }
                logExeption({ descricaoDoErro: 'Exeption estourada. use case IdentificacaoBiometrica - createIdentificacaoBiometricaUseCase - indexIdentificacaoBiometrica', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
                return {status: false, msg:'Erro interno do servidor, log gerado'}
            }
        }     



    }

    module.exports = new createIdentificacaoBiometricaUseCase();

    