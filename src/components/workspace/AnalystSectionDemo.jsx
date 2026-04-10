/**
 * AnalystSectionDemo — AI Analyst powered by real data + AnalystEngine
 */
import { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWorkspaceStore } from '@/lib/store';
import { useAnalystChat } from '@/hooks/useAnalystChat';
import {
  Send, Sparkles, Database, Loader2, Trash2, Bot, User,
  BarChart2, Lightbulb, ArrowRight
} from 'lucide-react';
import { StructuredResponse, ThinkingIndicator } from './analyst/AnalystUIComponents';
import AnalystExportButton from './analyst/AnalystExportButton';
import AnalystChartWithTrendline from './analyst/AnalystChartWithTrendline';

const STARTER_QUESTIONS = [
  'Show me the board summary',
  'Explain the anomalies in this dataset',
  'What does the forecast suggest?',
  'How good is the data quality?',
  'What are the top performing segments?',
  'What should I focus on next?',
];

export default function AnalystSectionDemo() {
  const [input, setInput] = useState('');
  const bottomRef = useRef(null);
  const { getActiveTable, setActiveSection } = useWorkspaceStore();
  const table = getActiveTable();
  const { chatMessages, loading, sendQuestion, clearChat } = useAnalystChat();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, loading]);

  const handleSend = (question) => {
    const q = question || input;
    if (!q.trim() || loading) return;
    setInput('');
    sendQuestion(q);
  };

  if (!table) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[500px] text-center">
        <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/8 flex items-center justify-center mx-auto mb-4">
          <Database className="w-7 h-7 text-white/25" />
        </div>
        <h2 className="text-lg font-semibold mb-2">No Data Loaded</h2>
        <p className="text-sm text-muted-foreground mb-5">Upload and prepare a dataset to use the AI Analyst.</p>
        <button onClick={() => setActiveSection('intake')}
          className="flex items-center gap-2 px-5 py-2.5 bg-cyan-400/10 border border-cyan-400/20 text-cyan-400 rounded-xl text-sm font-semibold hover:bg-cyan-400/15 transition-colors">
          Upload Data <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full relative">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/5 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-purple-400" />
          <span className="font-semibold text-sm">AI Analyst</span>
          <span className="text-xs text-muted-foreground">· {table.name}</span>
          <span className="text-xs text-purple-400 bg-purple-400/10 px-2 py-0.5 rounded-full border border-purple-400/20">
            {table.rowCount?.toLocaleString()} rows
          </span>
        </div>
        <div className="flex items-center gap-2">
          <AnalystExportButton messages={chatMessages} tableName={table?.name} />
          <button onClick={clearChat}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground px-2 py-1.5 rounded-lg hover:bg-white/5 transition-all">
            <Trash2 className="w-3 h-3" /> Clear
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {chatMessages.length === 0 && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 py-6">
            <div className="text-center">
              <div className="w-12 h-12 rounded-2xl bg-purple-400/10 border border-purple-400/20 flex items-center justify-center mx-auto mb-3">
                <Bot className="w-6 h-6 text-purple-400" />
              </div>
              <h3 className="font-semibold mb-1">AI Data Analyst</h3>
              <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                Ask anything about your data. I'll run statistical analysis and give evidence-based insights.
              </p>
            </div>
            <div>
              <div className="text-xs text-white/30 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                <Lightbulb className="w-3 h-3" /> Suggested questions
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {STARTER_QUESTIONS.map(q => (
                  <button key={q} onClick={() => handleSend(q)}
                    className="text-left text-xs p-3 rounded-xl bg-white/3 border border-white/8 hover:border-purple-400/30 hover:bg-purple-400/5 transition-all text-white/55 hover:text-white/85">
                    {q}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        <AnimatePresence>
          {chatMessages.map((msg, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
              {msg.role === 'user' ? (
                <div className="flex gap-3 justify-end">
                  <div className="max-w-[88%] rounded-2xl px-4 py-3 bg-cyan-400/10 border border-cyan-400/20">
                    <p className="text-sm text-foreground">{msg.content}</p>
                  </div>
                  <div className="w-7 h-7 rounded-lg bg-cyan-400/10 border border-cyan-400/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <User className="w-3.5 h-3.5 text-cyan-400" />
                  </div>
                </div>
              ) : (
                <div className="flex gap-3 justify-start">
                  <div className="w-7 h-7 rounded-lg bg-purple-400/10 border border-purple-400/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Bot className="w-3.5 h-3.5 text-purple-400" />
                  </div>
                  <div className="max-w-[88%] space-y-3">
                    {msg.steps?.length > 0 && <ThinkingIndicator step={msg.steps.length} totalSteps={7} />}
                    <StructuredResponse message={msg} />
                    {msg.charts?.length > 0 && (
                      <div className="space-y-2 mt-3">
                        {msg.charts.map((chart, ci) => (
                          <div key={ci} className="rounded-xl overflow-hidden border border-white/8 bg-black/25 p-3">
                            <div className="flex items-center gap-1.5 mb-2">
                              <BarChart2 className="w-3 h-3 text-cyan-400" />
                              <span className="text-xs text-white/45 font-semibold uppercase tracking-widest">{chart.title}</span>
                            </div>
                            <AnalystChartWithTrendline chart={chart} height={220} />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {loading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
            <div className="w-7 h-7 rounded-lg bg-purple-400/10 border border-purple-400/20 flex items-center justify-center flex-shrink-0">
              <Loader2 className="w-3.5 h-3.5 text-purple-400 animate-spin" />
            </div>
            <div className="px-4 py-3 rounded-2xl bg-white/4 border border-white/8 text-sm">
              <div className="text-muted-foreground text-xs mb-1.5">Analyzing your data…</div>
              <div className="flex gap-1">
                {[0, 1, 2].map(i => (
                  <div key={i} className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
            </div>
          </motion.div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-5 py-3.5 border-t border-white/5 flex-shrink-0">
        <div className="flex gap-2.5 items-end">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend(input);
              }
            }}
            placeholder="Ask a question about your data… (Enter to send)"
            rows={1}
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-purple-400/40 resize-none"
            style={{ minHeight: 44, maxHeight: 120 }}
          />
          <button
            onClick={() => handleSend(input)}
            disabled={!input.trim() || loading}
            className="w-10 h-10 rounded-xl border border-purple-400/20 bg-purple-400/10 text-purple-400 flex items-center justify-center transition-all disabled:opacity-40 hover:bg-purple-400/15"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}