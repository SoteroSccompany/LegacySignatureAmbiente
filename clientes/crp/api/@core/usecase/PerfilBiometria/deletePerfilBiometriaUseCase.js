
    const repository = require('../../../infrastructure/db/services/PerfilBiometriaRepository');
    const domain = require('../../domain/PerfilBiometria');
    const logExeption = require('../Logs/exeption/exeptionPerfilBiometria');
    const dateNow = require('../../../infrastructure/gateways/functions/data/getToday');
    const ErrorStackParser = require('error-stack-parser');
    const getUseCase = require('./getPerfilBiometriaUseCase');


    class deletePerfilBiometriaUseCase {

        async indexPerfilBiometria(data) {
            try {
                const checkPerfilBiometria = await getUseCase.getPerfilBiometriaById(data)
                if(!checkPerfilBiometria.status && !checkPerfilBiometria.response.status) return {status: false, msg: 'Erro ao encontrar PerfilBiometria, tente novamente mais tarde.'}
                if(!checkPerfilBiometria.status)  return {status: false, msg: 'PerfilBiometria não encontrado.'}
                const objPerfilBiometria = new domain(data)
                const response = await repository.deletePerfilBiometria(objPerfilBiometria)
                return {
                    status: response.status,
                    object: checkPerfilBiometria.data,
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
                logExeption({ descricaoDoErro: 'Exeption estourada. use case PerfilBiometria - deletePerfilBiometriaUseCase -indexPerfilBiometria ', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
                return {status: false, msg:'Erro interno do servidor, log gerado'}
            }
        }     



    }

    module.exports = new deletePerfilBiometriaUseCase();

    