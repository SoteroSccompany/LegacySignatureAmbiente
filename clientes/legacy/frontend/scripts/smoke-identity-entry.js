import { identityMock } from "../src/services/identity/mock.js";
import { NEXT_STEP, resolveNextRoute } from "../src/services/identity/types.js";
import {
  isValidCpf,
  isStrongPassword,
} from "../src/utils/validators/identity.js";

const assert = (cond, msg) => {
  if (!cond) throw new Error(msg);
};

async function run() {
  assert(isValidCpf("529.982.247-25"), "CPF demo");
  assert(isStrongPassword("Foo@1234"), "senha forte");

  let r = await identityMock.login({
    email: "gabriel@netexperts.com.br",
    senha: "Foo@1234",
  });
  assert(r.status && r.data.next_step === NEXT_STEP.LOGIN_2FA, "completo next");
  assert(resolveNextRoute(r.data.next_step) === "/login/2fa", "route 2fa");
  r = await identityMock.login2FA({ token: "123456" });
  assert(r.status && r.next_step === NEXT_STEP.OK, "completo ok");
  assert(localStorage.getItem("token") === "mock-ui-token", "token full");

  localStorage.clear();
  sessionStorage.clear();

  r = await identityMock.login({
    email: "provisoria@demo.local",
    senha: "temp-uuid-demo",
  });
  assert(r.data.next_step === NEXT_STEP.REDEFINIR_SENHA, "provisoria next");
  r = await identityMock.changePassword({
    senha: "temp-uuid-demo",
    novaSenha: "Nova@1234",
  });
  assert(r.next_step === NEXT_STEP.SETUP_2FA, "after change → setup2fa");
  r = await identityMock.getDoisFatoresConfig();
  assert(r.status && r.qrcode, "qrcode");
  r = await identityMock.confirmDoisFatores({ token: "123456" });
  assert(r.next_step === NEXT_STEP.CRIAR_PERFIL, "after 2fa → perfil");
  r = await identityMock.solicitarPerfilAuth();
  assert(r.status, "perfil auth");
  r = await identityMock.criarPerfil({
    nome: "Robledo",
    cpf: "52998224725",
    token: "123456",
  });
  assert(r.next_step === NEXT_STEP.OK, "perfil ok");

  localStorage.clear();
  sessionStorage.clear();

  r = await identityMock.login({
    email: "setup2fa@demo.local",
    senha: "Foo@1234",
  });
  assert(r.data.next_step === NEXT_STEP.SETUP_2FA, "setup2fa next");

  localStorage.clear();
  sessionStorage.clear();

  r = await identityMock.login({
    email: "semperfil@demo.local",
    senha: "Foo@1234",
  });
  assert(r.data.next_step === NEXT_STEP.LOGIN_2FA, "semperfil login2fa");
  r = await identityMock.login2FA({ token: "123456" });
  assert(r.next_step === NEXT_STEP.CRIAR_PERFIL, "semperfil perfil");

  localStorage.clear();
  sessionStorage.clear();

  r = await identityMock.forgotPassword({ email: "a@b.com" });
  assert(r.status, "forgot");
  r = await identityMock.forgotChangePass({
    token: "mock-token",
    senha: "Nova@1234",
  });
  assert(r.status, "forgot change");

  console.log("OK — todos os cenários de identidade mock passaram");
}

run().catch((e) => {
  console.error("FAIL", e);
  process.exit(1);
});
