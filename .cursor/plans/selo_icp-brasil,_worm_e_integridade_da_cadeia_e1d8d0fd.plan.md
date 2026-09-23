---
name: Selo ICP-Brasil, WORM e integridade da cadeia
overview: Plano em 4 levas (0 a 3) para trocar o CMS genérico por PAdES com política ICP-Brasil real (id-aa-ets-sigPolicyId nascendo no SignServer), fechar furos de conferência de hash (documento + atributos), e ligar guarda WORM no Vault sem quebrar a visualização atual — tudo em microtarefas delegáveis sem colisão de arquivo, registradas em `docs/relatorios/sprint-selo-icp-worm-integridade.md`.
todos:
  - id: T0
    content: "Leva 0: transcrever sondagem SignServer + tabela de cadeia de hash + achados OID/URI ITI para docs/relatorios/sprint-selo-icp-worm-integridade.md (criação do arquivo)"
    status: completed
  - id: L1.1
    content: "Folha de auditoria: remover hash inventado do item FOLHA_AUDITORIA_GERADA em AplicarAssinatura/index.js"
    status: completed
  - id: L1.2
    content: Rate limit Redis (ioredis, sem lib nova) só em GET/POST /api/verificar/:codigo
    status: completed
  - id: L1.3
    content: "#verificarProfundo: validade notBefore/notAfter + forge.pki.verifyCertificateChain com PEMs ICP-Brasil em api/certs/"
    status: completed
  - id: L1.4
    content: "Certificado: bloco explícito de conferência de hash de documento e de cada elo + atualizar limitacoes"
    status: completed
  - id: L2.1
    content: "VaultController: adicionar copiarDoWip (copy sem retention/delete) e urlDownloadGet (espelhar WipController)"
    status: completed
  - id: L2.2
    content: "createAssinaturaUseCase: download prioriza bucket_valt_path via Vault, fallback WIP"
    status: completed
  - id: L2.3
    content: Registrar fila selardocumentovault em certs/index.js, handler/index.js, register/index.js e workers/index.js
    status: completed
  - id: L2.4
    content: "Worker SelarDocumentoVault (forma ProcessarBiometria): copiar, reconferir hash, só então travar retention COMPLIANCE"
    status: completed
  - id: L2.5
    content: "AplicarAssinatura: #persistir devolve documentoFinalizado e dispatch pós-commit de selardocumentovault"
    status: completed
  - id: L3.1
    content: Reconfirmar ao vivo no ITI o OID/URI/hash vigentes da PA_AD_RB PAdES antes de codificar
    status: completed
  - id: L3.2
    content: Worker customizado no SignServer (serversign/) emitindo SignaturePolicyIdentifier no CMS, mesmo e-CNPJ
    status: completed
  - id: L3.3
    content: "#verificarProfundo passa a extrair e exigir (prod) o OID de política do CMS"
    status: completed
  - id: L3.4
    content: "gerarCertificadoAuditoriaUseCase: politica_assinatura com OID/URI/hash reais, só após L3.2/L3.3 validados"
    status: completed
isProject: false
---

# Selo ICP-Brasil real + verificação profunda de hash + WORM no Vault

Este plano cobre 4 levas (0 sondagem, 1 folha/rate-limit/cadeia X.509, 2 WORM no Vault, 3 política de assinatura no selo). Não implementa nada agora — organiza o trabalho em microtarefas com escopo de arquivo fechado, ordem de dependência explícita e critério de validação, para poder ser delegado entre agentes sem um quebrar o serviço do outro. Toda leva termina atualizando o arquivo `docs/relatorios/sprint-selo-icp-worm-integridade.md` (mesmo padrão de `docs/relatorios/sprint-cadeia-auditoria.md`).

## Leva 0 — Sondagem + integridade (JÁ EXECUTADA nesta sessão de planejamento)

### 0.A — SignServer: o que existe de verdade

Comandos rodados (read-only, sem `dump`, sem expor chave privada):

