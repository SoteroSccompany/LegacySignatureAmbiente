// Demo UI: mock ligado por padrão (inclui identity mock em services/identity).
// Só desliga com REACT_APP_UI_MOCK=false|0. Próximo passo: trocar factory para identityApi.
// Default: API real. O mock só liga com REACT_APP_UI_MOCK=true (demo de UI).
const uiMockEnv = process.env.REACT_APP_UI_MOCK;
const uiMock = uiMockEnv === "true" || uiMockEnv === "1";
const manutencao = process.env.REACT_APP_MANUTENCAO === "true";
const ocultarSolicitacoes = process.env.REACT_APP_OCULTAR_SOLICITACOES === "true";
const ocultarIntegracao = process.env.REACT_APP_OCULTAR_INTEGRACAO === "true";

const jsonConfig = {
  urlReact: process.env.REACT_APP_FRONTEND,
  urlAPI: process.env.REACT_APP_BACKEND,
  APIKEY: `Bearer ${process.env.REACT_APP_APIKEY}`,
  limitDefault: 15,
  uiMock,
  manutencao,
  ocultarSolicitacoes,
  ocultarIntegracao,
  brand: {
    nameSoftware: "Net Sign",
    nameCompany: "Net Sign",
    tagline: "Confiança digital que escala com o seu negócio",
  },
  roles: {
    admin: "ADMIN",
    user: "USER",
    signer: "SIGNER",
    supervisor: "SUPERVISOR",
  },
};

export { jsonConfig };
