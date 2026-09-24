#!/bin/bash
# Prepara um cliente JÁ existente para entrega.
# O slug não muda: pasta, portas, bancos, usuário MySQL, vhost RabbitMQ
# e prefixos ficam como estão. O script troca só as chaves JWT/API
# (e os tokens derivados) e o registro do administrador.
#
# Também esvazia o dado de teste dos dois bancos do cliente e as filas
# do vhost dele. O usuário de sistema (system@system.com) permanece.
#
# Uso, na raiz do repositório:
#   ./configurar-cliente.sh
#
# Pré-requisito: core no ar (dbsignature, rabbitmqsignature) e o container
# apisignature-<slug> no ar (o bcrypt da senha temporária sai de lá).

set -euo pipefail

SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)
CLIENTES_DIR="$SCRIPT_DIR/clientes"

DB_CONTAINER="${DB_CONTAINER:-dbsignature}"
RABBITMQ_CONTAINER="${RABBITMQ_CONTAINER:-rabbitmqsignature}"

SYSTEM_USER_ID="2f09833b-001e-4eaf-9c75-ed8ceaf3d181"
SENHA_ADMIN="Trocar@4321"

log() { echo "[configurar-cliente] $*"; }
erro() { echo "[configurar-cliente] ERRO: $*" >&2; exit 1; }

for bin in docker openssl uuidgen awk; do
    command -v "$bin" >/dev/null 2>&1 || erro "dependência '$bin' não encontrada no PATH."
done

# Segredo genérico: base64 de 64 bytes, sem quebra de linha e sem "$"
# (env_file do Compose corrompe valor com "$").
gen_secret() { openssl rand -base64 64 | tr -d '\n$'; }

b64url() { openssl base64 -A | tr '+/' '-_' | tr -d '='; }

# Igual a jsonwebtoken JWT.sign(stringPayload, secret): payload string,
# sem iat, header {"alg":"HS256"}.
jwt_hs256_string_payload() {
    local payload="$1" secret="$2"
    local header_b64='eyJhbGciOiJIUzI1NiJ9'
    local payload_b64 signing_input sig_b64
    payload_b64=$(printf '%s' "$payload" | b64url)
    signing_input="${header_b64}.${payload_b64}"
    sig_b64=$(printf '%s' "$signing_input" | openssl dgst -sha256 -hmac "$secret" -binary | b64url)
    printf '%s.%s' "$signing_input" "$sig_b64"
}

ler_env() {
    local arquivo="$1" chave="$2"
    grep -E "^${chave}=" "$arquivo" | tail -n1 | cut -d '=' -f2-
}

exigir_env() {
    local arquivo="$1" chave="$2" valor
    valor=$(ler_env "$arquivo" "$chave")
    [ -n "$valor" ] || erro "chave ${chave} ausente ou vazia em ${arquivo}"
    printf '%s' "$valor"
}

# Troca o valor de ^CHAVE= sem reescrever comentário nem as outras linhas.
substituir_env() {
    local arquivo="$1" chave="$2" valor="$3" tmp
    tmp=$(mktemp)
    if ! awk -v chave="$chave" -v valor="$valor" '
        BEGIN { prefixo = chave "="; achou = 0 }
        index($0, prefixo) == 1 {
            print prefixo valor
            achou = 1
            next
        }
        { print }
        END { if (achou == 0) exit 2 }
    ' "$arquivo" > "$tmp"; then
        rm -f "$tmp"
        erro "chave ${chave} não encontrada em ${arquivo}"
    fi
    mv "$tmp" "$arquivo"
}

mysql_exec() {
    docker exec -i "$DB_CONTAINER" sh -c 'exec mysql -N -B -uroot -p"$MYSQL_ROOT_PASSWORD"'
}

mysql_scalar() {
    mysql_exec <<SQL
$1
SQL
}

identificador_sql() {
    local nome="$1" rotulo="$2"
    echo "$nome" | grep -Eq '^[A-Za-z0-9_]+$' || erro "${rotulo} inválido ('${nome}')."
}

container_no_ar() {
    docker ps --format '{{.Names}}' | grep -qx "$1"
}

