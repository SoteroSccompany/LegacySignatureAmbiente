import { useEffect, useState } from "react";
import {
  DocumentTextIcon,
  PlusCircleIcon,
  BellAlertIcon,
  UsersIcon,
  ChartBarIcon,
  FolderIcon,
  FingerPrintIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/outline";
import CardMetricas from "../../Components/Cards/Metricas";
import CardActions from "../../Components/Cards/Actions";
import TableSolicitacoes from "../../Components/Table/Solicitacoes";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import { getPanelService } from "../../services/panel";
import { can, canApproveBiometria, CAPABILITY, getRole, ROLES } from "../../utils/roles";

const Dashboard = () => {
  const panel = getPanelService();
  const role = getRole();
  const cardsBiometria = [
    canApproveBiometria(role) && {
      id: 4,
      title: "Aprovação de biometria",
      description: "Perfis aguardando conferência",
      icon: ShieldCheckIcon,
      href: "/aprovacao-biometria",
    },
    {
      id: 5,
      title: "Biometria",
      description: "Cadastro do reconhecimento facial",
      icon: FingerPrintIcon,
      href: "/biometria",
    },
  ].filter(Boolean);
  const [stats, setStats] = useState([]);
  const [recentes, setRecentes] = useState([]);

  useEffect(() => {
    let alive = true;
    (async () => {
      const resp = await panel.getDashboard();
      if (!alive) return;
      if (!resp.status) {
        toast.error(resp.msg || "Não foi possível carregar o painel, tente novamente em instantes.");
        return;
      }
      setStats(resp.data.stats || []);
      setRecentes(resp.data.recentes || []);
    })();
    return () => {
      alive = false;
    };
  }, [panel]);

  const cardActions =
    role === ROLES.SIGNER
      ? [
          {
            id: 1,
            title: "Meus contratos",
            description: "Pendentes e já assinados por você",
            icon: FolderIcon,
            href: "/contratos",
          },
          {
            id: 2,
            title: "Alertas",
            description: "Convites e atualizações da sua fila",
            icon: BellAlertIcon,
            href: "/alertas",
          },
          ...cardsBiometria,
        ]
      : [
          can(CAPABILITY.createSolicitacao) && {
            id: 1,
            title: "Nova solicitação",
            description: "Envie um PDF e configure signatários",
            icon: PlusCircleIcon,
            href: "/solicitacoes/nova",
          },
          {
            id: 2,
            title: "Solicitações",
            description:
              role === ROLES.ADMIN
                ? "Visão global de status e signatários"
                : "Acompanhe as suas solicitações",
            icon: DocumentTextIcon,
            href: "/solicitacoes",
          },
          {
            id: 3,
            title: "Alertas",
            description: "Falhas de convite e processamento",
            icon: BellAlertIcon,
            href: "/alertas",
          },
          ...cardsBiometria,
        ].filter(Boolean);

  return (
    <div className="p-4 sm:p-5">
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-brand-fade-up">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-brand-navy rounded-brand">
            <ChartBarIcon className="w-5 h-5 text-brand-teal-light" />
          </div>
          <div>
            <h1 className="text-xl font-display font-bold text-brand-navy m-0">
              Dashboard
            </h1>
            <p className="text-sm text-brand-soft m-0">
              {role === ROLES.ADMIN
                ? "Visão geral da plataforma"
                : role === ROLES.SIGNER
                  ? "Seus contratos e pendências"
                  : "Suas solicitações de assinatura"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-xs text-brand-soft m-0">Bem-vindo de volta,</p>
            <p className="font-semibold text-sm text-brand-navy m-0">
              {localStorage.getItem("usuario") || "Usuário"}
            </p>
          </div>
          <div className="w-9 h-9 bg-brand-navy rounded-full flex items-center justify-center">
            <UsersIcon className="w-4 h-4 text-brand-teal-light" />
          </div>
        </div>
      </div>

      <CardActions actions={cardActions} />
      {role === ROLES.ADMIN && <CardMetricas dataMetricas={stats} />}

      <div className="flex items-center justify-between mb-2 mt-1">
        <h2 className="text-sm font-bold uppercase tracking-wider text-brand-soft m-0">
          {role === ROLES.SIGNER ? "Contratos recentes" : "Solicitações recentes"}
        </h2>
        <Link
          to={role === ROLES.SIGNER ? "/contratos" : "/solicitacoes"}
          className="text-sm font-semibold text-brand-teal hover:underline"
        >
          Ver todas
        </Link>
      </div>
      {role === ROLES.SIGNER ? (
        <div className="bg-white border border-gray-100 rounded-brand p-4 space-y-2">
          {recentes.length === 0 && (
            <p className="text-sm text-brand-soft m-0">Nenhum contrato ainda.</p>
          )}
          {recentes.map((r) => (
            <Link
              key={r.id}
              to="/contratos"
              className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0 text-sm"
            >
              <span className="font-semibold text-brand-navy">{r.titulo}</span>
              <span className="text-brand-soft text-xs">{r.status}</span>
            </Link>
          ))}
        </div>
      ) : (
        <TableSolicitacoes data={recentes} showSolicitante={role === ROLES.ADMIN} />
      )}
    </div>
  );
};

export default Dashboard;
