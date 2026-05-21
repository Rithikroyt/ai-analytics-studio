/**
 * Senior Analyst Workbench — Full analyst workflow from raw data to business recommendation
 * SQL Editor · Python Logic · Pivot Table · Statistics · Data Validation · Chart Builder · Notes · Export
 */
import { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useWorkspaceStore } from '@/lib/store';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Code2, Brain, BarChart2, Table2, Shield, FileText, Loader2,
  Play, Save, Download, ChevronLeft, Sparkles, CheckCircle2,
  AlertTriangle, RefreshCw, Database, Layers, Settings2, BookOpen,
  TrendingUp, Target, Copy, Eye, XCircle, Wand2
} from 'lucide-react';
import SQLBlueprintBuilders from '@/components/workbench/SQLBlueprintBuilders.jsx';
import { Link } from 'react-router-dom';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const COLORS = ['#00e5ff', '#a855f7', '#4ade80', '#f59e0b', '#f87171', '#60a5fa', '#fb923c'];

const PYTHON_TEMPLATE = `import pandas as pd
import numpy as np
from sklearn.impute import SimpleImputer

def standardize_columns(df):
    df = df.copy()
    df.columns = (
        df.columns.astype(str)
        .str.strip()
        .str.lower()
        .str.replace(r"[^a-z0-9]+", "_", regex=True)
        .str.strip("_")
    )
    return df

def clean_dataset(df):
    df = standardize_columns(df)
    
    for col in df.select_dtypes(include="object").columns:
        df[col] = (df[col].astype(str).str.strip()
            .replace({"": np.nan, "nan": np.nan, "None": np.nan}))
    
    duplicates_removed = int(df.duplicated().sum())
    df = df.drop_duplicates()
    
    for col in df.columns:
        if any(t in col for t in ["date", "time", "month"]):
            df[col] = pd.to_datetime(df[col], errors="coerce")
    
    num_cols = df.select_dtypes(include=np.number).columns
    if len(num_cols) > 0:
        df[num_cols] = SimpleImputer(strategy="median").fit_transform(df[num_cols])
    
    cat_cols = df.select_dtypes(include="object").columns
    for col in cat_cols:
        mode = df[col].mode(dropna=True)
        if not mode.empty:
            df[col] = df[col].fillna(mode.iloc[0])
    
    return df, {"duplicates_removed": duplicates_removed}

# EDA
def eda_summary(df):
    return {
        "shape": df.shape,
        "dtypes": df.dtypes.to_dict(),
        "missing": df.isnull().sum().to_dict(),
        "describe": df.describe().to_dict(),
        "duplicates": df.duplicated().sum()
    }`;

const ANALYSIS_TABS = [
  { id: 'sql',        label: 'SQL Editor',       icon: Code2,    color: 'text-green-400' },
  { id: 'blueprints', label: 'SQL Blueprints',   icon: Wand2,    color: 'text-cyan-400' },
  { id: 'python',     label: 'Python EDA',       icon: Brain,    color: 'text-purple-400' },
  { id: 'pivot',      label: 'Pivot Table',      icon: Table2,   color: 'text-cyan-400' },
  { id: 'stats',      label: 'Statistics',       icon: BarChart2,color: 'text-amber-400' },
  { id: 'validation', label: 'Data Validation',  icon: Shield,   color: 'text-red-400' },
  { id: 'chart',      label: 'Chart Builder',    icon: TrendingUp,color: 'text-pink-400' },
  { id: 'notes',      label: 'Methodology Notes',icon: FileText, color: 'text-blue-400' },
];

