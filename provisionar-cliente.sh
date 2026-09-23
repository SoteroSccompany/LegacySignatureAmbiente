#!/bin/bash
# Provisiona um cliente novo do LegacySignature de ponta a ponta:
#   - cria os 2 bancos MySQL (signature_<slug> e addonservice_<slug>) + 1
#     usuário MySQL dedicado com grants só nessas duas bases;
#   - cria o vhost do RabbitMQ (<slug>) + 1 usuário de serviço dedicado com
#     permissão só nesse vhost;
#   - gera todos os segredos de integração (API_KEY/JWT*/SHA/BINDEX/
#     CRYPT_SESSION/PROXYKEY/etc), já cruzados corretamente entre os 4
#     serviços (ver tabela de mapeamento no relatório da Frente D);
#   - copia deploy/clientes/_template/ inteiro (docker-compose.yaml + a
#     cópia-mestre do código-fonte api/addon-service/proxy/frontend/pdf —
#     cliente autocontido, sem código compartilhado entre clientes, ver
#     README.md do _template) e escreve .env/.env.api/.env.addon/.env.proxy/
#     .env.frontend em deploy/clientes/<slug>/;
#   - registra o cliente em deploy/core/clientes.json (portas + data).
#
# O que este script NÃO faz (de propósito):
#   - não builda nem sobe os containers do cliente (docker compose up é
#     manual, comando exato impresso no resumo final);
#   - não roda migration nem seed de usuário — RUN_MIGRATIONS=true fica
#     gravado em .env.api/.env.addon e o bootstrap de cada `index.js`
#     (api e addon-service) cria o banco + roda `knex.migrate.latest()`
#     sozinho no primeiro boot do container; o seed de usuário
#     (clienteBootstrap.js) precisa rodar DEPOIS que esse primeiro boot
#     terminar (comando exato também no resumo final).
#
# Uso (script fica na raiz de deploy/, para ser fácil de achar/rodar direto
# no server, sem precisar navegar pastas):
#   deploy/provisionar-cliente.sh <client-slug> <admin-email>
# ou, por variável de ambiente:
#   CLIENT_SLUG=<slug> ADMIN_EMAIL=<email> deploy/provisionar-cliente.sh
#
# Pré-requisito: deploy/core (mysql/redis/rabbitmq/bucket/serversign) já
# precisa estar de pé — ver deploy/core/README.md para o comando exato (são
# três `docker compose up` separados). Este script fala com o MySQL e o
# RabbitMQ via `docker exec` nos containers dbsignature/rabbitmqsignature,
# não precisa de client mysql/rabbitmqadmin instalado no host.
#
# Falha alto e cedo, sem rollback automático. Se algo falhar NO MEIO deste
# script, desfaça manualmente antes de tentar de novo com o mesmo slug:
#
#   1) MySQL (dbsignature) — dropar o que já tiver sido criado:
#      docker exec dbsignature sh -c 'exec mysql -uroot -p"$MYSQL_ROOT_PASSWORD"' <<'SQL'
#      DROP DATABASE IF EXISTS `signature_<slug>`;
#      DROP DATABASE IF EXISTS `addonservice_<slug>`;
#      DROP USER IF EXISTS 'cli_<slug>'@'%';
#      SQL
#
#   2) RabbitMQ (rabbitmqsignature):
#      docker exec rabbitmqsignature rabbitmqctl delete_vhost <slug>
#      docker exec rabbitmqsignature rabbitmqctl delete_user cli_<slug>
#
#   3) Pasta do cliente (só existe se o script já tinha chegado no passo de
#      escrita dos arquivos — o script recusa rodar se ela já existir):
#      rm -rf deploy/clientes/<slug>
#
#   4) Inventário: remova manualmente a entrada "<slug>" do array em
#      deploy/core/clientes.json (é só um JSON simples).
#
# O script nunca sobrescreve um cliente já provisionado: se
# deploy/clientes/<slug> já existir, ele para imediatamente (ver validação
# abaixo) — rodar de novo com o mesmo slug só é seguro depois do rollback
# manual acima.

set -euo pipefail

# ── 0. Localização e dependências ───────────────────────────────────────────

SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)
DEPLOY_ROOT="$SCRIPT_DIR"
CORE_DIR="$DEPLOY_ROOT/core"
TEMPLATE_DIR="$DEPLOY_ROOT/clientes/_template"
CLIENTES_DIR="$DEPLOY_ROOT/clientes"
CLIENTES_JSON="$CORE_DIR/clientes.json"

