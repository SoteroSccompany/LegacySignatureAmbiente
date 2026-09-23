const crypto = require('crypto');
const moment = require('moment');
const {
    statusBroker,
    rabbitMQ,
    maxRetryReprocessBroker,
    eventoAuditoria,
    objetoAuditoria,
    historico,
    statusBiometriaAssinatura,
} = require('../../../../certs');
const { parseBrokerMessageEnvelope, normalizeMetaDados } = require('../../../gateways/functions/brokerMessageEnvelope');
const dateNow = require('../../../gateways/functions/data/getToday');
const logs = require('../../../../Logs');
const bucketGateway = require('../../../gateways/Bucket');
const FaceMatch = require('../../../gateways/FaceMatch');
const LadgerIdentificacaoBiometria = require('../../../gateways/helpers/AuditoriaAlteracao/LadgerIdentificacaoBiometrica');
const LedgerDocumentoPdf = require('../../../gateways/helpers/AuditoriaAlteracao/LadgerDocumentoPdf');
const domainHistorico = require('../../../../@core/domain/Historico');
const sendEmail = require('../../../../@core/usecase/Mail/enviarEmail');

class ProcessarBiometria {

    #rabbitmq;
    #knex;
    #metaDados;
    trx = null;
    status = false;
    reprocessar = false;
    delayMs = rabbitMQ.defaultDelay;

    constructor(rabbit, knex) {
        this.#rabbitmq = rabbit;
        this.#knex = knex;
        this.#metaDados = normalizeMetaDados(rabbit.broker.meta_dados);
        this.mountMetaDados();
    }

    mountMetaDados() {
        if (!this.#metaDados) {
            this.#metaDados = { tentativas: 0 };
        }
        if (this.#metaDados.tentativas === undefined) {
            this.#metaDados.tentativas = 0;
        }
    }

