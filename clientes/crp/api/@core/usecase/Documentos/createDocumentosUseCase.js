
const repository = require('../../../infrastructure/db/services/DocumentosRepository');
const domain = require('../../domain/Documentos');
const domainLedger = require('../../domain/AuditoriaLedger');
const domainSolicitacao = require('../../domain/SolicitacaoDocumento');
const domainAuditoriaLedgerSolicitacao = require('../../domain/AuditoriaLedgerSolicitacao');
const domainHistorico = require('../../domain/Historico');
const logExeption = require('../Logs/exeption/exeptionDocumentos');
const dateNow = require('../../../infrastructure/gateways/functions/data/getToday');
const ErrorStackParser = require('error-stack-parser');
const repositorioDesafio = require('../../../infrastructure/db/services/DesafioAutenticacaoRepository');
const repositorioSolicitacao = require('../../../infrastructure/db/services/SolicitacaoDocumentoRepository');
const repositorioLogin = require('../../../infrastructure/db/services/LoginRepositorio');
const { confiDoisFatores, buckets, rabbitMQ, statusSolicitacao, statusAplication, statusApp, eventoAuditoria, historico, tipo_termo_responsabilidade, objetoAuditoria } = require('../../../certs/index.js');
const bucketGateway = require('../../../infrastructure/gateways/Bucket/index.js');
const urlPublicaBucket = require('../../../infrastructure/gateways/Bucket/helpers/urlPublica.js');
const RabbitMQ = require('../../../infrastructure/gateways/rabbitmq');
const MessageDispatcher = require('../../../infrastructure/gateways/helpers/Dispatchers/Messages');
const moment = require('moment');
const knex = require('../../../infrastructure/db/config/databaseConection.js')();
const serverSignGateway = require('../../../infrastructure/gateways/ServerSign');
const crypto = require('crypto');
const JsZip = require('jszip');
const LedgerSolicitacao = require('../../../infrastructure/gateways/helpers/AuditoriaAlteracao/LadgerSolicitacao/index.js');
const LedgerDocumentoPdf = require('../../../infrastructure/gateways/helpers/AuditoriaAlteracao/LadgerDocumentoPdf');
const Logger = require('../../../Logs/index.js');
const repositoryTermoAssinatura = require("../../../infrastructure/db/services/TermoResponsabilidadeRepository.js");
const repositorioChaveIntegracao = require('../../../infrastructure/db/services/ChaveIntegracaoRepository.js');

class createDocumentosUseCase {

    #rabbitMQ = null;

    constructor() {
        this.#rabbitMQ = RabbitMQ.getInstance();
    }

