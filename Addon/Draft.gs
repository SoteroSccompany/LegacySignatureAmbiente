/**
 * Gerenciamento do rascunho do pedido de assinatura.
 *
 * Montado 100% no add-on do Workspace (PDF aberto + destinatários).
 * As áreas de assinatura e o envio ocorrem no Web App do solicitante.
 *
 * Estrutura:
 * {
 *   fileId, fileName,
 *   recipients: [{
 *     id, name, email, cpf, phone, color,
 *     signatureArea: { page, x, y, width, height } | null
 *   }]
 * }
 *
 * CPF e telefone são obrigatórios: a API da plataforma exige os dois em
 * cada signatário (createSignatariosUseCase).
 */

var DRAFT_KEY = 'SIGNATURE_REQUEST_DRAFT';
var LAST_PEDIDO_ENVIADO_FILE_ID_KEY = 'LAST_PEDIDO_ENVIADO_FILE_ID';
var LAST_PEDIDO_ENVIADO_EM_KEY = 'LAST_PEDIDO_ENVIADO_EM';
var LAST_VOLTAR_HOMEPAGE_EM_KEY = 'LAST_VOLTAR_HOMEPAGE_EM';
var PEDIDO_ENVIADO_TTL_MS = 10 * 60 * 1000;

var RECIPIENT_COLORS = [
  '#1a73e8',
  '#d93025',
  '#188038',
  '#e37400',
  '#9334e6',
  '#007b83',
  '#c5221f',
  '#1967d2'
];

/**
 * @return {Object|null}
 */
function getDraft() {
  var raw = PropertiesService.getUserProperties().getProperty(DRAFT_KEY);
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
 * @param {string} fileId
 * @param {string} fileName
 * @return {Object}
 */
function createDraft(fileId, fileName) {
  revokePlacementSession();
  var draft = {
    fileId: fileId,
    fileName: fileName,
    recipients: []
  };
  saveDraft(draft);
  return draft;
}

/**
 * @param {Object} draft
 */
function saveDraft(draft) {
  PropertiesService.getUserProperties().setProperty(DRAFT_KEY, JSON.stringify(draft));
}

/**
 * Descarta o rascunho e revoga sessão do Web App, se houver.
 */
function clearDraft() {
  PropertiesService.getUserProperties().deleteProperty(DRAFT_KEY);
}

/**
 * @param {Object} draft
 * @return {string}
 */
function nextRecipientColor(draft) {
  var used = {};
  (draft.recipients || []).forEach(function (r) {
    if (r.color) {
      used[r.color] = true;
    }
  });
  for (var i = 0; i < RECIPIENT_COLORS.length; i++) {
    if (!used[RECIPIENT_COLORS[i]]) {
      return RECIPIENT_COLORS[i];
    }
  }
  return RECIPIENT_COLORS[draft.recipients.length % RECIPIENT_COLORS.length];
}

/**
 * @param {Object} draft
 * @param {Object} recipient
 * @param {number} index
 * @return {Object}
 */
function upsertRecipient(draft, recipient, index) {
  if (index >= 0 && index < draft.recipients.length) {
    var previous = draft.recipients[index];
    recipient.id = previous.id;
    recipient.color = previous.color || nextRecipientColor(draft);
    if (!recipient.signatureArea && previous.signatureArea) {
      recipient.signatureArea = previous.signatureArea;
    }
    draft.recipients[index] = recipient;
  } else {
    recipient.id = Utilities.getUuid();
    recipient.color = nextRecipientColor(draft);
    recipient.signatureArea = recipient.signatureArea || null;
    draft.recipients.push(recipient);
  }
  saveDraft(draft);
  return draft;
}

/**
 * @param {Object} draft
 * @param {number} index
 * @return {Object}
 */
function removeRecipient(draft, index) {
  if (index >= 0 && index < draft.recipients.length) {
    draft.recipients.splice(index, 1);
    saveDraft(draft);
  }
  return draft;
}

/**
 * Atualiza áreas a partir do Web App.
 * @param {Array<{recipientId:string, signatureArea:Object}>} placements
 * @return {Object|null}
 */
function applySignaturePlacements(placements) {
  var draft = getDraft();
  if (!draft) {
    return null;
  }

  var byId = {};
  (placements || []).forEach(function (item) {
    if (item && item.recipientId) {
      byId[item.recipientId] = item.signatureArea || null;
    }
  });

  draft.recipients.forEach(function (recipient) {
    if (Object.prototype.hasOwnProperty.call(byId, recipient.id)) {
      recipient.signatureArea = byId[recipient.id];
    }
  });

  saveDraft(draft);
  return draft;
}

/**
 * Valida cadastro no add-on (sem exigir área — área é no Web App).
 * @param {Object} recipient
 * @return {string[]}
 */
function validateRecipient(recipient) {
  var errors = [];

  if (!recipient.name) {
    errors.push('O nome é obrigatório.');
  }

  if (!recipient.email) {
    errors.push('O e-mail é obrigatório.');
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient.email)) {
    errors.push('O e-mail informado é inválido.');
  }

  var cpfDigits = String(recipient.cpf || '').replace(/\D/g, '');
  if (cpfDigits.length !== 11) {
    errors.push('O CPF é obrigatório (11 dígitos).');
  }

  var phoneDigits = String(recipient.phone || '').replace(/\D/g, '');
  if (phoneDigits.length < 10 || phoneDigits.length > 11) {
    errors.push('O telefone é obrigatório (DDD + número).');
  }

  return errors;
}