# ── 1. Pasta do cliente ────────────────────────────────────────────────────

read -r -p "Pasta do cliente (ex.: crp): " CLIENT_SLUG
[ -n "$CLIENT_SLUG" ] || erro "pasta não informada."
[ "$CLIENT_SLUG" != "_template" ] || erro "'_template' é reservado."
echo "$CLIENT_SLUG" | grep -Eq '^[a-z0-9-]+$' || erro "pasta inválida ('$CLIENT_SLUG'). Use só [a-z0-9-]."

CLIENT_DIR="$CLIENTES_DIR/$CLIENT_SLUG"
[ -d "$CLIENT_DIR" ] || erro "cliente não encontrado em '$CLIENT_DIR'."
[ -f "$CLIENT_DIR/.env.api" ] || erro "'$CLIENT_DIR/.env.api' não existe."
[ -f "$CLIENT_DIR/.env.proxy" ] || erro "'$CLIENT_DIR/.env.proxy' não existe."
[ -f "$CLIENT_DIR/.env.frontend" ] || erro "'$CLIENT_DIR/.env.frontend' não existe."
[ -f "$CLIENT_DIR/.env.addon" ] || erro "'$CLIENT_DIR/.env.addon' não existe."

if [ -e "$CLIENT_DIR/.configurado" ]; then
    erro "cliente '$CLIENT_SLUG' já possui .configurado. Este script não roda de novo nesse cliente."
fi

# ── 2. E-mail do administrador ─────────────────────────────────────────────

read -r -p "E-mail do administrador inicial: " ADMIN_EMAIL
echo "$ADMIN_EMAIL" | grep -Eq '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' || erro "e-mail inválido ('$ADMIN_EMAIL')."
[ "$ADMIN_EMAIL" != "system@system.com" ] || erro "o e-mail do administrador não pode ser o do usuário de sistema."

# ── 3. Confirmação ─────────────────────────────────────────────────────────

read -r -p "Digite a pasta de novo para confirmar a limpeza de '$CLIENT_SLUG': " CONFIRMA
[ "$CONFIRMA" = "$CLIENT_SLUG" ] || erro "confirmação diferente de '$CLIENT_SLUG'. Nada foi alterado."

ENV_API="$CLIENT_DIR/.env.api"
ENV_PROXY="$CLIENT_DIR/.env.proxy"
ENV_FRONT="$CLIENT_DIR/.env.frontend"
ENV_ADDON="$CLIENT_DIR/.env.addon"

DB_API=$(exigir_env "$ENV_API" "DB_DATABASE")
DB_ADDON=$(exigir_env "$ENV_ADDON" "DB_DATABASE")
RABBITMQ_VHOST=$(exigir_env "$ENV_API" "RABBITMQ_VHOST")
identificador_sql "$DB_API" "DB_DATABASE da api"
identificador_sql "$DB_ADDON" "DB_DATABASE do addon"
echo "$RABBITMQ_VHOST" | grep -Eq '^[A-Za-z0-9_-]+$' || erro "RABBITMQ_VHOST inválido ('$RABBITMQ_VHOST')."

API_CONTAINER="apisignature-${CLIENT_SLUG}"
container_no_ar "$DB_CONTAINER" || erro "container '$DB_CONTAINER' não está rodando."
container_no_ar "$RABBITMQ_CONTAINER" || erro "container '$RABBITMQ_CONTAINER' não está rodando."
container_no_ar "$API_CONTAINER" || erro "container '$API_CONTAINER' não está rodando."

EXISTE_DB_API=$(mysql_scalar "SELECT COUNT(*) FROM information_schema.SCHEMATA WHERE SCHEMA_NAME = '${DB_API}';")
EXISTE_DB_ADDON=$(mysql_scalar "SELECT COUNT(*) FROM information_schema.SCHEMATA WHERE SCHEMA_NAME = '${DB_ADDON}';")
[ "$EXISTE_DB_API" = "1" ] || erro "banco '${DB_API}' não existe."
[ "$EXISTE_DB_ADDON" = "1" ] || erro "banco '${DB_ADDON}' não existe."

