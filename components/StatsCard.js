export default function StatsCard({ title, value, icon, trend, trendValue, color = 'purple' }) {
  const colorClasses = {
    purple: 'bg-[#AC9AFD]/10 text-[#AC9AFD]',
    green: 'bg-emerald-100 text-emerald-600',
    yellow: 'bg-amber-100 text-amber-600',
    red: 'bg-red-100 text-red-600',
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 flex items-start gap-4 hover:-translate-y-0.5 hover:shadow-lg transition-all">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${colorClasses[color]}`}>
        {icon}
      </div>
      <div className="flex-1">
        <p className="text-sm text-slate-500 mb-1">{title}</p>
        <p className="text-3xl font-bold text-slate-800 leading-tight">{value}</p>
        {trend && (
          <p className={`text-xs mt-2 ${trend === 'up' ? 'text-emerald-600' : 'text-red-600'}`}>
            {trend === 'up' ? '↑' : '↓'} {trendValue}
          </p>
        )}
      </div>
    </div>
  );
}
