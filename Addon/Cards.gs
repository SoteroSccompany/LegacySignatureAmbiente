/**
 * Cards do add-on (Workspace). O pedido começa aqui.
 * Posicionamento visual e envio ficam no Web App do solicitante.
 */

/**
 * @param {Object=} options
 * @return {Card}
 */
function buildHomepageCard(options) {
  options = options || {};
  if (!hasInstalacaoKey()) {
    return buildVincularChaveCard({});
  }

  var info;
  try {
    info = getInstalacaoInfo();
  } catch (err) {
    return buildVincularChaveCard({ mensagem: err.message, erro: true });
  }

  var podeSolicitar = info.escopo === 'addon_solicitante';
  var pdfContexto = options.pdfContexto || null;
  var pedidoRecente = options.pedidoRecente === true;

  var section = CardService.newCardSection();
  if (podeSolicitar) {
    if (pedidoRecente && pdfContexto && pdfContexto.title) {
      section.addWidget(
        CardService.newTextParagraph().setText(
          'Pedido enviado. O PDF <b>' + pdfContexto.title + '</b> continua aberto no Drive. A cerimônia abre pelo card <b>Documentos para assinar</b>.'
        )
      );
    } else {
      section
        .addWidget(
          CardService.newTextParagraph().setText(
            'Inicie o pedido de assinatura <b>no Workspace</b>, a partir do PDF aberto:'
          )
        )
        .addWidget(
          CardService.newTextParagraph().setText(
            '1. Abra um <b>PDF</b> no Google Drive.<br>' +
              '2. Cadastre os destinatários (nome, e-mail, CPF e telefone).<br>' +
              '3. Abra o Web App (somente você, o solicitante) para delimitar as assinaturas e enviar.<br>' +
              '4. O destinatário recebe o convite por e-mail e assina <b>no próprio Workspace</b> (identidade, reconhecimento facial e assinatura). O PDF assinado volta para a pasta do Drive.'
          )
        );
    }

    if (pdfContexto && pdfContexto.id) {
      section.addWidget(
        CardService.newTextButton()
          .setText('Novo pedido neste PDF')
          .setOnClickAction(
            CardService.newAction()
              .setFunctionName('handleNovoPedidoNesteArquivo')
              .setParameters({
                fileId: String(pdfContexto.id),
                fileName: String(pdfContexto.title || '')
              })
          )
      );
    }

    var draft = getDraft();
    if (draft && draft.fileId) {
      section.addWidget(
        CardService.newTextButton()
          .setText('Continuar pedido: ' + draft.fileName)
          .setOnClickAction(CardService.newAction().setFunctionName('handleOpenDraft'))
      );
    }
  } else {
    section.addWidget(
      CardService.newTextParagraph().setText(
        'Sua chave tem escopo de <b>assinatura</b>. Só um gerente com chave de solicitante pode pedir assinatura de documento pelo Workspace. Você recebe o link de assinatura por e-mail.'
      )
    );
  }

  var assinarSection = CardService.newCardSection()
    .setHeader('Assinar documento')
    .addWidget(
      CardService.newTextParagraph().setText(
        'Veja os documentos em que você é destinatário e conclua a cerimônia (identidade, reconhecimento facial e assinatura) sem sair do Workspace.'
      )
    )
    .addWidget(
      CardService.newTextButton()
        .setText('Documentos para assinar')
        .setTextButtonStyle(CardService.TextButtonStyle.FILLED)
        .setOnClickAction(CardService.newAction().setFunctionName('handleListPendencias'))
    );

  var panelSection = CardService.newCardSection().setHeader('Conta vinculada');
  panelSection.addWidget(
    CardService.newDecoratedText()
      .setTopLabel('E-mail da chave')
      .setText(info.email_usuario || '—')
      .setBottomLabel('Escopo: ' + (podeSolicitar ? 'Solicitante' : 'Signatário'))
  );
  if (podeSolicitar) {
    panelSection
      .addWidget(
        CardService.newTextButton()
          .setText('Meus pedidos')
          .setOnClickAction(CardService.newAction().setFunctionName('handleListPedidos'))
      )
      .addWidget(
        CardService.newTextButton()
          .setText('Usuários da plataforma')
          .setOnClickAction(CardService.newAction().setFunctionName('handleOpenUsuarios'))
      );
  }
  panelSection
    .addWidget(
      CardService.newTextButton()
        .setText('Trocar chave vinculada')
        .setOnClickAction(CardService.newAction().setFunctionName('handleOpenVincularChave'))
    );

  return CardService.newCardBuilder()
    .setHeader(
      CardService.newCardHeader()
        .setTitle('Assinatura Digital')
        .setSubtitle('Pedido e assinatura sem sair do Workspace')
    )
    .addSection(section)
    .addSection(assinarSection)
    .addSection(panelSection)
    .build();
}