DB_CONTAINER="${DB_CONTAINER:-dbsignature}"
RABBITMQ_CONTAINER="${RABBITMQ_CONTAINER:-rabbitmqsignature}"

log() { echo "[provisionar-cliente] $*"; }
erro() { echo "[provisionar-cliente] ERRO: $*" >&2; exit 1; }

for bin in docker openssl jq; do
    command -v "$bin" >/dev/null 2>&1 || erro "dependência '$bin' não encontrada no PATH."
done

# ── 1. Entrada: CLIENT_SLUG e ADMIN_EMAIL (argumento ou variável de ambiente) ─

CLIENT_SLUG="${1:-${CLIENT_SLUG:-}}"
ADMIN_EMAIL="${2:-${ADMIN_EMAIL:-}}"

[ -n "$CLIENT_SLUG" ] || erro "CLIENT_SLUG não informado. Uso: $0 <client-slug> <admin-email>"
[ -n "$ADMIN_EMAIL" ] || erro "ADMIN_EMAIL não informado. Uso: $0 <client-slug> <admin-email>"

echo "$CLIENT_SLUG" | grep -Eq '^[a-z0-9-]+$' || erro "CLIENT_SLUG inválido ('$CLIENT_SLUG'). Use só [a-z0-9-]."
[ "${#CLIENT_SLUG}" -le 20 ] || erro "CLIENT_SLUG muito longo (máx. 20 caracteres, usado em nome de usuário MySQL/RabbitMQ)."
[ "$CLIENT_SLUG" != "_template" ] || erro "'_template' é reservado."
[ "$CLIENT_SLUG" != "legacy" ] || erro "'legacy' já é o cliente de referência existente."

echo "$ADMIN_EMAIL" | grep -Eq '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' || erro "ADMIN_EMAIL inválido ('$ADMIN_EMAIL')."

CLIENT_DIR="$CLIENTES_DIR/$CLIENT_SLUG"
[ ! -e "$CLIENT_DIR" ] || erro "'$CLIENT_DIR' já existe. Nunca sobrescrevo cliente existente — apague manualmente (ver instruções de rollback no topo deste script) antes de rodar de novo com este slug."

[ -d "$TEMPLATE_DIR" ] || erro "template não encontrado em '$TEMPLATE_DIR'."
[ -f "$TEMPLATE_DIR/docker-compose.yaml" ] || erro "'$TEMPLATE_DIR/docker-compose.yaml' não encontrado."

log "Provisionando cliente '$CLIENT_SLUG' (admin: $ADMIN_EMAIL)..."

# ── 2. Helpers de segredo (sem "$" no alfabeto — env_file do Compose corrompe
#      valor com "$", achado da Frente A) ───────────────────────────────────

# Segredo genérico (chave JWT/API_KEY/SHA/etc): base64 de 64 bytes de entropia,
# sem quebra de linha e sem "$".
gen_secret() { openssl rand -base64 64 | tr -d '\n$'; }

# Segredo só alfanumérico (senha de MySQL/RabbitMQ — evita qualquer caractere
# que precise de escape em URL de conexão amqp:// ou em literal SQL).
gen_alnum() { openssl rand -base64 48 | tr -dc 'A-Za-z0-9'; }

# base64url sem padding (RFC 7515) — usado para montar JWT HS256 na mão.
b64url() { openssl base64 -A | tr '+/' '-_' | tr -d '='; }

# Reproduz exatamente o que `jsonwebtoken` (lib usada pela api/proxy) faz em
# `JWT.sign(stringPayload, secret)`: quando o payload é uma STRING (não
# objeto), a lib não faz JSON.stringify nem adiciona `iat` — só base64url do
# texto cru. O header fica sempre `{"alg":"HS256"}` (sem "typ"), confirmado
# decodificando os tokens reais do cliente `legacy`. Testado byte a byte
# contra KEY_API/REACT_APP_APIKEY reais do cliente legacy antes de usar aqui.
jwt_hs256_string_payload() {
    local payload="$1" secret="$2"
    local header_b64='eyJhbGciOiJIUzI1NiJ9' # {"alg":"HS256"}
    local payload_b64 signing_input sig_b64
    payload_b64=$(printf '%s' "$payload" | b64url)
    signing_input="${header_b64}.${payload_b64}"
    sig_b64=$(printf '%s' "$signing_input" | openssl dgst -sha256 -hmac "$secret" -binary | b64url)
    printf '%s.%s' "$signing_input" "$sig_b64"
}