SYSTEM_COUNT=$(mysql_scalar "SELECT COUNT(*) FROM \`${DB_API}\`.tab_usuarios WHERE id = '${SYSTEM_USER_ID}';")
[ "$SYSTEM_COUNT" = "1" ] || erro "usuário de sistema (${SYSTEM_USER_ID}) não encontrado em ${DB_API}.tab_usuarios. Nada foi alterado."

log "Cliente '$CLIENT_SLUG'. Bancos ${DB_API} e ${DB_ADDON}. Vhost ${RABBITMQ_VHOST}. Slug, bancos e vhost não serão renomeados."

# ── 4. Senha do admin (bcrypt no container da api, antes de recriar) ──────

SENHA_HASH=$(docker exec -w /app "$API_CONTAINER" node -e 'console.log(require("bcrypt").hashSync(process.argv[1], 10))' "$SENHA_ADMIN")
SENHA_HASH=$(printf '%s' "$SENHA_HASH" | tr -d '\r\n')
[ -n "$SENHA_HASH" ] || erro "bcrypt não devolveu hash."
echo "$SENHA_HASH" | grep -Eq "^\\\$2[aby]\\\$[0-9]{2}\\\$" || erro "hash bcrypt inesperado."
case "$SENHA_HASH" in
    *"'"*) erro "hash bcrypt contém aspas. Nada além da checagem foi feito nas chaves." ;;
esac

# ── 5. Rotacionar JWT / API key ────────────────────────────────────────────

API_KEY=$(gen_secret)
JWTAPIKEY=$(gen_secret)
JWTLOG=$(gen_secret)
JWTLOGREFRESH=$(gen_secret)
JWTMAILUPDATE=$(gen_secret)
JWTMAILERTOKER=$(gen_secret)
JWTRECOVERY=$(gen_secret)
JWTQRCODESIGN=$(gen_secret)
JWTLOGINVESTIDOR=$(gen_secret)
PROXYKEY=$(gen_secret)
JWTKEYPROXY=$(gen_secret)

KEY_API=$(jwt_hs256_string_payload "$API_KEY" "$JWTAPIKEY")
REACT_APP_APIKEY=$(jwt_hs256_string_payload "$PROXYKEY" "$JWTKEYPROXY")
LEGACY_APIKEY="$KEY_API"

substituir_env "$ENV_API" "API_KEY" "$API_KEY"
substituir_env "$ENV_API" "JWTAPIKEY" "$JWTAPIKEY"
substituir_env "$ENV_API" "JWTLOG" "$JWTLOG"
substituir_env "$ENV_API" "JWTLOGREFRESH" "$JWTLOGREFRESH"
substituir_env "$ENV_API" "JWTMAILUPDATE" "$JWTMAILUPDATE"
substituir_env "$ENV_API" "JWTMAILERTOKER" "$JWTMAILERTOKER"
substituir_env "$ENV_API" "JWTRECOVERY" "$JWTRECOVERY"
substituir_env "$ENV_API" "JWTQRCODESIGN" "$JWTQRCODESIGN"
substituir_env "$ENV_API" "JWTLOGINVESTIDOR" "$JWTLOGINVESTIDOR"

substituir_env "$ENV_PROXY" "PROXYKEY" "$PROXYKEY"
substituir_env "$ENV_PROXY" "JWTKEYPROXY" "$JWTKEYPROXY"
substituir_env "$ENV_PROXY" "KEY_API" "$KEY_API"

substituir_env "$ENV_FRONT" "REACT_APP_APIKEY" "$REACT_APP_APIKEY"
substituir_env "$ENV_ADDON" "LEGACY_APIKEY" "$LEGACY_APIKEY"

log "Chaves JWT/API gravadas nos .env. O restante das variáveis não foi mexido."

# ── 6. Limpar bancos ───────────────────────────────────────────────────────

