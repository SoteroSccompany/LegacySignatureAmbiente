/**
 * Sessão de uso do Web App (somente o solicitante).
 *
 * O pedido começa 100% no add-on do Workspace. O Web App é aberto
 * apenas para o solicitante posicionar as assinaturas e enviar.
 * Após a conclusão, o token é invalidado e a URL fica indisponível.
 *
 * Sessão (CacheService + UserProperties):
 * {
 *   token: string,
 *   email: string,
 *   status: 'open' | 'completed' | 'revoked',
 *   fileName: string,
 *   createdAt: string,
 *   completedAt?: string
 * }
 */

var SESSION_USER_KEY = 'PLACEMENT_SESSION_TOKEN';
var SESSION_CACHE_PREFIX = 'PLACEMENT_SESSION_';
var SESSION_TTL_SECONDS = 6 * 60 * 60; // 6 horas

/**
 * Cria (ou substitui) uma sessão aberta para o solicitante atual.
 * @param {Object} draft
 * @return {{token:string, url:string}}
 */
function createPlacementSession(draft) {
  revokePlacementSession();

  var token = Utilities.getUuid().replace(/-/g, '');
  var email = Session.getActiveUser().getEmail();
  var session = {
    token: token,
    email: email,
    status: 'open',
    fileId: draft.fileId,
    fileName: draft.fileName,
    createdAt: new Date().toISOString()
  };

  savePlacementSession(session);
  PropertiesService.getUserProperties().setProperty(SESSION_USER_KEY, token);

  return {
    token: token,
    url: buildPlacementSessionUrl(token)
  };
}

/**
 * Monta a URL do Web App com o token da sessão.
 * @param {string} token
 * @return {string}
 */
function buildPlacementSessionUrl(token) {
  // WEBAPP_URL vem das propriedades do script (mesma URL usada na cerimônia).
  var base = getWebAppUrl();
  return (
    base +
    (base.indexOf('?') >= 0 ? '&' : '?') +
    'modo=placement&token=' +
    encodeURIComponent(token)
  );
}

/**
 * Persiste a sessão no cache (compartilhado entre add-on e Web App).
 * @param {Object} session
 */
function savePlacementSession(session) {
  CacheService.getUserCache().put(
    SESSION_CACHE_PREFIX + session.token,
    JSON.stringify(session),
    SESSION_TTL_SECONDS
  );
  // Espelho em UserProperties para sobreviver a limpeza de cache.
  PropertiesService.getUserProperties().setProperty(
    SESSION_CACHE_PREFIX + session.token,
    JSON.stringify(session)
  );
}

/**
 * Carrega a sessão pelo token.
 * @param {string} token
 * @return {Object|null}
 */
function getPlacementSession(token) {
  if (!token) {
    return null;
  }

  var raw = CacheService.getUserCache().get(SESSION_CACHE_PREFIX + token);
  if (!raw) {
    raw = PropertiesService.getUserProperties().getProperty(SESSION_CACHE_PREFIX + token);
  }
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch (err) {
    return null;
  }
}

/**
 * Valida acesso do solicitante à sessão aberta.
 * @param {string} token
 * @return {{ok:boolean, session?:Object, message?:string}}
 */
function validateOpenPlacementSession(token) {
  var session = getPlacementSession(token);
  if (!session) {
    return {
      ok: false,
      message: 'Esta sessão do Web App não existe ou expirou.'
    };
  }

  if (session.status !== 'open') {
    return {
      ok: false,
      session: session,
      message:
        'Esta sessão foi encerrada após o envio do pedido e não está mais disponível.'
    };
  }

  var email = Session.getActiveUser().getEmail();
  if (!email || email.toLowerCase() !== String(session.email || '').toLowerCase()) {
    return {
      ok: false,
      session: session,
      message: 'Este Web App é exclusivo do solicitante que iniciou o pedido no Workspace.'
    };
  }

  return { ok: true, session: session };
}

/**
 * Marca a sessão como concluída (URL fica indisponível).
 * @param {string} token
 */
function completePlacementSession(token) {
  var session = getPlacementSession(token);
  if (!session) {
    return;
  }
  session.status = 'completed';
  session.completedAt = new Date().toISOString();
  savePlacementSession(session);

  var props = PropertiesService.getUserProperties();
  if (props.getProperty(SESSION_USER_KEY) === token) {
    props.deleteProperty(SESSION_USER_KEY);
  }
}

/**
 * Revoga a sessão atual do usuário (descarte / nova sessão).
 */
function revokePlacementSession() {
  var props = PropertiesService.getUserProperties();
  var token = props.getProperty(SESSION_USER_KEY);
  if (!token) {
    return;
  }

  var session = getPlacementSession(token);
  if (session && session.status === 'open') {
    session.status = 'revoked';
    session.completedAt = new Date().toISOString();
    savePlacementSession(session);
  }

  props.deleteProperty(SESSION_USER_KEY);
}
