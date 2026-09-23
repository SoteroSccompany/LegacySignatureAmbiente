
    const repository = require('../../../infrastructure/db/services/PerfilUsuarioRepository');
    const domain = require('../../domain/PerfilUsuario');
    const logExeption = require('../Logs/exeption/exeptionPerfilUsuario');
    const dateNow = require('../../../infrastructure/gateways/functions/data/getToday');
    const ErrorStackParser = require('error-stack-parser');
    const getUseCase = require('./getPerfilUsuarioUseCase');
    const CheckObjects = require('../../../infrastructure/gateways/helpers/CheckObjects');


    class updatePerfilUsuarioUseCase {

        async indexPerfilUsuario(data) {
            try {
                const objPerfilUsuario = new domain(data)
                const checkPerfilUsuario = await getUseCase.getPerfilUsuarioById(data)
                if(!checkPerfilUsuario.status && !checkPerfilUsuario.response.status) return {status: false, msg: 'Erro interno, tente novamente mais tarde.'}
                if(!checkPerfilUsuario.status) return {status: false, msg: 'PerfilUsuario não encontrado.'}
                if(CheckObjects.isSameObject(objPerfilUsuario, checkPerfilUsuario.data)) return {status: false, msg: 'Nenhum dado foi alterado.'}
                const response = await repository.updatePerfilUsuario(objPerfilUsuario)
                return {
                    status: response.status,
                    oldObject: checkPerfilUsuario.data,
                    object: objPerfilUsuario,
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
                logExeption({ descricaoDoErro: 'Exeption estourada. use case PerfilUsuario', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
                return {status: false, msg:'Erro interno do servidor, log gerado'}
            }
        }     



    }

    module.exports = new updatePerfilUsuarioUseCase();

    