
    const domain = require("../../domain/Usuario");
    const repositoryUsers = require("../../../infrastructure/db/services/UsuarioRepositorio");
    const crypt = require("../../../infrastructure/gateways/crypt/CriptClass.crypt");
    const bcrypt = require("bcrypt");
    const logExeption = require('../Logs/exeption/exeptionLogin')
    const dateNow = require('../../../infrastructure/gateways/functions/data/getToday')
    const ErrorStackParser = require('error-stack-parser');
    
    
    class checkPass{
    
        async index(dto){
            try{
    
                const user = new domain(dto)
                const decode = crypt.verify({dto: user.tokenValidator, type:"login"})
                if(decode.status){
                    const userSearch = await repositoryUsers.getById({id: decode.token.id})
                    if(userSearch.status){
                        const checkPass = await bcrypt.compare(user.password, userSearch.data[0].password)
                        if(checkPass){
                            return {status: true, msg: "Senha correta"}
                        }else{
                            return {status: false, msg: "Senha incorreta"}
                        }                
                    }else{
                        return {status: false, msg: user.msg}
                    }
                }else{
                    return {status: false, msg: decode.err}
                }
            }catch(err){            
                let lineError = '0';
                let fileName = '0';
                const stackFrames = ErrorStackParser.parse(err);
                if (stackFrames.length > 0) {
                    lineError = stackFrames[0].lineNumber;
                    fileName = stackFrames[0].fileName;
                }
                logExeption({ descricaoDoErro: 'Exeption estourada. use case logsSystem', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
                return {status: false, msg:'Erro interno do servidor, log gerado'}
            }
        }
    }
    
    module.exports = new checkPass();
    