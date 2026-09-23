
const knex = require("../../../infrastructure/db/config/databaseConection")();
const userDomain = require("../../../@core/domain/Usuario");
const crypto = require("crypto");
const domainStaging = require("../../../@core/domain/UsuarioStaging");
const crypt = require("../../../infrastructure/gateways/crypt/CriptClass.crypt");
const bcrypt = require("bcrypt");
const sendEmail_usecase = require("../Mail/enviarEmail");
const uuid = require('uuid');
const repositoryUsers = require("../../../infrastructure/db/services/UsuarioRepositorio");
const repositoryStaging = require("../../../infrastructure/db/services/UsuarioStagingRepository");
const LedgerUsuarioStaging = require("../../../infrastructure/gateways/helpers/AuditoriaAlteracao/LadgerUsuarioStaging");
const LedgerUsuario = require("../../../infrastructure/gateways/helpers/AuditoriaAlteracao/LadgerUsuario");
const logExeption = require('../Logs/exeption/exeptionUser')
const dateNow = require('../../../infrastructure/gateways/functions/data/getToday')
const ErrorStackParser = require('error-stack-parser');
const { origemUsuarioStaging, statusUsuarioStaging, eventoAuditoria, roles, assinaturaSessao } = require('../../../certs');


class CreatUser {

    async index(data) {
        try {
            const User = new userDomain(data);
            const passGen = uuid.v4();
            User.setUser({ senha: passGen, email_verificado: '0', bloqueado: true })
            const user = await this.hydrateUser(User);
            if (user.status === true && user.exit === false) {
                const token = crypt.create({ dto: { id: User.id }, type: "auth" });
                User.setUser({ tokenValidator: token })
                return { status: true, data: { ...User, senhaEmail: passGen } }
            } else {
                return { status: false, msg: "Erro ao cadastrar usuario, usuário já existente" };
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

    async create(data) {
        try {
            if (!assinaturaSessao.biometriaObrigatoria && parseInt(data.role) === roles.supervisor) return { status: false, msg: "Papel supervisor só é permitido quando a biometria é obrigatória." }
            const email = String(data.email).trim().toLowerCase();
            const checkUser = await repositoryUsers.getByEmail({ email });
            if (!checkUser.status) return { status: false, msg: "Erro interno, tente novamente em instantes." }
            if (checkUser.exit) return { status: false, msg: "Erro ao cadastrar usuario, usuario ja existente" };
            const checkStaging = await repositoryStaging.getPendenteByEmail({ email });
            if (!checkStaging.status) return { status: false, msg: "Erro interno, tente novamente em instantes." }
            if (checkStaging.exit) return { status: false, msg: "Já existe um convite pendente para este e-mail." } //OK pq pode vir do convite de acesso ao documento.
            const passGen = this.#generatePassword(12);
            const salt = bcrypt.genSaltSync(10);
            const senhaHash = bcrypt.hashSync(passGen, salt);
            const user = new userDomain({
                email,
                senha: senhaHash,
                role: data.role,
                email_verificado: true,
                dois_fatores: false,
                data_criacao: dateNow(),
                data_atualizacao: dateNow(),
                trocar_senha: true,
                bloqueado: false
            });
            const trx = await knex.transaction();
            try {
                const Result = await repositoryUsers.createTrx(user, trx);
                if (Result.status !== true) throw new Error(Result.msg || 'Erro ao criar usuário!');
                const auditoriaStaging = new LedgerUsuario(trx);
                await auditoriaStaging.GravarAuditoriaCriacao({
                    usuario: user,
                    tipo_evento: eventoAuditoria.usuario_criado.label,
                    sequencia: eventoAuditoria.usuario_criado.sequencia,
                    meta_data: {
                        origem: origemUsuarioStaging.painel,
                        role: user.role,
                        criado_por: data.user_id || null,
                    },
                    user_id: data.user_id || null,
                });
                await trx.commit();
            } catch (error) {
                console.log(error)
                await trx.rollback();
                if (error?.name === 'ErrorLedgerUsuarioStaging') {
                    console.log(error);
                    return { status: false, msg: 'Ocorreu um erro interno de auditoria, tente novamente em instantes.' }
                }
                return { status: false, msg: "Erro ao criar usuário!", err: error };
            }
            sendEmail_usecase.sendEmailCredenciaisUsuario({ email, senha_temporaria: passGen, user_id: data.user_id || null, id_user: user.id });
            return {
                status: true,
                msg: "Usuário criado com sucesso! As orientações de acesso foram enviadas para o e-mail do usuário.",
                object: { user },
            };
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



    async hydrateUser(User) {
        try {
            const salt = bcrypt.genSaltSync(10);
            const hash = bcrypt.hashSync(User.senha, salt);
            User.setUser({ senha: hash });
            const checkUser = await repositoryUsers.getByEmail(User);
            if (checkUser.status == true && checkUser.exit == false) {
                return { status: true, exit: false, checkUser }
            } else if (checkUser.status == true && checkUser.exit == true) {
                return { status: true, exit: true, checkUser }
            } else {
                return { status: false };
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

    #generatePassword(length = 10) {
        const numbers = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
        const letters = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z'];
        const upperLetters = letters.map(letter => letter.toUpperCase());
        const symbols = ['!', '@', '#', '$', '%', '^', '&', '*', '(', ')', '_', '+', '-', '=', '[', ']', '{', '}', ';', ':', ',', '.', '<', '>', '/'];

        const allChars = [...numbers, ...letters, ...upperLetters, ...symbols];

        const password = [
            numbers[crypto.randomInt(0, numbers.length)],
            letters[crypto.randomInt(0, letters.length)],
            upperLetters[crypto.randomInt(0, upperLetters.length)],
            symbols[crypto.randomInt(0, 3)]
        ];
        for (let i = password.length; i < length; i++) {
            const randomIndex = crypto.randomInt(0, allChars.length);
            password.push(allChars[randomIndex]);
        }
        return password.sort(() => crypto.randomInt(0, 3) - 1).join('');
    }

    password(length) {
        return this.#generatePassword(length);
    }


}

module.exports = new CreatUser();