function executeSQL(sql, rows) {
  if (!rows?.length) return { ok: false, error: 'No dataset. Upload data in the Workspace first.' };
  const lower = sql.toLowerCase().trim();
  if (['insert ', 'update ', 'delete ', 'drop ', 'alter '].some(k => lower.includes(k)))
    return { ok: false, error: 'Only SELECT queries are allowed.' };
  if (!lower.includes('select')) return { ok: false, error: 'Query must contain SELECT.' };

  try {
    if (/select\s+\*\s+from\s+\w+/i.test(sql.trim())) {
      const lim = lower.match(/limit\s+(\d+)/);
      return { ok: true, columns: Object.keys(rows[0] || {}), rows: rows.slice(0, lim ? parseInt(lim[1]) : 50) };
    }
    const selectMatch = sql.match(/SELECT\s+([\s\S]+?)\s+FROM\s+\w+/i);
    if (!selectMatch) return { ok: false, error: 'Cannot parse query. Try SELECT * FROM dataset LIMIT 20' };
    const groupByMatch = sql.match(/GROUP\s+BY\s+([\w,\s]+?)(?=\s+ORDER|\s+LIMIT|$)/i);
    const orderByMatch = sql.match(/ORDER\s+BY\s+([\w_]+)\s*(DESC|ASC)?/i);
    const limitMatch = lower.match(/limit\s+(\d+)/);
    const colExprs = selectMatch[1].split(',').map(e => e.trim());
    const parsedCols = colExprs.map(expr => {
      const agg = expr.match(/(SUM|AVG|COUNT|MIN|MAX)\((\w+|\*)\)\s*(?:AS\s+(\w+))?/i);
      if (agg) return { type: 'agg', fn: agg[1].toUpperCase(), col: agg[2], alias: agg[3] || `${agg[1].toLowerCase()}_${agg[2]}` };
      const as = expr.match(/(\w+)\s+AS\s+(\w+)/i);
      if (as) return { type: 'field', col: as[1], alias: as[2] };
      return { type: 'field', col: expr.trim(), alias: expr.trim() };
    });
    const groupByCols = groupByMatch ? groupByMatch[1].split(',').map(c => c.trim()) : [];
    let result;
    if (groupByCols.length > 0) {
      const groups = {};
      for (const row of rows) {
        const key = groupByCols.map(c => row[c] ?? '').join('|');
        if (!groups[key]) groups[key] = { _group: Object.fromEntries(groupByCols.map(c => [c, row[c]])), _rows: [] };
        groups[key]._rows.push(row);
      }
      result = Object.values(groups).map(g => {
        const out = { ...g._group };
        for (const col of parsedCols) {
          if (col.type === 'agg') {
            const vals = g._rows.map(r => parseFloat(r[col.col]) || 0).filter(v => !isNaN(v));
            if (col.fn === 'SUM') out[col.alias] = Math.round(vals.reduce((a, b) => a + b, 0) * 100) / 100;
            else if (col.fn === 'AVG') out[col.alias] = Math.round((vals.reduce((a, b) => a + b, 0) / Math.max(vals.length, 1)) * 100) / 100;
            else if (col.fn === 'COUNT') out[col.alias] = col.col === '*' ? g._rows.length : vals.length;
            else if (col.fn === 'MIN') out[col.alias] = Math.min(...vals);
            else if (col.fn === 'MAX') out[col.alias] = Math.max(...vals);
          }
        }
        return out;
      });
    } else {
      result = rows.map(row => {
        const out = {};
        for (const col of parsedCols) {
          if (col.type === 'field') out[col.alias] = row[col.col] ?? null;
        }
        return out;
      });
    }
    if (orderByMatch) {
      const oc = orderByMatch[1];
      const desc = (orderByMatch[2] || 'DESC').toUpperCase() === 'DESC';
      result.sort((a, b) => desc ? (b[oc] || 0) - (a[oc] || 0) : (a[oc] || 0) - (b[oc] || 0));
    }
    const limit = limitMatch ? parseInt(limitMatch[1]) : 100;
    result = result.slice(0, limit);
    return { ok: true, columns: result.length > 0 ? Object.keys(result[0]) : [], rows: result };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

function computeStats(rows, columns) {
  if (!rows?.length || !columns?.length) return [];
  const numCols = columns.filter(c => {
    const vals = rows.slice(0, 50).map(r => parseFloat(r[c.name || c])).filter(v => !isNaN(v));
    return vals.length > rows.slice(0, 50).length * 0.5;
  });
  return numCols.slice(0, 6).map(c => {
    const name = c.name || c;
    const vals = rows.map(r => parseFloat(r[name])).filter(v => !isNaN(v)).sort((a, b) => a - b);
    if (!vals.length) return null;
    const sum = vals.reduce((a, b) => a + b, 0);
    const mean = sum / vals.length;
    const variance = vals.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / vals.length;
    const q1 = vals[Math.floor(vals.length * 0.25)];
    const q3 = vals[Math.floor(vals.length * 0.75)];
    const iqr = q3 - q1;
    const outliers = vals.filter(v => v < q1 - 1.5 * iqr || v > q3 + 1.5 * iqr).length;
    return {
      name, count: vals.length, sum: Math.round(sum * 100) / 100,
      mean: Math.round(mean * 100) / 100, median: vals[Math.floor(vals.length / 2)],
      min: vals[0], max: vals[vals.length - 1],
      stdDev: Math.round(Math.sqrt(variance) * 100) / 100,
      q1: Math.round(q1 * 100) / 100, q3: Math.round(q3 * 100) / 100,
      outliers, missing: rows.length - vals.length,
    };
  }).filter(Boolean);
}

function buildPivot(rows, rowField, colField, valueField) {
  if (!rows?.length || !rowField || !valueField) return null;
  const rowKeys = [...new Set(rows.map(r => String(r[rowField] ?? 'N/A')))].slice(0, 20);
  const colKeys = colField ? [...new Set(rows.map(r => String(r[colField] ?? 'N/A')))].slice(0, 10) : ['Total'];
  const matrix = {};
  for (const rk of rowKeys) {
    matrix[rk] = {};
    for (const ck of colKeys) {
      const filtered = colField ? rows.filter(r => String(r[rowField]) === rk && String(r[colField]) === ck)
        : rows.filter(r => String(r[rowField]) === rk);
      const vals = filtered.map(r => parseFloat(r[valueField])).filter(v => !isNaN(v));
      matrix[rk][ck] = vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) * 100) / 100 : 0;
    }
  }
  return { rowKeys, colKeys, matrix };
}

