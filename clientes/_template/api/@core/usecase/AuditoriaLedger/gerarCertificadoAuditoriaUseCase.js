
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const forge = require('node-forge');
const JsZip = require('jszip');
const knex = require('../../../infrastructure/db/config/databaseConection')();
const dateNow = require('../../../infrastructure/gateways/functions/data/getToday');
const bucketGateway = require('../../../infrastructure/gateways/Bucket');
const { SHA } = require('../../../infrastructure/gateways/crypt/sha');
const { streamToBuffer, parseJsonField, mascararCpf } = require('../../../infrastructure/gateways/PdfSign/aplicarAssinaturaPdf');
const documentoVerificacaoRepository = require('../../../infrastructure/db/services/DocumentoVerificacaoRepository');
const { validarCodigoVerificacao } = require('../../../infrastructure/gateways/functions/documentoVerificacao');
const logs = require('../../../Logs');
const { eventoAuditoria, objetoAuditoria, statusDocumentos, statusAplication, statusApp } = require('../../../certs/index');

// Cadeia ICP-Brasil (AC Raiz + intermediárias) usada só pelo #verificarProfundo para fechar a cadeia
// X.509 do certificado do carimbo contra os PEMs oficiais em api/certs/icp-brasil/. Se a pasta vier vazia
// (PEM não baixado no ambiente), a checagem fica indisponível — nunca derruba o veredito_geral por isso.
const diretorioIcpBrasil = path.join(__dirname, '../../../certs/icp-brasil');
let caStoreIcpBrasil = null;
try {
    const pems = fs.readdirSync(diretorioIcpBrasil)
        .filter((nome) => nome.toLowerCase().endsWith('.pem'))
        .map((nome) => fs.readFileSync(path.join(diretorioIcpBrasil, nome), 'utf8'));
    if (pems.length > 0) caStoreIcpBrasil = forge.pki.createCaStore(pems);
} catch (_) {
    caStoreIcpBrasil = null;
}

// Valores oficiais da PA_AD_RB baseada em PAdES v1.3 (IN ITI nº 34/2025), reconfirmados ao vivo na L3.1, e
// OID do atributo assinado id-aa-ets-sigPolicyId (RFC 5126/ETSI, DOC-ICP-15.03) — usados só pelo
// #verificarProfundo para comparar o que vier (se vier) do CMS. Nunca preenchem um valor que o CMS não trouxer.
const oidAtributoPoliticaAssinatura = '1.2.840.113549.1.9.16.2.15';
const oidQualificadorUriPoliticaAssinatura = '1.2.840.113549.1.9.16.5.1';
const oidPoliticaAdRbPadesVigente = '2.16.76.1.7.1.11.1.3';
const uriPoliticaAdRbPadesVigente = 'http://politicas.icpbrasil.gov.br/PA_PAdES_AD_RB_v1_3.der';
const hashPoliticaAdRbPadesVigente = '23e4be4b9b362172e4ebb0e72b86a133ece5aad843d8651c6e38a0ba3f08fc60';

const domainAuditoriaLedger = require('../../domain/AuditoriaLedger');
const domainAuditoriaLedgerDocumento = require('../../domain/AuditoriaLedgerDocumento');
const domainAuditoriaLedgerSolicitacao = require('../../domain/AuditoriaLedgerSolicitacao');
const domainAuditoriaLedgerSignatario = require('../../domain/AuditoriaLedgerSignatario');
const domainAuditoriaLedgerDemarcacao = require('../../domain/AuditoriaLedgerDemarcacao');
const domainAuditoriaLedgerEvento = require('../../domain/AuditoriaLedgerEvento');
const domainAuditoriaLedgerDesafioAutenticacao = require('../../domain/AuditoriaLedgerDesafioAutenticacao');

/**
 * Agrega e verifica (matematicamente) toda a trilha de auditoria selada de um documento: PDF, dados do
 * documento, solicitação, signatários, demarcações, eventos e os desafios de autenticação (2FA) usados
 * para acessar/assinar. Não altera nada relacionado à assinatura CAdES já aplicada ao PDF — é uma leitura
 * agregada e uma reconferência das provas já seladas.
 */
class GerarCertificadoAuditoriaUseCase {

