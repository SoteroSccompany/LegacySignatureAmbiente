import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AuthShell from "../../Components/AuthShell";
import { toast } from "react-toastify";
import { getIdentityService } from "../../services/identity";

const AutenticarEmail = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const identity = getIdentityService();
  const [loading, setLoading] = useState(false);
  const [concluido, setConcluido] = useState(false);

  const confirmar = async () => {
    setLoading(true);
    try {
      const resp = await identity.confirmarEmail({ token });
      if (!resp.status) {
        toast.error(resp.msg || "Link inválido ou expirado.");
        return;
      }
      toast.success(resp.msg || "E-mail autenticado com sucesso. Faça login.");
      setConcluido(true);
    } finally {
      setLoading(false);
    }
  };

  if (concluido) {
    return (
      <AuthShell
        title="E-mail autenticado"
        subtitle="Seu e-mail foi confirmado com sucesso."
        tip="Você já pode acessar a plataforma com o e-mail e senha recebidos no convite."
      >
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
      title="Autenticar e-mail"
      subtitle="Conclua a verificação do seu endereço de e-mail."
      tip="Links de autenticação são pessoais e temporários. Se você não reconhece este convite, ignore esta tela."
    >
      <p className="text-sm text-brand-ink leading-relaxed mb-6">
        Confirme que este e-mail pertence a você para liberar o acesso completo
        à plataforma.
      </p>
      <button
        type="button"
        disabled={loading}
        onClick={confirmar}
        className="w-full bg-brand-teal hover:bg-brand-teal-dark disabled:opacity-60 text-white font-bold py-3.5 rounded-brand"
      >
        {loading ? "Autenticando…" : "Autenticar e-mail"}
      </button>
    </AuthShell>
  );
};

export default AutenticarEmail;
