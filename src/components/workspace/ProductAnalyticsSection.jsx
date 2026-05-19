/**
 * Product Analytics Module — DAU/WAU/MAU, Retention, Conversion, Growth
 */
import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useWorkspaceStore } from '@/lib/store';
import { Users, TrendingUp, TrendingDown, RefreshCw, Filter, Target, Zap, AlertTriangle } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

function KPICard({ label, value, unit = '', sub, color = 'text-cyan-400', icon: IconComponent }) {
  const Icon = IconComponent;
  return (
    <div className="p-4 rounded-2xl border border-white/8 bg-white/2">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-white/35 uppercase tracking-widest">{label}</span>
        {Icon && <Icon className={`w-4 h-4 ${color} opacity-50`} />}
      </div>
      <div className={`text-2xl font-black ${color}`}>{value}{unit}</div>
      {sub && <div className="text-xs text-white/30 mt-1">{sub}</div>}
    </div>
  );
}

function detectProductColumns(columns = []) {
  const names = columns.map(c => c.name?.toLowerCase() || '');
  return {
    userId: columns.find(c => /user_id|userid|customer_id|uid/.test(c.name?.toLowerCase()))?.name,
    date: columns.find(c => /date|day|timestamp|created_at|event_date/.test(c.name?.toLowerCase()))?.name,
    event: columns.find(c => /event|action|type|activity/.test(c.name?.toLowerCase()))?.name,
    conversion: columns.find(c => /convert|purchase|signup|activated|completed/.test(c.name?.toLowerCase()))?.name,
    revenue: columns.find(c => /revenue|amount|value|price|spend/.test(c.name?.toLowerCase()))?.name,
    segment: columns.find(c => /segment|cohort|group|tier|plan|channel/.test(c.name?.toLowerCase()))?.name,
  };
}

function computeProductMetrics(rows = [], cols) {
  if (!rows.length) return null;
  const today = new Date();
  const msPerDay = 86400000;

  const getDate = (r) => {
    if (!cols.date) return null;
    const d = new Date(r[cols.date]);
    return isNaN(d) ? null : d;
  };

  const totalUsers = new Set(rows.map(r => r[cols.userId])).size || rows.length;

  // DAU / WAU / MAU by most recent dates in data
  const allDates = rows.map(r => getDate(r)).filter(Boolean).sort((a, b) => b - a);
  const latestDate = allDates[0] || today;

  const dau = cols.userId ? new Set(rows.filter(r => {
    const d = getDate(r);
    return d && Math.abs(d - latestDate) < msPerDay;
  }).map(r => r[cols.userId])).size : 0;

  const wau = cols.userId ? new Set(rows.filter(r => {
    const d = getDate(r);
    return d && (latestDate - d) / msPerDay <= 7;
  }).map(r => r[cols.userId])).size : 0;

  const mau = cols.userId ? new Set(rows.filter(r => {
    const d = getDate(r);
    return d && (latestDate - d) / msPerDay <= 30;
  }).map(r => r[cols.userId])).size : 0;

  // Activation / Retention / Churn — proxy from data
  const firstSeen = {};
  rows.forEach(r => {
    const uid = r[cols.userId] || r.id || Math.random();
    const d = getDate(r);
    if (!d) return;
    if (!firstSeen[uid] || d < firstSeen[uid]) firstSeen[uid] = d;
  });

  const newUsersLast30 = Object.values(firstSeen).filter(d => (latestDate - d) / msPerDay <= 30).length;
  const returningUsers = cols.userId ? new Set(rows.filter(r => {
    const uid = r[cols.userId];
    const d = getDate(r);
    return uid && d && firstSeen[uid] && (d - firstSeen[uid]) / msPerDay > 1;
  }).map(r => r[cols.userId])).size : 0;

  const retentionRate = totalUsers > 0 ? ((returningUsers / totalUsers) * 100).toFixed(1) : 0;
  const churnRate = (100 - parseFloat(retentionRate)).toFixed(1);

  // Conversion
  let conversionRate = 0;
  if (cols.conversion) {
    const converted = rows.filter(r => {
      const v = r[cols.conversion];
      return v === true || v === 1 || v === 'true' || v === 'yes' || v === '1';
    }).length;
    conversionRate = ((converted / rows.length) * 100).toFixed(1);
  }

  // Revenue / day trend (last 14 days)
  const dailyRevenue = {};
  const dailyUsers = {};
  rows.forEach(r => {
    const d = getDate(r);
    if (!d) return;
    const key = d.toISOString().split('T')[0];
    dailyRevenue[key] = (dailyRevenue[key] || 0) + (parseFloat(r[cols.revenue]) || 1);
    if (cols.userId) {
      if (!dailyUsers[key]) dailyUsers[key] = new Set();
      dailyUsers[key].add(r[cols.userId]);
    }
  });

  const trendData = Object.keys(dailyRevenue).sort().slice(-14).map(day => ({
    day: day.slice(5),
    value: Math.round(dailyRevenue[day] * 100) / 100,
    users: dailyUsers[day]?.size || 0,
  }));

  // Segment breakdown
  let segments = [];
  if (cols.segment) {
    const segMap = {};
    rows.forEach(r => {
      const s = r[cols.segment] || 'Unknown';
      segMap[s] = (segMap[s] || 0) + 1;
    });
    segments = Object.entries(segMap).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([seg, count]) => ({
      segment: seg, count, pct: ((count / rows.length) * 100).toFixed(1),
    }));
  }

  return { totalUsers, dau, wau, mau, retentionRate, churnRate, conversionRate, trendData, segments, newUsersLast30, returningUsers };
}

