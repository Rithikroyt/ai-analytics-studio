/**
 * StorySection — Executive Command Center
 * Hierarchy: What happened → Why → Where risk is → What to do next
 */
import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWorkspaceStore } from '@/lib/store';
import {
  TrendingUp, TrendingDown, AlertTriangle, CheckCircle2, Sparkles,
  ArrowRight, Download, BarChart3, Activity, Lightbulb, Shield,
  ChevronDown, ChevronUp, Info, Target, Database, Eye, EyeOff,
  BookOpen, FileText, Bookmark
} from 'lucide-react';
import ExportPanel from '@/components/workspace/ExportPanel';
import AdaptiveChart from '@/components/charts/AdaptiveChart';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, ReferenceLine, ComposedChart, Line
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
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
};

// ── Section label ────────────────────────────────────────────────
function SectionLabel({ step, label, color = '#00e5ff' }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div className="w-5 h-5 rounded-md flex items-center justify-center text-xs font-black" style={{ background: `${color}22`, color, border: `1px solid ${color}44` }}>{step}</div>
      <span className="text-xs font-semibold uppercase tracking-widest" style={{ color }}>{label}</span>
    </div>
  );
}

// ── KPI Card ─────────────────────────────────────────────────────
function KpiCard({ label, value, sub, color, icon: CardIcon, highlight }) {
  return (
    <div className={`rounded-2xl p-4 border transition-all ${highlight ? 'border-cyan-400/30 ring-1 ring-cyan-400/10' : 'border-white/8'}`}
      style={{ background: highlight ? `${color}0f` : 'rgba(255,255,255,0.025)' }}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-white/35 uppercase tracking-wider truncate flex-1">{label}</span>
        {CardIcon && <CardIcon className="w-3.5 h-3.5 flex-shrink-0 ml-1" style={{ color }} />}
      </div>
      <div className="font-black font-mono leading-none mb-1.5" style={{ color, fontSize: highlight ? 28 : 22, textShadow: highlight ? `0 0 24px ${color}55` : 'none' }}>{value}</div>
      {sub && <div className="text-xs text-white/35 leading-tight">{sub}</div>}
    </div>
  );
}

// ── Insight headline ─────────────────────────────────────────────
function InsightHeadline({ summary, growthRate, primaryLabel, primaryColor }) {
  const isPositive = Number(growthRate) >= 0;
  return (
    <div className="rounded-2xl p-5 border" style={{ background: `${primaryColor}09`, borderColor: `${primaryColor}25` }}>
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl flex-shrink-0 flex items-center justify-center" style={{ background: `${primaryColor}18` }}>
          <Lightbulb className="w-4.5 h-4.5" style={{ color: primaryColor }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: primaryColor }}>AI Executive Summary</span>
            {growthRate != null && (
              <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-bold"
                style={{ background: isPositive ? 'rgba(76,175,80,0.18)' : 'rgba(255,45,122,0.18)', color: isPositive ? '#4caf50' : '#ff2d7a' }}>
                {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {isPositive ? '+' : ''}{growthRate}% trend
              </span>
            )}
          </div>
          <p className="text-sm text-white/70 leading-relaxed">{summary || 'Run AI analysis to generate an executive summary for this dataset.'}</p>
        </div>
      </div>
    </div>
  );
}

// ── Risk callout ─────────────────────────────────────────────────
function RiskCallout({ anomalies, issues }) {
  const riskCount = (anomalies?.length || 0);
  const hasRisk = riskCount > 0;
  return (
    <div className="rounded-2xl p-4 border" style={{ background: hasRisk ? 'rgba(255,107,53,0.06)' : 'rgba(76,175,80,0.06)', borderColor: hasRisk ? 'rgba(255,107,53,0.25)' : 'rgba(76,175,80,0.25)' }}>
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: hasRisk ? 'rgba(255,107,53,0.18)' : 'rgba(76,175,80,0.18)' }}>
          {hasRisk ? <AlertTriangle className="w-4 h-4 text-orange-400" /> : <CheckCircle2 className="w-4 h-4 text-green-400" />}
        </div>
        <div>
          <div className="text-xs font-semibold mb-0.5" style={{ color: hasRisk ? '#ff6b35' : '#4caf50' }}>
            {hasRisk ? `${riskCount} Anomal${riskCount === 1 ? 'y' : 'ies'} Detected` : 'No Anomalies Detected'}
          </div>
          <div className="text-xs text-white/45 leading-relaxed">
            {hasRisk
              ? `${anomalies.slice(0,2).map(a=>`${a.date}: z=${a.zScore}σ (${a.severity})`).join(' · ')}${riskCount > 2 ? ` +${riskCount-2} more` : ''}`
              : 'All data points within normal statistical bounds (±2σ). Data quality is clean.'}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main trend chart ──────────────────────────────────────────────
