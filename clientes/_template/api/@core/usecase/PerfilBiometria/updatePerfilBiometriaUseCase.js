
const repository = require('../../../infrastructure/db/services/PerfilBiometriaRepository');
const repositoryDesafio = require('../../../infrastructure/db/services/DesafioAutenticacaoRepository');
const repositoryPerfil = require('../../../infrastructure/db/services/PerfilUsuarioRepository');
const repositoryTermo = require('../../../infrastructure/db/services/TermoResponsabilidadeRepository.js');
const repositoryAceiteTermo = require('../../../infrastructure/db/services/AceiteTermoResponsabilidadeRepository.js');
const domain = require('../../domain/PerfilBiometria');
const domainDesafio = require('../../domain/DesafioAutenticacao');
const logExeption = require('../Logs/exeption/exeptionPerfilBiometria');
const dateNow = require('../../../infrastructure/gateways/functions/data/getToday');
const ErrorStackParser = require('error-stack-parser');
const urlPublicaBucket = require('../../../infrastructure/gateways/Bucket/helpers/urlPublica');
const {
    confiDoisFatores, applicationName, historico,
    statusAplication, statusApp, eventoAuditoria,
    statusSignatario, status_perfil_usuario,
    etapas_perfil_usuario, alertaUsuario,
    tipo_termo_responsabilidade, buckets, roles
} = require('../../../certs/index');
const SessionSave = require('../../../infrastructure/gateways/helpers/SessionSave/index.js');
const authenticator = require('otplib');
const GetUserUsecase = require('../Usuario/getUsuario');
const moment = require('moment');
const knex = require('../../../infrastructure/db/config/databaseConection')();
const bucketGateway = require('../../../infrastructure/gateways/Bucket/index.js');
const LedgerBiometriaPerfil = require('../../../infrastructure/gateways/helpers/AuditoriaAlteracao/LadgerPerfilBiometria');
const LedgerDesafioAutenticacao = require('../../../infrastructure/gateways/helpers/AuditoriaAlteracao/LadgerDesafioAutenticacao');
const LedgerPerfilUsuario = require('../../../infrastructure/gateways/helpers/AuditoriaAlteracao/LadgerPerfilUsuario');
const Alerta = require('../../../infrastructure/gateways/helpers/Alerta');
const { SHA } = require('../../../infrastructure/gateways/crypt/sha');
const FaceMatch = require('../../../infrastructure/gateways/FaceMatch/index.js');



class updatePerfilBiometriaUseCase {

