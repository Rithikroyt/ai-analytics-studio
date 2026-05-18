/**
 * Natural Language Query Bar — Phase 3: Universal NLQ Interface
 * Always-on global query bar: NL → SQL → Chart → Answer, all in one input
 * Think: Power BI Q&A + Tableau Ask Data + QuickSight Q combined
 */
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useWorkspaceStore } from '@/lib/store';
import { Sparkles, Loader2, BarChart2, Database, X, ChevronRight, Brain } from 'lucide-react';

const SUGGESTIONS = [
  'Show top 10 categories by revenue',
  'What is the average salary by department?',
  'Which products have the highest churn risk?',
  'Trend of sales over the last 12 months',
  'Compare Q3 vs Q4 performance',
  'Detect anomalies in the dataset',
];

export default function NLQueryBar() {
  const { getActiveTable } = useWorkspaceStore();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const inputRef = useRef(null);
  const table = getActiveTable();

  const handleSubmit = async (q) => {
    const text = (q || query).trim();
    if (!text || !table) return;
    setQuery(text);
    setLoading(true);
    setResult(null);
    setOpen(true);
    try {
      const [sqlRes, aiRes] = await Promise.allSettled([
        base44.functions.invoke('generateSQL', { question: text, columns: table.columns?.slice(0, 20), rows: table.rows?.slice(0, 5), tableName: table.name }),
        base44.functions.invoke('runAgentOrchestrator', { question: text, persona: 'CFO Analyst', tableData: { name: table.name, rowCount: table.rows?.length, columns: table.columns?.slice(0, 20), rows: table.rows?.slice(0, 30) } }),
      ]);
      setResult({
        sql: sqlRes.status === 'fulfilled' ? sqlRes.value?.data?.sql : null,
        answer: aiRes.status === 'fulfilled' ? aiRes.value?.data?.executive_summary : null,
        takeaways: aiRes.status === 'fulfilled' ? (aiRes.value?.data?.evidence?.slice(0,2).map(e => e.finding) || []) : [],
        confidence: aiRes.status === 'fulfilled' ? aiRes.value?.data?.confidence_score : 0,
      });
    } catch (e) {
      setResult({ error: e.message });
    }
    setLoading(false);
  };

  return (
    <div className="relative w-full max-w-2xl">
      {/* Input */}
      <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all ${open ? 'border-purple-400/40 bg-purple-400/5' : 'border-white/10 bg-white/4'} focus-within:border-purple-400/40 focus-within:bg-purple-400/5`}>
        {loading ? <Loader2 className="w-3.5 h-3.5 text-purple-400 animate-spin flex-shrink-0" /> : <Sparkles className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />}
        <input
          ref={inputRef}
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          onFocus={() => !result && setOpen(true)}
          placeholder={table ? `Ask anything about ${table.name}…` : 'Load a dataset to ask questions…'}
          disabled={!table || loading}
          className="flex-1 bg-transparent text-sm text-white/80 placeholder:text-white/25 focus:outline-none"
        />
        {query && <button onClick={() => { setQuery(''); setResult(null); setOpen(false); }} className="text-white/25 hover:text-white/50"><X className="w-3 h-3" /></button>}
      </div>

      {/* Dropdown */}
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: -8, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8 }}
            className="absolute top-full left-0 right-0 z-50 mt-1 rounded-2xl border border-white/12 shadow-2xl overflow-hidden"
            style={{ background: 'hsl(222,44%,9%)', boxShadow: '0 20px 60px rgba(0,0,0,0.6)' }}>

            {!result && !loading && (
              <div className="p-3 space-y-1">
                <div className="text-xs text-white/25 px-2 py-1 uppercase tracking-widest">Quick prompts</div>
                {SUGGESTIONS.map(s => (
                  <button key={s} onClick={() => handleSubmit(s)}
                    className="w-full text-left flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-white/5 transition-all text-sm text-white/50 hover:text-white/80">
                    <ChevronRight className="w-3 h-3 text-purple-400 flex-shrink-0" />
                    {s}
                  </button>
                ))}
              </div>
            )}

            {loading && (
              <div className="p-6 text-center text-sm text-white/35 flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-purple-400" /> Analyzing with AI…
              </div>
            )}

            {result && !loading && (
              <div className="p-4 space-y-3">
                {result.error && <div className="text-sm text-red-400">{result.error}</div>}
                {result.answer && (
                  <div className="flex items-start gap-2">
                    <Brain className="w-3.5 h-3.5 text-cyan-400 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-white/70 leading-relaxed">{result.answer}</p>
                  </div>
                )}
                {result.takeaways?.slice(0, 2).map((t, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-white/40 pl-5">
                    <span className="text-cyan-400 flex-shrink-0">•</span> {t}
                  </div>
                ))}
                {result.sql && (
                  <div className="bg-white/3 rounded-xl p-3 border border-white/6">
                    <div className="flex items-center gap-1.5 mb-2 text-xs text-white/30"><Database className="w-3 h-3" /> Generated SQL</div>
                    <pre className="text-xs text-cyan-400 font-mono overflow-x-auto whitespace-pre-wrap">{result.sql.slice(0, 300)}</pre>
                  </div>
                )}
                <button onClick={() => { setResult(null); setOpen(false); setQuery(''); }} className="text-xs text-white/25 hover:text-white/50 transition-colors">Dismiss</button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Backdrop */}
      {open && <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />}
    </div>
  );
}