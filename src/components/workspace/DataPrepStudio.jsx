/**
 * DataPrepStudio — Data Prep & Validation Studio (Layer A)
 * Null handling · Dedup · Normalize · Joins · Pivot · Transforms · Validation
 */
import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWorkspaceStore } from '@/lib/store';
import {
  Wand2, Trash2, CheckCircle2, AlertTriangle, RefreshCw,
  Database, ArrowRight, ChevronRight, Filter, Merge, TableProperties,
  Shuffle, Shield, Copy, Download, Loader2
} from 'lucide-react';
import {
  cleanDataset, removeExactDuplicates, imputeNulls,
  normalizeNumericColumn, pivotTable, validateColumn, joinTables
} from '@/lib/dataCleaner';
import { computeQualityScore } from '@/lib/qualityScorer';

const TABS = [
  { id: 'clean', label: 'Auto Clean', icon: Wand2 },
  { id: 'nulls', label: 'Nulls', icon: Filter },
  { id: 'dedup', label: 'Duplicates', icon: Copy },
  { id: 'normalize', label: 'Normalize', icon: Shuffle },
  { id: 'pivot', label: 'Pivot Table', icon: TableProperties },
  { id: 'join', label: 'VLOOKUP / Join', icon: Merge },
  { id: 'validate', label: 'Validation Rules', icon: Shield },
];

const fmtV = v => {
  if (v == null) return '—';
  const n = Number(v);
  if (isNaN(n)) return String(v).slice(0, 20);
  if (Math.abs(n) >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (Math.abs(n) >= 1e3) return `${(n / 1e3).toFixed(0)}K`;
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
};

// ── Auto Clean Tab ────────────────────────────────────────────────
function AutoCleanTab({ table, onApply }) {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);

  const handleRun = async () => {
    setRunning(true);
    await new Promise(r => setTimeout(r, 600));
    const { rows, columns, profile } = cleanDataset(table.rows || [], table.columns || []);
    setResult({ rows, columns, profile });
    setRunning(false);
  };

  return (
    <div className="space-y-5">
      <div className="p-5 rounded-2xl border border-cyan-400/20 bg-cyan-400/4">
        <h3 className="font-semibold text-sm mb-2 text-cyan-400">9-Step Cleaning Pipeline</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs text-white/55">
          {['Normalize column names', 'Strip whitespace', 'Remove exact duplicates', 'Standardize dates (ISO 8601)', 'Impute nulls (median/mode)', 'Cast column types', 'Flag format violations', 'Generate validation report', 'Save cleaned + original'].map((s, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <span className="text-cyan-400 font-mono text-xs">{String(i + 1).padStart(2, '0')}</span> {s}
            </div>
          ))}
        </div>
      </div>

      {result && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Original Rows', value: result.profile.originalRows.toLocaleString(), color: 'text-white/60' },
              { label: 'Cleaned Rows', value: result.profile.cleanedRows.toLocaleString(), color: 'text-green-400' },
              { label: 'Duplicates Removed', value: result.profile.duplicatesRemoved, color: 'text-amber-400' },
              { label: 'Cols Normalized', value: result.profile.columnsNormalized, color: 'text-cyan-400' },
            ].map(m => (
              <div key={m.label} className="p-3 rounded-xl border border-white/8 bg-white/2 text-center">
                <div className="text-xs text-white/35 mb-1">{m.label}</div>
                <div className={`text-xl font-black font-mono ${m.color}`}>{m.value}</div>
              </div>
            ))}
          </div>
          <div className="p-4 rounded-xl border border-white/8 bg-white/2">
            <div className="text-xs text-white/35 uppercase tracking-widest mb-2">Steps Applied</div>
            <div className="space-y-1">
              {result.profile.steps.map((s, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-green-400/80">
                  <CheckCircle2 className="w-3 h-3 flex-shrink-0" /> {s}
                </div>
              ))}
            </div>
          </div>
          <button onClick={() => onApply(result.rows, result.columns)}
            className="w-full py-3 bg-green-400/15 border border-green-400/25 text-green-400 rounded-xl text-sm font-semibold hover:bg-green-400/20 transition-colors flex items-center justify-center gap-2">
            <CheckCircle2 className="w-4 h-4" /> Apply Cleaned Data to Workspace
          </button>
        </div>
      )}

      <button onClick={handleRun} disabled={running}
        className="w-full py-3.5 bg-cyan-400 rounded-xl font-bold text-sm hover:bg-cyan-300 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
        style={{ color: 'hsl(222,47%,6%)' }}>
        {running ? <><Loader2 className="w-4 h-4 animate-spin" /> Running cleaning pipeline…</> : <><Wand2 className="w-4 h-4" /> Run Full Cleaning Pipeline</>}
      </button>
    </div>
  );
}

