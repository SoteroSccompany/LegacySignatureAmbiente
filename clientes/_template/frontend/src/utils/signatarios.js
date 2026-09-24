import { onlyDigits } from "./validators/identity";

// Tamanho fixo do quadro de assinatura exigido pelo use case real
// (api/@core/usecase/Signatarios/createSignatariosUseCase.js -> #validarPayload,
// valor em api/certs/index.js -> quadro_assinatura_tamanho). Não redimensionar.
export const QUADRO_ASSINATURA_PT = { largura: 230, altura: 115 };

// DDI 55 na frente deixa o número com mais de 11 dígitos e a checagem
// de telefone (10 ou 11) recusa. Fica com os últimos 11.
export const normalizarTelefone = (telefone) => {
  let digits = onlyDigits(telefone);
  if (digits.startsWith("55") && digits.length > 11) digits = digits.slice(-11);
  return digits;
};

// Linha que o formulário abre em branco. Autoassinatura não entra aqui:
// os campos vazios são de propósito, o backend preenche.
export const linhaSignatarioVazia = (s) => {
  if (!s || s.autoAssinatura) return false;
  return (
    !(s.nome || "").trim() &&
    !(s.email || "").trim() &&
    !onlyDigits(s.cpf || "") &&
    !onlyDigits(s.telefone || "")
  );
};

export const signatariosEfetivos = (lista) =>
  (lista || []).filter((s) => !linhaSignatarioVazia(s));

// Coordenadas relativas (origem top-left, 0..1) -> pontos PDF (origem
// bottom-left, pdf-lib). Contrato da API: [{ data: {nome, email, cpf, telefone, ordem?},
// sign: [{tipo, pagina, x, y, largura, altura, pdf, pagina_tamanho}] }]
export const montarPayloadSignatarios = (
  signatarios,
  areas,
  pageSize = { width: 612, height: 792 }
) => {
  const r2 = (n) => Math.round(n * 100) / 100;

  return signatariosEfetivos(signatarios).map((s) => ({
    data: {
      nome: (s.nome || "").trim(),
      email: (s.email || "").trim(),
      cpf: onlyDigits(s.cpf || ""),
      telefone: normalizarTelefone(s.telefone || ""),
      ordem: null,
      ...(s.autoAssinatura ? { auto_assinatura: true } : {}),
    },
    sign: areas
      .filter((a) => a.signatarioId === s.id)
      .map((a) => {
        // Documento pode ter páginas com tamanhos diferentes — a área guarda
        // o tamanho da página em que foi demarcada; sem isso cai no pageSize
        // (página 1) recebido do viewer.
        const pageW = a.pageWidth || pageSize.width || 612;
        const pageH = a.pageHeight || pageSize.height || 792;
        return {
          tipo: "assinatura",
          pagina: a.page || 1,
          x: a.x,
          y: a.y,
          largura: a.width,
          altura: a.height,
          pdf: {
            // Tamanho enviado sempre igual ao fixo do certs — a área desenhada
            // na tela (a.width/a.height) já nasce com essa proporção, mas
            // arredondamos aqui pro valor exato pra não cair em quebra de
            // ponto flutuante contra a checagem estrita do use case.
            x: r2(a.x * pageW),
            y: r2(pageH - (a.y + a.height) * pageH),
            largura: QUADRO_ASSINATURA_PT.largura,
            altura: QUADRO_ASSINATURA_PT.altura,
            origem: "bottom-left",
            unidade: "pt",
          },
          pagina_tamanho: { largura: r2(pageW), altura: r2(pageH) },
        };
      }),
  }));
};

export const cores = ["#0F766E", "#0B1F33", "#14B8A6", "#334155", "#0D5F58"];

export const criarSignatarioVazio = (index = 0) => ({
  id: `tmp-${Date.now()}-${index}`,
  nome: "",
  email: "",
  cpf: "",
  telefone: "",
  autoAssinatura: false,
  usuarioSelecionadoId: null,
  cor: cores[index % cores.length],
});
