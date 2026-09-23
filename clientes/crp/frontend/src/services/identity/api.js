import { conection, clearLocalSession } from "../../utils";
import {
  IDENTITY_PARTIAL_KEY,
  IDENTITY_STATE_KEY,
  NEXT_STEP,
  PENDING_2FA_KEY,
} from "./types";

const http = conection.auth();

// A API devolve o nome do role do certs em uppercase; GERENTE é alias de USER no painel.
const normalizeRole = (permissao) => {
  const role = String(permissao || "").toUpperCase();
  return role === "GERENTE" ? "USER" : role;
};

const readState = () => {
  try {
    return JSON.parse(sessionStorage.getItem(IDENTITY_STATE_KEY) || "null");
  } catch {
    return null;
  }
};

const writeState = (state) => {
  sessionStorage.setItem(IDENTITY_STATE_KEY, JSON.stringify(state));
};

// Sessão real é cookie httpOnly — o localStorage guarda apenas marcadores p/ os guards.
const applyPartialSession = (state) => {
  localStorage.setItem("token", "session-partial");
  localStorage.setItem(IDENTITY_PARTIAL_KEY, "1");
  localStorage.setItem("permisssion", state.role || "USER");
  localStorage.setItem("usuario", state.nome || state.email || "");
  localStorage.setItem("cliente", "NETEXPERTS");
  localStorage.setItem("userEmail", state.email || "");
};

const applyFullSession = (state) => {
  localStorage.setItem("token", "session");
  localStorage.setItem("permisssion", state.role || "USER");
  localStorage.setItem("usuario", state.nome || state.email || "");
  localStorage.setItem("cliente", "NETEXPERTS");
  localStorage.setItem("userEmail", state.email || "");
  localStorage.removeItem(IDENTITY_PARTIAL_KEY);
  localStorage.removeItem(PENDING_2FA_KEY);
};

const msgFrom = (err, fallback) => err?.response?.data?.msg || fallback;

export const hasIdentityPartialApi = () =>
  localStorage.getItem(IDENTITY_PARTIAL_KEY) === "1";

export const hasPending2FAApi = () =>
  localStorage.getItem(PENDING_2FA_KEY) === "1";

