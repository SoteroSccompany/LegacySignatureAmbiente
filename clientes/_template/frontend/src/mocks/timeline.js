export const getTimelineBySolicitacao = (solicitacaoId) => {
  const base = [
    {
      id: "ev-1",
      sequencia: 1,
      label: "SOLICITACAO_ASSINATURA_UPLOAD_ARQUIVO",
      titulo: "Arquivo enviado",
      descricao: "PDF recebido e armazenado para processamento.",
      em: "2026-08-05 09:14:00",
    },
    {
      id: "ev-2",
      sequencia: 2,
      label: "UPLOAD_CONCLUIDO_NAO_PROCESSADO",
      titulo: "Hash e carimbo concluídos",
      descricao: "Documento validado e pronto para signatários.",
      em: "2026-08-05 09:16:20",
    },
    {
      id: "ev-3",
      sequencia: 3,
      label: "ASSINATURA_SOLICITADA",
      titulo: "Assinaturas solicitadas",
      descricao: "Convites distribuídos aos signatários.",
      em: "2026-08-05 10:02:00",
    },
  ];

  if (solicitacaoId === "sol-1004") {
    return [
      base[0],
      {
        id: "ev-err",
        sequencia: 2,
        label: "ERRO_HASH_INICIAL",
        titulo: "Erro no hash inicial",
        descricao: "Falha ao carimbar o documento. Verifique o arquivo.",
        em: "2026-08-06 08:12:00",
        erro: true,
      },
    ];
  }

  if (solicitacaoId === "sol-1005") {
    return [
      ...base,
      {
        id: "ev-4",
        sequencia: 4,
        label: "DOCUMENTO_COMPLETO",
        titulo: "Documento concluído",
        descricao: "Todas as assinaturas foram aplicadas.",
        em: "2026-07-30 18:45:00",
      },
    ];
  }

  return base;
};
