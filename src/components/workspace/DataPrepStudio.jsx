/**
 * DataPrepStudio — Data Prep & Validation Studio
 * Null handling · Deduplication · Normalization · VLOOKUP/Join · Pivot · Validation rules
 */
import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWorkspaceStore } from '@/lib/store';
import { cleanDataset, applyNormalization, vlookup, pivotTable } from '@/lib/dataCleaner';
import { computeQualityScore, getQualityLabel } from '@/lib/qualityScorer';
import {
  Database, Wand2, RefreshCw, CheckCircle2, AlertTriangle, Download,
  ArrowRight, Hash, Filter, BarChart3, GitMerge, Table2, Shield, Loader2, Info
} from 'lucide-react';
import PythonPreviewPanel from '@/components/workspace/PythonPreviewPanel';

const fmtV = v => { if (v == null || isNaN(v)) return '—'; const n = Number(v); if (n >= 1e6) return `${(n/1e6).toFixed(1)}M`; if (n >= 1e3) return `${(n/1e3).toFixed(0)}K`; return n.toLocaleString(undefined, { maximumFractionDigits: 1 }); };

const TABS = [
  { id: 'clean', label: 'Auto Clean', icon: Wand2 },
  { id: 'normalize', label: 'Normalize', icon: Hash },
  { id: 'pivot', label: 'Pivot Table', icon: Table2 },
  { id: 'join', label: 'VLOOKUP / Join', icon: GitMerge },
  { id: 'validate', label: 'Validation Rules', icon: Shield },
];

