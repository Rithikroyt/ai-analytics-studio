/**
 * PredictiveFilters — Advanced filtering controls for the predictive dashboard
 * Date range, segments, metrics, confidence threshold
 */
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Filter, X, Calendar, Tag, BarChart3, ChevronDown, RotateCcw } from 'lucide-react';

const DATE_PRESETS = [
  { label: 'Last 7 days', value: '7d' },
  { label: 'Last 30 days', value: '30d' },
  { label: 'Last 90 days', value: '90d' },
  { label: 'Last 12 months', value: '12m' },
  { label: 'All time', value: 'all' },
];

export default function PredictiveFilters({ columns = [], segments = [], onFilter, activeFilters, onReset }) {
  const [open, setOpen] = useState(false);
  const [localFilters, setLocalFilters] = useState(activeFilters || {
    datePreset: 'all',
    dateFrom: '',
    dateTo: '',
    selectedSegments: [],
    selectedMetrics: [],
    confidenceMin: 0,
    showAnomaliesOnly: false,
  });

  const numericCols = columns.filter(c => c.type === 'numeric');
  const catCols = columns.filter(c => c.type === 'category');

  const activeCount = [
    localFilters.datePreset !== 'all',
    localFilters.selectedSegments.length > 0,
    localFilters.selectedMetrics.length > 0,
    localFilters.confidenceMin > 0,
    localFilters.showAnomaliesOnly,
  ].filter(Boolean).length;

  const apply = () => {
    onFilter(localFilters);
    setOpen(false);
  };

  const reset = () => {
    const defaults = { datePreset: 'all', dateFrom: '', dateTo: '', selectedSegments: [], selectedMetrics: [], confidenceMin: 0, showAnomaliesOnly: false };
    setLocalFilters(defaults);
    onFilter(defaults);
    onReset?.();
  };

  const toggleItem = (key, val) => {
    setLocalFilters(f => ({
      ...f,
      [key]: f[key].includes(val) ? f[key].filter(v => v !== val) : [...f[key], val],
    }));
  };

  return (
    <div className="relative">
      <button onClick={() => setOpen(v => !v)}
        className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition-all ${open || activeCount > 0 ? 'bg-cyan-400/10 border-cyan-400/25 text-cyan-400' : 'bg-white/5 border-white/10 text-white/50 hover:text-white/80 hover:border-white/20'}`}>
        <Filter className="w-3.5 h-3.5" />
        Filters
        {activeCount > 0 && (
          <span className="ml-0.5 px-1.5 py-0.5 rounded-full bg-cyan-400 text-xs font-bold" style={{ color: 'hsl(222,47%,6%)' }}>
            {activeCount}
          </span>
        )}
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.97 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-11 z-40 w-80 glass-card rounded-2xl border border-white/10 shadow-2xl p-5 space-y-5"
              style={{ background: 'hsl(222,44%,9%)' }}
            >
              {/* Date range */}
              <div>
                <div className="flex items-center gap-1.5 text-xs font-semibold text-white/40 uppercase tracking-widest mb-2">
                  <Calendar className="w-3 h-3 text-cyan-400" /> Date Range
                </div>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {DATE_PRESETS.map(p => (
                    <button key={p.value} onClick={() => setLocalFilters(f => ({ ...f, datePreset: p.value, dateFrom: '', dateTo: '' }))}
                      className={`text-xs px-2.5 py-1.5 rounded-lg border transition-all ${localFilters.datePreset === p.value ? 'bg-cyan-400/15 border-cyan-400/30 text-cyan-400' : 'bg-white/4 border-white/8 text-white/40 hover:border-white/20'}`}>
                      {p.label}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-white/25 mb-1 block">From</label>
                    <input type="date" value={localFilters.dateFrom}
                      onChange={e => setLocalFilters(f => ({ ...f, dateFrom: e.target.value, datePreset: 'custom' }))}
                      className="w-full px-2.5 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs focus:outline-none focus:border-cyan-400/30 text-foreground" />
                  </div>
                  <div>
                    <label className="text-xs text-white/25 mb-1 block">To</label>
                    <input type="date" value={localFilters.dateTo}
                      onChange={e => setLocalFilters(f => ({ ...f, dateTo: e.target.value, datePreset: 'custom' }))}
                      className="w-full px-2.5 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs focus:outline-none focus:border-cyan-400/30 text-foreground" />
                  </div>
                </div>
              </div>

              {/* Segments */}
              {segments.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-white/40 uppercase tracking-widest mb-2">
                    <Tag className="w-3 h-3 text-purple-400" /> Business Segments
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {segments.slice(0, 10).map(seg => (
                      <button key={seg} onClick={() => toggleItem('selectedSegments', seg)}
                        className={`text-xs px-2.5 py-1.5 rounded-lg border transition-all ${localFilters.selectedSegments.includes(seg) ? 'bg-purple-400/15 border-purple-400/30 text-purple-400' : 'bg-white/4 border-white/8 text-white/40 hover:border-white/20'}`}>
                        {seg}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Metrics */}
              {numericCols.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-white/40 uppercase tracking-widest mb-2">
                    <BarChart3 className="w-3 h-3 text-teal-400" /> Metrics
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {numericCols.slice(0, 8).map(col => (
                      <button key={col.name} onClick={() => toggleItem('selectedMetrics', col.name)}
                        className={`text-xs px-2.5 py-1.5 rounded-lg border transition-all ${localFilters.selectedMetrics.includes(col.name) ? 'bg-teal-400/15 border-teal-400/30 text-teal-400' : 'bg-white/4 border-white/8 text-white/40 hover:border-white/20'}`}>
                        {col.name.replace(/_/g, ' ')}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Anomalies toggle */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-white/50">Show anomalies only</span>
                <button onClick={() => setLocalFilters(f => ({ ...f, showAnomaliesOnly: !f.showAnomaliesOnly }))}
                  className={`w-10 h-5 rounded-full transition-all relative ${localFilters.showAnomaliesOnly ? 'bg-cyan-400' : 'bg-white/10'}`}>
                  <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${localFilters.showAnomaliesOnly ? 'left-5' : 'left-0.5'}`} />
                </button>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-1 border-t border-white/8">
                <button onClick={reset} className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg border border-white/10 text-white/40 hover:text-white/70 hover:bg-white/5 transition-all">
                  <RotateCcw className="w-3 h-3" /> Reset
                </button>
                <button onClick={apply} className="flex-1 text-xs px-3 py-2 rounded-lg bg-cyan-400 font-bold hover:bg-cyan-300 transition-all" style={{ color: 'hsl(222,47%,6%)' }}>
                  Apply Filters
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}