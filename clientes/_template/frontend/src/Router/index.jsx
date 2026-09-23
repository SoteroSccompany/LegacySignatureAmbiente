import { Route, Routes, useLocation } from "react-router-dom";
import { useEffect } from "react";
import RouterWrapper from "./auth";

import Login from "../Views/Login";
import DoisFatores from "../Views/Login/DoisFatores";
import OnboardingSenha from "../Views/Login/OnboardingSenha";
import Onboarding2FA from "../Views/Login/Onboarding2FA";
import OnboardingPerfil from "../Views/Login/OnboardingPerfil";
import RecuperarSenha from "../Views/RecuperacaoSenha";
import Page404 from "../Views/404";
import TrocaEmail from "../Views/TrocaEmail";
import Autenticar from "../Views/AutenticarEmail";

import Dashboard from "../Views/Dashboard";
import Perfil from "../Views/Perfil";
import Usuarios from "../Views/Usuarios";
import Contratos from "../Views/Contratos";
import Solicitacoes from "../Views/Solicitacoes";
import NovaSolicitacao from "../Views/Solicitacoes/Nova";
import DetalheSolicitacao from "../Views/Solicitacoes/Detalhe";
import SignatariosSolicitacao from "../Views/Solicitacoes/Signatarios";
import DemarcacoesView from "../Views/Solicitacoes/Demarcacoes";
import Alertas from "../Views/Alertas";
import Auditoria from "../Views/Auditoria";
import Verificar from "../Views/Verificar";
import Termos from "../Views/Termos";
import Integracao from "../Views/Integracao";
import NovoTermo from "../Views/Termos/Novo";
import EditarTermo from "../Views/Termos/Editar";
import AprovacaoBiometria from "../Views/AprovacaoBiometria";
import AprovacaoBiometriaLista from "../Views/AprovacaoBiometria/Lista";
import Biometria from "../Views/Biometria";
import { ROLES, CAPABILITY } from "../utils/roles";

import AssinarLanding from "../Views/Assinar";
import AssinarAuth from "../Views/Assinar/Auth";
import AssinarDocumento from "../Views/Assinar/Documento";
import AssinarStatus from "../Views/Assinar/Status";
import OnboardingBiometria from "../Views/Login/OnboardingBiometria";

import Tecnico from "../Views/Tecnico";
import Logs from "../Views/Tecnico/Logs";
import Requests from "../Views/Tecnico/Requests";

