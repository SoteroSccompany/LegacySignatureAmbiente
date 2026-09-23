
const repositorioPedido = require('../../../infrastructure/db/services/PedidoRepository');
const repositorioEvento = require('../../../infrastructure/db/services/EventoRastreioRepository');
const domainEvento = require('../../domain/EventoRastreio');
const apiLegacy = require('../../../infrastructure/gateways/ApiLegacy');
const getPedidoUseCase = require('../Pedido/getPedidoUseCase');
const dateNow = require('../../../infrastructure/gateways/functions/data/getToday');
const ErrorStackParser = require('error-stack-parser');
const { eventoRastreio, statusApiDocumento, drive } = require('../../../config');
const logs = require('../../../Logs');

// Cerimônia de assinatura (OTP + biometria + PAdES) DENTRO do Workspace. Cada
// método só encaminha para a rota /assinatura da API com a própria lsak_ do
// signatário no header x-integracao-key — sem cookie, sem sessão própria
// deste serviço. Quem guarda o progresso é a API (tab_login.session_id +
// carregarProgressoSessao), não este proxy.
class cerimoniaSignatarioUseCase {

    async listarTermos(data) {
        const query = new URLSearchParams({ filter: data.filter || '', search: data.search || '', page: '0', per_page: '20' });
        return this.#encaminhar(data, 'get', `/api/admin/termo-responsabilidade?${query.toString()}`);
    }

    async aceitarTermo(data) {
        if (!data.termo_id) return { status: false, msg: "Termo não informado." }
        // Confere na mesma lsak_/jar antes de gravar: o termo precisa existir e estar
        // ativo — a mesma verdade que o use case da API testa de novo por dentro.
        const consulta = await this.#encaminhar(data, 'get', `/api/admin/termo-responsabilidade?filter=id&search=${encodeURIComponent(data.termo_id)}&page=0&per_page=20`);
        if (!consulta.status) return consulta;
        if (consulta.statusHttp < 200 || consulta.statusHttp >= 300) return consulta;
        const termos = (consulta.body && consulta.body.data) || [];
        let termo = null;
        for (const item of termos) {
            if (item.id === data.termo_id) { termo = item; break; }
        }
        if (!termo) return { status: false, msg: "Termo de responsabilidade não localizado." }
        if (termo.ativo !== 1 && termo.ativo !== true) return { status: false, msg: "Termo de responsabilidade não está ativo." }
        // Rota da cerimônia (lsak_): o POST /termo-responsabilidade/aceite continua
        // exclusivo do login por cookie do site.
        return this.#encaminhar(data, 'post', '/api/admin/assinatura/termos/aceite', { termo_id: data.termo_id });
    }

    async progressoSessao(data) {
        if (!data.documento_id) return { status: false, msg: "Documento não informado." }
        return this.#encaminhar(data, 'get', `/api/admin/assinatura/sessao/progresso?documento_id=${encodeURIComponent(data.documento_id)}`);
    }

    async criarSessaoAssinatura(data) {
        if (!data.documento_id) return { status: false, msg: "Documento não informado." }
        return this.#encaminhar(data, 'post', '/api/admin/assinatura/sessao', { documento_id: data.documento_id });
    }

    async confirmar2FAAssinatura(data) {
        return this.#encaminhar(data, 'post', '/api/admin/assinatura/sessao/2fa', { token: data.token });
    }

