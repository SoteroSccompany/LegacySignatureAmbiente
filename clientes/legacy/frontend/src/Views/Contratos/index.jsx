import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Header from "../../Components/Header";
import StatusBadge from "../../Components/StatusBadge";
import { FolderIcon, ArrowDownTrayIcon } from "@heroicons/react/24/outline";
import { toast } from "react-toastify";
import { getPanelService } from "../../services/panel";
import { formatDateAnTime } from "../../Common";
import { jsonConfig } from "../../Config";
import { STATUS_SIGNATARIO } from "../../services/panel/types";

const Contratos = () => {
  const panel = getPanelService();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState("TODOS");

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      const resp = await panel.listMeusContratos();
      if (!alive) return;
      setRows(resp.data || []);
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [panel]);

  const filtrados = rows.filter((r) => {
    if (filtro === "TODOS") return true;
    if (filtro === "PENDENTE") {
      return [
        STATUS_SIGNATARIO.PENDING,
        STATUS_SIGNATARIO.AGUARDANDO_ONBOARDING,
        STATUS_SIGNATARIO.PROCESSING,
      ].includes(r.meu_status);
    }
    if (filtro === "ASSINADO") return r.meu_status === STATUS_SIGNATARIO.SIGNED;
    if (filtro === "ERRO") return r.meu_status === STATUS_SIGNATARIO.ERROR;
    return true;
  });

  return (
    <div>
      <Header
        title="Meus contratos"
        description="Documentos em que você é signatário"
        icon={FolderIcon}
      />
      <div className="p-6">
        <div className="mb-4 flex flex-wrap gap-2">
          {[
            ["TODOS", "Todos"],
            ["PENDENTE", "Pendentes"],
            ["ASSINADO", "Assinados"],
            ["ERRO", "Erro"],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setFiltro(value)}
              className={`px-3 py-1.5 rounded-brand text-xs font-semibold ${
                filtro === value
                  ? "bg-brand-navy text-white"
                  : "bg-white border border-gray-100 text-brand-soft"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-sm text-brand-soft">Carregando…</p>
        ) : !filtrados.length ? (
          <div className="bg-white border border-gray-100 rounded-brand p-10 text-center text-brand-soft text-sm">
            Nenhum contrato neste filtro.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtrados.map((c) => {
              const podeAssinar = [
                STATUS_SIGNATARIO.PENDING,
                STATUS_SIGNATARIO.AGUARDANDO_ONBOARDING,
              ].includes(c.meu_status);
              return (
                <div
                  key={`${c.solicitacao_id}-${c.signatario_id}`}
                  className="bg-white border border-gray-100 rounded-brand p-5 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <p className="text-sm font-bold text-brand-navy m-0">
                        {c.titulo}
                      </p>
                      <p className="text-xs text-brand-soft m-0 mt-1">
                        {c.arquivo} · {c.documento_id}
                      </p>
                    </div>
                    <StatusBadge status={c.meu_status} />
                  </div>
                  <p className="text-xs text-brand-soft mb-4">
                    {c.solicitante ? (
                      <>
                        Solicitante: {c.solicitante}
                        <br />
                      </>
                    ) : null}
                    Atualizado: {formatDateAnTime(c.atualizado_em)}
                  </p>
                  <div className="flex flex-wrap gap-3">
                    {podeAssinar && (
                      <Link
                        to={`/assinar/${c.documento_id}`}
                        className="inline-flex text-sm font-bold text-white bg-brand-teal hover:bg-brand-teal-dark px-4 py-2 rounded-brand"
                      >
                        Assinar
                      </Link>
                    )}
                    <button
                      type="button"
                      onClick={async () => {
                        if (jsonConfig.uiMock) {
                          toast.success("Download simulado do PDF");
                          return;
                        }
                        const resp = await panel.getDocumentoDownload(
                          c.documento_id
                        );
                        if (!resp.status || !resp.data?.url) {
                          toast.error(resp.msg || "Erro ao gerar o download.");
                          return;
                        }
                        window.open(resp.data.url, "_blank", "noopener");
                      }}
                      className="inline-flex items-center gap-2 text-sm font-semibold text-brand-teal hover:underline"
                    >
                      <ArrowDownTrayIcon className="w-4 h-4" />
                      Ver documento
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Contratos;
