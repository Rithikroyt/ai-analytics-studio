/**
 * Advanced Analytics Lab — Phase 3 Full Upgrade
 * 10 tabs: RFM, Funnel, Cohort, Churn, Market Basket, Forecasting,
 * Anomaly Detection, Customer Clustering, ML Studio, What-If
 */
import { useState } from 'react';
import { useWorkspaceStore } from '@/lib/store';
import { motion } from 'framer-motion';
import {
  Users, TrendingDown, RefreshCw, UserX, ShoppingCart,
  TrendingUp, AlertTriangle, Target, Brain, Sliders, Database
} from 'lucide-react';

import RFMAnalysis from '@/components/analytics/RFMAnalysis.jsx';
import FunnelAnalysis from '@/components/analytics/FunnelAnalysis.jsx';
import CohortRetention from '@/components/analytics/CohortRetention.jsx';
import ChurnAnalysis from '@/components/analytics/ChurnAnalysis.jsx';
import MarketBasket from '@/components/analytics/MarketBasket.jsx';
import ForecastEnginePanel from '@/components/forecast/ForecastEnginePanel.jsx';
import AnomalyDetection from '@/components/analytics/AnomalyDetection.jsx';
import CustomerClustering from '@/components/analytics/CustomerClustering.jsx';
import MLModelStudio from '@/components/analytics/MLModelStudio.jsx';

// Minimal inline What-If from original file
import { base44 } from '@/api/base44Client';
import { Loader2, RefreshCw as Refresh, Activity, BarChart2, GitBranch, CheckCircle2, Play } from 'lucide-react';

// Keep original stats engine analyses accessible via "Classic" tab
const CLASSIC_TYPES = [
  { id: 'correlation_matrix', label: 'Correlation Matrix', color: '#00e5ff', desc: 'Pearson correlation between all numeric columns.' },
  { id: 'distribution', label: 'Distribution', color: '#4caf50', desc: 'Full statistical profile per numeric column.' },
  { id: 'regression', label: 'Regression', color: '#a855f7', desc: 'Linear regression of predictors vs a target.' },
  { id: 'hypothesis_test', label: 'Hypothesis Test', color: '#ff6b35', desc: 'Two-sample t-test across groups.' },
  { id: 'causal_inference', label: 'Causal Inference (DiD)', color: '#ff2d7a', desc: 'Difference-in-differences treatment effect.' },
  { id: 'outlier_detection', label: 'Outlier Detection', color: '#ef4444', desc: 'IQR + Z-score outlier flagging.' },
];

const TABS = [
  { id: 'rfm',        label: 'RFM',              icon: Users,         color: '#00e5ff' },
  { id: 'funnel',     label: 'Funnel',            icon: TrendingDown,  color: '#60a5fa' },
  { id: 'cohort',     label: 'Cohort',            icon: RefreshCw,     color: '#4ade80' },
  { id: 'churn',      label: 'Churn',             icon: UserX,         color: '#f87171' },
  { id: 'basket',     label: 'Market Basket',     icon: ShoppingCart,  color: '#fb923c' },
  { id: 'forecast',   label: 'Forecast',          icon: TrendingUp,    color: '#a855f7' },
  { id: 'anomaly',    label: 'Anomaly',           icon: AlertTriangle, color: '#fbbf24' },
  { id: 'clustering', label: 'Clustering',        icon: Target,        color: '#a855f7' },
  { id: 'ml',         label: 'ML Studio',         icon: Brain,         color: '#818cf8' },
  { id: 'whatif',     label: 'What-If',           icon: Sliders,       color: '#00e5ff' },
  { id: 'classic',    label: 'Statistical',       icon: BarChart2,     color: '#888' },
];

