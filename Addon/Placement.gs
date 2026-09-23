/**
 * Web App — posicionamento visual e envio do pedido (somente solicitante).
 *
 * Início do fluxo: 100% no add-on do Workspace.
 * Este app só abre com token de sessão válido do solicitante.
 * Após o envio, a sessão é concluída e a URL fica indisponível.
 */

/**
 * Entrada HTTP única do Web App.
 *
 * ?modo=placement (padrão) → posicionamento do solicitante (token de sessão).
 * ?modo=assinar             → cerimônia do signatário (convite HMAC + lsak_
 *                             colada pelo signatário; ver Assinar.gs). Só
 *                             chega aqui pelo link do convite por e-mail.
 *
 * @param {Object} e
 * @return {HtmlOutput}
 */
function doGet(e) {
  var modo = (e && e.parameter && e.parameter.modo) || 'placement';
  if (modo === 'assinar') {
    return doGetAssinar(e);
  }
  return doGetPlacement(e);
}

/**
 * Web App de posicionamento (somente o solicitante).
 * @param {Object} e
 * @return {HtmlOutput}
 */
function doGetPlacement(e) {
  var token = (e && e.parameter && e.parameter.token) || '';
  var validation = validateOpenPlacementSession(token);

  if (!validation.ok) {
    return buildUnavailableHtml(validation.message);
  }

  var draft = getDraft();
  if (!draft || !draft.fileId || draft.fileId !== validation.session.fileId) {
    return buildUnavailableHtml(
      'O rascunho do pedido não está mais disponível. Volte ao add-on no Drive e inicie novamente.'
    );
  }

  var template = HtmlService.createTemplateFromFile('Placementweb');
  template.token = token;
  template.fileName = draft.fileName;

  return template
    .evaluate()
    .setTitle('Posicionar e enviar — ' + draft.fileName)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * Página HTML quando a sessão é inválida/encerrada.
 * @param {string} message
 * @return {HtmlOutput}
 */
function buildUnavailableHtml(message) {
  var html =
    '<!DOCTYPE html><html><head><meta charset="utf-8"><style>' +
    'body{font-family:Arial,sans-serif;background:#f0f2f5;margin:0;padding:40px;color:#202124}' +
    '.box{max-width:520px;margin:0 auto;background:#fff;border:1px solid #dadce0;border-radius:8px;padding:28px}' +
    'h1{font-size:20px;margin:0 0 12px}p{margin:0;line-height:1.5;color:#5f6368}' +
    '</style></head><body><div class="box">' +
    '<h1>Web App indisponível</h1>' +
    '<p>' +
    escapeHtml_(message || 'Esta sessão não está mais disponível.') +
    '</p>' +
    '<p style="margin-top:16px">O pedido deve ser iniciado novamente pelo add-on no Google Drive.</p>' +
    '</div></body></html>';

  return HtmlService.createHtmlOutput(html).setTitle('Web App indisponível');
}

/**
 * Dados do editor (PDF + destinatários). Exige sessão aberta.
 * @param {string} token
 * @return {Object}
 */
function getPlacementEditorData(token) {
  assertOpenSession_(token);

  var draft = getDraft();
  if (!draft || !draft.fileId) {
    throw new Error('Rascunho não encontrado. Reabra o PDF no Drive pelo add-on.');
  }
  if (!draft.recipients || draft.recipients.length === 0) {
    throw new Error('Cadastre destinatários no add-on antes de posicionar as assinaturas.');
  }

  var file = DriveApp.getFileById(draft.fileId);
  var bytes = file.getBlob().getBytes();

  return {
    fileName: draft.fileName,
    pdfBase64: Utilities.base64Encode(bytes),
    recipients: draft.recipients.map(function (r) {
      return {
        id: r.id,
        name: r.name,
        email: r.email,
        color: r.color,
        extraFields: r.extraFields || [],
        signatureArea: r.signatureArea || null
      };
    })
  };
}

/**
 * Salva as áreas desenhadas (ainda sem enviar).
 * @param {string} token
 * @param {Array} placements
 * @return {{ok:boolean, placedCount:number, total:number}}
 */
function savePlacementEditorData(token, placements) {
  assertOpenSession_(token);

  var draft = applySignaturePlacements(placements || []);
  if (!draft) {
    throw new Error('Não foi possível salvar: rascunho ausente.');
  }

  var placedCount = draft.recipients.filter(function (r) {
    return !!r.signatureArea;
  }).length;

  return {
    ok: true,
    placedCount: placedCount,
    total: draft.recipients.length
  };
}

/**
 * Envia o pedido ao serviço (pasta + cópia no Drive ficam com a conta de
 * serviço, do lado do addon-service) e encerra a sessão (URL fica indisponível).
 * @param {string} token
 * @param {Array} placements
 * @return {Object}
 */
function submitPlacementAndSend(token, placements) {
  assertOpenSession_(token);

  var draft = applySignaturePlacements(placements || []);
  if (!draft) {
    throw new Error('Rascunho não encontrado.');
  }

  var areaErrors = validateSignatureAreas(draft);
  if (areaErrors.length > 0) {
    throw new Error(
      'Delimite a área de assinatura de todos os destinatários antes de enviar.'
    );
  }

  var fileId = draft.fileId;
  var result = submitSignatureRequest(draft);

  completePlacementSession(token);
  clearDraft();
  marcarPedidoEnviado(fileId);

  return {
    ok: true,
    requestId: result.requestId,
    fileName: result.fileName,
    recipientCount: result.recipientCount,
    folderName: result.folderName,
    folderId: result.folderId,
    message: result.message || 'Pedido enviado.'
  };
}

/**
 * @param {string} token
 */
function assertOpenSession_(token) {
  var validation = validateOpenPlacementSession(token);
  if (!validation.ok) {
    throw new Error(validation.message);
  }
}

/**
 * @param {string} text
 * @return {string}
 */
function escapeHtml_(text) {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
