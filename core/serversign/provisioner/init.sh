#!/bin/bash
set -euo pipefail

SIGNSERVER_HOST="${SIGNSERVER_HOST:-signserversignatureexperts}"
SIGNSERVER_HTTP_PORT="${SIGNSERVER_HTTP_PORT:-8080}"
HEALTH_URL="http://${SIGNSERVER_HOST}:${SIGNSERVER_HTTP_PORT}/signserver/healthcheck/signserverhealth"

echo "[provisioner] Aguardando SignServer em ${HEALTH_URL}..."
until curl -sf "$HEALTH_URL" >/dev/null 2>&1; do
  sleep 3
done
echo "[provisioner] Healthcheck OK."

# Garante que o entrypoint já inicializou o SoftHSM.
echo "[provisioner] Aguardando SoftHSM (arquivo /shared/softhsm-ready)..."
until docker exec "$SIGNSERVER_HOST" test -f /shared/softhsm-ready; do
  sleep 2
done

echo "[provisioner] Disparando provision-inside.sh no container ${SIGNSERVER_HOST}..."
docker exec \
  -e HSM_PIN \
  -e HSM_SO_PIN \
  -e HSM_TOKEN_LABEL \
  -e HSM_PKCS11_LIB \
  -e SIGNER_WORKER_NAME \
  -e SIGNER_KEY_ALIAS \
  -e SIGNER_DN \
  "$SIGNSERVER_HOST" \
  /opt/signatureexperts/provision-inside.sh

echo "[provisioner] Provisionamento concluído."
