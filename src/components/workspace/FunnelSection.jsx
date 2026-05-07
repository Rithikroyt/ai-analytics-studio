/**
 * FunnelSection — Funnel Analysis with Conversion Rates
 * ConversionRate_i = Stage_i / Stage_i-1
 */
import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useWorkspaceStore } from '@/lib/store';
import { buildFunnel, detectFunnelColumns } from '@/lib/funnelEngine';
import { Filter, ArrowRight, TrendingDown, AlertTriangle, Database, Download } from 'lucide-react';

const fmtV = v => { if (v == null || isNaN(v)) return '—'; const n = Number(v); if (n >= 1e6) return `${(n/1e6).toFixed(1)}M`; if (n >= 1e3) return `${(n/1e3).toFixed(0)}K`; return n.toLocaleString(undefined, { maximumFractionDigits: 1 }); };

export default function FunnelSection() {
  const { getActiveTable, setActiveSection } = useWorkspaceStore();
  const table = getActiveTable();
  const columns = table?.columns || [];
  const catCols = columns.filter(c => c.type === 'category');
  const numCols = columns.filter(c => c.type === 'numeric');

  const funnelCols = useMemo(() => detectFunnelColumns(columns), [columns]);
  const [stageCol, setStageCol] = useState(() => funnelCols[0]?.name || catCols[0]?.name || '');
  const [valueCol, setValueCol] = useState('');

  const funnel = useMemo(() => {
    if (!table?.rows || !stageCol) return null;
    return buildFunnel(table.rows, stageCol, valueCol || null);
  }, [table, stageCol, valueCol]);

  if (!table) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[500px] text-center">
        <Database className="w-12 h-12 text-white/20 mb-4" />
        <h2 className="text-lg font-semibold mb-2">Funnel Analysis</h2>
        <p className="text-sm text-muted-foreground mb-5">Upload data with a stage/status column to analyze conversion rates.</p>
        <button onClick={() => setActiveSection('intake')} className="flex items-center gap-2 px-5 py-2.5 bg-cyan-400/10 border border-cyan-400/20 text-cyan-400 rounded-xl text-sm font-semibold hover:bg-cyan-400/15 transition-colors">
          Upload Data <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold mb-1">Funnel Analysis</h1>
        <p className="text-sm text-muted-foreground">Stage-by-stage conversion rates and drop-off analysis.</p>
      </motion.div>

      {/* Config */}
      <div className="glass-card rounded-2xl p-5 border border-white/8 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-xs text-muted-foreground mb-1.5 block flex items-center gap-1.5">
            <Filter className="w-3 h-3 text-cyan-400" /> Stage / Status Column
          </label>
          <select value={stageCol} onChange={e => setStageCol(e.target.value)}
            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-cyan-400/30 text-foreground">
            <option value="">— Select column —</option>
            {catCols.map(c => <option key={c.name} value={c.name}>{c.name.replace(/_/g, ' ')}{funnelCols.find(f => f.name === c.name) ? ' ⭐' : ''}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1.5 block">Value Column (optional)</label>
          <select value={valueCol} onChange={e => setValueCol(e.target.value)}
            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-cyan-400/30 text-foreground">
            <option value="">Count only (no value)</option>
            {numCols.map(c => <option key={c.name} value={c.name}>{c.name.replace(/_/g, ' ')}</option>)}
          </select>
        </div>
      </div>

      {!funnel && stageCol && (
        <div className="flex items-start gap-3 p-4 bg-amber-400/5 border border-amber-400/20 rounded-xl text-sm text-amber-400">
          <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          Could not build funnel. The selected column needs at least 2 distinct stage values.
        </div>
      )}

      {funnel && (
        <>
          {/* Summary */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Overall Conversion', value: `${funnel.overallConversion}%`, color: funnel.overallConversion >= 50 ? '#4caf50' : funnel.overallConversion >= 20 ? '#ffcc02' : '#ff2d7a' },
              { label: 'Top of Funnel', value: fmtV(funnel.topOfFunnel), color: '#00e5ff' },
              { label: 'Bottom of Funnel', value: fmtV(funnel.bottomOfFunnel), color: '#7b2fff' },
            ].map((kpi, i) => (
              <motion.div key={kpi.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                className="rounded-2xl p-4 border border-white/8 bg-white/2 text-center">
                <div className="text-xs text-white/35 uppercase tracking-wider mb-2">{kpi.label}</div>
                <div className="text-2xl font-black font-mono" style={{ color: kpi.color }}>{kpi.value}</div>
              </motion.div>
            ))}
          </div>

          {/* Worst drop-off alert */}
          {funnel.worstDropOff && funnel.worstDropOff.dropOffPct > 30 && (
            <div className="flex items-start gap-3 p-4 bg-red-400/5 border border-red-400/20 rounded-xl">
              <TrendingDown className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
              <div>
                <div className="font-semibold text-red-400 text-sm">Worst Drop-off: {funnel.worstDropOff.stage}</div>
                <div className="text-xs text-white/55 mt-0.5">
                  Lost {fmtV(funnel.worstDropOff.dropOff)} records ({funnel.worstDropOff.dropOffPct}% drop) — this is your biggest funnel leak.
                </div>
              </div>
            </div>
          )}

          {/* Funnel visualization */}
          <div className="space-y-2">
            <div className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-3">Stage Breakdown</div>
            {funnel.steps.map((step, i) => (
              <motion.div key={step.stage} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.07 }}
                className="space-y-1">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-lg bg-white/8 flex items-center justify-center text-xs font-bold text-white/50 flex-shrink-0">{i + 1}</div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-semibold text-white/80">{step.stage}</span>
                      <div className="flex items-center gap-3 text-xs">
                        <span className="font-mono text-white/55">{fmtV(step.count)} records</span>
                        {step.value && <span className="font-mono text-cyan-400">{fmtV(step.value)}</span>}
                        {i > 0 && (
                          <span className={`font-mono font-bold px-2 py-0.5 rounded-full text-xs ${step.conversionRate >= 70 ? 'bg-green-400/15 text-green-400' : step.conversionRate >= 40 ? 'bg-amber-400/15 text-amber-400' : 'bg-red-400/15 text-red-400'}`}>
                            {step.conversionRate}% conv.
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="h-7 bg-white/5 rounded-lg overflow-hidden relative">
                      <motion.div
                        initial={{ width: 0 }} animate={{ width: `${step.overallPct}%` }}
                        transition={{ duration: 0.6, delay: i * 0.08, ease: 'easeOut' }}
                        className="h-full rounded-lg"
                        style={{ background: i === 0 ? 'rgba(0,229,255,0.5)' : step.dropOffPct > 30 ? 'rgba(255,45,122,0.5)' : 'rgba(0,229,255,0.3)' }}
                      />
                      <span className="absolute inset-0 flex items-center px-3 text-xs font-mono text-white/60">{step.overallPct}% of total</span>
                    </div>
                  </div>
                </div>
                {i < funnel.steps.length - 1 && step.dropOff > 0 && (
                  <div className="ml-9 text-xs text-white/30 flex items-center gap-1">
                    <TrendingDown className="w-3 h-3 text-red-400/60" />
                    <span className="text-red-400/60">−{fmtV(step.dropOff)} dropped ({step.dropOffPct}%)</span>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}