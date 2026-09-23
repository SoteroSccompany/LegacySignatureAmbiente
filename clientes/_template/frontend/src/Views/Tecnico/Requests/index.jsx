import { Fragment, useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../../Context';
import { AuthContextApi } from '../../../Context/api';
import { jsonConfig } from '../../../Config';
import NavMenu from '../../../Components/NavMenu/Tecnico';
import Header from '../../../Components/Header';
import CardMetricas from '../../../Components/Cards/Metricas';
import { Dialog, Transition } from '@headlessui/react';
import {
    DocumentTextIcon,
    EyeIcon,
    XMarkIcon,
    MagnifyingGlassIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
    GlobeAltIcon,
    CodeBracketIcon,
    CalendarIcon,
    UserIcon,
    ChartBarIcon
} from '@heroicons/react/24/outline';

const Requests = () => {
    const navigate = useNavigate();
    const { states, setters } = useContext(AuthContext);
    const {
        checkLogin,
        getRequestsMetricas,
        getRequests
    } = useContext(AuthContextApi);

    const [selectedSortField, setSelectedSortField] = useState('data_criacao');
    const [sortDirection, setSortDirection] = useState('desc');
    const [recordsPerPage, setRecordsPerPage] = useState(10);
    const [viewingRequest, setViewingRequest] = useState(null);
    const [showViewModal, setShowViewModal] = useState(false);

    const sortOptions = [
        { value: 'data_criacao', label: 'Data de Criação' },
        { value: 'method', label: 'Método HTTP' },
        { value: 'endpoint', label: 'Endpoint' },
        { value: 'status_code', label: 'Status Code' },
        { value: 'duration_ms', label: 'Duração' },
        { value: 'user_email', label: 'Usuário' }
    ];

    const primeiroLoad = async () => {
        if (jsonConfig.uiMock) {
            setters.setDataRequests([
                {
                    id: 1,
                    method: 'POST',
                    endpoint: '/documentos/solicitacao',
                    status_code: 200,
                    duration_ms: 142,
                    user_email: 'gabriel@netexperts.com.br',
                    data_criacao: '2026-08-09 09:10:00',
                },
            ]);
            return;
        }
        await getRequestsMetricas();
        await getRequests('page=0&per_page=10&sort=data_criacao&sort_dir=desc');
        await checkLogin();
    };

    const loadRequests = async () => {
        const params = new URLSearchParams({
            page: states.page.toString(),
            per_page: recordsPerPage.toString(),
            sort: selectedSortField,
            sort_dir: sortDirection
        });
        await getRequests(params.toString());
    };

    const next = () => {
        setters.setPage(states.page + 1);
    };

    const previous = () => {
        if (states.page > 0) {
            setters.setPage(states.page - 1);
        }
    };

    const openViewModal = (request) => {
        setViewingRequest(request);
        setShowViewModal(true);
    };

    const closeViewModal = () => {
        setViewingRequest(null);
        setShowViewModal(false);
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleString('pt-BR');
    };

    const formatDuration = (ms) => {
        if (ms < 1000) return `${ms}ms`;
        return `${(ms / 1000).toFixed(2)}s`;
    };

    const getStatusColor = (statusCode) => {
        if (statusCode >= 200 && statusCode < 300) return 'text-emerald-700 bg-emerald-50';
        if (statusCode >= 400 && statusCode < 500) return 'text-amber-700 bg-amber-50';
        if (statusCode >= 500) return 'text-rose-700 bg-rose-50';
        return 'text-brand-soft bg-brand-tip';
    };

    const getMethodColor = (method) => {
        switch (method) {
            case 'GET': return 'text-brand-teal bg-brand-tip';
            case 'POST': return 'text-emerald-700 bg-emerald-50';
            case 'PUT': return 'text-amber-700 bg-amber-50';
            case 'PATCH': return 'text-brand-teal bg-brand-tip';
            case 'DELETE': return 'text-rose-700 bg-rose-50';
            default: return 'text-brand-soft bg-brand-tip';
        }
    };

    const safeJson = (raw, fallback) => {
        if (!raw) return fallback;
        try {
            return JSON.stringify(typeof raw === 'string' ? JSON.parse(raw) : raw, null, 2);
        } catch {
            return String(raw);
        }
    };

    useEffect(() => {
        primeiroLoad();
        return () => {
            setters.setDataEstatisticaRequests([]);
            setters.setDataRequests([]);
            setters.setPage(0);
        };
    }, []);

    useEffect(() => {
        loadRequests();
    }, [states.page, sortDirection, selectedSortField, recordsPerPage]);

    const general = states.dataEstatisticaRequests?.general;
    const metricas = general
        ? [
            { id: 1, title: 'Total de Requests', value: general.total_requests || 0 },
            { id: 2, title: 'Sucessos', value: general.success_requests || 0 },
            { id: 3, title: 'Erros Cliente', value: general.client_errors || 0 },
            { id: 4, title: 'Erros Servidor', value: general.server_errors || 0 },
        ]
        : [];

    return (
        <div>
            <Header
                title="Requests do Sistema"
                description="Monitoramento e análise de requisições da API"
                icon={DocumentTextIcon}
                hasReturn
                buttonReturnAction={() => navigate('/tecnicoIndex')}
            />
            <div className="p-6">
                <NavMenu />

                {metricas.length > 0 && <CardMetricas dataMetricas={metricas} />}

                <div className="bg-white border border-gray-100 rounded-brand p-4 mb-4 shadow-sm">
                    <div className="flex items-center gap-2 mb-3">
                        <MagnifyingGlassIcon className="w-4 h-4 text-brand-teal" />
                        <h2 className="text-sm font-bold uppercase tracking-wider text-brand-soft m-0">
                            Configurações de exibição
                        </h2>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        <div>
                            <label className="block text-xs font-semibold text-brand-soft mb-1">Ordenar por</label>
                            <select
                                value={selectedSortField}
                                onChange={(e) => setSelectedSortField(e.target.value)}
                                className="w-full rounded-brand border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-teal bg-white"
                            >
                                {sortOptions.map((option) => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-brand-soft mb-1">Direção</label>
                            <select
                                value={sortDirection}
                                onChange={(e) => setSortDirection(e.target.value)}
                                className="w-full rounded-brand border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-teal bg-white"
                            >
                                <option value="asc">Crescente</option>
                                <option value="desc">Decrescente</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-brand-soft mb-1">Registros por página</label>
                            <select
                                value={recordsPerPage}
                                onChange={(e) => setRecordsPerPage(Number(e.target.value))}
                                className="w-full rounded-brand border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-teal bg-white"
                            >
                                <option value={5}>5</option>
                                <option value={10}>10</option>
                                <option value={20}>20</option>
                                <option value={50}>50</option>
                            </select>
                        </div>

                        <div className="flex items-end">
                            <button
                                type="button"
                                onClick={loadRequests}
                                className="w-full inline-flex items-center justify-center gap-2 bg-brand-teal hover:bg-brand-teal-dark text-white text-sm font-semibold px-4 py-2 rounded-brand"
                            >
                                <MagnifyingGlassIcon className="w-4 h-4" />
                                Atualizar
                            </button>
                        </div>
                    </div>
                </div>

                <div className="bg-white border border-gray-100 rounded-brand overflow-hidden shadow-sm">
                    <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
                        <ChartBarIcon className="w-4 h-4 text-brand-teal" />
                        <div>
                            <h3 className="text-sm font-semibold text-brand-navy m-0">Histórico de Requests</h3>
                            <p className="text-xs text-brand-soft m-0">Lista detalhada das requisições do sistema</p>
                        </div>
                    </div>

                    {!states.dataRequests?.length ? (
                        <div className="p-10 text-center text-sm text-brand-soft">
                            Nenhuma request encontrada.
                        </div>
                    ) : (
                        <ul className="divide-y divide-gray-50 m-0 p-0 list-none">
                            {states.dataRequests.map((request) => (
                                <li key={request.id} className="px-4 py-4 hover:bg-brand-tip/40 transition-colors">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0 flex-1">
                                            <div className="flex flex-wrap items-center gap-2 mb-2">
                                                <span className={`px-2.5 py-1 rounded-brand text-xs font-semibold ${getMethodColor(request.method)}`}>
                                                    {request.method}
                                                </span>
                                                <span className={`px-2.5 py-1 rounded-brand text-xs font-semibold ${getStatusColor(request.status_code)}`}>
                                                    {request.status_code}
                                                </span>
                                                <span className="text-xs text-brand-soft">
                                                    {formatDuration(request.duration_ms)}
                                                </span>
                                            </div>
                                            <div className="space-y-1.5">
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <CodeBracketIcon className="w-4 h-4 text-brand-soft shrink-0" />
                                                    <span className="text-sm font-semibold text-brand-navy truncate">
                                                        {request.endpoint}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <UserIcon className="w-4 h-4 text-brand-soft shrink-0" />
                                                    <span className="text-xs text-brand-soft truncate">
                                                        {request.user_email || '—'}
                                                    </span>
                                                </div>
                                                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-brand-soft">
                                                    <span className="inline-flex items-center gap-1">
                                                        <GlobeAltIcon className="w-3.5 h-3.5" />
                                                        IP: {request.ip || '—'}
                                                    </span>
                                                    <span className="inline-flex items-center gap-1">
                                                        <CalendarIcon className="w-3.5 h-3.5" />
                                                        {formatDate(request.data_criacao)}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => openViewModal(request)}
                                            className="inline-flex items-center gap-1 text-sm font-semibold text-brand-teal hover:underline shrink-0"
                                        >
                                            <EyeIcon className="w-4 h-4" />
                                            Detalhes
                                        </button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}

                    {states.dataRequests?.length > 0 && (
                        <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
                            <span className="text-sm text-brand-soft">
                                Página {states.page + 1} · {recordsPerPage} por página
                            </span>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={previous}
                                    disabled={states.page <= 0}
                                    className="inline-flex items-center px-3 py-2 text-sm font-semibold text-brand-ink bg-white border border-gray-200 rounded-brand hover:bg-brand-tip disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <ChevronLeftIcon className="w-4 h-4 mr-1" />
                                    Anterior
                                </button>
                                <button
                                    type="button"
                                    onClick={next}
                                    disabled={states.dataRequests?.length < recordsPerPage}
                                    className="inline-flex items-center px-3 py-2 text-sm font-semibold text-brand-ink bg-white border border-gray-200 rounded-brand hover:bg-brand-tip disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Próximo
                                    <ChevronRightIcon className="w-4 h-4 ml-1" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <Transition appear show={showViewModal && !!viewingRequest} as={Fragment}>
                <Dialog as="div" className="relative z-50" onClose={closeViewModal}>
                    <Transition.Child
                        as={Fragment}
                        enter="ease-out duration-200"
                        enterFrom="opacity-0"
                        enterTo="opacity-100"
                        leave="ease-in duration-150"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                    >
                        <div className="fixed inset-0 bg-brand-navy/50" />
                    </Transition.Child>
                    <div className="fixed inset-0 overflow-y-auto">
                        <div className="flex min-h-full items-center justify-center p-4">
                            {viewingRequest && (
                                <Dialog.Panel className="w-full max-w-4xl bg-white rounded-brand shadow-brand p-6 max-h-[90vh] overflow-y-auto">
                                    <div className="flex items-start justify-between gap-3 mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 rounded-brand bg-brand-tip">
                                                <DocumentTextIcon className="w-5 h-5 text-brand-teal" />
                                            </div>
                                            <Dialog.Title className="font-display text-xl text-brand-navy m-0">
                                                Detalhes da Request
                                            </Dialog.Title>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={closeViewModal}
                                            className="p-2 text-brand-soft hover:text-brand-navy hover:bg-brand-tip rounded-brand"
                                        >
                                            <XMarkIcon className="w-5 h-5" />
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-4">
                                            <div className="bg-brand-tip rounded-brand p-4">
                                                <h4 className="text-sm font-bold text-brand-navy mb-3 m-0">Informações básicas</h4>
                                                <div className="space-y-3">
                                                    <div>
                                                        <label className="text-xs font-semibold text-brand-soft">ID</label>
                                                        <p className="text-sm text-brand-ink font-mono m-0 break-all">{viewingRequest.id}</p>
                                                    </div>
                                                    <div>
                                                        <label className="text-xs font-semibold text-brand-soft">Método</label>
                                                        <div className="mt-1">
                                                            <span className={`inline-block px-2.5 py-1 rounded-brand text-xs font-semibold ${getMethodColor(viewingRequest.method)}`}>
                                                                {viewingRequest.method}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <label className="text-xs font-semibold text-brand-soft">Endpoint</label>
                                                        <p className="text-sm text-brand-ink font-mono m-0 break-all">{viewingRequest.endpoint}</p>
                                                    </div>
                                                    <div>
                                                        <label className="text-xs font-semibold text-brand-soft">Status</label>
                                                        <div className="mt-1">
                                                            <span className={`inline-block px-2.5 py-1 rounded-brand text-xs font-semibold ${getStatusColor(viewingRequest.status_code)}`}>
                                                                {viewingRequest.status_code}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <label className="text-xs font-semibold text-brand-soft">Duração</label>
                                                        <p className="text-sm text-brand-ink m-0">{formatDuration(viewingRequest.duration_ms)}</p>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="bg-white border border-gray-100 rounded-brand p-4">
                                                <h4 className="text-sm font-bold text-brand-navy mb-3 m-0">Origem</h4>
                                                <div className="space-y-3">
                                                    <div>
                                                        <label className="text-xs font-semibold text-brand-soft">Usuário</label>
                                                        <p className="text-sm text-brand-ink m-0">{viewingRequest.user_email || '—'}</p>
                                                    </div>
                                                    <div>
                                                        <label className="text-xs font-semibold text-brand-soft">IP</label>
                                                        <p className="text-sm text-brand-ink m-0">{viewingRequest.ip || '—'}</p>
                                                    </div>
                                                    <div>
                                                        <label className="text-xs font-semibold text-brand-soft">Criação</label>
                                                        <p className="text-sm text-brand-ink m-0">{formatDate(viewingRequest.data_criacao)}</p>
                                                    </div>
                                                    <div>
                                                        <label className="text-xs font-semibold text-brand-soft">Atualização</label>
                                                        <p className="text-sm text-brand-ink m-0">
                                                            {viewingRequest.data_atualizacao
                                                                ? formatDate(viewingRequest.data_atualizacao)
                                                                : '—'}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <div className="bg-white border border-gray-100 rounded-brand p-4">
                                                <h4 className="text-sm font-bold text-brand-navy mb-2 m-0">Body</h4>
                                                <pre className="text-xs text-brand-ink bg-brand-tip p-3 rounded-brand overflow-x-auto m-0">
                                                    {safeJson(viewingRequest.body, 'Nenhum body')}
                                                </pre>
                                            </div>
                                            <div className="bg-white border border-gray-100 rounded-brand p-4">
                                                <h4 className="text-sm font-bold text-brand-navy mb-2 m-0">Query</h4>
                                                <pre className="text-xs text-brand-ink bg-brand-tip p-3 rounded-brand overflow-x-auto m-0">
                                                    {safeJson(viewingRequest.query, 'Nenhum query')}
                                                </pre>
                                            </div>
                                            <div className="bg-white border border-gray-100 rounded-brand p-4">
                                                <h4 className="text-sm font-bold text-brand-navy mb-2 m-0">Headers</h4>
                                                <pre className="text-xs text-brand-ink bg-brand-tip p-3 rounded-brand overflow-x-auto m-0">
                                                    {safeJson(viewingRequest.headers, 'Nenhum header')}
                                                </pre>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-6 flex justify-end">
                                        <button
                                            type="button"
                                            onClick={closeViewModal}
                                            className="text-sm font-semibold text-brand-soft hover:text-brand-navy"
                                        >
                                            Fechar
                                        </button>
                                    </div>
                                </Dialog.Panel>
                            )}
                        </div>
                    </div>
                </Dialog>
            </Transition>
        </div>
    );
};

export default Requests;
