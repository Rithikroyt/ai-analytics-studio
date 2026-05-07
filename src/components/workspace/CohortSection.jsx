/**
 * CohortSection — Cohort Retention Analysis
 * Retention matrix heatmap by cohort × period
 */
import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useWorkspaceStore } from '@/lib/store';
import { buildCohortMatrix, retentionColor } from '@/lib/cohortEngine';
import { Users, TrendingDown, Clock, ArrowRight, Download, Info } from 'lucide-react';

const fmtV = v => { if (v == null || isNaN(v)) return '—'; const n = Number(v); if (n >= 1e3) return `${(n/1e3).toFixed(0)}K`; return n.toLocaleString(); };

export default function CohortSection() {
  const { getActiveTable, setActiveSection } = useWorkspaceStore();
  const table = getActiveTable();

  const columns = table?.columns || [];
  const catCols = columns.filter(c => c.type === 'category' || c.type === 'id');
  const dateCols = columns.filter(c => c.type === 'date');

  const [customerCol, setCustomerCol] = useState(() => catCols[0]?.name || '');
  const [dateCol, setDateCol] = useState(() => dateCols[0]?.name || '');

  const cohort = useMemo(() => {
    if (!table?.rows || !customerCol || !dateCol) return null;
    return buildCohortMatrix(table.rows, customerCol, dateCol, 8);
  }, [table, customerCol, dateCol]);

  const exportCSV = () => {
    if (!cohort) return;
    const header = ['Cohort', 'Cohort Size', ...Array.from({ length: cohort.maxPeriods }, (_, i) => `Period ${i}`)].join(',');
    const rows = cohort.matrix.map(row =>
      [row.cohort, row.cohortSize, ...row.periods.map(p => `${p.retentionRate}%`)].join(',')
    );
    const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'cohort_retention.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  if (!table) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[500px] text-center">
        <Users className="w-12 h-12 text-white/15 mb-4" />
        <h2 className="text-lg font-semibold mb-2">Cohort Retention Analysis</h2>
        <p className="text-sm text-muted-foreground mb-5">Requires a customer ID column and a date column.</p>
        <button onClick={() => setActiveSection('intake')} className="flex items-center gap-2 px-5 py-2.5 bg-cyan-400/10 border border-cyan-400/20 text-cyan-400 rounded-xl text-sm font-semibold hover:bg-cyan-400/15 transition-colors">
          Upload Data <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold mb-1">Cohort Retention Analysis</h1>
          <p className="text-sm text-muted-foreground">Retention rate by cohort (first activity month) and period offset.</p>
        </div>
        {cohort && (
          <button onClick={exportCSV} className="flex items-center gap-2 px-4 py-2 bg-cyan-400/10 border border-cyan-400/20 text-cyan-400 rounded-xl text-sm font-semibold hover:bg-cyan-400/15 transition-colors">
            <Download className="w-3.5 h-3.5" /> Export CSV
          </button>
        )}
      </div>

      {/* Column pickers */}
      <div className="glass-card rounded-2xl p-5 border border-white/8 grid grid-cols-1 md:grid-cols-2 gap-4">
        {[
          { label: 'Customer ID Column', value: customerCol, setter: setCustomerCol, options: catCols, color: 'text-cyan-400' },
          { label: 'Activity Date Column', value: dateCol, setter: setDateCol, options: dateCols, color: 'text-teal-400' },
        ].map(({ label, value, setter, options, color }) => (
          <div key={label}>
            <label className={`text-xs ${color} mb-1.5 block font-medium`}>{label}</label>
            <select value={value} onChange={e => setter(e.target.value)}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-cyan-400/30 text-foreground">
              <option value="">— Select —</option>
              {options.map(c => <option key={c.name} value={c.name}>{c.name.replace(/_/g,' ')}</option>)}
            </select>
          </div>
        ))}
      </div>

      {!cohort && customerCol && dateCol && (
        <div className="flex items-start gap-2.5 p-4 rounded-xl bg-amber-400/5 border border-amber-400/15 text-sm text-amber-400/80">
          <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
          Could not build cohort matrix. Ensure the date column contains valid dates and customer IDs are present.
        </div>
      )}

      {cohort && (
        <>
          {/* KPI row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Total Customers', value: cohort.totalCustomers.toLocaleString(), icon: Users, color: '#00e5ff' },
              { label: 'Cohorts', value: cohort.cohortKeys.length, icon: Clock, color: '#7b2fff' },
              { label: 'Month 1 Retention', value: `${cohort.period1Retention}%`, icon: TrendingDown, color: cohort.period1Retention > 40 ? '#4caf50' : '#ff6b35' },
              { label: 'Month 3 Retention', value: `${cohort.period3Retention}%`, icon: TrendingDown, color: cohort.period3Retention > 20 ? '#4caf50' : '#f87171' },
            ].map((kpi, i) => (
              <motion.div key={kpi.label} initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} transition={{ delay:i*0.05 }}
                className="rounded-2xl p-4 border border-white/8 bg-white/2">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-white/35 uppercase tracking-wider">{kpi.label}</span>
                  <kpi.icon className="w-3.5 h-3.5" style={{ color: kpi.color }} />
                </div>
                <div className="text-2xl font-black font-mono" style={{ color: kpi.color }}>{kpi.value}</div>
              </motion.div>
            ))}
          </div>

          {/* Average retention by period */}
          <div className="glass-card rounded-2xl p-5 border border-white/8">
            <div className="font-semibold text-sm mb-4">Average Retention by Period</div>
            <div className="flex items-end gap-1 h-16">
              {cohort.avgRetention.map((rate, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full rounded-t-sm transition-all" style={{ height:`${rate}%`, minHeight:2, background: rate > 60 ? '#4ade80' : rate > 30 ? '#fbbf24' : '#f87171', opacity:0.85 }} />
                  <span className="text-xs text-white/30">{i === 0 ? 'M0' : `M${i}`}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-between text-xs text-white/20 mt-1">
              {cohort.avgRetention.map((rate, i) => (
                <span key={i} className="text-xs font-mono">{rate}%</span>
              ))}
            </div>
          </div>

          {/* Cohort heatmap matrix */}
          <div className="glass-card rounded-2xl border border-white/8 overflow-hidden">
            <div className="p-4 border-b border-white/5">
              <div className="font-semibold text-sm">Cohort Retention Matrix</div>
              <p className="text-xs text-muted-foreground mt-0.5">Each cell shows % of cohort active in that period. Row = cohort month. Column = period offset.</p>
            </div>
            <div className="overflow-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-white/3">
                    <th className="px-3 py-2.5 text-left text-white/40 font-medium whitespace-nowrap sticky left-0 bg-navy-800 z-10">Cohort</th>
                    <th className="px-3 py-2.5 text-right text-white/40 font-medium whitespace-nowrap">Size</th>
                    {Array.from({ length: cohort.maxPeriods }, (_, i) => (
                      <th key={i} className="px-3 py-2.5 text-center text-white/40 font-medium whitespace-nowrap min-w-14">
                        {i === 0 ? 'M0' : `M+${i}`}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {cohort.matrix.map((row, ri) => (
                    <tr key={row.cohort} className="border-t border-white/5">
                      <td className="px-3 py-2 font-mono text-white/60 whitespace-nowrap sticky left-0 bg-background z-10">{row.cohort}</td>
                      <td className="px-3 py-2 text-right font-mono text-white/40">{fmtV(row.cohortSize)}</td>
                      {row.periods.map((p, pi) => {
                        const c = retentionColor(p.retentionRate);
                        return (
                          <td key={pi} className="px-2 py-1.5 text-center min-w-14">
                            <div className="rounded-md px-2 py-1.5 font-mono font-semibold text-xs"
                              style={{ background: c.bg, color: c.text }}>
                              {p.isEmpty ? '—' : `${p.retentionRate}%`}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                  {/* Average row */}
                  <tr className="border-t border-white/10 bg-white/2">
                    <td className="px-3 py-2 font-semibold text-white/50 text-xs sticky left-0 bg-white/2 z-10">Avg</td>
                    <td className="px-3 py-2 text-right font-mono text-white/30 text-xs">—</td>
                    {cohort.avgRetention.map((rate, i) => {
                      const c = retentionColor(rate);
                      return (
                        <td key={i} className="px-2 py-1.5 text-center min-w-14">
                          <div className="rounded-md px-2 py-1.5 font-mono font-bold text-xs"
                            style={{ background: c.bg, color: c.text }}>
                            {rate}%
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Color legend */}
          <div className="flex items-center gap-4 text-xs text-white/30">
            {[['> 80%', 'rgba(74,222,128,0.7)', '#052e16'], ['60-80%', 'rgba(74,222,128,0.45)', '#e2e8f0'], ['40-60%', 'rgba(251,191,36,0.4)', '#e2e8f0'], ['20-40%', 'rgba(251,146,60,0.35)', '#e2e8f0'], ['< 20%', 'rgba(248,113,113,0.3)', '#e2e8f0']].map(([label, bg, color]) => (
              <div key={label} className="flex items-center gap-1.5">
                <div className="w-8 h-4 rounded text-center font-mono font-semibold text-xs flex items-center justify-center" style={{ background: bg, color }}>{label.split('%')[0]}%</div>
                <span>{label}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}