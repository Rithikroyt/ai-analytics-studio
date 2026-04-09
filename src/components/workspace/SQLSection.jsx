import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWorkspaceStore } from '@/lib/store';
import { Terminal, Sparkles, Play, Copy, CheckCircle2, AlertTriangle, Database, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const EXAMPLE_QUERIES = [
  'What is the total by region?',
  'Show top 5 segments by value',
  'What changed month over month?',
  'Which segment has the highest average?',
  'Count records by category',
  'Show revenue trend by date',
];

export default function SQLSection() {
  const { semanticModel, getActiveTable, setActiveSection } = useWorkspaceStore();
  const table = getActiveTable();
  const [query, setQuery] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    if (!query.trim() || !table) return;
    setLoading(true);
    setResult(null);
    try {
      const cols = table.columns?.map(c => `${c.name} (${c.type})`).join(', ');
      const prompt = `You are a SQL generator. Given the table "${table.name}" with columns: ${cols}
User question: "${query}"
Generate a SQL SELECT query for this table.
IMPORTANT: respond ONLY with valid JSON in this exact format:
{"sql": "SELECT ...", "explanation": "Plain English: ...", "can_generate": true}
If you cannot generate SQL, respond: {"sql": null, "explanation": "...", "can_generate": false}`;
      
      const resp = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: 'object',
          properties: {
            sql: { type: 'string' },
            explanation: { type: 'string' },
            can_generate: { type: 'boolean' },
          },
        },
      });
      
      // Try to run the query on in-memory data
      let queryResult = null;
      if (resp.can_generate && resp.sql && table.rows) {
        queryResult = runInMemorySQL(resp.sql, table);
      }
      
      setResult({ ...resp, queryResult });
    } catch (e) {
      setResult({ 
        sql: null, 
        explanation: 'Could not generate SQL. The AI Analyst in the next section can answer this question directly.', 
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
      <div className="p-8 flex flex-col items-center justify-center min-h-[400px] text-center">
        <Terminal className="w-12 h-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground text-sm mb-4">Upload data to use SQL Studio.</p>
        <button onClick={() => setActiveSection('intake')} className="px-4 py-2 bg-cyan-400/10 border border-cyan-400/20 text-cyan-400 rounded-lg text-sm">Upload Data</button>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold mb-1">SQL Studio</h1>
        <p className="text-muted-foreground text-sm">Ask questions in plain English — get AI-generated SQL and instant results.</p>
      </motion.div>

      {/* Schema info */}
      <div className="glass rounded-xl p-4 border border-white/5">
        <div className="flex items-center gap-2 mb-2">
          <Database className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
          <span className="text-xs font-semibold text-cyan-400">{table.name}</span>
          <span className="text-xs text-muted-foreground">· {table.rowCount?.toLocaleString()} rows</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {table.columns?.map(c => (
            <span key={c.name} className={`text-xs px-2 py-0.5 rounded font-mono ${c.type === 'numeric' ? 'bg-blue-400/10 text-blue-400/70' : c.type === 'date' ? 'bg-teal-400/10 text-teal-400/70' : c.type === 'category' ? 'bg-purple-400/10 text-purple-400/70' : 'bg-white/5 text-white/35'}`}>
              {c.name}
            </span>
          ))}
        </div>
      </div>

      {/* Example prompts */}
      <div>
        <div className="text-xs text-white/30 uppercase tracking-widest mb-2">Example queries</div>
        <div className="flex flex-wrap gap-2">
          {EXAMPLE_QUERIES.map(q => (
            <button key={q} onClick={() => setQuery(q)}
              className="px-3 py-1.5 bg-white/4 border border-white/8 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:border-cyan-400/25 transition-all">
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* Query box */}
      <div className="space-y-3">
        <textarea value={query} onChange={e => setQuery(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleGenerate(); }}
          placeholder="Ask a question about your data in plain English… (Ctrl+Enter to run)"
          rows={3}
          className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm placeholder:text-muted-foreground focus:outline-none focus:border-cyan-400/30 resize-none font-mono text-foreground"
        />
        <button onClick={handleGenerate} disabled={loading || !query.trim()}
          className="flex items-center gap-2 px-5 py-2.5 bg-cyan-400 rounded-xl text-sm font-bold disabled:opacity-50 hover:bg-cyan-300 transition-colors"
          style={{ color: 'hsl(222,47%,6%)' }}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Sparkles className="w-4 h-4" /> Generate SQL</>}
        </button>
      </div>

      {/* Results */}
      <AnimatePresence>
        {result && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
            {!result.can_generate && (
              <div className="flex items-start gap-3 p-4 bg-amber-400/5 border border-amber-400/20 rounded-xl">
                <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5" />
                <div className="text-sm text-amber-400">{result.explanation}</div>
              </div>
            )}

            {result.sql && (
              <div className="glass-card rounded-xl border border-white/10">
                <div className="flex items-center justify-between px-4 py-2 border-b border-white/5">
                  <span className="text-xs font-semibold text-cyan-400 uppercase tracking-wide">Generated SQL</span>
                  <button onClick={copySQL} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
                    {copied ? <><CheckCircle2 className="w-3.5 h-3.5 text-green-400" /> Copied!</> : <><Copy className="w-3.5 h-3.5" /> Copy</>}
                  </button>
                </div>
                <pre className="p-4 text-xs font-mono text-foreground/90 overflow-auto">{result.sql}</pre>
              </div>
            )}

            {result.explanation && result.can_generate && (
              <div className="p-4 glass rounded-xl border border-white/5">
                <div className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Plain English</div>
                <div className="text-sm">{result.explanation}</div>
              </div>
            )}

            {result.queryResult && (
              <div>
                <div className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Query Results (preview)</div>
                <div className="overflow-auto rounded-xl border border-white/5 max-h-64">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-white/3 border-b border-white/5">
                        {result.queryResult.headers?.map(h => <th key={h} className="px-3 py-2 text-left text-muted-foreground font-medium">{h}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {result.queryResult.rows?.slice(0, 10).map((row, i) => (
                        <tr key={i} className="border-b border-white/5">
                          {result.queryResult.headers?.map(h => <td key={h} className="px-3 py-2 font-mono">{String(row[h] ?? '—')}</td>)}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Simple in-memory SQL runner for basic SELECT queries
function runInMemorySQL(sql, table) {
  try {
    const rows = table.rows || [];
    if (!rows.length) return null;
    
    const upperSQL = sql.toUpperCase();
    
    // Detect GROUP BY
    if (upperSQL.includes('GROUP BY')) {
      const gbMatch = sql.match(/GROUP BY\s+(\w+)/i);
      const groupCol = gbMatch?.[1];
      if (!groupCol) return null;
      
      const grouped = {};
      rows.forEach(row => {
        const key = String(row[groupCol] ?? 'NULL');
        if (!grouped[key]) grouped[key] = { [groupCol]: key, count: 0 };
        grouped[key].count++;
        // Sum numeric cols
        table.columns?.filter(c => c.type === 'numeric').slice(0, 3).forEach(c => {
          grouped[key][`sum_${c.name}`] = (grouped[key][`sum_${c.name}`] || 0) + (Number(row[c.name]) || 0);
        });
      });
      
      const resultRows = Object.values(grouped).sort((a, b) => b.count - a.count).slice(0, 10);
      const headers = Object.keys(resultRows[0] || {});
      return { headers, rows: resultRows };
    }
    
    // Basic SELECT *
    const limitMatch = sql.match(/LIMIT\s+(\d+)/i);
    const limit = limitMatch ? parseInt(limitMatch[1]) : 10;
    const sliced = rows.slice(0, limit);
    const headers = table.columns?.map(c => c.name) || [];
    return { headers, rows: sliced };
  } catch {
    return null;
  }
}