```
docker exec signserversignatureexperts /opt/keyfactor/bin/signserver getconfig CMSSignerCarimbo
docker exec signserversignatureexperts /opt/keyfactor/bin/signserver getstatus brief CMSSignerCarimbo
docker exec signserversignatureexperts /opt/keyfactor/bin/signserver getstatus complete CMSSignerCarimbo
```

Achados:

- `SignServer CE 7.7.1`. Worker `CMSSignerCarimbo` (ID 2), `IMPLEMENTATION_CLASS=org.signserver.module.cmssigner.CMSSigner`, `CRYPTOTOKEN=CryptoTokenP12`, `DETACHEDSIGNATURE=TRUE`, `CLIENTSIDEHASHING=true`. Nenhuma property `SIGNATUREPOLICY*` existe — o worker não tem noção de política.
- Certificado ativo é o e-CNPJ ICP-Brasil real: `CN=GABRIEL SOTERO COIMBRA 14238979605:48825531000140, OU=Certificado Digital PJ A1, O=ICP-Brasil`, emissor `AC SyngularID Multipla`, válido 2025-12-12 a 2026-12-12. **Não tocar** (não é dummy do provisioner).
- Inspecionado o bytecode de `SignServer-Module-CMSSigner-7.7.1.jar`: a única classe de atributos assinados é `FilteredSignedAttributeTableGenerator`, que só **filtra** o `DefaultSignedAttributeTableGenerator` do BouncyCastle — nunca adiciona `SignaturePolicyIdentifier`. `SignServer-Module-PDFSigner-7.7.1.jar` (PAdES legado da CE) não tem nenhuma string relacionada a política.
- Pesquisa nos docs oficiais Keyfactor: existe um worker `AdES Signer` (`org.signserver.module.ades.signer.AdESSigner`) que faz PAdES/XAdES/CAdES baseline B/T/LT/LTA — mas é **Enterprise** (não está nesta imagem CE) **e mesmo assim não expõe nenhuma property de `SIGNATURE_POLICY_ID`/URI/hash** na lista oficial de properties.

**Conclusão inegociável**: não existe, nem na CE nem em Enterprise, uma property de configuração que emita `id-aa-ets-sigPolicyId`. A Leva 3 (`3.1`) exige escrever um worker/classe **customizada** (Java) que estenda `CMSSigner` (ou implemente um `ISigner` próprio) trocando o `AttributeTableGenerator` para injetar o atributo assinado. Isso é infraestrutura nova em `serversign/`, não é "inventar helper" no sentido da regra Node — é o caminho que o próprio usuário definiu como obrigatório.

### 0.B — OID/URI/hash da PA (fontes ITI, não inventadas)

- Atributo: `SignaturePolicyIdentifier` (`id-aa-ets-sigPolicyId`, OID `1.2.840.113549.1.9.16.2.15`).
- Qualificador único permitido: `spuri` (`id-spq-ets-uri`, OID `1.2.840.113549.1.9.16.5.1`), contendo a URL da PA em linguagem de máquina.
- Política-padrão AD-RB baseada em PAdES: OID raiz histórico `2.16.76.1.7.1.11.1`; versão vigente **1.3** = OID `2.16.76.1.7.1.11.1.3`, conforme Instrução Normativa ITI nº 34/2025 (vigente desde 23/07/2025 — confirmar se não foi revisada de novo antes de codificar, ver T3.1).
- Nota 2 do DOC-ICP-15.03: o hash do atributo (`sigPolicyHash`) deve ser o **hash interno da própria PA**, não o hash publicado na LPA (`http://politicas.icpbrasil.gov.br/...`). Algoritmo recomendado: SHA-256, sem campo `parameters` no `AlgorithmIdentifier`.
- Fontes vivas a reconferir no momento da implementação (podem rotacionar): `https://www.gov.br/iti/pt-br/assuntos/repositorio/lista-de-politicas-de-assinatura` e `https://www.gov.br/iti/pt-br/assuntos/repositorio/artefatos-de-assinatura-digital`. **Regra de ouro**: nenhum valor deste bloco entra no worker sem essa reconferência ao vivo (T3.1 trava nisso).

### 0.C — Tabela da cadeia de hash (documento + atributos) — furos e em qual leva fecham

Ponto da cadeia → o que é hasheado → onde confere hoje → furo → fecha em qual leva:

