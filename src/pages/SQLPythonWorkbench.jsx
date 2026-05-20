/**
 * SQLPythonWorkbench — Phase 4: SQL + Python Analytics Workbench
 * DuckDB-style SQL editor, NL-to-SQL, validation, templates, saved queries, chart from result
 */
import { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useWorkspaceStore } from '@/lib/store';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Code2, Play, Loader2, CheckCircle2, XCircle, AlertTriangle, BookOpen,
  Save, Trash2, ChevronDown, ChevronRight, Sparkles, Download, BarChart2, Shield, Clock
} from 'lucide-react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';

const COLORS = ['#00e5ff', '#a855f7', '#4ade80', '#f59e0b', '#f87171', '#60a5fa', '#fb923c', '#e879f9'];

const SQL_TEMPLATES = [
  { name: 'Top 10 by Revenue', sql: 'SELECT category, SUM(revenue) AS total_revenue\nFROM dataset\nGROUP BY category\nORDER BY total_revenue DESC\nLIMIT 10;' },
  { name: 'Monthly Revenue Trend', sql: "SELECT DATE_TRUNC('month', order_date) AS month, SUM(revenue) AS monthly_revenue\nFROM dataset\nGROUP BY 1\nORDER BY 1;" },
  { name: 'Revenue by Region', sql: 'SELECT region, SUM(revenue) AS total_revenue, COUNT(*) AS orders\nFROM dataset\nGROUP BY region\nORDER BY total_revenue DESC;' },
  { name: 'Average Order Value', sql: 'SELECT category, AVG(revenue) AS avg_order_value, COUNT(*) AS orders\nFROM dataset\nGROUP BY category\nORDER BY avg_order_value DESC;' },
  { name: 'Segment Comparison', sql: 'SELECT segment, SUM(revenue) AS total, AVG(revenue) AS avg, COUNT(*) AS count\nFROM dataset\nGROUP BY segment\nORDER BY total DESC;' },
  { name: 'Null Audit', sql: "SELECT column_name, null_count, total_rows, ROUND(100.0 * null_count / total_rows, 2) AS null_pct\nFROM (\n  SELECT 'revenue' AS column_name, COUNT(*) - COUNT(revenue) AS null_count, COUNT(*) AS total_rows FROM dataset\n) t;" },
  { name: 'Duplicate Check', sql: 'SELECT customer_id, COUNT(*) AS occurrences\nFROM dataset\nGROUP BY customer_id\nHAVING COUNT(*) > 1\nORDER BY occurrences DESC\nLIMIT 20;' },
  { name: 'Period-over-Period', sql: "WITH periods AS (\n  SELECT DATE_TRUNC('month', order_date) AS period, SUM(revenue) AS total\n  FROM dataset GROUP BY 1\n)\nSELECT period, total,\n  LAG(total) OVER (ORDER BY period) AS prev_period,\n  ROUND(100.0 * (total - LAG(total) OVER (ORDER BY period)) / NULLIF(LAG(total) OVER (ORDER BY period), 0), 2) AS pct_change\nFROM periods ORDER BY period;" },
  { name: 'Contribution Analysis', sql: "SELECT segment,\n  SUM(revenue) AS segment_total,\n  ROUND(100.0 * SUM(revenue) / SUM(SUM(revenue)) OVER (), 2) AS contribution_pct\nFROM dataset\nGROUP BY segment\nORDER BY segment_total DESC;" },
  { name: 'Anomaly Z-Score', sql: "WITH stats AS (SELECT AVG(revenue) AS mean_val, STDDEV(revenue) AS std_val FROM dataset)\nSELECT customer_id, revenue,\n  ROUND((revenue - s.mean_val) / NULLIF(s.std_val, 0), 2) AS z_score\nFROM dataset, stats s\nWHERE ABS((revenue - s.mean_val) / NULLIF(s.std_val, 0)) > 2\nORDER BY ABS((revenue - s.mean_val) / NULLIF(s.std_val, 0)) DESC LIMIT 20;" },
  { name: 'RFM Summary', sql: "SELECT customer_id,\n  MAX(order_date) AS last_purchase,\n  COUNT(*) AS frequency,\n  SUM(revenue) AS monetary\nFROM dataset\nGROUP BY customer_id\nORDER BY monetary DESC\nLIMIT 50;" },
  { name: 'Distribution Percentiles', sql: "SELECT\n  PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY revenue) AS q1,\n  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY revenue) AS median,\n  PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY revenue) AS q3,\n  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY revenue) AS p95,\n  AVG(revenue) AS mean, STDDEV(revenue) AS std_dev\nFROM dataset;" },
  { name: 'Cohort Retention', sql: "WITH first_purchase AS (\n  SELECT customer_id, DATE_TRUNC('month', MIN(order_date)) AS cohort_month FROM dataset GROUP BY 1\n)\nSELECT f.cohort_month, DATE_TRUNC('month', d.order_date) AS order_month,\n  COUNT(DISTINCT d.customer_id) AS customers\nFROM dataset d\nJOIN first_purchase f ON d.customer_id = f.customer_id\nGROUP BY 1, 2 ORDER BY 1, 2;" },
  { name: 'Campaign ROI', sql: "SELECT campaign, SUM(revenue) AS revenue, SUM(cost) AS cost,\n  ROUND((SUM(revenue) - SUM(cost)) / NULLIF(SUM(cost), 0) * 100, 2) AS roi_pct\nFROM dataset\nGROUP BY campaign\nORDER BY roi_pct DESC;" },
  { name: 'Operational SLA', sql: "SELECT department,\n  AVG(cycle_time_days) AS avg_cycle_time,\n  MAX(cycle_time_days) AS max_cycle_time,\n  COUNT(CASE WHEN cycle_time_days > 5 THEN 1 END) AS sla_breaches,\n  COUNT(*) AS total\nFROM dataset\nGROUP BY department\nORDER BY sla_breaches DESC;" },
];

