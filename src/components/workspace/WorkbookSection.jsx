import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useWorkspaceStore } from '@/lib/store';
import {
  Database, BarChart3, LineChart, TrendingUp, TableProperties,
  Hash, TrendingDown, Minus, AlertTriangle, CheckCircle2
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, LineChart as ReLineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine
} from 'recharts';

const tabs = [
  { id: 'scorecards', label: 'Scorecards', icon: Hash },
  { id: 'trends', label: 'Trends', icon: TrendingUp },
  { id: 'breakdown', label: 'Breakdown', icon: BarChart3 },
  { id: 'distribution', label: 'Distribution', icon: LineChart },
  { id: 'detail', label: 'Detail Table', icon: TableProperties },
];

const TOOLTIP_STYLE = {
  backgroundColor: 'rgba(8,6,18,0.95)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 10,
  fontSize: 11,
  color: '#e2e8f0',
};

const COLORS = ['#00e5ff', '#7b2fff', '#ff6b35', '#4caf50', '#ff2d7a', '#ffcc02', '#00bfa5'];
const axisStyle = { fontSize: 9, fill: 'rgba(255,255,255,0.35)' };

const fmtV = (v) => {
  if (v == null || isNaN(v)) return '—';
  const n = Number(v);
  if (Math.abs(n) >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
  if (Math.abs(n) >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (Math.abs(n) >= 1e3) return `${(n / 1e3).toFixed(0)}K`;
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
};

export default function WorkbookSection() {
  const [activeTab, setActiveTab] = useState('scorecards');
  const { analysisResults, getActiveTable, setActiveSection } = useWorkspaceStore();
  const table = getActiveTable();

  if (!analysisResults || !table) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[500px] text-center">
        <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/8 flex items-center justify-center mx-auto mb-4">
          <Database className="w-7 h-7 text-white/25" />
        </div>
        <h2 className="text-lg font-semibold mb-2">No Analysis Available</h2>
        <p className="text-muted-foreground text-sm mb-6 max-w-xs">Load data and run AI analysis in the Prepare section to open the workbook.</p>
        <button onClick={() => setActiveSection('intake')} className="px-5 py-2.5 bg-cyan-400/10 border border-cyan-400/20 text-cyan-400 rounded-xl text-sm font-semibold hover:bg-cyan-400/15 transition-colors">
          Upload Data
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-1 px-5 py-3 border-b border-white/5 overflow-x-auto flex-shrink-0">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
              activeTab === tab.id ? 'bg-cyan-400/10 text-cyan-400 border border-cyan-400/20' : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
            }`}>
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-auto p-5">
        <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          {activeTab === 'scorecards' && <ScorecardsTab results={analysisResults} table={table} />}
          {activeTab === 'trends' && <TrendsTab results={analysisResults} />}
          {activeTab === 'breakdown' && <BreakdownTab results={analysisResults} />}
          {activeTab === 'distribution' && <DistributionTab table={table} results={analysisResults} />}
          {activeTab === 'detail' && <DetailTab table={table} />}
        </motion.div>
      </div>
    </div>
  );
}

function ScorecardsTab({ results, table }) {
  const { primaryLabel, totalValue, secondLabel, secondValue, growthRate, breakdownData, anomalies, correlations } = results;

  const cards = [
    { label: primaryLabel || 'Primary KPI', value: fmtV(totalValue), sub: growthRate != null ? `${Number(growthRate) >= 0 ? '+' : ''}${growthRate}% overall trend` : 'No trend data', color: 'text-cyan-400', border: 'border-cyan-400/20', bg: 'bg-cyan-400/5', icon: growthRate >= 0 ? TrendingUp : TrendingDown, iconColor: growthRate >= 0 ? 'text-green-400' : 'text-red-400' },
    { label: 'Records', value: fmtV(table.rowCount), sub: `${table.columns?.length} columns`, color: 'text-teal-400', border: 'border-teal-400/20', bg: 'bg-teal-400/5', icon: Database, iconColor: 'text-teal-400' },
    { label: 'Quality Score', value: `${table.qualityScore}%`, sub: table.qualityScore >= 90 ? 'Excellent data quality' : table.qualityScore >= 70 ? 'Good quality' : 'Needs attention', color: table.qualityScore >= 90 ? 'text-green-400' : 'text-amber-400', border: table.qualityScore >= 90 ? 'border-green-400/20' : 'border-amber-400/20', bg: table.qualityScore >= 90 ? 'bg-green-400/5' : 'bg-amber-400/5', icon: table.qualityScore >= 90 ? CheckCircle2 : AlertTriangle, iconColor: table.qualityScore >= 90 ? 'text-green-400' : 'text-amber-400' },
    ...(secondLabel ? [{ label: secondLabel, value: fmtV(secondValue), sub: '', color: 'text-blue-400', border: 'border-blue-400/20', bg: 'bg-blue-400/5', icon: Hash, iconColor: 'text-blue-400' }] : []),
    ...(breakdownData?.length > 0 ? [{ label: 'Top Segment', value: breakdownData[0]?.name, sub: fmtV(breakdownData[0]?.value), color: 'text-purple-400', border: 'border-purple-400/20', bg: 'bg-purple-400/5', icon: BarChart3, iconColor: 'text-purple-400' }] : []),
    { label: 'Anomalies', value: String(anomalies?.length || 0), sub: anomalies?.length ? 'Statistical outliers detected' : 'No anomalies found', color: anomalies?.length ? 'text-amber-400' : 'text-green-400', border: anomalies?.length ? 'border-amber-400/20' : 'border-green-400/20', bg: anomalies?.length ? 'bg-amber-400/5' : 'bg-green-400/5', icon: AlertTriangle, iconColor: anomalies?.length ? 'text-amber-400' : 'text-green-400' },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {cards.map((c) => (
          <div key={c.label} className={`glass-card rounded-2xl p-4 border ${c.border} ${c.bg}`}>
            <div className="flex items-center gap-1.5 mb-2">
              <c.icon className={`w-3 h-3 ${c.iconColor}`} />
              <div className="text-xs text-muted-foreground uppercase tracking-wide">{c.label}</div>
            </div>
            <div className={`text-2xl font-black ${c.color} font-mono`}>{c.value}</div>
            {c.sub && <div className="text-xs text-muted-foreground mt-1 leading-tight">{c.sub}</div>}
          </div>
        ))}
      </div>

      {/* Correlations */}
      {correlations?.length > 0 && (
        <div className="glass-card rounded-2xl p-5 border border-white/5">
          <div className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-3">Top Correlations (Pearson r)</div>
          <div className="flex flex-wrap gap-2">
            {correlations.slice(0, 8).map((c, i) => {
              const strength = Math.abs(c.r);
              const color = strength > 0.7 ? 'text-green-400 bg-green-400/10 border-green-400/25' : strength > 0.5 ? 'text-amber-400 bg-amber-400/10 border-amber-400/25' : 'text-blue-400 bg-blue-400/10 border-blue-400/25';
              return (
                <div key={i} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs border ${color}`}>
                  <span className="font-mono">{c.colA.replace(/_/g, ' ')}</span>
                  <span className="opacity-50">↔</span>
                  <span className="font-mono">{c.colB.replace(/_/g, ' ')}</span>
                  <span className="font-black ml-1">{c.r > 0 ? '+' : ''}{c.r}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function TrendsTab({ results }) {
  const combined = [
    ...(results.trendData || []).map(d => ({ ...d, actual: d.value })),
    ...(results.forecastData || []).map(d => ({ ...d, forecast: d.value })),
  ];

  return (
    <div className="space-y-5">
      <div className="glass-card rounded-2xl p-5 border border-white/5">
        <div className="flex items-center justify-between mb-1">
          <div className="font-semibold text-sm">{results.primaryLabel || 'KPI'} Over Time</div>
          {results.growthRate != null && (
            <span className={`text-sm font-black font-mono ${Number(results.growthRate) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {Number(results.growthRate) >= 0 ? '▲' : '▼'} {Math.abs(results.growthRate)}%
            </span>
          )}
        </div>
        <div className="text-xs text-muted-foreground mb-4">
          {results.canForecast ? `Historical data + 6-period AI forecast (Exp. Smoothing + Linear Regression)` : 'Historical trend only'}
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={combined} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
            <defs>
              <linearGradient id="wbActual" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#00e5ff" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#00e5ff" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="wbForecast" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#9c27b0" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#9c27b0" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis dataKey="date" tick={axisStyle} tickLine={false} axisLine={false} interval="preserveStartEnd" />
            <YAxis tick={axisStyle} tickFormatter={fmtV} tickLine={false} axisLine={false} width={44} />
            <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v, name) => [fmtV(v), name === 'actual' ? results.primaryLabel : 'Forecast']} />
            <Area type="monotone" dataKey="actual" stroke="#00e5ff" fill="url(#wbActual)" strokeWidth={2} dot={false} />
            <Area type="monotone" dataKey="forecast" stroke="#9c27b0" fill="url(#wbForecast)" strokeWidth={1.5} strokeDasharray="5 3" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Anomalies on trend */}
      {results.anomalies?.length > 0 && (
        <div className="glass-card rounded-2xl p-5 border border-amber-400/15">
          <div className="text-xs font-semibold text-amber-400 uppercase tracking-widest mb-3">Anomalous Periods</div>
          <div className="space-y-2">
            {results.anomalies.slice(0, 5).map((a, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0 text-xs">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-3 h-3 text-amber-400" />
                  <span className="font-mono text-white/60">{a.date}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono">{fmtV(a.value)}</span>
                  <span className="text-white/30">expected ~{fmtV(a.expected)}</span>
                  <span className={`px-2 py-0.5 rounded text-xs font-semibold ${a.severity === 'high' ? 'bg-red-400/15 text-red-400' : 'bg-amber-400/15 text-amber-400'}`}>
                    {a.severity?.toUpperCase()} z={a.zScore}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function BreakdownTab({ results }) {
  const { breakdownData, primaryLabel } = results;
  if (!breakdownData?.length) return (
    <div className="text-center py-16 text-muted-foreground text-sm">No categorical breakdown data available.</div>
  );
  const total = breakdownData.reduce((s, d) => s + d.value, 0);

  return (
    <div className="space-y-5">
      <div className="glass-card rounded-2xl p-5 border border-white/5">
        <div className="font-semibold text-sm mb-1">{primaryLabel} by Segment</div>
        <div className="text-xs text-muted-foreground mb-4">Top {Math.min(breakdownData.length, 10)} segments ranked by total value</div>
        <ResponsiveContainer width="100%" height={Math.max(240, breakdownData.slice(0, 10).length * 32)}>
          <BarChart data={breakdownData.slice(0, 10)} layout="vertical" margin={{ top: 4, right: 40, bottom: 4, left: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis type="number" tick={axisStyle} tickFormatter={fmtV} tickLine={false} axisLine={false} />
            <YAxis dataKey="name" type="category" tick={{ ...axisStyle, fontSize: 10 }} tickLine={false} axisLine={false} width={100} />
            <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [fmtV(v), primaryLabel]} />
            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
              {breakdownData.slice(0, 10).map((_, i) => (
                <rect key={i} fill={COLORS[i % COLORS.length]} fillOpacity={0.85} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="glass-card rounded-2xl p-5 border border-white/5">
        <div className="font-semibold text-sm mb-3">Segment Share</div>
        <div className="space-y-2">
          {breakdownData.slice(0, 10).map((d, i) => {
            const pct = total > 0 ? (d.value / total * 100).toFixed(1) : 0;
            return (
              <div key={d.name} className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                <span className="text-sm flex-1 truncate text-white/70">{d.name}</span>
                <span className="font-mono text-xs text-white/50">{fmtV(d.value)}</span>
                <div className="w-24 h-1.5 bg-white/8 rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, background: COLORS[i % COLORS.length] }} />
                </div>
                <span className="text-xs font-mono text-white/50 w-10 text-right">{pct}%</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function DistributionTab({ table, results }) {
  const numericCols = useMemo(() => table.columns?.filter(c => c.type === 'numeric') || [], [table]);
  if (!numericCols.length) return (
    <div className="text-center py-16 text-muted-foreground text-sm">No numeric columns to show distributions for.</div>
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {numericCols.slice(0, 6).map(col => {
        const vals = table.rows?.map(r => Number(r[col.name])).filter(v => !isNaN(v)) || [];
        const s = results?.colStats?.[col.name] || {};
        return (
          <div key={col.name} className="glass-card rounded-2xl p-4 border border-white/5">
            <div className="font-mono text-sm font-semibold text-cyan-400 mb-3 truncate">{col.name.replace(/_/g, ' ')}</div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs mb-4">
              {[['Mean', fmtV(s.mean)], ['Std Dev', fmtV(s.std)], ['Min', fmtV(s.min)], ['Max', fmtV(s.max)], ['Median', fmtV(s.median)], ['Unique', col.uniqueCount?.toLocaleString()]].map(([label, val]) => (
                <div key={label} className="flex justify-between">
                  <span className="text-white/35">{label}</span>
                  <span className="font-mono text-white/70">{val || '—'}</span>
                </div>
              ))}
            </div>
            {/* Mini histogram bars */}
            <div className="flex items-end gap-0.5 h-10">
              {(() => {
                if (!vals.length || !s.min == null || !s.max == null) return null;
                const bins = 16;
                const range = s.max - s.min || 1;
                const counts = new Array(bins).fill(0);
                vals.forEach(v => {
                  const bi = Math.min(bins - 1, Math.floor(((v - s.min) / range) * bins));
                  counts[bi]++;
                });
                const maxCount = Math.max(...counts, 1);
                return counts.map((c, i) => (
                  <div key={i} className="flex-1 rounded-sm transition-all" style={{ height: `${(c / maxCount) * 100}%`, background: `rgba(0,229,255,${0.3 + (c / maxCount) * 0.5})` }} />
                ));
              })()}
            </div>
            <div className="flex justify-between text-xs text-white/20 mt-1">
              <span>{fmtV(s.min)}</span><span>{fmtV(s.max)}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function DetailTab({ table }) {
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const pageSize = 25;
  const cols = table.columns || [];

  const filteredRows = useMemo(() => {
    if (!search.trim()) return table.rows || [];
    const s = search.toLowerCase();
    return (table.rows || []).filter(row =>
      Object.values(row).some(v => String(v).toLowerCase().includes(s))
    );
  }, [table.rows, search]);

  const totalPages = Math.ceil(filteredRows.length / pageSize);
  const visibleRows = filteredRows.slice(page * pageSize, (page + 1) * pageSize);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="text-xs text-muted-foreground">
          {filteredRows.length.toLocaleString()} rows · {cols.length} columns
          {search && ` · filtered from ${table.rows?.length?.toLocaleString()}`}
        </div>
        <div className="flex items-center gap-3">
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(0); }}
            placeholder="Search rows…"
            className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs focus:outline-none focus:border-cyan-400/30 w-48" />
          <div className="flex items-center gap-1.5 text-xs">
            <button disabled={page === 0} onClick={() => setPage(p => p - 1)}
              className="px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/8 hover:bg-white/10 disabled:opacity-30 transition-colors">←</button>
            <span className="text-muted-foreground px-1">{page + 1} / {totalPages || 1}</span>
            <button disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}
              className="px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/8 hover:bg-white/10 disabled:opacity-30 transition-colors">→</button>
          </div>
        </div>
      </div>

      <div className="overflow-auto rounded-xl border border-white/8 max-h-[520px]">
        <table className="w-full text-xs">
          <thead className="sticky top-0 z-10">
            <tr className="bg-navy-700/95 border-b border-white/8">
              {cols.map(c => (
                <th key={c.name} className="px-3 py-2.5 text-left whitespace-nowrap">
                  <div className="font-mono text-white/60 font-medium">{c.name}</div>
                  <div className={`text-xs mt-0.5 ${c.type === 'numeric' ? 'text-blue-400/60' : c.type === 'date' ? 'text-teal-400/60' : c.type === 'category' ? 'text-purple-400/60' : 'text-white/25'}`}>{c.type}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row, i) => (
              <tr key={i} className="border-b border-white/5 hover:bg-white/2 transition-colors">
                {cols.map(c => (
                  <td key={c.name} className="px-3 py-2 font-mono text-white/70 whitespace-nowrap max-w-40 truncate">
                    {String(row[c.name] ?? '—')}
                  </td>
                ))}
              </tr>
            ))}
            {visibleRows.length === 0 && (
              <tr>
                <td colSpan={cols.length} className="px-4 py-8 text-center text-muted-foreground text-xs">No rows match your search.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}