/**
 * Advanced Analytics Lab — Phase 2: Statistical Engine
 * Correlation matrix, regression, hypothesis testing, distribution analysis,
 * causal inference (DiD), outlier detection, forecasting
 * Think: R Studio + SAS + SPSS + Python statsmodels — in the browser
 */
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useWorkspaceStore } from '@/lib/store';
import {
  Activity, BarChart2, GitBranch, AlertTriangle, TrendingUp, Zap,
  Loader2, CheckCircle2, Play, Database, Brain, ChevronRight
} from 'lucide-react';

const ANALYSIS_TYPES = [
  { id: 'correlation_matrix', label: 'Correlation Matrix', icon: Activity, color: '#00e5ff', desc: 'Pearson correlation between all numeric columns. Identifies collinear and related variables.' },
  { id: 'distribution', label: 'Distribution Analysis', icon: BarChart2, color: '#4caf50', desc: 'Full statistical profile: mean, std, skewness, kurtosis, percentiles, distribution shape.' },
  { id: 'regression', label: 'Regression Analysis', icon: TrendingUp, color: '#a855f7', desc: 'Simple linear regression of all numeric predictors against a target variable. R² ranking.' },
  { id: 'forecast', label: 'Holt-Winters Forecast', icon: TrendingUp, color: '#ffcc02', desc: 'Double exponential smoothing with trend component. Forecasts 6 steps ahead.' },
  { id: 'hypothesis_test', label: 'Hypothesis Testing', icon: CheckCircle2, color: '#ff6b35', desc: 'Two-sample t-test across groups. P-value, significance, and group comparison.' },
  { id: 'causal_inference', label: 'Causal Inference (DiD)', icon: GitBranch, color: '#ff2d7a', desc: 'Difference-in-differences estimator for treatment effect and A/B causal impact.' },
  { id: 'outlier_detection', label: 'Outlier Detection', icon: AlertTriangle, color: '#ef4444', desc: 'IQR + Z-score (3σ) hybrid outlier detection. Flags suspicious rows and columns.' },
];

