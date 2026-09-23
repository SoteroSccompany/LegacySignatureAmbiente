import { Link, useParams } from "react-router-dom";
import AuthShell from "../../Components/AuthShell";
import { setPendingAssinar } from "../../services/identity";

const AssinarLanding = () => {
  const { documentoId } = useParams();

  const irParaAuth = () => {
    setPendingAssinar(documentoId);
  };

  return (
    <AuthShell
      title="Você foi convidado a assinar"
      subtitle="Um clique para seguir com segurança no fluxo de assinatura."
      tip="Links de acesso são pessoais e temporários. Não compartilhe este convite."
    >
      <p className="text-[15px] leading-relaxed text-brand-ink mb-6">
        Há um documento aguardando sua assinatura eletrônica. Continue para
        entrar no painel (se ainda não estiver logado), confirmar o código do
        autenticador, fazer o reconhecimento facial, revisar o PDF e assinar.
      </p>
      <Link
        to={`/assinar/${documentoId}/auth`}
        onClick={irParaAuth}
        className="block w-full text-center bg-brand-teal hover:bg-brand-teal-dark text-white font-bold text-[15px] py-3.5 rounded-brand transition-colors"
      >
        Continuar para assinar
      </Link>
      <p className="mt-4 text-xs text-brand-soft text-center break-all">
        Documento: {documentoId}
      </p>
    </AuthShell>
  );
};

export default AssinarLanding;
