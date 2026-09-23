import { AuthContext } from "../../Context";
import { useNavigate } from "react-router-dom";
import { useContext, useEffect, useState } from "react";
import { mockCredentials, mockIdentityScenarios } from "../../mocks";
import { jsonConfig } from "../../Config";
import AuthShell from "../../Components/AuthShell";
import { EyeIcon, EyeSlashIcon } from "@heroicons/react/20/solid";
import { toast } from "react-toastify";
import {
  getIdentityService,
  resolveNextRoute,
  NEXT_STEP,
  hasFullSession,
} from "../../services/identity";
import {
  isValidEmail,
  isStrongPassword,
  MSG,
} from "../../utils/validators/identity";

const Login = () => {
  const { states, setters } = useContext(AuthContext);
  const navigate = useNavigate();
  const identity = getIdentityService();

  const [errorEmail, setErrorEmail] = useState(false);
  const [msgErrorEmail, setMsgErrorEmail] = useState(MSG.emailObrigatorio);
  const [errorSenha, setErrorSenha] = useState(false);
  const [msgErrorSenha, setMsgErrorSenha] = useState(MSG.senhaObrigatoria);
  const [showPassword, setShowPassword] = useState(false);
  const [perdeuSenha, setPerdeuSenha] = useState(false);
  const [loading, setLoading] = useState(false);
  const [exigirNovaSenha, setExigirNovaSenha] = useState(false);
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmacaoNovaSenha, setConfirmacaoNovaSenha] = useState("");
  const [showNovaSenha, setShowNovaSenha] = useState(false);

  useEffect(() => {
    // Sessão full já autenticada: não ficar no login (evita recomeço do ciclo 2FA)
    if (hasFullSession()) {
      const role = localStorage.getItem("permisssion");
      navigate(resolveNextRoute(NEXT_STEP.OK, role), { replace: true });
      return;
    }
    if (jsonConfig.uiMock) {
      setters.setEmail(mockCredentials.email);
      setters.setSenha(mockCredentials.senha);
    } else {
      setters.setEmail("");
      setters.setSenha("");
    }
    identity.prepareLogin();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fillScenario = (scenario) => {
    setters.setEmail(scenario.email);
    setters.setSenha(scenario.senha);
    setPerdeuSenha(false);
    setErrorEmail(false);
    setErrorSenha(false);
    setExigirNovaSenha(false);
    setNovaSenha("");
    setConfirmacaoNovaSenha("");
  };

  const actionLogin = async () => {
    if (perdeuSenha) {
      if (!states.email) {
        setErrorEmail(true);
        setMsgErrorEmail(MSG.emailObrigatorio);
        return;
      }
      if (!isValidEmail(states.email)) {
        setErrorEmail(true);
        setMsgErrorEmail(MSG.emailInvalido);
        return;
      }
      setErrorEmail(false);
      setLoading(true);
      try {
        const resp = await identity.forgotPassword({ email: states.email });
        if (!resp.status) {
          toast.error(resp.msg || "Não foi possível enviar o link.");
          return;
        }
        toast.success(
          jsonConfig.uiMock
            ? `Link simulado — abra /recuperarSenha/${mockCredentials.forgotToken}`
            : "Se o e-mail estiver cadastrado, o link de redefinição foi enviado."
        );
        setPerdeuSenha(false);
      } finally {
        setLoading(false);
      }
      return;
    }

    let error = false;
    if (!states.email) {
      setErrorEmail(true);
      setMsgErrorEmail(MSG.emailObrigatorio);
      error = true;
    } else if (!isValidEmail(states.email)) {
      setErrorEmail(true);
      setMsgErrorEmail(MSG.emailInvalido);
      error = true;
    } else {
      setErrorEmail(false);
      setMsgErrorEmail(MSG.emailObrigatorio);
    }
    if (!states.senha) {
      setErrorSenha(true);
      setMsgErrorSenha(MSG.senhaObrigatoria);
      error = true;
    } else {
      setErrorSenha(false);
    }
    if (error) return;

    if (exigirNovaSenha) {
      if (!novaSenha || !confirmacaoNovaSenha) {
        setErrorSenha(true);
        setMsgErrorSenha("Preencha a nova senha e a confirmação.");
        return;
      }
      if (novaSenha !== confirmacaoNovaSenha) {
        setErrorSenha(true);
        setMsgErrorSenha(MSG.senhaConfere);
        return;
      }
      if (novaSenha === states.senha) {
        setErrorSenha(true);
        setMsgErrorSenha(MSG.senhaIgual);
        return;
      }
      if (!isStrongPassword(novaSenha)) {
        setErrorSenha(true);
        setMsgErrorSenha(MSG.senhaFraca);
        return;
      }
    }

    setLoading(true);
    try {
      await identity.prepareLogin();
      const resp = await identity.login({
        email: states.email,
        senha: states.senha,
        ...(exigirNovaSenha
          ? { novaSenha, confirmacaoNovaSenha }
          : {}),
      });
      if (!resp.status) {
        setErrorSenha(true);
        setMsgErrorSenha(resp.msg || "E-mail ou senha inválidos.");
        toast.error(resp.msg || "Falha no login.");
        return;
      }

      const next = resp.data?.next_step;
      const role = resp.data?.permissao;
      if (next === NEXT_STEP.REDEFINIR_SENHA || resp.data?.trocar_senha) {
        setExigirNovaSenha(true);
        setErrorSenha(false);
        return;
      }

      if (next === NEXT_STEP.OK) {
        setters.setSigned(true);
      } else {
        setters.setSigned(false);
      }
      const NEXT_MSG = {
        [NEXT_STEP.OK]: "Bem-vindo!",
        [NEXT_STEP.LOGIN_2FA]: "Informe o código do seu autenticador.",
        [NEXT_STEP.SETUP_2FA]: "Configure a autenticação em duas etapas.",
        [NEXT_STEP.CRIAR_PERFIL]: "Complete seu perfil para continuar.",
      };
      toast.success(NEXT_MSG[next] || "Login realizado.");
      navigate(resolveNextRoute(next, role));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title={perdeuSenha ? "Recuperar acesso" : "Entrar na plataforma"}
      subtitle={
        perdeuSenha
          ? "Informe seu e-mail para receber o link de redefinição."
          : "Assinatura eletrônica com rastreabilidade, carimbo e trilha de auditoria."
      }
      tip="Links de acesso são pessoais e temporários. Não compartilhe credenciais. Em caso de dúvida, use os canais oficiais."
    >
      <p className="text-[17px] font-bold text-brand-navy mb-5">
        Olá{states.email ? `, ${states.email.split("@")[0]}` : ""}
      </p>

      {!perdeuSenha && jsonConfig.uiMock && (
        <div className="mb-5 bg-brand-tip rounded-brand px-4 py-3 text-xs text-brand-slate leading-relaxed">
          <p className="font-bold text-brand-teal uppercase tracking-wider m-0 mb-2">
            Demo identidade (mock)
          </p>
          <p className="m-0 mb-2">
            OTP demo: <strong>{mockCredentials.otp}</strong>
          </p>
          <ul className="m-0 pl-4 space-y-1">
            {mockIdentityScenarios.map((s) => (
              <li key={s.key}>
                <button
                  type="button"
                  onClick={() => fillScenario(s)}
                  className="text-left text-brand-navy hover:text-brand-teal underline-offset-2 hover:underline"
                >
                  {s.label}
                </button>
                <span className="text-brand-soft"> — {s.email}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-brand-ink mb-1.5">
            E-mail
          </label>
          <input
            type="email"
            value={states.email}
            onChange={(e) => setters.setEmail(e.target.value)}
            className={`w-full rounded-brand border px-3 py-2.5 text-sm text-brand-navy outline-none focus:ring-2 focus:ring-brand-teal ${
              errorEmail ? "border-rose-400" : "border-gray-200"
            }`}
            placeholder="voce@empresa.com"
          />
          {errorEmail && (
            <p className="text-xs text-rose-600 mt-1">{msgErrorEmail}</p>
          )}
        </div>

        {!perdeuSenha && (
          <div>
            <label className="block text-sm font-semibold text-brand-ink mb-1.5">
              Senha
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={states.senha}
                onChange={(e) => setters.setSenha(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && actionLogin()}
                className={`w-full rounded-brand border px-3 py-2.5 pr-10 text-sm text-brand-navy outline-none focus:ring-2 focus:ring-brand-teal ${
                  errorSenha ? "border-rose-400" : "border-gray-200"
                }`}
                placeholder="••••••••"
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 px-3 text-brand-soft"
                onClick={() => setShowPassword((v) => !v)}
              >
                {showPassword ? (
                  <EyeSlashIcon className="h-5 w-5" />
                ) : (
                  <EyeIcon className="h-5 w-5" />
                )}
              </button>
            </div>
            {errorSenha && (
              <p className="text-xs text-rose-600 mt-1">{msgErrorSenha}</p>
            )}
          </div>
        )}

        {!perdeuSenha && exigirNovaSenha && (
          <>
            <p className="text-sm text-brand-slate">
              Sua senha é temporária. Defina uma nova senha para continuar.
            </p>
            <div>
              <label className="block text-sm font-semibold text-brand-ink mb-1.5">
                Nova senha
              </label>
              <div className="relative">
                <input
                  type={showNovaSenha ? "text" : "password"}
                  value={novaSenha}
                  onChange={(e) => setNovaSenha(e.target.value)}
                  className="w-full rounded-brand border border-gray-200 px-3 py-2.5 pr-10 text-sm text-brand-navy outline-none focus:ring-2 focus:ring-brand-teal"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 px-3 text-brand-soft"
                  onClick={() => setShowNovaSenha((v) => !v)}
                >
                  {showNovaSenha ? (
                    <EyeSlashIcon className="h-5 w-5" />
                  ) : (
                    <EyeIcon className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-brand-ink mb-1.5">
                Confirmar nova senha
              </label>
              <input
                type={showNovaSenha ? "text" : "password"}
                value={confirmacaoNovaSenha}
                onChange={(e) => setConfirmacaoNovaSenha(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && actionLogin()}
                className="w-full rounded-brand border border-gray-200 px-3 py-2.5 text-sm text-brand-navy outline-none focus:ring-2 focus:ring-brand-teal"
                placeholder="••••••••"
              />
            </div>
          </>
        )}

        <button
          type="button"
          disabled={loading}
          onClick={actionLogin}
          className="w-full mt-2 bg-brand-teal hover:bg-brand-teal-dark disabled:opacity-60 text-white font-bold text-[15px] py-3.5 rounded-brand transition-colors"
        >
          {loading
            ? "Aguarde…"
            : perdeuSenha
              ? "Enviar link"
              : exigirNovaSenha
                ? "Definir senha e entrar"
                : "Acessar plataforma"}
        </button>

        <button
          type="button"
          onClick={() => {
            setPerdeuSenha((v) => !v);
            setErrorEmail(false);
            setErrorSenha(false);
            setExigirNovaSenha(false);
            setNovaSenha("");
            setConfirmacaoNovaSenha("");
          }}
          className="w-full text-sm text-brand-teal hover:underline font-semibold"
        >
          {perdeuSenha ? "Voltar ao login" : "Esqueci minha senha"}
        </button>
      </div>
    </AuthShell>
  );
};

export default Login;
