import { useCallback, useEffect, useRef, useState } from "react";
import { CameraIcon, ExclamationTriangleIcon } from "@heroicons/react/24/outline";

// O gateway do FaceMatch (api/infrastructure/gateways/FaceMatch) e o validarImagem do bucket
// (api/infrastructure/gateways/Bucket/Controller/WipController.js) não impõem limite de
// dimensão/tamanho — só checam a assinatura JPEG/PNG/WebP do arquivo. Os limites abaixo são
// uma escolha própria do client para manter o upload leve e rápido em qualquer rede.
const MAX_SIDE = 640;
const MAX_BYTES = 4 * 1024 * 1024;
const JPEG_QUALITIES = [0.92, 0.85, 0.75, 0.65, 0.55, 0.45, 0.35];

// Vivacidade client-side: só libera o botão de captura depois de alguns segundos com o vídeo
// realmente tocando (readyState + !paused). Isso obriga o usuário a estar diante da câmera em
// tempo real por uma contagem regressiva, dificultando o uso de uma foto estática pré-gravada
// segurada na frente da câmera (que não teria como "esperar" a contagem de forma natural nem
// manter o vídeo com frames variando). Não é liveness biométrico (piscar/virar rosto), é uma
// barreira simples e sem libs novas, como pedido.
const COUNTDOWN_SECONDS = 3;

const erroCameraMsg = (err) => {
  const nome = err?.name || "";
  if (nome === "NotAllowedError" || nome === "PermissionDeniedError") {
    return "Permissão da câmera negada. Habilite o acesso à câmera no navegador e tente novamente.";
  }
  if (nome === "NotFoundError" || nome === "DevicesNotFoundError") {
    return "Nenhuma câmera foi encontrada neste dispositivo.";
  }
  if (nome === "NotReadableError" || nome === "TrackStartError") {
    return "Não foi possível acessar a câmera. Ela pode estar em uso por outro aplicativo.";
  }
  if (nome === "OverconstrainedError") {
    return "A câmera do dispositivo não atende aos requisitos mínimos.";
  }
  if (nome === "SecurityError") {
    return "Acesso à câmera bloqueado neste contexto (é necessário HTTPS ou localhost).";
  }
  return "Não foi possível iniciar a câmera. Tente novamente.";
};

const canvasToBlob = (canvas, quality) =>
  new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));

const capturarFrameComprimido = async (video, canvas) => {
  const vw = video.videoWidth || 640;
  const vh = video.videoHeight || 640;
  const maiorLado = Math.max(vw, vh);
  const escala = maiorLado > MAX_SIDE ? MAX_SIDE / maiorLado : 1;
  canvas.width = Math.round(vw * escala);
  canvas.height = Math.round(vh * escala);
  const ctx = canvas.getContext("2d");
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  let ultimoBlob = null;
  for (const qualidade of JPEG_QUALITIES) {
    const blob = await canvasToBlob(canvas, qualidade);
    if (!blob) continue;
    ultimoBlob = blob;
    if (blob.size <= MAX_BYTES) return blob;
  }
  return ultimoBlob;
};

