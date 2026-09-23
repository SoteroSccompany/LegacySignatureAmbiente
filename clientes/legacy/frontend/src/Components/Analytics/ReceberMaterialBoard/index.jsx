const ReceberMaterialBoard = ({ title, items = [] }) => {
    const valid = items.slice(0, 4)
    const max = Math.max(...valid.map((i) => i.parcelaValor), 1)

    return (
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
                <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
            </div>

            <div className="p-4 grid grid-cols-1 lg:grid-cols-2 gap-3">
                {valid.map((item) => {
                    const pct = Math.max(6, Math.round((item.parcelaValor / max) * 100))
                    return (
                        <div key={item.id} className="rounded-2xl border border-gray-100 bg-gray-50/70 p-4">
                            <div className="mb-2">
                                <p className="text-sm font-semibold text-gray-900">{item.parcela}</p>
                                <p className="text-xs text-gray-400">Vencimento: {item.vencimento}</p>
                            </div>

                            <div className="space-y-1.5 mb-3">
                                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                    <div className="h-full bg-blue-500 rounded-full" style={{ width: `${pct}%` }} />
                                </div>
                                <div className="flex items-center justify-between text-[11px]">
                                    <span className="text-gray-500">Parcela</span>
                                    <span className="font-semibold text-gray-800">{item.parcelaDisplay}</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-2">
                                <Metric label="Principal" value={item.principalDisplay} />
                                <Metric label="Juros" value={item.jurosDisplay} />
                                <Metric label="Identificador" value={item.identificador} compact />
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

const Metric = ({ label, value, compact = false }) => (
    <div className="bg-white border border-gray-100 rounded-xl px-2.5 py-2">
        <p className="text-[10px] uppercase tracking-wide text-gray-400">{label}</p>
        <p className={`font-semibold text-gray-800 ${compact ? 'text-[11px] truncate' : 'text-xs'}`}>{value || '-'}</p>
    </div>
)

export default ReceberMaterialBoard
