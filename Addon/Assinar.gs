/**
 * Web App — cerimônia de assinatura do signatário.
 *
 * O signatário chega aqui pelo link do convite (e-mail ou card "Documentos
 * para assinar"): documento_id, pedido_id, email e convite (HMAC) na query
 * string. A lsak_ só é colada uma vez, no card "Vincular chave"; esta
 * cerimônia usa direto a lsic_ já vinculada nesta conta Google e confirma
 * o convite com ela. Sem lsic_ vinculada (ou convite de outra pessoa), o
 * Web App pede pra vincular no card — não tem mais tela de colar a lsak_
 * aqui. Onboarding (senha, 2FA, perfil, foto de referência) fica no site,
 * antes da chave ser emitida.
 *
 * O template só recebe a URL do serviço, a URL do site (fallback), a lsic_
 * (se houver) e os parâmetros do convite — a lsak_ nunca passa pelo servidor
 * do Apps Script.
 */

/**
 * @param {Object} e
 * @return {HtmlOutput}
 */
function doGetAssinar(e) {
  var params = (e && e.parameter) || {};

  var serviceBaseUrl;
  try {
    serviceBaseUrl = getServiceBaseUrl();
  } catch (err) {
    return buildUnavailableHtml(
      'O serviço de assinatura não está configurado. Contate o administrador do add-on.'
    );
  }

  var instalacaoKey = null;
  try {
    if (hasInstalacaoKey()) instalacaoKey = getInstalacaoKey();
  } catch (err) {
    instalacaoKey = null;
  }

  var template = HtmlService.createTemplateFromFile('Assinarweb');
  template.serviceBaseUrl = serviceBaseUrl;
  template.siteUrl = getSiteUrl();
  template.instalacaoKey = instalacaoKey;
  template.convite = {
    documento_id: params.documento_id || '',
    pedido_id: params.pedido_id || '',
    email: params.email || '',
    convite: params.convite || ''
  };

  return template
    .evaluate()
    .setTitle('Assinatura Digital — Cerimônia')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
