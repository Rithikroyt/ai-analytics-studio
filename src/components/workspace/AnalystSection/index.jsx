/**
 * AnalystSection v2 — Grounded AI Data Analyst with 7-Step Workflow
 * Uses: executeAnalystWorkflow, StructuredResponse, ThinkingIndicator, useAnalystChat
 */
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWorkspaceStore } from '@/lib/store';
import { useAnalystChat } from '@/hooks/useAnalystChat';
import { StructuredResponse, ThinkingIndicator } from '@/components/workspace/analyst/AnalystUIComponents';
import AnalystChartWithTrendline from '@/components/workspace/analyst/AnalystChartWithTrendline';
import { Send, Sparkles, Database, Loader2, Trash2, Bot, User, ChevronRight, Bookmark, BarChart2, Info } from 'lucide-react';

const ANALYSIS_MODES = [
  { id: 'exploratory', label: 'Exploratory', color: 'text-cyan-400', bg: 'bg-cyan-400/10', border: 'border-cyan-400/25' },
  { id: 'predictive', label: 'Predictive', color: 'text-purple-400', bg: 'bg-purple-400/10', border: 'border-purple-400/25' },
  { id: 'diagnostic', label: 'Diagnostic', color: 'text-orange-400', bg: 'bg-orange-400/10', border: 'border-orange-400/25' },
  { id: 'prescriptive', label: 'Prescriptive', color: 'text-green-400', bg: 'bg-green-400/10', border: 'border-green-400/25' },
];

const STARTER_QUESTIONS = {
  exploratory: [
    'What does the data distribution look like?',
    'Show me the top segments',
    'What are the key metrics?',
    'Show me correlations between columns',
  ],
  predictive: [
    'What will happen next?',
    'Forecast the primary metric',
    'What predicts the KPI?',
    'Show trend direction',
  ],
  diagnostic: [
    'What are the anomalies?',
    'Why did the metric drop?',
    'Which segments are underperforming?',
    'What is causing the issues?',
  ],
  prescriptive: [
    'What should we focus on?',
    'Generate recommendations',
    'What actions will help?',
    'Create a priority plan',
  ],
};

