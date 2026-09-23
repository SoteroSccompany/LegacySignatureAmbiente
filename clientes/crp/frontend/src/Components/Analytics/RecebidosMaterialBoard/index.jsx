const RecebidosMaterialBoard = ({ title, items = [] }) => {
    const valid = items.slice(0, 6)
    const max = Math.max(...valid.map((i) => i.valor), 1)

    return (
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
                <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
            </div>

            <div className="p-4 space-y-3">
                {valid.map((item, idx) => {
                    const pct = Math.max(6, Math.round((item.valor / max) * 100))
                    return (
                        <div key={`${item.label}-${idx}`} className="rounded-xl border border-gray-100 bg-gray-50/70 p-3">
                            <div className="flex items-center justify-between mb-2">
                                <p className="text-sm font-semibold text-gray-900">{item.label}</p>
                                <p className="text-xs font-semibold text-gray-700">{item.displayValue}</p>
                            </div>
                            <div className="h-2.5 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                    className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-500"
                                    style={{ width: `${pct}%` }}
                                />
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

export default RecebidosMaterialBoard
