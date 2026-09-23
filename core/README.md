# Core — infraestrutura compartilhada

Infra compartilhada entre todos os clientes: `deploy/core/docker-compose.yaml` (MySQL, Redis, RabbitMQ, facematch, mailpit, phpmyadmin, loki, promtail, grafana) + os composes de `bucket/` e `serversign/` (mantidos separados, como já eram).

## Comando para subir

**Importante:** os três composes precisam subir com **três comandos separados**, cada um a partir da própria pasta — **não** dá para juntar com múltiplos `-f` a partir de `deploy/core/`. Quando o Docker Compose mescla arquivos via `-f`, todo path relativo (`context: .`, `./scripts/...`, `./provisioner`, etc.) é resolvido contra o diretório do **primeiro** arquivo passado, não contra a pasta de cada compose — isso quebra o `context: .` e os volumes relativos de `bucket/docker-compose.yaml` e `serversign/docker-compose.yaml` (confirmado testando: `signserversignatureexperts` tentava buildar com `context: deploy/core` e o `provisioner` do serversign resolvia para `deploy/core/provisioner`, que não existe).

```bash
# 1) bucket (SeaweedFS + Vault KMS)
cd deploy/core/bucket && docker compose up -d --build

# 2) serversign (SignServer + HSM)
cd deploy/core/serversign && docker compose up -d --build

# 3) infra principal (mysql, redis, rabbitmq, facematch, mailpit, phpmyadmin, loki, promtail, grafana)
cd deploy/core && docker compose -f docker-compose.yaml up -d --build
```

Cada comando roda de dentro da própria pasta, então o `.env` local (`bucket/.env`, `serversign/.env`, `core/.env`) é carregado automaticamente pelo Compose — não precisa de `--env-file` explícito quando rodado assim. A ordem entre os três não importa entre si (não há dependência real), mas os três precisam estar de pé **antes** de subir qualquer cliente em `deploy/clientes/<slug>/`.

`docker compose ... config` (validação de sintaxe, sem subir nada) funciona tanto rodando cada compose separado quanto com múltiplos `-f` a partir de `deploy/core/` (`config` não builda imagem, então o `context` errado não chega a ser usado) — mas `up`/`build` com múltiplos `-f` falha pelo motivo acima. Sempre valide com os três comandos separados acima, não com `-f` combinado.
