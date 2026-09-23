/**
 * Handlers das ações do add-on (Workspace).
 */

/**
 * Reabre o rascunho em andamento.
 */
function handleOpenDraft() {
  var draft = getDraft();
  if (!draft) {
    return buildNavigationTo(buildHomepageCard());
  }
  return buildNavigationTo(buildRequestCard(draft));
}

/**
 * Novo destinatário.
 */
function handleAddRecipient() {
  return buildNavigationTo(
    buildRecipientFormCard({ index: -1 })
  );
}

/**
 * Abre o formulário já com o e-mail desta conta Google. CPF e telefone
 * continuam obrigatórios (contrato da API de signatários).
 */
function handleIncluirMeComoDestinatario() {
  var draft = getDraft();
  if (!draft) {
    return buildNavigationTo(buildHomepageCard());
  }

  var email = '';
  try {
    email = String(Session.getActiveUser().getEmail() || '').trim();
  } catch (err) {
    email = '';
  }
  if (!email) {
    try {
      email = String(getInstalacaoInfo().email_usuario || '').trim();
    } catch (err2) {
      email = '';
    }
  }

  try {
    CacheService.getUserCache().remove('MEU_CADASTRO');
  } catch (errCache) {}

  var cadastro;
  try {
    cadastro = getMeuCadastro() || {};
  } catch (errCadastro) {
    return CardService.newActionResponseBuilder()
      .setNotification(
        CardService.newNotification().setText(
          errCadastro.message || 'Não foi possível carregar seu cadastro.'
        )
      )
      .build();
  }
  if (!email && cadastro.email) {
    email = String(cadastro.email).trim();
  }

  var jaTem = email && draft.recipients.some(function (r) {
    return r.email && r.email.toLowerCase() === email.toLowerCase();
  });
  if (jaTem) {
    return CardService.newActionResponseBuilder()
      .setNotification(
        CardService.newNotification().setText('Você já está na lista de destinatários.')
      )
      .build();
  }

  var recipient = {
    name: String(cadastro.nome || '').trim(),
    email: email,
    cpf: String(cadastro.cpf || '').replace(/\D/g, ''),
    phone: String(cadastro.telefone || '').replace(/\D/g, ''),
    extraFields: []
  };

  var errors = validateRecipient(recipient);
  if (errors.length === 0) {
    draft = upsertRecipient(draft, recipient, -1);
    return CardService.newActionResponseBuilder()
      .setNavigation(
        CardService.newNavigation().updateCard(buildRequestCard(draft))
      )
      .setNotification(
        CardService.newNotification().setText('Você foi incluído como destinatário.')
      )
      .build();
  }

  return buildNavigationTo(
    buildRecipientFormCard({
      index: -1,
      souEu: true,
      recipient: recipient,
      errors: errors
    })
  );
}

/**
 * Edita destinatário.
 * @param {Object} e
 */
function handleEditRecipient(e) {
  var draft = getDraft();
  var index = parseInt(e.parameters.index, 10);
  var recipient = draft && draft.recipients[index];

  if (!recipient) {
    return buildNavigationTo(buildHomepageCard());
  }

  return buildNavigationTo(
    buildRecipientFormCard({
      index: index,
      recipient: recipient
    })
  );
}

/**
 * Salva destinatário no rascunho.
 * @param {Object} e
 */
function handleSaveRecipient(e) {
  var draft = getDraft();
  if (!draft) {
    return buildNavigationTo(buildHomepageCard());
  }

  var index = parseInt(e.parameters.index, 10);
  var recipient = readRecipientForm(e);

  var souEu = e.parameters.souEu === '1';
  var errors = validateRecipient(recipient);
  if (errors.length > 0) {
    return buildUpdateTo(
      buildRecipientFormCard({
        index: index,
        recipient: recipient,
        souEu: souEu,
        errors: errors
      })
    );
  }

  var duplicated = draft.recipients.some(function (r, i) {
    return i !== index && r.email.toLowerCase() === recipient.email.toLowerCase();
  });
  if (duplicated) {
    return buildUpdateTo(
      buildRecipientFormCard({
        index: index,
        recipient: recipient,
        souEu: souEu,
        errors: ['Já existe um destinatário com o e-mail ' + recipient.email + '.']
      })
    );
  }

  draft = upsertRecipient(draft, recipient, index);

  return CardService.newActionResponseBuilder()
    .setNavigation(
      CardService.newNavigation().popCard().updateCard(buildRequestCard(draft))
    )
    .setNotification(
      CardService.newNotification().setText(
        index >= 0 ? 'Destinatário atualizado.' : 'Destinatário adicionado.'
      )
    )
    .build();
}

/**
 * Remove destinatário.
 * @param {Object} e
 */
