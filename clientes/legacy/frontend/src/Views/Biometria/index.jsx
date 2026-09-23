import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import moment from "moment";
import Header from "../../Components/Header";
import CameraLiveness from "../../Components/CameraLiveness";
import { FingerPrintIcon } from "@heroicons/react/24/outline";
import { biometriaApi } from "../../services/biometria/api";
import { TIPO_TERMO, termoApi } from "../../services/assinatura/termo";

// Status (pendente/aprovado) usa GET /perfil-biometria/me. Sem biometria ativa
// só busca o termo. A solicitação (código) só roda no botão Iniciar validação.
const FASE = {
  CARREGANDO: "carregando",
  STATUS: "status",
  TERMO: "termo",
  CAMERA: "camera",
  OTP: "otp",
  ERRO: "erro",
};

const Biometria = () => {
  const [fase, setFase] = useState(FASE.CARREGANDO);
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(false);
  const [minhaBiometria, setMinhaBiometria] = useState(null);
  const [termo, setTermo] = useState(null);
  const [uploadUrl, setUploadUrl] = useState(null);
  const [token, setToken] = useState("");

  const carregarStatus = async () => {
    setFase(FASE.CARREGANDO);
    const resp = await biometriaApi.getMinhaBiometria();
    if (!resp.status) {
      setErro(resp.msg || "Erro ao carregar o status da biometria.");
      setFase(FASE.ERRO);
      return;
    }
    if (resp.exit) {
      setMinhaBiometria(resp.data);
      setFase(FASE.STATUS);
      return;
    }
    await carregarTermo();
  };

  const carregarTermo = async () => {
    const resp = await termoApi.getTermoPorTipo(TIPO_TERMO.FOTO_PERFIL);
    if (!resp.status) {
      setTermo(null);
      setErro(resp.msg);
      setFase(FASE.TERMO);
      return;
    }
    setErro("");
    setTermo(resp.data);
    setFase(FASE.TERMO);
  };

  useEffect(() => {
    carregarStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const aceitarTermo = async () => {
    if (!termo) return;
    setLoading(true);
    const aceite = await termoApi.aceitar(termo.id);
    if (!aceite.status && !/j[aá] aceitou este termo/i.test(aceite.msg || "")) {
      setLoading(false);
      toast.error(aceite.msg);
      return;
    }
    const solicitacao = await biometriaApi.solicitarUploadFoto();
    setLoading(false);
    if (!solicitacao.status) {
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
    setToken("");
    await carregarStatus();
  };

  return (
    <div>
      <Header
        title="Biometria"
        description="Cadastro e status do seu perfil biométrico"
        icon={FingerPrintIcon}
      />

      <div className="p-6 max-w-2xl space-y-6">
        {fase === FASE.CARREGANDO && (
          <div className="flex justify-center py-10">
            <div className="w-8 h-8 border-2 border-brand-teal/30 border-t-brand-teal rounded-full animate-spin" />
          </div>
        )}

        {fase === FASE.ERRO && (
          <div className="bg-white border border-gray-100 rounded-brand p-6 shadow-sm space-y-3">
            <p className="text-sm text-rose-600 m-0">{erro}</p>
            <Link to="/perfil" className="text-sm font-semibold text-brand-teal hover:underline">
              Ir para o perfil
            </Link>
          </div>
        )}

        {fase === FASE.STATUS && minhaBiometria && (
          <div className="bg-white border border-gray-100 rounded-brand p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-3">
              <span
                className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${minhaBiometria.aprovado
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-amber-100 text-amber-700"
                  }`}
              >
                {minhaBiometria.aprovado ? "Aprovado" : "Pendente"}
              </span>
            </div>
            <dl className="text-sm text-brand-slate space-y-1 m-0">
              <div className="flex justify-between">
                <dt className="text-brand-soft">Cadastrado em</dt>
                <dd className="font-semibold text-brand-ink m-0">
                  {minhaBiometria.data_criacao
                    ? moment(minhaBiometria.data_criacao).format("DD/MM/YYYY HH:mm")
                    : "-"}
                </dd>
              </div>
              {minhaBiometria.aprovado && (
                <div className="flex justify-between">
                  <dt className="text-brand-soft">Aprovado em</dt>
                  <dd className="font-semibold text-brand-ink m-0">
                    {minhaBiometria.aprovado_em
                      ? moment(minhaBiometria.aprovado_em).format("DD/MM/YYYY HH:mm")
                      : "-"}
                  </dd>
                </div>
              )}
            </dl>
            {!minhaBiometria.aprovado && (
              <p className="text-xs text-brand-slate bg-brand-tip rounded-brand p-3 m-0">
                Sua foto está aguardando a validação de um administrador.
              </p>
            )}
          </div>
        )}

        {fase === FASE.TERMO && (
          <div className="bg-white border border-gray-100 rounded-brand p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-brand-soft m-0">
              Termo de consentimento de imagem
            </h3>
            {termo ? (
              <div>
                <p className="text-sm font-bold text-brand-navy mb-2">{termo.titulo_termo}</p>
                <div className="max-h-56 overflow-y-auto bg-brand-tip rounded-brand p-4 text-xs text-brand-slate leading-relaxed whitespace-pre-wrap">
                  {termo.descricao_termo}
                </div>
              </div>
            ) : (
              <p className="text-sm text-rose-600 m-0">{erro}</p>
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
        )}

        {fase === FASE.CAMERA && (
          <div className="bg-white border border-gray-100 rounded-brand p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-brand-soft m-0">
              Capture sua foto de referência
            </h3>
            <p className="text-xs text-brand-soft m-0">
              Posicione seu rosto no centro e aguarde a contagem para capturar.
            </p>
            <CameraLiveness onCapture={enviarFoto} disabled={loading} />
          </div>
        )}

        {fase === FASE.OTP && (
          <div className="bg-white border border-gray-100 rounded-brand p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-brand-soft m-0">
              Confirme o cadastro
            </h3>
            <p className="text-xs text-brand-soft m-0">
              Informe o código do seu aplicativo autenticador para concluir o envio da foto.
            </p>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={token}
              onChange={(e) => setToken(e.target.value.replace(/\D/g, "").slice(0, 6))}
              onKeyDown={(e) => e.key === "Enter" && confirmarCadastro()}
              placeholder="••••••"
              className="w-full rounded-brand border border-gray-200 px-3 py-2.5 text-center text-lg tracking-[0.3em] outline-none focus:ring-2 focus:ring-brand-teal"
            />
            <button
              type="button"
              onClick={confirmarCadastro}
              disabled={loading}
              className="w-full bg-brand-teal hover:bg-brand-teal-dark disabled:opacity-50 text-white font-bold py-3.5 rounded-brand"
            >
              {loading ? "Confirmando…" : "Concluir cadastro"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Biometria;
