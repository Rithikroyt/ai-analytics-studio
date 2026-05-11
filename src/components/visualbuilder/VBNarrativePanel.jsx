/**
 * VBNarrativePanel — Generates a full executive narrative alongside a chart.
 * Plain business language for presentations. Auto-fires when chart changes.
 */
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { FileText, Loader2, Copy, CheckCheck, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import { fmtV } from './VBChartPreview.jsx';

export default function VBNarrativePanel({ chartData, chartType, chartTitle, xField, yField, aggFn, tableName }) {
  const [narrative, setNarrative] = useState(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(true);
  const [copied, setCopied] = useState(false);
  const lastKey = useRef('');

  const genKey = `${chartType}|${xField}|${yField}|${chartData.length}|${chartTitle}`;

  useEffect(() => {
    if (!chartData.length || !yField || genKey === lastKey.current) return;
    lastKey.current = genKey;
    generate();
  }, [genKey]);

  const generate = async () => {
    if (!chartData.length || !yField) return;
    setLoading(true);
    setNarrative(null);
    try {
      const top5 = chartData.slice(0, 5).map(d => `${d.name}: ${fmtV(d.value)}`).join(', ');
      const total = chartData.reduce((s, d) => s + (d.value || 0), 0);
      const top = chartData[0];
      const bottom = chartData[chartData.length - 1];
      const mean = total / (chartData.length || 1);
      const pctTop = top ? Math.round((top.value / total) * 100) : 0;

      const result = await base44.integrations.Core.InvokeLLM({
        model: 'claude_sonnet_4_6',
        prompt: `You are a senior business analyst writing for a C-suite executive presentation. 
Write a concise narrative summary for this chart in plain business language — no jargon, no filler.

CHART: "${chartTitle || yField + ' by ' + xField}"
TYPE: ${chartType}
METRIC: ${yField} (${aggFn}) by ${xField}
DATASET: ${tableName}
TOTAL: ${fmtV(total)}
TOP: ${top?.name} = ${fmtV(top?.value)} (${pctTop}% of total)
BOTTOM: ${bottom?.name} = ${fmtV(bottom?.value)}
AVERAGE: ${fmtV(Math.round(mean))}
TOP 5: ${top5}
DATA POINTS: ${chartData.length}

Write the narrative in this EXACT structure (JSON):
1. headline: A single punchy executive headline (max 12 words, like a newspaper headline)
2. summary: 2-3 sentence paragraph. State the main finding with specific numbers, explain what it means for the business.
3. key_trend: One sentence on the dominant trend or pattern. Include % or ratio.
4. risk_opportunity: One sentence on the biggest risk OR opportunity this data reveals.
5. recommendation: One clear actionable recommendation for leadership. Start with a verb.
6. presentation_note: A 1-sentence framing tip for how to present this to executives.`,
        response_json_schema: {
          type: 'object',
          properties: {
            headline: { type: 'string' },
            summary: { type: 'string' },
            key_trend: { type: 'string' },
            risk_opportunity: { type: 'string' },
            recommendation: { type: 'string' },
            presentation_note: { type: 'string' },
          },
          required: ['headline', 'summary', 'key_trend', 'recommendation'],
        },
      });
      setNarrative(result);
    } catch {
      setNarrative({ headline: 'Analysis Complete', summary: 'Chart generated from your data. Add more data points for richer narrative insights.', key_trend: '', risk_opportunity: '', recommendation: 'Review the top values shown in the chart.', presentation_note: '' });
    }
    setLoading(false);
  };

  const copyNarrative = () => {
    if (!narrative) return;
    const text = [
      narrative.headline,
      '',
      narrative.summary,
      narrative.key_trend && `Trend: ${narrative.key_trend}`,
      narrative.risk_opportunity && `Risk/Opportunity: ${narrative.risk_opportunity}`,
      '',
      `Recommendation: ${narrative.recommendation}`,
      narrative.presentation_note && `Note: ${narrative.presentation_note}`,
    ].filter(Boolean).join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!chartData.length) return null;

  return (
    <div className="glass-card rounded-2xl border border-blue-400/15 overflow-hidden">
      <button onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/3 transition-colors">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-blue-400" />
          <span className="text-xs font-bold text-white/70">Executive Narrative</span>
          {loading && <Loader2 className="w-3 h-3 animate-spin text-blue-400" />}
          {!loading && narrative && <span className="text-xs text-blue-400/60 font-normal">ready to copy</span>}
        </div>
        <div className="flex items-center gap-2">
          {narrative && !loading && (
            <button onClick={e => { e.stopPropagation(); copyNarrative(); }}
              className="flex items-center gap-1 text-xs text-white/30 hover:text-blue-400 px-2 py-0.5 rounded-lg hover:bg-blue-400/10 transition-all">
              {copied ? <><CheckCheck className="w-3 h-3 text-green-400" /> Copied</> : <><Copy className="w-3 h-3" /> Copy</>}
            </button>
          )}
          {narrative && !loading && (
            <button onClick={e => { e.stopPropagation(); generate(); }}
              className="p-1 text-white/20 hover:text-white/50 transition-colors" title="Regenerate">
              <RefreshCw className="w-3 h-3" />
            </button>
          )}
          {open ? <ChevronUp className="w-3.5 h-3.5 text-white/30" /> : <ChevronDown className="w-3.5 h-3.5 text-white/30" />}
        </div>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
            <div className="px-4 pb-4 space-y-3">
              {loading ? (
                <div className="space-y-2.5 py-1">
                  {[90, 75, 85, 60, 70].map((w, i) => (
                    <div key={i} className="h-3 rounded-full bg-white/5 shimmer" style={{ width: `${w}%` }} />
                  ))}
                </div>
              ) : narrative && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
                  {/* Headline */}
                  <div className="px-3 py-2.5 rounded-xl bg-blue-400/8 border border-blue-400/20">
                    <p className="text-sm font-bold text-blue-300 leading-snug">"{narrative.headline}"</p>
                  </div>

                  {/* Summary */}
                  <p className="text-xs text-white/65 leading-relaxed">{narrative.summary}</p>

                  {/* Trend + Risk grid */}
                  <div className="grid grid-cols-1 gap-2">
                    {narrative.key_trend && (
                      <div className="flex items-start gap-2 p-2.5 rounded-lg bg-white/3 border border-white/6">
                        <span className="text-xs">📈</span>
                        <p className="text-xs text-white/55 leading-relaxed">{narrative.key_trend}</p>
                      </div>
                    )}
                    {narrative.risk_opportunity && (
                      <div className="flex items-start gap-2 p-2.5 rounded-lg bg-white/3 border border-white/6">
                        <span className="text-xs">⚠️</span>
                        <p className="text-xs text-white/55 leading-relaxed">{narrative.risk_opportunity}</p>
                      </div>
                    )}
                  </div>

                  {/* Recommendation */}
                  <div className="flex items-start gap-2 p-3 rounded-xl bg-cyan-400/5 border border-cyan-400/15">
                    <span className="text-xs mt-0.5">💡</span>
                    <div>
                      <div className="text-xs font-semibold text-cyan-400 mb-0.5">Recommendation</div>
                      <p className="text-xs text-white/65 leading-relaxed">{narrative.recommendation}</p>
                    </div>
                  </div>

                  {/* Presentation note */}
                  {narrative.presentation_note && (
                    <p className="text-xs text-white/25 italic border-t border-white/5 pt-2">{narrative.presentation_note}</p>
                  )}
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}