import { Fragment, useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../../Context';
import { AuthContextApi } from '../../../Context/api';
import {
    ExclamationTriangleIcon,
    DocumentTextIcon,
    CodeBracketIcon,
    CalendarIcon,
    MagnifyingGlassIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
    EyeIcon,
    XMarkIcon
} from '@heroicons/react/24/outline';
import { Dialog, Transition } from '@headlessui/react';
import NavMenu from '../../../Components/NavMenu/Tecnico';
import Header from '../../../Components/Header';
import CardMetricas from '../../../Components/Cards/Metricas';
import { jsonConfig } from '../../../Config';


const Logs = () => {
    const navigate = useNavigate()
    const { states, setters } = useContext(AuthContext)
    const { checkLogin,
        getLogsDataSistema,
        getLogs,
        getLogsMetricas
    } = useContext(AuthContextApi)

    const [selectedSortField, setSelectedSortField] = useState('data_criacao')
    const [sortDirection, setSortDirection] = useState('desc')
    const [recordsPerPage, setRecordsPerPage] = useState(10)
    const [viewingLog, setViewingLog] = useState(null)
    const [showViewModal, setShowViewModal] = useState(false)

    const sortOptions = [
        { value: 'data_criacao', label: 'Data de Criação' },
        { value: 'data_atualizacao', label: 'Data de Atualização' },
        { value: 'linhaDoErro', label: 'Linha do Erro' },
        { value: 'nomeDoArquivo', label: 'Nome do Arquivo' }
    ]

    const primeiroLoad = async () => {
        if (jsonConfig.uiMock) {
            setters.setDataLogs([
                {
                    id: 1,
                    nomeDoArquivo: 'ProcessarHashInicial',
                    linhaDoErro: 120,
                    data_criacao: '2026-08-08 11:03:00',
                    mensagem: 'Falha simulada no carimbo (demo UI)',
                },
            ])
            return
        }
        await getLogsDataSistema()
        await getLogsMetricas()
        const params = new URLSearchParams({
            page: 0,
            per_page: recordsPerPage,
            sort: selectedSortField,
            sort_dir: sortDirection
        })
        await getLogs(params.toString())
        await checkLogin()
    }

    const loadLogs = async () => {
        const params = new URLSearchParams({
            page: states.page || 0,
            per_page: recordsPerPage,
            sort: selectedSortField,
            sort_dir: sortDirection
        })
        await getLogs(params.toString())
    }

    const next = async () => {
        setters.setPage(states.page + 1)
    }

    const previous = async () => {
        if (states.page > 0) {
            setters.setPage(states.page - 1)
        }
    }

    const openViewModal = async (log) => {
        setViewingLog(log)
        setShowViewModal(true)
    }

    const closeViewModal = () => {
        setViewingLog(null)
        setShowViewModal(false)
    }

    useEffect(() => {
        primeiroLoad()

        return () => {
            setters.setDataEstatisticaLogs([])
            setters.setDataLogs([])
            setters.setLogs({})
            setters.setPage(0)
            setters.setModalLogs(false)
        }

    }, [])

    useEffect(() => {
        loadLogs()
    }, [states.page, sortDirection, selectedSortField, recordsPerPage])

    const metricas = (states.dataEstatisticaLogs || []).map((card, index) => ({
        id: index,
        title: card.title,
        value: card.value,
    }))

    return (
        <div>
            <Header
                title="Logs do Sistema"
                description="Monitoramento e análise de eventos e erros do sistema"
                icon={ExclamationTriangleIcon}
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
                            <label className="block text-xs font-semibold text-brand-soft mb-1">Campo de ordenação</label>
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
                                <option value="asc">Crescente (A-Z)</option>
                                <option value="desc">Decrescente (Z-A)</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-brand-soft mb-1">Registros por página</label>
                            <select
                                value={recordsPerPage}
                                onChange={(e) => setRecordsPerPage(Number(e.target.value))}
                                className="w-full rounded-brand border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-teal bg-white"
                            >
                                <option value={5}>5 registros</option>
                                <option value={10}>10 registros</option>
                                <option value={20}>20 registros</option>
                                <option value={50}>50 registros</option>
                            </select>
                        </div>

                        <div className="flex items-end">
                            <button
                                type="button"
                                onClick={() => loadLogs()}
                                className="w-full inline-flex items-center justify-center gap-2 bg-brand-teal hover:bg-brand-teal-dark text-white text-sm font-semibold px-4 py-2 rounded-brand"
                            >
                                <MagnifyingGlassIcon className="w-4 h-4" />
                                Atualizar
                            </button>
                        </div>
                    </div>
                </div>

                {states.loading ? (
                    <p className="text-sm text-brand-soft">Carregando logs…</p>
                ) : states.dataLogs && states.dataLogs.length > 0 ? (
                    <ul className="space-y-3 m-0 p-0 list-none mb-4">
                        {states.dataLogs.map((log) => (
                            <li
                                key={log.id}
                                className="bg-white border border-gray-100 rounded-brand p-4 shadow-sm"
                            >
                                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <ExclamationTriangleIcon className="w-4 h-4 text-rose-600 shrink-0" />
                                            <p className="text-sm font-semibold text-brand-navy m-0 truncate">
                                                Log #{String(log.id).slice(0, 8)}…
                                            </p>
                                        </div>
                                        <p className="text-xs text-brand-soft m-0 mb-3">
                                            {log.nomeDoArquivo?.split('/').pop() || 'Arquivo não identificado'}
                                        </p>
                                        <div className="space-y-2">
                                            <div className="flex items-start gap-2">
                                                <DocumentTextIcon className="w-4 h-4 text-brand-soft mt-0.5 shrink-0" />
                                                <div>
                                                    <p className="text-xs font-semibold text-brand-soft m-0">Descrição</p>
                                                    <p className="text-sm text-brand-ink m-0 line-clamp-2">
                                                        {log.descricaoDoErro || log.mensagem || 'Sem descrição disponível'}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4 text-xs text-brand-soft">
                                                <span className="inline-flex items-center gap-1">
                                                    <CodeBracketIcon className="w-3.5 h-3.5" />
                                                    Linha {log.linhaDoErro || 'N/A'}
                                                </span>
                                                <span className="inline-flex items-center gap-1">
                                                    <CalendarIcon className="w-3.5 h-3.5" />
                                                    {new Date(log.data_criacao).toLocaleString('pt-BR')}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => openViewModal(log)}
                                        className="inline-flex items-center gap-1 text-sm font-semibold text-brand-teal hover:underline shrink-0"
                                        title="Visualizar detalhes"
                                    >
                                        <EyeIcon className="w-4 h-4" />
                                        Detalhes
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <div className="bg-white border border-gray-100 rounded-brand p-10 text-center text-sm text-brand-soft">
                        Nenhum log encontrado.
                    </div>
                )}

                {states.dataLogs && states.dataLogs.length > 0 && (
                    <div className="flex items-center justify-between bg-white border border-gray-100 rounded-brand p-4 shadow-sm">
                        <span className="text-sm text-brand-soft">
                            Página {states.page + 1} — {states.dataLogs.length} logs
                        </span>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={previous}
                                disabled={states.page === 0}
                                className="inline-flex items-center px-3 py-2 text-sm font-semibold text-brand-ink bg-white border border-gray-200 rounded-brand hover:bg-brand-tip disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <ChevronLeftIcon className="w-4 h-4 mr-1" />
                                Anterior
                            </button>
                            <button
                                type="button"
                                onClick={next}
                                className="inline-flex items-center px-3 py-2 text-sm font-semibold text-brand-ink bg-white border border-gray-200 rounded-brand hover:bg-brand-tip"
                            >
                                Próximo
                                <ChevronRightIcon className="w-4 h-4 ml-1" />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <Transition appear show={showViewModal && !!viewingLog} as={Fragment}>
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
                            {viewingLog && (
                                <Dialog.Panel className="w-full max-w-3xl bg-white rounded-brand shadow-brand p-6 max-h-[90vh] overflow-y-auto">
                                    <div className="flex items-start justify-between gap-3 mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 rounded-brand bg-rose-50">
                                                <ExclamationTriangleIcon className="w-5 h-5 text-rose-600" />
                                            </div>
                                            <div>
                                                <Dialog.Title className="font-display text-xl text-brand-navy m-0">
                                                    Detalhes do Log
                                                </Dialog.Title>
                                                <p className="text-xs text-brand-soft m-0 mt-0.5">
                                                    Informações completas do erro
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={closeViewModal}
                                            className="p-2 text-brand-soft hover:text-brand-navy hover:bg-brand-tip rounded-brand"
                                        >
                                            <XMarkIcon className="w-5 h-5" />
                                        </button>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="bg-brand-tip rounded-brand p-4">
                                            <h3 className="text-sm font-bold text-brand-navy mb-3 m-0">Informações básicas</h3>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                <div>
                                                    <label className="block text-xs font-semibold text-brand-soft mb-1">ID</label>
                                                    <p className="text-sm text-brand-ink font-mono bg-white border border-gray-100 rounded-brand px-3 py-2 m-0 break-all">
                                                        {viewingLog.id}
                                                    </p>
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-semibold text-brand-soft mb-1">Linha do erro</label>
                                                    <p className="text-sm text-brand-ink bg-white border border-gray-100 rounded-brand px-3 py-2 m-0">
                                                        {viewingLog.linhaDoErro || 'N/A'}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="bg-white border border-gray-100 rounded-brand p-4">
                                            <h3 className="text-sm font-bold text-brand-navy mb-2 m-0">Descrição do erro</h3>
                                            <p className="text-sm text-brand-ink whitespace-pre-wrap m-0">
                                                {viewingLog.descricaoDoErro || viewingLog.mensagem || 'Sem descrição disponível'}
                                            </p>
                                        </div>

                                        <div className="bg-white border border-gray-100 rounded-brand p-4">
                                            <h3 className="text-sm font-bold text-brand-navy mb-2 m-0">Arquivo</h3>
                                            <p className="text-sm text-brand-ink font-mono break-all m-0">
                                                {viewingLog.nomeDoArquivo || 'Arquivo não identificado'}
                                            </p>
                                        </div>

                                        <div className="bg-white border border-gray-100 rounded-brand p-4">
                                            <h3 className="text-sm font-bold text-brand-navy mb-3 m-0">Datas</h3>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                <div>
                                                    <label className="block text-xs font-semibold text-brand-soft mb-1">Criação</label>
                                                    <p className="text-sm text-brand-ink m-0">
                                                        {new Date(viewingLog.data_criacao).toLocaleString('pt-BR')}
                                                    </p>
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-semibold text-brand-soft mb-1">Atualização</label>
                                                    <p className="text-sm text-brand-ink m-0">
                                                        {viewingLog.data_atualizacao
                                                            ? new Date(viewingLog.data_atualizacao).toLocaleString('pt-BR')
                                                            : '—'}
                                                    </p>
                                                </div>
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
    )
}

export default Logs;