function handleRemoveRecipient(e) {
  var draft = getDraft();
  if (!draft) {
    return buildNavigationTo(buildHomepageCard());
  }

  var index = parseInt(e.parameters.index, 10);
  draft = removeRecipient(draft, index);

  return CardService.newActionResponseBuilder()
    .setNavigation(
      CardService.newNavigation().popCard().updateCard(buildRequestCard(draft))
    )
    .setNotification(
      CardService.newNotification().setText('Destinatário removido.')
    )
    .build();
}

/**
 * Abre o Web App exclusivo do solicitante (posicionar + enviar).
 */
function handleOpenPlacementWebApp() {
  var draft = getDraft();
  if (!draft) {
    return buildNavigationTo(buildHomepageCard());
  }

  if (!draft.recipients || draft.recipients.length === 0) {
    return CardService.newActionResponseBuilder()
      .setNotification(
        CardService.newNotification().setText(
          'Adicione ao menos um destinatário antes de abrir o Web App.'
        )
      )
      .build();
  }

  var session;
  try {
    session = createPlacementSession(draft);
  } catch (err) {
    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification().setText(err.message))
      .build();
  }

  return CardService.newActionResponseBuilder()
    .setOpenLink(
      CardService.newOpenLink()
        .setUrl(session.url)
        .setOpenAs(CardService.OpenAs.OVERLAY)
        .setOnClose(CardService.OnClose.RELOAD_ADD_ON)
    )
    .setNotification(
      CardService.newNotification().setText(
        'Web App aberto para o solicitante. Após o envio, a sessão ficará indisponível.'
      )
    )
    .build();
}

/**
 * Abre o card de vínculo da chave de integração (lsak_) desta conta Google.
 */
function handleOpenVincularChave() {
  return buildNavigationTo(buildVincularChaveCard({}));
}

/**
 * Vincula a chave colada no card à conta Google atual.
 * @param {Object} e
 */
function handleVincularChave(e) {
  var chaveApi = getFormValue(e, 'chave_api');
  if (!chaveApi) {
    return buildUpdateTo(
      buildVincularChaveCard({ mensagem: 'Cole a chave de integração (lsak_...).', erro: true })
    );
  }
  var resultado;
  try {
    resultado = vincularChaveDeIntegracao(chaveApi);
  } catch (err) {
    return buildUpdateTo(
      buildVincularChaveCard({ mensagem: err.message, erro: true })
    );
  }
  return CardService.newActionResponseBuilder()
    .setNavigation(
      CardService.newNavigation().updateCard(buildHomepageCard())
    )
    .setNotification(
      CardService.newNotification().setText(resultado.atualizado ? 'Chave atualizada com sucesso.' : 'Chave vinculada com sucesso.')
    )
    .build();
}

/**
 * Persiste o termo escolhido no dropdown do card do pedido.
 * @param {Object} e
 */
function handleSelecionarTermo(e) {
  var draft = getDraft();
  if (!draft) {
    return buildNavigationTo(buildHomepageCard());
  }
  draft.termoId = getFormValue(e, 'termo_id') || null;
  saveDraft(draft);
  return CardService.newActionResponseBuilder()
    .setNotification(
      CardService.newNotification().setText(
        draft.termoId ? 'Termo selecionado.' : 'O termo ativo padrão será usado.'
      )
    )
    .build();
}

/**
 * Descarta rascunho e revoga sessão do Web App.
 */
function handleDiscardDraft() {
  revokePlacementSession();
  clearDraft();
  return CardService.newActionResponseBuilder()
    .setNavigation(
      CardService.newNavigation().updateCard(buildHomepageCard())
    )
    .setNotification(
      CardService.newNotification().setText('Pedido descartado. Sessão do Web App revogada.')
    )
    .build();
}

/**
 * Permissão por arquivo.
 * @param {Object} e
 */
function handleGrantFileAccess(e) {
  return CardService.newDriveItemsSelectedActionResponseBuilder()
    .requestFileScope(e.parameters.fileId)
    .build();
}

/**
 * Volta à homepage.
 */
function handleNewRequest() {
  return buildNavigationTo(buildHomepageCard());
}

/**
 * Inicia um pedido novo no PDF em contexto (depois do envio o reload não
 * reabre o formulário sozinho — este botão é o caminho explícito).
 * @param {Object} e
 */
function handleNovoPedidoNesteArquivo(e) {
  var p = (e && e.parameters) || {};
  var fileId = p.fileId;
  var fileName = p.fileName;
  if (!fileId) {
    return buildNavigationTo(buildHomepageCard());
  }
  limparFlagPedidoEnviado();
  var draft = createDraft(fileId, fileName);
  return CardService.newActionResponseBuilder()
    .setNavigation(CardService.newNavigation().updateCard(buildRequestCard(draft)))
    .build();
}