/**
 * @param {Object} draft
 * @return {string[]}
 */
function validateSignatureAreas(draft) {
  var errors = [];
  (draft.recipients || []).forEach(function (recipient) {
    if (!recipient.signatureArea) {
      errors.push(
        'Defina a área de assinatura de "' + (recipient.name || recipient.email) + '".'
      );
    }
  });
  return errors;
}

/**
 * @param {Object} draft
 * @return {boolean}
 */
function allSignatureAreasDefined(draft) {
  if (!draft || !draft.recipients || draft.recipients.length === 0) {
    return false;
  }
  return draft.recipients.every(function (r) {
    return !!r.signatureArea;
  });
}

/**
 * Depois do envio (ou da cerimônia), o reload do overlay não deve reabrir
 * o card de pedido vazio. Flag curto (~10 min) no mesmo PDF.
 * @param {string} fileId
 */
function marcarPedidoEnviado(fileId) {
  var props = PropertiesService.getUserProperties();
  var agora = String(Date.now());
  if (fileId) {
    props.setProperty(LAST_PEDIDO_ENVIADO_FILE_ID_KEY, String(fileId));
    props.setProperty(LAST_PEDIDO_ENVIADO_EM_KEY, agora);
  }
  props.setProperty(LAST_VOLTAR_HOMEPAGE_EM_KEY, agora);
}

/**
 * Cerimônia concluída (telaConcluida): o próximo render do add-on vai pra homepage.
 */
function marcarHomepageAposOverlay() {
  PropertiesService.getUserProperties().setProperty(
    LAST_VOLTAR_HOMEPAGE_EM_KEY,
    String(Date.now())
  );
}

/**
 * @param {string} fileId
 * @return {boolean}
 */
function pedidoRecenteNesteArquivo(fileId) {
  if (!fileId) return false;
  var props = PropertiesService.getUserProperties();
  var salvo = props.getProperty(LAST_PEDIDO_ENVIADO_FILE_ID_KEY);
  var quando = Number(props.getProperty(LAST_PEDIDO_ENVIADO_EM_KEY) || 0);
  if (!salvo || salvo !== String(fileId)) return false;
  if (!quando || Date.now() - quando > PEDIDO_ENVIADO_TTL_MS) return false;
  return true;
}

/**
 * @return {boolean}
 */
function deveMostrarHomepageAposOverlay() {
  var quando = Number(
    PropertiesService.getUserProperties().getProperty(LAST_VOLTAR_HOMEPAGE_EM_KEY) || 0
  );
  if (!quando) return false;
  return Date.now() - quando <= PEDIDO_ENVIADO_TTL_MS;
}

function limparFlagPedidoEnviado() {
  var props = PropertiesService.getUserProperties();
  props.deleteProperty(LAST_PEDIDO_ENVIADO_FILE_ID_KEY);
  props.deleteProperty(LAST_PEDIDO_ENVIADO_EM_KEY);
  props.deleteProperty(LAST_VOLTAR_HOMEPAGE_EM_KEY);
}
