/**
 * SQLValidationPanel — Phase 3: real-time SQL safety + Inspect mode
 * Shows risk issues, column classifications, and Databricks-style validation sub-queries
 */
import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Shield, AlertTriangle, CheckCircle2, XCircle, ChevronDown, ChevronRight, Loader2, Eye } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const SEVERITY_CONFIG = {
  critical: { color: 'text-red-400', bg: 'bg-red-400/10 border-red-400/20', icon: XCircle },
  high: { color: 'text-amber-400', bg: 'bg-amber-400/10 border-amber-400/20', icon: AlertTriangle },
  medium: { color: 'text-blue-400', bg: 'bg-blue-400/10 border-blue-400/20', icon: AlertTriangle },
};

export default function SQLValidationPanel({ sql, columns, tableName }) {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showInspect, setShowInspect] = useState(false);

  const validate = async () => {
    if (!sql) return;
    setLoading(true);
    try {
      const res = await base44.functions.invoke('validateSQL', { sql, columns, tableName });
      setResult(res.data);
    } catch (e) {
      setResult({ ok: false, error: e.message });
    }
    setLoading(false);
  };

  if (!sql) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <button onClick={validate} disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-shield text-xs font-semibold rounded-lg border border-white/15 text-white/50 hover:text-white/80 hover:bg-white/8 transition-all disabled:opacity-40">
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Shield className="w-3 h-3" />}
          Validate SQL Safety
        </button>
        {result && (
          <span className={`text-xs flex items-center gap-1 font-semibold ${result.valid ? 'text-green-400' : 'text-red-400'}`}>
            {result.valid ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
            {result.valid ? 'Safe to execute' : `${result.risk?.issues?.length || 1} risk(s) detected`}
          </span>
        )}
      </div>

      <AnimatePresence>
        {result && (
          <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-2">
            {/* Risk issues */}
            {result.risk?.issues?.map((issue, i) => {
              const cfg = SEVERITY_CONFIG[issue.severity] || SEVERITY_CONFIG.medium;
              const IssueIcon = cfg.icon;
              return (
                <div key={i} className={`flex items-start gap-2 px-3 py-2.5 rounded-xl border text-xs ${cfg.bg}`}>
                  <IssueIcon className={`w-3.5 h-3.5 flex-shrink-0 mt-0.5 ${cfg.color}`} />
                  <div>
                    <span className={`font-bold ${cfg.color}`}>[{issue.severity.toUpperCase()}]</span>{' '}
                    <span className="text-white/70">{issue.message}</span>
                  </div>
                </div>
              );
            })}

            {/* Safe columns summary */}
            {result.safe_numeric_columns?.length > 0 && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-green-400/5 border border-green-400/15 text-xs">
                <CheckCircle2 className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
                <span className="text-green-400/80">Safe to aggregate: </span>
                <span className="font-mono text-white/50">{result.safe_numeric_columns.join(', ')}</span>
              </div>
            )}
            {result.unsafe_columns?.length > 0 && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-red-400/5 border border-red-400/15 text-xs">
                <XCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
                <span className="text-red-400/80">Never SUM/AVG: </span>
                <span className="font-mono text-white/50">{result.unsafe_columns.join(', ')}</span>
              </div>
            )}

            {/* Inspect mode */}
            {result.inspect_queries?.length > 0 && (
              <div className="rounded-xl border border-white/8 overflow-hidden">
                <button onClick={() => setShowInspect(v => !v)}
                  className="w-full flex items-center gap-2 px-3 py-2 bg-white/3 hover:bg-white/5 transition-all text-xs text-white/50">
                  <Eye className="w-3.5 h-3.5 text-indigo-400" />
                  <span className="text-indigo-400 font-semibold">Inspect Mode</span>
                  <span className="text-white/30">— {result.inspect_queries.length} validation sub-queries</span>
                  {showInspect ? <ChevronDown className="w-3 h-3 ml-auto" /> : <ChevronRight className="w-3 h-3 ml-auto" />}
                </button>
                <AnimatePresence>
                  {showInspect && (
                    <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                      <div className="p-3 space-y-2 border-t border-white/8">
                        {result.inspect_queries.map((q, i) => (
                          <div key={i} className="space-y-1">
                            <div className="text-xs text-white/40">{q.purpose}</div>
                            <code className="text-xs text-cyan-400/70 block bg-white/3 rounded-lg px-3 py-2 font-mono">{q.sql}</code>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}