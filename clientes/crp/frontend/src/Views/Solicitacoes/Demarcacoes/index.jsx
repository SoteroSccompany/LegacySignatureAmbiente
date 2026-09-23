import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Header from "../../../Components/Header";
import PdfDemarcacao from "../../../Components/Pdf/Demarcacao";
import { PencilSquareIcon } from "@heroicons/react/24/outline";
import { toast } from "react-toastify";
import { getPanelService } from "../../../services/panel";
import { jsonConfig } from "../../../Config";

// A API real não expõe edição de demarcações após o cadastro dos
// signatários (não existe endpoint equivalente a "saveDemarcacoes") — esta
// tela é somente leitura, mostrando o que já foi persistido.
const DemarcacoesView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const panel = getPanelService();
  const [solicitacao, setSolicitacao] = useState(null);
  const [areas, setAreas] = useState([]);
  const [pdfSrc, setPdfSrc] = useState(jsonConfig.uiMock ? "/documento.sample.pdf" : null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      const resp = await panel.getSolicitacao(id);
      if (!alive) return;
      if (!resp.status) {
        setSolicitacao(null);
        setCarregando(false);
        return;
      }
      setSolicitacao(resp.data);
      const initial = (resp.data.signatarios || []).flatMap((s) =>
        (s.demarcaoes || []).map((d) => ({
          ...d,
          signatarioId: s.id,
          cor: s.cor,
        }))
      );
      setAreas(initial);
      setCarregando(false);

      if (!jsonConfig.uiMock && resp.data.documento_id) {
        const doc = await panel.getDocumentoDownload(resp.data.documento_id);
        if (!alive) return;
        if (doc.status && doc.data?.url) {
          setPdfSrc(doc.data.url);
        } else {
          toast.error("Não foi possível carregar a pré-visualização do documento.");
        }
      }
    })();
    return () => {
      alive = false;
    };
  }, [id, panel]);

  if (carregando) {
    return <div className="p-6 text-sm text-brand-soft">Carregando…</div>;
  }

  if (!solicitacao) {
    return (
      <div className="p-6 text-brand-ink">Solicitação não encontrada.</div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] min-h-0 overflow-hidden">
      <div className="shrink-0">
        <Header
          title="Demarcações"
          description={solicitacao.titulo}
          icon={PencilSquareIcon}
          compact
          hasReturn
          buttonReturnAction={() => navigate(`/solicitacoes/${solicitacao.id}`)}
        />
      </div>
      <div className="flex-1 min-h-0 p-3 sm:p-4">
        <PdfDemarcacao
          signatarios={solicitacao.signatarios}
          areas={areas}
          onChangeAreas={setAreas}
          src={pdfSrc}
          className="h-full"
          readOnly
        />
      </div>
    </div>
  );
};

export default DemarcacoesView;
