/**
 * Cliente do addon-service.
 *
 * O add-on envia apenas fileIds. O Drive é falado pelo próprio serviço, com
 * uma conta de serviço (domain-wide delegation) impersonando o e-mail da
 * instalação — sem ScriptApp.getOAuthToken() e sem base64 saindo daqui.
 */

/**
 * Chamada HTTP genérica ao serviço.
 * @param {string} method
 * @param {string} path
 * @param {Object|null} payload
 * @return {Object} corpo JSON da resposta
 */
function serviceRequest_(method, path, payload) {
  var options = {
    method: method,
    contentType: 'application/json',
    headers: { 'x-instalacao-key': getInstalacaoKey() },
    muteHttpExceptions: true
  };
  if (payload) {
    options.payload = JSON.stringify(payload);
  }

  var response = UrlFetchApp.fetch(getServiceBaseUrl() + path, options);
  var body;
  try {
    body = JSON.parse(response.getContentText());
  } catch (err) {
    throw new Error('Resposta inválida do serviço (HTTP ' + response.getResponseCode() + ').');
  }

  if (response.getResponseCode() >= 300 || body.status === false) {
    throw new Error(body.msg || 'O serviço retornou o código ' + response.getResponseCode());
  }
  return body;
}

/**
 * Vincula a lsak_ desta pessoa (emitida pelo gerente na plataforma) à conta
 * Google atual. Rota pública do serviço — ainda não existe instalação, então
 * não passa por serviceRequest_ (que exige a lsic_ que está sendo criada
 * agora). Manda se esta conta já tem lsic_ local (tem_credencial) pra o
 * serviço decidir entre criar a instalação, atualizar a lsak_ na mesma linha
 * (sem trocar a lsic_) ou — só se a UserProperties tiver sido perdida —
 * regenerar a credencial. A lsic_ só é regravada quando o serviço devolve uma
 * nova; re-vincular pra atualizar a lsak_ não troca a credencial já guardada.
 * @param {string} chaveApi lsak_... colado pelo usuário
 * @return {Object} { credencial, atualizado, escopo, chave_admin }
 */
function vincularChaveDeIntegracao(chaveApi) {
  var emailGoogle = Session.getActiveUser().getEmail();
  if (!emailGoogle) {
    throw new Error('Não foi possível identificar sua conta Google. Recarregue o add-on e tente novamente.');
  }
  var options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify({ chave_api: chaveApi, email_google: emailGoogle, tem_credencial: hasInstalacaoKey() }),
    muteHttpExceptions: true
  };
  var response = UrlFetchApp.fetch(getServiceBaseUrl() + '/instalacoes/vincular', options);
  var body;
  try {
    body = JSON.parse(response.getContentText());
  } catch (err) {
    throw new Error('Resposta inválida do serviço (HTTP ' + response.getResponseCode() + ').');
  }
  if (response.getResponseCode() >= 300 || body.status === false) {
    throw new Error(body.msg || 'Não foi possível vincular a chave.');
  }
  var data = body.data || {};
  if (data.credencial) {
    setInstalacaoKey(data.credencial);
  } else if (!data.atualizado || !hasInstalacaoKey()) {
    throw new Error('O serviço não devolveu a credencial de instalação.');
  }
  return data;
}

/**
 * Termos de responsabilidade ativos (tipo documento) para o dropdown do card.
 * Cache curto: evita um UrlFetch a cada render do card do pedido.
 * @return {Array<{id:string, titulo_termo:string}>}
 */
function listTermosDocumento() {
  var cache = CacheService.getUserCache();
  var cached = cache.get('TERMOS_DOCUMENTO');
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch (err) {
      cache.remove('TERMOS_DOCUMENTO');
    }
  }
  var body = serviceRequest_('get', '/termos', null);
  var termos = body.data || [];
  cache.put('TERMOS_DOCUMENTO', JSON.stringify(termos), 300);
  return termos;
}

/**
 * Configuração da própria instalação (pasta raiz do Drive, chave admin).
 * @return {Object} { nome, email_usuario, chave_admin, pasta_raiz_drive }
 */
function getInstalacaoInfo() {
  var cache = CacheService.getUserCache();
  var cached = cache.get('INSTALACAO_INFO');
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch (err) {
      cache.remove('INSTALACAO_INFO');
    }
  }
  var body = serviceRequest_('get', '/instalacao', null);
  var info = body.data || {};
  cache.put('INSTALACAO_INFO', JSON.stringify(info), 300);
  return info;
}

/**
 * Perfil do dono da lsak_ (nome, CPF, telefone) via GET /instalacao/eu.
 * @return {Object} { email, nome, cpf, telefone }
 */
function getMeuCadastro() {
  var cache = CacheService.getUserCache();
  var cached = cache.get('MEU_CADASTRO');
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch (err) {
      cache.remove('MEU_CADASTRO');
    }
  }
  var body = serviceRequest_('get', '/instalacao/eu', null);
  var cadastro = body.data || {};
  cache.put('MEU_CADASTRO', JSON.stringify(cadastro), 300);
  return cadastro;
}