    async processar() {
        try {
            const payload = this.#lerPayload();
            if (!payload) return await this.#finalizarSemRetentativa('Mensagem sem os dados obrigatórios da identificação biométrica');
            const identificacao = await this.#knex('tab_identificacao_biometrica').select('*')
                .where('id', payload.identificacao_id)
                .andWhere('deletado', false)
                .first();
            if (!identificacao) return await this.#finalizarSemRetentativa('Identificação biométrica não encontrada.');
            if (identificacao.documento_id !== payload.documento_id
                || identificacao.signatario_id !== payload.signatario_id
                || identificacao.user_id !== payload.user_id) {
                return await this.#finalizarSemRetentativa('Identificação biométrica não corresponde ao payload.');
            }
            if ([statusBiometriaAssinatura.validado, statusBiometriaAssinatura.negado].includes(Number(identificacao.status))) {
                return await this.#finalizarComSucesso(`Identificação ${identificacao.id} já processada.`);
            }
            if (Number(identificacao.status) !== statusBiometriaAssinatura.aguardando_validacao) {
                return await this.#finalizarSemRetentativa('Identificação biométrica em status inválido para o FaceMatch.');
            }
            const documento = await this.#knex('tab_documentos').select('*').where('id', identificacao.documento_id).first();
            if (!documento) return await this.#finalizarSemRetentativa('Documento não localizado.');
            const user = await this.#knex('tab_usuarios').select('*').where('id', identificacao.user_id).andWhere('deletado', false).first();
            if (!user) return await this.#finalizarSemRetentativa('Usuário não localizado.');
            const perfil = await this.#knex('tab_perfil_usuario').select('*').where('user_id', user.id).andWhere('deletado', false).first();
            if (!perfil) return await this.#finalizarSemRetentativa('Perfil não cadastrado.');
            const biometria = await this.#knex('tab_perfil_biometria').select('*').where('id', identificacao.perfil_biometria_id).andWhere('deletado', false).first();
            if (!biometria) return await this.#finalizarSemRetentativa('Perfil biométrico não encontrado.');
            if (biometria.perfil_id !== perfil.id) return await this.#finalizarSemRetentativa('Perfil biométrico não corresponde ao usuário.');
            let embeddingAtual = biometria.rosto_embeddign;
            let embeddingCurado = null;
            // Cadastros antigos podem ter ficado sem embedding (aprovação pendente/legado).
            // Se a foto de perfil ainda está no WIP, cura agora em vez de descartar o job.
            // FaceMatch fica fora da trx; o UPDATE do perfil entra depois do forUpdate.
            if (!embeddingAtual && biometria.bucket_wip_path) {
                const checkFotoPerfil = await bucketGateway.Wip().obterArquivoBase64({ objectName: biometria.bucket_wip_path });
                if (!checkFotoPerfil.status) return await this.#finalizarComRetentativa(checkFotoPerfil.msg);
                const vetorPerfil = await FaceMatch.vectorize({ image_base64: checkFotoPerfil.data.image_base64 });
                if (!vetorPerfil.status) return await this.#finalizarComRetentativa(vetorPerfil.msg);
                embeddingCurado = JSON.stringify(vetorPerfil.data.embedding);
                embeddingAtual = embeddingCurado;
            }
            if (!embeddingAtual) return await this.#negarPorEmbeddingAusente(identificacao, payload, user, perfil);
            const objectName = identificacao.bucket_wip_path || payload.bucket_wip_path;
            if (!objectName) return await this.#finalizarSemRetentativa('Path da foto não informado.');
            const bucket = bucketGateway.Wip();
            const checkArquivo = await bucket.obterArquivoBase64({ objectName });
            if (!checkArquivo.status) return await this.#finalizarComRetentativa(checkArquivo.msg);
            const faceMatch = await FaceMatch.verifyMatch({
                image_base64: checkArquivo.data.image_base64,
                stored_embedding: embeddingAtual,
            });
            if (!faceMatch.status) return await this.#finalizarComRetentativa(faceMatch.msg);
            const rawBase64 = checkArquivo.data.image_base64.includes(',')
                ? checkArquivo.data.image_base64.split(',').pop()
                : checkArquivo.data.image_base64;
            const payload_sha256 = crypto.createHash('sha256').update(Buffer.from(rawBase64, 'base64')).digest('hex');
            const pathAnterior = objectName;
            let negou = false;
            this.trx = await this.#knex.transaction();
            try {
                const travada = await this.trx('tab_identificacao_biometrica').select('*')
                    .where('id', identificacao.id)
                    .andWhere('deletado', false)
                    .forUpdate()
                    .first();
                if (!travada) throw new ErrorProcessarBiometria('Identificação biométrica não encontrada.', false);
                if (travada.documento_id !== payload.documento_id
                    || travada.signatario_id !== payload.signatario_id
                    || travada.user_id !== payload.user_id) {
                    throw new ErrorProcessarBiometria('Identificação biométrica não corresponde ao payload.', false);
                }
                if ([statusBiometriaAssinatura.validado, statusBiometriaAssinatura.negado].includes(Number(travada.status))) {
                    await this.trx.commit();
                    this.trx = null;
                    return await this.#finalizarComSucesso(`Identificação ${travada.id} já processada.`);
                }
                if (Number(travada.status) !== statusBiometriaAssinatura.aguardando_validacao) {
                    throw new ErrorProcessarBiometria('Identificação biométrica em status inválido para o FaceMatch.', false);
                }
                if (embeddingCurado) {
                    const biometriaTravada = await this.trx('tab_perfil_biometria').select('*')
                        .where('id', biometria.id)
                        .andWhere('deletado', false)
                        .forUpdate()
                        .first();
                    if (!biometriaTravada) throw new ErrorProcessarBiometria('Perfil biométrico não encontrado.', false);
                    const updateBio = {
                        rosto_embeddign: embeddingCurado,
                        data_atualizacao: dateNow(),
                    };
                    // Foto de aprovação ainda é lida pela tela enquanto aprovado_por for nulo.
                    if (biometriaTravada.aprovado_por) {
                        updateBio.bucket_wip_path = null;
                    }
                    await this.trx('tab_perfil_biometria').where('id', biometriaTravada.id).update(updateBio);
                }
                const oldIdentificacao = { ...travada };
                const match = faceMatch.data.match === true;
                negou = match !== true;
                const evento = match
                    ? eventoAuditoria.identificacao_biometria_aprovada
                    : eventoAuditoria.identificacao_biometria_negada;
                travada.status = match ? statusBiometriaAssinatura.validado : statusBiometriaAssinatura.negado;
                travada.payload_sha256 = payload_sha256;
                travada.bucket_wip_path = null;
                travada.data_criacao = moment(travada.data_criacao).format('YYYY-MM-DD HH:mm:ss');
                travada.data_atualizacao = dateNow();
                await this.trx('tab_identificacao_biometrica').where('id', travada.id).update(travada);
                const ladgerIdentificacao = new LadgerIdentificacaoBiometria(this.trx);
                ladgerIdentificacao.Initialize(oldIdentificacao);
                await ladgerIdentificacao.GravarAuditoriaModificacao({
                    identificacao: travada,
                    tipo_evento: evento.lable,
                    sequencia: evento.sequencia,
                    meta_data: {
                        documento_id: travada.documento_id,
                        signatario_id: travada.signatario_id,
                        desafio_id: travada.desafio_id,
                        match,
                        distance: faceMatch.data.distance,
                    },
                    user_id: payload.user_id,
                });
                const documentoTravado = await this.trx('tab_documentos').select('*').where('id', travada.documento_id).first();
                if (!documentoTravado) throw new ErrorProcessarBiometria('Documento não localizado.', false);
                const solicitacaoVinculo = await this.trx('tab_solicitacao_documento').select('id').where('documento_id', documentoTravado.id).first();
                if (!solicitacaoVinculo) throw new ErrorProcessarBiometria('Ocorreu um erro interno, tente novamente em instantes.', false);
                const ultimoElo = await this.trx('tab_auditoria_ledger')
                    .where(function () { this.where('documento_id', documentoTravado.id).orWhere('solicitacao_id', solicitacaoVinculo.id) })
                    .where('deletado', false)
                    .orderBy('sequencia', 'desc')
                    .first();
                const eventoCadeia = match ? eventoAuditoria.biometria_validada : eventoAuditoria.biometria_negada;
                const sequenciaElo = ultimoElo ? Number(ultimoElo.sequencia) + 1 : eventoCadeia.sequencia;
                await new LedgerDocumentoPdf(this.trx).GravarEvento({
                    solicitacao_id: solicitacaoVinculo.id,
                    documento_id: documentoTravado.id,
                    objeto_tipo: objetoAuditoria.identificacao_biometrica,
                    objeto_id: travada.id,
                    objeto: travada,
                    objeto_anterior: oldIdentificacao,
                    desafio_acesso_id: travada.desafio_id,
                    tipo_evento: eventoCadeia.label,
                    sequencia: sequenciaElo,
                    meta_data: {
                        documento_id: travada.documento_id,
                        signatario_id: travada.signatario_id,
                        desafio_id: travada.desafio_id,
                        match,
                        distance: faceMatch.data.distance,
                    },
                    hash_documento_inicial: (ultimoElo && ultimoElo.hash_documento_final) || documentoTravado.hash_original,
                    hash_documento_final: (ultimoElo && ultimoElo.hash_documento_final) || documentoTravado.hash_original,
                    hash_registro_anterior: ultimoElo ? ultimoElo.hash_atual : null,
                    user_id: payload.user_id,
                });
                const hist1 = new domainHistorico({
                    dado_antigo: oldIdentificacao,
                    transformacao: historico.trnasformcao.update.value,
                    dado_atual: { ...travada },
                    user_id: payload.user_id,
                });
                await this.trx('tab_historico').insert(hist1.getHistorico());
                await this.trx.commit();
                this.trx = null;
            } catch (err) {
                console.log(err)
                await this.#rollbackTrx();
                if (err.name === 'ErrorProcessarBiometria' && err.retry === false) {
                    return await this.#finalizarSemRetentativa(err.message);
                }
                if (err.name === 'ErrorLedgerDocumentoPdf' || err.name === 'ErrorLedgerIdentificacaoBiometrica') {
                    return await this.#finalizarComRetentativa(err.message);
                }
                return await this.#finalizarComRetentativa(err.message);
            }
            const deleteFile = await bucket.remove({ documentoId: pathAnterior });
            if (!deleteFile.status) {
                logs.getInstance().error({ path: pathAnterior, msg: deleteFile.msg }, 'Falha ao remover foto do WIP após FaceMatch');
            }
            if (negou) await this.#enviarEmailNovaTentativa(user, perfil, identificacao.documento_id);
            await this.#finalizarComSucesso(`Identificação ${identificacao.id} processada.`);
        } catch (err) {
            console.log(err)
            logs.getInstance().error({ err }, 'Erro ao processar ProcessarBiometria');
            await this.#rollbackTrx();
            await this.#finalizarComRetentativa(err.message);
        }
    }

