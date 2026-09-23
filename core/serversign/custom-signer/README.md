# custom-signer — CMSSigner com política ICP-Brasil (AD-RB)

Código-fonte Java do worker customizado que faz o `CMSSignerCarimbo` emitir o
atributo CAdES assinado `SignaturePolicyIdentifier` (`id-aa-ets-sigPolicyId`)
apontando para a Política de Assinatura AD-RB baseada em PAdES do ITI,
**sem trocar chave/certificado nem reimplementar nada do CMSSigner original**.

Contexto completo: `.cursor/plans/selo_icp-brasil,_worm_e_integridade_da_cadeia_e1d8d0fd.plan.md`
(seção L3.2) e `docs/relatorios/sprint-selo-icp-worm-integridade.md` (Leva 3).

## Por que não é Maven/pom.xml

A imagem `keyfactor/signserver-ce:latest` não traz Maven nem repositório de
dependências no build da imagem final (só o JDK que já vem para o runtime do
WildFly). Puxar o Maven Central durante o build da imagem de produção
adicionaria uma dependência de rede e uma superfície nova sem necessidade:
as duas classes daqui usam só BouncyCastle, que **já está presente** dentro
da própria imagem base (`/opt/keyfactor/signserver/lib/ext/bc*.jar`). Por
isso o build é feito com `javac`/`jar` puros, apontando o `-cp` para os jars
que já existem na imagem — ver `serversign/Dockerfile`.

## Classes

- `PoliticaAdRbSignedAttributeTableGenerator` — `CMSAttributeTableGenerator`
  que delega para o `DefaultSignedAttributeTableGenerator` (BouncyCastle,
  os mesmos atributos que o CMSSigner original já monta: content-type,
  message-digest, signing-time se configurado etc.) e **acrescenta** o
  atributo `SignaturePolicyIdentifier` por cima, com os valores oficiais do
  ITI (OID, hash interno da PA, URI — ver constantes na classe e L3.1 do
  relatório da sprint). Nunca remove nem substitui atributo existente.
- `CMSSignerComPoliticaAdRb` — estende `org.signserver.module.cmssigner.CMSSigner`
  e sobrescreve só `createSignerInfoGeneratorBuilder(...)` para plugar o
  gerador acima no `JcaSignerInfoGeneratorBuilder`. Todo o resto (chave,
  certificado, hashing client-side, detached signature, carimbo) continua
  sendo o `CMSSigner` original — zero reimplementação de crypto.

## Mecanismo de deploy (por que vai dentro do `SignServer-Module-CMSSigner-7.7.1.jar`)

A imagem CE **reconstrói o `signserver.ear`** a cada boot do container a
partir de uma lista fixa de jars em `/opt/keyfactor/signserver/lib/`
(mecanismo interno do entrypoint da imagem oficial, não documentado nas
propriedades de extensão do Keyfactor). Um jar novo colocado nesse
diretório, ou uma cópia manual dentro do `.ear` já implantado, **é
descartado** na próxima montagem — confirmado empiricamente subindo o
container do zero depois de cada tentativa.

O que sobrevive: **acrescentar classes dentro de um jar que já faz parte
dessa lista fixa**, porque esse jar continua sendo remontado no `.ear` a
cada boot com o conteúdo atual do arquivo. Por isso o `Dockerfile` compila
as duas classes e usa `jar uf SignServer-Module-CMSSigner-7.7.1.jar -C ...`
(update, aditivo — nenhuma classe/arquivo original do jar é removido ou
sobrescrito) no próprio `/opt/keyfactor/signserver/lib/`, ainda em tempo de
build da imagem. Validado subindo um container 100% novo a partir da imagem
buildada e confirmando (`jar tf` no `.ear` já montado dentro do container)
que as classes novas estão presentes depois do boot.

## Classpath de compilação (jars usados, já presentes na imagem base)

```
/opt/keyfactor/signserver/lib/*
/opt/keyfactor/signserver/lib/ext/*
```

Em particular, as classes do BouncyCastle usadas vêm de
`/opt/keyfactor/signserver/lib/ext/bcprov-jdk18on-1.84.jar`,
`bcpkix-jdk18on-1.84.jar` e `bcutil-jdk18on-1.84.jar` — a mesma versão
(1.84) que a própria imagem carrega em runtime para o `signserver.ear`
(confirmado via `docker exec <container> find /opt/keyfactor -iname '*bcprov*'`
no container de produção, somente leitura). Não é baixado nada do Maven
Central; nenhuma dependência nova entra na imagem.

## Build (dentro do Dockerfile da imagem)

```dockerfile
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
```

Sem estágio multi-stage: o JDK usado (`java-21-slim`) já é o mesmo que a
imagem base usa para rodar o WildFly, então não há JDK extra a remover da
imagem final — o `.java` fica só nesse diretório temporário do build, que é
removido (`rm -rf`) antes de terminar essa camada.

## Como validar depois de qualquer mudança nas classes

1. `docker build -f serversign/Dockerfile -t <tag-teste> serversign/`.
2. Suba um container isolado (volumes/porta próprios, **nunca** os volumes
   de produção `.docker/softhsm` / `.docker/shared`) a partir dessa imagem.
3. Confirme que as classes sobreviveram ao boot:
   ```
   docker exec <container> jar tf /opt/keyfactor/wildfly-39.0.1.Final/standalone/deployments/signserver.ear \
     | true # o CMSSigner está dentro de lib/SignServer-Module-CMSSigner-7.7.1.jar do próprio .ear
   ```
   (extraia o `.ear` com `jar xf` e depois `jar tf` no jar do CMSSigner —
   procure por `br/com/signatureexperts/signserver/`.)
4. Crie um crypto token + worker de teste (certificado de teste, **nunca** o
   e-CNPJ real) com `IMPLEMENTATION_CLASS=br.com.signatureexperts.signserver.CMSSignerComPoliticaAdRb`
   e assine um hash via `POST /signserver/rest/v1/workers/<worker>/process`.
5. Decodifique o CMS retornado com `openssl asn1parse -inform DER` e
   confirme o atributo `id-smime-aa-ets-sigPolicyId` (OpenSSL usa esse nome
   para o mesmo OID `1.2.840.113549.1.9.16.2.15`) com o OID/hash/URI
   esperados, e que os atributos pré-existentes (content-type,
   signing-time, message-digest) continuam lá.
