# Template de cliente

Este é o molde completo de um cliente do LegacySignature: `docker-compose.yaml` **e** a cópia-mestre do código-fonte dos 4 serviços de aplicação (`./api`, `./addon-service`, `./proxy`, `./frontend`, `./pdf`). Cada cliente é **autocontido** — a pasta `deploy/clientes/<slug>/` tem sua própria cópia completa do código, sem depender de nada fora da própria pasta. Não há código compartilhado entre clientes: `build.context` de cada serviço aponta para `./api`, `./addon-service`, `./proxy`, `./frontend` (locais, dentro da própria pasta do cliente).

A infraestrutura (MySQL, Redis, RabbitMQ, facematch, bucket, serversign, observabilidade) é compartilhada e vive em `deploy/core/`, que precisa estar de pé **antes** de qualquer cliente subir.

Para instanciar um cliente novo, copie **esta pasta inteira** (`_template/`, exceto `.git`/`node_modules`, que não existem aqui) para `deploy/clientes/<slug>/` — é exatamente isso que `deploy/provisionar-cliente.sh` faz. Depois, crie na pasta do cliente os 4 arquivos de ambiente (não existem aqui no template, cada cliente concreto escreve os seus) e um `.env` com as variáveis de orquestração:

- `.env.api` — env do serviço `apisignature` (banco `signature_<slug>`, chaves JWT/API, etc; ver `api/env-example.txt`).
- `.env.addon` — env do serviço `addonservice` (banco `addonservice_<slug>`, etc; ver `addon-service/env-example.txt`).
- `.env.proxy` — env do serviço `proxysignature` (inclui `KEY_API`, também lido pelo `addonservice`; ver `proxy/env-example.txt`).
- `.env.frontend` — env do serviço `frontsignature` (ver `frontend/env-example.txt`).
- `.env` — variáveis lidas na interpolação do próprio `docker-compose.yaml` (não pelos containers): `CLIENT_SLUG` (nomeia containers e alimenta a label `tenant=${CLIENT_SLUG}`, convenção consumida pelo Promtail), `API_PORT`, `PROXY_PORT`, `FRONT_END_PORT`.

Para subir um cliente já instanciado (com `deploy/core` já rodando):

```bash
docker compose -f docker-compose.yaml up -d --build
```

(O `.env` da pasta do cliente é lido automaticamente pelo Compose por estar no mesmo diretório do `docker-compose.yaml`; não precisa de `--env-file` explícito.)

Não há `depends_on` entre este compose e o de `deploy/core` — não é possível esperar containers de outro projeto docker compose só com `depends_on`. A ordem correta é sempre subir `deploy/core` primeiro e só depois qualquer cliente.

## Como instanciar um cliente novo: `provisionar-cliente.sh`

Não copie esta pasta manualmente. Use `deploy/provisionar-cliente.sh` (fica na
raiz de `deploy/`, de propósito — é o script que se roda no server pra
provisionar um cliente novo, sem precisar navegar pasta nenhuma) — ele faz
exatamente essa cópia (pasta inteira, exceto este `README.md`) e, além disso,
cria os 2 bancos MySQL do cliente + usuário dedicado, o vhost do RabbitMQ +
usuário dedicado, gera **todas** as API keys/JWTs/segredos de integração já
cruzados corretamente entre `apisignature`/`addonservice`/`proxysignature`/
`frontsignature` (ver a tabela de mapeamento no relatório da Frente D) e
escreve os 4 `.env.*` + `.env` do cliente — nada precisa ser configurado à
mão:

```bash
deploy/provisionar-cliente.sh <client-slug> <admin-email>
```

Pré-requisito: `deploy/core` já precisa estar de pé (ver `deploy/core/README.md`).
O script não builda nem sobe os containers do cliente nem roda migration/seed
— ele só provisiona a infra dedicada e escreve os arquivos; o resumo impresso
no final traz o comando exato de `docker compose up` e do seed do usuário
admin (`clienteBootstrap.js`, senha temporária `Trocar@123`).

## Atenção — grants do MySQL para o `addonservice`

O `addonservice` roda com `env_file: .env.addon` (usuário/senha próprios do banco, não `root`). O usuário do MySQL configurado em `.env.addon` (`DB_USER`) só recebe grant automático no banco definido em `MYSQL_DATABASE` do `deploy/core/.env` (hoje `signature_legacy`) — **não** no banco separado do addon-service (`DB_DATABASE` de `.env.addon`, ex.: `addonservice`/`addonservice_<slug>`). Sem um `GRANT ALL PRIVILEGES ON <banco_addon>.* TO '<usuario>'@'%'` explícito no MySQL do `core`, o `addonservice` sobe e crasha em loop com `Access denied ... CREATE DATABASE`. O script de provisionamento de cliente (Frente D) precisa fazer esse `GRANT` para o usuário dedicado de cada cliente, no banco de addon-service daquele cliente, antes (ou como parte) de subir o container.

## Por que não copiar `.env`/`node_modules` para o template

- Os `.env` reais de cada serviço (`api/.env`, `addon-service/.env`, `proxy/.env`, `frontend/.env`) **não** ficam salvos dentro das pastas de código deste template — só os `.env.*` do cliente (via `env_file:` no compose) carregam segredo em runtime. Isso evita que um cliente novo nasça acidentalmente com os segredos do cliente que serviu de base para o template.
- `node_modules` de cada serviço não é copiado/versionado aqui: cada `Dockerfile` já roda `RUN npm install` no build, e o volume anônimo `/app/node_modules` de cada serviço garante que o `node_modules` usado em runtime vem da imagem, não do bind mount do código-fonte.
