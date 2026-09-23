import { getPendingAssinar } from "./pendingAssinar";

export const NEXT_STEP = {
  REDEFINIR_SENHA: "REDEFINIR_SENHA",
  SETUP_2FA: "SETUP_2FA",
  LOGIN_2FA: "LOGIN_2FA",
  CRIAR_PERFIL: "CRIAR_PERFIL",
  // Devolvido pelas rotas /assinatura/* (não pelo login) quando falta a foto
  // de referência do perfil — usado pelo hub de assinatura para não depender
  // só do regex de msg em assinatura/types.js.
  CADASTRAR_BIOMETRIA: "CADASTRAR_BIOMETRIA",
  RELOGIN: "RELOGIN",
  OK: "OK",
};

export const IDENTITY_PARTIAL_KEY = "identityPartial";
export const IDENTITY_MOCK_STATE_KEY = "identityMockState";
export const IDENTITY_STATE_KEY = "identityState";
export const PENDING_2FA_KEY = "pending2FA";

export const FULL_SESSION_TOKENS = ["session", "mock-ui-token"];

export const hasFullSession = () =>
  FULL_SESSION_TOKENS.includes(localStorage.getItem("token"));

export const resolveNextRoute = (nextStep, role) => {
  switch (nextStep) {
    case NEXT_STEP.REDEFINIR_SENHA:
      return "/onboarding/senha";
    case NEXT_STEP.SETUP_2FA:
      return "/onboarding/2fa";
    case NEXT_STEP.LOGIN_2FA:
      return "/login/2fa";
    case NEXT_STEP.CRIAR_PERFIL:
      return "/onboarding/perfil";
    case NEXT_STEP.CADASTRAR_BIOMETRIA:
      return "/onboarding/biometria";
    case NEXT_STEP.RELOGIN:
      return "/";
    case NEXT_STEP.OK: {
      const pending = getPendingAssinar();
      if (pending) return `/assinar/${pending}/auth`;
      return role === "SIGNER" ? "/contratos" : "/dashboard";
    }
    default:
      return "/";
  }
};
