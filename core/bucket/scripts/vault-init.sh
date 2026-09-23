#!/bin/sh
# One-shot idempotente para o Vault persistente (modo server + storage file):
#   1. inicializa o Vault na primeira subida (guarda unseal key/root token
#      em /vault/keys — mapeado para .docker/vault-keys, só para DEV);
#   2. desela (unseal) a cada subida — o Vault sempre nasce selado;
#   3. cria o token fixo VAULT_KMS_ROOT_TOKEN usado pelo SeaweedFS;
#   4. habilita o Transit Engine e cria a chave do SSE-KMS.
set -e

export VAULT_ADDR="http://${VAULT_KMS_HOST}:8200"
KEYS_FILE="/vault/keys/init-keys.txt"

echo "Aguardando o Vault responder em ${VAULT_ADDR}..."
# vault status: exit 0 = deselado, 2 = selado (ambos significam "no ar")
until vault status > /dev/null 2>&1 || [ $? -eq 2 ]; do sleep 1; done

INITIALIZED=$(vault status -format=json 2> /dev/null | grep -c '"initialized": true' || true)

if [ "$INITIALIZED" -eq 0 ]; then
    echo "Vault ainda nao inicializado — rodando operator init..."
    vault operator init -key-shares=1 -key-threshold=1 > "$KEYS_FILE"
    chmod 600 "$KEYS_FILE"
    echo "Unseal key e root token salvos em .docker/vault-keys/init-keys.txt (DEV)."
elif [ ! -f "$KEYS_FILE" ]; then
    echo "ERRO: Vault ja inicializado mas $KEYS_FILE nao existe."
    echo "Se os dados do Vault foram perdidos, limpe .docker/vault-data e suba de novo."
    exit 1
fi

UNSEAL_KEY=$(grep 'Unseal Key 1:' "$KEYS_FILE" | awk '{print $NF}')
ROOT_TOKEN=$(grep 'Initial Root Token:' "$KEYS_FILE" | awk '{print $NF}')

SEALED=$(vault status -format=json 2> /dev/null | grep -c '"sealed": true' || true)
if [ "$SEALED" -ne 0 ]; then
    vault operator unseal "$UNSEAL_KEY" > /dev/null
    echo "Vault deselado."
else
    echo "Vault ja estava deselado."
fi

export VAULT_TOKEN="$ROOT_TOKEN"

# Token fixo (definido no .env) usado pelo SeaweedFS para falar com o Transit
if vault token lookup "$VAULT_KMS_ROOT_TOKEN" > /dev/null 2>&1; then
    echo "Token do SeaweedFS ja existia."
else
    vault token create \
        -id="$VAULT_KMS_ROOT_TOKEN" \
        -policy=root \
        -orphan \
        -display-name="seaweedfs-sse-kms" > /dev/null
    echo "Token fixo do SeaweedFS criado."
fi

vault secrets enable transit 2> /dev/null \
    && echo "Transit Engine habilitado." \
    || echo "Transit Engine ja estava habilitado."

vault write -f "transit/keys/${BUCKET_KMS_KEY_NAME}" > /dev/null
echo "Chave de criptografia 'transit/keys/${BUCKET_KMS_KEY_NAME}' pronta."
