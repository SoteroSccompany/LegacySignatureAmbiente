import { useRef, useState } from "react";
import {
  CloudArrowUpIcon,
  DocumentIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";

const LABEL_DONE = "Upload concluído";

const UploadDocumento = ({
  file,
  onFile,
  progressLabel,
  progress = 0,
  busy = false,
}) => {
  const inputRef = useRef(null);
  const [drag, setDrag] = useState(false);

  const pick = (f) => {
    if (!f || busy) return;
    if (f.type !== "application/pdf") return;
    onFile(f);
  };

  const done = progressLabel === LABEL_DONE || progress >= 100;

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!busy) setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          if (busy) return;
          pick(e.dataTransfer.files?.[0]);
        }}
        onClick={() => {
          if (!busy) inputRef.current?.click();
        }}
        className={`border-2 border-dashed rounded-brand p-10 text-center transition-colors ${
          busy
            ? "border-gray-200 bg-gray-50 cursor-not-allowed opacity-70"
            : drag
              ? "border-brand-teal bg-teal-50/50 cursor-pointer"
              : "border-gray-200 bg-white hover:border-brand-teal cursor-pointer"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          disabled={busy}
          onChange={(e) => pick(e.target.files?.[0])}
        />
        <CloudArrowUpIcon className="w-10 h-10 text-brand-teal mx-auto mb-3" />
        <p className="text-sm font-semibold text-brand-navy m-0">
          Arraste o PDF ou clique para selecionar
        </p>
        <p className="text-xs text-brand-soft mt-1 m-0">
          Apenas PDF · envio seguro
        </p>
      </div>

      {file && (
        <div className="mt-4 bg-brand-tip rounded-brand p-4 flex items-start gap-3">
          <DocumentIcon className="w-6 h-6 text-brand-navy shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-brand-navy truncate m-0">
              {file.name}
            </p>
            <p className="text-xs text-brand-soft m-0">
              {(file.size / 1024).toFixed(1)} KB
            </p>
            {progressLabel && (
              <div className="mt-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-brand-teal">
                  {done ? (
                    <CheckCircleIcon className="w-4 h-4" />
                  ) : (
                    <span className="w-3 h-3 border-2 border-brand-teal/30 border-t-brand-teal rounded-full animate-spin" />
                  )}
                  {progressLabel}
                </div>
                <div className="mt-2 h-1.5 bg-white rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-brand-teal to-brand-teal-light transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export { LABEL_DONE };
export default UploadDocumento;