// Simple in-browser SQL execution
function executeSQL(sql, rows, tableName = 'dataset') {
  if (!rows?.length) return { ok: false, error: 'No dataset loaded. Upload data first.' };

  const lower = sql.toLowerCase().trim();
  const forbidden = ['insert ', 'update ', 'delete ', 'drop ', 'alter ', 'create ', 'truncate '];
  if (forbidden.some(k => lower.includes(k))) return { ok: false, error: 'Only SELECT queries are allowed.' };
  if (!lower.includes('select')) return { ok: false, error: 'Query must start with SELECT.' };

  try {
    // Basic SELECT * with LIMIT
    if (/select\s+\*\s+from\s+\w+(\s+limit\s+\d+)?/i.test(sql.trim())) {
      const limitMatch = lower.match(/limit\s+(\d+)/);
      const limit = limitMatch ? parseInt(limitMatch[1]) : 50;
      return { ok: true, columns: Object.keys(rows[0] || {}), rows: rows.slice(0, limit) };
    }

    // Parse SELECT ... FROM ... GROUP BY ... ORDER BY ... LIMIT
    const selectMatch = sql.match(/SELECT\s+([\s\S]+?)\s+FROM\s+\w+/i);
    if (!selectMatch) return { ok: false, error: 'Could not parse SELECT statement. Try a simpler query.' };

    const selectClause = selectMatch[1];
    const groupByMatch = sql.match(/GROUP\s+BY\s+([\w,\s]+?)(?=\s+ORDER|\s+HAVING|\s+LIMIT|$)/i);
    const orderByMatch = sql.match(/ORDER\s+BY\s+([\w_]+)\s*(DESC|ASC)?/i);
    const limitMatch = lower.match(/limit\s+(\d+)/);
    const limit = limitMatch ? parseInt(limitMatch[1]) : 100;

    // Parse column expressions
    const colExprs = selectClause.split(',').map(e => e.trim());
    const parsedCols = colExprs.map(expr => {
      const aggMatch = expr.match(/(SUM|AVG|COUNT|MIN|MAX)\((\w+|\*)\)\s*(?:AS\s+(\w+))?/i);
      if (aggMatch) return { type: 'agg', fn: aggMatch[1].toUpperCase(), col: aggMatch[2], alias: aggMatch[3] || `${aggMatch[1].toLowerCase()}_${aggMatch[2]}` };
      const asMatch = expr.match(/(\w+)\s+AS\s+(\w+)/i);
      if (asMatch) return { type: 'field', col: asMatch[1], alias: asMatch[2] };
      return { type: 'field', col: expr.trim(), alias: expr.trim() };
    });

    const groupByCols = groupByMatch ? groupByMatch[1].split(',').map(c => c.trim()) : [];

    let result;
    if (groupByCols.length > 0) {
      const groups = {};
      for (const row of rows) {
        const key = groupByCols.map(c => row[c] ?? '').join('|');
        if (!groups[key]) groups[key] = { _key: key, _rows: [], _group: Object.fromEntries(groupByCols.map(c => [c, row[c]])) };
        groups[key]._rows.push(row);
      }

      result = Object.values(groups).map(g => {
        const out = { ...g._group };
        for (const col of parsedCols) {
          if (col.type === 'agg') {
            const vals = g._rows.map(r => parseFloat(r[col.col]) || 0).filter(v => !isNaN(v));
            if (col.fn === 'SUM') out[col.alias] = vals.reduce((a, b) => a + b, 0);
            else if (col.fn === 'AVG') out[col.alias] = vals.reduce((a, b) => a + b, 0) / Math.max(vals.length, 1);
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
      const orderCol = orderByMatch[1];
      const desc = (orderByMatch[2] || 'DESC').toUpperCase() === 'DESC';
      result.sort((a, b) => desc ? (b[orderCol] || 0) - (a[orderCol] || 0) : (a[orderCol] || 0) - (b[orderCol] || 0));
    }

    result = result.slice(0, limit);
    return { ok: true, columns: result.length > 0 ? Object.keys(result[0]) : [], rows: result };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

export default function SQLPythonWorkbench() {
  const { getActiveTable } = useWorkspaceStore();
  const activeTable = getActiveTable();
  const [sql, setSql] = useState('SELECT *\nFROM dataset\nLIMIT 20;');
  const [nlQuery, setNlQuery] = useState('');
  const [result, setResult] = useState(null);
  const [running, setRunning] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [validating, setValidating] = useState(false);
  const [validation, setValidation] = useState(null);
  const [explanation, setExplanation] = useState(null);
  const [explaining, setExplaining] = useState(false);
  const [history, setHistory] = useState([]);
  const [savedQueries, setSavedQueries] = useState([]);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showChart, setShowChart] = useState(false);
  const [tab, setTab] = useState('editor');

  const rows = activeTable?.rows || [];
  const columns = activeTable?.columns || [];

  const runQuery = () => {
    if (!sql.trim()) return;
    setRunning(true);
    setResult(null);
    setTimeout(() => {
      const res = executeSQL(sql, rows, activeTable?.name || 'dataset');
      setResult(res);
      if (res.ok) {
        setHistory(h => [{ sql, runAt: new Date().toLocaleTimeString(), rowCount: res.rows.length }, ...h.slice(0, 19)]);
      }
      setRunning(false);
    }, 300);
  };

  const generateSQL = async () => {
    if (!nlQuery.trim()) return;
    setGenerating(true);
    try {
      const res = await base44.functions.invoke('generateSQL', {
        question: nlQuery, tableName: activeTable?.name || 'dataset', columns,
      });
      if (res.data?.sql) setSql(res.data.sql);
      if (res.data?.explanation) setExplanation({ text: res.data.explanation, businessMeaning: res.data.businessMeaning });
    } catch (e) {}
    setGenerating(false);
  };

  const validateSQL = async () => {
    setValidating(true);
    setValidation(null);
    try {
      const res = await base44.functions.invoke('validateSQL', { sql, columns });
      setValidation(res.data);
    } catch (e) {}
    setValidating(false);
  };

  const explainSQL = async () => {
    if (!result?.ok) return;
    setExplaining(true);
    try {
      const res = await base44.functions.invoke('explainChart', {
        title: 'SQL Result', type: 'table', data: result.rows.slice(0, 20),
        tableName: activeTable?.name,
      });
      setExplanation(res.data?.explanation);
    } catch (e) {}
    setExplaining(false);
  };

  const saveQuery = () => {
    const name = prompt('Query name:');
    if (!name) return;
    setSavedQueries(q => [...q, { name, sql, savedAt: new Date().toLocaleTimeString() }]);
  };

  const downloadResult = () => {
    if (!result?.rows?.length) return;
    const csv = [result.columns.join(','), ...result.rows.map(r => result.columns.map(c => JSON.stringify(r[c] ?? '')).join(','))].join('\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = 'query_result.csv'; a.click();
  };

  // Chart data from result
  const chartData = result?.rows?.slice(0, 20) || [];
  const numericCols = result?.columns?.filter(c => typeof chartData[0]?.[c] === 'number') || [];
  const catCol = result?.columns?.find(c => typeof chartData[0]?.[c] === 'string') || result?.columns?.[0];
  const numCol = numericCols[0];

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-white/8 px-8 py-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-green-400/15 border border-green-400/25 flex items-center justify-center">
            <Code2 className="w-5 h-5 text-green-400" />
          </div>
          <div>
            <h1 className="text-xl font-black">SQL + Python Analytics Workbench</h1>
            <p className="text-xs text-muted-foreground">DuckDB-style SQL · NL-to-SQL · Validation · Templates · Charts</p>
          </div>
          {activeTable && (
            <div className="ml-auto px-4 py-2 rounded-xl bg-green-400/8 border border-green-400/15 text-xs text-green-400 font-mono">
              {activeTable.name} · {rows.length?.toLocaleString()} rows · {columns.length} cols
            </div>
          )}
        </div>
      </div>

      <div className="flex h-[calc(100vh-100px)]">
        {/* Left: Editor + Controls */}
        <div className="flex-1 flex flex-col overflow-hidden border-r border-white/8">
          {/* NL Query */}
          <div className="px-6 py-4 border-b border-white/8">
            <div className="flex gap-2">
              <input value={nlQuery} onChange={e => setNlQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && generateSQL()}
                placeholder="Ask in natural language: 'Show me monthly revenue trend…'"
                className="flex-1 px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-white/20 placeholder:text-white/20" />
              <button onClick={generateSQL} disabled={generating || !nlQuery.trim()}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-purple-400/15 border border-purple-400/25 text-purple-400 rounded-xl text-sm font-semibold hover:bg-purple-400/20 transition-all disabled:opacity-40">
                {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                Generate SQL
              </button>
            </div>
          </div>

          {/* SQL Editor */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-6 py-2 border-b border-white/8">
              <span className="text-xs text-white/30 font-mono">SQL Editor — DuckDB compatible</span>
              <div className="flex gap-1.5">
                <button onClick={() => setShowTemplates(v => !v)}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-white/40 hover:text-white/70 border border-white/8 rounded-lg transition-all">
                  <BookOpen className="w-3 h-3" /> Templates
                </button>
                <button onClick={() => setShowHistory(v => !v)}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-white/40 hover:text-white/70 border border-white/8 rounded-lg transition-all">
                  <Clock className="w-3 h-3" /> History
                </button>
                <button onClick={validateSQL} disabled={validating}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-amber-400 bg-amber-400/8 border border-amber-400/20 rounded-lg hover:bg-amber-400/12 transition-all disabled:opacity-50">
                  <Shield className="w-3 h-3" /> Validate
                </button>
                <button onClick={saveQuery} className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-white/40 hover:text-white/70 border border-white/8 rounded-lg transition-all">
                  <Save className="w-3 h-3" /> Save
                </button>
              </div>
            </div>
            <textarea value={sql} onChange={e => setSql(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) runQuery(); }}
              className="flex-1 bg-black/20 text-green-400/85 font-mono text-sm px-6 py-4 resize-none focus:outline-none border-b border-white/8"
              spellCheck={false} placeholder="SELECT * FROM dataset LIMIT 20;" />

            {/* Validation result */}
            {validation && (
              <div className={`px-6 py-3 text-xs ${validation.valid ? 'bg-green-400/5 border-t border-green-400/15 text-green-400' : 'bg-red-400/5 border-t border-red-400/15 text-red-400'}`}>
                {validation.valid ? '✓ SQL is safe and valid' : `⚠ ${validation.risk?.issues?.[0]?.message || 'Validation failed'}`}
              </div>
            )}

            {/* Run button */}
            <div className="px-6 py-3 border-t border-white/8 flex items-center gap-3">
              <button onClick={runQuery} disabled={running || !sql.trim()}
                className="flex items-center gap-2 px-5 py-2.5 bg-green-400/15 border border-green-400/25 text-green-400 rounded-xl text-sm font-semibold hover:bg-green-400/20 transition-all disabled:opacity-40">
                {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                Run Query (⌘↵)
              </button>
              {!activeTable && <span className="text-xs text-amber-400">⚠ No dataset loaded — go to Workspace to upload data</span>}
            </div>
          </div>
        </div>

        {/* Right: Results + Panels */}
        <div className="w-[45%] flex flex-col overflow-hidden">
          {/* Templates panel */}
          <AnimatePresence>
            {showTemplates && (
              <motion.div initial={{ height: 0 }} animate={{ height: 220 }} exit={{ height: 0 }}
                className="border-b border-white/8 overflow-hidden">
                <div className="p-4 overflow-y-auto h-full">
                  <div className="text-xs text-white/30 mb-2 font-semibold uppercase tracking-widest">15 Business SQL Templates</div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {SQL_TEMPLATES.map(t => (
                      <button key={t.name} onClick={() => { setSql(t.sql); setShowTemplates(false); }}
                        className="text-left px-2.5 py-1.5 rounded-lg bg-white/3 border border-white/8 text-xs text-white/55 hover:text-white/80 hover:border-white/15 transition-all truncate">
                        {t.name}
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* History panel */}
          <AnimatePresence>
            {showHistory && history.length > 0 && (
              <motion.div initial={{ height: 0 }} animate={{ height: 150 }} exit={{ height: 0 }}
                className="border-b border-white/8 overflow-hidden">
                <div className="p-4 overflow-y-auto h-full space-y-1">
                  {history.map((h, i) => (
                    <button key={i} onClick={() => setSql(h.sql)}
                      className="w-full text-left px-3 py-1.5 rounded-lg bg-white/2 hover:bg-white/5 text-xs text-white/50 truncate transition-all">
                      <span className="text-white/25 mr-2">{h.runAt}</span>{h.sql.replace(/\n/g, ' ').slice(0, 60)}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Results */}
          <div className="flex-1 overflow-auto p-4 space-y-4">
            {!result && !running && (
              <div className="flex items-center justify-center h-full text-sm text-white/25">
                Run a query to see results
              </div>
            )}
            {running && <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 text-green-400 animate-spin" /></div>}

            {result && (
              <div className="space-y-4">
                {result.ok ? (
                  <>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs text-green-400">
                        <CheckCircle2 className="w-3.5 h-3.5" /> {result.rows.length} rows
                      </div>
                      <div className="flex gap-1.5">
                        <button onClick={explainSQL} disabled={explaining}
                          className="flex items-center gap-1 px-2.5 py-1 text-xs bg-purple-400/10 border border-purple-400/20 text-purple-400 rounded-lg hover:bg-purple-400/15 transition-all disabled:opacity-50">
                          {explaining ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />} Explain
                        </button>
                        <button onClick={() => setShowChart(v => !v)}
                          className="flex items-center gap-1 px-2.5 py-1 text-xs bg-cyan-400/10 border border-cyan-400/20 text-cyan-400 rounded-lg hover:bg-cyan-400/15 transition-all">
                          <BarChart2 className="w-3 h-3" /> Chart
                        </button>
                        <button onClick={downloadResult}
                          className="flex items-center gap-1 px-2.5 py-1 text-xs bg-white/5 border border-white/10 text-white/40 rounded-lg hover:text-white/70 transition-all">
                          <Download className="w-3 h-3" /> Export
                        </button>
                      </div>
                    </div>

                    {showChart && numCol && chartData.length > 0 && (
                      <div className="rounded-xl border border-white/8 p-4 h-48">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                            <XAxis dataKey={catCol} tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 9 }} />
                            <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 9 }} />
                            <Tooltip contentStyle={{ background: 'hsl(222,44%,9%)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12 }} />
                            <Bar dataKey={numCol} radius={[4, 4, 0, 0]}>
                              {chartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    )}

                    {explanation && (
                      <div className="p-4 rounded-xl bg-purple-400/5 border border-purple-400/15 text-xs space-y-2">
                        <div className="text-purple-400 font-bold">AI Interpretation</div>
                        <p className="text-white/60">{explanation.topInsight || explanation.text || String(explanation)}</p>
                        {explanation.businessMeaning && <p className="text-white/45">{explanation.businessMeaning}</p>}
                      </div>
                    )}

                    <div className="rounded-xl border border-white/8 overflow-auto max-h-72">
                      <table className="w-full text-xs min-w-max">
                        <thead>
                          <tr className="border-b border-white/8 bg-white/3">
                            {result.columns.map(c => (
                              <th key={c} className="text-left px-3 py-2 text-white/40 font-mono font-semibold whitespace-nowrap">{c}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {result.rows.map((row, i) => (
                            <tr key={i} className="border-b border-white/5 hover:bg-white/2">
                              {result.columns.map(c => (
                                <td key={c} className="px-3 py-2 text-white/55 font-mono whitespace-nowrap">
                                  {typeof row[c] === 'number' ? row[c].toLocaleString(undefined, { maximumFractionDigits: 2 }) : String(row[c] ?? '—')}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                ) : (
                  <div className="flex items-start gap-2 p-4 rounded-xl bg-red-400/8 border border-red-400/20 text-sm text-red-400">
                    <XCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="font-semibold">Query Error</div>
                      <div className="text-xs mt-1 text-red-400/70">{result.error}</div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}