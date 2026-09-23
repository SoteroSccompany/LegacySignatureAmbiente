import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../../../Components/Header";
import { DocumentPlusIcon } from "@heroicons/react/24/outline";
import { toast } from "react-toastify";
import { getPanelService } from "../../../services/panel";
import { TIPO_TERMO_RESPONSABILIDADE } from "../../../services/panel/types";
import { isValidOtp, MSG } from "../../../utils/validators/identity";
import { jsonConfig } from "../../../Config";

// Fluxo real (createTermoResponsabilidadeUseCase): GET /solicitacao gera o
// desafio OTP com o próprio secret 2FA do admin; POST /termo-responsabilidade
// só aceita o token desse desafio (sessão/usuário/tipo_desafio corretos).
const NovoTermo = () => {
  const navigate = useNavigate();
  const panel = getPanelService();
  const [tituloTermo, setTituloTermo] = useState("");
  const [descricaoTermo, setDescricaoTermo] = useState("");
  const [tipoTermo, setTipoTermo] = useState(TIPO_TERMO_RESPONSABILIDADE.TERMO_DOCUMENTO);
  const [token, setToken] = useState("");
  const [codigoSolicitado, setCodigoSolicitado] = useState(false);
  const [solicitando, setSolicitando] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const solicitarCodigo = async () => {
    if (!tituloTermo.trim() || !descricaoTermo.trim()) {
      toast.error("Preencha título e descrição antes de solicitar o código.");
      return;
    }
    setSolicitando(true);
    try {
      const resp = panel.solicitarTokenTermo
        ? await panel.solicitarTokenTermo()
        : { status: false, msg: "Indisponível na demo." };
      if (!resp.status) {
        toast.error(resp.msg || "Erro ao solicitar código.");
        return;
      }
      toast.success(resp.msg || "Código gerado.");
      setCodigoSolicitado(true);
    } finally {
      setSolicitando(false);
    }
  };

  const salvar = async () => {
    if (!isValidOtp(token)) {
      toast.error(MSG.otpInvalido);
      return;
    }
    setSalvando(true);
    try {
      const resp = panel.createTermo
        ? await panel.createTermo({
            titulo_termo: tituloTermo.trim(),
            descricao_termo: descricaoTermo.trim(),
            tipo_termo: tipoTermo,
            token,
          })
        : { status: false, msg: "Indisponível na demo." };
      if (!resp.status) {
        toast.error(resp.msg || "Erro ao criar o termo.");
        return;
      }
      toast.success(resp.msg || "Termo criado.");
      navigate("/termos");
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div>
      <Header
        title="Novo termo de responsabilidade"
        description="Vinculado à criação de solicitações de documento ou ao consentimento de foto de perfil"
        icon={DocumentPlusIcon}
        hasReturn
        buttonReturnAction={() => navigate("/termos")}
      />

      <div className="p-6 max-w-2xl">
        <div className="bg-white border border-gray-100 rounded-brand p-6 shadow-sm space-y-4">
          <div>
            <label className="block text-sm font-semibold text-brand-ink mb-1.5">
              Título do termo
            </label>
            <input
              value={tituloTermo}
              onChange={(e) => setTituloTermo(e.target.value)}
              disabled={codigoSolicitado}
              className="w-full rounded-brand border border-gray-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-teal disabled:bg-gray-50"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-brand-ink mb-1.5">
              Descrição / texto do termo
            </label>
            <textarea
              value={descricaoTermo}
              onChange={(e) => setDescricaoTermo(e.target.value)}
              disabled={codigoSolicitado}
              rows={6}
              className="w-full rounded-brand border border-gray-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-teal disabled:bg-gray-50"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-brand-ink mb-1.5">
              Tipo do termo
            </label>
            <select
              value={tipoTermo}
              onChange={(e) => setTipoTermo(e.target.value)}
              disabled={codigoSolicitado}
              className="w-full rounded-brand border border-gray-200 px-3 py-2.5 text-sm bg-white outline-none focus:ring-2 focus:ring-brand-teal disabled:bg-gray-50"
            >
              <option value={TIPO_TERMO_RESPONSABILIDADE.TERMO_DOCUMENTO}>
                Termo para documento
              </option>
              <option value={TIPO_TERMO_RESPONSABILIDADE.TERMO_FOTO_PERFIL}>
                Consentimento de foto de perfil
              </option>
            </select>
          </div>

          {!codigoSolicitado ? (
            <button
              type="button"
              onClick={solicitarCodigo}
              disabled={solicitando}
              className="w-full bg-brand-navy hover:bg-brand-navy-light disabled:opacity-50 text-white text-sm font-bold py-3 rounded-brand"
            >
              {solicitando ? "Gerando código…" : "Solicitar código de confirmação"}
            </button>
          ) : (
            <>
              <div className="bg-brand-tip rounded-brand p-3 text-xs text-brand-slate">
                {jsonConfig.uiMock
                  ? "Na demo, qualquer código de 6 dígitos é aceito."
                  : "Código gerado pelo seu autenticador 2FA (ambiente de desenvolvimento também loga no console do servidor)."}
              </div>
              <div>
                <label className="block text-sm font-semibold text-brand-ink mb-1.5">
                  Código de confirmação
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={token}
                  onChange={(e) => setToken(e.target.value.replace(/\D/g, ""))}
                  placeholder="••••••"
                  className="w-full rounded-brand border border-gray-200 px-3 py-2.5 text-center text-lg tracking-[0.3em] outline-none focus:ring-2 focus:ring-brand-teal"
                />
              </div>
              <button
                type="button"
                onClick={salvar}
                disabled={salvando}
                className="w-full bg-brand-teal hover:bg-brand-teal-dark disabled:opacity-50 text-white text-sm font-bold py-3 rounded-brand"
              >
                {salvando ? "Salvando…" : "Confirmar e criar termo"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default NovoTermo;
