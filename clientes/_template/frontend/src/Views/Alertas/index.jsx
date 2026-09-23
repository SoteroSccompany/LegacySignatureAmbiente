import { useEffect, useState } from "react";
import Header from "../../Components/Header";
import TableAlertas from "../../Components/Table/Alertas";
import { BellAlertIcon } from "@heroicons/react/24/outline";
import { toast } from "react-toastify";
import { getPanelService } from "../../services/panel";

const Alertas = () => {
  const panel = getPanelService();
  const [alertas, setAlertas] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      const resp = await panel.listAlertas();
      if (!alive) return;
      setAlertas(resp.data || []);
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [panel]);

  const marcarLido = async (id) => {
    if (panel.marcarAlertaLido) {
      const resp = await panel.marcarAlertaLido(id);
      if (!resp.status) {
        toast.error(resp.msg || "Erro ao marcar alerta.");
        return;
      }
    }
    setAlertas((prev) =>
      prev.map((a) => (a.id === id ? { ...a, lido: true } : a))
    );
    toast.success("Alerta marcado como lido");
  };

  return (
    <div>
      <Header
        title="Alertas"
        description="Falhas de convite, processamento e eventos da solicitação"
        icon={BellAlertIcon}
      />
      <div className="p-6">
        {loading ? (
          <p className="text-sm text-brand-soft">Carregando…</p>
        ) : (
          <TableAlertas data={alertas} onMarkRead={marcarLido} />
        )}
      </div>
    </div>
  );
};

export default Alertas;