    async executar({ codigo_verificacao, documento_id, verificacao_profunda = true }) {
        try {
            if (!codigo_verificacao && !documento_id) {
                return { status: false, msg: 'Informe codigo_verificacao ou documento_id.' };
            }

            const resolucao = await this.#resolverDocumento({ codigo_verificacao, documento_id });
            if (!resolucao.status) return resolucao;
            const { documento, registroVerificacao } = resolucao.data;

            const { trilhas, signatarios, mapaNomeSignatario, nomeSolicitante } = await this.#coletarTrilhas(documento);

            const tiposEloSignatario = [
                objetoAuditoria.aceite_termo,
                objetoAuditoria.desafio_autenticacao,
                objetoAuditoria.identificacao_biometrica,
                objetoAuditoria.evento,
            ];

            const linhaDoTempo = [];
            const trilhaAssinatura = [];
            for (const trilha of trilhas) {
                const verificacaoEstrutural = this.#verificarEstrutural(trilha.registros, trilha.DomainClass);
                for (let i = 0; i < trilha.registros.length; i++) {
                    const registro = trilha.registros[i];
                    const meta = parseJsonField(registro.metadata_json);
                    const ancorado = Boolean(meta?.ancorado_em || meta?.hash_atual_pre_ancoragem);
                    // Nome do signatário: só resolvido para a trilha compartilhada do PDF (documento_pdf),
                    // onde registros de signatário/aceite/2FA/biometria/evento se misturam sem nome embutido
                    // (as demais trilhas já carregam o nome no próprio trilha.nome).
                    let nome = null;
                    if (trilha.nome === 'documento_pdf') {
                        if (registro.objeto_tipo === objetoAuditoria.signatario) {
                            nome = mapaNomeSignatario[registro.objeto_id] || null;
                        } else if (tiposEloSignatario.includes(registro.objeto_tipo) && meta?.signatario_id) {
                            nome = mapaNomeSignatario[meta.signatario_id] || null;
                        } else if (registro.objeto_tipo === objetoAuditoria.solicitacao) {
                            nome = nomeSolicitante;
                        }
                    }
                    const item = {
                        trilha: trilha.nome,
                        referencia: trilha.referencia,
                        tipo_evento: registro.tipo_evento,
                        sequencia: registro.sequencia,
                        criado_em: registro.criado_em,
                        hash_atual: registro.hash_atual,
                        hash_registro_anterior: registro.hash_registro_anterior,
                        bucket_path: registro.bucket_path,
                        object_name: registro.object_name,
                        payload_sha256: registro.payload_sha256,
                        genese: i === 0,
                        bootstrap_legado: Boolean(meta?.bootstrap_legado),
                        ancorado,
                        nome,
                        verificacao_estrutural: verificacaoEstrutural.detalhes[i],
                        verificacao_profunda: null,
                    };
                    if (verificacao_profunda) {
                        item.verificacao_profunda = await this.#verificarProfundo(registro);
                    }
                    linhaDoTempo.push(item);
                    if (trilha.nome === 'documento_pdf') {
                        trilhaAssinatura.push({
                            sequencia: registro.sequencia,
                            tipo_evento: registro.tipo_evento,
                            objeto_tipo: registro.objeto_tipo,
                            objeto_id: registro.objeto_id,
                            hash_objeto_inicial: registro.hash_objeto_inicial,
                            hash_objeto_final: registro.hash_objeto_final,
                            hash_documento_inicial: registro.hash_documento_inicial,
                            hash_documento_final: registro.hash_documento_final,
                            estado_estrutural: verificacaoEstrutural.detalhes[i],
                            ancorado,
                            nome,
                            criado_em: registro.criado_em,
                        });
                    }
                }
            }

            linhaDoTempo.sort((a, b) => new Date(a.criado_em) - new Date(b.criado_em));
            trilhaAssinatura.sort((a, b) => Number(a.sequencia) - Number(b.sequencia));

            let desvioUltimoElo = false;
            if (documento.status === statusDocumentos.documento_assinado) {
                const ultimoElo = trilhaAssinatura.length > 0 ? trilhaAssinatura[trilhaAssinatura.length - 1] : null;
                if (!ultimoElo || ultimoElo.tipo_evento !== eventoAuditoria.documento_selado.label) desvioUltimoElo = true;
            }

            const algumaTrilhaRompida = linhaDoTempo.some((i) => i.verificacao_estrutural === 'ROMPIDA');
            const algumaProfundaDivergente = linhaDoTempo.some((i) => i.verificacao_profunda && i.verificacao_profunda.payload_confere === false);
            const algumEloDivergente = trilhaAssinatura.some((i) => i.estado_estrutural === 'ROMPIDA' || i.estado_estrutural === 'DIVERGENTE_RECALCULO');
            const vereditoGeral = algumaTrilhaRompida || algumaProfundaDivergente || desvioUltimoElo || algumEloDivergente ? 'COMPROMETIDO' : 'INTEGRO';

            const ultimaCarimboAssinatura = this.#extrairUltimoCarimboAssinatura(trilhas);

            // Texto de politica_assinatura: honesto, nunca inventa OID. Reaproveita o politica_assinatura_cms
            // já calculado pelo #verificarProfundo (L3.3) para o elo DOCUMENTO_SELADO da trilha mestre (o
            // elo mais recente, mesmo worker CMSSignerCarimbo que sela o PDF) — sem recalcular CMS de novo aqui.
            const eloSeladoComProfunda = linhaDoTempo
                .filter((i) => i.trilha === 'documento_pdf' && i.tipo_evento === eventoAuditoria.documento_selado.label)
                .sort((a, b) => Number(b.sequencia) - Number(a.sequencia))[0] || null;
            const politicaAssinaturaCms = eloSeladoComProfunda?.verificacao_profunda?.politica_assinatura_cms || null;
            let politicaAssinaturaTexto = 'Verificação de política de assinatura requer verificação profunda — não executada nesta consulta.';
            if (verificacao_profunda) {
                politicaAssinaturaTexto = 'Política de assinatura ainda não incluída no CMS do selo desta assinatura (atributo id-aa-ets-sigPolicyId ausente) — signer de produção pendente de migração para PA_AD_RB PAdES v1.3.';
                if (politicaAssinaturaCms?.presente && politicaAssinaturaCms.oid_confere && politicaAssinaturaCms.hash_confere) {
                    politicaAssinaturaTexto = `PA_AD_RB baseada em PAdES v1.3 (OID ${politicaAssinaturaCms.oid}), conforme atributo assinado id-aa-ets-sigPolicyId no CMS. URI: ${politicaAssinaturaCms.uri || uriPoliticaAdRbPadesVigente}.`;
                } else if (politicaAssinaturaCms?.presente) {
                    politicaAssinaturaTexto = 'CMS traz atributo de política de assinatura, mas os valores não correspondem à PA_AD_RB PAdES vigente esperada — verificar manualmente.';
                }
            }

            // Bloco explícito de conferência de hash de documento: reaproveita hash_documento_inicial/final
            // já coletados por elo em trilhaAssinatura e o recomputo de calcularHashAtual() já feito em
            // #verificarEstrutural (estado_estrutural) — sem recalcular nada de novo aqui.
            const conferenciaDocumento = {
                hash_original: documento.hash_original,
                hash_final: documento.hash_final,
                elos: trilhaAssinatura.map((elo) => ({
                    sequencia: elo.sequencia,
                    tipo_evento: elo.tipo_evento,
                    hash_documento_inicial: elo.hash_documento_inicial,
                    hash_documento_final: elo.hash_documento_final,
                    recomputo_hash_atual: elo.estado_estrutural,
                })),
            };

            return {
                status: true,
                msg: 'Certificado de auditoria gerado com sucesso',
                data: {
                    documento: {
                        id: documento.id,
                        nome_documento: documento.nome_documento,
                        documento_nome: documento.documento_nome,
                        status: documento.status,
                        hash_original: documento.hash_original,
                        hash_final: documento.hash_final,
                        hash_final_em: documento.hash_final_em,
                        criado_em: documento.criado_em,
                    },
                    codigo_verificacao: registroVerificacao ? registroVerificacao.codigo_verificacao : null,
                    signatarios: this.#montarSignatarios(signatarios),
                    assinatura_criptografica: {
                        worker: ultimaCarimboAssinatura?.worker || null,
                        algoritmo: ultimaCarimboAssinatura?.algoritmo || null,
                        archive_id: ultimaCarimboAssinatura?.archive_id || null,
                        request_id: ultimaCarimboAssinatura?.request_id || null,
                        carimbado_em: ultimaCarimboAssinatura?.carimbado_em || null,
                        modelo: 'Assinaturas eletrônicas avançadas dos signatários (Lei nº 14.063/2020, art. 4º, II) comprovadas por esta trilha de auditoria + selo digital único da plataforma aplicado ao PDF final.',
                        politica_assinatura: politicaAssinaturaTexto,
                    },
                    total_eventos: linhaDoTempo.length,
                    linha_do_tempo: linhaDoTempo,
                    trilha_assinatura: trilhaAssinatura,
                    conferencia_documento: conferenciaDocumento,
                    ultimo_elo_selado: documento.status === statusDocumentos.documento_assinado ? !desvioUltimoElo : null,
                    veredito_geral: vereditoGeral,
                    limitacoes: [
                        'Verificação estrutural confirma o encadeamento hash_atual/hash_registro_anterior de cada trilha selada.',
                        'Verificação profunda (quando habilitada) recalcula o SHA-256 do payload extraído do ZIP no vault, valida estruturalmente o CMS do carimbo e fecha a cadeia de confiança X.509 do certificado do assinante contra os PEMs ICP-Brasil locais (api/certs/icp-brasil/); sem os PEMs configurados no ambiente ou fora de produção, o resultado fica só em cadeia_icp como observação, sem afetar o veredito_geral.',
                        'O CMS de cada elo (campo payload_sha256 na linha_do_tempo) assina o hash_atual daquele elo, prova guardada no vault — não é a mesma prova do CMS/PAdES que sela o PDF final; os hashes de documento por elo estão em conferencia_documento.',
                        'O PDF carrega um selo digital único da plataforma (certificado do SignServer); no validador oficial (validar.iti.gov.br) aparece a identificação da empresa, não os signatários — a prova de cada signatário é a estampa visual + esta trilha de auditoria.',
                    ],
                    gerado_em: dateNow(),
                },
            };
        } catch (error) {
            console.log(error);
            logs.getInstance().error({ err: error }, 'Erro ao gerar certificado de auditoria');
            return { status: false, msg: 'Ocorreu um erro interno, tente novamente em instantes.' };
        }
    }

