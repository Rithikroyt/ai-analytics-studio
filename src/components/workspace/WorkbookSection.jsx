/**
 * WorkbookSection — Tableau-grade analytics workbook
 * Tabs: Scorecards · Trends · Breakdown · Comparison · Distribution · Highlight Table · Scatter · Detail
 */
import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useWorkspaceStore } from '@/lib/store';
import {
  Database, BarChart3, TrendingUp, TableProperties, Hash,
  TrendingDown, AlertTriangle, CheckCircle2, Activity, Target,
  ArrowUpRight, ArrowDownRight, Minus, Grid, Layers, Search
} from 'lucide-react';
import KPIStrip from '@/components/workspace/KPIStrip';
import StorytellingHeader from '@/components/workspace/StorytellingHeader';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, ComposedChart,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Cell, ReferenceLine, ScatterChart as RechartsScatter, Scatter
} from 'recharts';

// ── Design tokens ────────────────────────────────────────────────
const PALETTE = ['#00e5ff','#7b2fff','#ff6b35','#4caf50','#ff2d7a','#ffcc02','#00bfa5','#e91e63'];
const TOOLTIP_STYLE = { backgroundColor:'rgba(5,10,24,0.97)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:10, fontSize:11, color:'#e2e8f0' };
const axisStyle = { fontSize:9, fill:'rgba(255,255,255,0.3)' };

const fmtV = (v) => {
  if (v == null || isNaN(v)) return '—';
  const n = Number(v);
  if (Math.abs(n) >= 1e9) return `${(n/1e9).toFixed(1)}B`;
  if (Math.abs(n) >= 1e6) return `${(n/1e6).toFixed(1)}M`;
  if (Math.abs(n) >= 1e3) return `${(n/1e3).toFixed(0)}K`;
  return n.toLocaleString(undefined, { maximumFractionDigits:2 });
};

// ── Tab config ───────────────────────────────────────────────────
const TABS = [
  { id:'scorecards',  label:'Scorecards',   icon:Hash },
  { id:'trends',      label:'Trends',       icon:TrendingUp },
  { id:'breakdown',   label:'Breakdown',    icon:BarChart3 },
  { id:'comparison',  label:'Comparison',   icon:Layers },
  { id:'distribution',label:'Distribution', icon:Activity },
  { id:'highlight',   label:'Highlight',    icon:Grid },
  { id:'scatter',     label:'Outliers',     icon:Target },
  { id:'detail',      label:'Detail Table', icon:TableProperties },
];

// ── Scorecard tile ────────────────────────────────────────────────
function ScoreTile({ label, value, sub, color, delta, small }) {
  const DeltaIcon = delta > 0 ? ArrowUpRight : delta < 0 ? ArrowDownRight : Minus;
  const deltaColor = delta > 0 ? '#4caf50' : delta < 0 ? '#ff2d7a' : '#ffffff55';
  return (
    <div className="rounded-2xl p-4 border border-white/8 bg-white/2 hover:bg-white/3 transition-colors">
      <div className="text-xs text-white/35 uppercase tracking-wider mb-2 truncate">{label}</div>
      <div className="font-black font-mono leading-none" style={{ fontSize:small?18:24, color }}>{value}</div>
      <div className="flex items-center gap-1.5 mt-1.5">
        {delta != null && <DeltaIcon className="w-3 h-3" style={{ color:deltaColor }} />}
        <span className="text-xs" style={{ color: delta!=null ? deltaColor : 'rgba(255,255,255,0.3)' }}>{sub}</span>
      </div>
    </div>
  );
}

// ── Scorecards tab ───────────────────────────────────────────────
function ScorecardsTab({ results, table }) {
  const { primaryLabel, totalValue, secondLabel, secondValue, growthRate, breakdownData, anomalies, correlations } = results;
  const numCols = table.columns?.filter(c=>c.type==='numeric') || [];
  const tiles = [
    { label: primaryLabel||'Primary KPI', value:fmtV(totalValue), sub: growthRate!=null?`${Number(growthRate)>=0?'+':''}${growthRate}% trend`:'No time data', color:'#00e5ff', delta:growthRate },
    { label:'Records Analyzed', value:fmtV(table.rowCount), sub:`${table.columns?.length} columns`, color:'#00bfa5' },
    { label:'Data Quality', value:`${table.qualityScore}%`, sub:table.qualityScore>=90?'Excellent':table.qualityScore>=70?'Good':'Needs work', color:table.qualityScore>=90?'#4caf50':'#ffcc02' },
    ...(secondLabel?[{ label:secondLabel, value:fmtV(secondValue), sub:'secondary KPI', color:'#9c27b0' }]:[]),
    ...(breakdownData?.length?[{ label:'Top Segment', value:String(breakdownData[0]?.name||'').slice(0,14), sub:fmtV(breakdownData[0]?.value), color:'#ff6b35' }]:[]),
    { label:'Anomalies', value:String(anomalies?.length||0), sub:anomalies?.length?'outliers detected':'All clean', color:anomalies?.length?'#ff6b35':'#4caf50', delta:anomalies?.length>0?-1:0 },
    ...numCols.slice(0,4).map(col => ({ label:col.name.replace(/_/g,' '), value:fmtV(col.mean), sub:`σ=${fmtV(col.std)}`, color:'#7b2fff', small:true })),
  ].slice(0,8);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {tiles.map(t => <ScoreTile key={t.label} {...t} />)}
      </div>

      {/* Correlation badges */}
      {correlations?.length > 0 && (
        <div className="rounded-2xl p-5 border border-white/6 bg-white/1">
          <div className="text-xs text-white/30 uppercase tracking-widest mb-3">Pearson Correlations (|r| &gt; 0.3)</div>
          <div className="flex flex-wrap gap-2">
            {correlations.slice(0,10).map((c,i) => {
              const s = Math.abs(c.r);
              const color = s>0.7?'#4caf50':s>0.5?'#ffcc02':'#00e5ff';
              return (
                <div key={i} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs" style={{ background:`${color}15`, border:`1px solid ${color}33`, color }}>
                  <span className="font-mono">{c.colA.replace(/_/g,' ')}</span>
                  <span className="opacity-40">↔</span>
                  <span className="font-mono">{c.colB.replace(/_/g,' ')}</span>
                  <span className="font-black ml-1">{c.r>0?'+':''}{c.r}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Trends tab ───────────────────────────────────────────────────
function TrendsTab({ results }) {
  const combined = [
    ...(results.trendData||[]).map(d => ({ ...d, actual:d.value })),
    ...(results.forecastData||[]).map(d => ({ ...d, forecast:d.value })),
  ];
  if (combined.length < 2) return (
    <div className="flex items-start gap-3 p-5 rounded-2xl bg-amber-400/5 border border-amber-400/20">
      <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0" />
      <div>
        <div className="font-semibold text-amber-400 mb-1">No Time-Series Data</div>
        <div className="text-sm text-white/45">No date column detected. Trends require a date/time field.</div>
      </div>
    </div>
  );
  return (
    <div className="space-y-5">
      <div className="rounded-2xl p-5 border" style={{ background:'rgba(0,229,255,0.04)', borderColor:'rgba(0,229,255,0.15)' }}>
        <div className="flex items-center justify-between mb-1">
          <div>
            <div className="font-semibold text-sm">{results.primaryLabel} — Historical Trend {results.canForecast?'+ Forecast':''}</div>
            <div className="text-xs text-white/25 mt-0.5">{results.canForecast?'Purple dashed = 6-period forecast':'Historical only — no forecast available'}</div>
          </div>
          {results.growthRate != null && (
            <span className="font-mono text-xl font-black" style={{ color:Number(results.growthRate)>=0?'#4caf50':'#ff2d7a' }}>
              {Number(results.growthRate)>=0?'▲':'▼'} {Math.abs(results.growthRate)}%
            </span>
          )}
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <ComposedChart data={combined} margin={{ top:8, right:8, bottom:4, left:0 }}>
            <defs>
              <linearGradient id="wbActual" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#00e5ff" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#00e5ff" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis dataKey="date" tick={axisStyle} tickLine={false} axisLine={false} interval="preserveStartEnd" />
            <YAxis tick={axisStyle} tickFormatter={fmtV} tickLine={false} axisLine={false} width={44} />
            <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v,n) => [fmtV(v), n==='actual'?results.primaryLabel:'Forecast']} />
            <Area type="monotone" dataKey="actual" stroke="#00e5ff" fill="url(#wbActual)" strokeWidth={2.5} dot={false} activeDot={{ r:4 }} />
            <Line type="monotone" dataKey="forecast" stroke="#9c27b0" strokeWidth={1.5} strokeDasharray="5 3" dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Anomaly overlay */}
      {results.anomalies?.length > 0 && (
        <div className="rounded-2xl p-5 border border-amber-400/15 bg-amber-400/4">
          <div className="text-xs font-semibold text-amber-400 uppercase tracking-widest mb-3">Anomalous Periods ({results.anomalies.length})</div>
          <div className="space-y-1.5">
            {results.anomalies.slice(0,6).map((a,i) => (
              <div key={i} className="flex items-center justify-between text-xs py-2 border-b border-white/5 last:border-0">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-3 h-3 text-amber-400" />
                  <span className="font-mono text-white/55">{a.date}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono">{fmtV(a.value)}</span>
                  <span className="text-white/25">expected ~{fmtV(a.expected)}</span>
                  <span className={`px-2 py-0.5 rounded text-xs font-bold ${a.severity==='high'?'bg-red-400/15 text-red-400':'bg-amber-400/15 text-amber-400'}`}>
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

// ── Breakdown tab ─────────────────────────────────────────────────
function BreakdownTab({ results }) {
  const { breakdownData, primaryLabel } = results;
  if (!breakdownData?.length) return <div className="text-center py-16 text-muted-foreground text-sm">No categorical breakdown data available.</div>;
  const total = breakdownData.reduce((s,d) => s+(d.value||0), 0);
  return (
    <div className="space-y-5">
      <div className="rounded-2xl p-5 border border-white/6">
        <div className="font-semibold text-sm mb-1">{primaryLabel} by Segment</div>
        <div className="text-xs text-white/25 mb-4">Top {Math.min(breakdownData.length,10)} segments ranked by total value</div>
        <ResponsiveContainer width="100%" height={Math.max(220, breakdownData.slice(0,10).length*30)}>
          <BarChart data={breakdownData.slice(0,10)} layout="vertical" margin={{ top:4, right:48, bottom:4, left:4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis type="number" tick={axisStyle} tickFormatter={fmtV} tickLine={false} axisLine={false} />
            <YAxis dataKey="name" type="category" tick={{ ...axisStyle, fontSize:10 }} tickLine={false} axisLine={false} width={108} />
            <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [fmtV(v), primaryLabel]} />
            <Bar dataKey="value" radius={[0,4,4,0]}>
              {breakdownData.slice(0,10).map((_,i) => <Cell key={i} fill={PALETTE[i%PALETTE.length]} fillOpacity={0.85} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      {/* Share bars */}
      <div className="rounded-2xl p-5 border border-white/6">
        <div className="font-semibold text-sm mb-3">Share Breakdown</div>
        <div className="space-y-2.5">
          {breakdownData.slice(0,10).map((d,i) => {
            const pct = total>0?(d.value/total*100).toFixed(1):0;
            return (
              <div key={d.name} className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background:PALETTE[i%PALETTE.length] }} />
                <span className="text-sm flex-1 truncate text-white/65">{d.name}</span>
                <span className="font-mono text-xs text-white/45">{fmtV(d.value)}</span>
                <div className="w-24 h-1.5 bg-white/8 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width:`${pct}%`, background:PALETTE[i%PALETTE.length] }} />
                </div>
                <span className="text-xs font-mono text-white/40 w-10 text-right">{pct}%</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Comparison tab ────────────────────────────────────────────────
function ComparisonTab({ results, table }) {
  const numCols = table.columns?.filter(c=>c.type==='numeric') || [];
  const [colA, setColA] = useState(0);
  const [colB, setColB] = useState(Math.min(1, numCols.length-1));

  if (numCols.length < 2) return (
    <div className="text-center py-16 text-sm text-white/35">Need at least 2 numeric columns for comparison.</div>
  );

  // Build period-over-period comparison from trend data
  const trendA = (results.allTrends || {})[numCols[colA]?.name] || results.trendData || [];
  const trendB = (results.allTrends || {})[numCols[colB]?.name] || [];
  const combined = trendA.map((d,i) => ({
    date: d.date,
    [numCols[colA].name]: d.value,
    [numCols[colB]?.name]: trendB[i]?.value ?? null,
  }));

  // Stat comparison cards
  const statsA = numCols[colA];
  const statsB = numCols[colB];
  return (
    <div className="space-y-5">
      {/* Column selectors */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-xs text-white/35">Metric A:</span>
          <select value={colA} onChange={e=>setColA(Number(e.target.value))}
            className="px-2 py-1.5 bg-white/5 border border-white/10 rounded-xl text-xs text-foreground focus:outline-none focus:border-cyan-400/30">
            {numCols.map((c,i) => <option key={c.name} value={i}>{c.name.replace(/_/g,' ')}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-white/35">Metric B:</span>
          <select value={colB} onChange={e=>setColB(Number(e.target.value))}
            className="px-2 py-1.5 bg-white/5 border border-white/10 rounded-xl text-xs text-foreground focus:outline-none focus:border-cyan-400/30">
            {numCols.map((c,i) => <option key={c.name} value={i}>{c.name.replace(/_/g,' ')}</option>)}
          </select>
        </div>
      </div>

      {/* Stat comparison */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[['Mean', statsA?.mean, statsB?.mean], ['Std Dev', statsA?.std, statsB?.std], ['Min', statsA?.min, statsB?.min], ['Max', statsA?.max, statsB?.max]].map(([label, va, vb]) => {
          const diff = va != null && vb != null ? ((va - vb)/Math.abs(vb||1)*100).toFixed(1) : null;
          const color = diff != null ? (Number(diff)>0?'#4caf50':'#ff2d7a') : '#ffffff50';
          return (
            <div key={label} className="rounded-xl p-3 border border-white/8 bg-white/2">
              <div className="text-xs text-white/30 uppercase tracking-wider mb-2">{label}</div>
              <div className="flex items-end gap-2">
                <div>
                  <div className="text-xs text-cyan-400/70 mb-0.5">{numCols[colA]?.name.slice(0,8)}</div>
                  <div className="font-mono font-bold text-sm text-cyan-400">{fmtV(va)}</div>
                </div>
                <div className="text-white/20 text-xs mb-0.5">vs</div>
                <div>
                  <div className="text-xs text-purple-400/70 mb-0.5">{numCols[colB]?.name.slice(0,8)}</div>
                  <div className="font-mono font-bold text-sm text-purple-400">{fmtV(vb)}</div>
                </div>
                {diff != null && <div className="ml-auto text-xs font-mono" style={{ color }}>{diff>0?'+':''}{diff}%</div>}
              </div>
            </div>
          );
        })}
      </div>

      {/* Combined trend chart */}
      {combined.length > 1 && (
        <div className="rounded-2xl p-5 border border-white/6">
          <div className="font-semibold text-sm mb-4">{numCols[colA]?.name.replace(/_/g,' ')} vs {numCols[colB]?.name.replace(/_/g,' ')} Over Time</div>
          <ResponsiveContainer width="100%" height={240}>
            <ComposedChart data={combined} margin={{ top:4, right:8, bottom:4, left:0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="date" tick={axisStyle} tickLine={false} axisLine={false} interval="preserveStartEnd" />
              <YAxis tick={axisStyle} tickLine={false} axisLine={false} tickFormatter={fmtV} width={44} />
              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={fmtV} />
              <Line type="monotone" dataKey={numCols[colA].name} stroke="#00e5ff" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey={numCols[colB]?.name} stroke="#9c27b0" strokeWidth={2} strokeDasharray="4 2" dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
          <div className="flex items-center gap-4 mt-2 text-xs text-white/35">
            <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-cyan-400 inline-block" /> {numCols[colA]?.name.replace(/_/g,' ')}</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-purple-400 border-dashed inline-block" /> {numCols[colB]?.name.replace(/_/g,' ')}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Distribution tab ──────────────────────────────────────────────
function DistributionTab({ table, results }) {
  const numericCols = useMemo(() => table.columns?.filter(c=>c.type==='numeric')||[], [table]);
  if (!numericCols.length) return <div className="text-center py-16 text-sm text-white/35">No numeric columns for distribution.</div>;
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {numericCols.slice(0,6).map(col => {
        const vals = (table.rows||[]).map(r=>Number(r[col.name])).filter(v=>!isNaN(v));
        const s = results?.colStats?.[col.name] || {};
        const min = s.min ?? Math.min(...vals);
        const max = s.max ?? Math.max(...vals);
        const bins = 16; const range = (max-min)||1;
        const counts = new Array(bins).fill(0);
        vals.forEach(v => { const bi = Math.min(bins-1, Math.floor(((v-min)/range)*bins)); counts[bi]++; });
        const maxCount = Math.max(...counts, 1);
        const mean = s.mean ?? (vals.length ? vals.reduce((a,b)=>a+b,0)/vals.length : 0);
        const std = s.std ?? 0;
        return (
          <div key={col.name} className="rounded-2xl p-4 border border-white/6 bg-white/1">
            <div className="font-mono text-sm font-semibold text-cyan-400 mb-3 truncate">{col.name.replace(/_/g,' ')}</div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs mb-4">
              {[['Mean',fmtV(mean)],['Std',fmtV(std)],['Min',fmtV(min)],['Max',fmtV(max)],['Median',fmtV(s.median)],['Count',vals.length?.toLocaleString()]].map(([l,v]) => (
                <div key={l} className="flex justify-between">
                  <span className="text-white/30">{l}</span>
                  <span className="font-mono text-white/65">{v||'—'}</span>
                </div>
              ))}
            </div>
            {/* Mini histogram bars */}
            <div className="flex items-end gap-0.5 h-14">
              {counts.map((c,i) => (
                <div key={i} className="flex-1 rounded-sm" style={{ height:`${(c/maxCount)*100}%`, background:`rgba(0,229,255,${0.2+(c/maxCount)*0.65})` }} />
              ))}
            </div>
            <div className="flex justify-between text-xs text-white/20 mt-1">
              <span>{fmtV(min)}</span><span>{fmtV(max)}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Highlight table tab ───────────────────────────────────────────
function HighlightTab({ table, results }) {
  const numCols = useMemo(() => table.columns?.filter(c=>c.type==='numeric')||[], [table]);
  const catCols = useMemo(() => table.columns?.filter(c=>c.type==='category')||[], [table]);
  const [rowDim, setRowDim] = useState(() => table.columns?.find(c=>c.type==='category')?.name || '');
  const [colMetric, setColMetric] = useState(() => table.columns?.find(c=>c.type==='numeric')?.name || '');

  const rows2 = useMemo(() => {
    if (!rowDim || !colMetric) return [];
    const agg = {};
    (table.rows||[]).forEach(r => {
      const key = String(r[rowDim]||'');
      const val = Number(r[colMetric]);
      if (!isNaN(val)) {
        if (!agg[key]) agg[key] = { sum:0, count:0 };
        agg[key].sum += val; agg[key].count++;
      }
    });
    return Object.entries(agg).map(([name,d]) => ({ name, value: d.sum, avg: d.sum/d.count, count: d.count })).sort((a,b) => b.value-a.value);
  }, [table.rows, rowDim, colMetric]);

  if (!catCols.length || !numCols.length) return (
    <div className="text-center py-16 text-sm text-white/35">Highlight table requires at least one category and one numeric column.</div>
  );

  const maxVal = Math.max(...rows2.map(r=>r.value), 1);
  const minVal = Math.min(...rows2.map(r=>r.value), 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-xs text-white/35">Group by:</span>
          <select value={rowDim} onChange={e=>setRowDim(e.target.value)}
            className="px-2 py-1.5 bg-white/5 border border-white/10 rounded-xl text-xs text-foreground focus:outline-none">
            {catCols.map(c => <option key={c.name} value={c.name}>{c.name.replace(/_/g,' ')}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-white/35">Metric:</span>
          <select value={colMetric} onChange={e=>setColMetric(e.target.value)}
            className="px-2 py-1.5 bg-white/5 border border-white/10 rounded-xl text-xs text-foreground focus:outline-none">
            {numCols.map(c => <option key={c.name} value={c.name}>{c.name.replace(/_/g,' ')}</option>)}
          </select>
        </div>
      </div>
      <div className="rounded-xl overflow-hidden border border-white/8">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-white/5 border-b border-white/8">
              <th className="px-4 py-2.5 text-left text-white/40 font-medium">{rowDim.replace(/_/g,' ')}</th>
              <th className="px-4 py-2.5 text-right text-white/40 font-medium">Total {colMetric.replace(/_/g,' ')}</th>
              <th className="px-4 py-2.5 text-right text-white/40 font-medium">Average</th>
              <th className="px-4 py-2.5 text-right text-white/40 font-medium">Count</th>
              <th className="px-4 py-2.5 text-white/40 font-medium">Heat</th>
            </tr>
          </thead>
          <tbody>
            {rows2.slice(0,20).map((row, i) => {
              const pct = maxVal>minVal ? (row.value-minVal)/(maxVal-minVal) : 0;
              const alpha = 0.08 + pct * 0.45;
              return (
                <tr key={row.name} className="border-b border-white/5 hover:bg-white/2 transition-colors">
                  <td className="px-4 py-2.5 font-semibold text-white/75">{row.name}</td>
                  <td className="px-4 py-2.5 text-right font-mono text-white/65">{fmtV(row.value)}</td>
                  <td className="px-4 py-2.5 text-right font-mono text-white/45">{fmtV(row.avg)}</td>
                  <td className="px-4 py-2.5 text-right font-mono text-white/35">{row.count.toLocaleString()}</td>
                  <td className="px-4 py-2.5">
                    <div className="h-5 rounded-md" style={{ width:`${Math.max(pct*100,4)}%`, background:`rgba(0,229,255,${alpha})`, minWidth:8 }} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="flex items-center gap-3 text-xs text-white/25">
        <div className="flex items-center gap-2">
          <div className="w-8 h-3 rounded" style={{ background:'rgba(0,229,255,0.08)' }} />
          <span>Low</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-3 rounded" style={{ background:'rgba(0,229,255,0.53)' }} />
          <span>High</span>
        </div>
      </div>
    </div>
  );
}

// ── Scatter / Outliers tab ─────────────────────────────────────────
function ScatterTab({ table, results }) {
  const numCols = useMemo(() => table.columns?.filter(c=>c.type==='numeric')||[], [table]);
  const [colX, setColX] = useState(0);
  const [colY, setColY] = useState(Math.min(1, numCols.length-1));
  if (numCols.length < 2) return <div className="text-center py-16 text-sm text-white/35">Need at least 2 numeric columns for scatter analysis.</div>;

  const xKey = numCols[colX]?.name;
  const yKey = numCols[colY]?.name;
  const scatterData = (table.rows||[]).slice(0,600).map(r => {
    const x = Number(r[xKey]); const y = Number(r[yKey]);
    return (!isNaN(x) && !isNaN(y)) ? { x, y } : null;
  }).filter(Boolean);

  const xs = scatterData.map(d=>d.x), ys = scatterData.map(d=>d.y);
  const mx = xs.reduce((a,b)=>a+b,0)/xs.length||0;
  const my = ys.reduce((a,b)=>a+b,0)/ys.length||0;
  const stdX = Math.sqrt(xs.reduce((a,b)=>a+(b-mx)**2,0)/xs.length)||1;
  const stdY = Math.sqrt(ys.reduce((a,b)=>a+(b-my)**2,0)/ys.length)||1;
  const isOutlier = d => Math.abs(d.x-mx)/stdX>2 || Math.abs(d.y-my)/stdY>2;
  const outlierCount = scatterData.filter(isOutlier).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-xs text-white/35">X axis:</span>
          <select value={colX} onChange={e=>setColX(Number(e.target.value))}
            className="px-2 py-1.5 bg-white/5 border border-white/10 rounded-xl text-xs text-foreground focus:outline-none">
            {numCols.map((c,i) => <option key={c.name} value={i}>{c.name.replace(/_/g,' ')}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-white/35">Y axis:</span>
          <select value={colY} onChange={e=>setColY(Number(e.target.value))}
            className="px-2 py-1.5 bg-white/5 border border-white/10 rounded-xl text-xs text-foreground focus:outline-none">
            {numCols.map((c,i) => <option key={c.name} value={i}>{c.name.replace(/_/g,' ')}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-3 text-xs text-white/35 ml-auto">
          <span>{scatterData.length} points</span>
          <span className="text-orange-400 font-semibold">{outlierCount} outliers</span>
        </div>
      </div>
      <div className="rounded-2xl p-5 border border-white/6">
        <ResponsiveContainer width="100%" height={320}>
          <RechartsScatter data={scatterData} margin={{ top:4, right:8, bottom:4, left:0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis type="number" dataKey="x" name={xKey} tick={axisStyle} tickLine={false} axisLine={false} tickFormatter={fmtV} />
            <YAxis type="number" dataKey="y" name={yKey} tick={axisStyle} tickLine={false} axisLine={false} tickFormatter={fmtV} width={44} />
            <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v,n) => [fmtV(v), n==='x'?xKey:yKey]} />
            <Scatter>
              {scatterData.map((d,i) => (
                <Cell key={i} fill={isOutlier(d)?'#ff6b35':'#00e5ff'} fillOpacity={isOutlier(d)?0.9:0.45} />
              ))}
            </Scatter>
          </RechartsScatter>
        </ResponsiveContainer>
        <div className="flex items-center gap-4 mt-2 text-xs text-white/35">
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-cyan-400/50 inline-block" /> Normal</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-orange-400 inline-block" /> Outlier (&gt;2σ)</span>
        </div>
      </div>
    </div>
  );
}

// ── Detail table tab ──────────────────────────────────────────────
function DetailTab({ table }) {
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const pageSize = 25;
  const cols = table.columns || [];

  const filteredRows = useMemo(() => {
    if (!search.trim()) return table.rows || [];
    const s = search.toLowerCase();
    return (table.rows||[]).filter(row => Object.values(row).some(v => String(v).toLowerCase().includes(s)));
  }, [table.rows, search]);

  const totalPages = Math.ceil(filteredRows.length / pageSize);
  const visibleRows = filteredRows.slice(page*pageSize, (page+1)*pageSize);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="text-xs text-white/35">
          {filteredRows.length.toLocaleString()} rows · {cols.length} columns
          {search && ` · filtered from ${table.rows?.length?.toLocaleString()}`}
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-white/30" />
            <input value={search} onChange={e=>{ setSearch(e.target.value); setPage(0); }}
              placeholder="Search rows…"
              className="pl-7 pr-3 py-1.5 bg-white/5 border border-white/10 rounded-xl text-xs focus:outline-none focus:border-cyan-400/30 w-44" />
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            <button disabled={page===0} onClick={()=>setPage(p=>p-1)}
              className="px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/8 hover:bg-white/10 disabled:opacity-30 transition-colors">←</button>
            <span className="text-white/35 px-1">{page+1} / {totalPages||1}</span>
            <button disabled={page>=totalPages-1} onClick={()=>setPage(p=>p+1)}
              className="px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/8 hover:bg-white/10 disabled:opacity-30 transition-colors">→</button>
          </div>
        </div>
      </div>
      <div className="overflow-auto rounded-xl border border-white/8 max-h-[520px]">
        <table className="w-full text-xs">
          <thead className="sticky top-0 z-10">
            <tr className="bg-navy-800 border-b border-white/8">
              {cols.map(c => (
                <th key={c.name} className="px-3 py-2.5 text-left whitespace-nowrap">
                  <div className="font-mono text-white/55 font-medium">{c.name}</div>
                  <div className={`text-xs mt-0.5 ${c.type==='numeric'?'text-blue-400/55':c.type==='date'?'text-teal-400/55':c.type==='category'?'text-purple-400/55':'text-white/20'}`}>{c.type}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row,i) => (
              <tr key={i} className="border-b border-white/5 hover:bg-white/2 transition-colors">
                {cols.map(c => (
                  <td key={c.name} className="px-3 py-2 font-mono text-white/65 whitespace-nowrap max-w-40 truncate">
                    {String(row[c.name]??'—')}
                  </td>
                ))}
              </tr>
            ))}
            {!visibleRows.length && (
              <tr><td colSpan={cols.length} className="px-4 py-8 text-center text-white/25 text-xs">No rows match your search.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────
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
        <p className="text-muted-foreground text-sm mb-6 max-w-xs">Load data and run AI analysis to open the workbook.</p>
        <button onClick={()=>setActiveSection('intake')} className="px-5 py-2.5 bg-cyan-400/10 border border-cyan-400/20 text-cyan-400 rounded-xl text-sm font-semibold hover:bg-cyan-400/15 transition-colors">
          Upload Data
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* KPI + Story strip at top */}
      <div className="px-5 pt-5 pb-3 space-y-3 flex-shrink-0 border-b border-white/5">
        <KPIStrip table={table} results={analysisResults} />
        <StorytellingHeader table={table} results={analysisResults} />
      </div>

      {/* Tab bar */}
      <div className="flex items-center gap-0.5 px-5 py-2.5 border-b border-white/5 overflow-x-auto flex-shrink-0 bg-white/[0.01]">
        {TABS.map(tab => (
          <button key={tab.id} onClick={()=>setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium transition-all whitespace-nowrap ${
              activeTab===tab.id ? 'bg-cyan-400/10 text-cyan-400 border border-cyan-400/20' : 'text-white/35 hover:text-white/65 hover:bg-white/4 border border-transparent'
            }`}>
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-auto p-5">
        <motion.div key={activeTab} initial={{ opacity:0, y:6 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.15 }}>
          {activeTab === 'scorecards'   && <ScorecardsTab results={analysisResults} table={table} />}
          {activeTab === 'trends'       && <TrendsTab results={analysisResults} />}
          {activeTab === 'breakdown'    && <BreakdownTab results={analysisResults} />}
          {activeTab === 'comparison'   && <ComparisonTab results={analysisResults} table={table} />}
          {activeTab === 'distribution' && <DistributionTab table={table} results={analysisResults} />}
          {activeTab === 'highlight'    && <HighlightTab table={table} results={analysisResults} />}
          {activeTab === 'scatter'      && <ScatterTab table={table} results={analysisResults} />}
          {activeTab === 'detail'       && <DetailTab table={table} />}
        </motion.div>
      </div>
    </div>
  );
}