limpar_banco() {
    local db="$1" preservar_sistema="$2"
    local tabelas tabela sql_file
    tabelas=$(mysql_scalar "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = '${db}' AND TABLE_TYPE = 'BASE TABLE' AND TABLE_NAME NOT IN ('knex_migrations', 'knex_migrations_lock');")
    sql_file=$(mktemp)
    {
        echo "SET FOREIGN_KEY_CHECKS=0;"
        while IFS= read -r tabela; do
            [ -n "$tabela" ] || continue
            identificador_sql "$tabela" "tabela em ${db}"
            if [ "$preservar_sistema" = "1" ] && [ "$tabela" = "tab_usuarios" ]; then
                continue
            fi
            printf 'DELETE FROM `%s`.`%s`;\n' "$db" "$tabela"
        done <<< "$tabelas"
        if [ "$preservar_sistema" = "1" ]; then
            printf "DELETE FROM \`%s\`.tab_usuarios WHERE id <> '%s';\n" "$db" "$SYSTEM_USER_ID"
            printf "UPDATE \`%s\`.tab_usuarios SET desafio_id = NULL, dois_fatores = 0 WHERE id = '%s';\n" "$db" "$SYSTEM_USER_ID"
        fi
        echo "SET FOREIGN_KEY_CHECKS=1;"
    } > "$sql_file"
    mysql_exec < "$sql_file"
    rm -f "$sql_file"
}

limpar_banco "$DB_API" 1
limpar_banco "$DB_ADDON" 0

SYSTEM_COUNT=$(mysql_scalar "SELECT COUNT(*) FROM \`${DB_API}\`.tab_usuarios WHERE id = '${SYSTEM_USER_ID}';")
[ "$SYSTEM_COUNT" = "1" ] || erro "usuário de sistema sumiu depois da limpeza de ${DB_API}. Insert do admin não foi feito."

log "Bancos ${DB_API} e ${DB_ADDON} esvaziados. Usuário de sistema mantido."

# ── 7. Filas do vhost ──────────────────────────────────────────────────────

FILAS=$(docker exec "$RABBITMQ_CONTAINER" rabbitmqctl list_queues --quiet -p "$RABBITMQ_VHOST" name)
while IFS= read -r fila; do
    [ -n "$fila" ] || continue
    [ "$fila" = "name" ] && continue
    echo "$fila" | grep -Eq '^[A-Za-z0-9_.:-]+$' || erro "nome de fila inesperado ('$fila')."
    docker exec "$RABBITMQ_CONTAINER" rabbitmqctl purge_queue "$fila" -p "$RABBITMQ_VHOST"
    log "Fila '${fila}' esvaziada no vhost '${RABBITMQ_VHOST}'."
done <<< "$FILAS"

# ── 8. Administrador ───────────────────────────────────────────────────────

ADMIN_ID=$(uuidgen | tr '[:upper:]' '[:lower:]')
DATA_AGORA=$(TZ=America/Sao_Paulo date '+%Y-%m-%d %H:%M:%S')
EMAIL_SQL=${ADMIN_EMAIL//\'/\'\'}

mysql_exec <<SQL
INSERT INTO \`${DB_API}\`.tab_usuarios (
    id, email, senha, data_criacao, dois_fatores, data_atualizacao,
    role, email_verificado, bloqueado, trocar_senha, deletado
) VALUES (
    '${ADMIN_ID}',
    '${EMAIL_SQL}',
    '${SENHA_HASH}',
    '${DATA_AGORA}',
    0,
    '${DATA_AGORA}',
    0,
    1,
    0,
    1,
    0
);
SQL

log "Administrador gravado em ${DB_API}.tab_usuarios."

# ── 9. Marcador e recriação dos containers ─────────────────────────────────

cat > "$CLIENT_DIR/.configurado" <<EOF
configurado_em=$(date -u +%Y-%m-%dT%H:%M:%SZ)
admin_email=${ADMIN_EMAIL}
slug=${CLIENT_SLUG}
EOF

log "Marcador gravado em ${CLIENT_DIR}/.configurado"
log "Recriando os containers de '${CLIENT_SLUG}' para carregar as chaves novas."

(
    cd "$CLIENT_DIR"
    docker compose -f docker-compose.yaml up -d --force-recreate
)

cat <<EOF

Cliente '${CLIENT_SLUG}' configurado.
Login: ${ADMIN_EMAIL}
Senha temporária: ${SENHA_ADMIN}
O primeiro login exige troca de senha.
O usuário de sistema permanece. O slug não foi alterado.
EOF