    // Sem embedding e sem foto de perfil no WIP para curar: não há como fazer o FaceMatch.
    // Fecha a identificação como negada (segunda leitura com lock) para o poll do front acabar.
    async #negarPorEmbeddingAusente(identificacao, payload, user, perfil) {
        this.trx = await this.#knex.transaction();
        try {
            const travada = await this.trx('tab_identificacao_biometrica').select('*')
                .where('id', identificacao.id)
                .andWhere('deletado', false)
                .forUpdate()
                .first();
            if (!travada) throw new ErrorProcessarBiometria('Identificação biométrica não encontrada.', false);
            if (travada.documento_id !== payload.documento_id
                || travada.signatario_id !== payload.signatario_id
                || travada.user_id !== payload.user_id) {
                throw new ErrorProcessarBiometria('Identificação biométrica não corresponde ao payload.', false);
            }
            if ([statusBiometriaAssinatura.validado, statusBiometriaAssinatura.negado].includes(Number(travada.status))) {
                await this.trx.commit();
                this.trx = null;
                return await this.#finalizarComSucesso(`Identificação ${travada.id} já processada.`);
            }
            if (Number(travada.status) !== statusBiometriaAssinatura.aguardando_validacao) {
                throw new ErrorProcessarBiometria('Identificação biométrica em status inválido para o FaceMatch.', false);
            }
            const oldIdentificacao = { ...travada };
            travada.status = statusBiometriaAssinatura.negado;
            travada.data_criacao = moment(travada.data_criacao).format('YYYY-MM-DD HH:mm:ss');
            travada.data_atualizacao = dateNow();
            await this.trx('tab_identificacao_biometrica').where('id', travada.id).update(travada);
            const ladgerIdentificacao = new LadgerIdentificacaoBiometria(this.trx);
            ladgerIdentificacao.Initialize(oldIdentificacao);
            await ladgerIdentificacao.GravarAuditoriaModificacao({
                identificacao: travada,
                tipo_evento: eventoAuditoria.identificacao_biometria_negada.lable,
                sequencia: eventoAuditoria.identificacao_biometria_negada.sequencia,
                meta_data: {
                    documento_id: travada.documento_id,
                    signatario_id: travada.signatario_id,
                    desafio_id: travada.desafio_id,
                    erro_msg: 'Embedding biométrico não cadastrado.',
                },
                user_id: payload.user_id,
            });
            const documentoTravado = await this.trx('tab_documentos').select('*').where('id', travada.documento_id).first();
            if (!documentoTravado) throw new ErrorProcessarBiometria('Documento não localizado.', false);
            const solicitacaoVinculo = await this.trx('tab_solicitacao_documento').select('id').where('documento_id', documentoTravado.id).first();
            if (!solicitacaoVinculo) throw new ErrorProcessarBiometria('Ocorreu um erro interno, tente novamente em instantes.', false);
            const ultimoElo = await this.trx('tab_auditoria_ledger')
                .where(function () { this.where('documento_id', documentoTravado.id).orWhere('solicitacao_id', solicitacaoVinculo.id) })
                .where('deletado', false)
                .orderBy('sequencia', 'desc')
                .first();
            const sequenciaElo = ultimoElo ? Number(ultimoElo.sequencia) + 1 : eventoAuditoria.biometria_negada.sequencia;
            await new LedgerDocumentoPdf(this.trx).GravarEvento({
                solicitacao_id: solicitacaoVinculo.id,
                documento_id: documentoTravado.id,
                objeto_tipo: objetoAuditoria.identificacao_biometrica,
                objeto_id: travada.id,
                objeto: travada,
                objeto_anterior: oldIdentificacao,
                desafio_acesso_id: travada.desafio_id,
                tipo_evento: eventoAuditoria.biometria_negada.label,
                sequencia: sequenciaElo,
                meta_data: {
                    documento_id: travada.documento_id,
                    signatario_id: travada.signatario_id,
                    desafio_id: travada.desafio_id,
                    erro_msg: 'Embedding biométrico não cadastrado.',
                },
                hash_documento_inicial: (ultimoElo && ultimoElo.hash_documento_final) || documentoTravado.hash_original,
                hash_documento_final: (ultimoElo && ultimoElo.hash_documento_final) || documentoTravado.hash_original,
                hash_registro_anterior: ultimoElo ? ultimoElo.hash_atual : null,
                user_id: payload.user_id,
            });
            const hist1 = new domainHistorico({
                dado_antigo: oldIdentificacao,
                transformacao: historico.trnasformcao.update.value,
                dado_atual: { ...travada },
                user_id: payload.user_id,
            });
            await this.trx('tab_historico').insert(hist1.getHistorico());
            await this.trx.commit();
            this.trx = null;
        } catch (err) {
            console.log(err)
            await this.#rollbackTrx();
            if (err.name === 'ErrorProcessarBiometria' && err.retry === false) {
                return await this.#finalizarSemRetentativa(err.message);
            }
            if (err.name === 'ErrorLedgerDocumentoPdf' || err.name === 'ErrorLedgerIdentificacaoBiometrica') {
                return await this.#finalizarComRetentativa(err.message);
            }
            return await this.#finalizarComRetentativa(err.message);
        }
        await this.#enviarEmailNovaTentativa(user, perfil, identificacao.documento_id);
        return await this.#finalizarSemRetentativa('Embedding biométrico não cadastrado.');
    }

    async #enviarEmailNovaTentativa(user, perfil, documentoId) {
        try {
            const envio = await sendEmail.sendEmailBiometriaNaoIdentificada({
                email: user && user.email,
                nome: perfil && perfil.nome,
                documento_id: documentoId,
            });
            if (!envio.status) {
                logs.getInstance().error({ msg: envio.msg, documento_id: documentoId }, 'Falha ao enviar e-mail de nova tentativa da biometria');
            }
        } catch (error) {
            logs.getInstance().error({ err: error, documento_id: documentoId }, 'Falha ao enviar e-mail de nova tentativa da biometria');
        }
    }

    #lerPayload() {
        try {
            const envelope = parseBrokerMessageEnvelope(this.#rabbitmq.broker.message);
            const payload = envelope.data || envelope;
            if (!payload.identificacao_id || !payload.documento_id || !payload.signatario_id || !payload.user_id || !payload.bucket_wip_path) {
                return null;
            }
            return payload;
        } catch (err) {
            logs.getInstance().error({ err }, 'Não foi possível interpretar a mensagem do ProcessarBiometria');
            return null;
        }
    }

    async #finalizarComSucesso(msg) {
        this.status = true;
        this.reprocessar = false;
        this.#metaDados.tentativas = 0;
        logs.getInstance().info({ identificacao_id: this.#metaDados.identificacao_id }, msg);
        await this.#salvarBroker(statusBroker.processed);
    }

    async #finalizarSemRetentativa(msg) {
        this.status = false;
        this.reprocessar = false;
        await this.#rollbackTrx();
        logs.getInstance().error({ meta_dados: this.#metaDados }, `ProcessarBiometria descartado: ${msg}`);
        await this.#salvarBroker(statusBroker.failedNotRetry);
    }

    async #finalizarComRetentativa(msg) {
        this.status = false;
        this.#metaDados.tentativas += 1;
        this.reprocessar = this.#metaDados.tentativas <= maxRetryReprocessBroker;
        this.delayMs = rabbitMQ.defaultDelay * Math.pow(2, this.#metaDados.tentativas);
        await this.#rollbackTrx();
        logs.getInstance().error({ tentativas: this.#metaDados.tentativas }, `Falha no ProcessarBiometria: ${msg}`);
        await this.#salvarBroker(this.reprocessar ? statusBroker.pending : statusBroker.failedNotRetry);
    }

    async #rollbackTrx() {
        if (!this.trx) return;
        try {
            await this.trx.rollback();
        } catch (_) {
            // transação já encerrada
        } finally {
            this.trx = null;
        }
    }

    async #salvarBroker(status) {
        try {
            this.#rabbitmq.broker.status = status;
            this.#rabbitmq.broker.delayMs = this.delayMs;
            this.#rabbitmq.broker.meta_dados = JSON.stringify({ ...this.#metaDados });
            this.#rabbitmq.broker.data_atualizacao = moment().format('YYYY-MM-DD HH:mm:ss');
            await this.#rabbitmq.saveBroker(this.#knex);
        } catch (error) {
            logs.getInstance().error({ err: error }, 'Erro ao salvar o broker do ProcessarBiometria');
        }
    }
}

class ErrorProcessarBiometria extends Error {
    constructor(message, retry) {
        super(message);
        this.name = 'ErrorProcessarBiometria';
        this.retry = retry !== false;
    }
}

module.exports = ProcessarBiometria;
