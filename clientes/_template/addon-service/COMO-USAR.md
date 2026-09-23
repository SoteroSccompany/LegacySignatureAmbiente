# addon-service — como usar e como testar

Serviço de integração do Addon Google Workspace com a API LegacySignature. Ele **não** assina documentos por conta própria: para pedir, cadastra signatários e devolve o assinado para a pasta do Drive; para assinar, é um proxy sem estado que repassa cada chamada da cerimônia (`/assinatura/*`) para a API usando a `lsak_` do signatário. O site (`URLSITE`) segue como fallback e é onde o onboarding (senha, 2FA, perfil, foto de referência) acontece antes de qualquer chave existir.

O Google **não alcança** `localhost`. Para testar o Addon de verdade, exponha o proxy com uma **URL provisória** (túnel). Sem isso, só dá para bater nas rotas com `curl` na máquina.

---

## Duas chaves (não misture)

| Prefixo | Onde nasce | Quem usa | Header |
|---|---|---|---|
| `lsak_…` | Tela **Integração** do site (`/integracao`). Só gerente/admin **gera** — dele mesmo (escopo `addon_solicitante`) ou de um usuário (escopo `addon_signatario`). Usuário comum só **solicita** | O **serviço** fala com a API em nome dessa pessoa | `x-integracao-key` |
| `lsic_…` | `POST /instalacoes/vincular` (self-service, cada conta Google vincula a própria) | O **Apps Script** fala com o addon-service | `x-instalacao-key` |

Uma `lsak_` ativa por pessoa: emitir de novo invalida todas as anteriores dela. O escopo decide o que ela pode fazer no Workspace:

- `addon_solicitante` (gerente/admin): pede assinatura de qualquer documento pelo Drive — não precisa ser signatário dele.
- `addon_signatario` (usuário comum, ou o próprio gerente se ele também assinar): só a cerimônia (`/assinatura/*`), pelo link do convite.

A `lsic_` aparece **uma vez** na resposta de `/instalacoes/vincular` e fica guardada nas `UserProperties` daquela conta Google (isolada por usuário, não compartilhada no Script Properties). Depois disso só existe o hash no banco.

---

## Subir o serviço

No compose o container é `addonservice`, porta **7810** — sem porta publicada no host (só existe na rede Docker). O único jeito de chegar nele é pelo proxy:

```
http://localhost:<PROXY_PORT>/addon  →  addonservice:7810
```

Variáveis (compose + `addon-service/.env`):

- `LEGACY_API_URL` — API interna (`http://apisignature:9366`)
- `LEGACY_APIKEY` / `KEY_API` — no compose o `KEY_API` vem do `proxy/.env` (o JWT que o proxy manda no `apikey`). Fora do compose, o mesmo JWT no `addon-service/.env`. **Não** use o `API_KEY` da raiz: a API recusa esse token. Pode ir com ou sem `Bearer`
- `ADMIN_TOKEN` — token do operador (`ADDON_ADMIN_TOKEN` na raiz; default: `dev-admin-token`)
- `SHA` — cifra a `lsak_` em `tab_instalacao` e gera o hash da `lsic_` (`ADDON_SHA` na raiz; default de compose)
- `URLSITE` — site (onboarding, `/assinar` como fallback). Default do compose: `http://localhost:<FRONT_END_PORT>`. Se o Google precisar abrir o onboarding, use `ADDON_URLSITE` na raiz com a URL pública do site
- `WEBAPP_URL` — URL `/exec` do Web App. **Só no `addon-service/.env`** (o compose não injeta essa chave: se injetasse vazia, apagaria o valor do arquivo). Entra no card do Addon e na cerimônia do Workspace; o e-mail de convite aponta sempre para o site (`URLSITE` / `/assinar`)
- `DB_DATABASE=addonservice` — banco próprio; o boot cria o database e `RUN_MIGRATIONS=true` aplica as tabelas

Depois de gravar `WEBAPP_URL` no `addon-service/.env`, recrie o container (`docker compose up -d addonservice`) — o nodemon não relê `.env` sozinho.

Healthcheck (pelo proxy):

```bash
curl -s http://localhost:<PROXY_PORT>/addon/healthcheck
# { "status": true, "msg": "addon-service ok" }
```

