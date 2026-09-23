import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AuthShell from "../../Components/AuthShell";
import { EyeIcon, EyeSlashIcon } from "@heroicons/react/20/solid";
import { toast } from "react-toastify";
import { getIdentityService } from "../../services/identity";
import { isStrongPassword, MSG } from "../../utils/validators/identity";
import { mockCredentials } from "../../mocks";
import { jsonConfig } from "../../Config";

const RecuperacaoSenha = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const identity = getIdentityService();

  const [novaSenha, setNovaSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [show, setShow] = useState(false);
  const [concluido, setConcluido] = useState(false);

  const submit = async () => {
    if (!novaSenha || !confirmacao) {
      setError("Preencha todos os campos");
      return;
    }
    if (novaSenha !== confirmacao) {
      setError(MSG.senhaConfere);
      return;
    }
    if (!isStrongPassword(novaSenha)) {
      setError(MSG.senhaFraca);
      return;
    }
    setError("");
    setLoading(true);
    try {
      const resp = await identity.forgotChangePass({ token, senha: novaSenha });
      if (!resp.status) {
        setError(resp.msg || "Não foi possível redefinir a senha.");
        toast.error(resp.msg || "Link inválido ou expirado.");
        return;
      }
      toast.success(resp.msg || "Senha redefinida com sucesso.");
      setConcluido(true);
    } finally {
      setLoading(false);
    }
  };

  if (concluido) {
    return (
      <AuthShell
        title="Senha redefinida"
        subtitle="Sua senha foi atualizada com sucesso."
        tip="Use a nova senha para acessar a plataforma. Se você não reconhece esta ação, contate o suporte."
      >
        <p className="text-sm text-brand-ink mb-6">
          Já pode entrar na plataforma com sua nova senha.
        </p>
        <button
          type="button"
          onClick={() => navigate("/", { replace: true })}
          className="w-full bg-brand-teal hover:bg-brand-teal-dark text-white font-bold py-3.5 rounded-brand"
        >
          Ir para o login
        </button>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Redefinir senha"
      subtitle="Escolha uma nova senha para acessar sua conta."
      tip={
        jsonConfig.uiMock
          ? `Na demo, o link válido é /recuperarSenha/${mockCredentials.forgotToken}.`
          : "Links de recuperação são pessoais e expiram após um tempo. Não compartilhe este link."
      }
    >
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-brand-ink mb-1.5">
            Nova senha
          </label>
          <div className="relative">
            <input
              type={show ? "text" : "password"}
              value={novaSenha}
              onChange={(e) => setNovaSenha(e.target.value)}
              className="w-full rounded-brand border border-gray-200 px-3 py-2.5 pr-10 text-sm outline-none focus:ring-2 focus:ring-brand-teal"
            />
            <button
              type="button"
              className="absolute inset-y-0 right-0 px-3 text-brand-soft"
              onClick={() => setShow((v) => !v)}
            >
              {show ? (
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
            type="password"
            value={confirmacao}
            onChange={(e) => setConfirmacao(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            className="w-full rounded-brand border border-gray-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-teal"
          />
        </div>
        {error && <p className="text-xs text-rose-600">{error}</p>}
        <button
          type="button"
          disabled={loading}
          onClick={submit}
          className="w-full bg-brand-teal hover:bg-brand-teal-dark disabled:opacity-60 text-white font-bold py-3.5 rounded-brand"
        >
          {loading ? "Salvando…" : "Redefinir senha"}
        </button>
        <button
          type="button"
          onClick={() => navigate("/")}
          className="w-full text-sm text-brand-teal hover:underline font-semibold"
        >
          Voltar ao login
        </button>
      </div>
    </AuthShell>
  );
};

export default RecuperacaoSenha;
