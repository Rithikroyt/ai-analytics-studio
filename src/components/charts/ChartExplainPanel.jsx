/**
 * ChartExplainPanel — Full explain overlay for any chart
 * Shows: what it shows, trend, top insight, business meaning, risk, SQL, recommended action
 */
import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Brain, X, Loader2, TrendingUp, AlertTriangle, Target, Code2, Lightbulb, Copy, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function ChartExplainPanel({ title, type, data, xKey = 'name', yKey = 'value', xLabel, yLabel, tableName, metricDefinition, onClose }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);

  const explain = async () => {
    if (result) return;
    setLoading(true);
    try {
      const res = await base44.functions.invoke('explainChart', {
        title, type, data: data?.slice(0, 50), xKey, yKey, xLabel, yLabel, tableName, metricDefinition,
      });
      setResult(res.data?.explanation);
    } catch {}
    setLoading(false);
  };

  // Auto-trigger on mount
  useState(() => { explain(); });

  const copySQL = () => {
    if (result?.sqlToReproduce) {
      navigator.clipboard.writeText(result.sqlToReproduce);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
      className="absolute inset-x-0 bottom-0 z-20 rounded-b-2xl border-t border-white/8 bg-background/97 backdrop-blur-xl overflow-hidden max-h-96 overflow-y-auto">
      <div className="sticky top-0 bg-background/97 flex items-center justify-between px-4 py-2.5 border-b border-white/6 z-10">
        <div className="flex items-center gap-2">
          <Brain className="w-3.5 h-3.5 text-purple-400" />
          <span className="text-xs font-bold text-purple-400">Chart Intelligence</span>
        </div>
        <button onClick={onClose} className="text-white/30 hover:text-white/60"><X className="w-3.5 h-3.5" /></button>
      </div>

      {loading && (
        <div className="flex items-center gap-2 p-4 text-xs text-white/40">
          <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
          Analyzing chart data with AI…
        </div>
      )}

      {result && (
        <div className="p-4 space-y-3 text-xs">
          {/* What it shows */}
          {result.whatItShows && (
            <div className="flex items-start gap-2">
              <Target className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0 mt-0.5" />
              <p className="text-white/70 leading-relaxed">{result.whatItShows}</p>
            </div>
          )}

          {/* Top insight */}
          {result.topInsight && (
            <div className="p-2.5 rounded-xl bg-purple-400/8 border border-purple-400/20 flex items-start gap-2">
              <Lightbulb className="w-3.5 h-3.5 text-purple-400 flex-shrink-0 mt-0.5" />
              <p className="text-white/80 font-semibold leading-relaxed">{result.topInsight}</p>
            </div>
          )}

          {/* Trend */}
          {result.trendOrPattern && (
            <div className="flex items-start gap-2">
              <TrendingUp className="w-3.5 h-3.5 text-green-400 flex-shrink-0 mt-0.5" />
              <p className="text-white/65 leading-relaxed">{result.trendOrPattern}</p>
            </div>
          )}

          {/* Business meaning */}
          {result.businessMeaning && (
            <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-white/3 border border-white/6">
              <Brain className="w-3.5 h-3.5 text-blue-400 flex-shrink-0 mt-0.5" />
              <p className="text-white/60 leading-relaxed">{result.businessMeaning}</p>
            </div>
          )}

          {/* Risk */}
          {result.riskOrWarning && result.hasAnomaly && (
            <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-amber-400/8 border border-amber-400/20">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
              <p className="text-amber-300/80 leading-relaxed">{result.anomalyNote || result.riskOrWarning}</p>
            </div>
          )}

          {/* Recommended action */}
          {result.recommendedNextStep && (
            <div className="px-3 py-2 rounded-xl bg-green-400/8 border border-green-400/20 flex items-start gap-2">
              <Target className="w-3.5 h-3.5 text-green-400 flex-shrink-0 mt-0.5" />
              <div>
                <div className="text-green-400 font-semibold mb-0.5">Recommended Action</div>
                <p className="text-white/65 leading-relaxed">{result.recommendedNextStep}</p>
              </div>
            </div>
          )}

          {/* SQL */}
          {result.sqlToReproduce && (
            <div className="rounded-xl bg-white/3 border border-white/8 overflow-hidden">
              <div className="flex items-center justify-between px-3 py-2 border-b border-white/6">
                <div className="flex items-center gap-1.5 text-white/30">
                  <Code2 className="w-3 h-3" />
                  <span>SQL to reproduce</span>
                </div>
                <button onClick={copySQL} className="flex items-center gap-1 text-white/25 hover:text-cyan-400 transition-colors">
                  {copied ? <CheckCircle2 className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
              <pre className="px-3 py-2 text-green-400/80 font-mono text-xs overflow-x-auto whitespace-pre-wrap">{result.sqlToReproduce}</pre>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}