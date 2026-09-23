import { AuthContext } from "../../Context";
import { useContext, useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { AuthContextApi } from "../../Context/api";
import { jsonConfig } from "../../Config";
import { getIdentityService } from "../../services/identity";
import {
  Bars3CenterLeftIcon,
  ArrowRightOnRectangleIcon,
  BellAlertIcon,
} from "@heroicons/react/24/outline";
import moment from "moment";

export default function Navbar() {
  const hist = useNavigate();
  const { setters } = useContext(AuthContext);
  const api = useContext(AuthContextApi);
  const [date, setDate] = useState(moment().format("DD/MM/YYYY HH:mm:ss"));

  useEffect(() => {
    const id = setInterval(() => {
      setDate(moment().format("DD/MM/YYYY HH:mm:ss"));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const logOutSys = async () => {
    if (jsonConfig.uiMock) {
      await getIdentityService().logout();
      setters.setSigned(false);
      hist("/");
      return;
    }
    await api.logout();
    hist("/");
  };

  return (
    <div className="h-16 w-full shrink-0 border-b border-gray-200 bg-white z-30">
      <nav className="h-full w-full flex items-center justify-between text-brand-navy">
        <button
          type="button"
          className="h-full border-r border-gray-200 px-4 text-brand-soft md:hidden"
          onClick={() => setters.setSideBar(true)}
        >
          <span className="sr-only">Abrir menu</span>
          <Bars3CenterLeftIcon className="h-6 w-6" aria-hidden="true" />
        </button>

        <div className="flex flex-1 items-center justify-start md:pl-64 px-4">
          <span className="text-sm text-brand-soft tabular-nums">{date}</span>
        </div>

        <div className="flex items-center gap-4 pr-4 md:pr-8">
          <Link
            to="/alertas"
            className="text-brand-soft hover:text-brand-teal transition-colors"
            title="Alertas"
          >
            <BellAlertIcon className="h-6 w-6" />
          </Link>
          <button
            type="button"
            onClick={logOutSys}
            className="text-brand-soft hover:text-brand-navy transition-colors"
            title="Sair"
          >
            <ArrowRightOnRectangleIcon className="h-6 w-6" />
          </button>
        </div>
      </nav>
    </div>
  );
}
