import { Users, Activity, Brain, Database, AlertTriangle, BarChart2, FileText, TrendingUp, Eye, Zap } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

const TOOLTIP_STYLE = { backgroundColor: 'rgba(4,9,20,0.95)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, fontSize: 11 };

function KPICard({ label, value, icon: CardIcon, color, sub }) {
  return (
    <div className="glass-card rounded-2xl border border-white/8 p-4 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-white/35 font-semibold">{label}</span>
        <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: color + '18', border: `1px solid ${color}30` }}>
          <CardIcon className="w-4 h-4" style={{ color }} />
        </div>
      </div>
      <div className="text-3xl font-black font-mono" style={{ color }}>{value ?? '—'}</div>
      {sub && <div className="text-xs text-white/25">{sub}</div>}
    </div>
  );
}

export default function AdminOverview({ overview = {}, featureUsage = [], pageViewsByDay = {} }) {
  const dayData = Object.entries(pageViewsByDay)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-7)
    .map(([date, count]) => ({ date: date.slice(5), views: count }));

  const kpis = [
    { label: 'Total Users',         value: overview.totalUsers,         icon: Users,         color: '#00e5ff', sub: `${overview.newUsersToday || 0} new today` },
    { label: 'Active Today',         value: overview.activeToday,         icon: Activity,      color: '#4caf50', sub: `${overview.activeThisWeek || 0} this week` },
    { label: 'Total Sessions',       value: overview.totalSessions,       icon: Eye,           color: '#a855f7', sub: 'all time' },
    { label: 'Total Page Views',     value: overview.totalPageViews,      icon: BarChart2,     color: '#00bfa5', sub: 'all time' },
    { label: 'AI Questions Asked',   value: overview.totalAIQuestions,    icon: Brain,         color: '#ff6b35', sub: 'all time' },
    { label: 'Datasets Uploaded',    value: overview.totalUploads,        icon: Database,      color: '#ffcc02', sub: 'all time' },
    { label: 'Charts Created',       value: overview.totalChartsCreated,  icon: TrendingUp,    color: '#60a5fa', sub: 'all time' },
    { label: 'Reports Generated',    value: overview.totalReports,        icon: FileText,      color: '#f472b6', sub: 'all time' },
    { label: 'Open Errors',          value: overview.totalErrors,         icon: AlertTriangle, color: '#ef4444', sub: 'unresolved' },
    { label: 'New Users Today',      value: overview.newUsersToday,       icon: Zap,           color: '#34d399', sub: 'registered today' },
  ];

  return (
    <div className="space-y-8">
      {/* KPI grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {kpis.map(k => <KPICard key={k.label} {...k} />)}
      </div>

      {/* Page views trend */}
      {dayData.length > 0 && (
        <div className="glass-card rounded-2xl border border-white/8 p-5">
          <div className="flex items-center gap-2 mb-4">
            <BarChart2 className="w-4 h-4 text-cyan-400" />
            <span className="text-sm font-bold">Page Views — Last 7 Days</span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={dayData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.3)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.3)' }} axisLine={false} tickLine={false} width={32} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Bar dataKey="views" fill="#00e5ff" fillOpacity={0.75} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Top features */}
      {featureUsage.length > 0 && (
        <div className="glass-card rounded-2xl border border-white/8 p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-purple-400" />
            <span className="text-sm font-bold">Feature Usage Ranking</span>
          </div>
          <div className="space-y-2">
            {featureUsage.slice(0, 10).map((f, i) => {
              const max = featureUsage[0]?.count || 1;
              return (
                <div key={f.feature} className="flex items-center gap-3 text-sm">
                  <span className="w-5 text-xs text-white/25 font-mono">{i + 1}</span>
                  <span className="w-40 truncate text-white/65 text-xs">{f.feature}</span>
                  <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-purple-400/60" style={{ width: `${(f.count / max) * 100}%` }} />
                  </div>
                  <span className="text-xs font-mono text-white/35 w-10 text-right">{f.count}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}