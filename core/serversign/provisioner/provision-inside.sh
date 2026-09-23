#!/bin/bash
# Roda DENTRO do container do SignServer (via docker exec do provisioner).
# Idempotente: se o marker existir, só confirma o status.
set -euo pipefail

export SOFTHSM2_CONF="${SOFTHSM2_CONF:-/opt/signatureexperts/softhsm/softhsm2.conf}"
export SIGNSERVER_HOME="${SIGNSERVER_HOME:-/opt/keyfactor/signserver}"
CLI="/opt/keyfactor/bin/signserver"

SIGNER_WORKER_NAME="${SIGNER_WORKER_NAME:-CMSSignerCarimbo}"
SIGNER_KEY_ALIAS="${SIGNER_KEY_ALIAS:-carimbo-key}"
HSM_PIN="${HSM_PIN:?HSM_PIN precisa estar definida}"
HSM_TOKEN_LABEL="${HSM_TOKEN_LABEL:-signatureexperts}"
HSM_PKCS11_LIB="${HSM_PKCS11_LIB:-/usr/lib64/pkcs11/libsofthsm2.so}"

MARKER="/shared/provisioned.ok"
WORKDIR="/shared/provision"
mkdir -p "$WORKDIR"

if [ -f "$MARKER" ]; then
  echo "[provision-inside] Já provisionado (${MARKER}). Status atual:"
  "$CLI" getstatus brief all || true
  exit 0
fi

if [ ! -f /shared/softhsm-ready ]; then
  echo "[provision-inside] ERRO: SoftHSM ainda não está pronto (/shared/softhsm-ready ausente)."
  exit 1
fi

echo "[provision-inside] Token SoftHSM='${HSM_TOKEN_LABEL}', worker=${SIGNER_WORKER_NAME}, key=${SIGNER_KEY_ALIAS}"

sed \
  -e "s|\${HSM_TOKEN_LABEL}|${HSM_TOKEN_LABEL}|g" \
  -e "s|\${HSM_PIN}|${HSM_PIN}|g" \
  -e "s|\${SIGNER_KEY_ALIAS}|${SIGNER_KEY_ALIAS}|g" \
  /opt/signatureexperts/workers/crypto-token.properties \
  > "$WORKDIR/crypto-token.properties"
sed \
  -e "s|\${SIGNER_WORKER_NAME}|${SIGNER_WORKER_NAME}|g" \
  -e "s|\${SIGNER_KEY_ALIAS}|${SIGNER_KEY_ALIAS}|g" \
  /opt/signatureexperts/workers/cms-signer.properties \
  > "$WORKDIR/cms-signer.properties"

# --- Crypto Token ---
if ! "$CLI" getstatus brief CryptoTokenSoftHSM 2>/dev/null | grep -q "CryptoTokenSoftHSM"; then
  echo "[provision-inside] Criando CryptoTokenSoftHSM..."
  "$CLI" setproperties "$WORKDIR/crypto-token.properties"
  "$CLI" reload CryptoTokenSoftHSM
else
  echo "[provision-inside] CryptoTokenSoftHSM já existe."
fi

echo "[provision-inside] Gerando chave RSA '${SIGNER_KEY_ALIAS}' no SoftHSM (idempotente)..."
if ! "$CLI" testkey CryptoTokenSoftHSM "${SIGNER_KEY_ALIAS}" 2>/dev/null | grep -q SUCCESS; then
  "$CLI" generatekey CryptoTokenSoftHSM -alias "${SIGNER_KEY_ALIAS}" -keyalg RSA -keyspec 2048
fi
"$CLI" setproperty CryptoTokenSoftHSM DEFAULTKEY "${SIGNER_KEY_ALIAS}"
"$CLI" reload CryptoTokenSoftHSM
"$CLI" activatecryptotoken CryptoTokenSoftHSM "${HSM_PIN}"

# --- CMS Signer ---
if ! "$CLI" getstatus brief "${SIGNER_WORKER_NAME}" 2>/dev/null | grep -q "${SIGNER_WORKER_NAME}"; then
  echo "[provision-inside] Criando signer '${SIGNER_WORKER_NAME}'..."
  "$CLI" setproperties "$WORKDIR/cms-signer.properties"
  "$CLI" reload "${SIGNER_WORKER_NAME}"
else
  echo "[provision-inside] Signer '${SIGNER_WORKER_NAME}' já existe."
fi

# O generatekey do SignServer já cria um certificado "dummy" no SoftHSM
# (CESeCore). Em DEV usamos esse cert; em produção troque por um emitido
# por AC a partir de `signserver generatecertreq`.
CERT_DER="$WORKDIR/carimbo-cert.der"
CERT_PEM="$WORKDIR/carimbo-cert.pem"

if [ ! -f "$CERT_PEM" ]; then
  echo "[provision-inside] Exportando certificado do SoftHSM e associando ao signer..."
  pkcs11-tool --module "${HSM_PKCS11_LIB}" --token-label "${HSM_TOKEN_LABEL}" --pin "${HSM_PIN}" \
    --read-object --type cert --label "${SIGNER_KEY_ALIAS}" -o "$CERT_DER"
  openssl x509 -inform DER -in "$CERT_DER" -out "$CERT_PEM"
  "$CLI" uploadsignercertificate "${SIGNER_WORKER_NAME}" GLOB "$CERT_PEM"
  "$CLI" uploadsignercertificatechain "${SIGNER_WORKER_NAME}" GLOB "$CERT_PEM"
  "$CLI" reload "${SIGNER_WORKER_NAME}"
fi

echo "[provision-inside] Status final:"
"$CLI" getstatus brief all || true

date -u +"%Y-%m-%dT%H:%M:%SZ" > "$MARKER"
echo "[provision-inside] Provisionamento concluído → ${MARKER}"