# Lê uma chave de um arquivo .env sem dar `source` nele (os valores têm "@",
# "+", "/" — dar source arriscaria o bash interpretar algo). Só grep+cut.
ler_env() {
    local arquivo="$1" chave="$2"
    grep -E "^${chave}=" "$arquivo" | tail -n1 | cut -d '=' -f2-
}

# Primeira porta livre em 127.0.0.1 a partir de $1 (checagem best-effort via
# /dev/tcp — hoje não há nada no ar, então isso só evita colidir com outro
# serviço do host, não com containers ainda não subidos).
porta_livre() {
    local porta="$1"
    while (exec 3<>"/dev/tcp/127.0.0.1/$porta") 2>/dev/null; do
        exec 3>&- 2>/dev/null || true
        porta=$((porta + 1))
    done
    echo "$porta"
}

# Maior valor de "${1}=" já usado em algum .env de cliente existente (ou 0).
maior_porta_usada() {
    local campo="$1" maior=0 valor
    for env_file in "$CLIENTES_DIR"/*/.env; do
        [ -f "$env_file" ] || continue
        valor=$(ler_env "$env_file" "$campo")
        [ -n "$valor" ] || continue
        [ "$valor" -gt "$maior" ] 2>/dev/null && maior="$valor"
    done
    echo "$maior"
}

# ── 3. Ler config compartilhada do `core` (hosts são fixos/estáveis; só as
#      credenciais precisam ser lidas dos arquivos reais do core) ──────────

REDIS_HOST_CORE="redissignature"
REDIS_PORT_CORE="6379"
REDIS_PASS_CORE=$(grep -E '^requirepass ' "$CORE_DIR/redis/redis.conf" | awk '{print $2}')
[ -n "$REDIS_PASS_CORE" ] || erro "não consegui ler 'requirepass' de $CORE_DIR/redis/redis.conf"

BUCKET_ROOT_USER=$(ler_env "$CORE_DIR/bucket/.env" "BUCKET_ROOT_USER")
BUCKET_ROOT_PASSWORD=$(ler_env "$CORE_DIR/bucket/.env" "BUCKET_ROOT_PASSWORD")
[ -n "$BUCKET_ROOT_USER" ] && [ -n "$BUCKET_ROOT_PASSWORD" ] || erro "não consegui ler BUCKET_ROOT_USER/BUCKET_ROOT_PASSWORD de $CORE_DIR/bucket/.env"

MAILPIT_UI_USER=$(ler_env "$CORE_DIR/.env" "MAILPIT_UI_USER")
MAILPIT_UI_PASS=$(ler_env "$CORE_DIR/.env" "MAILPIT_UI_PASS")
MAILPIT_SMTP_USER=$(ler_env "$CORE_DIR/.env" "MAILPIT_SMTP_USER")
MAILPIT_SMTP_PASS=$(ler_env "$CORE_DIR/.env" "MAILPIT_SMTP_PASS")

# Credencial ADMIN do broker (não é o usuário AMQP do cliente — esse é o
# RABBITMQ_USER/RABBITMQ_PASSWORD dedicado, gerado no passo 7). O healthcheck
# da api (ApplicationController.healthCheck) consulta a API HTTP de
# management do RabbitMQ (GET /api/overview, porta 15672) autenticando com
# RABBITMQ_DEFAULT_USER/RABBITMQ_DEFAULT_PASS — sem isso o check de rabbitmq
# do /api/healthcheck vem "unhealthy" (401), mesmo com o AMQP do cliente
# funcionando normalmente. É overview do broker inteiro, não por vhost, então
# reaproveitar o admin do core aqui não fura o isolamento por vhost do cliente.
RABBITMQ_DEFAULT_USER_CORE=$(ler_env "$CORE_DIR/.env" "RABBITMQ_DEFAULT_USER")
RABBITMQ_DEFAULT_PASS_CORE=$(ler_env "$CORE_DIR/.env" "RABBITMQ_DEFAULT_PASS")
[ -n "$RABBITMQ_DEFAULT_USER_CORE" ] && [ -n "$RABBITMQ_DEFAULT_PASS_CORE" ] || erro "não consegui ler RABBITMQ_DEFAULT_USER/RABBITMQ_DEFAULT_PASS de $CORE_DIR/.env"

# Mailer real (SMTP de saída de e-mails de negócio: recovery, 2FA, etc.) —
# hoje é uma caixa compartilhada entre todos os clientes (não existe conceito
# de remetente por cliente no código atual). Reaproveita a mesma credencial
# do cliente legacy. Se isso não servir para o cliente novo, troque
# MAIL/MAILPASS manualmente em .env.api depois.
if [ -f "$CLIENTES_DIR/legacy/.env.api" ]; then
    MAIL_COMPARTILHADO=$(ler_env "$CLIENTES_DIR/legacy/.env.api" "MAIL")
    MAILPASS_COMPARTILHADO=$(ler_env "$CLIENTES_DIR/legacy/.env.api" "MAILPASS")
fi
MAIL_COMPARTILHADO="${MAIL_COMPARTILHADO:-}"
MAILPASS_COMPARTILHADO="${MAILPASS_COMPARTILHADO:-}"

# ── 4. Alocar portas (API_PORT / PROXY_PORT / FRONT_END_PORT) ──────────────
# Base acima dos valores já usados pelo cliente `legacy` (9366/7749/3395) —
# nunca reduz, só avança. Ordem: maior porta já registrada em algum
# deploy/clientes/*/.env, +1, depois avança até achar uma porta livre no host.

API_PORT=$(porta_livre "$(($(maior_porta_usada API_PORT) > 9366 ? $(maior_porta_usada API_PORT) + 1 : 9400))")
PROXY_PORT=$(porta_livre "$(($(maior_porta_usada PROXY_PORT) > 7749 ? $(maior_porta_usada PROXY_PORT) + 1 : 7800))")
FRONT_END_PORT=$(porta_livre "$(($(maior_porta_usada FRONT_END_PORT) > 3395 ? $(maior_porta_usada FRONT_END_PORT) + 1 : 3400))")

log "Portas alocadas: API_PORT=$API_PORT PROXY_PORT=$PROXY_PORT FRONT_END_PORT=$FRONT_END_PORT"

# ── 5. Gerar segredos ────────────────────────────────────────────────────
# Ver no relatório da Frente D a tabela completa de quem precisa bater com
# quem. Resumo:
#   - API_KEY + JWTAPIKEY (api)      -> KEY_API (proxy) = jwt.sign(API_KEY, JWTAPIKEY)
#   - PROXYKEY + JWTKEYPROXY (proxy) -> REACT_APP_APIKEY (frontend) = jwt.sign(PROXYKEY, JWTKEYPROXY)
#   - todo o resto é segredo interno de um serviço só, sem par.

API_KEY=$(gen_secret)
JWTAPIKEY=$(gen_secret)
JWTLOG=$(gen_secret)
JWTLOGREFRESH=$(gen_secret)
JWTMAILUPDATE=$(gen_secret)
JWTMAILERTOKER=$(gen_secret)
JWTRECOVERY=$(gen_secret)
JWTQRCODESIGN=$(gen_secret)
JWTLOGINVESTIDOR=$(gen_secret)
SHA_API=$(gen_secret)
BINDEX=$(gen_secret)
CRYPT_SESSION=$(gen_secret)
DOCUMENTO_VERIFICACAO_SECRET=$(gen_secret)

PROXYKEY=$(gen_secret)
JWTKEYPROXY=$(gen_secret)

SHA_ADDON=$(gen_secret)
ADMIN_TOKEN_ADDON=$(gen_secret)

DB_USER="cli_${CLIENT_SLUG}"
DB_PASS=$(gen_alnum)
RABBITMQ_USER="cli_${CLIENT_SLUG}"
RABBITMQ_PASSWORD=$(gen_alnum)

# Derivados (JWT calculado na mão, ver jwt_hs256_string_payload acima).
KEY_API=$(jwt_hs256_string_payload "$API_KEY" "$JWTAPIKEY")
REACT_APP_APIKEY=$(jwt_hs256_string_payload "$PROXYKEY" "$JWTKEYPROXY")
# LEGACY_APIKEY (.env.addon) é fallback morto no addon-service hoje
# (ApiLegacy usa `process.env.KEY_API || legacyApi.apikey`, e o compose já
# injeta KEY_API no container do addon via `env_file: [.env.addon, .env.proxy]`
# — KEY_API do .env.proxy sempre vence). Preenchido do mesmo jeito só por
# defesa, caso alguém rode o addon-service um dia sem carregar .env.proxy.
LEGACY_APIKEY="$KEY_API"

DB_DATABASE_API="signature_${CLIENT_SLUG}"
DB_DATABASE_ADDON="addonservice_${CLIENT_SLUG}"

# ── 6. MySQL: 2 bancos + 1 usuário dedicado (via docker exec no dbsignature) ─

docker ps --format '{{.Names}}' | grep -qx "$DB_CONTAINER" || erro "container '$DB_CONTAINER' não está rodando. Suba o deploy/core antes (ver deploy/core/README.md)."

log "Verificando MySQL..."
JA_EXISTE_DB=$(docker exec -i "$DB_CONTAINER" sh -c 'exec mysql -N -B -uroot -p"$MYSQL_ROOT_PASSWORD"' <<SQL
SELECT COUNT(*) FROM information_schema.SCHEMATA WHERE SCHEMA_NAME IN ('${DB_DATABASE_API}', '${DB_DATABASE_ADDON}');
SQL
)
[ "$JA_EXISTE_DB" != "0" ] && log "aviso: algum dos bancos '${DB_DATABASE_API}'/'${DB_DATABASE_ADDON}' já existia — mantendo como está (CREATE DATABASE IF NOT EXISTS, não destrutivo)." || true

JA_EXISTE_USER=$(docker exec -i "$DB_CONTAINER" sh -c 'exec mysql -N -B -uroot -p"$MYSQL_ROOT_PASSWORD"' <<SQL
SELECT COUNT(*) FROM mysql.user WHERE user = '${DB_USER}' AND host = '%';
SQL
)
if [ "$JA_EXISTE_USER" != "0" ]; then
    erro "usuário MySQL '${DB_USER}'@'%' já existe e eu não sei a senha real dele — não vou sobrescrever. Rode o rollback manual (topo do script) e tente de novo, ou escolha outro slug."
fi

docker exec -i "$DB_CONTAINER" sh -c 'exec mysql -uroot -p"$MYSQL_ROOT_PASSWORD"' <<SQL
CREATE DATABASE IF NOT EXISTS \`${DB_DATABASE_API}\`;
CREATE DATABASE IF NOT EXISTS \`${DB_DATABASE_ADDON}\`;
CREATE USER '${DB_USER}'@'%' IDENTIFIED BY '${DB_PASS}';
GRANT ALL PRIVILEGES ON \`${DB_DATABASE_API}\`.* TO '${DB_USER}'@'%';
GRANT ALL PRIVILEGES ON \`${DB_DATABASE_ADDON}\`.* TO '${DB_USER}'@'%';
FLUSH PRIVILEGES;
SQL

log "MySQL ok: bancos '${DB_DATABASE_API}' e '${DB_DATABASE_ADDON}', usuário '${DB_USER}'@'%'."

# ── 7. RabbitMQ: vhost + usuário de serviço dedicado (via docker exec) ─────

docker ps --format '{{.Names}}' | grep -qx "$RABBITMQ_CONTAINER" || erro "container '$RABBITMQ_CONTAINER' não está rodando. Suba o deploy/core antes."

log "Verificando RabbitMQ..."
if docker exec "$RABBITMQ_CONTAINER" rabbitmqctl -q list_vhosts | grep -qx "$CLIENT_SLUG"; then
    log "aviso: vhost '${CLIENT_SLUG}' já existia — não recriando (idempotente)."
else
    docker exec "$RABBITMQ_CONTAINER" rabbitmqctl add_vhost "$CLIENT_SLUG"
fi

if docker exec "$RABBITMQ_CONTAINER" rabbitmqctl -q list_users | awk '{print $1}' | grep -qx "$RABBITMQ_USER"; then
    erro "usuário RabbitMQ '${RABBITMQ_USER}' já existe e eu não sei a senha real dele — não vou sobrescrever. Rode o rollback manual (topo do script) e tente de novo, ou escolha outro slug."
fi
docker exec "$RABBITMQ_CONTAINER" rabbitmqctl add_user "$RABBITMQ_USER" "$RABBITMQ_PASSWORD"
docker exec "$RABBITMQ_CONTAINER" rabbitmqctl set_permissions -p "$CLIENT_SLUG" "$RABBITMQ_USER" '.*' '.*' '.*'

log "RabbitMQ ok: vhost '${CLIENT_SLUG}', usuário '${RABBITMQ_USER}' com permissão só nesse vhost."

# ── 8. Escrever deploy/clientes/<slug>/ ─────────────────────────────────────

mkdir -p "$CLIENT_DIR"
# Cliente autocontido: leva junto a cópia-mestre do código-fonte
# (api/, addon-service/, proxy/, frontend/, pdf/) do template — a
# arquitetura atual não compartilha código entre clientes (ver
# _template/README.md). README.md do template fica de fora (é
# documentação do molde, não do cliente concreto).
cp -R "$TEMPLATE_DIR/." "$CLIENT_DIR/"
rm -f "$CLIENT_DIR/README.md"

cat > "$CLIENT_DIR/.env" <<EOF
# Variáveis de orquestração do compose (nomes de container/rede e portas
# publicadas no host) — geradas por provisionar-cliente.sh em $(date -u +%Y-%m-%dT%H:%M:%SZ).
CLIENT_SLUG=${CLIENT_SLUG}
API_PORT=${API_PORT}
PROXY_PORT=${PROXY_PORT}
FRONT_END_PORT=${FRONT_END_PORT}
EOF

cat > "$CLIENT_DIR/.env.api" <<EOF
PORT=${API_PORT}
APLICATION_NAME=apisignature

# Migrations na subida do container (bootstrap em api/index.js) — cria o
# banco (se não existir) e roda knex.migrate.latest() antes de abrir o servidor.
RUN_MIGRATIONS=true

API_KEY=${API_KEY}
JWTAPIKEY=${JWTAPIKEY}

REDIS_PORT=${REDIS_PORT_CORE}
REDIS_PASS=${REDIS_PASS_CORE}
REDIS_HOST=${REDIS_HOST_CORE}
# Isolamento de chaves no Redis compartilhado (ioredis keyPrefix nativo).
REDIS_KEY_PREFIX=${CLIENT_SLUG}:

DB_CLIENT=mysql2
DB_HOST=dbsignature
DB_USER=${DB_USER}
DB_PASS=${DB_PASS}
DB_DATABASE=${DB_DATABASE_API}
DB_PORT=3306

# Mailer de saída (recovery/2FA/etc.) — caixa compartilhada entre clientes
# hoje (reaproveitada do cliente legacy). Troque aqui se este cliente precisar
# de remetente próprio.
MAIL=${MAIL_COMPARTILHADO}
MAILPASS=${MAILPASS_COMPARTILHADO}
LIMITASSAS=100

PROXY_PORT=${PROXY_PORT}
# CORS (api/infrastructure/server/index.js) libera http://\${PROXY_HOST}:\${PROXY_PORT}
# — em dev local isso é sempre "localhost" (é daí que o navegador acessa o proxy).
PROXY_HOST=localhost

STATUSAPLICATION=development

PREFIX_REDIS=${CLIENT_SLUG}
COOKIE_NAME=${CLIENT_SLUG}SignatureCookies
CRYPT_SESSION=${CRYPT_SESSION}

URL_FRONT=http://localhost:${FRONT_END_PORT}

JWTLOG=${JWTLOG}
JWTLOGREFRESH=${JWTLOGREFRESH}
JWTMAILUPDATE=${JWTMAILUPDATE}
JWTMAILERTOKER=${JWTMAILERTOKER}
JWTRECOVERY=${JWTRECOVERY}
JWTQRCODESIGN=${JWTQRCODESIGN}
JWTLOGINVESTIDOR=${JWTLOGINVESTIDOR}

RABBITMQ_HOST=rabbitmqsignature
RABBITMQ_PORT=5672
RABBITMQ_USER=${RABBITMQ_USER}
RABBITMQ_PASSWORD=${RABBITMQ_PASSWORD}
MAXRETRY_RABBITMQ=10
# Vhost dedicado deste cliente (RabbitMqConfig.initConnection lê isso).
RABBITMQ_VHOST=${CLIENT_SLUG}
# Admin do broker (core) — só para o /api/healthcheck (GET /api/overview via
# management API); a mensageria de negócio usa RABBITMQ_USER/RABBITMQ_VHOST acima.
RABBITMQ_DEFAULT_USER=${RABBITMQ_DEFAULT_USER_CORE}
RABBITMQ_DEFAULT_PASS=${RABBITMQ_DEFAULT_PASS_CORE}
RABBITMQ_WEB_PORT=15672

CERTIFICATE_TWOFACTOR_PATH=./security/validations/cert.pem
PUBLIC_KEY_TWOFACTOR_PATH=./security/validations/public.pem
PRIVATE_KEY_TWOFACTOR_PATH=./security/validations/private.pem

SHA=${SHA_API}
BINDEX=${BINDEX}

BUCKET_RETENTION_YEARS=5
BUCKET_HOST=bucketsignatureexperts
BUCKET_PORT=8333
BUCKET_PUBLIC_URL=http://localhost:${PROXY_PORT}/bucket
BUCKET_USE_SSL=false
BUCKET_ACCESS_KEY=${BUCKET_ROOT_USER}
BUCKET_SECRET_KEY=${BUCKET_ROOT_PASSWORD}
BUCKET_NAME_WIP=wip-signatureexperts
BUCKET_NAME_VAULT=vault-signatureexperts
BUCKET_NAME_VAULT_LEDGER_ASSINATURA=ledger-assinatura-signatureexperts
BUCKET_NAME_VAULT_LEDGER_SOLICITACAO=ledger-solicitacao-signatureexperts
# Isolamento por cliente no bucket compartilhado (BucketConfig.applyRootPrefix).
BUCKET_ROOT_PREFIX=${CLIENT_SLUG}

SIGNSERVER_HOST=signserversignatureexperts
SIGNSERVER_PORT=8080
SIGNSERVER_USE_SSL=false
SIGNSERVER_WORKER_CARIMBO=CMSSignerCarimbo
SIGNSERVER_TIMEOUT=15000
SIGNSERVER_OBRIGATORIO=false

ASSINATURA_BIOMETRIA_OBRIGATORIA=true

SALT_BCRYPT=10

MAILPIT_HOST=mailpitsignature
MAILPIT_UI_PORT=8025
MAILPIT_SMTP_PORT=1025
MAILPIT_SMTP_USER=${MAILPIT_SMTP_USER}
MAILPIT_SMTP_PASS=${MAILPIT_SMTP_PASS}
MAILPIT_UI_USER=${MAILPIT_UI_USER}
MAILPIT_UI_PASS=${MAILPIT_UI_PASS}

DOCUMENTO_VERIFICACAO_SECRET=${DOCUMENTO_VERIFICACAO_SECRET}

FACE_HOST=facematch
FACE_PORT=8085
FACE_USE_SSL=false
FACE_TIMEOUT=30000
FACE_MODEL_PACK=opencv_sface
FACE_TOLERANCE=1.128
EOF
chmod 600 "$CLIENT_DIR/.env.api"

cat > "$CLIENT_DIR/.env.addon" <<EOF
APP_STATUS=development
ADDON_PORT=7810
APLICATION_NAME=addon-service

DB_CLIENT=mysql2
DB_HOST=dbsignature
DB_PORT=3306
DB_USER=${DB_USER}
DB_PASS=${DB_PASS}
DB_DATABASE=${DB_DATABASE_ADDON}
RUN_MIGRATIONS=true

REDIS_HOST=${REDIS_HOST_CORE}
REDIS_PORT=${REDIS_PORT_CORE}
REDIS_PASS=${REDIS_PASS_CORE}

# Rede interna do docker — usa o container_name (não o nome do service) para
# não colidir com o "apisignature" de outro cliente no mesmo
# legacysignaturenetwork (rede compartilhada entre todos os clientes).
LEGACY_API_URL=http://apisignature-${CLIENT_SLUG}:${API_PORT}
# Fallback morto na prática: o compose já injeta KEY_API (via env_file:
# .env.proxy) no container do addon, e ApiLegacy prioriza process.env.KEY_API
# sobre este valor. Preenchido só por defesa (ver nota no cabeçalho do script).
LEGACY_APIKEY=${LEGACY_APIKEY}

SHA=${SHA_ADDON}
ADMIN_TOKEN=${ADMIN_TOKEN_ADDON}

URLSITE=http://localhost:${FRONT_END_PORT}

# Integração Google Workspace (Apps Script/Drive) é por cliente e não dá para
# gerar sozinho — preencha manualmente se este cliente usar o Addon.
WEBAPP_URL=
GOOGLE_SA_CLIENT_EMAIL=
GOOGLE_SA_PRIVATE_KEY=
GOOGLE_OAUTH_CLIENT_ID=
GOOGLE_OAUTH_CLIENT_SECRET=
GOOGLE_OAUTH_REDIRECT_URI=
EOF

cat > "$CLIENT_DIR/.env.proxy" <<EOF
JWTKEYPROXY=${JWTKEYPROXY}
PROXYKEY=${PROXYKEY}

# jwt.sign(API_KEY, JWTAPIKEY) da api deste cliente — authApi.js decodifica
# com o JWTAPIKEY da própria api e compara o payload com o API_KEY dela.
KEY_API=${KEY_API}

API_PORT=${API_PORT}
PORT=${PROXY_PORT}
# Container_name da api deste cliente na legacysignaturenetwork.
API_HOST=apisignature-${CLIENT_SLUG}
URL_FRONT=http://localhost:${FRONT_END_PORT}

BUCKET_HOST=bucketsignatureexperts
BUCKET_PORT=8333

APP_STATUS=development
EOF
chmod 600 "$CLIENT_DIR/.env.proxy"

cat > "$CLIENT_DIR/.env.frontend" <<EOF
# jwt.sign(PROXYKEY, JWTKEYPROXY) do proxy deste cliente — vira o header
# "proxyauthorization" em toda chamada do front (proxy/middleware valida).
REACT_APP_APIKEY=${REACT_APP_APIKEY}
NODE_ENV=development

REACT_APP_BACKEND=http://localhost:${PROXY_PORT}/signature
REACT_APP_FRONTEND=http://localhost:${FRONT_END_PORT}
REACT_APP_UI_MOCK=false
REACT_APP_MANUTENCAO=false
REACT_APP_OCULTAR_SOLICITACOES=false
REACT_APP_OCULTAR_INTEGRACAO=false
PORT=${FRONT_END_PORT}
EOF

log "Arquivos escritos em $CLIENT_DIR"

# ── 9. Registrar em deploy/core/clientes.json ───────────────────────────────

[ -f "$CLIENTES_JSON" ] || echo '{"clientes": []}' > "$CLIENTES_JSON"

TMP_JSON=$(mktemp)
jq --arg slug "$CLIENT_SLUG" \
   --argjson apiPort "$API_PORT" \
   --argjson proxyPort "$PROXY_PORT" \
   --argjson frontEndPort "$FRONT_END_PORT" \
   --arg criadoEm "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
   --arg adminEmail "$ADMIN_EMAIL" \
   '.clientes += [{slug: $slug, api_port: $apiPort, proxy_port: $proxyPort, front_end_port: $frontEndPort, admin_email: $adminEmail, criado_em: $criadoEm}]' \
   "$CLIENTES_JSON" > "$TMP_JSON"
mv "$TMP_JSON" "$CLIENTES_JSON"
chmod 644 "$CLIENTES_JSON"

log "Cliente registrado em $CLIENTES_JSON"

# ── 10. Resumo final ─────────────────────────────────────────────────────

cat <<EOF

############################################################
# Cliente '${CLIENT_SLUG}' provisionado.
############################################################

1) Suba o core primeiro, se ainda não estiver de pé (ver deploy/core/README.md):
     cd $CORE_DIR/bucket && docker compose up -d --build
     cd $CORE_DIR/serversign && docker compose up -d --build
     cd $CORE_DIR && docker compose -f docker-compose.yaml up -d --build

2) Suba os containers deste cliente (build das imagens do app é feito aqui,
   as migrations rodam sozinhas no boot porque RUN_MIGRATIONS=true já está
   gravado em .env.api/.env.addon). Rode SEM "--env-file" explícito: cada
   serviço já carrega seu .env.* via "env_file:" no compose, e o ".env" local
   (CLIENT_SLUG/API_PORT/PROXY_PORT/FRONT_END_PORT) é lido automaticamente
   pelo Compose só se você NÃO passar "--env-file" (passar qualquer
   "--env-file" substitui o autoload do ".env" e deixa CLIENT_SLUG/portas em
   branco na interpolação do compose — confirmado com "docker compose config"
   neste provisionamento; ver observação no relatório da Frente D sobre o
   README do _template, que documenta o comando com "--env-file" e por isso
   está incorreto):
     cd $CLIENT_DIR
     docker compose -f docker-compose.yaml up -d --build

3) Depois que o container "apisignature-${CLIENT_SLUG}" tiver subido (banco já
   migrado pelo bootstrap do passo 2), rode o seed do usuário admin:
     docker exec -it apisignature-${CLIENT_SLUG} sh -c \\
       "ADMIN_EMAIL=${ADMIN_EMAIL} npx knex seed:run --specific=clienteBootstrap.js"

   Login do admin: ${ADMIN_EMAIL} / senha temporária: Trocar@123
   (trocar_senha=true força redefinição no primeiro login)

Portas deste cliente: API_PORT=${API_PORT}  PROXY_PORT=${PROXY_PORT}  FRONT_END_PORT=${FRONT_END_PORT}
Front: http://localhost:${FRONT_END_PORT}   Proxy: http://localhost:${PROXY_PORT}
EOF
