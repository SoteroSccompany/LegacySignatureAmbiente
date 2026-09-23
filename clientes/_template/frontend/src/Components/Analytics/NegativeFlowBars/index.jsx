const NegativeFlowBars = ({ title, items = [] }) => {
    const valid = items.slice(0, 8)
    const max = Math.max(...valid.map((i) => Math.abs(i.value)), 1)

    return (
        <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">{title}</h3>
            <div className="space-y-2">
                {valid.map((item) => {
                    const width = Math.max(6, Math.round((Math.abs(item.value) / max) * 100))
                    return (
                        <div key={item.label} className="grid grid-cols-[90px_1fr_90px] items-center gap-2">
                            <p className="text-[11px] text-gray-500 truncate">{item.label}</p>
                            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                <div
                                    className="h-full rounded-full bg-red-500"
                                    style={{ width: `${width}%` }}
                                />
                            </div>
                            <p className="text-xs font-semibold text-red-600 text-right truncate">{item.displayValue}</p>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

export default NegativeFlowBars
