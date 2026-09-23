import { ArrowRightIcon } from "@heroicons/react/24/outline";
import { useNavigate } from "react-router-dom";

const CardActions = ({ actions = [] }) => {
  const navigate = useNavigate();

  return (
    <div className="mb-4">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-brand-soft mb-2">
        Acesso rápido
      </p>
      <div
        className={`grid gap-3 ${
          actions.length > 2
            ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
            : "grid-cols-1 sm:grid-cols-2"
        }`}
      >
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.id}
              type="button"
              onClick={() => navigate(action.href)}
              className="group bg-white border border-gray-100 hover:border-brand-teal rounded-brand p-4 text-left shadow-sm hover:shadow-brand transition-all duration-200"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="p-2 bg-brand-navy rounded-brand">
                  <Icon className="w-4 h-4 text-brand-teal-light" />
                </div>
                <ArrowRightIcon className="w-4 h-4 text-gray-300 group-hover:text-brand-teal group-hover:translate-x-0.5 transition-all duration-200" />
              </div>
              <h3 className="text-sm font-semibold text-brand-navy mb-0.5">
                {action.title}
              </h3>
              <p className="text-xs text-brand-soft line-clamp-2 m-0">
                {action.description}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default CardActions;
