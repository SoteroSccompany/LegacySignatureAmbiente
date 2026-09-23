import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../../../Components/Header";
import { ShieldCheckIcon, ArrowRightIcon } from "@heroicons/react/24/outline";
import { toast } from "react-toastify";
import { getPanelService } from "../../../services/panel";
import moment from "moment";

const AprovacaoBiometriaLista = () => {
  const navigate = useNavigate();
  const panel = getPanelService();
  const [pendentes, setPendentes] = useState([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      setCarregando(true);
      const resp = panel.getPendentesAprovacaoBiometria
        ? await panel.getPendentesAprovacaoBiometria()
        : { status: false, msg: "Indisponível na demo." };
      if (!alive) return;
      if (!resp.status) toast.error(resp.msg || "Erro ao carregar as biometrias pendentes.");
      setPendentes(resp.data || []);
      setCarregando(false);
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <Header
        title="Aprovação de biometria"
        description="Cadastros de foto de perfil pendentes de aprovação"
        icon={ShieldCheckIcon}
      />

      <div className="p-6">
        {carregando ? (
          <p className="text-sm text-brand-soft">Carregando…</p>
        ) : pendentes.length === 0 ? (
          <div className="bg-white border border-gray-100 rounded-brand p-6 text-sm text-brand-soft">
            Nenhuma biometria pendente de aprovação.
          </div>
        ) : (
          <div className="bg-white border border-gray-100 rounded-brand overflow-hidden shadow-sm">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-brand-tip">
                <tr>
                  <th className="px-4 py-3 text-left text-[11px] font-bold uppercase text-brand-soft">
                    Nome
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-bold uppercase text-brand-soft">
                    E-mail
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-bold uppercase text-brand-soft">
                    Solicitado em
                  </th>
                  <th className="px-4 py-3 text-right text-[11px] font-bold uppercase text-brand-soft">
                    Ação
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {pendentes.map((p) => (
                  <tr key={p.id}>
                    <td className="px-4 py-3 text-sm font-semibold text-brand-navy">
                      {p.nome || "-"}
                    </td>
                    <td className="px-4 py-3 text-sm text-brand-ink">{p.email || "-"}</td>
                    <td className="px-4 py-3 text-sm text-brand-ink">
                      {p.data_criacao ? moment(p.data_criacao).format("DD/MM/YYYY HH:mm") : "-"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => navigate(`/aprovacao-biometria/${p.user_id}`)}
                        className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-teal hover:underline"
                      >
                        Avaliar
                        <ArrowRightIcon className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AprovacaoBiometriaLista;
