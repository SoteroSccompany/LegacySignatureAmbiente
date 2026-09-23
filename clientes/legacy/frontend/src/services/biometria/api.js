import axios from "axios";
import { conection } from "../../utils";

// Cadastro do rosto de referência do próprio usuário (perfil biométrico).
// GET  /perfil-biometria/solicitacao -> cria desafio + grava sessão do servidor, devolve { status, msg, url }
// PUT  direto na url (sem cookies/CSRF do painel)
// POST /perfil-biometria/cadastro -> { token } — só registra a foto como pendente de aprovação do admin,
// não gera embedding aqui.
const http = conection.auth();

const msgFrom = (err, fallback) => err?.response?.data?.msg || fallback;

export const biometriaApi = {
  async getMinhaBiometria() {
    try {
      const { data } = await http.get("/perfil-biometria/me");
      return { status: true, exit: data?.exit, data: data?.data || null };
    } catch (err) {
      return {
        status: false,
        msg: msgFrom(err, "Erro ao carregar o status da biometria."),
      };
    }
  },

  async solicitarUploadFoto() {
    try {
      const { data } = await http.get("/perfil-biometria/solicitacao");
      return { status: true, msg: data?.msg, url: data?.url };
    } catch (err) {
      return {
        status: false,
        msg: msgFrom(err, "Erro ao solicitar o cadastro da biometria."),
      };
    }
  },

  async uploadFoto(url, blob) {
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

  async confirmarCadastro(token) {
    try {
      const { data } = await http.post("/perfil-biometria/cadastro", {
        token,
      });
      return {
        status: true,
        msg:
          data?.msg ||
          "Perfil biométrico cadastrado. Aguarde a validação do administrador.",
      };
    } catch (err) {
      return {
        status: false,
        msg: msgFrom(err, "Código inválido."),
      };
    }
  },
};
