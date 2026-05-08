/**
 * AnalystSection v2 — Grounded AI Data Analyst with 7-Step Workflow
 * Uses: executeAnalystWorkflow, StructuredResponse, ThinkingIndicator, useAnalystChat
 */
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWorkspaceStore } from '@/lib/store';
import { useAnalystChat } from '@/hooks/useAnalystChat';
import AnalystMessageBubble from '@/components/workspace/analyst/AnalystMessageBubbleV5';
import { Send, Sparkles, Database, Loader2, Trash2, ChevronRight, Info, Wand2, Bot, Bookmark, Upload } from 'lucide-react';
import { WORKFLOW_STEP_LABELS } from '@/hooks/useAnalystChat';

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

export default function AnalystSection() {
  const { getActiveTable, setActiveSection, saveToDashboard } = useWorkspaceStore();
  const activeTable = getActiveTable();
  const [input, setInput] = useState('');
  const [mode, setMode] = useState('exploratory');
  const { chatMessages, loading, currentStep, sendQuestion, clearChat } = useAnalystChat();
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
        <div className="w-16 h-16 rounded-2xl bg-cyan-400/10 border border-cyan-400/20 flex items-center justify-center mx-auto mb-4">
          <Upload className="w-7 h-7 text-cyan-400" />
        </div>
        <h2 className="text-lg font-semibold mb-2">No Dataset Loaded</h2>
        <p className="text-muted-foreground text-sm mb-2 max-w-sm leading-relaxed">
          Upload a CSV, Excel, or JSON file to start asking questions and getting AI-grounded insights.
        </p>
        <p className="text-xs text-white/30 mb-6">Supported: .csv, .xlsx, .xls, .json, .txt</p>
        <button onClick={() => setActiveSection('intake')}
          className="flex items-center gap-2 px-5 py-2.5 bg-cyan-400 text-xs font-bold rounded-xl hover:bg-cyan-300 transition-colors"
          style={{ color: 'hsl(222,47%,6%)' }}>
          <Upload className="w-4 h-4" /> Upload Data Now
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
          <span className="text-xs px-1.5 py-0.5 rounded-full bg-purple-400/15 text-purple-400 border border-purple-400/25 font-mono">V5</span>
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
                <Sparkles className={`w-3.5 h-3.5 ${activeMode.color}`} /> {activeMode.label} suggestions
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
            <AnalystMessageBubble
              key={i}
              message={msg}
              onSaveChart={handleSaveChart}
              onFollowUp={(q) => handleSend(q)}
            />
          ))}
        </AnimatePresence>

        {loading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
            <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-purple-400/20 to-blue-400/10 border border-purple-400/25 flex items-center justify-center flex-shrink-0 mt-1">
              <Wand2 className="w-3.5 h-3.5 text-purple-400 animate-pulse" />
            </div>
            <div className="flex-1 px-4 py-3 rounded-2xl bg-white/4 border border-white/8 space-y-2">
              <div className="flex items-center gap-3">
                <div className="flex gap-1">
                  {[0,1,2].map(i => (
                    <motion.div key={i} className="w-1.5 h-1.5 rounded-full bg-purple-400"
                      animate={{ scale: [1, 1.4, 1], opacity: [0.5, 1, 0.5] }}
                      transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15 }} />
                  ))}
                </div>
                <span className="text-xs text-purple-300/70 font-medium">
                  Step {currentStep + 1}/10 — {WORKFLOW_STEP_LABELS[currentStep] || 'Processing…'}
                </span>
              </div>
              {/* Mini progress bar */}
              <div className="h-0.5 bg-white/8 rounded-full overflow-hidden">
                <motion.div className="h-full bg-purple-400 rounded-full"
                  animate={{ width: `${((currentStep + 1) / 10) * 100}%` }}
                  transition={{ duration: 0.4 }} />
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
            className="flex-1 bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-white/25 focus:outline-none focus:border-purple-400/40 focus:bg-white/[0.06] resize-none transition-all"
            style={{ minHeight: 44, maxHeight: 120 }}
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || loading}
            className={`w-10 h-10 rounded-xl border flex items-center justify-center transition-all disabled:opacity-30 disabled:cursor-not-allowed ${input.trim() && !loading ? `${activeMode.bg} ${activeMode.border} ${activeMode.color} hover:opacity-80` : 'bg-white/5 border-white/10 text-white/30'}`}
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        <div className="text-xs text-muted-foreground mt-1.5">Press Enter to send · Shift+Enter for new line</div>
      </div>
    </div>
  );
}