export const identityApi = {
  // GET /user/login gera o nonce da sessão (cookie) exigido pelo POST.
  async prepareLogin() {
    try {
      await http.get("/user/login");
      return { status: true, msg: "Concluído" };
    } catch (err) {
      return { status: false, msg: msgFrom(err, "Erro ao preparar login.") };
    }
  },

  async login({ email, senha, novaSenha, confirmacaoNovaSenha }) {
    try {
      const body = { email, senha };
      if (novaSenha) body.novaSenha = novaSenha;
      if (confirmacaoNovaSenha) body.confirmacaoNovaSenha = confirmacaoNovaSenha;
      const { data } = await http.post("/user/login", body);
      const payload = data?.data || {};
      const role = normalizeRole(payload.permissao);
      const next_step = payload.next_step || NEXT_STEP.OK;

      const state = {
        email: payload.user || email,
        nome: "",
        role,
        dois_fatores: !!payload.dois_fatores,
        trocar_senha: !!payload.trocar_senha,
        pending2FA: next_step === NEXT_STEP.LOGIN_2FA,
      };

      if (next_step === NEXT_STEP.REDEFINIR_SENHA) {
        return {
          status: true,
          msg: "Defina sua nova senha para continuar.",
          data: {
            user: { email: state.email },
            permissao: role,
            dois_fatores: state.dois_fatores,
            trocar_senha: true,
            next_step,
          },
        };
      }

      writeState(state);

      if (next_step === NEXT_STEP.LOGIN_2FA) {
        localStorage.setItem(PENDING_2FA_KEY, "1");
      } else {
        localStorage.removeItem(PENDING_2FA_KEY);
      }
      if (next_step === NEXT_STEP.OK) applyFullSession(state);
      else applyPartialSession(state);

      return {
        status: true,
        msg: "Concluído",
        data: {
          user: { email: state.email },
          permissao: role,
          dois_fatores: state.dois_fatores,
          trocar_senha: state.trocar_senha,
          next_step,
        },
      };
    } catch (err) {
      return { status: false, msg: msgFrom(err, "E-mail ou senha inválidos.") };
    }
  },

  async login2FA({ token }) {
    try {
      const { data } = await http.post("/user/login2FA", { token });
      const next_step = data?.next_step || NEXT_STEP.OK;
      const state = readState() || {};
      state.pending2FA = false;
      localStorage.removeItem(PENDING_2FA_KEY);

      if (next_step === NEXT_STEP.OK) {
        applyFullSession(state);
      } else {
        applyPartialSession(state);
      }
      writeState(state);
      return { status: true, msg: data?.msg || "Logado", next_step };
    } catch (err) {
      return { status: false, msg: msgFrom(err, "Código inválido.") };
    }
  },

  async forgotPassword({ email }) {
    try {
      const { data } = await http.post("/user/forgotPassword", { email });
      return { status: true, msg: data?.msg || "Se o e-mail existir, o link foi enviado." };
    } catch (err) {
      return { status: false, msg: msgFrom(err, "Não foi possível enviar o link.") };
    }
  },

  async forgotChangePass({ token, senha }) {
    try {
      const { data } = await http.post("/user/forgotChangePass", { token, senha });
      return { status: true, msg: data?.msg || "Senha redefinida com sucesso." };
    } catch (err) {
      return { status: false, msg: msgFrom(err, "Link inválido ou expirado.") };
    }
  },

  async checkLink({ token }) {
    try {
      await http.get(`/user/checkLink/${token}`);
      return { status: true, msg: "Link válido" };
    } catch (err) {
      return { status: false, msg: msgFrom(err, "Link inválido ou expirado.") };
    }
  },

  async changePassword({ senha, novaSenha }) {
    try {
      const { data } = await http.post("/user/changePassword", { senha, novaSenha });
      if (data?.status === false) return { status: false, msg: data.msg };

      const state = readState() || {};
      state.trocar_senha = false;
      let next_step;
      if (!state.dois_fatores) {
        next_step = NEXT_STEP.SETUP_2FA;
      } else {
        // desafio de login já foi criado no POST /user/login — segue direto para o 2FA
        next_step = NEXT_STEP.LOGIN_2FA;
        state.pending2FA = true;
        localStorage.setItem(PENDING_2FA_KEY, "1");
      }
      writeState(state);
      return { status: true, msg: data?.msg || "Senha atualizada.", next_step };
    } catch (err) {
      return { status: false, msg: msgFrom(err, "Erro ao atualizar a senha.") };
    }
  },

  async getDoisFatoresConfig() {
    try {
      const { data } = await http.get("/user/dois-fatores/config");
      if (!data?.qrcode) {
        return { status: false, msg: data?.msg || "Autenticação em duas etapas já configurada." };
      }
      return { status: true, qrcode: data.qrcode };
    } catch (err) {
      return { status: false, msg: msgFrom(err, "Erro ao gerar o QR Code.") };
    }
  },

  async confirmDoisFatores({ token }) {
    try {
      const { data } = await http.post("/user/dois-fatores/config", { token });
      const state = readState() || {};
      state.dois_fatores = true;
      writeState(state);
      // A sessão atual nasceu sem 2FA — é preciso relogar para gerar o desafio de login.
      return {
        status: true,
        msg: data?.msg || "Dois fatores configurado. Entre novamente para continuar.",
        next_step: NEXT_STEP.RELOGIN,
        recovery_codes: Array.isArray(data?.recovery_codes) ? data.recovery_codes : [],
      };
    } catch (err) {
      return { status: false, msg: msgFrom(err, "Código inválido.") };
    }
  },

  async solicitarPerfilAuth() {
    try {
      const { data } = await http.get("/perfil/solicitacao");
      return { status: true, msg: data?.msg || "Autenticação solicitada. Informe o token do autenticador." };
    } catch (err) {
      return { status: false, msg: msgFrom(err, "Erro ao solicitar autenticação do perfil.") };
    }
  },

  async criarPerfil({ nome, cpf, telefone, token }) {
    try {
      const { data } = await http.post("/perfil", { nome, cpf, telefone, token });
      const state = readState() || {};
      state.nome = nome;
      applyFullSession(state);
      writeState(state);
      return { status: true, msg: data?.msg || "Perfil criado com sucesso.", next_step: NEXT_STEP.OK };
    } catch (err) {
      return { status: false, msg: msgFrom(err, "Erro ao criar o perfil.") };
    }
  },

  async getPerfil() {
    try {
      const { data } = await http.get("/perfil");
      // Sem perfil a API devolve 200 { status: true, msg } SEM data — o
      // fallback antigo (data?.data || data) devolvia o envelope como se
      // fosse o perfil. Sem data = perfil inexistente.
      return { status: true, exit: !!data?.data, data: data?.data || null };
    } catch (err) {
      return { status: false, msg: msgFrom(err, "Erro ao carregar o perfil.") };
    }
  },

  // PATCH /user/authEmail/:token — confirma e-mail no fluxo de convite/primeiro acesso
  async confirmarEmail({ token }) {
    try {
      const { data } = await http.patch(`/user/authEmail/${token}`);
      return { status: true, msg: data?.msg || "E-mail confirmado com sucesso." };
    } catch (err) {
      return { status: false, msg: msgFrom(err, "Link inválido ou expirado.") };
    }
  },

  // PATCH /user/changeemail/:token — confirma a troca de e-mail solicitada em /perfil
  async confirmarTrocaEmail({ token }) {
    try {
      const { data } = await http.patch(`/user/changeemail/${token}`);
      return { status: true, msg: data?.msg || "E-mail alterado com sucesso." };
    } catch (err) {
      return { status: false, msg: msgFrom(err, "Link inválido ou expirado.") };
    }
  },

  async logout() {
    try {
      await http.get("/user/logOut");
    } catch (err) {
      console.log(err);
    }
    clearLocalSession();
    sessionStorage.removeItem(IDENTITY_STATE_KEY);
    return { status: true, msg: "Deslogado" };
  },

  async check() {
    try {
      await http.get("/user/check");
      return { status: true, msg: "Logado" };
    } catch (err) {
      return { status: false, msg: msgFrom(err, "Não autenticado") };
    }
  },
};
