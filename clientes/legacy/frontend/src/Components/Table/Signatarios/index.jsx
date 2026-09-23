import StatusBadge from "../../StatusBadge";

const TableSignatarios = ({ data = [], onResend, emptyAction }) => {
  if (!data.length) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-brand-soft m-0">
          Nenhum signatário cadastrado.
        </p>
        {emptyAction}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto border border-gray-100 rounded-brand">
      <table className="min-w-full divide-y divide-gray-100">
        <thead className="bg-brand-tip">
          <tr>
            <th className="px-4 py-2.5 text-left text-[11px] font-bold uppercase text-brand-soft">
              Nome
            </th>
            <th className="px-4 py-2.5 text-left text-[11px] font-bold uppercase text-brand-soft">
              E-mail
            </th>
            <th className="px-4 py-2.5 text-left text-[11px] font-bold uppercase text-brand-soft">
              Status
            </th>
            <th className="px-4 py-2.5 text-right text-[11px] font-bold uppercase text-brand-soft">
              Ação
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50 bg-white">
          {data.map((s) => (
            <tr key={s.id}>
              <td className="px-4 py-3 text-sm font-semibold text-brand-navy">
                <span
                  className="inline-block w-2 h-2 rounded-full mr-2"
                  style={{ background: s.cor || "#0F766E" }}
                />
                {s.nome}
              </td>
              <td className="px-4 py-3 text-sm text-brand-ink">{s.email}</td>
              <td className="px-4 py-3">
                <StatusBadge status={s.status} kind="signatario" />
              </td>
              <td className="px-4 py-3 text-right">
                {s.status !== "SIGNED" && onResend && (
                  <button
                    type="button"
                    onClick={() => onResend(s)}
                    className="text-sm font-semibold text-brand-teal hover:underline"
                  >
                    Reenviar convite
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default TableSignatarios;