Painel estático do admin (suporte/operação — não é o fluxo normal de vínculo):

```
http://localhost:<PROXY_PORT>/addon/admin/painel/
```

Entre com o `ADMIN_TOKEN`. O fluxo normal, porém, é **self-service**: cada pessoa cola a própria `lsak_` no card "Vincular chave" do Addon (ou em `POST /instalacoes/vincular`), sem passar por este painel.

---

## Conta de serviço (DWD) + OAuth do usuário

O Drive do solicitante nunca fala com o token do Apps Script (`ScriptApp.getOAuthToken()`) — expira rápido e o `POST /pedidos` só chegaria depois do `DriveApp.makeCopy`, sem log nem no serviço nem na API. Em vez disso o serviço tem uma **conta de serviço** com **delegação em todo o domínio** (DWD) que impersona `email_usuario` da instalação. DWD sozinho não libera: o Google só abre o Drive daquela conta depois que ela mesma **consente** pelo `/oauth/start` — sem isso o vínculo (`POST /instalacoes/vincular`) e o pedido (`POST /pedidos`) são recusados.

### 1. No GCP (mesmo projeto com a Drive API ligada)

1. **Conta de serviço** (IAM → Contas de serviço) + chave JSON → `GOOGLE_SA_CLIENT_EMAIL` / `GOOGLE_SA_PRIVATE_KEY` no `addon-service/.env` (dotenv lê só esse arquivo, não o `.env.txt`). Anote também o `client_id` numérico (vai no Admin do Workspace, não no `.env`). No JSON atual do projeto (`assinaturaaddon-82554413b323.json`) esse id é `115652571933977312777` (`addon-307@assinaturaaddon.iam.gserviceaccount.com`).
2. **Cliente OAuth tipo "Aplicativo da Web"** (Credenciais → Criar credenciais → ID do cliente OAuth) — é outro ID, não a SA. URIs de redirecionamento autorizadas, exatas (sem barra no fim):

   | Ambiente | URI |
   |---|---|
   | Túnel do proxy | `https://<host-do-tunel>/addon/oauth/callback` |
   | Local (mesmo proxy) | `http://localhost:<PROXY_PORT>/addon/oauth/callback` |

   `GOOGLE_OAUTH_CLIENT_ID` / `GOOGLE_OAUTH_CLIENT_SECRET` / `GOOGLE_OAUTH_REDIRECT_URI` no `.env` — a URI tem que ser **byte a byte** a mesma cadastrada aqui. O Apps Script não é o callback: `http://localhost:<FRONT_END_PORT>` (site) **não** entra nessa lista.

### 2. No Admin do Google Workspace (domínio)

Segurança → Controles de API → Delegação em todo o domínio → adicionar o `client_id` **numérico** da conta de serviço (neste projeto: `115652571933977312777`) com o escopo:

```
https://www.googleapis.com/auth/drive
```

Não use o `….apps.googleusercontent.com` do cliente OAuth web — esse é outro ID, só do consentimento (`/oauth/start`). `drive` (não `drive.file`): a origem é um PDF que o usuário já tinha antes deste OAuth client — `drive.file` não alcançaria.

### 3. Fluxo de consentimento (uma vez por conta Google)

1. Card do Addon → **Autorizar Drive** → `GET /oauth/start?email=` → redireciona pro consentimento do Google (`access_type=offline`, `prompt=consent`).
2. Usuário aprova → Google chama `GET /oauth/callback?code=&state=` (no proxy) → o serviço troca o código por tokens, confirma que o e-mail autorizado é o mesmo que abriu o fluxo e grava o refresh cifrado em `tab_oauth_drive`.
3. Só então `POST /instalacoes/vincular` e `POST /pedidos` aceitam aquele `email_usuario`.

Sem `GOOGLE_SA_*` no `.env`, `/pedidos` volta erro de configuração (não um 403 do Drive). Sem OAuth concluído para o e-mail, vínculo e pedido são recusados com mensagem clara.

---

## Rotas

Prefixo via proxy: `/addon`. Não há caminho direto na 7810 — a porta não é publicada no host, só o proxy alcança o container pela rede Docker.

### Consentimento do Drive (público) — sem header

