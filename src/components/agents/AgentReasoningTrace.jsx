/**
 * AgentReasoningTrace — Shows the full F-D-E-A-R reasoning breakdown per answer.
 * Builds executive trust by exposing every tool call, KPI, and confidence score.
 */
import { useState } from 'react';
import { ChevronDown, ChevronUp, Brain, Database, Code2, Target, Zap, TrendingUp, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const FDEАР_STEPS = [
  { key: 'f_step', label: 'Frame', icon: Target, color: '#00e5ff', desc: 'Business question framed' },
  { key: 'd_step', label: 'Diagnose', icon: Brain, color: '#a855f7', desc: 'KPI & data diagnosed' },
  { key: 'e_step', label: 'Explain', icon: TrendingUp, color: '#ffcc02', desc: 'Root cause explained' },
  { key: 'a_step', label: 'Act', icon: Zap, color: '#4caf50', desc: 'Action recommended' },
  { key: 'r_step', label: 'Review', icon: CheckCircle2, color: '#00bfa5', desc: 'Follow-up defined' },
];

export default function AgentReasoningTrace({ trace, agentColor }) {
  const [open, setOpen] = useState(false);

  if (!trace) return null;

  const confidenceColor = trace.confidence_score >= 80 ? '#4caf50' : trace.confidence_score >= 60 ? '#ffcc02' : '#ef4444';

  return (
    <div className="mt-2 border border-white/8 rounded-xl overflow-hidden">
      <button onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-3 py-2 text-xs hover:bg-white/3 transition-colors">
        <div className="flex items-center gap-2 text-white/40">
          <Brain className="w-3.5 h-3.5" style={{ color: agentColor }} />
          <span>Reasoning Trace</span>
          <span className="px-1.5 py-0.5 rounded-full text-xs font-mono" style={{ background: `${confidenceColor}20`, color: confidenceColor }}>
            {trace.confidence_score}% confidence
          </span>
          {trace.anomalies_found > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-amber-400/15 text-amber-400">
              {trace.anomalies_found} anomal{trace.anomalies_found > 1 ? 'ies' : 'y'}
            </span>
          )}
        </div>
        {open ? <ChevronUp className="w-3 h-3 text-white/25" /> : <ChevronDown className="w-3 h-3 text-white/25" />}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
            <div className="px-3 pb-3 space-y-3 border-t border-white/5">

              {/* Metadata row */}
              <div className="grid grid-cols-2 gap-2 pt-2">
                <div className="p-2 rounded-lg bg-white/3 border border-white/5">
                  <div className="text-xs text-white/25 mb-0.5">Intent Classified</div>
                  <div className="text-xs font-semibold capitalize" style={{ color: agentColor }}>{trace.interpreted_intent}</div>
                </div>
                <div className="p-2 rounded-lg bg-white/3 border border-white/5">
                  <div className="text-xs text-white/25 mb-0.5">Dataset</div>
                  <div className="text-xs font-semibold text-white/60 truncate">{trace.dataset_used || 'No dataset'}</div>
                </div>
                <div className="p-2 rounded-lg bg-white/3 border border-white/5">
                  <div className="text-xs text-white/25 mb-0.5">Statistical Method</div>
                  <div className="text-xs text-white/55">{trace.statistical_method}</div>
                </div>
                <div className="p-2 rounded-lg bg-white/3 border border-white/5">
                  <div className="text-xs text-white/25 mb-0.5">KPIs Analyzed</div>
                  <div className="text-xs text-white/55 truncate">{trace.kpis_used?.slice(0,3).join(', ')}</div>
                </div>
              </div>

              {/* Tools called */}
              {trace.tools_called?.length > 0 && (
                <div>
                  <div className="text-xs text-white/25 mb-1.5">Tools Called</div>
                  <div className="flex flex-wrap gap-1">
                    {trace.tools_called.map((t, i) => (
                      <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-white/5 border border-white/8 text-white/45 font-mono">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* SQL */}
              {trace.sql_generated && (
                <div>
                  <div className="flex items-center gap-1.5 text-xs text-white/25 mb-1.5">
                    <Code2 className="w-3 h-3" /> SQL Generated
                  </div>
                  <pre className="text-xs font-mono text-cyan-300/70 bg-white/3 border border-white/5 rounded-lg p-2 overflow-x-auto whitespace-pre-wrap">{trace.sql_generated}</pre>
                </div>
              )}

              {/* F-D-E-A-R steps */}
              <div>
                <div className="text-xs text-white/25 mb-2">F-D-E-A-R Reasoning Steps</div>
                <div className="space-y-1.5">
                  {FDEАР_STEPS.map(step => {
                    const value = trace[step.key];
                    if (!value) return null;
                    const Icon = step.icon;
                    return (
                      <div key={step.key} className="flex items-start gap-2 p-2 rounded-lg bg-white/2 border border-white/5">
                        <div className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0 mt-0.5"
                          style={{ background: `${step.color}15` }}>
                          <Icon className="w-3 h-3" style={{ color: step.color }} />
                        </div>
                        <div>
                          <div className="text-xs font-bold mb-0.5" style={{ color: step.color }}>{step.label}</div>
                          <div className="text-xs text-white/50 leading-relaxed">{value}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Limitations */}
              {trace.limitations && (
                <div className="flex items-start gap-2 p-2 rounded-lg bg-amber-400/5 border border-amber-400/15">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-300/80">{trace.limitations}</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}