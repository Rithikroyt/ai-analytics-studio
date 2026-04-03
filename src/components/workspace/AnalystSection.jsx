/**
 * AnalystSection — AI Chat Analyst
 * Ask questions in plain English and get deep, evidence-based answers.
 */
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWorkspaceStore } from '@/lib/store';
import { base44 } from '@/api/base44Client';
import { Send, Sparkles, Database, Loader2, Trash2, Bot, User, AlertCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

const SUGGESTIONS = [
  'What are the top trends in this dataset?',
  'Which segment is performing best and why?',
  'Are there any anomalies I should be concerned about?',
  'Give me an executive summary of this data.',
  'What are the key correlations between columns?',
  'What actions should I take based on this data?',
];

function MessageBubble({ message }) {
  const isUser = message.role === 'user';
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      {!isUser && (
        <div className="w-7 h-7 rounded-lg bg-purple-400/10 border border-purple-400/20 flex items-center justify-center flex-shrink-0 mt-0.5">
          <Bot className="w-3.5 h-3.5 text-purple-400" />
        </div>
      )}
      <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
        isUser
          ? 'bg-cyan-400/10 border border-cyan-400/20 text-foreground'
          : 'bg-white/4 border border-white/8 text-foreground/90'
      }`}>
        {isUser ? (
          <p>{message.content}</p>
        ) : (
          <ReactMarkdown
            className="prose prose-sm prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
            components={{
              p: ({ children }) => <p className="my-1 leading-relaxed">{children}</p>,
              ul: ({ children }) => <ul className="my-1 ml-4 list-disc">{children}</ul>,
              ol: ({ children }) => <ol className="my-1 ml-4 list-decimal">{children}</ol>,
              li: ({ children }) => <li className="my-0.5">{children}</li>,
              h1: ({ children }) => <h1 className="text-base font-bold my-2">{children}</h1>,
              h2: ({ children }) => <h2 className="text-sm font-semibold my-2 text-cyan-400">{children}</h2>,
              h3: ({ children }) => <h3 className="text-sm font-semibold my-1.5 text-white/80">{children}</h3>,
              strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
              code: ({ inline, children }) => inline
                ? <code className="px-1 py-0.5 rounded bg-white/10 text-cyan-300 text-xs font-mono">{children}</code>
                : <pre className="bg-black/30 rounded-lg p-3 overflow-x-auto my-2 text-xs font-mono"><code>{children}</code></pre>,
              blockquote: ({ children }) => <blockquote className="border-l-2 border-cyan-400/40 pl-3 my-2 text-white/60 italic">{children}</blockquote>,
            }}
          >
            {message.content}
          </ReactMarkdown>
        )}
      </div>
      {isUser && (
        <div className="w-7 h-7 rounded-lg bg-cyan-400/10 border border-cyan-400/20 flex items-center justify-center flex-shrink-0 mt-0.5">
          <User className="w-3.5 h-3.5 text-cyan-400" />
        </div>
      )}
    </motion.div>
  );
}

export default function AnalystSection() {
  const { getActiveTable, analysisResults, chatMessages, addChatMessage, clearChat } = useWorkspaceStore();
  const activeTable = getActiveTable();
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, loading]);

  const buildContext = () => {
    if (!activeTable) return '';
    const cols = activeTable.columns?.map(c => `${c.name}(${c.type})`).join(', ') || '';
    const sample = activeTable.rows?.slice(0, 3).map(r => JSON.stringify(r)).join('\n') || '';
    const stats = analysisResults
      ? `Primary KPI: ${analysisResults.primaryLabel}, Total: ${analysisResults.totalValue}, Growth: ${analysisResults.growthRate}%, Anomalies: ${analysisResults.anomalies?.length || 0}`
      : '';
    return `Dataset: "${activeTable.name}" | ${activeTable.rowCount} rows | Columns: ${cols}\nSample rows:\n${sample}\n${stats}`;
  };

  const handleSend = async (text) => {
    const question = (text || input).trim();
    if (!question || loading) return;
    setInput('');

    addChatMessage({ role: 'user', content: question });
    setLoading(true);

    try {
      const context = buildContext();
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `You are an expert data analyst AI. Answer the user's question about their dataset with deep, evidence-based insights.

DATASET CONTEXT:
${context}

USER QUESTION: ${question}

Provide a thorough, structured response using markdown. Include:
- **Direct Answer** to the question
- **Evidence** from the data (specific numbers, percentages, column values)
- **Key Insights** (2-3 bullet points)
- **Recommendations** if applicable

Be specific, quantitative, and actionable. Use the actual data context provided.`,
      });

      addChatMessage({ role: 'assistant', content: response });
    } catch (e) {
      addChatMessage({ role: 'assistant', content: `Sorry, I encountered an error: ${e.message}` });
    }
    setLoading(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!activeTable) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <Database className="w-12 h-12 text-muted-foreground mb-4" />
        <h2 className="text-lg font-semibold mb-2">No Data Loaded</h2>
        <p className="text-sm text-muted-foreground">Upload and prepare a dataset first to use the AI Analyst.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-purple-400" />
          <span className="font-semibold text-sm">AI Analyst</span>
          <span className="text-xs text-muted-foreground">· {activeTable.name}</span>
        </div>
        {chatMessages.length > 0 && (
          <button onClick={clearChat} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
            <Trash2 className="w-3.5 h-3.5" /> Clear
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {chatMessages.length === 0 && (
          <div className="space-y-6">
            <div className="text-center py-8">
              <div className="w-12 h-12 rounded-2xl bg-purple-400/10 border border-purple-400/20 flex items-center justify-center mx-auto mb-3">
                <Bot className="w-6 h-6 text-purple-400" />
              </div>
              <h3 className="font-semibold mb-1">Ask me anything about your data</h3>
              <p className="text-sm text-muted-foreground">I have full context of your dataset and analysis results.</p>
            </div>
            <div>
              <div className="text-xs text-muted-foreground uppercase tracking-widest mb-3">Suggested Questions</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {SUGGESTIONS.map((s) => (
                  <button key={s} onClick={() => handleSend(s)}
                    className="text-left text-xs p-3 rounded-xl bg-white/3 border border-white/8 hover:border-purple-400/30 hover:bg-purple-400/5 transition-all text-white/60 hover:text-white/90">
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        <AnimatePresence>
          {chatMessages.map((msg, i) => (
            <MessageBubble key={i} message={msg} />
          ))}
        </AnimatePresence>

        {loading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
            <div className="w-7 h-7 rounded-lg bg-purple-400/10 border border-purple-400/20 flex items-center justify-center flex-shrink-0">
              <Loader2 className="w-3.5 h-3.5 text-purple-400 animate-spin" />
            </div>
            <div className="px-4 py-3 rounded-2xl bg-white/4 border border-white/8 text-sm text-muted-foreground">
              Analyzing your data…
            </div>
          </motion.div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-6 py-4 border-t border-white/5 flex-shrink-0">
        <div className="flex gap-3 items-end">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a question about your data…"
            rows={1}
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-purple-400/40 resize-none"
            style={{ minHeight: 44, maxHeight: 120 }}
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || loading}
            className="w-10 h-10 rounded-xl bg-purple-400/10 border border-purple-400/20 flex items-center justify-center text-purple-400 hover:bg-purple-400/20 transition-colors disabled:opacity-40"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        <div className="text-xs text-muted-foreground mt-2">Press Enter to send · Shift+Enter for new line</div>
      </div>
    </div>
  );
}