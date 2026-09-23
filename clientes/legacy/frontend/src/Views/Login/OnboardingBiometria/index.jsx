import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import AuthShell from "../../../Components/AuthShell";
import CameraLiveness from "../../../Components/CameraLiveness";
import { biometriaApi } from "../../../services/biometria/api";
import { TIPO_TERMO, termoApi } from "../../../services/assinatura/termo";
import {
  fotoPerfilAguardandoAprovacao,
  fotoPerfilJaCadastrada,
  perfilNaoCadastrado,
} from "../../../services/assinatura/types";
import {
  getPendingAssinar,
  hasFullSession,
  setAssinarSkipBiometriaOnboarding,
} from "../../../services/identity";

// Aceite do termo de foto -> captura via CameraLiveness -> PUT da foto -> confirmar com OTP ->
// tela de "aguardando aprovação". A aprovação (geração do embedding facial) é feita por um
// administrador em outro fluxo; aqui só registramos a foto como pendente.
const FASE = {
  CARREGANDO: "carregando",
  TERMO: "termo",
  CAMERA: "camera",
  OTP: "otp",
  AGUARDANDO_APROVACAO: "aguardando_aprovacao",
  ERRO: "erro",
};

const OnboardingBiometria = () => {
  const navigate = useNavigate();
  const [fase, setFase] = useState(FASE.CARREGANDO);
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(false);
  const [termo, setTermo] = useState(null);
  const [uploadUrl, setUploadUrl] = useState(null);
  const [token, setToken] = useState("");

  useEffect(() => {
    if (!hasFullSession()) {
      navigate("/", { replace: true });
      return;
    }
    (async () => {
      const resp = await biometriaApi.getMinhaBiometria();
      if (!resp.status) {
        if (perfilNaoCadastrado(resp.msg) || /complete seu cadastro de perfil/i.test(resp.msg || "")) {
          navigate("/onboarding/perfil", { replace: true });
          return;
        }
        setErro(resp.msg);
        setFase(FASE.ERRO);
        return;
      }
      if (resp.exit && resp.data?.aprovado) {
        const pendingAssinarId = getPendingAssinar();
        if (pendingAssinarId) {
          setAssinarSkipBiometriaOnboarding();
          navigate(`/assinar/${pendingAssinarId}/auth`, { replace: true });
          return;
        }
        navigate("/contratos", { replace: true });
        return;
      }
      if (resp.exit) {
        setFase(FASE.AGUARDANDO_APROVACAO);
        return;
      }
      const termoResp = await termoApi.getTermoPorTipo(TIPO_TERMO.FOTO_PERFIL);
      if (!termoResp.status) {
        setTermo(null);
        setErro(termoResp.msg);
        setFase(FASE.TERMO);
        return;
      }
      setErro("");
      setTermo(termoResp.data);
      setFase(FASE.TERMO);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const aceitarTermo = async () => {
    if (!termo) return;
    setLoading(true);
    const aceite = await termoApi.aceitar(termo.id);
    // "Você já aceitou este termo de responsabilidade." não é erro aqui — só
    // significa que o aceite foi registrado numa tentativa anterior.
    if (!aceite.status && !/j[aá] aceitou este termo/i.test(aceite.msg || "")) {
      setLoading(false);
      toast.error(aceite.msg);
      return;
    }
    const solicitacao = await biometriaApi.solicitarUploadFoto();
    setLoading(false);
    if (!solicitacao.status) {
      if (fotoPerfilAguardandoAprovacao(solicitacao.msg)) {
        setFase(FASE.AGUARDANDO_APROVACAO);
        return;
      }
      if (fotoPerfilJaCadastrada(solicitacao.msg)) {
        const pendingAssinarId = getPendingAssinar();
        if (pendingAssinarId) {
          setAssinarSkipBiometriaOnboarding();
          navigate(`/assinar/${pendingAssinarId}/auth`, { replace: true });
          return;
        }
        navigate("/contratos", { replace: true });
        return;
      }
      setErro(solicitacao.msg);
      setFase(FASE.ERRO);
      return;
    }
    setUploadUrl(solicitacao.url);
    setFase(FASE.CAMERA);
  };

  const enviarFoto = async (blob) => {
    setLoading(true);
    const up = await biometriaApi.uploadFoto(uploadUrl, blob);
    setLoading(false);
    if (!up.status) {
      toast.error(up.msg);
      return;
    }
    toast.success("Foto enviada. Confirme com o código do autenticador.");
    setFase(FASE.OTP);
  };

  const confirmarCadastro = async () => {
    if (token.length !== 6) {
      toast.error("Informe o código de 6 dígitos do autenticador.");
      return;
    }
    setLoading(true);
    const resp = await biometriaApi.confirmarCadastro(token);
    setLoading(false);
    if (!resp.status) {
      toast.error(resp.msg);
      return;
    }
    toast.success(resp.msg);
    setFase(FASE.AGUARDANDO_APROVACAO);
  };

  if (fase === FASE.CARREGANDO) {
    return (
      <AuthShell title="Carregando" subtitle="Preparando o cadastro biométrico…">
        <div className="flex justify-center py-6">
          <div className="w-8 h-8 border-2 border-brand-teal/30 border-t-brand-teal rounded-full animate-spin" />
        </div>
      </AuthShell>
    );
  }

  if (fase === FASE.ERRO) {
    return (
      <AuthShell title="Não foi possível continuar" subtitle="Ocorreu um problema ao preparar o cadastro biométrico.">
        <p className="text-sm text-rose-600 mb-4">{erro}</p>
        <Link to="/contratos" className="text-sm font-semibold text-brand-teal hover:underline">
          Voltar aos meus contratos
        </Link>
      </AuthShell>
    );
  }

  if (fase === FASE.TERMO) {
    return (
      <AuthShell
        title="Cadastro do perfil biométrico"
        subtitle="Antes de capturar sua foto, leia e aceite o termo de consentimento de imagem."
        tip="Sua foto é usada apenas para confirmar sua identidade durante as assinaturas."
      >
        <div className="space-y-4">
          {termo ? (
            <div>
              <p className="text-sm font-bold text-brand-navy mb-2">
                {termo.titulo_termo}
              </p>
              <div className="max-h-56 overflow-y-auto bg-brand-tip rounded-brand p-4 text-xs text-brand-slate leading-relaxed whitespace-pre-wrap">
                {termo.descricao_termo}
              </div>
            </div>
          ) : (
            <p className="text-sm text-rose-600">{erro}</p>
          )}
          <button
            type="button"
            onClick={aceitarTermo}
            disabled={loading || !termo}
            className="w-full bg-brand-teal hover:bg-brand-teal-dark disabled:opacity-50 text-white font-bold py-3.5 rounded-brand"
          >
            {loading ? "Confirmando…" : "Iniciar validação"}
          </button>
        </div>
      </AuthShell>
    );
  }

  if (fase === FASE.CAMERA) {
    return (
      <AuthShell
        title="Capture sua foto de referência"
        subtitle="Posicione seu rosto no centro e aguarde a contagem para capturar."
        tip="Essa foto será o seu perfil biométrico de referência para futuras assinaturas."
      >
        <CameraLiveness onCapture={enviarFoto} disabled={loading} />
      </AuthShell>
    );
  }

  if (fase === FASE.OTP) {
    return (
      <AuthShell
        title="Confirme o cadastro"
        subtitle="Informe o código do seu aplicativo autenticador para concluir o envio da foto."
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-brand-ink mb-1.5">
              Código do autenticador
            </label>
            <input
              value={token}
              onChange={(e) => setToken(e.target.value.replace(/\D/g, "").slice(0, 6))}
              onKeyDown={(e) => e.key === "Enter" && confirmarCadastro()}
              maxLength={6}
              className="w-full rounded-brand border border-gray-200 px-3 py-3 text-center text-xl tracking-[0.4em] outline-none focus:ring-2 focus:ring-brand-teal"
              placeholder="••••••"
            />
          </div>
          <button
            type="button"
            onClick={confirmarCadastro}
            disabled={loading}
            className="w-full bg-brand-teal hover:bg-brand-teal-dark disabled:opacity-50 text-white font-bold py-3.5 rounded-brand"
          >
            {loading ? "Confirmando…" : "Concluir cadastro"}
          </button>
        </div>
      </AuthShell>
    );
  }

  const pendingAssinarId = getPendingAssinar();

  return (
    <AuthShell
      title="Cadastro enviado"
      subtitle="Sua foto foi registrada e está aguardando a validação de um administrador."
      tip="Você será avisado pela tela de Alertas assim que o perfil for aprovado ou rejeitado."
    >
      <div className="space-y-3">
        {pendingAssinarId && (
          <Link
            to={`/assinar/${pendingAssinarId}/auth`}
            // Sem o skip, o hub recusa a biometria pendente e reabre este
            // onboarding — loop Auth <-> Biometria até a aprovação do admin.
            onClick={() => setAssinarSkipBiometriaOnboarding()}
            className="block w-full text-center bg-brand-teal hover:bg-brand-teal-dark text-white font-bold py-3.5 rounded-brand"
          >
            Voltar à assinatura
          </Link>
        )}
        <Link
          to="/alertas"
          className={
            pendingAssinarId
              ? "block text-sm font-semibold text-brand-teal hover:underline text-center"
              : "block w-full text-center bg-brand-teal hover:bg-brand-teal-dark text-white font-bold py-3.5 rounded-brand"
          }
        >
          Acompanhar pelos alertas
        </Link>
        <Link
          to="/contratos"
          className="block text-sm font-semibold text-brand-teal hover:underline text-center"
        >
          Ir para meus contratos
        </Link>
      </div>
    </AuthShell>
  );
};

export default OnboardingBiometria;
