import { STATUS_DOCUMENTO, STATUS_SOLICITACAO, STATUS_SIGNATARIO } from "../services/panel/types";

/** IDs estáveis dos usuários demo do painel */
export const MOCK_PANEL_USERS = {
  admin: {
    userId: "user-admin",
    nome: "Gabriel Sotero",
    email: "gabriel@netexperts.com.br",
    role: "ADMIN",
  },
  user: {
    userId: "user-mariana",
    nome: "Mariana Reis",
    email: "mariana@netexperts.com.br",
    role: "USER",
  },
  signer: {
    userId: "user-ana",
    nome: "Ana Costa",
    email: "ana.costa@exemplo.com",
    role: "SIGNER",
  },
};

export const mockSolicitacoesSeed = [
  {
    id: "sol-1001",
    documento_id: "doc-1001",
    titulo: "Contrato de prestação de serviços — Q3",
    arquivo: "contrato-q3.pdf",
    status: STATUS_SOLICITACAO.SOLICITADO_ASSINATURA_CONCLUIDO,
    documento_status: STATUS_DOCUMENTO.DOCUMENTO_AGUARDANDO_ASSINATURA,
    criado_em: "2026-08-05 09:14:00",
    atualizado_em: "2026-08-07 16:22:00",
    owner_user_id: MOCK_PANEL_USERS.admin.userId,
    solicitante: MOCK_PANEL_USERS.admin.nome,
    solicitante_email: MOCK_PANEL_USERS.admin.email,
    signatarios: [
      {
        id: "sig-1",
        user_id: MOCK_PANEL_USERS.signer.userId,
        nome: "Ana Costa",
        email: "ana.costa@exemplo.com",
        status: STATUS_SIGNATARIO.PENDING,
        cor: "#0F766E",
        demarcaoes: [
          {
            id: "d1",
            tipo: "assinatura",
            page: 1,
            x: 0.12,
            y: 0.72,
            width: 0.28,
            height: 0.08,
          },
        ],
      },
      {
        id: "sig-2",
        user_id: "user-bruno",
        nome: "Bruno Lima",
        email: "bruno.lima@exemplo.com",
        status: STATUS_SIGNATARIO.SIGNED,
        cor: "#0B1F33",
        demarcaoes: [
          {
            id: "d2",
            tipo: "assinatura",
            page: 1,
            x: 0.55,
            y: 0.72,
            width: 0.28,
            height: 0.08,
          },
        ],
      },
    ],
    timeline: [
      {
        id: "ev-1",
        sequencia: 1,
        titulo: "Arquivo enviado",
        descricao: "PDF recebido e armazenado.",
        em: "2026-08-05 09:14:00",
      },
      {
        id: "ev-2",
        sequencia: 2,
        titulo: "Hash concluído",
        descricao: "Documento pronto para signatários.",
        em: "2026-08-05 09:16:20",
      },
      {
        id: "ev-3",
        sequencia: 3,
        titulo: "Assinaturas solicitadas",
        descricao: "Convites distribuídos.",
        em: "2026-08-05 10:02:00",
      },
    ],
  },
  {
    id: "sol-1002",
    documento_id: "doc-1002",
    titulo: "Aditivo contratual — Cliente Alpha",
    arquivo: "aditivo-alpha.pdf",
    status: STATUS_SOLICITACAO.PROCESSAMENTO_HASH_INICIAL,
    documento_status: STATUS_DOCUMENTO.DOCUMENTO_RECEBIDO,
    criado_em: "2026-08-08 11:02:00",
    atualizado_em: "2026-08-08 11:03:00",
    owner_user_id: MOCK_PANEL_USERS.admin.userId,
    solicitante: MOCK_PANEL_USERS.admin.nome,
    solicitante_email: MOCK_PANEL_USERS.admin.email,
    signatarios: [
      {
        id: "sig-3",
        user_id: null,
        nome: "Carla Mendes",
        email: "carla@alpha.com",
        status: STATUS_SIGNATARIO.AGUARDANDO_ONBOARDING,
        cor: "#14B8A6",
        demarcaoes: [],
      },
    ],
    timeline: [
      {
        id: "ev-a1",
        sequencia: 1,
        titulo: "Arquivo enviado",
        descricao: "Aguardando hash inicial.",
        em: "2026-08-08 11:02:00",
      },
    ],
  },
  {
    id: "sol-1003",
    documento_id: "doc-1003",
    titulo: "NDA — Parceria Beta",
    arquivo: "nda-beta.pdf",
    status: STATUS_SOLICITACAO.UPLOAD_CONCLUIDO,
    documento_status: STATUS_DOCUMENTO.DOCUMENTO_RECEBIDO,
    criado_em: "2026-08-07 14:40:00",
    atualizado_em: "2026-08-07 14:55:00",
    owner_user_id: MOCK_PANEL_USERS.user.userId,
    solicitante: MOCK_PANEL_USERS.user.nome,
    solicitante_email: MOCK_PANEL_USERS.user.email,
    signatarios: [],
    timeline: [
      {
        id: "ev-b1",
        sequencia: 1,
        titulo: "Upload concluído",
        descricao: "Pronto para cadastro de signatários.",
        em: "2026-08-07 14:55:00",
      },
    ],
  },
  {
    id: "sol-1004",
    documento_id: "doc-1004",
    titulo: "Procuração eletrônica",
    arquivo: "procuracao.pdf",
    status: STATUS_SOLICITACAO.ERRO_HASH_INICIAL,
    documento_status: STATUS_DOCUMENTO.DOCUMENTO_RECEBIDO,
    criado_em: "2026-08-06 08:10:00",
    atualizado_em: "2026-08-06 08:12:00",
    owner_user_id: MOCK_PANEL_USERS.admin.userId,
    solicitante: MOCK_PANEL_USERS.admin.nome,
    solicitante_email: MOCK_PANEL_USERS.admin.email,
    signatarios: [],
    timeline: [
      {
        id: "ev-err",
        sequencia: 1,
        titulo: "Erro no hash inicial",
        descricao: "Falha ao carimbar o documento.",
        em: "2026-08-06 08:12:00",
        erro: true,
      },
    ],
  },
  {
    id: "sol-1005",
    documento_id: "doc-1005",
    titulo: "Termo de confidencialidade — RH",
    arquivo: "termo-rh.pdf",
    status: STATUS_SOLICITACAO.CONCLUIDO,
    documento_status: STATUS_DOCUMENTO.DOCUMENTO_ASSINADO,
    criado_em: "2026-07-28 10:00:00",
    atualizado_em: "2026-07-30 18:45:00",
    owner_user_id: MOCK_PANEL_USERS.user.userId,
    solicitante: MOCK_PANEL_USERS.user.nome,
    solicitante_email: MOCK_PANEL_USERS.user.email,
    signatarios: [
      {
        id: "sig-4",
        user_id: MOCK_PANEL_USERS.signer.userId,
        nome: "Ana Costa",
        email: "ana.costa@exemplo.com",
        status: STATUS_SIGNATARIO.SIGNED,
        cor: "#0F766E",
        demarcaoes: [
          {
            id: "d3",
            tipo: "assinatura",
            page: 1,
            x: 0.35,
            y: 0.8,
            width: 0.3,
            height: 0.07,
          },
        ],
      },
    ],
    timeline: [
      {
        id: "ev-c1",
        sequencia: 1,
        titulo: "Documento assinado",
        descricao: "Todos os signatários concluiram.",
        em: "2026-07-30 18:45:00",
      },
    ],
  },
  {
    id: "sol-1006",
    documento_id: "doc-1006",
    titulo: "Contrato de locação — Unidade 12",
    arquivo: "locacao-12.pdf",
    status: STATUS_SOLICITACAO.SOLICITADO,
    documento_status: null,
    criado_em: "2026-08-09 08:30:00",
    atualizado_em: "2026-08-09 08:30:00",
    owner_user_id: MOCK_PANEL_USERS.user.userId,
    solicitante: MOCK_PANEL_USERS.user.nome,
    solicitante_email: MOCK_PANEL_USERS.user.email,
    signatarios: [],
    timeline: [],
  },
];

/** @deprecated use seed + panel service; mantido para imports legados */
export const mockSolicitacoes = mockSolicitacoesSeed;

export const getSolicitacaoById = (id) =>
  mockSolicitacoesSeed.find((s) => s.id === id || s.id === `sol-${id}`);

export const getDashboardStats = () => {
  const total = mockSolicitacoesSeed.length;
  const aguardando = mockSolicitacoesSeed.filter(
    (s) => s.status === STATUS_SOLICITACAO.SOLICITADO_ASSINATURA_CONCLUIDO
  ).length;
  const processando = mockSolicitacoesSeed.filter((s) =>
    [
      STATUS_SOLICITACAO.PROCESSAMENTO_HASH_INICIAL,
      STATUS_SOLICITACAO.SOLICITADO,
    ].includes(s.status)
  ).length;
  const concluidos = mockSolicitacoesSeed.filter(
    (s) => s.status === STATUS_SOLICITACAO.CONCLUIDO
  ).length;
  const erros = mockSolicitacoesSeed.filter(
    (s) => s.status === STATUS_SOLICITACAO.ERRO_HASH_INICIAL
  ).length;

  return [
    {
      id: 1,
      title: "Solicitações",
      value: total,
      description: "Total no período",
      trend: "+12%",
    },
    {
      id: 2,
      title: "Aguardando assinatura",
      value: aguardando,
      description: "Pendentes com signatários",
      trend: `${aguardando} ativos`,
    },
    {
      id: 3,
      title: "Em processamento",
      value: processando,
      description: "Hash / upload",
      trend: "fila",
    },
    {
      id: 4,
      title: "Concluídos",
      value: concluidos,
      description: "Documentos finalizados",
      trend: `${erros} com erro`,
    },
  ];
};
