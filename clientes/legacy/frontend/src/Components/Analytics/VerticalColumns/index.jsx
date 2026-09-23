const VerticalColumns = ({ title, items = [] }) => {
    const valid = items.filter((i) => Number(i.value) > 0).slice(0, 8)
    const max = Math.max(...valid.map((i) => i.value), 1)

    if (valid.length === 0) {
        return (
            <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
                <h3 className="text-sm font-semibold text-gray-900 mb-4">{title}</h3>
                <div className="flex items-center justify-center h-28 text-center">
                    <p className="text-xs text-gray-400">Sem dados para exibir no período selecionado.</p>
                </div>
            </div>
        )
    }

    return (
        <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">{title}</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {valid.map((item) => {
                    const height = Math.max(10, Math.round((item.value / max) * 90))
                    return (
                        <div key={item.label} className="bg-gray-50 rounded-xl p-2 border border-gray-100">
                            <div className="h-24 flex items-end justify-center">
                                <div className="w-8 rounded-t-md bg-cyan-500" style={{ height: `${height}%` }} />
                            </div>
                            <p className="text-[10px] text-gray-400 uppercase tracking-wide mt-2 truncate text-center">{item.label}</p>
                            <p className="text-xs font-semibold text-gray-800 truncate text-center">{item.displayValue}</p>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

export default VerticalColumns
