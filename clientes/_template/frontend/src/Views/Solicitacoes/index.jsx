import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../../Components/Header";
import TableSolicitacoes from "../../Components/Table/Solicitacoes";
import { DocumentTextIcon, PlusCircleIcon } from "@heroicons/react/24/outline";
import { statusSolicitacaoLabel } from "../../Common";
import { getPanelService } from "../../services/panel";
import { can, CAPABILITY, getRole, ROLES } from "../../utils/roles";

const Solicitacoes = () => {
  const navigate = useNavigate();
  const panel = getPanelService();
  const role = getRole();
  const [busca, setBusca] = useState("");
  const [status, setStatus] = useState("TODOS");
  const [lista, setLista] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    const t = setTimeout(async () => {
      setLoading(true);
      const resp = await panel.listSolicitacoes({ busca, status });
      if (!alive) return;
      setLista(resp.data || []);
      setLoading(false);
    }, 200);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [busca, status, panel]);

  return (
    <div>
      <Header
        title="Solicitações"
        description={
          role === ROLES.ADMIN
            ? "Todas as solicitações da plataforma"
            : "Solicitações em que você é signatário"
        }
        icon={DocumentTextIcon}
        hasAction={can(CAPABILITY.createSolicitacao)}
        buttonText="Nova solicitação"
        buttonAction={() => navigate("/solicitacoes/nova")}
      />
      <div className="p-6">
        <div className="bg-white border border-gray-100 rounded-brand p-4 mb-4 flex flex-col sm:flex-row gap-3">
          <input
            type="search"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por título, arquivo, solicitante ou ID…"
            className="flex-1 rounded-brand border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-teal"
          />
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="rounded-brand border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-teal bg-white"
          >
            <option value="TODOS">Todos os status</option>
            {Object.entries(statusSolicitacaoLabel).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
          {can(CAPABILITY.createSolicitacao) && (
            <button
              type="button"
              onClick={() => navigate("/solicitacoes/nova")}
              className="inline-flex items-center justify-center gap-2 bg-brand-teal hover:bg-brand-teal-dark text-white text-sm font-semibold px-4 py-2 rounded-brand"
            >
              <PlusCircleIcon className="w-4 h-4" />
              Nova
            </button>
          )}
        </div>
        {loading ? (
          <p className="text-sm text-brand-soft">Carregando…</p>
        ) : (
          <TableSolicitacoes
            data={lista}
            showSolicitante={role === ROLES.ADMIN}
          />
        )}
      </div>
    </div>
  );
};

export default Solicitacoes;
