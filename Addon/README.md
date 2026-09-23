# Add-on Google Workspace — Assinatura Digital

Add-on do Google Drive em que **pedido e assinatura acontecem sem sair do Workspace**:

- Cada pessoa vincula a **própria** chave de integração (`lsak_...`, gerada por um gerente/admin no site) pelo card **Vincular chave**. Sem chave vinculada, o Addon não pede nem assina.
- O **solicitante** (chave escopo `addon_solicitante`, sempre gerente/admin) monta o pedido no card (PDF aberto + destinatários + termo), posiciona as áreas no **Web App de posicionamento** e envia. Não precisa ser signatário do documento.
- O **signatário** (chave escopo `addon_signatario`) recebe o convite por e-mail (link da plataforma) e conclui a cerimônia no **Web App** pelo card do Addon (`/exec`): cola a própria `lsak_`, depois OTP de assinatura, reconhecimento facial e assinatura PAdES. Onboarding (senha, perfil, TOTP, biometria de perfil, termos) fica no site, antes da chave existir.
- O site (`URLSITE`) continua como referência para gerar/solicitar chave e para completar onboarding.

O Apps Script fala **somente** com o `addon-service` (BFF). A API da plataforma nunca é chamada daqui, e a `lsak_` de cada pessoa só passa pelo card de vínculo e pelo Web App da cerimônia — nunca fica em Script Properties.

## Fluxo

### Vínculo da chave (toda conta Google)

1. No site (`/integracao`): gerente/admin gera a própria chave (escopo solicitante) ou a de um usuário (escopo signatário); usuário comum só solicita.
2. No Workspace: a homepage do Addon mostra o card **Vincular chave** enquanto não houver `lsic_` nas `UserProperties` desta conta. Cola a `lsak_` recebida.
3. O serviço confere a chave na API (`GET /integracao/me`), grava a `lsic_` correspondente e o escopo. Vincular de novo nesta conta invalida o vínculo anterior.

### Solicitante (card do Drive) — só escopo `addon_solicitante`

1. Abrir um **PDF** no Drive.
2. Cadastrar destinatários: nome, e-mail, CPF e telefone.
3. Escolher o **termo de responsabilidade** (ou deixar o ativo padrão).
4. **Abrir Web App — posicionar e enviar**: sessão de posicionamento com token único, exclusiva do solicitante. Após o envio, a sessão fica indisponível.
5. Se houver **um único destinatário e for você**, o overlay segue direto para a cerimônia (`?modo=assinar`). Com vários destinatários, o overlay fecha e o card recarrega.
6. Acompanhar em **Meus pedidos** → **Atualizar status**. Quando todos assinam, o serviço grava `contrato-assinado.pdf` na pasta do processo (usa o token Google desta chamada).

### Signatário (Web App da cerimônia)

1. Entrada pelo **card** "Documentos para assinar" ou pelo link `/exec` (`?modo=assinar&documento_id=…&convite=HMAC`). O e-mail de convite aponta para o site (`URLSITE/assinar/:id`), não para o Apps Script. Sem convite HMAC, sem cerimônia no Workspace.
2. Cola a própria `lsak_` (conferida contra o e-mail do convite via `/integracao/me`) — sem login/senha.
3. Se faltar onboarding (senha, perfil, 2FA, foto de referência), o Web App manda completar no site e depois voltar ao link.
4. Cerimônia: OTP → reconhecimento facial (captura abre sozinha) → PDF no overlay → Confirmar assinatura. Ao concluir, o overlay fecha; o PDF assinado fica na pasta do Drive.

A `lsak_` fica só em `sessionStorage` da aba durante a cerimônia — nunca em Script Properties, nunca em log.

## Estrutura

