const normalize = (value, max) => {
    if (!max) return 0
    return Math.max(5, Math.round((value / max) * 100))
}

const PerformanceBars = ({ title, items = [] }) => {
    const valid = items.filter((item) => Number(item.value) > 0)
    const maxValue = Math.max(...valid.map((item) => item.value), 0)

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
            <div className="space-y-3">
                {valid.map((item) => (
                    <div key={item.label}>
                        <div className="flex items-center justify-between text-xs mb-1">
                            <span className="font-medium text-gray-600">{item.label}</span>
                            <span className="font-semibold text-gray-900">{item.displayValue}</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-brand-yellow rounded-full transition-all duration-500"
                                style={{ width: `${normalize(item.value, maxValue)}%` }}
                            />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}

export default PerformanceBars
