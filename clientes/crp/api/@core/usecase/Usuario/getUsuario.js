
const repository = require('../../../infrastructure/db/services/UsuarioRepositorio');
const repositoryPerfil = require('../../../infrastructure/db/services/PerfilUsuarioRepository.js');
const repositoryBiometria = require('../../../infrastructure/db/services/PerfilBiometriaRepository');
const logExeption = require('../Logs/exeption/exeptionUser')
const domain = require('../../domain/Usuario');
const dateNow = require('../../../infrastructure/gateways/functions/data/getToday')
const ErrorStackParser = require('error-stack-parser');
const { roles, assinaturaSessao } = require('../../../certs')

class getUser {



    async getRandomAdmin() {
        try {
            const checkUser = await repository.getAllAdmin();
            if (checkUser.status === true && checkUser.exit === true) {
                if (checkUser.data.length > 1) {
                    const indiceAleatorio = Math.floor(Math.random() * checkUser.data.length);
                    return { status: true, data: checkUser.data[indiceAleatorio] };

                } else {
                    return { status: true, data: checkUser.data[0] };
                }
            } else {
                return { status: false, err: checkUser.msg };
            }
        } catch (err) {
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(err);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            logExeption({ descricaoDoErro: 'Exeption estourada. use case User', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            return { status: false, msg: 'Erro interno do servidor, log gerado' }
        }

    }

    async getAllAdmin() {
        try {
            const checkUser = await repository.getAllAdmin();
            if (checkUser.status === true && checkUser.exit === true) {
                return { status: true, data: checkUser.data };
            } else {
                return { status: false, err: checkUser.msg };
            }
        } catch (err) {
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(err);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            logExeption({ descricaoDoErro: 'Exeption estourada. use case User', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            return { status: false, msg: 'Erro interno do servidor, log gerado' }
        }

    }

    async index(User) {
        try {
            const checkUser = await repository.getByEmail(User);
            if (checkUser.status === true && checkUser.exit === true) {
                const user = new domain(checkUser.data);
                return { status: true, user };
            } else {
                return { status: false, err: checkUser.msg, response: checkUser };
            }
        } catch (err) {
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(err);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            logExeption({ descricaoDoErro: 'Exeption estourada. use case User', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            return { status: false, msg: 'Erro interno do servidor, log gerado' }
        }
    }

    async getById(User) {
        try {
            const checkUser = await repository.getById(User);
            if (checkUser.status === true && checkUser.exit === true) {
                return { status: true, user: checkUser.data[0] };
            } else {
                return { status: false, err: checkUser.msg, response: checkUser };
            }
        } catch (err) {
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(err);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            logExeption({ descricaoDoErro: 'Exeption estourada. use case User', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            return { status: false, msg: 'Erro interno do servidor, log gerado' }
        }
    }

    async getAll() {
        try {

            const checkUser = await repository.getAll();
            if (checkUser.status === true && checkUser.exit === true) {
                return { status: true, data: checkUser.data };
            } else {
                return { status: false, err: checkUser.msg };
            }
        } catch (err) {
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(err);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            logExeption({ descricaoDoErro: 'Exeption estourada. use case User', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            return { status: false, msg: 'Erro interno do servidor, log gerado' }
        }
    }

    async getAllLimitInterCliente(data) {
        try {
            const checkUser = await repository.getAllLimitInterCliente(data);
            if (checkUser.status === true && checkUser.exit === true) {
                for await (const item of checkUser.data) {
                    item.bloqueado = item.bloqueado === 1 ? true : false;
                    item.email_verificado = item.email_verificado === 1 ? true : false;
                    const keyRole = Object.keys(roles).find(key => roles[key] === item.role);
                    item.roleName = keyRole.toUpperCase();
                }
                return checkUser
            } else {
                return { status: false, err: checkUser.msg };
            }
        } catch (err) {
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(err);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            logExeption({ descricaoDoErro: 'Exeption estourada. use case User', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            return { status: false, msg: 'Erro interno do servidor, log gerado' }
        }
    }

    async getAllLimitInterClienteQuery(data) {
        try {

            const checkUser = await repository.getAllLimitInterClienteQuery(data);
            if (checkUser.status === true && checkUser.exit === true) {
                for await (const item of checkUser.data) {
                    item.bloqueado = item.bloqueado === 1 ? true : false;
                    item.email_verificado = item.email_verificado === 1 ? true : false;
                    const keyRole = Object.keys(roles).find(key => roles[key] === item.role);
                    item.roleName = keyRole.toUpperCase();
                }
                return checkUser
            } else {
                return { status: false, err: checkUser.msg };
            }
        } catch (err) {
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(err);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            logExeption({ descricaoDoErro: 'Exeption estourada. use case User', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            return { status: false, msg: 'Erro interno do servidor, log gerado' }
        }
    }

    async getAllLimitInter(data) {
        try {

            const checkUser = await repository.getAllLimitInter(data);
            if (checkUser.status === true && checkUser.exit === true) {
                for await (const item of checkUser.data) {
                    item.bloqueado = item.bloqueado === 1 ? true : false;
                    item.email_verificado = item.email_verificado === 1 ? true : false;
                    const keyRole = Object.keys(roles).find(key => roles[key] === item.role);
                    item.roleName = keyRole.toUpperCase();
                }
                return checkUser
            } else {
                return { status: false, err: checkUser.msg };
            }
        } catch (err) {
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(err);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            logExeption({ descricaoDoErro: 'Exeption estourada. use case User', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            return { status: false, msg: 'Erro interno do servidor, log gerado' }
        }
    }

    async getUsuarioQuery(data) {
        try {

            const checkUser = await repository.getUsuarioQuery(data);
            if (checkUser.status === true) {
                for await (const item of checkUser.data) {
                    item.bloqueado = item.bloqueado === 1 ? true : false;
                    item.email_verificado = item.email_verificado === 1 ? true : false;
                    const keyRole = Object.keys(roles).find(key => roles[key] === item.role);
                    item.role = keyRole.toUpperCase();
                    delete item.senha;
                    if (assinaturaSessao.biometriaObrigatoria) {
                        const checkPerfil = await repositoryPerfil.getPerfilUsuarioByUserId({ user_id: item.id })
                        if (!checkPerfil.status) return { status: false, msg: "Ocorreu um erro interno, tente novamente em instantes." }
                        if (!checkPerfil.exit) {
                            item.biometria = { cadastrada: false, aprovada: false }
                        } else {
                            const checkBiometria = await repositoryBiometria.getPerfilBiometriaByPerfilId({ perfil_id: checkPerfil.data.id })
                            if (!checkBiometria.status) return { status: false, msg: "Ocorreu um erro interno, tente novamente em instantes." }
                            if (!checkBiometria.exit) {
                                item.biometria = { cadastrada: false, aprovada: false }
                            } else {
                                item.biometria = { cadastrada: true, aprovada: !!checkBiometria.data.aprovado_por }
                            }
                        }
                    }
                }
                return checkUser
            } else {
                return { status: false, err: checkUser.msg };
            }
        } catch (err) {
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(err);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            logExeption({ descricaoDoErro: 'Exeption estourada. use case User', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            return { status: false, msg: 'Erro interno do servidor, log gerado' }
        }
    }

    async getUsuarioQueryEmail(data) {
        try {

            const checkUser = await repository.getUsuarioQueryEmail(data);
            if (checkUser.status === true) {
                return checkUser
            } else {
                return { status: false, err: checkUser.msg };
            }
        } catch (err) {
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(err);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            logExeption({ descricaoDoErro: 'Exeption estourada. use case User', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            return { status: false, msg: 'Erro interno do servidor, log gerado' }
        }
    }

    async getUsuarioByEmail(data) {
        try {
            const checkUser = await repository.getByEmail(data);
            if (checkUser.status && checkUser.exit) {
                return { status: true, data: checkUser.data }
            } else {
                return { status: false, err: checkUser.msg, response: checkUser };
            }
        } catch (err) {
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(err);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            logExeption({ descricaoDoErro: 'Exeption estourada. use case User', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            return { status: false, msg: 'Erro interno do servidor, log gerado' }
        }
    }


}

module.exports = new getUser();