export default function ProductAnalyticsSection() {
  const { getActiveTable } = useWorkspaceStore();
  const table = getActiveTable();
  const [activeMetric, setActiveMetric] = useState('users');

  const cols = useMemo(() => detectProductColumns(table?.columns || []), [table]);
  const metrics = useMemo(() => computeProductMetrics(table?.rows || [], cols), [table, cols]);

  if (!table) {
    return (
      <div className="p-8 flex flex-col items-center justify-center h-full text-center">
        <Users className="w-12 h-12 text-white/15 mb-4" />
        <h3 className="font-bold text-lg mb-1">No Dataset Loaded</h3>
        <p className="text-sm text-muted-foreground">Upload a dataset with user_id, date, and activity columns to unlock product analytics.</p>
      </div>
    );
  }

  const missingCols = Object.entries(cols).filter(([k, v]) => !v).map(([k]) => k);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-teal-400/10 border border-teal-400/20 flex items-center justify-center">
          <Users className="w-5 h-5 text-teal-400" />
        </div>
        <div>
          <h2 className="text-xl font-black">Product Analytics</h2>
          <p className="text-xs text-muted-foreground">DAU · WAU · MAU · Retention · Conversion · Growth</p>
        </div>
      </div>

      {/* Column detection */}
      <div className="flex flex-wrap gap-2 p-3 rounded-xl bg-white/2 border border-white/8">
        {Object.entries(cols).map(([k, v]) => (
          <span key={k} className={`text-xs px-2 py-1 rounded-full border font-mono ${v ? 'bg-green-400/10 border-green-400/20 text-green-400' : 'bg-white/5 border-white/10 text-white/25'}`}>
            {k}: {v || '—'}
          </span>
        ))}
      </div>

      {missingCols.length > 0 && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-400/8 border border-amber-400/20 text-amber-400 text-xs">
          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
          Columns not detected: {missingCols.join(', ')}. Metrics may be estimated from available data.
        </div>
      )}

      {metrics && (
        <>
          {/* KPI Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KPICard label="Total Users" value={metrics.totalUsers.toLocaleString()} icon={Users} color="text-purple-400" sub={`${metrics.newUsersLast30} new (30d)`} />
            <KPICard label="DAU" value={metrics.dau.toLocaleString()} icon={TrendingUp} color="text-cyan-400" sub="Daily active users" />
            <KPICard label="WAU" value={metrics.wau.toLocaleString()} icon={TrendingUp} color="text-teal-400" sub="Weekly active users" />
            <KPICard label="MAU" value={metrics.mau.toLocaleString()} icon={TrendingUp} color="text-green-400" sub="Monthly active users" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KPICard label="Retention Rate" value={`${metrics.retentionRate}%`} icon={RefreshCw} color="text-green-400" sub="Returning / Total" />
            <KPICard label="Churn Rate" value={`${metrics.churnRate}%`} icon={TrendingDown} color="text-red-400" sub="Lost / Total" />
            <KPICard label="Conversion Rate" value={cols.conversion ? `${metrics.conversionRate}%` : 'N/A'} icon={Target} color="text-amber-400" sub="Completed / Started" />
            <KPICard label="DAU/MAU Ratio" value={metrics.mau > 0 ? `${((metrics.dau / metrics.mau) * 100).toFixed(1)}%` : 'N/A'} icon={Zap} color="text-pink-400" sub="Stickiness index" />
          </div>

          {/* Trend chart */}
          {metrics.trendData.length > 1 && (
            <div className="p-5 rounded-2xl border border-white/8 bg-white/2">
              <div className="flex items-center gap-3 mb-4">
                <div className="text-xs text-white/35 uppercase tracking-widest">Daily Activity Trend (Last 14 Days)</div>
                <div className="flex gap-1 ml-auto">
                  {['users', 'value'].map(m => (
                    <button key={m} onClick={() => setActiveMetric(m)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all capitalize ${activeMetric === m ? 'bg-cyan-400/15 text-cyan-400' : 'text-white/30 hover:text-white/60'}`}>
                      {m === 'users' ? 'Users' : 'Volume'}
                    </button>
                  ))}
                </div>
              </div>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={metrics.trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="day" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} />
                  <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} />
                  <Tooltip contentStyle={{ background: 'hsl(222,44%,9%)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10 }} />
                  <Line type="monotone" dataKey={activeMetric} stroke="#00e5ff" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Segment breakdown */}
          {metrics.segments.length > 0 && (
            <div className="p-5 rounded-2xl border border-white/8 bg-white/2">
              <div className="text-xs text-white/35 uppercase tracking-widest mb-4">User Segment Distribution</div>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={metrics.segments} layout="vertical">
                  <XAxis type="number" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} unit="%" />
                  <YAxis type="category" dataKey="segment" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }} width={80} />
                  <Tooltip contentStyle={{ background: 'hsl(222,44%,9%)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10 }} formatter={(v) => [`${v}%`, 'Share']} />
                  <Bar dataKey="pct" fill="#2dd4bf" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Formula reference */}
          <div className="p-4 rounded-xl bg-white/2 border border-white/8 grid grid-cols-2 md:grid-cols-3 gap-3 text-xs font-mono">
            {[
              'DAU = distinct users (today)',
              'WAU = distinct users (7d)',
              'MAU = distinct users (30d)',
              'Retention = Returning / Total × 100',
              'Churn = (1 − Retention) × 100',
              'Stickiness = DAU / MAU × 100',
            ].map(f => (
              <div key={f} className="text-white/30 px-2 py-1.5 bg-white/3 rounded-lg">{f}</div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}