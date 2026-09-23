
const repositorioPedido = require('../../../infrastructure/db/services/PedidoRepository');
const repositorioArquivo = require('../../../infrastructure/db/services/ArquivoDriveRepository');
const repositorioEvento = require('../../../infrastructure/db/services/EventoRastreioRepository');
const repositorioOauthDrive = require('../../../infrastructure/db/services/OauthDriveRepository');
const repositorioInstalacao = require('../../../infrastructure/db/services/InstalacaoRepository');
const domainArquivo = require('../../domain/ArquivoDrive');
const domainEvento = require('../../domain/EventoRastreio');
const apiLegacy = require('../../../infrastructure/gateways/ApiLegacy');
const driveGateway = require('../../../infrastructure/gateways/Drive');
const dateNow = require('../../../infrastructure/gateways/functions/data/getToday');
const ErrorStackParser = require('error-stack-parser');
const crypto = require('crypto');
const moment = require('moment-timezone');
const { SHA } = require('../../../infrastructure/gateways/crypt/sha');
const {
    statusPedido,
    statusInstalacao,
    statusApiDocumento,
    eventoRastreio,
    tipoArquivoDrive,
    drive,
    urlSite,
    webappUrl,
} = require('../../../config');
const { hmacConvite, montarLinkAssinatura } = require('../../../infrastructure/gateways/functions/convite');
const logs = require('../../../Logs');

class getPedidoUseCase {

    async listarPedidos(data) {
        try {
            if (!data.instalacao) return { status: false, msg: "Instalação não autenticada." }
            const response = await repositorioPedido.getPedidosByInstalacaoId({ instalacao_id: data.instalacao.id, limit: data.limit, offset: data.offset })
            if (!response.status) return { status: false, msg: "Ocorreu um erro interno, tente novamente em instantes." }
            const pedidos = response.data.map((pedido) => ({
                id: pedido.id,
                titulo: pedido.titulo,
                status: pedido.status,
                erro_msg: pedido.erro_msg,
                documento_id: pedido.documento_id,
                criado_em: this.#formatarData(pedido.data_criacao),
                atualizado_em: this.#formatarData(pedido.data_atualizacao),
            }));
            return { status: true, data: pedidos, msg: "Pedidos listados com sucesso." }
        } catch (err) {
            console.log(err)
            return { status: false, msg: 'Erro interno do servidor, log gerado' }
        }
    }

