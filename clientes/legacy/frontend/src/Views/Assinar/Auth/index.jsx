import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import AuthShell from "../../../Components/AuthShell";
import CameraLiveness from "../../../Components/CameraLiveness";
import TermoAceite from "./TermoAceite";
import { assinaturaApi } from "../../../services/assinatura/api";
import { TIPO_TERMO, termoApi } from "../../../services/assinatura/termo";
import {
  ETAPA_SESSAO,
  normalizarEtapa,
  resolverDesvioQualificacao,
  sessaoAssinaturaExpirada,
  sessaoEmAndamento,
} from "../../../services/assinatura/types";
import { STATUS_SIGNATARIO } from "../../../services/panel/types";
import {
  clearAssinarSkipBiometriaOnboarding,
  clearPendingAssinar,
  clearPendingAssinarEmail,
  getAssinarSkipBiometriaOnboarding,
  hasFullSession,
  NEXT_STEP,
  resolveNextRoute,
  setPendingAssinar,
} from "../../../services/identity";
import { clearLocalSession } from "../../../utils";

// Etapas internas desta tela (hub único que resolve todo o fluxo de
// autenticação + biometria da assinatura, retomando via /sessao/progresso).
const FASE = {
  CARREGANDO: "carregando",
  TERMO_DOCUMENTO: "termo_documento",
  OTP: "otp",
  CAMERA: "camera",
  AGUARDANDO_VALIDACAO: "aguardando_validacao",
  NEGADO: "negado",
  SUPORTE: "suporte",
  ERRO: "erro",
};

// Sem timeout no client, um hang de rede/proxy/CSRF deixa o hub eternamente em
// FASE.CARREGANDO — nada nesse ponto olha `loading`, só `fase`.
const TIMEOUT_MS = 15000;
const comTimeout = (promise, msgTimeout) =>
  Promise.race([
    promise,
    new Promise((resolve) =>
      setTimeout(
        () => resolve({ status: false, msg: msgTimeout }),
        TIMEOUT_MS
      )
    ),
  ]);

// Teto de tentativas do poll de FaceMatch: 40 x 2,5s ~= 100s. Sem isso, um
// worker que nunca fecha o job deixa a tela "Validando..." girando pra sempre.
const MAX_TENTATIVAS_POLL_FOTO = 40;

