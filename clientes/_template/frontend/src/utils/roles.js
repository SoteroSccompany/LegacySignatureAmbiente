import { jsonConfig } from "../Config";

export const ROLES = {
  ADMIN: jsonConfig.roles.admin,
  USER: jsonConfig.roles.user,
  SIGNER: jsonConfig.roles.signer,
  SUPERVISOR: jsonConfig.roles.supervisor,
};

/** Compat: valores antigos no localStorage */
const LEGACY_ROLE_MAP = {
  GERENTE: ROLES.USER,
  OPERACIONAL: ROLES.USER,
};

export const getRole = () => {
  const raw = localStorage.getItem("permisssion") || "";
  return LEGACY_ROLE_MAP[raw] || raw;
};

export const getSessionUser = () => ({
  role: getRole(),
  nome: localStorage.getItem("usuario") || "",
  email: localStorage.getItem("userEmail") || "",
  userId: localStorage.getItem("userId") || "",
});

export const isBiometriaObrigatoria = () =>
  localStorage.getItem("biometriaObrigatoria") === "true";

export const CAPABILITY = {
  listAllSolicitacoes: "listAllSolicitacoes",
  listOwnSolicitacoes: "listOwnSolicitacoes",
  createSolicitacao: "createSolicitacao",
  manageUsuarios: "manageUsuarios",
  tecnico: "tecnico",
  listMeusContratos: "listMeusContratos",
  viewDashboard: "viewDashboard",
  viewAlertas: "viewAlertas",
  manageTermos: "manageTermos",
  approveBiometria: "approveBiometria",
};

const MATRIX = {
  [ROLES.ADMIN]: [
    CAPABILITY.listAllSolicitacoes,
    CAPABILITY.listOwnSolicitacoes,
    CAPABILITY.createSolicitacao,
    CAPABILITY.manageUsuarios,
    CAPABILITY.tecnico,
    CAPABILITY.viewDashboard,
    CAPABILITY.viewAlertas,
    CAPABILITY.manageTermos,
    CAPABILITY.approveBiometria,
  ],
  [ROLES.USER]: [
    CAPABILITY.listOwnSolicitacoes,
    CAPABILITY.createSolicitacao,
    CAPABILITY.viewDashboard,
    CAPABILITY.viewAlertas,
  ],
  [ROLES.SIGNER]: [
    CAPABILITY.listMeusContratos,
    CAPABILITY.viewDashboard,
    CAPABILITY.viewAlertas,
  ],
  [ROLES.SUPERVISOR]: [
    CAPABILITY.listOwnSolicitacoes,
    CAPABILITY.createSolicitacao,
    CAPABILITY.viewDashboard,
    CAPABILITY.viewAlertas,
    CAPABILITY.approveBiometria,
  ],
};

export const can = (capability, role = getRole()) =>
  (MATRIX[role] || []).includes(capability);

export const canApproveBiometria = (role = getRole()) =>
  can(CAPABILITY.approveBiometria, role);

export const canAccessRoute = (path, role = getRole()) => {
  if (jsonConfig.ocultarSolicitacoes && path.startsWith("/solicitacoes")) {
    return false;
  }
  if (jsonConfig.ocultarIntegracao && path.startsWith("/integracao")) {
    return false;
  }
  const flag = isBiometriaObrigatoria();
  if (path.startsWith("/aprovacao-biometria")) {
    if (!flag) return false;
    return can(CAPABILITY.approveBiometria, role);
  }
  if (path === "/biometria" || path.startsWith("/biometria/")) {
    if (!flag) return false;
    return role === ROLES.ADMIN || role === ROLES.USER || role === ROLES.SIGNER || role === ROLES.SUPERVISOR;
  }
  if (path.startsWith("/usuarios") || path.startsWith("/tecnicoIndex")) {
    return can(CAPABILITY.manageUsuarios, role) || can(CAPABILITY.tecnico, role);
  }
  if (path.startsWith("/solicitacoes/nova")) {
    return can(CAPABILITY.createSolicitacao, role);
  }
  // Detalhe / demarcações: escopo fino no panel service
  if (/^\/solicitacoes\/[^/]+/.test(path)) {
    return (
      can(CAPABILITY.listAllSolicitacoes, role) ||
      can(CAPABILITY.listOwnSolicitacoes, role) ||
      can(CAPABILITY.listMeusContratos, role)
    );
  }
  if (path.startsWith("/solicitacoes")) {
    return (
      can(CAPABILITY.listAllSolicitacoes, role) ||
      can(CAPABILITY.listOwnSolicitacoes, role)
    );
  }
  if (path.startsWith("/contratos")) {
    return can(CAPABILITY.listMeusContratos, role);
  }
  return true;
};

export const homePathForRole = (role = getRole()) => {
  if (role === ROLES.SIGNER) return "/contratos";
  return "/dashboard";
};
