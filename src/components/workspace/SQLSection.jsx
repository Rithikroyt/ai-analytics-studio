/**
 * SQL Studio — Natural language → SQL → in-memory execution → results + chart
 */
import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWorkspaceStore } from '@/lib/store';
import {
  Terminal, Sparkles, Play, Copy, CheckCircle2, AlertTriangle,
  Database, Loader2, ArrowRight, BarChart2, Table2, Lightbulb,
  RefreshCw, Download, ChevronRight
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const PALETTE = ['#00e5ff', '#7b2fff', '#ff6b35', '#4caf50', '#ff2d7a', '#ffcc02', '#00bfa5', '#e91e63'];
const TOOLTIP_STYLE = {
  backgroundColor: 'rgba(8,6,18,0.96)', border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 10, fontSize: 11, color: '#e2e8f0',
};
const axisStyle = { fontSize: 9, fill: 'rgba(255,255,255,0.35)' };

const fmtV = (v) => {
  if (v == null) return '—';
  const n = Number(v);
  if (isNaN(n)) return String(v);
  if (Math.abs(n) >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
  if (Math.abs(n) >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (Math.abs(n) >= 1e3) return `${(n / 1e3).toFixed(0)}K`;
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
};

const EXAMPLE_QUERIES = [
  'Show total revenue by region',
  'Top 10 segments by average value',
  'What changed month over month?',
  'Count records by category',
  'Which segment has the highest value?',
  'Show distribution of the primary KPI',
  'Compare performance across segments',
  'Show records with the highest values',
];

// ── In-memory SQL runner ──────────────────────────────────────────
function runInMemorySQL(sql, table) {
  try {
    const rows = table.rows || [];
    if (!rows.length) return null;
    const upper = sql.toUpperCase().replace(/\s+/g, ' ');

    // GROUP BY with aggregation
    if (upper.includes('GROUP BY')) {
      const gbMatch = sql.match(/GROUP\s+BY\s+"?(\w+)"?/i);
      const groupCol = gbMatch?.[1] || table.columns?.find(c => c.type === 'category')?.name;
      if (!groupCol) return null;

      const sumMatch = sql.match(/SUM\s*\(\s*"?(\w+)"?\s*\)/i);
      const avgMatch = sql.match(/AVG\s*\(\s*"?(\w+)"?\s*\)/i);
      const countMatch = upper.includes('COUNT(');
      const aggCol = sumMatch?.[1] || avgMatch?.[1] || table.columns?.find(c => c.type === 'numeric')?.name;

      const grouped = {};
      rows.forEach(row => {
        const key = String(row[groupCol] ?? 'NULL');
        if (!grouped[key]) grouped[key] = { _key: key, _count: 0, _sum: 0, _values: [] };
        grouped[key]._count++;
        if (aggCol) {
          const v = Number(row[aggCol]);
          if (!isNaN(v)) { grouped[key]._sum += v; grouped[key]._values.push(v); }
        }
      });

      const resultRows = Object.values(grouped).map(g => {
        const out = { [groupCol]: g._key };
        if (countMatch) out['count'] = g._count;
        if (aggCol) {
          if (sumMatch) out[`sum_${aggCol}`] = Math.round(g._sum);
          else if (avgMatch) out[`avg_${aggCol}`] = g._values.length ? parseFloat((g._sum / g._values.length).toFixed(2)) : 0;
          else out[`total_${aggCol}`] = Math.round(g._sum);
        }
        return out;
      }).sort((a, b) => {
        const av = Object.values(a).find(v => typeof v === 'number') || 0;
        const bv = Object.values(b).find(v => typeof v === 'number') || 0;
        return bv - av;
      });

      const limitMatch = sql.match(/LIMIT\s+(\d+)/i);
      const limited = resultRows.slice(0, limitMatch ? parseInt(limitMatch[1]) : 20);
      return { headers: Object.keys(limited[0] || {}), rows: limited, groupedBy: groupCol, aggCol };
    }

    // ORDER BY with LIMIT
    if (upper.includes('ORDER BY')) {
      const orderMatch = sql.match(/ORDER\s+BY\s+"?(\w+)"?\s*(ASC|DESC)?/i);
      const orderCol = orderMatch?.[1];
      const desc = (orderMatch?.[2] || 'DESC').toUpperCase() === 'DESC';
      const limitMatch = sql.match(/LIMIT\s+(\d+)/i);
      const limit = limitMatch ? parseInt(limitMatch[1]) : 10;

      let sorted = [...rows];
      if (orderCol) {
        sorted.sort((a, b) => {
          const av = Number(a[orderCol]);
          const bv = Number(b[orderCol]);
          if (!isNaN(av) && !isNaN(bv)) return desc ? bv - av : av - bv;
          return desc ? String(b[orderCol]).localeCompare(String(a[orderCol])) : String(a[orderCol]).localeCompare(String(b[orderCol]));
        });
      }
      const sliced = sorted.slice(0, limit);
      const headers = table.columns?.map(c => c.name).slice(0, 8) || [];
      return { headers, rows: sliced.map(r => Object.fromEntries(headers.map(h => [h, r[h]]))) };
    }

    // Basic SELECT *
    const limitMatch = sql.match(/LIMIT\s+(\d+)/i);
    const limit = limitMatch ? parseInt(limitMatch[1]) : 15;
    const sliced = rows.slice(0, limit);
    const headers = table.columns?.map(c => c.name).slice(0, 8) || [];
    return { headers, rows: sliced.map(r => Object.fromEntries(headers.map(h => [h, r[h]]))) };
  } catch {
    return null;
  }
}

// ── Quick result chart ─────────────────────────────────────────────
function ResultChart({ result }) {
  if (!result?.groupedBy || !result.rows?.length) return null;
  const numKey = result.headers?.find(h => h !== result.groupedBy && typeof result.rows[0][h] === 'number');
  if (!numKey) return null;

  const data = result.rows.slice(0, 12).map(r => ({ name: String(r[result.groupedBy]).slice(0, 16), value: Number(r[numKey]) || 0 }));
  const isHorizontal = data.length > 6;

  if (isHorizontal) {
    return (
      <ResponsiveContainer width="100%" height={Math.max(180, data.length * 30)}>
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 40, bottom: 4, left: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
          <XAxis type="number" tick={axisStyle} tickFormatter={fmtV} tickLine={false} axisLine={false} />
          <YAxis dataKey="name" type="category" tick={{ ...axisStyle, fontSize: 10 }} tickLine={false} axisLine={false} width={100} />
          <Tooltip contentStyle={TOOLTIP_STYLE} formatter={v => [fmtV(v), numKey]} />
          <Bar dataKey="value" radius={[0, 4, 4, 0]}>
            {data.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} fillOpacity={0.85} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
        <XAxis dataKey="name" tick={axisStyle} tickLine={false} axisLine={false} />
        <YAxis tick={axisStyle} tickFormatter={fmtV} tickLine={false} axisLine={false} width={44} />
        <Tooltip contentStyle={TOOLTIP_STYLE} formatter={v => [fmtV(v), numKey]} />
        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
          {data.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} fillOpacity={0.85} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// ── Main ───────────────────────────────────────────────────────────
export default function SQLSection() {
  const { semanticModel, getActiveTable, setActiveSection } = useWorkspaceStore();
  const table = getActiveTable();
  const [query, setQuery] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [view, setView] = useState('table'); // 'table' | 'chart'
  const [history, setHistory] = useState([]);

  const handleGenerate = async (q) => {
    const question = (q || query).trim();
    if (!question || !table) return;
    setLoading(true);
    setResult(null);
    const cols = table.columns?.map(c => `${c.name} (${c.type})`).join(', ');
    const catCols = table.columns?.filter(c => c.type === 'category').map(c => c.name).join(', ');
    const numCols = table.columns?.filter(c => c.type === 'numeric').map(c => c.name).join(', ');
    try {
      const resp = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a SQL expert. Given table "${table.name}" with columns: ${cols}
Numeric columns: ${numCols}
Category columns: ${catCols}
Rows: ${table.rowCount}

User question: "${question}"

Generate a SQL SELECT query. Use GROUP BY + SUM/COUNT/AVG for aggregations. Use ORDER BY + LIMIT for rankings.
Always use exact column names listed above.

Return JSON: {"sql": "SELECT ...", "explanation": "plain English explanation", "can_generate": true}
If unable: {"sql": null, "explanation": "reason + suggestion", "can_generate": false}`,
        response_json_schema: {
          type: 'object',
          properties: {
            sql: { type: ['string', 'null'] },
            explanation: { type: 'string' },
            can_generate: { type: 'boolean' },
          },
        },
      });

      let queryResult = null;
      if (resp.can_generate && resp.sql && table.rows) {
        queryResult = runInMemorySQL(resp.sql, table);
      }

      const r = { ...resp, queryResult, question };
      setResult(r);
      setHistory(h => [r, ...h].slice(0, 5));
      setView('table');
    } catch (e) {
      setResult({
        sql: null,
        explanation: 'SQL generation failed. Try the AI Analyst for natural language questions about your data.',
        can_generate: false,
        question,
      });
    }
    setLoading(false);
  };

  const copySQL = () => {
    navigator.clipboard.writeText(result?.sql || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadCSV = () => {
    if (!result?.queryResult) return;
    const { headers, rows } = result.queryResult;
    const csv = [headers.join(','), ...rows.map(r => headers.map(h => JSON.stringify(r[h] ?? '')).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'query_result.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  if (!table) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[500px] text-center">
        <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/8 flex items-center justify-center mx-auto mb-4">
          <Terminal className="w-7 h-7 text-white/25" />
        </div>
        <h2 className="text-lg font-semibold mb-2">SQL Studio</h2>
        <p className="text-sm text-muted-foreground mb-6">Upload data to query it with natural language — we generate the SQL and run it instantly.</p>
        <button onClick={() => setActiveSection('intake')}
          className="flex items-center gap-2 px-5 py-2.5 bg-cyan-400/10 border border-cyan-400/20 text-cyan-400 rounded-xl text-sm font-semibold hover:bg-cyan-400/15 transition-colors">
          Upload Data <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold mb-1">SQL Studio</h1>
        <p className="text-sm text-muted-foreground">Ask questions in plain English — AI generates SQL and runs it against your data instantly.</p>
      </motion.div>

      {/* Schema strip */}
      <div className="glass rounded-xl p-4 border border-white/8">
        <div className="flex items-center gap-2 mb-3">
          <Database className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-xs font-semibold text-cyan-400">{table.name}</span>
          <span className="text-xs text-muted-foreground">· {table.rowCount?.toLocaleString()} rows · {table.columns?.length} columns</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {table.columns?.map(c => (
            <span key={c.name} className={`text-xs px-2 py-0.5 rounded-full font-mono border ${
              c.type === 'numeric' ? 'bg-blue-400/8 text-blue-400/80 border-blue-400/20' :
              c.type === 'date' ? 'bg-teal-400/8 text-teal-400/80 border-teal-400/20' :
              c.type === 'category' ? 'bg-purple-400/8 text-purple-400/80 border-purple-400/20' :
              'bg-white/4 text-white/35 border-white/8'
            }`}>
              {c.name}
            </span>
          ))}
        </div>
      </div>

      {/* Example queries */}
      <div>
        <div className="text-xs text-white/30 uppercase tracking-widest mb-2 flex items-center gap-1.5">
          <Lightbulb className="w-3 h-3" /> Example queries
        </div>
        <div className="flex flex-wrap gap-2">
          {EXAMPLE_QUERIES.map(q => (
            <button key={q} onClick={() => { setQuery(q); handleGenerate(q); }}
              className="px-3 py-1.5 bg-white/4 border border-white/8 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:border-cyan-400/25 hover:bg-white/7 transition-all">
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* Query input */}
      <div className="space-y-3">
        <div className="relative">
          <Terminal className="absolute left-4 top-4 w-4 h-4 text-muted-foreground" />
          <textarea value={query} onChange={e => setQuery(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleGenerate(); }}
            placeholder="Ask a question about your data… (Ctrl+Enter to generate SQL)"
            rows={3}
            className="w-full pl-11 pr-4 py-3.5 bg-white/5 border border-white/10 rounded-xl text-sm placeholder:text-muted-foreground focus:outline-none focus:border-cyan-400/30 resize-none text-foreground font-mono"
          />
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => handleGenerate()} disabled={loading || !query.trim()}
            className="flex items-center gap-2 px-5 py-2.5 bg-cyan-400 rounded-xl text-sm font-bold disabled:opacity-50 hover:bg-cyan-300 transition-all"
            style={{ color: 'hsl(222,47%,6%)' }}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {loading ? 'Generating…' : 'Generate & Run SQL'}
          </button>
          <span className="text-xs text-muted-foreground">Ctrl+Enter to run</span>
        </div>
      </div>

      {/* Query history */}
      {history.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {history.slice(1, 4).map((h, i) => (
            <button key={i} onClick={() => { setQuery(h.question); setResult(h); }}
              className="flex-shrink-0 text-xs px-3 py-1.5 rounded-lg bg-white/4 border border-white/8 text-white/40 hover:text-white/70 hover:bg-white/6 transition-all truncate max-w-48">
              {h.question}
            </button>
          ))}
        </div>
      )}

      {/* Results */}
      <AnimatePresence>
        {result && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
            {/* Cannot generate warning */}
            {!result.can_generate && (
              <div className="flex items-start gap-3 p-4 bg-amber-400/5 border border-amber-400/20 rounded-xl">
                <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-amber-400/90 leading-relaxed">{result.explanation}
                  <button onClick={() => setActiveSection('analyst')} className="ml-2 text-cyan-400 hover:underline inline-flex items-center gap-1 text-xs">
                    Try AI Analyst <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            )}

            {/* Generated SQL */}
            {result.sql && (
              <div className="glass-card rounded-xl border border-white/10">
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/8">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                    <span className="text-xs font-semibold text-cyan-400 uppercase tracking-widest">Generated SQL</span>
                  </div>
                  <button onClick={copySQL} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
                    {copied ? <><CheckCircle2 className="w-3.5 h-3.5 text-green-400" /> Copied</> : <><Copy className="w-3.5 h-3.5" /> Copy</>}
                  </button>
                </div>
                <pre className="p-4 text-xs font-mono text-green-300/90 overflow-auto whitespace-pre-wrap leading-relaxed">{result.sql}</pre>
              </div>
            )}

            {/* Explanation */}
            {result.explanation && result.can_generate && (
              <div className="flex items-start gap-3 p-4 glass rounded-xl border border-white/8">
                <Lightbulb className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs text-muted-foreground uppercase tracking-widest mb-1">What this query does</div>
                  <div className="text-sm text-white/70 leading-relaxed">{result.explanation}</div>
                </div>
              </div>
            )}

            {/* Query result */}
            {result.queryResult && (
              <div className="glass-card rounded-xl border border-white/8">
                <div className="flex items-center justify-between px-4 py-3 border-b border-white/8">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
                    <span className="text-xs font-semibold">Query Results</span>
                    <span className="text-xs text-muted-foreground">· {result.queryResult.rows?.length} rows returned</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {result.queryResult.groupedBy && (
                      <div className="flex items-center bg-white/5 border border-white/8 rounded-lg p-0.5">
                        <button onClick={() => setView('table')} className={`p-1.5 rounded text-xs transition-all ${view === 'table' ? 'bg-white/10 text-white' : 'text-white/35 hover:text-white/60'}`}>
                          <Table2 className="w-3 h-3" />
                        </button>
                        <button onClick={() => setView('chart')} className={`p-1.5 rounded text-xs transition-all ${view === 'chart' ? 'bg-white/10 text-white' : 'text-white/35 hover:text-white/60'}`}>
                          <BarChart2 className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                    <button onClick={downloadCSV} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-lg hover:bg-white/5">
                      <Download className="w-3 h-3" /> CSV
                    </button>
                  </div>
                </div>

                <AnimatePresence mode="wait">
                  {view === 'chart' && result.queryResult.groupedBy ? (
                    <motion.div key="chart" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4">
                      <ResultChart result={result.queryResult} />
                    </motion.div>
                  ) : (
                    <motion.div key="table" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="overflow-auto max-h-72">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-white/3 border-b border-white/8 sticky top-0">
                            {result.queryResult.headers?.map(h => (
                              <th key={h} className="px-3 py-2.5 text-left font-mono text-white/50 font-medium whitespace-nowrap">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {result.queryResult.rows?.map((row, i) => (
                            <tr key={i} className="border-b border-white/5 hover:bg-white/2 transition-colors">
                              {result.queryResult.headers?.map(h => (
                                <td key={h} className="px-3 py-2 font-mono text-white/65 whitespace-nowrap">
                                  {typeof row[h] === 'number' ? fmtV(row[h]) : String(row[h] ?? '—')}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {result.can_generate && !result.queryResult && (
              <div className="flex items-center gap-2 text-xs text-amber-400/70 p-3 bg-amber-400/5 border border-amber-400/15 rounded-lg">
                <AlertTriangle className="w-3.5 h-3.5" />
                This query could not be run in-memory (requires a database engine). The SQL above is valid — copy it to run in your own DB.
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* AI Analyst link */}
      <div className="flex items-center gap-3 p-4 glass rounded-xl border border-white/5 text-xs text-muted-foreground">
        <Sparkles className="w-4 h-4 text-purple-400 flex-shrink-0" />
        <span>Need deeper analysis? The <button onClick={() => setActiveSection('analyst')} className="text-cyan-400 hover:underline font-medium">AI Analyst</button> can answer complex questions using statistics, trends, and predictions — no SQL required.</span>
      </div>
    </div>
  );
}