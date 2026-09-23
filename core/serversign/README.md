# ServerSign (SignServer CE + SoftHSM2) — SignatureExperts

Stack isolada de **assinatura digital** (PKCS#7/CMS) usada pelo backend para carimbar documentos. O backend **não** precisa do SoftHSM localmente: envia o hash SHA-256 via HTTP e recebe o pacote assinado. Roda em `docker-compose` próprio, separado da aplicação principal — mesmo padrão do módulo [`bucket/`](../bucket/).

Documentação oficial: [SignServer CE (Keyfactor)](https://docs.keyfactor.com/signserver/) · imagem [`keyfactor/signserver-ce`](https://hub.docker.com/r/keyfactor/signserver-ce/)

> SignServer Community Edition é LGPL e indicado pela Keyfactor para **aprendizado / testes / prototipagem**. Para produção com HSM certificado, auditoria e suporte, avaliar o SignServer Enterprise.

## Índice

- [Arquitetura](#arquitetura)
- [Como esta stack está montada](#como-esta-stack-está-montada)
- [Subindo o ambiente](#subindo-o-ambiente)
- [Variáveis de ambiente](#variáveis-de-ambiente)
- [SoftHSM2 (gestão de chaves)](#softhsm2-gestão-de-chaves)
- [Provisionamento automático](#provisionamento-automático)
- [Como o backend assina (API)](#como-o-backend-assina-api)
- [Admin Web](#admin-web)
- [Boas práticas / próximos passos](#boas-práticas--próximos-passos)

## Arquitetura

```
Backend (API)                    serversign/ (rede isolada)
─────────────                    ─────────────────────────
POST hash SHA-256 (32 bytes)
        │
        ▼ HTTP ─────────────────▶  SignServer CE
                                   │  CMSSignerCarimbo
                                   │  CryptoTokenSoftHSM
                                   ▼
                                   SoftHSM2 (PKCS#11)
                                   chave RSA nunca sai do token
                                        │
                                        ▼
                              PKCS#7 / CMS (detached)
```

Dois serviços, no mesmo espírito do `bucket/` (MinIO + `mc`):

| Serviço | Papel |
|---|---|
| **`signserversignatureexperts`** | SignServer CE + SoftHSM2 — guarda as chaves e assina |
| **`provisionerserversignatureexperts`** | One-shot: cria crypto token, gera chave, emite cert DEV e configura o CMSSigner |

## Como esta stack está montada

```
serversign/
├── Dockerfile                 # keyfactor/signserver-ce + SoftHSM2 + entrypoint
├── docker-entrypoint.sh       # init do token SoftHSM → start.sh oficial
├── docker-compose.yaml        # stack isolada (SignServer + provisioner)
├── env-example.txt            # template das variáveis
├── workers/
│   ├── crypto-token.properties
│   └── cms-signer.properties
├── provisioner/
│   ├── Dockerfile             # docker:cli + curl (dispara AdminCLI via docker exec)
│   ├── init.sh
│   └── provision-inside.sh    # roda DENTRO do container do SignServer
└── README.md
```

Persistência (volumes locais, ignorados pelo `.gitignore` via `.docker/`):

| Volume | Conteúdo |
|---|---|
| `serversign/.docker/signserver-data` | H2 embutido do SignServer (config de workers, audit) |
| `serversign/.docker/softhsm` | Tokens SoftHSM2 (chaves privadas) |
| `serversign/.docker/shared` | Slot do SoftHSM, marker de provisionamento, CSR/cert DEV |

A stack tem `name: signatureexperts-serversign` e rede própria (`signatureexpertsserversignnetwork`), isolada da `legacysignaturenetwork` do compose raiz.

> A imagem oficial é **linux/amd64**. Em Mac Apple Silicon o Compose força `platform: linux/amd64` (emulação).

## Subindo o ambiente

Da pasta `serversign/`:

```bash
cp env-example.txt .env
# preencha HSM_PIN e HSM_SO_PIN (ex: openssl rand -hex 8)

docker compose --env-file .env up -d --build
```

Ou, da raiz do projeto:

```bash
docker compose -f serversign/docker-compose.yaml --env-file serversign/.env up -d --build
```

Acompanhar o provisionamento:

```bash
docker logs -f provisionerserversignatureexperts
```

Healthcheck do SignServer:

```bash
curl -sf http://localhost:8080/signserver/healthcheck/signserverhealth
# esperado: ALLOK
```

## Variáveis de ambiente

Definidas em `serversign/.env` (use `env-example.txt` como template):

| Variável | Descrição |
|---|---|
| `SIGNSERVER_HOST` | Nome do container (`signserversignatureexperts`) |
| `SIGNSERVER_HTTP_PORT` / `SIGNSERVER_HTTPS_PORT` | Portas expostas no host (8080 / 8443) |
| `SIGNSERVER_ALLOW_ANY` | `true` em DEV libera Admin Web sem client-cert |
| `HSM_TOKEN_LABEL` | Label do token SoftHSM (`signatureexperts`) |
| `HSM_PIN` / `HSM_SO_PIN` | PIN do usuário e do SO do token |
| `HSM_PKCS11_LIB` | Path da lib PKCS#11 dentro do container |
| `SIGNER_WORKER_NAME` | Nome do worker CMS (`CMSSignerCarimbo`) |
| `SIGNER_KEY_ALIAS` | Alias da chave no SoftHSM (`carimbo-key`) |

## SoftHSM2 (gestão de chaves)

O SoftHSM2 é um HSM em software (PKCS#11). Em DEV ele vive **dentro** do mesmo container do SignServer; o entrypoint:

1. cria o token (label `HSM_TOKEN_LABEL`) na primeira subida;
2. grava o número do slot em `/shared/softhsm-slot` para o provisioner;
3. inicia o SignServer oficial (`/opt/keyfactor/bin/start.sh`).

As chaves de assinatura ficam no token (atributo `CKA_EXTRACTABLE=false`). Em produção, troque SoftHSM por um HSM real (YubiHSM2, Luna, Utimaco, CloudHSM) — o worker só muda `SHAREDLIBRARY` / slot / PIN.

> A imagem CE só registra o alias `P11 Proxy` no EAR pré-compilado. Por isso os workers usam a propriedade legada **`SHAREDLIBRARY`** com o path absoluto `/usr/lib64/pkcs11/libsofthsm2.so`, em vez de `SHAREDLIBRARYNAME=SoftHSM 2`.

## Provisionamento automático

O provisioner (one-shot) espera o healthcheck e executa o AdminCLI **dentro** do container do SignServer:

1. cria o crypto worker `CryptoTokenSoftHSM` (PKCS#11 → SoftHSM);
2. gera a chave RSA-2048 `carimbo-key` (se ainda não existir);
3. cria o worker `CMSSignerCarimbo` com **client-side hashing** (SHA-256);
4. exporta o certificado dummy que o SignServer cria junto com a chave (CESeCore) e associa ao signer — em produção troque por cert de AC via `generatecertreq`;
5. grava o marker `/shared/provisioned.ok`.

Reexecutar o provisioner é seguro (idempotente). Para reprovisionar do zero em DEV:

```bash
docker compose --env-file .env down
rm -rf .docker/signserver-data .docker/softhsm .docker/shared
docker compose --env-file .env up -d --build
```

## Como o backend assina (API)

Com client-side hashing, o backend calcula o SHA-256 do trecho do PDF (ByteRange) e envia **só o digest** (32 bytes). É obrigatório informar o algoritmo no metadata:

```bash
# digest.bin = exatamente 32 bytes (SHA-256)
curl -sS -X POST "http://localhost:8080/signserver/process" \
  -F "workerName=CMSSignerCarimbo" \
  -F "REQUEST_METADATA.CLIENTSIDE_HASHDIGESTALGORITHM=SHA-256" \
  -F "filereceivefile=@digest.bin;type=application/octet-stream" \
  -o signature.p7s
```

Interface REST:

```bash
DIGEST_B64="$(base64 < digest.bin | tr -d '\n')"

curl -sS -X POST \
  "http://localhost:8080/signserver/rest/v1/workers/CMSSignerCarimbo/process" \
  -H "Content-Type: application/json" \
  -d "{\"data\":\"${DIGEST_B64}\",\"encoding\":\"BASE64\",\"metaData\":{\"CLIENTSIDE_HASHDIGESTALGORITHM\":\"SHA-256\"}}"
```

Resposta: PKCS#7/CMS **detached**, pronto para embutir no dicionário `/Sig` do PDF (PAdES).

## Admin Web

Com `SIGNSERVER_ALLOW_ANY=true`:

- Client Web: `http://localhost:8080/signserver/`
- Admin Web: `http://localhost:8080/signserver/adminweb`

Em produção, volte `ALLOW_ANY=false` e monte um Management CA em `/mnt/external/secrets/tls/cas/` (padrão Keyfactor).

## Certificado de produção (e-CNPJ da empresa)

O CMS que a API embute no PDF (selo único da plataforma) usa o certificado deste worker — é ele que
aparece no [validar.iti.gov.br](https://validar.iti.gov.br) como "assinado por". Em produção o
certificado precisa identificar a **empresa**, não uma pessoa física:

1. Gerar o CSR na própria chave do HSM (a chave privada nunca sai do token):

```bash
docker exec -it signserversignatureexperts \
  /opt/keyfactor/bin/signserver generatecertreq CMSSignerCarimbo \
  "CN=<Razão Social>, O=<Razão Social>, OID.2.16.76.1.3.3=<CNPJ>, C=BR" \
  SHA256withRSA /tmp/carimbo.csr
```

2. Emitir na AC ICP-Brasil um **e-CNPJ A1** (ou certificado de equipamento/aplicação) a partir desse
   CSR — o DN deve trazer a razão social e o CNPJ, nunca o e-CPF de um sócio (senão o ITI mostra o
   nome da pessoa física).
3. Instalar o certificado **e a cadeia completa** (AC intermediária + raiz):

```bash
/opt/keyfactor/bin/signserver uploadsignercertificate CMSSignerCarimbo GLOB cert.pem
/opt/keyfactor/bin/signserver uploadsignercertificatechain CMSSignerCarimbo GLOB chain.pem
/opt/keyfactor/bin/signserver reload CMSSignerCarimbo
```

Sem a cadeia completa o validador do ITI não constrói o caminho de certificação até a raiz ICP-Brasil
e a assinatura aparece como "indeterminada".

> DEV: o provisioner usa um cert dummy autoassinado (CESeCore) com CN igual ao alias da chave. Se quiser
> que os testes locais já exibam a razão social, apague `.docker/softhsm` + `.docker/shared` e regenere
> a chave com o cert dummy trocado por um autoassinado com o DN da empresa.

## Boas práticas / próximos passos

- **Não** use o certificado autoassinado de DEV em produção — troque por certificado emitido por AC (ICP-Brasil ou interna) a partir do CSR (`signserver generatecertreq`), conforme a seção acima.
- Restrinja `AUTHTYPE` do CMSSigner (client-cert / credential) antes de expor a porta fora da rede Docker.
- Para HSM real: mantenha o mesmo modelo de crypto worker; só troque lib/slot/PIN.
- Conecte esta rede à `legacysignaturenetwork` (ou use o host port) quando a API for consumir o SignServer.
- Avalie SignServer Enterprise + HSM certificado quando for para produção.
