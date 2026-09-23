const TermoAceite = ({ termo, loading, onAceitar }) => {
  if (!termo) {
    return (
      <p className="text-sm text-brand-soft">Carregando termo de responsabilidade…</p>
    );
  }
  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-bold text-brand-navy mb-2">
          {termo.titulo_termo}
        </p>
        <div className="max-h-56 overflow-y-auto bg-brand-tip rounded-brand p-4 text-xs text-brand-slate leading-relaxed whitespace-pre-wrap">
          {termo.descricao_termo}
        </div>
      </div>
      <button
        type="button"
        onClick={onAceitar}
        disabled={loading}
        className="w-full bg-brand-teal hover:bg-brand-teal-dark disabled:opacity-50 text-white font-bold py-3.5 rounded-brand"
      >
        {loading ? "Confirmando…" : "Li e aceito o termo"}
      </button>
    </div>
  );
};

export default TermoAceite;
