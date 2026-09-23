
const knex = require('../../../infrastructure/db/config/databaseConection')();
const repositorioPedido = require('../../../infrastructure/db/services/PedidoRepository');
const repositorioArquivo = require('../../../infrastructure/db/services/ArquivoDriveRepository');
const repositorioEvento = require('../../../infrastructure/db/services/EventoRastreioRepository');
const repositorioOauthDrive = require('../../../infrastructure/db/services/OauthDriveRepository');
const domainPedido = require('../../domain/Pedido');
const domainArquivo = require('../../domain/ArquivoDrive');
const domainEvento = require('../../domain/EventoRastreio');
const apiLegacy = require('../../../infrastructure/gateways/ApiLegacy');
const driveGateway = require('../../../infrastructure/gateways/Drive');
const dateNow = require('../../../infrastructure/gateways/functions/data/getToday');
const { hmacConvite } = require('../../../infrastructure/gateways/functions/convite');
const ErrorStackParser = require('error-stack-parser');
const {
    statusPedido,
    statusApiSolicitacao,
    tipoTermoApi,
    eventoRastreio,
    tipoArquivoDrive,
    drive,
    quadroAssinatura,
    legacyApi,
} = require('../../../config');
const logs = require('../../../Logs');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

class createPedidoUseCase {

