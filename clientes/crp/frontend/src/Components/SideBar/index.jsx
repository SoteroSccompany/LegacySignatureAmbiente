import { Link } from "react-router-dom";
import { AuthContext } from "../../Context";
import { Dialog, Transition } from "@headlessui/react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { Fragment, useState, useContext, useEffect, useMemo } from "react";
import { jsonConfig } from "../../Config";
import { can, CAPABILITY, getRole, isBiometriaObrigatoria, ROLES } from "../../utils/roles";
import {
  HomeIcon,
  UserIcon,
  CommandLineIcon,
  UserCircleIcon,
  DocumentTextIcon,
  BellAlertIcon,
  PlusCircleIcon,
  FolderIcon,
  ClipboardDocumentCheckIcon,
  KeyIcon,
  ShieldCheckIcon,
  FingerPrintIcon,
} from "@heroicons/react/24/solid";

function classNames(...classes) {
  return classes.filter(Boolean).join(" ");
}

const Sidebar = () => {
  const { states, setters } = useContext(AuthContext);
  const [navigation, setNavigation] = useState([]);
  const [secondaryNavigation, setSecondaryNavigation] = useState([]);
  const role = getRole();
  const biometriaObrigatoria = states.biometriaObrigatoria === true || isBiometriaObrigatoria();

  const navigationData = useMemo(() => {
    const items = [
      {
        name: "Dashboard",
        href: "/dashboard",
        icon: HomeIcon,
        current: false,
        show: can(CAPABILITY.viewDashboard, role),
      },
      {
        name: "Solicitações",
        href: "/solicitacoes",
        icon: DocumentTextIcon,
        current: false,
        show:
          !jsonConfig.ocultarSolicitacoes &&
          (can(CAPABILITY.listAllSolicitacoes, role) ||
            can(CAPABILITY.listOwnSolicitacoes, role)),
      },
      {
        name: "Nova solicitação",
        href: "/solicitacoes/nova",
        icon: PlusCircleIcon,
        current: false,
        show:
          !jsonConfig.ocultarSolicitacoes &&
          can(CAPABILITY.createSolicitacao, role),
      },
      {
        name: "Meus contratos",
        href: "/contratos",
        icon: FolderIcon,
        current: false,
        show: can(CAPABILITY.listMeusContratos, role),
      },
      {
        name: "Alertas",
        href: "/alertas",
        icon: BellAlertIcon,
        current: false,
        show: can(CAPABILITY.viewAlertas, role),
      },
      {
        name: "Usuários",
        href: "/usuarios",
        icon: UserIcon,
        current: false,
        show: can(CAPABILITY.manageUsuarios, role),
      },
      {
        name: "Termos",
        href: "/termos",
        icon: ClipboardDocumentCheckIcon,
        current: false,
        show: can(CAPABILITY.manageTermos, role),
      },
      {
        name: "Aprovação de biometria",
        href: "/aprovacao-biometria",
        icon: ShieldCheckIcon,
        current: false,
        show: can(CAPABILITY.approveBiometria, role) && biometriaObrigatoria,
      },
      {
        name: "Integração",
        href: "/integracao",
        icon: KeyIcon,
        current: false,
        show:
          !jsonConfig.ocultarIntegracao &&
          can(CAPABILITY.createSolicitacao, role),
      },
      {
        name: "Técnico",
        href: "/tecnicoIndex",
        icon: CommandLineIcon,
        current: false,
        show: can(CAPABILITY.tecnico, role),
      },
    ];
    return items.filter((i) => i.show);
  }, [role, biometriaObrigatoria]);

  const secondaryNavigationData = useMemo(() => {
    const items = [
      {
        name: "Perfil",
        href: "/perfil",
        icon: UserCircleIcon,
        current: false,
        show: true,
      },
      {
        name: "Biometria",
        href: "/biometria",
        icon: FingerPrintIcon,
        current: false,
        show:
          biometriaObrigatoria &&
          (role === ROLES.ADMIN || role === ROLES.USER || role === ROLES.SIGNER || role === ROLES.SUPERVISOR),
      },
    ];
    return items.filter((i) => i.show);
  }, [role, biometriaObrigatoria]);

  const currentItem = (clicked) => {
    setNavigation(
      navigation.map((item) => ({
        ...item,
        current: item.href === clicked.href,
      }))
    );
    setSecondaryNavigation(
      secondaryNavigation.map((item) => ({ ...item, current: false }))
    );
  };

  const currentItemSecondary = (clicked) => {
    setSecondaryNavigation(
      secondaryNavigation.map((item) => ({
        ...item,
        current: item.href === clicked.href,
      }))
    );
    setNavigation(navigation.map((item) => ({ ...item, current: false })));
  };

  const checkPath = () => {
    const path = window.location.pathname;
    const matchSecondary = secondaryNavigationData.find(
      (item) => path === item.href || path.startsWith(`${item.href}/`)
    );
    if (matchSecondary) {
      setNavigation((prev) =>
        prev.map((item) => ({ ...item, current: false }))
      );
      currentItemSecondary({ href: matchSecondary.href });
      return;
    }
    const match = navigationData.find(
      (item) => path === item.href || path.startsWith(`${item.href}/`)
    );
    if (match) currentItem({ href: match.href });
  };

  useEffect(() => {
    setNavigation(navigationData);
    setSecondaryNavigation(secondaryNavigationData);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, biometriaObrigatoria]);

  useEffect(() => {
    if (navigation.length) checkPath();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigation.length, window.location.pathname]);

  const NavContent = () => (
    <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-brand-navy px-6 pb-4">
      <div className="flex h-20 shrink-0 items-center border-b border-white/10">
        <div>
          <p className="text-[10px] tracking-[0.22em] uppercase text-brand-mute m-0">
            {jsonConfig.brand.nameCompany}
          </p>
          <p className="font-display text-lg font-bold text-white m-0 mt-1">
            {jsonConfig.brand.nameSoftware}
          </p>
          <p className="text-[10px] text-brand-teal-light m-0 mt-1 uppercase tracking-wider">
            {role || "—"}
            {role === ROLES.ADMIN
              ? " · full"
              : role === ROLES.USER
                ? " · delegação"
                : role === ROLES.SIGNER
                  ? " · contratos"
                  : role === ROLES.SUPERVISOR
                    ? " · aprovação"
                    : ""}
          </p>
        </div>
      </div>
      <nav className="flex flex-1 flex-col">
        <ul className="flex flex-1 flex-col gap-y-7">
          <li>
            <ul className="-mx-2 space-y-1">
              {navigation.map((item) => (
                <li key={item.name}>
                  <Link
                    to={item.href}
                    onClick={() => {
                      currentItem(item);
                      setters.setSideBar(false);
                    }}
                    className={classNames(
                      item.current
                        ? "bg-white/10 text-white"
                        : "text-brand-mute-soft hover:text-white hover:bg-white/5",
                      "group flex gap-x-3 rounded-brand p-2 text-sm leading-6 font-semibold transition-colors"
                    )}
                  >
                    <item.icon
                      className={classNames(
                        item.current
                          ? "text-brand-teal-light"
                          : "text-brand-mute group-hover:text-brand-teal-light",
                        "h-5 w-5 shrink-0"
                      )}
                      aria-hidden="true"
                    />
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </li>
          <li className="mt-auto">
            <ul className="-mx-2 space-y-1">
              {secondaryNavigation.map((item) => (
                <li key={item.name}>
                  <Link
                    to={item.href}
                    onClick={() => {
                      currentItemSecondary(item);
                      setters.setSideBar(false);
                    }}
                    className={classNames(
                      item.current
                        ? "bg-white/10 text-white"
                        : "text-brand-mute-soft hover:text-white hover:bg-white/5",
                      "group flex gap-x-3 rounded-brand p-2 text-sm leading-6 font-semibold"
                    )}
                  >
                    <item.icon className="h-5 w-5 shrink-0 text-brand-mute" />
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </li>
        </ul>
      </nav>
    </div>
  );

  return (
    <>
      <Transition.Root show={states.sideBar} as={Fragment}>
        <Dialog
          as="div"
          className="relative z-50 md:hidden"
          onClose={() => setters.setSideBar(false)}
        >
          <Transition.Child
            as={Fragment}
            enter="transition-opacity ease-linear duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="transition-opacity ease-linear duration-300"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-brand-navy/70" />
          </Transition.Child>
          <div className="fixed inset-0 flex">
            <Transition.Child
              as={Fragment}
              enter="transition ease-in-out duration-300 transform"
              enterFrom="-translate-x-full"
              enterTo="translate-x-0"
              leave="transition ease-in-out duration-300 transform"
              leaveFrom="translate-x-0"
              leaveTo="-translate-x-full"
            >
              <Dialog.Panel className="relative mr-16 flex w-full max-w-xs flex-1">
                <div className="absolute left-full top-0 flex w-16 justify-center pt-5">
                  <button
                    type="button"
                    className="-m-2.5 p-2.5"
                    onClick={() => setters.setSideBar(false)}
                  >
                    <XMarkIcon className="h-6 w-6 text-white" />
                  </button>
                </div>
                <NavContent />
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition.Root>

      <div className="hidden md:fixed md:inset-y-0 md:flex md:w-64 md:flex-col z-40">
        <NavContent />
      </div>
    </>
  );
};

export default Sidebar;
