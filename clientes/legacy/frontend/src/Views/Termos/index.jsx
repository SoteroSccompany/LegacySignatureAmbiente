import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../../Components/Header";
import { DocumentTextIcon, PencilSquareIcon } from "@heroicons/react/24/outline";
import { toast } from "react-toastify";
import { getPanelService } from "../../services/panel";
import { TIPO_TERMO_RESPONSABILIDADE } from "../../services/panel/types";

const LABEL_TIPO = {
  [TIPO_TERMO_RESPONSABILIDADE.TERMO_DOCUMENTO]: "Termo para documento",
  [TIPO_TERMO_RESPONSABILIDADE.TERMO_FOTO_PERFIL]: "Consentimento de foto de perfil",
};

const Termos = () => {
  const navigate = useNavigate();
  const panel = getPanelService();
  const [termos, setTermos] = useState([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      setCarregando(true);
      if (!panel.listTermos) {
        toast.info("Gestão de termos disponível apenas na API real (UI_MOCK=false).");
        setCarregando(false);
        return;
      }
      const resp = await panel.listTermos();
      if (!alive) return;
      if (!resp.status) toast.error(resp.msg || "Erro ao carregar termos.");
      setTermos(resp.data || []);
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
        title="Termos de responsabilidade"
        description="Termos vinculados à solicitação de documentos e ao consentimento de foto de perfil"
        icon={DocumentTextIcon}
        hasAction
        buttonText="Novo termo"
        buttonAction={() => navigate("/termos/novo")}
      />

      <div className="p-6">
        {carregando ? (
          <p className="text-sm text-brand-soft">Carregando…</p>
        ) : termos.length === 0 ? (
          <div className="bg-white border border-gray-100 rounded-brand p-6 text-sm text-brand-soft">
            Nenhum termo cadastrado ainda.
          </div>
        ) : (
          <div className="bg-white border border-gray-100 rounded-brand overflow-hidden shadow-sm">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-brand-tip">
                <tr>
                  <th className="px-4 py-3 text-left text-[11px] font-bold uppercase text-brand-soft">
                    Título
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-bold uppercase text-brand-soft">
                    Tipo
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-bold uppercase text-brand-soft">
                    Status
                  </th>
                  <th className="px-4 py-3 text-right text-[11px] font-bold uppercase text-brand-soft">
                    Ação
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {termos.map((t) => (
                  <tr key={t.id}>
                    <td className="px-4 py-3 text-sm font-semibold text-brand-navy">
                      {t.titulo_termo}
                    </td>
                    <td className="px-4 py-3 text-sm text-brand-ink">
                      {LABEL_TIPO[t.tipo_termo] || t.tipo_termo}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {t.ativo ? (
                        <span className="text-emerald-700 font-semibold">Ativo</span>
                      ) : (
                        <span className="text-brand-soft font-semibold">Inativo</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => navigate(`/termos/${t.id}/editar`)}
                        className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-teal hover:underline"
                      >
                        <PencilSquareIcon className="w-4 h-4" />
                        Editar
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

export default Termos;
