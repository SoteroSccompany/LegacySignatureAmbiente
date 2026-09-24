import { mockSolicitacoesSeed, MOCK_PANEL_USERS } from "../../mocks/solicitacoes";
import { mockUsuarios as mockUsuariosSeed } from "../../mocks/usuarios";
import { mockAlertas } from "../../mocks/alertas";
import { getSessionUser, getRole, ROLES, can, CAPABILITY } from "../../utils/roles";
import {
  PANEL_MOCK_STATE_KEY,
  STATUS_DOCUMENTO,
  STATUS_SIGNATARIO,
  STATUS_SOLICITACAO,
} from "./types";

const delay = (ms = 220) => new Promise((r) => setTimeout(r, ms));

const nowStr = () => {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};

const readStore = () => {
  try {
    const raw = sessionStorage.getItem(PANEL_MOCK_STATE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* ignore */
  }
  const initial = {
    solicitacoes: JSON.parse(JSON.stringify(mockSolicitacoesSeed)),
    usuarios: JSON.parse(JSON.stringify(mockUsuariosSeed)),
    alertas: JSON.parse(JSON.stringify(mockAlertas)),
    pollTicks: {},
  };
  sessionStorage.setItem(PANEL_MOCK_STATE_KEY, JSON.stringify(initial));
  return initial;
};

const writeStore = (store) => {
  sessionStorage.setItem(PANEL_MOCK_STATE_KEY, JSON.stringify(store));
};

const resolveOwnerId = () => {
  const session = getSessionUser();
  if (session.userId) return session.userId;
  const byEmail = Object.values(MOCK_PANEL_USERS).find(
    (u) => u.email.toLowerCase() === (session.email || "").toLowerCase()
  );
  return byEmail?.userId || "user-admin";
};

const canSeeSolicitacao = (sol, role, ownerId, signerId) => {
  if (role === ROLES.ADMIN) return true;
  if (role === ROLES.SUPERVISOR) return sol.owner_user_id === ownerId;
  if (role === ROLES.USER) {
    return (sol.signatarios || []).some(
      (s) => s.user_id === ownerId || s.email === getSessionUser().email
    );
  }
  if (role === ROLES.SIGNER) {
    return (sol.signatarios || []).some(
      (s) => s.user_id === signerId || s.email === getSessionUser().email
    );
  }
  return false;
};

const advanceSolicitacao = (sol, tick) => {
  const next = { ...sol, signatarios: (sol.signatarios || []).map((s) => ({ ...s })) };
  const timeline = [...(sol.timeline || [])];

  if (next.status === STATUS_SOLICITACAO.SOLICITADO && tick >= 1) {
    next.status = STATUS_SOLICITACAO.PROCESSAMENTO_HASH_INICIAL;
    next.documento_status = STATUS_DOCUMENTO.DOCUMENTO_RECEBIDO;
    timeline.push({
      id: `ev-${Date.now()}-hash`,
      sequencia: timeline.length + 1,
      titulo: "Processando hash",
      descricao: "Worker iniciou o hash inicial (simulado).",
      em: nowStr(),
    });
  } else if (
    next.status === STATUS_SOLICITACAO.PROCESSAMENTO_HASH_INICIAL &&
    tick >= 2
  ) {
    next.status = STATUS_SOLICITACAO.UPLOAD_CONCLUIDO;
    timeline.push({
      id: `ev-${Date.now()}-up`,
      sequencia: timeline.length + 1,
      titulo: "Upload concluído",
      descricao: "Hash e carimbo simulados com sucesso.",
      em: nowStr(),
    });
  } else if (
    next.status === STATUS_SOLICITACAO.UPLOAD_CONCLUIDO &&
    next.signatarios.length > 0 &&
    tick >= 3
  ) {
    next.status = STATUS_SOLICITACAO.SOLICITADO_ASSINATURA_CONCLUIDO;
    next.documento_status = STATUS_DOCUMENTO.DOCUMENTO_AGUARDANDO_ASSINATURA;
    next.signatarios = next.signatarios.map((s) =>
      s.status === STATUS_SIGNATARIO.AGUARDANDO_ONBOARDING
        ? { ...s, status: STATUS_SIGNATARIO.PENDING }
        : s
    );
    timeline.push({
      id: `ev-${Date.now()}-sig`,
      sequencia: timeline.length + 1,
      titulo: "Aguardando assinaturas",
      descricao: "Convites ativos (simulado).",
      em: nowStr(),
    });
  } else if (
    next.status === STATUS_SOLICITACAO.SOLICITADO_ASSINATURA_CONCLUIDO
  ) {
    const pending = next.signatarios.find(
      (s) =>
        s.status === STATUS_SIGNATARIO.PENDING ||
        s.status === STATUS_SIGNATARIO.PROCESSING
    );
    if (pending && tick % 2 === 0) {
      next.signatarios = next.signatarios.map((s) =>
        s.id === pending.id
          ? { ...s, status: STATUS_SIGNATARIO.SIGNED }
          : s
      );
      timeline.push({
        id: `ev-${Date.now()}-signed`,
        sequencia: timeline.length + 1,
        titulo: "Assinatura aplicada",
        descricao: `${pending.nome} assinou (simulado no poll).`,
        em: nowStr(),
      });
    }
    const allSigned =
      next.signatarios.length > 0 &&
      next.signatarios.every((s) => s.status === STATUS_SIGNATARIO.SIGNED);
    if (allSigned) {
      next.status = STATUS_SOLICITACAO.CONCLUIDO;
      next.documento_status = STATUS_DOCUMENTO.DOCUMENTO_ASSINADO;
      timeline.push({
        id: `ev-${Date.now()}-done`,
        sequencia: timeline.length + 1,
        titulo: "Documento assinado",
        descricao: "Todos os signatários concluíram.",
        em: nowStr(),
      });
    }
  }

  next.timeline = timeline;
  next.atualizado_em = nowStr();
  return next;
};

const metricsFromList = (list) => {
  const total = list.length;
  const aguardando = list.filter(
    (s) => s.status === STATUS_SOLICITACAO.SOLICITADO_ASSINATURA_CONCLUIDO
  ).length;
  const processando = list.filter((s) =>
    [
      STATUS_SOLICITACAO.PROCESSAMENTO_HASH_INICIAL,
      STATUS_SOLICITACAO.SOLICITADO,
    ].includes(s.status)
  ).length;
  const concluidos = list.filter(
    (s) => s.status === STATUS_SOLICITACAO.CONCLUIDO
  ).length;
  const erros = list.filter(
    (s) => s.status === STATUS_SOLICITACAO.ERRO_HASH_INICIAL
  ).length;
  return [
    {
      id: 1,
      title: "Solicitações",
      value: total,
      description: "No seu escopo",
      trend: `${total}`,
    },
    {
      id: 2,
      title: "Aguardando assinatura",
      value: aguardando,
      description: "Pendentes",
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
      description: "Finalizados",
      trend: `${erros} com erro`,
    },
  ];
};

export const panelMock = {
  async getDashboard() {
    await delay();
    const role = getSessionUser().role;
    if (role === ROLES.SIGNER) {
      const contratos = (await this.listMeusContratos()).data || [];
      const pendentes = contratos.filter((c) =>
        [STATUS_SIGNATARIO.PENDING, STATUS_SIGNATARIO.AGUARDANDO_ONBOARDING].includes(
          c.meu_status
        )
      ).length;
      const assinados = contratos.filter(
        (c) => c.meu_status === STATUS_SIGNATARIO.SIGNED
      ).length;
      return {
        status: true,
        data: {
          role,
          stats: [
            {
              id: 1,
              title: "Meus contratos",
              value: contratos.length,
              description: "Total vinculados a você",
              trend: `${contratos.length}`,
            },
            {
              id: 2,
              title: "Pendentes",
              value: pendentes,
              description: "Aguardando sua assinatura",
              trend: `${pendentes}`,
            },
            {
              id: 3,
              title: "Assinados",
              value: assinados,
              description: "Concluídos por você",
              trend: `${assinados}`,
            },
            {
              id: 4,
              title: "Alertas",
              value: mockAlertas.filter((a) => !a.lido).length,
              description: "Não lidos",
              trend: "inbox",
            },
          ],
          recentes: contratos.slice(0, 4).map((c) => ({
            id: c.solicitacao_id,
            titulo: c.titulo,
            arquivo: c.arquivo,
            status: c.solicitacao_status,
            atualizado_em: c.atualizado_em,
            signatarios: [{ id: c.signatario_id }],
          })),
        },
      };
    }

    const listResp = await this.listSolicitacoes({});
    const list = listResp.data || [];
    return {
      status: true,
      data: {
        role,
        stats: metricsFromList(list),
        recentes: list.slice(0, 4),
      },
    };
  },

  async listSolicitacoes({ busca = "", status = "TODOS" } = {}) {
    await delay();
    const role = getSessionUser().role;
    if (role === ROLES.SIGNER) {
      return { status: true, data: [], msg: "Signer usa /contratos" };
    }
    const store = readStore();
    const ownerId = resolveOwnerId();
    let list = store.solicitacoes.filter((s) =>
      canSeeSolicitacao(s, role, ownerId, ownerId)
    );
    if (status && status !== "TODOS") {
      list = list.filter((s) => s.status === status);
    }
    if (busca) {
      const q = busca.toLowerCase();
      list = list.filter(
        (s) =>
          s.titulo.toLowerCase().includes(q) ||
          s.arquivo.toLowerCase().includes(q) ||
          s.id.toLowerCase().includes(q) ||
          (s.solicitante || "").toLowerCase().includes(q)
      );
    }
    list = [...list].sort((a, b) =>
      (b.atualizado_em || "").localeCompare(a.atualizado_em || "")
    );
    return { status: true, data: list };
  },

  async getSolicitacao(id) {
    await delay();
    const store = readStore();
    const sol = store.solicitacoes.find(
      (s) => s.id === id || s.id === `sol-${id}` || s.documento_id === id
    );
    if (!sol) return { status: false, msg: "Solicitação não encontrada." };
    const role = getSessionUser().role;
    const ownerId = resolveOwnerId();
    if (!canSeeSolicitacao(sol, role, ownerId, ownerId)) {
      return { status: false, msg: "Sem permissão para esta solicitação." };
    }
    return { status: true, data: sol };
  },

  async getSolicitacaoStatus(id) {
    await delay(120);
    const store = readStore();
    const idx = store.solicitacoes.findIndex(
      (s) => s.id === id || s.id === `sol-${id}`
    );
    if (idx < 0) return { status: false, msg: "Solicitação não encontrada." };

    const role = getSessionUser().role;
    const ownerId = resolveOwnerId();
    if (!canSeeSolicitacao(store.solicitacoes[idx], role, ownerId, ownerId)) {
      return { status: false, msg: "Sem permissão." };
    }

    const key = store.solicitacoes[idx].id;
    store.pollTicks[key] = (store.pollTicks[key] || 0) + 1;
    const advanced = advanceSolicitacao(
      store.solicitacoes[idx],
      store.pollTicks[key]
    );
    store.solicitacoes[idx] = advanced;
    writeStore(store);

    const pendente = (advanced.signatarios || []).some((s) =>
      [
        STATUS_SIGNATARIO.PENDING,
        STATUS_SIGNATARIO.PROCESSING,
        STATUS_SIGNATARIO.AGUARDANDO_ONBOARDING,
      ].includes(s.status)
    );
    const emFluxo = ![
      STATUS_SOLICITACAO.CONCLUIDO,
      STATUS_SOLICITACAO.ERRO_HASH_INICIAL,
    ].includes(advanced.status);

    return {
      status: true,
      data: {
        ...advanced,
        polling: emFluxo || pendente,
      },
    };
  },

  async createSolicitacao({ titulo, descricao, arquivo, signatarios, areas }) {
    await delay(400);
    if (!can(CAPABILITY.createSolicitacao)) {
      return { status: false, msg: "Sem permissão para criar solicitação." };
    }
    const session = getSessionUser();
    const ownerId = resolveOwnerId();
    const store = readStore();
    const n = store.solicitacoes.length + 1;
    const id = `sol-${1000 + n}`;
    const documento_id = `doc-${1000 + n}`;
    const cores = ["#0F766E", "#0B1F33", "#14B8A6", "#334155", "#0D5F58"];

    const sigs = (signatarios || []).map((s, i) => {
      const demarcaoes = (areas || [])
        .filter((a) => a.signatarioId === s.id)
        .map((a, di) => ({
          id: `d-${id}-${di}`,
          tipo: a.tipo || "assinatura",
          page: a.page || 1,
          x: a.x,
          y: a.y,
          width: a.width,
          height: a.height,
        }));
      const known = Object.values(MOCK_PANEL_USERS).find(
        (u) => u.email.toLowerCase() === (s.email || "").toLowerCase()
      );
      return {
        id: s.id || `sig-${id}-${i}`,
        user_id: known?.userId || null,
        nome: s.nome,
        email: s.email,
        status: STATUS_SIGNATARIO.PENDING,
        cor: s.cor || cores[i % cores.length],
        demarcaoes,
      };
    });

    const nova = {
      id,
      documento_id,
      titulo,
      descricao: descricao || "",
      arquivo: arquivo || "documento.pdf",
      status: STATUS_SOLICITACAO.SOLICITADO,
      documento_status: null,
      criado_em: nowStr(),
      atualizado_em: nowStr(),
      owner_user_id: ownerId,
      solicitante: session.nome || "Usuário",
      solicitante_email: session.email,
      signatarios: sigs,
      timeline: [
        {
          id: `ev-${id}-1`,
          sequencia: 1,
          titulo: "Solicitação criada",
          descricao: "Aguardando processamento do hash (simulado).",
          em: nowStr(),
        },
      ],
    };

    store.solicitacoes.unshift(nova);
    store.pollTicks[id] = 0;
    writeStore(store);
    return {
      status: true,
      data: { ...nova, id, upload_url: `https://mock.local/upload/${id}` },
      msg: "Solicitação criada.",
    };
  },

  async uploadArquivo() {
    await delay(180);
    return { status: true, msg: "Upload concluído." };
  },

  async confirmUpload(id) {
    await delay();
    const store = readStore();
    const idx = store.solicitacoes.findIndex(
      (s) => s.id === id || s.documento_id === id
    );
    if (idx < 0) return { status: false, msg: "Solicitação não encontrada." };
    store.solicitacoes[idx] = {
      ...store.solicitacoes[idx],
      status: STATUS_SOLICITACAO.UPLOAD_CONCLUIDO,
      documento_status: STATUS_DOCUMENTO.DOCUMENTO_RECEBIDO,
      atualizado_em: nowStr(),
    };
    writeStore(store);
    return { status: true, msg: "Processamento iniciado.", data: store.solicitacoes[idx] };
  },

  async addSignatarios(id, list) {
    await delay();
    const store = readStore();
    const idx = store.solicitacoes.findIndex(
      (s) => s.id === id || s.documento_id === id
    );
    if (idx < 0) return { status: false, msg: "Solicitação não encontrada." };
    if (!can(CAPABILITY.createSolicitacao)) {
      return { status: false, msg: "Sem permissão." };
    }
    const cores = ["#0F766E", "#0B1F33", "#14B8A6"];
    const novos = (list || []).map((s, i) => {
      const data = s.data || s;
      const signs = s.sign || s.demarcaoes || [];
      return {
        id: s.id || `sig-extra-${Date.now()}-${i}`,
        user_id: null,
        nome: data.nome,
        email: data.email,
        status: STATUS_SIGNATARIO.PENDING,
        cor: s.cor || cores[i % cores.length],
        demarcaoes: signs.map((a, di) => ({
          id: a.id || `d-${Date.now()}-${di}`,
          tipo: a.tipo || "assinatura",
          page: a.pagina || a.page || 1,
          x: a.x,
          y: a.y,
          width: a.largura ?? a.width,
          height: a.altura ?? a.height,
        })),
      };
    });
    store.solicitacoes[idx].signatarios = novos.length
      ? novos
      : store.solicitacoes[idx].signatarios;
    store.solicitacoes[idx].status =
      STATUS_SOLICITACAO.SOLICITADO_ASSINATURA_CONCLUIDO;
    store.solicitacoes[idx].documento_status =
      STATUS_DOCUMENTO.DOCUMENTO_AGUARDANDO_ASSINATURA;
    store.solicitacoes[idx].atualizado_em = nowStr();
    writeStore(store);
    return { status: true, data: store.solicitacoes[idx] };
  },

  async saveDemarcacoes(id, areas) {
    await delay();
    const store = readStore();
    const idx = store.solicitacoes.findIndex((s) => s.id === id);
    if (idx < 0) return { status: false, msg: "Solicitação não encontrada." };
    const sol = store.solicitacoes[idx];
    sol.signatarios = sol.signatarios.map((s) => ({
      ...s,
      demarcaoes: (areas || [])
        .filter((a) => a.signatarioId === s.id)
        .map((a, di) => ({
          id: a.id || `d-${s.id}-${di}`,
          tipo: a.tipo || "assinatura",
          page: a.page || 1,
          x: a.x,
          y: a.y,
          width: a.width,
          height: a.height,
        })),
    }));
    sol.atualizado_em = nowStr();
    writeStore(store);
    return { status: true, data: sol, msg: "Demarcações salvas." };
  },

  async listMeusContratos() {
    await delay();
    const store = readStore();
    const session = getSessionUser();
    const signerId = resolveOwnerId();
    const rows = [];
    for (const sol of store.solicitacoes) {
      for (const sig of sol.signatarios || []) {
        const match =
          sig.user_id === signerId ||
          (sig.email || "").toLowerCase() ===
          (session.email || "").toLowerCase();
        if (!match) continue;
        rows.push({
          solicitacao_id: sol.id,
          documento_id: sol.documento_id,
          signatario_id: sig.id,
          titulo: sol.titulo,
          arquivo: sol.arquivo,
          solicitacao_status: sol.status,
          documento_status: sol.documento_status,
          meu_status: sig.status,
          atualizado_em: sol.atualizado_em,
          solicitante: sol.solicitante,
        });
      }
    }
    rows.sort((a, b) =>
      (b.atualizado_em || "").localeCompare(a.atualizado_em || "")
    );
    return { status: true, data: rows };
  },

  async buscarUsuariosCadastro(q) {
    await delay(120);
    const termo = String(q || "").trim().toLowerCase();
    if (termo.length < 2) return { status: true, data: [] };
    const digitos = termo.replace(/\D/g, "");
    const lista = (readStore().usuarios || [])
      .filter((u) => !u.bloqueado)
      .filter((u) => {
        if (digitos.length === 11) return String(u.cpf || "") === digitos;
        return (
          String(u.nome || "").toLowerCase().includes(termo) ||
          String(u.email || "").toLowerCase().includes(termo)
        );
      })
      .slice(0, 10)
      .map((u) => ({
        id: u.id,
        user_id: u.userId || u.id,
        nome: u.nome || "",
        email: u.email || "",
        cpf: String(u.cpf || "").replace(/\D/g, ""),
        telefone: String(u.telefone || "").replace(/\D/g, ""),
      }));
    return { status: true, data: lista };
  },

  async listUsuarios() {
    await delay();
    if (!can(CAPABILITY.manageUsuarios)) {
      return { status: false, msg: "Sem permissão." };
    }
    return { status: true, data: readStore().usuarios };
  },

  // Espelha a API: só as chaves do próprio usuário logado (dono), nunca as
  // que ele emitiu para outros.
  async listUsuariosIntegracao() {
    await delay();
    if (getRole() !== ROLES.ADMIN) {
      return { status: false, msg: "Você não pode gerar chave de integração. Solicite a um gerente." };
    }
    const eu = getSessionUser().userId;
    return {
      status: true,
      data: (readStore().usuarios || [])
        .filter((u) => u.role !== ROLES.ADMIN && !u.bloqueado && String(u.userId || u.id) !== String(eu))
        .map((u) => ({ id: u.userId || u.id, email: u.email, nome: u.nome || null })),
    };
  },

  async listChavesIntegracao() {
    await delay();
    const store = readStore();
    const userId = getSessionUser().userId;
    return {
      status: true,
      data: (store.chavesIntegracao || []).filter((c) => String(c.user_id) === String(userId)),
    };
  },

  // Só ADMIN emite (dele ou de um USER). USER só solicita (solicitarChaveIntegracao).
  async createChaveIntegracao(alvoUserId) {
    await delay();
    if (getRole() !== ROLES.ADMIN) {
      return { status: false, msg: "Você não pode gerar chave de integração. Solicite a um gerente." };
    }
    const store = readStore();
    const sessao = getSessionUser();
    let dono = { id: sessao.userId, email: sessao.email || "demo@demo.com" };
    let escopo = "addon_solicitante";
    if (alvoUserId && String(alvoUserId) !== String(sessao.userId)) {
      const alvo = (store.usuarios || []).find((u) => String(u.id) === String(alvoUserId));
      if (!alvo) return { status: false, msg: "Usuário de destino não encontrado." };
      if (alvo.role === ROLES.ADMIN) return { status: false, msg: "Gerente emite a própria chave." };
      dono = alvo;
      escopo = "addon_signatario";
    }
    const segredo = `lsak_demo${Date.now()}`;
    const chave = {
      id: `chave-${Date.now()}`,
      prefixo: segredo.slice(0, 12),
      escopo,
      user_id: dono.id,
      email_usuario: dono.email,
      ultimo_uso: null,
      revogada: false,
      data_criacao: nowStr(),
    };
    // Emitir de novo para o mesmo dono invalida as ativas dele (mesmo espírito da API).
    store.chavesIntegracao = [
      chave,
      ...(store.chavesIntegracao || []).map((c) =>
        c.user_id === dono.id ? { ...c, revogada: true } : c
      ),
    ];
    writeStore(store);
    const msg = escopo === "addon_solicitante"
      ? "Chave de integração criada (demo). Guarde o segredo."
      : `Chave de integração criada (demo) para ${dono.email}. Guarde o segredo.`;
    return {
      status: true,
      msg,
      data: { chave: segredo, prefixo: chave.prefixo, id: chave.id, escopo },
    };
  },

  async revogarChaveIntegracao(id) {
    await delay();
    const store = readStore();
    store.chavesIntegracao = (store.chavesIntegracao || []).map((c) =>
      c.id === id ? { ...c, revogada: true } : c
    );
    writeStore(store);
    return { status: true, msg: "Chave revogada (demo)." };
  },

  // USER solicita: cria um alerta (demo) para os ADMINs atenderem.
  async solicitarChaveIntegracao() {
    await delay();
    const sessao = getSessionUser();
    if (getRole() === ROLES.ADMIN) {
      return { status: false, msg: "Gerentes emitem a própria chave em Integração." };
    }
    const store = readStore();
    const alerta = {
      id: `alerta-${Date.now()}`,
      tipo: "chave_integracao_solicitada",
      titulo: "Solicitação de chave de integração",
      mensagem: `${sessao.email || "usuário"} solicitou uma chave de integração para o Addon do Workspace.`,
      lido: false,
      criado_em: nowStr(),
      meta_dados: { solicitante_user_id: sessao.userId, solicitante_email: sessao.email },
    };
    store.alertas = [alerta, ...(store.alertas || [])];
    writeStore(store);
    return { status: true, msg: "Solicitação enviada (demo). Um gerente vai gerar sua chave." };
  },

  async createUsuario({ nome, email, role }) {
    await delay();
    if (!can(CAPABILITY.manageUsuarios)) {
      return { status: false, msg: "Sem permissão." };
    }
    if (![ROLES.ADMIN, ROLES.USER].includes(role)) {
      return {
        status: false,
        msg: "Papel inválido. Signer nasce por convite de assinatura.",
      };
    }
    const store = readStore();
    const novo = {
      id: Date.now(),
      userId: `user-${Date.now()}`,
      nome,
      email,
      role,
      bloqueado: false,
      dois_fatores: false,
      criado_em: nowStr(),
    };
    store.usuarios.unshift(novo);
    writeStore(store);
    return { status: true, data: novo, msg: "Usuário criado (demo)." };
  },

  async toggleUsuarioBloqueio(id) {
    await delay();
    if (!can(CAPABILITY.manageUsuarios)) {
      return { status: false, msg: "Sem permissão." };
    }
    const store = readStore();
    const u = store.usuarios.find((x) => x.id === id);
    if (!u) return { status: false, msg: "Usuário não encontrado." };
    u.bloqueado = !u.bloqueado;
    writeStore(store);
    return { status: true, data: u };
  },

  async listAlertas() {
    await delay();
    return { status: true, data: readStore().alertas };
  },
};

export const clearPanelMockState = () => {
  try {
    sessionStorage.removeItem(PANEL_MOCK_STATE_KEY);
  } catch {
    /* ignore */
  }
};
