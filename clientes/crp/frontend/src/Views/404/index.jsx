import { jsonConfig } from "../../Config";
import { useNavigate } from "react-router-dom";

const Page404 = () => {
  const hist = useNavigate();

  return (
    <div className="min-h-screen bg-brand-mist flex items-center justify-center px-4">
      <div className="bg-white rounded-brand shadow-brand max-w-lg w-full overflow-hidden animate-brand-fade-up">
        <div className="bg-brand-navy px-8 py-8">
          <p className="text-[11px] tracking-[0.22em] uppercase text-brand-mute m-0">
            {jsonConfig.brand.nameSoftware}
          </p>
          <h1 className="font-display text-3xl font-bold text-white mt-2 m-0">
            Página não encontrada
          </h1>
        </div>
        <div className="h-1 bg-gradient-to-r from-brand-teal via-brand-teal-light to-brand-navy" />
        <div className="px-8 py-8">
          <p className="text-base text-brand-ink leading-relaxed m-0">
            O endereço acessado não existe ou foi movido. Retorne ao painel ou ao
            login.
          </p>
          <div className="mt-6 flex gap-4">
            <button
              type="button"
              onClick={() => hist(-1)}
              className="text-sm font-semibold text-brand-teal hover:underline"
            >
              ← Voltar
            </button>
            <button
              type="button"
              onClick={() => hist("/dashboard")}
              className="text-sm font-semibold text-brand-navy hover:underline"
            >
              Ir ao dashboard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Page404;