    async confirmarFoto(data) {
        if (!data.id_identificador) return { status: false, msg: "id_identificador não pode ser vazio" }
        // Aba HTTPS do túnel não pode PUT em localhost:7749 (mixed content +
        // SigV4 assinado pro host local). A foto vem no body; daqui o PUT
        // usa a URL do progresso (não a que o browser mandou) e reescreve
        // localhost → proxysignature na rede Docker.
        if (data.foto) {
            if (!data.documento_id) return { status: false, msg: "Documento não informado." }
            const progresso = await this.progressoSessao(data);
            if (!progresso.status) return progresso;
            if (progresso.statusHttp < 200 || progresso.statusHttp >= 300) return progresso;
            const etapa = (progresso.body && progresso.body.data) || {};
            const identificacaoId = etapa.identificacao_id || etapa.id;
            if (!identificacaoId || identificacaoId !== data.id_identificador) {
                return { status: false, msg: "Identificação biométrica não corresponde à sessão." }
            }
            if (!etapa.url) return { status: false, msg: "Não foi possível preparar o envio da foto, tente novamente em instantes." }
            const bruto = String(data.foto).replace(/^data:image\/jpeg;base64,/, '');
            let buffer;
            try { buffer = Buffer.from(bruto, 'base64'); }
            catch (_) { return { status: false, msg: "Foto inválida." } }
            if (!buffer || buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8 || buffer[2] !== 0xff) {
                return { status: false, msg: "A foto precisa ser um JPEG capturado da câmera." }
            }
            if (buffer.length > 4 * 1024 * 1024) return { status: false, msg: "A foto excede o tamanho permitido." }
            const upload = await apiLegacy.putArquivoPresign(etapa.url, buffer, 'image/jpeg');
            if (!upload.status) return { status: false, msg: upload.msg || "Falha no envio da foto. Tente novamente." }
        }
        return this.#encaminhar(data, 'post', '/api/admin/assinatura/sessao/confirmarFoto', { id_identificador: data.id_identificador });
    }

    async statusFoto(data) {
        const query = data.documento_id ? `?documento_id=${encodeURIComponent(data.documento_id)}` : '';
        return this.#encaminhar(data, 'get', `/api/admin/assinatura/sessao/statusFoto${query}`);
    }

    async getDocumento(data) {
        if (!data.documento_id) return { status: false, msg: "Documento não informado." }
        return this.#encaminhar(data, 'get', `/api/admin/assinatura/documentos/${encodeURIComponent(data.documento_id)}`);
    }

    // Bytes do PDF pra o overlay do Workspace: o browser (googleusercontent)
    // não consegue baixar a URL presignada do bucket (CORS / HTTP em HTTPS /
    // iframe). Daqui o GET usa a mesma URL da API e o mesmo rewrite Docker
    // do put da selfie. Sem isso o Chrome bloqueia a pré-visualização.
    async baixarPdfPreview(data) {
        if (!data.documento_id) return { status: false, msg: "Documento não informado." }
        const consulta = await this.getDocumento(data);
        if (!consulta.status) return consulta;
        if (consulta.statusHttp < 200 || consulta.statusHttp >= 300) {
            return { status: false, msg: (consulta.body && consulta.body.msg) || "Não foi possível carregar o documento." }
        }
        const pdfUrl = consulta.body && consulta.body.data && consulta.body.data.pdf_url;
        if (!pdfUrl) return { status: false, msg: "A API não devolveu a URL do documento." }
        if (/https?:\/\/([^\/]*\.)?(drive|docs)\.google\.com\//i.test(String(pdfUrl))) {
            return { status: false, msg: "Não foi possível carregar a pré-visualização do PDF." }
        }
        const arquivo = await apiLegacy.getArquivoUrl(pdfUrl);
        if (!arquivo.status) return { status: false, msg: "Falha ao baixar o documento para visualização." }
        const magic = arquivo.data.slice(0, 5).toString('utf8');
        if (magic !== drive.magicPdf) return { status: false, msg: "O documento baixado não tem cabeçalho de PDF válido." }
        return { status: true, data: arquivo.data }
    }

    async estampaUrl(data) {
        if (!data.documento_id) return { status: false, msg: "Documento não informado." }
        const rehidratada = await this.#confirmarSessaoViva(data);
        if (!rehidratada.status || rehidratada.statusHttp < 200 || rehidratada.statusHttp >= 300) return rehidratada;
        return this.#encaminhar(data, 'post', `/api/admin/assinatura/documentos/${encodeURIComponent(data.documento_id)}/estampa-url`, { documento_id: data.documento_id });
    }

    async assinar(data) {
        if (!data.documento_id) return { status: false, msg: "Documento não informado." }
        const rehidratada = await this.#confirmarSessaoViva(data);
        if (!rehidratada.status || rehidratada.statusHttp < 200 || rehidratada.statusHttp >= 300) return rehidratada;
        return this.#encaminhar(data, 'post', `/api/admin/assinatura/documentos/${encodeURIComponent(data.documento_id)}/assinar`, { id: data.id });
    }

