import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Dialog, Transition } from "@headlessui/react";
import Header from "../../../Components/Header";
import StatusBadge from "../../../Components/StatusBadge";
import TableSignatarios from "../../../Components/Table/Signatarios";
import TimelineSolicitacao from "../../../Components/Timeline/Solicitacao";
import PdfViewer from "../../../Components/Pdf/Viewer";
import {
  DocumentTextIcon,
  EyeIcon,
  ArrowDownTrayIcon,
  ShieldCheckIcon,
  NoSymbolIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import { formatDateAnTime } from "../../../Common";
import { toast } from "react-toastify";
import { getPanelService, STATUS_SOLICITACAO } from "../../../services/panel";
import { jsonConfig } from "../../../Config";
import { can, CAPABILITY, getRole, getSessionUser, ROLES } from "../../../utils/roles";

const DetalheSolicitacao = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const panel = getPanelService();
  const role = getRole();
  const [solicitacao, setSolicitacao] = useState(null);
  const [erro, setErro] = useState("");
  const [polling, setPolling] = useState(true);
  const [pdfUrl, setPdfUrl] = useState("");
  const [cancelando, setCancelando] = useState(false);
  const [modalCancelar, setModalCancelar] = useState(false);
  const pdfAvisoRef = useRef(false);

  const load = useCallback(async () => {
    const resp = await panel.getSolicitacao(id);
    if (!resp.status) {
      setErro(resp.msg || "Não encontrada");
      setSolicitacao(null);
      return;
    }
    setErro("");
    setSolicitacao(resp.data);
  }, [id, panel]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!solicitacao?.id || !polling) return undefined;
    let cancelled = false;
    const tick = async () => {
      const resp = await panel.getSolicitacaoStatus(solicitacao.id);
      if (cancelled || !resp.status) return;
      setSolicitacao(resp.data);
      setPolling(!!resp.data.polling);
    };
    tick();
    const idInterval = setInterval(tick, 3000);
    return () => {
      cancelled = true;
      clearInterval(idInterval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [solicitacao?.id, polling, panel]);

  // Viewer real: presigned GET do WIP via painel
  useEffect(() => {
    if (jsonConfig.uiMock || !solicitacao?.documento_id) return undefined;
    let alive = true;
    (async () => {
      const resp = await panel.getDocumentoDownload(solicitacao.documento_id);
      if (!alive) return;
      if (resp.status && resp.data?.url) {
        pdfAvisoRef.current = false;
        setPdfUrl(resp.data.url);
        return;
      }
      if (!pdfAvisoRef.current) {
        pdfAvisoRef.current = true;
        toast.error("Não foi possível carregar a pré-visualização do documento.");
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [solicitacao?.documento_id, solicitacao?.status]);

  if (erro && !solicitacao) {
    return (
      <div className="p-6">
        <p className="text-brand-ink">{erro}</p>
        <Link
          to={role === ROLES.SIGNER ? "/contratos" : "/solicitacoes"}
          className="text-brand-teal font-semibold"
        >
          Voltar
        </Link>
      </div>
    );
  }

  if (!solicitacao) {
    return <div className="p-6 text-sm text-brand-soft">Carregando…</div>;
  }

  const documentoCompleto = solicitacao.status === STATUS_SOLICITACAO.CONCLUIDO;
  const documentoCancelado =
    solicitacao.status === STATUS_SOLICITACAO.CANCELADO ||
    solicitacao.documento_status === "DOCUMENTO_CANCELADO";
  const ehDono = solicitacao.owner_user_id === getSessionUser().userId;
  const podeEditar =
    role === ROLES.ADMIN || (can(CAPABILITY.createSolicitacao) && ehDono);
  const podeCancelar =
    (podeEditar || role === ROLES.ADMIN) &&
    !!solicitacao.documento_id &&
    !documentoCompleto &&
    !documentoCancelado;

  const fecharModalCancelar = () => {
    if (cancelando) return;
    setModalCancelar(false);
  };

  const handleCancelarDocumento = async () => {
    if (!solicitacao.documento_id || cancelando) return;
    setCancelando(true);
    try {
      const resp = await panel.cancelarSolicitacao(solicitacao.documento_id);
      if (!resp.status) {
        toast.error(resp.msg || "Erro ao cancelar o documento.");
        return;
      }
      toast.success(resp.msg || "Documento cancelado com sucesso.");
      setModalCancelar(false);
      setPolling(false);
      await load();
    } finally {
      setCancelando(false);
    }
  };

  return (
    <div>
      <Header
        title={solicitacao.titulo}
        description={`${solicitacao.id} · atualizado ${formatDateAnTime(solicitacao.atualizado_em)}${polling ? " · acompanhando ao vivo" : ""
          }`}
        icon={DocumentTextIcon}
        hasReturn
        buttonReturnAction={() =>
          navigate(role === ROLES.SIGNER ? "/contratos" : "/solicitacoes")
        }
        hasAction={podeEditar}
        buttonText="Ver demarcações"
        buttonAction={() =>
          navigate(`/solicitacoes/${solicitacao.id}/demarcacoes`)
        }
      />

      <div className="p-6 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        <div className="space-y-6">
          <div className="bg-white border border-gray-100 rounded-brand p-5 shadow-sm">
            <div className="flex flex-wrap items-center gap-3 mb-2">
              <StatusBadge status={solicitacao.status} />
              {polling && (
                <span className="text-[11px] font-bold uppercase tracking-wider text-brand-teal animate-pulse">
                  Atualizando…
                </span>
              )}
            </div>
            <p className="text-sm text-brand-soft mb-1">
              Arquivo: {solicitacao.arquivo}
              {solicitacao.documento_id
                ? ` · ${solicitacao.documento_id}`
                : ""}
            </p>
            {role === ROLES.ADMIN && (
              <p className="text-sm text-brand-soft mb-4">
                Solicitante: {solicitacao.solicitante}
              </p>
            )}
            <div className="flex flex-wrap gap-3">
              {solicitacao.documento_id && !documentoCompleto && !documentoCancelado && (
                <button
                  type="button"
                  onClick={async () => {
                    const link = `${window.location.origin}/assinar/${solicitacao.documento_id}`;
                    try {
                      await navigator.clipboard.writeText(link);
                      toast.success("Link do documento copiado.");
                    } catch (_) {
                      toast.error("Não foi possível copiar o link.");
                    }
                  }}
                  className="inline-flex items-center gap-2 text-sm font-semibold text-brand-teal hover:underline"
                >
                  Copiar link do documento
                </button>
              )}
              {documentoCompleto && solicitacao.documento_id && (
                <button
                  type="button"
                  onClick={async () => {
                    if (jsonConfig.uiMock) {
                      toast.success("Download simulado do PDF");
                      return;
                    }
                    const resp = await panel.getDocumentoDownload(
                      solicitacao.documento_id
                    );
                    if (!resp.status || !resp.data?.url) {
                      toast.error(resp.msg || "Erro ao gerar o download.");
                      return;
                    }
                    window.open(resp.data.url, "_blank", "noopener");
                  }}
                  className="inline-flex items-center gap-2 text-sm font-semibold text-brand-navy hover:underline"
                >
                  <ArrowDownTrayIcon className="w-4 h-4" />
                  Download
                </button>
              )}
              {documentoCompleto && role === ROLES.ADMIN && solicitacao.documento_id && (
                <Link
                  to={`/auditoria/${solicitacao.documento_id}`}
                  className="inline-flex items-center gap-2 text-sm font-semibold text-brand-navy hover:underline"
                >
                  <ShieldCheckIcon className="w-4 h-4" />
                  Trilha de auditoria
                </Link>
              )}
              {podeEditar && (
                <button
                  type="button"
                  onClick={() =>
                    navigate(`/solicitacoes/${solicitacao.id}/demarcacoes`)
                  }
                  className="inline-flex items-center gap-2 text-sm font-semibold text-brand-navy hover:underline"
                >
                  <EyeIcon className="w-4 h-4" />
                  Ver demarcações
                </button>
              )}
              {podeCancelar && (
                <button
                  type="button"
                  disabled={cancelando}
                  onClick={() => setModalCancelar(true)}
                  className="inline-flex items-center gap-2 text-sm font-semibold text-rose-700 hover:underline disabled:opacity-50 disabled:no-underline"
                >
                  <NoSymbolIcon className="w-4 h-4" />
                  Cancelar documento
                </button>
              )}
            </div>
          </div>

          <div className="bg-white border border-gray-100 rounded-brand p-5 shadow-sm">
            <h3 className="text-sm font-bold uppercase tracking-wider text-brand-soft mb-4">
              Signatários
            </h3>
            <TableSignatarios
              data={solicitacao.signatarios}
              onResend={
                jsonConfig.uiMock
                  ? (s) => toast.info(`Convite reenviado para ${s.email} (demo)`)
                  : undefined
              }
              emptyAction={
                podeEditar &&
                solicitacao.status === STATUS_SOLICITACAO.UPLOAD_CONCLUIDO && (
                  <button
                    type="button"
                    onClick={() =>
                      navigate(`/solicitacoes/${solicitacao.id}/signatarios`)
                    }
                    className="inline-flex items-center gap-2 text-sm font-semibold text-brand-teal hover:underline"
                  >
                    Cadastrar signatários
                  </button>
                )
              }
            />
          </div>

          {pdfUrl && (
            <div className="bg-white border border-gray-100 rounded-brand p-5 shadow-sm">
              <h3 className="text-sm font-bold uppercase tracking-wider text-brand-soft mb-4">
                Documento
              </h3>
              <div className="h-[70vh]">
                <PdfViewer src={pdfUrl} className="h-full" />
              </div>
            </div>
          )}
        </div>

        <div className="bg-white border border-gray-100 rounded-brand p-5 shadow-sm h-fit">
          <h3 className="text-sm font-bold uppercase tracking-wider text-brand-soft mb-6">
            Linha do tempo
          </h3>
          <TimelineSolicitacao events={solicitacao.timeline || []} />
        </div>
      </div>

      <Transition appear show={modalCancelar} as={Fragment}>
        <Dialog
          as="div"
          className="relative z-50"
          onClose={fecharModalCancelar}
        >
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
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-100">
                    <ExclamationTriangleIcon
                      className="h-5 w-5 text-rose-700"
                      aria-hidden="true"
                    />
                  </div>
                  <div>
                    <Dialog.Title className="font-display text-xl text-brand-navy">
                      Cancelar documento?
                    </Dialog.Title>
                    <p className="mt-2 text-sm text-brand-soft m-0">
                      Esta ação é irreversível. Signatários pendentes serão
                      notificados e o documento passará a constar como
                      cancelado.
                    </p>
                  </div>
                </div>
                <div className="mt-6 flex flex-wrap justify-end gap-3">
                  <button
                    type="button"
                    disabled={cancelando}
                    onClick={fecharModalCancelar}
                    className="text-sm font-semibold text-brand-soft disabled:opacity-50"
                  >
                    Manter documento
                  </button>
                  <button
                    type="button"
                    disabled={cancelando}
                    onClick={handleCancelarDocumento}
                    className="inline-flex items-center gap-1 bg-rose-700 text-white text-sm font-bold px-4 py-2 rounded-brand hover:bg-rose-800 disabled:opacity-50"
                  >
                    <NoSymbolIcon className="w-4 h-4" />
                    {cancelando ? "Cancelando…" : "Confirmar cancelamento"}
                  </button>
                </div>
              </Dialog.Panel>
            </div>
          </div>
        </Dialog>
      </Transition>
    </div>
  );
};

export default DetalheSolicitacao;