function WhatIfSimulator({ columns, rows }) {
  const numericCols = columns.filter(c => {
    const name = c.name || c;
    const vals = (rows || []).slice(0, 30).map(r => parseFloat(r[name])).filter(v => !isNaN(v));
    return vals.length > 5;
  }).slice(0, 6);

  const [metricCol, setMetricCol] = useState(numericCols[0]?.name || numericCols[0] || '');
  const [sliders, setSliders] = useState({});

  const baseline = {};
  for (const col of numericCols) {
    const name = col.name || col;
    const vals = rows.map(r => parseFloat(r[name])).filter(v => !isNaN(v));
    if (vals.length) baseline[name] = { mean: vals.reduce((a, b) => a + b, 0) / vals.length };
  }

  const initSliders = () => {
    const s = {};
    numericCols.forEach(c => { const n = c.name || c; if (n !== metricCol) s[n] = 0; });
    setSliders(s);
  };

  const impact = (() => {
    if (!metricCol || !Object.keys(sliders).length) return null;
    const base = baseline[metricCol];
    if (!base) return null;
    let total = 0;
    const contributions = [];
    for (const [col, pct] of Object.entries(sliders)) {
      if (!pct) continue;
      const e = 0.35 + Math.random() * 0.3;
      const c = (pct / 100) * e * 100;
      total += c;
      contributions.push({ col, pct, contribution: Math.round(c * 100) / 100 });
    }
    return { baseline: Math.round(base.mean * 100) / 100, projected: Math.round(base.mean * (1 + total / 100) * 100) / 100, pctChange: Math.round(total * 100) / 100, contributions };
  })();

  if (!numericCols.length) return <div className="text-center py-12 text-white/30 text-sm">No numeric columns detected.</div>;
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-4">
        <div>
          <label className="text-xs text-white/35 mb-1 block">Primary Metric</label>
          <select value={metricCol} onChange={e => setMetricCol(e.target.value)} className="px-3 py-2 bg-white/5 border border-cyan-400/20 rounded-xl text-sm text-cyan-400 focus:outline-none">
            {numericCols.map(c => { const n = c.name || c; return <option key={n} value={n}>{n}</option>; })}
          </select>
        </div>
        <button onClick={initSliders} className="flex items-center gap-1.5 px-3 py-2 bg-cyan-400/15 border border-cyan-400/25 text-cyan-400 rounded-xl text-xs font-semibold mt-4">
          <Refresh className="w-3.5 h-3.5" /> Init Sliders
        </button>
      </div>
      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-3">
          {numericCols.filter(c => (c.name || c) !== metricCol).map(col => {
            const name = col.name || col;
            const val = sliders[name] ?? 0;
            return (
              <div key={name} className="p-3 rounded-xl bg-white/3 border border-white/8 space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="font-mono text-cyan-400/80">{name}</span>
                  <span className={`font-bold font-mono px-2 py-0.5 rounded ${val > 0 ? 'text-green-400' : val < 0 ? 'text-red-400' : 'text-white/30'}`}>{val > 0 ? '+' : ''}{val}%</span>
                </div>
                <input type="range" min="-50" max="50" value={val} onChange={e => setSliders(s => ({ ...s, [name]: parseInt(e.target.value) }))} className="w-full h-1.5 rounded-full cursor-pointer accent-cyan-400" />
              </div>
            );
          })}
        </div>
        {impact && (
          <div className="p-5 rounded-2xl border border-cyan-400/20 bg-cyan-400/5 text-center">
            <div className="text-xs text-white/40 uppercase tracking-widest mb-2">{metricCol} — Projected</div>
            <div className={`text-4xl font-black mb-1 ${impact.pctChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>{impact.projected.toLocaleString()}</div>
            <div className="text-xs text-white/40">Baseline: {impact.baseline.toLocaleString()} · <span className={`font-bold ${impact.pctChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>{impact.pctChange >= 0 ? '+' : ''}{impact.pctChange}%</span></div>
          </div>
        )}
      </div>
    </div>
  );
}

function ClassicStats({ table }) {
  const [selected, setSelected] = useState(CLASSIC_TYPES[0]);
  const [targetCol, setTargetCol] = useState('');
  const [groupCol, setGroupCol] = useState('');
  const [treatmentCol, setTreatmentCol] = useState('');
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const columns = table?.columns || [];

  const run = async () => {
    setRunning(true); setResult(null); setError('');
    try {
      const res = await base44.functions.invoke('runAdvancedAnalytics', {
        analysisType: selected.id, rows: table.rows?.slice(0, 500) || [], columns, targetColumn: targetCol, groupColumn: groupCol, treatmentColumn: treatmentCol, steps: 6,
      });
      setResult(res.data);
    } catch (e) { setError(e.message); }
    setRunning(false);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
        {CLASSIC_TYPES.map(a => (
          <button key={a.id} onClick={() => { setSelected(a); setResult(null); }}
            className={`p-3 rounded-xl border text-left transition-all ${selected.id === a.id ? 'border-white/25 bg-white/5' : 'border-white/8 hover:border-white/15'}`}
            style={selected.id === a.id ? { borderColor: `${a.color}40` } : {}}>
            <div className="text-xs font-bold leading-tight mb-0.5" style={{ color: a.color }}>{a.label}</div>
            <div className="text-xs text-white/25 leading-tight">{a.desc}</div>
          </button>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-3">
        {['regression', 'hypothesis_test', 'causal_inference', 'forecast'].includes(selected.id) && (
          <div>
            <label className="text-xs text-white/40 mb-1 block">Target Column</label>
            <select value={targetCol} onChange={e => setTargetCol(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none">
              <option value="">Select…</option>
              {columns.map(c => <option key={c.name || c} value={c.name || c}>{c.name || c}</option>)}
            </select>
          </div>
        )}
        {selected.id === 'hypothesis_test' && (
          <div>
            <label className="text-xs text-white/40 mb-1 block">Group Column</label>
            <select value={groupCol} onChange={e => setGroupCol(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none">
              <option value="">Select…</option>
              {columns.map(c => <option key={c.name || c} value={c.name || c}>{c.name || c}</option>)}
            </select>
          </div>
        )}
        {selected.id === 'causal_inference' && (
          <div>
            <label className="text-xs text-white/40 mb-1 block">Treatment Column (0/1)</label>
            <select value={treatmentCol} onChange={e => setTreatmentCol(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none">
              <option value="">Select…</option>
              {columns.map(c => <option key={c.name || c} value={c.name || c}>{c.name || c}</option>)}
            </select>
          </div>
        )}
      </div>
      <button onClick={run} disabled={running}
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm disabled:opacity-40"
        style={{ background: selected.color, color: 'hsl(222,47%,6%)' }}>
        {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
        {running ? 'Running…' : `Run ${selected.label}`}
      </button>
      {error && <div className="px-4 py-3 rounded-xl bg-red-400/8 border border-red-400/20 text-sm text-red-400">{error}</div>}
      {result && (
        <pre className="text-xs text-white/40 bg-white/3 border border-white/8 rounded-xl p-4 overflow-auto max-h-64">{JSON.stringify(result, null, 2).slice(0, 2000)}</pre>
      )}
    </div>
  );
}

export default function AdvancedAnalyticsLab() {
  const { getActiveTable } = useWorkspaceStore();
  const table = getActiveTable();
  const [tab, setTab] = useState('rfm');

  const rows = table?.rows || [];
  const columns = table?.columns || [];

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-white/8 px-8 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-400/15 border border-purple-400/25 flex items-center justify-center">
            <Activity className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h1 className="text-xl font-black">Advanced Analytics Lab</h1>
            <p className="text-xs text-muted-foreground">RFM · Funnel · Cohort · Churn · Market Basket · Forecast · Anomaly · Clustering · ML Studio · What-If</p>
          </div>
        </div>
        {table && <div className="text-xs text-white/30 px-3 py-1.5 rounded-xl bg-white/5 border border-white/8">{table.name} · {rows.length} rows · {columns.length} cols</div>}
      </div>

      {/* Tabs */}
      <div className="border-b border-white/8 px-8 flex overflow-x-auto">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-3 text-xs font-semibold whitespace-nowrap border-b-2 transition-all ${tab === t.id ? 'border-current' : 'border-transparent text-white/35 hover:text-white/60'}`}
            style={tab === t.id ? { color: t.color, borderColor: t.color } : {}}>
            <t.icon className="w-3.5 h-3.5" />{t.label}
          </button>
        ))}
      </div>

      <div className="p-6">
        {!table && (
          <div className="text-center py-20 text-white/30">
            <Database className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Load a dataset in the Workspace to run analysis.</p>
          </div>
        )}

        {table && (
          <motion.div key={tab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
            {tab === 'rfm'        && <RFMAnalysis rows={rows} columns={columns} />}
            {tab === 'funnel'     && <FunnelAnalysis rows={rows} columns={columns} />}
            {tab === 'cohort'     && <CohortRetention rows={rows} columns={columns} />}
            {tab === 'churn'      && <ChurnAnalysis rows={rows} columns={columns} />}
            {tab === 'basket'     && <MarketBasket rows={rows} columns={columns} />}
            {tab === 'forecast'   && <ForecastEnginePanel rows={rows} columns={columns} />}
            {tab === 'anomaly'    && <AnomalyDetection rows={rows} columns={columns} />}
            {tab === 'clustering' && <CustomerClustering rows={rows} columns={columns} />}
            {tab === 'ml'         && <MLModelStudio rows={rows} columns={columns} />}
            {tab === 'whatif'     && <WhatIfSimulator columns={columns} rows={rows} />}
            {tab === 'classic'    && <ClassicStats table={table} />}
          </motion.div>
        )}
      </div>
    </div>
  );
}