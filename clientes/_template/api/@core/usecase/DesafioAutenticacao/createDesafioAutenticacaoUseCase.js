
const knex = require('../../../infrastructure/db/config/databaseConection')();
const repository = require('../../../infrastructure/db/services/DesafioAutenticacaoRepository');
const repositoryLogin = require('../../../infrastructure/db/services/LoginRepositorio');
const repositoryPerfil = require('../../../infrastructure/db/services/PerfilUsuarioRepository');
const domain = require('../../domain/DesafioAutenticacao');
const logExeption = require('../Logs/exeption/exeptionDesafioAutenticacao');
const dateNow = require('../../../infrastructure/gateways/functions/data/getToday');
const ErrorStackParser = require('error-stack-parser');
const { SHA } = require('../../../infrastructure/gateways/crypt/sha');
const { BCRYPT } = require('../../../infrastructure/gateways/crypt/Bcrypt');
const { confiDoisFatores, applicationName, historico, statusAplication, statusApp, eventoAuditoria } = require('../../../certs/index');
const authenticator = require('otplib');
const GetUserUsecase = require('../Usuario/getUsuario');
const qrCode = require('qrcode');
const crypto = require('crypto');
const moment = require('moment');
const LedgerDesafioAutenticacao = require('../../../infrastructure/gateways/helpers/AuditoriaAlteracao/LadgerDesafioAutenticacao');
const LedgerUsuario = require('../../../infrastructure/gateways/helpers/AuditoriaAlteracao/LadgerUsuario');
const LadgerLogin = require('../../../infrastructure/gateways/helpers/AuditoriaAlteracao/LadgerLogin');
const domainLogin = require('../../domain/login');

class createDesafioAutenticacaoUseCase {

