/**
 * AgentTraceDetail — expanded view of a single AgentTrace record
 * Shows full F-D-E-A-R output, SQL, tools, sufficiency, confidence, feedback
 */
import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { CheckCircle2, XCircle, ChevronDown, ChevronRight, ThumbsUp, ThumbsDown, Clock, Database, Brain, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const RATING_OPTIONS = [
  { value: 'useful', label: '👍 Useful', color: 'text-green-400' },
  { value: 'improve', label: '⚠️ Needs Improvement', color: 'text-amber-400' },
  { value: 'incorrect', label: '❌ Incorrect', color: 'text-red-400' },
  { value: 'missing_data', label: '📭 Missing Data', color: 'text-blue-400' },
];

export default function AgentTraceDetail({ trace, onClose }) {
  const [expanded, setExpanded] = useState({ sql: false, answer: true, tools: false });
  const [rating, setRating] = useState(trace.feedbackRating || '');
  const [saving, setSaving] = useState(false);

  const toggle = (key) => setExpanded(e => ({ ...e, [key]: !e[key] }));

  const submitFeedback = async (r) => {
    setSaving(true);
    setRating(r);
    await base44.entities.AgentTrace.update(trace.id, { feedbackRating: r });
    setSaving(false);
  };

  const sufficiencyColor = trace.dataSufficiencyStatus === 'strong' ? 'text-green-400' :
    trace.dataSufficiencyStatus === 'partial' ? 'text-amber-400' : 'text-red-400';

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="glass-card rounded-2xl p-5 border border-white/8 space-y-3">
        <div className="text-sm font-semibold text-white/80">{trace.userQuestion}</div>
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="px-2 py-0.5 rounded-full bg-purple-400/10 border border-purple-400/20 text-purple-400">{trace.agentName}</span>
          <span className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/40 capitalize">{trace.intent}</span>
          <span className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/40 capitalize">{trace.domain}</span>
          <span className={`px-2 py-0.5 rounded-full bg-white/5 border border-white/10 ${sufficiencyColor}`}>
            Sufficiency: {trace.dataSufficiencyScore}% ({trace.dataSufficiencyStatus})
          </span>
          {trace.durationMs > 0 && <span className="flex items-center gap-1 text-white/30"><Clock className="w-3 h-3" />{trace.durationMs}ms</span>}
        </div>

        {/* Score bar */}
        <div className="grid grid-cols-3 gap-3 text-center">
          {[
            { label: 'Confidence', value: trace.confidenceScore || 0, color: '#00e5ff' },
            { label: 'Answer Quality', value: trace.answerQualityScore || 0, color: '#a855f7' },
            { label: 'Data Sufficiency', value: trace.dataSufficiencyScore || 0, color: '#4ade80' },
          ].map(s => (
            <div key={s.label} className="p-2 rounded-xl bg-white/3 border border-white/6">
              <div className="text-lg font-black" style={{ color: s.color }}>{s.value}%</div>
              <div className="text-xs text-white/30 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tools */}
      {trace.toolsCalled?.length > 0 && (
        <div className="glass-card rounded-xl p-4 border border-white/8">
          <button onClick={() => toggle('tools')} className="flex items-center gap-2 w-full text-xs text-white/50 hover:text-white/70 transition-all">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-semibold text-amber-400">Tools Called</span>
            <span className="text-white/25">({trace.toolsCalled.length})</span>
            {expanded.tools ? <ChevronDown className="w-3 h-3 ml-auto" /> : <ChevronRight className="w-3 h-3 ml-auto" />}
          </button>
          <AnimatePresence>
            {expanded.tools && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                className="mt-3 flex flex-wrap gap-1.5 overflow-hidden">
                {trace.toolsCalled.map(t => (
                  <span key={t} className="text-xs px-2 py-0.5 rounded-full bg-amber-400/10 border border-amber-400/20 text-amber-400/80">{t}</span>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* SQL */}
      {trace.sqlGenerated && (
        <div className="glass-card rounded-xl p-4 border border-white/8">
          <button onClick={() => toggle('sql')} className="flex items-center gap-2 w-full text-xs text-white/50 hover:text-white/70 transition-all">
            <Database className="w-3.5 h-3.5 text-cyan-400" />
            <span className="font-semibold text-cyan-400">SQL Generated</span>
            {trace.sqlSuccess ? <CheckCircle2 className="w-3 h-3 text-green-400" /> : <XCircle className="w-3 h-3 text-red-400" />}
            {expanded.sql ? <ChevronDown className="w-3 h-3 ml-auto" /> : <ChevronRight className="w-3 h-3 ml-auto" />}
          </button>
          <AnimatePresence>
            {expanded.sql && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                <code className="text-xs text-cyan-400/70 block bg-white/3 rounded-lg px-3 py-3 font-mono whitespace-pre-wrap mt-3 max-h-48 overflow-auto">{trace.sqlGenerated}</code>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Final Answer Summary */}
      {trace.finalAnswer && (
        <div className="glass-card rounded-xl p-4 border border-white/8">
          <div className="flex items-center gap-2 mb-2 text-xs text-purple-400 font-semibold">
            <Brain className="w-3.5 h-3.5" /> Final Answer Summary
          </div>
          <div className="text-xs text-white/60 leading-relaxed">{trace.finalAnswer?.executive_summary || JSON.stringify(trace.finalAnswer).slice(0, 300)}</div>
          {trace.missingFields?.length > 0 && (
            <div className="mt-2 text-xs text-amber-400/70">
              Missing fields: {trace.missingFields.join(', ')}
            </div>
          )}
        </div>
      )}

      {/* Feedback */}
      <div className="glass-card rounded-xl p-4 border border-white/8 space-y-2">
        <div className="text-xs text-white/40 font-semibold">User Feedback</div>
        <div className="flex flex-wrap gap-2">
          {RATING_OPTIONS.map(opt => (
            <button key={opt.value} onClick={() => submitFeedback(opt.value)} disabled={saving}
              className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${rating === opt.value ? 'bg-white/10 border-white/20' : 'border-white/8 bg-white/3 hover:bg-white/5'}`}>
              <span className={rating === opt.value ? opt.color : 'text-white/40'}>{opt.label}</span>
            </button>
          ))}
        </div>
        {rating && <div className="text-xs text-white/25">Feedback recorded: {rating}</div>}
      </div>
    </div>
  );
}