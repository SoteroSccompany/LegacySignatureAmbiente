import { formatDateAnTime } from "../../../Common";

const TimelineSolicitacao = ({ events = [] }) => {
  if (!events.length) {
    return <p className="text-sm text-brand-soft m-0">Nenhum evento registrado.</p>;
  }
  return (
    <div className="max-h-[70vh] overflow-y-auto pr-1">
      <ol className="relative border-l border-gray-200 ml-3 space-y-6 m-0 p-0 list-none">
        {events.map((ev) => (
          <li key={ev.id} className="ml-6">
            <span
              className={`absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full ring-4 ring-white ${ev.erro ? "bg-rose-500" : "bg-brand-teal"
                }`}
            />
            <p className="text-[11px] font-bold uppercase tracking-wider text-brand-soft m-0">
              {ev.label}
            </p>
            <h4 className="text-sm font-semibold text-brand-navy mt-1 mb-0.5">
              {ev.titulo}
            </h4>
            <p className="text-sm text-brand-ink m-0">{ev.descricao}</p>
            <p className="text-xs text-brand-soft mt-1 m-0">
              {formatDateAnTime(ev.em)}
            </p>
          </li>
        ))}
      </ol>
    </div>
  );
};

export default TimelineSolicitacao;
