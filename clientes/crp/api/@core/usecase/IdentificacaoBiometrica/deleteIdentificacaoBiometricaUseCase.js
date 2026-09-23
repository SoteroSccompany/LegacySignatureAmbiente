
    const repository = require('../../../infrastructure/db/services/IdentificacaoBiometricaRepository');
    const domain = require('../../domain/IdentificacaoBiometrica');
    const logExeption = require('../Logs/exeption/exeptionIdentificacaoBiometrica');
    const dateNow = require('../../../infrastructure/gateways/functions/data/getToday');
    const ErrorStackParser = require('error-stack-parser');
    const getUseCase = require('./getIdentificacaoBiometricaUseCase');


    class deleteIdentificacaoBiometricaUseCase {

        async indexIdentificacaoBiometrica(data) {
            try {
                const checkIdentificacaoBiometrica = await getUseCase.getIdentificacaoBiometricaById(data)
                if(!checkIdentificacaoBiometrica.status && !checkIdentificacaoBiometrica.response.status) return {status: false, msg: 'Erro ao encontrar IdentificacaoBiometrica, tente novamente mais tarde.'}
                if(!checkIdentificacaoBiometrica.status)  return {status: false, msg: 'IdentificacaoBiometrica não encontrado.'}
                const objIdentificacaoBiometrica = new domain(data)
                const response = await repository.deleteIdentificacaoBiometrica(objIdentificacaoBiometrica)
                return {
                    status: response.status,
                    object: checkIdentificacaoBiometrica.data,
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
                logExeption({ descricaoDoErro: 'Exeption estourada. use case IdentificacaoBiometrica - deleteIdentificacaoBiometricaUseCase -indexIdentificacaoBiometrica ', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
                return {status: false, msg:'Erro interno do servidor, log gerado'}
            }
        }     



    }

    module.exports = new deleteIdentificacaoBiometricaUseCase();

    