/**
 * Card de vínculo da lsak_ desta conta Google. Sem chave vinculada, o
 * add-on não pede nem assina — só solicita/gera no site.
 * @param {Object} options
 * @return {Card}
 */
function buildVincularChaveCard(options) {
  options = options || {};
  var builder = CardService.newCardBuilder().setHeader(
    CardService.newCardHeader()
      .setTitle('Vincular chave de integração')
      .setSubtitle('Necessário para pedir ou assinar pelo Workspace')
  );

  var section = CardService.newCardSection();
  if (options.mensagem) {
    section.addWidget(
      CardService.newTextParagraph().setText(
        (options.erro ? '<font color="#d93025">' : '<b>') +
          options.mensagem +
          (options.erro ? '</font>' : '</b>')
      )
    );
  }
  section.addWidget(
    CardService.newTextParagraph().setText(
      '<b>1.</b> Autorize o acesso ao Drive desta conta Google (obrigatório — sem isso o serviço não consegue impersonar seu Drive).<br>' +
        '<b>2.</b> Cole aqui a chave de integração (<b>lsak_...</b>) gerada para você na tela Integração do site e vincule. Gerente gera a própria chave (pedir) ou a de um usuário (assinar); usuário normal só solicita ao gerente.'
    )
  );
  section.addWidget(
    CardService.newTextButton()
      .setText('1. Autorizar Drive')
      .setOpenLink(
        CardService.newOpenLink().setUrl(
          getServiceBaseUrl() + '/oauth/start?email=' + encodeURIComponent(Session.getActiveUser().getEmail())
        )
      )
  );
  section.addWidget(
    CardService.newTextInput()
      .setFieldName('chave_api')
      .setTitle('Chave de integração (lsak_...) *')
      .setMultiline(false)
  );
  section.addWidget(
    CardService.newTextButton()
      .setText('2. Vincular')
      .setTextButtonStyle(CardService.TextButtonStyle.FILLED)
      .setOnClickAction(CardService.newAction().setFunctionName('handleVincularChave'))
  );
  section.addWidget(
    CardService.newTextButton()
      .setText('Abrir o site (gerar/solicitar chave)')
      .setOpenLink(CardService.newOpenLink().setUrl(getSiteUrl()))
  );

  builder.addSection(section);
  return builder.build();
}

/**
 * Lista dos pedidos enviados por esta instalação.
 * @param {Array} pedidos
 * @return {Card}
 */
function buildPedidosCard(pedidos) {
  var builder = CardService.newCardBuilder().setHeader(
    CardService.newCardHeader()
      .setTitle('Meus pedidos')
      .setSubtitle('Enviados pelo Workspace')
  );

  var section = CardService.newCardSection();
  if (!pedidos || pedidos.length === 0) {
    section.addWidget(
      CardService.newTextParagraph().setText(
        'Nenhum pedido enviado ainda. Abra um PDF no Drive para começar.'
      )
    );
  } else {
    pedidos.forEach(function (pedido) {
      section.addWidget(
        CardService.newDecoratedText()
          .setTopLabel(pedido.status + (pedido.erro_msg ? ' — ' + pedido.erro_msg : ''))
          .setText(pedido.titulo)
          .setBottomLabel('Criado em ' + formatarDataBr(pedido.criado_em))
          .setWrapText(true)
          .setOnClickAction(
            CardService.newAction()
              .setFunctionName('handleVerStatusPedido')
              .setParameters({ pedidoId: String(pedido.id) })
          )
      );
    });
  }
  builder.addSection(section);
  return builder.build();
}