- **hash_original** (`tab_documentos.hash_original`, gravado por `ProcessarHashInicial`) → bytes do PDF recebido → comparado em `validarDocumentoEnviadoUseCase` e no certificado → sem furo conhecido → —
- **hash por estampa** (`AplicarAssinatura`, `hashAntesEstampa`/`hashAposEstampa`) → bytes do PDF antes/depois de cada assinatura visual → gravado em `hash_documento_inicial`/`hash_documento_final` do elo `ASSINATURA_APLICADA` (`tab_auditoria_ledger`) → sem furo — cada assinatura já é auditável isoladamente → —
- **hash_apos_folha** (`hashAposFolha` em `AplicarAssinatura`) → PDF após `adicionarFolhaAuditoria` → grava certo no elo persistido (`hash_documento_final` do elo `FOLHA_AUDITORIA_GERADA`) **mas** a linha impressa na própria folha usa `hashAposEstampa` (valor de ANTES da folha, rotulado como se fosse dela) → **furo**: hash inventado/errado impresso no PDF → **fecha na Leva 1 (L1.1)**
- **hash_final pós-PAdES** (`this.hashPdf` final, grava `tab_documentos.hash_final`/`hash_final_em` e elo `DOCUMENTO_SELADO`) → circular por natureza (a folha entra no byte range do selo, hash pós-selo não cabe na folha) → já tratado como "consulte a trilha completa" (selo já imprime `null`) → **sem furo adicional**, comportamento intencional documentado → —
- **AncorarDocumento** (elos 1–2 sem `documento_id`) → recalcula `hash_atual` e reencadeia após preencher `documento_id`/hashes de arquivo → `#verificarEstrutural` já reconhece via `metadata_json.ancorado_em`/`bootstrap_legado` → sem furo de mascaramento indevido encontrado na leitura do código → validar em L1.4 que nenhum elo pós-ancoragem fica com hash de arquivo nulo sem motivo (parte do escopo do teste, não mudança de código)
- **ByteRange do PAdES** → cobre folha + estampas (a folha é sempre desenhada antes de `aplicarSeloPlataforma`) → nenhuma escrita identificada depois do selo no fluxo atual (`upload` do PDF final ocorre antes do commit, sem novo save pós-selo) → sem furo — manter assim (proibido DocMDP/rewrite)
- **calcularHashAtual() do elo mestre** (`AuditoriaLedger.js`) → concatena `id|solicitacao_id|documento_id|objeto_tipo|objeto_id|desafio_acesso_id|tipo_evento|sequencia|hash_objeto_inicial|hash_objeto_final|hash_documento_inicial|hash_documento_final|hash_registro_anterior|criado_em` → `#verificarEstrutural` recalcula e compara → `metadata_json` e `hash_bytes_pdf` ficam fora do encadeamento por desenho (aceitável: nenhum campo de política/signatário crítico mora só ali, é sempre ids/paths redundantes com colunas escalares) → sem furo — confirmar em L1.4 (checklist, não mudança) que nenhum uso futuro esconda dado só no metadata
- **Encadeamento hash_atual/hash_registro_anterior por trilha** (mestre, solicitação, documento, signatário, demarcação, desafio, identificação, evento) → `#verificarEstrutural` recomputa por trilha (uma gênese por `objeto_tipo`+`objeto_id`/`evento_id`) → cobre todas as trilhas citadas → trilhas de perfil/usuário **não** são agregadas hoje pelo certificado (não fazem parte do escopo do documento assinado) → fora de escopo, não é furo do certificado de documento
- **#verificarEstrutural** → cobre encadeamento + recomputo do hash_atual → não valida CMS, não valida cadeia X.509, não valida OID de política → **furo #1 (cadeia X.509) fecha na L1.3; furo #2 (OID) fecha na L3.3**
- **#verificarProfundo** → baixa ZIP do vault, recalcula SHA-256 do `.json` (`payload_confere`), faz parse ASN.1 do `.cms` (`cms_estrutura_valida`) e extrai subject/issuer/validade → não checa validade temporal contra `Date.now()`, não verifica cadeia contra AC Raiz ICP-Brasil, não distingue CMS-do-elo (assina o hash do elo) de PAdES-do-PDF (assina o PDF) — hoje o texto do certificado já avisa isso em `limitacoes`, mas não expõe os hashes de documento em bloco dedicado → **furo #3 (bloco de documento explícito) fecha na L1.4**
- **Prova Vault (ZIP)** → `payload_sha256` bate com SHA do `.json`; `.cms` assina o `hash_atual` do elo (não o PDF) → já correto e sem furo de mistura de provas no código; o texto do certificado precisa deixar isso redigido sem ambiguidade → parte de L1.4 (só texto/JSON, sem mudar lógica de gravação)
- **veredito_geral** (`COMPROMETIDO`/`INTEGRO`) → dispara por: trilha estrutural rompida, `payload_confere===false`, desvio do último elo (não é `DOCUMENTO_SELADO`), elo da trilha de assinatura `ROMPIDA`/`DIVERGENTE_RECALCULO` → hoje **nenhuma** falha de OID de política ou de cadeia X.509 derruba o veredito (correto até a L3: política ainda não existe) → a partir de L3.3, ausência de OID em prod deve poder virar veredito ou observação clara, sem mentir "genérico" — detalhado em L3.4
- **Furos já conscientes do sprint anterior e o que esta leva fecha**: hash da folha (**fecha L1.1**), `SessionSave` antes do commit em `createAssinatura.js` (**fica, é exceção documentada, fora de escopo**), WIP no lock do `AplicarAssinatura` (**fica — não é objetivo desta leva mexer em lock**), rate limit ausente em `/verificar` (**fecha L1.2**), CRUD scaffold do `AuditoriaLedgerRepository` (**fica, não usado pela cadeia nova**), 18 linhas legadas com `objeto_tipo` vazio (**fica, base descartável**)

