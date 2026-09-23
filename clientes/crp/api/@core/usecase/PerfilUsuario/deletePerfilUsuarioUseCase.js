
    const repository = require('../../../infrastructure/db/services/PerfilUsuarioRepository');
    const domain = require('../../domain/PerfilUsuario');
    const logExeption = require('../Logs/exeption/exeptionPerfilUsuario');
    const dateNow = require('../../../infrastructure/gateways/functions/data/getToday');
    const ErrorStackParser = require('error-stack-parser');
    const getUseCase = require('./getPerfilUsuarioUseCase');


    class deletePerfilUsuarioUseCase {

        async indexPerfilUsuario(data) {
            try {
                const checkPerfilUsuario = await getUseCase.getPerfilUsuarioById(data)
                if(!checkPerfilUsuario.status && !checkPerfilUsuario.response.status) return {status: false, msg: 'Erro ao encontrar PerfilUsuario, tente novamente mais tarde.'}
                if(!checkPerfilUsuario.status)  return {status: false, msg: 'PerfilUsuario não encontrado.'}
                const objPerfilUsuario = new domain(data)
                const response = await repository.deletePerfilUsuario(objPerfilUsuario)
                return {
                    status: response.status,
                    object: checkPerfilUsuario.data,
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
                logExeption({ descricaoDoErro: 'Exeption estourada. use case PerfilUsuario - deletePerfilUsuarioUseCase -indexPerfilUsuario ', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
                return {status: false, msg:'Erro interno do servidor, log gerado'}
            }
        }     



    }

    module.exports = new deletePerfilUsuarioUseCase();

    