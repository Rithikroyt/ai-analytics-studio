/**
 * ContributionAnalysis — Which segment/dimension drove the outcome?
 * Contribution % + anomaly attribution + KPI variance
 */
import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useWorkspaceStore } from '@/lib/store';
import { computeContributions, computeAnomalyContribution, computeKPIVariance } from '@/lib/contributionEngine';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Target, AlertTriangle, TrendingUp, TrendingDown, ArrowRight, Database } from 'lucide-react';

const PALETTE = ['#00e5ff','#7b2fff','#ff6b35','#4caf50','#ff2d7a','#ffcc02','#00bfa5','#e91e63'];
const TOOLTIP_STYLE = { backgroundColor:'rgba(5,10,24,0.97)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:10, fontSize:11, color:'#e2e8f0' };
const axisStyle = { fontSize:9, fill:'rgba(255,255,255,0.3)' };
const fmtV = v => { if (v == null) return '—'; const n = Number(v); if (n >= 1e6) return `${(n/1e6).toFixed(1)}M`; if (n >= 1e3) return `${(n/1e3).toFixed(0)}K`; return n.toLocaleString(undefined, { maximumFractionDigits:1 }); };

export default function ContributionAnalysis() {
  const { getActiveTable, analysisResults, setActiveSection } = useWorkspaceStore();
  const table = getActiveTable();
  const r = analysisResults;

  const numCols = table?.columns?.filter(c => c.type === 'numeric') || [];
  const catCols = table?.columns?.filter(c => c.type === 'category') || [];
  const dateCols = table?.columns?.filter(c => c.type === 'date') || [];

  const [selectedCat, setSelectedCat] = useState(() => catCols[0]?.name || '');
  const [selectedNum, setSelectedNum] = useState(() => r?.primaryMetric || numCols[0]?.name || '');
  const [targetValue, setTargetValue] = useState('');
  const [activeTab, setActiveTab] = useState('contribution');

  const contributions = useMemo(() => {
    if (!table?.rows || !selectedCat || !selectedNum) return [];
    return computeContributions(table.rows, selectedCat, selectedNum);
  }, [table, selectedCat, selectedNum]);

  const anomalyContribs = useMemo(() => {
    const firstAnomaly = r?.anomalies?.[0];
    if (!firstAnomaly || !selectedCat || !selectedNum || !dateCols[0]) return [];
    return computeAnomalyContribution(table?.rows || [], selectedCat, selectedNum, firstAnomaly.date, dateCols[0].name);
  }, [table, r, selectedCat, selectedNum, dateCols]);

  const variance = useMemo(() => {
    if (!targetValue || !r?.totalValue) return null;
    return computeKPIVariance(r.totalValue, Number(targetValue));
  }, [r?.totalValue, targetValue]);

  if (!table) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[400px] text-center">
        <Database className="w-10 h-10 text-white/15 mb-4" />
        <p className="text-sm text-muted-foreground">Upload data to run contribution analysis.</p>
        <button onClick={() => setActiveSection('intake')} className="mt-4 flex items-center gap-2 px-4 py-2 bg-cyan-400/10 border border-cyan-400/20 text-cyan-400 rounded-xl text-xs font-semibold hover:bg-cyan-400/15 transition-colors">
          Upload Data <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-1">Contribution Analysis</h1>
        <p className="text-sm text-muted-foreground">Which segments drove the outcome? Decompose any KPI by dimension.</p>
      </div>

      {/* Controls */}
      <div className="glass-card rounded-2xl p-5 border border-white/8 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="text-xs text-white/40 mb-1.5 block">Dimension (Category)</label>
          <select value={selectedCat} onChange={e => setSelectedCat(e.target.value)}
            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-cyan-400/30 text-foreground">
            <option value="">— Select —</option>
            {catCols.map(c => <option key={c.name} value={c.name}>{c.name.replace(/_/g,' ')}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-white/40 mb-1.5 block">Metric (Numeric)</label>
          <select value={selectedNum} onChange={e => setSelectedNum(e.target.value)}
            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-cyan-400/30 text-foreground">
            <option value="">— Select —</option>
            {numCols.map(c => <option key={c.name} value={c.name}>{c.name.replace(/_/g,' ')}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-white/40 mb-1.5 block">Target Value (for Variance)</label>
          <input type="number" value={targetValue} onChange={e => setTargetValue(e.target.value)}
            placeholder={`e.g. ${fmtV(r?.totalValue ? r.totalValue * 1.1 : 100000)}`}
            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-cyan-400/30 text-foreground" />
        </div>
      </div>

      {/* Variance banner */}
      {variance && (
        <div className={`flex items-center gap-4 p-4 rounded-2xl border ${variance.variancePct >= 0 ? 'bg-green-400/5 border-green-400/20' : 'bg-red-400/5 border-red-400/20'}`}>
          {variance.variancePct >= 0 ? <TrendingUp className="w-5 h-5 text-green-400 flex-shrink-0" /> : <TrendingDown className="w-5 h-5 text-red-400 flex-shrink-0" />}
          <div className="flex-1">
            <div className="font-semibold text-sm">KPI Variance vs Target</div>
            <div className="text-xs text-white/50 mt-0.5">Actual − Target = {variance.variancePct >= 0 ? '+' : ''}{fmtV(variance.variance)} ({variance.variancePct >= 0 ? '+' : ''}{variance.variancePct}%)</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-white/30">Actual</div>
            <div className={`font-mono font-bold text-lg ${variance.variancePct >= 0 ? 'text-green-400' : 'text-red-400'}`}>{fmtV(variance.actual)}</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-white/30">Target</div>
            <div className="font-mono font-bold text-lg text-white/60">{fmtV(variance.target)}</div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-white/5">
        {[{ id:'contribution', label:'Contribution %' }, { id:'anomaly', label:'Anomaly Attribution' }].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-xs font-semibold rounded-t-xl transition-all ${activeTab===tab.id ? 'bg-white/8 text-cyan-400 border-t border-x border-white/10' : 'text-white/35 hover:text-white/65'}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'contribution' && contributions.length > 0 && (
        <div className="space-y-5">
          {/* Chart */}
          <div className="glass-card rounded-2xl p-5 border border-white/8">
            <div className="font-semibold text-sm mb-4">{selectedNum?.replace(/_/g,' ')} Contribution by {selectedCat?.replace(/_/g,' ')}</div>
            <ResponsiveContainer width="100%" height={Math.max(200, contributions.slice(0,10).length * 32)}>
              <BarChart data={contributions.slice(0,10)} layout="vertical" margin={{ top:4, right:60, bottom:4, left:4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis type="number" tick={axisStyle} tickFormatter={v => `${v}%`} tickLine={false} axisLine={false} />
                <YAxis dataKey="name" type="category" tick={{ ...axisStyle, fontSize:10 }} tickLine={false} axisLine={false} width={110} />
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v, n) => [`${v}%`, 'Share']} />
                <Bar dataKey="contribution" radius={[0,4,4,0]}>
                  {contributions.slice(0,10).map((_,i) => <Cell key={i} fill={PALETTE[i%PALETTE.length]} fillOpacity={0.85} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Table */}
          <div className="overflow-hidden rounded-xl border border-white/8">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-white/5 border-b border-white/8">
                  {['Segment', 'Value', 'Share', 'Rank'].map(h => <th key={h} className="px-4 py-2.5 text-left text-white/40 font-medium">{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {contributions.map((c, i) => (
                  <tr key={c.name} className="border-b border-white/5 hover:bg-white/2 transition-colors">
                    <td className="px-4 py-2.5 font-semibold text-white/75">{c.name}</td>
                    <td className="px-4 py-2.5 font-mono text-white/60">{fmtV(c.value)}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-white/5 rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width:`${c.contribution}%`, background: PALETTE[i%PALETTE.length] }} />
                        </div>
                        <span className="font-mono" style={{ color: PALETTE[i%PALETTE.length] }}>{c.contribution}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 font-mono text-white/30">#{i+1}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'anomaly' && (
        <div>
          {!r?.anomalies?.length ? (
            <div className="text-center py-12 text-sm text-white/30">No anomalies detected. Run AI analysis first.</div>
          ) : !anomalyContribs.length ? (
            <div className="text-center py-12 text-sm text-white/30">Select a date column and category to see anomaly attribution.</div>
          ) : (
            <div className="space-y-4">
              <div className="p-3 rounded-xl bg-amber-400/5 border border-amber-400/15 text-xs text-amber-400/80 flex items-start gap-2">
                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                Comparing segment values during anomaly period ({r.anomalies[0]?.date}) vs baseline average.
              </div>
              <div className="space-y-2">
                {anomalyContribs.map((c, i) => (
                  <motion.div key={c.segment} initial={{ opacity:0, x:-8 }} animate={{ opacity:1, x:0 }} transition={{ delay:i*0.04 }}
                    className={`flex items-center gap-4 p-4 rounded-xl border ${Math.abs(c.deviation) > 20 ? 'bg-red-400/5 border-red-400/20' : 'bg-white/2 border-white/8'}`}>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm truncate">{c.segment}</div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-white/40">
                        <span>Baseline: {fmtV(c.baseline)}</span>
                        <span>·</span>
                        <span>Anomaly: {fmtV(c.anomaly)}</span>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className={`font-mono font-bold text-sm ${c.deviation > 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {c.deviation > 0 ? '+' : ''}{c.deviation}%
                      </div>
                      <div className={`text-xs mt-0.5 px-2 py-0.5 rounded-full ${c.impact === 'high' ? 'text-red-400 bg-red-400/10' : c.impact === 'medium' ? 'text-amber-400 bg-amber-400/10' : 'text-white/30 bg-white/5'}`}>
                        {c.impact}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {contributions.length === 0 && activeTab === 'contribution' && (
        <div className="text-center py-12 text-sm text-white/30">Select a dimension and metric to compute contributions.</div>
      )}
    </div>
  );
}