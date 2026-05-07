import { motion } from 'framer-motion';
import { Brain, RefreshCw, Loader2, TrendingUp, AlertTriangle, Zap } from 'lucide-react';

export default function InsightNarrative({ narrative, generating, onRefresh, tableName, growthRate, canForecast }) {
  return (
    <div className="glass-card rounded-2xl p-5 border border-purple-400/15 bg-purple-400/[0.02] h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-purple-400/15 flex items-center justify-center">
            <Brain className="w-3.5 h-3.5 text-purple-400" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">AI Forecast Narrative</h3>
            <p className="text-xs text-white/30">{tableName || 'Dataset'}</p>
          </div>
        </div>
        <button onClick={onRefresh} disabled={generating}
          className="p-1.5 rounded-lg hover:bg-white/8 text-white/30 hover:text-white/70 transition-all disabled:opacity-40">
          {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-400" /> : <RefreshCw className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Context badges */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {growthRate != null && (
          <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-mono ${growthRate >= 0 ? 'bg-green-400/10 border-green-400/20 text-green-400' : 'bg-red-400/10 border-red-400/20 text-red-400'}`}>
            <TrendingUp className="w-2.5 h-2.5" /> {growthRate >= 0 ? '+' : ''}{growthRate}%
          </span>
        )}
        {canForecast && (
          <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border bg-purple-400/10 border-purple-400/20 text-purple-400">
            <Zap className="w-2.5 h-2.5" /> Forecast active
          </span>
        )}
        {!canForecast && (
          <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border bg-amber-400/10 border-amber-400/20 text-amber-400">
            <AlertTriangle className="w-2.5 h-2.5" /> No date column
          </span>
        )}
      </div>

      {/* Narrative body */}
      <div className="flex-1">
        {generating ? (
          <div className="flex flex-col items-center justify-center h-32 gap-3">
            <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
            <span className="text-xs text-white/35">Generating forecast narrative…</span>
          </div>
        ) : narrative ? (
          <motion.p
            key={narrative.slice(0, 20)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-sm text-white/65 leading-relaxed"
          >
            {narrative}
          </motion.p>
        ) : (
          <div className="flex flex-col items-center justify-center h-32 gap-2 text-center">
            <Brain className="w-6 h-6 text-white/15" />
            <span className="text-xs text-white/25">Click refresh to generate AI forecast analysis</span>
          </div>
        )}
      </div>

      <div className="mt-4 pt-3 border-t border-white/5 text-xs text-white/20">
        Powered by advanced AI · Based on statistical trend analysis
      </div>
    </div>
  );
}