    async indexDesafioAutenticacao(data) {
        try {
            const checkUser = await GetUserUsecase.getById({ id: data.user_id });
            if (!checkUser.status) return { status: false, msg: "Usuário não encontrado." }
            const user = checkUser.user;
            if (user.dois_fatores === 1) return { status: false, msg: "Usuário já possui autenticação de dois fatores habilitada." }
            const checkDesafio = await repository.getDesafioAutenticacaoBySessionAndUserIdUsado({ sessao_id: data.sessao_id, user_id: data.user_id });
            if (!checkDesafio.status) return { status: false, msg: "Erro temporário, tente novamente." }
            if (checkDesafio.exit) return { status: false, msg: "Desafio de autenticação já foi gerado." }
            const sha = new SHA(process.env.SHA);
            const encrptAgent = sha.encrypt(data.userAgent);
            const objDesafioAutenticacao = new domain({ ...data, data_criacao: dateNow(), solicitacao_user_agent_hash: encrptAgent, tipo_desafio: confiDoisFatores.desafio.autenticacaoCadastro });
            const plainSecret = authenticator.generateSecret();
            const hashSecret = sha.encrypt(plainSecret);
            const oldUser = { ...user };
            user.codigo_hash = hashSecret;
            const optCode = await authenticator.generate({ secret: plainSecret, epochTolerance: 120 });
            if (statusApp.dev === statusAplication.status) {
                console.log(optCode)
            }
            objDesafioAutenticacao.desafio_hash = sha.hash(optCode);
            const otpAuthUrl = authenticator.generateURI({ secret: plainSecret, label: `${applicationName}:${user.email}`, issuer: applicationName, epochTolerance: 120 });
            const qrCodeImage = await qrCode.toDataURL(otpAuthUrl);
            const trx = await knex.transaction();
            try {
                const response = await repository.createDesafioAutenticacaoInicialCreateDesafio({ desafio: objDesafioAutenticacao.getDesafioAutenticacao(), codigo_hash: hashSecret }, trx);
                if (!response.status) throw new Error(response.msg);
                const auditoriaDesafio = new LedgerDesafioAutenticacao(trx);
                await auditoriaDesafio.GravarAuditoriaCriacao({
                    desafio: objDesafioAutenticacao.getDesafioAutenticacao(),
                    tipo_evento: eventoAuditoria.desafio_criado.label,
                    sequencia: eventoAuditoria.desafio_criado.sequencia,
                    meta_data: { tipo_desafio: confiDoisFatores.desafio.autenticacaoCadastro, sessao_id: data.sessao_id },
                    user_id: data.user_id,
                });
                await trx.commit();
                return {
                    status: response.status,
                    qrcode: qrCodeImage,
                    object: objDesafioAutenticacao,
                    msg: response.msg
                }
            } catch (error) {
                await trx.rollback();
                if (error?.name === 'ErrorLedgerDesafioAutenticacao' || error?.name === 'ErrorLedgerUsuario') {
                    console.log(error);
                    return { status: false, msg: 'Ocorreu um erro interno de auditoria, tente novamente em instantes.' }
                }
                return { status: false, msg: error.message || 'Erro ao gerar desafio de autenticação.' }
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
            logExeption({ descricaoDoErro: 'Exeption estourada. use case DesafioAutenticacao - createDesafioAutenticacaoUseCase - indexDesafioAutenticacao', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            return { status: false, msg: 'Erro interno do servidor, log gerado' }
        }
    }

    async ConfirmacaoDesafioAutenticacao(data) {
        try {
            const checkValidation = await repository.getDesafioAutenticacaoBySessionAndUserIdNaoUsado({ sessao_id: data.sessao_id, user_id: data.user_id });
            if (!checkValidation.status) return { status: false, msg: "Erro interno, tente novamente em instantes." };
            if (!checkValidation.exit) return { status: false, msg: "Solicitação não localizada." };
            if (checkValidation.data.tipo_desafio !== confiDoisFatores.desafio.autenticacaoCadastro) {
                await repository.deleteDesafioAutenticacaoByUserId({ user_id: data.user_id });
                return { status: false, msg: "Tipo de desafio inválido." }
            }
            const checkUser = await GetUserUsecase.getById({ id: data.user_id });
            if (!checkUser.status) return { status: false, msg: "Usuário não encontrado." }
            const user = checkUser.user;
            const oldUser = { ...checkUser.user };
            const desafio = checkValidation.data;
            const oldDesafio = { ...checkValidation.data };
            const expired = moment(desafio.expira_em).isBefore(moment());
            if ((statusAplication.status === statusApp.prod) && expired) return { status: false, msg: "Desafio de autenticação expirado." }
            if (desafio.usado === 1) return { status: false, msg: "Desafio de autenticação já foi utilizado." }
            const sha = new SHA(process.env.SHA);
            const plainSecret = sha.decrypt(user.codigo_hash);
            const isValid = await authenticator.verify({
                token: data.token, secret: plainSecret, label: `${applicationName}:${user.email}`, issuer: applicationName
            });
            const tokenInterno = sha.hash(data.token);
            if (statusApp.prod === statusAplication.status && tokenInterno !== desafio.desafio_hash) return { status: false, msg: "Código de autenticação inválido." }
            if (statusApp.prod === statusAplication.status && !isValid.valid) return { status: false, msg: "Código de autenticação inválido." }
            data.userAgent = sha.encrypt(data.userAgent);
            desafio.confirmacao_ip = data.solicitacao_ip;
            desafio.confirmacao_porta_logica = data.solicitacao_porta_logica;
            desafio.confirmacao_user_agent_hash = sha.encrypt(data.userAgent);
            desafio.usado = true;
            desafio.consumido_em = dateNow();
            user.dois_fatores = true;
            user.desafio_id = desafio.id;
            user.data_atualizacao = dateNow();
            const rawRecoveryCodes = Array.from({ length: 3 }, () => {
                const hex = crypto.randomBytes(4).toString('hex');
                return `${hex.slice(0, 4)}-${hex.slice(4)}`;
            });
            const bcrypt = new BCRYPT();
            const jsonHash = { tokens: rawRecoveryCodes.map(code => bcrypt.encrypt(code)) };
            user.recuperacao = JSON.stringify(jsonHash);
            const trx = await knex.transaction();
            try {
                const response = await repository.updateDesafioAutenticacao(desafio, user, trx);
                if (!response.status) throw new Error(response.msg || "Erro ao atualizar desafio de autenticação.");
                const auditoriaDesafio = new LedgerDesafioAutenticacao(trx);
                auditoriaDesafio.Initialize(oldDesafio);
                await auditoriaDesafio.GravarAuditoriaModificacao({
                    desafio,
                    tipo_evento: eventoAuditoria.desafio_confirmado.label,
                    sequencia: eventoAuditoria.desafio_confirmado.sequencia,
                    meta_data: { tipo_desafio: desafio.tipo_desafio, sessao_id: data.sessao_id },
                    user_id: data.user_id,
                });
                const ultimaLedgerUsuario = await trx('tab_auditoria_ledger_usuario')
                    .where('usuario_id', data.user_id)
                    .where('deletado', false)
                    .orderBy('sequencia', 'desc')
                    .first();
                const sequenciaUsuario = ultimaLedgerUsuario
                    ? Number(ultimaLedgerUsuario.sequencia) + 1
                    : eventoAuditoria.usuario_atualizado.sequencia;
                const auditoriaUsuario = new LedgerUsuario(trx);
                auditoriaUsuario.Initialize(oldUser);
                await auditoriaUsuario.GravarAuditoriaCriacao({
                    usuario: user,
                    tipo_evento: eventoAuditoria.usuario_atualizado.label,
                    sequencia: sequenciaUsuario,
                    meta_data: { acao: 'dois_fatores_cadastrado', desafio_id: desafio.id },
                    user_id: data.user_id,
                });
                await trx.commit();
            } catch (error) {
                await trx.rollback();
                if (error?.name === 'ErrorLedgerDesafioAutenticacao' || error?.name === 'ErrorLedgerUsuario') {
                    console.log(error);
                    return { status: false, msg: 'Ocorreu um erro interno de auditoria, tente novamente em instantes.' }
                }
                return { status: false, msg: error.message || "Erro ao atualizar desafio de autenticação." }
            }
            const objects = [{ oldObject: oldUser, object: user }, { oldObject: oldDesafio, object: desafio }];
            return {
                status: true,
                objects,
                recovery_codes: rawRecoveryCodes,
                msg: `Configuração de autenticação de dois fatores concluída com sucesso. Seus códigos de recuperação são: \n ${rawRecoveryCodes.join(', ')}. \n
                 Guarde-os em um local seguro, pois serão necessários caso você perca o acesso ao seu dispositivo de autenticação.`
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
            logExeption({ descricaoDoErro: 'Exeption estourada. use case DesafioAutenticacao - ConfirmacaoDesafioAutenticacao - ConfirmacaoDesafioAutenticacao', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            return { status: false, msg: 'Erro interno do servidor, log gerado' }
        }
    }

    async ConfirmacaoDesafioLogin(data) {
        try {
            const checkValidation = await repository.getDesafioAutenticacaoByTipoSessionAndUserIdNaoUsado({ sessao_id: data.sessao_id, user_id: data.user_id, tipo_desafio: confiDoisFatores.desafio.login });
            if (!checkValidation.status) return { status: false, msg: "Erro interno, tente novamente em instantes." };
            if (!checkValidation.exit) return { status: false, msg: "Solicitação não localizada." };
            const checkLoginUsuario = await repositoryLogin.getByUserId({ id: data.user_id });
            if (!checkLoginUsuario.status) return { status: false, msg: "Erro interno, tente novamente em instantes." };
            if (!checkLoginUsuario.exit) return { status: false, deleteLogin: true, msg: "Login não localizado." };
            const login = new domainLogin(checkLoginUsuario.data[0]);
            const oldLogin = { ...checkLoginUsuario.data[0] };
            const checkUser = await GetUserUsecase.getById({ id: data.user_id });
            if (!checkUser.status) return { status: false, deleteLogin: true, msg: "Usuário não encontrado." }
            const user = checkUser.user;
            const desafio = checkValidation.data;
            const oldDesafio = { ...checkValidation.data };
            const expired = moment(desafio.expira_em).isBefore(moment());
            if ((statusAplication.status === statusApp.prod) && expired) return { status: false, deleteLogin: true, msg: "Desafio de autenticação expirado." }
            if (desafio.usado === 1) return { status: false, deleteLogin: true, msg: "Desafio de autenticação já foi utilizado." }
            const sha = new SHA(process.env.SHA);
            if ((statusAplication.status === statusApp.prod) && (sha.hash(data.token) !== desafio.desafio_hash)) return { status: false, deleteLogin: true, msg: "Código de autenticação inválido." }
            const plainSecret = sha.decrypt(user.codigo_hash);
            const isValid = await authenticator.verify({
                token: data.token, secret: plainSecret, label: `${applicationName}:${user.email}`, issuer: applicationName
            });
            if (!isValid.valid) return { status: false, deleteLogin: true, msg: "Código de autenticação inválido." }
            data.userAgent = sha.encrypt(data.userAgent);
            desafio.confirmacao_ip = data.solicitacao_ip;
            desafio.confirmacao_porta_logica = data.solicitacao_porta_logica;
            desafio.confirmacao_user_agent_hash = sha.encrypt(data.userAgent);
            desafio.usado = true;
            desafio.consumido_em = dateNow();
            login.desafio_id = desafio.id;
            login.transito = true;
            login.data_atualizacao = dateNow();
            const trx = await knex.transaction();
            try {
                const response = await repository.updateDesafioAutenticacaoELogin(desafio, null, trx, login.getLoginUpdate());
                if (!response.status) throw new Error(response.msg || "Erro ao atualizar desafio de autenticação.");
                const auditoriaDesafio = new LedgerDesafioAutenticacao(trx);
                auditoriaDesafio.Initialize(oldDesafio);
                await auditoriaDesafio.GravarAuditoriaModificacao({
                    desafio,
                    tipo_evento: eventoAuditoria.desafio_confirmado.label,
                    sequencia: eventoAuditoria.desafio_confirmado.sequencia,
                    meta_data: { tipo_desafio: desafio.tipo_desafio, sessao_id: data.sessao_id },
                    user_id: data.user_id,
                });
                const auditoriaLogin = new LadgerLogin(trx);
                auditoriaLogin.Initialize(oldLogin);
                await auditoriaLogin.GravarAuditoriaModificacao({
                    login,
                    tipo_evento: eventoAuditoria.login_transito_aprovado.label,
                    sequencia: eventoAuditoria.login_transito_aprovado.sequencia,
                    meta_data: { acao: 'login_transito_aprovado', desafio_id: desafio.id, soliticacao_ip: data.solicitacao_ip, solicitacao_porta_logica: data.solicitacao_porta_logica, user_agent_hash: data.userAgent },
                    user_id: data.user_id,
                });
                await trx.commit();
            } catch (error) {
                console.log(error);
                await trx.rollback();
                if (error?.name === 'ErrorLedgerDesafioAutenticacao') {
                    console.log(error);
                    return { status: false, msg: 'Ocorreu um erro interno de auditoria, tente novamente em instantes.' }
                }
                return { status: false, msg: error.message || "Erro ao atualizar desafio de autenticação." }
            }
            const objects = [{ oldObject: oldDesafio, object: desafio }, { oldObject: oldLogin, object: login }];
            let next_step = 'OK';
            if (user.trocar_senha === 1 || user.trocar_senha === true) {
                next_step = 'REDEFINIR_SENHA';
            } else {
                const checkPerfil = await repositoryPerfil.getPerfilUsuarioByUserId({ user_id: user.id });
                if (checkPerfil.status && !checkPerfil.exit) next_step = 'CRIAR_PERFIL';
            }
            return {
                tokens: { token: login.token, refresh_token: login.refresh_token },
                user: { ip: data.solicitacao_ip, porta_logica: data.solicitacao_porta_logica, user_agent_hash: data.userAgent },
                status: true,
                desafio: desafio.id,
                objects,
                next_step,
                msg: `Login concluido com sucesso.`
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
            logExeption({ descricaoDoErro: 'Exeption estourada. use case DesafioAutenticacao - ConfirmacaoDesafioLogin - ConfirmacaoDesafioLogin', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            return { status: false, msg: 'Erro interno do servidor, log gerado' }
        }
    }



}

module.exports = new createDesafioAutenticacaoUseCase();

