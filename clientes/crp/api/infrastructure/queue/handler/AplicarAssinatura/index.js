
const crypto = require('crypto');
const moment = require('moment');
const {
    statusBroker,
    rabbitMQ,
    statusDocumentos,
    statusSignatario,
    statusBiometriaAssinatura,
    modoEstampaAssinatura,
    eventoAuditoria,
    objetoAuditoria,
    estampaAssinatura,
    maxRetryReprocessBroker,
    assinaturaSessao,
} = require('../../../../certs');
const { parseBrokerMessageEnvelope, normalizeMetaDados } = require('../../../gateways/functions/brokerMessageEnvelope');
const bucketGateway = require('../../../gateways/Bucket');
const dateNow = require('../../../gateways/functions/data/getToday');
const logs = require('../../../../Logs');
const {
    streamToBuffer,
    parseJsonField,
    aplicarEstampaVisual,
    adicionarFolhaAuditoria,
    aplicarSeloPlataforma,
    mascararCpf,
} = require('../../../gateways/PdfSign/aplicarAssinaturaPdf');
const serverSignGateway = require('../../../gateways/ServerSign');
const LedgerDocumento = require('../../../gateways/helpers/AuditoriaAlteracao/LadgerDocumento');
const LedgerDocumentoPdf = require('../../../gateways/helpers/AuditoriaAlteracao/LadgerDocumentoPdf');
const LedgerSignatario = require('../../../gateways/helpers/AuditoriaAlteracao/LadgerSignatario');
const MessageDispatcher = require('../../../gateways/helpers/Dispatchers/Messages');
const documentoVerificacaoRepository = require('../../../db/services/DocumentoVerificacaoRepository');
const { SHA } = require('../../../gateways/crypt/sha');

class AplicarAssinatura {

    #rabbitmq;
    #knex;
    #metaDados;
    status = false;
    reprocessar = false;
    dispatcher = null;
    delayMs = rabbitMQ.defaultDelay;
    hashPdf = null;
    trx = null;

    constructor(rabbit, knex) {
        this.#rabbitmq = rabbit;
        this.#knex = knex;
        this.#metaDados = normalizeMetaDados(rabbit.broker.meta_dados);
        this.mountMetaDados();
    }