| Método | Path | Query |
|---|---|---|
| `GET` | `/oauth/start` | `?email=` — redireciona pro consentimento do Google |
| `GET` | `/oauth/callback` | `?code=&state=` — o próprio Google chega aqui; devolve página HTML curta |

Passo obrigatório **antes** do vínculo (e antes de qualquer pedido): a conta de serviço só impersona o Drive de quem já passou por aqui. Ver a seção **Conta de serviço (DWD) + OAuth do usuário** abaixo para as URIs de callback no GCP.

### Admin do serviço — header `x-admin-token`

| Método | Path | Body |
|---|---|---|
| `POST` | `/admin/instalacoes` | `{ nome, chave_api, email_usuario?, pasta_raiz_drive? }` |
| `GET` | `/admin/instalacoes` | — |
| `DELETE` | `/admin/instalacoes/:id` | — |

### Vínculo self-service (público) — sem header

| Método | Path | Body |
|---|---|---|
| `POST` | `/instalacoes/vincular` | `{ chave_api, email_google }` |

`chave_api` (`lsak_...`) tem que ser a chave viva desta pessoa. O serviço confere na API (`GET /api/admin/integracao/me`) o e-mail e o escopo reais da chave; `email_google` tem que ser o mesmo e-mail. **Exige `/oauth/start` concluído antes** para esse `email_google` — sem consentimento do Drive o vínculo é recusado. Vincular de novo para o mesmo `email_google` invalida a instalação anterior. A resposta devolve a `credencial` (`lsic_...`), o `escopo` (`addon_solicitante`/`addon_signatario`) e se é `chave_admin` — só nesta chamada; guarde.

### Addon (Apps Script) — header `x-instalacao-key: lsic_…`

| Método | Path | Body / query |
|---|---|---|
| `GET` | `/instalacao` | dados da própria instalação (`email_usuario`, `escopo`, `pasta_raiz_drive`, `chave_admin`) |
| `GET` | `/termos` | termos `TERMO_DOCUMENTO` ativos |
| `POST` | `/usuarios` | `{ email, role }` — `role` 0 ou 1; exige `chave_admin` |
| `GET` | `/usuarios` | `?page=&per_page=` — também exige `chave_admin` |
| `POST` | `/pedidos` | ver abaixo — exige escopo `addon_solicitante` e OAuth do Drive concluído |
| `GET` | `/pedidos` | `?limit=&offset=` |
| `POST` | `/pedidos/:id/status` | sem body — consulta a API e, se o PDF já estiver assinado, grava `contrato-assinado.pdf` no Drive com a conta de serviço |

### Cerimônia do signatário (browser do Web App) — header `x-integracao-key: lsak_…`

Sem login, sem senha, sem sessão no serviço: o browser da cerimônia manda a própria `lsak_` do signatário (colada no Web App) em toda chamada. Quem valida de fato — dono, escopo, se ele é o signatário daquele documento — é a API; este serviço só repassa.

| Método | Path | Observação |
|---|---|---|
| `GET` | `/assinatura/convite` | valida o HMAC do convite (aberta, sem chave) |
| `POST` | `/assinatura/convite/chave` | confere a `lsak_` colada contra o e-mail do convite (aberta, sem header) |
| `GET/POST` | `/assinatura/termos*`, `/assinatura/sessao*`, `/assinatura/documentos/:id*` | cerimônia (termo, OTP, selfie, FaceMatch, estampa, assinar, status, download) — todas com `x-integracao-key` |

Onboarding (senha, 2FA, perfil, foto de referência) **não** passa mais por aqui — fica no site, antes da chave ser emitida/vinculada. Se a cerimônia cair num desses passos pendentes, a API devolve o `next_step` correspondente e o Web App manda a pessoa terminar no site.

Quando o status do signatário chega a `SIGNED`, o serviço grava o evento `ASSINATURA_CONCLUIDA` no rastreio do pedido — o card do solicitante sincroniza o `contrato-assinado.pdf` no próximo "Atualizar status".

`POST /pedidos` (tudo obrigatório, menos `termo_id` — se omitir, usa o primeiro termo de documento ativo). O serviço não cria mais pasta de processo nem copia o PDF: grava os artefatos na mesma pasta de onde o arquivo foi escolhido, com a conta de serviço impersonando `email_usuario` da instalação — não manda mais `google_token`, `pasta_processo_id` nem `arquivo_copia_id`:

