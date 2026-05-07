/**
 * ChartSummaryDropdown — AI-powered detailed chart explanation dropdown
 * Attach under any chart with chartData + metadata props
 */
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { ChevronDown, Brain, Loader2, TrendingUp, TrendingDown, AlertTriangle, Lightbulb, RefreshCw } from 'lucide-react';

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

export default function ChartSummaryDropdown({ title, chartType, data = [], xKey, yKey, description }) {
  const [open, setOpen] = useState(false);
  const [summary, setSummary] = useState('');
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(false);

  const stats = computeStats(data, yKey || 'value');

  const generate = async () => {
    if (generated && summary) return;
    setLoading(true);
    const dataStr = data.slice(0, 20).map(d => `${d[xKey || 'name'] ?? d.date ?? d.label}: ${fmtV(d[yKey || 'value'])}`).join(', ');
    const statsStr = stats
      ? `Mean: ${fmtV(stats.mean)}, Std Dev: ${fmtV(stats.std)}, Min: ${fmtV(stats.min)}, Max: ${fmtV(stats.max)}, Total: ${fmtV(stats.sum)}, Change: ${stats.pctChange.toFixed(1)}%, Outliers: ${stats.outliers.length}`
      : 'No numeric stats available';

    try {
      const text = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a senior business analyst. Provide a detailed, research-grade summary of this chart for a business executive.

Chart Title: "${title}"
Chart Type: ${chartType || 'bar/line chart'}
${description ? `Context: ${description}` : ''}
Data Points (${data.length} total, sample): ${dataStr}
Statistical Summary: ${statsStr}

Write a structured analysis with these EXACT sections (use plain text, no markdown):

WHAT THE CHART SHOWS
2-3 sentences describing what this visualization represents and what data it contains.

KEY FINDINGS
3-4 specific, data-backed observations. Use actual numbers from the data.

TREND ANALYSIS
Describe the direction, momentum, and pattern. Is it accelerating, decelerating, seasonal, cyclical?

STATISTICAL INSIGHTS
Mention the range, variance, outliers, and what they mean for business decision-making.

BUSINESS IMPLICATIONS
2-3 actionable implications for business strategy based on this chart.

RECOMMENDED ACTIONS
2 specific, prioritized actions a business leader should take based on this data.

Be specific, use numbers, and maintain a professional analyst tone. Total length: 280-350 words.`,
      });
      setSummary(text);
      setGenerated(true);
    } catch {
      setSummary('Summary generation failed. Please try again.');
    }
    setLoading(false);
  };

  const handleToggle = () => {
    const newOpen = !open;
    setOpen(newOpen);
    if (newOpen && !generated) generate();
  };

  const sections = summary
    ? summary.split(/\n(?=[A-Z][A-Z\s]+\n)/).filter(Boolean)
    : [];

  return (
    <div className="mt-3 border-t border-white/5">
      <button
        onClick={handleToggle}
        className={`w-full flex items-center justify-between px-4 py-2.5 text-xs font-medium transition-all rounded-b-xl ${open ? 'text-purple-400 bg-purple-400/5' : 'text-white/35 hover:text-white/65 hover:bg-white/3'}`}
      >
        <span className="flex items-center gap-2">
          <Brain className="w-3.5 h-3.5" />
          AI Chart Summary
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
            <button onClick={e => { e.stopPropagation(); setGenerated(false); setSummary(''); if (open) generate(); }}
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
            <div className="px-4 py-4 space-y-4 bg-purple-400/[0.02] border-t border-purple-400/10 rounded-b-xl">
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

              {/* Summary content */}
              {loading ? (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-purple-400/5 border border-purple-400/15">
                  <Loader2 className="w-4 h-4 text-purple-400 animate-spin flex-shrink-0" />
                  <div>
                    <div className="text-sm text-purple-400/80 font-medium">Analyzing chart data…</div>
                    <div className="text-xs text-white/30 mt-0.5">Running statistical analysis and generating insights</div>
                  </div>
                </div>
              ) : summary ? (
                <div className="space-y-3">
                  {sections.length > 1 ? (
                    sections.map((section, i) => {
                      const lines = section.trim().split('\n').filter(Boolean);
                      const heading = lines[0];
                      const body = lines.slice(1).join('\n').trim();
                      const icons = [Lightbulb, TrendingUp, TrendingDown, AlertTriangle, Brain, TrendingUp];
                      const SIcon = icons[i % icons.length];
                      return (
                        <div key={i} className="space-y-1">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-white/50 uppercase tracking-widest">
                            <SIcon className="w-3 h-3 text-purple-400" /> {heading}
                          </div>
                          <p className="text-xs text-white/60 leading-relaxed pl-4">{body}</p>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-xs text-white/60 leading-relaxed">{summary}</p>
                  )}
                </div>
              ) : null}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}