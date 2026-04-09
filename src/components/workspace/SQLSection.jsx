import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWorkspaceStore } from '@/lib/store';
import {
  Terminal, Sparkles, Loader2, Copy, CheckCircle2,
  AlertTriangle, Database, Play, Info, ArrowRight, Download
} from 'lucide-react';
import { base44 } from '@/api/base44Client';

const EXAMPLE_QUERIES = [
  { label: 'Revenue by region', q: 'What is the total revenue by region?' },
  { label: 'Top 5 segments', q: 'Show me the top 5 segments by total value' },
  { label: 'Month-over-month', q: 'What is the month-over-month change?' },
  { label: 'Highest average', q: 'Which segment has the highest average value?' },
  { label: 'Count by category', q: 'Count the number of records by category' },
  { label: 'Anomaly rates', q: 'Which segment has the most outliers?' },
];

function runInMemorySQL(sql, table) {
  try {
    const rows = table.rows || [];
    if (!rows.length) return null;
    const upperSQL = sql.toUpperCase();

    if (upperSQL.includes('GROUP BY')) {
      const gbMatch = sql.match(/GROUP\s+BY\s+([`\w]+)/i);
      const groupCol = gbMatch?.[1]?.replace(/`/g, '');
      if (!groupCol) return null;

      const numCols = table.columns?.filter(c => c.type === 'numeric').slice(0, 4) || [];
      const grouped = {};
      rows.forEach(row => {
        const key = String(row[groupCol] ?? 'NULL');
        if (!grouped[key]) {
          grouped[key] = { [groupCol]: key, _count: 0 };
          numCols.forEach(c => { grouped[key][`sum_${c.name}`] = 0; });
        }
        grouped[key]._count++;
        numCols.forEach(c => { grouped[key][`sum_${c.name}`] += Number(row[c.name]) || 0; });
      });

      const resultRows = Object.values(grouped).sort((a, b) => b._count - a._count).slice(0, 15);
      // Round numeric sums
      resultRows.forEach(r => { Object.keys(r).filter(k => k.startsWith('sum_')).forEach(k => { r[k] = Math.round(r[k]); }); });
      const headers = Object.keys(resultRows[0] || {});
      return { headers, rows: resultRows, rowCount: resultRows.length };
    }

    const limitMatch = sql.match(/LIMIT\s+(\d+)/i);
    const limit = limitMatch ? parseInt(limitMatch[1]) : 10;

    // ORDER BY
    const orderMatch = sql.match(/ORDER\s+BY\s+([`\w]+)\s*(DESC|ASC)?/i);
    let sliced = [...rows];
    if (orderMatch) {
      const col = orderMatch[1].replace(/`/g, '');
      const desc = (orderMatch[2] || 'ASC').toUpperCase() === 'DESC';
      sliced.sort((a, b) => {
        const av = Number(a[col]) || 0;
        const bv = Number(b[col]) || 0;
        return desc ? bv - av : av - bv;
      });
    }

    sliced = sliced.slice(0, limit);
    const headers = table.columns?.map(c => c.name) || [];
    return { headers, rows: sliced, rowCount: sliced.length };
  } catch {
    return null;
  }
}

function downloadCSV(result, filename = 'query_result.csv') {
  if (!result?.rows?.length) return;
  const cols = result.headers.join(',');
  const rows = result.rows.map(row =>
    result.headers.map(h => {
      const val = String(row[h] ?? '');
      return val.includes(',') ? `"${val}"` : val;
    }).join(',')
  ).join('\n');
  const blob = new Blob([cols + '\n' + rows], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export default function SQLSection() {
  const { semanticModel, getActiveTable, setActiveSection } = useWorkspaceStore();
  const table = getActiveTable();
  const [query, setQuery] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [history, setHistory] = useState([]);

  const handleGenerate = async (q) => {
    const finalQuery = (q || query).trim();
    if (!finalQuery || !table) return;
    if (q) setQuery(q);
    setLoading(true);
    setResult(null);

    try {
      const cols = table.columns?.map(c => `${c.name} (${c.type})`).join(', ');
      const numericCols = table.columns?.filter(c => c.type === 'numeric').map(c => c.name).join(', ');
      const catCols = table.columns?.filter(c => c.type === 'category').map(c => c.name).join(', ');
      const sampleRow = JSON.stringify(table.rows?.[0] || {});

      const resp = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a SQL expert. Generate a SQL SELECT query for this table.

TABLE: "${table.name}"
COLUMNS: ${cols}
NUMERIC COLUMNS (for SUM/AVG/COUNT): ${numericCols}
CATEGORY COLUMNS (for GROUP BY): ${catCols}
SAMPLE ROW: ${sampleRow}
ROW COUNT: ${table.rowCount?.toLocaleString()}

USER QUESTION: "${finalQuery}"

Rules:
1. Only use SELECT statements (no INSERT/UPDATE/DELETE)
2. Use exact column names as listed above
3. For grouping questions: use GROUP BY + SUM/COUNT/AVG
4. For ranking: use ORDER BY ... DESC LIMIT 10
5. Include LIMIT unless the user wants all rows
6. If you cannot generate SQL: set can_generate=false and explain why

Respond with valid JSON only:
{"sql": "SELECT ...", "explanation": "Plain English description of what this query does", "can_generate": true}`,
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

      const resultData = { ...resp, queryResult, query: finalQuery };
      setResult(resultData);
      setHistory(h => [{ query: finalQuery, sql: resp.sql, rowCount: queryResult?.rowCount }, ...h.slice(0, 9)]);
    } catch (e) {
      setResult({
        sql: null,
        explanation: 'Could not generate SQL. Try the AI Analyst for a direct natural-language answer.',
        can_generate: false,
        error: true,
      });
    }
    setLoading(false);
  };

  const copySQL = () => {
    navigator.clipboard.writeText(result?.sql || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!table) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[500px] text-center">
        <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/8 flex items-center justify-center mx-auto mb-4">
          <Terminal className="w-7 h-7 text-white/25" />
        </div>
        <h2 className="text-lg font-semibold mb-2">No Data Loaded</h2>
        <p className="text-muted-foreground text-sm mb-6">Upload a dataset first to use SQL Studio.</p>
        <button onClick={() => setActiveSection('intake')}
          className="flex items-center gap-2 px-5 py-2.5 bg-cyan-400/10 border border-cyan-400/20 text-cyan-400 rounded-xl text-sm font-semibold hover:bg-cyan-400/15 transition-colors">
          Upload Data <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold mb-1">SQL Studio</h1>
        <p className="text-sm text-muted-foreground">Ask questions in plain English — get AI-generated SQL and instant in-memory results.</p>
      </motion.div>

      {/* Schema browser */}
      <div className="glass rounded-xl p-4 border border-white/8">
        <div className="flex items-center gap-2 mb-3">
          <Database className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-xs font-semibold text-cyan-400">{table.name}</span>
          <span className="text-xs text-muted-foreground">· {table.rowCount?.toLocaleString()} rows</span>
          <span className="ml-auto text-xs text-muted-foreground">{table.columns?.length} columns</span>
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
        <div className="flex gap-3 mt-2 text-xs">
          {[['numeric', 'text-blue-400'], ['date', 'text-teal-400'], ['category', 'text-purple-400'], ['id', 'text-amber-400']].map(([type, color]) => {
            const count = table.columns?.filter(c => c.type === type).length;
            if (!count) return null;
            return <span key={type} className={`${color} font-mono`}>{count} {type}</span>;
          })}
        </div>
      </div>

      {/* Example queries */}
      <div>
        <div className="text-xs text-white/30 uppercase tracking-widest mb-2">Quick queries</div>
        <div className="flex flex-wrap gap-2">
          {EXAMPLE_QUERIES.map(({ label, q }) => (
            <button key={label} onClick={() => handleGenerate(q)}
              className="px-3 py-1.5 bg-white/4 border border-white/8 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:border-cyan-400/25 transition-all">
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Query input */}
      <div className="space-y-3">
        <textarea
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleGenerate(); }}
          placeholder="Ask a question in plain English… (Ctrl+Enter or ⌘+Enter to run)"
          rows={3}
          className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm placeholder:text-muted-foreground focus:outline-none focus:border-cyan-400/30 resize-none font-mono text-foreground"
        />
        <div className="flex items-center gap-3">
          <button onClick={() => handleGenerate()} disabled={loading || !query.trim()}
            className="flex items-center gap-2 px-5 py-2.5 bg-cyan-400 rounded-xl text-sm font-bold disabled:opacity-50 hover:bg-cyan-300 transition-colors"
            style={{ color: 'hsl(222,47%,6%)' }}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Play className="w-4 h-4" /> Run Query</>}
          </button>
          <span className="text-xs text-white/25">⌘+Enter to run · Results shown in-memory</span>
          {result?.queryResult && (
            <button onClick={() => downloadCSV(result.queryResult, 'query_result.csv')}
              className="ml-auto flex items-center gap-1.5 text-xs px-3 py-1.5 bg-teal-400/10 border border-teal-400/20 text-teal-400 rounded-lg hover:bg-teal-400/15 transition-colors">
              <Download className="w-3 h-3" /> Export CSV
            </button>
          )}
        </div>
      </div>

      {/* Results */}
      <AnimatePresence>
        {result && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
            {/* Cannot generate warning */}
            {!result.can_generate && (
              <div className="flex items-start gap-3 p-4 bg-amber-400/5 border border-amber-400/20 rounded-xl">
                <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="text-sm text-amber-400 font-semibold mb-1">SQL Not Available</div>
                  <div className="text-xs text-amber-400/80">{result.explanation}</div>
                  <button onClick={() => setActiveSection('analyst')} className="mt-2 text-xs text-cyan-400 hover:underline flex items-center gap-1">
                    Ask the AI Analyst instead <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            )}

            {/* SQL output */}
            {result.sql && (
              <div className="glass-card rounded-xl border border-white/10 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/5 bg-white/3">
                  <div className="flex items-center gap-2">
                    <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                    <span className="text-xs font-semibold text-cyan-400 uppercase tracking-wide">Generated SQL</span>
                  </div>
                  <button onClick={copySQL} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
                    {copied ? <><CheckCircle2 className="w-3.5 h-3.5 text-green-400" /> Copied!</> : <><Copy className="w-3.5 h-3.5" /> Copy SQL</>}
                  </button>
                </div>
                <pre className="p-4 text-xs font-mono text-green-300 overflow-auto leading-relaxed">{result.sql}</pre>
              </div>
            )}

            {/* Plain English explanation */}
            {result.explanation && result.can_generate && (
              <div className="flex items-start gap-3 p-4 glass rounded-xl border border-white/8">
                <Info className="w-4 h-4 text-white/30 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="text-xs text-white/35 uppercase tracking-widest mb-1">What this query does</div>
                  <div className="text-sm text-white/70">{result.explanation}</div>
                </div>
              </div>
            )}

            {/* Query results table */}
            {result.queryResult && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs text-muted-foreground uppercase tracking-widest">
                    Query Results · {result.queryResult.rowCount} row{result.queryResult.rowCount !== 1 ? 's' : ''}
                  </div>
                </div>
                <div className="overflow-auto rounded-xl border border-white/8 max-h-72">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0">
                      <tr className="bg-navy-700/95 border-b border-white/8">
                        {result.queryResult.headers?.map(h => (
                          <th key={h} className="px-3 py-2.5 text-left font-mono text-white/50 font-medium whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {result.queryResult.rows?.slice(0, 20).map((row, i) => (
                        <tr key={i} className="border-b border-white/5 hover:bg-white/2 transition-colors">
                          {result.queryResult.headers?.map(h => (
                            <td key={h} className="px-3 py-2 font-mono text-white/65 whitespace-nowrap">{String(row[h] ?? '—')}</td>
                          ))}
                        </tr>
                      ))}
                      {result.queryResult.rows?.length === 0 && (
                        <tr><td colSpan={result.queryResult.headers?.length} className="px-4 py-8 text-center text-muted-foreground">No results returned.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
                {result.queryResult.rows?.length > 20 && (
                  <div className="text-xs text-white/25 mt-1.5 text-center">Showing first 20 of {result.queryResult.rowCount} rows · Export CSV for full results</div>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Query history */}
      {history.length > 0 && (
        <div>
          <div className="text-xs text-white/30 uppercase tracking-widest mb-2">Recent Queries</div>
          <div className="space-y-1">
            {history.slice(0, 5).map((h, i) => (
              <button key={i} onClick={() => handleGenerate(h.query)}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left hover:bg-white/5 transition-colors group">
                <Terminal className="w-3 h-3 text-white/20 flex-shrink-0" />
                <span className="text-xs text-white/50 flex-1 truncate">{h.query}</span>
                {h.rowCount != null && <span className="text-xs text-white/25">{h.rowCount} rows</span>}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}