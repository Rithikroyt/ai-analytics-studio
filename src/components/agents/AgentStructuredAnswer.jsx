/**
 * AgentStructuredAnswer — Renders the full 10-field executive answer format.
 * CFO / Growth / Operations specific styling and field labels.
 */
import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import ReactMarkdown from 'react-markdown';
import AgentReasoningTrace from './AgentReasoningTrace.jsx';
import { ThumbsUp, ThumbsDown, MessageSquare, CheckCircle2, AlertTriangle, TrendingUp, Zap, Target, BarChart2, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';

const FIELD_CONFIG = {
  direct_answer:     { label: 'Direct Answer',     icon: CheckCircle2, color: '#00e5ff', bg: 'rgba(0,229,255,0.06)', border: 'rgba(0,229,255,0.2)', prominent: true },
  kpi_impact:        { label: 'KPI Impact',         icon: BarChart2,    color: '#a855f7', bg: 'rgba(168,85,247,0.05)', border: 'rgba(168,85,247,0.15)' },
  evidence:          { label: 'Evidence',           icon: Target,       color: '#60a5fa', bg: 'rgba(96,165,250,0.05)', border: 'rgba(96,165,250,0.15)' },
  driver_root_cause: { label: 'Driver / Root Cause',icon: TrendingUp,   color: '#ffcc02', bg: 'rgba(255,204,2,0.05)',  border: 'rgba(255,204,2,0.15)' },
  risk:              { label: 'Risk',               icon: AlertTriangle,color: '#ef4444', bg: 'rgba(239,68,68,0.05)',  border: 'rgba(239,68,68,0.15)' },
  recommendation:    { label: 'Recommended Action', icon: Zap,          color: '#4caf50', bg: 'rgba(76,175,80,0.06)', border: 'rgba(76,175,80,0.2)',  prominent: true },
  expected_impact:   { label: 'Expected Impact',    icon: TrendingUp,   color: '#00bfa5', bg: 'rgba(0,191,165,0.05)', border: 'rgba(0,191,165,0.15)' },
  follow_up_metric:  { label: 'Follow-up Metric',   icon: Target,       color: '#fb923c', bg: 'rgba(251,146,60,0.05)', border: 'rgba(251,146,60,0.15)' },
  suggested_next_question: { label: 'Suggested Next Question', icon: MessageSquare, color: '#a855f7', bg: 'rgba(168,85,247,0.04)', border: 'rgba(168,85,247,0.12)' },
};

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

export default function AgentStructuredAnswer({ result, agentColor, agentName }) {
  if (!result) return null;

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="space-y-2.5">

      {/* Direct answer — prominent */}
      {result.direct_answer && (
        <div className="p-3.5 rounded-xl border" style={{ background: FIELD_CONFIG.direct_answer.bg, borderColor: FIELD_CONFIG.direct_answer.border }}>
          <div className="flex items-center gap-1.5 mb-2">
            <CheckCircle2 className="w-3.5 h-3.5" style={{ color: agentColor }} />
            <span className="text-xs font-bold uppercase tracking-wide" style={{ color: agentColor }}>Direct Answer</span>
          </div>
          <p className="text-sm text-white/85 leading-relaxed font-medium">{result.direct_answer}</p>
        </div>
      )}

      {/* KPI Impact */}
      {result.kpi_impact && (
        <div className="px-3 py-2 rounded-lg border border-white/8 bg-white/2 flex items-center gap-2">
          <BarChart2 className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
          <span className="text-xs text-white/40">KPI Impact:</span>
          <span className="text-xs text-purple-300 font-semibold">{result.kpi_impact}</span>
        </div>
      )}

      {/* Evidence */}
      {result.evidence?.length > 0 && (
        <div className="p-3 rounded-xl border" style={{ background: FIELD_CONFIG.evidence.bg, borderColor: FIELD_CONFIG.evidence.border }}>
          <div className="flex items-center gap-1.5 mb-2">
            <Target className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-xs font-bold text-blue-400 uppercase tracking-wide">Evidence</span>
          </div>
          <ul className="space-y-1">
            {result.evidence.map((e, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-white/65">
                <ChevronRight className="w-3 h-3 text-blue-400/60 flex-shrink-0 mt-0.5" />{e}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Driver / Root Cause */}
      {result.driver_root_cause && (
        <div className="p-3 rounded-xl border" style={{ background: FIELD_CONFIG.driver_root_cause.bg, borderColor: FIELD_CONFIG.driver_root_cause.border }}>
          <div className="flex items-center gap-1.5 mb-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-yellow-400" />
            <span className="text-xs font-bold text-yellow-400 uppercase tracking-wide">Driver / Root Cause</span>
          </div>
          <p className="text-xs text-white/65 leading-relaxed">{result.driver_root_cause}</p>
        </div>
      )}

      {/* Risk */}
      {result.risk && (
        <div className="p-3 rounded-xl border" style={{ background: FIELD_CONFIG.risk.bg, borderColor: FIELD_CONFIG.risk.border }}>
          <div className="flex items-center gap-1.5 mb-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
            <span className="text-xs font-bold text-red-400 uppercase tracking-wide">Risk</span>
          </div>
          <p className="text-xs text-white/65 leading-relaxed">{result.risk}</p>
        </div>
      )}

      {/* Recommendations */}
      {result.recommendation?.length > 0 && (
        <div className="p-3.5 rounded-xl border" style={{ background: FIELD_CONFIG.recommendation.bg, borderColor: FIELD_CONFIG.recommendation.border }}>
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

      {/* Expected Impact + Follow-up in grid */}
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

      {/* Confidence */}
      <ConfidenceBar score={result.confidence_score || 0} explanation={result.confidence_explanation} />

      {/* Suggested next question */}
      {result.suggested_next_question && (
        <div className="px-3 py-2.5 rounded-xl border border-purple-400/12 bg-purple-400/4 flex items-center gap-2">
          <MessageSquare className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
          <div>
            <div className="text-xs text-purple-400 font-semibold">Suggested Follow-up</div>
            <div className="text-xs text-white/50 mt-0.5 italic">"{result.suggested_next_question}"</div>
          </div>
        </div>
      )}

      {/* Reasoning Trace */}
      {result.reasoning_trace && (
        <AgentReasoningTrace trace={result.reasoning_trace} agentColor={agentColor} />
      )}

      {/* Feedback */}
      <FeedbackBar
        sessionId={result.session_id}
        agentName={agentName}
        question={result.userQuestion}
        agentColor={agentColor}
      />
    </motion.div>
  );
}