    mountMetaDados() {
        if (!this.#metaDados) this.#metaDados = { tentativas: 0 };
        if (this.#metaDados.tentativas === undefined) this.#metaDados.tentativas = 0;
    }

    async processar() {
        let signatario = null;
        try {
            const payload = this.#lerPayload();
            if (!payload) return await this.#finalizarSemRetentativa('Mensagem sem dados obrigatórios da assinatura');

            signatario = await this.#knex('tab_signatarios').select('*').where('id', payload.signatario_id).first();
            if (!signatario) return await this.#finalizarSemRetentativa(`Signatário ${payload.signatario_id} não encontrado`);
            if (signatario.documento_id !== payload.documento_id) {
                return await this.#finalizarSemRetentativa('Signatário não corresponde ao payload.');
            }
            if (payload.user_id && signatario.user_id !== payload.user_id) {
                return await this.#finalizarSemRetentativa('Signatário não corresponde ao payload.');
            }
            if (signatario.status === statusSignatario.assinado) {
                return await this.#finalizarComSucesso('Assinatura já aplicada anteriormente');
            }
            if (signatario.status !== statusSignatario.processando) {
                return await this.#finalizarSemRetentativa(`Signatário em status inválido: ${signatario.status}`);
            }

            const documentoPreCheck = await this.#knex('tab_documentos').select('id', 'status').where('id', payload.documento_id).first();
            if (!documentoPreCheck) return await this.#finalizarSemRetentativa(`Documento ${payload.documento_id} não encontrado`);
            if (documentoPreCheck.status !== statusDocumentos.documento_aguardando_assinatura) {
                return await this.#finalizarSemRetentativa(`Documento em status inválido: ${documentoPreCheck.status}`);
            }

            // A partir daqui trava o documento inteiro (FOR UPDATE) até o commit final. Isso serializa
            // qualquer assinatura concorrente do MESMO documento (em ordem ou em conjunto), evitando que
            // dois workers leiam/gravem o mesmo PDF do WIP ao mesmo tempo (lost update) e evitando corrida
            // na sequência do ledger de documento.
            this.trx = await this.#knex.transaction();

            const documento = await this.trx('tab_documentos').select('*').where('id', payload.documento_id).forUpdate().first();
            if (!documento) return await this.#finalizarSemRetentativa(`Documento ${payload.documento_id} não encontrado`);
            if (documento.status !== statusDocumentos.documento_aguardando_assinatura) {
                return await this.#finalizarSemRetentativa(`Documento em status inválido: ${documento.status}`);
            }

            const signatarioTravado = await this.trx('tab_signatarios').select('*').where('id', signatario.id).forUpdate().first();
            if (!signatarioTravado) return await this.#finalizarSemRetentativa(`Signatário ${payload.signatario_id} não encontrado`);
            if (signatarioTravado.documento_id !== payload.documento_id) {
                return await this.#finalizarSemRetentativa('Signatário não corresponde ao payload.');
            }
            if (payload.user_id && signatarioTravado.user_id !== payload.user_id) {
                return await this.#finalizarSemRetentativa('Signatário não corresponde ao payload.');
            }
            if (signatarioTravado.status === statusSignatario.assinado) {
                await this.trx.commit();
                this.trx = null;
                return await this.#finalizarComSucesso('Assinatura já aplicada anteriormente');
            }
            if (signatarioTravado.status !== statusSignatario.processando) {
                return await this.#finalizarSemRetentativa(`Signatário em status inválido: ${signatarioTravado.status}`);
            }

            const solicitacaoVinculo = await this.trx('tab_solicitacao_documento').select('id', 'user_id').where('documento_id', documento.id).first();
            if (!solicitacaoVinculo) return await this.#finalizarSemRetentativa('Solicitação do documento não encontrada.');

            const objectName = documento.bucket_wip_path || payload.object_name;
            const arquivo = await bucketGateway.Wip().obterArquivo({ objectName });
            if (!arquivo.status) return await this.#finalizarComRetentativa(arquivo.msg, signatario);

            let pdfBytes = await streamToBuffer(arquivo.data.stream);
            const hashAntesEstampa = crypto.createHash('sha256').update(pdfBytes).digest('hex');
            const demarcacoes = await this.trx('tab_demarcacoes_assinatura')
                .select('*')
                .where('signatario_id', signatarioTravado.id)
                .andWhere('deletado', false);

            const modo = signatarioTravado.modo_visual || payload.modo || modoEstampaAssinatura.dados;
            let imagemPngBytes = null;
            if (modo === modoEstampaAssinatura.desenho) {
                const estampaName = signatarioTravado.estampa_object_name || payload.estampa_object_name;
                if (!estampaName) return await this.#finalizarSemRetentativa('Estampa PNG ausente para modo DESENHO');
                const estampa = await bucketGateway.Wip().obterArquivo({ objectName: estampaName });
                if (!estampa.status) return await this.#finalizarComRetentativa(estampa.msg, signatario);
                imagemPngBytes = await streamToBuffer(estampa.data.stream);
            }

            let textoEstampa = parseJsonField(signatarioTravado.estampa_texto_json) || payload.estampa_texto;
            if (!textoEstampa) {
                textoEstampa = {
                    nome: signatarioTravado.nome,
                    cpf_mascarado: '***.***.***-**',
                    data_hora: dateNow(),
                    legenda: estampaAssinatura.legendaPadrao,
                    codigo_verificacao: null,
                };
            }
            if (!textoEstampa.nome) {
                let nomeFallback = signatarioTravado.nome || null;
                if (!nomeFallback && signatarioTravado.perfil_id) {
                    const perfilNome = await this.trx('tab_perfil_usuario')
                        .select('nome')
                        .where('id', signatarioTravado.perfil_id)
                        .andWhere('deletado', false)
                        .first();
                    if (perfilNome) nomeFallback = perfilNome.nome;
                }
                textoEstampa.nome = nomeFallback || 'Signatário';
            }
            if (!textoEstampa.codigo_verificacao) {
                const documentoVerificacao = await documentoVerificacaoRepository.getByDocumentoId({ documento_id: documento.id }, this.trx);
                if (!documentoVerificacao.status) return await this.#finalizarComRetentativa(documentoVerificacao.msg, signatario);
                if (!documentoVerificacao.exit) return await this.#finalizarSemRetentativa('Código de verificação do documento não encontrado.');
                if (!documentoVerificacao.data.codigo_verificacao) return await this.#finalizarSemRetentativa('Código de verificação do documento não encontrado.');
                textoEstampa.codigo_verificacao = documentoVerificacao.data.codigo_verificacao;
            }

            pdfBytes = await aplicarEstampaVisual({
                pdfBytes,
                demarcacoes,
                modo,
                textoEstampa,
                imagemPngBytes,
            });
            // Prova temporal do signatário: carimbo CMS do hash do PDF estampado. A evidência fica
            // na trilha de auditoria (vault) — o PDF não recebe mais um CMS por pessoa, só o selo
            // único da plataforma quando o último signatário assinar.
            this.hashPdf = crypto.createHash('sha256').update(pdfBytes).digest('hex');
            const hashAposEstampa = this.hashPdf;
            const carimboSignatario = await serverSignGateway.Carimbo().carimbarHash({ hashHex: this.hashPdf });
            if (!carimboSignatario.status) return await this.#finalizarComRetentativa(carimboSignatario.msg, signatario);

            const assinadoEm = dateNow();

            const pendentesAlemDoAtual = await this.trx('tab_signatarios')
                .where('documento_id', documento.id)
                .andWhere('deletado', false)
                .whereNot('id', signatarioTravado.id)
                .whereNotIn('status', [statusSignatario.assinado])
                .count({ total: 'id' })
                .first();

            let carimboSelo = null;
            let hashAposFolha = null;
            let elosPrevistos = null;
            if (Number(pendentesAlemDoAtual.total) === 0) {
                const resumoSignatarios = await this.#montarResumoSignatarios({
                    trx: this.trx,
                    documento,
                    signatarioAtualId: signatarioTravado.id,
                    assinadoEmAtual: assinadoEm,
                });
                const codigoVerificacao = textoEstampa.codigo_verificacao || null;
                if (!codigoVerificacao) return await this.#finalizarSemRetentativa('Código de verificação do documento não encontrado.');
                const urlFront = String(process.env.URL_FRONT || '').replace(/\/+$/, '');
                const urlVerificacao = `${urlFront}/verificar/${codigoVerificacao}`;
                const ultimoElo = await this.trx('tab_auditoria_ledger')
                    .where(function () { this.where('documento_id', documento.id).orWhere('solicitacao_id', solicitacaoVinculo.id) })
                    .where('deletado', false)
                    .orderBy('sequencia', 'desc')
                    .first();
                const sequenciaAplicada = ultimoElo ? Number(ultimoElo.sequencia) + 1 : eventoAuditoria.assinatura_aplicada.sequencia;
                const sequenciaFolha = sequenciaAplicada + 1;
                const sequenciaSelo = sequenciaFolha + 1;
                elosPrevistos = {
                    assinatura: {
                        sequencia: sequenciaAplicada,
                        tipo_evento: eventoAuditoria.assinatura_aplicada.label,
                        objeto_tipo: objetoAuditoria.signatario,
                        objeto_id: signatarioTravado.id,
                        hash_documento_inicial: hashAntesEstampa,
                        hash_documento_final: hashAposEstampa,
                        hash_registro_anterior: ultimoElo ? ultimoElo.hash_atual : null,
                    },
                    folha: {
                        sequencia: sequenciaFolha,
                        tipo_evento: eventoAuditoria.folha_auditoria_gerada.label,
                        objeto_tipo: objetoAuditoria.documento,
                        objeto_id: documento.id,
                        hash_documento_inicial: hashAposEstampa,
                        hash_documento_final: null,
                    },
                    selo: {
                        sequencia: sequenciaSelo,
                        tipo_evento: eventoAuditoria.documento_selado.label,
                        objeto_tipo: objetoAuditoria.documento,
                        objeto_id: documento.id,
                        hash_documento_inicial: null,
                        hash_documento_final: null,
                    },
                };
                const signatariosNomes = await this.trx('tab_signatarios')
                    .select('tab_signatarios.id', 'tab_perfil_usuario.nome', 'tab_perfil_usuario.nome as perfil_nome')
                    .leftJoin('tab_perfil_usuario', 'tab_perfil_usuario.id', 'tab_signatarios.perfil_id')
                    .where('tab_signatarios.documento_id', documento.id)
                    .andWhere('tab_signatarios.deletado', false);
                const mapaNomeSignatario = {};
                for (const s of signatariosNomes) {
                    mapaNomeSignatario[s.id] = s.nome || s.perfil_nome || null;
                }
                const perfilSolicitante = await this.trx('tab_perfil_usuario')
                    .select('nome')
                    .where('user_id', solicitacaoVinculo.user_id)
                    .andWhere('deletado', false)
                    .first();
                const nomeSolicitante = perfilSolicitante ? perfilSolicitante.nome : null;

                const trilhaRows = await this.trx('tab_auditoria_ledger')
                    .select('sequencia', 'tipo_evento', 'objeto_tipo', 'objeto_id', 'criado_em', 'hash_documento_final', 'desafio_acesso_id', 'metadata_json')
                    .where(function () { this.where('documento_id', documento.id).orWhere('solicitacao_id', solicitacaoVinculo.id) })
                    .where('deletado', false)
                    .orderBy('sequencia', 'asc');

                // IP/porta lógica de cada ação de signatário fica em tab_desafio_autenticacao, referenciado
                // pelo desafio_acesso_id da linha do ledger (ou pelo desafio da assinatura atual, ainda não
                // gravada no ledger nesse ponto). Busca em lote pra não fazer 1 select por elo da trilha.
                const desafioIdAtual = payload.desafio_id || signatarioTravado.desafio_acesso_id || null;
                const desafioIds = [...new Set([...trilhaRows.map((e) => e.desafio_acesso_id), desafioIdAtual].filter(Boolean))];
                const mapaDesafioAcesso = {};
                if (desafioIds.length > 0) {
                    const desafiosAcesso = await this.trx('tab_desafio_autenticacao')
                        .select('id', 'solicitacao_ip', 'solicitacao_porta_logica', 'confirmacao_ip', 'confirmacao_porta_logica')
                        .whereIn('id', desafioIds);
                    for (const d of desafiosAcesso) {
                        mapaDesafioAcesso[d.id] = {
                            ip: d.confirmacao_ip || d.solicitacao_ip || null,
                            porta_logica: d.confirmacao_porta_logica || d.solicitacao_porta_logica || null,
                        };
                    }
                }

                const tiposEloSignatario = [
                    objetoAuditoria.aceite_termo,
                    objetoAuditoria.desafio_autenticacao,
                    objetoAuditoria.identificacao_biometrica,
                    objetoAuditoria.evento,
                ];
                const trilha = [];
                let jaMarcouPrimeiraSolicitacao = false;
                for (const elo of trilhaRows) {
                    let nome = null;
                    let acesso = null;
                    let meta = elo.metadata_json;
                    if (typeof meta === 'string') {
                        try { meta = JSON.parse(meta); } catch (_) { meta = null; }
                    }
                    const signatarioIdMeta = meta && meta.signatario_id ? meta.signatario_id : null;
                    if (elo.objeto_tipo === objetoAuditoria.signatario) {
                        nome = mapaNomeSignatario[elo.objeto_id] || null;
                        acesso = mapaDesafioAcesso[elo.desafio_acesso_id] || null;
                    } else if (tiposEloSignatario.includes(elo.objeto_tipo) && signatarioIdMeta) {
                        // Aceite / sessão / biometria / estampa: objeto_id não é o signatário,
                        // mas o meta_data carrega signatario_id — anexa o nome na trilha.
                        nome = mapaNomeSignatario[signatarioIdMeta] || null;
                        acesso = mapaDesafioAcesso[elo.desafio_acesso_id] || null;
                    } else if (elo.objeto_tipo === objetoAuditoria.solicitacao && !jaMarcouPrimeiraSolicitacao) {
                        nome = nomeSolicitante;
                        jaMarcouPrimeiraSolicitacao = true;
                    }
                    trilha.push({
                        sequencia: elo.sequencia,
                        tipo_evento: elo.tipo_evento,
                        objeto_tipo: elo.objeto_tipo,
                        objeto_id: elo.objeto_id,
                        criado_em: elo.criado_em,
                        hash_documento_final: elo.hash_documento_final,
                        nome,
                        ip: acesso ? acesso.ip : null,
                        porta_logica: acesso ? acesso.porta_logica : null,
                    });
                }
                let nomeAssinatura = null;
                let acessoAssinatura = null;
                if (elosPrevistos.assinatura.objeto_tipo === objetoAuditoria.signatario) {
                    nomeAssinatura = mapaNomeSignatario[elosPrevistos.assinatura.objeto_id] || null;
                    acessoAssinatura = mapaDesafioAcesso[desafioIdAtual] || null;
                } else if (elosPrevistos.assinatura.objeto_tipo === objetoAuditoria.solicitacao && !jaMarcouPrimeiraSolicitacao) {
                    nomeAssinatura = nomeSolicitante;
                    jaMarcouPrimeiraSolicitacao = true;
                }
                trilha.push({
                    sequencia: elosPrevistos.assinatura.sequencia,
                    tipo_evento: elosPrevistos.assinatura.tipo_evento,
                    objeto_tipo: elosPrevistos.assinatura.objeto_tipo,
                    objeto_id: elosPrevistos.assinatura.objeto_id,
                    criado_em: assinadoEm,
                    hash_documento_final: elosPrevistos.assinatura.hash_documento_final,
                    nome: nomeAssinatura,
                    ip: acessoAssinatura ? acessoAssinatura.ip : null,
                    porta_logica: acessoAssinatura ? acessoAssinatura.porta_logica : null,
                });
                let nomeFolha = null;
                if (elosPrevistos.folha.objeto_tipo === objetoAuditoria.signatario) {
                    nomeFolha = mapaNomeSignatario[elosPrevistos.folha.objeto_id] || null;
                } else if (elosPrevistos.folha.objeto_tipo === objetoAuditoria.solicitacao && !jaMarcouPrimeiraSolicitacao) {
                    nomeFolha = nomeSolicitante;
                    jaMarcouPrimeiraSolicitacao = true;
                }
                trilha.push({
                    sequencia: elosPrevistos.folha.sequencia,
                    tipo_evento: elosPrevistos.folha.tipo_evento,
                    objeto_tipo: elosPrevistos.folha.objeto_tipo,
                    objeto_id: elosPrevistos.folha.objeto_id,
                    criado_em: assinadoEm,
                    hash_documento_final: null,
                    nome: nomeFolha,
                });
                let nomeSelo = null;
                if (elosPrevistos.selo.objeto_tipo === objetoAuditoria.signatario) {
                    nomeSelo = mapaNomeSignatario[elosPrevistos.selo.objeto_id] || null;
                } else if (elosPrevistos.selo.objeto_tipo === objetoAuditoria.solicitacao && !jaMarcouPrimeiraSolicitacao) {
                    nomeSelo = nomeSolicitante;
                    jaMarcouPrimeiraSolicitacao = true;
                }
                trilha.push({
                    sequencia: elosPrevistos.selo.sequencia,
                    tipo_evento: elosPrevistos.selo.tipo_evento,
                    objeto_tipo: elosPrevistos.selo.objeto_tipo,
                    objeto_id: elosPrevistos.selo.objeto_id,
                    criado_em: assinadoEm,
                    hash_documento_final: null,
                    nome: nomeSelo,
                });
                pdfBytes = await adicionarFolhaAuditoria({
                    pdfBytes,
                    documento,
                    codigoVerificacao,
                    signatarios: resumoSignatarios,
                    urlVerificacao,
                    trilha,
                });
                hashAposFolha = crypto.createHash('sha256').update(pdfBytes).digest('hex');
                elosPrevistos.folha.hash_documento_final = hashAposFolha;
                elosPrevistos.selo.hash_documento_inicial = hashAposFolha;
                const selado = await aplicarSeloPlataforma({ pdfBytes });
                pdfBytes = selado.pdfBuffer;
                carimboSelo = selado.carimbo;
                this.hashPdf = crypto.createHash('sha256').update(pdfBytes).digest('hex');
                elosPrevistos.selo.hash_documento_final = this.hashPdf;
            }

            const upload = await bucketGateway.Wip().salvarArquivo({
                objectName,
                fileStream: pdfBytes,
                size: pdfBytes.length,
                contentType: 'application/pdf',
            });
            if (!upload.status) return await this.#finalizarComRetentativa(upload.msg, signatario);

            const persistencia = await this.#persistir({
                payload,
                signatario: signatarioTravado,
                documento,
                solicitacao_id: solicitacaoVinculo.id,
                solicitante_user_id: solicitacaoVinculo.user_id || null,
                objectName,
                carimbo: this.#carimboLeve(carimboSignatario.data),
                carimbo_selo: this.#carimboLeve(carimboSelo),
                assinado_em: assinadoEm,
                hash_documento_inicial: hashAntesEstampa,
                hash_apos_estampa: hashAposEstampa,
                hash_apos_folha: hashAposFolha,
                elosPrevistos,
            });
            if (!persistencia.status) return await this.#finalizarComRetentativa(persistencia.msg, signatario);

