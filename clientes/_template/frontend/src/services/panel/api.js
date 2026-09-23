import axios from "axios";
import { conection } from "../../utils";
import { getSessionUser, ROLES } from "../../utils/roles";
import {
  STATUS_DOCUMENTO,
  STATUS_SIGNATARIO,
  STATUS_SOLICITACAO,
} from "./types";

const http = conection.auth();

const msgFrom = (err, fallback) => err?.response?.data?.msg || fallback;

// Role do painel (string) -> role numérico da API (admin=0, user=1, signer=2, supervisor=3)
const ROLE_TO_API = { [ROLES.ADMIN]: 0, [ROLES.USER]: 1, [ROLES.SIGNER]: 2, [ROLES.SUPERVISOR]: 3 };
const API_TO_ROLE = { 0: ROLES.ADMIN, 1: ROLES.USER, 2: ROLES.SIGNER, 3: ROLES.SUPERVISOR };

// Status agregado da solicitação: documento assinado ou cancelado encerra o fluxo.
const statusAgregado = (solicitacaoStatus, documentoStatus) => {
  if (documentoStatus === STATUS_DOCUMENTO.DOCUMENTO_ASSINADO) {
    return STATUS_SOLICITACAO.CONCLUIDO;
  }
  if (documentoStatus === STATUS_DOCUMENTO.DOCUMENTO_CANCELADO) {
    return STATUS_SOLICITACAO.CANCELADO;
  }
  return solicitacaoStatus;
};

const adaptSolicitacaoLista = (r) => ({
  id: r.id,
  documento_id: r.documento?.id || null,
  titulo: r.documento?.nome_documento || "Documento em processamento",
  arquivo: r.documento?.documento_nome || "",
  status: statusAgregado(r.status, r.documento?.status),
  documento_status: r.documento?.status || null,
  erro: r.erro_msg || null,
  owner_user_id: r.user_id,
  solicitante: r.solicitante_email || "",
  criado_em: r.data_criacao,
  atualizado_em: r.data_atualizacao,
  signatarios_count: r.signatarios || { total: 0, assinados: 0 },
});

const adaptDemarcacao = (d) => ({
  id: d.id,
  tipo: d.tipo,
  page: d.pagina,
  x: Number(d.x),
  y: Number(d.y),
  width: Number(d.largura),
  height: Number(d.altura),
});

const adaptSolicitacaoDetalhe = (data) => {
  const { solicitacao, documento, signatarios } = data;
  return {
    id: solicitacao.id,
    documento_id: documento?.id || null,
    titulo: documento?.nome_documento || solicitacao.meta_dados?.nome_documento || "Documento em processamento",
    arquivo: documento?.documento_nome || solicitacao.meta_dados?.documento_nome || "",
    status: statusAgregado(solicitacao.status, documento?.status),
    documento_status: documento?.status || null,
    erro: solicitacao.erro_msg || null,
    owner_user_id: solicitacao.user_id,
    criado_em: solicitacao.data_criacao,
    atualizado_em: solicitacao.data_atualizacao,
    hash_original: documento?.hash_original || null,
    hash_final: documento?.hash_final || null,
    signatarios: (signatarios || []).map((s) => ({
      id: s.id,
      user_id: null,
      nome: s.nome,
      email: s.email,
      cpf_mascarado: s.cpf_mascarado,
      ordem: s.ordem,
      status: s.status,
      modo_visual: s.modo_visual,
      assinado_em: s.assinado_em,
      demarcaoes: (s.demarcacoes || []).map(adaptDemarcacao),
    })),
    timeline: (data.timeline || []).map((ev) => ({
      id: ev.id,
      label: ev.label,
      titulo: ev.titulo,
      descricao: ev.descricao,
      em: ev.em,
      erro: ev.erro === true,
    })),
  };
};

const solicitacaoEmFluxo = (sol) =>
  ![
    STATUS_SOLICITACAO.CONCLUIDO,
    STATUS_SOLICITACAO.ERRO_HASH_INICIAL,
    STATUS_SOLICITACAO.CANCELADO,
  ].includes(sol.status);

