#!/bin/bash
# Sobe a stack inteira, cada compose a partir da própria pasta.
# Não junta os arquivos com vários -f: path relativo de bucket e serversign
# quebra se o contexto for resolvido a partir de core/.
#
# Ordem: bucket, serversign, core e depois cada cliente em clientes/,
# exceto _template.
#
# Uso, na raiz do repositório:
#   ./provisioner.sh

set -euo pipefail

ROOT=$(cd "$(dirname "$0")" && pwd)
CORE="$ROOT/core"
CLIENTES="$ROOT/clientes"

log() { echo "[provisioner] $*"; }
erro() { echo "[provisioner] ERRO: $*" >&2; exit 1; }

command -v docker >/dev/null 2>&1 || erro "docker não encontrado no PATH."

subir() {
    local dir="$1"
    [ -f "$dir/docker-compose.yaml" ] || erro "docker-compose.yaml não encontrado em '$dir'."
    log "Subindo $dir"
    (
        cd "$dir"
        docker compose -f docker-compose.yaml up -d --build
    )
}

subir "$CORE/bucket"
subir "$CORE/serversign"
subir "$CORE"

[ -d "$CLIENTES" ] || erro "pasta de clientes não encontrada em '$CLIENTES'."

for dir in "$CLIENTES"/*; do
    [ -d "$dir" ] || continue
    nome=$(basename "$dir")
    [ "$nome" = "_template" ] && continue
    [ -f "$dir/docker-compose.yaml" ] || continue
    subir "$dir"
done

log "Containers no ar. _template não entrou."