    async solicitacaoAprovacaoBiometria(data) {
        try {
            const sha = new SHA(process.env.SHA);
            const checkAprovador = await GetUserUsecase.getById({ id: data.user_id });
            if (!checkAprovador.status) return { status: false, msg: "Erro interno, tente novamente em instantes. Usuário 404" }
            // Único admin solicitando OTP pra aprovar a própria biometria: mesma trava do confirmar.
            if (data.user_id === data.usuario_id) {
                if (checkAprovador.user.role !== roles.admin) return { status: false, msg: "Não é possível aprovar a própria biometria." }
                const checkAdmins = await GetUserUsecase.getAllAdmin();
                if (!checkAdmins.status) return { status: false, msg: "Erro interno, tente novamente em instantes." }
                if (checkAdmins.data.length !== 1) return { status: false, msg: "Não é possível aprovar a própria biometria." }
                if (checkAdmins.data[0].id !== data.user_id) return { status: false, msg: "Não é possível aprovar a própria biometria." }
            }
            const checkUsuario = await GetUserUsecase.getById({ id: data.usuario_id });
            if (!checkUsuario.status) return { status: false, msg: "Erro interno, tente novamente em instantes. Usuário 404" }
            const checkPerfil = await repositoryPerfil.getPerfilUsuarioByUserId({ user_id: data.usuario_id })
            if (!checkPerfil.status) return { status: false, msg: "Erro interno, tente novamente em instantes." }
            if (!checkPerfil.exit) return { status: false, msg: "Perfil de usuário  não cadastrado." }
            if (checkPerfil.data.status === status_perfil_usuario.aprovado) return { status: false, msg: "Perfil de usuario já cadastro e aprovado." }
            if (checkPerfil.data.etapa !== etapas_perfil_usuario.facial) return { status: false, msg: "Perfil de usuário não cadastrado para reconhecimento facial." }
            const checkBiometria = await repository.getPerfilBiometriaByPerfilId({ perfil_id: checkPerfil.data.id });
            if (!checkBiometria.status) return { status: false, msg: "Erro interno, tente novamente em instantes." }
            if (!checkBiometria.exit) return { status: false, msg: "Perfil de usuário não cadastrado para reconhecimento facial." }
            if (checkBiometria.data.aprovado_por) return { status: false, msg: "Perfil biométrico já aprovado." }
            const encryptAgent = sha.encrypt(data.userAgent);
            const desafio = new domainDesafio({ ...data, tipo_desafio: confiDoisFatores.desafio.resposta_solicitacao_perfil_biometria, solicitacao_user_agent_hash: encryptAgent });
            // Código de aprovação é do 2FA de quem está aprovando (sessão), não do usuário avaliado.
            const plainSecret = sha.decrypt(checkAprovador.user.codigo_hash);
            const authCode = await authenticator.generate({ secret: plainSecret, epochTolerance: 60 });
            if (statusApp.dev === statusAplication.status) {
                console.log(authCode)
            }
            desafio.desafio_hash = sha.hash(authCode);
            const checkTermo = await repositoryTermo.getTermoResponsabilidadeByTipo({ tipo_termo: tipo_termo_responsabilidade.termo_concetimento_foto });
            if (!checkTermo.status) return { status: false, msg: "Erro interno, tente novamente em instantes." }
            if (!checkTermo.exit) return { status: false, msg: "Termo de responsabilidade não cadastrado." }
            const trx = await knex.transaction();
            try {
                const response = await repositoryDesafio.createDesafio({ desafio: desafio.getDesafioAutenticacao() }, trx);
                if (!response.status) throw new Error(response.msg);
                const auditoriaDesafio = new LedgerDesafioAutenticacao(trx);
                await auditoriaDesafio.GravarAuditoriaCriacao({
                    desafio: desafio.getDesafioAutenticacao(),
                    tipo_evento: eventoAuditoria.desafio_criado.label,
                    sequencia: eventoAuditoria.desafio_criado.sequencia,
                    meta_data: { tipo_desafio: confiDoisFatores.desafio.resposta_solicitacao_perfil_biometria, sessao_id: data.sessao_id },
                    user_id: data.user_id,
                });
                await trx.commit();
                return {
                    status: true,
                    object: desafio,
                    msg: 'Desafio criado. Confirme o código de autenticação para prosseguir com o cadastro do perfil biométrico.',
                };
            } catch (error) {
                await trx.rollback();
                if (error?.name === 'ErrorLedgerDesafioAutenticacao') {
                    console.log(error);
                    return { status: false, msg: 'Ocorreu um erro interno de auditoria, tente novamente em instantes.' }
                }
                return { status: false, msg: error.message || 'Erro ao gerar desafio de perfil.' }
            }
        } catch (err) {
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(err);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            logExeption({ descricaoDoErro: 'Exeption estourada. use case PerfilBiometria - createPerfilBiometriaUseCase - indexPerfilBiometria', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            return { status: false, msg: 'Erro interno do servidor, log gerado' }
        }
    }

    async indexPerfilBiometria(data) {
        try {
            const [
                checkAprovador, checkUsuario, checkPerfil, checkDesafio,
                checkDesafioBiometria
            ] = await Promise.all([
                GetUserUsecase.getById({ id: data.user_id }),
                GetUserUsecase.getById({ id: data.usuario_id }),
                repositoryPerfil.getPerfilUsuarioByUserId({ user_id: data.usuario_id }),
                repositoryDesafio.getDesafioAutenticacaoByTipoAndUserIdNaoUsado({ user_id: data.user_id, tipo_desafio: confiDoisFatores.desafio.resposta_solicitacao_perfil_biometria }),
                repositoryDesafio.getDesafioAutenticacaoByTipoAndUserIdUsado({ user_id: data.usuario_id, tipo_desafio: confiDoisFatores.desafio.cadastro_perfil_biometria })
            ]);
            if (checkAprovador.status === false) return { status: false, msg: "Erro interno, tente novamente em instantes." }
            if (checkUsuario.status === false) return { status: false, msg: "Usuário não localizado." }
            if (checkPerfil.status === false) return { status: false, msg: "Erro interno, tente novamente em instantes." }
            const msg = !checkUsuario.exit ? 'Usuário não encontrado.' : !checkPerfil.exit ? 'Perfil de usuário não encontrado.' : 'Desafio de autenticação não encontrado.';
            if (!checkPerfil.exit) return { status: false, msg }
            if (checkPerfil.data.status === status_perfil_usuario.aprovado) return { status: false, msg: "Perfil de usuario já cadastro e aprovado." }
            const checkPerfilBiometria = await repository.getPerfilBiometriaByPerfilId({ perfil_id: checkPerfil.data.id });
            if (!checkPerfilBiometria.status) return { status: false, msg: "Erro interno, tente novamente em instantes." }
            if (!checkPerfilBiometria.exit) return { status: false, msg: "Perfil de usuário não cadastrado para reconhecimento facial." }
            if (checkPerfilBiometria.data.aprovado_por) return { status: false, msg: "Perfil biométrico já aprovado." }
            if (!checkDesafio.status) return { status: false, msg: "Erro interno, tente novamente em instantes." }
            if (!checkDesafio.exit) return { status: false, msg: "Desafio de autenticação não encontrado." }
            if (!checkDesafioBiometria.status) return { status: false, msg: "Erro interno, tente novamente em instantes." }
            if (!checkDesafioBiometria.exit) return { status: false, msg: "Desafio de autenticação não encontrado." }
            const sha = new SHA(process.env.SHA);
            const hashToken = sha.hash(data.token);
            const desafio = checkDesafio.data;
            const oldDesafio = { ...desafio };
            const perfil = checkPerfil.data;
            const oldPerfil = { ...perfil };
            const aprovador = checkAprovador.user;
            // Único admin confirmando a própria biometria: mesma trava do foto/OTP.
            if (data.user_id === data.usuario_id) {
                if (aprovador.role !== roles.admin) return { status: false, msg: "Não é possível aprovar a própria biometria." }
                const checkAdmins = await GetUserUsecase.getAllAdmin();
                if (!checkAdmins.status) return { status: false, msg: "Erro interno, tente novamente em instantes." }
                if (checkAdmins.data.length !== 1) return { status: false, msg: "Não é possível aprovar a própria biometria." }
                if (checkAdmins.data[0].id !== data.user_id) return { status: false, msg: "Não é possível aprovar a própria biometria." }
            }
            const oldBiometria = { ...checkPerfilBiometria.data };
            const desafioBiometria = checkDesafioBiometria.data;
            const oldDesafioBiometria = { ...desafioBiometria };
            desafioBiometria.deletado = true;
            const biometria = checkPerfilBiometria.data;
            const objects = [];
            if ((statusApp.prod === statusAplication.status) && (hashToken !== desafio.desafio_hash)) return { status: false, msg: "Código inválido" }
            // Código de aprovação é do 2FA de quem está aprovando (sessão), não do usuário avaliado.
            const plainSecret = sha.decrypt(aprovador.codigo_hash);
            const isValid = await authenticator.verify({
                token: data.token, secret: plainSecret, label: `${applicationName}:${aprovador.email}`, issuer: applicationName, epochTolerance: 60
            });
            if (statusApp.prod === statusAplication.status) {
                if (!isValid.valid) return { status: false, msg: "Código de autenticação inválido." }
            }
            const bucket = bucketGateway.Wip();
            if (data.statusAprovacao) {
                const checkArquivo = await bucket.obterArquivoBase64({ objectName: biometria.bucket_wip_path });
                if (!checkArquivo.status) return { status: false, msg: "Ops, estamos passando por um problema interno, tente novamente em instantes." }
                const faceMatchEmbedding = await FaceMatch.vectorize({ image_base64: checkArquivo.data.image_base64 });
                if (!faceMatchEmbedding.status) return { status: false, msg: "Estamos passando por um problema interno, tente novamente em instantes." }
                biometria.bucket_wip_path = null;
                biometria.rosto_embeddign = JSON.stringify(faceMatchEmbedding.data.embedding);
                biometria.data_atualizacao = moment().format('YYYY-MM-DD HH:mm:ss');
                biometria.data_criacao = moment(biometria.data_criacao).format('YYYY-MM-DD HH:mm:ss');
                biometria.aprovado_em = moment().format('YYYY-MM-DD HH:mm:ss');
                biometria.aprovado_por = data.user_id;
                perfil.status = status_perfil_usuario.aprovado;
                perfil.data_atualizacao = moment().format('YYYY-MM-DD HH:mm:ss');
                desafio.usado = true;
                desafio.confirmacao_ip = data.solicitacao_ip;
                desafio.confirmacao_porta_logica = data.solicitacao_porta_logica;
                desafio.confirmacao_user_agent_hash = sha.encrypt(data.userAgent);
                desafio.consumido_em = moment().format('YYYY-MM-DD HH:mm:ss');
                const trx = await knex.transaction();
                try {
                    const response = await repository.atualizarPerfilBiometriaSolicitacao({ perfil, desafio, perfilBiometria: biometria }, trx);
                    if (!response) throw new Error('Erro ao criar perfil biometrico.');
                    const auditoriaPerfil = new LedgerPerfilUsuario(trx);
                    auditoriaPerfil.Initialize(oldPerfil);
                    await auditoriaPerfil.GravarAuditoriaModificacao({
                        perfil: perfil,
                        tipo_evento: eventoAuditoria.perfil_alterado.label,
                        sequencia: eventoAuditoria.perfil_alterado.sequencia,
                        meta_data: { sessao_id: data.sessao_id },
                        user_id: data.user_id,
                    });
                    const auditoriaDesafio = new LedgerDesafioAutenticacao(trx);
                    auditoriaDesafio.Initialize(oldDesafio);
                    await auditoriaDesafio.GravarAuditoriaModificacao({
                        desafio: desafio,
                        tipo_evento: eventoAuditoria.desafio_confirmado.label,
                        sequencia: eventoAuditoria.desafio_confirmado.sequencia,
                        meta_data: { sessao_id: data.sessao_id },
                        user_id: data.user_id,
                    });
                    const auditoriaBiometria = new LedgerBiometriaPerfil(trx);
                    auditoriaBiometria.Initialize(oldBiometria);
                    await auditoriaBiometria.GravarAuditoriaModificacao({
                        biometria: biometria,
                        tipo_evento: eventoAuditoria.perfil_biometria_aprovado.label,
                        sequencia: eventoAuditoria.perfil_biometria_aprovado.sequencia,
                        meta_data: { sessao_id: data.sessao_id },
                        user_id: data.user_id,
                    });
                    const alerta = new Alerta(trx);
                    await alerta.criar({
                        tipo: alertaUsuario.tipos.biometria_aprovada,
                        titulo: "Soolicitaação de biometria aprovada.",
                        mensagem: `Sua solicitação de biometria foi aprovada pelo administrador. Seu perfil está liberado para assinar documentos.`,
                        referencia_tipo: alertaUsuario.referencia.usuario,
                        referencia_id: checkPerfil.data.user_id,
                        user_id: data.usuario_id
                    });
                    alerta.enviarEmails();
                    await trx.commit();
                    return {
                        status: true,
                        object: biometria,
                        msg: 'Solicitação de biometria aceita com sucesso. O usuário foi notificado.',
                    }
                } catch (error) {
                    await trx.rollback();
                    if (error?.name === 'ErrorLedgerDesafioAutenticacao' || error?.name === 'ErrorLedgerPerfilUsuario' || error?.name === 'ErrorLedgerPerfilBiometria') {
                        console.log(error);
                        return { status: false, msg: 'Ocorreu um erro interno de auditoria, tente novamente em instantes.' }
                    }
                    if (statusAplication.dev === statusApp.status) {
                        return { status: false, msg: error.message || 'Erro ao gerar biometria de perfil, tente novamente mais tarde.' }
                    }
                    return { status: false, msg: 'Erro ao gerar biometria de perfil, tente novamente mais tarde.' }
                }
            } else {
                const checkFileBucket = await bucket.obterArquivo({ objectName: biometria.bucket_wip_path });
                if (!checkFileBucket.status && !checkFileBucket.notfound) return { status: false, msg: "Ops, estamos passando por um problema interno, tente novamente em instantes." }
                if (!checkFileBucket.notfound) {
                    const deleteFile = await bucket.remove({ documentoId: biometria.bucket_wip_path });
                    if (!deleteFile.status) return { status: false, msg: deleteFile.msg }
                }
                perfil.etapa = etapas_perfil_usuario.dados;
                perfil.data_criacao = moment(perfil.data_criacao).format('YYYY-MM-DD HH:mm:ss');
                perfil.data_atualizacao = moment().format('YYYY-MM-DD HH:mm:ss');
                biometria.deletado = true;
                biometria.bucket_wip_path = null;
                biometria.data_atualizacao = moment().format('YYYY-MM-DD HH:mm:ss');
                biometria.data_criacao = moment(biometria.data_criacao).format('YYYY-MM-DD HH:mm:ss');
                desafio.usado = true;
                desafio.confirmacao_ip = data.solicitacao_ip;
                desafio.confirmacao_porta_logica = data.solicitacao_porta_logica;
                desafio.confirmacao_user_agent_hash = sha.encrypt(data.userAgent);
                desafio.consumido_em = moment().format('YYYY-MM-DD HH:mm:ss');
                const trx = await knex.transaction();
                try {
                    const response = await repository.atualizarPerfilBiometriaSolicitacao({ perfil, desafio, perfilBiometria: biometria, desafioBiometria }, trx);
                    if (!response) throw new Error('Erro ao criar perfil biometrico.');
                    const auditoriaPerfil = new LedgerPerfilUsuario(trx);
                    auditoriaPerfil.Initialize(oldPerfil);
                    await auditoriaPerfil.GravarAuditoriaModificacao({
                        perfil: perfil,
                        tipo_evento: eventoAuditoria.perfil_alterado.label,
                        sequencia: eventoAuditoria.perfil_alterado.sequencia,
                        meta_data: { sessao_id: data.sessao_id },
                        user_id: data.user_id,
                    });
                    const auditoriaDesafio = new LedgerDesafioAutenticacao(trx);
                    auditoriaDesafio.Initialize(oldDesafio);
                    await auditoriaDesafio.GravarAuditoriaModificacao({
                        desafio: desafio,
                        tipo_evento: eventoAuditoria.desafio_confirmado.label,
                        sequencia: eventoAuditoria.desafio_confirmado.sequencia,
                        meta_data: { sessao_id: data.sessao_id },
                        user_id: data.user_id,
                    });
                    const auditoriaDesafioBiometria = new LedgerDesafioAutenticacao(trx);
                    auditoriaDesafioBiometria.Initialize(oldDesafioBiometria);
                    await auditoriaDesafioBiometria.GravarAuditoriaModificacao({
                        desafio: desafioBiometria,
                        tipo_evento: eventoAuditoria.desafio_atualizado.label,
                        sequencia: eventoAuditoria.desafio_atualizado.sequencia,
                        meta_data: { sessao_id: data.sessao_id },
                        user_id: data.user_id,
                    });
                    const auditoriaBiometria = new LedgerBiometriaPerfil(trx);
                    auditoriaBiometria.Initialize(oldBiometria);
                    await auditoriaBiometria.GravarAuditoriaModificacao({
                        biometria: biometria,
                        tipo_evento: eventoAuditoria.perfil_biometria_negadoo.label,
                        sequencia: eventoAuditoria.perfil_biometria_negadoo.sequencia,
                        meta_data: { sessao_id: data.sessao_id },
                        user_id: data.user_id,
                    });
                    const alerta = new Alerta(trx);
                    await alerta.criar({
                        tipo: alertaUsuario.tipos.biometria_negada,
                        titulo: "Soolicitaação de biometria negada.",
                        mensagem: `Sua solicitação de biometria foi negada pelo administrador, refaça o processo novamente.`,
                        referencia_tipo: alertaUsuario.referencia.usuario,
                        referencia_id: checkPerfil.data.user_id,
                        user_id: data.usuario_id
                    });
                    alerta.enviarEmails();
                    await trx.commit();
                    return {
                        status: true,
                        object: biometria,
                        msg: 'Solicitação de biometria negada com sucesso. O usuário foi notificado.',
                    }
                } catch (error) {
                    await trx.rollback();
                    if (error?.name === 'ErrorLedgerDesafioAutenticacao' || error?.name === 'ErrorLedgerPerfilUsuario' || error?.name === 'ErrorLedgerPerfilBiometria') {
                        console.log(error);
                        return { status: false, msg: 'Ocorreu um erro interno de auditoria, tente novamente em instantes.' }
                    }
                    if (statusAplication.dev === statusApp.status) {
                        return { status: false, msg: error.message || 'Erro ao gerar biometria de perfil, tente novamente mais tarde.' }
                    }
                    return { status: false, msg: 'Erro ao gerar biometria de perfil, tente novamente mais tarde.' }
                }
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
            logExeption({ descricaoDoErro: 'Exeption estourada. use case PerfilBiometria - createPerfilBiometriaUseCase - indexPerfilBiometria', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            return { status: false, msg: 'Erro interno do servidor, log gerado' }
        }
    }



}

module.exports = new updatePerfilBiometriaUseCase();

