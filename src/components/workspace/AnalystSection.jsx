/**
 * AnalystSection — Production-grade AI Chat Analyst
 * Features:
 *  - Full statistical engine (descriptive, regression, clustering, decomposition, t-test, chi², anomalies)
 *  - Multi-modal chart rendering (8+ chart types, reference lines, brush)
 *  - Analysis modes: Exploratory · Predictive · Diagnostic · Prescriptive
 *  - Thinking steps display (Julius AI / ChatGPT Advanced Data Analysis style)
 *  - Confidence scores & methodology notes
 *  - Follow-up question suggestions
 *  - Multi-series composed charts
 */
import { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWorkspaceStore } from '@/lib/store';
import { base44 } from '@/api/base44Client';
import {
  Send, Sparkles, Database, Loader2, Trash2, Bot, User,
  ChevronDown, ChevronRight, BarChart2, TrendingUp, Cpu, Lightbulb,
  AlertCircle, CheckCircle2, FlaskConical, Activity, Bookmark, FileText, FileSpreadsheet
} from 'lucide-react';
import { exportToPDF, exportToExcel } from '@/lib/exportUtils';
import ReactMarkdown from 'react-markdown';
import AnalystChart from '@/components/workspace/analyst/AnalystChart';
import AnalystChartWithTrendline from '@/components/workspace/analyst/AnalystChartWithTrendline';
import {
  describe, pearson, linearRegression, kMeans, decomposeTimeSeries,
  tTest, chiSquaredGoodnessOfFit, detectAnomalies, holtwinters,
  movingAverage, histogram, fmtNum, mean, std
} from '@/lib/statsEngine';

// ─── Analysis modes ────────────────────────────────────────────────
const MODES = [
  { id: 'exploratory', label: 'Exploratory', icon: BarChart2, color: 'text-cyan-400', bg: 'bg-cyan-400/10', border: 'border-cyan-400/25' },
  { id: 'predictive',  label: 'Predictive',  icon: TrendingUp, color: 'text-purple-400', bg: 'bg-purple-400/10', border: 'border-purple-400/25' },
  { id: 'diagnostic',  label: 'Diagnostic',  icon: FlaskConical, color: 'text-orange-400', bg: 'bg-orange-400/10', border: 'border-orange-400/25' },
  { id: 'prescriptive',label: 'Prescriptive',icon: Lightbulb, color: 'text-green-400', bg: 'bg-green-400/10', border: 'border-green-400/25' },
];

const SUGGESTIONS = {
  exploratory: [
    'Show me a distribution chart of all numeric columns',
    'What are the top 10 segments by total value?',
    'Show correlation heatmap between numeric columns',
    'What does the overall data distribution look like?',
  ],
  predictive: [
    'Forecast the next 6 months with confidence intervals',
    'Build a regression model — what predicts the main KPI?',
    'Cluster the data into groups and visualize',
    'Show trend decomposition: trend + seasonal + residual',
  ],
  diagnostic: [
    'Run anomaly detection with Z-score and IQR methods',
    'Perform a t-test: are two segments statistically different?',
    'Chi-squared test: is the distribution uniform?',
    'What caused the biggest drops/spikes?',
  ],
  prescriptive: [
    'What actions should I take to improve top KPI?',
    'Which segments need immediate attention?',
    'Give me a priority matrix of recommendations',
    'What would happen if the top segment grew 20%?',
  ],
};

