#!/bin/bash

mkdir -p mtls
cd mtls

echo "🔐 Gerando CA..."
openssl genrsa -out ca.key 4096
openssl req -x509 -new -nodes -key ca.key -sha256 -days 365 -out ca.pem -subj "/CN=PsicErp"

# Extensões para uso de servidor
cat > server.ext <<EOF
basicConstraints=CA:FALSE
keyUsage = digitalSignature, keyEncipherment
extendedKeyUsage = serverAuth
subjectAltName = @alt_names
[alt_names]
DNS.1 = api
EOF

echo "📡 Gerando certificado da API Final (servidor)..."
openssl genrsa -out server.key 2048
openssl req -new -key server.key -out server.csr -subj "/CN=api"
openssl x509 -req -in server.csr -CA ca.pem -CAkey ca.key -CAcreateserial \
    -out server.crt -days 365 -sha256 -extfile server.ext

# Extensões para uso de cliente
cat > client.ext <<EOF
basicConstraints=CA:FALSE
keyUsage = digitalSignature, keyEncipherment
extendedKeyUsage = clientAuth
subjectAltName = @alt_names
[alt_names]
DNS.1 = proxy
EOF

echo "📡 Gerando certificado do ProxyAPI (cliente)..."
openssl genrsa -out client.key 2048
openssl req -new -key client.key -out client.csr -subj "/CN=proxy"
openssl x509 -req -in client.csr -CA ca.pem -CAkey ca.key -CAcreateserial \
    -out client.crt -days 365 -sha256 -extfile client.ext

# Permissões e cópia
chmod 644 *.crt *.key *.pem

echo "📂 Copiando para projetos..."

cp server.crt ../../psicErp/API/tls/server.crt
cp server.key ../../psicErp/API/tls/server.key
cp ca.pem     ../../psicErp/API/tls/ca.pem

cp client.crt ../../Proxy/API/tls/client.crt
cp client.key ../../Proxy/API/tls/client.key
cp ca.pem     ../../Proxy/API/tls/ca.pem

rm *

echo "✅ Certificados gerados e copiados!"
