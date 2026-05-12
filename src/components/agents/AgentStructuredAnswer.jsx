/**
 * AgentStructuredAnswer — Renders the full executive answer format.
 * Sections: Key Takeaways → Direct Answer → Deep Analysis → Evidence →
 *           Driver → Risk → Recommendations → Impact → Confidence →
 *           Thought Process (collapsible) → Reasoning Trace (collapsible)
 */
import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import AgentReasoningTrace from './AgentReasoningTrace.jsx';
import {
  ThumbsUp, ThumbsDown, MessageSquare, CheckCircle2, AlertTriangle,
  TrendingUp, Zap, Target, BarChart2, ChevronRight, ChevronDown, ChevronUp,
  Brain, Lightbulb, BookOpen,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import EvidenceDrilldown from './EvidenceDrilldown.jsx';

// ── Key Takeaways Box ──────────────────────────────────────────────────────────
function KeyTakeaways({ items, agentColor }) {
  if (!items?.length) return null;
  return (
    <div className="rounded-xl border p-4 space-y-2.5"
      style={{ background: `${agentColor}0a`, borderColor: `${agentColor}30` }}>
      <div className="flex items-center gap-2">
        <Lightbulb className="w-4 h-4 flex-shrink-0" style={{ color: agentColor }} />
        <span className="text-xs font-black uppercase tracking-widest" style={{ color: agentColor }}>Key Takeaways</span>
      </div>
      <ul className="space-y-2">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2.5">
            <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0 mt-0.5"
              style={{ background: `${agentColor}20`, color: agentColor }}>{i + 1}</span>
            <p className="text-sm text-white/85 leading-relaxed">{item}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── Thought Process Log ────────────────────────────────────────────────────────
function ThoughtProcessLog({ steps, agentColor }) {
  const [open, setOpen] = useState(false);
  if (!steps?.length) return null;
  return (
    <div className="rounded-xl border border-white/8 overflow-hidden">
      <button onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-white/3 transition-colors">
        <div className="flex items-center gap-2">
          <Brain className="w-3.5 h-3.5 text-purple-400" />
          <span className="text-xs font-semibold text-white/50">Thought Process</span>
          <span className="text-xs text-white/25">({steps.length} steps)</span>
        </div>
        {open ? <ChevronUp className="w-3.5 h-3.5 text-white/25" /> : <ChevronDown className="w-3.5 h-3.5 text-white/25" />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
            <div className="px-4 pb-3 space-y-1.5 border-t border-white/5">
              {steps.map((step, i) => (
                <div key={i} className="flex items-start gap-2.5 py-1">
                  <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: 'rgba(168,85,247,0.6)' }} />
                  <p className="text-xs text-white/55 leading-relaxed">{step}</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Confidence Bar ─────────────────────────────────────────────────────────────
function ConfidenceBar({ score, explanation }) {
  const color = score >= 80 ? '#4caf50' : score >= 60 ? '#ffcc02' : '#ef4444';
  return (
    <div className="px-3 py-2.5 rounded-xl border border-white/8 bg-white/2">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs text-white/40 font-semibold">Confidence Score</span>
        <span className="text-sm font-black font-mono" style={{ color }}>{score}%</span>
      </div>
      <div className="h-1.5 bg-white/8 rounded-full overflow-hidden">
        <motion.div initial={{ width: 0 }} animate={{ width: `${score}%` }} transition={{ duration: 0.8, ease: 'easeOut' }}
          className="h-full rounded-full" style={{ background: color }} />
      </div>
      {explanation && <p className="text-xs text-white/25 mt-1.5 italic">{explanation}</p>}
    </div>
  );
}

// ── Feedback Bar ───────────────────────────────────────────────────────────────
function FeedbackBar({ sessionId, agentName, question, agentColor }) {
  const [submitted, setSubmitted] = useState(false);
  const [showIssue, setShowIssue] = useState(false);

  const submitFeedback = async (rating, issueType) => {
    base44.entities.AgentFeedback.create({
      sessionId, agentName, userQuestion: question,
      rating, issueType: issueType || undefined,
    }).catch(() => {});
    setSubmitted(true);
    setShowIssue(false);
  };

  if (submitted) return (
    <div className="flex items-center gap-1.5 text-xs text-white/30 pt-1">
      <CheckCircle2 className="w-3 h-3 text-green-400" /> Thanks for the feedback
    </div>
  );

  return (
    <div className="pt-2 border-t border-white/5">
      {!showIssue ? (
        <div className="flex items-center gap-2">
          <span className="text-xs text-white/25">Was this helpful?</span>
          <button onClick={() => submitFeedback('useful')}
            className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg bg-green-400/10 border border-green-400/20 text-green-400 hover:bg-green-400/15 transition-all">
            <ThumbsUp className="w-3 h-3" /> Yes
          </button>
          <button onClick={() => setShowIssue(true)}
            className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg bg-red-400/10 border border-red-400/20 text-red-400 hover:bg-red-400/15 transition-all">
            <ThumbsDown className="w-3 h-3" /> Improve
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap gap-1.5 items-center">
          <span className="text-xs text-white/25">What was wrong?</span>
          {['needs_more_detail','wrong_metric','wrong_chart','better_recommendation','other'].map(issue => (
            <button key={issue} onClick={() => submitFeedback('not_useful', issue)}
              className="text-xs px-2 py-0.5 rounded-lg bg-white/5 border border-white/10 text-white/40 hover:text-white/70 hover:bg-white/8 transition-all capitalize">
              {issue.replace(/_/g,' ')}
            </button>
          ))}
          <button onClick={() => setShowIssue(false)} className="text-xs text-white/20 hover:text-white/50">cancel</button>
        </div>
      )}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function AgentStructuredAnswer({ result, agentColor, agentName, rows, columns }) {
  if (!result) return null;

  const color = agentColor || '#00e5ff';
  const isInsufficient = result.data_sufficiency?.status === 'insufficient';
  const isDomainWeak = result.domain_fit === 'weak';

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="space-y-2.5">

      {/* ── 1. Key Takeaways — always at top ── */}
      <KeyTakeaways items={result.key_takeaways} agentColor={color} />

      {/* ── 2. Domain / Data insufficiency banners ── */}
      {isInsufficient && (
        <div className="p-3 rounded-xl border border-amber-400/30 bg-amber-400/8 flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="text-xs font-bold text-amber-400">Dataset Insufficient for This Question</div>
            <div className="text-xs text-white/60 leading-relaxed">
              Required fields missing: <span className="text-amber-300 font-mono">{result.data_sufficiency.missingFields?.slice(0,5).join(', ')}</span>
            </div>
            {result.data_sufficiency.availableFields?.length > 0 && (
              <div className="text-xs text-white/40">Dataset has: {result.data_sufficiency.availableFields.slice(0,6).join(', ')}</div>
            )}
          </div>
        </div>
      )}

      {isDomainWeak && !isInsufficient && (
        <div className="px-3 py-2 rounded-lg border border-blue-400/20 bg-blue-400/5 flex items-center gap-2">
          <BookOpen className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
          <span className="text-xs text-blue-300">Domain fit is partial — analysis uses best available fields for this persona.</span>
        </div>
      )}

      {/* ── 3. Direct Answer ── */}
      {result.direct_answer && (
        <div className="p-3.5 rounded-xl border" style={{ background: 'rgba(0,229,255,0.06)', borderColor: 'rgba(0,229,255,0.2)' }}>
          <div className="flex items-center gap-1.5 mb-2">
            <CheckCircle2 className="w-3.5 h-3.5" style={{ color }} />
            <span className="text-xs font-bold uppercase tracking-wide" style={{ color }}>Direct Answer</span>
          </div>
          <p className="text-sm text-white/85 leading-relaxed">{result.direct_answer}</p>
        </div>
      )}

      {/* ── 4. Deep Analysis ── */}
      {result.deep_analysis && (
        <div className="p-3.5 rounded-xl border border-indigo-400/20 bg-indigo-400/5">
          <div className="flex items-center gap-1.5 mb-2">
            <Brain className="w-3.5 h-3.5 text-indigo-400" />
            <span className="text-xs font-bold text-indigo-400 uppercase tracking-wide">Deep Analysis</span>
          </div>
          <p className="text-sm text-white/70 leading-relaxed">{result.deep_analysis}</p>
        </div>
      )}

      {/* ── 5. KPI Impact ── */}
      {result.kpi_impact && (
        <div className="px-3 py-2 rounded-lg border border-white/8 bg-white/2 flex items-center gap-2">
          <BarChart2 className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
          <span className="text-xs text-white/40">KPI Impact:</span>
          <span className="text-xs text-purple-300 font-semibold">{result.kpi_impact}</span>
        </div>
      )}

      {/* ── 6. Evidence ── */}
      {result.evidence?.length > 0 && (
        <div className="p-3 rounded-xl border border-blue-400/15 bg-blue-400/5">
          <div className="flex items-center gap-1.5 mb-2">
            <Target className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-xs font-bold text-blue-400 uppercase tracking-wide">Evidence</span>
          </div>
          <ul className="space-y-1">
            {result.evidence.map((e, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-white/65 group">
                <ChevronRight className="w-3 h-3 text-blue-400/60 flex-shrink-0 mt-0.5" />
                <span>{e}</span>
                {rows?.length > 0 && (
                  <EvidenceDrilldown evidenceText={e} rows={rows} columns={columns} color={color} />
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ── 7. Driver / Root Cause ── */}
      {result.driver_root_cause && (
        <div className="p-3 rounded-xl border border-yellow-400/15 bg-yellow-400/5">
          <div className="flex items-center gap-1.5 mb-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-yellow-400" />
            <span className="text-xs font-bold text-yellow-400 uppercase tracking-wide">Driver / Root Cause</span>
          </div>
          <p className="text-xs text-white/65 leading-relaxed">{result.driver_root_cause}</p>
        </div>
      )}

      {/* ── 8. Risk ── */}
      {result.risk && (
        <div className="p-3 rounded-xl border border-red-400/15 bg-red-400/5">
          <div className="flex items-center gap-1.5 mb-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
            <span className="text-xs font-bold text-red-400 uppercase tracking-wide">Risk</span>
          </div>
          <p className="text-xs text-white/65 leading-relaxed">{result.risk}</p>
        </div>
      )}

      {/* ── 9. Recommendations ── */}
      {result.recommendation?.length > 0 && (
        <div className="p-3.5 rounded-xl border border-green-400/20 bg-green-400/6">
          <div className="flex items-center gap-1.5 mb-2">
            <Zap className="w-3.5 h-3.5 text-green-400" />
            <span className="text-xs font-bold text-green-400 uppercase tracking-wide">Recommended Actions</span>
          </div>
          <ol className="space-y-1.5">
            {result.recommendation.map((r, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-white/75">
                <span className="w-4 h-4 rounded-full bg-green-400/20 text-green-400 flex items-center justify-center text-xs flex-shrink-0 mt-0.5 font-bold">{i+1}</span>
                {r}
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* ── 10. Expected Impact + Follow-up ── */}
      <div className="grid grid-cols-2 gap-2">
        {result.expected_impact && (
          <div className="p-2.5 rounded-lg border border-teal-400/15 bg-teal-400/5">
            <div className="text-xs text-teal-400 font-semibold mb-1">Expected Impact</div>
            <p className="text-xs text-white/55 leading-relaxed">{result.expected_impact}</p>
          </div>
        )}
        {result.follow_up_metric && (
          <div className="p-2.5 rounded-lg border border-orange-400/15 bg-orange-400/5">
            <div className="text-xs text-orange-400 font-semibold mb-1">Follow-up Metric</div>
            <p className="text-xs text-white/55 leading-relaxed">{result.follow_up_metric}</p>
          </div>
        )}
      </div>

      {/* ── 11. Confidence ── */}
      <ConfidenceBar score={result.confidence_score || 0} explanation={result.confidence_explanation} />

      {/* ── 12. Suggested next question ── */}
      {result.suggested_next_question && (
        <div className="px-3 py-2.5 rounded-xl border border-purple-400/12 bg-purple-400/4 flex items-center gap-2">
          <MessageSquare className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
          <div>
            <div className="text-xs text-purple-400 font-semibold">Suggested Follow-up</div>
            <div className="text-xs text-white/50 mt-0.5 italic">"{result.suggested_next_question}"</div>
          </div>
        </div>
      )}

      {/* ── 13. Thought Process (collapsible) ── */}
      <ThoughtProcessLog steps={result.thought_process} agentColor={color} />

      {/* ── 14. Reasoning Trace (collapsible) ── */}
      {result.reasoning_trace && (
        <AgentReasoningTrace trace={result.reasoning_trace} agentColor={color} />
      )}

      {/* ── 15. Feedback ── */}
      <FeedbackBar
        sessionId={result.session_id}
        agentName={agentName}
        question={result.userQuestion}
        agentColor={color}
      />
    </motion.div>
  );
}