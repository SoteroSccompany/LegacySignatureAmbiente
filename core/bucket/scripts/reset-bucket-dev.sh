#!/bin/sh
# One-shot MANUAL: reseta o stack de bucket para ambiente de DEV/teste, do zero.
#   - Os buckets de vault (vault-signatureexperts, ledger-assinatura-signatureexperts,
#     ledger-solicitacao-signatureexperts) tem Object Lock em modo COMPLIANCE (WORM,
#     ver provision.sh) — objetos ali NAO podem ser apagados via delete-object antes
#     do prazo de retencao (BUCKET_RETENTION_YEARS). O reset seguro e' derrubar os
#     containers + apagar os VOLUMES docker inteiros, deixando o provisionador
#     recriar tudo do zero no proximo `docker compose up`.
#   - NUNCA rodar isso em produção. So' para ambiente de DEV/teste.
set -e

echo "############################################################"
echo "# ATENCAO: isso e' DESTRUTIVO."
echo "# Vai derrubar os containers do stack de bucket e apagar os"
echo "# volumes .docker/bucket-data, .docker/vault-data e"
    20|echo "# .docker/vault-keys — TODOS os buckets e objetos serao"
echo "# perdidos (WIP e VAULT, inclusive os WORM)."
echo "# So' use isso em ambiente de DEV/teste, nunca em producao."
echo "############################################################"

read -p "Confirma? (s/N) " CONFIRMA
if [ "$CONFIRMA" != "s" ] && [ "$CONFIRMA" != "S" ]; then
    echo "Abortado."
    exit 0
fi

    30|SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)
BUCKET_DIR="$SCRIPT_DIR/.."

cd "$BUCKET_DIR"

echo "Derrubando containers e volumes nomeados do stack de bucket..."
docker compose -f docker-compose.yaml down -v

echo "Removendo diretorios de volume (bucket-data, vault-data, vault-keys)..."
rm -rf "$BUCKET_DIR/.docker/bucket-data"
    40|rm -rf "$BUCKET_DIR/.docker/vault-data"
rm -rf "$BUCKET_DIR/.docker/vault-keys"

echo "Reset concluido."
echo "Rode 'docker compose -f docker-compose.yaml up -d' para que"
echo "vaultkmssignatureexperts + vaultinitsignatureexperts +"
echo "bucketsignatureexperts + provisionersignatureexperts recriem"
echo "tudo do zero (buckets vazios, sem nenhum objeto)."
