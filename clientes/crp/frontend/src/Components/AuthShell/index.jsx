import { jsonConfig } from "../../Config";

const AuthShell = ({
  title,
  subtitle = "Um clique para seguir com segurança no fluxo de assinatura.",
  children,
  tip,
}) => {
  const { brand } = jsonConfig;

  return (
    <div className="min-h-screen bg-brand-mist flex flex-col">
      <div className="relative flex-1 flex items-center justify-center px-4 py-10">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 80% 50% at 20% 0%, rgba(15,118,110,0.18), transparent 55%), radial-gradient(ellipse 60% 40% at 90% 100%, rgba(11,31,51,0.12), transparent 50%)",
          }}
        />
        <div className="relative w-full max-w-md animate-brand-fade-up">
          <div className="bg-white rounded-brand shadow-brand overflow-hidden">
            <div className="bg-brand-navy px-8 pt-9 pb-7">
              <p className="text-[11px] font-sans tracking-[0.22em] uppercase text-brand-mute mb-2">
                {brand.nameSoftware}
              </p>
              <h1 className="font-display text-[28px] leading-tight font-bold text-white">
                {title}
              </h1>
              {subtitle && (
                <p className="mt-3 text-[13px] leading-relaxed text-brand-mute-soft font-sans">
                  {subtitle}
                </p>
              )}
            </div>
            <div className="h-1 w-full bg-gradient-to-r from-brand-teal via-brand-teal-light to-brand-navy animate-brand-bar" />
            <div className="px-8 py-8">{children}</div>
            {tip && (
              <div className="px-8 pb-8">
                <div className="bg-brand-tip rounded-brand px-5 py-4">
                  <p className="text-[11px] tracking-[0.14em] uppercase text-brand-teal font-bold mb-1.5">
                    Segurança {brand.nameSoftware}
                  </p>
                  <p className="text-[13px] leading-relaxed text-brand-slate m-0">
                    {tip}
                  </p>
                </div>
              </div>
            )}
            <div className="bg-brand-navy px-8 py-5 text-center">
              <p className="text-[13px] font-bold text-white m-0">
                {brand.nameCompany}
              </p>
              <p className="text-[12px] text-brand-mute m-0 mt-1">
                {brand.nameSoftware} · {brand.tagline}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthShell;
