import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useWorkspaceStore } from '@/lib/store';
import {
  FileText, Plus, Trash2, Play, Loader2, ChevronLeft,
  Code2, BarChart2, Type, Brain, Terminal, X,
  GitBranch, CheckCircle2, AlertTriangle, TrendingUp, Zap
} from 'lucide-react';
import { Link } from 'react-router-dom';

const CELL_ICONS = {
  sql: Code2,
  python: Terminal,
  chart: BarChart2,
  markdown: Type,
  ai_insight: Brain,
  causal: GitBranch,
};

// ── Causal Intelligence Panel ──────────────────────────────────────────────────
function CausalPanel({ tableData }) {
  const [question, setQuestion] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const runCausal = async () => {
    if (!question.trim() || !tableData) return;
    setLoading(true);
    setResult(null);
    try {
      const cols = tableData.columns?.slice(0, 20) || [];
      const rows = tableData.rows?.slice(0, 200) || [];
      const res = await base44.integrations.Core.InvokeLLM({
        model: 'claude_sonnet_4_6',
        prompt: `You are a causal inference expert. The user wants to determine root cause, not just correlation.

Dataset: "${tableData.name}" (${rows.length} rows, ${cols.length} columns)
Columns: ${cols.map(c => c.name).join(', ')}
Sample row: ${JSON.stringify(rows[0] || {})}

User question: "${question}"

Apply the following causal reasoning framework:
1. CORRELATIONAL TRAPS: What variables might be correlated but NOT causal?
2. CONFOUNDERS: What hidden variables could be driving both variables?
3. CAUSAL HYPOTHESIS: What is the most likely causal chain based on domain knowledge?
4. COUNTERFACTUAL TEST: If we removed the treatment, what would happen?
5. EVIDENCE: What columns in the dataset can be used to test this causally?
6. RECOMMENDATION: What intervention would verify this causal relationship?

Return structured causal analysis.`,
        response_json_schema: {
          type: 'object',
          properties: {
            causal_question: { type: 'string' },
            correlational_traps: { type: 'array', items: { type: 'string' } },
            confounders: { type: 'array', items: { type: 'string' } },
            causal_hypothesis: { type: 'string' },
            causal_chain: { type: 'array', items: { type: 'string' } },
            counterfactual: { type: 'string' },
            testable_columns: { type: 'array', items: { type: 'string' } },
            intervention_recommendation: { type: 'string' },
            confidence: { type: 'number' },
          }
        }
      });
      setResult(res);
    } catch (e) {
      setResult({ error: e.message });
    }
    setLoading(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-pink-400/5 border border-pink-400/15 text-xs text-pink-400">
        <GitBranch className="w-3.5 h-3.5 flex-shrink-0" />
        Causal Intelligence Engine — determines root cause, not just correlation
      </div>
      <div className="flex gap-2">
        <input value={question} onChange={e => setQuestion(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && runCausal()}
          placeholder="Why is churn increasing? What's causing revenue to drop? What drives conversion?"
          className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white/80 placeholder:text-white/25 focus:outline-none focus:border-pink-400/30" />
        <button onClick={runCausal} disabled={loading || !question.trim() || !tableData}
          className="flex items-center gap-2 px-4 py-2.5 bg-pink-400/15 border border-pink-400/25 text-pink-400 rounded-xl text-sm font-bold disabled:opacity-40 hover:bg-pink-400/25 transition-all">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
          Analyze
        </button>
      </div>
      {!tableData && <div className="text-xs text-white/30 text-center py-4">Load a dataset in the Workspace first to enable causal analysis.</div>}
      {result?.error && <div className="text-sm text-red-400 p-3 bg-red-400/8 border border-red-400/20 rounded-xl">{result.error}</div>}
      {result && !result.error && (
        <div className="space-y-3">
          <div className="px-4 py-3 rounded-xl bg-white/3 border border-white/8">
            <div className="text-xs text-white/30 uppercase tracking-widest mb-1">Causal Hypothesis</div>
            <p className="text-sm text-white/75 leading-relaxed">{result.causal_hypothesis}</p>
          </div>
          {result.causal_chain?.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              {result.causal_chain.map((step, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-xs px-3 py-1.5 rounded-full bg-pink-400/10 border border-pink-400/20 text-pink-400">{step}</span>
                  {i < result.causal_chain.length - 1 && <TrendingUp className="w-3 h-3 text-white/20" />}
                </div>
              ))}
            </div>
          )}
          {result.correlational_traps?.length > 0 && (
            <div>
              <div className="text-xs text-amber-400 uppercase tracking-widest mb-1.5 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Correlational Traps (not causal)</div>
              {result.correlational_traps.map((t, i) => <div key={i} className="text-xs text-white/45 pl-3 py-0.5">• {t}</div>)}
            </div>
          )}
          {result.confounders?.length > 0 && (
            <div>
              <div className="text-xs text-red-400 uppercase tracking-widest mb-1.5">Hidden Confounders</div>
              {result.confounders.map((c, i) => <div key={i} className="text-xs text-white/45 pl-3 py-0.5">• {c}</div>)}
            </div>
          )}
          <div className="px-4 py-3 rounded-xl bg-green-400/5 border border-green-400/15">
            <div className="text-xs text-green-400 uppercase tracking-widest mb-1">Intervention Recommendation</div>
            <p className="text-sm text-white/65">{result.intervention_recommendation}</p>
          </div>
          {result.testable_columns?.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              <span className="text-xs text-white/30">Test using columns:</span>
              {result.testable_columns.map(c => <span key={c} className="text-xs px-2 py-0.5 rounded-full bg-white/5 border border-white/8 text-cyan-400 font-mono">{c}</span>)}
            </div>
          )}
          <div className="text-xs text-white/25">Causal confidence: <span className="text-green-400 font-mono">{result.confidence}%</span></div>
        </div>
      )}
    </div>
  );
}

