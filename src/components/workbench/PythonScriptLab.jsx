/**
 * PythonScriptLab — In-browser pandas-style script editor for the Workbench
 * Executes JS-based data transformations against the loaded workspace table.
 */
import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWorkspaceStore } from '@/lib/store';
import { base44 } from '@/api/base44Client';
import {
  Code2, Play, Copy, Check, Sparkles, Loader2, ArrowRight,
  Database, Download, ChevronDown, ChevronUp, AlertTriangle, CheckCircle2
} from 'lucide-react';

const STARTER_SCRIPTS = [
  {
    label: 'Describe Dataset',
    code: `# Describe the dataset — shape, types, missing values
result = []
result.append(f"Shape: {len(df)} rows × {len(df.columns)} columns")
result.append("")
result.append("Column types:")
for col in df.columns:
    vals = [r[col] for r in df if r.get(col) is not None]
    nulls = len(df) - len(vals)
    result.append(f"  {col}: {infer_type(vals)} ({nulls} nulls)")
return "\\n".join(result)`,
  },
  {
    label: 'Top 10 by Primary KPI',
    code: `# Top 10 rows by primary numeric KPI
numeric_cols = [c for c in df.columns if is_numeric(df, c)]
if not numeric_cols:
    return "No numeric columns found."
kpi = numeric_cols[0]
sorted_df = sorted(df, key=lambda r: to_num(r.get(kpi, 0)), reverse=True)
top10 = sorted_df[:10]
return table(top10, [kpi] + df.columns[:3])`,
  },
  {
    label: 'Group By & Aggregate',
    code: `# Group by first category column, sum first numeric column
cat_cols = [c for c in df.columns if is_category(df, c)]
num_cols = [c for c in df.columns if is_numeric(df, c)]
if not cat_cols or not num_cols:
    return "Need at least one category and one numeric column."
group_col = cat_cols[0]
agg_col = num_cols[0]
groups = {}
for row in df:
    key = str(row.get(group_col, ""))
    val = to_num(row.get(agg_col, 0))
    groups[key] = groups.get(key, 0) + val
sorted_groups = sorted(groups.items(), key=lambda x: x[1], reverse=True)
rows = [{group_col: k, f"sum_{agg_col}": round(v, 2)} for k, v in sorted_groups[:20]]
return table(rows, [group_col, f"sum_{agg_col}"])`,
  },
  {
    label: 'Detect Outliers (Z-Score)',
    code: `# Detect outliers using z-score > 2.5 threshold
num_cols = [c for c in df.columns if is_numeric(df, c)]
if not num_cols:
    return "No numeric columns found."
col = num_cols[0]
vals = [to_num(r.get(col, 0)) for r in df]
mean = sum(vals) / len(vals)
std = (sum((v - mean)**2 for v in vals) / len(vals)) ** 0.5
if std == 0:
    return f"All values in '{col}' are identical — no outliers."
outliers = [r for r in df if abs((to_num(r.get(col, 0)) - mean) / std) > 2.5]
result = [f"Outliers in '{col}' (|z| > 2.5): {len(outliers)} of {len(df)} rows"]
return result[0] + "\\n\\n" + table(outliers[:20], df.columns[:5])`,
  },
  {
    label: 'Correlation Matrix',
    code: `# Pearson correlations between all numeric columns
num_cols = [c for c in df.columns if is_numeric(df, c)][:6]
if len(num_cols) < 2:
    return "Need at least 2 numeric columns for correlation."

def corr(col_a, col_b):
    vals_a = [to_num(r.get(col_a, 0)) for r in df]
    vals_b = [to_num(r.get(col_b, 0)) for r in df]
    n = len(vals_a)
    mean_a = sum(vals_a) / n
    mean_b = sum(vals_b) / n
    num = sum((a - mean_a) * (b - mean_b) for a, b in zip(vals_a, vals_b))
    den = (sum((a - mean_a)**2 for a in vals_a) * sum((b - mean_b)**2 for b in vals_b)) ** 0.5
    return round(num / den, 3) if den else 0

rows = []
for a in num_cols:
    row = {"metric": a}
    for b in num_cols:
        row[b] = corr(a, b)
    rows.append(row)
return table(rows, ["metric"] + num_cols)`,
  },
  {
    label: 'Missing Values Audit',
    code: `# Count missing values per column
rows = []
for col in df.columns:
    nulls = sum(1 for r in df if r.get(col) is None or r.get(col) == "")
    pct = round(nulls / len(df) * 100, 1) if df else 0
    rows.append({"column": col, "null_count": nulls, "null_pct": f"{pct}%", "status": "⚠️ High" if pct > 20 else "✓ OK"})
rows.sort(key=lambda r: r["null_count"], reverse=True)
return table(rows, ["column", "null_count", "null_pct", "status"])`,
  },
];

