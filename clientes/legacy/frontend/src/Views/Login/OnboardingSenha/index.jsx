import { useContext, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../../Context";
import AuthShell from "../../../Components/AuthShell";
import { EyeIcon, EyeSlashIcon } from "@heroicons/react/20/solid";
import { toast } from "react-toastify";
import {
  getIdentityService,
  resolveNextRoute,
  NEXT_STEP,
} from "../../../services/identity";
import {
  isStrongPassword,
  MSG,
} from "../../../utils/validators/identity";

const OnboardingSenha = () => {
  const { setters } = useContext(AuthContext);
  const navigate = useNavigate();
  const identity = getIdentityService();

  const [senha, setSenha] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [show, setShow] = useState(false);

  const submit = async () => {
    if (!senha || !novaSenha || !confirm) {
      setError("Preencha todos os campos");
      return;
    }
    if (novaSenha !== confirm) {
      setError(MSG.senhaConfere);
      return;
    }
    if (novaSenha === senha) {
      setError(MSG.senhaIgual);
      return;
    }
    if (!isStrongPassword(novaSenha)) {
      setError(MSG.senhaFraca);
      return;
    }
    setError("");
    setLoading(true);
    try {
      const resp = await identity.changePassword({ senha, novaSenha });
      if (!resp.status) {
        setError(resp.msg || "Não foi possível alterar a senha.");
        return;
      }
      toast.success(resp.msg || "Senha atualizada.");
      const role = localStorage.getItem("permisssion");
      const route = resolveNextRoute(resp.next_step, role);
      if (resp.next_step === NEXT_STEP.OK) {
        setters.setSigned(true);
      }
      navigate(route);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Defina sua senha"
      subtitle="Sua senha provisória precisa ser trocada antes de continuar."
      tip="Use uma senha forte e exclusiva. Não reutilize a senha temporária do convite."
    >
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-brand-ink mb-1.5">
            Senha atual (provisória)
          </label>
          <input
            type={show ? "text" : "password"}
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            className="w-full rounded-brand border border-gray-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-teal"
          />
        </div>
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
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
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
          {loading ? "Salvando…" : "Continuar"}
        </button>
      </div>
    </AuthShell>
  );
};

export default OnboardingSenha;