| Arquivo | Responsabilidade |
| --- | --- |
| `appsscript.json` | Manifesto (Drive + Web App `ANYONE` / `USER_ACCESSING`) |
| `Config.gs` | Script Properties (`SERVICE_BASE_URL`, `URLSITE`, `WEBAPP_URL`) + `lsic_` desta conta nas `UserProperties` |
| `Main.gs` | Gatilhos do Drive / homepage — gate de chave vinculada e de escopo |
| `Cards.gs` / `Actions.gs` | UI e ações do add-on (vínculo de chave, pedido, termo, pendências, status) |
| `Draft.gs` | Rascunho do pedido (destinatários, termo, áreas) |
| `PlacementSession.gs` | Token/sessão do Web App de posicionamento |
| `Placement.gs` / `Placementweb.html` | `doGet` (dispatcher `?modo=`) + editor visual do solicitante |
| `Assinar.gs` / `Assinarweb.html` | Web App da cerimônia do signatário (cola a `lsak_`) |
| `DriveFolders.gs` | Pasta raiz + pasta por processo — fora do fluxo de pedido (o serviço grava na pasta de origem do arquivo) |
| `ApiClient.gs` | Chamadas ao addon-service (`x-instalacao-key`) + vínculo self-service (`vincularChaveDeIntegracao`) |

## Script Properties

```
SERVICE_BASE_URL = https://<seu-dominio>/addon
URLSITE          = https://<site>  (fallback/identidade)
WEBAPP_URL       = https://script.google.com/macros/s/<deployment>/exec
```

`WEBAPP_URL` precisa ser a URL `/exec` da implantação atual e **tem que ser a mesma** configurada no env `WEBAPP_URL` do addon-service (card e Web App da cerimônia). O e-mail de convite aponta para o site, não para essa `/exec`. A `lsic_` **não** entra aqui — cada conta Google vincula a própria pelo card "Vincular chave" (fica em `UserProperties`, isolada por usuário).

## Pastas no Drive

O serviço não cria mais pasta de processo nem copia o PDF: grava na mesma pasta de onde o usuário escolheu o arquivo. Se o arquivo estiver na raiz do Meu Drive (sem pasta pai), busca/cria uma pasta com o nome do documento. O `pasta_raiz_drive` da instalação não participa mais do fluxo de pedido:

```
<pasta do arquivo escolhido>/
  ├── contrato.pdf                (o original, intocado)
  └── contrato-assinado.pdf       (após a conclusão)
```

## Publicar

```bash
cd Addon
clasp push        # .clasp.json só tem o scriptId
```

1. Preencher os placeholders do `appsscript.json` (`urlFetchWhitelist` e `openLinkUrlPrefixes` com o domínio real do proxy e do site).
2. **Implantar → Nova implantação → Aplicativo da Web**
   - Executar como: **Usuário que acessa** (`USER_ACCESSING`)
   - Quem tem acesso: **Qualquer pessoa** (o signatário externo precisa abrir a cerimônia)
3. Copiar a URL `/exec` para `WEBAPP_URL` (Script Properties **e** env do addon-service).
4. **Implantar → Testar implantações → Instalar** o add-on no Drive.
5. Associar o Apps Script a um projeto GCP e configurar a tela OAuth.

A cada mudança em `doGet`/HTML, `clasp push` + **nova versão da implantação** (a URL `/exec` de uma implantação fixa se mantém).

## Escopos

- `drive.file` — PDF + pastas do processo
- `drive.addons.metadata.readonly` — item em contexto
- `script.external_request` — chamadas ao addon-service
- `script.scriptapp` — token OAuth / URL do Web App
- `userinfo.email` — solicitante / validação da sessão de posicionamento

## Segurança

- `lsak_` nunca entra em Script Properties nem em log; a `lsic_` de cada conta fica só nas `UserProperties` dela.
- O HTML da cerimônia recebe apenas a URL do serviço, a URL do site e os parâmetros do convite (HMAC) — a `lsak_` colada pelo signatário fica só em `sessionStorage` da aba.
- O convite é um HMAC de `documento_id + pedido_id + e-mail` — o Web App não aceita `documento_id` solto.
- Emitir uma `lsak_` nova para a mesma pessoa invalida todas as anteriores dela; vincular uma `lsak_` nova nesta conta Google invalida o vínculo anterior desta conta.