export default function AnalystNotebook() {
  const { getActiveTable } = useWorkspaceStore();
  const table = getActiveTable();
  const [notebookId] = useState(Date.now().toString());
  const [cells, setCells] = useState([]);
  const [executing, setExecuting] = useState('');

  const handleAddCell = (type) => {
    setCells(c => [...c, {
      id: Date.now().toString(),
      cellType: type,
      content: '',
      output: null,
      status: 'idle',
    }]);
  };

  const handleExecuteCell = async (cell) => {
    setExecuting(cell.id);
    try {
      const result = await base44.functions.invoke('executeNotebookCell', {
        cellType: cell.cellType,
        content: cell.content,
      });
      setCells(c => c.map(cl => cl.id === cell.id ? { ...cl, ...result.data } : cl));
    } catch (e) {
      setCells(c => c.map(cl => cl.id === cell.id ? { ...cl, status: 'error', errorMessage: e.message } : cl));
    }
    setExecuting('');
  };

  const handleDeleteCell = (id) => {
    setCells(c => c.filter(cl => cl.id !== id));
  };

  const handleUpdateCell = (id, content) => {
    setCells(c => c.map(cl => cl.id === id ? { ...cl, content } : cl));
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-white/5 px-6 py-4 sticky top-0 z-10 bg-background/95 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link to="/workspace" className="p-1.5 rounded-lg text-white/40 hover:text-white/80 hover:bg-white/5 transition-all">
              <ChevronLeft className="w-4 h-4" />
            </Link>
            <div className="w-9 h-9 rounded-xl bg-cyan-400/10 border border-cyan-400/20 flex items-center justify-center">
              <FileText className="w-4 h-4 text-cyan-400" />
            </div>
            <div>
              <h1 className="text-lg font-bold">Analyst Notebook</h1>
              <p className="text-xs text-muted-foreground">Cell-based SQL, Python, and AI analysis</p>
            </div>
          </div>
          <div className="flex items-center gap-1 bg-white/5 border border-white/8 rounded-lg p-1">
            {Object.keys(CELL_ICONS).map(type => {
              const Icon = CELL_ICONS[type];
              return (
                <button key={type} onClick={() => handleAddCell(type)}
                  className="p-1.5 rounded-lg text-white/30 hover:text-white/80 hover:bg-white/8 transition-all" title={type}>
                  <Icon className="w-4 h-4" />
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-6 space-y-4">
        {cells.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center border border-white/5 rounded-2xl">
            <FileText className="w-12 h-12 text-white/15 mb-4" />
            <h3 className="font-semibold mb-1">Empty notebook</h3>
            <p className="text-sm text-muted-foreground max-w-xs mb-5">Add cells to start your analysis. Use SQL, Python, charts, or AI insights.</p>
            <div className="flex gap-2 flex-wrap justify-center">
              {Object.entries(CELL_ICONS).map(([type, Icon]) => (
                <button key={type} onClick={() => handleAddCell(type)}
                  className="flex items-center gap-1.5 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-xs hover:bg-white/8 transition-all capitalize">
                  <Icon className="w-3.5 h-3.5" /> {type}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <AnimatePresence>
            {cells.map((cell, i) => {
              const CellIcon = CELL_ICONS[cell.cellType];
              return (
                <motion.div key={cell.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }}
                  className="glass-card rounded-2xl border border-white/8 overflow-hidden">
                  {/* Cell header */}
                  <div className="flex items-center gap-3 px-4 py-2 border-b border-white/5 bg-white/2">
                    <CellIcon className="w-4 h-4 text-white/40" />
                    <span className="text-xs text-white/40 uppercase tracking-wider flex-1">{cell.cellType}</span>
                    <button onClick={() => handleExecuteCell(cell)} disabled={executing === cell.id}
                      className="p-1.5 rounded-lg text-cyan-400 hover:bg-cyan-400/10 transition-all disabled:opacity-50">
                      {executing === cell.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                    </button>
                    <button onClick={() => handleDeleteCell(cell.id)}
                      className="p-1.5 rounded-lg text-white/30 hover:text-red-400 hover:bg-red-400/10 transition-all">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Cell input — causal gets special panel, others get textarea */}
                  {cell.cellType === 'causal' ? (
                    <div className="px-4 py-4">
                      <CausalPanel tableData={table} />
                    </div>
                  ) : (
                  <textarea
                    value={cell.content}
                    onChange={e => handleUpdateCell(cell.id, e.target.value)}
                    placeholder={`Enter ${cell.cellType} code...`}
                    rows={4}
                    className="w-full px-4 py-3 bg-black/20 text-white/80 font-mono text-sm focus:outline-none resize-none"
                  />
                  )}

                  {/* Cell output */}
                  {cell.output && (
                    <div className="px-4 py-3 border-t border-white/5 bg-white/1">
                      <div className="text-xs text-white/40 mb-2">Output</div>
                      <pre className="text-xs text-white/60 overflow-auto max-h-32">
                        {JSON.stringify(cell.output, null, 2)}
                      </pre>
                    </div>
                  )}

                  {cell.errorMessage && (
                    <div className="px-4 py-3 border-t border-red-400/20 bg-red-400/5">
                      <div className="text-xs text-red-400">Error: {cell.errorMessage}</div>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}