export default function SeniorAnalystWorkbench() {
  const { getActiveTable } = useWorkspaceStore();
  const activeTable = getActiveTable();
  const rows = activeTable?.rows || [];
  const columns = activeTable?.columns || [];

  const [tab, setTab] = useState('sql');
  const [sql, setSql] = useState('SELECT *\nFROM dataset\nLIMIT 20;');
  const [sqlResult, setSqlResult] = useState(null);
  const [running, setRunning] = useState(false);
  const [nlQuery, setNlQuery] = useState('');
  const [generating, setGenerating] = useState(false);
  const [sqlExplanation, setSqlExplanation] = useState(null);
  const [explaining, setExplaining] = useState(false);

  // Pivot state
  const [pivotRow, setPivotRow] = useState('');
  const [pivotCol, setPivotCol] = useState('');
  const [pivotVal, setPivotVal] = useState('');
  const [pivotData, setPivotData] = useState(null);

  // Chart state
  const [chartType, setChartType] = useState('bar');
  const [chartX, setChartX] = useState('');
  const [chartY, setChartY] = useState('');
  const [chartTitle, setChartTitle] = useState('');
  const [chartInsight, setChartInsight] = useState('');
  const [gettingInsight, setGettingInsight] = useState(false);

  // Notes state
  const [notes, setNotes] = useState({
    dataset: '', columns: '', filters: '', sqlQuery: '', pythonLogic: '',
    metricDefs: '', assumptions: '', limitations: '', recommendation: ''
  });
  const [savedNotes, setSavedNotes] = useState(false);

  // Validation
  const [validationResults, setValidationResults] = useState(null);
  const [validating, setValidating] = useState(false);

  // Pre-flight data check
  const [preflight, setPreflight] = useState(null);

  const runPreflight = () => {
    if (!rows.length) return;
    const issues = [];
    let totalMissing = 0;
    let totalOutliers = 0;
    for (const name of colNames) {
      const vals = rows.map(r => r[name]);
      const missing = vals.filter(v => v == null || v === '' || v === 'null' || v === 'NaN').length;
      if (missing > 0) totalMissing += missing;
      if (missing / rows.length > 0.1) issues.push({ type: 'missing', col: name, msg: `${Math.round(missing / rows.length * 100)}% missing` });
      const numVals = vals.map(v => parseFloat(v)).filter(v => !isNaN(v));
      if (numVals.length > 5) {
        const sorted = [...numVals].sort((a, b) => a - b);
        const q1 = sorted[Math.floor(sorted.length * 0.25)];
        const q3 = sorted[Math.floor(sorted.length * 0.75)];
        const iqr = q3 - q1;
        const outliers = numVals.filter(v => v < q1 - 1.5 * iqr || v > q3 + 1.5 * iqr).length;
        if (outliers > 0) { totalOutliers += outliers; issues.push({ type: 'outlier', col: name, msg: `${outliers} outliers (IQR)` }); }
      }
    }
    const dupCount = rows.length - new Set(rows.map(r => JSON.stringify(r))).size;
    if (dupCount > 0) issues.push({ type: 'duplicate', col: 'ALL', msg: `${dupCount} duplicate rows` });
    setPreflight({ issues, totalMissing, totalOutliers, dupCount, clean: issues.length === 0 });
  };

  const colNames = columns.map(c => c.name || c);

  const runQuery = () => {
    setRunning(true);
    setSqlResult(null);
    setTimeout(() => {
      setSqlResult(executeSQL(sql, rows));
      setRunning(false);
    }, 250);
  };

  const generateSQL = async () => {
    if (!nlQuery.trim()) return;
    runPreflight();
    setGenerating(true);
    try {
      const res = await base44.functions.invoke('generateSQL', {
        question: nlQuery, tableName: activeTable?.name || 'dataset', columns,
      });
      if (res.data?.sql) setSql(res.data.sql);
      if (res.data?.explanation) setSqlExplanation(res.data.explanation);
    } catch (e) {}
    setGenerating(false);
  };

  const explainResult = async () => {
    if (!sqlResult?.ok) return;
    setExplaining(true);
    try {
      const res = await base44.functions.invoke('explainChart', {
        title: chartTitle || 'SQL Result', type: 'table',
        data: sqlResult.rows.slice(0, 20), tableName: activeTable?.name,
      });
      setSqlExplanation(typeof res.data === 'string' ? res.data : res.data?.explanation || JSON.stringify(res.data));
    } catch (e) {}
    setExplaining(false);
  };

  const runValidation = () => {
    setValidating(true);
    setTimeout(() => {
      if (!rows.length) { setValidationResults({ error: 'No data loaded' }); setValidating(false); return; }
      const issues = [];
      const colStats = colNames.map(name => {
        const vals = rows.map(r => r[name]);
        const missing = vals.filter(v => v == null || v === '' || v === 'null' || v === 'NaN').length;
        const unique = new Set(vals.map(String)).size;
        const missingRate = Math.round((missing / rows.length) * 100);
        if (missingRate > 20) issues.push({ col: name, type: 'warning', msg: `${missingRate}% missing values` });
        if (unique === 1) issues.push({ col: name, type: 'info', msg: 'Only 1 unique value — may be constant' });
        return { name, missing, missingRate, unique, total: rows.length };
      });
      const dupCount = rows.length - new Set(rows.map(r => JSON.stringify(r))).size;
      const completeness = Math.round((1 - colStats.reduce((s, c) => s + c.missing, 0) / (rows.length * colNames.length)) * 100);
      setValidationResults({ colStats, issues, dupCount, completeness, rows: rows.length, cols: colNames.length });
      setValidating(false);
    }, 400);
  };

  const getChartInsight = async () => {
    if (!chartX || !chartY || !rows.length) return;
    runPreflight();
    setGettingInsight(true);
    try {
      const chartRows = rows.slice(0, 30).map(r => ({ [chartX]: r[chartX], [chartY]: r[chartY] }));
      const res = await base44.functions.invoke('explainChart', {
        title: chartTitle || `${chartY} by ${chartX}`, type: chartType, data: chartRows,
        tableName: activeTable?.name,
      });
      setChartInsight(typeof res.data === 'string' ? res.data : res.data?.topInsight || res.data?.explanation || '');
    } catch (e) {}
    setGettingInsight(false);
  };

  const buildPivotTable = () => {
    if (!pivotRow || !pivotVal) return;
    setPivotData(buildPivot(rows, pivotRow, pivotCol, pivotVal));
  };

  const saveNotes = () => {
    setSavedNotes(true);
    setTimeout(() => setSavedNotes(false), 2000);
  };

  const exportAnalysis = () => {
    const content = `# Senior Analyst Workbench Export
Dataset: ${activeTable?.name || 'N/A'}
Rows: ${rows.length} | Columns: ${colNames.length}

## SQL Query
\`\`\`sql
${sql}
\`\`\`

## Python Logic
\`\`\`python
${PYTHON_TEMPLATE}
\`\`\`

## Methodology Notes
Dataset Used: ${notes.dataset || activeTable?.name || 'N/A'}
Columns Selected: ${notes.columns || colNames.join(', ')}
Filters Applied: ${notes.filters || 'None'}
Metric Definitions: ${notes.metricDefs || 'Standard aggregations'}
Assumptions: ${notes.assumptions || 'None specified'}
Limitations: ${notes.limitations || 'None specified'}
Business Recommendation: ${notes.recommendation || 'Pending analysis'}

Generated: ${new Date().toISOString()}`;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([content], { type: 'text/markdown' }));
    a.download = `analyst_workbench_${Date.now()}.md`;
    a.click();
  };

  const stats = computeStats(rows, columns);
  const chartData = rows.slice(0, 25).map(r => ({ [chartX]: r[chartX], [chartY]: parseFloat(r[chartY]) || 0 })).filter(r => r[chartX] != null);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-white/8 px-8 py-5">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <Link to="/" className="p-1.5 rounded-lg text-white/30 hover:text-white/60 hover:bg-white/5 transition-all">
              <ChevronLeft className="w-4 h-4" />
            </Link>
            <div className="w-10 h-10 rounded-xl bg-cyan-400/15 border border-cyan-400/25 flex items-center justify-center">
              <Layers className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h1 className="text-xl font-black">Senior Analyst Workbench</h1>
              <p className="text-xs text-muted-foreground">SQL · Python EDA · Pivot · Statistics · Validation · Charts · Methodology</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {activeTable ? (
              <div className="px-3 py-1.5 rounded-xl bg-green-400/8 border border-green-400/15 text-xs text-green-400 font-mono">
                {activeTable.name} · {rows.length.toLocaleString()} rows · {colNames.length} cols
              </div>
            ) : (
              <div className="px-3 py-1.5 rounded-xl bg-amber-400/8 border border-amber-400/15 text-xs text-amber-400">
                ⚠ No dataset — upload data in Workspace first
              </div>
            )}
            <button onClick={exportAnalysis}
              className="flex items-center gap-1.5 px-3 py-2 bg-cyan-400/15 border border-cyan-400/25 text-cyan-400 rounded-xl text-xs font-semibold hover:bg-cyan-400/20 transition-all">
              <Download className="w-3.5 h-3.5" /> Export Analysis
            </button>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-white/8 px-8">
        <div className="flex gap-0">
          {ANALYSIS_TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-3 text-xs font-semibold border-b-2 transition-all ${
                tab === t.id ? `border-cyan-400 ${t.color}` : 'border-transparent text-white/35 hover:text-white/60'
              }`}>
              <t.icon className="w-3.5 h-3.5" />{t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Pre-flight data quality banner */}
      {rows.length > 0 && (
        <div className="px-8 py-2 border-b border-white/5">
          {!preflight ? (
            <button onClick={runPreflight}
              className="flex items-center gap-1.5 text-xs text-white/30 hover:text-amber-400 transition-all py-1">
              <Shield className="w-3.5 h-3.5" /> Run data pre-flight check before AI analysis
            </button>
          ) : preflight.clean ? (
            <div className="flex items-center gap-2 text-xs text-green-400 py-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Pre-flight passed — data looks clean. No outliers or missing value issues found.
            </div>
          ) : (
            <div className="flex items-center gap-3 flex-wrap py-1">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
              <span className="text-xs text-amber-400 font-semibold">Pre-flight issues detected:</span>
              {preflight.issues.slice(0, 4).map((issue, i) => (
                <span key={i} className={`text-xs px-2 py-0.5 rounded-full border font-mono ${
                  issue.type === 'outlier' ? 'bg-red-400/10 border-red-400/20 text-red-400' :
                  issue.type === 'duplicate' ? 'bg-purple-400/10 border-purple-400/20 text-purple-400' :
                  'bg-amber-400/10 border-amber-400/20 text-amber-400'
                }`}>
                  {issue.col}: {issue.msg}
                </span>
              ))}
              {preflight.issues.length > 4 && <span className="text-xs text-white/30">+{preflight.issues.length - 4} more</span>}
              <button onClick={() => setPreflight(null)} className="ml-auto text-xs text-white/20 hover:text-white/50 transition-all">✕ Dismiss</button>
            </div>
          )}
        </div>
      )}

      <div className="p-6">
        {/* SQL Editor */}
        {tab === 'sql' && (
          <div className="grid grid-cols-2 gap-6 h-[calc(100vh-220px)]">
            <div className="flex flex-col gap-3">
              {/* NL to SQL */}
              <div className="flex gap-2">
                <input value={nlQuery} onChange={e => setNlQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && generateSQL()}
                  placeholder="Natural language: 'Show top 10 by revenue…'"
                  className="flex-1 px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none" />
                <button onClick={generateSQL} disabled={generating || !nlQuery.trim()}
                  className="flex items-center gap-1.5 px-3 py-2.5 bg-purple-400/15 border border-purple-400/25 text-purple-400 rounded-xl text-sm font-semibold disabled:opacity-40 hover:bg-purple-400/20 transition-all">
                  {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  Generate SQL
                </button>
              </div>
              {/* SQL Editor */}
              <div className="flex-1 flex flex-col border border-white/8 rounded-2xl overflow-hidden">
                <div className="px-4 py-2 border-b border-white/5 flex items-center justify-between">
                  <span className="text-xs text-white/25 font-mono">SQL Editor — SELECT only</span>
                  <button onClick={() => navigator.clipboard.writeText(sql)} className="text-white/25 hover:text-cyan-400 transition-all">
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
                <textarea value={sql} onChange={e => setSql(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) runQuery(); }}
                  className="flex-1 bg-black/20 text-green-400/85 font-mono text-sm px-4 py-3 resize-none focus:outline-none"
                  spellCheck={false} />
                <div className="px-4 py-3 border-t border-white/5 flex items-center gap-2">
                  <button onClick={runQuery} disabled={running || !sql.trim()}
                    className="flex items-center gap-2 px-4 py-2 bg-green-400/15 border border-green-400/25 text-green-400 rounded-xl text-sm font-semibold hover:bg-green-400/20 transition-all disabled:opacity-40">
                    {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                    Run (⌘↵)
                  </button>
                  {sqlResult?.ok && (
                    <button onClick={explainResult} disabled={explaining}
                      className="flex items-center gap-1.5 px-3 py-2 bg-purple-400/10 border border-purple-400/20 text-purple-400 rounded-xl text-xs font-semibold disabled:opacity-40 transition-all">
                      {explaining ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Brain className="w-3.5 h-3.5" />}
                      Explain
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Results */}
            <div className="overflow-auto space-y-4">
              {running && <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 text-green-400 animate-spin" /></div>}
              {sqlResult?.ok ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs text-green-400">
                    <CheckCircle2 className="w-3.5 h-3.5" /> {sqlResult.rows.length} rows returned
                  </div>
                  {sqlExplanation && (
                    <div className="p-4 rounded-xl bg-purple-400/5 border border-purple-400/15 text-xs">
                      <div className="text-purple-400 font-bold mb-1">AI Interpretation</div>
                      <p className="text-white/60 leading-relaxed">{typeof sqlExplanation === 'string' ? sqlExplanation : JSON.stringify(sqlExplanation)}</p>
                    </div>
                  )}
                  <div className="rounded-xl border border-white/8 overflow-auto max-h-96">
                    <table className="w-full text-xs min-w-max">
                      <thead>
                        <tr className="border-b border-white/8 bg-white/3">
                          {sqlResult.columns.map(c => (
                            <th key={c} className="text-left px-3 py-2 text-white/40 font-mono whitespace-nowrap">{c}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {sqlResult.rows.map((row, i) => (
                          <tr key={i} className="border-b border-white/5 hover:bg-white/2">
                            {sqlResult.columns.map(c => (
                              <td key={c} className="px-3 py-2 text-white/55 font-mono whitespace-nowrap">
                                {typeof row[c] === 'number' ? row[c].toLocaleString(undefined, { maximumFractionDigits: 2 }) : String(row[c] ?? '—')}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : sqlResult?.error ? (
                <div className="flex items-start gap-2 p-4 rounded-xl bg-red-400/8 border border-red-400/20 text-sm text-red-400">
                  <XCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <div><div className="font-semibold">Query Error</div><div className="text-xs mt-1 text-red-400/70">{sqlResult.error}</div></div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-48 text-white/20 text-sm">Run a query to see results</div>
              )}
            </div>
          </div>
        )}

        {/* SQL Blueprints */}
        {tab === 'blueprints' && (
          <div>
            <div className="mb-4 p-3 rounded-xl bg-cyan-400/5 border border-cyan-400/15 text-xs text-white/50 leading-relaxed">
              <strong className="text-cyan-400">SQL Blueprint Builders</strong> — Configure fields and instantly generate validated SQL for advanced patterns: CTEs, window functions, running totals, pivot queries, date trends, and more.
            </div>
            <SQLBlueprintBuilders
              colNames={colNames}
              onRunSQL={(generatedSql) => { setSql(generatedSql); setTab('sql'); }}
            />
          </div>
        )}

        {/* Python EDA */}
        {tab === 'python' && (
          <div className="grid grid-cols-2 gap-6">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Brain className="w-4 h-4 text-purple-400" />
                <span className="text-sm font-bold text-purple-400">Python/Pandas Cleaning Logic</span>
              </div>
              <pre className="bg-black/30 border border-white/8 rounded-2xl p-4 text-xs text-green-400/80 font-mono overflow-auto max-h-[70vh] whitespace-pre-wrap">{PYTHON_TEMPLATE}</pre>
            </div>
            <div className="space-y-4">
              <div className="text-sm font-bold text-white/60 mb-3">df.info() Equivalent — Column Overview</div>
              {!rows.length ? (
                <div className="p-4 rounded-xl bg-amber-400/5 border border-amber-400/15 text-xs text-amber-400">Load a dataset first</div>
              ) : (
                <div className="space-y-2">
                  <div className="grid grid-cols-4 gap-2 mb-4">
                    {[
                      { label: 'Total Rows', value: rows.length.toLocaleString(), color: 'text-cyan-400' },
                      { label: 'Total Columns', value: colNames.length, color: 'text-purple-400' },
                      { label: 'Numeric Cols', value: stats.length, color: 'text-green-400' },
                      { label: 'Memory (est.)', value: `${Math.round(rows.length * colNames.length * 8 / 1024)}KB`, color: 'text-amber-400' },
                    ].map(s => (
                      <div key={s.label} className="p-3 rounded-xl bg-white/3 border border-white/8 text-center">
                        <div className={`text-lg font-black ${s.color}`}>{s.value}</div>
                        <div className="text-xs text-white/30">{s.label}</div>
                      </div>
                    ))}
                  </div>
                  <div className="rounded-xl border border-white/8 overflow-auto max-h-72">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-white/8 bg-white/3">
                          {['Column', 'Sample Values', 'Missing', 'Unique'].map(h => (
                            <th key={h} className="text-left px-3 py-2 text-white/30 font-mono">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {colNames.map(name => {
                          const vals = rows.map(r => r[name]).filter(v => v != null && v !== '');
                          const missing = rows.length - vals.length;
                          const unique = new Set(vals.map(String)).size;
                          const samples = [...new Set(vals.map(String))].slice(0, 3).join(', ');
                          return (
                            <tr key={name} className="border-b border-white/5 hover:bg-white/2">
                              <td className="px-3 py-2 font-mono text-cyan-400/80">{name}</td>
                              <td className="px-3 py-2 text-white/40 truncate max-w-32">{samples || '—'}</td>
                              <td className={`px-3 py-2 font-mono ${missing > 0 ? 'text-amber-400' : 'text-green-400'}`}>{missing}</td>
                              <td className="px-3 py-2 font-mono text-white/50">{unique}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Pivot Table */}
        {tab === 'pivot' && (
          <div className="space-y-5">
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: 'Row Field', state: pivotRow, set: setPivotRow },
                { label: 'Column Field (optional)', state: pivotCol, set: setPivotCol },
                { label: 'Value Field (numeric)', state: pivotVal, set: setPivotVal },
              ].map(f => (
                <div key={f.label}>
                  <label className="text-xs text-white/35 mb-1 block">{f.label}</label>
                  <select value={f.state} onChange={e => f.set(e.target.value)}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none">
                    <option value="">— Select —</option>
                    {colNames.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              ))}
              <div className="flex items-end">
                <button onClick={buildPivotTable} disabled={!pivotRow || !pivotVal}
                  className="w-full py-2 bg-cyan-400/15 border border-cyan-400/25 text-cyan-400 rounded-xl text-sm font-semibold hover:bg-cyan-400/20 transition-all disabled:opacity-40">
                  Build Pivot
                </button>
              </div>
            </div>
            {pivotData && (
              <div className="rounded-xl border border-white/8 overflow-auto">
                <table className="w-full text-xs min-w-max">
                  <thead>
                    <tr className="border-b border-white/8 bg-white/3">
                      <th className="text-left px-3 py-2 text-white/40 font-mono">{pivotRow}</th>
                      {pivotData.colKeys.map(ck => (
                        <th key={ck} className="text-right px-3 py-2 text-white/40 font-mono">{ck}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {pivotData.rowKeys.map(rk => (
                      <tr key={rk} className="border-b border-white/5 hover:bg-white/2">
                        <td className="px-3 py-2 text-white/60 font-semibold">{rk}</td>
                        {pivotData.colKeys.map(ck => (
                          <td key={ck} className="px-3 py-2 text-right font-mono text-cyan-400/80">
                            {(pivotData.matrix[rk][ck] || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {!pivotData && <div className="text-center py-12 text-white/25 text-sm">Select fields above to build a pivot table</div>}
          </div>
        )}

        {/* Statistics */}
        {tab === 'stats' && (
          <div className="space-y-4">
            {!rows.length ? (
              <div className="text-center py-12 text-white/25 text-sm">Load a dataset to view statistics</div>
            ) : stats.length === 0 ? (
              <div className="p-4 rounded-xl bg-amber-400/5 border border-amber-400/15 text-xs text-amber-400">No numeric columns found in the current dataset</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {stats.map(s => (
                  <div key={s.name} className="p-4 rounded-2xl border border-white/8 bg-white/2">
                    <div className="flex items-center gap-2 mb-3">
                      <BarChart2 className="w-4 h-4 text-amber-400" />
                      <span className="font-bold text-sm text-white/85">{s.name}</span>
                      {s.outliers > 0 && (
                        <span className="text-xs px-1.5 py-0.5 bg-red-400/10 border border-red-400/20 text-red-400 rounded">
                          {s.outliers} outliers
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-4 gap-2 text-xs">
                      {[
                        ['Count', s.count], ['Sum', s.sum?.toLocaleString()],
                        ['Mean', s.mean], ['Median', s.median],
                        ['Min', s.min], ['Max', s.max],
                        ['Std Dev', s.stdDev], ['Missing', s.missing],
                        ['Q1', s.q1], ['Q3', s.q3],
                      ].map(([label, val]) => (
                        <div key={label} className="text-center p-2 rounded-lg bg-white/3">
                          <div className="text-white/30 mb-0.5">{label}</div>
                          <div className="font-mono font-bold text-white/75">{val ?? '—'}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Data Validation */}
        {tab === 'validation' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-bold text-white/60">Data Quality Validation Report</div>
              <button onClick={runValidation} disabled={validating || !rows.length}
                className="flex items-center gap-1.5 px-4 py-2 bg-red-400/10 border border-red-400/20 text-red-400 rounded-xl text-sm font-semibold hover:bg-red-400/15 transition-all disabled:opacity-40">
                {validating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
                Run Validation
              </button>
            </div>
            {validationResults?.error && (
              <div className="p-4 rounded-xl bg-red-400/8 border border-red-400/20 text-sm text-red-400">{validationResults.error}</div>
            )}
            {validationResults?.colStats && (
              <div className="space-y-4">
                <div className="grid grid-cols-4 gap-3">
                  {[
                    { label: 'Completeness', value: `${validationResults.completeness}%`, color: validationResults.completeness >= 90 ? 'text-green-400' : 'text-amber-400' },
                    { label: 'Total Rows', value: validationResults.rows.toLocaleString(), color: 'text-cyan-400' },
                    { label: 'Duplicates', value: validationResults.dupCount, color: validationResults.dupCount > 0 ? 'text-red-400' : 'text-green-400' },
                    { label: 'Issues Found', value: validationResults.issues.length, color: validationResults.issues.length > 0 ? 'text-amber-400' : 'text-green-400' },
                  ].map(s => (
                    <div key={s.label} className="p-3 rounded-xl bg-white/3 border border-white/8 text-center">
                      <div className={`text-xl font-black ${s.color}`}>{s.value}</div>
                      <div className="text-xs text-white/30">{s.label}</div>
                    </div>
                  ))}
                </div>
                {validationResults.issues.length > 0 && (
                  <div className="space-y-1">
                    {validationResults.issues.map((issue, i) => (
                      <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-400/5 border border-amber-400/15 text-xs text-amber-400">
                        <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                        <span className="font-mono text-amber-300">{issue.col}</span>: {issue.msg}
                      </div>
                    ))}
                  </div>
                )}
                <div className="rounded-xl border border-white/8 overflow-auto max-h-72">
                  <table className="w-full text-xs min-w-max">
                    <thead>
                      <tr className="border-b border-white/8 bg-white/3">
                        {['Column', 'Total', 'Missing', 'Missing %', 'Unique'].map(h => (
                          <th key={h} className="text-left px-3 py-2 text-white/30 font-mono">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {validationResults.colStats.map(c => (
                        <tr key={c.name} className="border-b border-white/5 hover:bg-white/2">
                          <td className="px-3 py-2 font-mono text-cyan-400/80">{c.name}</td>
                          <td className="px-3 py-2 font-mono text-white/50">{c.total}</td>
                          <td className={`px-3 py-2 font-mono ${c.missing > 0 ? 'text-amber-400' : 'text-green-400'}`}>{c.missing}</td>
                          <td className={`px-3 py-2 font-mono ${c.missingRate > 20 ? 'text-red-400' : c.missingRate > 5 ? 'text-amber-400' : 'text-green-400'}`}>{c.missingRate}%</td>
                          <td className="px-3 py-2 font-mono text-white/50">{c.unique}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Chart Builder */}
        {tab === 'chart' && (
          <div className="space-y-5">
            <div className="grid grid-cols-4 gap-3">
              <div>
                <label className="text-xs text-white/35 mb-1 block">Chart Type</label>
                <select value={chartType} onChange={e => setChartType(e.target.value)}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none">
                  <option value="bar">Bar Chart</option>
                  <option value="line">Line Chart</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-white/35 mb-1 block">X-Axis (Category)</label>
                <select value={chartX} onChange={e => setChartX(e.target.value)}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none">
                  <option value="">— Select —</option>
                  {colNames.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-white/35 mb-1 block">Y-Axis (Metric)</label>
                <select value={chartY} onChange={e => setChartY(e.target.value)}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none">
                  <option value="">— Select —</option>
                  {colNames.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-white/35 mb-1 block">Chart Title</label>
                <input value={chartTitle} onChange={e => setChartTitle(e.target.value)} placeholder="e.g. Revenue by Region"
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none" />
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={getChartInsight} disabled={gettingInsight || !chartX || !chartY}
                className="flex items-center gap-1.5 px-3 py-2 bg-purple-400/10 border border-purple-400/20 text-purple-400 rounded-xl text-xs font-semibold disabled:opacity-40 hover:bg-purple-400/15 transition-all">
                {gettingInsight ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                Get AI Insight
              </button>
            </div>
            {chartInsight && (
              <div className="p-4 rounded-xl bg-purple-400/5 border border-purple-400/15 text-xs text-white/60">
                <span className="text-purple-400 font-bold">Business Insight: </span>
                {typeof chartInsight === 'string' ? chartInsight : JSON.stringify(chartInsight)}
              </div>
            )}
            {chartX && chartY && chartData.length > 0 ? (
              <div className="rounded-2xl border border-white/8 bg-white/2 p-5" style={{ height: 320 }}>
                {chartTitle && <div className="text-sm font-bold text-white/60 mb-3">{chartTitle}</div>}
                <ResponsiveContainer width="100%" height="100%">
                  {chartType === 'bar' ? (
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                      <XAxis dataKey={chartX} tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 9 }} />
                      <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 9 }} />
                      <Tooltip contentStyle={{ background: 'hsl(222,44%,9%)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10 }} />
                      <Bar dataKey={chartY} radius={[4, 4, 0, 0]}>
                        {chartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Bar>
                    </BarChart>
                  ) : (
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                      <XAxis dataKey={chartX} tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 9 }} />
                      <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 9 }} />
                      <Tooltip contentStyle={{ background: 'hsl(222,44%,9%)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10 }} />
                      <Line type="monotone" dataKey={chartY} stroke="#00e5ff" strokeWidth={2} dot={false} />
                    </LineChart>
                  )}
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="rounded-2xl border border-white/8 bg-white/2 p-12 text-center text-white/25 text-sm">Select X and Y fields to build a chart</div>
            )}
          </div>
        )}

        {/* Methodology Notes */}
        {tab === 'notes' && (
          <div className="max-w-3xl space-y-4">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-bold text-white/60">Analysis Methodology & Documentation</div>
              <button onClick={saveNotes}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${savedNotes ? 'bg-green-400/15 border border-green-400/25 text-green-400' : 'bg-cyan-400/15 border border-cyan-400/25 text-cyan-400 hover:bg-cyan-400/20'}`}>
                {savedNotes ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
                {savedNotes ? 'Saved!' : 'Save Notes'}
              </button>
            </div>
            {[
              { key: 'dataset', label: 'Dataset Used', placeholder: `e.g. ${activeTable?.name || 'sales_data_2024.csv'}` },
              { key: 'columns', label: 'Columns Selected', placeholder: `e.g. ${colNames.slice(0, 4).join(', ') || 'revenue, segment, date'}` },
              { key: 'filters', label: 'Filters Applied', placeholder: 'e.g. date >= 2024-01-01, region = North' },
              { key: 'metricDefs', label: 'Metric Definitions', placeholder: 'e.g. Revenue = SUM(revenue), AOV = SUM(revenue)/COUNT(order_id)' },
              { key: 'assumptions', label: 'Assumptions', placeholder: 'e.g. Revenue is inclusive of all channels. Nulls treated as zero.' },
              { key: 'limitations', label: 'Limitations', placeholder: 'e.g. No cost data available. Cannot compute margin.' },
              { key: 'recommendation', label: 'Business Recommendation', placeholder: 'e.g. Focus on Enterprise segment which drives 72% of revenue...' },
            ].map(f => (
              <div key={f.key}>
                <label className="text-xs text-white/35 mb-1 block font-semibold">{f.label}</label>
                <textarea value={notes[f.key]} onChange={e => setNotes(n => ({ ...n, [f.key]: e.target.value }))}
                  placeholder={f.placeholder} rows={2}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none resize-none text-white/70" />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}