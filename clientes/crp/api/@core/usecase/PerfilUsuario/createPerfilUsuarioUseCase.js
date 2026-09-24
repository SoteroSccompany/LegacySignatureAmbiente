
const knex = require('../../../infrastructure/db/config/databaseConection')();
const repository = require('../../../infrastructure/db/services/PerfilUsuarioRepository');
const repositoryDesafio = require('../../../infrastructure/db/services/DesafioAutenticacaoRepository');
const domainDesafio = require('../../domain/DesafioAutenticacao');
const domain = require('../../domain/PerfilUsuario');
const logExeption = require('../Logs/exeption/exeptionPerfilUsuario');
const dateNow = require('../../../infrastructure/gateways/functions/data/getToday');
const ErrorStackParser = require('error-stack-parser');
const { SHA } = require('../../../infrastructure/gateways/crypt/sha');
const { confiDoisFatores, applicationName, historico, statusAplication, statusApp, eventoAuditoria, statusSignatario } = require('../../../certs/index');
const authenticator = require('otplib');
const GetUserUsecase = require('../Usuario/getUsuario');
const moment = require('moment');
const LedgerDesafioAutenticacao = require('../../../infrastructure/gateways/helpers/AuditoriaAlteracao/LadgerDesafioAutenticacao');
const LedgerSignatario = require('../../../infrastructure/gateways/helpers/AuditoriaAlteracao/LadgerSignatario');
const LedgerUsuarioStaging = require('../../../infrastructure/gateways/helpers/AuditoriaAlteracao/LadgerUsuarioStaging');
const LedgerPerfilUsuario = require('../../../infrastructure/gateways/helpers/AuditoriaAlteracao/LadgerPerfilUsuario');


class createPerfilUsuarioUseCase {

