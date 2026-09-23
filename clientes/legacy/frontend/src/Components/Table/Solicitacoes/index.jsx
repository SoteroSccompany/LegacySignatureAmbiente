import { Link } from "react-router-dom";
import StatusBadge from "../../StatusBadge";
import { formatDateAnTime } from "../../../Common";
import { EyeIcon } from "@heroicons/react/24/outline";

const TableSolicitacoes = ({ data = [], showSolicitante = false }) => {
  if (!data.length) {
    return (
      <div className="bg-white border border-gray-100 rounded-brand p-10 text-center text-brand-soft text-sm">
        Nenhuma solicitação encontrada.
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-100 rounded-brand shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-100">
          <thead className="bg-brand-tip">
            <tr>
              <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-brand-soft">
                Título
              </th>
              {showSolicitante && (
                <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-brand-soft">
                  Solicitante
                </th>
              )}
              <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-brand-soft">
                Status
              </th>
              <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-brand-soft">
                Signatários
              </th>
              <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-brand-soft">
                Atualizado
              </th>
              <th className="px-4 py-3 text-right text-[11px] font-bold uppercase tracking-wider text-brand-soft">
                Ação
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {data.map((row) => (
              <tr
                key={row.id}
                className="hover:bg-brand-mist/50 transition-colors"
              >
                <td className="px-4 py-3.5">
                  <p className="text-sm font-semibold text-brand-navy m-0">
                    {row.titulo}
                  </p>
                  <p className="text-xs text-brand-soft m-0 mt-0.5">
                    {row.arquivo} · {row.id}
                  </p>
                </td>
                {showSolicitante && (
                  <td className="px-4 py-3.5 text-sm text-brand-ink">
                    {row.solicitante || "—"}
                  </td>
                )}
                <td className="px-4 py-3.5">
                  <StatusBadge status={row.status} />
                </td>
                <td className="px-4 py-3.5 text-sm text-brand-ink">
                  {row.signatarios_count
                    ? `${row.signatarios_count.assinados}/${row.signatarios_count.total}`
                    : row.signatarios?.length || 0}
                </td>
                <td className="px-4 py-3.5 text-sm text-brand-soft">
                  {formatDateAnTime(row.atualizado_em)}
                </td>
                <td className="px-4 py-3.5 text-right">
                  <Link
                    to={`/solicitacoes/${row.id}`}
                    className="inline-flex items-center gap-1 text-sm font-semibold text-brand-teal hover:text-brand-teal-dark"
                  >
                    <EyeIcon className="w-4 h-4" />
                    Abrir
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TableSolicitacoes;