### 0.D — Vault/download hoje (para não quebrar nada na L2)

- `tab_documentos.bucket_valt_path` **já existe** (nullable) — nenhuma migration nova necessária na Leva 2.
- `VaultController.selarDocumentoFromWip({documentoId, removerDoWip=true})` já faz `copyObject` + `putObjectRetention(COMPLIANCE)` + (opcional) `removeObject` do WIP num único método — é exatamente o que está **proibido de usar com delete**. `VaultController.selarDocumento({documentoId})` já existe e só faz a trava de retenção (sem copiar). Falta só o método de **cópia pura sem trava** (`copiarDoWip`) para poder recalcular hash antes de travar.
- `WipController.urlDownloadGet({objectName, expiresInSeconds})` já existe e é o modelo exato a copiar para `VaultController.urlDownloadGet`.
- Download hoje (`createAssinaturaUseCase.js`, função que monta `download_url`, e o trecho ~L108 do fluxo assinatura) sempre chama `bucketGateway.Wip().urlDownloadGet({objectName: documento.bucket_wip_path, ...})` — **nunca** olha `bucket_valt_path`. Ponto exato da L2.2.

## Leva 1 — Folha, rate limit (Redis), cadeia X.509, bloco de hash explícito

Sem mudar PAdES ainda. Sem tocar `politica_assinatura` (fica igual até L3).

### L1.1 — Folha sem hash inventado

- Arquivo: `api/infrastructure/queue/handler/AplicarAssinatura/index.js` (trecho onde monta `trilha.push(...)` para o item `folha`, por volta das linhas 256-262).
- Objetivo: o item `folha` empurrado para `adicionarFolhaAuditoria` não pode usar `hashAposEstampa` como se fosse o hash final da folha (ainda não existe nesse ponto). Trocar por marcador explícito de indisponibilidade (mesmo padrão já usado no item `selo`, que já envia `hash_documento_final: null`).
- Endereços permitidos: só esse array `trilha`. Não mexer no cálculo de `hashAposFolha` real (que já é gravado certo no elo persistido) nem no restante do worker.
- Validação: gerar uma assinatura de teste, abrir a folha impressa — linha `FOLHA_AUDITORIA_GERADA` mostra "—"/"disponível na trilha completa" em vez de um hash que não bate com o persistido; linha `DOCUMENTO_SELADO` continua como hoje; elo persistido em `tab_auditoria_ledger` continua com o hash real de sempre (sem mudança de valor gravado, só do que é impresso).

