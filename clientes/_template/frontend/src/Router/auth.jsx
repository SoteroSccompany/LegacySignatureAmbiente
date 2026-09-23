import { Navigate, useNavigate, useLocation } from "react-router-dom";
import { useContext, useEffect } from "react";
import { AuthContext } from "../Context";
import { AuthContextApi } from "../Context/api";
import { jsonConfig } from "../Config";
import {
  hasIdentityPartial,
  hasPending2FA,
  hasFullSession,
  resolveNextRoute,
  getPendingAssinar,
  NEXT_STEP,
} from "../services/identity";
import {
  can,
  canAccessRoute,
  getRole,
  homePathForRole,
} from "../utils/roles";
import Sidebar from "../Components/SideBar";
import Navbar from "../Components/NavBar";
import Footer from "../Components/Footer";

const AuthLayout = ({ Component }) => (
  <div className="h-screen flex flex-col overflow-hidden bg-brand-mist">
    <Sidebar />
    <Navbar />
    <main className="flex-1 min-h-0 md:pl-64 overflow-y-auto content-scroll flex flex-col">
      <div className="min-h-0">
        <Component />
      </div>
      <Footer />
    </main>
  </div>
);

const RouterWrapper = ({
  component: Component,
  isPrivate,
  isOnboarding = false,
  requiresPending2FA = false,
  roles = null,
  capability = null,
}) => {
  const { states, setters } = useContext(AuthContext);
  const api = useContext(AuthContextApi);
  const navigate = useNavigate();
  const location = useLocation();

  // Marcadores de sessão parcial (onboarding/2FA pendente): mock e real
  const PARTIAL_TOKENS = ["mock-ui-partial", "session-partial"];

  const isSigned = async () => {
    const token = localStorage.getItem("token");
    if (token === null) {
      setters.setSigned(false);
      return;
    }

    if (PARTIAL_TOKENS.includes(token)) {
      // Sessão parcial não é "signed" e não deve bater no /user/check
      setters.setSigned(false);
      return;
    }

    if (jsonConfig.uiMock) {
      setters.setSigned(true);
      return;
    }

    const response = await api.checkLogin();
    if (response === true) {
      setters.setSigned(true);
      return;
    }

    localStorage.removeItem("token");
    localStorage.removeItem("permisssion");
    localStorage.removeItem("cliente");
    localStorage.removeItem("usuario");
    setters.setSigned(false);
    // Rota pública (ex.: /assinar/*): token de painel obsoleto não deve
    // interromper o fluxo de assinatura, que tem sessão própria.
    if (isPrivate) navigate("/");
  };

  useEffect(() => {
    isSigned();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localStorage.getItem("token"), location.pathname]);

  if (requiresPending2FA) {
    if (!hasPending2FA()) {
      // OTP ok limpa pending2FA antes do navigate — sessão full não volta ao login
      if (hasFullSession()) {
        return (
          <Navigate
            to={resolveNextRoute(NEXT_STEP.OK, getRole())}
            replace
          />
        );
      }
      return <Navigate to="/" replace />;
    }
    return <Component />;
  }

  if (isOnboarding) {
    if (hasIdentityPartial()) return <Component />;
    // Sessão full com convite de assinatura pendente: o gate de qualificação
    // da cerimônia (perfil/2FA/senha) pode reabrir uma etapa de onboarding
    // mesmo com o login já completo — sem essa exceção o guard manda de
    // volta pro "/" e fecha o loop com o hub /assinar/:id/auth.
    if (hasFullSession() && getPendingAssinar()) return <Component />;
    return <Navigate to="/" replace />;
  }

  if (isPrivate) {
    const token = localStorage.getItem("token");
    if (token === null) return <Navigate to="/" replace />;
    if (PARTIAL_TOKENS.includes(token)) return <Navigate to="/" replace />;

    const role = getRole();
    if (roles && roles.length && !roles.includes(role)) {
      return <Navigate to={homePathForRole(role)} replace />;
    }
    if (capability && !can(capability, role)) {
      return <Navigate to={homePathForRole(role)} replace />;
    }
    if (!canAccessRoute(location.pathname, role)) {
      return <Navigate to={homePathForRole(role)} replace />;
    }

    if (states.signed || token) {
      return <AuthLayout Component={Component} />;
    }
    return <Navigate to="/" replace />;
  }

  return <Component />;
};

export default RouterWrapper;
