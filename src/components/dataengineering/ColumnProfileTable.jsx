import { useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronRight, Hash, Calendar, Tag, TrendingUp } from 'lucide-react';

const SEMANTIC_COLORS = {
  currency_measure: 'text-green-400 bg-green-400/10 border-green-400/20',
  count_measure: 'text-cyan-400 bg-cyan-400/10 border-cyan-400/20',
  rate_measure: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
  date_dim: 'text-purple-400 bg-purple-400/10 border-purple-400/20',
  category_dim: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
  id: 'text-white/30 bg-white/5 border-white/10',
  rank: 'text-red-400/70 bg-red-400/8 border-red-400/15',
  age: 'text-orange-400/70 bg-orange-400/8 border-orange-400/15',
  geo: 'text-teal-400 bg-teal-400/10 border-teal-400/20',
  numeric: 'text-white/50 bg-white/5 border-white/10',
  text: 'text-white/30 bg-white/5 border-white/10',
};

export default function ColumnProfileTable({ columns = [] }) {
  const [expanded, setExpanded] = useState(null);
  const [filter, setFilter] = useState('all');

  if (!columns.length) return (
    <div className="flex items-center justify-center py-20 text-sm text-white/30">Upload a dataset to see column profiles</div>
  );

  const filters = ['all', 'kpi', 'date', 'dimension', 'warnings'];
  const filtered = columns.filter(c => {
    if (filter === 'kpi') return c.isKpiCandidate;
    if (filter === 'date') return c.isDateCandidate;
    if (filter === 'dimension') return c.isDimensionCandidate;
    if (filter === 'warnings') return c.warnings?.length > 0;
    return true;
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-white/70">{columns.length} Columns Profiled</h3>
        <div className="flex gap-1">
          {filters.map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all capitalize ${filter === f ? 'bg-cyan-400/20 text-cyan-400' : 'text-white/30 hover:text-white/60'}`}>
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-white/8 overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-white/8 bg-white/2">
              <th className="text-left px-4 py-3 text-white/35 font-semibold w-8"></th>
              <th className="text-left px-4 py-3 text-white/35 font-semibold">Column</th>
              <th className="text-left px-4 py-3 text-white/35 font-semibold">Type</th>
              <th className="text-left px-4 py-3 text-white/35 font-semibold">Semantic</th>
              <th className="text-right px-4 py-3 text-white/35 font-semibold">Missing</th>
              <th className="text-right px-4 py-3 text-white/35 font-semibold">Unique</th>
              <th className="text-right px-4 py-3 text-white/35 font-semibold">Min</th>
              <th className="text-right px-4 py-3 text-white/35 font-semibold">Max</th>
              <th className="text-right px-4 py-3 text-white/35 font-semibold">Mean</th>
              <th className="text-left px-4 py-3 text-white/35 font-semibold">Flags</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((col, i) => (
              <>
                <tr key={col.columnName}
                  className={`border-b border-white/5 cursor-pointer hover:bg-white/2 transition-all ${expanded === i ? 'bg-white/3' : ''}`}
                  onClick={() => setExpanded(expanded === i ? null : i)}>
                  <td className="px-4 py-3">
                    {expanded === i ? <ChevronDown className="w-3 h-3 text-white/25" /> : <ChevronRight className="w-3 h-3 text-white/25" />}
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-mono text-white/80">{col.columnName}</span>
                    {col.standardizedName !== col.columnName && (
                      <div className="text-white/25 font-mono text-xs">→ {col.standardizedName}</div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-1.5 py-0.5 rounded-md bg-white/8 text-white/50 font-mono">{col.inferredType}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-1.5 py-0.5 rounded-md border text-xs font-semibold ${SEMANTIC_COLORS[col.semanticType] || 'text-white/30 bg-white/5 border-white/10'}`}>
                      {col.semanticType}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={col.missingRate > 0.1 ? 'text-red-400' : 'text-white/40'}>
                      {Math.round(col.missingRate * 100)}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-white/40">{Math.round(col.uniqueRate * 100)}%</td>
                  <td className="px-4 py-3 text-right font-mono text-white/35">{col.min ?? '—'}</td>
                  <td className="px-4 py-3 text-right font-mono text-white/35">{col.max ?? '—'}</td>
                  <td className="px-4 py-3 text-right font-mono text-white/35">{col.mean ?? '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 flex-wrap">
                      {col.isKpiCandidate && <span className="px-1 py-0.5 rounded bg-green-400/15 text-green-400 text-xs">KPI</span>}
                      {col.isDateCandidate && <span className="px-1 py-0.5 rounded bg-purple-400/15 text-purple-400 text-xs">DATE</span>}
                      {col.isDimensionCandidate && <span className="px-1 py-0.5 rounded bg-amber-400/15 text-amber-400 text-xs">DIM</span>}
                      {col.warnings?.length > 0 && <AlertTriangle className="w-3 h-3 text-amber-400" />}
                    </div>
                  </td>
                </tr>
                {expanded === i && (
                  <tr key={`exp-${col.columnName}`} className="bg-white/[0.015]">
                    <td colSpan={10} className="px-8 py-4">
                      <div className="grid grid-cols-4 gap-4 text-xs">
                        <div><span className="text-white/30">Unique Count:</span> <span className="text-white/70 font-mono">{col.uniqueCount}</span></div>
                        <div><span className="text-white/30">Missing Count:</span> <span className="text-white/70 font-mono">{col.missingCount}</span></div>
                        <div><span className="text-white/30">Mode:</span> <span className="text-white/70 font-mono">{col.mode ?? '—'}</span></div>
                        <div><span className="text-white/30">Std Dev:</span> <span className="text-white/70 font-mono">{col.stdDev ?? '—'}</span></div>
                      </div>
                      {col.warnings?.length > 0 && (
                        <div className="mt-3 space-y-1">
                          {col.warnings.map((w, j) => (
                            <div key={j} className="flex items-center gap-1.5 text-xs text-amber-400">
                              <AlertTriangle className="w-3 h-3" />{w}
                            </div>
                          ))}
                        </div>
                      )}
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}