/**
 * Documentos pendentes de assinatura para o e-mail desta instalação (convite
 * recebido). Botão abre a cerimônia direto no Web App, sem colar a lsak_ de
 * novo (a conta já está vinculada).
 * @param {Array} pendencias
 * @return {Card}
 */
function buildPendenciasCard(pendencias) {
  var builder = CardService.newCardBuilder().setHeader(
    CardService.newCardHeader()
      .setTitle('Documentos para assinar')
      .setSubtitle('Convites recebidos no Workspace')
  );

  var section = CardService.newCardSection();
  if (!pendencias || pendencias.length === 0) {
    section.addWidget(
      CardService.newTextParagraph().setText(
        'Nenhum documento pendente de assinatura no momento.'
      )
    );
  } else {
    pendencias.forEach(function (pendencia) {
      // Só o status local ASSINADO (pedido fechado) ou assinado_por_mim —
      // AGUARDANDO_ASSINATURAS / DOCUMENTO_ASSINADO / SIGNED não viram "Ver".
      var statusLocal = String(pendencia.status || '');
      var assinado =
        pendencia.assinado_por_mim === true || statusLocal === 'ASSINADO';
      var item = CardService.newDecoratedText()
        .setTopLabel(assinado ? 'Assinado' : statusLocal)
        .setText(pendencia.titulo)
        .setBottomLabel('Recebido em ' + formatarDataBr(pendencia.criado_em))
        .setWrapText(true);
      var link = montarLinkAssinaturaPendencia(pendencia);
      if (link) {
        var convite = pendencia.convite || {};
        item.setButton(
          CardService.newTextButton()
            .setText(assinado ? 'Ver' : 'Assinar')
            .setOnClickAction(
              CardService.newAction()
                .setFunctionName('handleAbrirAssinaturaPendencia')
                .setParameters({
                  documento_id: String(convite.documento_id || pendencia.documento_id || ''),
                  pedido_id: String(convite.pedido_id || pendencia.id || ''),
                  email: String(convite.email || ''),
                  convite: String(convite.convite || '')
                })
            )
        );
      }
      section.addWidget(item);
    });
  }
  builder.addSection(section);
  return builder.build();
}

/**
 * Detalhe/status de um pedido (dados do serviço + espelho da API).
 * @param {Object} statusPedido
 * @param {string} mensagem
 * @return {Card}
 */
function buildPedidoStatusCard(statusPedido, mensagem) {
  var builder = CardService.newCardBuilder().setHeader(
    CardService.newCardHeader()
      .setTitle(statusPedido.titulo || 'Pedido')
      .setSubtitle(statusPedido.status || '')
  );

  var section = CardService.newCardSection();
  if (mensagem) {
    section.addWidget(CardService.newTextParagraph().setText('<b>' + mensagem + '</b>'));
  }
  if (statusPedido.erro) {
    section.addWidget(
      CardService.newTextParagraph().setText(
        '<font color="#d93025">' + statusPedido.erro + '</font>'
      )
    );
  }

  var api = statusPedido.api;
  if (api && api.pendente_gravar_drive) {
    section.addWidget(
      CardService.newTextParagraph().setText(
        '<font color="#e37400"><b>Documento assinado na plataforma.</b> Toque em "Atualizar status" para gravar o contrato-assinado.pdf na pasta do processo.</font>'
      )
    );
  }
  if (api && api.signatarios && api.signatarios.length > 0) {
    api.signatarios.forEach(function (s) {
      section.addWidget(
        CardService.newDecoratedText()
          .setTopLabel(s.status + (s.assinado_em ? ' · ' + formatarDataBr(s.assinado_em) : ''))
          .setText(s.nome)
          .setBottomLabel(s.email)
          .setWrapText(true)
      );
    });
  }

  var pastaUrl = urlPastaProcessoDrive_(statusPedido.pasta_processo_drive_id);
  if (pastaUrl) {
    section.addWidget(
      CardService.newTextButton()
        .setText('Abrir pasta do processo no Drive')
        .setOpenLink(CardService.newOpenLink().setUrl(pastaUrl))
    );
  }
  section.addWidget(
    CardService.newTextButton()
      .setText('Atualizar status')
      .setOnClickAction(
        CardService.newAction()
          .setFunctionName('handleVerStatusPedido')
          .setParameters({ pedidoId: String(statusPedido.id) })
      )
  );
  builder.addSection(section);
  return builder.build();
}