    async #resolverDocumento({ codigo_verificacao, documento_id }) {
        let documento = null;
        let registroVerificacao = null;

        if (codigo_verificacao) {
            const busca = await documentoVerificacaoRepository.getByCodigo({ codigo_verificacao });
            if (!busca.status) return { status: false, msg: 'Erro ao buscar o código de verificação.' };
            if (!busca.exit) return { status: false, msg: 'Código de verificação não encontrado.' };
            registroVerificacao = busca.data;
            documento = await knex('tab_documentos').select('*').where('id', registroVerificacao.documento_id).first();
            if (!documento) return { status: false, msg: 'Documento não encontrado para este código de verificação.' };
            const valido = validarCodigoVerificacao({
                documento_id: documento.id,
                hash_original: documento.hash_original,
                codigo_verificacao,
            });
            if (!valido) return { status: false, msg: 'Código de verificação inconsistente com os dados atuais do documento (possível adulteração).' };
        } else {
            documento = await knex('tab_documentos').select('*').where('id', documento_id).first();
            if (!documento) return { status: false, msg: 'Documento não encontrado.' };
            const busca = await documentoVerificacaoRepository.getByDocumentoId({ documento_id: documento.id });
            if (!busca.status) return { status: false, msg: 'Ocorreu um erro interno, tente novamente em instantes.' };
            if (busca.exit) registroVerificacao = busca.data;
        }

