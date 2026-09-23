import axios from "axios";
import { conection } from "../../utils";

// Fluxo público de assinatura (sessão própria do painel, usuário já logado):
// GET  /assinatura/sessao/progresso  -> retoma a etapa após refresh
// POST /assinatura/sessao            -> { documento_id }
// POST /assinatura/sessao/2fa        -> { token } -> { url, id } (PUT da selfie)
// POST /assinatura/sessao/confirmarFoto -> { id_identificador }
// GET  /assinatura/sessao/statusFoto -> polling do FaceMatch
// GET  /assinatura/documentos/:id           -> documento + signatário + demarcações
// POST /assinatura/documentos/:id/estampa-url -> { id: evento_id }
// POST /assinatura/documentos/:id/assinar     -> { id: evento_id } (modo DADOS fixo no servidor)
// GET  /assinatura/documentos/:id/status      -> polling até status terminal
// GET  /assinatura/documentos/:id/download    -> url final
const http = conection.auth();

const msgFrom = (err, fallback) => err?.response?.data?.msg || fallback;

// Além de 401/403, os controllers de assinatura devolvem 400 com essa mesma
// mensagem quando req.session.user já não existe (ex.: cookie expirou no meio
// da cerimônia) — sem isso o front trata como erro genérico e nunca volta pro
// painel.
const SESSAO_EXPIRADA_MSG = /sess[aã]o expirada,?\s*fa[çc]a login novamente/i;
const sessaoExpirada = (err) => {
  const status = err?.response?.status;
  if (status === 401 || status === 403) return true;
  return SESSAO_EXPIRADA_MSG.test(err?.response?.data?.msg || "");
};

export const assinaturaApi = {
  async getProgresso(documentoId) {
    try {
      const { data } = await http.get("/assinatura/sessao/progresso", {
        params: { documento_id: documentoId },
      });
      return { status: true, data: data?.data };
    } catch (err) {
      return {
        status: false,
        sessaoExpirada: sessaoExpirada(err),
        msg: msgFrom(err, "Erro ao consultar o progresso da assinatura."),
        data: err?.response?.data?.data,
      };
    }
  },

  async criarSessao(documentoId) {
    try {
      const { data } = await http.post("/assinatura/sessao", {
        documento_id: documentoId,
      });
      // Retomada de sessão viva: o backend devolve data.etapa igual ao progresso
      // (sem isso o hub não sabe pular OTP/câmera de quem já passou dessas fases).
      return { status: true, msg: data?.msg, data: data?.data };
    } catch (err) {
      return {
        status: false,
        sessaoExpirada: sessaoExpirada(err),
        msg: msgFrom(err, "Erro ao iniciar a sessão de assinatura."),
        data: err?.response?.data?.data,
      };
    }
  },

  async confirmar2FA(token) {
    try {
      const { data } = await http.post("/assinatura/sessao/2fa", { token });
      return { status: true, msg: data?.msg, data: data?.data };
    } catch (err) {
      return {
        status: false,
        sessaoExpirada: sessaoExpirada(err),
        msg: msgFrom(err, "Código de autenticação inválido."),
        data: err?.response?.data?.data,
      };
    }
  },

  // PUT direto na URL presignada — sem cookies/CSRF/headers do painel.
  async uploadSelfie(url, blob) {
    try {
      await axios.put(url, blob, {
        headers: { "Content-Type": blob.type || "image/jpeg" },
      });
      return { status: true };
    } catch (err) {
      return {
        status: false,
        msg: "Falha no envio da foto. Tente novamente.",
      };
    }
  },

  async confirmarFoto(idIdentificador) {
    try {
      const { data } = await http.post("/assinatura/sessao/confirmarFoto", {
        id_identificador: idIdentificador,
      });
      return { status: true, msg: data?.msg };
    } catch (err) {
      return {
        status: false,
        sessaoExpirada: sessaoExpirada(err),
        msg: msgFrom(err, "Erro ao confirmar o recebimento da foto."),
        data: err?.response?.data?.data,
      };
    }
  },

  // documentoId é fallback pro backend reconstruir a sessão da cerimônia
  // (novo login/cookie no meio do polling) — sem ele cai só na sessão em memória.
  async getStatusFoto(documentoId) {
    try {
      const { data } = await http.get("/assinatura/sessao/statusFoto", {
        params: documentoId ? { documento_id: documentoId } : undefined,
      });
      return { status: true, data: data?.data };
    } catch (err) {
      return {
        status: false,
        sessaoExpirada: sessaoExpirada(err),
        msg: msgFrom(err, "Erro ao consultar o status da biometria."),
      };
    }
  },

  async getDocumento(documentoId) {
    try {
      const { data } = await http.get(`/assinatura/documentos/${documentoId}`);
      return { status: true, data: data?.data };
    } catch (err) {
      return {
        status: false,
        sessaoExpirada: sessaoExpirada(err),
        msg: msgFrom(err, "Erro ao carregar o documento."),
      };
    }
  },

  // checkBody global rejeita objeto vazio — manda documento_id mesmo o controller não lendo o body.
  async getEstampaUploadUrl(documentoId) {
    try {
      const { data } = await http.post(
        `/assinatura/documentos/${documentoId}/estampa-url`,
        { documento_id: documentoId }
      );
      return { status: true, data: data?.data };
    } catch (err) {
      return {
        status: false,
        sessaoExpirada: sessaoExpirada(err),
        msg: msgFrom(err, "Erro ao preparar a assinatura do documento."),
        data: err?.response?.data?.data,
      };
    }
  },

  // id = id do evento devolvido por getEstampaUploadUrl. Modo é sempre DADOS no servidor.
  async assinar(documentoId, eventoId) {
    try {
      const { data } = await http.post(
        `/assinatura/documentos/${documentoId}/assinar`,
        { id: eventoId }
      );
      return { status: true, msg: data?.msg, data: data?.data };
    } catch (err) {
      return {
        status: false,
        sessaoExpirada: sessaoExpirada(err),
        msg: msgFrom(err, "Erro ao solicitar a assinatura."),
        data: err?.response?.data?.data,
      };
    }
  },

  async getStatus(documentoId) {
    try {
      const { data } = await http.get(
        `/assinatura/documentos/${documentoId}/status`
      );
      return { status: true, data: data?.data };
    } catch (err) {
      return {
        status: false,
        sessaoExpirada: sessaoExpirada(err),
        msg: msgFrom(err, "Erro ao consultar o status da assinatura."),
      };
    }
  },

  async getDownload(documentoId) {
    try {
      const { data } = await http.get(
        `/assinatura/documentos/${documentoId}/download`
      );
      return { status: true, data: data?.data };
    } catch (err) {
      return {
        status: false,
        sessaoExpirada: sessaoExpirada(err),
        msg: msgFrom(err, "Erro ao gerar o link de download."),
      };
    }
  },
};