export default function DataPrepStudio() {
  const { getActiveTable, updateTable, setActiveSection, tables } = useWorkspaceStore();
  const table = getActiveTable();
  const [activeTab, setActiveTab] = useState('clean');
  const [cleaning, setCleaning] = useState(false);
  const [cleanProfile, setCleanProfile] = useState(null);
  const [normCol, setNormCol] = useState('');
  const [normMethod, setNormMethod] = useState('minmax');
  const [pivotRow, setPivotRow] = useState('');
  const [pivotCol, setPivotCol] = useState('');
  const [pivotVal, setPivotVal] = useState('');
  const [pivotAgg, setPivotAgg] = useState('sum');
  const [pivotResult, setPivotResult] = useState(null);
  const [joinKey, setJoinKey] = useState('');
  const [joinTable, setJoinTable] = useState('');
  const [joinCols, setJoinCols] = useState([]);
  const [joinResult, setJoinResult] = useState(null);
  const [validRules, setValidRules] = useState([]);
  const [newRule, setNewRule] = useState({ col: '', type: 'min', value: '' });

  const qualityInfo = useMemo(() => {
    if (!table?.rows || !table?.columns) return null;
    return computeQualityScore(table.rows, table.columns);
  }, [table]);

  const qualityLabel = qualityInfo ? getQualityLabel(qualityInfo.score) : null;

  if (!table) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[500px] text-center">
        <Database className="w-12 h-12 text-white/20 mb-4" />
        <h2 className="text-lg font-semibold mb-2">Data Prep Studio</h2>
        <p className="text-sm text-muted-foreground mb-5">Upload a dataset to access cleaning, normalization, pivot, and join tools.</p>
        <button onClick={() => setActiveSection('intake')} className="flex items-center gap-2 px-5 py-2.5 bg-cyan-400/10 border border-cyan-400/20 text-cyan-400 rounded-xl text-sm font-semibold hover:bg-cyan-400/15 transition-colors">
          Upload Data <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    );
  }

  const numCols = table.columns?.filter(c => c.type === 'numeric') || [];
  const catCols = table.columns?.filter(c => c.type === 'category') || [];

  const handleClean = async () => {
    setCleaning(true);
    await new Promise(r => setTimeout(r, 200));
    const { cleanedRows, cleanedColumns, profile } = cleanDataset(table.rows, table.columns);
    const newQS = computeQualityScore(cleanedRows, cleanedColumns);
    updateTable(table.id, { rows: cleanedRows, columns: cleanedColumns, qualityScore: newQS.score, rowCount: cleanedRows.length });
    setCleanProfile({ ...profile, newQualityScore: newQS.score });
    setCleaning(false);
  };

  const handleNormalize = () => {
    if (!normCol) return;
    const newRows = applyNormalization(table.rows, normCol, normMethod);
    const newColName = normMethod === 'minmax' ? `${normCol}_norm` : `${normCol}_z`;
    const newCols = [...table.columns, { name: newColName, type: 'numeric', uniqueCount: newRows.length }];
    updateTable(table.id, { rows: newRows, columns: newCols });
  };

  const handlePivot = () => {
    if (!pivotRow || !pivotCol || !pivotVal) return;
    const result = pivotTable(table.rows, pivotRow, pivotCol, pivotVal, pivotAgg);
    setPivotResult(result);
  };

  const handleJoin = () => {
    if (!joinKey || !joinTable || !joinCols.length) return;
    const lookupT = tables.find(t => t.id === joinTable);
    if (!lookupT) return;
    const newRows = vlookup(table.rows, lookupT.rows, joinKey, joinKey, joinCols);
    const addedCols = joinCols.map(c => ({ name: `lookup_${c}`, type: 'text' }));
    setJoinResult({ rowCount: newRows.length, addedCols: addedCols.length });
    updateTable(table.id, { rows: newRows, columns: [...table.columns, ...addedCols] });
  };

  const addValidationRule = () => {
    if (!newRule.col || !newRule.value) return;
    setValidRules(r => [...r, { ...newRule, id: Date.now() }]);
    setNewRule({ col: '', type: 'min', value: '' });
  };

  const runValidation = () => {
    return validRules.map(rule => {
      let violations = 0;
      table.rows.forEach(row => {
        const v = Number(row[rule.col]);
        if (rule.type === 'min' && !isNaN(v) && v < Number(rule.value)) violations++;
        else if (rule.type === 'max' && !isNaN(v) && v > Number(rule.value)) violations++;
        else if (rule.type === 'notnull' && (row[rule.col] == null || row[rule.col] === '')) violations++;
      });
      return { ...rule, violations, pct: Math.round((violations / table.rows.length) * 100) };
    });
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold mb-1">Data Prep & Validation Studio</h1>
        <p className="text-sm text-muted-foreground">Clean, normalize, pivot, join, and validate your data — {table.name} · {table.rowCount?.toLocaleString()} rows</p>
      </motion.div>

      {/* Quality score */}
      {qualityInfo && (
        <div className={`glass-card rounded-2xl p-4 border ${qualityLabel.border} flex items-center gap-4 flex-wrap`}>
          <div className={`text-2xl font-black font-mono ${qualityLabel.color}`}>{qualityInfo.score}%</div>
          <div>
            <div className={`text-sm font-semibold ${qualityLabel.color}`}>{qualityLabel.label}</div>
            <div className="text-xs text-white/35 mt-0.5">
              Completeness {qualityInfo.breakdown.completeness}% · Validity {qualityInfo.breakdown.validity}% · Uniqueness {qualityInfo.breakdown.uniqueness}% · Consistency {qualityInfo.breakdown.consistency}%
            </div>
          </div>
          {qualityInfo.duplicateRows > 0 && (
            <div className="ml-auto flex items-center gap-1.5 text-xs text-amber-400">
              <AlertTriangle className="w-3.5 h-3.5" /> {qualityInfo.duplicateRows} duplicates
            </div>
          )}
          {qualityInfo.missingCells > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-orange-400">
              <Info className="w-3.5 h-3.5" /> {qualityInfo.missingCells} missing cells
            </div>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-0.5 border-b border-white/5 overflow-x-auto">
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium rounded-t-xl transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-white/8 text-cyan-400 border-t border-x border-white/10' : 'text-white/35 hover:text-white/65 hover:bg-white/4'}`}>
            <tab.icon className="w-3.5 h-3.5" /> {tab.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={activeTab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.15 }}>

          {/* AUTO CLEAN */}
          {activeTab === 'clean' && (
            <div className="space-y-4">
              <div className="glass-card rounded-2xl p-5 border border-white/8">
                <div className="font-semibold text-sm mb-3">9-Step Cleaning Pipeline</div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-5">
                  {['Normalize column names', 'Strip whitespace & hidden chars', 'Remove exact duplicates', 'Standardize dates (ISO 8601)', 'Null imputation (median / mode)', 'Cast correct data types', 'Flag format inconsistencies', 'Remove noisy outliers (>5σ)', 'Generate cleaning report'].map((step, i) => (
                    <div key={step} className="flex items-center gap-2 text-xs text-white/55">
                      <CheckCircle2 className="w-3 h-3 text-cyan-400/60 flex-shrink-0" />
                      {step}
                    </div>
                  ))}
                </div>
                <button onClick={handleClean} disabled={cleaning}
                  className="flex items-center gap-2 px-5 py-2.5 bg-cyan-400 rounded-xl font-bold text-sm disabled:opacity-50 hover:bg-cyan-300 transition-all"
                  style={{ color: 'hsl(222,47%,6%)' }}>
                  {cleaning ? <><Loader2 className="w-4 h-4 animate-spin" /> Cleaning…</> : <><Wand2 className="w-4 h-4" /> Run Full Cleaning Pipeline</>}
                </button>
              </div>
              {cleanProfile && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  className="glass-card rounded-2xl p-5 border border-green-400/20 bg-green-400/5">
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle2 className="w-4 h-4 text-green-400" />
                    <span className="font-semibold text-green-400">Cleaning Complete</span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      ['Rows Before', cleanProfile.rowsBefore?.toLocaleString()],
                      ['Rows After', cleanProfile.rowsAfter?.toLocaleString()],
                      ['Duplicates Removed', cleanProfile.duplicatesRemoved],
                      ['New Quality Score', `${cleanProfile.newQualityScore}%`],
                    ].map(([l, v]) => (
                      <div key={l} className="text-center">
                        <div className="text-lg font-black text-green-400">{v}</div>
                        <div className="text-xs text-white/35">{l}</div>
                      </div>
                    ))}
                  </div>
                  {cleanProfile.columnNamesNormalized > 0 && (
                    <div className="mt-3 text-xs text-white/40">{cleanProfile.columnNamesNormalized} column names normalized · {cleanProfile.noisyRowsFlagged} noisy values flagged</div>
                  )}
                </motion.div>
              )}
              <PythonPreviewPanel table={table} cleanProfile={cleanProfile} />
            </div>
          )}

          {/* NORMALIZE */}
          {activeTab === 'normalize' && (
            <div className="glass-card rounded-2xl p-5 border border-white/8 space-y-4">
              <div className="font-semibold text-sm">Column Normalization</div>
              <div className="text-xs text-white/35">Min-max: x' = (x−min)/(max−min) · Z-score: z = (x−μ)/σ</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-muted-foreground mb-1.5 block">Numeric Column</label>
                  <select value={normCol} onChange={e => setNormCol(e.target.value)}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none text-foreground">
                    <option value="">— Select column —</option>
                    {numCols.map(c => <option key={c.name} value={c.name}>{c.name.replace(/_/g, ' ')}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1.5 block">Method</label>
                  <select value={normMethod} onChange={e => setNormMethod(e.target.value)}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none text-foreground">
                    <option value="minmax">Min-Max Normalization [0, 1]</option>
                    <option value="zscore">Z-Score Standardization (μ=0, σ=1)</option>
                  </select>
                </div>
              </div>
              <button onClick={handleNormalize} disabled={!normCol}
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-400/15 border border-blue-400/25 text-blue-400 rounded-xl text-sm font-semibold disabled:opacity-40 hover:bg-blue-400/20 transition-all">
                <Hash className="w-4 h-4" /> Apply Normalization (adds new column)
              </button>
            </div>
          )}

          {/* PIVOT */}
          {activeTab === 'pivot' && (
            <div className="space-y-4">
              <div className="glass-card rounded-2xl p-5 border border-white/8">
                <div className="font-semibold text-sm mb-3">Pivot Table Builder</div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
                  {[
                    { label: 'Row Dimension', value: pivotRow, setter: setPivotRow, options: catCols },
                    { label: 'Column Dimension', value: pivotCol, setter: setPivotCol, options: catCols },
                    { label: 'Value Column', value: pivotVal, setter: setPivotVal, options: numCols },
                  ].map(({ label, value, setter, options }) => (
                    <div key={label}>
                      <label className="text-xs text-muted-foreground mb-1.5 block">{label}</label>
                      <select value={value} onChange={e => setter(e.target.value)}
                        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none text-foreground">
                        <option value="">— Select —</option>
                        {options.map(c => <option key={c.name} value={c.name}>{c.name.replace(/_/g, ' ')}</option>)}
                      </select>
                    </div>
                  ))}
                  <div>
                    <label className="text-xs text-muted-foreground mb-1.5 block">Aggregation</label>
                    <select value={pivotAgg} onChange={e => setPivotAgg(e.target.value)}
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none text-foreground">
                      <option value="sum">SUM</option>
                      <option value="avg">AVG</option>
                      <option value="count">COUNT</option>
                    </select>
                  </div>
                </div>
                <button onClick={handlePivot} disabled={!pivotRow || !pivotCol || !pivotVal}
                  className="flex items-center gap-2 px-5 py-2.5 bg-purple-400/15 border border-purple-400/25 text-purple-400 rounded-xl text-sm font-semibold disabled:opacity-40 hover:bg-purple-400/20 transition-all">
                  <Table2 className="w-4 h-4" /> Build Pivot Table
                </button>
              </div>
              {pivotResult && (
                <div className="rounded-xl overflow-hidden border border-white/8">
                  <div className="overflow-auto max-h-80">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-white/5 border-b border-white/8">
                          <th className="px-3 py-2.5 text-left text-white/40">{pivotResult.rowDim}</th>
                          {pivotResult.colHeaders.map(h => (
                            <th key={h} className="px-3 py-2.5 text-right text-white/40 whitespace-nowrap">{String(h).slice(0, 14)}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {pivotResult.pivotRows.slice(0, 50).map((row, i) => (
                          <tr key={i} className="border-b border-white/5 hover:bg-white/2 transition-colors">
                            <td className="px-3 py-2 font-semibold text-white/70">{row[pivotResult.rowDim]}</td>
                            {pivotResult.colHeaders.map(h => (
                              <td key={h} className="px-3 py-2 text-right font-mono text-white/55">{fmtV(row[h])}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* JOIN / VLOOKUP */}
          {activeTab === 'join' && (
            <div className="glass-card rounded-2xl p-5 border border-white/8 space-y-4">
              <div className="font-semibold text-sm">VLOOKUP / Table Join</div>
              <div className="text-xs text-white/35">Merge two loaded tables on a common key column (equivalent to Excel VLOOKUP or SQL JOIN)</div>
              {tables.length < 2 ? (
                <div className="flex items-start gap-3 p-3 bg-amber-400/5 border border-amber-400/20 rounded-xl text-xs text-amber-400">
                  <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                  Load at least 2 tables to use the join feature. Upload a second dataset in Intake.
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-muted-foreground mb-1.5 block">Join Key (main table)</label>
                      <select value={joinKey} onChange={e => setJoinKey(e.target.value)}
                        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none text-foreground">
                        <option value="">— Select key —</option>
                        {table.columns?.map(c => <option key={c.name} value={c.name}>{c.name.replace(/_/g, ' ')}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1.5 block">Lookup Table</label>
                      <select value={joinTable} onChange={e => setJoinTable(e.target.value)}
                        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none text-foreground">
                        <option value="">— Select table —</option>
                        {tables.filter(t => t.id !== table.id).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                      </select>
                    </div>
                  </div>
                  {joinTable && (
                    <div>
                      <label className="text-xs text-muted-foreground mb-1.5 block">Columns to Add from Lookup Table</label>
                      <div className="flex flex-wrap gap-2">
                        {tables.find(t => t.id === joinTable)?.columns?.map(c => (
                          <button key={c.name} onClick={() => setJoinCols(prev => prev.includes(c.name) ? prev.filter(x => x !== c.name) : [...prev, c.name])}
                            className={`text-xs px-3 py-1.5 rounded-full border transition-all ${joinCols.includes(c.name) ? 'bg-teal-400/15 border-teal-400/30 text-teal-400' : 'bg-white/5 border-white/10 text-white/45 hover:border-white/25'}`}>
                            {c.name.replace(/_/g, ' ')}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  <button onClick={handleJoin} disabled={!joinKey || !joinTable || !joinCols.length}
                    className="flex items-center gap-2 px-5 py-2.5 bg-teal-400/15 border border-teal-400/25 text-teal-400 rounded-xl text-sm font-semibold disabled:opacity-40 hover:bg-teal-400/20 transition-all">
                    <GitMerge className="w-4 h-4" /> Execute Join
                  </button>
                  {joinResult && (
                    <div className="flex items-center gap-2 text-sm text-green-400">
                      <CheckCircle2 className="w-4 h-4" /> Join complete — {joinResult.addedCols} columns added to {joinResult.rowCount.toLocaleString()} rows
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* VALIDATION RULES */}
          {activeTab === 'validate' && (
            <div className="space-y-4">
              <div className="glass-card rounded-2xl p-5 border border-white/8 space-y-3">
                <div className="font-semibold text-sm">Add Validation Rule</div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <select value={newRule.col} onChange={e => setNewRule(r => ({ ...r, col: e.target.value }))}
                    className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none text-foreground">
                    <option value="">— Column —</option>
                    {table.columns?.map(c => <option key={c.name} value={c.name}>{c.name.replace(/_/g, ' ')}</option>)}
                  </select>
                  <select value={newRule.type} onChange={e => setNewRule(r => ({ ...r, type: e.target.value }))}
                    className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none text-foreground">
                    <option value="min">Min Value ≥</option>
                    <option value="max">Max Value ≤</option>
                    <option value="notnull">Not Null</option>
                  </select>
                  <input value={newRule.value} onChange={e => setNewRule(r => ({ ...r, value: e.target.value }))}
                    placeholder="Threshold value"
                    className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none text-foreground" />
                </div>
                <button onClick={addValidationRule} disabled={!newRule.col}
                  className="flex items-center gap-2 px-4 py-2 bg-amber-400/15 border border-amber-400/25 text-amber-400 rounded-xl text-sm font-semibold disabled:opacity-40 hover:bg-amber-400/20 transition-all">
                  <Shield className="w-3.5 h-3.5" /> Add Rule
                </button>
              </div>
              {validRules.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs text-white/35 uppercase tracking-widest">Validation Results</div>
                  {runValidation().map((rule, i) => (
                    <div key={rule.id} className={`flex items-center justify-between p-3 rounded-xl border text-sm ${rule.violations > 0 ? 'bg-red-400/5 border-red-400/20' : 'bg-green-400/5 border-green-400/20'}`}>
                      <span className="font-mono text-white/65">{rule.col} {rule.type === 'min' ? '≥' : rule.type === 'max' ? '≤' : '≠ null'} {rule.value}</span>
                      {rule.violations > 0
                        ? <span className="text-red-400 font-semibold">{rule.violations} violations ({rule.pct}%)</span>
                        : <span className="text-green-400 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Pass</span>
                      }
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </motion.div>
      </AnimatePresence>
    </div>
  );
}