function CorrelationHeatmap({ matrix, columns }) {
  if (!matrix || !columns?.length) return null;
  const getColor = (r) => {
    if (r > 0.7) return '#4caf50';
    if (r > 0.3) return '#00e5ff';
    if (r > -0.3) return 'rgba(255,255,255,0.1)';
    if (r > -0.7) return '#ff6b35';
    return '#ef4444';
  };
  return (
    <div className="overflow-x-auto">
      <table className="text-xs border-collapse">
        <thead>
          <tr>
            <th className="p-1" />
            {columns.map(c => <th key={c} className="p-1 text-white/30 font-mono text-right" style={{ writingMode: 'vertical-rl', height: 80 }}>{c.slice(0, 14)}</th>)}
          </tr>
        </thead>
        <tbody>
          {columns.map(c1 => (
            <tr key={c1}>
              <td className="p-1 text-white/30 font-mono pr-2 text-right whitespace-nowrap">{c1.slice(0, 14)}</td>
              {columns.map(c2 => {
                const r = matrix[c1]?.[c2] ?? 0;
                return (
                  <td key={c2} className="p-1">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center font-mono text-xs font-bold"
                      style={{ background: getColor(r) + '40', color: getColor(r), border: `1px solid ${getColor(r)}30` }}
                      title={`${c1} × ${c2}: ${r}`}>
                      {r.toFixed(1)}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ResultDisplay({ type, result }) {
  if (!result) return null;

  if (type === 'correlation_matrix') {
    return (
      <div className="space-y-4">
        <CorrelationHeatmap matrix={result.matrix} columns={result.columns} />
        {result.significant_pairs?.length > 0 && (
          <div>
            <h4 className="text-xs font-bold text-white/50 mb-2 uppercase tracking-widest">Strong Correlations</h4>
            <div className="space-y-1">
              {result.significant_pairs.slice(0, 6).map((p, i) => (
                <div key={i} className="flex items-center gap-3 text-xs px-3 py-2 rounded-xl bg-white/3 border border-white/6">
                  <span className="font-mono text-cyan-400">{p.col1}</span>
                  <span className="text-white/30">↔</span>
                  <span className="font-mono text-purple-400">{p.col2}</span>
                  <span className="ml-auto font-bold font-mono" style={{ color: p.r > 0 ? '#4caf50' : '#ef4444' }}>r={p.r}</span>
                  <span className="text-white/30">{p.strength} {p.direction}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  if (type === 'distribution') {
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead><tr className="border-b border-white/8 bg-white/3">
            {['Column', 'N', 'Mean', 'Std', 'Min', 'P25', 'Median', 'P75', 'Max', 'Skewness', 'Shape'].map(h => (
              <th key={h} className="px-3 py-2 text-left text-white/35 font-semibold whitespace-nowrap">{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {result.distributions?.map(d => (
              <tr key={d.column} className="border-b border-white/5 hover:bg-white/2">
                <td className="px-3 py-2 font-mono text-cyan-400">{d.column}</td>
                <td className="px-3 py-2 text-white/40 font-mono">{d.n}</td>
                <td className="px-3 py-2 text-white/65 font-mono">{d.mean}</td>
                <td className="px-3 py-2 text-white/40 font-mono">{d.std}</td>
                <td className="px-3 py-2 text-white/30 font-mono">{d.min}</td>
                <td className="px-3 py-2 text-white/30 font-mono">{d.p25}</td>
                <td className="px-3 py-2 text-white/65 font-mono">{d.p50}</td>
                <td className="px-3 py-2 text-white/30 font-mono">{d.p75}</td>
                <td className="px-3 py-2 text-white/30 font-mono">{d.max}</td>
                <td className="px-3 py-2 font-mono" style={{ color: Math.abs(d.skewness) > 1 ? '#ffcc02' : '#4caf50' }}>{d.skewness}</td>
                <td className="px-3 py-2 text-white/45">{d.shape}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (type === 'regression') {
    return (
      <div className="space-y-2">
        {result.regressions?.map((r, i) => (
          <div key={r.predictor} className="flex items-center gap-4 px-4 py-3 rounded-xl bg-white/3 border border-white/6 text-xs">
            <span className="w-5 text-white/25 font-mono">{i + 1}</span>
            <span className="font-mono text-cyan-400 w-32 truncate">{r.predictor}</span>
            <span className="text-white/30">→</span>
            <span className="font-mono text-purple-400">{r.target}</span>
            <div className="flex-1 flex items-center gap-3 ml-2">
              <div className="flex-1 h-1.5 bg-white/8 rounded-full overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${Math.min(100, r.r2 * 100)}%`, background: r.r2 > 0.7 ? '#4caf50' : r.r2 > 0.3 ? '#ffcc02' : '#888' }} />
              </div>
              <span className="font-mono font-bold w-14" style={{ color: r.r2 > 0.7 ? '#4caf50' : r.r2 > 0.3 ? '#ffcc02' : '#888' }}>R²={r.r2}</span>
              <span className="text-white/30">slope={r.slope}</span>
            </div>
          </div>
        ))}
        {result.best_predictor && (
          <div className="px-4 py-3 rounded-xl bg-green-400/5 border border-green-400/20 text-xs text-green-400 font-semibold">
            Best predictor: <span className="font-mono">{result.best_predictor.predictor}</span> (R²={result.best_predictor.r2})
          </div>
        )}
      </div>
    );
  }

  if (type === 'forecast') {
    return (
      <div className="space-y-4">
        {result.forecasts?.map(f => (
          <div key={f.column} className="glass-card rounded-xl p-4 border border-white/8">
            <div className="flex items-center justify-between mb-3">
              <span className="font-mono text-sm font-bold text-cyan-400">{f.column}</span>
              <span className="text-xs text-white/30">trend: <span className="font-mono" style={{ color: f.trend > 0 ? '#4caf50' : '#ef4444' }}>{f.trend > 0 ? '+' : ''}{f.trend}</span>/period</span>
            </div>
            <div className="flex items-end gap-1 h-10 mb-2">
              {f.forecast?.map((pt, i) => {
                const vals = f.forecast.map(p => p.value);
                const max = Math.max(...vals, 1);
                return (
                  <div key={i} className="flex-1 rounded-t-sm" style={{ height: `${(pt.value / max) * 100}%`, background: 'rgba(168,85,247,0.6)' }} />
                );
              })}
            </div>
            <div className="flex gap-2 flex-wrap">
              {f.forecast?.map(pt => (
                <span key={pt.step} className="text-xs px-2 py-1 rounded-lg bg-purple-400/10 border border-purple-400/20 text-purple-400 font-mono">+{pt.step}: {pt.value}</span>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (type === 'hypothesis_test') {
    return (
      <div className="space-y-2">
        {result.tests?.map((t, i) => (
          <div key={i} className={`px-4 py-3 rounded-xl border text-xs flex items-center gap-4 ${t.significant ? 'bg-green-400/5 border-green-400/20' : 'bg-white/3 border-white/6'}`}>
            <div className="flex items-center gap-2">
              {t.significant ? <CheckCircle2 className="w-3.5 h-3.5 text-green-400" /> : <div className="w-3.5 h-3.5 rounded-full bg-white/20" />}
              <span className="text-white/50 font-semibold">{t.significant ? 'Significant' : 'Not Significant'}</span>
            </div>
            <span className="text-white/60"><span className="font-mono text-cyan-400">{t.group_a}</span> vs <span className="font-mono text-purple-400">{t.group_b}</span></span>
            <span className="text-white/35">Δ={Math.round((t.mean_a - t.mean_b) * 100) / 100}</span>
            <span className="text-white/30 ml-auto font-mono">t={t.t} · p={t.pValue}</span>
          </div>
        ))}
      </div>
    );
  }

  if (type === 'causal_inference') {
    const d = result.did;
    return (
      <div className="glass-card rounded-xl p-5 border border-pink-400/20 bg-pink-400/5 text-xs space-y-2">
        <div className="text-sm font-bold text-pink-400">Causal Effect Estimate (DiD)</div>
        <div className="text-white/60">Average Treatment Effect (ATE): <span className="font-mono font-bold text-2xl" style={{ color: d?.ate > 0 ? '#4caf50' : '#ef4444' }}>{d?.ate}</span></div>
        <div className="text-white/40">{d?.interpretation}</div>
        <div className={`flex items-center gap-2 ${d?.significant ? 'text-green-400' : 'text-amber-400'}`}>
          {d?.significant ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
          {d?.significant ? `Statistically significant (p=${d?.pValue})` : `Not significant (p=${d?.pValue})`}
        </div>
      </div>
    );
  }

  if (type === 'outlier_detection') {
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          {result.column_outliers?.map(o => (
            <div key={o.column} className="bg-white/3 rounded-xl p-3 border border-white/6 text-xs">
              <div className="font-mono text-cyan-400 mb-1">{o.column}</div>
              <div className="text-white/50">{o.count} outliers (<span className="font-bold text-amber-400">{o.pct}%</span>)</div>
              <div className="text-white/30">IQR bounds: [{o.iqr_bounds?.[0]}, {o.iqr_bounds?.[1]}]</div>
              <div className="text-white/25">Z-score (&gt;3σ): {o.zscore_count}</div>
            </div>
          ))}
        </div>
        {result.flagged_rows?.length > 0 && (
          <div className="text-xs text-amber-400">{result.total_flagged} rows flagged as outliers</div>
        )}
      </div>
    );
  }

  return <pre className="text-xs text-white/40 overflow-auto">{JSON.stringify(result, null, 2).slice(0, 2000)}</pre>;
}

export default function AdvancedAnalyticsLab() {
  const { getActiveTable } = useWorkspaceStore();
  const table = getActiveTable();
  const [selected, setSelected] = useState(null);
  const [targetCol, setTargetCol] = useState('');
  const [groupCol, setGroupCol] = useState('');
  const [treatmentCol, setTreatmentCol] = useState('');
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const columns = table?.columns || [];

  const run = async () => {
    if (!selected || !table) return;
    setRunning(true); setResult(null); setError('');
    try {
      const res = await base44.functions.invoke('runAdvancedAnalytics', {
        analysisType: selected.id,
        rows: table.rows?.slice(0, 500) || [],
        columns: columns.slice(0, 30),
        targetColumn: targetCol,
        groupColumn: groupCol,
        treatmentColumn: treatmentCol,
        steps: 6,
      });
      setResult(res.data);
    } catch (e) {
      setError(e.message);
    }
    setRunning(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-white/8 px-8 py-5 flex items-center justify-between"
        style={{ background: 'linear-gradient(135deg, rgba(168,85,247,0.05) 0%, rgba(0,229,255,0.04) 100%)' }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-400/15 border border-purple-400/25 flex items-center justify-center">
            <Activity className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h1 className="text-xl font-black">Advanced Analytics Lab</h1>
            <p className="text-xs text-muted-foreground">Correlation · Regression · Hypothesis Testing · Causal Inference · Outlier Detection · Forecasting</p>
          </div>
        </div>
        {table && <div className="text-xs text-white/30 px-3 py-1.5 rounded-xl bg-white/5 border border-white/8">{table.name} · {table.rows?.length} rows</div>}
      </div>

      <div className="p-6 max-w-[1400px] mx-auto">
        {!table ? (
          <div className="text-center py-20 text-white/30">
            <Database className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Load a dataset in the Workspace to run statistical analysis.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Selector */}
            <div className="space-y-3">
              <h2 className="text-xs font-bold text-white/40 uppercase tracking-widest">Choose Analysis</h2>
              {ANALYSIS_TYPES.map(a => (
                <button key={a.id} onClick={() => { setSelected(a); setResult(null); setError(''); }}
                  className={`w-full text-left glass-card rounded-xl p-3.5 border transition-all ${selected?.id === a.id ? '' : 'border-white/8 hover:border-white/15'}`}
                  style={selected?.id === a.id ? { borderColor: `${a.color}40`, boxShadow: `0 0 16px ${a.color}15` } : {}}>
                  <div className="flex items-center gap-2 mb-1">
                    <a.icon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: a.color }} />
                    <span className="text-xs font-bold" style={{ color: selected?.id === a.id ? a.color : 'rgba(255,255,255,0.7)' }}>{a.label}</span>
                  </div>
                  <p className="text-xs text-white/30 leading-relaxed pl-5">{a.desc}</p>
                </button>
              ))}
            </div>

            {/* Config + Results */}
            <div className="lg:col-span-2 space-y-4">
              {selected && (
                <div className="glass-card rounded-2xl p-5 border border-white/8 space-y-4">
                  <h3 className="font-bold text-sm" style={{ color: selected.color }}>{selected.label}</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {['regression', 'hypothesis_test', 'causal_inference', 'forecast'].includes(selected.id) && (
                      <div>
                        <label className="text-xs text-white/40 mb-1 block">Target Column</label>
                        <select value={targetCol} onChange={e => setTargetCol(e.target.value)}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white/70 focus:outline-none">
                          <option value="">Select…</option>
                          {columns.map(c => <option key={c.name || c} value={c.name || c}>{c.name || c}</option>)}
                        </select>
                      </div>
                    )}
                    {selected.id === 'hypothesis_test' && (
                      <div>
                        <label className="text-xs text-white/40 mb-1 block">Group Column</label>
                        <select value={groupCol} onChange={e => setGroupCol(e.target.value)}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white/70 focus:outline-none">
                          <option value="">Select…</option>
                          {columns.map(c => <option key={c.name || c} value={c.name || c}>{c.name || c}</option>)}
                        </select>
                      </div>
                    )}
                    {selected.id === 'causal_inference' && (
                      <div>
                        <label className="text-xs text-white/40 mb-1 block">Treatment Column (0/1)</label>
                        <select value={treatmentCol} onChange={e => setTreatmentCol(e.target.value)}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white/70 focus:outline-none">
                          <option value="">Select…</option>
                          {columns.map(c => <option key={c.name || c} value={c.name || c}>{c.name || c}</option>)}
                        </select>
                      </div>
                    )}
                  </div>
                  <button onClick={run} disabled={running}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all disabled:opacity-40"
                    style={{ background: selected.color, color: 'hsl(222,47%,6%)' }}>
                    {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                    {running ? 'Running…' : `Run ${selected.label}`}
                  </button>
                </div>
              )}

              {error && <div className="px-4 py-3 rounded-xl bg-red-400/8 border border-red-400/20 text-sm text-red-400">{error}</div>}

              {result && (
                <div className="glass-card rounded-2xl p-5 border border-white/8">
                  <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-400" /> Results — {selected?.label}
                  </h3>
                  <ResultDisplay type={selected?.id} result={result} />
                </div>
              )}

              {!selected && (
                <div className="text-center py-20 text-white/25 text-sm">
                  <Brain className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  Select an analysis type to get started
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}