    // Documentos onde o e-mail desta instalação aparece como signatário
    // (recebeu convite) — inclui o gerente que se incluiu como destinatário.
    // Mesmo convite HMAC do e-mail; sem WEBAPP_URL o addon-service devolve as
    // peças e o Addon monta o link com a própria WEBAPP_URL do Script.
    async listarPendenciasAssinatura(data) {
        try {
            if (!data.instalacao) return { status: false, msg: "Instalação não autenticada." }
            const email = String(data.instalacao.email_usuario || '').trim().toLowerCase();
            if (!email) return { status: false, msg: "E-mail da instalação não encontrado." }
            const response = await repositorioPedido.getPedidosByEmailSignatario({ email })
            if (!response.status) return { status: false, msg: "Ocorreu um erro interno, tente novamente em instantes." }
            const pendencias = response.data
                .filter((pedido) => pedido.status !== statusPedido.erro && pedido.status !== statusPedido.validando)
                .map((pedido) => {
                    const conviteOk = !!(pedido.documento_id && pedido.id && email);
                    return {
                        id: pedido.id,
                        titulo: pedido.titulo,
                        status: pedido.status,
                        documento_id: pedido.documento_id,
                        criado_em: this.#formatarData(pedido.data_criacao),
                        // Só o pedido local fechado. AGUARDANDO_ASSINATURAS não é
                        // "já assinei" — senão o card some o Assinar de todo mundo.
                        assinado_por_mim: pedido.status === statusPedido.assinado,
                        convite: conviteOk ? { documento_id: pedido.documento_id, pedido_id: pedido.id, email, convite: hmacConvite(pedido.documento_id, pedido.id, email) } : null,
                        link: (conviteOk && webappUrl) ? montarLinkAssinatura(webappUrl, pedido.documento_id, pedido.id, email) : null,
                    };
                });
            return { status: true, data: pendencias, msg: "Pendências listadas com sucesso." }
        } catch (err) {
            console.log(err)
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(err);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            logs.getInstance().error({ linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), err }, 'Erro no getPedidoUseCase - listarPendenciasAssinatura')
            return { status: false, msg: 'Erro interno do servidor, log gerado' }
        }
    }

    async statusPedido(data) {
        try {
            if (!data.instalacao) return { status: false, msg: "Instalação não autenticada." }
            if (!data.id) return { status: false, msg: "Pedido não informado." }
            const checkPedido = await repositorioPedido.getPedidoById({ id: data.id })
            if (!checkPedido.status) return { status: false, msg: "Ocorreu um erro interno, tente novamente em instantes." }
            if (!checkPedido.exit) return { status: false, msg: "Pedido não encontrado." }
            const pedido = checkPedido.data;
            if (pedido.instalacao_id !== data.instalacao.id) return { status: false, msg: "Pedido não pertence a esta instalação." }
            if (!pedido.solicitacao_id) return { status: true, data: this.#resumo(pedido, null), msg: "Status do pedido." }
            const detalhe = await apiLegacy.get(`/api/admin/solicitacoes/${pedido.solicitacao_id}`, data.instalacao.chave_api)
            if (!detalhe.status) return { status: true, data: this.#resumo(pedido, null), msg: "Status local do pedido (API indisponível no momento)." }
            const documento = detalhe.data?.data?.documento || null;
            const signatarios = detalhe.data?.data?.signatarios || [];

            // Documento assinado e ainda não gravado no Drive: fecha o ciclo na pasta do processo.
            if (documento && documento.status === statusApiDocumento.documento_assinado && pedido.status !== statusPedido.assinado) {
                const gravado = await this.#gravarAssinadoNoDrive(pedido, documento, data.instalacao);
                if (!gravado.status) return { status: true, data: this.#resumo(pedido, { documento, signatarios, pendente_gravar_drive: true }), msg: gravado.msg }
                pedido.status = statusPedido.assinado;
                pedido.hash_assinado = gravado.sha256;
            }
            return { status: true, data: this.#resumo(pedido, { documento, signatarios }), msg: "Status do pedido." }
        } catch (err) {
            console.log(err)
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(err);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            logs.getInstance().error({ linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), err }, 'Erro no getPedidoUseCase - statusPedido')
            return { status: false, msg: 'Erro interno do servidor, log gerado' }
        }
    }

    // Chamado pelo poll da cerimônia (statusAssinatura) quando a API fecha o
    // documento no signatário atual. Reconfere tudo direto na API com a lsak
    // do solicitante — não confia no payload que a cerimônia do signatário
    // recebeu (o signatário nem tem essa chave).
    async tentarGravarAssinadoPorDocumento(data) {
        try {
            if (!data.documento_id) return { status: false, msg: "Documento não informado." }
            const checkPedido = await repositorioPedido.getPedidoByDocumentoId({ documento_id: data.documento_id })
            if (!checkPedido.status) return { status: false, msg: "Ocorreu um erro interno, tente novamente em instantes." }
            if (!checkPedido.exit) return { status: true, msg: "Documento não nasceu de um pedido do Addon." }
            const pedido = checkPedido.data;
            if (pedido.status === statusPedido.assinado) return { status: true, msg: "PDF assinado já gravado no Drive." }
            if (!pedido.solicitacao_id) return { status: true, msg: "Pedido sem solicitação vinculada." }
            const checkInstalacao = await repositorioInstalacao.getInstalacaoById({ id: pedido.instalacao_id })
            if (!checkInstalacao.status) return { status: false, msg: "Ocorreu um erro interno, tente novamente em instantes." }
            if (!checkInstalacao.exit) return { status: true, msg: "Instalação do solicitante não encontrada." }
            const instalacao = checkInstalacao.data;
            if (instalacao.status !== statusInstalacao.ativa) return { status: true, msg: "Instalação do solicitante revogada." }
            const sha = new SHA();
            const chaveApi = sha.decrypt(instalacao.chave_api);
            const detalhe = await apiLegacy.get(`/api/admin/solicitacoes/${pedido.solicitacao_id}`, chaveApi)
            if (!detalhe.status) return { status: true, msg: "API indisponível no momento." }
            const documento = detalhe.data?.data?.documento || null;
            if (!documento || documento.status !== statusApiDocumento.documento_assinado) return { status: true, msg: "Documento ainda não assinado." }
            const gravado = await this.#gravarAssinadoNoDrive(pedido, documento, { ...instalacao, chave_api: chaveApi });
            if (!gravado.status) return { status: true, msg: gravado.msg }
            return { status: true, msg: "PDF assinado gravado no Drive." }
        } catch (err) {
            console.log(err)
            let lineError = '0';
            let fileName = '0';
            const stackFrames = ErrorStackParser.parse(err);
            if (stackFrames.length > 0) {
                lineError = stackFrames[0].lineNumber;
                fileName = stackFrames[0].fileName;
            }
            logs.getInstance().error({ linhaDoErro: lineError, nomeDoArquivo: fileName, data_criacao: dateNow(), err }, 'Erro no getPedidoUseCase - tentarGravarAssinadoPorDocumento')
            return { status: false, msg: 'Erro interno do servidor, log gerado' }
        }
    }

    #resumo(pedido, api) {
        return {
            id: pedido.id,
            titulo: pedido.titulo,
            status: pedido.status,
            erro: pedido.erro_msg || null,
            solicitacao_id: pedido.solicitacao_id,
            documento_id: pedido.documento_id,
            pasta_processo_drive_id: pedido.pasta_processo_drive_id,
            hash_original: pedido.hash_original,
            hash_assinado: pedido.hash_assinado,
            criado_em: this.#formatarData(pedido.data_criacao),
            atualizado_em: this.#formatarData(pedido.data_atualizacao),
            site: urlSite,
            api: api ? {
                documento_status: api.documento ? api.documento.status : null,
                signatarios: (api.signatarios || []).map((s) => ({ nome: s.nome, email: s.email, status: s.status, assinado_em: this.#formatarData(s.assinado_em) })),
                pendente_gravar_drive: api.pendente_gravar_drive === true,
            } : null,
        }
    }

    // Datas persistidas em America/Sao_Paulo (dateNow/moment.tz) — só troca o
    // formato de exibição, sem converter fuso.
    #formatarData(valor) {
        if (!valor) return null;
        const formatada = moment(valor);
        if (!formatada.isValid()) return null;
        return formatada.format('DD/MM/YYYY HH:mm');
    }

    async #gravarAssinadoNoDrive(pedido, documento, instalacao) {
        const checkOauth = await repositorioOauthDrive.getByEmail({ email: instalacao.email_usuario })
        if (!checkOauth.status) return { status: false, msg: "Ocorreu um erro interno, tente novamente em instantes." }
        if (!checkOauth.exit) return { status: false, msg: "Autorize o acesso ao Drive (\"Autorizar Drive\" no card do Addon) para gravar o PDF assinado." }
        const download = await apiLegacy.get(`/api/admin/documentos/${documento.id}/download`, instalacao.chave_api)
        if (!download.status) return { status: false, msg: "Não foi possível gerar a URL do documento assinado na API." }
        const url = download.data?.data?.url;
        if (!url) return { status: false, msg: "A API não devolveu a URL do documento assinado." }
        const arquivo = await apiLegacy.getArquivoUrl(url)
        if (!arquivo.status) return { status: false, msg: "Falha ao baixar o documento assinado." }
        const magic = arquivo.data.slice(0, 5).toString('utf8');
        if (magic !== drive.magicPdf) return { status: false, msg: "O documento assinado baixado não tem cabeçalho de PDF válido." }
        const sha256 = crypto.createHash('sha256').update(arquivo.data).digest('hex');
        // Conferência com a segunda fonte: hash_final que a API gravou no documento.
        if (documento.hash_final && documento.hash_final !== sha256) return { status: false, msg: "O hash do assinado baixado não confere com o hash registrado na API." }
        // O assinado fica ao lado do original, com o nome dele: <nome>-assinado.pdf.
        // Pedido antigo, sem registro de origem, mantém o nome padrão.
        const checkArquivos = await repositorioArquivo.getArquivosByPedidoId({ pedido_id: pedido.id })
        if (!checkArquivos.status) return { status: false, msg: "Ocorreu um erro interno, tente novamente em instantes." }
        let nomeAssinado = drive.assinadoNome;
        if (checkArquivos.exit) {
            const origem = checkArquivos.data.find((a) => a.tipo === tipoArquivoDrive.origem);
            if (origem && origem.nome) nomeAssinado = origem.nome.replace(/\.pdf$/i, '') + '-assinado.pdf';
        }
        // A pasta de destino é a de onde o usuário escolheu o arquivo — pode ter sido
        // movida ou jogada na lixeira entre o pedido e a conclusão das assinaturas.
        const pasta = await driveGateway.getMetadados({ email: instalacao.email_usuario, fileId: pedido.pasta_processo_drive_id })
        if (!pasta.status) return { status: false, msg: "Ocorreu um erro interno, tente novamente em instantes." }
        if (!pasta.exit) return { status: false, msg: "A pasta do documento no Drive não está mais disponível." }
        if (pasta.data.trashed) return { status: false, msg: "A pasta do documento no Drive não está mais disponível." }
        const upload = await driveGateway.uploadArquivo({
            email: instalacao.email_usuario,
            nome: nomeAssinado,
            parentId: pedido.pasta_processo_drive_id,
            buffer: arquivo.data,
            contentType: 'application/pdf',
        });
        if (!upload.status) return { status: false, msg: "Falha ao gravar o PDF assinado na pasta do documento." }
        if (!(upload.data.parents || []).includes(pedido.pasta_processo_drive_id)) return { status: false, msg: "O PDF assinado não foi gravado na pasta do documento." }
        const persistPedido = await repositorioPedido.updatePedido({
            id: pedido.id,
            status: statusPedido.assinado,
            hash_assinado: sha256,
            data_atualizacao: dateNow(),
        })
        if (!persistPedido.status) return { status: false, msg: "PDF gravado no Drive, mas o rastreio local falhou. Consulte novamente." }
        await repositorioArquivo.createArquivoDrive(new domainArquivo({
            pedido_id: pedido.id,
            tipo: tipoArquivoDrive.assinado,
            drive_file_id: upload.data.id,
            nome: nomeAssinado,
            tamanho: arquivo.data.length,
            mime_type: 'application/pdf',
            sha256,
        }).getArquivoDrive());
        await repositorioEvento.createEvento(new domainEvento({
            instalacao_id: pedido.instalacao_id,
            pedido_id: pedido.id,
            tipo_evento: eventoRastreio.assinado_gravado_drive,
            meta_dados: { documento_id: documento.id, sha256, drive_file_id: upload.data.id },
        }).getEventoRastreio());
        return { status: true, sha256 }
    }

}

module.exports = new getPedidoUseCase();