```json
{
  "titulo": "Contrato X",
  "termo_id": null,
  "arquivo_origem_id": "id-do-pdf-origem-no-drive",
  "signatarios": [
    { "nome": "Maria", "email": "maria@empresa.com", "cpf": "00000000000", "telefone": "11999999999" }
  ],
  "areas": [
    {
      "email": "maria@empresa.com",
      "pagina": 1,
      "x": 0.1, "y": 0.2, "largura": 0.3, "altura": 0.1,
      "pagina_largura": 612,
      "pagina_altura": 792
    }
  ]
}
```

Regras que o serviço replica da API: um signatário = uma área (match por e-mail); CPF 11 dígitos; telefone 10–11; sem e-mail/CPF repetido; PDF real (não atalho, não pasta), mágica `%PDF-`, no máximo 25 MB, nome terminando em `.pdf`. O `<nome>-assinado.pdf` é gravado na mesma pasta de onde o usuário escolheu o arquivo — nada é criado nem copiado; o rastreio do pedido fica no MySQL. Se o arquivo estiver na raiz do Meu Drive (sem pasta pai), o destino é o Meu Drive desta conta. O `pasta_raiz_drive` da instalação não participa mais do fluxo de pedido. O SHA-256 gravado é o do arquivo de origem lido direto do Drive.

O quadro de assinatura enviado à API é fixo (**230 × 115 pt**). `x/y/largura/altura` das áreas vêm normalizados (0–1); o serviço converte para pontos.

Status local do pedido: no sucesso o registro nasce em `AGUARDANDO_ASSINATURAS`; fecha em `ASSINADO` (ou `ERRO`). `VALIDANDO` é só o estado em memória antes do insert.

---

## Testar com URL provisória

O Apps Script (e o card do Workspace) só chamam HTTPS público. Suba um túnel **no proxy**, não no container 7810 — assim o caminho `/addon` continua igual ao de produção.

### 1. Stack no ar

```bash
docker compose up -d addonservice proxysignature
curl -s http://localhost:<PROXY_PORT>/addon/healthcheck
```

Site e API também precisam estar de pé: gerar a `lsak_` em `/integracao` (só gerente/admin gera — a dele ou a de um usuário) e o serviço valida a chave contra a API no momento do vínculo.

### 2. Túnel (escolha um)

**cloudflared** (não precisa conta):

```bash
npx --yes cloudflared tunnel --url http://localhost:<PROXY_PORT>
```

**ngrok**:

```bash
ngrok http <PROXY_PORT>
```

A URL provisória sai no terminal, algo como:

```
https://aleatorio.trycloudflare.com
https://abc123.ngrok-free.app
```

Base do Addon (cole no Apps Script):

```
https://<host-do-tunel>/addon
```

Painel admin pela mesma URL:

```
https://<host-do-tunel>/addon/admin/painel/
```

O túnel cai quando o processo termina. Cada restart gera host novo — atualize a URL no Script Properties.

### 3. Conferir o túnel antes do Google

```bash
BASE=https://<host-do-tunel>/addon

curl -s "$BASE/healthcheck"

# Consentimento do Drive — abre no browser (não é chamada de API pura), o
# Google redireciona pro próprio $BASE/oauth/callback ao final.
open "$BASE/oauth/start?email=voce@empresa.com"

# Vincular a própria lsak_ (self-service, o mesmo fluxo do card do Addon).
# Recusa se o e-mail acima não tiver concluído o /oauth/start. A credencial
# lsic_ só vem nesta resposta.
curl -s -X POST "$BASE/instalacoes/vincular" \
  -H "content-type: application/json" \
  -d '{"chave_api":"lsak_...","email_google":"voce@empresa.com"}'

# Chamadas do Addon
curl -s "$BASE/termos" -H "x-instalacao-key: lsic_..."
curl -s "$BASE/pedidos" -H "x-instalacao-key: lsic_..."
```

