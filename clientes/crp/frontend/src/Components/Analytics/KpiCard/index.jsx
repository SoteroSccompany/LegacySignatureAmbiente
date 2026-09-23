const KpiCard = ({ title, value, subtitle }) => (
    <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{title}</p>
        <p className="text-xl font-bold text-gray-900 mt-1">{value}</p>
        {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
    </div>
)

export default KpiCard
