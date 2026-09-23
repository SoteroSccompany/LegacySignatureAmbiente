import { MOCK_PANEL_USERS } from "./solicitacoes";

export const mockSessionUser = {
  id: MOCK_PANEL_USERS.admin.userId,
  nome: MOCK_PANEL_USERS.admin.nome,
  email: MOCK_PANEL_USERS.admin.email,
  role: "ADMIN",
};

/** Credenciais e cenários demo (UI mock de identidade) */
export const mockCredentials = {
  email: mockSessionUser.email,
  senha: "Foo@1234",
  otp: "123456",
  forgotToken: "mock-token",
};

/**
 * Cenários de login mock — e-mail determina next_step e papel do painel.
 * Senha padrão (exceto provisória): Foo@1234
 */
export const mockIdentityScenarios = [
  {
    key: "admin",
    email: MOCK_PANEL_USERS.admin.email,
    senha: "Foo@1234",
    label: "ADMIN — painel completo + 2FA",
    trocar_senha: false,
    dois_fatores: true,
    perfil_ok: true,
    nome: MOCK_PANEL_USERS.admin.nome,
    role: "ADMIN",
    userId: MOCK_PANEL_USERS.admin.userId,
  },
  {
    key: "user",
    email: MOCK_PANEL_USERS.user.email,
    senha: "Foo@1234",
    label: "USER — minhas solicitações",
    trocar_senha: false,
    dois_fatores: true,
    perfil_ok: true,
    nome: MOCK_PANEL_USERS.user.nome,
    role: "USER",
    userId: MOCK_PANEL_USERS.user.userId,
  },
  {
    key: "signer",
    email: MOCK_PANEL_USERS.signer.email,
    senha: "Foo@1234",
    label: "SIGNER — meus contratos",
    trocar_senha: false,
    dois_fatores: true,
    perfil_ok: true,
    nome: MOCK_PANEL_USERS.signer.nome,
    role: "SIGNER",
    userId: MOCK_PANEL_USERS.signer.userId,
  },
  {
    key: "provisoria",
    email: "provisoria@demo.local",
    senha: "temp-uuid-demo",
    label: "Onboarding — senha provisória",
    trocar_senha: true,
    dois_fatores: false,
    perfil_ok: false,
    nome: "Usuário Provisório",
    role: "USER",
    userId: "user-provisorio",
  },
  {
    key: "setup2fa",
    email: "setup2fa@demo.local",
    senha: "Foo@1234",
    label: "Onboarding — só configurar 2FA",
    trocar_senha: false,
    dois_fatores: false,
    perfil_ok: true,
    nome: "Setup Dois Fatores",
    role: "USER",
    userId: "user-setup2fa",
  },
];

export const findMockScenario = (email) =>
  mockIdentityScenarios.find(
    (s) => s.email.toLowerCase() === String(email || "").toLowerCase().trim()
  );

export const applyMockSession = (user = mockSessionUser) => {
  localStorage.setItem("token", "mock-ui-token");
  localStorage.setItem("permisssion", user.role || mockSessionUser.role);
  localStorage.setItem("usuario", user.nome || mockSessionUser.nome);
  localStorage.setItem("cliente", "NETEXPERTS");
  localStorage.setItem("userEmail", user.email || mockSessionUser.email);
  localStorage.setItem(
    "userId",
    user.userId || user.id || mockSessionUser.id || ""
  );
  localStorage.removeItem("identityPartial");
  localStorage.removeItem("pending2FA");
};

export const applyPartialIdentitySession = (user) => {
  localStorage.setItem("token", "mock-ui-partial");
  localStorage.setItem("identityPartial", "1");
  localStorage.setItem("permisssion", user.role || "USER");
  localStorage.setItem("usuario", user.nome || "");
  localStorage.setItem("cliente", "NETEXPERTS");
  localStorage.setItem("userEmail", user.email || "");
  localStorage.setItem("userId", user.userId || user.id || "");
};

export const clearMockSession = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("permisssion");
  localStorage.removeItem("usuario");
  localStorage.removeItem("cliente");
  localStorage.removeItem("userEmail");
  localStorage.removeItem("userId");
  localStorage.removeItem("userPassword");
  localStorage.removeItem("pending2FA");
  localStorage.removeItem("identityPartial");
  localStorage.removeItem("assinaturaSession");
  try {
    sessionStorage.removeItem("identityMockState");
    sessionStorage.removeItem("panelMockState");
  } catch {
    /* ignore */
  }
};

export const mockSignatarioSession = {
  id: 101,
  nome: MOCK_PANEL_USERS.signer.nome,
  email: MOCK_PANEL_USERS.signer.email,
  documentoId: "doc-1001",
};

export const applyMockAssinaturaSession = (documentoId) => {
  localStorage.setItem(
    "assinaturaSession",
    JSON.stringify({
      ...mockSignatarioSession,
      documentoId: documentoId || mockSignatarioSession.documentoId,
      at: Date.now(),
    })
  );
};

export const getMockAssinaturaSession = () => {
  try {
    return JSON.parse(localStorage.getItem("assinaturaSession") || "null");
  } catch {
    return null;
  }
};
