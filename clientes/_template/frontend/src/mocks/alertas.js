export const mockAlertas = [
  {
    id: "al-1",
    tipo: "CONVITE_FALHA",
    titulo: "Falha ao enviar convite",
    descricao:
      "Não foi possível entregar o convite para bruno.lima@exemplo.com na solicitação Contrato Q3.",
    lido: false,
    criado_em: "2026-08-08 17:10:00",
    solicitacao_id: "sol-1001",
  },
  {
    id: "al-2",
    tipo: "HASH_ERRO",
    titulo: "Erro no processamento do hash",
    descricao:
      "A solicitação Procuração eletrônica falhou no carimbo inicial. Revise o arquivo e tente novamente.",
    lido: false,
    criado_em: "2026-08-06 08:12:30",
    solicitacao_id: "sol-1004",
  },
  {
    id: "al-3",
    tipo: "ASSINATURA",
    titulo: "Assinatura concluída",
    descricao: "Bruno Lima assinou o documento Contrato Q3.",
    lido: true,
    criado_em: "2026-08-07 16:22:00",
    solicitacao_id: "sol-1001",
  },
  {
    id: "al-4",
    tipo: "UPLOAD",
    titulo: "Upload concluído",
    descricao: "NDA — Parceria Beta está pronto para cadastro de signatários.",
    lido: true,
    criado_em: "2026-08-07 14:55:00",
    solicitacao_id: "sol-1003",
  },
];