function TrendChart({ trendData, forecastData, primaryLabel, color }) {
  const combined = [
    ...(trendData||[]).map(d => ({ ...d, actual: d.value })),
    ...(forecastData||[]).map(d => ({ ...d, forecast: d.value })),
  ];
  const hasForecast = forecastData?.length > 0;
  if (combined.length < 2) return (
    <div className="flex items-center justify-center h-48 text-xs text-white/25 flex-col gap-2">
      <BarChart3 className="w-8 h-8 opacity-30" />
      No time-series data — no date column detected
    </div>
  );
  const uid = `tc-${color?.replace('#','') || 'a'}`;
  return (
    <ResponsiveContainer width="100%" height={240}>
      <ComposedChart data={combined} margin={{ top:8, right:8, bottom:4, left:0 }}>
        <defs>
          <linearGradient id={`${uid}-a`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.35} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
          <linearGradient id={`${uid}-f`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#9c27b0" stopOpacity={0.2} />
            <stop offset="95%" stopColor="#9c27b0" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
        <XAxis dataKey="date" tick={axisStyle} tickLine={false} axisLine={false} interval="preserveStartEnd" />
        <YAxis tick={axisStyle} tickLine={false} axisLine={false} tickFormatter={fmtV} width={44} />
        <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v, n) => [fmtV(v), n === 'actual' ? primaryLabel : '6-Period Forecast']} />
        <Area type="monotone" dataKey="actual" stroke={color} fill={`url(#${uid}-a)`} strokeWidth={2.5} dot={false} activeDot={{ r:5, fill:color }} />
        {hasForecast && <Area type="monotone" dataKey="forecast" stroke="#9c27b0" fill={`url(#${uid}-f)`} strokeWidth={1.5} strokeDasharray="5 3" dot={false} />}
      </ComposedChart>
    </ResponsiveContainer>
  );
}