// ── Lightweight script interpreter ──────────────────────────────────────────
function runScript(code, tableData) {
  const df = tableData.rows || [];
  const columns = (tableData.columns || []).map(c => c.name);

  // Helper: is column numeric?
  const isNumeric = (dfArr, col) => {
    const sample = dfArr.slice(0, 20).map(r => r[col]).filter(v => v != null);
    return sample.length > 0 && sample.filter(v => !isNaN(Number(v))).length > sample.length * 0.7;
  };

  // Helper: is column categorical?
  const isCategory = (dfArr, col) => {
    const unique = new Set(dfArr.slice(0, 50).map(r => String(r[col] ?? '')));
    return unique.size < 30 && !isNumeric(dfArr, col);
  };

  // Helper: convert to number safely
  const toNum = (v) => { const n = Number(v); return isNaN(n) ? 0 : n; };

  // Helper: infer type label
  const inferType = (vals) => {
    const sample = vals.slice(0, 10).filter(v => v != null);
    if (sample.every(v => !isNaN(Number(v)))) return 'numeric';
    if (sample.some(v => /\d{4}-\d{2}-\d{2}/.test(String(v)))) return 'date';
    const unique = new Set(sample.map(String));
    if (unique.size < 10) return 'category';
    return 'text';
  };

  // Helper: render a table result
  const table = (rows, cols) => {
    if (!rows?.length) return 'No results.';
    const headers = cols || Object.keys(rows[0] || {});
    const sep = headers.map(h => '-'.repeat(Math.max(h.length, 8))).join(' | ');
    const header = headers.join(' | ');
    const body = rows.slice(0, 50).map(row =>
      headers.map(h => String(row[h] ?? '').slice(0, 16).padEnd(Math.max(h.length, 8))).join(' | ')
    ).join('\n');
    return `${header}\n${sep}\n${body}${rows.length > 50 ? `\n… (${rows.length - 50} more rows)` : ''}`;
  };

  // Expose df.columns as iterable
  df.columns = columns;

  try {
    // Wrap user code in a function
    const fn = new Function(
      'df', 'table', 'is_numeric', 'is_category', 'to_num', 'infer_type',
      `"use strict";\n${code.replace(/^#[^\n]*/gm, '//$&')}`
    );
    const result = fn(df, table, isNumeric, isCategory, toNum, inferType);
    return { ok: true, output: result == null ? '✓ Script executed with no return value.' : String(result) };
  } catch (e) {
    return { ok: false, output: `Error: ${e.message}` };
  }
}

