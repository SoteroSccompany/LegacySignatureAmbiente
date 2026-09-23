const moment = require("moment");

const generateBrandColors = () => ({
  containerBg: "from-brand-mist/80 via-white/80 to-brand-mist/80",
  overlayBg: "from-brand-teal/5 to-brand-teal/5",
  decorationBg: "from-brand-teal/10 to-brand-teal/10",
  border: "border-brand-teal/30",
  inputBorder: "border-gray-200",
  focusRing: "focus:ring-brand-teal",
  iconBg: "from-brand-navy via-brand-navy-light to-brand-navy",
  textGradient: "from-brand-navy via-brand-navy-light to-brand-navy",
  buttonPrimary: "from-brand-teal via-brand-teal to-brand-teal-dark",
  buttonPrimaryHover:
    "hover:from-brand-teal-dark hover:via-brand-teal-dark hover:to-brand-teal-dark",
  buttonSecondaryBorder: "border-gray-200",
  buttonSecondaryBg: "from-white to-gray-50",
  buttonSecondaryBgHover: "hover:from-gray-50 hover:to-gray-100",
  buttonSecondaryText: "text-gray-700",
  buttonOverlay: "from-brand-teal/10 to-brand-teal/10",
  focusRingOffset: "focus:ring-brand-teal",
  headerIconBg: "bg-brand-navy",
  headerIconText: "text-brand-teal-light",
  headerButtonBg: "bg-brand-teal",
  headerButtonHover: "hover:bg-brand-teal-dark",
});

const brandColors = generateBrandColors();

export const colorMap = {
  indigo: brandColors,
  blue: brandColors,
  green: brandColors,
  purple: brandColors,
  pink: brandColors,
  red: brandColors,
  yellow: brandColors,
  emerald: brandColors,
  teal: brandColors,
  cyan: brandColors,
  orange: brandColors,
};

export const perPageOptionsSearch = [
  { value: 1, label: "5 registros" },
  { value: 10, label: "10 registros" },
  { value: 20, label: "20 registros" },
  { value: 50, label: "50 registros" },
];

export const formatDate = (dateString) => {
  if (!dateString) return "-";
  return moment(dateString).format("DD/MM/YYYY");
};

export const formatDateAnTime = (dateString) => {
  if (!dateString) return "-";
  const hour = new Date(dateString).toLocaleString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const date = new Date(dateString).toLocaleDateString("pt-BR");
  return `${date} ${hour}`;
};

export const truncate = (text, maxLength) => {
  if (!text) return "-";
  return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
};

export const formatCPFOrCNPJ = (value) => {
  if (!value) return "-";
  if (value.length === 11) {
    return value.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  }
  return value.replace(
    /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
    "$1.$2.$3/$4-$5"
  );
};

export const formatPhone = (value) => {
  if (!value) return "-";
  return value.replace(/^(\d{2})(\d{5})(\d{4})$/, "($1) $2-$3");
};

export const statusSolicitacaoLabel = {
  SOLICITADO: "Solicitado",
  PROCESSAMENTO_HASH_INICIAL: "Processando hash",
  UPLOAD_CONCLUIDO: "Upload concluído",
  ERRO_HASH_INICIAL: "Erro no hash",
  SOLICITADO_ASSINATURA_CONCLUIDO: "Aguardando assinaturas",
  CONCLUIDO: "Concluído",
};

export const statusSignatarioLabel = {
  PENDING: "Pendente",
  PROCESSING: "Processando",
  SIGNED: "Assinado",
  ERROR: "Erro",
  AGUARDANDO_ONBOARDING: "Aguardando onboarding",
};
