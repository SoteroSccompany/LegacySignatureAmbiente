
require("dotenv/config");
const { application } = require("express");
const path = require('path');
module.exports = {
    port: process.env.PORT || 8686,
    APIKEY: process.env.API_KEY,
    URLSITE: process.env.URL_FRONT || "http://localhost:3395",
    URLSITECLIENTE: 'http://localhost:3000',
    statusApp: {
        dev: 'development',
        prod: 'production',
    },
    statusAplication: {
        status: process.env.STATUSAPLICATION,
    },
    applicationName: 'Net Sign',
    defaultLogLevel: 'info',
    roles: {
        system: -1,
        admin: 0,
        user: 1,
        gerente: 1, // alias de user, mantido por compatibilidade
        signer: 2,
        supervisor: 3,
    },
    recovery: {
        maxTime: 15,
        type: 'minutes'
    },
    mailChange: {
        maxTime: 15,
        type: 'minutes'
    },
    systemUser: {
        id: '2f09833b-001e-4eaf-9c75-ed8ceaf3d181',
        email: 'system@system.com',
        role: -1
    },
    bussines: {
        logoPath: 'public/logo/logo.jpeg',
        logoFullPath: path.join(__dirname, '../public/logo/logo.png'),
        nameCompany: 'Net Sign',
        cnpj: '00.349.280/0001-48',
        address: 'MG 030 - Rod. Januário Carneiro',
        numero: '9084',
        nome: "Ventura",
        complemento: 'Edifício Empresarial Vale do Sereno Sala 304',
        bairro: 'Vale do Sereno',
        cidade: 'Nova Lima',
        estado: 'MG',
        cep: '34006-002',
        phone: '(31) 3422-1332',
        linkWppRegularizarPendencias: 'https://wa.me/553134221332?text=Ol%C3%A1%21+Gostaria+de+ajuda+na+minha+situa%C3%A7%C3%A3o',
        email: 'netfaturas@netexperts.com.br', //Trocar 
        emailContato: 'financeiro@netexperts.com.br',
        nameSoftware: 'Net Sign',
        timeLogin: 30,
        timeTypeLogin: 'minutes',
        timetoken: 1,
        limiteSenha: 8
    },
    minSenhaLength: 8,
    redis: {
        host: process.env.REDIS_HOST,
        port: process.env.REDIS_PORT,
        pass: process.env.REDIS_PASS,
        expirationConfirm: {
            time: 180,
            timeSearch: 500,
        },
        timeDefault: 7200
    },
    cookies: {
        token: "authorization",
        state: "state",
        nonce: "nonce"
    },
    historico: {
        trnasformcao: {
            create: {
                label: 'Criação',
                value: 0
            },
            update: {
                label: 'Edição',
                value: 1
            },
            dowload: {
                label: 'dowload',
                value: 2
            },
            delete: {
                label: 'Exclusão',
                value: 3
            },
            view: {
                label: 'Visualização',
                value: 4
            }
        }
    },
    views: {
        view_troca_email: "view_mudanca_email_user",
        view_requests: 'view_request_users',
        view_historico: 'view_historico_users',
        viewForgot: 'vw_user_forgot'
    },
    userMasterEmail: 'davi@netexperts.com.br',
    emailLabel: 'email',
    verificacaoDuasEtapas: {
        base: 'base32',
        tempoExpiracao: 15, // minutos
        tamanho: 20,
        tempoTipo: 'minutes',
        maximoTempoUso: 3, // tentativas,
        window: 1
    },
    rabbitMQData: {
        deadLetterExchange: 'dlx_exchange',
    },
    statusBroker: {
        pending: 0,
        processing: 1,
        processed: 2,
        failed: 3,
        failedNotRetry: 4
    },
    rabbitMQ: {
        defaultDelay: 1000,
        exchanges: {
            assinatura: 'signature_legacy',
        },
        queues: {
            estoque: {
                name: "estoque",
                routingKey: "estoque",
                exchange: "signature_legacy",
            },
            processarhashinicial: {
                name: "processarhashinicial",
                routingKey: "processarhashinicial",
                exchange: "signature_legacy",
            },
            aplicarassinatura: {
                name: "aplicarassinatura",
                routingKey: "aplicarassinatura",
                exchange: "signature_legacy",
            },
            distribuirconvitesignatario: {
                name: "distribuirconvitesignatario",
                routingKey: "distribuirconvitesignatario",
                exchange: "signature_legacy",
            },
            notificarcancelamentodocumento: {
                name: "notificarcancelamentodocumento",
                routingKey: "notificarcancelamentodocumento",
                exchange: "signature_legacy",
            },
            enviardocumentoassinadosignatarios: {
                name: "enviardocumentoassinadosignatarios",
                routingKey: "enviardocumentoassinadosignatarios",
                exchange: "signature_legacy",
            },
            processar_biometria: {
                name: "processarbiometria",
                routingKey: "processarbiometria",
                exchange: "signature_legacy",
            },
            selardocumentovault: {
                name: "selardocumentovault",
                routingKey: "selardocumentovault",
                exchange: "signature_legacy",
            },
        },
    },
    maxRetryReprocessBroker: 5,
    alertaUsuario: {
        tipos: {
            falha_envio_convite_signatario: 'FALHA_ENVIO_CONVITE_SIGNATARIO',
            convite_assinatura_recebido: 'CONVITE_ASSINATURA_RECEBIDO',
            documento_cancelado: 'DOCUMENTO_CANCELADO',
            documento_assinado_recebido: 'DOCUMENTO_ASSINADO_RECEBIDO',
            credenciais_staging_enviadas: 'CREDENCIAIS_STAGING_ENVIADAS',
            credenciais_enviadas: 'CREDENCIAIS_TEMPORARIAS_ENVIADAS',
            pendente_aprovacao_perfil_biometria: 'APROVACAO_PERFIL_BIOMETRIA',
            biometria_negada: 'PERFIL_BIOMETRIA_NEGADO',
            biometria_aprovada: 'PERFIL_BIOMETRIA_APROVADA',
        },
        referencia: {
            signatario: 'signatario',
            evento: 'evento',
            usuario_staging: 'usuario_staging',
            usuario: 'usuario',
        },
    },
    eventoSistema: {
        tipos: {
            convite_email_signatario: 'CONVITE_EMAIL_SIGNATARIO',
            estampa_upload_solicitada: 'ESTAMPA_UPLOAD_SOLICITADA',
            notificacao_cancelamento_documento: 'NOTIFICACAO_CANCELAMENTO_DOCUMENTO',
            documento_assinado_email_signatario: 'DOCUMENTO_ASSINADO_EMAIL_SIGNATARIO',
        },
        status: {
            pendente: 'PENDENTE',
            enviado: 'ENVIADO',
            falha: 'FALHA',
        },
        canais: {
            email: 'email',
            alerta: 'alerta',
            sistema: 'sistema',
        },
        origem: {
            solicitacao: 'solicitacao',
            signatario: 'signatario',
        },
    },

    configBuscaExterna: {
        chunkSize: 500,
        limit: 20
    },
    confiDoisFatores: {
        time: 30,
        timeSetup: 120,
        timeType: 'seconds',
        desafio: {
            autenticacaoCadastro: "Cadastro-OTP",
            login: "Login-OTP",
            perfilUsuario: "PerfilUsuario-OTP",
            signatarioCadastro: "Signatario-Cadastro",
            assinatura: "Assinatura-OTP",
            cadastro_termo_responsabilidade: "Cadastro-Termo-Responsabilidade",
            cadastro_perfil_biometria: "Cadastro-Perfil-Biometria",
            resposta_solicitacao_perfil_biometria: "Resposta-Solicitacao-Perfil-Biometria",
        }
    },
    assinaturaSessao: {
        limiteMinutos: 5,
        // default true preserva o comportamento atual (biometria obrigatória). Com
        // ASSINATURA_BIOMETRIA_OBRIGATORIA=false, a assinatura passa a exigir só o OTP
        // do desafio de assinatura, sem perfil biométrico aprovado nem identificação facial.
        biometriaObrigatoria: process.env.ASSINATURA_BIOMETRIA_OBRIGATORIA !== 'false',
    },
    statusDocumentos: {
        documento_recebido: "DOCUMENTO_RECEBIDO",
        documento_aguardando_assinatura: "DOCUMENTO_AGUARDANDO_ASSINATURA",
        documento_assinado: "DOCUMENTO_ASSINADO",
        documento_cancelado: "DOCUMENTO_CANCELADO",
    },
    statusValidacaoDocumento: {
        integro: "INTEGRO",
        divergente: "DIVERGENTE",
        nao_encontrado: "NAO_ENCONTRADO",
    },
    statusSignatario: {
        pendente: "PENDING",
        processando: "PROCESSING",
        assinado: "SIGNED",
        erro: "ERROR",
        aguardando_onboarding: "AGUARDANDO_ONBOARDING",
        cancelado: "CANCELADO",
    },
    statusUsuarioStaging: {
        pendente: "PENDENTE",
        promovido: "PROMOVIDO",
        expirado: "EXPIRADO",
    },
    origemUsuarioStaging: {
        painel: "painel",
        signatario: "signatario",
    },
    modoEstampaAssinatura: {
        desenho: "DESENHO",
        dados: "DADOS",
    },
    estampaAssinatura: {
        legendaPadrao: 'Assinado eletronicamente via Net Sign',
    },
    // Selo digital único da plataforma (PAdES) aplicado quando o último signatário assina.
    // O certificado do SignServer (e-CNPJ em produção) é quem aparece no validar.iti.gov.br.
    selagemPlataforma: {
        razao_social: process.env.PLATAFORMA_RAZAO_SOCIAL || 'Net Sign',
        reason: 'Selo digital da plataforma autenticando as assinaturas eletrônicas dos signatários',
        location: process.env.PLATAFORMA_LOCATION || 'Net Sign',
    },
    tipoDemarcacao: {
        assinatura: "assinatura",
        rubrica: "rubrica",
    },
    // Ordem do fluxo. upload_concluido | erro_hash_inicial = mesmo estágio (ramos).
    statusSolicitacao: {
        solicitado: "SOLICITADO",
        processamento_hash_inicial: "PROCESSAMENTO_HASH_INICIAL",
        upload_concluido: "UPLOAD_CONCLUIDO",
        erro_hash_inicial: "ERRO_HASH_INICIAL",
        solicitado_assinatura: "SOLICITADO_ASSINATURA_CONCLUIDO",
        cancelado: "CANCELADO",
    },
    eventoAuditoria: {
        // Solicitação
        solicitacao_upload: { sequencia: 1, label: "SOLICITACAO_ASSINATURA_UPLOAD_ARQUIVO" },
        upload_concluido: { sequencia: 2, label: "UPLOAD_CONCLUIDO_NAO_PROCESSADO" },
        upload_concluido_processado: { sequencia: 3, label: "UPLOAD_CONCLUIDO_HASH_PROCESSADO" },
        erro_hash_inicial: { sequencia: 2, label: "ERRO_HASH_INICIAL" },
        assinatura_solicitada: { sequencia: 3, label: "ASSINATURA_SOLICITADA" },
        // PDF
        documento_recebido: { sequencia: 3, label: "DOCUMENTO_RECEBIDO" },
        assinatura_aplicada: { sequencia: 2, label: "ASSINATURA_APLICADA" },
        documento_completo: { sequencia: 3, label: "DOCUMENTO_COMPLETO" },
        // Documento (dados)
        documento_dados_criado: { sequencia: 1, label: "DOCUMENTO_DADOS_CRIADO" },
        documento_dados_pronto: { sequencia: 2, label: "DOCUMENTO_DADOS_PRONTO" },
        documento_cancelado: { sequencia: 3, label: "DOCUMENTO_CANCELADO" },
        // Signatário / demarcação
        signatario_criado: { sequencia: 1, label: "SIGNATARIO_CRIADO" },
        signatario_perfil_vinculado: { sequencia: 2, label: "SIGNATARIO_PERFIL_VINCULADO" },
        signatario_processando: { sequencia: 2, label: "SIGNATARIO_PROCESSANDO" },
        signatario_assinado: { sequencia: 3, label: "SIGNATARIO_ASSINADO" },
        signatario_erro: { sequencia: 3, label: "SIGNATARIO_ERRO" },
        signatario_cancelado: { sequencia: 3, label: "SIGNATARIO_CANCELADO" },
        demarcacao_criada: { sequencia: 1, label: "DEMARCACAO_CRIADA" },
        // Documento (trilha selada, distinta da trilha de hash do PDF acima)
        documento_estampa_aplicada: { sequencia: 3, label: "DOCUMENTO_ESTAMPA_APLICADA" },
        documento_assinatura_finalizada: { sequencia: 4, label: "DOCUMENTO_ASSINATURA_FINALIZADA" },
        // Evento (ENVIADO | FALHA = mesmo estágio pós-SMTP)
        evento_criado: { sequencia: 1, label: "EVENTO_CRIADO" },
        evento_email_enviado: { sequencia: 2, label: "EVENTO_EMAIL_ENVIADO" },
        evento_email_falha: { sequencia: 2, label: "EVENTO_EMAIL_FALHA" },
        // Usuário staging (onboarding)
        usuario_staging_criado: { sequencia: 1, label: "USUARIO_STAGING_CRIADO" },
        usuario_staging_atualizado: { sequencia: 2, label: "USUARIO_STAGING_ATUALIZADO" },
        // Usuário
        usuario_criado: { sequencia: 1, label: "USUARIO_CRIADO" },
        usuario_atualizado: { sequencia: 2, label: "USUARIO_ATUALIZADO" },
        usuario_senha_real: { sequencia: 2, label: "USUARIO_ATUALIZADO_TROCA_SENHA_TEMPORARIA" },
        // Desafio de autenticação (setup 2FA, login, perfil, assinatura)
        desafio_criado: { sequencia: 1, label: "DESAFIO_CRIADO" },
        desafio_confirmado: { sequencia: 2, label: "DESAFIO_CONFIRMADO" },
        desafio_atualizado: { sequencia: 2, label: "DESAFIO_ATUALIZADO" },
        // Alerta de usuário
        alerta_usuario_criado: { sequencia: 1, label: "ALERTA_USUARIO_CRIADO" },
        // Perfil de usuário
        perfil_criado_assinatura: { sequencia: 1, label: "PERFIL_CRIADO_ASSINATURA" },
        perfil_criado: { sequencia: 1, label: "PERFIL_CRIADO" },
        perfil_alterado: { sequencia: 2, label: "PERFIL_ALTERADO" },
        // Login (sessão/token)
        login_criado: { sequencia: 1, label: "LOGIN_CRIADO" },
        login_transito_aprovado: { sequencia: 1, label: "LOGIN_TRANSITO_APROVADO" },
        //Termo de responsaábilidade 
        termo_responsabilidade_criado: { sequencia: 1, label: "TERMO_RESPONSABILIDADE_CRIADO" },
        termo_responsabilidade_atualizado: { sequencia: 2, label: "TERMO_RESPONSABILIDADE_ATUALIZADO" },
        // Aceite de termo de responsabilidade
        aceite_termo_responsabilidade_criado: { sequencia: 1, label: "ACEITE_TERMO_RESPONSABILIDADE_CRIADO" },
        aceite_termo_responsabilidade_atualizado: { sequencia: 2, label: "ACEITE_TERMO_RESPONSABILIDADE_ATUALIZADO" },
        aceite_termo_responsabilidade_foto: { sequencia: 2, label: "ACEITE_TERMO_RESPONSABILIDADE_FOTO" },
        //BiometricaUsuario
        biometria_cadastrada: { label: "BIOMETRICA_CADASTRADA", sequencia: 1 },
        // Perfil biometria
        perfil_biometria_criado: { sequencia: 1, label: "PERFIL_BIOMETRIA_CRIADO" },
        perfil_biometria_atualizado: { sequencia: 2, label: "PERFIL_BIOMETRIA_ATUALIZADO" },
        perfil_biometria_negadoo: { sequencia: 3, label: "PERFIL_BIOMETRIA_NEGADO" },
        perfil_biometria_aprovado: { sequencia: 3, label: "PERFIL_BIOMETRIA_APROVADO" },

        desafio_assinatura_documento_criado: { sequencia: 1, label: "DESAFIO_ASSINATURA_DOCUMENTO_CRIADO" },
        desafio_assinatura_documento_confirmado: { sequencia: 2, label: "DESAFIO_ASSINATURA_DOCUMENTO_CONFIRMADO" },

        identificacao_biometria_criada: { sequencia: 1, label: "IDENTIFICACAO_BIOMETRIA_CRIADA" },
        identificacao_biometria_confirmada: { sequencia: 2, label: "IDENTIFICACAO_BIOMETRIA_CONFIRMADA" },

        identificacao_biometria_negada: { sequencia: 3, lable: "IDENTIFICACAO_BIOMETRICA_NAO_CONFERE" },
        identificacao_biometria_aprovada: { sequencia: 3, lable: "IDENTIFICACAO_BIOMETRICA_CONFERE" },

        // Cadeia mestre (tab_auditoria_ledger)
        solicitacao_criada: { sequencia: 1, label: "SOLICITACAO_CRIADA" },
        solicitacao_confirmada: { sequencia: 2, label: "SOLICITACAO_CONFIRMADA" },
        solicitacao_cancelada: { sequencia: 4, label: "SOLICITACAO_CANCELADA" },
        signatario_adicionado: { sequencia: 1, label: "SIGNATARIO_ADICIONADO" },
        demarcacao_definida: { sequencia: 1, label: "DEMARCACAO_DEFINIDA" },
        documento_pronto_assinatura: { sequencia: 1, label: "DOCUMENTO_PRONTO_ASSINATURA" },
        aceite_termo_registrado: { sequencia: 1, label: "ACEITE_TERMO_REGISTRADO" },
        sessao_assinatura_aberta: { sequencia: 1, label: "SESSAO_ASSINATURA_ABERTA" },
        sessao_assinatura_confirmada: { sequencia: 2, label: "SESSAO_ASSINATURA_CONFIRMADA" },
        biometria_recebida: { sequencia: 1, label: "BIOMETRIA_RECEBIDA" },
        biometria_validada: { sequencia: 2, label: "BIOMETRIA_VALIDADA" },
        biometria_negada: { sequencia: 2, label: "BIOMETRIA_NEGADA" },
        estampa_solicitada: { sequencia: 1, label: "ESTAMPA_SOLICITADA" },
        folha_auditoria_gerada: { sequencia: 1, label: "FOLHA_AUDITORIA_GERADA" },
        documento_selado: { sequencia: 1, label: "DOCUMENTO_SELADO" },
        documento_validacao_solicitada: { sequencia: 1, label: "DOCUMENTO_VALIDACAO_SOLICITADA" }

    },
    objetoAuditoria: {
        solicitacao: 'SOLICITACAO',
        documento: 'DOCUMENTO',
        signatario: 'SIGNATARIO',
        demarcacao: 'DEMARCACAO',
        aceite_termo: 'ACEITE_TERMO',
        desafio_autenticacao: 'DESAFIO_AUTENTICACAO',
        identificacao_biometrica: 'IDENTIFICACAO_BIOMETRICA',
        evento: 'EVENTO',
        documento_validacao: 'DOCUMENTO_VALIDACAO',
    },
    buckets: {
        wip: process.env.BUCKET_NAME_WIP || 'legacy-signature-wip',
        valt: process.env.BUCKET_NAME_VAULT || 'legacy-signature-vault',
        // Prefixo raiz de todo objectName gravado no WIP (BucketConfig.objectName()) e nos
        // paths montados na mão (documento, foto de perfil biométrico, selfie da cerimônia) —
        // evita colisão de nomes entre instalações/ambientes que compartilhem o mesmo storage.
        aplicationName: process.env.APLICATION_NAME || 'legacysignature',
        temp_url_expiration: 60, // seconds,
        pastas: {
            documento: 'documentos',
            documento_ledger: 'ledger',
            documento_dados_ledger: 'documento_dados_ledger',
            solicitacao_ledger: 'solicitacao_ledger',
            signatario_ledger: 'signatario_ledger',
            demarcacao_ledger: 'demarcacao_ledger',
            evento_ledger: 'evento_ledger',
            usuario_ledger: 'usuario_ledger',
            usuario_staging_ledger: 'usuario_staging_ledger',
            desafio_autenticacao_ledger: 'desafio_autenticacao_ledger',
            alerta_usuario_ledger: 'alerta_usuario_ledger',
            perfil_usuario_ledger: 'perfil_usuario_ledger',
            login_ledger: 'login_ledger',
            termo_responsabilidade: 'termo_responsabilidade_ledger',
            aceite_termo_responsabilidade: 'aceite_termo_responsabilidade_ledger',
            perfil_biometria: 'perfil_biometria',
            documento_pdf_ledger: 'documento_pdf_ledger',
            documento_validacao_ledger: 'documento_validacao_ledger',
        }
    },
    serverSign: {
        host: process.env.SIGNSERVER_HOST || 'signserversignatureexperts',
        port: Number(process.env.SIGNSERVER_PORT) || 8080,
        useSSL: process.env.SIGNSERVER_USE_SSL === 'true',
        timeout: Number(process.env.SIGNSERVER_TIMEOUT) || 15000,
        obrigatorio: process.env.SIGNSERVER_OBRIGATORIO === 'true',
        algoritmoHash: 'SHA-256',
        workers: {
            carimbo: process.env.SIGNSERVER_WORKER_CARIMBO || 'CMSSignerCarimbo',
        },
    },
    tipo_termo_responsabilidade: {
        termo_documento: 'TERMO_DOCUMENTO',
        termo_concetimento_foto: 'TERMO_FOTO_PERFIL',
    },
    status_perfil_usuario: {
        pendente: 0,
        aprovado: 1
    },
    etapas_perfil_usuario: {
        dados: 0,
        facial: 1,
    },
    quadro_assinatura_tamanho: {
        largura: 230,
        altura: 115
    },
    tentativasAcesso: {
        naoProprio: 3,
        proprio: 5
    },
    statusBiometriaAssinatura: {
        aguardando_imagem: 0,
        aguardando_validacao: 1,
        validado: 2,
        negado: 3
    },
    checkBiometri: {
        checkSame: false
    }
}
