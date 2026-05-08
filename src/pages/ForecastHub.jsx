/**
 * ForecastHub — Central hub for tracking & comparing past predictive analyses
 */
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useWorkspaceStore } from '@/lib/store';
import {
  History, TrendingUp, TrendingDown, Plus, Trash2, Eye,
  CheckCircle2, AlertTriangle, BarChart3, Brain, Save, Loader2,
  ArrowUpRight, ArrowDownRight, Minus, Target, Database, RefreshCw
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend
} from 'recharts';
import ForecastEvaluator from '@/components/workspace/ForecastEvaluator';
import MLOpsPipelinePanel from '@/components/forecast/MLOpsPipelinePanel';

const fmtV = v => {
  if (v == null || isNaN(Number(v))) return '—';
  const n = Number(v);
  if (Math.abs(n) >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (Math.abs(n) >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
};

const TOOLTIP_STYLE = { backgroundColor: 'rgba(5,10,24,0.97)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, fontSize: 11, color: '#e2e8f0' };
const axisStyle = { fontSize: 9, fill: 'rgba(255,255,255,0.3)' };

export default function ForecastHub() {
  const { analysisResults, tables } = useWorkspaceStore();
  const table = tables?.[0];
  const r = analysisResults;

  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [notes, setNotes] = useState('');
  const [showNotes, setShowNotes] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [activeTab, setActiveTab] = useState('history'); // 'history' | 'mlops'
  const [showCI, setShowCI] = useState(true);
  const [ciWidth, setCiWidth] = useState(20); // ±% confidence band
  const [growthAdj, setGrowthAdj] = useState(0); // manual growth adjustment %

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    setLoading(true);
    const data = await base44.entities.ForecastHistory.list('-created_date', 50);
    setHistory(data);
    setLoading(false);
  };

  const saveSnapshot = async () => {
    if (!r || !table) return;
    setSaving(true);
    await base44.entities.ForecastHistory.create({
      tableName: table.name,
      primaryLabel: r.primaryLabel,
      totalValue: r.totalValue,
      growthRate: r.growthRate,
      forecastSummary: r.forecastData?.slice(0, 12) || [],
      actualSummary: r.trendData?.slice(-12) || [],
      anomalyCount: r.anomalies?.length || 0,
      scenarioBase: r.forecastData?.[r.forecastData.length - 1]?.value,
      scenarioBull: r.forecastData?.[r.forecastData.length - 1]?.value * 1.2,
      scenarioBear: r.forecastData?.[r.forecastData.length - 1]?.value * 0.8,
      qualityScore: table.qualityScore,
      notes: notes.trim() || undefined,
    });
    setNotes('');
    setShowNotes(false);
    setSaving(false);
    fetchHistory();
  };

  // Build comparison chart data from selected snapshots
  const comparisonData = (() => {
    const selected = history.filter(h => selectedIds.includes(h.id));
    if (selected.length < 2) return null;
    const allDates = [...new Set(selected.flatMap(s => (s.forecastSummary || []).map(d => d.date)))].sort();
    return allDates.map(date => {
      const point = { date };
      selected.forEach(s => {
        const match = (s.forecastSummary || []).find(d => d.date === date);
        if (match) point[`${s.tableName} ${new Date(s.created_date).toLocaleDateString()}`] = match.value;
      });
      return point;
    });
  })();

  const COMPARE_COLORS = ['#a855f7', '#00e5ff', '#4ade80', '#fbbf24', '#f87171'];
  const selectedSnapshots = history.filter(h => selectedIds.includes(h.id));

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-white/5 px-8 py-5 bg-white/[0.01]">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <History className="w-5 h-5 text-teal-400" />
              <h1 className="text-xl font-bold">Forecast History Hub</h1>
            </div>
            <p className="text-sm text-muted-foreground">Track, compare, and validate past predictive analyses against actual performance</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Tab switcher */}
            <div className="flex gap-0.5 p-1 bg-white/5 rounded-xl border border-white/8">
              <button onClick={() => setActiveTab('history')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${activeTab === 'history' ? 'bg-teal-400/20 text-teal-400' : 'text-white/40 hover:text-white/70'}`}>
                <History className="w-3.5 h-3.5" /> History
              </button>
              <button onClick={() => setActiveTab('mlops')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${activeTab === 'mlops' ? 'bg-teal-400/20 text-teal-400' : 'text-white/40 hover:text-white/70'}`}>
                <RefreshCw className="w-3.5 h-3.5" /> MLOps
              </button>
            </div>
            <Link to="/predictive" className="flex items-center gap-2 px-4 py-2 bg-purple-400/10 border border-purple-400/20 text-purple-400 rounded-xl text-sm font-semibold hover:bg-purple-400/15 transition-all">
              <Brain className="w-3.5 h-3.5" /> Predictive
            </Link>
            {r && table && activeTab === 'history' && (
              <button onClick={() => setShowNotes(v => !v)}
                className="flex items-center gap-2 px-4 py-2.5 bg-teal-400 rounded-xl text-sm font-bold hover:bg-teal-300 transition-all"
                style={{ color: 'hsl(222,47%,6%)' }}>
                <Save className="w-4 h-4" /> Save Snapshot
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-8 py-6 space-y-6">
        {/* MLOps Tab */}
        {activeTab === 'mlops' && (
          <MLOpsPipelinePanel history={history} />
        )}

        {activeTab === 'history' && <>

        {/* Confidence interval + growth projection controls */}
        {r?.forecastData?.length > 0 && (
          <div className="glass-card rounded-2xl p-5 border border-purple-400/15 bg-purple-400/3">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-lg bg-purple-400/15 flex items-center justify-center">
                <TrendingUp className="w-3.5 h-3.5 text-purple-400" />
              </div>
              <span className="font-semibold text-sm">Forecast Controls</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* CI toggle */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs text-white/50">Confidence Bands</label>
                  <button onClick={() => setShowCI(v => !v)}
                    className={`relative w-9 h-5 rounded-full transition-all ${showCI ? 'bg-purple-400' : 'bg-white/15'}`}>
                    <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${showCI ? 'left-4' : 'left-0.5'}`} />
                  </button>
                </div>
                {showCI && (
                  <div className="space-y-1">
                    <input type="range" min={5} max={40} value={ciWidth} onChange={e => setCiWidth(Number(e.target.value))}
                      className="w-full accent-purple-400" />
                    <div className="flex justify-between text-xs text-white/30">
                      <span>Tight</span>
                      <span className="text-purple-400 font-mono">±{ciWidth}%</span>
                      <span>Wide</span>
                    </div>
                  </div>
                )}
                <p className="text-xs text-white/25 mt-1">
                  {showCI ? `Showing ±${ciWidth}% confidence band around forecast` : 'Bands hidden'}
                </p>
              </div>
              {/* Growth adjustment */}
              <div>
                <label className="text-xs text-white/50 mb-2 block">Growth Adjustment</label>
                <input type="range" min={-30} max={50} value={growthAdj} onChange={e => setGrowthAdj(Number(e.target.value))}
                  className="w-full accent-teal-400" />
                <div className="flex justify-between text-xs text-white/30 mt-1">
                  <span>-30%</span>
                  <span className={`font-mono font-bold ${growthAdj > 0 ? 'text-green-400' : growthAdj < 0 ? 'text-red-400' : 'text-white/50'}`}>
                    {growthAdj > 0 ? '+' : ''}{growthAdj}%
                  </span>
                  <span>+50%</span>
                </div>
                <p className="text-xs text-white/25 mt-1">Manual growth rate override applied to projection</p>
              </div>
              {/* Projection summary */}
              <div className="space-y-2">
                <label className="text-xs text-white/50 block">Adjusted End-Value</label>
                {r.forecastData?.slice(-1).map(d => {
                  const base = d.value;
                  const adj = Math.round(base * (1 + growthAdj / 100));
                  const ciLow = Math.round(adj * (1 - ciWidth / 100));
                  const ciHigh = Math.round(adj * (1 + ciWidth / 100));
                  const fmt = v => { if (v >= 1e6) return `${(v/1e6).toFixed(1)}M`; if (v >= 1e3) return `${(v/1e3).toFixed(0)}K`; return v.toLocaleString(); };
                  return (
                    <div key={d.date} className="space-y-1">
                      <div className="text-xl font-black font-mono text-teal-400">{fmt(adj)}</div>
                      {showCI && <div className="text-xs text-white/35">Range: <span className="font-mono">{fmt(ciLow)} – {fmt(ciHigh)}</span></div>}
                      <div className="text-xs text-white/25">Final period: {d.date}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Forecast evaluator — only shown when there's live analysis */}
        {r?.trendData?.length > 0 && r?.forecastData?.length > 0 && (
          <ForecastEvaluator trendData={r.trendData} forecastData={r.forecastData} primaryLabel={r.primaryLabel} />
        )}

        {/* Save snapshot form */}
        <AnimatePresence>
          {showNotes && r && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden">
              <div className="glass-card rounded-2xl p-5 border border-teal-400/20 bg-teal-400/3 space-y-3">
                <div className="font-semibold text-sm text-teal-400">Save Current Analysis Snapshot</div>
                <div className="flex flex-wrap gap-3 text-xs text-white/50">
                  <span>{table?.name}</span>
                  <span>·</span>
                  <span>{r.primaryLabel}: {fmtV(r.totalValue)}</span>
                  <span>·</span>
                  <span>Growth: {r.growthRate ?? 'N/A'}%</span>
                  <span>·</span>
                  <span>{r.anomalies?.length || 0} anomalies</span>
                </div>
                <textarea value={notes} onChange={e => setNotes(e.target.value)}
                  placeholder="Add analyst notes (optional)…"
                  rows={2}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none text-foreground resize-none" />
                <div className="flex gap-2">
                  <button onClick={() => setShowNotes(false)} className="text-xs px-3 py-2 rounded-lg border border-white/10 text-white/40 hover:bg-white/5 transition-all">Cancel</button>
                  <button onClick={saveSnapshot} disabled={saving}
                    className="flex items-center gap-1.5 text-xs px-4 py-2 bg-teal-400 rounded-xl font-bold disabled:opacity-50 hover:bg-teal-300 transition-all" style={{ color: 'hsl(222,47%,6%)' }}>
                    {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} Save
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Comparison chart */}
        {comparisonData && comparisonData.length > 1 && (
          <div className="glass-card rounded-2xl p-5 border border-purple-400/15">
            <h3 className="font-semibold text-sm mb-1">Forecast Comparison — {selectedSnapshots.length} Snapshots</h3>
            <p className="text-xs text-white/30 mb-4">Overlay of forecast trajectories across selected analyses</p>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={comparisonData} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="date" tick={axisStyle} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis tick={axisStyle} tickFormatter={fmtV} tickLine={false} axisLine={false} width={44} />
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={fmtV} />
                <Legend wrapperStyle={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }} />
                {Object.keys(comparisonData[0] || {}).filter(k => k !== 'date').map((key, i) => (
                  <Line key={key} type="monotone" dataKey={key} stroke={COMPARE_COLORS[i % COMPARE_COLORS.length]} strokeWidth={2} dot={false} />
                ))}
              </LineChart>
            </ResponsiveContainer>
            <button onClick={() => setSelectedIds([])} className="text-xs text-white/30 hover:text-white/60 transition-colors mt-2">Clear selection</button>
          </div>
        )}

        {/* Select prompt */}
        {selectedIds.length === 1 && (
          <div className="flex items-center gap-2 text-xs text-white/35 px-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-teal-400" />
            Select one more snapshot to compare forecast trajectories
          </div>
        )}

        {/* History list */}
        {loading ? (
          <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 text-teal-400 animate-spin" /></div>
        ) : history.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <History className="w-12 h-12 text-white/15 mb-4" />
            <h3 className="font-semibold mb-1">No snapshots yet</h3>
            <p className="text-sm text-muted-foreground max-w-xs">Run an AI analysis in the Workspace, then save a snapshot here to start tracking your forecast history.</p>
            <Link to="/workspace" className="mt-5 flex items-center gap-2 px-4 py-2 bg-teal-400/10 border border-teal-400/20 text-teal-400 rounded-xl text-sm font-semibold hover:bg-teal-400/15 transition-all">
              <Database className="w-3.5 h-3.5" /> Open Workspace
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {history.map((snap, i) => {
              const isSelected = selectedIds.includes(snap.id);
              const isExpanded = expandedId === snap.id;
              const gColor = snap.growthRate >= 0 ? '#4ade80' : '#f87171';
              const GIcon = snap.growthRate > 0 ? ArrowUpRight : snap.growthRate < 0 ? ArrowDownRight : Minus;
              return (
                <motion.div key={snap.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                  className={`glass-card rounded-2xl border transition-all ${isSelected ? 'border-teal-400/30 bg-teal-400/3' : 'border-white/8'}`}>
                  <div className="p-4 flex items-center gap-4 flex-wrap">
                    {/* Select checkbox */}
                    <button onClick={() => setSelectedIds(prev => isSelected ? prev.filter(id => id !== snap.id) : [...prev.slice(-1), snap.id])}
                      className={`w-5 h-5 rounded-md border flex items-center justify-center flex-shrink-0 transition-all ${isSelected ? 'bg-teal-400 border-teal-400' : 'border-white/20 hover:border-teal-400/50'}`}>
                      {isSelected && <CheckCircle2 className="w-3 h-3 text-white" />}
                    </button>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm text-white/80">{snap.tableName}</span>
                        <span className="text-xs text-white/25">
                          {new Date(snap.created_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 flex-wrap text-xs">
                        <span className="text-white/50">{snap.primaryLabel}: <span className="font-mono text-white/70">{fmtV(snap.totalValue)}</span></span>
                        {snap.growthRate != null && (
                          <span className="flex items-center gap-0.5 font-mono font-bold" style={{ color: gColor }}>
                            <GIcon className="w-3 h-3" /> {snap.growthRate}%
                          </span>
                        )}
                        {snap.anomalyCount > 0 && (
                          <span className="flex items-center gap-1 text-amber-400"><AlertTriangle className="w-3 h-3" /> {snap.anomalyCount}</span>
                        )}
                        {snap.qualityScore && <span className="text-white/30">Q: {snap.qualityScore}%</span>}
                      </div>
                      {snap.notes && <p className="text-xs text-white/35 mt-1 italic">"{snap.notes}"</p>}
                    </div>

                    {/* Scenario end values */}
                    <div className="hidden md:flex items-center gap-3 text-xs">
                      {[['Base', snap.scenarioBase, '#a855f7'], ['Bull', snap.scenarioBull, '#4ade80'], ['Bear', snap.scenarioBear, '#f87171']].map(([label, val, color]) => val && (
                        <div key={label} className="text-center">
                          <div className="font-mono font-bold" style={{ color }}>{fmtV(val)}</div>
                          <div className="text-white/25">{label}</div>
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button onClick={() => setExpandedId(isExpanded ? null : snap.id)}
                        className="p-1.5 rounded-lg hover:bg-white/8 text-white/30 hover:text-white/70 transition-all">
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={async () => { await base44.entities.ForecastHistory.delete(snap.id); fetchHistory(); }}
                        className="p-1.5 rounded-lg hover:bg-red-400/10 text-white/20 hover:text-red-400 transition-all">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Expanded detail */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden border-t border-white/5">
                        <div className="p-4 space-y-3">
                          {snap.narrative && (
                            <div>
                              <div className="text-xs font-semibold text-white/30 uppercase tracking-widest mb-1">AI Narrative</div>
                              <p className="text-xs text-white/55 leading-relaxed line-clamp-4">{snap.narrative}</p>
                            </div>
                          )}
                          {snap.forecastSummary?.length > 0 && (
                            <div>
                              <div className="text-xs font-semibold text-white/30 uppercase tracking-widest mb-2">Forecast Preview</div>
                              <div className="flex gap-2 overflow-x-auto">
                                {snap.forecastSummary.slice(0, 6).map(d => (
                                  <div key={d.date} className="flex-shrink-0 text-center p-2 rounded-lg bg-purple-400/5 border border-purple-400/15">
                                    <div className="font-mono text-xs font-bold text-purple-400">{fmtV(d.value)}</div>
                                    <div className="text-xs text-white/25 mt-0.5">{d.date}</div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          {/* Accuracy input */}
                          <div className="flex items-center gap-3">
                            <label className="text-xs text-white/35">Actual Accuracy %:</label>
                            <input type="number" defaultValue={snap.accuracy || ''}
                              onBlur={async e => {
                                if (e.target.value) await base44.entities.ForecastHistory.update(snap.id, { accuracy: Number(e.target.value) });
                              }}
                              placeholder="e.g. 92"
                              className="w-24 px-2 py-1 bg-white/5 border border-white/10 rounded-lg text-xs focus:outline-none text-foreground" />
                            <span className="text-xs text-white/25">Enter after observing actual results</span>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        )}
        </>}
      </div>
    </div>
  );
}