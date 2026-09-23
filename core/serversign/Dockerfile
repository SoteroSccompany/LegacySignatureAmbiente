# SignServer Community Edition (Keyfactor) + SoftHSM2 para custódia das
# chaves de assinatura. A imagem oficial só registra "P11 Proxy" no EAR
# pré-compilado; usamos a propriedade legada SHAREDLIBRARY (path absoluto)
# nos workers para apontar direto para o libsofthsm2.so — ver workers/.
FROM keyfactor/signserver-ce:latest

USER root

# AlmaLinux 9 (base da imagem oficial): softhsm vem do AppStream.
# curl-minimal já vem na imagem CE e conflita com o pacote curl.
RUN microdnf install -y softhsm opensc openssl-pkcs11 \
    && microdnf clean all \
    && mkdir -p \
    /var/lib/softhsm/tokens \
    /opt/signatureexperts/softhsm \
    /opt/signatureexperts/workers \
    && chown -R 10001:0 /var/lib/softhsm /opt/signatureexperts \
    && chmod -R g+rwX /var/lib/softhsm /opt/signatureexperts

# Registra SoftHSM também no deploy.properties (documentação / tooling).
# O EAR da imagem CE já foi buildado sem esse alias — por isso os workers
# usam SHAREDLIBRARY com path absoluto (ver workers/*.properties).
# CE 7.7+ só aceita KEYSTOREPATH em diretórios da allowlist — o A1 fica em /shared.
RUN printf '\n# SoftHSM2 — SignatureExperts (DEV)\ncryptotoken.p11.lib.80.name = SoftHSM 2\ncryptotoken.p11.lib.80.file = /usr/lib64/pkcs11/libsofthsm2.so\nkeystorecryptotoken.keystore.path.allowed.1=/shared/\n' \
    >> /opt/keyfactor/signserver-custom/conf/signserver_deploy.properties

COPY docker-entrypoint.sh /opt/signatureexperts/docker-entrypoint.sh
COPY workers/ /opt/signatureexperts/workers/
COPY provisioner/provision-inside.sh /opt/signatureexperts/provision-inside.sh

RUN chmod +x /opt/signatureexperts/docker-entrypoint.sh \
    /opt/signatureexperts/provision-inside.sh

# CMSSigner com política ICP-Brasil (SignaturePolicyIdentifier) — ver
# serversign/custom-signer/README.md. A imagem CE reconstrói o
# signserver.ear a cada boot a partir dos jars fixos em
# /opt/keyfactor/signserver/lib/ (lista de módulos do próprio SignServer);
# um jar novo nesse diretório é ignorado nessa remontagem. Por isso as
# classes novas são ACRESCENTADAS (jar uf, nada é removido/sobrescrito)
# dentro do SignServer-Module-CMSSigner-7.7.1.jar já existente, que é
# garantidamente incluído em todo boot. O JDK usado é o mesmo que já vem
# na imagem base (usado em runtime pelo WildFly) — sem Maven, sem estágio
# de build extra, imagem final não cresce além do código-fonte compilado.
COPY custom-signer/src /opt/signatureexperts/custom-signer-src/src

RUN set -eux; \
    JAVA_BIN=/usr/lib/jvm/java-21-slim/bin; \
    SS_LIB=/opt/keyfactor/signserver/lib; \
    BUILD_DIR=/tmp/custom-signer-build; \
    mkdir -p "$BUILD_DIR/classes"; \
    "$JAVA_BIN/javac" -cp "$SS_LIB/*:$SS_LIB/ext/*" -d "$BUILD_DIR/classes" \
        $(find /opt/signatureexperts/custom-signer-src/src -name '*.java'); \
    "$JAVA_BIN/jar" uf "$SS_LIB/SignServer-Module-CMSSigner-7.7.1.jar" \
        -C "$BUILD_DIR/classes" br/com/signatureexperts/signserver/CMSSignerComPoliticaAdRb.class \
        -C "$BUILD_DIR/classes" br/com/signatureexperts/signserver/PoliticaAdRbSignedAttributeTableGenerator.class; \
    chown 10001:0 "$SS_LIB/SignServer-Module-CMSSigner-7.7.1.jar"; \
    rm -rf "$BUILD_DIR" /opt/signatureexperts/custom-signer-src

USER 10001

EXPOSE 8080 8443

ENTRYPOINT ["/opt/signatureexperts/docker-entrypoint.sh"]
