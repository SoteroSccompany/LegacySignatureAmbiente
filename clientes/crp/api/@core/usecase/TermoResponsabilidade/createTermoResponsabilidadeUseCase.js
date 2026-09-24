
const knex = require('../../../infrastructure/db/config/databaseConection')();
const repository = require('../../../infrastructure/db/services/TermoResponsabilidadeRepository');
const domain = require('../../domain/TermoResponsabilidade');
const domainAceite = require('../../domain/AceiteTermoResponsabilidade');
const domainDesafio = require('../../domain/DesafioAutenticacao');
const logExeption = require('../Logs/exeption/exeptionTermoResponsabilidade');
const dateNow = require('../../../infrastructure/gateways/functions/data/getToday');
const ErrorStackParser = require('error-stack-parser');
const repositoryUser = require('../../../infrastructure/db/services/UsuarioRepositorio');
const reposirotyDesafio = require('../../../infrastructure/db/services/DesafioAutenticacaoRepository');
const reposirotyLogin = require('../../../infrastructure/db/services/LoginRepositorio');
const authenticator = require('otplib');
const { SHA } = require('../../../infrastructure/gateways/crypt/sha');
const { roles, confiDoisFatores, eventoAuditoria, objetoAuditoria, statusAplication, statusApp, applicationName, tipo_termo_responsabilidade } = require('../../../certs')
const LedgerDesafioAutenticacao = require('../../../infrastructure/gateways/helpers/AuditoriaAlteracao/LadgerDesafioAutenticacao');
const LedgerTermoResponsabilidade = require('../../../infrastructure/gateways/helpers/AuditoriaAlteracao/LadgerTermoResponsabilidade');
const LedgerAceiteTermoResponsabilidade = require('../../../infrastructure/gateways/helpers/AuditoriaAlteracao/LadgerAceiteTermoResponsabilidade');
const LedgerDocumentoPdf = require('../../../infrastructure/gateways/helpers/AuditoriaAlteracao/LadgerDocumentoPdf');
const repositoryDesafio = require('../../../infrastructure/db/services/DesafioAutenticacaoRepository');
const moment = require('moment')

class createTermoResponsabilidadeUseCase {

