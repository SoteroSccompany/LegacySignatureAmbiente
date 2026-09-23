import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AuthShell from "../../Components/AuthShell";
import { toast } from "react-toastify";
import { getIdentityService } from "../../services/identity";

const TrocaEmail = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const identity = getIdentityService();

  // link -> checando | valido | invalido; confirmação -> concluido
  const [link, setLink] = useState("checando");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [concluido, setConcluido] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      const resp = await identity.checkLink({ token });
      if (!alive) return;
      setLink(resp.status ? "valido" : "invalido");
      if (!resp.status) setMsg(resp.msg || "");
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const confirmar = async () => {
    setLoading(true);
    try {
      const resp = await identity.confirmarTrocaEmail({ token });
      if (!resp.status) {
        toast.error(resp.msg || "Não foi possível confirmar a troca de e-mail.");
        setMsg(resp.msg || "");
        setLink("invalido");
        return;
      }
      toast.success(resp.msg || "E-mail alterado com sucesso.");
      setMsg(resp.msg || "");
      setConcluido(true);
    } finally {
      setLoading(false);
    }
  };

  if (concluido) {
    return (
      <AuthShell
        title="Troca de e-mail confirmada"
        subtitle="Seu e-mail de acesso foi atualizado."
        tip="Faça login novamente com o novo e-mail cadastrado."
      >
        <p className="text-sm text-brand-ink mb-6">
          {msg || "E-mail alterado com sucesso. Faça login novamente."}
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
      title="Confirmar troca de e-mail"
      subtitle="Confirme a troca de e-mail solicitada no seu perfil."
      tip="Links de troca de e-mail são pessoais e só podem ser usados uma vez."
    >
      {link === "checando" && (
        <p className="text-sm text-brand-ink">Validando o link…</p>
      )}
      {link === "invalido" && (
        <>
          <p className="text-sm text-rose-600 mb-6">
            {msg || "Link inválido ou expirado."}
          </p>
          <button
            type="button"
            onClick={() => navigate("/", { replace: true })}
            className="w-full bg-brand-teal hover:bg-brand-teal-dark text-white font-bold py-3.5 rounded-brand"
          >
            Voltar ao login
          </button>
        </>
      )}
      {link === "valido" && (
        <>
          <p className="text-sm text-brand-ink mb-6">
            Confirme para concluir a troca do seu e-mail de acesso.
          </p>
          <button
            type="button"
            disabled={loading}
            onClick={confirmar}
            className="w-full bg-brand-teal hover:bg-brand-teal-dark disabled:opacity-60 text-white font-bold py-3.5 rounded-brand"
          >
            {loading ? "Confirmando…" : "Confirmar troca de e-mail"}
          </button>
        </>
      )}
    </AuthShell>
  );
};

export default TrocaEmail;