### L1.2 — Rate limit Redis só em `/api/verificar/:codigo`

- Arquivos novos: `api/infrastructure/gateways/middleware/rateLimitVerificacao.js` (mesmo estilo de `checkLimitOfsett.js`).
- Arquivo tocado: `api/infrastructure/routes/index.js` (só as duas linhas de `/verificar`).
- Sem lib nova: usar o `ioredis` já existente (`api/infrastructure/gateways/Redis/index.js`), com `INCR` + `EXPIRE` (ou `SET ... EX ... NX` + `INCR`) por chave `ratelimit:verificar:<ip>`. **Não** usar `express-rate-limit` (já existe no `proxy`, mas em memória, global demais, e é lib nova para o projeto `api`).
- 429 genérico: `{ status: false, msg: "Muitas requisições. Tente novamente em instantes." }`.
- Proibido: montar isso na `routes/admin.js` ou em qualquer rota que passe por `authApi`+sessão do painel. Escopo é só `router.get('/verificar/:codigo', ...)` e `router.post('/verificar/:codigo/documento', ...)` em `api/infrastructure/routes/index.js`.
- Validação: `ab`/`curl` em loop no `/verificar/:codigo` retorna 429 após N requisições; rotas de `/api/admin/*` continuam sem limite novo; falha do Redis não derruba a rota (fail-open com log, igual ao resto do projeto trata falha de infra).

### L1.3 — Cadeia X.509 no `#verificarProfundo`

- Arquivo: `api/@core/usecase/AuditoriaLedger/gerarCertificadoAuditoriaUseCase.js` (`#verificarProfundo`).
- Arquivos novos: PEMs da AC Raiz ICP-Brasil + intermediárias relevantes em `api/certs/` (dados, não código — não conflita com `api/certs/index.js`).
- Adicionar: validade `notBefore`/`notAfter` (já extraído, só falta comparar com `new Date()`) + `forge.pki.verifyCertificateChain` com as PEMs locais. Resultado novo: `resultado.cadeia_icp` (`{ valida: bool, motivo }`).
- Regra: `statusAplication.status !== prod` OU cadeia ainda não fechável (ex.: intermediária SyngularID ainda não presente no bundle) → **não** derruba `veredito_geral`; grava `observacao` explícita. Só passa a valer para o veredito quando a L3 exigir (ver L3.3/L3.4).
- Endereços permitidos: só o método `#verificarProfundo` e o novo bloco `cadeia_icp`. Não mexer em `#verificarEstrutural` nem no cálculo de `veredito_geral` nesta tarefa.

### L1.4 — Bloco de hash explícito (documento + elos) no certificado

- Arquivo: mesmo `gerarCertificadoAuditoriaUseCase.js`, mas escopo **diferente** de L1.3 (pode rodar em paralelo: um mexe em `#verificarProfundo`, outro no objeto de retorno de `executar()`), então **sequenciar as duas tarefas no mesmo PR/commit** (mesmo arquivo) em vez de dois agentes tocando ao mesmo tempo — recomendação: mesma pessoa/agent faz L1.3 e L1.4 juntas, ou L1.4 só começa depois do merge de L1.3.
- Objetivo: adicionar ao retorno de `executar()` um bloco `conferencia_documento` (com `hash_original`, `hash_final`, lista de `hash_documento_inicial`/`hash_documento_final` por elo da trilha mestre, e se disponível o resultado do POST de validação mais recente) e deixar explícito, por elo em `linha_do_tempo`, o resultado do recomputo (`calcularHashAtual`) e do `payload_sha256`. Atualizar texto de `limitacoes` (~136-139): remover a ressalva de cadeia X.509 (agora coberta, com nota de ambiente) e manter a ressalva de OID (só cai em L3).
- Proibido: misturar no mesmo bloco o CMS do elo (assina o hash do elo, no vault) com o CMS/PAdES do PDF (assina o documento) — são textos e chaves de JSON diferentes.
- Validação: caminho feliz de uma assinatura completa mostra o novo bloco preenchido; `payload_confere`/encadeamento continuam iguais a antes da mudança (mesmos valores, só exposição nova).