/**
 * Tela de usuários: alta na plataforma via serviço (chave de admin).
 * A identidade (senha, 2FA, perfil, biometria) é concluída no site.
 * @param {Object} options
 * @return {Card}
 */
function buildUsuariosCard(options) {
  options = options || {};
  var builder = CardService.newCardBuilder().setHeader(
    CardService.newCardHeader()
      .setTitle('Usuários da plataforma')
      .setSubtitle('Alta pelo Workspace · identidade no site')
  );

  var section = CardService.newCardSection();
  if (options.mensagem) {
    section.addWidget(
      CardService.newTextParagraph().setText(
        (options.erro ? '<font color="#d93025">' : '<b>') +
          options.mensagem +
          (options.erro ? '</font>' : '</b>')
      )
    );
  }
  section.addWidget(
    CardService.newTextParagraph().setText(
      'O usuário recebe a senha temporária por e-mail e conclui senha, 2FA e perfil <b>no convite de assinatura do Workspace</b> (ou no site); biometria só quando a plataforma exige. Exige chave de integração de administrador.'
    )
  );
  section.addWidget(
    CardService.newTextInput()
      .setFieldName('novo_usuario_email')
      .setTitle('E-mail do usuário *')
      .setValue(options.email || '')
  );
  section.addWidget(
    CardService.newSelectionInput()
      .setFieldName('novo_usuario_role')
      .setTitle('Papel')
      .setType(CardService.SelectionInputType.DROPDOWN)
      .addItem('Gerente (cria pedidos)', '1', true)
      .addItem('Administrador', '0', false)
  );
  section.addWidget(
    CardService.newTextButton()
      .setText('Criar usuário')
      .setTextButtonStyle(CardService.TextButtonStyle.FILLED)
      .setOnClickAction(CardService.newAction().setFunctionName('handleCriarUsuario'))
  );
  section.addWidget(
    CardService.newTextButton()
      .setText('Abrir o site')
      .setOpenLink(CardService.newOpenLink().setUrl(getSiteUrl()))
  );

  builder.addSection(section);
  return builder.build();
}

/**
 * Pasta de origem do usuário. "root" é o Meu Drive (não uma pasta da SA).
 * @param {string} pastaId
 * @return {string}
 */
function urlPastaProcessoDrive_(pastaId) {
  if (!pastaId) return '';
  if (pastaId === 'root') return 'https://drive.google.com/drive/my-drive';
  return 'https://drive.google.com/drive/folders/' + pastaId;
}

/**
 * @param {string} title
 * @param {string} message
 * @return {Card}
 */
function buildMessageCard(title, message) {
  return CardService.newCardBuilder()
    .setHeader(CardService.newCardHeader().setTitle(title))
    .addSection(
      CardService.newCardSection().addWidget(
        CardService.newTextParagraph().setText(message)
      )
    )
    .build();
}

/**
 * @param {Object} item
 * @return {Card}
 */
