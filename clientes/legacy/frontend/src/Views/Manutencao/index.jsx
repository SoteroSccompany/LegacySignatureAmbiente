import { jsonConfig } from "../../Config";

const Manutencao = () => {
  return (
    <div className="min-h-screen bg-brand-mist flex items-center justify-center px-4">
      <div className="bg-white rounded-brand shadow-brand max-w-lg w-full overflow-hidden animate-brand-fade-up">
        <div className="bg-brand-navy px-8 py-8">
          <p className="text-[11px] tracking-[0.22em] uppercase text-brand-mute m-0">
            {jsonConfig.brand.nameSoftware}
          </p>
          <h1 className="font-display text-3xl font-bold text-white mt-2 m-0">
            Sistema em manutenção
          </h1>
        </div>
        <div className="h-1 bg-gradient-to-r from-brand-teal via-brand-teal-light to-brand-navy" />
        <div className="px-8 py-8">
          <p className="text-base text-brand-ink leading-relaxed m-0">
            Estamos realizando uma manutenção programada. O sistema retorna em
            breve. Agradecemos a compreensão.
          </p>
        </div>
        <div className="bg-brand-navy px-8 py-5 text-center">
          <p className="text-[13px] font-bold text-white m-0">
            {jsonConfig.brand.nameCompany}
          </p>
          <p className="text-[12px] text-brand-mute m-0 mt-1">
            {jsonConfig.brand.nameSoftware} · {jsonConfig.brand.tagline}
          </p>
        </div>
      </div>
    </div>
  );
};

export default Manutencao;
