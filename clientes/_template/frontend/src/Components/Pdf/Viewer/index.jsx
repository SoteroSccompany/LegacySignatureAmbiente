import { useEffect, useRef, useState } from "react";
import { jsonConfig } from "../../../Config";

const SAMPLE_SRC = "/documento.sample.pdf";

const clampScale = (next) => Math.min(Math.max(next, 0.8), 2.4);

/**
 * Viewer PDF com fit à largura do container (ResizeObserver). Renderiza
 * todas as páginas do documento em sequência (scroll) — necessário pra
 * demarcação funcionar em documentos com mais de uma página.
 *
 * `getDocument` / worker só rodam quando `src` muda. Resize só reescala
 * as imagens já em memória.
 *
 * `children` pode ser um nó fixo (overlay só na primeira página, como nas
 * telas de leitura) ou uma função `(pageNumber, pageSizePt) => node` pra
 * desenhar um overlay por página (demarcação).
 */
const PdfViewer = ({
  src = SAMPLE_SRC,
  onPageCount,
  onPageSize,
  onPagesReady,
  children,
  className = "",
  fitWidth = true,
  scale: scaleProp = 1.35,
}) => {
  const containerRef = useRef(null);
  const pageSizeRef = useRef({ width: 612, height: 792 });
  const onPageCountRef = useRef(onPageCount);
  const onPageSizeRef = useRef(onPageSize);
  const onPagesReadyRef = useRef(onPagesReady);
  const fitWidthRef = useRef(fitWidth);
  const scalePropRef = useRef(scaleProp);

  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [containerWidth, setContainerWidth] = useState(0);
  const [pageSize, setPageSize] = useState({ width: 612, height: 792 });
  const [pages, setPages] = useState([]);

  const isSample = src === SAMPLE_SRC;

  useEffect(() => {
    onPageCountRef.current = onPageCount;
    onPageSizeRef.current = onPageSize;
    onPagesReadyRef.current = onPagesReady;
    fitWidthRef.current = fitWidth;
    scalePropRef.current = scaleProp;
  });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return undefined;

    const measure = () => {
      const w = el.clientWidth || 0;
      const next = w > 48 ? w - 32 : w;
      setContainerWidth((prev) => (prev === next ? prev : next));
    };
    measure();

    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    let cancelled = false;
    let loadingTask;

    const render = async () => {
      if (isSample) {
        setReady(true);
        setLoadError(false);
        setPages([]);
        return;
      }
      if (!src) {
        setLoadError(true);
        setReady(true);
        setPages([]);
        return;
      }

      setReady(false);
      setLoadError(false);

      try {
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.js";
        loadingTask = pdfjs.getDocument(src);
        const doc = await loadingTask.promise;
        if (cancelled) return;
        onPageCountRef.current?.(doc.numPages);

        const pagesInfo = [];
        const renderScale = Math.min(Math.max(scalePropRef.current, 1.2), 2);
        for (let i = 1; i <= doc.numPages; i += 1) {
          // eslint-disable-next-line no-await-in-loop
          const pg = await doc.getPage(i);
          const baseViewport = pg.getViewport({ scale: 1 });
          if (i === 1) {
            pageSizeRef.current = { width: baseViewport.width, height: baseViewport.height };
            setPageSize(pageSizeRef.current);
            onPageSizeRef.current?.(pageSizeRef.current);
          }
          const viewport = pg.getViewport({ scale: renderScale });
          const canvas = document.createElement("canvas");
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          // eslint-disable-next-line no-await-in-loop
          await pg.render({ canvasContext: canvas.getContext("2d"), viewport }).promise;
          pagesInfo.push({
            number: i,
            dataUrl: canvas.toDataURL(),
            ptWidth: baseViewport.width,
            ptHeight: baseViewport.height,
          });
        }
        if (cancelled) return;
        setPages(pagesInfo);
        onPagesReadyRef.current?.(
          pagesInfo.map((p) => ({ page: p.number, width: p.ptWidth, height: p.ptHeight }))
        );
        setReady(true);
        setLoadError(false);
      } catch {
        if (!cancelled) {
          setLoadError(true);
          setReady(true);
          setPages([]);
          onPageCountRef.current?.(0);
        }
      }
    };

    render();
    return () => {
      cancelled = true;
      try {
        loadingTask?.destroy?.();
      } catch (_) {
        /* ignore */
      }
    };
  }, [src, isSample]);

  const displayScale = (() => {
    if (!fitWidth || !containerWidth) return scaleProp;
    const base = pageSize.width || 612;
    return clampScale(containerWidth / base);
  })();

  const fallbackWidth = Math.min(Math.max(containerWidth || 720, 320), 900);
  const fallbackHeight = Math.round((fallbackWidth * 842) / 595);

  const renderOverlay = (pageNumber, sizePt) =>
    typeof children === "function" ? children(pageNumber, sizePt) : null;

  return (
    <div
      ref={containerRef}
      className={`relative bg-slate-200/70 rounded-brand overflow-auto h-full min-h-0 ${className}`}
    >
      {isSample ? (
        <div className="relative mx-auto my-3 shadow-brand bg-white w-fit max-w-full">
          <div
            className="bg-white border border-gray-200 flex flex-col p-8 relative max-w-full"
            style={{ width: fallbackWidth, height: fallbackHeight }}
          >
            <p className="text-[11px] tracking-[0.2em] uppercase text-brand-mute font-semibold m-0">
              {jsonConfig.brand.nameSoftware}
            </p>
            <h3 className="font-display text-2xl text-brand-navy mt-6 mb-3">
              Documento amostra
            </h3>
            <p className="text-sm text-brand-ink leading-relaxed m-0 max-w-md">
              Pré-visualização mock do PDF em tamanho amplo. Posicione as áreas
              de assinatura sobre esta página.
            </p>
            <div className="mt-auto border-t border-dashed border-gray-200 pt-4 text-xs text-brand-soft">
              {Math.round(pageSize.width)}×{Math.round(pageSize.height)} pt
            </div>
            <div className="absolute inset-0">
              {typeof children === "function" ? children(1, pageSize) : children}
            </div>
          </div>
        </div>
      ) : loadError ? (
        <div className="flex items-center justify-center h-full min-h-[240px] p-8 text-center">
          <p className="text-sm text-brand-ink m-0">
            Não foi possível exibir o PDF. Tente recarregar a página.
          </p>
        </div>
      ) : (
        <>
          {pages.map((p) => (
            <div
              key={p.number}
              className="relative mx-auto my-3 shadow-brand bg-white w-fit max-w-full"
            >
              <img
                src={p.dataUrl}
                alt={`Página ${p.number}`}
                className="block max-w-full h-auto"
                style={{
                  width: p.ptWidth * displayScale,
                  height: p.ptHeight * displayScale,
                }}
              />
              <div className="absolute inset-0">
                {renderOverlay(p.number, { width: p.ptWidth, height: p.ptHeight })}
              </div>
            </div>
          ))}
          {!ready && (
            <div className="absolute inset-0 flex items-center justify-center min-h-[420px] min-w-[280px]">
              <div className="w-8 h-8 border-2 border-brand-teal/30 border-t-brand-teal rounded-full animate-spin" />
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default PdfViewer;
