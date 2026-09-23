import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Header from "../../../Components/Header";
import { PencilSquareIcon } from "@heroicons/react/24/outline";
import { toast } from "react-toastify";
import { getPanelService } from "../../../services/panel";
import { isValidOtp, MSG } from "../../../utils/validators/identity";
import { jsonConfig } from "../../../Config";

// Não existe GET /termo-responsabilidade/:id na API — o termo é localizado
// dentro da lista completa (GET /termo-responsabilidade) pelo id da rota.
const EditarTermo = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const panel = getPanelService();
  const [carregando, setCarregando] = useState(true);
  const [naoEncontrado, setNaoEncontrado] = useState(false);
  const [tituloTermo, setTituloTermo] = useState("");
  const [descricaoTermo, setDescricaoTermo] = useState("");
  const [ativo, setAtivo] = useState(true);
  const [token, setToken] = useState("");
  const [codigoSolicitado, setCodigoSolicitado] = useState(false);
  const [solicitando, setSolicitando] = useState(false);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!panel.listTermos) {
        setNaoEncontrado(true);
        setCarregando(false);
        return;
      }
      const resp = await panel.listTermos();
      if (!alive) return;
      const termo = (resp.data || []).find((t) => String(t.id) === String(id));
      if (!termo) {
        setNaoEncontrado(true);
        setCarregando(false);
        return;
      }
      setTituloTermo(termo.titulo_termo || "");
      setDescricaoTermo(termo.descricao_termo || "");
      setAtivo(termo.ativo === true);
      setCarregando(false);
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

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
      const resp = panel.updateTermo
        ? await panel.updateTermo(id, {
            titulo_termo: tituloTermo.trim(),
            descricao_termo: descricaoTermo.trim(),
            ativo,
            token,
          })
        : { status: false, msg: "Indisponível na demo." };
      if (!resp.status) {
        toast.error(resp.msg || "Erro ao atualizar o termo.");
        return;
      }
      toast.success(resp.msg || "Termo atualizado.");
      navigate("/termos");
    } finally {
      setSalvando(false);
    }
  };

  if (carregando) {
    return <div className="p-6 text-sm text-brand-soft">Carregando…</div>;
  }

  if (naoEncontrado) {
    return (
      <div className="p-6">
        <p className="text-brand-ink">Termo não encontrado.</p>
        <button
          type="button"
          onClick={() => navigate("/termos")}
          className="text-brand-teal font-semibold"
        >
          Voltar
        </button>
      </div>
    );
  }

  return (
    <div>
      <Header
        title="Editar termo de responsabilidade"
        description={tituloTermo}
        icon={PencilSquareIcon}
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
          <label className="flex items-center gap-2 text-sm font-semibold text-brand-ink">
            <input
              type="checkbox"
              checked={ativo}
              onChange={(e) => setAtivo(e.target.checked)}
              disabled={codigoSolicitado}
            />
            Termo ativo
          </label>

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
                {salvando ? "Salvando…" : "Confirmar e salvar alterações"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default EditarTermo;
