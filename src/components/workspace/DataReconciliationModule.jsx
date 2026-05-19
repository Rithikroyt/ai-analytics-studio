/**
 * Data Reconciliation Module
 * Current vs historical, variance detection, discrepancy reporting
 */
import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWorkspaceStore } from '@/lib/store';
import { GitCompare, AlertTriangle, CheckCircle2, Upload, Info, TrendingUp, TrendingDown } from 'lucide-react';

function computeVariance(current, historical) {
  if (!historical || historical === 0) return null;
  return ((current - historical) / Math.abs(historical)) * 100;
}

function classifySeverity(absVariance, threshold) {
  if (absVariance > threshold * 2) return 'critical';
  if (absVariance > threshold) return 'high';
  if (absVariance > threshold * 0.5) return 'medium';
  return 'ok';
}

const SEVERITY_STYLE = {
  critical: 'text-red-400 bg-red-400/10 border-red-400/20',
  high: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
  medium: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
  ok: 'text-green-400 bg-green-400/10 border-green-400/20',
};

export default function DataReconciliationModule() {
  const { getActiveTable } = useWorkspaceStore();
  const table = getActiveTable();
  const [threshold, setThreshold] = useState(10);
  const [referenceValues, setReferenceValues] = useState({});
  const [showFormula, setShowFormula] = useState(false);

  const numericCols = useMemo(() => (table?.columns || []).filter(c =>
    c.type === 'numeric' || c.inferredType === 'numeric' || c.isKpiCandidate
  ), [table]);

  // Compute aggregated current values for numeric columns
  const currentAggregates = useMemo(() => {
    const rows = table?.rows || [];
    const result = {};
    numericCols.forEach(col => {
      const vals = rows.map(r => parseFloat(r[col.name])).filter(v => !isNaN(v));
      if (vals.length === 0) return;
      result[col.name] = {
        sum: vals.reduce((a, b) => a + b, 0),
        avg: vals.reduce((a, b) => a + b, 0) / vals.length,
        min: Math.min(...vals),
        max: Math.max(...vals),
        count: vals.length,
        nullCount: rows.length - vals.length,
      };
    });
    return result;
  }, [table, numericCols]);

  const reconciliationReport = useMemo(() => {
    return Object.entries(currentAggregates).map(([col, stats]) => {
      const ref = referenceValues[col];
      const currentVal = stats.sum;
      const variance = ref !== undefined && ref !== '' ? computeVariance(currentVal, parseFloat(ref)) : null;
      const severity = variance !== null ? classifySeverity(Math.abs(variance), threshold) : null;
      return { col, currentVal, refVal: ref, variance, severity, stats };
    });
  }, [currentAggregates, referenceValues, threshold]);

  const discrepancies = reconciliationReport.filter(r => r.severity === 'critical' || r.severity === 'high');
  const ok = reconciliationReport.filter(r => r.severity === 'ok');

  // Duplicate detection
  const duplicateCount = useMemo(() => {
    const rows = table?.rows || [];
    const seen = new Set();
    let dupes = 0;
    rows.forEach(r => {
      const key = JSON.stringify(r);
      if (seen.has(key)) dupes++;
      else seen.add(key);
    });
    return dupes;
  }, [table]);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center">
          <GitCompare className="w-5 h-5 text-amber-400" />
        </div>
        <div>
          <h2 className="text-xl font-black">Data Reconciliation</h2>
          <p className="text-xs text-muted-foreground">Current vs historical · Variance detection · Discrepancy reports</p>
        </div>
        <button onClick={() => setShowFormula(v => !v)}
          className="ml-auto text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white/40 hover:text-white/70">
          <Info className="w-3 h-3" /> Formula
        </button>
      </div>

      <AnimatePresence>
        {showFormula && (
          <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
            className="px-4 py-3 rounded-xl bg-amber-400/5 border border-amber-400/15 text-xs text-amber-300 font-mono space-y-1">
            <div>Variance % = (Current Value − Historical Value) / |Historical Value| × 100</div>
            <div className="text-white/30">Flag: |Variance %| &gt; Threshold → Discrepancy</div>
            <div className="text-white/30">Critical: |Variance %| &gt; 2× Threshold</div>
          </motion.div>
        )}
      </AnimatePresence>

      {!table ? (
        <div className="flex flex-col items-center justify-center py-20 border border-white/8 rounded-2xl text-center">
          <GitCompare className="w-12 h-12 text-white/15 mb-4" />
          <p className="text-sm text-muted-foreground">Upload a dataset to begin reconciliation.</p>
        </div>
      ) : (
        <>
          {/* Controls */}
          <div className="flex items-center gap-4 p-4 rounded-2xl border border-white/8 bg-white/2">
            <div className="flex flex-col gap-1 flex-1">
              <label className="text-xs text-white/40 uppercase tracking-widest">Variance Threshold (%)</label>
              <input type="range" min="1" max="50" value={threshold} onChange={e => setThreshold(Number(e.target.value))}
                className="w-full accent-amber-400" />
            </div>
            <div className="text-2xl font-black text-amber-400 w-16 text-center">{threshold}%</div>
          </div>

          {/* Summary bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-4 rounded-2xl border border-white/8 bg-white/2">
              <div className="text-xs text-white/35 mb-1 uppercase tracking-widest">Total Rows</div>
              <div className="text-2xl font-black text-purple-400">{(table?.rows?.length || 0).toLocaleString()}</div>
            </div>
            <div className="p-4 rounded-2xl border border-white/8 bg-white/2">
              <div className="text-xs text-white/35 mb-1 uppercase tracking-widest">Duplicates</div>
              <div className={`text-2xl font-black ${duplicateCount > 0 ? 'text-red-400' : 'text-green-400'}`}>{duplicateCount}</div>
            </div>
            <div className="p-4 rounded-2xl border border-white/8 bg-white/2">
              <div className="text-xs text-white/35 mb-1 uppercase tracking-widest">Discrepancies</div>
              <div className={`text-2xl font-black ${discrepancies.length > 0 ? 'text-red-400' : 'text-green-400'}`}>{discrepancies.length}</div>
            </div>
            <div className="p-4 rounded-2xl border border-white/8 bg-white/2">
              <div className="text-xs text-white/35 mb-1 uppercase tracking-widest">Fields OK</div>
              <div className="text-2xl font-black text-green-400">{ok.length}</div>
            </div>
          </div>

          {/* Reference value entry + reconciliation table */}
          {numericCols.length === 0 ? (
            <div className="text-center py-10 text-sm text-white/30">No numeric columns detected in current dataset.</div>
          ) : (
            <div className="rounded-2xl border border-white/8 bg-white/1 overflow-hidden">
              <div className="px-4 py-3 border-b border-white/8 flex items-center gap-2">
                <span className="text-xs font-semibold text-white/40 uppercase tracking-widest">Column Reconciliation</span>
                <span className="text-xs text-white/25 ml-auto">Enter historical/benchmark reference values to detect variance</span>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/8">
                    {['Column', 'Current Sum', 'Ref (Historical)', 'Variance %', 'Severity', 'Null Count'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs text-white/30 uppercase tracking-widest font-semibold">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {reconciliationReport.map((row, i) => (
                    <tr key={row.col} className="border-b border-white/5 hover:bg-white/2 transition-all">
                      <td className="px-4 py-3 font-mono text-cyan-400/70 text-xs">{row.col}</td>
                      <td className="px-4 py-3 font-mono text-white/70">{row.currentVal.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          placeholder="Enter ref value"
                          value={referenceValues[row.col] ?? ''}
                          onChange={e => setReferenceValues(p => ({ ...p, [row.col]: e.target.value }))}
                          className="w-32 px-2 py-1 bg-white/5 border border-white/10 rounded-lg text-xs font-mono text-foreground focus:outline-none focus:border-amber-400/30"
                        />
                      </td>
                      <td className="px-4 py-3 font-mono">
                        {row.variance !== null ? (
                          <span className={row.variance > 0 ? 'text-green-400' : 'text-red-400'}>
                            {row.variance > 0 ? '+' : ''}{row.variance.toFixed(2)}%
                          </span>
                        ) : <span className="text-white/20">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        {row.severity ? (
                          <span className={`text-xs px-2 py-0.5 rounded-full border font-semibold capitalize ${SEVERITY_STYLE[row.severity]}`}>
                            {row.severity}
                          </span>
                        ) : <span className="text-white/20 text-xs">No ref</span>}
                      </td>
                      <td className="px-4 py-3 text-white/40 font-mono text-xs">
                        {row.stats.nullCount > 0 ? <span className="text-amber-400">{row.stats.nullCount}</span> : <span className="text-green-400">0</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Discrepancy report */}
          {discrepancies.length > 0 && (
            <div className="p-4 rounded-xl bg-red-400/5 border border-red-400/20 space-y-2">
              <div className="text-xs font-semibold text-red-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                <AlertTriangle className="w-3.5 h-3.5" /> Discrepancy Report
              </div>
              {discrepancies.map(d => (
                <div key={d.col} className="text-xs text-white/60 flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${d.severity === 'critical' ? 'bg-red-400' : 'bg-amber-400'}`} />
                  <span className="font-mono text-red-300">{d.col}</span>
                  <span>deviates by <strong className="text-red-300">{d.variance?.toFixed(1)}%</strong> from historical reference. Investigate data pipeline for this column.</span>
                </div>
              ))}
            </div>
          )}

          {duplicateCount > 0 && (
            <div className="p-4 rounded-xl bg-amber-400/5 border border-amber-400/20 text-xs text-amber-400 flex items-center gap-2">
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{duplicateCount} duplicate rows detected. Recommend deduplication before analysis to avoid double-counting.</span>
            </div>
          )}
        </>
      )}
    </div>
  );
}