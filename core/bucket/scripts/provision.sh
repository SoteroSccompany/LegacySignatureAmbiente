#!/bin/sh
# One-shot: cria e configura os buckets no SeaweedFS (idempotente).
#   - WIP                         → SSE-KMS default, SEM Object Lock
#   - VAULT (PDF final)           → SSE-KMS + Object Lock COMPLIANCE (WORM)
#   - VAULT LEDGER ASSINATURA     → SSE-KMS + Object Lock COMPLIANCE (WORM)
#   - VAULT LEDGER SOLICITACAO    → SSE-KMS + Object Lock COMPLIANCE (WORM)
set -e

ENDPOINT_URL="http://${BUCKET_HOST}:8333"

echo "Aguardando a API S3 subir em ${ENDPOINT_URL}..."
until aws --endpoint-url "$ENDPOINT_URL" s3 ls > /dev/null 2>&1; do sleep 1; done

SSE_KMS_CONFIG="{
  \"Rules\": [
    {
      \"ApplyServerSideEncryptionByDefault\": {
        \"SSEAlgorithm\": \"aws:kms\",
        \"KMSMasterKeyID\": \"${BUCKET_KMS_KEY_NAME}\"
      },
      \"BucketKeyEnabled\": true
    }
  ]
}"

provision_worm_bucket() {
    _name="$1"
    _label="$2"

    aws --endpoint-url "$ENDPOINT_URL" s3api create-bucket \
        --bucket "$_name" \
        --object-lock-enabled-for-bucket 2> /dev/null \
        && echo "Bucket '${_name}' (${_label}) criado com Object Lock." \
        || echo "Bucket '${_name}' (${_label}) já existia."

    aws --endpoint-url "$ENDPOINT_URL" s3api put-bucket-encryption \
        --bucket "$_name" \
        --server-side-encryption-configuration "$SSE_KMS_CONFIG"
    echo "SSE-KMS default aplicado em '${_name}' (chave: ${BUCKET_KMS_KEY_NAME})."

    aws --endpoint-url "$ENDPOINT_URL" s3api put-object-lock-configuration \
        --bucket "$_name" \
        --object-lock-configuration "{
          \"ObjectLockEnabled\": \"Enabled\",
          \"Rule\": {
            \"DefaultRetention\": {
              \"Mode\": \"COMPLIANCE\",
              \"Years\": ${BUCKET_RETENTION_YEARS}
            }
          }
        }"
    echo "Retencao COMPLIANCE de ${BUCKET_RETENTION_YEARS} ano(s) aplicada em '${_name}'."
}

# ── 1. Bucket WIP (rascunho: aceita sobrescrita) ────────────────────────────
aws --endpoint-url "$ENDPOINT_URL" s3api create-bucket \
    --bucket "$BUCKET_NAME_WIP" 2> /dev/null \
    && echo "Bucket '${BUCKET_NAME_WIP}' criado." \
    || echo "Bucket '${BUCKET_NAME_WIP}' já existia."

aws --endpoint-url "$ENDPOINT_URL" s3api put-bucket-encryption \
    --bucket "$BUCKET_NAME_WIP" \
    --server-side-encryption-configuration "$SSE_KMS_CONFIG"
echo "SSE-KMS default aplicado em '${BUCKET_NAME_WIP}' (chave: ${BUCKET_KMS_KEY_NAME})."

# ── 2. Vaults WORM ─────────────────────────────────────────────────────────
provision_worm_bucket "$BUCKET_NAME_VAULT" "PDF final"
provision_worm_bucket "$BUCKET_NAME_VAULT_LEDGER_ASSINATURA" "Ledger assinatura"
provision_worm_bucket "$BUCKET_NAME_VAULT_LEDGER_SOLICITACAO" "Ledger solicitacao"

echo "Provisionamento concluido."