const CameraLiveness = ({ onCapture, disabled = false, instrucao }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const countdownTimerRef = useRef(null);
  const previewUrlRef = useRef(null);

  const [status, setStatus] = useState("requesting"); // requesting | streaming | error
  const [erro, setErro] = useState("");
  const [contagem, setContagem] = useState(COUNTDOWN_SECONDS);
  const [prontoParaCapturar, setProntoParaCapturar] = useState(false);
  const [preview, setPreview] = useState(null); // { url, blob }
  const [capturando, setCapturando] = useState(false);

  const pararStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
  }, []);

  const revogarPreview = useCallback(() => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
  }, []);

  const iniciarContagem = useCallback(() => {
    setContagem(COUNTDOWN_SECONDS);
    setProntoParaCapturar(false);
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    countdownTimerRef.current = setInterval(() => {
      setContagem((atual) => {
        if (atual <= 1) {
          clearInterval(countdownTimerRef.current);
          countdownTimerRef.current = null;
          setProntoParaCapturar(true);
          return 0;
        }
        return atual - 1;
      });
    }, 1000);
  }, []);

  const iniciarCamera = useCallback(async () => {
    // "Tentar novamente" reusa o mesmo componente (não remonta): sem isso, o
    // getUserMedia é chamado com o stream anterior ainda ativo e alguns
    // navegadores devolvem NotReadableError ("câmera em uso").
    pararStream();
    setStatus("requesting");
    setErro("");
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        setErro(
          "Este navegador não suporta acesso à câmera (getUserMedia indisponível)."
        );
        setStatus("error");
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 640 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      setStatus("streaming");
      iniciarContagem();
    } catch (err) {
      setErro(erroCameraMsg(err));
      setStatus("error");
    }
  }, [iniciarContagem, pararStream]);

  useEffect(() => {
    iniciarCamera();
    return () => {
      pararStream();
      revogarPreview();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const capturar = async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    if (video.readyState < 2 || video.paused) {
      setErro("A câmera não está ativa. Tente novamente.");
      return;
    }
    setCapturando(true);
    try {
      const blob = await capturarFrameComprimido(video, canvas);
      if (!blob) {
        setErro("Não foi possível capturar a foto. Tente novamente.");
        return;
      }
      revogarPreview();
      const url = URL.createObjectURL(blob);
      previewUrlRef.current = url;
      setPreview({ url, blob });
    } finally {
      setCapturando(false);
    }
  };

  const tirarNovamente = () => {
    revogarPreview();
    setPreview(null);
    iniciarContagem();
  };

  const usarFoto = () => {
    if (!preview?.blob) return;
    onCapture?.(preview.blob);
  };

  if (status === "error") {
    return (
      <div className="rounded-brand border border-rose-200 bg-rose-50 p-5 text-center">
        <ExclamationTriangleIcon className="w-10 h-10 text-rose-500 mx-auto mb-3" />
        <p className="text-sm text-rose-800 font-semibold mb-1">
          Não foi possível acessar a câmera
        </p>
        <p className="text-xs text-rose-700 mb-4">{erro}</p>
        <button
          type="button"
          onClick={iniciarCamera}
          className="text-sm font-semibold text-brand-teal hover:underline"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {instrucao && (
        <p className="text-xs text-brand-slate leading-relaxed m-0">
          {instrucao}
        </p>
      )}
      <div className="relative rounded-brand overflow-hidden bg-brand-navy aspect-square max-w-sm mx-auto">
        {preview ? (
          <img
            src={preview.url}
            alt="Foto capturada"
            className="w-full h-full object-cover"
          />
        ) : (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
              style={{ transform: "scaleX(-1)" }}
            />
            {status === "streaming" && !prontoParaCapturar && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                <span className="text-white font-display text-6xl font-bold drop-shadow">
                  {contagem}
                </span>
              </div>
            )}
            {status === "requesting" && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              </div>
            )}
          </>
        )}
      </div>
      <canvas ref={canvasRef} className="hidden" />

      {preview ? (
        <div className="flex gap-3">
          <button
            type="button"
            onClick={tirarNovamente}
            disabled={disabled}
            className="flex-1 border border-gray-200 text-brand-ink font-semibold py-3 rounded-brand disabled:opacity-50"
          >
            Tirar novamente
          </button>
          <button
            type="button"
            onClick={usarFoto}
            disabled={disabled}
            className="flex-1 bg-brand-teal hover:bg-brand-teal-dark disabled:opacity-50 text-white font-bold py-3 rounded-brand"
          >
            Usar esta foto
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={capturar}
          disabled={disabled || status !== "streaming" || !prontoParaCapturar || capturando}
          className="w-full inline-flex items-center justify-center gap-2 bg-brand-teal hover:bg-brand-teal-dark disabled:opacity-50 text-white font-bold py-3.5 rounded-brand"
        >
          <CameraIcon className="w-5 h-5" />
          {!prontoParaCapturar
            ? `Aguarde… ${contagem}`
            : capturando
              ? "Capturando…"
              : "Capturar"}
        </button>
      )}
    </div>
  );
};

export default CameraLiveness;