/**
 * Lista os pedidos desta instalação no serviço.
 */
function handleListPedidos() {
  var pedidos;
  try {
    pedidos = listSignatureRequests();
  } catch (err) {
    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification().setText(err.message))
      .build();
  }
  return buildNavigationTo(buildPedidosCard(pedidos));
}

/**
 * Documentos pendentes de assinatura para o e-mail desta instalação.
 */
function handleListPendencias() {
  var pendencias;
  try {
    pendencias = listarPendenciasAssinatura();
  } catch (err) {
    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification().setText(err.message))
      .build();
  }
  return buildNavigationTo(buildPendenciasCard(pendencias));
}

/**
 * Abre a cerimônia no Web App (mesmo overlay do placement). OpenLink no
 * widget do card some no Drive — o botão tem que ser Action, como o
 * "posicionar e enviar".
 * @param {Object} e
 */
function handleAbrirAssinaturaPendencia(e) {
  var p = (e && e.parameters) || {};
  var link = montarLinkAssinaturaPendencia({
    convite: {
      documento_id: p.documento_id,
      pedido_id: p.pedido_id,
      email: p.email,
      convite: p.convite
    }
  });
  if (!link) {
    return CardService.newActionResponseBuilder()
      .setNotification(
        CardService.newNotification().setText(
          'Convite de assinatura indisponível para este documento.'
        )
      )
      .build();
  }
  return CardService.newActionResponseBuilder()
    .setOpenLink(
      CardService.newOpenLink()
        .setUrl(link)
        .setOpenAs(CardService.OpenAs.OVERLAY)
        .setOnClose(CardService.OnClose.RELOAD_ADD_ON)
    )
    .build();
}

/**
 * Status de um pedido. Se o documento estiver assinado, o serviço já grava o
 * contrato-assinado.pdf na pasta do processo usando o token desta chamada.
 * @param {Object} e
 */
function handleVerStatusPedido(e) {
  var pedidoId = e.parameters.pedidoId;
  var status;
  try {
    status = getSignatureRequestStatus(pedidoId);
  } catch (err) {
    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification().setText(err.message))
      .build();
  }
  return buildNavigationTo(buildPedidoStatusCard(status, null));
}

/**
 * Abre a tela de usuários da plataforma.
 */
function handleOpenUsuarios() {
  return buildNavigationTo(buildUsuariosCard({}));
}

/**
 * Cria o usuário na plataforma via serviço (chave de admin).
 * @param {Object} e
 */
function handleCriarUsuario(e) {
  var email = getFormValue(e, 'novo_usuario_email');
  var role = getFormValue(e, 'novo_usuario_role');
  if (!email) {
    return buildUpdateTo(
      buildUsuariosCard({ mensagem: 'Informe o e-mail do usuário.', erro: true })
    );
  }
  var body;
  try {
    body = createPlatformUser(email, parseInt(role || '1', 10));
  } catch (err) {
    return buildUpdateTo(
      buildUsuariosCard({ mensagem: err.message, erro: true, email: email })
    );
  }
  return buildUpdateTo(
    buildUsuariosCard({
      mensagem: (body.msg || 'Usuário criado.') + ' Ele conclui o cadastro no site.'
    })
  );
}

// ---------------------------------------------------------------------------
// Auxiliares
// ---------------------------------------------------------------------------

/**
 * @param {Object} e
 * @return {Object}
 */
function readRecipientForm(e) {
  return {
    name: getFormValue(e, 'recipient_name'),
    email: getFormValue(e, 'recipient_email'),
    cpf: getFormValue(e, 'recipient_cpf'),
    phone: getFormValue(e, 'recipient_phone'),
    extraFields: []
  };
}

/**
 * @param {Object} e
 * @param {string} fieldName
 * @return {string}
 */
function getFormValue(e, fieldName) {
  var input =
    e &&
    e.commonEventObject &&
    e.commonEventObject.formInputs &&
    e.commonEventObject.formInputs[fieldName];

  if (!input || !input.stringInputs || !input.stringInputs.value) {
    return '';
  }

  return String(input.stringInputs.value[0] || '').trim();
}

/**
 * @param {Card} card
 * @return {ActionResponse}
 */
function buildNavigationTo(card) {
  return CardService.newActionResponseBuilder()
    .setNavigation(CardService.newNavigation().pushCard(card))
    .build();
}

/**
 * @param {Card} card
 * @return {ActionResponse}
 */
function buildUpdateTo(card) {
  return CardService.newActionResponseBuilder()
    .setNavigation(CardService.newNavigation().updateCard(card))
    .build();
}
