export const PENDING_ASSINAR_KEY = "pendingAssinarDocumentoId";

// Evita reter um convite abandonado por tempo indefinido na aba: se o
// usuário desistir do fluxo de assinatura e mais tarde logar normalmente
// no painel, não deve ser redirecionado de volta para um convite expirado.
export const PENDING_ASSINAR_TTL_MS = 30 * 60 * 1000;

export const setPendingAssinar = (documentoId) => {
  if (!documentoId) return;
  sessionStorage.setItem(
    PENDING_ASSINAR_KEY,
    JSON.stringify({ documentoId: String(documentoId), ts: Date.now() })
  );
};

export const getPendingAssinar = () => {
  const raw = sessionStorage.getItem(PENDING_ASSINAR_KEY);
  if (!raw) return null;

  try {
    const { documentoId, ts } = JSON.parse(raw);
    if (!documentoId || Date.now() - Number(ts) > PENDING_ASSINAR_TTL_MS) {
      sessionStorage.removeItem(PENDING_ASSINAR_KEY);
      return null;
    }
    return documentoId;
  } catch {
    sessionStorage.removeItem(PENDING_ASSINAR_KEY);
    return null;
  }
};

export const clearPendingAssinar = () => {
  sessionStorage.removeItem(PENDING_ASSINAR_KEY);
};

// Guarda o e-mail informado na tentativa de assinatura para não obrigar o
// signatário a redigitá-lo ao voltar do onboarding do painel (senha/2FA/perfil).
export const PENDING_ASSINAR_EMAIL_KEY = "pendingAssinarEmail";

export const setPendingAssinarEmail = (email) => {
  if (!email) return;
  sessionStorage.setItem(PENDING_ASSINAR_EMAIL_KEY, String(email));
};

export const getPendingAssinarEmail = () =>
  sessionStorage.getItem(PENDING_ASSINAR_EMAIL_KEY) || "";

export const clearPendingAssinarEmail = () => {
  sessionStorage.removeItem(PENDING_ASSINAR_EMAIL_KEY);
};

// Marca que o onboarding de biometria já devolveu o usuário para a cerimônia
// de assinatura nesta aba. Sem isso, um perfil aprovado que ainda cai no
// desvio de biometria (ex.: msg não mapeada) faz o hub reabrir o onboarding
// de novo, e o onboarding manda de volta pro hub — looping.
export const ASSINAR_SKIP_BIOMETRIA_KEY = "assinarSkipBiometriaOnboarding";

export const setAssinarSkipBiometriaOnboarding = () => {
  sessionStorage.setItem(ASSINAR_SKIP_BIOMETRIA_KEY, "1");
};

export const getAssinarSkipBiometriaOnboarding = () =>
  sessionStorage.getItem(ASSINAR_SKIP_BIOMETRIA_KEY) === "1";

export const clearAssinarSkipBiometriaOnboarding = () => {
  sessionStorage.removeItem(ASSINAR_SKIP_BIOMETRIA_KEY);
};
