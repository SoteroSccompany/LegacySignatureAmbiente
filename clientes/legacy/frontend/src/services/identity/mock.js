import {
  applyMockSession,
  applyPartialIdentitySession,
  clearMockSession,
  findMockScenario,
  mockCredentials,
} from "../../mocks/session";
import { isStrongPassword, MSG } from "../../utils/validators/identity";
import {
  IDENTITY_MOCK_STATE_KEY,
  IDENTITY_PARTIAL_KEY,
  NEXT_STEP,
  PENDING_2FA_KEY,
} from "./types";

const delay = (ms = 280) => new Promise((r) => setTimeout(r, ms));

const MOCK_QR_SVG =
  "data:image/svg+xml," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="180" height="180" viewBox="0 0 180 180">
      <rect width="180" height="180" fill="#fff"/>
      <rect x="16" y="16" width="56" height="56" fill="#0B1F33"/>
      <rect x="108" y="16" width="56" height="56" fill="#0B1F33"/>
      <rect x="16" y="108" width="56" height="56" fill="#0B1F33"/>
      <rect x="80" y="80" width="20" height="20" fill="#0F766E"/>
      <rect x="108" y="108" width="20" height="20" fill="#0B1F33"/>
      <rect x="140" y="140" width="20" height="20" fill="#0B1F33"/>
      <text x="90" y="172" text-anchor="middle" font-size="10" fill="#64748B" font-family="sans-serif">DEMO TOTP</text>
    </svg>`
  );

const RECOVERY_CODES = ["A1B2-C3D4", "E5F6-G7H8", "J9K0-L1M2", "N3P4-Q5R6"];

const readState = () => {
  try {
    return JSON.parse(sessionStorage.getItem(IDENTITY_MOCK_STATE_KEY) || "null");
  } catch {
    return null;
  }
};

const writeState = (state) => {
  sessionStorage.setItem(IDENTITY_MOCK_STATE_KEY, JSON.stringify(state));
};

const computeLoginNextStep = (state) => {
  if (state.trocar_senha) return NEXT_STEP.REDEFINIR_SENHA;
  if (!state.dois_fatores) return NEXT_STEP.SETUP_2FA;
  return NEXT_STEP.LOGIN_2FA;
};

const computePostAuthNextStep = (state) => {
  if (!state.perfil_ok) return NEXT_STEP.CRIAR_PERFIL;
  return NEXT_STEP.OK;
};

const finishOk = (state) => {
  applyMockSession({
    id: state.user_id,
    userId: state.userId || state.user_id,
    nome: state.nome,
    email: state.email,
    role: state.role,
  });
  writeState({ ...state, partial: false, pending2FA: false });
  return NEXT_STEP.OK;
};

export const hasIdentityPartial = () =>
  localStorage.getItem(IDENTITY_PARTIAL_KEY) === "1" && !!readState();

export const hasPending2FA = () =>
  localStorage.getItem(PENDING_2FA_KEY) === "1" && !!readState();

export const identityMock = {
  async prepareLogin() {
    await delay(80);
    return { status: true, msg: "Concluído" };
  },

  async login({ email, senha, novaSenha, confirmacaoNovaSenha }) {
    await delay();
    const scenario = findMockScenario(email);
    if (!scenario || senha !== scenario.senha) {
      return { status: false, msg: "E-mail ou senha inválidos." };
    }

    if (scenario.trocar_senha && !novaSenha) {
      return {
        status: true,
        msg: "Defina sua nova senha para continuar.",
        data: {
          user: { email: scenario.email },
          permissao: scenario.role,
          dois_fatores: scenario.dois_fatores,
          trocar_senha: true,
          next_step: NEXT_STEP.REDEFINIR_SENHA,
        },
      };
    }

    if (scenario.trocar_senha && novaSenha) {
      if (!confirmacaoNovaSenha) {
        return { status: false, msg: "A confirmação da nova senha é obrigatória." };
      }
      if (novaSenha !== confirmacaoNovaSenha) {
        return { status: false, msg: "A nova senha e a confirmação da nova senha não coincidem." };
      }
      if (novaSenha === senha) {
        return { status: false, msg: MSG.senhaIgual };
      }
      if (!isStrongPassword(novaSenha)) {
        return { status: false, msg: MSG.senhaFraca };
      }
    }

    const state = {
      user_id: scenario.userId || scenario.key,
      userId: scenario.userId || scenario.key,
      email: scenario.email,
      nome: scenario.nome,
      role: scenario.role,
      senha_atual: novaSenha || scenario.senha,
      trocar_senha: false,
      dois_fatores: scenario.dois_fatores,
      perfil_ok: scenario.perfil_ok,
      perfil_desafio: false,
      partial: true,
      pending2FA: false,
    };

    const next_step = computeLoginNextStep(state);

    if (next_step === NEXT_STEP.LOGIN_2FA) {
      state.pending2FA = true;
      localStorage.setItem(PENDING_2FA_KEY, "1");
      applyPartialIdentitySession(state);
    } else {
      localStorage.removeItem(PENDING_2FA_KEY);
      applyPartialIdentitySession(state);
    }

    writeState(state);

    return {
      status: true,
      msg: "Concluído",
      data: {
        user: { id: state.user_id, email: state.email, nome: state.nome },
        permissao: state.role,
        dois_fatores: state.dois_fatores,
        trocar_senha: state.trocar_senha,
        next_step,
      },
    };
  },

  async login2FA({ token }) {
    await delay();
    const state = readState();
    if (!state || !state.pending2FA) {
      return { status: false, msg: "Sessão 2FA inválida. Faça login novamente." };
    }
    if (token !== mockCredentials.otp) {
      return { status: false, msg: "Código inválido." };
    }

    state.pending2FA = false;
    localStorage.removeItem(PENDING_2FA_KEY);

    const next_step = computePostAuthNextStep(state);
    if (next_step === NEXT_STEP.OK) {
      finishOk(state);
      return { status: true, msg: "Logado", next_step };
    }

    writeState(state);
    applyPartialIdentitySession(state);
    return { status: true, msg: "Logado", next_step };
  },

  async forgotPassword({ email }) {
    await delay();
    if (!email) return { status: false, msg: "E-mail obrigatório." };
    return {
      status: true,
      msg: `Link simulado: /recuperarSenha/${mockCredentials.forgotToken}`,
    };
  },

  async forgotChangePass({ token, senha }) {
    await delay();
    if (token !== mockCredentials.forgotToken) {
      return { status: false, msg: "Link inválido ou expirado." };
    }
    if (!isStrongPassword(senha)) {
      return {
        status: false,
        msg: "Nova senha deve ter no mínimo 8 caracteres, com letra, número e símbolo.",
      };
    }
    return { status: true, msg: "Senha redefinida com sucesso." };
  },

  async checkLink({ token }) {
    await delay(80);
    if (token !== mockCredentials.forgotToken) {
      return { status: false, msg: "Link inválido ou expirado." };
    }
    return { status: true, msg: "Verificação válida" };
  },

  async changePassword({ senha, novaSenha }) {
    await delay();
    const state = readState();
    if (!state) {
      return { status: false, msg: "Sessão inválida. Faça login novamente." };
    }
    if (senha !== state.senha_atual) {
      return { status: false, msg: "Senha atual incorreta." };
    }
    if (novaSenha === senha) {
      return { status: false, msg: "Nova senha não pode ser igual a senha antiga" };
    }
    if (!isStrongPassword(novaSenha)) {
      return {
        status: false,
        msg: "Nova senha deve ter no mínimo 8 caracteres, com letra, número e símbolo.",
      };
    }

    state.senha_atual = novaSenha;
    state.trocar_senha = false;
    writeState(state);

    const next_step = computeLoginNextStep(state);
    if (next_step === NEXT_STEP.LOGIN_2FA) {
      state.pending2FA = true;
      localStorage.setItem(PENDING_2FA_KEY, "1");
      writeState(state);
    }
    return { status: true, msg: "Senha atualizada.", next_step };
  },

  async getDoisFatoresConfig() {
    await delay();
    const state = readState();
    if (!state) {
      return { status: false, msg: "Sessão inválida. Faça login novamente." };
    }
    if (state.dois_fatores) {
      return { status: false, msg: "Autenticação em duas etapas já configurada." };
    }
    return {
      status: true,
      qrcode: MOCK_QR_SVG,
      secret: "LEGACYDEMO2FASECRET",
    };
  },

  async confirmDoisFatores({ token }) {
    await delay();
    const state = readState();
    if (!state) {
      return { status: false, msg: "Sessão inválida. Faça login novamente." };
    }
    if (token !== mockCredentials.otp) {
      return { status: false, msg: "Código inválido." };
    }

    state.dois_fatores = true;
    writeState(state);

    const next_step = computePostAuthNextStep(state);
    if (next_step === NEXT_STEP.OK) {
      finishOk(state);
    } else {
      applyPartialIdentitySession(state);
    }

    return {
      status: true,
      msg: `Códigos de recuperação: ${RECOVERY_CODES.join(", ")}`,
      recovery_codes: RECOVERY_CODES,
      next_step,
    };
  },

  async solicitarPerfilAuth() {
    await delay();
    const state = readState();
    if (!state) {
      return { status: false, msg: "Sessão inválida. Faça login novamente." };
    }
    state.perfil_desafio = true;
    writeState(state);
    return { status: true, msg: "Autenticacao solicitada. Informe o token do autenticador." };
  },

  async criarPerfil({ nome, cpf, telefone, token }) {
    await delay();
    const state = readState();
    if (!state || !state.perfil_desafio) {
      return { status: false, msg: "Solicite a autenticação do perfil antes." };
    }
    if (token !== mockCredentials.otp) {
      return { status: false, msg: "Código inválido." };
    }

    state.perfil_ok = true;
    state.nome = nome;
    state.cpf = cpf;
    state.telefone = telefone;
    state.perfil_desafio = false;
    finishOk(state);

    return { status: true, msg: "Perfil criado com sucesso.", next_step: NEXT_STEP.OK };
  },

  async getPerfil() {
    await delay(80);
    const state = readState();
    if (!state) {
      return { status: false, msg: "Sessão inválida. Faça login novamente." };
    }
    return {
      status: true,
      data: { nome: state.nome, cpf: state.cpf ? "cifrado" : null },
    };
  },

  // PATCH /user/authEmail/:token (demo)
  async confirmarEmail({ token }) {
    await delay(200);
    if (!token) return { status: false, msg: "Link inválido ou expirado." };
    return { status: true, msg: "E-mail confirmado com sucesso." };
  },

  // PATCH /user/changeemail/:token (demo)
  async confirmarTrocaEmail({ token }) {
    await delay(200);
    if (token !== mockCredentials.forgotToken) {
      return { status: false, msg: "Link inválido ou expirado." };
    }
    return { status: true, msg: "E-mail alterado com sucesso! Faça login novamente." };
  },

  async logout() {
    await delay(60);
    clearMockSession();
    return { status: true, msg: "Deslogado" };
  },

  async check() {
    await delay(60);
    const token = localStorage.getItem("token");
    if (!token || token === "mock-ui-partial") {
      return { status: false, msg: "Não autenticado" };
    }
    return { status: true, msg: "Logado" };
  },
};
