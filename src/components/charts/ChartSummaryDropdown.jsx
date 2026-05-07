/**
 * ChartSummaryDropdown — 3-tab chart explainer
 * Tab 1: Explain (what is this chart, key findings, trend)
 * Tab 2: Business Meaning (implications, recommended actions)
 * Tab 3: SQL Behind Chart (the query that would produce this)
 */
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import {
  ChevronDown, Brain, Loader2, TrendingUp, TrendingDown,
  AlertTriangle, Lightbulb, RefreshCw, Terminal, BarChart2, Target
} from 'lucide-react';

const fmtV = v => {
  if (v == null || isNaN(Number(v))) return String(v ?? '—');
  const n = Number(v);
  if (Math.abs(n) >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (Math.abs(n) >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
};

function computeStats(data, valueKey) {
  const vals = (data || []).map(d => Number(d[valueKey])).filter(v => !isNaN(v));
  if (!vals.length) return null;
  const sum = vals.reduce((a, b) => a + b, 0);
  const mean = sum / vals.length;
  const sorted = [...vals].sort((a, b) => a - b);
  const std = Math.sqrt(vals.reduce((a, b) => a + (b - mean) ** 2, 0) / vals.length);
  const first = vals[0], last = vals[vals.length - 1];
  const pctChange = first !== 0 ? ((last - first) / Math.abs(first)) * 100 : 0;
  const outliers = vals.filter(v => Math.abs(v - mean) > 2 * std);
  return { mean, std, min: sorted[0], max: sorted[sorted.length - 1], sum, count: vals.length, pctChange, outliers };
}

function buildSQL(title, xKey, yKey, data, chartType) {
  const tableName = (title || 'your_table').toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '') || 'dataset';
  const dim = xKey || 'dimension';
  const metric = yKey || 'value';
  
  if (chartType?.includes('bar') || chartType?.includes('donut') || chartType?.includes('pie')) {
    return `-- ${title}\n-- Segment breakdown by ${metric}\nSELECT\n  ${dim},\n  SUM(${metric}) AS total_${metric},\n  ROUND(SUM(${metric}) * 100.0 / SUM(SUM(${metric})) OVER (), 2) AS share_pct\nFROM ${tableName}\nGROUP BY ${dim}\nORDER BY total_${metric} DESC\nLIMIT 20;`;
  }
  if (chartType?.includes('area') || chartType?.includes('line')) {
    return `-- ${title}\n-- Time-series trend\nSELECT\n  ${dim} AS period,\n  SUM(${metric}) AS total_${metric},\n  AVG(${metric}) AS avg_${metric},\n  LAG(SUM(${metric})) OVER (ORDER BY ${dim}) AS prior_period,\n  ROUND((SUM(${metric}) - LAG(SUM(${metric})) OVER (ORDER BY ${dim}))\n    / NULLIF(LAG(SUM(${metric})) OVER (ORDER BY ${dim}), 0) * 100, 2) AS mom_growth_pct\nFROM ${tableName}\nGROUP BY ${dim}\nORDER BY ${dim} ASC;`;
  }
  if (chartType?.includes('scatter')) {
    return `-- ${title}\n-- Correlation scatter\nSELECT\n  ${xKey || 'x_metric'},\n  ${yKey || 'y_metric'},\n  CORR(${xKey || 'x_metric'}, ${yKey || 'y_metric'}) OVER () AS pearson_r\nFROM ${tableName}\nWHERE ${xKey || 'x_metric'} IS NOT NULL\n  AND ${yKey || 'y_metric'} IS NOT NULL\nORDER BY ${xKey || 'x_metric'}\nLIMIT 500;`;
  }
  return `-- ${title}\nSELECT\n  ${dim},\n  SUM(${metric}) AS total_${metric},\n  AVG(${metric}) AS avg_${metric},\n  COUNT(*) AS record_count\nFROM ${tableName}\nGROUP BY ${dim}\nORDER BY total_${metric} DESC;`;
}

const TABS = [
  { id: 'explain',   label: 'Explain',          icon: BarChart2 },
  { id: 'meaning',   label: 'Business Meaning',  icon: Target },
  { id: 'sql',       label: 'SQL Behind Chart',  icon: Terminal },
];

export default function ChartSummaryDropdown({ title, chartType, data = [], xKey, yKey, description }) {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('explain');
  const [summary, setSummary] = useState('');
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(false);

  const stats = computeStats(data, yKey || 'value');
  const sqlQuery = buildSQL(title, xKey, yKey, data, chartType);

  const generate = async () => {
    if (generated && summary) return;
    setLoading(true);
    const dataStr = data.slice(0, 20).map(d => `${d[xKey || 'name'] ?? d.date ?? d.label}: ${fmtV(d[yKey || 'value'])}`).join(', ');
    const statsStr = stats
      ? `Mean: ${fmtV(stats.mean)}, Std Dev: ${fmtV(stats.std)}, Min: ${fmtV(stats.min)}, Max: ${fmtV(stats.max)}, Total: ${fmtV(stats.sum)}, Change: ${stats.pctChange.toFixed(1)}%, Outliers: ${stats.outliers.length}`
      : 'No numeric stats available';
    try {
      const text = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a senior business analyst. Explain this chart clearly for a business executive.

Chart: "${title}"
Type: ${chartType || 'chart'}
${description ? `Context: ${description}` : ''}
Data (${data.length} points): ${dataStr}
Stats: ${statsStr}

Write EXACTLY these sections (plain text, no markdown):

WHAT THIS CHART SHOWS
1-2 sentences: what the X axis represents, what the Y axis measures, what the chart is designed to communicate.

KEY FINDINGS
3 specific data-backed findings using actual numbers.

TREND DIRECTION
Is it growing, declining, flat, seasonal? What is the momentum?

BUSINESS MEANING
What does this mean for the business? What decision does it support?

RECOMMENDED ACTIONS
2 specific, prioritized actions a business leader should take.

Total length: 200-260 words. Be specific and use numbers.`,
      });
      setSummary(text);
      setGenerated(true);
    } catch {
      setSummary('Analysis failed. Please try again.');
    }
    setLoading(false);
  };

  const handleToggle = () => {
    const newOpen = !open;
    setOpen(newOpen);
    if (newOpen && !generated) generate();
  };

  // Parse sections from LLM output
  const parseSections = (text) => {
    const markers = ['WHAT THIS CHART SHOWS', 'KEY FINDINGS', 'TREND DIRECTION', 'BUSINESS MEANING', 'RECOMMENDED ACTIONS'];
    const result = {};
    markers.forEach((m, i) => {
      const next = markers[i + 1];
      const start = text.indexOf(m);
      if (start === -1) return;
      const content = text.slice(start + m.length);
      const end = next ? content.indexOf(next) : content.length;
      result[m] = content.slice(0, end).trim();
    });
    return result;
  };

  const parsed = summary ? parseSections(summary) : {};

  return (
    <div className="mt-3 border-t border-white/5">
      <button
        onClick={handleToggle}
        className={`w-full flex items-center justify-between px-4 py-2.5 text-xs font-medium transition-all rounded-b-xl ${open ? 'text-purple-400 bg-purple-400/5' : 'text-white/35 hover:text-white/65 hover:bg-white/3'}`}
      >
        <span className="flex items-center gap-2">
          <Brain className="w-3.5 h-3.5" />
          Explain Chart
          {stats && (
            <span className="flex items-center gap-2 ml-2 text-white/25 font-normal">
              <span>Avg: {fmtV(stats.mean)}</span>
              <span>·</span>
              <span className={stats.pctChange >= 0 ? 'text-green-400/60' : 'text-red-400/60'}>
                {stats.pctChange >= 0 ? '↑' : '↓'} {Math.abs(stats.pctChange).toFixed(1)}%
              </span>
            </span>
          )}
        </span>
        <div className="flex items-center gap-2">
          {generated && (
            <button onClick={e => { e.stopPropagation(); setGenerated(false); setSummary(''); setTimeout(() => { if (open) generate(); }, 100); }}
              className="p-0.5 hover:text-purple-400 transition-colors">
              <RefreshCw className="w-3 h-3" />
            </button>
          )}
          <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
        </div>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pt-3 pb-4 bg-purple-400/[0.02] border-t border-purple-400/10 rounded-b-xl space-y-3">
              {/* Quick stats strip */}
              {stats && (
                <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                  {[
                    { label: 'Mean', val: fmtV(stats.mean), color: 'text-cyan-400' },
                    { label: 'Max', val: fmtV(stats.max), color: 'text-green-400' },
                    { label: 'Min', val: fmtV(stats.min), color: 'text-red-400' },
                    { label: 'Std Dev', val: fmtV(stats.std), color: 'text-amber-400' },
                    { label: 'Total', val: fmtV(stats.sum), color: 'text-purple-400' },
                    { label: 'Outliers', val: stats.outliers.length, color: stats.outliers.length > 0 ? 'text-orange-400' : 'text-white/30' },
                  ].map(s => (
                    <div key={s.label} className="text-center p-2 rounded-lg bg-white/3 border border-white/5">
                      <div className={`font-mono font-bold text-sm ${s.color}`}>{s.val}</div>
                      <div className="text-xs text-white/25 mt-0.5">{s.label}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Tab bar */}
              <div className="flex gap-0.5 border-b border-white/5">
                {TABS.map(tab => (
                  <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-t-lg transition-all ${activeTab === tab.id ? 'bg-white/8 text-purple-400 border-b-2 border-purple-400' : 'text-white/30 hover:text-white/60'}`}>
                    <tab.icon className="w-3 h-3" /> {tab.label}
                  </button>
                ))}
              </div>

              {/* Tab: Explain */}
              {activeTab === 'explain' && (
                <div className="space-y-2">
                  {loading ? (
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-purple-400/5 border border-purple-400/15">
                      <Loader2 className="w-4 h-4 text-purple-400 animate-spin flex-shrink-0" />
                      <span className="text-xs text-purple-400/80">Analyzing chart…</span>
                    </div>
                  ) : parsed['WHAT THIS CHART SHOWS'] ? (
                    <div className="space-y-3">
                      <div className="p-3 rounded-xl bg-white/3 border border-white/8">
                        <div className="text-xs font-bold text-white/40 uppercase tracking-widest mb-1.5">What this chart shows</div>
                        <p className="text-xs text-white/65 leading-relaxed">{parsed['WHAT THIS CHART SHOWS']}</p>
                      </div>
                      {parsed['KEY FINDINGS'] && (
                        <div>
                          <div className="text-xs font-bold text-cyan-400/70 uppercase tracking-widest mb-1.5">Key Findings</div>
                          <div className="space-y-1">
                            {parsed['KEY FINDINGS'].split('\n').filter(Boolean).map((line, i) => (
                              <div key={i} className="flex items-start gap-2 text-xs text-white/60">
                                <div className="w-1 h-1 rounded-full bg-cyan-400/50 mt-1.5 flex-shrink-0" />
                                {line.replace(/^[-•\d.]\s*/, '')}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {parsed['TREND DIRECTION'] && (
                        <div className="p-3 rounded-xl bg-teal-400/5 border border-teal-400/15">
                          <div className="text-xs font-bold text-teal-400/70 uppercase tracking-widest mb-1">Trend Direction</div>
                          <p className="text-xs text-white/60 leading-relaxed">{parsed['TREND DIRECTION']}</p>
                        </div>
                      )}
                    </div>
                  ) : summary ? (
                    <p className="text-xs text-white/60 leading-relaxed">{summary}</p>
                  ) : null}
                </div>
              )}

              {/* Tab: Business Meaning */}
              {activeTab === 'meaning' && (
                <div className="space-y-3">
                  {loading ? (
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-purple-400/5 border border-purple-400/15">
                      <Loader2 className="w-4 h-4 text-purple-400 animate-spin flex-shrink-0" />
                      <span className="text-xs text-purple-400/80">Generating business context…</span>
                    </div>
                  ) : parsed['BUSINESS MEANING'] ? (
                    <>
                      <div className="p-3 rounded-xl bg-green-400/5 border border-green-400/15">
                        <div className="text-xs font-bold text-green-400/70 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                          <TrendingUp className="w-3 h-3" /> Business Meaning
                        </div>
                        <p className="text-xs text-white/65 leading-relaxed">{parsed['BUSINESS MEANING']}</p>
                      </div>
                      {parsed['RECOMMENDED ACTIONS'] && (
                        <div className="p-3 rounded-xl bg-purple-400/5 border border-purple-400/15">
                          <div className="text-xs font-bold text-purple-400/70 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                            <Target className="w-3 h-3" /> Recommended Actions
                          </div>
                          <div className="space-y-1.5">
                            {parsed['RECOMMENDED ACTIONS'].split('\n').filter(Boolean).map((line, i) => (
                              <div key={i} className="flex items-start gap-2 text-xs text-white/60">
                                <div className={`w-4 h-4 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5 ${i === 0 ? 'bg-red-400/15 text-red-400' : 'bg-amber-400/15 text-amber-400'}`}>{i + 1}</div>
                                {line.replace(/^[-•\d.]\s*/, '')}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-xs text-white/30 text-center py-4">Open the Explain tab first to load business context.</div>
                  )}
                </div>
              )}

              {/* Tab: SQL Behind Chart */}
              {activeTab === 'sql' && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs text-white/30 mb-2">
                    <Terminal className="w-3 h-3 text-cyan-400" />
                    SQL query that would produce this chart's data
                  </div>
                  <pre className="p-3 rounded-xl bg-black/40 border border-cyan-400/15 text-xs font-mono text-green-300/85 overflow-auto leading-relaxed whitespace-pre-wrap">
                    {sqlQuery}
                  </pre>
                  <button onClick={() => navigator.clipboard.writeText(sqlQuery)}
                    className="text-xs text-white/30 hover:text-cyan-400 transition-colors flex items-center gap-1.5">
                    <Terminal className="w-3 h-3" /> Copy to SQL Studio
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}