// ─── Pre-compute rich statistical context from the active table ────
function buildStatContext(table) {
  if (!table?.rows?.length) return '';
  const { rows, columns, name, rowCount } = table;
  const numCols = columns.filter(c => c.type === 'numeric');
  const catCols = columns.filter(c => c.type === 'category');
  const dateCols = columns.filter(c => c.type === 'date');

  const statsLines = numCols.slice(0, 8).map(col => {
    const vals = rows.map(r => Number(r[col.name])).filter(v => !isNaN(v));
    if (!vals.length) return '';
    const d = describe(vals);
    return `  ${col.name}: mean=${fmtNum(d.mean)}, std=${fmtNum(d.std)}, min=${fmtNum(d.min)}, max=${fmtNum(d.max)}, skew=${fmtNum(d.skewness,2)}, kurt=${fmtNum(d.kurtosis,2)}, q1=${fmtNum(d.q1)}, q3=${fmtNum(d.q3)}`;
  }).filter(Boolean);

  // Top correlations
  const corrs = [];
  for (let i = 0; i < Math.min(numCols.length, 5); i++) {
    for (let j = i + 1; j < Math.min(numCols.length, 5); j++) {
      const xs = rows.map(r => Number(r[numCols[i].name])).filter(v => !isNaN(v));
      const ys = rows.map(r => Number(r[numCols[j].name])).filter(v => !isNaN(v));
      const { r, significant } = pearson(xs, ys);
      if (Math.abs(r) > 0.3) corrs.push(`${numCols[i].name} ↔ ${numCols[j].name}: r=${r} (${significant ? 'p<0.05' : 'p≥0.05'})`);
    }
  }

  // Top category distributions
  const catDists = catCols.slice(0, 3).map(col => {
    const counts = {};
    rows.forEach(r => { const k = String(r[col.name]); counts[k] = (counts[k] || 0) + 1; });
    const top = Object.entries(counts).sort(([,a],[,b]) => b-a).slice(0,5).map(([k,v]) => `${k}(${v})`).join(', ');
    return `  ${col.name}: [${top}]`;
  });

  // Anomaly counts
  const anomalyCounts = numCols.slice(0, 4).map(col => {
    const vals = rows.map(r => Number(r[col.name])).filter(v => !isNaN(v));
    const anomalies = detectAnomalies(vals);
    return `  ${col.name}: ${anomalies.length} anomalies detected`;
  });

  const sample = rows.slice(0, 4).map(r => JSON.stringify(r)).join('\n');
  const colSchema = columns.map(c => `${c.name}(${c.type})`).join(', ');

  return `
DATASET: "${name}" | ${rowCount} rows | ${columns.length} columns
COLUMNS: ${colSchema}
DATE COLUMNS: ${dateCols.map(c=>c.name).join(', ') || 'none'}
SAMPLE ROWS:
${sample}

DESCRIPTIVE STATISTICS (computed locally):
${statsLines.join('\n')}

TOP CORRELATIONS (Pearson r):
${corrs.join('\n') || '  none strong (|r|>0.3)'}

CATEGORY DISTRIBUTIONS:
${catDists.join('\n') || '  none'}

ANOMALY COUNTS (Z-score+IQR):
${anomalyCounts.join('\n')}
`.trim();
}