function MessageBubble({ message, onSaveChart, datasetName, onFollowUp }) {
  const isUser = message.role === 'user';

  if (isUser) {
    return (
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex gap-3 justify-end">
        <div className="max-w-[85%] rounded-2xl px-4 py-3 bg-cyan-400/10 border border-cyan-400/20">
          <p className="text-sm text-foreground">{message.content}</p>
        </div>
        <div className="w-7 h-7 rounded-lg bg-cyan-400/10 border border-cyan-400/20 flex items-center justify-center flex-shrink-0 mt-0.5">
          <User className="w-3.5 h-3.5 text-cyan-400" />
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex gap-3 justify-start">
      <div className="w-7 h-7 rounded-lg bg-purple-400/10 border border-purple-400/20 flex items-center justify-center flex-shrink-0 mt-0.5">
        <Bot className="w-3.5 h-3.5 text-purple-400" />
      </div>
      <div className="max-w-[85%] space-y-3">
        {message.steps?.length > 0 && <ThinkingIndicator step={message.steps.length} totalSteps={7} />}
        <StructuredResponse message={message} onFollowUp={onFollowUp} />
        {message.charts?.length > 0 && (
          <div className="space-y-2">
            {message.charts.map((chart, i) => (
              <div key={i} className="rounded-xl overflow-hidden border border-white/8 bg-black/25 p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-white/45 font-semibold uppercase tracking-widest">
                    <BarChart2 className="w-3 h-3 text-cyan-400 inline mr-1" />{chart.title || 'Chart'}
                  </span>
                  <button onClick={() => onSaveChart(chart)}
                    className="text-xs px-2 py-1 text-cyan-400/70 hover:text-cyan-400 transition-colors">
                    <Bookmark className="w-3 h-3 inline" /> Save
                  </button>
                </div>
                <AnalystChartWithTrendline chart={chart} height={220} />
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default function AnalystSection() {
  const { getActiveTable, setActiveSection, saveToDashboard } = useWorkspaceStore();
  const activeTable = getActiveTable();
  const [input, setInput] = useState('');
  const [mode, setMode] = useState('exploratory');
  const { chatMessages, loading, sendQuestion, clearChat } = useAnalystChat();
  const [savedToast, setSavedToast] = useState('');
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, loading]);

  const handleSend = async (text) => {
    const question = (text || input).trim();
    if (!question) return;
    setInput('');
    await sendQuestion(question);
  };

  const handleSaveChart = (chart) => {
    const lastMessage = chatMessages[chatMessages.length - 1];
    saveToDashboard({
      chart,
      insight: lastMessage?.answer?.slice(0, 200),
      datasetName: activeTable?.name,
      label: chart.title,
    });
    setSavedToast(chart.title || 'Chart');
    setTimeout(() => setSavedToast(''), 2500);
  };

  if (!activeTable) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[500px] text-center">
        <Database className="w-12 h-12 text-muted-foreground mb-4" />
        <h2 className="text-lg font-semibold mb-2">No Data Loaded</h2>
        <p className="text-muted-foreground text-sm mb-6">Upload data in Intake to start asking the AI Analyst.</p>
        <button onClick={() => setActiveSection('intake')}
          className="flex items-center gap-2 px-5 py-2.5 bg-cyan-400/10 border border-cyan-400/20 text-cyan-400 rounded-xl text-sm font-semibold hover:bg-cyan-400/15 transition-colors">
          Upload Data <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    );
  }

  const activeMode = ANALYSIS_MODES.find(m => m.id === mode);
  const suggestions = STARTER_QUESTIONS[mode] || [];

  return (
    <div className="flex flex-col h-full relative">
      {/* Save Toast */}
      <AnimatePresence>
        {savedToast && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="absolute top-16 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-400/15 border border-cyan-400/30 text-cyan-400 text-xs font-medium">
            <Bookmark className="w-3.5 h-3.5" /> "{savedToast}" saved to Dashboard
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/5 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-purple-400" />
          <span className="font-semibold text-sm">AI Analyst</span>
          <span className="text-xs text-muted-foreground">· {activeTable.name} · {activeTable.rowCount?.toLocaleString()} rows</span>
        </div>
        {chatMessages.length > 0 && (
          <button onClick={clearChat} className="flex items-center gap-1.5 text-xs text-white/30 hover:text-white/60 px-2 py-1.5 rounded-lg hover:bg-white/5 transition-all">
            <Trash2 className="w-3 h-3" /> Clear
          </button>
        )}
      </div>

      {/* Mode Selector */}
      <div className="flex items-center gap-1.5 px-5 py-2.5 border-b border-white/5 flex-shrink-0 overflow-x-auto">
        {ANALYSIS_MODES.map(m => (
          <button key={m.id} onClick={() => setMode(m.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap border ${
              mode === m.id ? `${m.color} ${m.bg} ${m.border}` : 'text-white/40 border-transparent hover:text-white/70 hover:bg-white/5'
            }`}>
            {m.label}
          </button>
        ))}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {chatMessages.length === 0 && (
          <div className="space-y-5">
            <div className="text-center py-8">
              <div className="w-12 h-12 rounded-2xl bg-purple-400/10 border border-purple-400/20 flex items-center justify-center mx-auto mb-3">
                <Bot className="w-6 h-6 text-purple-400" />
              </div>
              <h3 className="font-semibold mb-1">Ask Me Anything</h3>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">I'll analyze trends, explain anomalies, forecast, identify correlations, and recommend actions. All grounded in your data.</p>
            </div>

            <div>
              <div className="text-xs text-white/30 uppercase tracking-widest mb-3 flex items-center gap-2">
                <activeMode.icon className={`w-3.5 h-3.5 ${activeMode.color}`} /> {activeMode.label} suggestions
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {suggestions.map(q => (
                  <button key={q} onClick={() => handleSend(q)}
                    className="text-left text-xs p-3 rounded-xl bg-white/3 border border-white/7 hover:border-purple-400/30 hover:bg-purple-400/5 transition-all text-white/55 hover:text-white/85">
                    {q}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-start gap-2 p-3 rounded-xl bg-blue-400/5 border border-blue-400/15 text-xs text-blue-300/80">
              <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              This AI analyst uses pre-computed statistics, anomaly detection, forecasting, and your workspace data to provide grounded insights with confidence scoring.
            </div>
          </div>
        )}

        <AnimatePresence>
          {chatMessages.map((msg, i) => (
            <MessageBubble
              key={i}
              message={msg}
              onSaveChart={handleSaveChart}
              datasetName={activeTable?.name}
              onFollowUp={handleSend}
            />
          ))}
        </AnimatePresence>

        {loading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
            <div className="w-7 h-7 rounded-lg bg-purple-400/10 border border-purple-400/20 flex items-center justify-center flex-shrink-0">
              <Loader2 className="w-3.5 h-3.5 text-purple-400 animate-spin" />
            </div>
            <div className="px-4 py-3 rounded-2xl bg-white/4 border border-white/8">
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
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder={`Ask in ${activeMode.label} mode…`}
            rows={1}
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-purple-400/40 resize-none"
            style={{ minHeight: 44, maxHeight: 120 }}
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || loading}
            className={`w-10 h-10 rounded-xl border flex items-center justify-center transition-all disabled:opacity-40 ${activeMode.bg} ${activeMode.border} ${activeMode.color} hover:opacity-80`}
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        <div className="text-xs text-muted-foreground mt-1.5">Press Enter to send · Shift+Enter for new line</div>
      </div>
    </div>
  );
}