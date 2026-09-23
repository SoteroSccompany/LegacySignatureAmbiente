import { useCallback, useEffect, useState, Fragment } from "react";
import Header from "../../Components/Header";
import { KeyIcon, PlusIcon, ClipboardIcon } from "@heroicons/react/24/outline";
import { formatDateAnTime } from "../../Common";
import { toast } from "react-toastify";
import { Dialog, Transition } from "@headlessui/react";
import ConfirmDialog from "../../Components/ConfirmDialog";
import { getPanelService } from "../../services/panel";
import { getRole, ROLES } from "../../utils/roles";

const ESCOPO_LABEL = {
  addon_solicitante: "Solicitante (pedir assinatura)",
  addon_signatario: "Signatário (assinar)",
};

const Integracao = () => {
  const panel = getPanelService();
  const isGerente = getRole() === ROLES.ADMIN;

  const [chaves, setChaves] = useState([]);
  const [segredo, setSegredo] = useState(null);
  const [revogar, setRevogar] = useState(null);
  const [emitindo, setEmitindo] = useState(false);
  const [solicitando, setSolicitando] = useState(false);

  // Só o gerente/admin usa: alvo para emitir a chave de um usuário e o
  // backlog de solicitações (alertas) que os usuários abriram.
  const [usuarios, setUsuarios] = useState([]);
  const [alvoUserId, setAlvoUserId] = useState("");
  const [pendencias, setPendencias] = useState([]);

  const reload = useCallback(async () => {
    const resp = await panel.listChavesIntegracao();
    if (resp.status) setChaves(resp.data || []);
    if (!isGerente) return;
    const [respUsuarios, respAlertas] = await Promise.all([
      panel.listUsuariosIntegracao(),
      panel.listAlertas({ limit: 50, offset: 0, lido: false }),
    ]);
    if (respUsuarios.status) setUsuarios(respUsuarios.data || []);
    if (respAlertas.status) {
      setPendencias(
        (respAlertas.data || []).filter((a) => a.tipo === "chave_integracao_solicitada")
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isGerente]);

  useEffect(() => {
    reload();
  }, [reload]);

  const emitir = async (alvoId) => {
    setEmitindo(true);
    const resp = await panel.createChaveIntegracao(alvoId || null);
    setEmitindo(false);
    if (!resp.status) {
      toast.error(resp.msg || "Falha ao emitir a chave");
      return;
    }
    setSegredo({ chave: resp.data?.chave, escopo: resp.data?.escopo });
    toast.success(resp.msg || "Chave emitida");
    setAlvoUserId("");
    reload();
  };

  const atenderSolicitacao = async (pendencia) => {
    const solicitanteId = pendencia.meta?.solicitante_user_id;
    if (!solicitanteId) {
      toast.error("Solicitação sem usuário de destino identificado.");
      return;
    }
    await emitir(solicitanteId);
    if (panel.marcarAlertaLido) await panel.marcarAlertaLido(pendencia.id);
    setPendencias((prev) => prev.filter((p) => p.id !== pendencia.id));
  };

  const solicitar = async () => {
    setSolicitando(true);
    const resp = await panel.solicitarChaveIntegracao();
    setSolicitando(false);
    if (!resp.status) {
      toast.error(resp.msg || "Falha ao solicitar a chave");
      return;
    }
    toast.success(resp.msg || "Solicitação enviada");
  };

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(segredo?.chave);
      toast.success("Chave copiada");
    } catch (err) {
      toast.error("Não foi possível copiar. Selecione e copie manualmente.");
    }
  };

  const confirmarRevogacao = async () => {
    if (!revogar) return;
    const resp = await panel.revogarChaveIntegracao(revogar.id);
    if (!resp.status) {
      toast.error(resp.msg || "Erro ao revogar");
      return;
    }
    setRevogar(null);
    toast.success(resp.msg || "Chave revogada");
    reload();
  };

  return (
    <div>
      <Header
        title="Integração"
        description="Chaves de integração para o Addon do Google Workspace."
        icon={KeyIcon}
        hasAction={isGerente}
        buttonText={emitindo ? "Emitindo..." : "Emitir minha chave"}
        buttonAction={() => emitir(null)}
      />
      <div className="p-6 space-y-6">
        <div className="bg-brand-tip rounded-brand px-4 py-3 text-xs text-brand-slate">
          A chave (<code>lsak_...</code>) é o login do Addon no Google Workspace.
          Escopo <strong>Solicitante</strong> pede assinatura de documentos; escopo{" "}
          <strong>Signatário</strong> só assina pelo link do convite. Emitir uma
          chave nova para a mesma pessoa invalida as anteriores dela. Só um
          gerente/administrador gera chaves — usuário comum apenas solicita.
        </div>

        {!isGerente && (
          <div className="bg-white border border-gray-100 rounded-brand shadow-sm p-6">
            <h2 className="font-display text-base text-brand-navy m-0">
              Solicitar chave de assinatura
            </h2>
            <p className="text-xs text-brand-soft mt-2 mb-4">
              Você não pode gerar sua própria chave. Solicite a um gerente —
              ele gera a chave de assinatura (<code>addon_signatario</code>) e
              ela aparece na tabela abaixo assim que for emitida.
            </p>
            <button
              type="button"
              onClick={solicitar}
              disabled={solicitando}
              className="inline-flex items-center gap-1 bg-brand-teal text-white text-sm font-bold px-4 py-2 rounded-brand disabled:opacity-60"
            >
              <PlusIcon className="w-4 h-4" />
              {solicitando ? "Enviando..." : "Solicitar chave de assinatura"}
            </button>
          </div>
        )}

        {isGerente && (
          <div className="bg-white border border-gray-100 rounded-brand shadow-sm p-6">
            <h2 className="font-display text-base text-brand-navy m-0">
              Emitir chave de assinatura para um usuário
            </h2>
            <p className="text-xs text-brand-soft mt-2 mb-4">
              Gera a chave (escopo <code>addon_signatario</code>) do usuário
              escolhido. O segredo aparece uma única vez — copie e entregue a
              ele.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <select
                value={alvoUserId}
                onChange={(e) => setAlvoUserId(e.target.value)}
                className="rounded-brand border border-gray-200 px-3 py-2 text-sm bg-white outline-none focus:ring-2 focus:ring-brand-teal min-w-[240px]"
              >
                <option value="">Selecione o usuário…</option>
                {usuarios.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.nome || u.email} ({u.email})
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => emitir(alvoUserId)}
                disabled={!alvoUserId || emitindo}
                className="inline-flex items-center gap-1 bg-brand-teal text-white text-sm font-bold px-4 py-2 rounded-brand disabled:opacity-60"
              >
                <PlusIcon className="w-4 h-4" />
                Emitir chave de assinatura
              </button>
            </div>
          </div>
        )}

        {isGerente && pendencias.length > 0 && (
          <div className="bg-white border border-gray-100 rounded-brand shadow-sm p-6">
            <h2 className="font-display text-base text-brand-navy m-0">
              Solicitações de chave pendentes
            </h2>
            <ul className="mt-4 space-y-3">
              {pendencias.map((p) => (
                <li
                  key={p.id}
                  className="flex flex-wrap items-center justify-between gap-3 bg-brand-tip rounded-brand px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-semibold text-brand-navy m-0">
                      {p.meta?.solicitante_email || p.descricao}
                    </p>
                    <p className="text-xs text-brand-soft m-0">
                      {formatDateAnTime(p.criado_em)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => atenderSolicitacao(p)}
                    disabled={emitindo}
                    className="text-sm font-semibold text-brand-teal hover:underline disabled:opacity-60"
                  >
                    Atender — emitir chave
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="bg-white border border-gray-100 rounded-brand overflow-hidden shadow-sm">
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-brand-tip">
              <tr>
                <th className="px-4 py-3 text-left text-[11px] font-bold uppercase text-brand-soft">
                  Prefixo
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-bold uppercase text-brand-soft">
                  Vinculada a
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-bold uppercase text-brand-soft">
                  Escopo
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-bold uppercase text-brand-soft">
                  Último uso
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-bold uppercase text-brand-soft">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-bold uppercase text-brand-soft">
                  Criada
                </th>
                <th className="px-4 py-3 text-right text-[11px] font-bold uppercase text-brand-soft">
                  Ação
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {chaves.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-sm text-brand-soft">
                    {isGerente
                      ? "Nenhuma chave emitida. Emita a sua ou a de um usuário acima."
                      : "Nenhuma chave sua ainda. Solicite acima a um gerente."}
                  </td>
                </tr>
              )}
              {chaves.map((c) => (
                <tr key={c.id}>
                  <td className="px-4 py-3">
                    <p className="text-sm font-semibold text-brand-navy m-0 font-mono">
                      {c.prefixo}…
                    </p>
                  </td>
                  <td className="px-4 py-3 text-sm text-brand-ink">
                    {c.email_usuario}
                  </td>
                  <td className="px-4 py-3 text-sm text-brand-ink">
                    {ESCOPO_LABEL[c.escopo] || c.escopo || "—"}
                  </td>
                  <td className="px-4 py-3 text-sm text-brand-soft">
                    {c.ultimo_uso ? formatDateAnTime(c.ultimo_uso) : "—"}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {c.revogada ? (
                      <span className="text-rose-600 font-semibold">
                        Revogada
                      </span>
                    ) : (
                      <span className="text-emerald-700 font-semibold">
                        Ativa
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-brand-soft">
                    {formatDateAnTime(c.data_criacao)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {!c.revogada && (
                      <button
                        type="button"
                        onClick={() => setRevogar(c)}
                        className="text-sm font-semibold text-rose-600 hover:underline"
                      >
                        Revogar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Transition appear show={!!segredo} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => setSegredo(null)}>
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
              <Dialog.Panel className="w-full max-w-lg bg-white rounded-brand shadow-brand p-6">
                <Dialog.Title className="font-display text-xl text-brand-navy">
                  Chave de integração emitida
                </Dialog.Title>
                <p className="mt-2 text-xs text-brand-soft m-0">
                  Guarde agora: o segredo <strong>não será exibido novamente</strong>.
                  Cole no card "Vincular chave" do Addon no Google Workspace.
                  {segredo?.escopo && (
                    <> Escopo: <strong>{ESCOPO_LABEL[segredo.escopo] || segredo.escopo}</strong>.</>
                  )}
                </p>
                <div className="mt-4 bg-brand-tip rounded-brand px-3 py-3 font-mono text-xs break-all select-all">
                  {segredo?.chave}
                </div>
                <div className="mt-6 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={copiar}
                    className="inline-flex items-center gap-1 text-sm font-semibold text-brand-teal"
                  >
                    <ClipboardIcon className="w-4 h-4" />
                    Copiar
                  </button>
                  <button
                    type="button"
                    onClick={() => setSegredo(null)}
                    className="inline-flex items-center gap-1 bg-brand-teal text-white text-sm font-bold px-4 py-2 rounded-brand"
                  >
                    <PlusIcon className="w-4 h-4" />
                    Já guardei
                  </button>
                </div>
              </Dialog.Panel>
            </div>
          </div>
        </Dialog>
      </Transition>

      <ConfirmDialog
        open={!!revogar}
        onClose={() => setRevogar(null)}
        title="Revogar chave"
        description={
          revogar
            ? `Revogar a chave ${revogar.prefixo}…? O Addon vai parar de funcionar com ela.`
            : ""
        }
        confirmText="Revogar"
        danger
        onConfirm={confirmarRevogacao}
      />
    </div>
  );
};

export default Integracao;
