#!/usr/bin/env bash
# Gera CA de gestão + certificado de cliente para Admin Web (DEV).
# Uso: ./certs.sh [senha-do-p12]
# Sem argumento, a senha do admin.p12 é foo@122.
# Compatível com macOS e Linux (openssl / LibreSSL).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
OUT="${ROOT}/certs"
# Senha do .p12: 1º argumento da linha de comando, senão foo@122
P12_PASS="${1:-foo@122}"

rm -rf "${OUT}"
mkdir -p "${OUT}"
cd "${OUT}"

# --- Management CA ---
cat > ca.cnf <<'EOF'
[req]
distinguished_name = req_dn
x509_extensions = v3_ca
prompt = no

[req_dn]
CN = SignatureExperts Management CA

[v3_ca]
basicConstraints = critical, CA:TRUE, pathlen:0
keyUsage = critical, keyCertSign, cRLSign
subjectKeyIdentifier = hash
EOF

openssl req -x509 -newkey rsa:2048 -nodes \
  -keyout ManagementCA.key \
  -out ManagementCA.pem \
  -days 3650 \
  -config ca.cnf

# --- Client cert (Admin Web) ---
cat > admin-req.cnf <<'EOF'
[req]
distinguished_name = req_dn
prompt = no

[req_dn]
CN = SignServer Admin
EOF

openssl req -newkey rsa:2048 -nodes \
  -keyout admin.key \
  -out admin.csr \
  -config admin-req.cnf

cat > admin.ext <<'EOF'
basicConstraints = CA:FALSE
keyUsage = critical, digitalSignature
extendedKeyUsage = clientAuth
subjectKeyIdentifier = hash
authorityKeyIdentifier = keyid,issuer
EOF

openssl x509 -req \
  -in admin.csr \
  -CA ManagementCA.pem \
  -CAkey ManagementCA.key \
  -CAcreateserial \
  -out admin.crt \
  -days 3650 \
  -extfile admin.ext

# PEM combinado (cert + chave)
cat admin.crt admin.key > admin-identity.pem

# PKCS#12 (algoritmos amplamente suportados)
openssl pkcs12 -export \
  -out admin.p12 \
  -inkey admin.key \
  -in admin.crt \
  -certfile ManagementCA.pem \
  -name "SignServer Admin" \
  -keypbe PBE-SHA1-3DES \
  -certpbe PBE-SHA1-3DES \
  -macalg sha1 \
  -passout "pass:${P12_PASS}"

rm -f admin.csr admin.ext ca.cnf admin-req.cnf ManagementCA.srl

chmod 600 ManagementCA.key admin.key admin-identity.pem admin.p12

echo "Gerado em ${OUT}:"
ls -la
