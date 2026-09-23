import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { use, useEffect, useState } from 'react'
import { colorMap, perPageOptionsSearch } from '../../../Common'






const FormBusca = ({ filterOptions, sortOptions, search, handleClear, color, items, haveData }) => {
    // Mapeamento completo de cores para classes Tailwind

    // Seleciona as classes baseadas na cor fornecida, com fallback para indigo
    const colorClasses = colorMap[color] || colorMap.indigo

    const clear = () => {
        items.setSearchTerm('')
        items.setSelectedFilterField(filterOptions[0].value)
        items.setSelectedSortField(sortOptions[0].value)
        items.setSortDirection('desc')
        items.setRecordsPerPage(10)
        handleClear()
    }

    const handleSearch = () => {
        search({
            searchTerm: items.searchTerm,
            selectedFilterField: items.selectedFilterField,
            selectedSortField: items.selectedSortField,
            sortDirection: items.sortDirection,
            recordsPerPage: items.recordsPerPage
        })
    }

    useEffect(() => {
        if (haveData) {
            search({
                searchTerm: items.searchTerm,
                selectedFilterField: items.selectedFilterField,
                selectedSortField: items.selectedSortField,
                sortDirection: items.sortDirection,
                recordsPerPage: items.recordsPerPage
            })
        }
    }, [items.selectedSortField, items.sortDirection, items.recordsPerPage, items.selectedFilterField])

    return (
        <div className={`relative bg-gradient-to-br ${colorClasses.containerBg} backdrop-blur-sm rounded-3xl shadow-lg border ${colorClasses.border} mb-8 overflow-hidden`}>
            <div className={`absolute inset-0 bg-gradient-to-br ${colorClasses.overlayBg}`}></div>
            <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${colorClasses.decorationBg} rounded-full -translate-y-16 translate-x-16`}></div>
            <div className="relative p-6">
                <div className="flex items-center mb-4">
                    <div className={`p-3 rounded-2xl bg-gradient-to-r ${colorClasses.iconBg} shadow-lg mr-4`}>
                        <MagnifyingGlassIcon className="w-6 h-6 text-white" />
                    </div>
                    <h2 className={`text-2xl font-bold bg-gradient-to-r ${colorClasses.textGradient} bg-clip-text text-transparent`}>
                        Pesquisa Avançada
                    </h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Termo de Busca</label>
                        <input
                            type="text"
                            value={items.searchTerm}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    handleSearch()
                                }
                            }}
                            onChange={(e) => items.setSearchTerm(e.target.value)}
                            placeholder="Digite para buscar..."
                            className={`w-full px-4 py-3 border ${colorClasses.inputBorder} rounded-2xl focus:ring-2 ${colorClasses.focusRing} focus:border-transparent transition-all duration-300 bg-white/80 backdrop-blur-sm`}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Campo de Filtro</label>
                        <select
                            value={items.selectedFilterField}
                            onChange={(e) => items.setSelectedFilterField(e.target.value)}
                            className={`w-full px-4 py-3 border ${colorClasses.inputBorder} rounded-2xl focus:ring-2 ${colorClasses.focusRing} focus:border-transparent transition-all duration-300 bg-white/80 backdrop-blur-sm`}
                        >
                            {filterOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Campo de Ordenação</label>
                        <select
                            value={items.selectedSortField}
                            onChange={(e) => items.setSelectedSortField(e.target.value)}
                            className={`w-full px-4 py-3 border ${colorClasses.inputBorder} rounded-2xl focus:ring-2 ${colorClasses.focusRing} focus:border-transparent transition-all duration-300 bg-white/80 backdrop-blur-sm`}
                        >
                            {sortOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Direção da Ordenação</label>
                        <select
                            value={items.sortDirection}
                            onChange={(e) => items.setSortDirection(e.target.value)}
                            className={`w-full px-4 py-3 border ${colorClasses.inputBorder} rounded-2xl focus:ring-2 ${colorClasses.focusRing} focus:border-transparent transition-all duration-300 bg-white/80 backdrop-blur-sm`}
                        >
                            <option value="asc">Crescente (A-Z)</option>
                            <option value="desc">Decrescente (Z-A)</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Registros por Página</label>
                        <select
                            value={items.recordsPerPage}
                            onChange={(e) => items.setRecordsPerPage(Number(e.target.value))}
                            className={`w-full px-4 py-3 border ${colorClasses.inputBorder} rounded-2xl focus:ring-2 ${colorClasses.focusRing} focus:border-transparent transition-all duration-300 bg-white/80 backdrop-blur-sm`}
                        >
                            {perPageOptionsSearch.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4">
                    <button
                        onClick={handleSearch}
                        className={`flex-1 group relative inline-flex items-center justify-center px-6 py-3 border border-transparent rounded-2xl shadow-lg text-sm font-semibold text-white bg-gradient-to-r ${colorClasses.buttonPrimary} ${colorClasses.buttonPrimaryHover} focus:outline-none focus:ring-2 focus:ring-offset-2 ${colorClasses.focusRingOffset} transition-all duration-300 transform hover:scale-105`}
                    >
                        <div className="relative z-10 flex items-center">
                            <MagnifyingGlassIcon className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform duration-200" />
                            <span>Buscar</span>
                        </div>
                        <div className={`absolute inset-0 bg-gradient-to-r ${colorClasses.buttonOverlay} rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300`}></div>
                    </button>

                    <button
                        onClick={clear}
                        className={`flex-1 group relative inline-flex items-center justify-center px-6 py-3 border ${colorClasses.buttonSecondaryBorder} rounded-2xl shadow-lg text-sm font-semibold ${colorClasses.buttonSecondaryText} bg-gradient-to-r ${colorClasses.buttonSecondaryBg} ${colorClasses.buttonSecondaryBgHover} focus:outline-none focus:ring-2 focus:ring-offset-2 ${colorClasses.focusRingOffset} transition-all duration-300 transform hover:scale-105`}
                    >
                        <div className="relative z-10 flex items-center">
                            <XMarkIcon className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform duration-200" />
                            <span>Limpar</span>
                        </div>
                        <div className={`absolute inset-0 bg-gradient-to-r ${colorClasses.buttonOverlay} rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300`}></div>
                    </button>
                </div>
            </div>
        </div>
    )
}

export default FormBusca;