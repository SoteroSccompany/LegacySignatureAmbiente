import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Header from "../../Components/Header";
import {
  ShieldCheckIcon,
  ShieldExclamationIcon,
  ClipboardDocumentIcon,
} from "@heroicons/react/24/outline";
import { toast } from "react-toastify";
import { formatDateAnTime } from "../../Common";
import { getPanelService } from "../../services/panel";

const truncHash = (h) => (h ? `${h.slice(0, 12)}…${h.slice(-12)}` : "—");

const copiar = async (texto, label = "Hash") => {
  try {
    await navigator.clipboard.writeText(texto);
    toast.success(`${label} copiado`);
  } catch {
    toast.error("Não foi possível copiar");
  }
};

const CorEstrutural = {
  GENESE: "bg-sky-50 text-sky-700 border-sky-200",
  OK: "bg-emerald-50 text-emerald-700 border-emerald-200",
  ROMPIDA: "bg-rose-50 text-rose-700 border-rose-200",
  DIVERGENTE_RECALCULO: "bg-amber-50 text-amber-700 border-amber-200",
};

const BadgeEstrutural = ({ valor }) => (
  <span
    className={`inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
      CorEstrutural[valor] || "bg-gray-50 text-brand-soft border-gray-200"
    }`}
  >
    {valor}
  </span>
);

const BadgeProfunda = ({ item }) => {
  if (!item) return null;
  if (item.payload_confere === true) {
    return (
      <span className="inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border bg-emerald-50 text-emerald-700 border-emerald-200">
        Vault OK
      </span>
    );
  }
  if (item.payload_confere === false) {
    return (
      <span className="inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border bg-rose-50 text-rose-700 border-rose-200">
        Vault divergente
      </span>
    );
  }
  return (
    <span className="inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border bg-gray-50 text-brand-soft border-gray-200">
      Sem prova em vault
    </span>
  );
};

