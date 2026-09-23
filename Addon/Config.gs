/**
 * Configuração do add-on.
 *
 * O add-on fala somente com o addon-service (nunca com a API da plataforma
 * diretamente), e nunca direto na porta 7810 — o addon-service não tem porta
 * publicada no host, só é alcançável pelo proxy em /addon. Um único túnel no
 * proxy (7749) resolve /addon. O site é público na própria porta dele (3395),
 * sem passar pelo proxy. Configure em Configurações do projeto → Propriedades
 * do script:
 *
 *   SERVICE_BASE_URL  → URL do túnel do proxy + /addon (ex.: https://seu-tunel/addon)
 *   URLSITE           → URL pública do site (identidade, /assinar — fallback da cerimônia)
 *   WEBAPP_URL        → URL do Web App implantado (/exec) — placement e cerimônia
 *
 * A credencial de instalação (lsic_) não é mais compartilhada nas propriedades
 * do script — cada conta Google vincula a própria lsak_ (gerada pelo gerente na
 * plataforma) pelo card "Vincular chave", e ela fica guardada nas
 * UserProperties, isolada por usuário.
 *
 * Lembre de incluir o domínio do proxy (SERVICE_BASE_URL) e do site (URLSITE)
 * no urlFetchWhitelist / openLinkUrlPrefixes do appsscript.json. A cada nova
 * implantação do Web App, atualize WEBAPP_URL aqui e no addon-service (env
 * WEBAPP_URL).
 */

var INSTALACAO_KEY_PROP = 'INSTALACAO_KEY';

function getServiceBaseUrl() {
  var url = PropertiesService.getScriptProperties().getProperty('SERVICE_BASE_URL');
  if (!url) {
    throw new Error(
      'SERVICE_BASE_URL não configurada. Defina a propriedade do script com a URL do addon-service.'
    );
  }
  return url.replace(/\/$/, '');
}

/**
 * lsic_ desta conta Google, vinculada pelo card "Vincular chave" (por sua vez
 * emitida a partir da lsak_ que o gerente gerou para este usuário).
 * @return {string}
 */
function getInstalacaoKey() {
  var key = PropertiesService.getUserProperties().getProperty(INSTALACAO_KEY_PROP);
  if (!key) {
    throw new Error(
      'Nenhuma chave vinculada nesta conta. Cole a chave de integração (lsak_) que o gerente gerou para você.'
    );
  }
  return key;
}

/**
 * @return {boolean}
 */
function hasInstalacaoKey() {
  return !!PropertiesService.getUserProperties().getProperty(INSTALACAO_KEY_PROP);
}

/**
 * @param {string} key credencial lsic_ devolvida por /instalacoes/vincular
 */
function setInstalacaoKey(key) {
  PropertiesService.getUserProperties().setProperty(INSTALACAO_KEY_PROP, key);
  CacheService.getUserCache().remove('INSTALACAO_INFO');
  CacheService.getUserCache().remove('MEU_CADASTRO');
}

function clearInstalacaoKey() {
  PropertiesService.getUserProperties().deleteProperty(INSTALACAO_KEY_PROP);
  CacheService.getUserCache().remove('INSTALACAO_INFO');
  CacheService.getUserCache().remove('MEU_CADASTRO');
}

function getSiteUrl() {
  var url = PropertiesService.getScriptProperties().getProperty('URLSITE');
  if (!url) {
    return 'http://localhost:3395';
  }
  return url.replace(/\/$/, '');
}

function getWebAppUrl() {
  var url = PropertiesService.getScriptProperties().getProperty('WEBAPP_URL');
  if (url) {
    return url.replace(/\/$/, '');
  }
  // Sem a propriedade, tenta a URL da implantação atual (head deployment).
  try {
    url = ScriptApp.getService().getUrl();
  } catch (err) {
    url = null;
  }
  if (!url) {
    throw new Error(
      'WEBAPP_URL não configurada. Implante o Aplicativo da Web e cole a URL /exec nas propriedades do script.'
    );
  }
  return url;
}

/**
 * Formata data no padrão brasileiro (o serviço já devolve pronto assim; isto
 * é defensivo). Se o valor já vier formatado (ou não for uma data), o parse
 * falha e o valor original é devolvido sem alteração.
 * @param {string} valor
 * @return {string}
 */
function formatarDataBr(valor) {
  if (!valor) return '';
  var d = new Date(String(valor).replace(' ', 'T'));
  if (isNaN(d.getTime())) return String(valor);
  return Utilities.formatDate(d, Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm');
}