// ── Nulls Tab ─────────────────────────────────────────────────────
function NullsTab({ table, onApply }) {
  const [strategies, setStrategies] = useState({});
  const [applied, setApplied] = useState(false);

  const nullCols = useMemo(() => {
    return (table.columns || []).map(col => {
      const missing = (table.rows || []).filter(r => r[col.name] == null || r[col.name] === '').length;
      return { ...col, missingCount: missing, missingPct: table.rows?.length ? Math.round(missing / table.rows.length * 100) : 0 };
    }).filter(c => c.missingCount > 0);
  }, [table]);

  const handleApply = () => {
    const colStrategies = strategies;
    const imputed = (table.rows || []).map(row => {
      const newRow = { ...row };
      nullCols.forEach(col => {
        if (newRow[col.name] == null || newRow[col.name] === '') {
          const strat = colStrategies[col.name] || 'drop';
          if (strat === 'zero') newRow[col.name] = 0;
          else if (strat === 'unknown') newRow[col.name] = 'Unknown';
          else if (strat === 'median' && col.type === 'numeric') {
            const vals = (table.rows || []).map(r => Number(r[col.name])).filter(n => !isNaN(n)).sort((a, b) => a - b);
            newRow[col.name] = vals[Math.floor(vals.length / 2)] || 0;
          } else if (strat === 'mode') {
            const freq = {};
            (table.rows || []).forEach(r => { if (r[col.name] != null) freq[r[col.name]] = (freq[r[col.name]] || 0) + 1; });
            newRow[col.name] = Object.entries(freq).sort((a, b) => b[1] - a[1])[0]?.[0] || '';
          }
        }
      });
      return newRow;
    }).filter(row => {
      return !nullCols.some(col => (strategies[col.name] === 'drop') && (row[col.name] == null || row[col.name] === ''));
    });
    onApply(imputed, table.columns);
    setApplied(true);
  };

  if (!nullCols.length) return <div className="text-center py-16 text-sm text-green-400 flex flex-col items-center gap-2"><CheckCircle2 className="w-8 h-8" /> No null values detected. Data is complete.</div>;

  return (
    <div className="space-y-4">
      <div className="text-xs text-white/35 uppercase tracking-widest">{nullCols.length} columns with missing values</div>
      <div className="space-y-2">
        {nullCols.map(col => (
          <div key={col.name} className="flex items-center gap-4 p-3 rounded-xl border border-white/8 bg-white/2 flex-wrap">
            <div className="flex-1 min-w-0">
              <div className="font-mono text-sm font-semibold text-white/80 truncate">{col.name}</div>
              <div className="text-xs text-white/35 mt-0.5">{col.type} · {col.missingCount} missing ({col.missingPct}%)</div>
            </div>
            <div className="w-24 h-1.5 bg-white/8 rounded-full overflow-hidden">
              <div className="h-full bg-amber-400 rounded-full" style={{ width: `${col.missingPct}%` }} />
            </div>
            <select value={strategies[col.name] || 'drop'}
              onChange={e => setStrategies(v => ({ ...v, [col.name]: e.target.value }))}
              className="px-2 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs text-foreground focus:outline-none focus:border-cyan-400/30">
              <option value="drop">Drop rows</option>
              <option value="median">Fill median</option>
              <option value="mode">Fill mode</option>
              <option value="zero">Fill 0</option>
              <option value="unknown">Fill "Unknown"</option>
              <option value="keep">Keep as-is</option>
            </select>
          </div>
        ))}
      </div>
      <button onClick={handleApply} className={`w-full py-3 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2 ${applied ? 'bg-green-400/15 border border-green-400/25 text-green-400' : 'bg-cyan-400/15 border border-cyan-400/25 text-cyan-400 hover:bg-cyan-400/20'}`}>
        {applied ? <><CheckCircle2 className="w-4 h-4" /> Applied!</> : <><Wand2 className="w-4 h-4" /> Apply Null Strategy</>}
      </button>
    </div>
  );
}