    async indexDocumentos(data) {
        try {
            //Validar se tem termo cadastrado no sistema, caso não tenha não pode adicionar um documento para assinatura.
            //Via chave de integração a verdade da sessão humana é a chave; o desafio dela é revalidado abaixo como todo desafio.
            if (data.integracao) {
                const checkChave = await repositorioChaveIntegracao.getChaveIntegracaoById({ id: data.integracao.chave_id })
                if (!checkChave.status) return { status: false, msg: "Ocorreu um erro interno, tente novamente em instantes." }
                if (!checkChave.exit) return { status: false, msg: "Chave de integração não encontrada." }
                if (checkChave.data.revogada) return { status: false, msg: "Chave de integração revogada." }
                if (checkChave.data.user_id !== data.user_id) return { status: false, msg: "Chave de integração não pertence ao usuário." }
                if (!checkChave.data.desafio_id || checkChave.data.desafio_id !== data.desafio_id) return { status: false, msg: "Chave de integração inválida." }
                if (checkChave.data.session_id !== data.meta_data.session_id) return { status: false, msg: "Chave de integração inválida." }
            } else {
                const checkLogin = await repositorioLogin.getLoginByUserId({ id: data.user_id })
                if (!checkLogin.status) return { status: false, msg: "Ocorreu um erro interno, tente novamente em instantes." }
                if (!checkLogin.exit) return { status: false, revokeLogin: true, msg: "Usuario não encontrado. Entre em contato com o suporte." }
                const login = checkLogin.data;
                if (!login.desafio_id) return { status: false, revokeLogin: true, msg: "Autenticação de dois fatores inválida." }
                if (login.desafio_id !== data.desafio_id) return { status: false, revokeLogin: true, msg: "Autenticação de dois fatores inválida. Faça o login novamente." }
            }
            const checkTermo = await repositoryTermoAssinatura.getTermoResponsabilidadeByIdAndTipo({ id: data.termo_id, tipo_termo: tipo_termo_responsabilidade.termo_documento })
            if (!checkTermo.status) return { status: false, msg: "Ocorreu um erro interno, tente novamente em instantes." }
            if (!checkTermo.exit) return { status: false, msg: "Termo de responsabilidade não encontrado. Entre em contato com o suporte." }
            if (!checkTermo.data.ativo) return { status: false, msg: "Termo de responsabilidade não está ativo. Entre em contato com o suporte." }
            const repositorioDesafioResponse = await repositorioDesafio.getDesafioAutenticacaoById({ id: data.desafio_id })
            if (!repositorioDesafioResponse.status) return { status: false, msg: "Ocorreu um erro interno, tente novamente em instantes." }
            if (!repositorioDesafioResponse.exit) return { status: false, revokeLogin: true, msg: "Autenticação de dois fatores inválida." }
            const checkOpenSolicitacao = await repositorioSolicitacao.getSolicitacaoDocumentoByUserSessionDesafioIdAndObjectNameStatus({
                user_id: data.user_id,
                sessao_id: data.meta_data.session_id,
                desafio_id: data.desafio_id,
                object_name: data.documento_nome,
                status: statusSolicitacao.solicitado
            });
            if (!checkOpenSolicitacao.status) return { status: false, msg: "Ocorreu um erro interno, tente novamente em instantes." }
            if ((statusAplication.status === statusApp.prod) && checkOpenSolicitacao.exit) return { status: false, msg: "Já existe uma solicitação em aberto para este documento. Aguarde a finalização do processo." }
            const desafio = repositorioDesafioResponse.data;
            if (desafio.tipo_desafio !== confiDoisFatores.desafio.login) return { status: false, revokeLogin: true, msg: "Autenticação de dois fatores inválida." }
            const documentoPreLoad = {
                bucket_wip_path: ``,
                meta_dados: data.meta_data,
                user_id: data.user_id,
                desafio_id: data.desafio_id,
                documento_nome: data.documento_nome,
                nome_documento: data.nome_documento,
            }
            data.meta_data.nome_documento = documentoPreLoad.nome_documento;
            data.meta_data.termo_id = data.termo_id;
            const solicitacao = new domainSolicitacao({ ...documentoPreLoad, data_criacao: dateNow(), status: statusSolicitacao.solicitado, object_name: data.documento_nome, meta_dados: data.meta_data, sessao_id: data.meta_data.session_id });
            let pathFile = bucketGateway.Wip().applyRootPrefix(`${buckets.aplicationName}/${buckets.pastas.documento}/${solicitacao.id}`);
            solicitacao.bucket_wip_path = pathFile;
            documentoPreLoad.bucket_wip_path = pathFile;
            const trx = await knex.transaction();
            try {
                const bucket = bucketGateway.Wip();
                const bucketVault = bucketGateway.Vault();
                const urlAssinada = await bucket.urlUploadPut({ documentoId: `${pathFile}/${documentoPreLoad.documento_nome}`, expiresInSeconds: buckets.temp_url_expiration });
                if (!urlAssinada.status) {
                    await trx.rollback();
                    return { status: false, msg: "Ocorreu um erro interno, tente novamente em instantes." }
                }
                const responseInsertSolicitacao = await repositorioSolicitacao.createSolicitacaoDocumentoTrx(trx, { ...solicitacao.getSolicitacaoDocumento() });
                if (!responseInsertSolicitacao.status) {
                    await trx.rollback();
                    return { status: false, msg: "Ocorreu um erro interno, tente novamente em instantes." }
                }
                const payload = solicitacao.getSolicitacaoDocumento();
                const body = Buffer.from(JSON.stringify(payload));
                const hashPayload = crypto.createHash('sha256').update(body).digest('hex');
                const object_name = `SolicitacaoDocumento-${solicitacao.id}.json`;
                const objectNameCms = `SolicitacaoDocumento-${solicitacao.id}.cms`;
                const auditoriaLedger = new domainAuditoriaLedgerSolicitacao({
                    solicitacao_id: solicitacao.id,
                    documento_id: solicitacao.documento_id,
                    tipo_evento: eventoAuditoria.solicitacao_upload.label,
                    payload_sha256: hashPayload,
                    sequencia: eventoAuditoria.solicitacao_upload.sequencia,
                    metadata_json: JSON.stringify(solicitacao.meta_dados),
                    criado_em: dateNow(),
                });
                const basePath = bucketVault.applyRootPrefix(`${buckets.valt}/${buckets.pastas.solicitacao_ledger}/${solicitacao.id}`)
                auditoriaLedger.bucket_path = basePath;
                auditoriaLedger.metadata_json = JSON.parse(auditoriaLedger.metadata_json);
                auditoriaLedger.metadata_json.payload_sha256 = hashPayload;
                auditoriaLedger.metadata_json.object_json_name = object_name;
                auditoriaLedger.metadata_json.object_cms_name = objectNameCms;
                auditoriaLedger.metadata_json.bucket_path = basePath;
                const hashObjeto = auditoriaLedger.calcularHashAtual();
                const carimbo = await serverSignGateway.Carimbo().carimbarHash({ hashHex: hashObjeto });
                if (!carimbo.status) {
                    await trx.rollback();
                    return { status: false, msg: "Ocorreu um erro interno, tente novamente em instantes." }
                }
                const bodyJson = Buffer.from(JSON.stringify(solicitacao.getSolicitacaoDocumento()));
                const bodyCms = Buffer.from(carimbo.data.cms_base64, 'base64');
                const zip = new JsZip();
                zip.file(object_name, bodyJson);
                zip.file(objectNameCms, bodyCms);
                const bodyZip = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
                const timeStamp = moment().format('YYYYMMDDHHmmss');
                const objectNameZip = `${basePath}/SolicitacaoDocumento-${timeStamp}-${auditoriaLedger.id}.zip`;
                const saveBucket = await bucketVault.salvarArquivo({
                    objectName: objectNameZip,
                    fileStream: bodyZip,
                    size: bodyZip.length,
                    contentType: 'application/zip'
                });
                if (!saveBucket.status) {
                    await trx.rollback();
                    return { status: false, msg: "Ocorreu um erro interno, tente novamente em instantes." }
                }
                const selarDoc = await bucketVault.selarDocumento({ documentoId: objectNameZip });
                if (!selarDoc.status) {
                    await trx.rollback();
                    return { status: false, msg: "Ocorreu um erro interno, tente novamente em instantes." }
                }

                auditoriaLedger.object_name = objectNameZip;

                await trx('tab_auditoria_ledger_solicitacao').insert(auditoriaLedger.getAuditoriaLedgerSolicitacao());
                await trx('tab_historico').insert(new domainHistorico({
                    transformacao: historico.trnasformcao.create.value,
                    dado_atual: solicitacao,
                    data_criacao: solicitacao.data_criacao,
                    user_id: solicitacao.user_id,
                }).getHistorico());
                await trx('tab_historico').insert(new domainHistorico({
                    transformacao: historico.trnasformcao.create.value,
                    dado_atual: auditoriaLedger,
                    data_criacao: auditoriaLedger.data_criacao,
                    user_id: solicitacao.user_id,
                }).getHistorico());
                const ultimoElo = await trx('tab_auditoria_ledger')
                    .where(function () { this.where('documento_id', solicitacao.documento_id).orWhere('solicitacao_id', solicitacao.id) })
                    .where('deletado', false)
                    .orderBy('sequencia', 'desc')
                    .first();
                const sequenciaMestre = ultimoElo ? Number(ultimoElo.sequencia) + 1 : eventoAuditoria.solicitacao_criada.sequencia;
                await new LedgerDocumentoPdf(trx).GravarEvento({
                    solicitacao_id: solicitacao.id,
                    documento_id: null,
                    objeto_tipo: objetoAuditoria.solicitacao,
                    objeto_id: solicitacao.id,
                    objeto: solicitacao.getSolicitacaoDocumento(),
                    objeto_anterior: null,
                    desafio_acesso_id: solicitacao.desafio_id,
                    tipo_evento: eventoAuditoria.solicitacao_criada.label,
                    sequencia: sequenciaMestre,
                    meta_data: {
                        status: solicitacao.status,
                        object_name: solicitacao.object_name,
                        bucket_wip_path: solicitacao.bucket_wip_path,
                        desafio_id: solicitacao.desafio_id,
                    },
                    hash_documento_inicial: null,
                    hash_documento_final: null,
                    hash_registro_anterior: ultimoElo ? ultimoElo.hash_atual : null,
                    user_id: solicitacao.user_id,
                });
                await trx.commit();
                const url = urlPublicaBucket(urlAssinada.data.url);
                return { status: true, msg: "Preparação do documento iniciada", data: { id: solicitacao.id, url }, object: solicitacao.getSolicitacaoDocumento() }
            } catch (err) {
                console.log(err)
                await trx.rollback();
                if (err?.name === 'ErrorLedgerDocumentoPdf') {
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
            logExeption({ descricaoDoErro: 'Exeption estourada. use case Documentos - createDocumentosUseCase - indexDocumentos', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            return { status: false, msg: 'Erro interno do servidor, log gerado' }
        }
    }

    async validateDocument(data, session_id) {
        try {
            const checkSolicitacao = await repositorioSolicitacao.getSolicitacaoDocumentoById({ id: data.id })
            if (!checkSolicitacao.status) return { status: false, msg: "Ocorreu um erro interno, tente novamente em instantes." }
            if (!checkSolicitacao.exit) return { status: false, msg: "Solicitação de documento não encontrada." }
            const solicitacao = new domainSolicitacao(checkSolicitacao.data);
            const oldSolicitacao = { ...checkSolicitacao.data };
            solicitacao.data_criacao = moment(solicitacao.data_criacao).format('YYYY-MM-DD HH:mm:ss');
            solicitacao.data_atualizacao = moment(solicitacao.data_atualizacao).format('YYYY-MM-DD HH:mm:ss');
            oldSolicitacao.data_criacao = solicitacao.data_criacao;
            oldSolicitacao.data_atualizacao = solicitacao.data_atualizacao;
            if (solicitacao.status !== statusSolicitacao.solicitado) return { status: false, msg: "Solicitação de documento não está em processo de validação." }
            const metaDados = typeof solicitacao.meta_dados === 'string' ? JSON.parse(solicitacao.meta_dados) : solicitacao.meta_dados;
            if (!metaDados || metaDados.session_id !== session_id) return { status: false, msg: "Solicitação de documento não pertence a sessão atual." }
            if (!metaDados || !metaDados.nome_documento || metaDados.nome_documento.trim() === '') return { status: false, msg: "Dados do documento corrompidos. Tente novamente em instantes." }
            const objectName = `${solicitacao.bucket_wip_path}/${solicitacao.object_name}`;
            const bucket = bucketGateway.Wip();
            const validacaoPdf = await bucket.validarMagicPdf({ objectName });
            if (!validacaoPdf.status) return { status: false, msg: validacaoPdf.msg }
            solicitacao.status = statusSolicitacao.processamento_hash_inicial;
            const documento = {
                ...data,
                object_name: objectName,
                size: validacaoPdf.data.size,
                etag: validacaoPdf.data.etag,
                content_type: validacaoPdf.data.contentType,
                status: statusSolicitacao.processamento_hash_inicial,
                validado_pdf: true,
                validado_em: dateNow(),
            }
            const dispatcher = new MessageDispatcher(this.#rabbitMQ, []);
            dispatcher.addItem({
                exchange: rabbitMQ.queues.processarhashinicial.exchange,
                routingKey: rabbitMQ.queues.processarhashinicial.routingKey,
                jsonMessage: {
                    solicitacao_id: solicitacao.id,
                    user_id: documento.user_id || solicitacao.user_id,
                    desafio_id: documento.desafio_id || solicitacao.desafio_id,
                    termo_id: metaDados.termo_id,
                    documento_nome: solicitacao.object_name,
                    object_name: documento.object_name,
                    nome_documento: metaDados.nome_documento,
                    bucket_wip_path: solicitacao.bucket_wip_path,
                    size: documento.size,
                    etag: documento.etag,
                    content_type: documento.content_type,
                    meta_dados: metaDados,
                    status: documento.status,
                },
                delayMs: rabbitMQ.defaultDelay,
            });
            solicitacao.data_atualizacao = dateNow();
            solicitacao.meta_dados = JSON.stringify(metaDados);
            const trx = await knex.transaction();
            try {
                const ultimaLedgerSolicitacao = await trx('tab_auditoria_ledger_solicitacao')
                    .where('solicitacao_id', solicitacao.id)
                    .where('deletado', false)
                    .orderBy('criado_em', 'desc')
                    .first();
                const sequenciaSolicitacao = ultimaLedgerSolicitacao
                    ? Number(ultimaLedgerSolicitacao.sequencia) + 1
                    : (eventoAuditoria.solicitacao_upload?.sequencia || 1);
                const AuditoriaLedger = new LedgerSolicitacao(trx);
                AuditoriaLedger.Initialize(oldSolicitacao);
                await AuditoriaLedger.GravarAuditoriaModificacao({
                    solicitacao,
                    tipo_evento: eventoAuditoria.upload_concluido.label,
                    sequencia: sequenciaSolicitacao,
                    meta_data: {
                        ...metaDados,
                        object_name: solicitacao.object_name,
                        bucket_wip_path: solicitacao.bucket_wip_path
                    }
                })
                const ultimoElo = await trx('tab_auditoria_ledger')
                    .where(function () { this.where('documento_id', solicitacao.documento_id).orWhere('solicitacao_id', solicitacao.id) })
                    .where('deletado', false)
                    .orderBy('sequencia', 'desc')
                    .first();
                const sequenciaMestre = ultimoElo ? Number(ultimoElo.sequencia) + 1 : eventoAuditoria.solicitacao_confirmada.sequencia;
                await new LedgerDocumentoPdf(trx).GravarEvento({
                    solicitacao_id: solicitacao.id,
                    documento_id: solicitacao.documento_id || null,
                    objeto_tipo: objetoAuditoria.solicitacao,
                    objeto_id: solicitacao.id,
                    objeto: solicitacao.getSolicitacaoDocumento(),
                    objeto_anterior: oldSolicitacao,
                    desafio_acesso_id: solicitacao.desafio_id,
                    tipo_evento: eventoAuditoria.solicitacao_confirmada.label,
                    sequencia: sequenciaMestre,
                    meta_data: {
                        status: solicitacao.status,
                        object_name: solicitacao.object_name,
                        bucket_wip_path: solicitacao.bucket_wip_path,
                    },
                    hash_documento_inicial: null,
                    hash_documento_final: null,
                    hash_registro_anterior: ultimoElo ? ultimoElo.hash_atual : null,
                    user_id: solicitacao.user_id,
                });
                await trx.commit();
                await dispatcher.dispatch();
                return {
                    status: true,
                    msg: "PDF validado. Processamento do hash inicial enfileirado.",
                    data: { documento },
                    oldObject: oldSolicitacao,
                    object: solicitacao
                }
            } catch (err) {
                console.log(err)
                await trx.rollback();
                if (err.name === "ErrorLedgerSolicitacao") {
                    Logger.error(`Erro de auditoria de solicitação: ${err.message} - Linha: ${err.lineNumber || 'desconhecida'}, Arquivo: ${err.fileName || 'desconhecido'}`);
                    return { status: false, msg: "Ocorreu um erro interno de auditoria, tente novamente em instantes." }
                }
                if (err?.name === 'ErrorLedgerDocumentoPdf') {
                    return { status: false, msg: "Ocorreu um erro interno de auditoria, tente novamente em instantes." }
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
            logExeption({ descricaoDoErro: 'Exeption estourada. use case Documentos - createDocumentosUseCase - validateDocument', linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), data_atualizacao: dateNow(), deletado: false })
            return { status: false, msg: 'Erro interno do servidor, log gerado' }
        }
    }


}

module.exports = new createDocumentosUseCase();
