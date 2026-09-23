import { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../../Context";
import AuthShell from "../../../Components/AuthShell";
import { toast } from "react-toastify";
import {
  getIdentityService,
  resolveNextRoute,
  NEXT_STEP,
} from "../../../services/identity";
import { isValidOtp, MSG } from "../../../utils/validators/identity";
import { mockCredentials } from "../../../mocks";
import { jsonConfig } from "../../../Config";

const Onboarding2FA = () => {
  const { setters } = useContext(AuthContext);
  const navigate = useNavigate();
  const identity = getIdentityService();

  const [qrcode, setQrcode] = useState("");
  const [secret, setSecret] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [recoveryCodes, setRecoveryCodes] = useState(null);
  const [pendingNext, setPendingNext] = useState(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const resp = await identity.getDoisFatoresConfig();
      if (!alive) return;
      if (!resp.status) {
        toast.error(resp.msg || "Não foi possível iniciar o 2FA.");
        navigate("/");
        return;
      }
      setQrcode(resp.qrcode || "");
      setSecret(resp.secret || "");
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const confirm = async () => {
    if (!isValidOtp(code)) {
      setError(MSG.otpInvalido);
      return;
    }
    setError("");
    setLoading(true);
    try {
      const resp = await identity.confirmDoisFatores({ token: code });
      if (!resp.status) {
        setError(resp.msg || MSG.otpInvalido);
        toast.error(resp.msg || "Código inválido.");
        return;
      }
      if (resp.recovery_codes?.length) {
        setRecoveryCodes(resp.recovery_codes);
        setPendingNext(resp.next_step);
        toast.success("2FA configurado. Guarde os códigos de recuperação.");
        return;
      }
      // Fluxo real: sem códigos de recuperação; segue direto o next_step
      const step = resp.next_step || NEXT_STEP.OK;
      if (step === NEXT_STEP.OK) setters.setSigned(true);
      toast.success(resp.msg || "2FA configurado.");
      navigate(resolveNextRoute(step, localStorage.getItem("permisssion")));
    } finally {
      setLoading(false);
    }
  };

  const continueFlow = () => {
    const step = pendingNext || NEXT_STEP.OK;
    if (step === NEXT_STEP.OK) setters.setSigned(true);
    navigate(resolveNextRoute(step, localStorage.getItem("permisssion")));
  };

  if (recoveryCodes) {
    return (
      <AuthShell
        title="Códigos de recuperação"
        subtitle="Guarde estes códigos em local seguro. Eles substituem o autenticador se você perder o aparelho."
        tip="Cada código só pode ser usado uma vez."
      >
        <ul className="grid grid-cols-2 gap-2 mb-6">
          {recoveryCodes.map((c) => (
            <li
              key={c}
              className="font-mono text-sm bg-brand-tip text-brand-navy rounded-brand px-3 py-2 text-center"
            >
              {c}
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={() => {
            navigator.clipboard?.writeText(recoveryCodes.join("\n"));
            toast.info("Códigos copiados.");
          }}
          className="w-full mb-3 text-sm font-semibold text-brand-teal hover:underline"
        >
          Copiar códigos
        </button>
        <button
          type="button"
          onClick={continueFlow}
          className="w-full bg-brand-teal hover:bg-brand-teal-dark text-white font-bold py-3.5 rounded-brand"
        >
          Continuar
        </button>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Configurar autenticação"
      subtitle="Escaneie o QR no app autenticador e confirme com o código de 6 dígitos."
      tip={
        jsonConfig.uiMock
          ? `Na demo, use o OTP ${mockCredentials.otp}.`
          : "Use Google Authenticator, Authy ou similar. Após ativar, será pedido um novo login."
      }
    >
      <div className="flex flex-col items-center mb-5">
        {qrcode ? (
          <img
            src={qrcode}
            alt="QR Code 2FA"
            className="w-44 h-44 rounded-brand border border-gray-100"
          />
        ) : (
          <div className="w-44 h-44 bg-brand-tip rounded-brand animate-pulse" />
        )}
        {secret && (
          <p className="mt-3 text-xs text-brand-soft text-center break-all">
            Chave manual: <strong className="text-brand-navy">{secret}</strong>
          </p>
        )}
      </div>
      <label className="block text-sm font-semibold text-brand-ink mb-1.5">
        Código de 6 dígitos
      </label>
      <input
        type="text"
        inputMode="numeric"
        maxLength={6}
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
        onKeyDown={(e) => e.key === "Enter" && confirm()}
        className={`w-full rounded-brand border px-3 py-3 text-center text-xl tracking-[0.4em] font-semibold text-brand-navy outline-none focus:ring-2 focus:ring-brand-teal ${
          error ? "border-rose-400" : "border-gray-200"
        }`}
        placeholder="••••••"
      />
      {error && <p className="text-xs text-rose-600 mt-1">{error}</p>}
      <button
        type="button"
        disabled={loading}
        onClick={confirm}
        className="w-full mt-6 bg-brand-teal hover:bg-brand-teal-dark disabled:opacity-60 text-white font-bold text-[15px] py-3.5 rounded-brand"
      >
        {loading ? "Validando…" : "Ativar 2FA"}
      </button>
    </AuthShell>
  );
};

export default Onboarding2FA;