## Leva 2 — WORM no Vault (view não quebra)

Sequenciar **depois** de L1.1 (mesmo arquivo `AplicarAssinatura/index.js`).

### L2.1 — VaultController: copiarDoWip + urlDownloadGet

- Arquivo: `api/infrastructure/gateways/Bucket/Controller/VaultController.js`.
- Adicionar `copiarDoWip({ documentoId ou objectName })`: só `copyObject` do WIP para o Vault, **sem** `putObjectRetention` e **sem** `removeObject` (é o que falta — `selarDocumento` já existe e faz só a trava; `selarDocumentoFromWip` continua existindo mas fica proibido de ser chamado com `removerDoWip: true` a partir de agora nos fluxos novos).
- Adicionar `urlDownloadGet({ objectName, expiresInSeconds })` espelhando exatamente `WipController.urlDownloadGet` (mesmo formato de retorno), trocando `this.wipBucket` por `this.vaultBucket`.
- Proibido: mexer em `selarDocumento`/`selarDocumentoFromWip` existentes (não remover, não mudar assinatura — só não usar o modo delete nos fluxos novos).

### L2.2 — Download: Vault primeiro, WIP como fallback

- Arquivo: `api/@core/usecase/Assinatura/createAssinaturaUseCase.js` (os dois pontos que hoje só chamam `bucketGateway.Wip().urlDownloadGet(...)`, ~linha 108 e ~linha 355).
- Objetivo: `select` passa a trazer também `bucket_valt_path`; se preenchido, gerar a URL via `bucketGateway.Vault().urlDownloadGet(...)` (novo método de L2.1); senão, manter exatamente o comportamento atual (WIP).
- Depende de: L2.1 mesclado (usa o método novo).
- Validação: documento sem `bucket_valt_path` continua baixando do WIP igual hoje; documento com `bucket_valt_path` preenchido baixa do Vault e o PDF é idêntico byte a byte ao do WIP.

### L2.3 — Nova fila `selardocumentovault` (esqueleto)

- Arquivo: `api/certs/index.js` — só adicionar a entrada `rabbitMQ.queues.selardocumentovault` (nome/routingKey/exchange), no mesmo padrão dos vizinhos.
- Arquivo: `api/infrastructure/queue/handler/index.js` — adicionar `handlerSelarDocumentoVault` (mesma forma dos handlers vizinhos).
- Arquivo: `api/infrastructure/queue/workers/register/index.js` — adicionar o `case 'selardocumentovault':` no `MountConsumer`.
- Arquivo: `api/infrastructure/queue/workers/index.js` — adicionar `'selardocumentovault'` ao array `#workers` (é aditivo: o orquestrador só passa a spawnar mais um processo filho; não toca nos 4 existentes).
- Sem mudar nenhum handler/worker existente. Pode rodar em paralelo com qualquer outra tarefa da L2/L1 (arquivos exclusivos, mudanças aditivas).

### L2.4 — Worker `SelarDocumentoVault` (forma `ProcessarBiometria`)