    async indexPedido(data) {
        try {
            if (!data.instalacao) return { status: false, msg: "Instalação não autenticada." }
            // Pedir assinatura é papel de gerente/admin (escopo solicitante); a API também
            // recusa isso, mas a UX do card já bloqueia aqui em vez de rodar tudo pra ganhar um 403.
            if (data.instalacao.escopo !== 'addon_solicitante') return { status: false, msg: "Sua chave não tem permissão para solicitar assinatura. Peça ao gerente uma chave com escopo de solicitante." }
            if (!data.titulo || data.titulo.trim() === '') return { status: false, msg: "Título do pedido não pode ser vazio." }
            if (!data.arquivo_origem_id) return { status: false, msg: "Arquivo de origem no Drive não informado." }
            if (!Array.isArray(data.signatarios) || data.signatarios.length === 0) return { status: false, msg: "Informe ao menos um signatário." }
            if (!Array.isArray(data.areas) || data.areas.length === 0) return { status: false, msg: "Informe as áreas de assinatura." }
            const validacaoSignatarios = this.#validarSignatarios(data.signatarios, data.areas);
            if (!validacaoSignatarios.status) return validacaoSignatarios;

            const emailUsuario = data.instalacao.email_usuario;
            // Sem consentimento do Drive a SA impersona e toma 403 — recusa antes de gastar chamada na API.
            const checkOauth = await repositorioOauthDrive.getByEmail({ email: emailUsuario })
            if (!checkOauth.status) return { status: false, msg: "Ocorreu um erro interno, tente novamente em instantes." }
            if (!checkOauth.exit) return { status: false, msg: "Autorize o acesso ao Drive (\"Autorizar Drive\" no card do Addon) antes de pedir assinatura." }

            // Passagem 1 — o card já validou na UX; aqui a verdade são os bytes do Drive.
            const origem = await this.#validarArquivoDrive(emailUsuario, data.arquivo_origem_id);
            if (!origem.status) return origem;

            const pasta = await this.#resolverPastaDestino(emailUsuario, origem.data);
            if (!pasta.status) return pasta;

            let termoId = data.termo_id || null;
            if (!termoId) {
                const termos = await apiLegacy.get('/api/admin/termo-responsabilidade?page=0&per_page=100', data.instalacao.chave_api)
                if (!termos.status) return { status: false, msg: "Não foi possível consultar os termos de responsabilidade na API." }
                const ativo = (termos.data?.data || []).find((t) => t.ativo && t.tipo_termo === tipoTermoApi.termo_documento);
                if (!ativo) return { status: false, msg: "Nenhum termo de responsabilidade ativo para documentos. Cadastre um termo no site." }
                termoId = ativo.id;
            }

            const solicitacao = await apiLegacy.post('/api/admin/documentos/solicitacao', {
                nome_documento: data.titulo.trim(),
                documento_nome: origem.data.nome,
                termo_id: termoId,
            }, data.instalacao.chave_api)
            if (!solicitacao.status) return { status: false, msg: solicitacao.msg || "A API recusou a criação da solicitação." }
            const solicitacaoId = solicitacao.data?.data?.id;
            const uploadUrl = solicitacao.data?.data?.url;
            if (!solicitacaoId || !uploadUrl) return { status: false, msg: "A API não devolveu a URL de upload." }

            const pedido = new domainPedido({
                instalacao_id: data.instalacao.id,
                titulo: data.titulo.trim(),
                solicitacao_id: solicitacaoId,
                termo_id: termoId,
                pasta_processo_drive_id: pasta.data.pastaProcessoId,
                status: statusPedido.validando,
                hash_original: origem.data.sha256,
                // campos_extras não vão para a API (o contrato de signatários não os
                // aceita) — ficam só no rastreio local do pedido.
                signatarios_json: JSON.stringify(data.signatarios.map((s) => ({ nome: s.nome, email: s.email, campos_extras: s.campos_extras || [] }))),
            });

            const upload = await apiLegacy.putArquivoPresign(uploadUrl, origem.data.buffer);
            if (!upload.status) return await this.#falhaPedido(pedido, data.instalacao.id, "Falha no upload do PDF para o bucket da API.");

            const confirma = await apiLegacy.put(`/api/admin/documentos/solicitacao/${solicitacaoId}`, { confirmado: true }, data.instalacao.chave_api)
            if (!confirma.status) return await this.#falhaPedido(pedido, data.instalacao.id, confirma.msg || "A API recusou a confirmação do upload.");

            // Poll até o hash inicial concluir; o hash da API tem que bater com o dos bytes do Drive.
            const processado = await this.#aguardarUpload(solicitacaoId, data.instalacao.chave_api);
            if (!processado.status) return await this.#falhaPedido(pedido, data.instalacao.id, processado.msg);
            const documento = processado.documento;
            if (documento.hash_original && documento.hash_original !== origem.data.sha256) {
                return await this.#falhaPedido(pedido, data.instalacao.id, "O hash calculado pela API não confere com o arquivo do Drive.");
            }
            pedido.documento_id = documento.id;

            const payloadSignatarios = this.#montarPayloadSignatarios(data.signatarios, data.areas);
            const signatarios = await apiLegacy.post(`/api/admin/documentos/${documento.id}/signatarios`, { signatarios: payloadSignatarios }, data.instalacao.chave_api)
            if (!signatarios.status) return await this.#falhaPedido(pedido, data.instalacao.id, signatarios.msg || "A API recusou o cadastro dos signatários.");

            pedido.status = statusPedido.aguardando_assinaturas;
            pedido.data_atualizacao = dateNow();
            const trx = await knex.transaction();
            try {
                const persistPedido = await repositorioPedido.createPedidoTrx(pedido.getPedido(), trx)
                if (!persistPedido.status) throw new Error(persistPedido.msg)
                const arquivoOrigem = new domainArquivo({
                    pedido_id: pedido.id,
                    tipo: tipoArquivoDrive.origem,
                    drive_file_id: data.arquivo_origem_id,
                    nome: origem.data.nome,
                    tamanho: origem.data.tamanho,
                    mime_type: origem.data.mime_type,
                    sha256: origem.data.sha256,
                });
                const persistOrigem = await repositorioArquivo.createArquivoDriveTrx(arquivoOrigem.getArquivoDrive(), trx)
                if (!persistOrigem.status) throw new Error(persistOrigem.msg)
                const persistValidado = await repositorioEvento.createEventoTrx(new domainEvento({
                    instalacao_id: data.instalacao.id,
                    pedido_id: pedido.id,
                    tipo_evento: eventoRastreio.pedido_validado,
                    meta_dados: { sha256: origem.data.sha256, origem_id: data.arquivo_origem_id, pasta_destino_id: pasta.data.pastaProcessoId },
                }).getEventoRastreio(), trx)
                if (!persistValidado.status) throw new Error(persistValidado.msg)
                const persistEnviado = await repositorioEvento.createEventoTrx(new domainEvento({
                    instalacao_id: data.instalacao.id,
                    pedido_id: pedido.id,
                    tipo_evento: eventoRastreio.pedido_enviado,
                    meta_dados: { solicitacao_id: solicitacaoId, documento_id: documento.id, termo_id: termoId, signatarios: data.signatarios.length },
                }).getEventoRastreio(), trx)
                if (!persistEnviado.status) throw new Error(persistEnviado.msg)
                await trx.commit();
            } catch (error) {
                console.log(error)
                await trx.rollback();
                return { status: false, msg: "O pedido foi enviado para a API, mas o rastreio local falhou. Anote a solicitação " + solicitacaoId + " e contate o suporte." }
            }

            const dataResposta = { id: pedido.id, solicitacao_id: solicitacaoId, documento_id: documento.id, pasta_processo_drive_id: pasta.data.pastaProcessoId, pasta_processo_nome: pasta.data.pastaProcessoNome };
            // Convite só quando o dono da instalação também é signatário — o card
            // "Documentos para assinar" abre a cerimônia no Web App.
            const emailConvite = String(emailUsuario || '').trim().toLowerCase();
            const donoESignatario = data.signatarios.some((s) => String(s.email || '').trim().toLowerCase() === emailConvite);
            if (donoESignatario) dataResposta.convite = { documento_id: documento.id, pedido_id: pedido.id, email: emailConvite, convite: hmacConvite(documento.id, pedido.id, emailConvite) };
            return { status: true, msg: "Pedido enviado. Os convites de assinatura foram disparados por e-mail.", data: dataResposta }
        } catch (err) {
            console.log(err)
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(err);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            logs.getInstance().error({ linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), err }, 'Erro no createPedidoUseCase - indexPedido')
            return { status: false, msg: 'Erro interno do servidor, log gerado' }
        }
    }

    #validarSignatarios(signatarios, areas) {
        const emails = new Set();
        const cpfs = new Set();
        for (let i = 0; i < signatarios.length; i++) {
            const s = signatarios[i];
            if (!s || !s.nome || s.nome.trim() === '') return { status: false, msg: `Nome obrigatório no signatário ${i + 1}.` }
            const email = (s.email || '').trim().toLowerCase();
            if (!email || !EMAIL_REGEX.test(email)) return { status: false, msg: `E-mail inválido no signatário ${i + 1}.` }
            const cpfDigits = String(s.cpf || '').replace(/\D/g, '');
            if (cpfDigits.length !== 11) return { status: false, msg: `CPF inválido no signatário ${s.nome}.` }
            const telefoneDigits = String(s.telefone || '').replace(/\D/g, '');
            if (telefoneDigits.length < 10 || telefoneDigits.length > 11) return { status: false, msg: `Telefone inválido no signatário ${s.nome}.` }
            if (emails.has(email)) return { status: false, msg: "E-mail duplicado na lista de signatários." }
            if (cpfs.has(cpfDigits)) return { status: false, msg: "CPF duplicado na lista de signatários." }
            emails.add(email);
            cpfs.add(cpfDigits);
            const areasDoSignatario = areas.filter((a) => (a.email || '').trim().toLowerCase() === email);
            if (areasDoSignatario.length !== 1) return { status: false, msg: `O signatário ${s.nome} precisa de exatamente uma área de assinatura.` }
            const area = areasDoSignatario[0];
            if (!area.pagina || Number(area.pagina) < 1) return { status: false, msg: `Página inválida na área de ${s.nome}.` }
            for (const campo of ['x', 'y', 'largura', 'altura']) {
                const valor = Number(area[campo]);
                if (Number.isNaN(valor) || valor < 0 || valor > 1) return { status: false, msg: `Coordenada ${campo} inválida na área de ${s.nome}.` }
            }
            if (!area.pagina_largura || !area.pagina_altura) return { status: false, msg: `Tamanho da página ausente na área de ${s.nome}.` }
        }
        return { status: true }
    }

    async #validarArquivoDrive(email, fileId) {
        const meta = await driveGateway.getMetadados({ email, fileId })
        if (!meta.status) return { status: false, msg: "Falha ao consultar o Drive." }
        if (!meta.exit) return { status: false, msg: "Arquivo não encontrado no Drive." }
        const arquivo = meta.data;
        if (arquivo.trashed) return { status: false, msg: `O arquivo ${arquivo.name} está na lixeira do Drive.` }
        if (arquivo.mimeType === drive.mimePasta) return { status: false, msg: `${arquivo.name} é uma pasta, não um PDF.` }
        if (arquivo.mimeType === drive.mimeAtalho || arquivo.shortcutDetails) return { status: false, msg: `${arquivo.name} é um atalho. Envie o arquivo real.` }
        if (arquivo.mimeType !== drive.mimePdf) return { status: false, msg: `${arquivo.name} não é um PDF.` }
        if (!arquivo.name || !arquivo.name.toLowerCase().endsWith('.pdf')) return { status: false, msg: `O nome de ${arquivo.name} deve terminar com .pdf.` }
        const tamanho = Number(arquivo.size || 0);
        if (!tamanho) return { status: false, msg: `${arquivo.name} está vazio no Drive.` }
        if (tamanho > drive.maxBytes) return { status: false, msg: `${arquivo.name} excede o tamanho máximo permitido.` }
        const download = await driveGateway.baixarArquivo({ email, fileId })
        if (!download.status) return { status: false, msg: "Falha ao baixar o arquivo do Drive." }
        if (!download.exit) return { status: false, msg: "Arquivo não encontrado no Drive." }
        if (download.data.tamanho !== tamanho) return { status: false, msg: `O tamanho baixado de ${arquivo.name} não confere com os metadados do Drive.` }
        const magic = download.data.buffer.slice(0, 5).toString('utf8');
        if (magic !== drive.magicPdf) return { status: false, msg: `${arquivo.name} não tem cabeçalho de PDF válido.` }
        return { status: true, data: { nome: arquivo.name, mime_type: arquivo.mimeType, tamanho, sha256: download.data.sha256, buffer: download.data.buffer, parents: Array.isArray(arquivo.parents) ? arquivo.parents : [] } }
    }

    // A pasta é a de onde o usuário escolheu o arquivo — nada é criado.
    // Sem pasta pai visível (raiz / "Compartilhados comigo"): o Meu Drive
    // desta conta (fileId=root), nunca uma pasta nova sem parent — essa
    // cai na conta de serviço e o Drive responde "Você precisa ter acesso".
    async #resolverPastaDestino(email, origem) {
        const pastaId = origem.parents.length > 0 ? origem.parents[0] : null;
        if (pastaId) {
            const pasta = await driveGateway.getMetadados({ email, fileId: pastaId });
            if (!pasta.status) return { status: false, msg: "Falha ao consultar a pasta do arquivo no Drive." }
            if (!pasta.exit) return { status: false, msg: "A pasta onde o arquivo está não foi encontrada no Drive." }
            if (pasta.data.mimeType !== drive.mimePasta) return { status: false, msg: "O destino do arquivo no Drive não é uma pasta." }
            if (pasta.data.trashed) return { status: false, msg: "A pasta onde o arquivo está foi movida para a lixeira do Drive." }
            return { status: true, data: { pastaProcessoId: pastaId, pastaProcessoNome: pasta.data.name } }
        }
        const raiz = await driveGateway.getMetadados({ email, fileId: 'root' });
        if (!raiz.status) return { status: false, msg: "Falha ao consultar o Meu Drive." }
        if (!raiz.exit) return { status: false, msg: "Não foi possível localizar o Meu Drive desta conta." }
        return { status: true, data: { pastaProcessoId: raiz.data.id, pastaProcessoNome: raiz.data.name || 'Meu Drive' } }
    }

    async #aguardarUpload(solicitacaoId, chave) {
        for (let i = 0; i < legacyApi.pollTentativas; i++) {
            const detalhe = await apiLegacy.get(`/api/admin/solicitacoes/${solicitacaoId}`, chave)
            if (detalhe.status) {
                const solicitacao = detalhe.data?.data?.solicitacao;
                const documento = detalhe.data?.data?.documento;
                if (solicitacao && solicitacao.status === statusApiSolicitacao.erro_hash_inicial) return { status: false, msg: "A API não conseguiu processar o PDF enviado." }
                if (solicitacao && solicitacao.status !== statusApiSolicitacao.solicitado && solicitacao.status !== statusApiSolicitacao.processamento_hash_inicial && documento && documento.id) {
                    return { status: true, documento }
                }
            }
            await new Promise((resolve) => setTimeout(resolve, legacyApi.pollIntervaloMs));
        }
        return { status: false, msg: "A API não concluiu o processamento do documento no tempo esperado. Tente consultar o pedido em instantes." }
    }

    #montarPayloadSignatarios(signatarios, areas) {
        const r2 = (n) => Math.round(n * 100) / 100;
        return signatarios.map((s) => {
            const email = s.email.trim().toLowerCase();
            const area = areas.find((a) => (a.email || '').trim().toLowerCase() === email);
            const pageW = Number(area.pagina_largura) || 612;
            const pageH = Number(area.pagina_altura) || 792;
            return {
                data: {
                    nome: s.nome.trim(),
                    email: s.email.trim(),
                    cpf: String(s.cpf).replace(/\D/g, ''),
                    telefone: String(s.telefone).replace(/\D/g, ''),
                    ordem: null,
                },
                sign: [{
                    tipo: 'assinatura',
                    pagina: Number(area.pagina),
                    x: Number(area.x),
                    y: Number(area.y),
                    largura: Number(area.largura),
                    altura: Number(area.altura),
                    pdf: {
                        x: r2(Number(area.x) * pageW),
                        y: r2(pageH - (Number(area.y) + Number(area.altura)) * pageH),
                        largura: quadroAssinatura.largura,
                        altura: quadroAssinatura.altura,
                        origem: 'bottom-left',
                        unidade: 'pt',
                    },
                    pagina_tamanho: { largura: r2(pageW), altura: r2(pageH) },
                }],
            };
        });
    }

    async #falhaPedido(pedido, instalacaoId, msg) {
        pedido.status = statusPedido.erro;
        pedido.erro_msg = msg;
        pedido.data_atualizacao = dateNow();
        const trx = await knex.transaction();
        try {
            const persist = await repositorioPedido.createPedidoTrx(pedido.getPedido(), trx)
            if (!persist.status) throw new Error(persist.msg)
            const evento = await repositorioEvento.createEventoTrx(new domainEvento({
                instalacao_id: instalacaoId,
                pedido_id: pedido.id,
                tipo_evento: eventoRastreio.pedido_erro,
                meta_dados: { solicitacao_id: pedido.solicitacao_id, erro: msg },
            }).getEventoRastreio(), trx)
            if (!evento.status) throw new Error(evento.msg)
            await trx.commit();
        } catch (error) {
            console.log(error)
            await trx.rollback();
        }
        return { status: false, msg }
    }

}

module.exports = new createPedidoUseCase();
