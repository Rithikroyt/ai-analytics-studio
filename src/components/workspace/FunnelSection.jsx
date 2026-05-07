/**
 * FunnelSection — Funnel Analysis with conversion rates + drop-off visualization
 * ConversionRate_i = Stage_i / Stage_i-1
 */
import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useWorkspaceStore } from '@/lib/store';
import { Filter, Database, ArrowRight, AlertTriangle, TrendingDown, Download } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const TOOLTIP_STYLE = { backgroundColor: 'rgba(5,10,24,0.97)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, fontSize: 11, color: '#e2e8f0' };
const axisStyle = { fontSize: 9, fill: 'rgba(255,255,255,0.3)' };

const fmtV = v => {
  if (v == null) return '—';
  const n = Number(v);
  if (isNaN(n)) return String(v);
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(0)}K`;
  return n.toLocaleString();
};

export default function FunnelSection() {
  const { getActiveTable, setActiveSection } = useWorkspaceStore();
  const table = getActiveTable();
  const [stageCol, setStageCol] = useState('');
  const [valueCol, setValueCol] = useState('');
  const [stageOrder, setStageOrder] = useState('');
  const [analyzed, setAnalyzed] = useState(false);

  const catCols = (table?.columns || []).filter(c => c.type === 'category');
  const numCols = (table?.columns || []).filter(c => c.type === 'numeric');

  const funnelData = useMemo(() => {
    if (!analyzed || !stageCol || !table?.rows?.length) return [];

    // Get stage counts
    const stageCounts = {};
    const stageValues = {};
    table.rows.forEach(row => {
      const stage = String(row[stageCol] || '');
      if (!stage) return;
      stageCounts[stage] = (stageCounts[stage] || 0) + 1;
      if (valueCol) {
        const v = Number(row[valueCol]);
        if (!isNaN(v)) stageValues[stage] = (stageValues[stage] || 0) + v;
      }
    });

    // Order stages
    let stages = Object.keys(stageCounts);
    if (stageOrder) {
      const ordered = stageOrder.split(',').map(s => s.trim()).filter(s => stages.includes(s));
      const rest = stages.filter(s => !ordered.includes(s));
      stages = [...ordered, ...rest];
    } else {
      stages.sort((a, b) => stageCounts[b] - stageCounts[a]);
    }

    return stages.map((stage, i) => {
      const count = stageCounts[stage] || 0;
      const prevCount = i > 0 ? stageCounts[stages[i - 1]] || 1 : count;
      const stepConversion = i === 0 ? 100 : +((count / prevCount) * 100).toFixed(1);
      const overallConversion = i === 0 ? 100 : +((count / stageCounts[stages[0]]) * 100).toFixed(1);
      const dropOff = i === 0 ? 0 : prevCount - count;
      return {
        stage,
        count,
        value: stageValues[stage] || 0,
        stepConversion,
        overallConversion,
        dropOff,
        width: (count / stageCounts[stages[0]]) * 100,
      };
    });
  }, [analyzed, stageCol, valueCol, stageOrder, table?.rows]);

  const worstStep = useMemo(() => {
    if (funnelData.length < 2) return null;
    return funnelData.slice(1).reduce((worst, step) => step.stepConversion < worst.stepConversion ? step : worst, funnelData[1]);
  }, [funnelData]);

  const downloadCSV = () => {
    if (!funnelData.length) return;
    const cols = ['stage', 'count', 'stepConversion', 'overallConversion', 'dropOff'];
    const csv = [cols.join(','), ...funnelData.map(r => cols.map(c => r[c]).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'funnel.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  if (!table) return (
    <div className="p-8 flex flex-col items-center justify-center min-h-[500px] text-center">
      <Filter className="w-12 h-12 text-white/20 mb-4" />
      <h2 className="text-lg font-semibold mb-2">Funnel Analysis</h2>
      <p className="text-sm text-muted-foreground mb-5">Upload data with a stage/step column to run funnel analysis.</p>
      <button onClick={() => setActiveSection('intake')} className="flex items-center gap-2 px-5 py-2.5 bg-cyan-400/10 border border-cyan-400/20 text-cyan-400 rounded-xl text-sm font-semibold">Upload Data <ArrowRight className="w-4 h-4" /></button>
    </div>
  );

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6 overflow-auto">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-2 mb-1">
          <Filter className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-mono text-white/40 uppercase tracking-widest">Analytics Layer</span>
        </div>
        <h1 className="text-2xl font-bold mb-1">Funnel Analysis</h1>
        <p className="text-sm text-muted-foreground">Stage-by-stage conversion rates. Formula: ConversionRate_i = Stage_i / Stage_(i-1)</p>
      </motion.div>

      {/* Config */}
      <div className="glass-card rounded-2xl p-5 border border-white/8 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">Stage Column</label>
            <select value={stageCol} onChange={e => { setStageCol(e.target.value); setAnalyzed(false); }} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none">
              <option value="">Select stage column…</option>
              {catCols.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">Value Column <span className="text-white/25">(optional)</span></label>
            <select value={valueCol} onChange={e => { setValueCol(e.target.value); setAnalyzed(false); }} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none">
              <option value="">Count only</option>
              {numCols.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1.5 block">Stage Order <span className="text-white/25">(comma-separated, e.g. "Lead, Prospect, Demo, Close")</span></label>
          <input value={stageOrder} onChange={e => { setStageOrder(e.target.value); setAnalyzed(false); }}
            placeholder="Leave blank to auto-order by count"
            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-cyan-400/30 text-foreground" />
        </div>
        <button onClick={() => setAnalyzed(true)} disabled={!stageCol}
          className="flex items-center gap-2 px-5 py-2.5 bg-cyan-400 rounded-xl font-bold text-sm hover:bg-cyan-300 transition-all disabled:opacity-40"
          style={{ color: 'hsl(222,47%,6%)' }}>
          <Filter className="w-4 h-4" /> Analyze Funnel
        </button>
      </div>

      {funnelData.length > 0 && (
        <>
          {/* KPI row */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-4 rounded-xl border border-white/8 bg-white/2 text-center">
              <div className="text-xs text-white/35 mb-1">Total Entered</div>
              <div className="text-2xl font-black font-mono text-cyan-400">{fmtV(funnelData[0]?.count)}</div>
            </div>
            <div className="p-4 rounded-xl border border-white/8 bg-white/2 text-center">
              <div className="text-xs text-white/35 mb-1">Total Converted</div>
              <div className="text-2xl font-black font-mono text-green-400">{fmtV(funnelData[funnelData.length - 1]?.count)}</div>
            </div>
            <div className="p-4 rounded-xl border border-white/8 bg-white/2 text-center">
              <div className="text-xs text-white/35 mb-1">Overall Rate</div>
              <div className="text-2xl font-black font-mono text-purple-400">{funnelData[funnelData.length - 1]?.overallConversion}%</div>
            </div>
          </div>

          {/* Worst drop-off alert */}
          {worstStep && worstStep.stepConversion < 60 && (
            <div className="flex items-start gap-3 p-4 bg-red-400/5 border border-red-400/20 rounded-xl">
              <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5" />
              <div>
                <div className="text-sm font-semibold text-red-400">Worst Drop-off: {worstStep.stage}</div>
                <div className="text-xs text-red-400/70 mt-0.5">Only {worstStep.stepConversion}% convert from the previous stage. {worstStep.dropOff.toLocaleString()} records lost here.</div>
              </div>
            </div>
          )}

          {/* Funnel visualization */}
          <div className="rounded-2xl p-5 border border-white/8 space-y-3">
            <div className="flex items-center justify-between mb-2">
              <div className="font-semibold text-sm">Funnel Stages</div>
              <button onClick={downloadCSV} className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 px-2 py-1.5 border border-white/8 rounded-lg transition-all">
                <Download className="w-3 h-3" /> Export
              </button>
            </div>
            {funnelData.map((step, i) => {
              const isWorst = worstStep?.stage === step.stage && i > 0;
              return (
                <div key={step.stage} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className={`font-semibold ${isWorst ? 'text-red-400' : 'text-white/80'}`}>{step.stage}</span>
                    <div className="flex items-center gap-3 text-white/45">
                      <span className="font-mono">{fmtV(step.count)} records</span>
                      {i > 0 && <span className={`font-semibold ${step.stepConversion < 60 ? 'text-red-400' : step.stepConversion < 80 ? 'text-amber-400' : 'text-green-400'}`}>{step.stepConversion}% from prev</span>}
                      {i > 0 && <span className="text-white/25">-{fmtV(step.dropOff)} drop</span>}
                    </div>
                  </div>
                  <div className="h-8 bg-white/4 rounded-lg overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${step.width}%` }}
                      transition={{ delay: i * 0.08, duration: 0.5, ease: 'easeOut' }}
                      className="h-full rounded-lg flex items-center px-3"
                      style={{ background: isWorst ? 'rgba(255,45,122,0.4)' : `rgba(0,229,255,${0.15 + (step.overallConversion / 100) * 0.45})` }}
                    >
                      <span className="text-xs font-mono text-white/70">{step.overallConversion}% overall</span>
                    </motion.div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Step conversion chart */}
          <div className="rounded-2xl p-5 border border-white/8">
            <div className="font-semibold text-sm mb-4">Step-over-Step Conversion Rate</div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={funnelData.slice(1)} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="stage" tick={{ ...axisStyle, fontSize: 9 }} tickLine={false} axisLine={false} />
                <YAxis tick={axisStyle} tickLine={false} axisLine={false} width={36} domain={[0, 100]} unit="%" />
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={v => [`${v}%`, 'Step Conversion']} />
                <Bar dataKey="stepConversion" radius={[4, 4, 0, 0]}>
                  {funnelData.slice(1).map((step, i) => (
                    <Cell key={i} fill={step.stepConversion < 60 ? '#ff2d7a' : step.stepConversion < 80 ? '#ffcc02' : '#4caf50'} fillOpacity={0.85} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  );
}