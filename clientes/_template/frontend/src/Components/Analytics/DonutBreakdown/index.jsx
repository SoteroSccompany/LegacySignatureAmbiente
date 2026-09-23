const getSegments = (items) => {
    const total = items.reduce((acc, item) => acc + item.value, 0) || 1
    let cursor = 0
    return items.map((item) => {
        const size = (item.value / total) * 360
        const seg = {
            ...item,
            start: cursor,
            end: cursor + size,
        }
        cursor += size
        return seg
    })
}

const DonutBreakdown = ({ title, items = [] }) => {
    const valid = items.filter((item) => item.value > 0)

    if (valid.length === 0) {
        return (
            <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
                <h3 className="text-sm font-semibold text-gray-900 mb-4">{title}</h3>
                <div className="flex flex-col items-center justify-center h-40 text-center">
                    <div className="w-12 h-12 rounded-full border-4 border-gray-100 mb-3" />
                    <p className="text-xs text-gray-400">Sem dados para exibir no período selecionado.</p>
                </div>
            </div>
        )
    }

    const segments = getSegments(valid)
    const gradient = segments.length
        ? `conic-gradient(${segments.map((s) => `${s.color} ${s.start}deg ${s.end}deg`).join(', ')})`
        : 'conic-gradient(#e5e7eb 0deg 360deg)'

    return (
        <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">{title}</h3>
            <div className="flex flex-col md:flex-row items-center gap-5">
                <div className="relative w-40 h-40 rounded-full" style={{ background: gradient }}>
                    <div className="absolute inset-5 bg-white rounded-full flex items-center justify-center">
                        <span className="text-xs font-semibold text-gray-500">Distribuição</span>
                    </div>
                </div>
                <div className="flex-1 space-y-2 w-full">
                    {valid.map((item) => (
                        <div key={item.label} className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                                <span className="text-gray-600 font-medium">{item.label}</span>
                            </div>
                            <span className="text-gray-900 font-semibold">{item.displayValue}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}

export default DonutBreakdown
