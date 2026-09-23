import {
  DocumentTextIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";

const icons = [
  DocumentTextIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
];

const CardMetricas = ({ dataMetricas = [] }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
      {dataMetricas.map((stat, index) => {
        const Icon = icons[index % icons.length];
        return (
          <div
            key={stat.id || index}
            className="bg-white border border-gray-100 rounded-brand p-4 shadow-sm animate-brand-fade-up"
            style={{ animationDelay: `${index * 60}ms` }}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 bg-brand-navy rounded-brand">
                <Icon className="w-4 h-4 text-brand-teal-light" />
              </div>
              {stat.trend && (
                <span className="text-[11px] font-semibold text-brand-teal">
                  {stat.trend}
                </span>
              )}
            </div>
            <p className="text-2xl font-bold text-brand-navy m-0">{stat.value}</p>
            <p className="text-sm font-semibold text-brand-ink mt-1 m-0">
              {stat.title}
            </p>
            {stat.description && (
              <p className="text-xs text-brand-soft mt-0.5 m-0">
                {stat.description}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default CardMetricas;
