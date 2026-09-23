/**
 * Assinatura Digital — Add-on do Google Workspace (Drive)
 *
 * O add-on entra em contexto quando o usuário abre/seleciona um PDF
 * no Drive. O pedido começa 100% no Workspace (destinatários e campos
 * extras). O Web App é exclusivo do solicitante para posicionar as
 * assinaturas e enviar; após a conclusão, a sessão fica indisponível.
 */

/**
 * [DEV ONLY] Rode no editor do Apps Script: selecione esta função → Executar.
 *
 * Encerra sessão aberta do Web App (se houver), limpa UserCache /
 * UserProperties do fluxo de placement e o rascunho do pedido.
 * Não cria implantação no Google — após clasp push, use
 * Implantar → Gerenciar implantações → Nova versão no Aplicativo da Web.
 *
 * @return {Object} Relatório para o painel de execução / Logs.
 */
function DEV_forceResetPlacementState() {
  var report = {
    ok: true,
    sessionWasOpen: false,
    sessionToken: null,
    sessionRevoked: false,
    draftCleared: false,
    cacheKeysRemoved: [],
    propertyKeysRemoved: [],
    webAppUrlFromProperty: PropertiesService.getScriptProperties().getProperty('WEBAPP_URL'),
    webAppUrlFromService: null,
    reminder:
      'DEV only. Estado local limpo. Para código novo no /exec: Implantar → Gerenciar → Nova versão.'
  };

  try {
    report.webAppUrlFromService = ScriptApp.getService().getUrl();
  } catch (err) {
    report.webAppUrlFromService = null;
    report.webAppUrlFromServiceError = err.message;
  }

  var props = PropertiesService.getUserProperties();
  var cache = CacheService.getUserCache();
  var token = props.getProperty(SESSION_USER_KEY);

  if (token) {
    report.sessionToken = token;
    var openSession = getPlacementSession(token);
    report.sessionWasOpen = !!(openSession && openSession.status === 'open');

    revokePlacementSession();
    report.sessionRevoked = true;

    cache.remove(SESSION_CACHE_PREFIX + token);
    report.cacheKeysRemoved.push(SESSION_CACHE_PREFIX + token);

    if (props.getProperty(SESSION_CACHE_PREFIX + token)) {
      props.deleteProperty(SESSION_CACHE_PREFIX + token);
      report.propertyKeysRemoved.push(SESSION_CACHE_PREFIX + token);
    }
  }

  var allProps = props.getProperties();
  Object.keys(allProps).forEach(function (key) {
    if (key === SESSION_USER_KEY || key.indexOf(SESSION_CACHE_PREFIX) === 0) {
      if (key.indexOf(SESSION_CACHE_PREFIX) === 0) {
        cache.remove(key);
        if (report.cacheKeysRemoved.indexOf(key) < 0) {
          report.cacheKeysRemoved.push(key);
        }
      }
      props.deleteProperty(key);
      if (report.propertyKeysRemoved.indexOf(key) < 0) {
        report.propertyKeysRemoved.push(key);
      }
    }
  });

  if (props.getProperty(DRAFT_KEY)) {
    clearDraft();
    report.draftCleared = true;
    report.propertyKeysRemoved.push(DRAFT_KEY);
  }

  [LAST_PEDIDO_ENVIADO_FILE_ID_KEY, LAST_PEDIDO_ENVIADO_EM_KEY, LAST_VOLTAR_HOMEPAGE_EM_KEY].forEach(function (key) {
    if (props.getProperty(key)) {
      props.deleteProperty(key);
      report.propertyKeysRemoved.push(key);
    }
  });

  Logger.log('[DEV_forceResetPlacementState] %s', JSON.stringify(report, null, 2));
  return report;
}

/**
 * Gatilho da homepage do add-on (sem PDF em contexto).
 * @param {Object} e
 * @return {Card}
 */
function onHomepage(e) {
  if (!hasInstalacaoKey()) {
    return buildVincularChaveCard({});
  }
  if (!podeSolicitarPedido()) {
    return buildHomepageCard();
  }
  if (deveMostrarHomepageAposOverlay()) {
    return buildHomepageCard();
  }
  var draft = getDraft();
  if (draft && draft.fileId) {
    return buildRequestCard(draft);
  }
  return buildHomepageCard();
}

/**
 * Gatilho contextual do Drive: PDF aberto ou selecionado.
 * Usa activeCursorItem (documento em foco/preview) quando disponível.
 *
 * @param {Object} e Evento do Drive.
 * @return {Card}
 */
function onDriveItemsSelected(e) {
  if (!hasInstalacaoKey()) {
    return buildVincularChaveCard({});
  }
  if (!podeSolicitarPedido()) {
    return buildHomepageCard();
  }

  var item = resolveActivePdfItem(e);

  if (!item) {
    var selectedCount =
      (e && e.drive && e.drive.selectedItems && e.drive.selectedItems.length) || 0;

    if (selectedCount > 1) {
      return buildMessageCard(
        'Seleção inválida',
        'Abra ou selecione apenas um arquivo PDF por pedido de assinatura.'
      );
    }

    return buildHomepageCard();
  }

  if (item.mimeType !== 'application/pdf') {
    return buildMessageCard(
      'Arquivo não suportado',
      'O arquivo "' +
        item.title +
        '" não é um PDF. Abra um documento PDF no Drive para iniciar o pedido de assinatura.'
    );
  }

  if (!item.addonHasFileScopePermission) {
    return buildFileAccessCard(item);
  }

  if (pedidoRecenteNesteArquivo(item.id) || deveMostrarHomepageAposOverlay()) {
    return buildHomepageCard({
      pdfContexto: item,
      pedidoRecente: pedidoRecenteNesteArquivo(item.id)
    });
  }

  var draft = getDraft();
  if (!draft || draft.fileId !== item.id) {
    draft = createDraft(item.id, item.title);
  }

  return buildRequestCard(draft);
}

/**
 * Resolve o item ativo do Drive (PDF aberto no preview/foco).
 * Preferência: activeCursorItem; fallback: único item selecionado.
 *
 * @param {Object} e
 * @return {Object|null}
 */
function resolveActivePdfItem(e) {
  if (!e || !e.drive) {
    return null;
  }

  if (e.drive.activeCursorItem) {
    return e.drive.activeCursorItem;
  }

  var items = e.drive.selectedItems || [];
  if (items.length === 1) {
    return items[0];
  }

  return null;
}
