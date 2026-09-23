import { Fragment } from 'react';
import { Link,  useParams } from 'react-router-dom';
import { AuthContext } from '../../../Context';
import { useContext, useEffect, useState } from 'react';
import { Popover, Transition } from '@headlessui/react';
import { ChevronDownIcon } from '@heroicons/react/20/solid';

const Navbar = () => {

    const { id } = useParams()


    const nav = [
        { name: 'Painel', href: `/clientes/cliente/${id}/usuarios`, current: false },
        { name: 'Usuários', href: `/clientes/cliente/${id}/usuarios/usuarios`, current: false },
        { name: 'Recuperação de Senha', href: `/clientes/cliente/${id}/usuarios/recuperacaoDeSenha`, current: false }
    ]

    const { states } = useContext(AuthContext);
    const [navigationFerias, setNavigationFerias] = useState(nav);

    const currentItemSecondary = () => {
        const updatedNavigationFerias = navigationFerias.map((item) => {
            if (item.href === window.location.pathname) {
                return { ...item, current: true };
            } else {
                return { ...item, current: false };
            }
        });

        setNavigationFerias(updatedNavigationFerias);
    };

    useEffect(() => {
        currentItemSecondary();
    }, []);

    return (
        <>
            <div className="hidden lg:flex flex-col w-[100%] flex items-center justify-center mb-4">
                <nav className="bg-white w-[100%] border rounded-md">
                    <div className="container mx-auto px-4">
                        <div className="flex items-center justify-center h-16">
                            <div className="flex space-x-1 items-center justify-center">
                                {navigationFerias?.map((item, index) => (
                                    <Link
                                        key={index}
                                        to={item.href}
                                        onClick={currentItemSecondary}
                                        className={`text-gray-800 hover:text-gray-600 px-3 py-2 rounded-md text-[12px] font-medium border-b-4 ${item.current
                                            ? "border-blue-600"
                                            : "border-transparent hover:border-blue-600"
                                            }`}
                                    >
                                        {item.name}
                                    </Link>
                                ))}
                            </div>
                        </div>
                    </div>
                </nav>
            </div>




            <Popover className="relative lg:hidden lg:flex flex-col w-[100%] px-4 sm:px-6 lg:px-8 mb-4 flex items-center justify-center">
                <Popover.Button className="inline-flex items-center text-sm font-semibold text-gray-900">
                    <div className="flex items-center justify-center">
                        <div className="bg-white border justify-center items-center flex border-gray-300 rounded-md p-5 h-[2em] w-[23rem]">
                            <div className='flex items-center justify-center'>
                                <h2 className="text-lg font-semibold ">Clique para abrir o menu</h2>
                                <ChevronDownIcon className="ml-6 h-5 w-5 text-gray-500" aria-hidden="true" />
                            </div>
                        </div>
                    </div>
                </Popover.Button>
                <Transition
                    as={Fragment}
                    enter="transition ease-out duration-200"
                    enterFrom="opacity-0 translate-y-1"
                    enterTo="opacity-100 translate-y-0"
                    leave="transition ease-in duration-150"
                    leaveFrom="opacity-100 translate-y-0"
                    leaveTo="opacity-0 translate-y-1"
                >
                    <Popover.Panel>
                        <div className="w-screen max-w-sm flex-auto rounded-3xl p-4 text-sm leading-6 shadow-md bg-gray-50 border border-gray-200">
                            {navigationFerias?.map((item) => (
                                <div key={item.name} className="relative rounded-lg p-4 hover:bg-gray-50">
                                    <Link to={item.href} className="font-semibold text-gray-900">
                                        {item.name}
                                        <span className="absolute inset-0" />
                                    </Link>
                                    <p className="mt-1 text-gray-600">Acesse a área de {item.name}</p>
                                </div>
                            ))}
                        </div>
                    </Popover.Panel>
                </Transition>
            </Popover>
        </>
    );
};

export default Navbar;
