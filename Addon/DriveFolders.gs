/**
 * Pastas do Drive usadas no processo de assinatura.
 *
 * NÃO faz mais parte do envio: o addon-service (conta de serviço com
 * domain-wide delegation) grava os artefatos na própria pasta de onde o
 * usuário escolheu o arquivo — não cria pasta de processo nem copia o PDF.
 * createProcessFolder ficou sem uso em submitSignatureRequest; mantido aqui
 * só como referência/rollback.
 */

var ROOT_FOLDER_NAME = 'Net Sign';
var ROOT_FOLDER_PROP = 'SIGNATURE_ROOT_FOLDER_ID';
var ROOT_FOLDER_CONFIG_PROP = 'SIGNATURE_ROOT_FOLDER_CONFIG';

/**
 * Localiza a pasta raiz ou cria se ainda não existir.
 * O ID fica salvo em UserProperties para reutilização — invalidado quando o
 * admin troca a pasta_raiz_drive da instalação.
 *
 * @return {GoogleAppsScript.Drive.Folder}
 */
function findOrCreateRootFolder() {
  var props = PropertiesService.getUserProperties();

  var configurada = '';
  try {
    configurada = String(getInstalacaoInfo().pasta_raiz_drive || '').trim();
  } catch (err) {
    configurada = '';
  }

  // Config mudou no admin: o cache de ID aponta para a pasta antiga.
  if (props.getProperty(ROOT_FOLDER_CONFIG_PROP) !== configurada) {
    props.deleteProperty(ROOT_FOLDER_PROP);
    props.setProperty(ROOT_FOLDER_CONFIG_PROP, configurada);
  }

  var existingId = props.getProperty(ROOT_FOLDER_PROP);
  if (existingId) {
    try {
      return DriveApp.getFolderById(existingId);
    } catch (err) {
      props.deleteProperty(ROOT_FOLDER_PROP);
    }
  }

  var folder = null;
  if (configurada) {
    // Primeiro como ID exato de pasta; senão trata o valor como nome.
    try {
      folder = DriveApp.getFolderById(configurada);
    } catch (err) {
      folder = null;
    }
    if (!folder) {
      var iterator = DriveApp.getFoldersByName(configurada);
      folder = iterator.hasNext() ? iterator.next() : DriveApp.createFolder(configurada);
    }
  } else {
    folder = DriveApp.createFolder(ROOT_FOLDER_NAME);
  }

  props.setProperty(ROOT_FOLDER_PROP, folder.getId());
  return folder;
}

/**
 * Cria a pasta independente do processo de assinatura, copia o PDF
 * para ela e grava um arquivo de metadados do pedido.
 *
 * @param {Object} draft Rascunho do pedido.
 * @return {{folderId:string, folderName:string, folderUrl:string, documentFileId:string}}
 */
function createProcessFolder(draft) {
  var root = findOrCreateRootFolder();
  var stamp = Utilities.formatDate(
    new Date(),
    Session.getScriptTimeZone(),
    'yyyy-MM-dd HH:mm'
  );
  var baseName = String(draft.fileName || 'documento').replace(/\.pdf$/i, '');
  var folderName = baseName + ' — ' + stamp;
  var processFolder = root.createFolder(folderName);

  var original = DriveApp.getFileById(draft.fileId);
  var copy = original.makeCopy(draft.fileName, processFolder);

  // Rastreio do pedido fica no MySQL do addon-service. Não gravar JSON no Drive.

  return {
    folderId: processFolder.getId(),
    folderName: folderName,
    folderUrl: processFolder.getUrl(),
    documentFileId: copy.getId()
  };
}
