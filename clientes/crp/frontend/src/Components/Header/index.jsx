import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import { colorMap } from "../../Common";

const Header = ({
  title,
  description,
  icon: Icon,
  buttonText,
  buttonAction,
  buttonReturnAction,
  hasReturn = false,
  hasAction = false,
  color = "teal",
  compact = false,
}) => {
  const colorClasses = colorMap[color] || colorMap.teal;

  return (
    <div className="bg-white border-b border-gray-200">
      <div className={compact ? "px-4 py-3" : "px-6 py-5"}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center">
            {hasReturn && (
              <button
                onClick={buttonReturnAction}
                className="mr-3 p-2 rounded-brand bg-brand-tip hover:bg-gray-200 transition-colors duration-200"
                title="Voltar"
              >
                <ArrowLeftIcon className="w-5 h-5 text-brand-slate" />
              </button>
            )}
            <div className={`p-2 rounded-brand ${colorClasses.headerIconBg} mr-3`}>
              <Icon
                className={`${compact ? "w-5 h-5" : "w-6 h-6"} ${colorClasses.headerIconText}`}
              />
            </div>
            <div>
              <h1
                className={`${compact ? "text-lg" : "text-2xl"} font-display font-semibold text-brand-navy m-0`}
              >
                {title}
              </h1>
              <p className="text-sm text-brand-soft m-0">{description}</p>
            </div>
          </div>
          {hasAction && (
            <button
              onClick={buttonAction}
              className={`inline-flex items-center px-4 py-2 ${colorClasses.headerButtonBg} text-white rounded-brand ${colorClasses.headerButtonHover} transition-colors duration-200 text-sm font-semibold`}
            >
              {Icon && <Icon className="w-4 h-4 mr-2" />}
              {buttonText}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Header;
