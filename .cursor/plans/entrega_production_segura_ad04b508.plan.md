---
name: Entrega production segura
overview: O provisionamento continua só alocando portas e entregando o cliente em development. A virada para production, com URLs públicas e mTLS, acontece só no configurar-cliente.sh, e só depois de checagens que abortam antes de apagar qualquer dado.
todos:
  - id: porta-front
    content: Tirar PORT= do .env.frontend gerado pelo provisionar-cliente.sh, sem alterar a alocação de portas
    status: pending
  - id: mtls-template
    content: Colocar gerar-mtls.sh no _template, igual ao do CRP
    status: pending
  - id: configurar-entrega
    content: No configurar-cliente.sh, pedir as duas URLs https, gerar e conferir o mTLS, gravar production e as URLs, e só então seguir a limpeza
    status: pending
isProject: false
---

# Entrega em production sem quebrar o que já roda

Nada será executado. Os `.env` e os containers do CRP não são alterados por esta mudança. O [configurar-cliente.sh](configurar-cliente.sh) continua recusando cliente que já tem `.configurado`.

## O que cada script faz

[provisionar-cliente.sh](provisionar-cliente.sh) já escolhe `API_PORT`, `PROXY_PORT` e `FRONT_END_PORT` com `porta_livre` (linhas 216–218) e grava a mesma porta do proxy em `PORT`, `REACT_APP_BACKEND` e `BUCKET_PUBLIC_URL`. Isso permanece. O cliente novo continua em `development`, sem mTLS.

O único furo dessa alocação: o `.env.frontend` gerado recebe `PORT=${FRONT_END_PORT}` (linha 526). O Compose publica essa porta no destino fixo `3395` ([clientes/crp/docker-compose.yaml](clientes/crp/docker-compose.yaml) linhas 100–101). Com `PORT` preenchido, o Node escuta na porta do host e a página não abre. O CRP já tirou essa linha. O provisionamento deixa de gravá-la. `PORT` do proxy e da API não mudam: nos dois, a porta publicada e a porta de escuta são a mesma.

## Ordem no configurar-cliente.sh

Tudo que é novo entra depois da confirmação da pasta e da checagem do usuário de sistema, e antes de rotacionar chave, limpar banco ou recriar container. Se qualquer passo novo falhar, o script sai com `set -e` e o cliente continua como estava.

1. Perguntar a URL final do proxy e a URL final do frontend. As duas precisam ser `https://host` ou `https://host:porta`, sem caminho e sem barra no fim. `http://` é recusado: em production o cookie sai com `Secure` e o navegador descarta cookie de página HTTP.
2. Rodar o mTLS. Se `clientes/<slug>/gerar-mtls.sh` não existir, copiar de [clientes/\_template/gerar-mtls.sh](clientes/_template/gerar-mtls.sh) (arquivo novo, igual ao [clientes/crp/gerar-mtls.sh](clientes/crp/gerar-mtls.sh)). O script gera a CA e grava `api/tls/server.key`, `server.crt`, `ca.pem` e `proxy/tls/client.key`, `client.crt`, `ca.pem`. A `ca.key` não fica no cliente.
3. Conferir que os seis arquivos existem e não estão vazios. Sem isso, não grava `production`.
4. Gravar, com `substituir_env`, só estas chaves:
   - `.env.api`: `STATUSAPLICATION=production`, `URL_FRONT`, `BUCKET_PUBLIC_URL=<proxy>/bucket`
   - `.env.proxy`: `APP_STATUS=production`, `URL_FRONT`
   - `.env.frontend`: `REACT_APP_BACKEND=<proxy>/signature`, `REACT_APP_FRONTEND=<front>`
5. Apagar a linha `PORT=` só do `.env.frontend`, se existir. Não mexer em `API_PORT`, `PROXY_PORT`, `FRONT_END_PORT` nem no `PORT` do proxy ou da API.
6. Seguir o fluxo que já existe: chaves, limpeza, admin, compilação do front lendo o `.env.frontend` já atualizado, `docker compose up -d --force-recreate`.

O addon permanece em `development`. O proxy continua escutando HTTP na porta já alocada; o `APP_STATUS=production` só faz o trecho proxy para API em HTTPS com o certificado de cliente. A URL `https://` informada é a que o navegador usa (o TLS na frente do proxy é de quem publica).

## O que não muda

- Código da API, do proxy e do front.
- Senha do MySQL, slug, bancos, vhost, filas e a regra do usuário de sistema.
- Algoritmo de porta do provisionamento.
- Containers e `.env` do CRP, enquanto ninguém apagar o `.configurado` e rodar o script de novo.
