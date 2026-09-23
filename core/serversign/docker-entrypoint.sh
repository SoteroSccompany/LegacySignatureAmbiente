#!/bin/bash
set -euo pipefail

SOFTHSM_DIR="/opt/signatureexperts/softhsm"
TOKEN_DIR="${SOFTHSM_DIR}/tokens"
CONF_FILE="${SOFTHSM_DIR}/softhsm2.conf"

TOKEN_LABEL="${HSM_TOKEN_LABEL:-signatureexperts}"
LIB="${HSM_PKCS11_LIB:-/usr/lib64/pkcs11/libsofthsm2.so}"
PIN="${HSM_PIN:?HSM_PIN precisa estar definida}"
SO_PIN="${HSM_SO_PIN:?HSM_SO_PIN precisa estar definida}"

mkdir -p "$TOKEN_DIR"

if [ ! -f "$CONF_FILE" ]; then
  cat > "$CONF_FILE" <<CONF
directories.tokendir = ${TOKEN_DIR}
objectstore.backend = file
log.level = INFO
CONF
fi

export SOFTHSM2_CONF="$CONF_FILE"

# Token SoftHSM (persistido em volume) — criado uma única vez.
if ! softhsm2-util --show-slots 2>/dev/null | grep -q "Label:[[:space:]]*${TOKEN_LABEL}"; then
  echo "[serversign] Inicializando token SoftHSM '${TOKEN_LABEL}' (primeira execução)..."
  softhsm2-util --init-token --free --label "${TOKEN_LABEL}" --pin "${PIN}" --so-pin "${SO_PIN}"
else
  echo "[serversign] Token SoftHSM '${TOKEN_LABEL}' já existe, reutilizando."
fi

echo "[serversign] SoftHSM pronto (lib=${LIB}, label=${TOKEN_LABEL})."
softhsm2-util --show-slots || true

mkdir -p /shared
printf '%s' "$TOKEN_LABEL" > /shared/softhsm-token-label
# Marker para o provisioner saber que o entrypoint concluiu o init do HSM.
touch /shared/softhsm-ready

exec /opt/keyfactor/bin/start.sh
