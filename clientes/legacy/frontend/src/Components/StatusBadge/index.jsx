import {
  statusSolicitacaoLabel,
  statusSignatarioLabel,
} from "../../Common";

const solicitacaoTone = {
  SOLICITADO: "bg-slate-100 text-brand-navy",
  PROCESSAMENTO_HASH_INICIAL: "bg-amber-50 text-amber-800",
  UPLOAD_CONCLUIDO: "bg-teal-50 text-brand-teal",
  ERRO_HASH_INICIAL: "bg-rose-50 text-rose-700",
  SOLICITADO_ASSINATURA_CONCLUIDO: "bg-sky-50 text-sky-800",
  CONCLUIDO: "bg-emerald-50 text-emerald-800",
  CANCELADO: "bg-slate-200 text-slate-700",
};

const signatarioTone = {
  PENDING: "bg-amber-50 text-amber-800",
  PROCESSING: "bg-sky-50 text-sky-800",
  SIGNED: "bg-emerald-50 text-emerald-800",
  ERROR: "bg-rose-50 text-rose-700",
  AGUARDANDO_ONBOARDING: "bg-slate-100 text-brand-slate",
  CANCELADO: "bg-slate-200 text-slate-700",
};

const StatusBadge = ({ status, kind = "solicitacao" }) => {
  const label =
    kind === "signatario"
      ? statusSignatarioLabel[status] || (status === "CANCELADO" ? "Cancelado" : status)
      : statusSolicitacaoLabel[status] || (status === "CANCELADO" ? "Cancelado" : status);
  const tone =
    kind === "signatario"
      ? signatarioTone[status] || "bg-slate-100 text-brand-slate"
      : solicitacaoTone[status] || "bg-slate-100 text-brand-slate";

  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 text-xs font-semibold tracking-wide rounded-brand ${tone}`}
    >
      {label}
    </span>
  );
};

export default StatusBadge;
