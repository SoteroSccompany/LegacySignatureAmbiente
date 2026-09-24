#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")"

API_HOST=$(grep -E '^API_HOST=' .env.proxy | tail -n1 | cut -d= -f2-)
[ -n "$API_HOST" ] || { echo "API_HOST vazio em .env.proxy" >&2; exit 1; }

tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT

openssl genrsa -out "$tmp/ca.key" 4096
openssl req -x509 -new -nodes -key "$tmp/ca.key" -sha256 -days 3650 \
  -out "$tmp/ca.pem" -subj "/CN=LegacySignature-CA"

openssl genrsa -out "$tmp/server.key" 2048
openssl req -new -key "$tmp/server.key" -out "$tmp/server.csr" -subj "/CN=${API_HOST}"
printf '%s\n' \
  "basicConstraints=CA:FALSE" \
  "keyUsage=digitalSignature,keyEncipherment" \
  "extendedKeyUsage=serverAuth" \
  "subjectAltName=DNS:${API_HOST},DNS:localhost" > "$tmp/server.ext"
openssl x509 -req -in "$tmp/server.csr" -CA "$tmp/ca.pem" -CAkey "$tmp/ca.key" \
  -CAcreateserial -out "$tmp/server.crt" -days 825 -sha256 -extfile "$tmp/server.ext"

openssl genrsa -out "$tmp/client.key" 2048
openssl req -new -key "$tmp/client.key" -out "$tmp/client.csr" -subj "/CN=proxysignature"
printf '%s\n' \
  "basicConstraints=CA:FALSE" \
  "keyUsage=digitalSignature,keyEncipherment" \
  "extendedKeyUsage=clientAuth" > "$tmp/client.ext"
openssl x509 -req -in "$tmp/client.csr" -CA "$tmp/ca.pem" -CAkey "$tmp/ca.key" \
  -CAcreateserial -out "$tmp/client.crt" -days 825 -sha256 -extfile "$tmp/client.ext"

mkdir -p api/tls proxy/tls
cp "$tmp/ca.pem" "$tmp/server.key" "$tmp/server.crt" api/tls/
cp "$tmp/ca.pem" "$tmp/client.key" "$tmp/client.crt" proxy/tls/