- Arquivo novo: `api/infrastructure/queue/handler/SelarDocumentoVault/index.js`.
- Depende de: L2.1 (usa `copiarDoWip`/`selarDocumento`), L2.3 (fila registrada).
- Passagem 1 (sem lock): payload traz `documento_id` (mínimo) → SELECT documento → status deve ser `DOCUMENTO_ASSINADO` (senão: sem retentativa, exceto se já tiver `bucket_valt_path` preenchido → sucesso idempotente) → `hash_final` presente → último elo da trilha mestre é `DOCUMENTO_SELADO` (senão: sem retentativa, é sinal de corrida com `AplicarAssinatura`) → magic `%PDF` no objeto do WIP.
- Gateway (fora da trx): `copiarDoWip` → obter o objeto recém-copiado no Vault e recalcular SHA-256 → comparar com `documento.hash_final` (`timingSafeEqual`) → se divergir: **sem retentativa**, loga como falha grave (isso indicaria corrupção na cópia, não corrida) → só then chamar `selarDocumento` (trava `COMPLIANCE`) — Object Lock é irreversível, por isso a trava só acontece depois da conferência de hash.
- `this.trx = await knex.transaction()` → `forUpdate()` no documento, revalidar `status`/`hash_final`/ainda sem `bucket_valt_path` → `update tab_documentos set bucket_valt_path` → `LedgerDocumento.Initialize(old) + GravarAuditoriaModificacao` (evento novo, ex.: reaproveitar padrão de eventos existentes; não inventar `statusDocumentos` novo) → `tab_historico` → `commit`.
- Depois do commit: apagar o objeto do WIP é **opcional e só entra numa tarefa futura** (L2.5, não abrir agora) — esta tarefa L2.4 **não apaga nada do WIP**, só copia e trava o Vault. GET continua funcionando (WIP intacto).
- Endereços permitidos: `VaultController` (L2.1), `bucketGateway.Wip()` (leitura/hash), `LedgerDocumento` (já existe, mesmo helper usado por `AplicarAssinatura`), `tab_historico`. Proibido inventar novo helper de ledger.

### L2.5 — Dispatch pós-commit do último signatário (sequencial, depende de L1.1 e L2.3)

- Arquivo: `api/infrastructure/queue/handler/AplicarAssinatura/index.js` — só o método `#persistir` (adicionar `documentoFinalizado` no objeto de retorno quando `todosAssinaram`) e o fim de `processar()` (dispatch da fila `selardocumentovault` só se `persistencia.documentoFinalizado`, sempre **depois** de `#persistir` já ter dado commit).
- Depende de: L1.1 mesclada (mesmo arquivo), L2.3 mesclada (fila existe), L2.4 mesclada (worker existe e é seguro receber mensagem).
- Proibido: selar dentro de `#persistir`/dentro da trx de assinatura. Fila só entra depois do `await trx.commit()` que já existe em `#persistir`.
- Validação: assinar um documento com 1 e com N signatários (ordem simples e por ordem) — mensagem `selardocumentovault` só é publicada uma vez, no signatário que fecha o documento; workers de biometria/hash-inicial continuam intocados.

### L2.6 — Apagar do WIP (opcional, só depois de L2.4/L2.5 estáveis em ambiente real)

- Não abrir nesta rodada. Registrar no `.md` final como próximo passo condicionado a X dias de operação estável do Vault sem incidente. Delete falho = log + sucesso (nunca desfaz o selado).

## Leva 3 — Política de assinatura no selo (obrigatória)

Só começa depois de L0.B reconfirmado ao vivo (T3.1) e depois de L1.3/L1.4 mescladas (o certificado já sabe exibir cadeia e bloco de hash antes de aprender a exigir OID).

### L3.1 — Confirmar valores oficiais ao vivo (pré-requisito, não é código)

- Reconferir, no momento de implementar, em `https://www.gov.br/iti/pt-br/assuntos/repositorio/lista-de-politicas-de-assinatura` e `.../artefatos-de-assinatura-digital`: OID vigente da PA_AD_RB PAdES, a URL "em linguagem de máquina", e o hash interno da PA (não o hash da LPA). Se a versão tiver mudado da 1.3 encontrada nesta sessão, usar a nova — nunca a desta sessão "porque já foi pesquisada".
- Entregável: bloco de constantes (OID, URI, hash, algoritmo) documentado no `.md` final com a data da consulta e o link exato usado — nada de valor solto sem fonte.

### L3.2 — Worker customizado no SignServer