`POST /pedidos` e a gravação do assinado em `POST /pedidos/:id/status` usam a conta de serviço (sem token no corpo) — só exigem `GOOGLE_SA_*` configurado e o `/oauth/start` concluído para o `email_usuario` da instalação. Sem consentimento, a resposta vem com mensagem clara (`pendente_gravar_drive: true` no status) em vez de um 403 cru do Drive.

### 4. Apps Script (propriedades)

```
SERVICE_BASE_URL = https://<host-do-tunel>/addon
URLSITE          = https://<site>            (fallback)
WEBAPP_URL       = https://script.google.com/macros/s/<deployment>/exec
```

Sem `INSTALACAO_KEY` no Script Properties — a `lsic_` não é mais compartilhada. Cada conta Google vincula a própria pelo card "Vincular chave" (que chama `POST /instalacoes/vincular` e guarda o resultado nas `UserProperties` daquela conta). **Não** coloque `lsak_` nem `apikey` da API no Script. A `WEBAPP_URL` tem que ser a mesma no Script Properties e no `addon-service/.env` (card e Web App usam essa `/exec`; o e-mail de convite aponta para o site). Depois de colar a `/exec`, `docker compose up -d addonservice`.

O browser da cerimônia (HtmlService em `*.googleusercontent.com`) chama `https://<host-do-tunel>/addon` — o CORS do **proxy** e do addon-service liberam essas origens e os headers `x-instalacao-key` / `x-integracao-key`.

### 5. Fluxo completo de um pedido

1. No site: gerente/admin gera a **própria** `lsak_` (escopo solicitante) em `/integracao`
2. Apps Script: `clasp push` + implantação do Web App (acesso: qualquer pessoa) → a mesma `WEBAPP_URL` no Script Properties e no `addon-service/.env`, depois `docker compose up -d addonservice`
3. No Workspace: o gerente abre o card, toca **Autorizar Drive** (consentimento no Google), volta e cola a `lsak_` no "Vincular chave" (self-service) — o Addon guarda a `lsic_` na conta dele
4. No Drive: abrir o PDF, cadastrar destinatários e termo no card, clicar o quadro de assinatura fixo (230×115pt) no Web App e enviar — o próprio serviço cria a pasta do processo e copia o PDF (não precisa ser signatário do documento)
5. Usuário comum solicita a chave dele em `/integracao`; o gerente atende e gera a `lsak_` dele (escopo signatário); ele autoriza o Drive e vincula a própria no card do Addon
6. Signatário recebe o e-mail com o link da **plataforma** (`URLSITE/assinar/:id`). A cerimônia no Workspace (cola a `lsak_`, OTP, facial e assinatura) entra pelo card / Web App (`/exec` + HMAC), não pelo e-mail. Onboarding pendente (senha/2FA/perfil/biometria) fica no site
7. Solicitante: **Meus pedidos → Atualizar status** → quando o documento estiver `DOCUMENTO_ASSINADO`, o serviço baixa o PDF, confere o hash e grava `contrato-assinado.pdf` na pasta do processo com a conta de serviço

---

## O que não fazer

- Não publique a `lsak_` no Apps Script, no card, nem em log do cliente
- Não chame a API Legacy direto do Addon — o handshake CSRF + `apikey` + `x-integracao-key` fica neste serviço
- Não aponte o túnel para a porta 7810 nem publique essa porta no compose; ela não existe no host — aponte para o **proxy** e use `/addon`
- Não reaproveite uma `lsic_` de instalação `REVOGADA`
- Não use a `lsak_` do solicitante do pedido na cerimônia — quem assina usa a própria `lsak_` dele (escopo signatário, ou solicitante se ele mesmo for o signatário daquele documento)
- Não gere `lsak_` para o usuário normal fora de `/integracao` (só gerente/admin gera); o Addon não emite chave, só vincula
- Não use `ScriptApp.getOAuthToken()` pro Drive — quem fala com o Drive é a conta de serviço (DWD), impersonando `email_usuario`
- Não pule o `/oauth/start`: mesmo com a delegação em todo o domínio configurada no Admin, o serviço recusa vínculo e pedido sem o consentimento explícito daquele e-mail
- Não use `http://localhost:3395` (site) como redirect URI do cliente OAuth — o callback é sempre o proxy (`/addon/oauth/callback`)