// ── Dedup Tab ─────────────────────────────────────────────────────
function DedupTab({ table, onApply }) {
  const [removed, setRemoved] = useState(null);
  const { rows: uniqueRows, removed: dupeCount } = useMemo(() => removeExactDuplicates(table.rows || []), [table.rows]);

  const handleApply = () => {
    onApply(uniqueRows, table.columns);
    setRemoved(dupeCount);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total Rows', value: table.rows?.length?.toLocaleString(), color: 'text-white/60' },
          { label: 'Duplicates Found', value: dupeCount, color: dupeCount > 0 ? 'text-amber-400' : 'text-green-400' },
          { label: 'Unique Rows', value: uniqueRows.length.toLocaleString(), color: 'text-cyan-400' },
        ].map(m => (
          <div key={m.label} className="p-4 rounded-xl border border-white/8 bg-white/2 text-center">
            <div className="text-xs text-white/35 mb-1">{m.label}</div>
            <div className={`text-2xl font-black font-mono ${m.color}`}>{m.value}</div>
          </div>
        ))}
      </div>
      {dupeCount > 0 ? (
        <button onClick={handleApply} className={`w-full py-3 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2 ${removed !== null ? 'bg-green-400/15 border border-green-400/25 text-green-400' : 'bg-amber-400/15 border border-amber-400/25 text-amber-400 hover:bg-amber-400/20'}`}>
          {removed !== null ? <><CheckCircle2 className="w-4 h-4" /> Removed {removed} duplicates!</> : <><Trash2 className="w-4 h-4" /> Remove {dupeCount} Duplicate Rows</>}
        </button>
      ) : (
        <div className="text-center py-8 text-sm text-green-400 flex flex-col items-center gap-2"><CheckCircle2 className="w-6 h-6" /> No duplicates found. Dataset is unique.</div>
      )}
    </div>
  );
}

