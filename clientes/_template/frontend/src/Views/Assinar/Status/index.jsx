import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import AuthShell from "../../../Components/AuthShell";
import { CheckCircleIcon, XCircleIcon } from "@heroicons/react/24/outline";
import { toast } from "react-toastify";
import { assinaturaApi } from "../../../services/assinatura/api";
import { STATUS_SIGNATARIO } from "../../../services/panel/types";
import {
  hasFullSession,
  setPendingAssinar,
  clearPendingAssinar,
  clearPendingAssinarEmail,
  resolveNextRoute,
  NEXT_STEP,
} from "../../../services/identity";
import { clearLocalSession } from "../../../utils";

const AssinarStatus = () => {
  const { documentoId } = useParams();
  const navigate = useNavigate();
  const [statusSignatario, setStatusSignatario] = useState(STATUS_SIGNATARIO.PROCESSING);
  const [erro, setErro] = useState("");
  const timerRef = useRef(null);

  useEffect(() => {
    if (!hasFullSession()) {
      setPendingAssinar(documentoId);
      navigate("/", { replace: true });
      return;
    }
    let cancelled = false;
    const tick = async () => {
      let resp = await assinaturaApi.getStatus(documentoId);
      if (cancelled) return;
      if (!resp.status) {
        if (resp.sessaoExpirada) {
          // Token do painel fica stale nas rotas /assinar (interceptor não
          // limpa) — sem limpar aqui, o /auth acha que ainda há sessão e loopa.
          clearLocalSession();
          setPendingAssinar(documentoId);
          toast.info("Sessão expirada. Autentique-se novamente.");
          navigate("/", { replace: true });
          return;
        }
        // Uma retentativa via progresso antes de desistir — cobre sessão da
        // cerimônia que se perdeu no meio do polling (refresh, novo login).
        await assinaturaApi.getProgresso(documentoId);
        resp = await assinaturaApi.getStatus(documentoId);
        if (cancelled) return;
        if (!resp.status) {
          setErro(resp.msg);
          return;
        }
      }
      setErro("");
      const st = resp.data?.signatario?.status;
      setStatusSignatario(st);
      if (st === STATUS_SIGNATARIO.SIGNED) {
        // Sem isso o login (e o "Ir para o painel" em /) lê o pending e
        // devolve pra /assinar/:id/auth — loop na tela de concluída.
        clearPendingAssinar();
        clearPendingAssinarEmail();
        return;
      }
      if (st === STATUS_SIGNATARIO.ERROR) return;
      timerRef.current = setTimeout(tick, 3000);
    };
    tick();
    return () => {
      cancelled = true;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [documentoId, navigate]);

  const done = statusSignatario === STATUS_SIGNATARIO.SIGNED;
  const falhou = statusSignatario === STATUS_SIGNATARIO.ERROR;

  const irParaPainel = () => {
    clearPendingAssinar();
    clearPendingAssinarEmail();
    navigate(resolveNextRoute(NEXT_STEP.OK, localStorage.getItem("permisssion")), {
      replace: true,
    });
  };

  return (
    <AuthShell
      title={
        done
          ? "Assinatura concluída"
          : falhou
            ? "Falha na assinatura"
            : "Processando assinatura"
      }
      subtitle={
        done
          ? "Sua assinatura foi registrada. O PDF completo será enviado por e-mail quando todos os signatários assinarem."
          : falhou
            ? "O processamento encontrou um erro. Tente assinar novamente."
            : "A fila está aplicando a estampa e a assinatura criptográfica."
      }
      tip="Todas as etapas ficam registradas na trilha de auditoria do documento."
    >
      <div className="text-center py-2">
        {done ? (
          <CheckCircleIcon className="w-14 h-14 text-brand-teal mx-auto mb-4" />
        ) : falhou ? (
          <XCircleIcon className="w-14 h-14 text-rose-500 mx-auto mb-4" />
        ) : (
          <div className="w-10 h-10 border-2 border-brand-teal/30 border-t-brand-teal rounded-full animate-spin mx-auto mb-4" />
        )}
        <p className="text-sm font-semibold text-brand-navy mb-6">
          {erro ||
            (done
              ? "Assinatura registrada com sucesso"
              : falhou
                ? "Erro no processamento"
                : "Aguardando o worker de assinatura…")}
        </p>
        {done && (
          <div className="space-y-3">
            <button
              type="button"
              onClick={irParaPainel}
              className="w-full bg-brand-teal hover:bg-brand-teal-dark text-white font-bold py-3.5 rounded-brand"
            >
              Ir para o painel
            </button>
          </div>
        )}
        {falhou && (
          <Link
            to={`/assinar/${documentoId}/auth`}
            className="block text-sm font-semibold text-brand-teal hover:underline"
          >
            Tentar novamente
          </Link>
        )}
      </div>
    </AuthShell>
  );
};

export default AssinarStatus;