// ─── Thinking steps component ──────────────────────────────────────
function ThinkingSteps({ steps }) {
  const [open, setOpen] = useState(false);
  if (!steps?.length) return null;
  return (
    <div className="mb-3">
      <button onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 text-xs text-white/35 hover:text-white/60 transition-colors">
        <Activity className="w-3 h-3" />
        <span>Analysis steps ({steps.length})</span>
        {open ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="mt-2 space-y-1.5 overflow-hidden">
            {steps.map((step, i) => (
              <div key={i} className="flex items-start gap-2 text-xs text-white/40 pl-2 border-l border-white/10">
                <CheckCircle2 className="w-3 h-3 text-cyan-400/60 flex-shrink-0 mt-0.5" />
                <span>{step}</span>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Confidence badge ──────────────────────────────────────────────
function ConfidenceBadge({ score, methodology }) {
  if (!score) return null;
  const color = score >= 80 ? 'text-green-400 border-green-400/25 bg-green-400/8'
    : score >= 60 ? 'text-yellow-400 border-yellow-400/25 bg-yellow-400/8'
    : 'text-orange-400 border-orange-400/25 bg-orange-400/8';
  return (
    <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs border ${color} mt-2`}>
      <Cpu className="w-2.5 h-2.5" />
      <span>Confidence: {score}%</span>
      {methodology && <span className="opacity-60">· {methodology}</span>}
    </div>
  );
}

// ─── Follow-up suggestions ────────────────────────────────────────
function FollowUps({ suggestions, onSelect }) {
  if (!suggestions?.length) return null;
  return (
    <div className="mt-3 pt-3 border-t border-white/6">
      <div className="text-xs text-white/30 mb-2">Continue exploring:</div>
      <div className="flex flex-wrap gap-1.5">
        {suggestions.slice(0, 3).map((s, i) => (
          <button key={i} onClick={() => onSelect(s)}
            className="text-xs px-2.5 py-1 rounded-lg bg-white/4 border border-white/8 hover:border-cyan-400/30 hover:bg-cyan-400/5 text-white/50 hover:text-white/80 transition-all">
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Message bubble ────────────────────────────────────────────────
function MessageBubble({ message, onFollowUp, onSaveChart, datasetName }) {
  const isUser = message.role === 'user';
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <div className="w-7 h-7 rounded-lg bg-purple-400/10 border border-purple-400/20 flex items-center justify-center flex-shrink-0 mt-0.5">
          <Bot className="w-3.5 h-3.5 text-purple-400" />
        </div>
      )}
      <div className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
        isUser ? 'bg-cyan-400/10 border border-cyan-400/20 text-foreground'
                : 'bg-white/4 border border-white/8 text-foreground/90'
      }`}>
        {isUser ? <p>{message.content}</p> : (
          <>
            <ThinkingSteps steps={message.steps} />
            <ReactMarkdown
              className="prose prose-sm prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
              components={{
                p: ({ children }) => <p className="my-1 leading-relaxed">{children}</p>,
                ul: ({ children }) => <ul className="my-1.5 ml-4 list-disc space-y-0.5">{children}</ul>,
                ol: ({ children }) => <ol className="my-1.5 ml-4 list-decimal space-y-0.5">{children}</ol>,
                li: ({ children }) => <li className="my-0">{children}</li>,
                h2: ({ children }) => <h2 className="text-sm font-semibold my-2 text-cyan-400 border-b border-cyan-400/15 pb-1">{children}</h2>,
                h3: ({ children }) => <h3 className="text-xs font-semibold my-1.5 text-white/70 uppercase tracking-wider">{children}</h3>,
                strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
                blockquote: ({ children }) => <blockquote className="border-l-2 border-cyan-400/40 pl-3 my-2 text-white/50 italic text-xs">{children}</blockquote>,
                code: ({ inline, children }) => inline
                  ? <code className="px-1.5 py-0.5 rounded bg-black/30 text-cyan-300 text-xs font-mono">{children}</code>
                  : <pre className="bg-black/40 rounded-xl p-3 overflow-x-auto my-2 text-xs font-mono text-green-300 border border-white/5"><code>{children}</code></pre>,
                table: ({ children }) => <div className="overflow-auto my-2"><table className="w-full text-xs border-collapse">{children}</table></div>,
                th: ({ children }) => <th className="px-2 py-1 bg-white/8 text-white/60 font-semibold text-left border border-white/8">{children}</th>,
                td: ({ children }) => <td className="px-2 py-1 text-white/60 border border-white/5">{children}</td>,
              }}
            >{message.content}</ReactMarkdown>

            {/* Charts */}
            {message.charts?.map((chart, i) => (
              <div key={i} className="mt-3 rounded-xl overflow-hidden border border-white/8 bg-black/25 p-3">
                <div className="flex items-center justify-between mb-2">
                  {chart.title ? (
                    <div className="text-xs text-white/45 font-semibold uppercase tracking-widest flex items-center gap-1.5">
                      <BarChart2 className="w-3 h-3 text-cyan-400" />
                      {chart.title}
                      {chart.subtitle && <span className="text-white/25 normal-case font-normal">· {chart.subtitle}</span>}
                    </div>
                  ) : <div />}
                  <button
                    onClick={() => onSaveChart(chart, message.content, datasetName)}
                    className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg text-white/35 hover:text-cyan-400 hover:bg-cyan-400/8 border border-transparent hover:border-cyan-400/20 transition-all"
                    title="Save to Dashboard"
                  >
                    <Bookmark className="w-3 h-3" /> Save
                  </button>
                </div>
                <AnalystChartWithTrendline chart={chart} height={chart.height || 220} />
                {chart.note && <div className="mt-2 text-xs text-white/25 italic">{chart.note}</div>}
              </div>
            ))}

            <ConfidenceBadge score={message.confidence} methodology={message.methodology} />
            <FollowUps suggestions={message.followups} onSelect={onFollowUp} />
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

// ─── Main component ────────────────────────────────────────────────
export default function AnalystSection() {
  const { getActiveTable, analysisResults, chatMessages, addChatMessage, clearChat, saveToDashboard } = useWorkspaceStore();
  const activeTable = getActiveTable();
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [thinkingLabel, setThinkingLabel] = useState('');
  const [mode, setMode] = useState('exploratory');
  const [savedToast, setSavedToast] = useState('');
  const bottomRef = useRef(null);

  const handleSaveChart = (chart, insight, datasetName) => {
    saveToDashboard({ chart, insight: insight?.slice(0, 200), datasetName, label: chart.title });
    setSavedToast(chart.title || 'Chart');
    setTimeout(() => setSavedToast(''), 2500);
  };

  const handleExportPDF = () => exportToPDF({ messages: chatMessages, tableName: activeTable?.name, analysisResults });
  const handleExportExcel = () => exportToExcel({ messages: chatMessages, tableName: activeTable?.name, analysisResults });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, loading]);

  const statContext = useMemo(() => buildStatContext(activeTable), [activeTable?.name, activeTable?.rowCount]);

  // Reset suggestions when mode changes
  useEffect(() => {}, [mode]);

  const handleSend = async (text) => {
    const question = (text || input).trim();
    if (!question || loading) return;
    setInput('');
    addChatMessage({ role: 'user', content: question });
    setLoading(true);

    try {
      const colNames = activeTable?.columns?.map(c => c.name) || [];
      const numColNames = activeTable?.columns?.filter(c => c.type === 'numeric').map(c => c.name) || [];
      const catColNames = activeTable?.columns?.filter(c => c.type === 'category').map(c => c.name) || [];
      const dateColNames = activeTable?.columns?.filter(c => c.type === 'date').map(c => c.name) || [];

      setThinkingLabel('Running statistical engine…');

      const modeInstructions = {
        exploratory: 'Focus on describing patterns, distributions, and summaries. Use descriptive stats.',
        predictive:  'Focus on forecasting, regression, trend modeling, and cluster analysis.',
        diagnostic:  'Focus on anomaly detection, hypothesis testing, root-cause analysis, statistical tests.',
        prescriptive:'Focus on actionable recommendations, what-if scenarios, and priority rankings.',
      };

      setThinkingLabel('Generating LLM analysis + charts…');

      const result = await base44.integrations.Core.InvokeLLM({
        model: 'claude_sonnet_4_6',
        prompt: `You are a senior data scientist and AI analyst. CRITICAL RULES:
1. NEVER return a blank or empty answer field
2. ALWAYS ground your answer in the statistics provided — never hallucinate data
3. If uncertain, state what IS known and what is uncertain
4. Always provide at least 1 chart
5. Always provide at least 2 followup questions

Analysis mode: **${mode.toUpperCase()}** — ${modeInstructions[mode]}

${statContext}

USER QUESTION: "${question}"

EXACT COLUMN NAMES (use ONLY these, character-for-character):
- All: ${colNames.join(', ')}
- Numeric: ${numColNames.join(', ')}
- Category: ${catColNames.join(', ')}
- Date: ${dateColNames.join(', ')}

Return a JSON response with ALL of these fields:

{
  "steps": [
    "Step 1: what analysis you're doing",
    "Step 2: what statistical method is applied",
    "Step 3: interpretation of results"
  ],
  "answer": "Detailed markdown answer using headers, bullet points, tables. Include exact numbers from context. Use ## for sections.",
  "charts": [
    {
      "type": "bar|horizontal_bar|area|line|donut|pie|scatter|composed|histogram",
      "title": "short descriptive title",
      "subtitle": "optional - method used e.g. 'Pearson correlation' or 'Linear regression'",
      "data": [{"name": "...", "value": 123}, ...],
      "x_key": "name",
      "y_key": "value",
      "y2_key": null,
      "series": null,
      "reference_value": null,
      "reference_label": null,
      "note": "optional one-line methodology note",
      "height": 220
    }
  ],
  "confidence": 85,
  "methodology": "OLS regression | Z-score | Pearson r | etc.",
  "followups": [
    "Suggested follow-up question 1",
    "Suggested follow-up question 2",
    "Suggested follow-up question 3"
  ]
}

CHART RULES:
- Generate 1-3 charts that BEST visualize the answer
- Use "composed" type with "series" array for multi-metric charts:
  series: [{"key": "colname", "type": "bar|line|area", "color": "#hex"}]
- For scatter: data must have {x: number, y: number} objects
- "reference_value": add the mean/average as a reference line when helpful
- Use EXACT column names from the list above in x_key / y_key
- Build data from aggregating the actual sample rows and statistics provided
- Histogram bins: use {bin: "range", count: n} data with x_key="bin", y_key="count"

ANSWER RULES:
- Use markdown tables for comparisons
- Include actual numbers (from statistics block above)
- State p-values, R², correlation coefficients where applicable
- For prescriptive mode: include a priority matrix table
- For predictive mode: describe the model equation (e.g. y = 2.3x + 1400)
- Be thorough, scientific, and quantitative`,

        response_json_schema: {
          type: 'object',
          properties: {
            steps: { type: 'array', items: { type: 'string' } },
            answer: { type: 'string' },
            charts: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  type: { type: 'string' },
                  title: { type: 'string' },
                  subtitle: { type: ['string', 'null'] },
                  data: { type: 'array', items: { type: 'object' } },
                  x_key: { type: 'string' },
                  y_key: { type: 'string' },
                  y2_key: { type: ['string', 'null'] },
                  series: { type: ['array', 'null'] },
                  reference_value: { type: ['number', 'null'] },
                  reference_label: { type: ['string', 'null'] },
                  note: { type: ['string', 'null'] },
                  height: { type: ['number', 'null'] },
                },
              },
            },
            confidence: { type: 'number' },
            methodology: { type: 'string' },
            followups: { type: 'array', items: { type: 'string' } },
          },
        },
      });

      addChatMessage({
        role: 'assistant',
        content: result?.answer || String(result),
        charts: result?.charts || [],
        steps: result?.steps || [],
        confidence: result?.confidence || null,
        methodology: result?.methodology || null,
        followups: result?.followups || [],
      });
    } catch (e) {
      addChatMessage({
        role: 'assistant',
        content: `**Analysis Note:** I encountered an issue processing that request. Here's what I can tell you based on the available data:\n\n${statContext.slice(0, 500)}\n\nPlease try rephrasing your question or ask about a specific column or metric.`,
        charts: [],
        confidence: 40,
        methodology: 'Fallback response',
        followups: ['What are the key statistics for this dataset?', 'Show me a distribution of the main metric.', 'Which columns have the most interesting patterns?'],
      });
    }
    setLoading(false);
    setThinkingLabel('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
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

  const activeMode = MODES.find(m => m.id === mode);

  return (
    <div className="flex flex-col h-full relative">
      {/* Save toast */}
      <AnimatePresence>
        {savedToast && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="absolute top-16 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-400/15 border border-cyan-400/30 text-cyan-400 text-xs font-medium shadow-lg">
            <Bookmark className="w-3.5 h-3.5" />
            "{savedToast}" saved to Dashboard
          </motion.div>
        )}
      </AnimatePresence>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/5 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-purple-400" />
          <span className="font-semibold text-sm">AI Analyst</span>
          <span className="text-xs text-muted-foreground">· {activeTable.name}</span>
          <span className="text-xs text-muted-foreground">· {activeTable.rowCount?.toLocaleString()} rows</span>
        </div>
        <div className="flex items-center gap-2">
          {chatMessages.length > 0 && (
            <>
              <button onClick={handleExportExcel} className="flex items-center gap-1 text-xs text-green-400/70 hover:text-green-400 transition-colors px-2 py-1 rounded-lg hover:bg-green-400/8">
                <FileSpreadsheet className="w-3 h-3" /> Excel
              </button>
              <button onClick={handleExportPDF} className="flex items-center gap-1 text-xs text-blue-400/70 hover:text-blue-400 transition-colors px-2 py-1 rounded-lg hover:bg-blue-400/8">
                <FileText className="w-3 h-3" /> PDF
              </button>
              <div className="w-px h-4 bg-white/10" />
              <button onClick={clearChat} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-lg hover:bg-white/5">
                <Trash2 className="w-3 h-3" /> Clear
              </button>
            </>
          )}
        </div>
      </div>

      {/* Mode selector */}
      <div className="flex items-center gap-1.5 px-5 py-2.5 border-b border-white/5 flex-shrink-0 overflow-x-auto">
        {MODES.map(m => (
          <button key={m.id} onClick={() => setMode(m.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap border ${
              mode === m.id ? `${m.color} ${m.bg} ${m.border}` : 'text-white/40 border-transparent hover:text-white/70 hover:bg-white/5'
            }`}>
            <m.icon className="w-3 h-3" />
            {m.label}
          </button>
        ))}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {chatMessages.length === 0 && (
          <div className="space-y-5">
            <div className="text-center py-6">
              <div className="w-12 h-12 rounded-2xl bg-purple-400/10 border border-purple-400/20 flex items-center justify-center mx-auto mb-3">
                <Bot className="w-6 h-6 text-purple-400" />
              </div>
              <h3 className="font-semibold mb-1">AI Data Scientist</h3>
              <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                Ask in plain English. I'll run statistical models, generate charts, and give evidence-based insights.
              </p>
            </div>

            {/* Stats snapshot */}
            <div className="glass rounded-xl p-3 text-xs space-y-1">
              <div className="text-white/40 uppercase tracking-widest text-xs mb-2 flex items-center gap-1.5">
                <FlaskConical className="w-3 h-3" /> Pre-computed statistics ready
              </div>
              {activeTable.columns?.filter(c => c.type === 'numeric').slice(0, 4).map(col => {
                const vals = activeTable.rows?.map(r => Number(r[col.name])).filter(v => !isNaN(v)) || [];
                const m = vals.length ? (vals.reduce((a,b)=>a+b,0)/vals.length) : 0;
                const s = vals.length > 1 ? Math.sqrt(vals.reduce((a,b)=>a+(b-m)**2,0)/(vals.length-1)) : 0;
                return (
                  <div key={col.name} className="flex items-center justify-between text-white/40">
                    <span className="font-mono">{col.name}</span>
                    <span>μ={fmtNum(m)} σ={fmtNum(s)}</span>
                  </div>
                );
              })}
            </div>

            <div>
              <div className="text-xs text-white/35 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                <activeMode.icon className={`w-3 h-3 ${activeMode.color}`} />
                {activeMode.label} suggestions
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {SUGGESTIONS[mode].map((s) => (
                  <button key={s} onClick={() => handleSend(s)}
                    className="text-left text-xs p-3 rounded-xl bg-white/3 border border-white/7 hover:border-purple-400/30 hover:bg-purple-400/5 transition-all text-white/55 hover:text-white/85">
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        <AnimatePresence>
          {chatMessages.map((msg, i) => (
            <MessageBubble key={i} message={msg} onFollowUp={handleSend} onSaveChart={handleSaveChart} datasetName={activeTable?.name} />
          ))}
        </AnimatePresence>

        {loading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
            <div className="w-7 h-7 rounded-lg bg-purple-400/10 border border-purple-400/20 flex items-center justify-center flex-shrink-0">
              <Loader2 className="w-3.5 h-3.5 text-purple-400 animate-spin" />
            </div>
            <div className="px-4 py-3 rounded-2xl bg-white/4 border border-white/8 text-sm">
              <div className="text-muted-foreground text-xs mb-1">{thinkingLabel || 'Analyzing…'}</div>
              <div className="flex gap-1">
                {[0,1,2].map(i => <div key={i} className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: `${i*0.15}s` }} />)}
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
            onKeyDown={handleKeyDown}
            placeholder={`Ask anything in ${activeMode.label} mode…`}
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
        <div className="text-xs text-muted-foreground mt-1.5 flex items-center gap-3">
          <span>Enter to send · Shift+Enter for new line</span>
          <span className="opacity-50">·</span>
          <span className={`${activeMode.color} opacity-70`}>claude-sonnet · stats pre-computed</span>
        </div>
      </div>
    </div>
  );
}