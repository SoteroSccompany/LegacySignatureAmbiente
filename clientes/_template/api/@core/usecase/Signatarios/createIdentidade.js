
const logExeption = require('../Logs/exeption/exeptionSignatarios.js');
const dateNow = require('../../../infrastructure/gateways/functions/data/getToday.js');
const ErrorStackParser = require('error-stack-parser');
const repositorioLogin = require('../../../infrastructure/db/services/LoginRepositorio.js');
const repositorioUsuario = require('../../../infrastructure/db/services/UsuarioRepositorio.js');
const repositorioPerfil = require('../../../infrastructure/db/services/PerfilUsuarioRepository.js');
const LedgertUsuario = require('../../../infrastructure/gateways/helpers/AuditoriaAlteracao/LadgerUsuario/index.js');
const LedgertPerfil = require('../../../infrastructure/gateways/helpers/AuditoriaAlteracao/LadgerPerfilUsuario/index.js');
const domainUsuario = require('../../domain/Usuario.js');
const domainHistorico = require('../../domain/Historico.js');
const domainPerfil = require('../../domain/PerfilUsuario.js');
const {
    eventoAuditoria,
    roles,
    historico,
    status_perfil_usuario,
    etapas_perfil_usuario
} = require('../../../certs/index.js');
const createUser = require('../Usuario/criarUsuario.js');
const bcrypt = require('bcrypt');
const uuid = require('uuid');
const logs = require('../../../Logs/index.js');

class CreateIdentidadeUsecase {

    #trx = null;
    #sha = null;

    constructor(data) {
        this.#trx = data.trx;
        this.#sha = data.sha;
    }


    async CreateUsuarioSignatario(data, metadado, historicoArray) {
        try {
            const ladgerUsuario = new LedgertUsuario(this.#trx);
            for await (const item of data) {
                const senha = createUser.password(12);
                const salt = bcrypt.genSaltSync(10);
                const senhaHash = bcrypt.hashSync(senha, salt);
                const domain = new domainUsuario({
                    email: item.email,
                    senha: senhaHash,
                    role: roles.signer,
                    trocar_senha: true,
                    bloqueado: 0,
                    segredo_dois_fatores: null,
                    codigo_hash: null,
                    email_verificado: true,
                    dois_fatores: 0,
                    data_criacao: dateNow(),
                    data_atualizacao: dateNow(),
                });
                const result = await repositorioUsuario.createTrx(domain.getUser(), this.#trx);
                if (!result.status) return { status: false, msg: result.msg }
                await ladgerUsuario.GravarAuditoriaCriacao({
                    usuario: domain.getUser(),
                    tipo_evento: eventoAuditoria.usuario_staging_criado.label,
                    sequencia: 1,
                    meta_data: metadado,
                    user_id: metadado.user_id
                })
                item.user_id = domain.id;
                item.senhaEmail = senha;
                historicoArray.push(new domainHistorico({
                    transformacao: historico.trnasformcao.create.value,
                    dado_atual: domain.getUser(),
                    user_id: metadado.user_id
                }));
                const profile = await this.CreateProfileSignatario([item], metadado, historicoArray);
                if (!profile) return false
            }
            return true;
        } catch (err) {
            console.log(err)
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(err);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            logExeption({
                descricaoDoErro: 'Exeption estourada. use case Signatarios - createSignatariosUseCase - indexSignatarios',
                linhaDoErro: lineError,
                nomeDoArquivo: fileName,
                data_criacao: dateNow(),
                data_atualizacao: dateNow(),
                deletado: false,
            })
            return false;
        }
    }

    async CreateProfileSignatario(data, metadado, historicoArray) {
        try {
            const ladgerPerfil = new LedgertPerfil(this.#trx);
            for await (const item of data) {
                const cpf_bindex = this.#sha.generateBlindIndex(item.cpf);
                const cpf_encrypt = this.#sha.encrypt(item.cpf);
                const domain = new domainPerfil({
                    user_id: item.user_id,
                    cpf: cpf_encrypt,
                    cpf_bindex,
                    telefone: item.telefone,
                    nome: item.nome,
                    status: status_perfil_usuario.pendente,
                    etapa: etapas_perfil_usuario.dados
                });
                const result = await repositorioPerfil.createPerfilUsuarioTrx(domain.getPerfilUsuario(), this.#trx);
                if (!result.status) return { status: false, msg: result.msg }
                await ladgerPerfil.GravarAuditoriaCriacao({
                    perfil: domain.getPerfilUsuario(),
                    tipo_evento: eventoAuditoria.perfil_criado_assinatura.label,
                    sequencia: 1,
                    meta_data: metadado,
                    user_id: metadado.user_id
                })
                item.perfil_id = domain.id;
                historicoArray.push(new domainHistorico({
                    transformacao: historico.trnasformcao.create.value,
                    dado_atual: domain.getPerfilUsuario(),
                    user_id: metadado.user_id
                }));
            }
            return true;
        } catch (err) {
            console.log(err)
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(err);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            logExeption({
                descricaoDoErro: 'Exeption estourada. use case Signatarios - createSignatariosUseCase - indexSignatarios',
                linhaDoErro: lineError,
                nomeDoArquivo: fileName,
                data_criacao: dateNow(),
                data_atualizacao: dateNow(),
                deletado: false,
            })
            return false;
        }
    }



}

module.exports = CreateIdentidadeUsecase;