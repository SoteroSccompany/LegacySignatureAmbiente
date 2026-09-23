import { useContext, useState } from "react";
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
import { clearLocalSession } from "../../../utils";

const DoisFatores = () => {
  const { setters } = useContext(AuthContext);
  const navigate = useNavigate();
  const identity = getIdentityService();
  const [code, setCode] = useState("");
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  const confirm = async () => {
    if (!isValidOtp(code)) {
      setError(true);
      return;
    }
    setError(false);
    setLoading(true);
    try {
      const resp = await identity.login2FA({ token: code });
      if (!resp.status) {
        toast.error(resp.msg || "Código inválido.");
        // Qualquer falha aqui invalida a sessão parcial no servidor (deleteLogin) —
        // o front não insiste na mesma tela, sempre volta pro login.
        clearLocalSession();
        navigate("/", { replace: true });
        return;
      }
      toast.success(resp.msg || "Autenticado");
      const role = localStorage.getItem("permisssion");
      const next = resolveNextRoute(resp.next_step, role);
      // navigate antes de setSigned para o guard de /login/2fa não mandar de volta ao /
      navigate(next, { replace: true });
      if (resp.next_step === NEXT_STEP.OK) {
        setters.setSigned(true);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Verificação em duas etapas"
      subtitle="Digite o código do seu autenticador."
      tip={
        jsonConfig.uiMock
          ? `Na demo, use o OTP ${mockCredentials.otp}. Nunca compartilhe códigos reais.`
          : "Abra seu aplicativo autenticador e informe o código atual. Nunca compartilhe códigos."
      }
    >
      <p className="text-[17px] font-bold text-brand-navy mb-5">
        Confirme sua identidade
      </p>
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
      {error && (
        <p className="text-xs text-rose-600 mt-1">{MSG.otpInvalido}</p>
      )}
      <button
        type="button"
        disabled={loading}
        onClick={confirm}
        className="w-full mt-6 bg-brand-teal hover:bg-brand-teal-dark disabled:opacity-60 text-white font-bold text-[15px] py-3.5 rounded-brand transition-colors"
      >
        {loading ? "Validando…" : "Confirmar e entrar"}
      </button>
      <button
        type="button"
        onClick={() => navigate("/")}
        className="w-full mt-3 text-sm text-brand-teal hover:underline font-semibold"
      >
        Voltar ao login
      </button>
    </AuthShell>
  );
};

export default DoisFatores;
