import { Fragment } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Popover, Transition } from '@headlessui/react';
import {
    ChevronDownIcon,
    WrenchScrewdriverIcon,
    ExclamationTriangleIcon,
    DocumentTextIcon,
} from '@heroicons/react/24/outline';

const nav = [
    {
        name: 'Painel',
        href: '/tecnicoIndex',
        icon: WrenchScrewdriverIcon,
    },
    {
        name: 'Logs',
        href: '/tecnicoIndex/logs',
        icon: ExclamationTriangleIcon,
    },
    {
        name: 'Requests',
        href: '/tecnicoIndex/requests',
        icon: DocumentTextIcon,
    }
]

const Navbar = () => {
    const location = useLocation();
    const [items, setItems] = useState(nav);

    useEffect(() => {
        setItems(nav.map((item) => ({
            ...item,
            current: location.pathname === item.href
                || (item.href !== '/tecnicoIndex' && location.pathname.startsWith(item.href)),
        })));
    }, [location.pathname]);

    const current = items.find((i) => i.current) || items[0];
    const CurrentIcon = current?.icon || WrenchScrewdriverIcon;

    return (
        <div className="mb-4">
            <div className="hidden lg:flex bg-white border border-gray-100 rounded-brand p-1 shadow-sm gap-1">
                {items.map((item) => {
                    const IconComponent = item.icon;
                    return (
                        <Link
                            key={item.href}
                            to={item.href}
                            className={`flex flex-1 items-center justify-center gap-2 px-3 py-2 rounded-brand text-sm font-semibold transition-colors ${
                                item.current
                                    ? 'bg-brand-navy text-white'
                                    : 'text-brand-soft hover:bg-brand-tip hover:text-brand-navy'
                            }`}
                        >
                            <IconComponent className="w-4 h-4" />
                            {item.name}
                        </Link>
                    );
                })}
            </div>

            <div className="lg:hidden">
                <Popover className="relative">
                    <Popover.Button className="w-full inline-flex items-center justify-between px-4 py-2.5 bg-white border border-gray-100 rounded-brand shadow-sm text-sm font-semibold text-brand-navy">
                        <span className="inline-flex items-center gap-2">
                            <CurrentIcon className="w-4 h-4 text-brand-teal" />
                            {current?.name || 'Área Técnica'}
                        </span>
                        <ChevronDownIcon className="h-4 w-4 text-brand-soft" />
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
                        <Popover.Panel className="absolute z-50 mt-2 w-full">
                            <div className="bg-white rounded-brand shadow-brand border border-gray-100 p-1 space-y-0.5">
                                {items.map((item) => {
                                    const IconComponent = item.icon;
                                    return (
                                        <Link
                                            key={item.href}
                                            to={item.href}
                                            className={`flex items-center gap-2 px-3 py-2.5 rounded-brand text-sm font-semibold ${
                                                item.current
                                                    ? 'bg-brand-navy text-white'
                                                    : 'text-brand-ink hover:bg-brand-tip'
                                            }`}
                                        >
                                            <IconComponent className="w-4 h-4" />
                                            {item.name}
                                        </Link>
                                    );
                                })}
                            </div>
                        </Popover.Panel>
                    </Transition>
                </Popover>
            </div>
        </div>
    );
};

export default Navbar;
