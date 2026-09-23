import { useEffect, useState, Fragment } from "react";
import Header from "../../Components/Header";
import { UserIcon, PlusIcon } from "@heroicons/react/24/outline";
import { formatDateAnTime } from "../../Common";
import { toast } from "react-toastify";
import { Dialog, Transition } from "@headlessui/react";
import ConfirmDialog from "../../Components/ConfirmDialog";
import { getPanelService } from "../../services/panel";
import { ROLES, isBiometriaObrigatoria } from "../../utils/roles";

const Usuarios = () => {
  const panel = getPanelService();
  const biometriaObrigatoria = isBiometriaObrigatoria();
  const [usuarios, setUsuarios] = useState([]);
  const [open, setOpen] = useState(false);
  const [excluir, setExcluir] = useState(null);
  const [form, setForm] = useState({
    nome: "",
    email: "",
    role: ROLES.USER,
  });

  const reload = async () => {
    const resp = await panel.listUsuarios();
    if (resp.status) setUsuarios(resp.data || []);
  };

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const salvar = async () => {
    if (!/\S+@\S+\.\S+/.test(form.email)) {
      toast.error("Informe um e-mail válido");
      return;
    }
    const resp = await panel.createUsuario(form);
    if (!resp.status) {
      toast.error(resp.msg || "Falha ao criar");
      return;
    }
    setOpen(false);
    setForm({ nome: "", email: "", role: ROLES.USER });
    toast.success(resp.msg || "Usuário criado");
    reload();
  };

  const confirmarExclusao = async () => {
    if (!excluir) return;
    const resp = await panel.deleteUsuario(excluir.id);
    if (!resp.status) {
      toast.error(resp.msg || "Erro ao excluir");
      return;
    }
    setExcluir(null);
    toast.success("Usuário excluído");
    reload();
  };

  return (
    <div>
      <Header
        title="Usuários"
        description="Gestão de acessos do painel (ADMIN e USER). Signer nasce por convite."
        icon={UserIcon}
        hasAction
        buttonText="Novo usuário"
        buttonAction={() => setOpen(true)}
      />
      <div className="p-6">
        <div className="bg-brand-tip rounded-brand px-4 py-3 text-xs text-brand-slate mb-4">
          Papéis do painel: <strong>ADMIN</strong> (tudo) e{" "}
          <strong>USER</strong> (delegação / próprias solicitações). Contas{" "}
          <strong>SIGNER</strong> são criadas pelo fluxo de convite de
          assinatura.
        </div>
        <div className="bg-white border border-gray-100 rounded-brand overflow-hidden shadow-sm">
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-brand-tip">
              <tr>
                <th className="px-4 py-3 text-left text-[11px] font-bold uppercase text-brand-soft">
                  Nome
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-bold uppercase text-brand-soft">
                  Papel
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-bold uppercase text-brand-soft">
                  2FA
                </th>
                {biometriaObrigatoria && (
                  <th className="px-4 py-3 text-left text-[11px] font-bold uppercase text-brand-soft">
                    Biometria
                  </th>
                )}
                <th className="px-4 py-3 text-left text-[11px] font-bold uppercase text-brand-soft">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-bold uppercase text-brand-soft">
                  Criado
                </th>
                <th className="px-4 py-3 text-right text-[11px] font-bold uppercase text-brand-soft">
                  Ação
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {usuarios.map((u) => (
                <tr key={u.id}>
                  <td className="px-4 py-3">
                    <p className="text-sm font-semibold text-brand-navy m-0">
                      {u.nome || u.email}
                    </p>
                    <p className="text-xs text-brand-soft m-0">{u.email}</p>
                  </td>
                  <td className="px-4 py-3 text-sm text-brand-ink">
                    <select
                      value={u.role}
                      onChange={async (e) => {
                        const resp = panel.updateUsuarioRole
                          ? await panel.updateUsuarioRole(u.id, e.target.value)
                          : { status: false, msg: "Indisponível na demo" };
                        if (!resp.status) {
                          toast.error(resp.msg || "Erro ao alterar papel");
                          return;
                        }
                        toast.success("Papel atualizado");
                        reload();
                      }}
                      className="rounded-brand border border-gray-200 px-2 py-1 text-xs bg-white outline-none focus:ring-2 focus:ring-brand-teal"
                    >
                      <option value={ROLES.ADMIN}>ADMIN</option>
                      <option value={ROLES.USER}>USER</option>
                      {(biometriaObrigatoria || u.role === ROLES.SUPERVISOR) && (
                        <option value={ROLES.SUPERVISOR}>SUPERVISOR</option>
                      )}
                      {u.role === ROLES.SIGNER && (
                        <option value={ROLES.SIGNER}>SIGNER</option>
                      )}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {u.dois_fatores ? "Ativo" : "—"}
                  </td>
                  {biometriaObrigatoria && (
                    <td className="px-4 py-3 text-sm text-brand-ink">
                      {!u.biometria || !u.biometria.cadastrada
                        ? "Não cadastrada"
                        : u.biometria.aprovada
                          ? "Aprovada"
                          : "Pendente"}
                    </td>
                  )}
                  <td className="px-4 py-3 text-sm">
                    {u.bloqueado ? (
                      <span className="text-rose-600 font-semibold">
                        Bloqueado
                      </span>
                    ) : (
                      <span className="text-emerald-700 font-semibold">
                        Ativo
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-brand-soft">
                    {formatDateAnTime(u.criado_em)}
                  </td>
                  <td className="px-4 py-3 text-right space-x-3">
                    {u.role !== ROLES.ADMIN && (
                      <>
                        <button
                          type="button"
                          onClick={async () => {
                            const resp = await panel.toggleUsuarioBloqueio(u.id);
                            if (!resp.status) {
                              toast.error(resp.msg || "Erro");
                              return;
                            }
                            toast.info(
                              u.bloqueado ? "Usuário desbloqueado" : "Usuário bloqueado"
                            );
                            reload();
                          }}
                          className="text-sm font-semibold text-brand-teal hover:underline"
                        >
                          {u.bloqueado ? "Desbloquear" : "Bloquear"}
                        </button>
                        {panel.deleteUsuario && (
                          <button
                            type="button"
                            onClick={() => setExcluir(u)}
                            className="text-sm font-semibold text-rose-600 hover:underline"
                          >
                            Excluir
                          </button>
                        )}
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Transition appear show={open} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => setOpen(false)}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-200"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-150"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-brand-navy/50" />
          </Transition.Child>
          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <Dialog.Panel className="w-full max-w-md bg-white rounded-brand shadow-brand p-6">
                <Dialog.Title className="font-display text-xl text-brand-navy">
                  Novo usuário do painel
                </Dialog.Title>
                <p className="mt-2 text-xs text-brand-soft m-0">
                  O usuário recebe uma senha temporária por e-mail e completa
                  nome/CPF no onboarding.
                </p>
                <div className="mt-4 space-y-3">
                  <input
                    placeholder="E-mail"
                    value={form.email}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, email: e.target.value }))
                    }
                    className="w-full rounded-brand border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-teal"
                  />
                  <select
                    value={form.role}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, role: e.target.value }))
                    }
                    className="w-full rounded-brand border border-gray-200 px-3 py-2 text-sm bg-white outline-none focus:ring-2 focus:ring-brand-teal"
                  >
                    <option value={ROLES.ADMIN}>ADMIN</option>
                    <option value={ROLES.USER}>USER</option>
                    {biometriaObrigatoria && (
                      <option value={ROLES.SUPERVISOR}>SUPERVISOR</option>
                    )}
                  </select>
                </div>
                <div className="mt-6 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="text-sm font-semibold text-brand-soft"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={salvar}
                    className="inline-flex items-center gap-1 bg-brand-teal text-white text-sm font-bold px-4 py-2 rounded-brand"
                  >
                    <PlusIcon className="w-4 h-4" />
                    Salvar
                  </button>
                </div>
              </Dialog.Panel>
            </div>
          </div>
        </Dialog>
      </Transition>

      <ConfirmDialog
        open={!!excluir}
        onClose={() => setExcluir(null)}
        title="Excluir usuário"
        description={excluir ? `Excluir o usuário ${excluir.email}?` : ""}
        confirmText="Excluir"
        danger
        onConfirm={confirmarExclusao}
      />
    </div>
  );
};

export default Usuarios;