/**
 * Escopo addon_solicitante é quem pode pedir assinatura pelo Workspace
 * (gerente/admin). addon_signatario só assina pelo link do convite.
 * @return {boolean}
 */
function podeSolicitarPedido() {
  try {
    var info = getInstalacaoInfo();
    return info.escopo === 'addon_solicitante';
  } catch (err) {
    return false;
  }
}

/**
 * Monta o payload do pedido no contrato do addon-service. O serviço cria a
 * pasta do processo e copia o PDF sozinho (conta de serviço) — o add-on só
 * manda o arquivo de origem.
 * @param {Object} draft Rascunho do pedido.
 * @return {Object}
 */
function buildSignatureRequestPayload(draft) {
  return {
    titulo: String(draft.fileName || 'Documento').replace(/\.pdf$/i, ''),
    termo_id: draft.termoId || null,
    arquivo_origem_id: draft.fileId,
    signatarios: draft.recipients.map(function (recipient) {
      return {
        nome: recipient.name,
        email: recipient.email,
        cpf: recipient.cpf,
        telefone: recipient.phone,
        campos_extras: []
      };
    }),
    areas: draft.recipients.map(function (recipient) {
      var area = recipient.signatureArea;
      return {
        email: recipient.email,
        pagina: area.page,
        x: area.x,
        y: area.y,
        largura: area.width,
        altura: area.height,
        pagina_largura: area.pageWidthPt,
        pagina_altura: area.pageHeightPt
      };
    })
  };
}

/**
 * Envia o pedido ao serviço — pasta do processo e cópia no Drive são feitas
 * pela conta de serviço, do lado do addon-service.
 * @param {Object} draft Rascunho do pedido.
 * @return {Object} { requestId, fileName, recipientCount, folderId, folderName, message }
 */
function submitSignatureRequest(draft) {
  var payload = buildSignatureRequestPayload(draft);

  var body = serviceRequest_('post', '/pedidos', payload);
  var data = body.data || {};

  return {
    requestId: data.id,
    fileName: draft.fileName,
    recipientCount: payload.signatarios.length,
    folderId: data.pasta_processo_drive_id,
    folderName: data.pasta_processo_nome,
    message: body.msg
  };
}

/**
 * Lista os pedidos desta instalação.
 * @return {Array}
 */
function listSignatureRequests() {
  var body = serviceRequest_('get', '/pedidos?limit=10&offset=0', null);
  return body.data || [];
}

/**
 * Consulta o status de um pedido. O serviço grava o contrato-assinado.pdf na
 * pasta do processo com a conta de serviço — sem token do Apps Script aqui.
 * @param {string} pedidoId
 * @return {Object}
 */
function getSignatureRequestStatus(pedidoId) {
  var body = serviceRequest_('post', '/pedidos/' + pedidoId + '/status', null);
  return body.data || {};
}

/**
 * Documentos em que o e-mail desta instalação é signatário (recebeu convite),
 * pendentes de assinatura — inclui o gerente que se incluiu como destinatário.
 * @return {Array}
 */
function listarPendenciasAssinatura() {
  var body = serviceRequest_('get', '/assinatura/pendencias', null);
  return body.data || [];
}

/**
 * Link da cerimônia para uma pendência. Usa o link já montado pelo serviço
 * (com a WEBAPP_URL do addon-service) ou monta com a WEBAPP_URL desta
 * implantação do Script quando o serviço não a tem configurada.
 * @param {Object} pendencia
 * @return {string|null}
 */
function montarLinkAssinaturaPendencia(pendencia) {
  pendencia = pendencia || {};
  var convite = pendencia.convite;
  if (
    convite &&
    convite.documento_id &&
    convite.pedido_id &&
    convite.email &&
    convite.convite
  ) {
    try {
      return (
        getWebAppUrl() +
        '?modo=assinar' +
        '&documento_id=' +
        encodeURIComponent(convite.documento_id) +
        '&pedido_id=' +
        encodeURIComponent(convite.pedido_id) +
        '&email=' +
        encodeURIComponent(convite.email) +
        '&convite=' +
        encodeURIComponent(convite.convite)
      );
    } catch (err) {
      // WEBAPP_URL desta implantação ausente: cai no link do serviço.
    }
  }
  if (pendencia.link) return pendencia.link;
  return null;
}

/**
 * Cria um usuário na plataforma (exige chave de integração de admin).
 * A identidade (senha, 2FA, perfil, biometria) é concluída no site.
 * @param {string} email
 * @param {number} role 0 = admin, 1 = gerente
 * @return {Object}
 */
function createPlatformUser(email, role) {
  return serviceRequest_('post', '/usuarios', { email: email, role: role });
}
