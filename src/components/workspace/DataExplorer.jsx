/**
 * DataExplorer — Interactive filter + pivot + column selector before sending to AI Chart Generator
 */
import { useState, useMemo } from 'react';
import { useWorkspaceStore } from '@/lib/store';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Filter, BarChart2, Search, X, ChevronDown, RefreshCw,
  ArrowRight, SlidersHorizontal, Table2, Eye, Columns3,
  Download, Sparkles,
} from 'lucide-react';

const fmtV = (v) => {
  if (v == null) return '—';
  const n = Number(v);
  if (isNaN(n) || typeof v === 'string') return String(v).slice(0, 40);
  if (Math.abs(n) >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (Math.abs(n) >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
};

function ColumnToggle({ col, visible, onToggle }) {
  return (
    <button onClick={() => onToggle(col.name)}
      className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs border transition-all ${visible
        ? 'bg-cyan-400/10 border-cyan-400/25 text-cyan-400'
        : 'bg-white/3 border-white/8 text-white/30 hover:text-white/60'}`}>
      <div className={`w-1.5 h-1.5 rounded-full ${visible ? 'bg-cyan-400' : 'bg-white/20'}`} />
      {col.name}
      <span className="opacity-50 text-xs">({col.type?.[0] || '?'})</span>
    </button>
  );
}

function FilterRow({ col, value, onChange, onRemove, rows }) {
  const uniqueVals = useMemo(() => {
    if (col.type === 'numeric') return null;
    const vals = [...new Set(rows.map(r => r[col.name]).filter(v => v != null))].slice(0, 50);
    return vals.sort();
  }, [col, rows]);

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-white/40 w-28 truncate">{col.name}</span>
      {uniqueVals ? (
        <select value={value || ''} onChange={e => onChange(e.target.value)}
          className="flex-1 px-2 py-1 bg-white/5 border border-white/10 rounded-lg text-xs text-white/70 focus:outline-none focus:border-cyan-400/30">
          <option value="">All values</option>
          {uniqueVals.map(v => <option key={String(v)} value={String(v)}>{String(v)}</option>)}
        </select>
      ) : (
        <input type="text" value={value || ''} onChange={e => onChange(e.target.value)}
          placeholder="e.g. > 1000 or contains text"
          className="flex-1 px-2 py-1 bg-white/5 border border-white/10 rounded-lg text-xs text-white/70 focus:outline-none focus:border-cyan-400/30" />
      )}
      <button onClick={onRemove} className="text-white/20 hover:text-red-400 transition-colors">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

export default function DataExplorer({ onSendToChart }) {
  const { getActiveTable, setActiveSection } = useWorkspaceStore();
  const table = getActiveTable();

  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({}); // { colName: value }
  const [activeFilterCols, setActiveFilterCols] = useState([]);
  const [visibleCols, setVisibleCols] = useState(null); // null = all
  const [sortCol, setSortCol] = useState(null);
  const [sortDir, setSortDir] = useState('desc');
  const [pivotCol, setPivotCol] = useState(null);
  const [showColPanel, setShowColPanel] = useState(false);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 50;

  const allCols = table?.columns || [];
  const shownCols = visibleCols ? allCols.filter(c => visibleCols.has(c.name)) : allCols;

  const toggleCol = (name) => {
    const current = visibleCols ? new Set(visibleCols) : new Set(allCols.map(c => c.name));
    if (current.has(name)) current.delete(name);
    else current.add(name);
    setVisibleCols(current);
  };

  const addFilter = (colName) => {
    if (!activeFilterCols.includes(colName)) {
      setActiveFilterCols(prev => [...prev, colName]);
    }
  };

  const removeFilter = (colName) => {
    setActiveFilterCols(prev => prev.filter(c => c !== colName));
    setFilters(prev => { const n = { ...prev }; delete n[colName]; return n; });
  };

  const filteredRows = useMemo(() => {
    if (!table?.rows) return [];
    let rows = table.rows;

    // Text search across all visible cols
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter(r =>
        shownCols.some(c => String(r[c.name] ?? '').toLowerCase().includes(q))
      );
    }

    // Column filters
    Object.entries(filters).forEach(([col, val]) => {
      if (!val) return;
      const colMeta = allCols.find(c => c.name === col);
      if (colMeta?.type === 'numeric') {
        const match = val.match(/^([<>]=?|=)?\s*(-?\d+\.?\d*)$/);
        if (match) {
          const op = match[1] || '=';
          const n = parseFloat(match[2]);
          rows = rows.filter(r => {
            const v = Number(r[col]);
            if (isNaN(v)) return false;
            if (op === '>') return v > n;
            if (op === '>=') return v >= n;
            if (op === '<') return v < n;
            if (op === '<=') return v <= n;
            return v === n;
          });
        }
      } else {
        rows = rows.filter(r => String(r[col] ?? '') === val);
      }
    });

    // Sort
    if (sortCol) {
      rows = [...rows].sort((a, b) => {
        const av = a[sortCol], bv = b[sortCol];
        const an = Number(av), bn = Number(bv);
        if (!isNaN(an) && !isNaN(bn)) return sortDir === 'desc' ? bn - an : an - bn;
        return sortDir === 'desc'
          ? String(bv).localeCompare(String(av))
          : String(av).localeCompare(String(bv));
      });
    }
    return rows;
  }, [table?.rows, search, filters, sortCol, sortDir, shownCols]);

  // Pivot aggregation
  const pivotData = useMemo(() => {
    if (!pivotCol || !filteredRows.length) return null;
    const numCols = allCols.filter(c => c.type === 'numeric').slice(0, 4);
    if (!numCols.length) return null;
    const groups = {};
    filteredRows.forEach(r => {
      const key = String(r[pivotCol] ?? 'null');
      if (!groups[key]) groups[key] = { _key: key, _count: 0 };
      groups[key]._count++;
      numCols.forEach(nc => {
        const v = Number(r[nc.name]);
        if (!isNaN(v)) groups[key][nc.name] = (groups[key][nc.name] || 0) + v;
      });
    });
    return {
      headers: ['Group', 'Count', ...numCols.map(c => c.name)],
      rows: Object.values(groups).sort((a, b) => b._count - a._count).slice(0, 30),
      numCols,
    };
  }, [filteredRows, pivotCol, allCols]);

  const pagedRows = filteredRows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(filteredRows.length / PAGE_SIZE);

  const handleSendToChart = () => {
    if (onSendToChart) {
      onSendToChart({ rows: filteredRows, columns: shownCols, name: `${table.name} (filtered)` });
    } else {
      setActiveSection('visualbuilder');
    }
  };

  const handleSort = (colName) => {
    if (sortCol === colName) setSortDir(d => d === 'desc' ? 'asc' : 'desc');
    else { setSortCol(colName); setSortDir('desc'); }
    setPage(0);
  };

  if (!table) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[500px] text-center">
        <Table2 className="w-12 h-12 text-white/15 mb-4" />
        <h2 className="text-lg font-semibold mb-2">Data Explorer</h2>
        <p className="text-sm text-muted-foreground">Upload a dataset to explore, filter, and pivot before sending to the AI Chart Generator.</p>
      </div>
    );
  }

  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/8 flex-shrink-0 flex-wrap">
        <div className="flex items-center gap-1.5 flex-1 min-w-48 px-3 py-1.5 bg-white/4 border border-white/10 rounded-xl">
          <Search className="w-3.5 h-3.5 text-white/30" />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(0); }}
            placeholder="Search all visible columns…"
            className="flex-1 bg-transparent text-xs text-white/70 placeholder:text-white/25 focus:outline-none" />
          {search && <button onClick={() => setSearch('')}><X className="w-3 h-3 text-white/25" /></button>}
        </div>

        <button onClick={() => setShowFilterPanel(v => !v)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs border transition-all ${showFilterPanel || activeFilterCount > 0 ? 'bg-amber-400/10 border-amber-400/25 text-amber-400' : 'border-white/10 text-white/40 hover:border-white/20'}`}>
          <Filter className="w-3.5 h-3.5" />
          Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
        </button>

        <button onClick={() => setShowColPanel(v => !v)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs border transition-all ${showColPanel ? 'bg-blue-400/10 border-blue-400/25 text-blue-400' : 'border-white/10 text-white/40 hover:border-white/20'}`}>
          <Columns3 className="w-3.5 h-3.5" />
          Columns ({shownCols.length}/{allCols.length})
        </button>

        {/* Pivot */}
        <div className="flex items-center gap-1.5">
          <SlidersHorizontal className="w-3.5 h-3.5 text-white/30" />
          <select value={pivotCol || ''} onChange={e => setPivotCol(e.target.value || null)}
            className="px-2 py-1.5 bg-white/4 border border-white/10 rounded-xl text-xs text-white/60 focus:outline-none focus:border-purple-400/30">
            <option value="">Pivot by…</option>
            {allCols.filter(c => c.type === 'category').map(c => (
              <option key={c.name} value={c.name}>{c.name}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-1.5 ml-auto">
          <span className="text-xs text-white/25">{filteredRows.length.toLocaleString()} rows</span>
          <button onClick={handleSendToChart}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-cyan-400 hover:bg-cyan-300 transition-all"
            style={{ color: 'hsl(222,47%,6%)' }}>
            <Sparkles className="w-3.5 h-3.5" /> Send to Chart
          </button>
          <button onClick={() => setActiveSection('sql')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs border border-white/10 text-white/40 hover:text-white/70 hover:border-white/20 transition-all">
            <BarChart2 className="w-3.5 h-3.5" /> SQL Studio
          </button>
        </div>
      </div>

      {/* Column panel */}
      <AnimatePresence>
        {showColPanel && (
          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden border-b border-white/8">
            <div className="px-4 py-3 flex flex-wrap gap-1.5">
              <button onClick={() => setVisibleCols(null)} className="text-xs px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-white/40 hover:text-white/70">All</button>
              {allCols.map(c => (
                <ColumnToggle key={c.name} col={c} visible={!visibleCols || visibleCols.has(c.name)} onToggle={toggleCol} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filter panel */}
      <AnimatePresence>
        {showFilterPanel && (
          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden border-b border-white/8">
            <div className="px-4 py-3 space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-white/30">Add filter:</span>
                {allCols.filter(c => !activeFilterCols.includes(c.name)).slice(0, 12).map(c => (
                  <button key={c.name} onClick={() => addFilter(c.name)}
                    className="text-xs px-2 py-0.5 rounded-full border border-white/10 text-white/40 hover:text-amber-400 hover:border-amber-400/30 transition-all">
                    + {c.name}
                  </button>
                ))}
              </div>
              {activeFilterCols.map(colName => {
                const col = allCols.find(c => c.name === colName);
                if (!col) return null;
                return (
                  <FilterRow key={colName} col={col} value={filters[colName]} rows={table.rows || []}
                    onChange={val => { setFilters(prev => ({ ...prev, [colName]: val })); setPage(0); }}
                    onRemove={() => removeFilter(colName)} />
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pivot view */}
      {pivotData && (
        <div className="flex-shrink-0 border-b border-white/8 max-h-52 overflow-auto">
          <div className="px-3 py-2 text-xs text-white/30 font-semibold uppercase tracking-widest flex items-center gap-2">
            <SlidersHorizontal className="w-3 h-3" /> Pivot: {pivotCol}
          </div>
          <table className="w-full text-xs">
            <thead><tr className="bg-white/3 border-b border-white/8">
              {pivotData.headers.map(h => <th key={h} className="px-3 py-1.5 text-left text-white/40 font-semibold">{h}</th>)}
            </tr></thead>
            <tbody>
              {pivotData.rows.map((r, i) => (
                <tr key={i} className="border-b border-white/4 hover:bg-white/3">
                  <td className="px-3 py-1.5 text-white/70">{r._key}</td>
                  <td className="px-3 py-1.5 font-mono text-white/50">{r._count}</td>
                  {pivotData.numCols.map(nc => <td key={nc.name} className="px-3 py-1.5 font-mono text-cyan-400/70">{fmtV(r[nc.name])}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Data table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-xs min-w-max">
          <thead className="sticky top-0 z-10 bg-background">
            <tr className="border-b border-white/8">
              <th className="px-3 py-2 text-left text-white/25 font-semibold w-10">#</th>
              {shownCols.map(c => (
                <th key={c.name}
                  className="px-3 py-2 text-left font-semibold text-white/45 cursor-pointer hover:text-white/70 transition-colors whitespace-nowrap select-none"
                  onClick={() => handleSort(c.name)}>
                  <span className="flex items-center gap-1">
                    {c.name}
                    <span className={`text-xs ${c.type === 'numeric' ? 'text-cyan-400/40' : c.type === 'date' ? 'text-green-400/40' : 'text-purple-400/40'}`}>
                      {c.type?.[0]}
                    </span>
                    {sortCol === c.name && <span className="text-cyan-400">{sortDir === 'desc' ? '↓' : '↑'}</span>}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pagedRows.map((row, i) => (
              <tr key={i} className="border-b border-white/4 hover:bg-white/2 transition-colors">
                <td className="px-3 py-1.5 text-white/20 font-mono">{page * PAGE_SIZE + i + 1}</td>
                {shownCols.map(c => (
                  <td key={c.name} className={`px-3 py-1.5 whitespace-nowrap max-w-48 truncate ${c.type === 'numeric' ? 'font-mono text-cyan-400/80 text-right' : 'text-white/65'}`}>
                    {fmtV(row[c.name])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-2.5 border-t border-white/8 flex-shrink-0 text-xs text-white/35">
          <span>{filteredRows.length.toLocaleString()} rows · Page {page + 1}/{totalPages}</span>
          <div className="flex gap-1">
            <button onClick={() => setPage(0)} disabled={page === 0} className="px-2 py-1 rounded hover:bg-white/5 disabled:opacity-30">«</button>
            <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="px-2 py-1 rounded hover:bg-white/5 disabled:opacity-30">‹</button>
            <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} className="px-2 py-1 rounded hover:bg-white/5 disabled:opacity-30">›</button>
            <button onClick={() => setPage(totalPages - 1)} disabled={page >= totalPages - 1} className="px-2 py-1 rounded hover:bg-white/5 disabled:opacity-30">»</button>
          </div>
        </div>
      )}
    </div>
  );
}