    async solicitacaoTermoResponsabilidade(data) {
        try {
            const checkUser = await repositoryUser.getById({ id: data.user_id })
            if (!checkUser.status) return { status: false, msg: "Erro interno, tente novamente em instantes" }
            if (!checkUser.exit) return { status: false, msg: "Usuário não encontrado" }
            const user = checkUser.data[0];
            if (user.role !== roles.admin) return { status: false, msg: "Acesso negado. Apenas administradores podem solicitar termo de responsabilidade." }
            const sha = new SHA();
            const plainSecrete = await sha.decrypt(user.codigo_hash)
            const code = await authenticator.generate({ secret: plainSecrete, epochTolerance: 60 })
            const encryptAgent = sha.encrypt(data.userAgent);
            const desafio = new domainDesafio({ ...data, tipo_desafio: confiDoisFatores.desafio.cadastro_termo_responsabilidade, solicitacao_user_agent_hash: encryptAgent });
            if (statusAplication.status === statusApp.dev) {
                console.log(code);
            }
            desafio.desafio_hash = await sha.encrypt(code)
            const trx = await knex.transaction();
            try {
                const response = await repositoryDesafio.createDesafio({ desafio: desafio.getDesafioAutenticacao() }, trx);
                if (!response.status) throw new Error(response.msg);
                const auditoriaDesafio = new LedgerDesafioAutenticacao(trx);
                await auditoriaDesafio.GravarAuditoriaCriacao({
                    desafio: desafio.getDesafioAutenticacao(),
                    tipo_evento: eventoAuditoria.desafio_criado.label,
                    sequencia: eventoAuditoria.desafio_criado.sequencia,
                    meta_data: { tipo_desafio: confiDoisFatores.desafio.cadastro_termo_responsabilidade, sessao_id: data.sessao_id },
                    user_id: data.user_id,
                });
                await trx.commit();
                return {
                    status: response.status,
                    object: desafio,
                    msg: response.status === false ? response.msg : 'Desafio de termo de responsabilidade criado com sucesso!'
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
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(err);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            logExeption({ descricaoDoErro: 'Exeption estourada. use case TermoResponsabilidade - createTermoResponsabilidadeUseCase - indexTermoResponsabilidade', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            return { status: false, msg: 'Erro interno do servidor, log gerado' }
        }
    }

    async indexTermoResponsabilidade(data) {
        try {
            const sha = new SHA(process.env.SHA);
            const checkRequest = await repositoryDesafio.getDesafioAutenticacaoByTipoAndUserIdNaoUsado({ sessao_id: data.sessao_id, user_id: data.request_user.user_id, tipo_desafio: confiDoisFatores.desafio.cadastro_termo_responsabilidade })
            if (!checkRequest.status) return { status: false, msg: "Ocorreu um erro interno, tente novamente em instantes." }
            if (!checkRequest.exit) return { status: false, msg: "Não foi possível validar a solicitação, tente novamente em instantes." }
            const checkUser = await repositoryUser.getById({ id: data.request_user.user_id });
            if (!checkUser.status) return { status: false, msg: "Erro interno, tente novamente em instantes." }
            if (!checkUser.exit) return { status: false, msg: "Usuário não localizado." }
            const desafio = checkRequest.data;
            const user = checkUser.data[0]
            const hashToken = sha.hash(data.token)
            const oldDesafio = { ...checkRequest.data };
            if ((statusApp.prod === statusAplication.status) && (hashToken !== desafio.desafio_hash)) return { status: false, msg: "Código inválido" }
            const plainSecret = sha.decrypt(user.codigo_hash);
            const isValid = await authenticator.verify({
                token: data.token, secret: plainSecret, label: `${applicationName}:${user.email}`, issuer: applicationName, epochTolerance: 60
            });
            if (!isValid.valid) return { status: false, msg: "Código de autenticação inválido." }
            const encryptAgent = sha.encrypt(data.request_user.userAgent);
            desafio.confirmacao_ip = data.request_user.solicitacao_ip;
            desafio.criado_em = moment(desafio.criado_em).format('YYYY-MM-DD HH:mm:ss');
            desafio.expira_em = moment(desafio.expira_em).format('YYYY-MM-DD HH:mm:ss');
            desafio.confirmacao_porta_logica = data.request_user.solicitacao_porta_logica;
            desafio.confirmacao_user_agent_hash = encryptAgent;
            desafio.usado = true;
            desafio.consumido_em = dateNow();
            const termo = new domain({ ...data, data_criacao: dateNow(), desafio_id: desafio.id })
            termo.descricao_termo = sha.encrypt(data.descricao_termo);
            if (termo.tipo_termo === tipo_termo_responsabilidade.termo_concetimento_foto) {
                const checkHaveTermoFoto = await repository.getTermoResponsabilidadeByTipo({ tipo_termo: tipo_termo_responsabilidade.termo_concetimento_foto })
                if (!checkHaveTermoFoto.status) return { status: false, msg: "Erro interno, tente novamente em instantes." }
                if (checkHaveTermoFoto.exit) return { status: false, msg: "Já existe um termo de consentimento de foto cadastrado. Não é possível cadastrar mais de um termo." }
            }
            const trx = await knex.transaction();
            try {
                const response = await repository.createTermoResponsabilidadeUpdateDesafio({ desafio, termo }, trx);
                if (!response.status) throw new Error(response.msg || "Erro ao validar perfil de usuário.");
                const auditoriaDesafio = new LedgerDesafioAutenticacao(trx);
                auditoriaDesafio.Initialize(oldDesafio);
                await auditoriaDesafio.GravarAuditoriaModificacao({
                    desafio,
                    tipo_evento: eventoAuditoria.desafio_confirmado.label,
                    sequencia: eventoAuditoria.desafio_confirmado.sequencia,
                    meta_data: { tipo_desafio: confiDoisFatores.desafio.cadastro_termo_responsabilidade, user_id: data.request_user.user_id },
                    user_id: data.user_id,
                });
                const auditoriaTermoResponsabilidade = new LedgerTermoResponsabilidade(trx);
                await auditoriaTermoResponsabilidade.GravarAuditoriaCriacao({
                    termo,
                    tipo_evento: eventoAuditoria.termo_responsabilidade_criado.label,
                    sequencia: eventoAuditoria.termo_responsabilidade_criado.sequencia,
                    meta_data: { desafio_id: desafio.id },
                    user_id: data.request_user.user_id,
                });
                await trx.commit();
                return {
                    status: true,
                    object: termo.getTermoResponsabilidade ? termo.getTermoResponsabilidade() : termo,
                    msg: response.msg
                }
            } catch (error) {
                console.log(error)
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
            logExeption({ descricaoDoErro: 'Exeption estourada. use case TermoResponsabilidade - createTermoResponsabilidadeUseCase - indexTermoResponsabilidade', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            return { status: false, msg: 'Erro interno do servidor, log gerado' }
        }
    }

    async indexTermoResponsabilidadeAceiteCadastroImagem(data) {
        try {
            const sha = new SHA(process.env.SHA);
            // Branch pela presença do documento (fluxo de assinatura), não pelo tipo do termo —
            // evita ter que carregar o termo só para descobrir o tipo antes de decidir o fluxo.
            let documento = null;
            let signatario = null;
            let termoId = data.termo_id;
            if (data.documento_id) {
                documento = await knex('tab_documentos').select('*').where('id', data.documento_id).first();
                if (!documento) return { status: false, msg: "Ocorreu um erro interno, tente novamente em instantes." }
                termoId = documento.termo_id;
                signatario = await knex('tab_signatarios').select('*').where('documento_id', documento.id).andWhere('user_id', data.request_user.user_id).andWhere('deletado', false).first();
                if (!signatario) return { status: false, msg: "Ocorreu um erro interno, tente novamente em instantes." }
            }
            const [checkUser, checkTermo, checkUserAceiteTermoResponsabilidade, checkLoginUser] = await Promise.all([
                repositoryUser.getById({ id: data.request_user.user_id }),
                repository.getTermoResponsabilidadeById({ id: termoId }),
                documento
                    ? repository.getTermoResponsabilidadeAceiteByUserIdTermoIdAndDocumentoId({ user_id: data.request_user.user_id, termo_id: termoId, documento_id: documento.id })
                    : repository.getTermoResponsabilidadeAceiteByUserIdAndTermoId({ user_id: data.request_user.user_id, termo_id: termoId }),
                reposirotyLogin.getLoginByUserId({ id: data.request_user.user_id })
            ]);
            if (!checkUserAceiteTermoResponsabilidade.status) return { status: false, msg: "Erro interno, tente novamente em instantes." }
            if (checkUserAceiteTermoResponsabilidade.exit) return { status: false, msg: documento ? "Você já aceitou este termo de responsabilidade para este documento." : "Você já aceitou este termo de responsabilidade." }
            if (!checkLoginUser.status) return { status: false, msg: "Ocorreu um erro interno, tente novamente em instantes." }
            if (!checkLoginUser.exit) return { status: false, msg: "Login não localizado, realize autenticação novamente!" }
            if (!checkUser.status) return { status: false, msg: "Erro interno, tente novamente em instantes." }
            if (!checkUser.exit) return { status: false, msg: "Usuário não localizado." }
            if (!checkTermo.status) return { status: false, msg: "Erro interno, tente novamente em instantes." }
            if (!checkTermo.exit) return { status: false, msg: "Termo de responsabilidade não localizado." }
            if (checkTermo.data.ativo !== 1 && checkTermo.data.ativo !== true) return { status: false, msg: "Termo de responsabilidade não está ativo." }
            const termoDescricao = await sha.decrypt(checkTermo.data.descricao_termo)
            const termoHash = await sha.hash(termoDescricao)
            const aceite = new domainAceite({
                termo_id: termoId,
                user_id: data.request_user.user_id,
                login_id: checkLoginUser.data.id,
                termo_hash: termoHash,
                aceito_em: data.aceito_em,
                documento_id: documento ? documento.id : null,
                signatario_id: signatario ? signatario.id : null,
                data_criacao: dateNow()
            });
            const trx = await knex.transaction();
            try {
                const response = await repository.createTermoResponsabilidadeAceite(aceite, trx);
                if (!response.status) throw new Error(response.msg || "Erro ao criar o aceite do termo de responsabilidade.");
                // Aceite de documento (cerimônia de assinatura) e aceite de foto (onboarding
                // biométrico) são eventos distintos — não gravar sempre como aceite de foto.
                const eventoAceite = documento
                    ? eventoAuditoria.aceite_termo_responsabilidade_criado
                    : eventoAuditoria.aceite_termo_responsabilidade_foto;
                const auditoriaTermoResponsabilidade = new LedgerAceiteTermoResponsabilidade(trx);
                await auditoriaTermoResponsabilidade.GravarAuditoriaCriacao({
                    aceite,
                    tipo_evento: eventoAceite.label,
                    sequencia: eventoAceite.sequencia,
                    meta_data: documento
                        ? { ...data.request_user, tipo_termo: checkTermo.data.tipo_termo, documento_id: documento.id, signatario_id: signatario.id }
                        : { ...data.request_user, tipo_termo: checkTermo.data.tipo_termo },
                    user_id: data.request_user.user_id,
                });
                // Documento presente = cerimônia de assinatura: o elo ACEITE_TERMO_REGISTRADO na
                // cadeia do documento é sempre gravado aqui, nunca mais pulado silenciosamente.
                if (documento) {
                    const solicitacaoVinculo = await trx('tab_solicitacao_documento').select('id').where('documento_id', documento.id).first();
                    if (!solicitacaoVinculo) throw new Error('Ocorreu um erro interno, tente novamente em instantes.');
                    const ultimoElo = await trx('tab_auditoria_ledger')
                        .where(function () { this.where('documento_id', documento.id).orWhere('solicitacao_id', solicitacaoVinculo.id) })
                        .where('deletado', false)
                        .orderBy('sequencia', 'desc')
                        .first();
                    const sequenciaElo = ultimoElo ? Number(ultimoElo.sequencia) + 1 : eventoAuditoria.aceite_termo_registrado.sequencia;
                    const hashDocumento = (ultimoElo && ultimoElo.hash_documento_final) || documento.hash_original;
                    await new LedgerDocumentoPdf(trx).GravarEvento({
                        solicitacao_id: solicitacaoVinculo.id,
                        documento_id: documento.id,
                        objeto_tipo: objetoAuditoria.aceite_termo,
                        objeto_id: aceite.id,
                        objeto: aceite.getAceiteTermoResponsabilidade(),
                        objeto_anterior: null,
                        desafio_acesso_id: null,
                        tipo_evento: eventoAuditoria.aceite_termo_registrado.label,
                        sequencia: sequenciaElo,
                        meta_data: { termo_id: termoId, tipo_termo: checkTermo.data.tipo_termo, signatario_id: signatario.id, documento_id: documento.id },
                        hash_documento_inicial: hashDocumento,
                        hash_documento_final: hashDocumento,
                        hash_registro_anterior: ultimoElo ? ultimoElo.hash_atual : null,
                        user_id: data.request_user.user_id,
                    });
                }
                await trx.commit();
                return {
                    status: true,
                    object: aceite,
                    msg: response.msg
                }
            } catch (error) {
                console.log(error)
                await trx.rollback();
                if (
                    error?.name === 'ErrorLedgerDesafioAutenticacao'
                    || error?.name === 'ErrorLedgerPerfilUsuario'
                    || error?.name === 'ErrorLedgerSignatario'
                    || error?.name === 'ErrorLedgerUsuarioStaging'
                    || error?.name === 'ErrorLedgerAceiteTermoResponsabilidade'
                    || error?.name === 'ErrorLedgerDocumentoPdf'
                ) {
                    console.log(error);
                    return { status: false, msg: 'Ocorreu um erro interno de auditoria, tente novamente em instantes.' }
                }
                return { status: false, msg: "Ocorreu um erro interno, tente novamente em instantes." }
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
            logExeption({ descricaoDoErro: 'Exeption estourada. use case TermoResponsabilidade - createTermoResponsabilidadeUseCase - indexTermoResponsabilidade', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            return { status: false, msg: 'Erro interno do servidor, log gerado' }
        }
    }



}

module.exports = new createTermoResponsabilidadeUseCase();