// ── Normalize Tab ─────────────────────────────────────────────────
function NormalizeTab({ table, onApply }) {
  const numCols = (table.columns || []).filter(c => c.type === 'numeric');
  const [selectedCol, setSelectedCol] = useState(numCols[0]?.name || '');
  const [method, setMethod] = useState('minmax');
  const [applied, setApplied] = useState(false);

  const preview = useMemo(() => {
    if (!selectedCol) return [];
    return normalizeNumericColumn(table.rows?.slice(0, 5) || [], selectedCol, method);
  }, [selectedCol, method, table.rows]);

  const handleApply = () => {
    const normalized = normalizeNumericColumn(table.rows || [], selectedCol, method);
    onApply(normalized, table.columns);
    setApplied(true);
  };

  if (!numCols.length) return <div className="text-center py-16 text-sm text-white/35">No numeric columns available for normalization.</div>;

  const newColName = method === 'minmax' ? `${selectedCol}_normalized` : `${selectedCol}_zscore`;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-xs text-white/40 mb-1.5 block">Column to Normalize</label>
          <select value={selectedCol} onChange={e => setSelectedCol(e.target.value)}
            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none">
            {numCols.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-white/40 mb-1.5 block">Method</label>
          <select value={method} onChange={e => setMethod(e.target.value)}
            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none">
            <option value="minmax">Min-Max (0–1 range)</option>
            <option value="zscore">Z-Score (standard normal)</option>
          </select>
        </div>
      </div>
      <div className="p-3 rounded-xl bg-white/3 border border-white/8 text-xs text-white/45">
        {method === 'minmax' ? "x' = (x - min) / (max - min) → scales all values to [0, 1]" : "z = (x - μ) / σ → mean=0, std=1 standard normal distribution"}
        <span className="text-cyan-400 ml-2">→ adds column: {newColName}</span>
      </div>
      <div className="overflow-auto rounded-xl border border-white/8">
        <table className="w-full text-xs">
          <thead><tr className="bg-white/5 border-b border-white/8">
            <th className="px-3 py-2 text-left text-white/40">Original</th>
            <th className="px-3 py-2 text-left text-cyan-400">{newColName}</th>
          </tr></thead>
          <tbody>{preview.map((row, i) => (
            <tr key={i} className="border-b border-white/5">
              <td className="px-3 py-2 font-mono text-white/60">{fmtV(row[selectedCol])}</td>
              <td className="px-3 py-2 font-mono text-cyan-400">{fmtV(row[newColName])}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      <button onClick={handleApply} className={`w-full py-3 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2 ${applied ? 'bg-green-400/15 border border-green-400/25 text-green-400' : 'bg-purple-400/15 border border-purple-400/25 text-purple-400 hover:bg-purple-400/20'}`}>
        {applied ? <><CheckCircle2 className="w-4 h-4" /> Column added!</> : <><Shuffle className="w-4 h-4" /> Add Normalized Column</>}
      </button>
    </div>
  );
}

// ── Pivot Tab ──────────────────────────────────────────────────────
function PivotTab({ table }) {
  const catCols = (table.columns || []).filter(c => c.type === 'category');
  const numCols = (table.columns || []).filter(c => c.type === 'numeric');
  const [rowDim, setRowDim] = useState(catCols[0]?.name || '');
  const [metric, setMetric] = useState(numCols[0]?.name || '');
  const [agg, setAgg] = useState('sum');

  const pivotData = useMemo(() => {
    if (!rowDim || !metric) return [];
    return pivotTable(table.rows || [], rowDim, metric, agg).slice(0, 20);
  }, [table.rows, rowDim, metric, agg]);

  const downloadCSV = () => {
    const cols = Object.keys(pivotData[0] || {});
    const csv = [cols.join(','), ...pivotData.map(r => cols.map(c => r[c]).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'pivot.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  if (!catCols.length || !numCols.length) return <div className="text-center py-16 text-sm text-white/35">Pivot table requires at least one category and one numeric column.</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-xs text-white/35">Group by:</span>
          <select value={rowDim} onChange={e => setRowDim(e.target.value)} className="px-2 py-1.5 bg-white/5 border border-white/10 rounded-xl text-xs focus:outline-none">
            {catCols.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-white/35">Values:</span>
          <select value={metric} onChange={e => setMetric(e.target.value)} className="px-2 py-1.5 bg-white/5 border border-white/10 rounded-xl text-xs focus:outline-none">
            {numCols.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-white/35">Aggregation:</span>
          <select value={agg} onChange={e => setAgg(e.target.value)} className="px-2 py-1.5 bg-white/5 border border-white/10 rounded-xl text-xs focus:outline-none">
            {['sum', 'avg', 'count', 'min', 'max'].map(a => <option key={a} value={a}>{a.toUpperCase()}</option>)}
          </select>
        </div>
        <button onClick={downloadCSV} className="ml-auto flex items-center gap-1 text-xs text-white/40 hover:text-white/70 px-2 py-1.5 border border-white/8 rounded-lg hover:bg-white/5 transition-all">
          <Download className="w-3 h-3" /> Export
        </button>
      </div>
      <div className="overflow-auto rounded-xl border border-white/8 max-h-80">
        <table className="w-full text-xs">
          <thead><tr className="bg-white/5 border-b border-white/8 sticky top-0">
            <th className="px-3 py-2.5 text-left text-white/40">{rowDim.replace(/_/g,' ')}</th>
            <th className="px-3 py-2.5 text-right text-white/40">{agg.toUpperCase()}({metric.replace(/_/g,' ')})</th>
            <th className="px-3 py-2.5 text-right text-white/40">Count</th>
          </tr></thead>
          <tbody>{pivotData.map((row, i) => (
            <tr key={i} className={`border-b border-white/5 ${i % 2 === 0 ? 'bg-white/[0.01]' : ''}`}>
              <td className="px-3 py-2 text-white/70 font-medium">{row[rowDim]}</td>
              <td className="px-3 py-2 text-right font-mono text-cyan-400">{fmtV(row[metric])}</td>
              <td className="px-3 py-2 text-right font-mono text-white/35">{row.count}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  );
}

// ── Join Tab ───────────────────────────────────────────────────────
function JoinTab({ table, tables, onApply }) {
  const [rightTableId, setRightTableId] = useState('');
  const [leftKey, setLeftKey] = useState(table.columns?.[0]?.name || '');
  const [rightKey, setRightKey] = useState('');
  const [lookupCols, setLookupCols] = useState([]);
  const [applied, setApplied] = useState(false);

  const rightTable = tables.find(t => t.id === rightTableId);

  const handleApply = () => {
    if (!rightTable || !leftKey || !rightKey || !lookupCols.length) return;
    const joined = joinTables(table.rows || [], rightTable.rows || [], leftKey, rightKey, lookupCols);
    const newCols = [...table.columns, ...lookupCols.map(c => ({ name: `lookup_${c}`, type: 'text' }))];
    onApply(joined, newCols);
    setApplied(true);
  };

  const otherTables = tables.filter(t => t.id !== table.id);

  return (
    <div className="space-y-4">
      <div className="p-4 rounded-xl bg-blue-400/5 border border-blue-400/20 text-xs text-blue-300/80">
        <strong>VLOOKUP equivalent:</strong> Match rows from another table by key column and bring in selected lookup columns.
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-xs text-white/40 mb-1.5 block">Key Column (this table)</label>
          <select value={leftKey} onChange={e => setLeftKey(e.target.value)} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none">
            {table.columns?.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-white/40 mb-1.5 block">Lookup Table</label>
          <select value={rightTableId} onChange={e => setRightTableId(e.target.value)} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none">
            <option value="">Select table…</option>
            {otherTables.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
      </div>
      {rightTable && (
        <>
          <div>
            <label className="text-xs text-white/40 mb-1.5 block">Match Key in "{rightTable.name}"</label>
            <select value={rightKey} onChange={e => setRightKey(e.target.value)} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none">
              <option value="">Select key…</option>
              {rightTable.columns?.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-white/40 mb-1.5 block">Columns to Bring In</label>
            <div className="flex flex-wrap gap-2">
              {rightTable.columns?.map(c => {
                const sel = lookupCols.includes(c.name);
                return (
                  <button key={c.name} onClick={() => setLookupCols(v => sel ? v.filter(x => x !== c.name) : [...v, c.name])}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-all ${sel ? 'bg-cyan-400/15 border-cyan-400/30 text-cyan-400' : 'bg-white/5 border-white/10 text-white/45 hover:border-white/25'}`}>
                    {c.name}
                  </button>
                );
              })}
            </div>
          </div>
          <button onClick={handleApply} disabled={!leftKey || !rightKey || !lookupCols.length}
            className={`w-full py-3 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2 ${applied ? 'bg-green-400/15 border border-green-400/25 text-green-400' : 'bg-cyan-400/15 border border-cyan-400/25 text-cyan-400 hover:bg-cyan-400/20 disabled:opacity-40'}`}>
            {applied ? <><CheckCircle2 className="w-4 h-4" /> Join applied!</> : <><Merge className="w-4 h-4" /> Apply VLOOKUP Join</>}
          </button>
        </>
      )}
      {!otherTables.length && <div className="text-xs text-white/35 text-center py-4">Upload a second table in Intake to enable joins.</div>}
    </div>
  );
}

// ── Validate Tab ──────────────────────────────────────────────────
function ValidateTab({ table }) {
  const [rules, setRules] = useState({});
  const [violations, setViolations] = useState(null);

  const handleRun = () => {
    const allViolations = {};
    Object.entries(rules).forEach(([col, rule]) => {
      const v = validateColumn(table.rows || [], col, rule);
      if (v.length) allViolations[col] = v;
    });
    setViolations(allViolations);
  };

  return (
    <div className="space-y-4">
      <div className="text-xs text-white/35">Define validation rules per column. Run to flag violations.</div>
      <div className="space-y-3">
        {(table.columns || []).slice(0, 8).map(col => (
          <div key={col.name} className="p-3 rounded-xl border border-white/8 bg-white/2 space-y-2">
            <div className="font-mono text-xs font-semibold text-white/70">{col.name} <span className="text-white/25 font-normal">({col.type})</span></div>
            <div className="flex flex-wrap gap-3">
              <label className="flex items-center gap-1.5 text-xs text-white/45 cursor-pointer">
                <input type="checkbox" onChange={e => setRules(v => ({ ...v, [col.name]: { ...v[col.name], required: e.target.checked } }))} />
                Required
              </label>
              {col.type === 'numeric' && (
                <>
                  <label className="flex items-center gap-1.5 text-xs text-white/45">
                    Min: <input type="number" placeholder="—" className="w-16 px-1.5 py-1 bg-white/5 border border-white/10 rounded text-xs focus:outline-none"
                      onChange={e => setRules(v => ({ ...v, [col.name]: { ...v[col.name], min: e.target.value !== '' ? Number(e.target.value) : undefined } }))} />
                  </label>
                  <label className="flex items-center gap-1.5 text-xs text-white/45">
                    Max: <input type="number" placeholder="—" className="w-16 px-1.5 py-1 bg-white/5 border border-white/10 rounded text-xs focus:outline-none"
                      onChange={e => setRules(v => ({ ...v, [col.name]: { ...v[col.name], max: e.target.value !== '' ? Number(e.target.value) : undefined } }))} />
                  </label>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
      <button onClick={handleRun} className="w-full py-3 bg-purple-400/15 border border-purple-400/25 text-purple-400 rounded-xl text-sm font-semibold hover:bg-purple-400/20 transition-colors flex items-center justify-center gap-2">
        <Shield className="w-4 h-4" /> Run Validation Rules
      </button>
      {violations !== null && (
        <div className="space-y-2">
          {Object.keys(violations).length === 0 ? (
            <div className="flex items-center gap-2 p-3 bg-green-400/8 border border-green-400/20 rounded-xl text-sm text-green-400">
              <CheckCircle2 className="w-4 h-4" /> All validation rules passed!
            </div>
          ) : (
            Object.entries(violations).map(([col, viols]) => (
              <div key={col} className="p-3 bg-red-400/5 border border-red-400/20 rounded-xl">
                <div className="text-xs font-semibold text-red-400 mb-1">{col}: {viols.length} violations</div>
                {viols.slice(0, 3).map((v, i) => (
                  <div key={i} className="text-xs text-red-400/70">Row {v.row}: {v.reason} (value: {String(v.value)})</div>
                ))}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────
export default function DataPrepStudio() {
  const { getActiveTable, tables, updateTable, setActiveSection } = useWorkspaceStore();
  const table = getActiveTable();
  const [activeTab, setActiveTab] = useState('clean');

  const handleApply = (newRows, newColumns) => {
    if (!table) return;
    const newScore = computeQualityScore(newRows, newColumns);
    updateTable(table.id, { rows: newRows, columns: newColumns, rowCount: newRows.length, qualityScore: newScore });
  };

  if (!table) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[500px] text-center">
        <Database className="w-12 h-12 text-white/20 mb-4" />
        <h2 className="text-lg font-semibold mb-2">No Data Loaded</h2>
        <p className="text-sm text-muted-foreground mb-5">Upload a dataset first to use the Data Prep Studio.</p>
        <button onClick={() => setActiveSection('intake')} className="flex items-center gap-2 px-5 py-2.5 bg-cyan-400/10 border border-cyan-400/20 text-cyan-400 rounded-xl text-sm font-semibold hover:bg-cyan-400/15 transition-colors">
          Upload Data <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 pt-5 pb-3 border-b border-white/5 flex-shrink-0">
        <div className="flex items-center gap-2 mb-1">
          <Wand2 className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-mono text-white/40 uppercase tracking-widest">Data Prep & Validation Studio</span>
        </div>
        <h1 className="text-xl font-bold mb-0.5">Data Engineering Layer</h1>
        <p className="text-xs text-muted-foreground">
          <span className="text-cyan-400 font-mono">{table.name}</span> · {table.rowCount?.toLocaleString()} rows · {table.columns?.length} cols · Quality: <span className={table.qualityScore >= 90 ? 'text-green-400' : table.qualityScore >= 70 ? 'text-amber-400' : 'text-red-400'}>{table.qualityScore}%</span>
        </p>
      </div>

      {/* Tab bar */}
      <div className="flex items-center gap-0.5 px-5 py-2 border-b border-white/5 overflow-x-auto flex-shrink-0">
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-cyan-400/10 text-cyan-400 border border-cyan-400/20' : 'text-white/35 hover:text-white/65 hover:bg-white/4 border border-transparent'}`}>
            <tab.icon className="w-3 h-3" /> {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        <motion.div key={activeTab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.15 }}>
          {activeTab === 'clean' && <AutoCleanTab table={table} onApply={handleApply} />}
          {activeTab === 'nulls' && <NullsTab table={table} onApply={handleApply} />}
          {activeTab === 'dedup' && <DedupTab table={table} onApply={handleApply} />}
          {activeTab === 'normalize' && <NormalizeTab table={table} onApply={handleApply} />}
          {activeTab === 'pivot' && <PivotTab table={table} />}
          {activeTab === 'join' && <JoinTab table={table} tables={tables} onApply={handleApply} />}
          {activeTab === 'validate' && <ValidateTab table={table} />}
        </motion.div>
      </div>
    </div>
  );
}