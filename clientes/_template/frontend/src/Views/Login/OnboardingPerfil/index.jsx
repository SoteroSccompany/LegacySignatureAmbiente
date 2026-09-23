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
import {
  isValidCpf,
  isValidNome,
  isValidOtp,
  isValidTelefone,
  MSG,
  onlyDigits,
  formatCpf,
  formatTelefone,
} from "../../../utils/validators/identity";
import { mockCredentials } from "../../../mocks";
import { jsonConfig } from "../../../Config";

const OnboardingPerfil = () => {
  const { setters } = useContext(AuthContext);
  const navigate = useNavigate();
  const identity = getIdentityService();

  const [etapa, setEtapa] = useState(1);
  const [nome, setNome] = useState("");
  const [cpf, setCpf] = useState("");
  const [telefone, setTelefone] = useState("");
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [desafioOk, setDesafioOk] = useState(false);

  const avancarEtapa = async () => {
    if (!isValidNome(nome)) {
      setError(MSG.nomeInvalido);
      return;
    }
    if (!isValidCpf(cpf)) {
      setError(MSG.cpfInvalido);
      return;
    }
    if (!isValidTelefone(telefone)) {
      setError(MSG.telefoneInvalido);
      return;
    }
    setError("");
    setLoading(true);
    try {
      const resp = await identity.solicitarPerfilAuth();
      if (!resp.status) {
        toast.error(resp.msg || "Não foi possível solicitar autenticação.");
        navigate("/");
        return;
      }
      setDesafioOk(true);
      setEtapa(2);
      toast.info(resp.msg);
    } finally {
      setLoading(false);
    }
  };

  const submit = async () => {
    if (!isValidNome(nome)) {
      setError(MSG.nomeInvalido);
      return;
    }
    if (!isValidCpf(cpf)) {
      setError(MSG.cpfInvalido);
      return;
    }
    if (!isValidTelefone(telefone)) {
      setError(MSG.telefoneInvalido);
      return;
    }
    if (!isValidOtp(token)) {
      setError(MSG.otpInvalido);
      return;
    }
    setError("");
    setLoading(true);
    try {
      const resp = await identity.criarPerfil({
        nome: nome.trim(),
        cpf: onlyDigits(cpf),
        telefone: onlyDigits(telefone),
        token,
      });
      if (!resp.status) {
        setError(resp.msg || "Não foi possível criar o perfil.");
        toast.error(resp.msg || "Erro ao criar perfil.");
        return;
      }
      toast.success(resp.msg || "Perfil criado.");
      setters.setSigned(true);
      navigate(
        resolveNextRoute(
          resp.next_step || NEXT_STEP.OK,
          localStorage.getItem("permisssion")
        )
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Criar perfil"
      subtitle={
        etapa === 1
          ? "Complete seus dados para usar a plataforma."
          : "Confirme com o código do autenticador."
      }
      tip={
        jsonConfig.uiMock
          ? `Na demo, OTP = ${mockCredentials.otp}. CPF válido de teste: 529.982.247-25.`
          : etapa === 1
            ? "Seus dados serão vinculados às suas assinaturas."
            : "Confirme com o código do autenticador."
      }
    >
      <div className="space-y-4">
        {etapa === 1 && (
          <>
            <div>
              <label className="block text-sm font-semibold text-brand-ink mb-1.5">
                Nome completo
              </label>
              <input
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="w-full rounded-brand border border-gray-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-teal"
                placeholder="Seu nome"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-brand-ink mb-1.5">
                CPF
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={formatCpf(cpf)}
                onChange={(e) => setCpf(onlyDigits(e.target.value).slice(0, 11))}
                onKeyDown={(e) => e.key === "Enter" && avancarEtapa()}
                className="w-full rounded-brand border border-gray-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-teal"
                placeholder="000.000.000-00"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-brand-ink mb-1.5">
                Telefone
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={formatTelefone(telefone)}
                onChange={(e) => setTelefone(onlyDigits(e.target.value).slice(0, 11))}
                onKeyDown={(e) => e.key === "Enter" && avancarEtapa()}
                className="w-full rounded-brand border border-gray-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-teal"
                placeholder="(00) 00000-0000"
              />
            </div>
            {error && <p className="text-xs text-rose-600">{error}</p>}
            <button
              type="button"
              disabled={loading}
              onClick={avancarEtapa}
              className="w-full bg-brand-teal hover:bg-brand-teal-dark disabled:opacity-60 text-white font-bold py-3.5 rounded-brand"
            >
              {loading ? "Aguarde…" : "Continuar"}
            </button>
          </>
        )}
        {etapa === 2 && (
          <>
            <div>
              <label className="block text-sm font-semibold text-brand-ink mb-1.5">
                Código do autenticador
              </label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={token}
                disabled={!desafioOk}
                onChange={(e) => setToken(e.target.value.replace(/\D/g, ""))}
                onKeyDown={(e) => e.key === "Enter" && submit()}
                className="w-full rounded-brand border border-gray-200 px-3 py-3 text-center text-xl tracking-[0.4em] font-semibold outline-none focus:ring-2 focus:ring-brand-teal disabled:opacity-50"
                placeholder="••••••"
              />
            </div>
            {error && <p className="text-xs text-rose-600">{error}</p>}
            <button
              type="button"
              disabled={loading || !desafioOk}
              onClick={submit}
              className="w-full bg-brand-teal hover:bg-brand-teal-dark disabled:opacity-60 text-white font-bold py-3.5 rounded-brand"
            >
              {loading ? "Salvando…" : "Salvar perfil e entrar"}
            </button>
          </>
        )}
      </div>
    </AuthShell>
  );
};

export default OnboardingPerfil;