const Router = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  const RouterTecnico = () => (
    <Routes>
      <Route
        path="/logs"
        element={<RouterWrapper component={Logs} isPrivate={false} />}
      />
      <Route
        path="/requests"
        element={<RouterWrapper component={Requests} isPrivate={false} />}
      />
      <Route
        path="*"
        element={<RouterWrapper component={Tecnico} isPrivate={false} />}
      />
    </Routes>
  );

  return (
    <Routes>
      <Route
        path="/dashboard"
        element={<RouterWrapper component={Dashboard} isPrivate={true} />}
      />
      <Route
        path="/contratos"
        element={
          <RouterWrapper
            component={Contratos}
            isPrivate={true}
            roles={[ROLES.SIGNER]}
          />
        }
      />
      <Route
        path="/solicitacoes"
        element={
          <RouterWrapper
            component={Solicitacoes}
            isPrivate={true}
            roles={[ROLES.ADMIN, ROLES.USER, ROLES.SUPERVISOR]}
          />
        }
      />
      <Route
        path="/solicitacoes/nova"
        element={
          <RouterWrapper
            component={NovaSolicitacao}
            isPrivate={true}
            roles={[ROLES.ADMIN, ROLES.USER, ROLES.SUPERVISOR]}
          />
        }
      />
      <Route
        path="/solicitacoes/:id"
        element={
          <RouterWrapper component={DetalheSolicitacao} isPrivate={true} />
        }
      />
      <Route
        path="/solicitacoes/:id/signatarios"
        element={
          <RouterWrapper
            component={SignatariosSolicitacao}
            isPrivate={true}
            roles={[ROLES.ADMIN, ROLES.USER, ROLES.SUPERVISOR]}
          />
        }
      />
      <Route
        path="/solicitacoes/:id/demarcacoes"
        element={
          <RouterWrapper
            component={DemarcacoesView}
            isPrivate={true}
            roles={[ROLES.ADMIN, ROLES.USER, ROLES.SUPERVISOR]}
          />
        }
      />
      <Route
        path="/alertas"
        element={<RouterWrapper component={Alertas} isPrivate={true} />}
      />
      <Route
        path="/auditoria/:documentoId"
        element={
          <RouterWrapper
            component={Auditoria}
            isPrivate={true}
            roles={[ROLES.ADMIN]}
          />
        }
      />
      <Route
        path="/usuarios"
        element={
          <RouterWrapper
            component={Usuarios}
            isPrivate={true}
            roles={[ROLES.ADMIN]}
          />
        }
      />
      <Route
        path="/integracao"
        element={
          <RouterWrapper
            component={Integracao}
            isPrivate={true}
            roles={[ROLES.ADMIN, ROLES.USER, ROLES.SUPERVISOR]}
          />
        }
      />
      <Route
        path="/termos"
        element={
          <RouterWrapper
            component={Termos}
            isPrivate={true}
            roles={[ROLES.ADMIN]}
          />
        }
      />
      <Route
        path="/termos/novo"
        element={
          <RouterWrapper
            component={NovoTermo}
            isPrivate={true}
            roles={[ROLES.ADMIN]}
          />
        }
      />
      <Route
        path="/termos/:id/editar"
        element={
          <RouterWrapper
            component={EditarTermo}
            isPrivate={true}
            roles={[ROLES.ADMIN]}
          />
        }
      />
      <Route
        path="/aprovacao-biometria"
        element={
          <RouterWrapper
            component={AprovacaoBiometriaLista}
            isPrivate={true}
            capability={CAPABILITY.approveBiometria}
          />
        }
      />
      <Route
        path="/aprovacao-biometria/:usuario_id"
        element={
          <RouterWrapper
            component={AprovacaoBiometria}
            isPrivate={true}
            capability={CAPABILITY.approveBiometria}
          />
        }
      />
      <Route
        path="/perfil"
        element={<RouterWrapper component={Perfil} isPrivate={true} />}
      />
      <Route
        path="/biometria"
        element={<RouterWrapper component={Biometria} isPrivate={true} />}
      />
      <Route
        path="/tecnicoIndex/*"
        element={
          <RouterWrapper
            component={RouterTecnico}
            isPrivate={true}
            roles={[ROLES.ADMIN]}
          />
        }
      />

      <Route
        path="/verificar"
        element={<RouterWrapper component={Verificar} isPrivate={false} />}
      />
      <Route
        path="/verificar/:codigo"
        element={<RouterWrapper component={Verificar} isPrivate={false} />}
      />

      <Route
        path="/assinar/:documentoId"
        element={<RouterWrapper component={AssinarLanding} isPrivate={false} />}
      />
      <Route
        path="/assinar/:documentoId/auth"
        element={<RouterWrapper component={AssinarAuth} isPrivate={false} />}
      />
      <Route
        path="/assinar/:documentoId/documento"
        element={
          <RouterWrapper component={AssinarDocumento} isPrivate={false} />
        }
      />
      <Route
        path="/assinar/:documentoId/status"
        element={<RouterWrapper component={AssinarStatus} isPrivate={false} />}
      />

      {/* isPrivate={false} de propósito: exige sessão FULL (hasFullSession),
          não sessão parcial de onboarding (isOnboarding exige hasIdentityPartial).
          O próprio componente redireciona para "/" se não houver sessão completa,
          mesmo padrão usado pelas rotas /assinar/*. */}
      <Route
        path="/onboarding/biometria"
        element={
          <RouterWrapper component={OnboardingBiometria} isPrivate={false} />
        }
      />

      <Route
        path="/login/2fa"
        element={
          <RouterWrapper
            component={DoisFatores}
            isPrivate={false}
            requiresPending2FA
          />
        }
      />
      <Route
        path="/onboarding/senha"
        element={
          <RouterWrapper
            component={OnboardingSenha}
            isPrivate={false}
            isOnboarding
          />
        }
      />
      <Route
        path="/onboarding/2fa"
        element={
          <RouterWrapper
            component={Onboarding2FA}
            isPrivate={false}
            isOnboarding
          />
        }
      />
      <Route
        path="/onboarding/perfil"
        element={
          <RouterWrapper
            component={OnboardingPerfil}
            isPrivate={false}
            isOnboarding
          />
        }
      />
      <Route
        path="/recuperarSenha/:token"
        element={<RouterWrapper component={RecuperarSenha} isPrivate={false} />}
      />
      <Route
        path="/trocarEmail/:token"
        element={<RouterWrapper component={TrocaEmail} isPrivate={false} />}
      />
      <Route
        path="/autenticarEmail/:token"
        element={<RouterWrapper component={Autenticar} isPrivate={false} />}
      />
      <Route
        path="/"
        element={<RouterWrapper component={Login} isPrivate={false} />}
      />
      <Route path="*" element={<Page404 />} />
    </Routes>
  );
};

export default Router;
