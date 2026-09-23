import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Header from "../../Components/Header";
import { ShieldCheckIcon } from "@heroicons/react/24/outline";
import { toast } from "react-toastify";
import { getPanelService } from "../../services/panel";
import { isValidOtp, MSG } from "../../utils/validators/identity";
import { jsonConfig } from "../../Config";
import { canApproveBiometria, getSessionUser } from "../../utils/roles";

// Alcançada pela lista de pendentes (/aprovacao-biometria) ou por deep-link
// do alerta pendente_aprovacao_perfil_biometria. Rota e API exigem a
// capability approveBiometria (hoje só ADMIN — GERENTE é colapsado a USER).
const AprovacaoBiometria = () => {
  const { usuario_id } = useParams();
  const navigate = useNavigate();
  const panel = getPanelService();
  // Único admin do sistema aprovando a própria foto pendente do próprio onboarding.
  const souEuMesmo = String(usuario_id) === String(getSessionUser().userId);

  const [fotoUrl, setFotoUrl] = useState("");
  const [carregandoFoto, setCarregandoFoto] = useState(false);
  // null = ainda não decidiu; true = aceitar; false = negar
  const [decisao, setDecisao] = useState(null);
  const [codigoSolicitado, setCodigoSolicitado] = useState(false);
  const [solicitandoCodigo, setSolicitandoCodigo] = useState(false);
  const [token, setToken] = useState("");
  const [confirmando, setConfirmando] = useState(false);

  const verFoto = async () => {
    setCarregandoFoto(true);
    try {
      const resp = panel.getFotoAprovacaoBiometria
        ? await panel.getFotoAprovacaoBiometria(usuario_id)
        : { status: false, msg: "Indisponível na demo." };
      if (!resp.status) {
        toast.error(resp.msg || "Erro ao carregar a foto.");
        return;
      }
      setFotoUrl(resp.url || "");
    } finally {
      setCarregandoFoto(false);
    }
  };

  const solicitarCodigo = async () => {
    setSolicitandoCodigo(true);
    try {
      const resp = panel.solicitarOtpAprovacaoBiometria
        ? await panel.solicitarOtpAprovacaoBiometria(usuario_id)
        : { status: false, msg: "Indisponível na demo." };
      if (!resp.status) {
        toast.error(resp.msg || "Erro ao solicitar código.");
        setCodigoSolicitado(false);
        return false;
      }
      toast.success(resp.msg || "Código gerado.");
      setCodigoSolicitado(true);
      return true;
    } finally {
      setSolicitandoCodigo(false);
    }
  };

  const escolherDecisao = async (aprovar) => {
    if (souEuMesmo && !aprovar) return;
    setDecisao(aprovar);
    setToken("");
    setCodigoSolicitado(false);
    await solicitarCodigo();
  };

  useEffect(() => {
    verFoto();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuario_id]);

  if (!canApproveBiometria()) {
    return (
      <div className="p-6">
        <p className="text-brand-ink">
          Acesso restrito a administradores.
        </p>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="text-brand-teal font-semibold"
        >
          Voltar
        </button>
      </div>
    );
  }

  const confirmar = async () => {
    if (!isValidOtp(token)) {
      toast.error(MSG.otpInvalido);
      return;
    }
    if (decisao !== true && decisao !== false) {
      toast.error("Escolha aceitar ou negar a facial antes de enviar o código.");
      return;
    }
    setConfirmando(true);
    try {
      const resp = panel.confirmarAprovacaoBiometria
        ? await panel.confirmarAprovacaoBiometria({
            usuarioId: usuario_id,
            token,
            aprovar: decisao,
          })
        : { status: false, msg: "Indisponível na demo." };
      if (!resp.status) {
        toast.error(resp.msg || "Erro ao confirmar a aprovação.");
        return;
      }
      toast.success(
        resp.msg || (decisao ? "Perfil aprovado." : "Perfil negado.")
      );
      navigate("/dashboard");
    } finally {
      setConfirmando(false);
    }
  };

  const enviarCodigo = async () => {
    if (!codigoSolicitado) {
      const ok = await solicitarCodigo();
      if (!ok) return;
    }
    await confirmar();
  };

  return (
    <div>
      <Header
        title="Aprovação de perfil biométrico"
        description={`Usuário ${usuario_id}`}
        icon={ShieldCheckIcon}
        hasReturn
        buttonReturnAction={() => navigate(-1)}
      />

      <div className="p-6 max-w-4xl space-y-6">
        {souEuMesmo && (
          <p className="text-xs text-brand-slate bg-brand-tip rounded-brand p-3 m-0">
            Você é o único administrador do sistema. Confirme sua própria foto
            para liberar seu perfil.
          </p>
        )}

        <div className="bg-white border border-gray-100 rounded-brand p-6 shadow-sm">
          <div className="flex flex-col md:flex-row gap-6">
            <div className="flex-1 space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-brand-soft m-0">
                Foto de perfil pendente
              </h3>
              <button
                type="button"
                onClick={verFoto}
                disabled={carregandoFoto}
                className="px-4 py-2 text-sm font-semibold text-brand-navy bg-brand-tip hover:bg-gray-200 rounded-brand disabled:opacity-50"
              >
                {carregandoFoto ? "Carregando…" : "Ver foto"}
              </button>
              {fotoUrl && (
                <div className="max-w-xs">
                  <img
                    src={fotoUrl}
                    alt="Foto de perfil pendente de aprovação"
                    referrerPolicy="no-referrer"
                    className="w-full rounded-brand border border-gray-200"
                    onError={() => {
                      toast.error("Não foi possível exibir a foto. Tente novamente.");
                      setFotoUrl("");
                    }}
                  />
                </div>
              )}

              {decisao === null && (
                <div className="flex flex-wrap gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => escolherDecisao(true)}
                    disabled={solicitandoCodigo}
                    className="px-5 py-2.5 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-brand disabled:opacity-50"
                  >
                    Aceitar
                  </button>
                  {!souEuMesmo && (
                    <button
                      type="button"
                      onClick={() => escolherDecisao(false)}
                      disabled={solicitandoCodigo}
                      className="px-5 py-2.5 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-brand disabled:opacity-50"
                    >
                      Negar
                    </button>
                  )}
                </div>
              )}

              {decisao !== null && (
                <p className="text-xs text-brand-slate m-0">
                  Decisão:{" "}
                  <span className="font-semibold">
                    {decisao ? "Aceitar" : "Negar"}
                  </span>
                </p>
              )}
            </div>

            {decisao !== null && (
              <div className="flex-1 space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-brand-soft m-0">
                  Código de confirmação
                </h3>
                <p className="text-xs text-brand-soft m-0">
                  O código é gerado a partir do seu 2FA cadastrado (quem está
                  aprovando), não do usuário avaliado.
                </p>
                {codigoSolicitado && (
                  <p className="text-xs text-brand-slate bg-brand-tip rounded-brand p-3 m-0">
                    {jsonConfig.uiMock
                      ? "Na demo, qualquer código de 6 dígitos é aceito."
                      : "Código gerado. Em ambiente de desenvolvimento também é logado no console do servidor."}
                  </p>
                )}
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={token}
                  onChange={(e) => setToken(e.target.value.replace(/\D/g, ""))}
                  placeholder="••••••"
                  className="w-full rounded-brand border border-gray-200 px-3 py-2.5 text-center text-lg tracking-[0.3em] outline-none focus:ring-2 focus:ring-brand-teal"
                />
                <button
                  type="button"
                  onClick={enviarCodigo}
                  disabled={confirmando || solicitandoCodigo}
                  className="w-full inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-bold py-3 rounded-brand"
                >
                  <ShieldCheckIcon className="w-5 h-5" />
                  {solicitandoCodigo
                    ? "Gerando…"
                    : confirmando
                      ? "Enviando…"
                      : "Enviar código"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AprovacaoBiometria;
