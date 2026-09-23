import moment from "moment";
import { jsonConfig } from "../../Config";

const Footer = () => {
  return (
    <footer className="border-t border-gray-200/80 bg-white/60 px-4 py-3">
      <p className="text-xs text-brand-soft text-center m-0">
        &copy; {moment().format("YYYY")} {jsonConfig.brand.nameCompany} ·{" "}
        {jsonConfig.brand.nameSoftware} — Todos os direitos reservados.
      </p>
    </footer>
  );
};

export default Footer;