            if (persistencia.proximosNotificar?.length > 0) {
                await this.#notificarProximosSignatarios(persistencia.proximosNotificar);
            }

            if (persistencia.documentoFinalizado) {
                await this.#dispatchSelarDocumentoVault({
                    documento_id: documento.id,
                    user_id: payload.user_id || signatarioTravado.user_id,
                });
                await this.#dispatchEnviarDocumentoAssinado({
                    documento_id: documento.id,
                    solicitante_user_id: solicitacaoVinculo.user_id || null,
                });
            }

            await this.#finalizarComSucesso(`Assinatura aplicada para signatário ${signatario.id}`);
        } catch (err) {
            console.log(err);
            logs.getInstance().error({ err }, 'Erro ao processar AplicarAssinatura');
            await this.#finalizarComRetentativa(err.message, signatario);
        }
    }

    async #notificarProximosSignatarios(proximos) {
        try {
            const dispatcher = new MessageDispatcher(this.#rabbitmq, []);
            for (const item of proximos) {
                if (!item.solicitante_user_id) continue;
                dispatcher.addItem({
                    exchange: rabbitMQ.queues.distribuirconvitesignatario.exchange,
                    routingKey: rabbitMQ.queues.distribuirconvitesignatario.routingKey,
                    jsonMessage: item,
                    delayMs: rabbitMQ.defaultDelay,
                });
            }
            await dispatcher.dispatch();
        } catch (error) {
            logs.getInstance().error({ err: error }, 'Falha ao notificar próximo(s) signatário(s) da ordem');
        }
    }

    // Selagem WORM do Vault é assíncrona e independente da assinatura já commitada — falha aqui
    // não desfaz nada, só loga (pode ser reenfileirado manualmente depois).
    async #dispatchSelarDocumentoVault({ documento_id, user_id }) {
        try {
            const dispatcher = new MessageDispatcher(this.#rabbitmq, []);
            dispatcher.addItem({
                exchange: rabbitMQ.queues.selardocumentovault.exchange,
                routingKey: rabbitMQ.queues.selardocumentovault.routingKey,
                jsonMessage: { documento_id, user_id },
                delayMs: rabbitMQ.defaultDelay,
            });
            await dispatcher.dispatch();
        } catch (error) {
            logs.getInstance().error({ err: error }, 'Falha ao publicar selardocumentovault após finalizar assinatura');
        }
    }

    // E-mail do PDF final a todos os signatários — só após commit, nunca dentro da trx.
    async #dispatchEnviarDocumentoAssinado({ documento_id, solicitante_user_id }) {
        try {
            const dispatcher = new MessageDispatcher(this.#rabbitmq, []);
            dispatcher.addItem({
                exchange: rabbitMQ.queues.enviardocumentoassinadosignatarios.exchange,
                routingKey: rabbitMQ.queues.enviardocumentoassinadosignatarios.routingKey,
                jsonMessage: { documento_id, solicitante_user_id },
                delayMs: rabbitMQ.defaultDelay,
            });
            await dispatcher.dispatch();
        } catch (error) {
            logs.getInstance().error({ err: error, documento_id }, 'Falha ao enfileirar envio do PDF assinado aos signatários');
        }
    }

    #lerPayload() {
        try {
            const envelope = parseBrokerMessageEnvelope(this.#rabbitmq.broker.message);
            const payload = envelope.data || envelope;
            if (!payload.documento_id || !payload.signatario_id) return null;
            return payload;
        } catch (err) {
            logs.getInstance().error({ err }, 'Não foi possível interpretar a mensagem do AplicarAssinatura');
            return null;
        }
    }

    // Resumo da trilha de cada signatário para a folha de auditoria (só o essencial: quem, quando, 2FA,
    // biometria, código de verificação). Não é a linha do tempo completa nem carrega hashes/CMS.
    async #montarResumoSignatarios({ trx, documento, signatarioAtualId, assinadoEmAtual }) {
        const sha = new SHA(process.env.SHA);
        const signatarios = await trx('tab_signatarios')
            .select('tab_signatarios.*', 'tab_perfil_usuario.nome as perfil_nome', 'tab_perfil_usuario.cpf as perfil_cpf')
            .leftJoin('tab_perfil_usuario', 'tab_perfil_usuario.id', 'tab_signatarios.perfil_id')
            .where('tab_signatarios.documento_id', documento.id)
            .andWhere('tab_signatarios.deletado', false)
            .orderBy('tab_signatarios.data_criacao', 'asc');

        const resumo = [];
        for (const s of signatarios) {
            let cpfPlain = '';
            try { cpfPlain = s.perfil_cpf ? sha.decrypt(s.perfil_cpf) : ''; } catch (_) { cpfPlain = ''; }

            const efetivoStatus = s.id === signatarioAtualId ? statusSignatario.assinado : s.status;
            const efetivoAssinadoEm = s.id === signatarioAtualId ? assinadoEmAtual : s.assinado_em;

            let confirmacao2fa = null;
            if (s.desafio_acesso_id) {
                const desafio = await trx('tab_desafio_autenticacao')
                    .select('tipo_desafio', 'usado', 'consumido_em')
                    .where('id', s.desafio_acesso_id)
                    .first();
                if (desafio) {
                    confirmacao2fa = {
                        tipo_desafio: desafio.tipo_desafio,
                        confirmado: Boolean(desafio.usado),
                        confirmado_em: desafio.consumido_em || null,
                    };
                }
            }

            const identificacao = await trx('tab_identificacao_biometrica')
                .select('status', 'data_atualizacao')
                .where('signatario_id', s.id)
                .andWhere('deletado', false)
                .orderBy('data_atualizacao', 'desc')
                .first();

            let biometria_folha = 'não validado';
            if (identificacao) {
                biometria_folha = Number(identificacao.status) === statusBiometriaAssinatura.validado ? 'validado' : 'não validado';
            } else if (!assinaturaSessao.biometriaObrigatoria) {
                biometria_folha = 'não exigido';
            }

            resumo.push({
                nome: s.nome || s.perfil_nome || '',
                cpf_mascarado: mascararCpf(cpfPlain),
                status: efetivoStatus,
                assinado_em: efetivoAssinadoEm,
                confirmacao_2fa: confirmacao2fa,
                biometria_validada: identificacao ? Number(identificacao.status) === statusBiometriaAssinatura.validado : false,
                biometria_folha,
            });
        }
        return resumo;
    }

    // Remove o cms_base64 do carimbo antes de gravar em metadata_json (prova completa fica no vault).
    #carimboLeve(carimbo) {
        if (!carimbo) return null;
        return {
            worker: carimbo.worker || null,
            algoritmo: carimbo.algoritmo || null,
            hash_carimbado: carimbo.hash_carimbado || null,
            archive_id: carimbo.archive_id || null,
            request_id: carimbo.request_id || null,
            carimbado_em: carimbo.carimbado_em || null,
        };
    }

    async #persistir({ payload, signatario, documento, solicitacao_id, solicitante_user_id, objectName, carimbo, carimbo_selo, assinado_em, hash_documento_inicial, hash_apos_estampa, hash_apos_folha, elosPrevistos }) {
        try {
            const trx = this.trx;
            const oldSignatario = { ...signatario };
            const novoSignatarioEstado = {
                ...signatario,
                status: statusSignatario.assinado,
                assinado_em,
                hash_pdf_apos: this.hashPdf,
                data_atualizacao: dateNow(),
            };
            await trx('tab_signatarios').update({
                status: novoSignatarioEstado.status,
                assinado_em: novoSignatarioEstado.assinado_em,
                hash_pdf_apos: novoSignatarioEstado.hash_pdf_apos,
                data_atualizacao: novoSignatarioEstado.data_atualizacao,
            }).where('id', signatario.id);
            const ultimaLedgerSignatario = await trx('tab_auditoria_ledger_signatario')
                .where('signatario_id', signatario.id)
                .where('deletado', false)
                .orderBy('sequencia', 'desc')
                .first();
            const sequenciaSignatario = ultimaLedgerSignatario
                ? Number(ultimaLedgerSignatario.sequencia) + 1
                : eventoAuditoria.signatario_assinado.sequencia;
            const auditoriaSignatario = new LedgerSignatario(trx);
            auditoriaSignatario.Initialize(oldSignatario);
            await auditoriaSignatario.GravarAuditoriaModificacao({
                signatario: novoSignatarioEstado,
                tipo_evento: eventoAuditoria.signatario_assinado.label,
                sequencia: sequenciaSignatario,
                meta_data: {
                    documento_id: documento.id,
                    hash_pdf: this.hashPdf,
                    object_name: objectName,
                    carimbo: carimbo || null,
                },
                user_id: payload.user_id || signatario.user_id,
            });

            const ultimaLedgerDocumento = await trx('tab_auditoria_ledger_documento')
                .where('documento_id', documento.id)
                .where('deletado', false)
                .orderBy('sequencia', 'desc')
                .first();
            const sequenciaDocumento = ultimaLedgerDocumento
                ? Number(ultimaLedgerDocumento.sequencia) + 1
                : eventoAuditoria.documento_estampa_aplicada.sequencia;
            const oldDocumento = { ...documento };
            const auditoriaDocumento = new LedgerDocumento(trx);
            auditoriaDocumento.Initialize(oldDocumento);
            await auditoriaDocumento.GravarAuditoriaModificacao({
                documento: { ...documento },
                tipo_evento: eventoAuditoria.documento_estampa_aplicada.label,
                sequencia: sequenciaDocumento,
                meta_data: {
                    signatario_id: signatario.id,
                    hash_pdf: this.hashPdf,
                    object_name: objectName,
                    carimbo: carimbo || null,
                },
                user_id: payload.user_id || signatario.user_id,
            });

            const pendentes = await trx('tab_signatarios')
                .where('documento_id', documento.id)
                .andWhere('deletado', false)
                .whereNotIn('status', [statusSignatario.assinado])
                .count({ total: 'id' })
                .first();

            const todosAssinaram = Number(pendentes.total) === 0;
            const documentoAposEstampa = { ...documento };
            let novoDocumentoEstado = { ...documento };
            if (todosAssinaram) {
                const ultimaLedgerDocumentoFinal = await trx('tab_auditoria_ledger_documento')
                    .where('documento_id', documento.id)
                    .where('deletado', false)
                    .orderBy('sequencia', 'desc')
                    .first();
                const sequenciaDocumentoFinal = ultimaLedgerDocumentoFinal
                    ? Number(ultimaLedgerDocumentoFinal.sequencia) + 1
                    : eventoAuditoria.documento_assinatura_finalizada.sequencia;
                novoDocumentoEstado = {
                    ...documento,
                    status: statusDocumentos.documento_assinado,
                    hash_final: this.hashPdf,
                    hash_final_em: dateNow(),
                };
                auditoriaDocumento.Initialize(documentoAposEstampa);
                await auditoriaDocumento.GravarAuditoriaModificacao({
                    documento: novoDocumentoEstado,
                    tipo_evento: eventoAuditoria.documento_assinatura_finalizada.label,
                    sequencia: sequenciaDocumentoFinal,
                    meta_data: {
                        hash_final: this.hashPdf,
                        signatario_id: signatario.id,
                        carimbo_selo: carimbo_selo || null,
                    },
                    documento_update: {
                        status: novoDocumentoEstado.status,
                        hash_final: novoDocumentoEstado.hash_final,
                        hash_final_em: novoDocumentoEstado.hash_final_em,
                    },
                    user_id: payload.user_id || signatario.user_id,
                });
            }

            let proximosNotificar = [];
            if (signatario.ordem != null) {
                const proximos = await trx('tab_signatarios')
                    .select('*')
                    .where('documento_id', documento.id)
                    .andWhere('deletado', false)
                    .whereNotNull('ordem')
                    .andWhere('ordem', '>', signatario.ordem)
                    .whereNotIn('status', [statusSignatario.assinado])
                    .orderBy('ordem', 'asc');
                if (proximos.length > 0) {
                    const menorOrdem = proximos[0].ordem;
                    proximosNotificar = proximos.filter((s) => s.ordem === menorOrdem && s.user_id);
                }
            }
            const solicitanteUserId = solicitante_user_id || null;

            const ultimoElo = await trx('tab_auditoria_ledger')
                .where(function () { this.where('documento_id', documento.id).orWhere('solicitacao_id', solicitacao_id) })
                .where('deletado', false)
                .orderBy('sequencia', 'desc')
                .first();

            const sequenciaAplicada = elosPrevistos
                ? elosPrevistos.assinatura.sequencia
                : (ultimoElo ? Number(ultimoElo.sequencia) + 1 : eventoAuditoria.assinatura_aplicada.sequencia);
            const metadata = {
                signatario_id: signatario.id,
                user_id: payload.user_id || signatario.user_id,
                modo: signatario.modo_visual || payload.modo,
                object_name: objectName,
                hash_pdf: hash_apos_estampa,
                carimbo: carimbo || null,
                documento_assinado: todosAssinaram,
            };

            const auditoriaDocumentoPdf = new LedgerDocumentoPdf(trx);
            const ledgerAssinatura = await auditoriaDocumentoPdf.GravarEvento({
                solicitacao_id,
                documento_id: documento.id,
                objeto_tipo: objetoAuditoria.signatario,
                objeto_id: signatario.id,
                objeto: novoSignatarioEstado,
                objeto_anterior: oldSignatario,
                desafio_acesso_id: payload.desafio_id || signatario.desafio_acesso_id || null,
                tipo_evento: eventoAuditoria.assinatura_aplicada.label,
                sequencia: sequenciaAplicada,
                meta_data: metadata,
                hash_documento_inicial,
                hash_documento_final: hash_apos_estampa,
                hash_registro_anterior: ultimoElo ? ultimoElo.hash_atual : null,
                user_id: payload.user_id || signatario.user_id,
            });

            if (todosAssinaram) {
                const hashFolhaFinal = (elosPrevistos && elosPrevistos.folha.hash_documento_final)
                    ? elosPrevistos.folha.hash_documento_final
                    : (hash_apos_folha || hash_apos_estampa);
                const sequenciaFolha = elosPrevistos
                    ? elosPrevistos.folha.sequencia
                    : sequenciaAplicada + 1;
                const documentoAposFolha = { ...documentoAposEstampa };
                await auditoriaDocumentoPdf.GravarEvento({
                    solicitacao_id,
                    documento_id: documento.id,
                    objeto_tipo: objetoAuditoria.documento,
                    objeto_id: documento.id,
                    objeto: documentoAposFolha,
                    objeto_anterior: documentoAposEstampa,
                    desafio_acesso_id: payload.desafio_id || signatario.desafio_acesso_id || null,
                    tipo_evento: eventoAuditoria.folha_auditoria_gerada.label,
                    sequencia: sequenciaFolha,
                    meta_data: {
                        documento_id: documento.id,
                        signatario_id: signatario.id,
                    },
                    hash_documento_inicial: hash_apos_estampa,
                    hash_documento_final: hashFolhaFinal,
                    hash_registro_anterior: ledgerAssinatura.hash_atual,
                    user_id: payload.user_id || signatario.user_id,
                });

                const sequenciaSelo = elosPrevistos
                    ? elosPrevistos.selo.sequencia
                    : sequenciaFolha + 1;
                const hashSeloFinal = (elosPrevistos && elosPrevistos.selo.hash_documento_final)
                    ? elosPrevistos.selo.hash_documento_final
                    : this.hashPdf;
                const eloFolha = await trx('tab_auditoria_ledger')
                    .where(function () { this.where('documento_id', documento.id).orWhere('solicitacao_id', solicitacao_id) })
                    .where('deletado', false)
                    .orderBy('sequencia', 'desc')
                    .first();
                await auditoriaDocumentoPdf.GravarEvento({
                    solicitacao_id,
                    documento_id: documento.id,
                    objeto_tipo: objetoAuditoria.documento,
                    objeto_id: documento.id,
                    objeto: novoDocumentoEstado,
                    objeto_anterior: documentoAposFolha,
                    desafio_acesso_id: payload.desafio_id || signatario.desafio_acesso_id || null,
                    tipo_evento: eventoAuditoria.documento_selado.label,
                    sequencia: sequenciaSelo,
                    meta_data: {
                        documento_id: documento.id,
                        hash_final: hashSeloFinal,
                        carimbo_selo: carimbo_selo || null,
                    },
                    hash_documento_inicial: hashFolhaFinal,
                    hash_documento_final: hashSeloFinal,
                    hash_registro_anterior: eloFolha ? eloFolha.hash_atual : ledgerAssinatura.hash_atual,
                    user_id: payload.user_id || signatario.user_id,
                });
            }

            await trx.commit();
            this.trx = null;
            return {
                status: true,
                msg: 'Assinatura persistida com sucesso',
                documentoFinalizado: todosAssinaram,
                proximosNotificar: proximosNotificar.map((s) => ({
                    tipo: 'convite',
                    signatario_id: s.id,
                    documento_id: documento.id,
                    solicitacao_id,
                    email: s.email,
                    nome: s.nome,
                    solicitante_user_id: solicitanteUserId,
                    destinatario_user_id: s.user_id,
                })),
            };
        } catch (error) {
            await this.#rollbackTrx();
            logs.getInstance().error({ err: error }, 'Erro ao persistir a assinatura do documento');
            if (error?.name === 'ErrorLedgerDocumentoPdf'
                || error?.name === 'ErrorLedgerSignatario'
                || error?.name === 'ErrorLedgerDocumento') {
                return { status: false, msg: 'Ocorreu um erro interno de auditoria, tente novamente em instantes.' }
            }
            return { status: false, msg: 'Ocorreu um erro interno, tente novamente em instantes.' }
        }
    }

    async #finalizarComSucesso(msg) {
        this.status = true;
        this.reprocessar = false;
        this.#metaDados.tentativas = 0;
        logs.getInstance().info({ hash: this.hashPdf }, msg);
        await this.#salvarBroker(statusBroker.processed);
    }

    async #finalizarSemRetentativa(msg) {
        this.status = false;
        this.reprocessar = false;
        await this.#rollbackTrx();
        logs.getInstance().error({ meta_dados: this.#metaDados }, `AplicarAssinatura descartado: ${msg}`);
        await this.#salvarBroker(statusBroker.failedNotRetry);
    }

    async #finalizarComRetentativa(msg, signatario = null) {
        this.status = false;
        this.#metaDados.tentativas += 1;
        this.reprocessar = this.#metaDados.tentativas <= maxRetryReprocessBroker;
        this.delayMs = rabbitMQ.defaultDelay * Math.pow(2, this.#metaDados.tentativas);
        await this.#rollbackTrx();
        logs.getInstance().error({ tentativas: this.#metaDados.tentativas }, `Falha no AplicarAssinatura: ${msg}`);
        if (!this.reprocessar && signatario) await this.#registrarFalhaNoSignatario(signatario, msg);
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

    async #registrarFalhaNoSignatario(signatario, msg) {
        const trx = await this.#knex.transaction();
        try {
            const signatarioTravado = await trx('tab_signatarios')
                .select('*')
                .where('id', signatario.id)
                .andWhere('status', statusSignatario.processando)
                .forUpdate()
                .first();
            if (!signatarioTravado) {
                await trx.rollback();
                return;
            }
            const oldSignatario = { ...signatarioTravado };
            const novoSignatarioEstado = {
                ...signatarioTravado,
                status: statusSignatario.erro,
                data_atualizacao: dateNow(),
            };
            await trx('tab_signatarios').update({
                status: novoSignatarioEstado.status,
                data_atualizacao: novoSignatarioEstado.data_atualizacao,
            }).where('id', signatario.id);
            const ultimaLedgerSignatario = await trx('tab_auditoria_ledger_signatario')
                .where('signatario_id', signatario.id)
                .where('deletado', false)
                .orderBy('sequencia', 'desc')
                .first();
            const sequenciaSignatario = ultimaLedgerSignatario
                ? Number(ultimaLedgerSignatario.sequencia) + 1
                : eventoAuditoria.signatario_erro.sequencia;
            const auditoriaSignatario = new LedgerSignatario(trx);
            auditoriaSignatario.Initialize(oldSignatario);
            await auditoriaSignatario.GravarAuditoriaModificacao({
                signatario: novoSignatarioEstado,
                tipo_evento: eventoAuditoria.signatario_erro.label,
                sequencia: sequenciaSignatario,
                meta_data: { erro_msg: String(msg).substring(0, 500) },
                user_id: signatario.user_id,
            });
            await trx.commit();
            logs.getInstance().error({ signatario_id: signatario.id, msg }, 'Signatário marcado com ERROR após falhas esgotadas');
        } catch (error) {
            await trx.rollback();
            logs.getInstance().error({ err: error }, 'Erro ao registrar falha no signatário');
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
            logs.getInstance().error({ err: error }, 'Erro ao salvar o broker do AplicarAssinatura');
        }
    }

}

module.exports = AplicarAssinatura;