const Auditoria = () => {
  const { documentoId } = useParams();
  const navigate = useNavigate();
  const panel = getPanelService();
  const [cert, setCert] = useState(null);
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(true);
  const [profundo, setProfundo] = useState(false);
  const [filtroTrilha, setFiltroTrilha] = useState("TODAS");

  const carregar = useCallback(
    async (comProfundidade) => {
      if (!panel.getAuditoria) {
        setErro(
          "A trilha de auditoria fica disponível com a API real (UI_MOCK=false)."
        );
        setLoading(false);
        return;
      }
      setLoading(true);
      const resp = await panel.getAuditoria(documentoId, {
        profundo: comProfundidade,
      });
      setLoading(false);
      if (!resp.status) {
        setErro(resp.msg || "Erro ao carregar a auditoria.");
        return;
      }
      setErro("");
      setCert(resp.data);
    },
    [documentoId, panel]
  );

  useEffect(() => {
    carregar(false);
  }, [carregar]);

  const rodarProfunda = async () => {
    setProfundo(true);
    toast.info("Rodando verificação profunda (vault + CMS)…");
    await carregar(true);
  };

  if (erro && !cert) {
    return (
      <div className="p-6">
        <p className="text-brand-ink">{erro}</p>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="text-brand-teal font-semibold"
        >
          Voltar
        </button>
      </div>
    );
  }

  if (loading && !cert) {
    return <div className="p-6 text-sm text-brand-soft">Carregando…</div>;
  }

  const integro = cert?.veredito_geral === "INTEGRO";
  const trilhas = [
    ...new Set((cert?.linha_do_tempo || []).map((i) => i.trilha)),
  ];
  const eventos = (cert?.linha_do_tempo || []).filter(
    (i) => filtroTrilha === "TODAS" || i.trilha === filtroTrilha
  );

  return (
    <div>
      <Header
        title="Trilha de auditoria"
        description={`${cert?.documento?.nome_documento || ""} · ${cert?.total_eventos ?? 0} eventos selados`}
        icon={integro ? ShieldCheckIcon : ShieldExclamationIcon}
        hasReturn
        buttonReturnAction={() => navigate(-1)}
      />

      <div className="p-6 space-y-6">
        <div
          className={`rounded-brand p-5 border shadow-sm flex flex-col sm:flex-row sm:items-center gap-4 ${
            integro
              ? "bg-emerald-50 border-emerald-200"
              : "bg-rose-50 border-rose-200"
          }`}
        >
          {integro ? (
            <ShieldCheckIcon className="w-10 h-10 text-emerald-600 shrink-0" />
          ) : (
            <ShieldExclamationIcon className="w-10 h-10 text-rose-600 shrink-0" />
          )}
          <div className="flex-1">
            <p
              className={`text-lg font-bold m-0 ${integro ? "text-emerald-800" : "text-rose-800"}`}
            >
              Veredito: {cert?.veredito_geral}
            </p>
            <p className="text-sm m-0 mt-1 text-brand-ink">
              {integro
                ? "Todas as trilhas seladas estão íntegras: o encadeamento de hashes confere do início ao fim."
                : "Foi detectada quebra de encadeamento ou divergência de payload em pelo menos uma trilha."}
              {" "}Gerado em {formatDateAnTime(cert?.gerado_em)}.
            </p>
          </div>
          {!profundo && (
            <button
              type="button"
              onClick={rodarProfunda}
              disabled={loading}
              className="shrink-0 bg-brand-navy hover:bg-brand-navy-light disabled:opacity-50 text-white text-sm font-bold px-4 py-2.5 rounded-brand"
            >
              {loading ? "Verificando…" : "Verificação profunda"}
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white border border-gray-100 rounded-brand p-5 shadow-sm">
            <h3 className="text-sm font-bold uppercase tracking-wider text-brand-soft mb-4">
              Documento
            </h3>
            <dl className="space-y-2 text-sm m-0">
              <div className="flex justify-between gap-3">
                <dt className="text-brand-soft">Arquivo</dt>
                <dd className="text-brand-navy font-semibold m-0 text-right">
                  {cert?.documento?.documento_nome}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-brand-soft">Status</dt>
                <dd className="m-0">{cert?.documento?.status}</dd>
              </div>
              <div className="flex justify-between gap-3 items-center">
                <dt className="text-brand-soft">Hash original</dt>
                <dd className="m-0 font-mono text-xs flex items-center gap-1">
                  {truncHash(cert?.documento?.hash_original)}
                  <button
                    type="button"
                    onClick={() =>
                      copiar(cert?.documento?.hash_original, "Hash original")
                    }
                  >
                    <ClipboardDocumentIcon className="w-4 h-4 text-brand-soft hover:text-brand-navy" />
                  </button>
                </dd>
              </div>
              <div className="flex justify-between gap-3 items-center">
                <dt className="text-brand-soft">Hash final</dt>
                <dd className="m-0 font-mono text-xs flex items-center gap-1">
                  {truncHash(cert?.documento?.hash_final)}
                  {cert?.documento?.hash_final && (
                    <button
                      type="button"
                      onClick={() =>
                        copiar(cert?.documento?.hash_final, "Hash final")
                      }
                    >
                      <ClipboardDocumentIcon className="w-4 h-4 text-brand-soft hover:text-brand-navy" />
                    </button>
                  )}
                </dd>
              </div>
              <div className="flex justify-between gap-3 items-center">
                <dt className="text-brand-soft">Código de verificação</dt>
                <dd className="m-0 font-mono text-xs flex items-center gap-1">
                  {cert?.codigo_verificacao || "—"}
                  {cert?.codigo_verificacao && (
                    <>
                      <button
                        type="button"
                        onClick={() =>
                          copiar(cert.codigo_verificacao, "Código")
                        }
                      >
                        <ClipboardDocumentIcon className="w-4 h-4 text-brand-soft hover:text-brand-navy" />
                      </button>
                      <Link
                        to={`/verificar/${cert.codigo_verificacao}`}
                        className="text-brand-teal font-semibold ml-1"
                      >
                        portal
                      </Link>
                    </>
                  )}
                </dd>
              </div>
            </dl>
          </div>

          <div className="bg-white border border-gray-100 rounded-brand p-5 shadow-sm">
            <h3 className="text-sm font-bold uppercase tracking-wider text-brand-soft mb-4">
              Assinatura criptográfica
            </h3>
            <dl className="space-y-2 text-sm m-0">
              <div className="flex justify-between gap-3">
                <dt className="text-brand-soft">Worker</dt>
                <dd className="m-0">
                  {cert?.assinatura_criptografica?.worker || "—"}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-brand-soft">Algoritmo</dt>
                <dd className="m-0">
                  {cert?.assinatura_criptografica?.algoritmo || "—"}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-brand-soft">Archive ID</dt>
                <dd className="m-0 font-mono text-xs">
                  {cert?.assinatura_criptografica?.archive_id || "—"}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-brand-soft">Carimbado em</dt>
                <dd className="m-0">
                  {cert?.assinatura_criptografica?.carimbado_em
                    ? formatDateAnTime(
                        cert.assinatura_criptografica.carimbado_em
                      )
                    : "—"}
                </dd>
              </div>
            </dl>
            <p className="text-xs text-brand-soft mt-4 mb-0 leading-relaxed">
              {cert?.assinatura_criptografica?.politica_assinatura}
            </p>
          </div>
        </div>

        <div className="bg-white border border-gray-100 rounded-brand p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-brand-soft m-0">
              Linha do tempo ({eventos.length})
            </h3>
            <select
              value={filtroTrilha}
              onChange={(e) => setFiltroTrilha(e.target.value)}
              className="rounded-brand border border-gray-200 px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-brand-teal bg-white"
            >
              <option value="TODAS">Todas as trilhas</option>
              {trilhas.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <ol className="m-0 p-0 list-none space-y-3">
            {eventos.map((ev, idx) => (
              <li
                key={`${ev.trilha}-${ev.sequencia}-${idx}`}
                className="border border-gray-100 rounded-brand p-4"
              >
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <BadgeEstrutural valor={ev.verificacao_estrutural} />
                  {profundo && <BadgeProfunda item={ev.verificacao_profunda} />}
                  {ev.bootstrap_legado && (
                    <span className="inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border bg-gray-50 text-brand-soft border-gray-200">
                      Bootstrap legado
                    </span>
                  )}
                  <span className="text-xs text-brand-soft ml-auto">
                    {formatDateAnTime(ev.criado_em)}
                  </span>
                </div>
                <p className="text-sm font-semibold text-brand-navy m-0">
                  {ev.tipo_evento}
                </p>
                {ev.nome && (
                  <p className="text-xs text-brand-soft m-0 mt-0.5">
                    {ev.nome}
                  </p>
                )}
                <p className="text-xs text-brand-soft m-0 mt-1">
                  Trilha <strong>{ev.trilha}</strong> · sequência{" "}
                  {ev.sequencia}
                </p>
                <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-xs font-mono text-brand-ink">
                  <button
                    type="button"
                    onClick={() => copiar(ev.hash_atual, "Hash do registro")}
                    className="hover:text-brand-teal"
                    title={ev.hash_atual}
                  >
                    hash: {truncHash(ev.hash_atual)}
                  </button>
                  {ev.payload_sha256 && (
                    <button
                      type="button"
                      onClick={() =>
                        copiar(ev.payload_sha256, "SHA-256 do payload")
                      }
                      className="hover:text-brand-teal"
                      title={ev.payload_sha256}
                    >
                      payload: {truncHash(ev.payload_sha256)}
                    </button>
                  )}
                </div>
                {profundo &&
                  ev.verificacao_profunda?.certificado_assinante && (
                    <p className="text-xs text-brand-soft m-0 mt-2">
                      Carimbo:{" "}
                      {ev.verificacao_profunda.certificado_assinante.subject}
                    </p>
                  )}
                {profundo && ev.verificacao_profunda?.observacao && (
                  <p className="text-xs text-amber-700 m-0 mt-2">
                    {ev.verificacao_profunda.observacao}
                  </p>
                )}
              </li>
            ))}
          </ol>
        </div>

        {cert?.limitacoes?.length > 0 && (
          <div className="bg-brand-tip rounded-brand p-5 text-xs text-brand-slate leading-relaxed">
            <p className="font-bold uppercase tracking-wider m-0 mb-2">
              Escopo da verificação
            </p>
            <ul className="m-0 pl-4 space-y-1">
              {cert.limitacoes.map((l, i) => (
                <li key={i}>{l}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default Auditoria;