    // Antes do PAdES, confere o progresso na mesma lsak_/jar do ApiLegacy: se a
    // sessão da cerimônia sumiu no meio do caminho (card, vínculo, jar renovado),
    // essa chamada faz a própria API reconstruir session.user.assinatura pelo
    // banco (carregarProgressoSessao) antes do estampa-url/assinar chegarem lá.
    // Se falhar de verdade, devolve a msg real — não finge vínculo inválido.
    async #confirmarSessaoViva(data) {
        return this.progressoSessao(data);
    }

    async statusAssinatura(data) {
        if (!data.documento_id) return { status: false, msg: "Documento não informado." }
        const response = await this.#encaminhar(data, 'get', `/api/admin/assinatura/documentos/${encodeURIComponent(data.documento_id)}/status`);
        // PAdES concluído: registra no rastreio do pedido para o solicitante
        // sincronizar o contrato-assinado.pdf pelo card (o signatário não tem
        // o token do Drive do solicitante).
        if (response.status && response.body?.data?.signatario?.status === 'SIGNED') {
            await this.#registrarConclusao(data.documento_id, data.email || null);
        }
        // Documento fechado (todos assinaram): tenta gravar o assinado direto
        // na pasta do processo com a lsak_ do solicitante, sem esperar ele
        // tocar em "Atualizar status". O gatilho é o documento, não o
        // signatário — com 2+ signatários só fecha no último. Falha aqui não
        // derruba a resposta da cerimônia; o card continua como fallback.
        if (response.status && response.body?.data?.documento?.status === statusApiDocumento.documento_assinado) {
            try {
                await getPedidoUseCase.tentarGravarAssinadoPorDocumento({ documento_id: data.documento_id });
            } catch (err) {
                console.log(err)
                logs.getInstance().error({ err, documento_id: data.documento_id }, 'Erro ao tentar gravar o assinado no Drive a partir da cerimônia');
            }
        }
        return response;
    }

    async downloadAssinado(data) {
        if (!data.documento_id) return { status: false, msg: "Documento não informado." }
        return this.#encaminhar(data, 'get', `/api/admin/assinatura/documentos/${encodeURIComponent(data.documento_id)}/download`);
    }

    async #encaminhar(data, metodo, path, body) {
        try {
            if (!data.chave_api) return { status: false, msg: "Chave de assinatura não informada." }
            const response = metodo === 'get' ? await apiLegacy.get(path, data.chave_api) : await apiLegacy.post(path, body, data.chave_api);
            if (response.statusHttp === 0) return { status: false, msg: response.msg || "Ocorreu um erro interno, tente novamente em instantes." }
            return { status: true, statusHttp: response.statusHttp, body: response.data }
        } catch (err) {
            console.log(err)
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(err);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            logs.getInstance().error({ linhaDoErro: lineError, nomeDoArquivo: fileName, path, data_criacao: dateNow(), err }, 'Erro no cerimoniaSignatarioUseCase - encaminhar')
            return { status: false, msg: 'Erro interno do servidor, log gerado' }
        }
    }

    async #registrarConclusao(documentoId, email) {
        try {
            const checkPedido = await repositorioPedido.getPedidoByDocumentoId({ documento_id: documentoId })
            if (!checkPedido.status) return;
            if (!checkPedido.exit) return; // documento não nasceu no Addon: nada a rastrear aqui
            const pedido = checkPedido.data;
            // Idempotente: o poll de status roda várias vezes depois do SIGNED.
            const jaRegistrado = await repositorioEvento.getEventoByPedidoIdETipo({ pedido_id: pedido.id, tipo_evento: eventoRastreio.assinatura_concluida })
            if (!jaRegistrado.status) return;
            if (jaRegistrado.exit) return;
            const evento = await repositorioEvento.createEvento(new domainEvento({
                instalacao_id: pedido.instalacao_id,
                pedido_id: pedido.id,
                tipo_evento: eventoRastreio.assinatura_concluida,
                meta_dados: { documento_id: documentoId, signatario_email: email || null },
            }).getEventoRastreio());
            if (!evento.status) logs.getInstance().error({ pedido_id: pedido.id }, 'Cerimônia concluída mas o evento de rastreio falhou');
        } catch (err) {
            console.log(err)
            logs.getInstance().error({ err, documento_id: documentoId }, 'Erro ao registrar conclusão da assinatura no rastreio');
        }
    }

}

module.exports = new cerimoniaSignatarioUseCase();
