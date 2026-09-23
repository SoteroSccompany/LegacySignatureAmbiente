---
name: Hash truncado/ausente na folha de auditoria do PDF
overview: "Ajuste pontual em `adicionarFolhaAuditoria` (api/infrastructure/gateways/PdfSign/aplicarAssinaturaPdf.js): a linha \"Hash do documento\" da folha impressa no PDF final corta o SHA-256 em 32 caracteres + \"...\" para todo elo que tem hash, e imprime um \"-\" cru (sem explicação) para os elos FOLHA_AUDITORIA_GERADA e DOCUMENTO_SELADO, cujo hash é estrutural e propositalmente indisponível no momento em que a página é desenhada (dependência circular já resolvida na leva L1.1 do sprint anterior, mas sem o texto explicativo que a própria validação daquela leva previa)."
todos:
  - id: T1
    content: "Remover o truncamento de 32 caracteres + '...' em adicionarFolhaAuditoria (aplicarAssinaturaPdf.js, bloco 'Hash do documento'): imprimir o SHA-256 completo (64 hex) para todo elo com hash_documento_final preenchido — cabe na largura disponível da página (~487pt) em fonte 8pt Helvetica sem quebra de linha"
    status: completed
  - id: T2
    content: "Elos FOLHA_AUDITORIA_GERADA e DOCUMENTO_SELADO (hash_documento_final null, indisponível por dependência circular): decisão final foi omitir a linha 'Hash do documento' inteira nesses dois casos (sem '-', sem texto explicativo), em vez de imprimir um marcador. O código de verificação (HMAC-SHA256, já impresso no topo da mesma folha) continua sendo a referência para conferir o certificado completo em /verificar. Sem tocar no valor gravado em tab_auditoria_ledger"
    status: completed
isProject: false
---

# Hash truncado/ausente na folha de auditoria do PDF

## Diagnóstico

Sintoma relatado: na folha de auditoria impressa no PDF final (seção "Trilha de assinatura"), os itens 14 (`FOLHA_AUDITORIA_GERADA`) e 15 (`DOCUMENTO_SELADO`) mostram `Hash do documento: -`, e os demais elos mostram o hash cortado (não "por completo").

Local exato: `api/infrastructure/gateways/PdfSign/aplicarAssinaturaPdf.js`, função `adicionarFolhaAuditoria`, loop `for (const elo of trilha)`:

```206:208:api/infrastructure/gateways/PdfSign/aplicarAssinaturaPdf.js
            const hashDoc = String(elo.hash_documento_final || '-');
            const hashTxt = hashDoc.length > 32 ? `${hashDoc.substring(0, 32)}...` : hashDoc;
            page.drawText(`Hash do documento: ${hashTxt}`, { x: margin + 12, y: cursorY, size: 8, font, color: corSecundaria });
```

Duas causas distintas, tratamento diferente para cada uma:

1. **"-" nos elos FOLHA_AUDITORIA_GERADA/DOCUMENTO_SELADO — comportamento intencional, mas incompleto.** O array `trilha` é montado em `api/infrastructure/queue/handler/AplicarAssinatura/index.js` (~linhas 256-271) com `hash_documento_final: null` para esses dois elos, de propósito: o hash final da própria folha só existe depois que a folha é desenhada (`hashAposFolha`, calculado na linha ~280, **depois** da chamada a `adicionarFolhaAuditoria`), e o hash final do selo só existe depois do PAdES ser aplicado (`this.hashPdf`, linha ~287, também depois). É uma dependência circular real — a página não pode imprimir o hash de si mesma antes de existir. Isso já foi corrigido de propósito na leva **L1.1** do plano anterior (`.cursor/plans/selo_icp-brasil,_worm_e_integridade_da_cadeia_e1d8d0fd.plan.md`, registrado em `docs/relatorios/sprint-selo-icp-worm-integridade.md`, seção L1.1): antes, a folha imprimia um hash **errado** (`hashAposEstampa`, de antes da folha, rotulado como se fosse dela); a correção trocou isso por `null`. Mas o critério de validação daquela leva previa a folha mostrar `"—"/"disponível na trilha completa"` — e o que ficou implementado foi só o `'-'` cru (`aplicarAssinaturaPdf.js` já tratava `null` com `|| '-'`, então "não precisou mudar" — mas o texto explicativo nunca foi escrito). O hash real desses dois elos **está** correto no banco (`tab_auditoria_ledger.hash_documento_final`) e aparece certo no certificado de auditoria (`gerarCertificadoAuditoriaUseCase`, bloco `conferencia_documento`) — só não pode aparecer nesta página impressa no momento em que ela é gerada.