// ── Segment contribution chart ────────────────────────────────────
function SegmentChart({ data, primaryLabel }) {
  if (!data?.length) return <div className="text-xs text-white/25 py-8 text-center">No segment data available.</div>;
  const total = data.reduce((s,d) => s + (d.value||0), 0);
  return (
    <ResponsiveContainer width="100%" height={Math.max(180, Math.min(data.length,8)*30)}>
      <BarChart data={data.slice(0,8)} layout="vertical" margin={{ top:4, right:48, bottom:4, left:4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
        <XAxis type="number" tick={axisStyle} tickFormatter={fmtV} tickLine={false} axisLine={false} />
        <YAxis dataKey="name" type="category" tick={{ ...axisStyle, fontSize:10 }} tickLine={false} axisLine={false} width={96} />
        <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [fmtV(v), primaryLabel]} />
        <Bar dataKey="value" radius={[0,4,4,0]}>
          {data.slice(0,8).map((_,i) => <Cell key={i} fill={PALETTE[i%PALETTE.length]} fillOpacity={0.85} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// ── Anomaly panel ─────────────────────────────────────────────────
function AnomalyPanel({ anomalies }) {
  if (!anomalies?.length) return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-green-400/5 border border-green-400/20">
      <CheckCircle2 className="w-4 h-4 text-green-400" />
      <span className="text-xs text-green-400">All data within normal bounds — no anomalies detected.</span>
    </div>
  );
  return (
    <div className="space-y-1.5">
      {anomalies.slice(0,6).map((a,i) => (
        <div key={i} className="flex items-center justify-between text-xs p-2.5 rounded-xl"
          style={{ background: a.severity==='high'?'rgba(255,45,122,0.07)':'rgba(255,107,53,0.07)', border:`1px solid ${a.severity==='high'?'rgba(255,45,122,0.2)':'rgba(255,107,53,0.2)'}` }}>
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-3 h-3 flex-shrink-0" style={{ color: a.severity==='high'?'#ff2d7a':'#ff6b35' }} />
            <span className="font-mono text-white/55">{a.date}</span>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="font-mono">{fmtV(a.value)}</span>
            <span className="text-white/25 hidden sm:inline">expected ~{fmtV(a.expected)}</span>
            <span className="px-1.5 py-0.5 rounded-full text-xs font-bold"
              style={{ background:a.severity==='high'?'rgba(255,45,122,0.2)':'rgba(255,107,53,0.2)', color:a.severity==='high'?'#ff2d7a':'#ff6b35' }}>
              z={a.zScore}σ
            </span>
          </div>
        </div>
      ))}
      {anomalies.length > 6 && <div className="text-xs text-white/30 text-center pt-1">+{anomalies.length-6} more anomalies</div>}
    </div>
  );
}

// ── Key drivers panel ─────────────────────────────────────────────
function DriversPanel({ correlations, primaryLabel }) {
  if (!correlations?.length) return <div className="text-xs text-white/25 py-4">No significant correlations found (|r| &lt; 0.3).</div>;
  return (
    <div className="space-y-2">
      {correlations.slice(0,5).map((c,i) => {
        const strength = Math.abs(c.r);
        const color = strength > 0.7 ? '#4caf50' : strength > 0.5 ? '#ffcc02' : '#00e5ff';
        const label = strength > 0.7 ? 'Strong' : strength > 0.5 ? 'Moderate' : 'Weak';
        return (
          <div key={i} className="flex items-center gap-3 p-2.5 rounded-xl bg-white/3 border border-white/6">
            <div className="flex-1 min-w-0">
              <div className="text-xs text-white/60 truncate">
                <span className="font-mono text-white/80">{c.colA.replace(/_/g,' ')}</span>
                <span className="text-white/25 mx-1.5">↔</span>
                <span className="font-mono text-white/80">{c.colB.replace(/_/g,' ')}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="w-16 h-1.5 bg-white/8 rounded-full overflow-hidden">
                <div className="h-full rounded-full" style={{ width:`${strength*100}%`, background:color }} />
              </div>
              <span className="font-mono text-xs font-bold" style={{ color }}>{c.r>0?'+':''}{c.r}</span>
              <span className="text-xs text-white/25 hidden md:inline">{label}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Recommendations panel ─────────────────────────────────────────
function RecommendationsPanel({ recs, keyFindings }) {
  const priorityMeta = {
    critical: { color:'#ff0044', bg:'rgba(255,0,68,0.12)', dot:'bg-red-500' },
    high: { color:'#ff2d7a', bg:'rgba(255,45,122,0.12)', dot:'bg-pink-400' },
    medium: { color:'#ffcc02', bg:'rgba(255,204,2,0.12)', dot:'bg-yellow-400' },
    low: { color:'#4caf50', bg:'rgba(76,175,80,0.12)', dot:'bg-green-400' },
  };
  return (
    <div className="space-y-2">
      {recs?.slice(0,5).map((r,i) => {
        const meta = priorityMeta[r.priority] || priorityMeta.low;
        return (
          <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-white/3 border border-white/6">
            <span className="px-2 py-0.5 rounded text-xs font-black flex-shrink-0 mt-0.5 uppercase" style={{ background:meta.bg, color:meta.color }}>{r.priority}</span>
            <span className="text-xs text-white/60 leading-relaxed">{r.action}</span>
          </div>
        );
      })}
      {keyFindings?.slice(0,3).map((f,i) => (
        <div key={`kf-${i}`} className="flex items-start gap-2 text-xs text-white/45 p-2.5 rounded-lg bg-white/2">
          <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 bg-cyan-400" />
          {f}
        </div>
      ))}
    </div>
  );
}

// ── Global filters ────────────────────────────────────────────────
function GlobalFilters({ table, onFilter }) {
  const catCols = table?.columns?.filter(c => c.type === 'category') || [];
  const [open, setOpen] = useState(false);
  if (!catCols.length) return null;
  return (
    <div className="relative">
      <button onClick={() => setOpen(v=>!v)}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-white/5 border border-white/10 rounded-xl text-white/50 hover:text-white/80 hover:bg-white/8 transition-all">
        <Activity className="w-3 h-3" /> Filters {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity:0, y:-8 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-8 }}
            className="absolute top-full mt-2 right-0 z-30 bg-navy-800 border border-white/10 rounded-xl p-4 w-72 shadow-2xl space-y-3">
            {catCols.slice(0,3).map(col => {
              const vals = [...new Set((table.rows||[]).map(r=>String(r[col.name])).filter(Boolean))].slice(0,8);
              return (
                <div key={col.name}>
                  <div className="text-xs text-white/35 uppercase tracking-widest mb-1.5">{col.name.replace(/_/g,' ')}</div>
                  <div className="flex flex-wrap gap-1">
                    {vals.map(v => (
                      <button key={v} onClick={() => onFilter(col.name, v)}
                        className="text-xs px-2 py-0.5 rounded-lg bg-white/5 border border-white/10 text-white/50 hover:border-cyan-400/30 hover:text-cyan-400 transition-all">
                        {v}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Bottom: Metric definitions ────────────────────────────────────
function MetricDefinitions({ table, analysisResults }) {
  const numCols = table?.columns?.filter(c => c.type === 'numeric') || [];
  return (
    <div className="rounded-2xl border border-white/6 overflow-hidden">
      <div className="px-5 py-3 border-b border-white/6 bg-white/2 flex items-center gap-2">
        <BookOpen className="w-3.5 h-3.5 text-white/30" />
        <span className="text-xs font-semibold text-white/40 uppercase tracking-widest">Metric Definitions</span>
      </div>
      <div className="divide-y divide-white/5">
        {numCols.slice(0,6).map((col, i) => (
          <div key={col.name} className="px-5 py-3 flex items-start gap-4 hover:bg-white/2 transition-colors">
            <div className="font-mono text-xs text-cyan-400/80 w-36 flex-shrink-0 mt-0.5">{col.name.replace(/_/g,' ')}</div>
            <div className="text-xs text-white/45 flex-1">Numeric KPI. Range: {fmtV(col.min)} – {fmtV(col.max)} · Mean: {fmtV(col.mean)} · Std Dev: {fmtV(col.std)}</div>
          </div>
        ))}
        {analysisResults?.primaryMetric && (
          <div className="px-5 py-3 flex items-start gap-4 bg-cyan-400/3">
            <div className="font-mono text-xs text-cyan-400 w-36 flex-shrink-0 mt-0.5">{analysisResults.primaryMetric?.replace(/_/g,' ')} ★</div>
            <div className="text-xs text-white/50 flex-1">Primary KPI — used for trend, anomaly detection, and forecasting. Total: {fmtV(analysisResults.totalValue)}.</div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Bottom: Methodology ───────────────────────────────────────────
function MethodologyPanel({ table }) {
  return (
    <div className="rounded-2xl border border-white/6 p-5 bg-white/1 space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <FileText className="w-3.5 h-3.5 text-white/25" />
        <span className="text-xs font-semibold text-white/35 uppercase tracking-widest">Methodology & Caveats</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-white/35 leading-relaxed">
        <div>
          <div className="text-white/50 font-semibold mb-1">Anomaly Detection</div>
          Z-score + IQR combined method. Points beyond 2σ from the rolling mean are flagged as anomalous. High severity = |z| &gt; 3.
        </div>
        <div>
          <div className="text-white/50 font-semibold mb-1">Forecasting</div>
          Exponential Smoothing (α=0.3) blended with Linear Regression. Requires ≥4 time periods. Confidence widens with horizon.
        </div>
        <div>
          <div className="text-white/50 font-semibold mb-1">Correlations</div>
          Pearson r coefficient. Only pairs with |r| &gt; 0.3 are shown. Correlation ≠ causation.
        </div>
        <div>
          <div className="text-white/50 font-semibold mb-1">Data Source</div>
          Dataset: <span className="font-mono text-white/50">{table?.name}</span> · {table?.rowCount?.toLocaleString()} rows · Analyzed on {new Date().toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' })}.
        </div>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────
export default function StorySection() {
  const { analysisResults, getActiveTable, setActiveSection, saveToDashboard } = useWorkspaceStore();
  const activeTable = getActiveTable();
  const [showExport, setShowExport] = useState(false);
  const [showBottom, setShowBottom] = useState(false);
  const [savedToast, setSavedToast] = useState('');
  const [activeFilter, setActiveFilter] = useState(null);

  if (!analysisResults || !activeTable) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[500px] text-center">
        <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/8 flex items-center justify-center mx-auto mb-4">
          <BarChart3 className="w-7 h-7 text-white/25" />
        </div>
        <h2 className="text-lg font-semibold mb-2">No Dashboard Yet</h2>
        <p className="text-sm text-muted-foreground mb-6">Upload data and run AI analysis to generate your executive dashboard.</p>
        <button onClick={() => setActiveSection('intake')}
          className="flex items-center gap-2 px-5 py-2.5 bg-cyan-400/10 border border-cyan-400/20 text-cyan-400 rounded-xl text-sm font-semibold hover:bg-cyan-400/15 transition-colors">
          Upload Data <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    );
  }

  const r = analysisResults;
  const rows = activeTable.rows || [];
  const columns = activeTable.columns || [];
  const primaryColor = '#00e5ff';

  // KPI cards config
  const kpiCards = [
    { label: r.primaryLabel || 'Primary KPI', value: fmtV(r.totalValue), sub: r.growthRate != null ? `${r.growthRate >= 0 ? '+' : ''}${r.growthRate}% trend` : 'No time data', color: '#00e5ff', icon: TrendingUp, highlight: true },
    { label: 'Records Analyzed', value: fmtV(activeTable.rowCount), sub: `${columns.length} columns`, color: '#00bfa5', icon: Database },
    { label: 'Data Quality', value: `${activeTable.qualityScore}%`, sub: activeTable.qualityScore >= 90 ? 'Excellent' : activeTable.qualityScore >= 70 ? 'Good' : 'Needs work', color: activeTable.qualityScore >= 90 ? '#4caf50' : '#ffcc02', icon: Shield },
    ...(r.secondLabel ? [{ label: r.secondLabel, value: fmtV(r.secondValue), sub: 'secondary metric', color: '#9c27b0', icon: Target }] : []),
    ...(r.breakdownData?.length ? [{ label: 'Top Segment', value: String(r.breakdownData[0]?.name||'').slice(0,14), sub: fmtV(r.breakdownData[0]?.value), color: '#ff6b35', icon: BarChart3 }] : []),
    { label: 'Anomalies', value: String(r.anomalies?.length||0), sub: r.anomalies?.length ? 'statistical outliers' : 'All clear', color: r.anomalies?.length ? '#ff6b35' : '#4caf50', icon: AlertTriangle },
  ].slice(0, 6);

  const handleSaveChart = (chart, label) => {
    saveToDashboard({ chart, insight: r.executiveSummary?.slice(0,200), datasetName: activeTable.name, label });
    setSavedToast(label || 'Chart');
    setTimeout(() => setSavedToast(''), 2500);
  };

  return (
    <div className="overflow-auto" style={{ background: 'linear-gradient(160deg, hsl(222,50%,5%) 0%, hsl(222,44%,7%) 100%)' }}>
      <AnimatePresence>
        {savedToast && (
          <motion.div initial={{ opacity:0, y:-16 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-16 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-400/15 border border-cyan-400/30 text-cyan-400 text-xs font-medium shadow-2xl">
            <Bookmark className="w-3.5 h-3.5" /> "{savedToast}" saved to Dashboard
          </motion.div>
        )}
      </AnimatePresence>

      <div className="p-5 space-y-6 max-w-7xl mx-auto">
        {/* ── Header ─────────────────────────────────────────────── */}
        <motion.div initial={{ opacity:0, y:-12 }} animate={{ opacity:1, y:0 }} className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              <span className="text-xs font-mono text-white/30 uppercase tracking-widest">{r.domainLabel || r.tableName}</span>
            </div>
            <h1 className="text-2xl font-black">{r.tableName}</h1>
            {r.dataStory && <p className="text-xs text-white/30 mt-1 max-w-lg leading-relaxed">{r.dataStory}</p>}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <GlobalFilters table={activeTable} onFilter={(col, val) => setActiveFilter({ col, val })} />
            <button onClick={() => setActiveSection('workbook')}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg text-white/50 hover:text-white/80 bg-white/5 border border-white/8 transition-all">
              Workbook <ArrowRight className="w-3 h-3" />
            </button>
            <div className="relative">
              <button onClick={() => setShowExport(v=>!v)}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg text-white/50 hover:text-white/80 bg-white/5 border border-white/8 transition-all">
                <Download className="w-3 h-3" /> Export
              </button>
              <AnimatePresence>
                {showExport && <ExportPanel analysisResults={analysisResults} table={activeTable} onClose={() => setShowExport(false)} />}
              </AnimatePresence>
            </div>
            <button onClick={() => setActiveSection('analyst')}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-semibold text-black bg-cyan-400 hover:bg-cyan-300 transition-all">
              <Sparkles className="w-3 h-3" /> Ask AI
            </button>
          </div>
        </motion.div>

        {/* ── TOP: KPI Strip + Insight + Risk ───────────────────── */}
        <section className="space-y-4">
          <SectionLabel step="1" label="What Happened" color="#00e5ff" />

          {/* KPI cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {kpiCards.map((k, i) => (
              <motion.div key={k.label} initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }} transition={{ delay: i*0.06 }}>
                <KpiCard {...k} />
              </motion.div>
            ))}
          </div>

          {/* Insight headline + Risk callout side by side */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <InsightHeadline summary={r.executiveSummary} growthRate={r.growthRate} primaryLabel={r.primaryLabel} primaryColor={primaryColor} />
            </div>
            <div>
              <RiskCallout anomalies={r.anomalies} issues={activeTable.issues} />
            </div>
          </div>
        </section>

        {/* ── MIDDLE: Charts ──────────────────────────────────────── */}
        <section className="space-y-4">
          <SectionLabel step="2" label="Why It Happened" color="#7b2fff" />

          {/* Primary trend (large) + segment contribution */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            <div className="xl:col-span-2 rounded-2xl p-5 border" style={{ background:'rgba(0,229,255,0.04)', borderColor:'rgba(0,229,255,0.15)' }}>
              <div className="flex items-start justify-between mb-1">
                <div>
                  <div className="text-xs text-white/30 uppercase tracking-widest mb-0.5">Primary Trend</div>
                  <div className="font-semibold text-sm">{r.primaryLabel} Over Time</div>
                </div>
                <div className="flex items-center gap-2">
                  {r.canForecast && <span className="text-xs text-purple-400/70 bg-purple-400/8 border border-purple-400/20 px-2 py-0.5 rounded-full">+ 6-period forecast</span>}
                  {r.growthRate != null && (
                    <span className="font-mono text-base font-black" style={{ color: Number(r.growthRate)>=0?'#4caf50':'#ff2d7a' }}>
                      {Number(r.growthRate)>=0?'▲':'▼'} {Math.abs(r.growthRate)}%
                    </span>
                  )}
                </div>
              </div>
              <div className="text-xs text-white/20 mb-3">
                {r.canForecast ? 'Dashed purple = AI forecast (Exp. Smoothing + Linear Regression)' : 'No date column detected — descriptive analytics only'}
              </div>
              <TrendChart trendData={r.trendData} forecastData={r.forecastData} primaryLabel={r.primaryLabel} color={primaryColor} />
              <button onClick={() => handleSaveChart({ type:'area', title:`${r.primaryLabel} Trend`, data:(r.trendData||[]).map(d=>({name:d.date,value:d.value})), x_key:'name', y_key:'value' }, `${r.primaryLabel} Trend`)}
                className="mt-2 flex items-center gap-1 text-xs text-white/25 hover:text-cyan-400 transition-colors">
                <Bookmark className="w-3 h-3" /> Save to Dashboard
              </button>
            </div>

            <div className="rounded-2xl p-5 border" style={{ background:'rgba(123,47,255,0.04)', borderColor:'rgba(123,47,255,0.18)' }}>
              <div className="text-xs text-white/30 uppercase tracking-widest mb-0.5">Segment Contribution</div>
              <div className="font-semibold text-sm mb-4">{r.primaryLabel} by {r.primaryDimension?.replace(/_/g,' ') || 'Segment'}</div>
              <SegmentChart data={r.breakdownData} primaryLabel={r.primaryLabel} />
              {r.breakdownData?.length > 0 && (
                <div className="mt-3 space-y-1">
                  {r.breakdownData.slice(0,3).map((d,i) => {
                    const total = r.breakdownData.reduce((s,x) => s+(x.value||0),0);
                    const pct = total > 0 ? (d.value/total*100).toFixed(1) : 0;
                    return (
                      <div key={d.name} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5">
                          <div className="w-1.5 h-1.5 rounded-full" style={{ background:PALETTE[i%PALETTE.length] }} />
                          <span className="text-white/55 truncate max-w-24">{d.name}</span>
                        </div>
                        <span className="font-mono text-white/40">{pct}%</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Key Drivers + AI Panels */}
          {r.chartPanels?.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-white/25 uppercase tracking-widest mb-3 flex items-center gap-2">
                <Sparkles className="w-3 h-3 text-purple-400" /> AI-Generated Insight Panels
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {r.chartPanels.slice(0,6).map((panel,i) => {
                  const tc = { cyan:'#00e5ff', teal:'#00bfa5', purple:'#9c27b0', orange:'#ff6b35', green:'#4caf50', pink:'#ff2d7a', yellow:'#ffcc02', blue:'#29b6f6' }[panel.color_theme] || '#00e5ff';
                  return (
                    <motion.div key={i} initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ delay:i*0.06 }}
                      className="rounded-2xl p-4 group"
                      style={{ background:`${tc}07`, border:`1px solid ${tc}1e` }}>
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="text-xs font-mono text-white/20 uppercase tracking-widest mb-0.5">
                            <span style={{ color:tc }}>{String(i+1).padStart(2,'0')}</span> {panel.chart_type?.replace(/_/g,' ')}
                          </div>
                          <div className="text-sm font-semibold text-white/85">{panel.title}</div>
                        </div>
                        <button onClick={() => handleSaveChart({ type:panel.chart_type, title:panel.title, data:[], x_key:'name', y_key:'value' }, panel.title)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-lg text-white/25 hover:text-cyan-400">
                          <Bookmark className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <AdaptiveChart panel={panel} rows={rows} columns={columns} height={180} />
                      {panel.insight && (
                        <div className="mt-2.5 flex items-start gap-1.5 text-xs text-white/25 leading-relaxed border-t border-white/5 pt-2">
                          <Info className="w-3 h-3 flex-shrink-0 mt-0.5" style={{ color:tc }} />
                          {panel.insight}
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}
        </section>

        {/* ── MIDDLE: Risk + Drivers ───────────────────────────────── */}
        <section>
          <SectionLabel step="3" label="Where the Risk Is" color="#ff6b35" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-2xl p-5 border" style={{ background:'rgba(255,107,53,0.04)', borderColor:'rgba(255,107,53,0.18)' }}>
              <div className="flex items-center justify-between mb-4">
                <div className="font-semibold text-sm">Anomaly Detection</div>
                <span className="text-xs font-mono px-2 py-0.5 rounded-full"
                  style={{ background:r.anomalies?.length?'rgba(255,107,53,0.2)':'rgba(76,175,80,0.2)', color:r.anomalies?.length?'#ff6b35':'#4caf50' }}>
                  {r.anomalies?.length||0} detected
                </span>
              </div>
              <div className="text-xs text-white/25 mb-3">Z-score + IQR combined · threshold = 2σ · severity based on deviation magnitude</div>
              <AnomalyPanel anomalies={r.anomalies} />
            </div>
            <div className="rounded-2xl p-5 border" style={{ background:'rgba(76,175,80,0.04)', borderColor:'rgba(76,175,80,0.15)' }}>
              <div className="font-semibold text-sm mb-1">Key Drivers & Correlations</div>
              <div className="text-xs text-white/25 mb-3">Pearson r · only |r| &gt; 0.3 shown · correlation ≠ causation</div>
              <DriversPanel correlations={r.correlations} primaryLabel={r.primaryLabel} />
            </div>
          </div>
        </section>

        {/* ── BOTTOM: Recommendations ──────────────────────────────── */}
        <section>
          <SectionLabel step="4" label="What to Do Next" color="#4caf50" />
          <div className="rounded-2xl p-5 border" style={{ background:'rgba(76,175,80,0.04)', borderColor:'rgba(76,175,80,0.15)' }}>
            <RecommendationsPanel recs={r.recommendations} keyFindings={r.keyFindings} />
          </div>
        </section>

        {/* ── BOTTOM: Definitions, Methodology (collapsible) ───────── */}
        <section>
          <button onClick={() => setShowBottom(v=>!v)}
            className="flex items-center gap-2 text-xs text-white/30 hover:text-white/55 transition-colors mb-3">
            {showBottom ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            {showBottom ? 'Hide' : 'Show'} Metric Definitions & Methodology
          </button>
          <AnimatePresence>
            {showBottom && (
              <motion.div initial={{ opacity:0, height:0 }} animate={{ opacity:1, height:'auto' }} exit={{ opacity:0, height:0 }}
                className="space-y-4 overflow-hidden">
                <MetricDefinitions table={activeTable} analysisResults={r} />
                <MethodologyPanel table={activeTable} />
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      </div>
    </div>
  );
}