- Escopo: `serversign/` (Java + config), **fora** do estilo Node/Gabriel (é infraestrutura de assinatura, não use case). Novo módulo Java que estende `org.signserver.module.cmssigner.CMSSigner` (ou implementa um `Signer` próprio reaproveitando o máximo de `CMSSigner`), sobrescrevendo a geração de atributos assinados para incluir `SignaturePolicyIdentifier` (OID 0.B, qualificador `spuri` com a URL 0.B, hash SHA-256 da PA de L3.1, sem `parameters` no `AlgorithmIdentifier`).
- Empacotar como JAR customizado, copiado para o classpath do SignServer no `Dockerfile` (`serversign/Dockerfile`), registrado como novo `IMPLEMENTATION_CLASS` num worker (`CMSSignerCarimbo` continua existindo; decidir entre migrar `CMSSignerCarimbo` para a nova classe — mesma chave/e-CNPJ, sem reprovisionar HSM — ou subir um worker novo lado a lado até validar).
- Conferir `signatureLength: 32768` do placeholder em `aplicarSeloPlataforma` ainda cabe com o atributo novo (CMS fica maior) — se não couber, ajustar o placeholder em `api/infrastructure/gateways/PdfSign/aplicarAssinaturaPdf.js`, não no worker.
- Proibido: reprovisionar HSM, sobrescrever e-CNPJ, apagar `.docker/softhsm`/`.docker/shared`.
- Validação: `carimbarHash` (mesmo endpoint client-side-hashing) devolve CMS que, decodificado via `node-forge`, contém o atributo com o OID esperado; ITI (`validar.iti.gov.br`) ainda aceita o PDF final com o novo CMS.

### L3.3 — `#verificarProfundo` passa a exigir o OID

- Arquivo: `gerarCertificadoAuditoriaUseCase.js` (`#verificarProfundo`, mesmo método de L1.3 — sequencial, depende de L1.3/L1.4 mescladas).
- Adicionar extração do atributo `SignaturePolicyIdentifier` do CMS (`node-forge` ou parse ASN.1 manual do OID 1.2.840.113549.1.9.16.2.15) → novo campo `politica_no_cms: { presente, oid, uri }`.
- Prod (`statusAplication.status === prod`) sem atributo → falha visível (entra no cálculo de `veredito_geral` ou gera observação forte, a decidir no code review desta tarefa — nunca texto genérico eterno). Dev → observação, sem derrubar veredito.

### L3.4 — `politica_assinatura` real no certificado

- Mesmo arquivo, trecho `~129` (`assinatura_criptografica.politica_assinatura`).
- Troca a frase fixa "Não configurada no worker atual…" por objeto com `oid`, `uri`, `hash_pa`, `algoritmo_hash` (valores de L3.1), só depois que L3.2/L3.3 confirmarem em produção que o CMS carrega o atributo. Enquanto o worker novo não estiver validado em prod, manter o texto atual (não trocar a mensagem antes de o CMS realmente trazer o OID — regra de ouro do usuário).
- Validação: para um documento assinado com o worker novo, o JSON do certificado mostra OID/URI reais e `politica_no_cms.presente === true`; para documentos assinados antes da virada (worker antigo), o certificado não finge que eles têm política — mostra o texto genérico antigo para esses casos (checar por presença do atributo no CMS, não por data).

## Registro final obrigatório

Arquivo `docs/relatorios/sprint-selo-icp-worm-integridade.md` (criar no início da L1, atualizar ao fim de cada leva), com as seções: Objetivo, Decisões, a tabela da seção 0.C (agora sim como tabela, já que é o arquivo de relatório e não este plano), "o que cada leva fechou", furos que ficaram conscientemente, e para a L3 especificamente: comando exato usado para confirmar o OID no CMS gerado (para auditoria futura poder reproduzir sem depender de memória de agente).

## Sequenciamento para evitar colisão entre agentes

- `AplicarAssinatura/index.js`: L1.1 → L2.5 (nessa ordem, mesmo arquivo).
- `gerarCertificadoAuditoriaUseCase.js`: L1.3 → L1.4 → L3.3 → L3.4 (nessa ordem, mesmo arquivo; L1.3/L1.4 podem ser a mesma tarefa se for o mesmo agente).
- `VaultController.js`: só L2.1 (arquivo exclusivo dessa tarefa).
- `certs/index.js`: só L2.3 adiciona uma chave nova (não conflita com nada além de merge trivial).
- Tudo mais (L1.2, L2.2, L2.4, L3.1, L3.2) tem arquivo/escopo exclusivo e pode rodar em paralelo com qualquer outra leva, respeitando as dependências de "depende de" listadas em cada tarefa.
