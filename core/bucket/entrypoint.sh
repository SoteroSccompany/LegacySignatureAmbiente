#!/bin/sh
# Gera a config do S3 (identities + KMS via Vault Transit) a partir das
# variáveis de ambiente e sobe o SeaweedFS (master + volume + filer + s3).
set -e

mkdir -p /etc/seaweedfs

cat > /etc/seaweedfs/s3.config.json <<EOF
{
  "identities": [
    {
      "name": "admin",
      "credentials": [
        {
          "accessKey": "${BUCKET_ROOT_USER}",
          "secretKey": "${BUCKET_ROOT_PASSWORD}"
        }
      ],
      "actions": ["Admin", "Read", "List", "Tagging", "Write"]
    }
  ],
  "kms": {
    "default_provider": "vault",
    "providers": {
      "vault": {
        "type": "openbao",
        "address": "http://${VAULT_KMS_HOST}:8200",
        "token": "${VAULT_KMS_ROOT_TOKEN}",
        "transit_path": "transit",
        "cache_enabled": true,
        "cache_ttl": "1h"
      }
    }
  }
}
EOF

# -volume.max=0 → auto-dimensiona a quantidade de volumes pelo espaço em
# disco. O default (8) esgota rápido porque cada bucket vira uma collection
# própria, e cada collection aloca seu próprio grupo de volumes.
exec weed server \
    -dir=/data \
    -ip.bind=0.0.0.0 \
    -master.volumeSizeLimitMB=1024 \
    -volume.max=0 \
    -s3 \
    -s3.port=8333 \
    -s3.config=/etc/seaweedfs/s3.config.json