// ── Component ────────────────────────────────────────────────────────────────
export default function PythonScriptLab() {
  const { getActiveTable, setActiveSection } = useWorkspaceStore();
  const table = getActiveTable();

  const [script, setScript] = useState(STARTER_SCRIPTS[0].code);
  const [output, setOutput] = useState('');
  const [running, setRunning] = useState(false);
  const [success, setSuccess] = useState(null);
  const [copied, setCopied] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [nlPrompt, setNlPrompt] = useState('');
  const [showStarters, setShowStarters] = useState(true);

  const handleRun = async () => {
    if (!table) return;
    setRunning(true);
    setOutput('');
    await new Promise(r => setTimeout(r, 80));
    const result = runScript(script, table);
    setOutput(result.output);
    setSuccess(result.ok);
    setRunning(false);
  };

  const handleGenerate = async () => {
    if (!nlPrompt.trim() || !table) return;
    setGenerating(true);
    try {
      const cols = (table.columns || []).map(c => `${c.name} (${c.type})`).join(', ');
      const generated = await base44.integrations.Core.InvokeLLM({
        prompt: `Write a Python-style analytics script for this dataset.

Dataset: "${table.name}" — ${table.rowCount} rows
Columns: ${cols}

User request: "${nlPrompt}"

RULES:
- Use the pre-defined helpers: df (list of dicts), table(rows, cols), is_numeric(df,col), is_category(df,col), to_num(val), infer_type(vals)
- Use Python-style syntax with comments starting with #
- End with: return table(result_rows, headers) OR return "string result"
- No imports needed — helpers are injected automatically
- Keep it concise (under 25 lines)
- Do NOT use pandas, numpy, or any library — pure Python dict/list operations only

Return ONLY the raw script code, no explanations, no markdown fences.`,
      });
      setScript(generated?.trim() || '# Could not generate script');
      setNlPrompt('');
    } catch {
      setScript('# Script generation failed — try writing it manually');
    }
    setGenerating(false);
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(script);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadOutput = () => {
    const blob = new Blob([output], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${table?.name || 'output'}_script_result.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!table) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[500px] text-center">
        <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/8 flex items-center justify-center mx-auto mb-4">
          <Code2 className="w-7 h-7 text-white/25" />
        </div>
        <h2 className="text-lg font-semibold mb-2">Python Script Lab</h2>
        <p className="text-sm text-muted-foreground mb-6 max-w-sm">
          Load a dataset to run pandas-style transformation scripts, aggregations, and data analyses.
        </p>
        <button onClick={() => setActiveSection?.('intake')}
          className="flex items-center gap-2 px-5 py-2.5 bg-cyan-400/10 border border-cyan-400/20 text-cyan-400 rounded-xl text-sm font-semibold hover:bg-cyan-400/15 transition-colors">
          Upload Data <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-5">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-2 mb-1">
          <Code2 className="w-4 h-4 text-blue-400" />
          <span className="text-xs font-mono text-white/40 uppercase tracking-widest">Python Script Lab</span>
        </div>
        <h1 className="text-2xl font-bold">Python / Pandas Script Executor</h1>
        <p className="text-sm text-muted-foreground">
          Write pandas-style transformations and run them against <span className="text-white/70 font-mono">{table.name}</span> ({table.rowCount?.toLocaleString()} rows).
        </p>
      </motion.div>

      {/* Dataset schema strip */}
      <div className="glass rounded-xl p-3 border border-white/8 flex items-start gap-3">
        <Database className="w-3.5 h-3.5 text-cyan-400 mt-0.5 flex-shrink-0" />
        <div className="flex flex-wrap gap-1.5">
          {table.columns?.map(c => (
            <span key={c.name} className={`text-xs px-2 py-0.5 rounded-full font-mono border ${
              c.type === 'numeric' ? 'bg-blue-400/8 text-blue-400/80 border-blue-400/20' :
              c.type === 'date' ? 'bg-teal-400/8 text-teal-400/80 border-teal-400/20' :
              c.type === 'category' ? 'bg-purple-400/8 text-purple-400/80 border-purple-400/20' :
              'bg-white/4 text-white/35 border-white/8'
            }`}>{c.name}</span>
          ))}
        </div>
      </div>

      {/* AI script generator */}
      <div className="glass-card rounded-2xl p-4 border border-purple-400/15 bg-purple-400/3">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-purple-400 mb-2 uppercase tracking-widest">
          <Sparkles className="w-3 h-3" /> AI Script Generator
        </div>
        <div className="flex gap-2">
          <input value={nlPrompt} onChange={e => setNlPrompt(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleGenerate()}
            placeholder={`e.g. "show revenue by region sorted descending" or "find all rows where value is above average"`}
            className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-purple-400/30 text-foreground" />
          <button onClick={handleGenerate} disabled={generating || !nlPrompt.trim()}
            className="flex items-center gap-1.5 px-4 py-2 bg-purple-400/15 border border-purple-400/25 text-purple-400 rounded-xl text-sm font-semibold hover:bg-purple-400/20 transition-all disabled:opacity-40">
            {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            {generating ? 'Generating…' : 'Generate'}
          </button>
        </div>
      </div>

      {/* Starter templates */}
      <div>
        <button onClick={() => setShowStarters(v => !v)}
          className="flex items-center gap-1.5 text-xs text-white/35 hover:text-white/65 transition-colors mb-2">
          {showStarters ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          Starter Scripts ({STARTER_SCRIPTS.length})
        </button>
        <AnimatePresence>
          {showStarters && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden">
              <div className="flex flex-wrap gap-2 pb-1">
                {STARTER_SCRIPTS.map(s => (
                  <button key={s.label} onClick={() => { setScript(s.code); setOutput(''); setSuccess(null); }}
                    className="px-3 py-1.5 text-xs rounded-lg border border-white/8 bg-white/3 text-white/50 hover:text-white/80 hover:border-blue-400/25 hover:bg-blue-400/5 transition-all">
                    {s.label}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Editor + output */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Script editor */}
        <div className="glass-card rounded-2xl border border-white/8 overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/8 bg-white/2">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-400" />
              <span className="text-xs font-semibold text-blue-400 uppercase tracking-widest">Script Editor</span>
            </div>
            <div className="flex items-center gap-1.5">
              <button onClick={handleCopy}
                className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg text-white/35 hover:text-white/70 border border-white/8 hover:bg-white/5 transition-all">
                {copied ? <><Check className="w-3 h-3 text-green-400" /> Copied</> : <><Copy className="w-3 h-3" /> Copy</>}
              </button>
              <button onClick={handleRun} disabled={running}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-400 rounded-lg text-xs font-bold disabled:opacity-50 hover:bg-blue-300 transition-all"
                style={{ color: 'hsl(222,47%,6%)' }}>
                {running ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
                {running ? 'Running…' : 'Run'}
              </button>
            </div>
          </div>
          <textarea
            value={script}
            onChange={e => setScript(e.target.value)}
            spellCheck={false}
            className="flex-1 p-4 text-xs font-mono bg-transparent text-green-300/90 focus:outline-none resize-none leading-relaxed min-h-72"
            style={{ caretColor: '#4ade80' }}
          />
          <div className="px-4 py-2 border-t border-white/5 text-xs text-white/20 flex items-center gap-3">
            <span>Available: <span className="font-mono text-white/35">df, table(), is_numeric(), is_category(), to_num(), infer_type()</span></span>
          </div>
        </div>

        {/* Output panel */}
        <div className="glass-card rounded-2xl border border-white/8 overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/8 bg-white/2">
            <div className="flex items-center gap-2">
              {success === true && <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />}
              {success === false && <AlertTriangle className="w-3.5 h-3.5 text-red-400" />}
              {success === null && <div className="w-2 h-2 rounded-full bg-white/20" />}
              <span className="text-xs font-semibold text-white/40 uppercase tracking-widest">Output</span>
            </div>
            {output && (
              <button onClick={downloadOutput}
                className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg text-white/35 hover:text-white/70 border border-white/8 hover:bg-white/5 transition-all">
                <Download className="w-3 h-3" /> Save
              </button>
            )}
          </div>
          <div className="flex-1 overflow-auto min-h-72">
            {!output ? (
              <div className="flex items-center justify-center h-full text-white/20 text-sm flex-col gap-2">
                <Play className="w-6 h-6 opacity-30" />
                <span>Click Run to execute your script</span>
              </div>
            ) : (
              <pre className={`p-4 text-xs font-mono leading-relaxed whitespace-pre-wrap ${success ? 'text-green-300/85' : 'text-red-400/90'}`}>
                {output}
              </pre>
            )}
          </div>
          {output && (
            <div className={`px-4 py-2 border-t text-xs flex items-center gap-1.5 ${success ? 'border-green-400/15 text-green-400/60' : 'border-red-400/15 text-red-400/60'}`}>
              {success ? <CheckCircle2 className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
              {success ? 'Script executed successfully' : 'Script returned an error'}
            </div>
          )}
        </div>
      </div>

      {/* Helper reference */}
      <div className="glass rounded-xl p-4 border border-white/5 text-xs text-white/25 space-y-1">
        <div className="font-semibold text-white/40 mb-2">Built-in Helpers</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-1 font-mono">
          <span><span className="text-blue-400">df</span> — list of row dicts (your dataset)</span>
          <span><span className="text-blue-400">df.columns</span> — list of column names</span>
          <span><span className="text-blue-400">table(rows, cols)</span> — format as ASCII table</span>
          <span><span className="text-blue-400">is_numeric(df, col)</span> — detect numeric column</span>
          <span><span className="text-blue-400">is_category(df, col)</span> — detect category column</span>
          <span><span className="text-blue-400">to_num(val)</span> — safe float conversion</span>
          <span><span className="text-blue-400">infer_type(vals)</span> — infer column type label</span>
          <span><span className="text-blue-400">return "..."</span> — print a string result</span>
        </div>
      </div>
    </div>
  );
}