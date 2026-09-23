require('dotenv/config');

module.exports = {
    port: process.env.ADDON_PORT || 7810,
    statusApp: { prod: 'production', dev: 'development' },
    statusAplication: { status: process.env.APP_STATUS || 'development' },
    defaultLogLevel: process.env.LOG_LEVEL || 'info',
    urlSite: process.env.URLSITE || 'http://localhost:3395',
    // URL pública do Web App do Addon (Apps Script /exec). Sem ela o convite
    // por e-mail continua apontando para o site.
    webappUrl: process.env.WEBAPP_URL || '',

    statusInstalacao: {
        ativa: 'ATIVA',
        revogada: 'REVOGADA',
    },

    statusPedido: {
        validando: 'VALIDANDO',
        enviado: 'ENVIADO',
        aguardando_assinaturas: 'AGUARDANDO_ASSINATURAS',
        assinado: 'ASSINADO',
        erro: 'ERRO',
    },

    // Status como a API expõe em GET /solicitacoes/:id
    statusApiSolicitacao: {
        solicitado: 'SOLICITADO',
        processamento_hash_inicial: 'PROCESSAMENTO_HASH_INICIAL',
        upload_concluido: 'UPLOAD_CONCLUIDO',
        erro_hash_inicial: 'ERRO_HASH_INICIAL',
        solicitado_assinatura_concluido: 'SOLICITADO_ASSINATURA_CONCLUIDO',
        concluido: 'CONCLUIDO',
    },
    statusApiDocumento: {
        documento_recebido: 'DOCUMENTO_RECEBIDO',
        documento_aguardando_assinatura: 'DOCUMENTO_AGUARDANDO_ASSINATURA',
        documento_assinado: 'DOCUMENTO_ASSINADO',
    },
    tipoTermoApi: {
        termo_documento: 'TERMO_DOCUMENTO',
    },

    eventoRastreio: {
        instalacao_vinculada: 'INSTALACAO_VINCULADA',
        instalacao_revogada: 'INSTALACAO_REVOGADA',
        usuario_criado: 'USUARIO_CRIADO',
        pedido_validado: 'PEDIDO_VALIDADO',
        pedido_enviado: 'PEDIDO_ENVIADO',
        pedido_erro: 'PEDIDO_ERRO',
        arquivo_validado: 'ARQUIVO_VALIDADO',
        assinado_gravado_drive: 'ASSINADO_GRAVADO_DRIVE',
        assinatura_concluida: 'ASSINATURA_CONCLUIDA',
    },

    tipoArquivoDrive: {
        origem: 'ORIGEM',
        copia: 'COPIA',
        pedido_json: 'PEDIDO_JSON',
        assinado: 'ASSINADO',
    },

    drive: {
        apiUrl: 'https://www.googleapis.com/drive/v3',
        uploadUrl: 'https://www.googleapis.com/upload/drive/v3',
        magicPdf: '%PDF-',
        maxBytes: 25 * 1024 * 1024,
        mimePdf: 'application/pdf',
        mimePasta: 'application/vnd.google-apps.folder',
        mimeAtalho: 'application/vnd.google-apps.shortcut',
        pedidoJsonNome: 'pedido.json',
        assinadoNome: 'contrato-assinado.pdf',
        // Raiz usada quando a instalação não configura pasta_raiz_drive.
        pastaRaizPadrao: 'Net Sign',
    },

    // Quadro fixo exigido pelo use case de signatários da API (certs -> quadro_assinatura_tamanho)
    quadroAssinatura: { largura: 230, altura: 115 },

    legacyApi: {
        url: process.env.LEGACY_API_URL || 'http://apisignature:9366',
        apikey: process.env.LEGACY_APIKEY || '',
        pollTentativas: 20,
        pollIntervaloMs: 3000,
    },

    // Conta de serviço com domain-wide delegation: o serviço impersona o
    // e-mail da instalação (sub) pra falar com o Drive dela sem token do Apps Script.
    googleSA: {
        clientEmail: process.env.GOOGLE_SA_CLIENT_EMAIL || '',
        privateKey: (process.env.GOOGLE_SA_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
        scope: 'https://www.googleapis.com/auth/drive',
        tokenUrl: 'https://oauth2.googleapis.com/token',
    },

    // Cliente OAuth "Aplicativo da Web": consentimento explícito do usuário
    // antes do vínculo — DWD sozinho não libera sem essa etapa.
    googleOAuth: {
        clientId: process.env.GOOGLE_OAUTH_CLIENT_ID || '',
        clientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET || '',
        redirectUri: process.env.GOOGLE_OAUTH_REDIRECT_URI || '',
        scope: 'https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/userinfo.email',
    },
};
