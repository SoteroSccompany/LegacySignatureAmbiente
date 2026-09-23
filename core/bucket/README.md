# Bucket (SeaweedFS + Vault) — SignatureExperts

Stack isolada de **object storage** (compatível com S3) usada para guardar os documentos/PDFs assinados de forma **imutável**, atendendo à exigência de retenção da MP 2.200-2 (ICP-Brasil). Roda em `docker-compose` próprio, separado da aplicação principal.

A criptografia em repouso (**SSE-KMS**) é feita de forma nativa pelo SeaweedFS usando o **Transit Engine do HashiCorp Vault** como KMS — as chaves de criptografia nunca ficam no storage, ficam no cofre.

Documentação oficial de referência:

- [SeaweedFS — deploy](https://seaweedfs.com/docs/deploy/)
- [SeaweedFS — Server Side Encryption SSE-KMS](https://github.com/seaweedfs/seaweedfs/wiki/Server-Side-Encryption-SSE-KMS)
- [SeaweedFS — S3 Object Lock and Retention](https://github.com/seaweedfs/seaweedfs/wiki/S3-Object-Lock-and-Retention)
- [Vault — Transit Secrets Engine](https://developer.hashicorp.com/vault/docs/secrets/transit)

## Índice

- [O que é o SeaweedFS](#o-que-é-o-seaweedfs)
- [Arquitetura: WIP Bucket + Vault Bucket](#arquitetura-wip-bucket--vault-bucket)
- [Como esta stack está montada](#como-esta-stack-está-montada)
- [Subindo o ambiente](#subindo-o-ambiente)
- [Variáveis de ambiente](#variáveis-de-ambiente)
- [Criptografia em repouso (SSE-KMS via Vault Transit)](#criptografia-em-repouso-sse-kms-via-vault-transit)
- [Object Lock e Retenção Compliance (Vault Bucket)](#object-lock-e-retenção-compliance-vault-bucket)
- [UIs de administração](#uis-de-administração)
- [Cliente de linha de comando (AWS CLI)](#cliente-de-linha-de-comando-aws-cli)
- [Como integrar na aplicação (API)](#como-integrar-na-aplicação-api)
- [Boas práticas / próximos passos](#boas-práticas--próximos-passos)

## O que é o SeaweedFS

O [SeaweedFS](https://seaweedfs.com/) é um sistema de armazenamento distribuído que expõe uma **API compatível com o Amazon S3**. Qualquer SDK ou ferramenta que sabe falar com o S3 (AWS SDK, AWS CLI, SDK `minio` para Node, boto3, etc.) funciona sem alterações — só troca o endpoint.

Conceitos-chave usados aqui:

| Conceito | O que é |
|---|---|
| **Bucket** | Um "container" de objetos, equivalente a um bucket S3. Aqui usamos **dois**: `wip-signatureexperts` e `vault-signatureexperts`. |
| **Object** | Cada arquivo salvo no bucket (ex: um PDF em processo de assinatura, ou já assinado). |
| **Object Lock** | Recurso que impede que um objeto seja sobrescrito ou apagado antes de expirar sua retenção — só pode ser habilitado **na criação** do bucket (`--object-lock-enabled-for-bucket`). |
| **Retention Mode (COMPLIANCE)** | Modo de retenção mais restrito: **nem o usuário admin consegue apagar/alterar** o objeto antes do prazo definido. |
| **SSE-KMS** | Criptografia do lado do servidor: todo objeto gravado é cifrado em repouso com uma *data key* gerada pelo KMS. Aqui o KMS é o **Vault Transit Engine** — a chave mestra (`signatureexperts-key`) vive no Vault e nunca sai de lá. |

## Arquitetura: WIP Bucket + Vault Bucket

Documentos de assinatura são mutáveis **até** a última assinatura ser aplicada — mas a partir da conclusão precisam ficar imutáveis (WORM) para valer como prova jurídica. Por isso a stack expõe **dois buckets com propósitos diferentes**, os dois cifrados, mas só um com Object Lock:

### 🪣 WIP Bucket (`wip-signatureexperts`) — Work In Progress

- **SSE-KMS habilitado por padrão** (criptografia em repouso via Vault, compliance LGPD).
- **SEM Object Lock** — o objeto pode ser sobrescrito.
- Fluxo:
  1. Quando a **1ª assinatura** chega, o backend grava o PDF aqui (`PutObject`).
  2. Quando a **2ª assinatura** (e as seguintes) chegam, o backend lê a stream existente, anexa os novos bytes (novo dicionário `/Sig`, nova tabela `xref`, novo `%%EOF` — apêndice incremental de assinatura PDF) e faz um novo `PutObject` **na mesma chave**, sobrescrevendo o objeto de forma cifrada.

### 🪣 Vault Bucket (`vault-signatureexperts`) — Imutável

- **SSE-KMS habilitado por padrão** + **Object Lock (COMPLIANCE/WORM)**.
- Retenção padrão de `BUCKET_RETENTION_YEARS` (5 anos) aplicada a todo objeto novo.
- Fluxo: **somente** quando o caso de uso de orquestração da assinatura determina que a esteira daquele documento está `COMPLETED`, o backend executa um `CopyObject` interno (S3 `x-amz-copy-source`) movendo o binário final do WIP para o Vault Bucket — **selando-o judicialmente**. A partir daí, nem o admin consegue apagar ou sobrescrever aquele objeto antes do prazo de retenção.

```
1ª assinatura ──▶ PutObject ──┐
2ª assinatura ──▶ PutObject   ├──▶  wip-signatureexperts/<doc>.pdf  (mutável, cifrado)
Nª assinatura ──▶ PutObject ──┘
                                        │
                        status = COMPLETED (caso de uso)
                                        │
                                        ▼
                          CopyObject (server-side, sem round-trip)
                                        │
                                        ▼
                    vault-signatureexperts/<doc>.pdf  (imutável, cifrado, WORM)
```

> Depois do `CopyObject`, o objeto original no WIP pode ser removido pelo backend (ele não tem lock) — o Vault Bucket passa a ser a única fonte de verdade daquele documento.

## Como esta stack está montada

```
bucket/
├── Dockerfile              # imagem do SeaweedFS (copia o entrypoint)
├── entrypoint.sh           # gera o s3.config.json (identities + KMS) e sobe o weed server
├── vault-config.hcl        # config do Vault (modo server, storage persistente em arquivo)
├── docker-compose.yaml     # stack isolada (Vault + init + SeaweedFS + provisioner)
├── scripts/
│   ├── vault-init.sh       # init/unseal do Vault + Transit Engine + chave (one-shot)
│   └── provision.sh        # cria/configura os 2 buckets via AWS CLI (one-shot)
├── .env                    # variáveis reais (não versionado)
├── env-example.txt         # template das variáveis
└── README.md               # este arquivo
```

Quatro serviços, definidos em `bucket/docker-compose.yaml`:

1. **`vaultkmssignatureexperts`** — HashiCorp Vault em modo **server com storage persistente** em arquivo (`vault-config.hcl` + volume `.docker/vault-data`) — as chaves **sobrevivem a restart/recreate** do container. É o **cofre de chaves (KMS)**: guarda a chave mestra de criptografia no Transit Engine. Expõe a porta `8200` (UI + API).

2. **`vaultinitsignatureexperts`** — container "one-shot" (roda e encerra) que espera o Vault subir e:
   - **inicializa** o Vault na primeira subida (`operator init`), salvando a unseal key e o root token em `.docker/vault-keys/init-keys.txt` (**só para DEV** — a pasta `.docker` é ignorada pelo git);
   - **desela** (`operator unseal`) a cada subida — Vault persistente sempre nasce selado;
   - cria o **token fixo** `VAULT_KMS_ROOT_TOKEN` (do `.env`) usado pelo SeaweedFS;
   - habilita o **Transit Engine** e cria a chave `transit/keys/signatureexperts-key`.

   Idempotente: pode rodar quantas vezes for.

   > Como o Vault nasce selado a cada restart, use sempre `docker compose --env-file .env up -d` para subir a stack (isso re-executa o vault-init, que desela). Um `docker restart` só no container do Vault vai deixá-lo selado até o vault-init rodar de novo.

3. **`bucketsignatureexperts`** — o servidor SeaweedFS (master + volume + filer + **API S3**), buildado a partir do `Dockerfile` local. O `entrypoint.sh` gera o `s3.config.json` em runtime com:
   - as **identities** (credenciais de acesso S3, vindas de `BUCKET_ROOT_USER`/`BUCKET_ROOT_PASSWORD`);
   - o bloco **`kms`** apontando para o Vault (`type: openbao`, compatível com Vault/OpenBao Transit).

   Expõe:
   - porta `8333` → API S3
   - porta `9333` → Master UI
   - dados persistidos em `bucket/.docker/bucket-data`

4. **`adminuisignatureexperts`** — Admin UI do SeaweedFS (`weed admin`) na porta `23646`: console web com gestão de buckets, file browser e status do cluster, protegido por login (`BUCKET_ROOT_USER`/`BUCKET_ROOT_PASSWORD`).

5. **`provisionersignatureexperts`** — container "one-shot" com a imagem oficial `amazon/aws-cli` que configura os buckets assim que a API S3 sobe **e** o vault-init termina:
   - cria o `wip-signatureexperts` (**sem** lock) e aplica **criptografia default SSE-KMS** (`put-bucket-encryption` com `aws:kms` + `KMSMasterKeyID`)
   - cria o `vault-signatureexperts` **com Object Lock** (`--object-lock-enabled-for-bucket`, que também habilita versionamento automaticamente), aplica **SSE-KMS default** e a **retenção COMPLIANCE** de `BUCKET_RETENTION_YEARS` anos (`put-object-lock-configuration`)

A stack tem `name: signatureexperts-bucket` e rede própria (`signatureexpertsbucketnetwork`), isolada da rede do `docker-compose.yaml` principal.

> **Importante:** variáveis tipo `SEAWEEDFS_S3_SSE_VAULT_SERVER`/`SEAWEEDFS_S3_SSE_VAULT_TOKEN` **não existem** no SeaweedFS — a integração com o Vault é feita exclusivamente pelo bloco `kms` do arquivo de config do S3 (`-s3.config=...`), conforme a [wiki oficial](https://github.com/seaweedfs/seaweedfs/wiki/Server-Side-Encryption-SSE-KMS). É exatamente isso que o `entrypoint.sh` monta.

## Subindo o ambiente

Da pasta `bucket/`:

```bash
docker compose --env-file .env up -d --build
```

Ou, da raiz do projeto, apontando explicitamente para o arquivo:

```bash
docker compose -f bucket/docker-compose.yaml --env-file bucket/.env up -d --build
```

Para derrubar:

```bash
docker compose --env-file .env down
```

Para acompanhar os logs do provisionamento (útil para confirmar buckets, criptografia e lock):

```bash
docker logs vaultinitsignatureexperts
docker logs provisionersignatureexperts
```

Saída esperada ao final:

```
Transit Engine habilitado.
Chave de criptografia 'transit/keys/signatureexperts-key' pronta.

Bucket 'wip-signatureexperts' criado.
SSE-KMS default aplicado em 'wip-signatureexperts' (chave: signatureexperts-key).
Bucket 'vault-signatureexperts' criado com Object Lock.
SSE-KMS default aplicado em 'vault-signatureexperts' (chave: signatureexperts-key).
Retencao COMPLIANCE de 5 ano(s) aplicada em 'vault-signatureexperts'.
Provisionamento concluido.
```

> ⚠️ Se você tinha a stack antiga (MinIO) rodando, derrube-a e limpe `bucket/.docker/bucket-data` antes de subir — os formatos de dados são incompatíveis.

## Variáveis de ambiente

Definidas em `bucket/.env` (use `bucket/env-example.txt` como template):

| Variável | Descrição |
|---|---|
| `BUCKET_HOST` | Nome do container / hostname interno do SeaweedFS (`bucketsignatureexperts`) |
| `BUCKET_PORT` | Porta da API S3 exposta no host (padrão `8333`) |
| `BUCKET_MASTER_PORT` | Porta da Master UI exposta no host (padrão `9333`) |
| `BUCKET_ROOT_USER` / `BUCKET_ROOT_PASSWORD` | Credenciais S3 (accessKey/secretKey da identity `admin` do `s3.config.json`) |
| `VAULT_KMS_HOST` | Nome do container / hostname interno do Vault (`vaultkmssignatureexperts`) |
| `VAULT_KMS_PORT` | Porta do Vault exposta no host (padrão `8200`) |
| `VAULT_KMS_ROOT_TOKEN` | Token fixo criado pelo vault-init na primeira subida (root em DEV), usado pelo SeaweedFS para falar com o Transit |
| `BUCKET_NAME_WIP` | Nome do bucket de trabalho, sem lock (`wip-signatureexperts`) |
| `BUCKET_NAME_VAULT` | Nome do bucket imutável, com Object Lock (`vault-signatureexperts`) |
| `BUCKET_RETENTION_YEARS` | Anos de retenção COMPLIANCE aplicados ao Vault Bucket (padrão `5`) |
| `BUCKET_KMS_KEY_NAME` | Nome da chave no Transit Engine (`transit/keys/<nome>`), criada pelo vault-init |

> As credenciais **admin** só devem ser usadas para bootstrap/administração. Para a aplicação, crie uma identity de serviço com actions restritas no `s3.config.json` (veja [Boas práticas](#boas-práticas--próximos-passos)).

## Criptografia em repouso (SSE-KMS via Vault Transit)

**Por que trocamos o MinIO:** a integração nativa do MinIO com o HashiCorp Vault (`MINIO_KMS_VAULT_*`) foi **descontinuada/removida** em favor do KES, e a alternativa de chave estática (`MINIO_KMS_SECRET_KEY`) deixava o segredo de criptografia guardado em um `.env`. O SeaweedFS tem suporte **nativo e atual** a SSE-KMS com Vault/OpenBao Transit — a chave mestra fica no cofre, com rotação e auditoria, sem serviço intermediário.

### Como funciona aqui

1. O `vault-init` inicializa/desela o Vault, habilita o **Transit Engine** e cria a chave `transit/keys/signatureexperts-key`. O Transit é "criptografia como serviço": a chave mestra **nunca sai do Vault** — e como o storage é persistente (`.docker/vault-data`), ela sobrevive a restart/recreate do container.
2. O `entrypoint.sh` do SeaweedFS gera o `s3.config.json` com o bloco:

```json
{
  "kms": {
    "default_provider": "vault",
    "providers": {
      "vault": {
        "type": "openbao",
        "address": "http://vaultkmssignatureexperts:8200",
        "token": "<VAULT_KMS_ROOT_TOKEN>",
        "transit_path": "transit",
        "cache_enabled": true,
        "cache_ttl": "1h"
      }
    }
  }
}
```

   > O provider `openbao` é o driver do SeaweedFS para Vault/OpenBao (o OpenBao é um fork do Vault com a mesma API de Transit).

3. O provisioner aplica **criptografia default** em cada bucket via `put-bucket-encryption` (`SSEAlgorithm: aws:kms` + `KMSMasterKeyID: signatureexperts-key`). Com isso, **todo `PutObject`/`CopyObject` é cifrado automaticamente** no servidor — nenhum header ou lógica extra é necessário no código da aplicação.

Para **verificar** que um bucket está com criptografia default ativa:

```bash
aws --endpoint-url http://localhost:8333 s3api get-bucket-encryption --bucket wip-signatureexperts
aws --endpoint-url http://localhost:8333 s3api get-bucket-encryption --bucket vault-signatureexperts
# esperado: SSEAlgorithm aws:kms com KMSMasterKeyID signatureexperts-key
```

E que um objeto específico foi cifrado com a chave:

```bash
aws --endpoint-url http://localhost:8333 s3api head-object \
  --bucket wip-signatureexperts --key documento.pdf
# esperado: "ServerSideEncryption": "aws:kms", "SSEKMSKeyId": "signatureexperts-key"
```

### Rotação de chave

```bash
# dentro do container do Vault (ou com vault CLI apontando pra ele):
vault write -f transit/keys/signatureexperts-key/rotate
```

O Transit mantém as versões antigas da chave, então objetos cifrados antes da rotação continuam legíveis; novos objetos passam a usar a versão nova.

> ⚠️ **Atenção (DEV):** o Vault é persistente (`.docker/vault-data`), mas a unseal key e o root token ficam em **texto plano** em `.docker/vault-keys/init-keys.txt` para automatizar o unseal — aceitável só em DEV. **Perder `.docker/vault-data` = perder as chaves = objetos cifrados ilegíveis** (faça backup se os dados importarem). Em produção, use unseal manual/auto-unseal por KMS e não guarde as chaves em disco (ver [Boas práticas](#boas-práticas--próximos-passos)).

## Object Lock e Retenção Compliance (Vault Bucket)

O `create-bucket --object-lock-enabled-for-bucket` habilita **Object Lock** no momento da criação (não pode ser ativado depois via API S3) e liga o **versionamento** automaticamente (pré-requisito do lock). Por isso só o `vault-signatureexperts` tem essa flag; o `wip-signatureexperts` é criado sem ela de propósito, já que precisa aceitar sobrescrita.

Combinado com `put-object-lock-configuration` (modo `COMPLIANCE`, `Years: 5`), isso garante que **todo objeto novo** gravado no Vault Bucket:

- não pode ser sobrescrito antes do prazo (versões antigas ficam protegidas);
- não pode ser deletado antes do prazo — **inclusive pelo usuário admin**;
- fica protegido mesmo contra chamadas administrativas de exclusão em massa.

Isso é o mecanismo técnico que sustenta a exigência legal de **preservação da integridade e não-repúdio** de documentos assinados digitalmente por 5 anos (ou o prazo aplicável) sob a MP 2.200-2.

> ⚠️ **Ressalva importante (validada em teste):** no SeaweedFS, a retenção default do bucket é aplicada automaticamente em `PutObject`, mas **não em `CopyObject`** — objetos copiados chegam cifrados, porém **sem retenção**, e poderiam ser apagados. Por isso o fluxo de selamento **deve aplicar a retenção explicitamente** após a cópia, via `PutObjectRetention` na versão copiada (ver o exemplo de integração abaixo). O teste ponta a ponta confirmou: copy + `put-object-retention` → `DeleteObject` retorna `AccessDenied`.

Comandos úteis para auditoria:

```bash
# ver a configuração de lock/retenção padrão do bucket
aws --endpoint-url http://localhost:8333 s3api get-object-lock-configuration \
  --bucket vault-signatureexperts

# ver a retenção aplicada a um objeto específico
aws --endpoint-url http://localhost:8333 s3api get-object-retention \
  --bucket vault-signatureexperts --key caminho/do/arquivo.pdf

# confirmar que o WIP bucket NÃO tem lock (comportamento esperado)
aws --endpoint-url http://localhost:8333 s3api get-object-lock-configuration \
  --bucket wip-signatureexperts
# esperado: erro ObjectLockConfigurationNotFoundError
```

## UIs de administração

- **SeaweedFS Admin UI** — `http://localhost:23646` (ou `BUCKET_ADMIN_UI_PORT`): o console web principal — gestão de buckets, file browser, usuários e status do cluster. Login com `BUCKET_ROOT_USER` / `BUCKET_ROOT_PASSWORD`.
- **SeaweedFS Master UI** — `http://localhost:9333` (ou `BUCKET_MASTER_PORT`): topologia, volumes, status do cluster (sem login — é só leitura de status).
- **Vault UI** — `http://localhost:8200` (ou `VAULT_KMS_PORT`): login por **Token**, usando o `VAULT_KMS_ROOT_TOKEN`; dá para inspecionar o Transit Engine e as versões da chave.

## Cliente de linha de comando (AWS CLI)

O provisioner já usa a AWS CLI para o setup inicial. Alguns comandos úteis para o dia a dia (as credenciais são `BUCKET_ROOT_USER`/`BUCKET_ROOT_PASSWORD`):

```bash
export AWS_ACCESS_KEY_ID=<BUCKET_ROOT_USER>
export AWS_SECRET_ACCESS_KEY=<BUCKET_ROOT_PASSWORD>
ENDPOINT=http://localhost:8333

# listar buckets
aws --endpoint-url $ENDPOINT s3 ls

# listar objetos dentro de cada bucket
aws --endpoint-url $ENDPOINT s3 ls s3://wip-signatureexperts
aws --endpoint-url $ENDPOINT s3 ls s3://vault-signatureexperts

# subir um arquivo (simula o backend gravando a 1a assinatura)
aws --endpoint-url $ENDPOINT s3 cp ./documento.pdf s3://wip-signatureexperts/documento.pdf

# copiar do WIP para o Vault (simula o "selamento" ao concluir a esteira)
aws --endpoint-url $ENDPOINT s3 cp \
  s3://wip-signatureexperts/documento.pdf \
  s3://vault-signatureexperts/documento.pdf

# baixar um arquivo
aws --endpoint-url $ENDPOINT s3 cp s3://vault-signatureexperts/documento.pdf ./

# ver metadados (inclui ServerSideEncryption e SSEKMSKeyId)
aws --endpoint-url $ENDPOINT s3api head-object \
  --bucket vault-signatureexperts --key documento.pdf
```

Para rodar a AWS CLI sem instalar nada localmente, pode usar o próprio container:

```bash
docker run --rm -it --network signatureexperts-bucket_signatureexpertsbucketnetwork \
  -e AWS_ACCESS_KEY_ID=<user> -e AWS_SECRET_ACCESS_KEY=<pass> -e AWS_DEFAULT_REGION=us-east-1 \
  amazon/aws-cli --endpoint-url http://bucketsignatureexperts:8333 s3 ls
```

## Como integrar na aplicação (API)

A API já tem o gateway em `api/infrastructure/gateways/Miniio/` usando o SDK `minio` para Node — que é um **client S3 genérico** e funciona com o SeaweedFS sem nenhuma mudança de código: só o endpoint/porta mudam via `.env`.

### 1. Rede compartilhada

Como a stack do bucket roda isolada (rede `signatureexpertsbucketnetwork`), a API só consegue falar com o SeaweedFS pelo **nome do container** se as duas estiverem na mesma rede Docker. Duas opções:

**a) Rede externa compartilhada** (recomendado para produção) — declarar a rede da API como `external` no compose do bucket, ou vice-versa.

**b) Endpoint via host** (mais simples para dev local) — se a API rodar fora de container, usar `localhost:8333` como endpoint, já que a porta está publicada.

### 2. Variáveis no `.env` da API

```bash
BUCKET_HOST=localhost            # ou bucketsignatureexperts, se em container
BUCKET_PORT=8333
BUCKET_USE_SSL=false
BUCKET_ACCESS_KEY=<BUCKET_ROOT_USER>
BUCKET_SECRET_KEY=<BUCKET_ROOT_PASSWORD>
BUCKET_NAME_WIP=wip-signatureexperts
BUCKET_NAME_VAULT=vault-signatureexperts
```

### 3. Fluxo de gravação (WIP) e selamento (Vault)

A criptografia é **transparente** (default do bucket). A retenção, porém, precisa ser aplicada **explicitamente** após o `CopyObject` (ver ressalva na seção de Object Lock):

```javascript
// gravar/atualizar o PDF a cada assinatura (WIP, mesma chave = sobrescrita)
await client.putObject(WIP_BUCKET, `${documentoId}.pdf`, pdfBuffer, pdfBuffer.length, {
    'Content-Type': 'application/pdf',
})

// selar ao concluir a esteira: CopyObject server-side WIP -> Vault
// (o objeto chega cifrado com SSE-KMS default, mas SEM retenção)
const { versionId } = await client.copyObject(
    VAULT_BUCKET,
    `${documentoId}.pdf`,
    `/${WIP_BUCKET}/${documentoId}.pdf`
)

// aplicar o lock COMPLIANCE na versão copiada — obrigatório, pois o
// SeaweedFS não herda a retenção default do bucket em CopyObject
const retainUntil = new Date()
retainUntil.setFullYear(retainUntil.getFullYear() + 5)
await client.putObjectRetention(VAULT_BUCKET, `${documentoId}.pdf`, {
    mode: 'COMPLIANCE',
    retainUntilDate: retainUntil.toISOString(),
    versionId,
})

// opcional: remover do WIP, já que o Vault passa a ser a fonte de verdade
await client.removeObject(WIP_BUCKET, `${documentoId}.pdf`)
```

> Alternativa: fazer `GetObject` do WIP + `PutObject` direto no Vault Bucket (round-trip pela aplicação). O `PutObject` **herda** a retenção default do bucket automaticamente — custa o tráfego do binário, mas dispensa o passo de `putObjectRetention`.

## Boas práticas / próximos passos

- [ ] **Não usar as credenciais admin (`BUCKET_ROOT_USER`/`BUCKET_ROOT_PASSWORD`) na API.** Adicionar uma identity de serviço no `s3.config.json` (gerado pelo `entrypoint.sh`) com actions restritas por bucket, ex: `Read:wip-signatureexperts`, `Write:wip-signatureexperts`, `Read:vault-signatureexperts`, `Write:vault-signatureexperts` (sem `Admin`).
- [ ] **Endurecer o Vault antes de produção**: storage raft/consul (em vez de file), auto-unseal por KMS (em vez da unseal key em `.docker/vault-keys`), token com policy restrita ao path `transit/` (em vez do token root) e TLS entre SeaweedFS e Vault.
- [ ] Compartilhar a rede Docker entre a API e o bucket (ou expor apenas internamente, sem publicar a porta 8333 para o host, em produção).
- [ ] Definir e documentar a convenção de `objectName` (ex: `<documentoId>.pdf`) para organizar e localizar documentos entre os dois buckets.
- [ ] Persistir na tabela `tab_arquivos` (ou equivalente) o `objectName`/bucket (WIP ou Vault) junto dos metadados.
- [ ] Configurar backup/replicação do `vault-signatureexperts` (ex: `weed filer.backup` — lembrando que backup/replicate precisam do bloco `[kms]` no `security.toml` para decifrar) para disaster recovery, já que a retenção compliance impede exclusão mas não protege contra perda de hardware.
- [ ] Implementar rotina de expurgo/limpeza no `wip-signatureexperts` para documentos abandonados (esteira nunca chegou a `COMPLETED`).
- [ ] Avaliar o [SeaweedFS Enterprise](https://seaweedfs.com/docs/deploy/) para produção: é gratuito para dev/teste até 25TB sem licença; produção requer licença (arquivo `seaweed-license.json` ou flag `-license`), e adiciona self-healing, EC repair e login OIDC na Admin UI.
