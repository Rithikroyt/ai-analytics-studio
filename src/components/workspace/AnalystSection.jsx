/**
 * AnalystSection — AI Chat Analyst with inline chart visualization
 */
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWorkspaceStore } from '@/lib/store';
import { base44 } from '@/api/base44Client';
import { Send, Sparkles, Database, Loader2, Trash2, Bot, User } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import {
  BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

const CHART_COLORS = ['#00e5ff', '#ff2d7a', '#7b2fff', '#ff6b35', '#4caf50', '#ffcc02', '#00bfa5'];

const SUGGESTIONS = [
  'Show me a chart of top segments by revenue',
  'What are the top trends? Show with a chart.',
  'Which segment is performing best? Visualize it.',
  'Are there any anomalies? Show with a chart.',
  'Give me a breakdown chart of this data.',
  'What actions should I take based on this data?',
];

const fmtV = (v) => {
  if (v == null || isNaN(v)) return v;
  const n = Number(v);
  if (Math.abs(n) >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (Math.abs(n) >= 1e3) return `${(n / 1e3).toFixed(0)}K`;
  return n.toLocaleString(undefined, { maximumFractionDigits: 1 });
};

const tooltipStyle = {
  backgroundColor: 'rgba(10,8,20,0.95)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 8,
  fontSize: 11,
  color: '#e2e8f0',
};

function InlineChart({ chart }) {
  if (!chart?.data?.length) return null;
  const { type, data, title, x_key = 'name', y_key = 'value' } = chart;

  return (
    <div className="mt-3 rounded-xl overflow-hidden border border-white/8 bg-black/20 p-3">
      {title && <div className="text-xs text-white/50 mb-2 font-semibold uppercase tracking-widest">{title}</div>}
      <ResponsiveContainer width="100%" height={200}>
        {type === 'pie' || type === 'donut' ? (
          <PieChart>
            <Pie data={data} dataKey={y_key} nameKey={x_key}
              cx="50%" cy="50%"
              innerRadius={type === 'donut' ? '45%' : 0}
              outerRadius="70%" paddingAngle={2}>
              {data.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
            </Pie>
            <Tooltip contentStyle={tooltipStyle} formatter={(v) => [fmtV(v), '']} />
            <Legend wrapperStyle={{ fontSize: 10, color: 'rgba(255,255,255,0.5)' }} />
          </PieChart>
        ) : type === 'area' || type === 'line' ? (
          <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 4, left: 0 }}>
            <defs>
              <linearGradient id="analyst-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#00e5ff" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#00e5ff" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis dataKey={x_key} tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.3)' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
            <YAxis tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.3)' }} tickLine={false} axisLine={false} tickFormatter={fmtV} width={40} />
            <Tooltip contentStyle={tooltipStyle} formatter={(v) => [fmtV(v), y_key]} />
            <Area type="monotone" dataKey={y_key} stroke="#00e5ff" fill="url(#analyst-grad)" strokeWidth={2} dot={false} />
          </AreaChart>
        ) : (
          // default: bar
          <BarChart data={data} layout={data.length > 6 ? 'vertical' : 'horizontal'} margin={{ top: 4, right: 4, bottom: 4, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            {data.length > 6 ? (
              <>
                <XAxis type="number" tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.3)' }} tickFormatter={fmtV} tickLine={false} axisLine={false} />
                <YAxis dataKey={x_key} type="category" tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.4)' }} tickLine={false} axisLine={false} width={80} />
              </>
            ) : (
              <>
                <XAxis dataKey={x_key} tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.3)' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.3)' }} tickFormatter={fmtV} tickLine={false} axisLine={false} width={40} />
              </>
            )}
            <Tooltip contentStyle={tooltipStyle} formatter={(v) => [fmtV(v), y_key]} />
            <Bar dataKey={y_key} radius={[4, 4, 0, 0]}>
              {data.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} fillOpacity={0.85} />)}
            </Bar>
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}

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
          <>
            <ReactMarkdown
              className="prose prose-sm prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
              components={{
                p: ({ children }) => <p className="my-1 leading-relaxed">{children}</p>,
                ul: ({ children }) => <ul className="my-1 ml-4 list-disc">{children}</ul>,
                ol: ({ children }) => <ol className="my-1 ml-4 list-decimal">{children}</ol>,
                li: ({ children }) => <li className="my-0.5">{children}</li>,
                h2: ({ children }) => <h2 className="text-sm font-semibold my-2 text-cyan-400">{children}</h2>,
                h3: ({ children }) => <h3 className="text-sm font-semibold my-1.5 text-white/80">{children}</h3>,
                strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
                code: ({ inline, children }) => inline
                  ? <code className="px-1 py-0.5 rounded bg-white/10 text-cyan-300 text-xs font-mono">{children}</code>
                  : <pre className="bg-black/30 rounded-lg p-3 overflow-x-auto my-2 text-xs font-mono"><code>{children}</code></pre>,
              }}
            >
              {message.content}
            </ReactMarkdown>
            {message.chart && <InlineChart chart={message.chart} />}
          </>
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
    const sample = activeTable.rows?.slice(0, 5).map(r => JSON.stringify(r)).join('\n') || '';
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
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are an expert data analyst AI. Answer the user's question about their dataset with deep, evidence-based insights AND generate chart data to visualize the answer.

DATASET CONTEXT:
${context}

USER QUESTION: ${question}

Return a JSON response with:
1. "answer": A thorough markdown response including Direct Answer, Evidence, Key Insights, and Recommendations.
2. "chart": An object with chart data to visualize the answer. Include:
   - "type": one of "bar", "area", "line", "donut", "pie"
   - "title": short chart title
   - "data": array of objects with "name" and "value" keys (max 10 items)
   - "x_key": "name"
   - "y_key": "value"
   
   Build the chart data from the actual dataset context provided. Compute aggregations from the sample rows and use realistic numbers.
   If the question doesn't need a chart (e.g. just asking for recommendations), set "chart" to null.`,
        response_json_schema: {
          type: 'object',
          properties: {
            answer: { type: 'string' },
            chart: {
              type: ['object', 'null'],
              properties: {
                type: { type: 'string' },
                title: { type: 'string' },
                data: { type: 'array', items: { type: 'object' } },
                x_key: { type: 'string' },
                y_key: { type: 'string' },
              },
            },
          },
        },
      });

      addChatMessage({
        role: 'assistant',
        content: result?.answer || String(result),
        chart: result?.chart || null,
      });
    } catch (e) {
      addChatMessage({ role: 'assistant', content: `Sorry, I encountered an error: ${e.message}`, chart: null });
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
              <p className="text-sm text-muted-foreground">I'll answer with insights and generate charts to visualize the data.</p>
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
              Analyzing and generating chart…
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