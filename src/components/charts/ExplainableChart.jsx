/**
 * ExplainableChart — Wraps any chart with:
 * - Title + axis labels
 * - One-line insight
 * - "Explain" button → LLM explanation
 * - Bookmark to dashboard
 */
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HelpCircle, Bookmark, BookmarkCheck, Loader2, X, Lightbulb, TrendingUp, AlertTriangle, ArrowRight } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useWorkspaceStore } from '@/lib/store';
import { obs } from '@/lib/observability';

const fmtV = v => { if (v == null || isNaN(v)) return '—'; const n = Number(v); if (n >= 1e6) return `${(n/1e6).toFixed(1)}M`; if (n >= 1e3) return `${(n/1e3).toFixed(0)}K`; return n.toLocaleString(undefined, { maximumFractionDigits: 2 }); };

export default function ExplainableChart({
  title,
  xLabel,
  yLabel,
  insight,
  children,
  chartSpec,      // { type, data, x_key, y_key }
  onBookmark,
  bookmarked = false,
  className = '',
}) {
  const [explaining, setExplaining] = useState(false);
  const [explanation, setExplanation] = useState(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const { saveToDashboard } = useWorkspaceStore();

  const handleExplain = async () => {
    if (explanation) { setShowExplanation(v => !v); return; }
    setExplaining(true);
    const start = performance.now();
    try {
      const data = chartSpec?.data?.slice(0, 20) || [];
      const xKey = chartSpec?.x_key || 'x';
      const yKey = chartSpec?.y_key || 'value';
      const dataStr = data.map(d => `${d[xKey]}: ${fmtV(d[yKey])}`).join(', ');

      const resp = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a senior data analyst explaining a chart to a business executive.

Chart: "${title}"
Type: ${chartSpec?.type || 'bar'} chart
X-axis: ${xLabel || xKey} (shows: ${[...new Set(data.map(d => String(d[xKey])).slice(0, 5))].join(', ')}...)
Y-axis: ${yLabel || yKey}
Data sample: ${dataStr}

Explain this chart in exactly 4 sentences:
1. What the chart shows (axes and metric)
2. What trend or pattern is visible
3. What the business meaning is (why does this matter?)
4. One recommended next step

Be specific — use actual values from the data. No generic text.`,
        response_json_schema: {
          type: 'object',
          properties: {
            whatItShows: { type: 'string' },
            trendOrPattern: { type: 'string' },
            businessMeaning: { type: 'string' },
            recommendedNextStep: { type: 'string' },
            hasAnomaly: { type: 'boolean' },
            anomalyNote: { type: ['string', 'null'] },
          },
        },
      });
      obs.log('chart_explain', { title, latencyMs: Math.round(performance.now() - start) });
      setExplanation(resp);
      setShowExplanation(true);
    } catch (e) {
      obs.error('ExplainableChart', e);
      setExplanation({ whatItShows: title, trendOrPattern: 'Analysis unavailable.', businessMeaning: 'Please try again.', recommendedNextStep: '', hasAnomaly: false });
      setShowExplanation(true);
    }
    setExplaining(false);
  };

  const handleBookmark = () => {
    if (onBookmark) { onBookmark(chartSpec); return; }
    saveToDashboard({ chart: chartSpec, label: title, insight });
  };

  return (
    <div className={`rounded-2xl border border-white/8 bg-black/20 overflow-hidden ${className}`}>
      {/* Header */}
      <div className="px-4 pt-4 pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-sm text-white/85 truncate">{title}</div>
            {(xLabel || yLabel) && (
              <div className="flex items-center gap-3 mt-0.5 text-xs text-white/30">
                {xLabel && <span>X: <span className="text-white/45">{xLabel}</span></span>}
                {yLabel && <span>Y: <span className="text-white/45">{yLabel}</span></span>}
              </div>
            )}
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <button onClick={handleExplain} disabled={explaining}
              title="Explain this chart"
              className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs transition-all ${showExplanation ? 'bg-purple-400/15 border border-purple-400/25 text-purple-400' : 'bg-white/5 border border-white/8 text-white/40 hover:text-white/70 hover:border-white/15'}`}>
              {explaining ? <Loader2 className="w-3 h-3 animate-spin" /> : <HelpCircle className="w-3 h-3" />}
              {!explaining && <span className="hidden sm:inline">Explain</span>}
            </button>
            <button onClick={handleBookmark} title="Save to dashboard"
              className={`p-1.5 rounded-lg text-xs transition-all ${bookmarked ? 'text-cyan-400' : 'text-white/30 hover:text-white/65 hover:bg-white/5'}`}>
              {bookmarked ? <BookmarkCheck className="w-3.5 h-3.5" /> : <Bookmark className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* One-line insight */}
        {insight && (
          <div className="flex items-start gap-1.5 mt-2 text-xs text-white/45 leading-relaxed">
            <TrendingUp className="w-3 h-3 text-cyan-400/60 mt-0.5 flex-shrink-0" />
            <span>{insight}</span>
          </div>
        )}
      </div>

      {/* Chart content */}
      <div className="px-3 pb-3">
        {children}
      </div>

      {/* Explanation panel */}
      <AnimatePresence>
        {showExplanation && explanation && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-white/8">
            <div className="p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-purple-400">
                  <Lightbulb className="w-3.5 h-3.5" /> Chart Explanation
                </div>
                <button onClick={() => setShowExplanation(false)} className="text-white/30 hover:text-white/60 transition-colors">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              {[
                { label: 'What it shows', text: explanation.whatItShows, color: 'text-cyan-400' },
                { label: 'Trend / Pattern', text: explanation.trendOrPattern, color: 'text-teal-400' },
                { label: 'Business meaning', text: explanation.businessMeaning, color: 'text-purple-400' },
                { label: 'Next step', text: explanation.recommendedNextStep, color: 'text-green-400', icon: ArrowRight },
              ].filter(item => item.text).map(item => (
                <div key={item.label} className="text-xs">
                  <span className={`font-semibold ${item.color}`}>{item.label}: </span>
                  <span className="text-white/60">{item.text}</span>
                </div>
              ))}
              {explanation.hasAnomaly && explanation.anomalyNote && (
                <div className="flex items-start gap-2 mt-1 text-xs text-amber-400 bg-amber-400/5 border border-amber-400/15 rounded-lg p-2">
                  <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" /> {explanation.anomalyNote}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}