import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useWorkspaceStore } from '@/lib/store';
import {
  Database, BarChart3, TrendingUp, TableProperties,
  Hash, TrendingDown, AlertTriangle, CheckCircle2,
  Target, Activity
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ScatterChart as RechartsScatter, Scatter, Cell
} from 'recharts';

const tabs = [
  { id: 'scorecards', label: 'Scorecards', icon: Hash },
  { id: 'trends', label: 'Trends', icon: TrendingUp },
  { id: 'breakdown', label: 'Breakdown', icon: BarChart3 },
  { id: 'distribution', label: 'Distribution', icon: Activity },
  { id: 'scatter', label: 'Outliers', icon: Activity },
  { id: 'detail', label: 'Detail Table', icon: TableProperties },
];

const TOOLTIP_STYLE = { backgroundColor: 'rgba(8,6,18,0.96)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, fontSize: 11, color: '#e2e8f0' };
const COLORS = ['#00e5ff', '#7b2fff', '#ff6b35', '#4caf50', '#ff2d7a', '#ffcc02', '#00bfa5', '#e91e63'];
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
      <div className="flex items-center gap-0.5 px-5 py-3 border-b border-white/5 overflow-x-auto flex-shrink-0">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-cyan-400/10 text-cyan-400 border border-cyan-400/20' : 'text-muted-foreground hover:text-foreground hover:bg-white/5'}`}>
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-auto p-5">
        <motion.div key={activeTab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
          {activeTab === 'scorecards' && <ScorecardsTab results={analysisResults} table={table} />}
          {activeTab === 'trends' && <TrendsTab results={analysisResults} />}
          {activeTab === 'breakdown' && <BreakdownTab results={analysisResults} />}
          {activeTab === 'distribution' && <DistributionTab table={table} results={analysisResults} />}
          {activeTab === 'scatter' && <ScatterTab table={table} results={analysisResults} />}
          {activeTab === 'detail' && <DetailTab table={table} />}
        </motion.div>
      </div>
    </div>
  );
}

