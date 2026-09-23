
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
    tipo_termo_responsabilidade, buckets
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



class createPerfilBiometriaUseCase {

    async solicitacaoPerfilBiometria(data, session) {
        try {
            const sha = new SHA(process.env.SHA);
            const checkUsuario = await GetUserUsecase.getById({ id: data.user_id });
            if (!checkUsuario.status) return { status: false, msg: "Erro interno, tente novamente em instantes. Usuário 404" }
            const checkPerfil = await repositoryPerfil.getPerfilUsuarioByUserId({ user_id: data.user_id })
            if (!checkPerfil.status) return { status: false, msg: "Erro interno, tente novamente em instantes." }
            if (!checkPerfil.exit) return { status: false, msg: "Perfil de usuário  não cadastrado." }
            if (checkPerfil.data.status === status_perfil_usuario.aprovado) return { status: false, msg: "Perfil de já cadastro e aprovado." }
            if (checkPerfil.data.etapa === etapas_perfil_usuario.facial) return { status: false, msg: "Perfil de usuário já cadastrado e registrado o reconhecimento facial." }
            const checkDesafio = await repositoryDesafio.getDesafioAutenticacaoByTipoAndUserIdUsado({ user_id: checkPerfil.data.user_id, tipo_desafio: confiDoisFatores.desafio.cadastro_perfil_biometria });
            if (!checkDesafio.status) return { status: false, msg: "Erro interno, tente novamente em instantes." }
            if (checkDesafio.exit) return { status: false, msg: "Perfil de usuário já cadastrado e registrado o reconhecimento facial." }
            const checkBiometria = await repository.getPerfilBiometriaByPerfilId({ perfil_id: checkPerfil.data.id });
            if (!checkBiometria.status) return { status: false, msg: "Erro interno, tente novamente em instantes." }
            if (checkBiometria.exit) return { status: false, msg: "Perfil de usuário já cadastrado e registrado o reconhecimento facial." }
            const encryptAgent = sha.encrypt(data.userAgent);
            const desafio = new domainDesafio({ ...data, tipo_desafio: confiDoisFatores.desafio.cadastro_perfil_biometria, solicitacao_user_agent_hash: encryptAgent });
            const checkTermo = await repositoryTermo.getTermoResponsabilidadeByTipo({ tipo_termo: tipo_termo_responsabilidade.termo_concetimento_foto });
            if (!checkTermo.status) return { status: false, msg: "Erro interno, tente novamente em instantes." }
            if (!checkTermo.exit) return { status: false, msg: "Termo de responsabilidade não cadastrado." }
            const checkAceite = await repositoryAceiteTermo.getAceiteTermoResponsabilidadeByUserIdAndTermoId({ user_id: data.user_id, termo_id: checkTermo.data.id });
            if (!checkAceite.status) return { status: false, msg: "Erro interno, tente novamente em instantes." }
            if (!checkAceite.exit) return { status: false, msg: "Termo de responsabilidade não aceito pelo usuário." }
            const plainSecret = sha.decrypt(checkUsuario.user.codigo_hash);
            const authCode = await authenticator.generate({ secret: plainSecret, epochTolerance: 120 });
            if (statusApp.dev === statusAplication.status) {
                console.log(authCode)
            }
            desafio.desafio_hash = sha.hash(authCode);
            const bucket = bucketGateway.Wip();
            const objectName = bucket.applyRootPrefix(`${buckets.aplicationName}/${buckets.pastas.perfil_biometria}/${checkPerfil.data.id}/${desafio.id}/rosto`);
            const url = await bucket.urlUploadPut({
                documentoId: objectName,
                expiresInSeconds: buckets.temp_url_expiration,
            });
            if (!url.status) return { status: false, msg: 'Ocorreu um erro interno, tente novamente em instantes.' };
            const trx = await knex.transaction();
            try {
                const response = await repositoryDesafio.createDesafio({ desafio: desafio.getDesafioAutenticacao() }, trx);
                if (!response.status) throw new Error(response.msg);
                const auditoriaDesafio = new LedgerDesafioAutenticacao(trx);
                await auditoriaDesafio.GravarAuditoriaCriacao({
                    desafio: desafio.getDesafioAutenticacao(),
                    tipo_evento: eventoAuditoria.desafio_criado.label,
                    sequencia: eventoAuditoria.desafio_criado.sequencia,
                    meta_data: { tipo_desafio: confiDoisFatores.desafio.cadastro_perfil_biometria, sessao_id: data.sessao_id },
                    user_id: data.user_id,
                });
                session.biometria = { foto: objectName, desafio_id: desafio.id };
                const saveSession = await SessionSave.exec(session);
                if (!saveSession) {
                    await trx.rollback();
                    return { status: false, msg: 'Ocorreu um erro interno, tente novamente em instantes.' };
                }
                await trx.commit();
                return {
                    status: true,
                    object: desafio,
                    msg: 'Desafio criado. Envie a foto e confirme o código.',
                    data: {
                        object_name: objectName,
                        url: urlPublicaBucket(url.data.url),
                        method: url.data.method || 'PUT',
                        expiresInSeconds: url.data.expiresInSeconds,
                        allowed_content_types: ['image/jpeg', 'image/png', 'image/webp'],
                        headers: {},
                    },
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

    async indexPerfilBiometria(data) {
        try {
            const [
                checkUsuario, checkPerfil, checkDesafio, checkAdmins
            ] = await Promise.all([
                GetUserUsecase.getById({ id: data.user_id }),
                repositoryPerfil.getPerfilUsuarioByUserId({ user_id: data.user_id }),
                repositoryDesafio.getDesafioAutenticacaoById({ id: data.biometria.desafio_id }),
                GetUserUsecase.getAllAdmin()
            ]);
            if (checkUsuario.status === false) return { status: false, msg: "Usuário não localizado." }
            if (checkPerfil.status === false || checkDesafio.status === false) return { status: false, msg: "Erro interno, tente novamente em instantes." }
            const msg = !checkUsuario.exit ? 'Usuário não encontrado.' : !checkPerfil.exit ? 'Perfil de usuário não encontrado.' : 'Desafio de autenticação não encontrado.';
            if (!checkPerfil.exit || !checkDesafio.exit) return { status: false, msg }
            if (!checkAdmins.status) return { status: false, msg: "Erro interno, tente novamente em instantes." };
            const checkTermo = await repositoryTermo.getTermoResponsabilidadeByTipo({ tipo_termo: tipo_termo_responsabilidade.termo_concetimento_foto });
            if (!checkTermo.status) return { status: false, msg: "Erro interno, tente novamente em instantes." }
            if (!checkTermo.exit) return { status: false, msg: "Termo de responsabilidade não cadastrado." }
            const checkAceite = await repositoryAceiteTermo.getAceiteTermoResponsabilidadeByUserIdAndTermoId({ user_id: data.user_id, termo_id: checkTermo.data.id });
            if (!checkAceite.status) return { status: false, msg: "Erro interno, tente novamente em instantes." }
            if (!checkAceite.exit) return { status: false, msg: "Termo de responsabilidade não aceito pelo usuário." }
            const sha = new SHA(process.env.SHA);
            const hashToken = sha.hash(data.token);
            const desafio = checkDesafio.data;
            const oldDesafio = { ...desafio };
            const perfil = checkPerfil.data;
            const oldPerfil = { ...perfil };
            const user = checkUsuario.user;
            const admins = checkAdmins.data;
            const objects = [];
            if ((statusApp.prod === statusAplication.status) && (hashToken !== desafio.desafio_hash)) return { status: false, msg: "Código inválido" }
            const plainSecret = sha.decrypt(user.codigo_hash);
            const isValid = await authenticator.verify({
                token: data.token, secret: plainSecret, label: `${applicationName}:${user.email}`, issuer: applicationName
            });
            if (statusApp.prod === statusAplication.status) {
                if (!isValid.valid) return { status: false, msg: "Código de autenticação inválido." }
            }
            const bucket = bucketGateway.Wip();
            const checkImagem = await bucket.validarImagem({ objectName: data.biometria.foto });
            if (!checkImagem.status) return { status: false, msg: checkImagem.msg }
            const checkArquivo = await bucket.obterArquivoBase64({ objectName: data.biometria.foto });
            if (!checkArquivo.status) return { status: false, msg: 'Ops, estamos passando por um problema interno, tente novamente em instantes.' }
            const faceMatchEmbedding = await FaceMatch.vectorize({ image_base64: checkArquivo.data.image_base64 });
            if (!faceMatchEmbedding.status) return { status: false, msg: 'Estamos passando por um problema interno, tente novamente em instantes.' }
            perfil.etapa = etapas_perfil_usuario.facial;
            perfil.data_criacao = moment(perfil.data_criacao).format('YYYY-MM-DD HH:mm:ss');
            perfil.data_atualizacao = moment().format('YYYY-MM-DD HH:mm:ss');
            desafio.usado = true;
            desafio.confirmacao_ip = data.solicitacao_ip;
            desafio.confirmacao_porta_logica = data.solicitacao_porta_logica;
            desafio.confirmacao_user_agent_hash = sha.encrypt(data.userAgent);
            desafio.consumido_em = moment().format('YYYY-MM-DD HH:mm:ss');
            const perfilBiometria = new domain({
                bucket_wip_path: data.biometria.foto,
                rosto_embeddign: JSON.stringify(faceMatchEmbedding.data.embedding),
                perfil_id: perfil.id,
                desafio_id: desafio.id,
                termo_id: checkAceite.data.id,
                data_criacao: moment().format('YYYY-MM-DD HH:mm:ss')
            });
            objects.push({ oldObject: null, object: perfilBiometria.getPerfilBiometria() });
            const trx = await knex.transaction();
            try {
                const response = await repository.createPerfilBiometria({ perfil, desafio, perfilBiometria: perfilBiometria.getPerfilBiometria() }, trx);
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
                await auditoriaBiometria.GravarAuditoriaCriacao({
                    biometria: perfilBiometria.getPerfilBiometria(),
                    tipo_evento: eventoAuditoria.perfil_biometria_criado.label,
                    sequencia: eventoAuditoria.perfil_biometria_criado.sequencia,
                    meta_data: { sessao_id: data.sessao_id },
                    user_id: data.user_id,
                });
                const alerta = new Alerta(trx);
                await alerta.criar({
                    tipo: alertaUsuario.tipos.pendente_aprovacao_perfil_biometria,
                    titulo: "Solicitação de aprovação de perfil biométrico",
                    mensagem: `O usuário ${checkPerfil.data.nome} solicitou a aprovação do seu perfil biométrico. Acesse o painel administrativo para aprovar ou rejeitar.`,
                    referencia_tipo: alertaUsuario.referencia.usuario,
                    referencia_id: checkPerfil.data.user_id,
                    user_ids: admins.map(admin => { return { id: admin.id, email: admin.email } })
                });
                await trx.commit();
                alerta.enviarEmails();
                return {
                    status: true,
                    object: perfilBiometria,
                    msg: 'Perfil biometrico cadastrado com sucesso. Aguarde a validação do administrador.'
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

module.exports = new createPerfilBiometriaUseCase();

