import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import PdfViewer from "../../../Components/Pdf/Viewer";
import { jsonConfig } from "../../../Config";
import { assinaturaApi } from "../../../services/assinatura/api";
import {
  ETAPA_SESSAO,
  normalizarEtapa,
  resolverDesvioQualificacao,
} from "../../../services/assinatura/types";
import { STATUS_SIGNATARIO } from "../../../services/panel/types";
import {
  hasFullSession,
  resolveNextRoute,
  setPendingAssinar,
} from "../../../services/identity";
import { clearLocalSession } from "../../../utils";

const AssinarDocumento = () => {
  const { documentoId } = useParams();
  const navigate = useNavigate();
  const [doc, setDoc] = useState(null);
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);

  const voltarParaAuth = useCallback(
    (msg) => {
      if (msg) toast.info(msg);
      navigate(`/assinar/${documentoId}/auth`, { replace: true });
    },
    [documentoId, navigate]
  );

  // Sessão realmente morta no backend: limpa o token stale do painel (o
  // interceptor global não limpa nas rotas /assinar) e volta pro login com
  // o convite pendente — mesmo padrão do irParaPainel do hub.
  const irParaPainel = useCallback(
    (msg) => {
      clearLocalSession();
      setPendingAssinar(documentoId);
      if (msg) toast.info(msg);
      navigate("/", { replace: true });
    },
    [documentoId, navigate]
  );

  const carregar = useCallback(async () => {
    // Sempre revalida o progresso primeiro: garante que req.session.user.assinatura está
    // atualizado no servidor (essencial após um refresh de página) e só segue para o PDF se a
    // etapa da sessão realmente for "validado".
    const progresso = await assinaturaApi.getProgresso(documentoId);
    if (!progresso.status) {
      if (progresso.sessaoExpirada) return voltarParaAuth("Autentique-se para continuar.");
      setErro(progresso.msg);
      return;
    }
    // etapa pode voltar como string ("2") depois de um ciclo ocioso — sem
    // normalizar, a comparação crua falha e devolve pro hub sem necessidade.
    if (normalizarEtapa(progresso.data?.etapa) !== ETAPA_SESSAO.VALIDADO) {
      return voltarParaAuth();
    }
    const resp = await assinaturaApi.getDocumento(documentoId);
    if (!resp.status) {
      if (resp.sessaoExpirada) return voltarParaAuth("Autentique-se para continuar.");
      setErro(resp.msg);
      return;
    }
    // Signatário já processando/assinado: nada a confirmar aqui, o PDF fica
    // pra tela de status (liberação sem download na cerimônia).
    const statusSignatario = resp.data?.signatario?.status;
    if ([STATUS_SIGNATARIO.PROCESSING, STATUS_SIGNATARIO.SIGNED].includes(statusSignatario)) {
      navigate(`/assinar/${documentoId}/status`, { replace: true });
      return;
    }
    setErro("");
    setDoc(resp.data);
  }, [documentoId, navigate, voltarParaAuth]);

  useEffect(() => {
    if (!hasFullSession()) {
      setPendingAssinar(documentoId);
      navigate("/", { replace: true });
      return;
    }
    carregar();
  }, [documentoId, navigate, carregar]);

  const confirmar = async () => {
    setEnviando(true);
    try {
      const presign = await assinaturaApi.getEstampaUploadUrl(documentoId);
      if (!presign.status) {
        if (presign.sessaoExpirada) return irParaPainel("Sessão expirada. Autentique-se novamente.");
        const desvio = resolverDesvioQualificacao(presign);
        // Termo/biometria: a sessão de assinatura ainda é válida, o hub em
        // /auth resolve a etapa certa a partir do progresso.
        if (desvio?.tipo === "termo" || desvio?.tipo === "biometria") {
          return voltarParaAuth(presign.msg);
        }
        // Perfil/2FA/senha caíram no meio da cerimônia (ex.: alterado por um
        // admin) — sem isso o usuário fica preso num toast sem saída nesta tela.
        if (desvio?.tipo === "painel") {
          setPendingAssinar(documentoId);
          if (presign.msg) toast.info(presign.msg);
          navigate(
            desvio.nextStep
              ? resolveNextRoute(desvio.nextStep, localStorage.getItem("permisssion"))
              : "/",
            { replace: true }
          );
          return;
        }
        toast.error(presign.msg);
        return;
      }
      const resp = await assinaturaApi.assinar(documentoId, presign.data.id);
      if (!resp.status) {
        if (resp.sessaoExpirada) return irParaPainel("Sessão expirada. Autentique-se novamente.");
        toast.error(resp.msg);
        return;
      }
      toast.success(resp.msg || "Assinatura enviada para processamento");
      navigate(`/assinar/${documentoId}/status`, { replace: true });
    } finally {
      setEnviando(false);
    }
  };

  if (erro) {
    return (
      <div className="min-h-screen bg-brand-mist flex items-center justify-center p-6">
        <div className="bg-white border border-gray-100 rounded-brand p-8 shadow-sm max-w-md text-center">
          <p className="text-sm text-brand-ink mb-4">{erro}</p>
          <button
            type="button"
            onClick={carregar}
            className="text-sm font-semibold text-brand-teal hover:underline"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-mist flex flex-col">
      <header className="bg-brand-navy text-white px-6 py-4">
        <p className="text-[11px] tracking-[0.22em] uppercase text-brand-mute m-0">
          {jsonConfig.brand.nameSoftware}
        </p>
        <h1 className="font-display text-xl font-bold m-0 mt-1">
          Assinar documento
        </h1>
        <p className="text-sm text-brand-mute-soft m-0 mt-1">{doc?.documento?.nome}</p>
      </header>
      <div className="h-1 bg-gradient-to-r from-brand-teal via-brand-teal-light to-brand-navy" />

      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-0">
        <PdfViewer
          fitWidth
          src={doc?.pdf_url}
          className="min-h-[50vh] lg:min-h-0 lg:h-full"
        />

        <aside className="bg-white border-l border-gray-200 p-6 space-y-5">
          {doc?.signatario && (
            <div className="bg-brand-tip rounded-brand p-4 text-xs text-brand-slate leading-relaxed">
              <p className="m-0 font-semibold text-brand-navy">
                {doc.signatario.nome}
              </p>
              <p className="m-0">
                {doc.signatario.email} · CPF {doc.signatario.cpf_mascarado}
              </p>
            </div>
          )}

          <div className="bg-brand-tip rounded-brand p-4 text-xs text-brand-slate leading-relaxed">
            Ao confirmar, uma estampa com seu nome, CPF mascarado, data e
            código de verificação é aplicada ao PDF e a assinatura
            criptográfica com carimbo de tempo é processada em fila.
          </div>

          <button
            type="button"
            onClick={confirmar}
            disabled={enviando || !doc}
            className="w-full bg-brand-teal hover:bg-brand-teal-dark disabled:opacity-50 text-white font-bold py-3.5 rounded-brand"
          >
            {enviando ? "Enviando…" : "Confirmar assinatura"}
          </button>
        </aside>
      </div>
    </div>
  );
};

export default AssinarDocumento;