export const panelApi = {
  async getDashboard() {
    const role = getSessionUser().role;
    try {
      if (role === ROLES.SIGNER) {
        const [contratosResp, alertasResp] = await Promise.all([
          this.listMeusContratos(),
          this.listAlertas({ limit: 50, offset: 0 }),
        ]);
        const contratos = contratosResp.data || [];
        const pendentes = contratos.filter((c) =>
          [STATUS_SIGNATARIO.PENDING, STATUS_SIGNATARIO.AGUARDANDO_ONBOARDING].includes(c.meu_status)
        ).length;
        const assinados = contratos.filter((c) => c.meu_status === STATUS_SIGNATARIO.SIGNED).length;
        const naoLidos = (alertasResp.data || []).filter((a) => !a.lido).length;
        return {
          status: true,
          data: {
            role,
            stats: [
              { id: 1, title: "Meus contratos", value: contratos.length, description: "Total vinculados a você", trend: `${contratos.length}` },
              { id: 2, title: "Pendentes", value: pendentes, description: "Aguardando sua assinatura", trend: `${pendentes}` },
              { id: 3, title: "Assinados", value: assinados, description: "Concluídos por você", trend: `${assinados}` },
              { id: 4, title: "Alertas", value: naoLidos, description: "Não lidos", trend: "inbox" },
            ],
            recentes: contratos.slice(0, 4).map((c) => ({
              id: c.documento_id,
              titulo: c.titulo,
              arquivo: c.arquivo,
              status: c.documento_status,
              atualizado_em: c.atualizado_em,
            })),
          },
        };
      }

      const [dashResp, listResp] = await Promise.all([
        http.get("/dadosSistema/dashBoard"),
        this.listSolicitacoes({ limit: 4, offset: 0 }),
      ]);
      const cards = (dashResp.data?.data || []).map((c, i) => ({
        id: i + 1,
        title: c.title,
        value: Number(c.value) || 0,
        description: "",
        trend: `${c.value}`,
      }));
      return {
        status: true,
        data: { role, stats: cards, recentes: (listResp.data || []).slice(0, 4) },
      };
    } catch (err) {
      return { status: false, msg: msgFrom(err, "Erro ao carregar o dashboard.") };
    }
  },

  async listSolicitacoes({ busca = "", status = "TODOS", limit = 50, offset = 0 } = {}) {
    try {
      const params = new URLSearchParams({ limit, offset });
      if (status && status !== "TODOS") params.set("status", status);
      const { data } = await http.get(`/solicitacoes?${params.toString()}`);
      let list = (data?.data || []).map(adaptSolicitacaoLista);
      if (busca) {
        const q = busca.toLowerCase();
        list = list.filter(
          (s) =>
            (s.titulo || "").toLowerCase().includes(q) ||
            (s.arquivo || "").toLowerCase().includes(q) ||
            (s.id || "").toLowerCase().includes(q)
        );
      }
      return { status: true, data: list, paginacao: data?.paginacao };
    } catch (err) {
      return { status: false, data: [], msg: msgFrom(err, "Erro ao carregar solicitações.") };
    }
  },

  async getSolicitacao(id) {
    try {
      const { data } = await http.get(`/solicitacoes/${id}`);
      return { status: true, data: adaptSolicitacaoDetalhe(data.data) };
    } catch (err) {
      return { status: false, msg: msgFrom(err, "Solicitação não encontrada.") };
    }
  },

  async getSolicitacaoStatus(id) {
    const resp = await this.getSolicitacao(id);
    if (!resp.status) return resp;
    const sol = resp.data;
    const pendente = (sol.signatarios || []).some((s) =>
      [
        STATUS_SIGNATARIO.PENDING,
        STATUS_SIGNATARIO.PROCESSING,
        STATUS_SIGNATARIO.AGUARDANDO_ONBOARDING,
      ].includes(s.status)
    );
    return {
      status: true,
      data: { ...sol, polling: solicitacaoEmFluxo(sol) || pendente },
    };
  },

  // Passo 1 do wizard: cria a solicitação e devolve a URL presignada de upload (PUT).
  // Contrato real (postDocumentoSolicitacao): nome_documento, documento_nome (.pdf) e termo_id são obrigatórios.
  async createSolicitacao({ titulo, arquivo, termoId }) {
    try {
      if (!arquivo || !arquivo.toLowerCase().endsWith(".pdf")) {
        return { status: false, msg: "O nome do documento deve terminar com .pdf" };
      }
      if (!termoId) {
        return { status: false, msg: "Selecione o termo de responsabilidade do documento." };
      }
      const { data } = await http.post("/documentos/solicitacao", {
        nome_documento: titulo,
        documento_nome: arquivo,
        termo_id: termoId,
      });
      return {
        status: true,
        msg: data?.msg || "Solicitação criada.",
        data: { id: data?.data?.id, upload_url: data?.data?.url },
      };
    } catch (err) {
      return { status: false, msg: msgFrom(err, "Erro ao criar a solicitação.") };
    }
  },

  // Passo 2: PUT do PDF direto na URL presignada (sem cookies/headers do painel).
  async uploadArquivo(uploadUrl, file) {
    try {
      await axios.put(uploadUrl, file, {
        headers: { "Content-Type": "application/pdf" },
      });
      return { status: true, msg: "Upload concluído." };
    } catch (err) {
      return { status: false, msg: "Falha no upload do arquivo. Gere a URL novamente." };
    }
  },

  // Passo 3: confirma o upload e dispara o processamento do hash inicial.
  // checkBody na API rejeita application/json com objeto vazio — precisa de ao menos uma chave.
  async confirmUpload(solicitacaoId) {
    try {
      const { data } = await http.put(`/documentos/solicitacao/${solicitacaoId}`, {
        confirmado: true,
      });
      return { status: true, msg: data?.msg || "Processamento iniciado." };
    } catch (err) {
      return { status: false, msg: msgFrom(err, "Erro ao confirmar o upload.") };
    }
  },

  // Passo 4 (após UPLOAD_CONCLUIDO): cadastra signatários + demarcações e dispara convites.
  // Payload no contrato da API: [{ data: {nome, email, cpf, telefone, ordem?}, sign: [{tipo, pagina, x, y, largura, altura, pdf, pagina_tamanho}] }]
  // Único POST por documento — a própria API rejeita reenvio se já existirem signatários.
  async addSignatarios(documentoId, signatarios) {
    try {
      const { data } = await http.post(`/documentos/${documentoId}/signatarios`, {
        signatarios,
      });
      return { status: true, msg: data?.msg || "Signatários cadastrados." };
    } catch (err) {
      return { status: false, msg: msgFrom(err, "Erro ao cadastrar signatários.") };
    }
  },

  // Cancela documento em andamento (dono da solicitação ou admin). Body vazio.
  async cancelarSolicitacao(documentoId) {
    try {
      const { data } = await http.patch(`/documentos/${documentoId}/cancelar`);
      return { status: true, msg: data?.msg || "Documento cancelado com sucesso." };
    } catch (err) {
      return { status: false, msg: msgFrom(err, "Erro ao cancelar o documento.") };
    }
  },

  async listMeusContratos({ limit = 50, offset = 0 } = {}) {
    try {
      const { data } = await http.get(`/contratos?limit=${limit}&offset=${offset}`);
      const rows = (data?.data || []).map((r) => ({
        signatario_id: r.signatario_id,
        documento_id: r.documento?.id,
        solicitacao_id: r.solicitacao_id || null,
        solicitante: r.solicitante_email || "",
        titulo: r.documento?.nome_documento || "Documento",
        arquivo: r.documento?.documento_nome || "",
        documento_status: r.documento?.status || null,
        meu_status: r.signatario_status,
        ordem: r.ordem,
        assinado_em: r.assinado_em,
        atualizado_em: r.documento?.criado_em,
      }));
      return { status: true, data: rows, paginacao: data?.paginacao };
    } catch (err) {
      return { status: false, data: [], msg: msgFrom(err, "Erro ao carregar contratos.") };
    }
  },

  async getDocumentoDownload(documentoId) {
    try {
      const { data } = await http.get(`/documentos/${documentoId}/download`);
      return { status: true, data: data?.data };
    } catch (err) {
      return { status: false, msg: msgFrom(err, "Erro ao gerar a URL do documento.") };
    }
  },

  // Preenche linha de signatário a partir de perfil já cadastrado (nome/email/cpf/telefone).
  async buscarUsuariosCadastro(q, { limit = 10 } = {}) {
    try {
      const termo = String(q || "").trim();
      if (termo.length < 2) return { status: true, data: [] };
      const { data } = await http.get(
        `/usuarios/busca?q=${encodeURIComponent(termo)}&limit=${limit}`
      );
      return { status: true, data: data?.data || [] };
    } catch (err) {
      return {
        status: false,
        data: [],
        msg: msgFrom(err, "Erro ao buscar usuários cadastrados."),
      };
    }
  },

  // /user usa o SearchParams da API (page/per_page), não limit/offset — e não
  // devolve total de registros, então trazemos o máximo permitido (100) de uma vez.
  async listUsuarios({ page = 0, per_page = 100 } = {}) {
    try {
      const { data } = await http.get(`/user?page=${page}&per_page=${per_page}`);
      const rows = (data?.data || []).map((u) => ({
        id: u.id,
        email: u.email,
        role: API_TO_ROLE[u.role] ?? String(u.role),
        bloqueado: !!u.bloqueado,
        dois_fatores: !!u.dois_fatores,
        email_verificado: !!u.email_verificado,
        trocar_senha: !!u.trocar_senha,
        criado_em: u.data_criacao,
        biometria: u.biometria || null,
      }));
      return { status: true, data: rows };
    } catch (err) {
      return { status: false, data: [], msg: msgFrom(err, "Erro ao carregar usuários.") };
    }
  },

  async createUsuario({ email, role }) {
    try {
      const apiRole = ROLE_TO_API[role];
      if (apiRole === undefined || apiRole === 2) {
        return { status: false, msg: "Papel inválido. Signer nasce por convite de assinatura." };
      }
      const { data } = await http.post("/user/create", { email, role: apiRole });
      return { status: true, msg: data?.msg || "Usuário criado. Orientações enviadas por e-mail." };
    } catch (err) {
      return { status: false, msg: msgFrom(err, "Erro ao criar usuário.") };
    }
  },

  async updateUsuarioRole(id, role) {
    try {
      const apiRole = ROLE_TO_API[role];
      if (apiRole === undefined) return { status: false, msg: "Papel inválido." };
      const { data } = await http.patch(`/user/role/${id}`, { role: apiRole });
      return { status: true, msg: data?.msg || "Permissão atualizada." };
    } catch (err) {
      return { status: false, msg: msgFrom(err, "Erro ao atualizar permissão.") };
    }
  },

  async toggleUsuarioBloqueio(id) {
    try {
      const { data } = await http.patch(`/user/blockUnlock/${id}`, { noData: "data" });
      return { status: true, msg: data?.msg || "Bloqueio alterado." };
    } catch (err) {
      return { status: false, msg: msgFrom(err, "Erro ao alterar bloqueio.") };
    }
  },

  async deleteUsuario(id) {
    try {
      const { data } = await http.delete(`/user/${id}`);
      return { status: true, msg: data?.msg || "Usuário removido." };
    } catch (err) {
      return { status: false, msg: msgFrom(err, "Erro ao remover usuário.") };
    }
  },

  async listUsuariosIntegracao() {
    try {
      const { data } = await http.get("/integracao/usuarios");
      return { status: true, data: data?.data || [] };
    } catch (err) {
      return { status: false, data: [], msg: msgFrom(err, "Erro ao carregar usuários.") };
    }
  },

  async listChavesIntegracao() {
    try {
      const { data } = await http.get("/integracao/chaves");
      return { status: true, data: data?.data || [] };
    } catch (err) {
      return { status: false, data: [], msg: msgFrom(err, "Erro ao carregar as chaves de integração.") };
    }
  },

  // O segredo (lsak_...) só vem nesta resposta. Depois disso a API guarda apenas o hash.
  // Sem alvoUserId: gerente emite a própria (escopo solicitante). Com alvoUserId
  // de outro usuário: gerente emite a dele (escopo signatário).
  async createChaveIntegracao(alvoUserId) {
    try {
      const { data } = await http.post("/integracao/chaves", {
        emitir: true,
        alvo_user_id: alvoUserId || undefined,
      });
      return { status: true, msg: data?.msg, data: data?.data };
    } catch (err) {
      return { status: false, msg: msgFrom(err, "Erro ao emitir a chave de integração.") };
    }
  },

  async revogarChaveIntegracao(id) {
    try {
      const { data } = await http.delete(`/integracao/chaves/${id}`);
      return { status: true, msg: data?.msg || "Chave revogada." };
    } catch (err) {
      return { status: false, msg: msgFrom(err, "Erro ao revogar a chave de integração.") };
    }
  },

  // Usuário normal (USER) não gera: só avisa o(s) gerente/admin.
  async solicitarChaveIntegracao() {
    try {
      const { data } = await http.post("/integracao/chaves/solicitacao");
      return { status: true, msg: data?.msg || "Solicitação enviada." };
    } catch (err) {
      return { status: false, msg: msgFrom(err, "Erro ao solicitar a chave de integração.") };
    }
  },

  async listAlertas({ limit = 50, offset = 0, lido } = {}) {
    try {
      const params = new URLSearchParams({ limit, offset });
      if (lido !== undefined) params.set("lido", lido);
      const { data } = await http.get(`/alertas?${params.toString()}`);
      const rows = (data?.data || []).map((a) => ({
        id: a.id,
        tipo: a.tipo,
        titulo: a.titulo,
        descricao: a.mensagem,
        lido: !!a.lido,
        criado_em: a.criado_em,
        referencia_tipo: a.referencia_tipo,
        referencia_id: a.referencia_id,
        solicitacao_id:
          a.referencia_tipo === "solicitacao" ? a.referencia_id : null,
        meta: a.meta_dados,
      }));
      return { status: true, data: rows, paginacao: data?.paginacao };
    } catch (err) {
      return { status: false, data: [], msg: msgFrom(err, "Erro ao carregar alertas.") };
    }
  },

  async marcarAlertaLido(id) {
    try {
      const { data } = await http.patch(`/alertas/${id}/lido`, { lido: true });
      return { status: true, msg: data?.msg || "Alerta marcado como lido." };
    } catch (err) {
      return { status: false, msg: msgFrom(err, "Erro ao marcar alerta.") };
    }
  },

  async getAuditoria(documentoId, { profundo = true } = {}) {
    try {
      const { data } = await http.get(
        `/documentos/${documentoId}/auditoria?profundo=${profundo}`
      );
      return { status: true, data: data?.data || data };
    } catch (err) {
      return { status: false, msg: msgFrom(err, "Erro ao carregar a auditoria.") };
    }
  },

  // ---- Termo de responsabilidade (GET/POST/PATCH /termo-responsabilidade) ----

  async listTermos({ page = 0, per_page = 100 } = {}) {
    try {
      const { data } = await http.get(`/termo-responsabilidade?page=${page}&per_page=${per_page}`);
      return { status: true, data: data?.data || [] };
    } catch (err) {
      return { status: false, data: [], msg: msgFrom(err, "Erro ao carregar termos.") };
    }
  },

  // Gera o desafio OTP exigido para criar/editar termo (admin confirma com o token recebido).
  async solicitarTokenTermo() {
    try {
      const { data } = await http.get("/termo-responsabilidade/solicitacao");
      return { status: true, msg: data?.msg || "Código de confirmação enviado." };
    } catch (err) {
      return { status: false, msg: msgFrom(err, "Erro ao solicitar código de confirmação.") };
    }
  },

  async createTermo({ titulo_termo, descricao_termo, tipo_termo, token }) {
    try {
      const { data } = await http.post("/termo-responsabilidade", {
        titulo_termo,
        descricao_termo,
        tipo_termo,
        token,
      });
      return { status: true, msg: data?.msg || "Termo criado." };
    } catch (err) {
      return { status: false, msg: msgFrom(err, "Erro ao criar termo.") };
    }
  },

  async updateTermo(id, { titulo_termo, descricao_termo, ativo, token }) {
    try {
      const { data } = await http.patch(`/termo-responsabilidade/${id}`, {
        titulo_termo,
        descricao_termo,
        ativo,
        token,
      });
      return { status: true, msg: data?.msg || "Termo atualizado." };
    } catch (err) {
      return { status: false, msg: msgFrom(err, "Erro ao atualizar termo.") };
    }
  },

  // ---- Aprovação de perfil biométrico (admin) ----

  async getPendentesAprovacaoBiometria() {
    try {
      const { data } = await http.get(`/perfil-biometria/aprovacao/pendentes`);
      return { status: true, data: data?.data || [] };
    } catch (err) {
      return { status: false, msg: msgFrom(err, "Erro ao carregar as biometrias pendentes.") };
    }
  },

  async getFotoAprovacaoBiometria(usuarioId) {
    try {
      const { data } = await http.get(`/perfil-biometria/aprovacao/${usuarioId}`);
      return { status: true, url: data?.url };
    } catch (err) {
      return { status: false, msg: msgFrom(err, "Erro ao carregar a foto do perfil.") };
    }
  },

  // Gera o desafio OTP para aprovar/rejeitar. O código é gerado a partir do
  // segredo de 2FA de quem está aprovando (sessão), não do usuário avaliado.
  async solicitarOtpAprovacaoBiometria(usuarioId) {
    try {
      const { data } = await http.get(`/perfil-biometria/aprovacao/solicitacao/${usuarioId}`);
      return { status: true, msg: data?.msg || "Código de confirmação gerado." };
    } catch (err) {
      return { status: false, msg: msgFrom(err, "Erro ao solicitar código de confirmação.") };
    }
  },

  // A API tem um bug de checagem (`!statusAprovacao`) que rejeita 0/false como
  // "campo vazio" — por isso enviamos sempre string ('true'/'false').
  async confirmarAprovacaoBiometria({ usuarioId, token, aprovar }) {
    try {
      const { data } = await http.post("/perfil-biometria/aprovacao", {
        token,
        statusAprovacao: aprovar ? "true" : "false",
        usuario_id: usuarioId,
      });
      return { status: true, msg: data?.msg || "Solicitação processada." };
    } catch (err) {
      return { status: false, msg: msgFrom(err, "Erro ao confirmar a aprovação.") };
    }
  },
};
