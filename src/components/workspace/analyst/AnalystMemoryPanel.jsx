/**
 * AnalystMemoryPanel — Shows persisted insights, preferences, and data patterns
 */
import { motion, AnimatePresence } from 'framer-motion';
import { useWorkspaceStore } from '@/lib/store';
import { Brain, Trash2, Clock, Star, BarChart2, X, Sparkles } from 'lucide-react';

export default function AnalystMemoryPanel({ onClose, onLoadInsight }) {
  const { analystMemory, clearAnalystMemory } = useWorkspaceStore();
  const insights = analystMemory?.sessionInsights || [];
  const prefs = analystMemory?.userPreferences || {};
  const patterns = analystMemory?.dataPatterns || {};

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
      className="absolute right-0 top-0 h-full w-80 bg-background border-l border-white/8 flex flex-col z-20 shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-purple-400" />
          <span className="text-sm font-semibold">Analyst Memory</span>
        </div>
        <div className="flex items-center gap-1">
          {insights.length > 0 && (
            <button onClick={clearAnalystMemory} className="p-1.5 text-white/25 hover:text-red-400 transition-colors rounded-lg hover:bg-white/5" title="Clear all memory">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
          <button onClick={onClose} className="p-1.5 text-white/30 hover:text-white/70 transition-colors rounded-lg hover:bg-white/5">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* Preferences */}
        {(prefs.preferredMode || prefs.commonMetrics?.length > 0) && (
          <div>
            <div className="text-xs text-white/30 uppercase tracking-widest mb-2 flex items-center gap-1.5">
              <Star className="w-3 h-3" /> Preferences
            </div>
            <div className="glass rounded-xl p-3 space-y-2 text-xs border border-white/5">
              {prefs.preferredMode && (
                <div className="flex items-center justify-between">
                  <span className="text-white/40">Preferred mode</span>
                  <span className="text-purple-400 font-semibold capitalize">{prefs.preferredMode}</span>
                </div>
              )}
              {prefs.commonMetrics?.length > 0 && (
                <div>
                  <span className="text-white/40">Common metrics</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {prefs.commonMetrics.map(m => (
                      <span key={m} className="text-xs px-1.5 py-0.5 bg-purple-400/10 border border-purple-400/15 text-purple-400 rounded-full">{m}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Data patterns */}
        {Object.keys(patterns).length > 0 && (
          <div>
            <div className="text-xs text-white/30 uppercase tracking-widest mb-2 flex items-center gap-1.5">
              <BarChart2 className="w-3 h-3" /> Data Patterns
            </div>
            {Object.entries(patterns).map(([tableId, pat]) => (
              <div key={tableId} className="glass rounded-xl p-3 border border-white/5 text-xs">
                <div className="font-semibold text-white/60 mb-1">{pat.tableName || tableId}</div>
                <p className="text-white/40 leading-relaxed">{pat.summary}</p>
              </div>
            ))}
          </div>
        )}

        {/* Session insights */}
        <div>
          <div className="text-xs text-white/30 uppercase tracking-widest mb-2 flex items-center gap-1.5">
            <Sparkles className="w-3 h-3" /> Session Insights ({insights.length})
          </div>
          {insights.length === 0 ? (
            <div className="text-center py-8 text-white/20 text-xs">
              <Brain className="w-6 h-6 mx-auto mb-2 opacity-40" />
              Ask questions to build memory
            </div>
          ) : (
            <div className="space-y-2">
              {insights.map((insight) => (
                <motion.button key={insight.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  onClick={() => onLoadInsight && onLoadInsight(insight.question)}
                  className="w-full text-left p-3 rounded-xl bg-white/3 border border-white/7 hover:border-purple-400/25 hover:bg-purple-400/5 transition-all group">
                  <div className="text-xs font-semibold text-white/70 group-hover:text-white/90 mb-1 line-clamp-2">{insight.question}</div>
                  {insight.answer && (
                    <div className="text-xs text-white/35 line-clamp-2 leading-relaxed">{insight.answer}</div>
                  )}
                  <div className="flex items-center gap-1 mt-1.5 text-xs text-white/20">
                    <Clock className="w-2.5 h-2.5" />
                    {insight.tableName && <span>{insight.tableName} · </span>}
                    {new Date(insight.timestamp).toLocaleDateString()}
                  </div>
                </motion.button>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}