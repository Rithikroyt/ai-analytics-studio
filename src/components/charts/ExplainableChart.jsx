/**
 * ExplainableChart — Wraps any chart with "Explain this chart" + one-line insight
 * Phase 6: Storytelling Dashboard — every chart has title, axis labels, insight, Explain button
 */
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HelpCircle, X, Loader2, Bookmark, Lightbulb, TrendingUp, AlertTriangle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { obs } from '@/lib/observability';

const fmtV = v => {
  if (v == null) return '—';
  const n = Number(v);
  if (isNaN(n)) return String(v);
  if (Math.abs(n) >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (Math.abs(n) >= 1e3) return `${(n / 1e3).toFixed(0)}K`;
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
};

export default function ExplainableChart({
  children,
  title,
  xLabel,
  yLabel,
  insight,
  chartData,
  chartType = 'bar',
  onSave,
  className = '',
}) {
  const [explanation, setExplanation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleExplain = async () => {
    if (explanation) { setOpen(v => !v); return; }
    setLoading(true);
    setOpen(true);
    const timer = obs.logLLMCall('explain_chart', title || 'chart');
    try {
      const dataPreview = Array.isArray(chartData)
        ? chartData.slice(0, 10).map(d => JSON.stringify(d)).join('\n')
        : JSON.stringify(chartData || {}).slice(0, 800);

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a senior data analyst explaining a chart to a business executive.

CHART TYPE: ${chartType}
CHART TITLE: ${title || 'Untitled'}
X-AXIS: ${xLabel || 'X axis'}
Y-AXIS: ${yLabel || 'Y axis'}

DATA SAMPLE:
${dataPreview}

Provide a concise, grounded explanation with:
1. what_happened: One sentence describing the main trend or comparison shown
2. business_meaning: What this means for the business
3. anomaly_note: Any unusual pattern in the data (or null if none)
4. recommended_action: One specific next step based on this chart

Be specific. Use actual values from the data. Do not be generic.`,
        response_json_schema: {
          type: 'object',
          properties: {
            what_happened: { type: 'string' },
            business_meaning: { type: 'string' },
            anomaly_note: { type: ['string', 'null'] },
            recommended_action: { type: 'string' },
          },
        },
      });
      timer.end({ success: true });
      setExplanation(result);
    } catch (e) {
      timer.end({ error: e.message });
      setExplanation({
        what_happened: insight || 'Chart explanation unavailable.',
        business_meaning: 'Run AI analysis for business context.',
        anomaly_note: null,
        recommended_action: 'Use the AI Analyst for deeper investigation.',
      });
    }
    setLoading(false);
  };

  const handleSave = () => {
    if (onSave) { onSave({ title, xLabel, yLabel, insight, chartType, chartData }); setSaved(true); setTimeout(() => setSaved(false), 2000); }
  };

  return (
    <div className={`rounded-2xl border border-white/8 bg-black/20 overflow-hidden ${className}`}>
      {/* Chart header */}
      <div className="flex items-start justify-between px-4 pt-4 pb-2 gap-3">
        <div className="flex-1 min-w-0">
          {title && <div className="font-semibold text-sm text-white/85 truncate">{title}</div>}
          {insight && (
            <div className="flex items-center gap-1.5 mt-1">
              <Lightbulb className="w-3 h-3 text-amber-400 flex-shrink-0" />
              <span className="text-xs text-white/45 leading-relaxed">{insight}</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {onSave && (
            <button onClick={handleSave} title="Save to dashboard"
              className={`p-1.5 rounded-lg transition-all text-xs ${saved ? 'text-cyan-400 bg-cyan-400/10' : 'text-white/25 hover:text-white/60 hover:bg-white/5'}`}>
              <Bookmark className="w-3.5 h-3.5" />
            </button>
          )}
          <button onClick={handleExplain} title="Explain this chart"
            className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs transition-all ${open ? 'bg-purple-400/15 border border-purple-400/25 text-purple-400' : 'text-white/30 hover:text-purple-400 hover:bg-purple-400/8 border border-transparent'}`}>
            {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <HelpCircle className="w-3 h-3" />}
            <span className="hidden sm:inline">{open && !loading ? 'Hide' : 'Explain'}</span>
          </button>
        </div>
      </div>

      {/* Axis labels */}
      {(xLabel || yLabel) && (
        <div className="flex items-center justify-between px-4 pb-1 text-xs text-white/20">
          <span className="invisible">{yLabel}</span>
          {xLabel && <span className="text-center flex-1">{xLabel}</span>}
        </div>
      )}

      {/* Chart content */}
      <div className="relative px-2 pb-2">
        {yLabel && (
          <div className="absolute left-0 top-1/2 -translate-y-1/2 -rotate-90 text-xs text-white/20 origin-center whitespace-nowrap" style={{ transformOrigin: '12px 50%' }}>
            {yLabel}
          </div>
        )}
        <div className={yLabel ? 'ml-5' : ''}>{children}</div>
      </div>

      {/* Explanation panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-t border-white/8"
          >
            {loading ? (
              <div className="flex items-center gap-2 p-4 text-xs text-white/40">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-400" />
                Analyzing chart data…
              </div>
            ) : explanation ? (
              <div className="p-4 space-y-3 bg-purple-400/[0.03]">
                <div className="flex items-start gap-2">
                  <TrendingUp className="w-3.5 h-3.5 text-cyan-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="text-xs text-cyan-400 uppercase tracking-widest mb-0.5">What happened</div>
                    <div className="text-xs text-white/65 leading-relaxed">{explanation.what_happened}</div>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Lightbulb className="w-3.5 h-3.5 text-amber-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="text-xs text-amber-400 uppercase tracking-widest mb-0.5">Business meaning</div>
                    <div className="text-xs text-white/65 leading-relaxed">{explanation.business_meaning}</div>
                  </div>
                </div>
                {explanation.anomaly_note && (
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-3.5 h-3.5 text-red-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="text-xs text-red-400 uppercase tracking-widest mb-0.5">Anomaly</div>
                      <div className="text-xs text-white/65 leading-relaxed">{explanation.anomaly_note}</div>
                    </div>
                  </div>
                )}
                <div className="flex items-start gap-2 pt-1 border-t border-white/8">
                  <div className="text-xs font-semibold text-green-400 mt-0.5">→</div>
                  <div className="text-xs text-green-400/80 leading-relaxed">{explanation.recommended_action}</div>
                </div>
              </div>
            ) : null}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}