    async indexPerfilUsuario(data) {
        try {
            const sha = new SHA(process.env.SHA);
            const checkUsuario = await GetUserUsecase.getById({ id: data.user_id });
            if (!checkUsuario.status) return { status: false, msg: "Erro interno, tente novamente em instantes. Usuário 404" }
            const checkPerfil = await repository.getPerfilUsuarioByUserId({ user_id: data.user_id })
            if (!checkPerfil.status) return { status: false, msg: "Erro interno, tente novamente em instantes." }
            if (checkPerfil.exit) return { status: false, msg: "Perfil de usuário já cadastrado." }
            const encryptAgent = sha.encrypt(data.userAgent);
            const desafio = new domainDesafio({ ...data, tipo_desafio: confiDoisFatores.desafio.perfilUsuario, solicitacao_user_agent_hash: encryptAgent });
            const plainSecret = sha.decrypt(checkUsuario.user.codigo_hash);
            const authCode = await authenticator.generate({ secret: plainSecret, epochTolerance: 60 });
            if (statusApp.dev === statusAplication.status) {
                console.log(authCode)
            }
            desafio.desafio_hash = sha.hash(authCode);
            const trx = await knex.transaction();
            try {
                const response = await repositoryDesafio.createDesafio({ desafio: desafio.getDesafioAutenticacao() }, trx);
                if (!response.status) throw new Error(response.msg);
                const auditoriaDesafio = new LedgerDesafioAutenticacao(trx);
                await auditoriaDesafio.GravarAuditoriaCriacao({
                    desafio: desafio.getDesafioAutenticacao(),
                    tipo_evento: eventoAuditoria.desafio_criado.label,
                    sequencia: eventoAuditoria.desafio_criado.sequencia,
                    meta_data: { tipo_desafio: confiDoisFatores.desafio.perfilUsuario, sessao_id: data.sessao_id },
                    user_id: data.user_id,
                });
                await trx.commit();
                return {
                    status: response.status,
                    object: desafio,
                    msg: response.msg
                }
            } catch (error) {
                await trx.rollback();
                if (error?.name === 'ErrorLedgerDesafioAutenticacao') {
                    console.log(error);
                    return { status: false, msg: 'Ocorreu um erro interno de auditoria, tente novamente em instantes.' }
                }
                return { status: false, msg: error.message || 'Erro ao gerar desafio de perfil.' }
            }
        } catch (err) {
            console.log(err)
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(err);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            logExeption({ descricaoDoErro: 'Exeption estourada. use case PerfilUsuario - createPerfilUsuarioUseCase - indexPerfilUsuario', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            return { status: false, msg: 'Erro interno do servidor, log gerado' }
        }
    }

    async validarPerfilUsuario(data) {
        try {
            const sha = new SHA(process.env.SHA);
            const checkRequestValidado = await repositoryDesafio.getDesafioAutenticacaoByTipoAndUserIdUsado({ user_id: data.user_id, tipo_desafio: confiDoisFatores.desafio.perfilUsuario })
            if (!checkRequestValidado.status) return { status: false, msg: "Ocorreu um erro interno, tente novamente em instantes." }
            if (checkRequestValidado.exit) return { status: false, msg: "Perfil de usuário já cadastrado." }
            const checkRequest = await repositoryDesafio.getDesafioAutenticacaoByTipoAndUserIdNaoUsado({ sessao_id: data.sessao_id, user_id: data.user_id, tipo_desafio: confiDoisFatores.desafio.perfilUsuario })
            if (!checkRequest.status) return { status: false, msg: "Ocorreu um erro interno, tente novamente em instantes." }
            if (!checkRequest.exit) return { status: false, msg: "Não foi possível validar a solicitação, tente novamente em instantes." }
            const checkUser = await GetUserUsecase.getById({ id: data.user_id });
            if (!checkUser.status) return { status: false, msg: "Erro interno, tente novamente em instantes." }
            const desafio = checkRequest.data;
            const hashToken = sha.hash(data.token);
            const oldDesafio = { ...checkRequest.data };
            const user = checkUser.user;
            const checkPerfil = await repository.getPerfilUsuarioByUserId({ user_id: data.user_id })
            if (!checkPerfil.status) return { status: false, msg: "Erro interno, tente novamente em instantes." }
            if (checkPerfil.exit) return { status: false, msg: "Perfil de usuário já cadastrado." }
            const cpfSeach = sha.generateBlindIndex(data.cpf)
            const checkCpf = await repository.getPerfilUsuarioByCpf({ cpf_bindex: cpfSeach })
            if (!checkCpf.status) return { status: false, msg: "Erro interno, tente novamente em instantes." }
            if (checkCpf.exit) return { status: false, msg: "CPF já cadastrado." }
            if ((statusApp.prod === statusAplication.status) && (hashToken !== desafio.desafio_hash)) return { status: false, msg: "Código inválido" }
            const plainSecret = sha.decrypt(user.codigo_hash);
            const isValid = await authenticator.verify({
                token: data.token, secret: plainSecret, label: `${applicationName}:${user.email}`, issuer: applicationName, epochTolerance: 60
            });
            if (!isValid.valid) return { status: false, msg: "Código de autenticação inválido." }
            const encryptAgent = sha.encrypt(data.userAgent);
            const encryptTelefone = sha.encrypt(data.telefone);
            const cpfEncrypt = sha.encrypt(data.cpf);
            desafio.confirmacao_ip = data.solicitacao_ip;
            desafio.criado_em = moment(desafio.criado_em).format('YYYY-MM-DD HH:mm:ss');
            desafio.expira_em = moment(desafio.expira_em).format('YYYY-MM-DD HH:mm:ss');
            desafio.confirmacao_porta_logica = data.solicitacao_porta_logica;
            desafio.confirmacao_user_agent_hash = encryptAgent;
            desafio.usado = true;
            desafio.consumido_em = dateNow();
            const perfil = new domain({ ...data, cpf: cpfEncrypt, cpf_bindex: cpfSeach, desafio_id: desafio.id });
            const objects = [{ oldObject: oldDesafio, object: desafio, transformacao: historico.trnasformcao.update.value }, { oldObject: null, object: perfil, transformacao: historico.trnasformcao.create.value }];
            const trx = await knex.transaction();
            try {
                const signatariosAntigos = await trx('tab_signatarios').select('*')
                    .where('user_id', data.user_id).whereNull('perfil_id').andWhere('deletado', false);
                const stagingAntigo = await trx('tab_usuario_staging').select('*')
                    .where('user_id', data.user_id).andWhere('deletado', false)
                    .orderBy('atualizado_em', 'desc').first();
                const response = await repositoryDesafio.updateDesafioCreatePerfil({ desafio, perfil: perfil.getPerfilUsuario ? perfil.getPerfilUsuario() : perfil }, trx);
                if (!response.status) throw new Error(response.msg || "Erro ao validar perfil de usuário.");
                const auditoriaDesafio = new LedgerDesafioAutenticacao(trx);
                auditoriaDesafio.Initialize(oldDesafio);
                await auditoriaDesafio.GravarAuditoriaModificacao({
                    desafio,
                    tipo_evento: eventoAuditoria.desafio_confirmado.label,
                    sequencia: eventoAuditoria.desafio_confirmado.sequencia,
                    meta_data: { tipo_desafio: confiDoisFatores.desafio.perfilUsuario, perfil_id: perfil.id },
                    user_id: data.user_id,
                });
                const auditoriaPerfil = new LedgerPerfilUsuario(trx);
                await auditoriaPerfil.GravarAuditoriaCriacao({
                    perfil: perfil.getPerfilUsuario ? perfil.getPerfilUsuario() : perfil,
                    tipo_evento: eventoAuditoria.perfil_criado.label,
                    sequencia: eventoAuditoria.perfil_criado.sequencia,
                    meta_data: { desafio_id: desafio.id },
                    user_id: data.user_id,
                });
                for (const signatarioAntigo of signatariosAntigos) {
                    const ultimaLedgerSignatario = await trx('tab_auditoria_ledger_signatario')
                        .where('signatario_id', signatarioAntigo.id)
                        .where('deletado', false)
                        .orderBy('sequencia', 'desc')
                        .first();
                    const sequenciaSignatario = ultimaLedgerSignatario
                        ? Number(ultimaLedgerSignatario.sequencia) + 1
                        : eventoAuditoria.signatario_perfil_vinculado.sequencia;
                    const auditoriaSignatario = new LedgerSignatario(trx);
                    auditoriaSignatario.Initialize(signatarioAntigo);
                    await auditoriaSignatario.GravarAuditoriaModificacao({
                        signatario: { ...signatarioAntigo, perfil_id: perfil.id, status: statusSignatario.pendente },
                        tipo_evento: eventoAuditoria.signatario_perfil_vinculado.label,
                        sequencia: sequenciaSignatario,
                        meta_data: { perfil_id: perfil.id, desafio_id: desafio.id },
                        user_id: data.user_id,
                    });
                }
                if (stagingAntigo) {
                    const ultimaLedgerStaging = await trx('tab_auditoria_ledger_usuario_staging')
                        .where('usuario_staging_id', stagingAntigo.id)
                        .where('deletado', false)
                        .orderBy('sequencia', 'desc')
                        .first();
                    const sequenciaStaging = ultimaLedgerStaging
                        ? Number(ultimaLedgerStaging.sequencia) + 1
                        : eventoAuditoria.usuario_staging_atualizado.sequencia;
                    const auditoriaStaging = new LedgerUsuarioStaging(trx);
                    auditoriaStaging.Initialize(stagingAntigo);
                    await auditoriaStaging.GravarAuditoriaModificacao({
                        usuario_staging: { ...stagingAntigo, perfil_ok: true },
                        tipo_evento: eventoAuditoria.usuario_staging_atualizado.label,
                        sequencia: sequenciaStaging,
                        meta_data: { perfil_id: perfil.id },
                        user_id: data.user_id,
                    });
                }

                await trx.commit();
                return {
                    status: true,
                    object: perfil.getPerfilUsuario ? perfil.getPerfilUsuario() : perfil,
                    msg: "Perfil criado com sucesso. Cadastre sua foto para o reconhecimento facial."
                }
            } catch (error) {
                await trx.rollback();
                if (
                    error?.name === 'ErrorLedgerDesafioAutenticacao'
                    || error?.name === 'ErrorLedgerPerfilUsuario'
                    || error?.name === 'ErrorLedgerSignatario'
                    || error?.name === 'ErrorLedgerUsuarioStaging'
                ) {
                    console.log(error);
                    return { status: false, msg: 'Ocorreu um erro interno de auditoria, tente novamente em instantes.' }
                }
                return { status: false, msg: error.message || "Erro ao validar perfil de usuário." }
            }
        } catch (err) {
            console.log(err)
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(err);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            logExeption({ descricaoDoErro: 'Exeption estourada. use case PerfilUsuario - createPerfilUsuarioUseCase - indexPerfilUsuario', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            return { status: false, msg: 'Erro interno do servidor, log gerado' }
        }
    }



}

module.exports = new createPerfilUsuarioUseCase();

