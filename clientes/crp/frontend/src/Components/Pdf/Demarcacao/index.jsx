import { useRef, useState } from "react";
import { toast } from "react-toastify";
import PdfViewer from "../Viewer";
import { QUADRO_ASSINATURA_PT } from "../../../utils/signatarios";

// Duas áreas se sobrepõem se os intervalos de x e de y se cruzam ao mesmo tempo.
const overlaps = (a, b) =>
  a.x < b.x + b.width &&
  a.x + a.width > b.x &&
  a.y < b.y + b.height &&
  a.y + a.height > b.y;

const prender = (valor, tamanho) => Math.min(Math.max(valor, 0), 1 - tamanho);

const PdfDemarcacao = ({
  signatarios = [],
  areas = [],
  onChangeAreas,
  src = "/documento.sample.pdf",
  onPageSize,
  className = "",
  readOnly = false,
}) => {
  const [activeSigner, setActiveSigner] = useState(signatarios[0]?.id || null);
  const areasRef = useRef(areas);
  const dragRef = useRef(null);
  areasRef.current = areas;

  const active = signatarios.find((s) => s.id === activeSigner);

  const tamanhoQuadro = (sizePt) => ({
    boxWidth: Math.min(QUADRO_ASSINATURA_PT.largura / (sizePt.width || 612), 1),
    boxHeight: Math.min(QUADRO_ASSINATURA_PT.altura / (sizePt.height || 792), 1),
  });

  const gravarArea = (novaArea) => {
    const outrasAreas = areasRef.current.filter((a) => a.signatarioId !== novaArea.signatarioId);
    if (outrasAreas.some((a) => a.page === novaArea.page && overlaps(a, novaArea))) {
      toast.error(
        "Essa área sobrepõe a demarcação de outro signatário. Escolha outro ponto da página."
      );
      return false;
    }
    onChangeAreas([...outrasAreas, novaArea]);
    return true;
  };

  // Canto superior esquerdo no ponto clicado. O tamanho fica 230×115pt.
  const onClickPagina = (pageNumber, sizePt) => (e) => {
    if (readOnly || !active) return;
    if (e.target !== e.currentTarget) return;
    const { boxWidth, boxHeight } = tamanhoQuadro(sizePt);
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = (e.clientX - rect.left) / rect.width;
    const clickY = (e.clientY - rect.top) / rect.height;
    const novaArea = {
      id: `area-${Date.now()}`,
      signatarioId: active.id,
      tipo: "assinatura",
      page: pageNumber,
      x: prender(clickX, boxWidth),
      y: prender(clickY, boxHeight),
      width: boxWidth,
      height: boxHeight,
      pageWidth: sizePt.width,
      pageHeight: sizePt.height,
      cor: active.cor || "#0F766E",
    };
    const jaTem = areasRef.current.find((a) => a.signatarioId === active.id);
    if (jaTem) novaArea.id = jaTem.id;
    gravarArea(novaArea);
  };

  const iniciarArraste = (area) => (e) => {
    if (readOnly) return;
    e.stopPropagation();
    e.preventDefault();
    const pagina = e.currentTarget.parentElement;
    if (!pagina) return;
    dragRef.current = {
      pointerId: e.pointerId,
      areaId: area.id,
      rect: pagina.getBoundingClientRect(),
      startClientX: e.clientX,
      startClientY: e.clientY,
      startX: area.x,
      startY: area.y,
      width: area.width,
      height: area.height,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
    setActiveSigner(area.signatarioId);
  };

  const moverArraste = (e) => {
    const drag = dragRef.current;
    if (!drag || e.pointerId !== drag.pointerId) return;
    e.stopPropagation();
    const dx = (e.clientX - drag.startClientX) / drag.rect.width;
    const dy = (e.clientY - drag.startClientY) / drag.rect.height;
    const atuais = areasRef.current;
    const movida = atuais.find((a) => a.id === drag.areaId);
    if (!movida) return;
    const nova = {
      ...movida,
      x: prender(drag.startX + dx, drag.width),
      y: prender(drag.startY + dy, drag.height),
    };
    const outras = atuais.filter((a) => a.id !== drag.areaId);
    if (outras.some((a) => (a.page || 1) === (nova.page || 1) && overlaps(a, nova))) return;
    onChangeAreas([...outras, nova]);
  };

  const soltarArraste = (e) => {
    const drag = dragRef.current;
    if (!drag || e.pointerId !== drag.pointerId) return;
    dragRef.current = null;
    e.stopPropagation();
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch (_) {
      /* captura já solta */
    }
  };

  return (
    <div
      className={`h-full min-h-0 grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-0 lg:gap-3 ${className}`}
    >
      <aside className="bg-white border border-gray-100 rounded-brand p-4 overflow-y-auto h-auto lg:h-full lg:max-h-full shrink-0">
        <p className="text-[11px] font-bold uppercase tracking-wider text-brand-soft mb-3">
          Signatários
        </p>
        <ul className="space-y-2 m-0 p-0 list-none">
          {signatarios.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => setActiveSigner(s.id)}
                className={`w-full text-left px-3 py-2.5 rounded-brand border text-sm transition-colors ${activeSigner === s.id
                    ? "border-brand-teal bg-teal-50/60"
                    : "border-gray-100 hover:border-gray-200"
                  }`}
              >
                <span
                  className="inline-block w-2.5 h-2.5 rounded-full mr-2"
                  style={{ background: s.cor || "#0F766E" }}
                />
                {s.autoAssinatura ? "Eu mesmo" : s.nome || "Sem nome"}
              </button>
            </li>
          ))}
        </ul>
        <p className="text-xs text-brand-soft mt-4 m-0 leading-relaxed">
          {readOnly
            ? "Visualização das demarcações já cadastradas nesta solicitação."
            : `Selecione um signatário e clique no PDF para cravar o canto do quadro (${QUADRO_ASSINATURA_PT.largura}×${QUADRO_ASSINATURA_PT.altura}pt). Arraste o quadro para ajustar. O documento pode ter mais de uma página — role para ver todas.`}
        </p>
        {!readOnly && areas.length > 0 && (
          <button
            type="button"
            onClick={() => onChangeAreas([])}
            className="mt-3 text-xs font-semibold text-rose-600 hover:underline"
          >
            Limpar demarcações ({areas.length})
          </button>
        )}
      </aside>

      <PdfViewer
        src={src}
        fitWidth
        onPageSize={onPageSize}
        className="min-h-[60vh] lg:min-h-0"
      >
        {(pageNumber, sizePt) => (
          <div
            className={`absolute inset-0 ${readOnly ? "" : "cursor-crosshair"}`}
            onClick={onClickPagina(pageNumber, sizePt)}
          >
            {areas
              .filter((a) => (a.page || 1) === pageNumber)
              .map((a) => {
                const signer = signatarios.find((s) => s.id === a.signatarioId);
                return (
                  <div
                    key={a.id}
                    onPointerDown={readOnly ? undefined : iniciarArraste(a)}
                    onPointerMove={readOnly ? undefined : moverArraste}
                    onPointerUp={readOnly ? undefined : soltarArraste}
                    onClick={(e) => e.stopPropagation()}
                    className={`absolute border-2 rounded-sm flex items-end p-1 ${readOnly ? "pointer-events-none" : "cursor-grab active:cursor-grabbing touch-none"
                      }`}
                    style={{
                      left: `${a.x * 100}%`,
                      top: `${a.y * 100}%`,
                      width: `${a.width * 100}%`,
                      height: `${a.height * 100}%`,
                      borderColor: a.cor || "#0F766E",
                      background: `${a.cor || "#0F766E"}22`,
                    }}
                  >
                    <span className="text-[10px] font-bold text-brand-navy bg-white/90 px-1 rounded">
                      {signer?.autoAssinatura ? "Eu mesmo" : signer?.nome || "Área"}
                    </span>
                  </div>
                );
              })}
          </div>
        )}
      </PdfViewer>
    </div>
  );
};

export default PdfDemarcacao;
