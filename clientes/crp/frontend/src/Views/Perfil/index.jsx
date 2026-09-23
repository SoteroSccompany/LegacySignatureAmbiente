import { useEffect, useState } from "react";
import Header from "../../Components/Header";
import { UserCircleIcon } from "@heroicons/react/24/outline";
import { toast } from "react-toastify";
import { jsonConfig } from "../../Config";
import { conection } from "../../utils";
import { getIdentityService } from "../../services/identity";
import { getSessionUser, ROLES } from "../../utils/roles";
import { isStrongPassword, MSG } from "../../utils/validators/identity";

const Perfil = () => {
  const session = getSessionUser();
  const identity = getIdentityService();

  const [email, setEmail] = useState(session.email);
  const [senhaEmail, setSenhaEmail] = useState("");
  const [senhaAtual, setSenhaAtual] = useState("");
  const [senhaNova, setSenhaNova] = useState("");
  const [loading, setLoading] = useState(false);
  const [perfil, setPerfil] = useState(null);

  const podeTrocarEmail = [ROLES.ADMIN, ROLES.USER, ROLES.SUPERVISOR].includes(session.role);

  useEffect(() => {
    let alive = true;
    (async () => {
      const resp = await identity.getPerfil();
      if (!alive) return;
      if (resp.status) setPerfil(resp.data || null);
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const solicitarTrocaEmail = async () => {
    if (jsonConfig.uiMock) {
      toast.success("Solicitação de troca de e-mail (demo)");
      return;
    }
    if (!email || email === session.email) {
      toast.error("Informe um e-mail diferente do atual.");
      return;
    }
    if (!senhaEmail) {
      toast.error("Informe sua senha para confirmar a troca.");
      return;
    }
    setLoading(true);
    try {
      const { data } = await conection
        .auth()
        .post("/user/changeemail", { email, senha: senhaEmail });
      toast.success(data?.msg || "Verifique o novo e-mail para confirmar a troca.");
      setSenhaEmail("");
    } catch (err) {
      toast.error(err?.response?.data?.msg || "Erro ao solicitar troca de e-mail.");
    } finally {
      setLoading(false);
    }
  };

  const salvarSenha = async () => {
    if (!senhaAtual || !senhaNova) {
      toast.error("Preencha as senhas");
      return;
    }
    if (!isStrongPassword(senhaNova)) {
      toast.error(MSG.senhaFraca);
      return;
    }
    if (jsonConfig.uiMock) {
      toast.success("Senha atualizada (demo UI)");
      setSenhaAtual("");
      setSenhaNova("");
      return;
    }
    setLoading(true);
    try {
      const resp = await identity.changePassword({
        senha: senhaAtual,
        novaSenha: senhaNova,
      });
      if (!resp.status) {
        toast.error(resp.msg || "Erro ao atualizar a senha.");
        return;
      }
      toast.success(resp.msg || "Senha atualizada.");
      setSenhaAtual("");
      setSenhaNova("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Header
        title="Perfil"
        description="Conta, senha e autenticação em duas etapas"
        icon={UserCircleIcon}
      />
      <div className="p-6 max-w-5xl grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <div className="space-y-6">
          <div className="bg-white border border-gray-100 rounded-brand p-6 shadow-sm">
            <h3 className="text-sm font-bold uppercase tracking-wider text-brand-soft mb-4">
              Dados da conta
            </h3>
            <p className="text-sm text-brand-ink mb-1">
              <span className="text-brand-soft">Nome:</span> {session.nome || "—"}
            </p>
            <p className="text-sm text-brand-ink mb-1">
              <span className="text-brand-soft">Papel:</span> {session.role || "—"}
            </p>
            <p className="text-sm text-brand-ink mb-4">
              <span className="text-brand-soft">CPF:</span>{" "}
              {perfil?.cpf ? "CPF cadastrado" : "Não cadastrado"}
            </p>
            <label className="block text-sm font-semibold text-brand-ink mb-1.5">
              E-mail
            </label>
            <input
              value={email}
              disabled={!podeTrocarEmail}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-brand border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-teal disabled:opacity-60"
            />
            {podeTrocarEmail && (
              <>
                <input
                  type="password"
                  placeholder="Senha atual (confirmação)"
                  value={senhaEmail}
                  onChange={(e) => setSenhaEmail(e.target.value)}
                  className="mt-3 w-full rounded-brand border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-teal"
                />
                <button
                  type="button"
                  disabled={loading}
                  onClick={solicitarTrocaEmail}
                  className="mt-3 text-sm font-semibold text-brand-teal hover:underline disabled:opacity-60"
                >
                  Solicitar troca de e-mail
                </button>
              </>
            )}
          </div>

          <div className="bg-white border border-gray-100 rounded-brand p-6 shadow-sm">
            <h3 className="text-sm font-bold uppercase tracking-wider text-brand-soft mb-4">
              Autenticação em duas etapas
            </h3>
            <p className="text-sm text-brand-ink">
              O 2FA é obrigatório na plataforma e está ativo na sua conta.
            </p>
            <p className="text-xs text-brand-soft mt-2">
              Perdeu o acesso ao autenticador? Entre em contato com o suporte para
              revalidar sua identidade.
            </p>
          </div>
        </div>

        <div className="bg-white border border-gray-100 rounded-brand p-6 shadow-sm">
          <h3 className="text-sm font-bold uppercase tracking-wider text-brand-soft mb-4">
            Alterar senha
          </h3>
          <div className="space-y-3">
            <input
              type="password"
              placeholder="Senha atual"
              value={senhaAtual}
              onChange={(e) => setSenhaAtual(e.target.value)}
              className="w-full rounded-brand border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-teal"
            />
            <input
              type="password"
              placeholder="Nova senha"
              value={senhaNova}
              onChange={(e) => setSenhaNova(e.target.value)}
              className="w-full rounded-brand border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-teal"
            />
            <button
              type="button"
              disabled={loading}
              onClick={salvarSenha}
              className="bg-brand-teal hover:bg-brand-teal-dark disabled:opacity-60 text-white text-sm font-bold px-4 py-2 rounded-brand"
            >
              Salvar senha
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Perfil;