function buildFileAccessCard(item) {
  return CardService.newCardBuilder()
    .setHeader(CardService.newCardHeader().setTitle('Autorizar acesso ao arquivo'))
    .addSection(
      CardService.newCardSection()
        .addWidget(
          CardService.newTextParagraph().setText(
            'Para preparar o pedido de assinatura, o add-on precisa de acesso ao PDF <b>' +
              item.title +
              '</b>.'
          )
        )
        .addWidget(
          CardService.newTextButton()
            .setText('Autorizar acesso')
            .setTextButtonStyle(CardService.TextButtonStyle.FILLED)
            .setOnClickAction(
              CardService.newAction()
                .setFunctionName('handleGrantFileAccess')
                .setParameters({ fileId: item.id })
            )
        )
    )
    .build();
}

/**
 * @param {Object} draft
 * @return {Card}
 */
function buildRequestCard(draft) {
  var builder = CardService.newCardBuilder().setHeader(
    CardService.newCardHeader()
      .setTitle('Pedido de assinatura')
      .setSubtitle(draft.fileName)
  );

  builder.addSection(
    CardService.newCardSection().addWidget(
      CardService.newDecoratedText()
        .setTopLabel('Documento aberto')
        .setText(draft.fileName)
        .setStartIcon(
          CardService.newIconImage().setIcon(CardService.Icon.DESCRIPTION)
        )
    )
  );

  var recipientsSection = CardService.newCardSection().setHeader(
    'Destinatários (' + draft.recipients.length + ')'
  );

  if (draft.recipients.length === 0) {
    recipientsSection.addWidget(
      CardService.newTextParagraph().setText(
        'Inclua-se como destinatário ou cadastre outras pessoas. Em seguida, abra o Web App para delimitar as assinaturas e enviar.'
      )
    );
  } else {
    draft.recipients.forEach(function (recipient, index) {
      var areaLabel = recipient.signatureArea
        ? 'Área: página ' + recipient.signatureArea.page
        : 'Área: será marcada no Web App';

      recipientsSection.addWidget(
        CardService.newDecoratedText()
          .setTopLabel(recipient.email)
          .setText(recipient.name)
          .setBottomLabel(areaLabel)
          .setWrapText(true)
          .setStartIcon(
            CardService.newIconImage().setIcon(CardService.Icon.PERSON)
          )
          .setOnClickAction(
            CardService.newAction()
              .setFunctionName('handleEditRecipient')
              .setParameters({ index: String(index) })
          )
      );
    });
  }

  recipientsSection.addWidget(
    CardService.newTextButton()
      .setText('Incluir-me como destinatário')
      .setTextButtonStyle(CardService.TextButtonStyle.FILLED)
      .setOnClickAction(
        CardService.newAction().setFunctionName('handleIncluirMeComoDestinatario')
      )
  );
  recipientsSection.addWidget(
    CardService.newTextButton()
      .setText('Adicionar outro destinatário')
      .setOnClickAction(
        CardService.newAction().setFunctionName('handleAddRecipient')
      )
  );
  builder.addSection(recipientsSection);

  // Termo de responsabilidade que o signatário aceita na cerimônia. Sem
  // escolha explícita o serviço usa o termo de documento ativo mais recente.
  var termoSection = CardService.newCardSection().setHeader('Termo de responsabilidade');
  var termos = null;
  try {
    termos = listTermosDocumento();
  } catch (err) {
    termos = null;
  }
  if (termos && termos.length > 0) {
    var termoInput = CardService.newSelectionInput()
      .setFieldName('termo_id')
      .setTitle('Termo exigido do signatário')
      .setType(CardService.SelectionInputType.DROPDOWN)
      .setOnChangeAction(
        CardService.newAction().setFunctionName('handleSelecionarTermo')
      );
    termoInput.addItem('Termo ativo padrão (automático)', '', !draft.termoId);
    termos.forEach(function (termo) {
      termoInput.addItem(
        termo.titulo_termo || 'Termo',
        String(termo.id),
        draft.termoId === termo.id
      );
    });
    termoSection.addWidget(termoInput);
  } else {
    termoSection.addWidget(
      CardService.newTextParagraph().setText(
        'Não foi possível listar os termos agora — o serviço usará o termo de documento ativo cadastrado no site.'
      )
    );
  }
  builder.addSection(termoSection);

  var sendSection = CardService.newCardSection().setHeader('Posicionar e enviar');
  sendSection.addWidget(
    CardService.newTextParagraph().setText(
      'O Web App abre somente para você (solicitante), com o PDF e as áreas de cada destinatário. Após o envio, a sessão fica indisponível.'
    )
  );
  sendSection.addWidget(
    CardService.newTextButton()
      .setText('Abrir Web App — posicionar e enviar')
      .setTextButtonStyle(CardService.TextButtonStyle.FILLED)
      .setOnClickAction(
        CardService.newAction().setFunctionName('handleOpenPlacementWebApp')
      )
  );
  sendSection.addWidget(
    CardService.newTextButton()
      .setText('Descartar pedido')
      .setOnClickAction(
        CardService.newAction().setFunctionName('handleDiscardDraft')
      )
  );
  builder.addSection(sendSection);

  return builder.build();
}

