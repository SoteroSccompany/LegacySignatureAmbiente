import { conection } from "../../utils";

// Tipos reais de api/certs/index.js -> tipo_termo_responsabilidade
export const TIPO_TERMO = {
  DOCUMENTO: "TERMO_DOCUMENTO",
  FOTO_PERFIL: "TERMO_FOTO_PERFIL",
};

const http = conection.auth();

const msgFrom = (err, fallback) => err?.response?.data?.msg || fallback;
const sessaoExpirada = (err) =>
  err?.response?.status === 401 || err?.response?.status === 403;

// GET /termo-responsabilidade usa SearchParams genérico (filter/search/page/per_page),
// não tem query dedicada para tipo_termo — filtramos pelo mesmo par filter+search do resto do painel.
export const termoApi = {
  async getTermoPorTipo(tipo) {
    try {
      const { data } = await http.get("/termo-responsabilidade", {
        params: { filter: "tipo_termo", search: tipo, per_page: 20, page: 0 },
      });
      const termo = (data?.data || []).find(
        (t) => t.tipo_termo === tipo && t.ativo
      );
      if (!termo) {
        return {
          status: false,
          msg: "Termo de responsabilidade não encontrado ou inativo.",
        };
      }
      return { status: true, data: termo };
    } catch (err) {
      return {
        status: false,
        sessaoExpirada: sessaoExpirada(err),
        msg: msgFrom(err, "Erro ao carregar o termo de responsabilidade."),
      };
    }
  },

  // Usado quando a API já devolve o termo_id exato exigido (documento.termo_id) —
  // evita aceitar o termo "atual" do tipo quando o documento foi vinculado a
  // uma versão anterior.
  async getTermoPorId(id) {
    try {
      const { data } = await http.get("/termo-responsabilidade", {
        params: { filter: "id", search: id, per_page: 1, page: 0 },
      });
      // O aceite na API recusa termo inativo ("Termo de responsabilidade não
      // está ativo.") — exibir um termo desativado só travaria o usuário no
      // aceite; devolvendo !status aqui, o hub cai no fallback do tipo.
      const termo = (data?.data || []).find((t) => t.id === id && t.ativo);
      if (!termo) {
        return {
          status: false,
          msg: "Termo de responsabilidade não encontrado ou inativo.",
        };
      }
      return { status: true, data: termo };
    } catch (err) {
      return {
        status: false,
        sessaoExpirada: sessaoExpirada(err),
        msg: msgFrom(err, "Erro ao carregar o termo de responsabilidade."),
      };
    }
  },

  // Mesmo handler para /aceite e /aceite-imagem — sem OTP, só o termo_id.
  // documentoId é opcional: sem ele o aceite é global (onboarding de foto).
  async aceitar(termoId, documentoId) {
    try {
      const { data } = await http.post("/termo-responsabilidade/aceite", {
        termo_id: termoId,
        ...(documentoId ? { documento_id: documentoId } : {}),
      });
      return { status: true, msg: data?.msg || "Termo aceito com sucesso." };
    } catch (err) {
      return {
        status: false,
        sessaoExpirada: sessaoExpirada(err),
        msg: msgFrom(err, "Erro ao registrar o aceite do termo."),
      };
    }
  },
};
