import { useState } from 'react'
import { MinusIcon, PlusIcon } from '@heroicons/react/24/outline'

const GroupedCompareBars = ({ title, items = [] }) => {
    const valid = items.slice(0, 6)
    const [scale, setScale] = useState(1)
    const max = Math.max(
        ...valid.flatMap((item) => [item.principal, item.juros, item.parcela]),
        1
    )

    const widthPct = (value) => `${Math.min(100, Math.max(4, Math.round(((value * scale) / max) * 100)))}%`

    return (
        <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setScale((prev) => Math.max(0.5, Number((prev - 0.1).toFixed(1))))}
                        className="p-1.5 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                        title="Reduzir escala"
                    >
                        <MinusIcon className="w-4 h-4" />
                    </button>
                    <span className="text-xs font-semibold text-gray-500 min-w-[46px] text-center">
                        x{scale.toFixed(1)}
                    </span>
                    <button
                        onClick={() => setScale((prev) => Math.min(2, Number((prev + 0.1).toFixed(1))))}
                        className="p-1.5 rounded-lg bg-gray-900 text-brand-yellow hover:opacity-90 transition-colors"
                        title="Aumentar escala"
                    >
                        <PlusIcon className="w-4 h-4" />
                    </button>
                </div>
            </div>
            <div className="space-y-4">
                {valid.map((item) => (
                    <div key={item.label} className="bg-gray-50 border border-gray-100 rounded-xl p-3">
                        <p className="text-xs font-semibold text-gray-700 mb-2">{item.label}</p>
                        <div className="space-y-2">
                            <Row label="Principal" color="bg-amber-500" width={widthPct(item.principal)} value={item.principalDisplay} />
                            <Row label="Juros" color="bg-orange-500" width={widthPct(item.juros)} value={item.jurosDisplay} />
                            <Row label="Parcela" color="bg-yellow-500" width={widthPct(item.parcela)} value={item.parcelaDisplay} />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}

const Row = ({ label, color, width, value }) => (
    <div className="grid grid-cols-[64px_1fr_84px] items-center gap-2">
        <span className="text-[11px] text-gray-500">{label}</span>
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div className={`h-full rounded-full ${color}`} style={{ width }} />
        </div>
        <span className="text-xs font-semibold text-gray-800 text-right truncate">{value}</span>
    </div>
)

export default GroupedCompareBars