/**
 * Formulário: nome, e-mail, CPF e telefone (marcação no Web App).
 * @param {Object} options
 * @return {Card}
 */
function buildRecipientFormCard(options) {
  var index = options.index != null ? options.index : -1;
  var recipient = options.recipient || {};
  var isEdit = index >= 0;
  var souEu = options.souEu === true;
  var tituloForm = isEdit ? 'Editar destinatário' : souEu ? 'Me incluir como destinatário' : 'Novo destinatário';

  var builder = CardService.newCardBuilder().setHeader(
    CardService.newCardHeader()
      .setTitle(tituloForm)
      .setSubtitle('Nome, e-mail, CPF e telefone')
  );

  if (options.errors && options.errors.length > 0) {
    builder.addSection(
      CardService.newCardSection().addWidget(
        CardService.newTextParagraph().setText(
          '<font color="#d93025"><b>Corrija os erros abaixo:</b><br>• ' +
            options.errors.join('<br>• ') +
            '</font>'
        )
      )
    );
  }

  var formSection = CardService.newCardSection()
    .addWidget(
      CardService.newTextInput()
        .setFieldName('recipient_name')
        .setTitle('Nome *')
        .setValue(recipient.name || '')
    )
    .addWidget(
      CardService.newTextInput()
        .setFieldName('recipient_email')
        .setTitle('E-mail *')
        .setValue(recipient.email || '')
    )
    .addWidget(
      CardService.newTextInput()
        .setFieldName('recipient_cpf')
        .setTitle('CPF *')
        .setValue(recipient.cpf || '')
    )
    .addWidget(
      CardService.newTextInput()
        .setFieldName('recipient_phone')
        .setTitle('Telefone (DDD + número) *')
        .setValue(recipient.phone || '')
    );
  builder.addSection(formSection);

  var actionsSection = CardService.newCardSection().addWidget(
    CardService.newTextButton()
      .setText(isEdit ? 'Salvar alterações' : souEu ? 'Incluir-me' : 'Adicionar destinatário')
      .setTextButtonStyle(CardService.TextButtonStyle.FILLED)
      .setOnClickAction(
        CardService.newAction()
          .setFunctionName('handleSaveRecipient')
          .setParameters({
            index: String(index),
            souEu: souEu ? '1' : ''
          })
      )
  );

  if (isEdit) {
    actionsSection.addWidget(
      CardService.newTextButton()
        .setText('Remover destinatário')
        .setOnClickAction(
          CardService.newAction()
            .setFunctionName('handleRemoveRecipient')
            .setParameters({ index: String(index) })
        )
    );
  }
  builder.addSection(actionsSection);

  return builder.build();
}
