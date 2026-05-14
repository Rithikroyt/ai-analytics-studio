import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LineChart, Line } from 'recharts';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

const TOOLTIP_STYLE = { backgroundColor: 'rgba(4,9,20,0.95)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, fontSize: 11 };
const AXIS_STYLE = { fontSize: 9, fill: 'rgba(255,255,255,0.28)' };

const FEATURE_COLORS = {
  'Visual Builder': '#00e5ff', 'AI Analyst': '#a855f7', 'Agent Studio': '#ff6b35',
  'SQL Studio': '#4caf50', 'Forecast Hub': '#ffcc02', 'Reports': '#f472b6',
  'Data Quality': '#00bfa5', 'Data Prep': '#60a5fa', 'Dashboards': '#fb923c',
  'Upload Data': '#34d399',
};

export default function AdminFeatureUsage({ featureUsage = [], recentEvents = [] }) {
  const max = featureUsage[0]?.count || 1;

  // Day-by-day usage per feature (top 5)
  const top5 = featureUsage.slice(0, 5).map(f => f.feature);
  const dayMap = {};
  recentEvents.filter(e => e.feature && top5.includes(e.feature)).forEach(e => {
    const day = (e.timestamp || '').slice(0, 10);
    if (!day) return;
    if (!dayMap[day]) dayMap[day] = {};
    dayMap[day][e.feature] = (dayMap[day][e.feature] || 0) + 1;
  });

  const trendData = Object.entries(dayMap).sort((a, b) => a[0].localeCompare(b[0])).slice(-7).map(([date, feats]) => ({
    date: date.slice(5), ...feats
  }));

  // Sessions per feature (unique users)
  const featureUsers = {};
  recentEvents.filter(e => e.feature).forEach(e => {
    if (!featureUsers[e.feature]) featureUsers[e.feature] = new Set();
    if (e.userEmail) featureUsers[e.feature].add(e.userEmail);
  });

  return (
    <div className="space-y-6">
      {/* Usage bar chart */}
      <div className="glass-card rounded-2xl border border-white/8 p-5">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-4 h-4 text-cyan-400" />
          <span className="text-sm font-bold">Feature Usage — All Time</span>
        </div>
        {featureUsage.length > 0 ? (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={featureUsage.slice(0, 12)} layout="vertical" margin={{ left: 80, right: 20, top: 4, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis type="number" tick={AXIS_STYLE} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="feature" tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.5)' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Bar dataKey="count" radius={[0, 4, 4, 0]} fill="#00e5ff" fillOpacity={0.7} />
            </BarChart>
          </ResponsiveContainer>
        ) : <p className="text-sm text-white/30 py-8 text-center">No feature usage data yet.</p>}
      </div>

      {/* Trend lines */}
      {trendData.length > 1 && (
        <div className="glass-card rounded-2xl border border-white/8 p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-purple-400" />
            <span className="text-sm font-bold">Top Features — 7 Day Trend</span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="date" tick={AXIS_STYLE} axisLine={false} tickLine={false} />
              <YAxis tick={AXIS_STYLE} axisLine={false} tickLine={false} width={28} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              {top5.map((f, i) => (
                <Line key={f} type="monotone" dataKey={f} stroke={Object.values(FEATURE_COLORS)[i] || '#00e5ff'}
                  strokeWidth={2} dot={false} />
              ))}
            </LineChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-3 mt-3">
            {top5.map((f, i) => (
              <div key={f} className="flex items-center gap-1.5 text-xs text-white/45">
                <div className="w-3 h-0.5 rounded" style={{ background: Object.values(FEATURE_COLORS)[i] || '#00e5ff' }} />
                {f}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Feature detail cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {featureUsage.slice(0, 9).map((f, i) => {
          const uniqueUsers = featureUsers[f.feature]?.size || 0;
          const color = FEATURE_COLORS[f.feature] || '#00e5ff';
          return (
            <div key={f.feature} className="glass-card rounded-xl border border-white/8 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white/60 truncate">{f.feature}</span>
                <span className="text-xs text-white/20">#{i + 1}</span>
              </div>
              <div className="text-2xl font-black font-mono" style={{ color }}>{f.count}</div>
              <div className="text-xs text-white/25">{uniqueUsers} unique user{uniqueUsers !== 1 ? 's' : ''}</div>
              <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${(f.count / max) * 100}%`, background: color }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}