2. **Truncamento em 32 caracteres — bug real, sem relação com o item acima.** Um SHA-256 em hex tem 64 caracteres. A linha corta para 32 + `"..."`, ou seja, imprime só a metade do hash de qualquer elo que tenha valor (ex.: `ASSINATURA_APLICADA`, e qualquer elo herdado de `trilhaRows`). Meio hash reduz o valor de prova do documento impresso (não é conferível por si só) e não existe necessidade de espaço: com fonte Helvetica 8pt, o hash completo (64 caracteres) ocupa ~285pt e a largura disponível na página a partir de `margin + 12` até `pageWidth - margin` é de ~487pt — cabe em uma linha sem quebra, mesmo com o rótulo `"Hash do documento: "` na frente.

## Ajuste aplicado (T1 + T2, mesmo bloco)

```javascript
if (elo.hash_documento_final) {
    page.drawText(`Hash do documento: ${elo.hash_documento_final}`, { x: margin + 12, y: cursorY, size: 8, font, color: corSecundaria });
    novaLinha(16);
} else {
    novaLinha(4);
}
```

- Elo com hash: imprime o SHA-256 completo (64 chars), sem cortar.
- Elo sem hash (FOLHA_AUDITORIA_GERADA, DOCUMENTO_SELADO): a linha "Hash do documento" não é desenhada — decisão explícita do usuário de remover em vez de imprimir um marcador (`-`) ou um texto explicativo. `novaLinha(4)` só mantém um respiro pequeno antes do próximo elo, no lugar do espaçamento de 16pt que a linha de hash ocupava. Nenhum valor persistido em `tab_auditoria_ledger`/`AplicarAssinatura` foi tocado — só a impressão.

## Endereços permitidos

- Só o bloco de 3 linhas citado, dentro de `adicionarFolhaAuditoria`, em `api/infrastructure/gateways/PdfSign/aplicarAssinaturaPdf.js`.
- Nenhuma mudança em `AplicarAssinatura/index.js` (o array `trilha` já está correto — a causa raiz é só a impressão), nem em `gerarCertificadoAuditoriaUseCase.js`, nem em cálculo/gravação de hash.

## Proibido

- Recalcular ou inventar um hash para FOLHA_AUDITORIA_GERADA/DOCUMENTO_SELADO nesta página (a dependência circular é real — não fingir um valor).
- Mudar o valor gravado em `tab_auditoria_ledger.hash_documento_final` (esse já está certo).
- Alterar `#verificarEstrutural`/`#verificarProfundo`/`veredito_geral` do certificado (fora de escopo, não relacionado).

## Validação

- Assinar um documento de teste com 1 signatário (fluxo completo até o selo) e abrir a folha de auditoria anexada ao PDF final:
  - Linha do elo `ASSINATURA_APLICADA` mostra o SHA-256 completo (64 caracteres), sem `...`.
  - Linhas `FOLHA_AUDITORIA_GERADA` e `DOCUMENTO_SELADO` não mostram mais a linha "Hash do documento" (nem `-`, nem texto) — só sequência/tipo de evento/objeto/data, com espaçamento levemente menor antes do próximo elo.
  - Nenhuma linha estoura a margem direita da página (conferir visualmente).
- Conferir que `tab_auditoria_ledger.hash_documento_final` dos elos `FOLHA_AUDITORIA_GERADA`/`DOCUMENTO_SELADO` permanece preenchido com o valor real de sempre (comportamento de gravação intocado) e que o certificado de auditoria (`/verificar`) continua mostrando esses hashes certos em `conferencia_documento`.
