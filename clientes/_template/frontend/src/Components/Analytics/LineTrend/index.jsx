const buildPoints = (items) => {
    const width = 360
    const height = 140
    const max = Math.max(...items.map((i) => i.value), 1)
    const step = items.length > 1 ? width / (items.length - 1) : width
    return items.map((item, idx) => {
        const x = idx * step
        const y = height - (item.value / max) * (height - 20) - 10
        return `${x},${y}`
    }).join(' ')
}

const LineTrend = ({ title, items = [] }) => {
    const valid = items.filter((i) => Number(i.value) > 0).slice(0, 10)

    if (valid.length === 0) {
        return (
            <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
                <h3 className="text-sm font-semibold text-gray-900 mb-4">{title}</h3>
                <div className="flex items-center justify-center h-32 text-center">
                    <p className="text-xs text-gray-400">Sem dados para exibir no período selecionado.</p>
                </div>
            </div>
        )
    }

    const points = buildPoints(valid)

    return (
        <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">{title}</h3>
            <div className="overflow-x-auto">
                <svg width="360" height="140" viewBox="0 0 360 140" className="mx-auto">
                    <polyline
                        fill="none"
                        stroke="#ffcd00"
                        strokeWidth="3"
                        points={points}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                    {valid.map((item, idx) => {
                        const coords = points.split(' ')[idx].split(',')
                        return (
                            <circle
                                key={item.label}
                                cx={Number(coords[0])}
                                cy={Number(coords[1])}
                                r="3.5"
                                fill="#111827"
                            />
                        )
                    })}
                </svg>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mt-3">
                {valid.slice(0, 5).map((item) => (
                    <div key={item.label} className="bg-gray-50 rounded-lg px-2 py-1.5">
                        <p className="text-[10px] text-gray-400 uppercase tracking-wide truncate">{item.label}</p>
                        <p className="text-xs font-semibold text-gray-800 truncate">{item.displayValue}</p>
                    </div>
                ))}
            </div>
        </div>
    )
}

export default LineTrend
