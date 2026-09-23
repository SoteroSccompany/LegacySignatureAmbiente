
const domainPerfil = require("../../domain/PerfilClientes");
const domain = require("../../domain/Usuario");
const crypt = require("../../../infrastructure/gateways/crypt/CriptClass.crypt");
const bcrypt = require("bcrypt");
const enviarEmail = require("../Mail/enviarEmail");
const uuid = require('uuid');
const repository = require("../../../infrastructure/db/services/UsuarioRepositorio");
const logExeption = require('../Logs/exeption/exeptionUser')
const dateNow = require('../../../infrastructure/gateways/functions/data/getToday')
const getCliente = require('../Clientes/getClientesUseCase');
const getPerfilClientes = require('../PerfilClientes/getPerfilClientesUseCase');
const getUsuarios = require('./getUsuario');

const ErrorStackParser = require('error-stack-parser');


class UserCliente {

    async update(data) {
        try {
            if (data.user.senha) delete data.user.senha
            if (data.user.role) delete data.user.role
            const decode = await crypt.verify({ dto: data.token, type: "login" })
            if (!decode.status) return { status: false, msg: "Ops, parece que tivemos um erro interno. Tentar novamente mais tarde" }
            const checkProfileUser = await getPerfilClientes.getPerfilClientesByUserId({ user_id: decode.token.id })
            if (!checkProfileUser.status) return { status: false, msg: "Ops, parece que tivemos um erro interno. Tentar novamente mais tarde" }
            const checkCliente = await getCliente.getClientesById({ id: checkProfileUser.data.cliente_id })
            if (!checkCliente.status) return { status: false, msg: "Ops, parece que tivemos um erro interno. Tentar novamente mais tarde" }
            const checkUser = await getUsuarios.getById({ id: data.user.id })
            if (!checkUser.status) return { status: false, msg: "Ops, parece que tivemos um erro interno. Tentar novamente mais tarde" }
            if (checkUser.user.email !== data.user.email) {
                const checkEmail = await repository.getByEmail({ email: data.user.email })
                if (!checkEmail.status) return { status: false, msg: "Ops, parece que tivemos um erro interno. Tentar novamente mais tarde" }
                if (checkEmail.exit) return { status: false, msg: "Ops, parece que o e-mail informado já possuí cadastro conosco" }
            }
            const checkPerfil = await getPerfilClientes.getPerfilClientesByUserId({ user_id: data.user.id })
            if (!checkPerfil.status && !checkPerfil.response.status) return { status: false, msg: "Ops, parece que tivemos um erro interno. Tentar novamente mais tarde" }
            if (!checkPerfil.status) return { status: false, msg: "Perfil não encontrado" }
            if (checkPerfil.data.cpf !== data.perfil.cpf) {
                const checkPerfilCpf = await getPerfilClientes.getPerfilClientesByCpfAndClienteId({ cpf: data.perfil.cpf, cliente_id: checkCliente.data.id })
                if (!checkPerfilCpf.status && !checkPerfilCpf.response.status) return { status: false, msg: "Ops, parece que tivemos um erro interno. Tentar novamente mais tarde" }
                if (checkPerfilCpf.status) return { status: false, msg: "Ops, parece que você já cadastrou um usuário com esse CPF" }
            }
            const user = new domain({ ...checkUser.user, ...data.user, data_atualizacao: dateNow() })
            const perfil = new domainPerfil({ ...checkPerfil.data, ...data.perfil, data_atualizacao: dateNow() })
            delete user.tokenValidator;
            delete user.novaSenha;
            const response = await repository.updateCliente({ user, perfil })
            return response
        } catch (err) {
            console.log(err)
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

    async index(data) {
        try {
            const decode = await crypt.verify({ dto: data.token, type: "login" })
            if (!decode.status) return { status: false, msg: "Ops, parece que tivemos um erro interno. Tentar novamente mais tarde" }
            const checkProfileUser = await getPerfilClientes.getPerfilClientesByUserId({ user_id: decode.token.id })
            if (!checkProfileUser.status) return { status: false, msg: "Ops, parece que tivemos um erro interno. Tentar novamente mais tarde" }
            const checkCliente = await getCliente.getClientesById({ id: checkProfileUser.data.cliente_id })
            if (!checkCliente.status) return { status: false, msg: "Ops, parece que tivemos um erro interno. Tentar novamente mais tarde" }
            const checkUsersRegister = await repository.getCountClientesUser({ cliente_id: checkCliente.data.id, user_id: decode.token.id })
            if (!checkUsersRegister.status) return { status: false, msg: "Ops, parece que tivemos um erro interno. Tentar novamente mais tarde" }
            const total = checkUsersRegister.data + 1;
            if (total > checkCliente.data.assinatura.plano_usuarios) return { status: false, msg: "Ops, parece que você atingiu o limite de usuários ativos cadastrados" }
            const passGen = uuid.v4();
            const user = new domain({ ...data.user, senha: passGen, email_verificado: 0, bloqueado: 1 })
            const perfil = new domainPerfil({ ...data.perfil, user_id: user.id, cliente_id: checkCliente.data.id, criado_por: decode.token.id, data_criacao: dateNow() })
            const salt = bcrypt.genSaltSync(10);
            const hash = bcrypt.hashSync(user.senha, salt);
            const checkEmail = await repository.getByEmail({ email: user.email })
            if (!checkEmail.status) return { status: false, msg: "Ops, parece que tivemos um erro interno. Tentar novamente mais tarde" }
            if (checkEmail.exit) return { status: false, msg: "Ops, parece que o e-mail informado já possuí cadastro conosco" }
            const checkPerfil = await getPerfilClientes.getPerfilClientesByCpfAndClienteId({ cpf: perfil.cpf, cliente_id: checkCliente.data.id })
            if (!checkPerfil.status && !checkPerfil.response.status) return { status: false, msg: "Ops, parece que tivemos um erro interno. Tentar novamente mais tarde" }
            if (checkPerfil.status) return { status: false, msg: "Ops, parece que você já cadastrou um usuário com esse CPF" }
            user.setUser({ senha: hash })
            delete user.tokenValidator;
            delete user.novaSenha;
            const response = await repository.createCliente({ user, perfil })
            if (!response.status) return { status: false, msg: "Ops, parece que tivemos um erro interno. Tentar novamente mais tarde" }
            const token = crypt.create({ dto: { id: user.id }, type: "auth" });
            const email = { senha: passGen, identifier: checkCliente.data.idLink, token, email: user.email }
            enviarEmail.sendEmailCreateClienteAssinatura(email)
            return response
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

module.exports = new UserCliente();