const AssinarAuth = () => {
  const { documentoId } = useParams();
  const navigate = useNavigate();

  const [fase, setFase] = useState(FASE.CARREGANDO);
  const [erro, setErro] = useState("");
  // O mount sempre começa por carregarProgresso — é o retry padrão enquanto
  // nenhuma ação específica (iniciarSessao) ainda tiver falhado.
  const [retryAction, setRetryAction] = useState("progresso"); // "iniciarSessao" | "progresso"
  const [carregandoDemorado, setCarregandoDemorado] = useState(false);
  const [loading, setLoading] = useState(false);
  const [otp, setOtp] = useState("");
  const [termo, setTermo] = useState(null);
  const [termoDocumentoId, setTermoDocumentoId] = useState(null);
  const [uploadInfo, setUploadInfo] = useState(null); // { url, identificacao_id }
  const pollTimerRef = useRef(null);
  // iniciarSessao <-> carregarProgresso se referenciam mutuamente ("sessão em
  // andamento" reconsulta o progresso; "etapa null" no progresso abre sessão
  // nova) — refs evitam o ciclo de dependências entre os dois useCallback.
  const carregarProgressoRef = useRef(() => { });
  // iniciarSessao/confirmarOtp -> aplicarProgresso é a mesma retomada do GET
  // progresso (o backend devolve data.etapa quando a sessão já estava viva).
  const aplicarProgressoRef = useRef(() => { });
  // Trava de concorrência: mount + volta da aba (visibilitychange/pageshow)
  // podem disparar quase juntos — só a chamada externa (entrada) é travada,
  // o handoff interno iniciarSessao <-> carregarProgresso continua livre.
  const retomandoRef = useRef(false);
  // Handoff automático progresso <-> sessão só pode acontecer uma vez por
  // tentativa: sem isso um estado inconsistente no backend (ex.: desafio que
  // expirou bem na hora do retry) faz o hub girar pra sempre entre os dois.
  const autoHandoffFeitoRef = useRef(false);
  // Marca quando a última chamada perdeu a sessão (403) — usado pela volta
  // de aba pra saber se vale reconsultar mesmo com a fase já aberta.
  const sessaoPerdidaRef = useRef(false);

  // Sessão realmente morta no backend (401/403 do All2FA) ou desvio de painel
  // sem next_step (fallback do regex antigo) — o interceptor global não limpa
  // o localStorage para rotas /assinar (tem sessão própria), então sem isso o
  // token "session" fica stale e o Login devolve direto pro hub (loop).
  const irParaPainel = useCallback(
    (msg) => {
      sessaoPerdidaRef.current = true;
      clearLocalSession();
      setPendingAssinar(documentoId);
      if (msg) toast.info(msg);
      navigate("/", { replace: true });
    },
    [documentoId, navigate]
  );

  // Gate de qualificação com next_step conhecido (REDEFINIR_SENHA, SETUP_2FA,
  // CRIAR_PERFIL): a sessão do painel ainda é válida, só falta completar uma
  // etapa específica — vai direto pra ela em vez de voltar pro login.
  const irParaOnboarding = useCallback(
    (nextStep, msg) => {
      setPendingAssinar(documentoId);
      if (msg) toast.info(msg);
      if (!nextStep) return navigate("/", { replace: true });
      navigate(resolveNextRoute(nextStep, localStorage.getItem("permisssion")), {
        replace: true,
      });
    },
    [documentoId, navigate]
  );

  // Única saída de erro do hub: nunca deixa a tela travada num spinner sem
  // ação — toda falha (rede, timeout, mensagem não mapeada) cai aqui.
  const irParaErro = useCallback((msg, action = "iniciarSessao") => {
    setErro(msg || "Ocorreu um erro interno, tente novamente em instantes.");
    setRetryAction(action);
    setFase(FASE.ERRO);
  }, []);

  // Biometria de perfil incompleta (linha sem embedding e sem foto no WIP):
  // não há retry nem onboarding que resolva — só o suporte reenvia a foto de
  // referência. Tela própria em vez do ERRO com "Tentar novamente" inútil.
  const irParaSuporte = useCallback((msg) => {
    setErro(
      msg ||
      "Cadastro biométrico incompleto, contate o suporte para reenviar sua foto de referência."
    );
    setFase(FASE.SUPORTE);
  }, []);

  const irParaOnboardingBiometria = useCallback(
    (msg) => {
      // Onboarding já devolveu pra cá uma vez nesse mount e o backend ainda
      // recusa a biometria — reabrir de novo é o ciclo Auth <-> Onboarding.
      if (getAssinarSkipBiometriaOnboarding()) {
        irParaErro(
          msg ||
          "Cadastro biométrico incompleto, contate o suporte para reenviar sua foto de referência.",
          "progresso"
        );
        return;
      }
      setPendingAssinar(documentoId);
      if (msg) toast.info(msg);
      navigate("/onboarding/biometria", { replace: true });
    },
    [documentoId, navigate, irParaErro]
  );

  const pararPolling = () => {
    if (pollTimerRef.current) {
      clearTimeout(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  };

  // Toda entrada externa de resolução (mount, "Tentar novamente", volta de
  // aba) passa por aqui: trava contra disparo duplicado e dá um orçamento
  // novo de 1 handoff automático pra essa tentativa.
  const withRetomada = useCallback(async (fn) => {
    if (retomandoRef.current) return;
    retomandoRef.current = true;
    autoHandoffFeitoRef.current = false;
    try {
      await fn();
    } finally {
      retomandoRef.current = false;
    }
  }, []);

  const iniciarSessao = useCallback(async () => {
    setLoading(true);
    try {
      const resp = await comTimeout(
        assinaturaApi.criarSessao(documentoId),
        "Tempo de resposta esgotado ao iniciar a sessão de assinatura."
      );
      setLoading(false);
      if (!resp.status) {
        if (resp.sessaoExpirada) return irParaPainel();
        if (sessaoEmAndamento(resp.msg)) {
          // Handoff sessão -> progresso: só uma vez por tentativa, senão um
          // desafio que expira bem nessa hora faz o hub girar pra sempre.
          if (autoHandoffFeitoRef.current) {
            return irParaErro(
              "Não foi possível retomar sua sessão de assinatura.",
              "progresso"
            );
          }
          autoHandoffFeitoRef.current = true;
          return carregarProgressoRef.current();
        }
        const desvio = resolverDesvioQualificacao(resp);
        if (desvio?.tipo === "painel") return irParaOnboarding(desvio.nextStep, resp.msg);
        if (desvio?.tipo === "biometria") return irParaOnboardingBiometria(resp.msg);
        if (desvio?.tipo === "suporte") return irParaSuporte(resp.msg);
        if (desvio?.tipo === "termo") {
          setTermoDocumentoId(desvio.termoId);
          setFase(FASE.TERMO_DOCUMENTO);
          return;
        }
        return irParaErro(resp.msg, "iniciarSessao");
      }
      // Sessão já viva (OTP/foto/validação anteriores): retoma pela etapa em
      // vez de mandar quem já passou do OTP de volta pra tela de OTP.
      if (resp.data?.etapa !== undefined) return aplicarProgressoRef.current(resp.data);
      setFase(FASE.OTP);
    } catch (err) {
      console.log(err);
      setLoading(false);
      irParaErro(
        "Ocorreu um problema ao iniciar sua sessão de assinatura.",
        "iniciarSessao"
      );
    }
  }, [documentoId, irParaPainel, irParaOnboarding, irParaOnboardingBiometria, irParaSuporte, irParaErro]);

  const aplicarProgresso = useCallback(
    (data) => {
      // Chegou aqui com etapa resolvida: biometria/perfil passaram na
      // conferência do backend — libera o marcador pra um eventual desvio
      // futuro genuíno (ex.: biometria revogada no meio da cerimônia).
      clearAssinarSkipBiometriaOnboarding();
      const etapa = normalizarEtapa(data?.etapa);
      if (etapa === ETAPA_SESSAO.VALIDADO) {
        navigate(`/assinar/${documentoId}/documento`, { replace: true });
        return;
      }
      if (etapa === ETAPA_SESSAO.AGUARDANDO_VALIDACAO) {
        setFase(FASE.AGUARDANDO_VALIDACAO);
        return;
      }
      if (etapa === ETAPA_SESSAO.AGUARDANDO_IMAGEM) {
        // Sem URL de upload a câmera abriria inoperante (enviarSelfie é no-op)
        // — o progresso regenera a URL nessa etapa, então a ausência é falha.
        if (!data?.url || !data?.identificacao_id) {
          irParaErro(
            "Não foi possível preparar o envio da foto, tente novamente em instantes.",
            "progresso"
          );
          return;
        }
        setUploadInfo({ url: data.url, identificacao_id: data.identificacao_id });
        setFase(FASE.CAMERA);
        return;
      }
      if (etapa === ETAPA_SESSAO.NEGADO) {
        setFase(FASE.NEGADO);
        return;
      }
      if (etapa === ETAPA_SESSAO.OTP) {
        setFase(FASE.OTP);
        return;
      }
      // etapa null: nenhuma sessão em andamento (ou anterior expirada) — abre
      // uma nova, mas só uma vez por tentativa (handoff progresso -> sessão).
      if (autoHandoffFeitoRef.current) {
        irParaErro(
          "Não foi possível retomar sua sessão de assinatura.",
          "progresso"
        );
        return;
      }
      autoHandoffFeitoRef.current = true;
      iniciarSessao();
    },
    [documentoId, navigate, iniciarSessao, irParaErro]
  );
  aplicarProgressoRef.current = aplicarProgresso;

  // Único ponto que decide para onde o hub vai a partir de um GET progresso —
  // usado no mount (carregarProgresso), no retry da tela CARREGANDO/ERRO e no
  // "Verificar novamente" da tela NEGADO. Evita os três fluxos divergirem.
  const interpretarProgresso = useCallback(
    (resp) => {
      if (!resp.status) {
        if (resp.sessaoExpirada) return irParaPainel();
        const desvio = resolverDesvioQualificacao(resp);
        if (desvio?.tipo === "painel") return irParaOnboarding(desvio.nextStep, resp.msg);
        if (desvio?.tipo === "biometria") return irParaOnboardingBiometria(resp.msg);
        if (desvio?.tipo === "suporte") return irParaSuporte(resp.msg);
        if (desvio?.tipo === "termo") {
          setTermoDocumentoId(desvio.termoId);
          setFase(FASE.TERMO_DOCUMENTO);
          return;
        }
        return irParaErro(resp.msg, "progresso");
      }
      aplicarProgresso(resp.data);
    },
    [irParaPainel, irParaOnboarding, irParaOnboardingBiometria, irParaSuporte, irParaErro, aplicarProgresso]
  );

  const carregarProgresso = useCallback(async () => {
    setLoading(true);
    try {
      const jaAssinado = await assinaturaApi.getStatus(documentoId);
      if (
        jaAssinado.status &&
        jaAssinado.data?.signatario?.status === STATUS_SIGNATARIO.SIGNED
      ) {
        clearPendingAssinar();
        clearPendingAssinarEmail();
        setLoading(false);
        navigate(resolveNextRoute(NEXT_STEP.OK, localStorage.getItem("permisssion")), {
          replace: true,
        });
        return;
      }
      const resp = await comTimeout(
        assinaturaApi.getProgresso(documentoId),
        "Tempo de resposta esgotado ao carregar sua sessão de assinatura."
      );
      setLoading(false);
      interpretarProgresso(resp);
    } catch (err) {
      console.log(err);
      setLoading(false);
      irParaErro(
        "Ocorreu um problema ao carregar sua sessão de assinatura.",
        "progresso"
      );
    }
  }, [documentoId, navigate, interpretarProgresso, irParaErro]);
  carregarProgressoRef.current = carregarProgresso;

  const handleRetry = useCallback(() => {
    setCarregandoDemorado(false);
    if (retryAction === "progresso") return withRetomada(carregarProgresso);
    return withRetomada(iniciarSessao);
  }, [retryAction, carregarProgresso, iniciarSessao, withRetomada]);

  // Botão "Verificar novamente" da tela NEGADO: se o backend ainda devolver a
  // mesma identificação negada, não faz sentido reexibir a mesma tela — força
  // um OTP novo (a API já permite substituir a tentativa negada).
  const verificarAposNegado = useCallback(
    () =>
      withRetomada(async () => {
        setLoading(true);
        try {
          const resp = await comTimeout(
            assinaturaApi.getProgresso(documentoId),
            "Tempo de resposta esgotado ao consultar sua sessão de assinatura."
          );
          setLoading(false);
          if (resp.status && normalizarEtapa(resp.data?.etapa) === ETAPA_SESSAO.NEGADO) {
            return iniciarSessao();
          }
          interpretarProgresso(resp);
        } catch (err) {
          console.log(err);
          setLoading(false);
          irParaErro(
            "Ocorreu um problema ao consultar sua sessão de assinatura.",
            "progresso"
          );
        }
      }),
    [documentoId, interpretarProgresso, iniciarSessao, irParaErro, withRetomada]
  );

  useEffect(() => {
    if (!hasFullSession()) {
      irParaPainel();
      return;
    }
    setPendingAssinar(documentoId);
    // Só mostra o aviso de demora se o mount ainda estiver em CARREGANDO
    // depois de alguns segundos — o comTimeout garante uma saída em 15s.
    const demoradoTimer = setTimeout(() => setCarregandoDemorado(true), 6000);
    withRetomada(carregarProgresso).catch((err) => {
      console.log(err);
      irParaErro(
        "Ocorreu um problema ao carregar sua sessão de assinatura.",
        "progresso"
      );
    });
    return () => {
      pararPolling();
      clearTimeout(demoradoTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Aba ficou em segundo plano/ociosa e voltou: o estado React em memória
  // ainda vale nas fases "abertas" (OTP, câmera, termo, aguardando
  // validação, negado) — só reconsulta o progresso se o hub ainda estiver
  // preso em CARREGANDO ou se a última chamada tiver perdido a sessão. Sem
  // essa trava, todo retorno de aba remonta o ciclo progresso -> desvio.
  useEffect(() => {
    const handleVoltaDeAba = () => {
      if (document.visibilityState !== undefined && document.visibilityState !== "visible") return;
      if (fase !== FASE.CARREGANDO && !sessaoPerdidaRef.current) return;
      sessaoPerdidaRef.current = false;
      withRetomada(carregarProgresso).catch((err) => {
        console.log(err);
        irParaErro(
          "Ocorreu um problema ao carregar sua sessão de assinatura.",
          "progresso"
        );
      });
    };
    document.addEventListener("visibilitychange", handleVoltaDeAba);
    window.addEventListener("pageshow", handleVoltaDeAba);
    return () => {
      document.removeEventListener("visibilitychange", handleVoltaDeAba);
      window.removeEventListener("pageshow", handleVoltaDeAba);
    };
  }, [fase, carregarProgresso, withRetomada, irParaErro]);

  useEffect(() => {
    if (fase !== FASE.TERMO_DOCUMENTO || termo) return;
    let cancelled = false;
    (async () => {
      // Preferir o termo_id exato que a API exige (documento.termo_id) — o
      // termo "atual" do tipo pode ser uma versão mais nova que a vinculada
      // ao documento, o que faria o aceite não bater e travar o hub em loop.
      // Sem fallback silencioso pra outro termo aqui: o backend sempre valida
      // o aceite contra documento.termo_id, então mostrar outro termo ativo
      // do mesmo tipo só engana o usuário (ele aceita um texto que não é o
      // que está de fato sendo registrado, e o aceite falha do mesmo jeito
      // se o termo vinculado estiver inativo).
      const resp = termoDocumentoId
        ? await termoApi.getTermoPorId(termoDocumentoId)
        : await termoApi.getTermoPorTipo(TIPO_TERMO.DOCUMENTO);
      if (cancelled) return;
      if (!resp.status) {
        if (resp.sessaoExpirada) return irParaPainel();
        return irParaErro(
          resp.msg || "O termo de responsabilidade deste documento não está disponível para aceite. Contate o solicitante do documento.",
          "progresso"
        );
      }
      setTermo(resp.data);
    })();
    return () => {
      cancelled = true;
    };
    // `termo` no array de dependências é o que faz o efeito rodar de novo
    // depois de aceitarTermo() zerá-lo (mesmo sem a `fase` mudar de valor).
  }, [fase, termo, termoDocumentoId, irParaPainel, irParaErro]);

  const aceitarTermo = async () => {
    if (!termo) return;
    setLoading(true);
    const resp = await termoApi.aceitar(termo.id, documentoId);
    setLoading(false);
    if (resp.sessaoExpirada) return irParaPainel();
    // "Você já aceitou este termo de responsabilidade." não é erro — o
    // progresso é quem decide a próxima etapa a partir daqui.
    if (!resp.status && !/j[aá] aceitou este termo/i.test(resp.msg || "")) {
      toast.error(resp.msg);
      return;
    }
    if (resp.status) toast.success(resp.msg);
    setTermo(null);
    carregarProgresso();
  };

  const confirmarOtp = async () => {
    if (otp.length !== 6) {
      toast.error("Informe o código de 6 dígitos do autenticador.");
      return;
    }
    setLoading(true);
    const resp = await assinaturaApi.confirmar2FA(otp);
    setLoading(false);
    if (!resp.status) {
      if (resp.sessaoExpirada) return irParaPainel();
      // Qualificação pode ter mudado entre abrir a sessão e confirmar o OTP
      // (ex.: biometria ficou incompleta) — desvia em vez de só toast.error.
      const desvio = resolverDesvioQualificacao(resp);
      if (desvio?.tipo === "painel") return irParaOnboarding(desvio.nextStep, resp.msg);
      if (desvio?.tipo === "biometria") return irParaOnboardingBiometria(resp.msg);
      if (desvio?.tipo === "suporte") return irParaSuporte(resp.msg);
      if (desvio?.tipo === "termo") {
        setTermoDocumentoId(desvio.termoId);
        setFase(FASE.TERMO_DOCUMENTO);
        return;
      }
      toast.error(resp.msg);
      return;
    }
    setOtp("");
    // Desafio já usado (retomada): resposta vem com etapa/id, sem url — mesmo
    // contrato do progresso. Com url é o fluxo normal, abre a câmera direto.
    if (resp.data?.etapa !== undefined && !resp.data?.url) {
      return aplicarProgressoRef.current({ ...resp.data, identificacao_id: resp.data.id });
    }
    setUploadInfo({ url: resp.data?.url, identificacao_id: resp.data?.id });
    setFase(FASE.CAMERA);
  };

  const enviarSelfie = async (blob) => {
    if (!uploadInfo?.url || !uploadInfo?.identificacao_id) return;
    setLoading(true);
    const up = await assinaturaApi.uploadSelfie(uploadInfo.url, blob);
    if (!up.status) {
      setLoading(false);
      toast.error(up.msg);
      return;
    }
    const confirm = await assinaturaApi.confirmarFoto(uploadInfo.identificacao_id);
    setLoading(false);
    if (!confirm.status) {
      if (confirm.sessaoExpirada) return irParaPainel();
      // Janela da identificação expirou (não a sessão do usuário) — a próxima
      // consulta de progresso decide se abre um desafio novo.
      if (sessaoAssinaturaExpirada(confirm.msg)) {
        toast.error(confirm.msg);
        carregarProgresso();
        return;
      }
      // Qualificação pode ter mudado entre abrir a câmera e confirmar a foto
      // (ex.: biometria ficou incompleta) — desvia em vez de só toast.error.
      const desvio = resolverDesvioQualificacao(confirm);
      if (desvio?.tipo === "painel") return irParaOnboarding(desvio.nextStep, confirm.msg);
      if (desvio?.tipo === "biometria") return irParaOnboardingBiometria(confirm.msg);
      if (desvio?.tipo === "suporte") return irParaSuporte(confirm.msg);
      if (desvio?.tipo === "termo") {
        setTermoDocumentoId(desvio.termoId);
        setFase(FASE.TERMO_DOCUMENTO);
        return;
      }
      toast.error(confirm.msg);
      return;
    }
    toast.success("Foto enviada. Aguarde a validação do reconhecimento facial.");
    setFase(FASE.AGUARDANDO_VALIDACAO);
  };

  useEffect(() => {
    if (fase !== FASE.AGUARDANDO_VALIDACAO) return;
    let cancelled = false;
    let tentativas = 0;
    const tick = async () => {
      let resp;
      try {
        resp = await assinaturaApi.getStatusFoto(documentoId);
      } catch (err) {
        console.log(err);
        resp = { status: false, msg: "Erro ao consultar o status da biometria." };
      }
      if (cancelled) return;
      if (!resp.status) {
        if (resp.sessaoExpirada) return irParaPainel();
        tentativas += 1;
        if (tentativas >= MAX_TENTATIVAS_POLL_FOTO) {
          return irParaErro(
            "A validação do reconhecimento facial está demorando mais que o esperado.",
            "progresso"
          );
        }
        pollTimerRef.current = setTimeout(tick, 3000);
        return;
      }
      if (!resp.data?.processado) {
        tentativas += 1;
        if (tentativas >= MAX_TENTATIVAS_POLL_FOTO) {
          return irParaErro(
            "A validação do reconhecimento facial está demorando mais que o esperado.",
            "progresso"
          );
        }
        pollTimerRef.current = setTimeout(tick, 2500);
        return;
      }
      const statusFoto = normalizarEtapa(resp.data.status);
      if (statusFoto === ETAPA_SESSAO.VALIDADO) {
        navigate(`/assinar/${documentoId}/documento`, { replace: true });
        return;
      }
      if (statusFoto === ETAPA_SESSAO.NEGADO) {
        setFase(FASE.NEGADO);
        return;
      }
      irParaErro(
        "Não foi possível confirmar o resultado do reconhecimento facial.",
        "progresso"
      );
    };
    tick();
    return () => {
      cancelled = true;
      pararPolling();
    };
  }, [fase, documentoId, navigate, irParaPainel, irParaErro]);

  if (fase === FASE.CARREGANDO) {
    return (
      <AuthShell title="Carregando" subtitle="Verificando o progresso da assinatura…">
        <div className="flex flex-col items-center gap-4 py-6">
          <div className="w-8 h-8 border-2 border-brand-teal/30 border-t-brand-teal rounded-full animate-spin" />
          {carregandoDemorado && (
            <div className="text-center">
              <p className="text-sm text-gray-500 mb-2">
                Isso está demorando mais que o esperado.
              </p>
              <button
                type="button"
                onClick={handleRetry}
                disabled={loading}
                className="text-sm font-semibold text-brand-teal hover:underline disabled:opacity-50"
              >
                Tentar novamente
              </button>
            </div>
          )}
        </div>
      </AuthShell>
    );
  }

  if (fase === FASE.ERRO) {
    return (
      <AuthShell title="Não foi possível continuar" subtitle="Ocorreu um problema ao carregar sua sessão de assinatura.">
        <p className="text-sm text-rose-600 mb-4">{erro}</p>
        <button
          type="button"
          onClick={handleRetry}
          disabled={loading}
          className="w-full bg-brand-teal hover:bg-brand-teal-dark disabled:opacity-50 text-white font-bold py-3.5 rounded-brand"
        >
          {loading ? "Tentando…" : "Tentar novamente"}
        </button>
      </AuthShell>
    );
  }

  if (fase === FASE.SUPORTE) {
    return (
      <AuthShell
        title="Cadastro biométrico incompleto"
        subtitle="Seu perfil biométrico precisa ser regularizado antes de assinar."
        tip="O suporte pode reabrir o envio da sua foto de referência."
      >
        <p className="text-sm text-brand-ink mb-4">{erro}</p>
        <button
          type="button"
          onClick={() => navigate("/contratos", { replace: true })}
          className="w-full bg-brand-teal hover:bg-brand-teal-dark text-white font-bold py-3.5 rounded-brand"
        >
          Ir para meus contratos
        </button>
      </AuthShell>
    );
  }

  if (fase === FASE.TERMO_DOCUMENTO) {
    return (
      <AuthShell
        title="Termo de responsabilidade"
        subtitle="Antes de continuar, leia e aceite o termo abaixo."
        tip="O aceite fica registrado com data, hora e IP na trilha de auditoria do documento."
      >
        <TermoAceite termo={termo} loading={loading} onAceitar={aceitarTermo} />
      </AuthShell>
    );
  }

  if (fase === FASE.OTP) {
    return (
      <AuthShell
        title="Confirme sua identidade"
        subtitle="Informe o código do seu aplicativo autenticador para iniciar a assinatura."
        tip="Esta sessão é exclusiva para o documento do convite."
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-brand-ink mb-1.5">
              Código do autenticador
            </label>
            <input
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
              onKeyDown={(e) => e.key === "Enter" && confirmarOtp()}
              maxLength={6}
              className="w-full rounded-brand border border-gray-200 px-3 py-3 text-center text-xl tracking-[0.4em] outline-none focus:ring-2 focus:ring-brand-teal"
              placeholder="••••••"
            />
          </div>
          <button
            type="button"
            onClick={confirmarOtp}
            disabled={loading}
            className="w-full bg-brand-teal hover:bg-brand-teal-dark disabled:opacity-50 text-white font-bold py-3.5 rounded-brand"
          >
            {loading ? "Confirmando…" : "Continuar"}
          </button>
        </div>
      </AuthShell>
    );
  }

  if (fase === FASE.CAMERA) {
    return (
      <AuthShell
        title="Reconhecimento facial"
        subtitle="Posicione seu rosto no centro e aguarde a contagem para capturar a foto."
        tip="A foto é comparada com o seu perfil biométrico já cadastrado."
      >
        <CameraLiveness
          key={uploadInfo?.identificacao_id || "camera"}
          onCapture={enviarSelfie}
          disabled={loading}
        />
      </AuthShell>
    );
  }

  if (fase === FASE.AGUARDANDO_VALIDACAO) {
    return (
      <AuthShell
        title="Validando reconhecimento facial"
        subtitle="Aguarde enquanto comparamos a foto com o seu perfil biométrico."
      >
        <div className="flex justify-center py-6">
          <div className="w-10 h-10 border-2 border-brand-teal/30 border-t-brand-teal rounded-full animate-spin" />
        </div>
      </AuthShell>
    );
  }

  if (fase === FASE.NEGADO) {
    return (
      <AuthShell
        title="Reconhecimento facial não validado"
        subtitle="A foto enviada não pôde ser confirmada como sendo sua."
        tip="Por segurança, aguarde alguns minutos antes de tentar novamente."
      >
        <button
          type="button"
          onClick={verificarAposNegado}
          disabled={loading}
          className="w-full bg-brand-teal hover:bg-brand-teal-dark disabled:opacity-50 text-white font-bold py-3.5 rounded-brand"
        >
          {loading ? "Verificando…" : "Verificar novamente"}
        </button>
      </AuthShell>
    );
  }

  return null;
};

export default AssinarAuth;