        return { status: true, data: { documento, registroVerificacao } };
    }

    async #coletarTrilhas(documento) {
        const trilhas = [];

        const solicitacao = await knex('tab_solicitacao_documento').select('*').where('documento_id', documento.id).first();

        // Nome de quem praticou cada elo da trilha compartilhada documento_pdf: signatário via
        // tab_signatarios + fallback no nome do perfil, solicitante via tab_perfil_usuario pelo user_id
        // da solicitação (mesma técnica do worker AplicarAssinatura ao montar a folha de auditoria).
        const signatariosNomes = await knex('tab_signatarios')
            .select('tab_signatarios.id', 'tab_perfil_usuario.nome', 'tab_perfil_usuario.nome as perfil_nome')
            .leftJoin('tab_perfil_usuario', 'tab_perfil_usuario.id', 'tab_signatarios.perfil_id')
            .where('tab_signatarios.documento_id', documento.id)
            .andWhere('tab_signatarios.deletado', false);
        const mapaNomeSignatario = {};
        for (const s of signatariosNomes) {
            mapaNomeSignatario[s.id] = s.nome || s.perfil_nome || null;
        }
        let nomeSolicitante = null;
        if (solicitacao) {
            const perfilSolicitante = await knex('tab_perfil_usuario')
                .select('nome')
                .where('user_id', solicitacao.user_id)
                .andWhere('deletado', false)
                .first();
            nomeSolicitante = perfilSolicitante ? perfilSolicitante.nome : null;
        }

        const queryCadeia = knex('tab_auditoria_ledger').select('*').where('deletado', false);
        if (solicitacao) {
            queryCadeia.where(function () {
                this.where('documento_id', documento.id).orWhere('solicitacao_id', solicitacao.id);
            });
        } else {
            queryCadeia.where('documento_id', documento.id);
        }
        const trilhaPdf = await queryCadeia.orderBy('sequencia', 'asc');
        trilhas.push({ nome: 'documento_pdf', referencia: documento.id, registros: trilhaPdf, DomainClass: domainAuditoriaLedger });

        const trilhaDocumentoDados = await knex('tab_auditoria_ledger_documento')
            .select('*').where('documento_id', documento.id).andWhere('deletado', false).orderBy('sequencia', 'asc');
        trilhas.push({ nome: 'documento_dados', referencia: documento.id, registros: trilhaDocumentoDados, DomainClass: domainAuditoriaLedgerDocumento });

        if (solicitacao) {
            const trilhaSolicitacao = await knex('tab_auditoria_ledger_solicitacao')
                .select('*').where('solicitacao_id', solicitacao.id).andWhere('deletado', false).orderBy('sequencia', 'asc');
            trilhas.push({ nome: 'solicitacao', referencia: solicitacao.id, registros: trilhaSolicitacao, DomainClass: domainAuditoriaLedgerSolicitacao });
        }

        const signatarios = await knex('tab_signatarios')
            .select('tab_signatarios.*', 'tab_perfil_usuario.nome as nome', 'tab_perfil_usuario.cpf as cpf')
            .leftJoin('tab_perfil_usuario', 'tab_perfil_usuario.id', 'tab_signatarios.perfil_id')
            .where('tab_signatarios.documento_id', documento.id)
            .andWhere('tab_signatarios.deletado', false)
            .orderBy('tab_signatarios.data_criacao', 'asc');
        for (const signatario of signatarios) {
            const trilhaSignatario = await knex('tab_auditoria_ledger_signatario')
                .select('*').where('signatario_id', signatario.id).andWhere('deletado', false).orderBy('sequencia', 'asc');
            trilhas.push({ nome: `signatario:${signatario.nome || signatario.email || signatario.id}`, referencia: signatario.id, registros: trilhaSignatario, DomainClass: domainAuditoriaLedgerSignatario });

            if (signatario.desafio_acesso_id) {
                const trilhaDesafio = await knex('tab_auditoria_ledger_desafio_autenticacao')
                    .select('*').where('desafio_id', signatario.desafio_acesso_id).andWhere('deletado', false).orderBy('sequencia', 'asc');
                if (trilhaDesafio.length > 0) {
                    trilhas.push({ nome: `desafio_autenticacao:${signatario.nome || signatario.email || signatario.id}`, referencia: signatario.desafio_acesso_id, registros: trilhaDesafio, DomainClass: domainAuditoriaLedgerDesafioAutenticacao });
                }
            }

            const demarcacoes = await knex('tab_demarcacoes_assinatura').select('*').where('signatario_id', signatario.id).andWhere('deletado', false);
            for (const demarcacao of demarcacoes) {
                const trilhaDemarcacao = await knex('tab_auditoria_ledger_demarcacao')
                    .select('*').where('demarcacao_id', demarcacao.id).andWhere('deletado', false).orderBy('sequencia', 'asc');
                if (trilhaDemarcacao.length > 0) {
                    trilhas.push({ nome: `demarcacao:${demarcacao.id}`, referencia: demarcacao.id, registros: trilhaDemarcacao, DomainClass: domainAuditoriaLedgerDemarcacao });
                }
            }
        }

        const trilhaEventos = await knex('tab_auditoria_ledger_evento')
            .select('*').where('documento_id', documento.id).andWhere('deletado', false).orderBy('sequencia', 'asc');
        // Ledger de evento é por agregado (evento_id) — cada evento_id tem sua própria gênese. Não misturar
        // eventos distintos numa cadeia só, senão a 2ª gênese aparece "ROMPIDA" contra a 1ª sem ter corrompido nada.
        const eventoIds = [...new Set(trilhaEventos.map((r) => r.evento_id))];
        for (const eventoId of eventoIds) {
            const registrosDoEvento = trilhaEventos.filter((r) => r.evento_id === eventoId);
            trilhas.push({ nome: `evento:${eventoId}`, referencia: eventoId, registros: registrosDoEvento, DomainClass: domainAuditoriaLedgerEvento });
        }

        return { trilhas, signatarios, mapaNomeSignatario, nomeSolicitante };
    }

    // Bloco público do "quem assinou": CPF sempre mascarado (mesmo padrão da estampa).
    #montarSignatarios(signatarios) {
        const sha = new SHA(process.env.SHA);
        return signatarios.map((s) => {
            let cpfPlain = '';
            try {
                cpfPlain = sha.decrypt(s.cpf);
            } catch {
                cpfPlain = '';
            }
            return {
                nome: s.nome,
                cpf_mascarado: mascararCpf(cpfPlain),
                ordem: s.ordem,
                status: s.status,
                assinado_em: s.assinado_em,
            };
        });
    }

    /**
     * Verificação estrutural (sempre executada, sem custo de I/O externo): confere o encadeamento
     * hash_registro_anterior -> hash_atual de cada registro da trilha, na ordem de sequência, e faz uma
     * reconferência best-effort do hash_atual recalculado a partir das colunas escalares do próprio
     * registro (mesma fórmula usada na gravação, via a classe de domínio da entidade).
     */
    #verificarEstrutural(registros, DomainClass) {
        const detalhes = registros.map((registro, i) => {
            const anterior = i === 0 ? null : registros[i - 1];
            const encadeamentoOk = i === 0
                ? (registro.hash_registro_anterior === null || Boolean(parseJsonField(registro.metadata_json)?.bootstrap_legado))
                : registro.hash_registro_anterior === anterior.hash_atual;

            let recomputoOk = null;
            try {
                let clone;
                if (DomainClass === domainAuditoriaLedger) {
                    clone = new DomainClass({
                        id: registro.id,
                        solicitacao_id: registro.solicitacao_id,
                        documento_id: registro.documento_id,
                        objeto_tipo: registro.objeto_tipo,
                        objeto_id: registro.objeto_id,
                        desafio_acesso_id: registro.desafio_acesso_id,
                        tipo_evento: registro.tipo_evento,
                        sequencia: registro.sequencia,
                        metadata_json: registro.metadata_json,
                        hash_objeto_inicial: registro.hash_objeto_inicial,
                        hash_objeto_final: registro.hash_objeto_final,
                        hash_documento_inicial: registro.hash_documento_inicial,
                        hash_documento_final: registro.hash_documento_final,
                        hash_bytes_pdf: registro.hash_bytes_pdf,
                        hash_registro_anterior: registro.hash_registro_anterior,
                        hash_atual: registro.hash_atual,
                        payload_sha256: registro.payload_sha256,
                        bucket_path: registro.bucket_path,
                        object_name: registro.object_name,
                        criado_em: registro.criado_em,
                    });
                } else {
                    clone = new DomainClass({ ...registro });
                }
                const hashRecalculado = clone.calcularHashAtual();
                recomputoOk = hashRecalculado === registro.hash_atual;
            } catch (_) {
                recomputoOk = null;
            }

            if (!encadeamentoOk) return 'ROMPIDA';
            if (recomputoOk === false) return 'DIVERGENTE_RECALCULO';
            return i === 0 ? 'GENESE' : 'OK';
        });
        return { detalhes };
    }

    /**
     * Verificação profunda: baixa o ZIP selado no vault, recalcula o SHA-256 do payload JSON, confere a
     * estrutura ASN.1/CMS do carimbo e fecha a cadeia de confiança X.509 do certificado do assinante
     * contra os PEMs ICP-Brasil locais (api/certs/icp-brasil/).
     */
    async #verificarProfundo(registro) {
        const resultado = {
            payload_confere: null,
            cms_estrutura_valida: null,
            certificado_assinante: null,
            cadeia_icp: null,
            politica_assinatura_cms: null,
            observacao: null,
        };
        try {
            if (!registro.object_name) {
                resultado.observacao = 'Registro sem prova no vault.';
                return resultado;
            }
            const arquivo = await bucketGateway.Vault().obterArquivo({ objectName: registro.object_name });
            if (!arquivo.status) {
                resultado.observacao = `Não foi possível obter o ZIP selado no vault: ${arquivo.msg}`;
                return resultado;
            }
            const zipBuffer = await streamToBuffer(arquivo.data.stream);
            const zip = await JsZip.loadAsync(zipBuffer);
            const nomeJson = Object.keys(zip.files).find((n) => n.toLowerCase().endsWith('.json'));
            const nomeCms = Object.keys(zip.files).find((n) => n.toLowerCase().endsWith('.cms'));

            if (nomeJson) {
                const jsonBuffer = await zip.files[nomeJson].async('nodebuffer');
                const hashRecalculado = crypto.createHash('sha256').update(jsonBuffer).digest('hex');
                resultado.payload_confere = hashRecalculado === registro.payload_sha256;
            } else {
                resultado.observacao = 'ZIP não contém arquivo .json esperado.';
            }

            if (nomeCms) {
                const cmsBuffer = await zip.files[nomeCms].async('nodebuffer');
                try {
                    const asn1 = forge.asn1.fromDer(cmsBuffer.toString('binary'));
                    const pkcs7 = forge.pkcs7.messageFromAsn1(asn1);
                    resultado.cms_estrutura_valida = true;

                    // Atributo assinado id-aa-ets-sigPolicyId (SignaturePolicyIdentifier, DOC-ICP-15.03/ETSI):
                    // reconferido de verdade no CMS, nunca inventado. O worker de produção do SignServer
                    // (CMSSignerCarimbo) ainda não foi migrado para emitir esse atributo — a migração já foi
                    // testada com sucesso num worker paralelo, mas fica pendente de decisão humana explícita
                    // (ver seção L3.2 em docs/relatorios/sprint-selo-icp-worm-integridade.md). Por isso, nesta
                    // fase, ausência de política é rollout pendente, não adulteração: esta checagem é 100%
                    // observacional e NUNCA deriva o veredito_geral, igual à cadeia_icp acima.
                    const politicaAssinaturaCms = {
                        presente: false,
                        oid: null,
                        hash: null,
                        uri: null,
                        oid_confere: null,
                        hash_confere: null,
                        motivo: 'CMS não contém o atributo de política de assinatura (id-aa-ets-sigPolicyId) — o worker de produção do SignServer ainda não foi migrado para emitir esse atributo (ver docs/relatorios/sprint-selo-icp-worm-integridade.md, seção L3.2).',
                    };
                    try {
                        // rawCapture.authenticatedAttributes já vem como array de nós ASN.1 (Attribute
                        // SEQUENCE) decodificados pelo próprio validator do forge.pkcs7 — sem precisar
                        // reconstituir bytes/tag manualmente.
                        const signedAttrs = pkcs7.rawCapture && pkcs7.rawCapture.authenticatedAttributes;
                        if (Array.isArray(signedAttrs)) {
                            const atributoPolitica = signedAttrs.find((attr) => forge.asn1.derToOid(attr.value[0].value) === oidAtributoPoliticaAssinatura);
                            if (atributoPolitica) {
                                const signaturePolicyId = atributoPolitica.value[1].value[0];
                                politicaAssinaturaCms.oid = forge.asn1.derToOid(signaturePolicyId.value[0].value);
                                const sigPolicyHash = signaturePolicyId.value[1];
                                politicaAssinaturaCms.hash = forge.util.bytesToHex(sigPolicyHash.value[1].value);
                                const sigPolicyQualifiers = signaturePolicyId.value[2];
                                if (sigPolicyQualifiers) {
                                    const qualificadorUri = sigPolicyQualifiers.value.find((q) => forge.asn1.derToOid(q.value[0].value) === oidQualificadorUriPoliticaAssinatura);
                                    if (qualificadorUri) politicaAssinaturaCms.uri = qualificadorUri.value[1].value;
                                }
                                politicaAssinaturaCms.presente = true;
                                politicaAssinaturaCms.oid_confere = politicaAssinaturaCms.oid === oidPoliticaAdRbPadesVigente;
                                politicaAssinaturaCms.hash_confere = politicaAssinaturaCms.hash === hashPoliticaAdRbPadesVigente;
                                politicaAssinaturaCms.motivo = 'CMS contém o atributo de política de assinatura (id-aa-ets-sigPolicyId); valores conferidos contra a PA_AD_RB PAdES vigente (OID/hash/URI oficiais).';
                            }
                        }
                    } catch (erroPolitica) {
                        politicaAssinaturaCms.motivo = `${politicaAssinaturaCms.motivo} Falha ao decodificar signedAttrs (${erroPolitica.message}); isso não indica necessariamente adulteração.`;
                    }
                    if (statusAplication.status === statusApp.prod && !politicaAssinaturaCms.presente) {
                        politicaAssinaturaCms.alerta_producao = true;
                    }
                    resultado.politica_assinatura_cms = politicaAssinaturaCms;

                    const cert = pkcs7.certificates && pkcs7.certificates[0];
                    if (cert) {
                        resultado.certificado_assinante = {
                            subject: cert.subject?.attributes?.map((a) => `${a.shortName || a.name}=${a.value}`).join(', ') || null,
                            issuer: cert.issuer?.attributes?.map((a) => `${a.shortName || a.name}=${a.value}`).join(', ') || null,
                            valido_de: cert.validity?.notBefore || null,
                            valido_ate: cert.validity?.notAfter || null,
                        };

                        // Validade temporal explícita (redundante com o que o próprio verifyCertificateChain
                        // já confere, de propósito — duas fontes para a mesma verdade).
                        const agora = new Date();
                        const notBefore = cert.validity?.notBefore ? new Date(cert.validity.notBefore) : null;
                        const notAfter = cert.validity?.notAfter ? new Date(cert.validity.notAfter) : null;
                        const dentroDaValidade = notBefore && notAfter ? (agora >= notBefore && agora <= notAfter) : null;

                        let cadeiaValida = null;
                        let motivoCadeia = null;
                        if (!caStoreIcpBrasil) {
                            motivoCadeia = 'PEMs da cadeia ICP-Brasil (AC Raiz + intermediárias) não encontrados em api/certs/icp-brasil/; cadeia X.509 não verificada nesta instância.';
                        } else {
                            try {
                                forge.pki.verifyCertificateChain(caStoreIcpBrasil, [cert]);
                                cadeiaValida = true;
                            } catch (erroCadeia) {
                                cadeiaValida = false;
                                motivoCadeia = erroCadeia.message || 'Cadeia de certificação X.509 não fechou contra os PEMs ICP-Brasil configurados.';
                            }
                        }
                        if (dentroDaValidade === false) {
                            motivoCadeia = `${motivoCadeia ? motivoCadeia + ' ' : ''}Certificado fora da validade temporal (${cert.validity.notBefore} a ${cert.validity.notAfter}).`;
                        }
                        const cadeiaFechada = dentroDaValidade === false || cadeiaValida === false
                            ? false
                            : (dentroDaValidade === true && cadeiaValida === true ? true : null);
                        if (statusAplication.status !== statusApp.prod) {
                            motivoCadeia = `${motivoCadeia ? motivoCadeia + ' ' : ''}Ambiente ${statusAplication.status || 'não-produção'}: checagem informativa, não derruba veredito_geral.`;
                        }
                        resultado.cadeia_icp = { valida: cadeiaFechada, motivo: motivoCadeia };
                    }
                } catch (cmsError) {
                    resultado.cms_estrutura_valida = null;
                    resultado.observacao = `${resultado.observacao ? resultado.observacao + ' ' : ''}CMS não pôde ser analisado com a biblioteca atual (${cmsError.message}); isso não indica necessariamente adulteração.`;
                }
            }

            return resultado;
        } catch (error) {
            resultado.observacao = `Falha na verificação profunda: ${error.message}`;
            return resultado;
        }
    }

    #extrairUltimoCarimboAssinatura(trilhas) {
        const trilhaDocumentoDados = trilhas.find((t) => t.nome === 'documento_dados');
        if (!trilhaDocumentoDados || trilhaDocumentoDados.registros.length === 0) return null;
        for (let i = trilhaDocumentoDados.registros.length - 1; i >= 0; i--) {
            const meta = parseJsonField(trilhaDocumentoDados.registros[i].metadata_json);
            if (meta?.carimbo) return meta.carimbo;
        }
        return null;
    }

}

module.exports = new GerarCertificadoAuditoriaUseCase();
