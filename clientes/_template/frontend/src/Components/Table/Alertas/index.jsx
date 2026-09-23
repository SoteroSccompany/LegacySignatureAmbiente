import { Link } from "react-router-dom";
import { formatDateAnTime } from "../../../Common";

const TableAlertas = ({ data = [], onMarkRead }) => {
  if (!data.length) {
    return (
      <div className="bg-white border border-gray-100 rounded-brand p-10 text-center text-sm text-brand-soft">
        Nenhum alerta no momento.
      </div>
    );
  }

  return (
    <ul className="space-y-3 m-0 p-0 list-none">
      {data.map((a) => (
        <li
          key={a.id}
          className={`bg-white border rounded-brand p-4 shadow-sm ${
            a.lido ? "border-gray-100" : "border-brand-teal/40"
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                {!a.lido && (
                  <span className="w-2 h-2 rounded-full bg-brand-teal" />
                )}
                <p className="text-sm font-semibold text-brand-navy m-0">
                  {a.titulo}
                </p>
              </div>
              <p className="text-sm text-brand-ink m-0">{a.descricao}</p>
              <p className="text-xs text-brand-soft mt-2 m-0">
                {formatDateAnTime(a.criado_em)} · {a.tipo}
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              {a.solicitacao_id && (
                <Link
                  to={`/solicitacoes/${a.solicitacao_id}`}
                  className="text-sm font-semibold text-brand-teal hover:underline"
                >
                  Ver solicitação
                </Link>
              )}
              {a.tipo === "pendente_aprovacao_perfil_biometria" &&
                a.referencia_tipo === "usuario" &&
                a.referencia_id && (
                  <Link
                    to={`/aprovacao-biometria/${a.referencia_id}`}
                    className="text-sm font-semibold text-brand-teal hover:underline"
                  >
                    Avaliar biometria
                  </Link>
                )}
              {!a.lido && onMarkRead && (
                <button
                  type="button"
                  onClick={() => onMarkRead(a.id)}
                  className="text-sm text-brand-soft hover:text-brand-navy"
                >
                  Marcar lido
                </button>
              )}
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
};

export default TableAlertas;
