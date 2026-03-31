import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWorkspaceStore } from '@/lib/store';
import { Brain, Send, Loader2, Sparkles, Database, AlertCircle, ChevronDown, RefreshCw } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const STARTER_QUESTIONS = [
  'What are the top trends in this dataset?',
  'Where are the biggest risks or anomalies?',
  'What are my recommended actions?',
  'Which segment is underperforming?',
  'Generate an executive summary',
  'What is driving growth?',
];

function MessageBubble({ msg }) {
  const isUser = msg.role === 'user';
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} gap-3`}
    >
      {!isUser && (
        <div className="w-7 h-7 rounded-lg bg-purple-400/10 border border-purple-400/20 flex items-center justify-center mt-0.5 flex-shrink-0">
          <Brain className="w-3.5 h-3.5 text-purple-400" />
        </div>
      )}
      <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${isUser ? 'bg-cyan-400/10 border border-cyan-400/20 text-foreground' : 'bg-white/5 border border-white/8 text-foreground/90'}`}>
        {msg.loading ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span className="text-xs">Analyzing your data…</span>
          </div>
        ) : (
          <div className="whitespace-pre-wrap">{msg.content}</div>
        )}
        {msg.confidence && (
          <div className="mt-2 pt-2 border-t border-white/10 text-xs text-muted-foreground">
            Confidence: {msg.confidence} · Grounded in: {msg.sources}
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default function AnalystSection() {
  const { chatMessages, addChatMessage, updateLastMessage, analysisResults, semanticModel, getActiveTable, setActiveSection } = useWorkspaceStore();
  const table = getActiveTable();
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const buildSystemContext = () => {
    const parts = [];
    if (table) {
      parts.push(`Table: "${table.name}" with ${table.rowCount} rows and ${table.columns?.length} columns.`);
      parts.push(`Columns: ${table.columns?.map(c => `${c.name} (${c.type})`).join(', ')}`);
    }
    if (semanticModel) {
      parts.push(`Measures: ${semanticModel.measures?.map(m => m.label).join(', ')}`);
      parts.push(`Dimensions: ${semanticModel.dimensions?.map(d => d.label).join(', ')}`);
      if (semanticModel.dateField) parts.push(`Date field: ${semanticModel.dateField}`);
    }
    if (analysisResults) {
      const { primaryLabel, totalValue, growthRate, executiveSummary, anomalies, recommendations } = analysisResults;
      parts.push(`Primary KPI: ${primaryLabel} = ${totalValue?.toLocaleString()}`);
      if (growthRate) parts.push(`Overall growth: ${growthRate}%`);
      if (executiveSummary) parts.push(`Executive summary: ${executiveSummary}`);
      if (anomalies?.length) parts.push(`Anomalies detected: ${anomalies.length}`);
      if (recommendations?.length) parts.push(`Top recommendation: ${recommendations[0]?.action}`);
    }
    return parts.join('\n');
  };

  const send = async (text) => {
    const q = (text || input).trim();
    if (!q || loading) return;
    setInput('');
    setLoading(true);

    addChatMessage({ role: 'user', content: q });
    addChatMessage({ role: 'assistant', content: '', loading: true });

    try {
      const context = buildSystemContext();
      const prompt = `You are OmniData AI Analyst — an expert data analyst assistant.
You always answer with a structured response using this format:
1. **Direct Answer**: [concise answer]
2. **Why It Matters**: [business significance]
3. **Evidence**: [data points or patterns]
4. **Recommended Actions**: [1-3 specific actions]
5. **Confidence**: [High/Medium/Low] — [brief limitation note if any]

Context from the user's dataset:
${context}

If you cannot answer precisely, explain what you know and what is uncertain.
Never return empty responses.

User question: ${q}`;

      const resp = await base44.integrations.Core.InvokeLLM({ prompt });
      updateLastMessage({ content: resp, loading: false, sources: table?.name || 'uploaded data', confidence: 'High' });
    } catch (e) {
      updateLastMessage({
        content: 'I encountered an issue analyzing this question. Please try rephrasing, or check that data has been loaded in the workspace.',
        loading: false,
        confidence: 'N/A',
      });
    }
    setLoading(false);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-purple-400/10 border border-purple-400/20 flex items-center justify-center">
            <Brain className="w-4 h-4 text-purple-400" />
          </div>
          <div>
            <div className="font-semibold text-sm">AI Analyst</div>
            <div className="text-xs text-muted-foreground">Grounded in your uploaded data</div>
          </div>
        </div>
        {!table && (
          <button onClick={() => setActiveSection('intake')} className="text-xs px-3 py-1.5 bg-cyan-400/10 border border-cyan-400/20 text-cyan-400 rounded-lg">Upload Data</button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-auto px-6 py-4 space-y-4">
        {chatMessages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-center">
            <div className="w-16 h-16 rounded-2xl bg-purple-400/10 border border-purple-400/20 flex items-center justify-center mb-4 animate-float">
              <Sparkles className="w-7 h-7 text-purple-400" />
            </div>
            <h3 className="font-semibold mb-2">Ask the AI Analyst</h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-sm">
              {table ? `I'm grounded in "${table.name}" — ask me anything about your data.` : 'Upload data first to get grounded AI analysis.'}
            </p>
            {table && (
              <div className="flex flex-wrap gap-2 justify-center">
                {STARTER_QUESTIONS.map(q => (
                  <button
                    key={q}
                    onClick={() => send(q)}
                    className="px-3 py-1.5 glass border border-white/10 rounded-full text-xs text-muted-foreground hover:text-foreground hover:border-purple-400/30 transition-all"
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {chatMessages.map((msg, i) => <MessageBubble key={i} msg={msg} />)}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-6 py-4 border-t border-white/5">
        <div className="flex items-end gap-3">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="Ask anything about your data…"
            rows={2}
            disabled={loading}
            className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm placeholder:text-muted-foreground focus:outline-none focus:border-purple-400/30 resize-none disabled:opacity-50"
          />
          <button
            onClick={() => send()}
            disabled={loading || !input.trim()}
            className="w-11 h-11 flex items-center justify-center bg-purple-400/10 border border-purple-400/20 rounded-xl text-purple-400 hover:bg-purple-400/20 transition-all disabled:opacity-40"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
        {!table && (
          <div className="mt-2 flex items-center gap-2 text-xs text-amber-400">
            <AlertCircle className="w-3 h-3" />
            <span>No data loaded — answers will be general only</span>
          </div>
        )}
      </div>
    </div>
  );
}