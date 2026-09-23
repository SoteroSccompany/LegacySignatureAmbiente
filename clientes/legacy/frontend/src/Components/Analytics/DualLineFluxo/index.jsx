import { useMemo, useState } from 'react'
import { formatCurrency } from '../../../utils/obraAnalytics'

const CHART = { width: 640, height: 220, padX: 48, padY: 24 }

const THEME = {
    emerald: { line: '#10b981', text: 'text-emerald-700', tooltip: 'text-emerald-300' },
    rose: { line: '#f43f5e', text: 'text-rose-700', tooltip: 'text-rose-300' },
    cyan: { line: '#0891b2', text: 'text-cyan-700', tooltip: 'text-cyan-300' },
    amber: { line: '#f59e0b', text: 'text-amber-700', tooltip: 'text-amber-300' },
}

const DualLineFluxo = ({
    title,
    items = [],
    keyA = 'receitas',
    keyB = 'despesas',
    labelA = 'Faturamento',
    labelB = 'Despesas',
    labelResultado = 'Resultado',
    colorA = 'emerald',
    colorB = 'rose',
}) => {
    const [hover, setHover] = useState(null)
    const valid = items.filter((i) => i.label)
    const themeA = THEME[colorA] || THEME.emerald
    const themeB = THEME[colorB] || THEME.rose

    const layout = useMemo(() => {
        if (valid.length === 0) return null
        const max = Math.max(...valid.flatMap((i) => [Number(i[keyA] || 0), Number(i[keyB] || 0)]), 1)
        const innerW = CHART.width - CHART.padX * 2
        const innerH = CHART.height - CHART.padY * 2
        const step = valid.length > 1 ? innerW / (valid.length - 1) : 0

        const toY = (v) => CHART.padY + innerH - (Number(v || 0) / max) * innerH

        const points = valid.map((item, idx) => {
            const x = CHART.padX + idx * step
            return {
                ...item,
                x,
                yA: toY(item[keyA]),
                yB: toY(item[keyB]),
            }
        })

        const line = (key) => points.map((p) => `${p.x},${p[key]}`).join(' ')

        return { points, max, lineA: line('yA'), lineB: line('yB') }
    }, [valid, keyA, keyB])

    if (!layout) {
        return (
            <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
                <h3 className="text-sm font-semibold text-gray-900 mb-4">{title}</h3>
                <div className="flex items-center justify-center h-40 text-center">
                    <p className="text-xs text-gray-400">Sem dados para exibir no período selecionado.</p>
                </div>
            </div>
        )
    }

    const active = hover != null ? layout.points[hover] : null
    const resultado = active ? Number(active.resultado ?? (Number(active[keyA] || 0) - Number(active[keyB] || 0))) : 0

    return (
        <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
                <div className="flex items-center gap-4 text-[11px] font-semibold">
                    <span className={`flex items-center gap-1.5 ${themeA.text}`}>
                        <span className="w-3 h-0.5 rounded-full" style={{ backgroundColor: themeA.line }} /> {labelA}
                    </span>
                    <span className={`flex items-center gap-1.5 ${themeB.text}`}>
                        <span className="w-3 h-0.5 rounded-full" style={{ backgroundColor: themeB.line }} /> {labelB}
                    </span>
                </div>
            </div>

            <div className="relative overflow-x-auto">
                <svg width={CHART.width} height={CHART.height} viewBox={`0 0 ${CHART.width} ${CHART.height}`} className="mx-auto min-w-[320px]">
                    {[0, 0.5, 1].map((t) => {
                        const y = CHART.padY + (CHART.height - CHART.padY * 2) * t
                        return (
                            <line key={t} x1={CHART.padX} y1={y} x2={CHART.width - CHART.padX} y2={y} stroke="#f3f4f6" strokeWidth="1" />
                        )
                    })}

                    <polyline fill="none" stroke={themeA.line} strokeWidth="2.5" points={layout.lineA} strokeLinecap="round" strokeLinejoin="round" />
                    <polyline fill="none" stroke={themeB.line} strokeWidth="2.5" points={layout.lineB} strokeLinecap="round" strokeLinejoin="round" />

                    {layout.points.map((p, idx) => (
                        <g key={`${p.label}-${idx}`}>
                            <circle cx={p.x} cy={p.yA} r="8" fill="transparent" className="cursor-pointer" onMouseEnter={() => setHover(idx)} onMouseLeave={() => setHover(null)} />
                            <circle cx={p.x} cy={p.yB} r="8" fill="transparent" className="cursor-pointer" onMouseEnter={() => setHover(idx)} onMouseLeave={() => setHover(null)} />
                            <circle cx={p.x} cy={p.yA} r={hover === idx ? 5 : 3.5} fill={themeA.line} className="pointer-events-none transition-all" />
                            <circle cx={p.x} cy={p.yB} r={hover === idx ? 5 : 3.5} fill={themeB.line} className="pointer-events-none transition-all" />
                        </g>
                    ))}

                    {active && (
                        <g className="pointer-events-none">
                            <line x1={active.x} y1={CHART.padY} x2={active.x} y2={CHART.height - CHART.padY} stroke="#d1d5db" strokeDasharray="4 4" />
                        </g>
                    )}
                </svg>

                {active && (
                    <div
                        className="absolute z-10 bg-gray-900 text-white text-xs rounded-xl px-3 py-2 shadow-lg pointer-events-none min-w-[180px]"
                        style={{
                            left: `clamp(8px, ${((active.x / CHART.width) * 100).toFixed(1)}%, calc(100% - 200px))`,
                            top: 8,
                            transform: active.x > CHART.width * 0.65 ? 'translateX(-40%)' : 'translateX(-8px)',
                        }}
                    >
                        <p className="font-bold text-brand-yellow mb-1.5">{active.label}</p>
                        <p className={themeA.tooltip}>{labelA}: {formatCurrency(active[keyA])}</p>
                        <p className={themeB.tooltip}>{labelB}: {formatCurrency(active[keyB])}</p>
                        <p className={`mt-1 pt-1 border-t border-gray-700 font-semibold ${resultado >= 0 ? 'text-emerald-200' : 'text-rose-200'}`}>
                            {labelResultado}: {formatCurrency(resultado)}
                        </p>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mt-3">
                {layout.points.map((p, idx) => (
                    <button
                        key={`${p.label}-${idx}`}
                        type="button"
                        onMouseEnter={() => setHover(idx)}
                        onMouseLeave={() => setHover(null)}
                        className={`rounded-lg px-2 py-1.5 text-left transition-colors ${hover === idx ? 'bg-gray-100 ring-1 ring-gray-200' : 'bg-gray-50'}`}
                    >
                        <p className="text-[10px] text-gray-400 uppercase tracking-wide truncate">{p.label}</p>
                        <p className={`text-[10px] font-semibold truncate ${themeA.text}`}>{formatCurrency(p[keyA])}</p>
                        <p className={`text-[10px] font-semibold truncate ${themeB.text}`}>{formatCurrency(p[keyB])}</p>
                    </button>
                ))}
            </div>
        </div>
    )
}

export default DualLineFluxo
