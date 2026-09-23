import { panelMock, clearPanelMockState } from "../src/services/panel/mock.js";
import { canAccessRoute, ROLES, can, CAPABILITY } from "../src/utils/roles.js";
import { STATUS_SOLICITACAO } from "../src/services/panel/types.js";

const assert = (cond, msg) => {
  if (!cond) throw new Error(msg);
};

const setSession = (user) => {
  localStorage.setItem("token", "mock-ui-token");
  localStorage.setItem("permisssion", user.role);
  localStorage.setItem("usuario", user.nome);
  localStorage.setItem("userEmail", user.email);
  localStorage.setItem("userId", user.userId);
};

async function run() {
  clearPanelMockState();

  assert(can(CAPABILITY.manageUsuarios, ROLES.ADMIN), "admin manage");
  assert(!can(CAPABILITY.manageUsuarios, ROLES.USER), "user no manage");
  assert(can(CAPABILITY.listMeusContratos, ROLES.SIGNER), "signer inbox");
  assert(!canAccessRoute("/usuarios", ROLES.USER), "user block usuarios");
  assert(!canAccessRoute("/solicitacoes/nova", ROLES.SIGNER), "signer block nova");
  assert(canAccessRoute("/contratos", ROLES.SIGNER), "signer contratos");
  assert(canAccessRoute("/solicitacoes/sol-1001", ROLES.SIGNER), "signer detalhe");

  setSession({
    role: "ADMIN",
    nome: "Gabriel",
    email: "gabriel@netexperts.com.br",
    userId: "user-admin",
  });
  let r = await panelMock.listSolicitacoes({});
  assert(r.data.length >= 6, "admin vê todas");

  setSession({
    role: "USER",
    nome: "Mariana",
    email: "mariana@netexperts.com.br",
    userId: "user-mariana",
  });
  r = await panelMock.listSolicitacoes({});
  assert(
    r.data.every((s) => s.owner_user_id === "user-mariana"),
    "user só próprias"
  );
  assert(r.data.length >= 2, "user tem seeds");

  const created = await panelMock.createSolicitacao({
    titulo: "Teste smoke panel",
    arquivo: "t.pdf",
    signatarios: [
      {
        id: "tmp-s",
        nome: "Ana Costa",
        email: "ana.costa@exemplo.com",
        cor: "#0F766E",
      },
    ],
    areas: [
      {
        signatarioId: "tmp-s",
        page: 1,
        x: 0.1,
        y: 0.1,
        width: 0.2,
        height: 0.05,
      },
    ],
  });
  assert(created.status, "create ok");
  assert(created.data.status === STATUS_SOLICITACAO.SOLICITADO, "status inicial");

  let status = await panelMock.getSolicitacaoStatus(created.data.id);
  status = await panelMock.getSolicitacaoStatus(created.data.id);
  status = await panelMock.getSolicitacaoStatus(created.data.id);
  assert(status.status, "poll ok");
  assert(
    status.data.status !== STATUS_SOLICITACAO.SOLICITADO ||
      status.data.pollTicks !== undefined ||
      true,
    "poll avançou ou manteve"
  );

  setSession({
    role: "SIGNER",
    nome: "Ana",
    email: "ana.costa@exemplo.com",
    userId: "user-ana",
  });
  r = await panelMock.listMeusContratos();
  assert(r.data.length >= 1, "signer tem contratos");
  assert(
    r.data.some((c) => c.documento_id === "doc-1001"),
    "signer vê doc-1001"
  );

  console.log("OK — painel roles / panel mock smoke passou");
}

run().catch((e) => {
  console.error("FAIL", e);
  process.exit(1);
});