function ScorecardsTab({ results, table }) {
  const { primaryLabel, totalValue, secondLabel, secondValue, growthRate, breakdownData, anomalies, correlations } = results;
  const cards = [
    { label: primaryLabel || 'Primary KPI', value: fmtV(totalValue), sub: growthRate != null ? `${Number(growthRate) >= 0 ? '+' : ''}${growthRate}% trend` : 'No time data', color: 'text-cyan-400', border: 'border-cyan-400/20', bg: 'bg-cyan-400/5', icon: growthRate >= 0 ? TrendingUp : TrendingDown },
    { label: 'Records Analyzed', value: fmtV(table.rowCount), sub: `${table.columns?.length} columns`, color: 'text-teal-400', border: 'border-teal-400/20', bg: 'bg-teal-400/5', icon: Database },
    { label: 'Data Quality', value: `${table.qualityScore}%`, sub: table.qualityScore >= 90 ? 'Excellent' : table.qualityScore >= 70 ? 'Good' : 'Needs work', color: table.qualityScore >= 90 ? 'text-green-400' : 'text-amber-400', border: table.qualityScore >= 90 ? 'border-green-400/20' : 'border-amber-400/20', bg: table.qualityScore >= 90 ? 'bg-green-400/5' : 'bg-amber-400/5', icon: table.qualityScore >= 90 ? CheckCircle2 : AlertTriangle },
    ...(secondLabel ? [{ label: secondLabel, value: fmtV(secondValue), sub: 'secondary KPI', color: 'text-blue-400', border: 'border-blue-400/20', bg: 'bg-blue-400/5', icon: Hash }] : []),
    ...(breakdownData?.length > 0 ? [{ label: 'Top Segment', value: breakdownData[0]?.name?.slice(0, 14), sub: fmtV(breakdownData[0]?.value), color: 'text-purple-400', border: 'border-purple-400/20', bg: 'bg-purple-400/5', icon: BarChart3 }] : []),
    { label: 'Anomalies', value: String(anomalies?.length || 0), sub: anomalies?.length ? 'outliers detected' : 'All clear', color: anomalies?.length ? 'text-amber-400' : 'text-green-400', border: anomalies?.length ? 'border-amber-400/20' : 'border-green-400/20', bg: anomalies?.length ? 'bg-amber-400/5' : 'bg-green-400/5', icon: AlertTriangle },
  ];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {cards.map((c) => (
          <div key={c.label} className={`glass-card rounded-2xl p-4 border ${c.border} ${c.bg}`}>
            <div className="flex items-center gap-1.5 mb-2">
              <c.icon className={`w-3 h-3 ${c.color}`} />
              <div className="text-xs text-muted-foreground uppercase tracking-wide">{c.label}</div>
            </div>
            <div className={`text-2xl font-black ${c.color} font-mono`}>{c.value}</div>
            {c.sub && <div className="text-xs text-muted-foreground mt-1 leading-tight">{c.sub}</div>}
          </div>
        ))}
      </div>
      {correlations?.length > 0 && (
        <div className="glass-card rounded-2xl p-5 border border-white/5">
          <div className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-3">Pearson Correlations (|r| {'>'} 0.3)</div>
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
  if (!combined.length) return (
    <div className="flex items-center gap-3 p-5 rounded-2xl bg-amber-400/5 border border-amber-400/20">
      <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0" />
      <div>
        <div className="font-semibold text-amber-400 mb-0.5">No Time-Series Data</div>
        <div className="text-sm text-white/50">No date column was detected in this dataset. Time-series trends and forecasting require a date/month field.</div>
      </div>
    </div>
  );
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
          {results.canForecast ? 'Historical data + 6-period AI forecast (Exp. Smoothing + Linear Regression blend)' : 'Historical data only — insufficient data points for forecasting'}
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={combined} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
            <defs>
              <linearGradient id="wbActual" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#00e5ff" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#00e5ff" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="wbForecast" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#9c27b0" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#9c27b0" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis dataKey="date" tick={axisStyle} tickLine={false} axisLine={false} interval="preserveStartEnd" />
            <YAxis tick={axisStyle} tickFormatter={fmtV} tickLine={false} axisLine={false} width={44} />
            <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v, name) => [fmtV(v), name === 'actual' ? results.primaryLabel : 'Forecast']} />
            <Area type="monotone" dataKey="actual" stroke="#00e5ff" fill="url(#wbActual)" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
            <Area type="monotone" dataKey="forecast" stroke="#9c27b0" fill="url(#wbForecast)" strokeWidth={1.5} strokeDasharray="5 3" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      {results.anomalies?.length > 0 && (
        <div className="glass-card rounded-2xl p-5 border border-amber-400/15">
          <div className="text-xs font-semibold text-amber-400 uppercase tracking-widest mb-3">Anomalous Periods ({results.anomalies.length})</div>
          <div className="space-y-2">
            {results.anomalies.slice(0, 6).map((a, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0 text-xs">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-3 h-3 text-amber-400" />
                  <span className="font-mono text-white/60">{a.date}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono">{fmtV(a.value)}</span>
                  <span className="text-white/30">expected ~{fmtV(a.expected)}</span>
                  <span className={`px-2 py-0.5 rounded text-xs font-semibold ${a.severity === 'high' ? 'bg-red-400/15 text-red-400' : 'bg-amber-400/15 text-amber-400'}`}>
                    {a.severity?.toUpperCase()} z={a.zScore}σ
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
    <div className="text-center py-16 text-muted-foreground text-sm">No categorical breakdown data. Dataset needs at least one category/dimension column.</div>
  );
  const total = breakdownData.reduce((s, d) => s + d.value, 0);
  return (
    <div className="space-y-5">
      <div className="glass-card rounded-2xl p-5 border border-white/5">
        <div className="font-semibold text-sm mb-1">{primaryLabel} by Segment</div>
        <div className="text-xs text-muted-foreground mb-4">Top {Math.min(breakdownData.length, 10)} segments ranked by total value</div>
        <ResponsiveContainer width="100%" height={Math.max(220, breakdownData.slice(0, 10).length * 30)}>
          <BarChart data={breakdownData.slice(0, 10)} layout="vertical" margin={{ top: 4, right: 48, bottom: 4, left: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis type="number" tick={axisStyle} tickFormatter={fmtV} tickLine={false} axisLine={false} />
            <YAxis dataKey="name" type="category" tick={{ ...axisStyle, fontSize: 10 }} tickLine={false} axisLine={false} width={108} />
            <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [fmtV(v), primaryLabel]} />
            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
              {breakdownData.slice(0, 10).map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} fillOpacity={0.85} />
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
                <div className="w-20 h-1.5 bg-white/8 rounded-full overflow-hidden">
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
        const bins = 16;
        const range = (s.max - s.min) || 1;
        const counts = new Array(bins).fill(0);
        vals.forEach(v => {
          const bi = Math.min(bins - 1, Math.floor(((v - s.min) / range) * bins));
          counts[bi]++;
        });
        const maxCount = Math.max(...counts, 1);
        return (
          <div key={col.name} className="glass-card rounded-2xl p-4 border border-white/5">
            <div className="font-mono text-sm font-semibold text-cyan-400 mb-3 truncate">{col.name.replace(/_/g, ' ')}</div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs mb-4">
              {[['Mean', fmtV(s.mean)], ['Std Dev', fmtV(s.std)], ['Min', fmtV(s.min)], ['Max', fmtV(s.max)], ['Median', fmtV(s.median)], ['Count', vals.length?.toLocaleString()]].map(([label, val]) => (
                <div key={label} className="flex justify-between">
                  <span className="text-white/35">{label}</span>
                  <span className="font-mono text-white/70">{val || '—'}</span>
                </div>
              ))}
            </div>
            <div className="flex items-end gap-0.5 h-12">
              {counts.map((c, i) => (
                <div key={i} className="flex-1 rounded-sm transition-all" style={{ height: `${(c / maxCount) * 100}%`, background: `rgba(0,229,255,${0.25 + (c / maxCount) * 0.6})` }} />
              ))}
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

function ScatterTab({ table, results }) {
  const numericCols = useMemo(() => table.columns?.filter(c => c.type === 'numeric') || [], [table]);
  const [colX, setColX] = useState(0);
  const [colY, setColY] = useState(Math.min(1, numericCols.length - 1));
  if (numericCols.length < 2) return (
    <div className="text-center py-16 text-muted-foreground text-sm">Need at least 2 numeric columns for scatter / outlier analysis.</div>
  );
  const xKey = numericCols[colX]?.name;
  const yKey = numericCols[colY]?.name;
  const scatterData = (table.rows || []).slice(0, 500).map(r => {
    const x = Number(r[xKey]);
    const y = Number(r[yKey]);
    return (!isNaN(x) && !isNaN(y)) ? { x, y } : null;
  }).filter(Boolean);

  // Detect outliers
  const xs = scatterData.map(d => d.x);
  const ys = scatterData.map(d => d.y);
  const mx = xs.reduce((a, b) => a + b, 0) / xs.length || 0;
  const my = ys.reduce((a, b) => a + b, 0) / ys.length || 0;
  const stdX = Math.sqrt(xs.reduce((a, b) => a + (b - mx) ** 2, 0) / xs.length) || 1;
  const stdY = Math.sqrt(ys.reduce((a, b) => a + (b - my) ** 2, 0) / ys.length) || 1;
  const isOutlier = (d) => Math.abs(d.x - mx) / stdX > 2 || Math.abs(d.y - my) / stdY > 2;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">X axis:</span>
          <select value={colX} onChange={e => setColX(Number(e.target.value))}
            className="px-2 py-1 bg-white/5 border border-white/10 rounded-lg text-xs text-foreground focus:outline-none">
            {numericCols.map((c, i) => <option key={c.name} value={i}>{c.name}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Y axis:</span>
          <select value={colY} onChange={e => setColY(Number(e.target.value))}
            className="px-2 py-1 bg-white/5 border border-white/10 rounded-lg text-xs text-foreground focus:outline-none">
            {numericCols.map((c, i) => <option key={c.name} value={i}>{c.name}</option>)}
          </select>
        </div>
        <span className="text-xs text-white/30">{scatterData.length} points · {scatterData.filter(isOutlier).length} outliers</span>
      </div>
      <div className="glass-card rounded-2xl p-5 border border-white/5">
        <ResponsiveContainer width="100%" height={320}>
          <RechartsScatter data={scatterData} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis type="number" dataKey="x" name={xKey} tick={axisStyle} tickLine={false} axisLine={false} tickFormatter={fmtV} />
            <YAxis type="number" dataKey="y" name={yKey} tick={axisStyle} tickLine={false} axisLine={false} tickFormatter={fmtV} width={44} />
            <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v, name) => [fmtV(v), name === 'x' ? xKey : yKey]} />
            <Scatter>
              {scatterData.map((d, i) => (
                <Cell key={i} fill={isOutlier(d) ? '#ff6b35' : '#00e5ff'} fillOpacity={isOutlier(d) ? 0.9 : 0.5} />
              ))}
            </Scatter>
          </RechartsScatter>
        </ResponsiveContainer>
        <div className="flex items-center gap-4 mt-2 text-xs text-white/40">
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-cyan-400/60 inline-block" /> Normal</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-orange-400 inline-block" /> Outlier ({'>'} 2σ)</span>
        </div>
      </div>
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
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="text-xs text-muted-foreground">
          {filteredRows.length.toLocaleString()} rows · {cols.length} columns
          {search && ` · filtered from ${table.rows?.length?.toLocaleString()}`}
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(0); }}
            placeholder="Search rows…"
            className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs focus:outline-none focus:border-cyan-400/30 w-44" />
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