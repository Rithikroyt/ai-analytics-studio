import { useState } from 'react';
import {
  ChevronDown, ChevronRight, Brain, Shield, TrendingUp, AlertTriangle,
  Zap, CheckCircle2, Database, Code2, Target, BarChart2, Clock,
  ThumbsUp, ThumbsDown, Lightbulb, Search, Activity
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';

const IQ_LABELS = {
  1: { label: 'Level 1 — Descriptive Analyst', color: 'text-white/40', bg: 'bg-white/5', desc: 'What happened?' },
  2: { label: 'Level 2 — Diagnostic Analyst', color: 'text-blue-400', bg: 'bg-blue-400/10', desc: 'Why did it happen?' },
  3: { label: 'Level 3 — Predictive Analyst', color: 'text-purple-400', bg: 'bg-purple-400/10', desc: 'What may happen next?' },
  4: { label: 'Level 4 — Prescriptive Analyst', color: 'text-amber-400', bg: 'bg-amber-400/10', desc: 'What should we do?' },
  5: { label: 'Level 5 — Principal Analyst', color: 'text-cyan-400', bg: 'bg-cyan-400/10', desc: 'What strategic decision should leadership make?' },
};

const SUFFICIENCY_COLORS = {
  strong: 'text-green-400 bg-green-400/10 border-green-400/25',
  partial: 'text-amber-400 bg-amber-400/10 border-amber-400/25',
  limited: 'text-orange-400 bg-orange-400/10 border-orange-400/25',
  insufficient: 'text-red-400 bg-red-400/10 border-red-400/25',
};

const PRIORITY_COLORS = {
  High: 'text-red-400 bg-red-400/10 border-red-400/20',
  Medium: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
  Low: 'text-green-400 bg-green-400/10 border-green-400/20',
};

function Collapsible({ title, icon: Icon, iconColor = 'text-white/50', children, defaultOpen = false, badge }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-white/8 rounded-xl overflow-hidden">
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-white/2 hover:bg-white/4 transition-all text-left">
        <div className="flex items-center gap-2.5">
          <Icon className={`w-4 h-4 flex-shrink-0 ${iconColor}`} />
          <span className="text-sm font-semibold text-white/80">{title}</span>
          {badge && <span className="text-xs px-2 py-0.5 rounded-full bg-white/8 text-white/40">{badge}</span>}
        </div>
        {open ? <ChevronDown className="w-4 h-4 text-white/30" /> : <ChevronRight className="w-4 h-4 text-white/30" />}
      </button>
      {open && <div className="px-4 py-4 border-t border-white/5">{children}</div>}
    </div>
  );
}

function FDEARPanel({ fdear }) {
  if (!fdear) return null;
  const steps = [
    { key: 'frame', label: 'Frame', color: 'text-cyan-400', bg: 'bg-cyan-400/8 border-cyan-400/20', desc: 'Business question & context' },
    { key: 'diagnose', label: 'Diagnose', color: 'text-blue-400', bg: 'bg-blue-400/8 border-blue-400/20', desc: 'Data & root cause' },
    { key: 'evaluate', label: 'Evaluate', color: 'text-purple-400', bg: 'bg-purple-400/8 border-purple-400/20', desc: 'Impact & risk' },
    { key: 'act', label: 'Act', color: 'text-amber-400', bg: 'bg-amber-400/8 border-amber-400/20', desc: 'Recommendations' },
    { key: 'review', label: 'Review', color: 'text-green-400', bg: 'bg-green-400/8 border-green-400/20', desc: 'Success metrics' },
  ];
  return (
    <div className="space-y-2">
      {steps.map(s => fdear[s.key] ? (
        <div key={s.key} className={`rounded-xl border p-3 ${s.bg}`}>
          <div className={`text-xs font-bold uppercase tracking-widest mb-1 ${s.color}`}>{s.label} — {s.desc}</div>
          <p className="text-sm text-white/70 leading-relaxed">{fdear[s.key]}</p>
        </div>
      ) : null)}
    </div>
  );
}

export default function PrincipalAnswerCard({ answer, onFeedback }) {
  const [feedback, setFeedback] = useState(null);

  if (!answer) return null;

  // Guard against shallow "analysis complete" answers
  const execSummary = answer.executive_summary && !answer.executive_summary.toLowerCase().includes('analysis complete')
    ? answer.executive_summary
    : answer.executive_summary || 'No summary available.';

  const iq = IQ_LABELS[answer.iq_level || 5];
  const suf = SUFFICIENCY_COLORS[answer.data_sufficiency?.status || 'partial'];
  const conf = answer.confidence_score || answer.decision_confidence || 0;
  const confColor = conf >= 80 ? 'text-green-400' : conf >= 60 ? 'text-amber-400' : 'text-red-400';

  // Quality checks
  const missingRequired = [];
  if (!answer.evidence?.length) missingRequired.push('Evidence');
  if (!answer.metrics_used?.length) missingRequired.push('Metrics Used');
  if (!answer.root_cause) missingRequired.push('Root Cause');
  if (!answer.business_impact) missingRequired.push('Business Impact');
  if (!answer.risk_assessment) missingRequired.push('Risk Assessment');
  if (!answer.recommendations?.length) missingRequired.push('Recommendations');
  if (!answer.limitations?.length) missingRequired.push('Limitations');
  if (!answer.next_questions?.length) missingRequired.push('Next Questions');

  const handleFeedback = (type) => {
    setFeedback(type);
    if (onFeedback) onFeedback(type, answer);
  };

  return (
    <div className="space-y-4">
      {/* Header bar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-bold ${iq.bg} ${iq.color} border-current/20`}>
          <Brain className="w-3.5 h-3.5" />
          {iq.label}
        </div>
        <div className="flex items-center gap-3">
          {answer.intent_classified && (
            <span className="text-xs px-2 py-1 rounded-full bg-white/5 border border-white/10 text-white/40 capitalize">
              Intent: {answer.intent_classified}
            </span>
          )}
          {answer.persona && (
            <span className="text-xs px-2 py-1 rounded-full bg-cyan-400/8 border border-cyan-400/20 text-cyan-400">
              {answer.persona}
            </span>
          )}
          {answer.duration_ms && (
            <span className="flex items-center gap-1 text-xs text-white/25">
              <Clock className="w-3 h-3" />{(answer.duration_ms / 1000).toFixed(1)}s
            </span>
          )}
        </div>
      </div>

      {/* Executive Summary */}
      <div className="glass-card rounded-2xl border border-cyan-400/20 p-5">
        <div className="flex items-center gap-2 mb-3">
          <Zap className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-bold text-cyan-400 uppercase tracking-widest">Executive Summary</span>
        </div>
        {missingRequired.length > 0 && (
          <div className="mb-3 px-3 py-2 rounded-lg bg-amber-400/8 border border-amber-400/20 text-xs text-amber-400">
            ⚠️ Answer incomplete — missing sections: {missingRequired.join(', ')}
          </div>
        )}
        <p className="text-sm text-white/85 leading-relaxed">{execSummary}</p>
      </div>

      {/* Confidence + Data Sufficiency row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="glass-card rounded-xl border border-white/8 p-3 text-center">
          <div className={`text-2xl font-black ${confColor}`}>{conf}%</div>
          <div className="text-xs text-white/30 mt-0.5">Decision Confidence</div>
        </div>
        <div className={`glass-card rounded-xl border p-3 text-center ${suf}`}>
          <div className="text-lg font-black">{answer.data_sufficiency?.score || 0}%</div>
          <div className="text-xs mt-0.5 opacity-80">Data Sufficiency</div>
          <div className="text-xs font-semibold capitalize">{answer.data_sufficiency?.status || '—'}</div>
        </div>
        <div className="glass-card rounded-xl border border-white/8 p-3 text-center">
          <div className="text-2xl font-black text-purple-400">{answer.evidence?.length || 0}</div>
          <div className="text-xs text-white/30 mt-0.5">Evidence Points</div>
        </div>
        <div className="glass-card rounded-xl border border-white/8 p-3 text-center">
          <div className="text-2xl font-black text-amber-400">{answer.recommendations?.length || 0}</div>
          <div className="text-xs text-white/30 mt-0.5">Recommendations</div>
        </div>
      </div>

      {/* F-D-E-A-R Reasoning */}
      {answer.fdear && (
        <Collapsible title="F-D-E-A-R Reasoning Chain" icon={Search} iconColor="text-cyan-400" defaultOpen badge="Principal">
          <FDEARPanel fdear={answer.fdear} />
        </Collapsible>
      )}

      {/* Evidence */}
      {answer.evidence?.length > 0 && (
        <Collapsible title="Evidence" icon={Database} iconColor="text-blue-400" defaultOpen={true} badge={answer.evidence.length}>
          <div className="space-y-2">
            {answer.evidence.map((e, i) => (
              <div key={i} className="rounded-xl bg-white/3 border border-white/8 p-3">
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white/80 font-medium">{e.finding}</p>
                    {e.value && <span className="text-xs text-cyan-400 font-bold mt-0.5 block">{e.value}</span>}
                    {e.sql_or_method && (
                      <code className="text-xs text-green-400/70 font-mono mt-1 block truncate">{e.sql_or_method}</code>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Collapsible>
      )}

      {/* Recommendations */}
      {answer.recommendations?.length > 0 && (
        <Collapsible title="Prioritized Recommendations" icon={Target} iconColor="text-amber-400" defaultOpen={true} badge={answer.recommendations.length}>
          <div className="space-y-3">
            {answer.recommendations.map((r, i) => (
              <div key={i} className="rounded-xl bg-white/3 border border-white/8 p-4">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-white/30">#{i + 1}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-bold ${PRIORITY_COLORS[r.priority] || PRIORITY_COLORS.Medium}`}>
                      {r.priority}
                    </span>
                    <span className="text-xs text-white/30">Effort: {r.effort}</span>
                  </div>
                  {r.priority_score && (
                    <span className="text-xs font-mono text-amber-400">Score: {r.priority_score}</span>
                  )}
                </div>
                <p className="text-sm text-white/80 font-medium mb-2">{r.action}</p>
                <div className="flex flex-wrap gap-3 text-xs text-white/40">
                  {r.expected_impact && <span>Impact: <span className="text-green-400">{r.expected_impact}</span></span>}
                  {r.owner && <span>Owner: <span className="text-white/60">{r.owner}</span></span>}
                  {r.next_metric_to_monitor && <span>Monitor: <span className="text-cyan-400">{r.next_metric_to_monitor}</span></span>}
                </div>
              </div>
            ))}
          </div>
        </Collapsible>
      )}

      {/* Business Impact + Risk */}
      {(answer.business_impact || answer.risk_assessment) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {answer.business_impact && (
            <div className="rounded-xl bg-green-400/5 border border-green-400/15 p-4">
              <div className="flex items-center gap-1.5 mb-2">
                <TrendingUp className="w-3.5 h-3.5 text-green-400" />
                <span className="text-xs font-bold text-green-400 uppercase tracking-wider">Business Impact</span>
              </div>
              <p className="text-sm text-white/70 leading-relaxed">{answer.business_impact}</p>
            </div>
          )}
          {answer.risk_assessment && (
            <div className="rounded-xl bg-red-400/5 border border-red-400/15 p-4">
              <div className="flex items-center gap-1.5 mb-2">
                <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                <span className="text-xs font-bold text-red-400 uppercase tracking-wider">Risk Assessment</span>
              </div>
              <p className="text-sm text-white/70 leading-relaxed">{answer.risk_assessment}</p>
            </div>
          )}
        </div>
      )}

      {/* Metrics Used */}
      {answer.metrics_used?.length > 0 && (
        <Collapsible title="Metrics Used" icon={BarChart2} iconColor="text-purple-400" badge={answer.metrics_used.length}>
          <div className="space-y-2">
            {answer.metrics_used.map((m, i) => (
              <div key={i} className="rounded-xl bg-white/3 border border-white/8 p-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-bold text-white/80">{m.metric}</span>
                  {m.source_columns?.length > 0 && (
                    <span className="text-xs text-cyan-400/60 font-mono">[{m.source_columns.join(', ')}]</span>
                  )}
                </div>
                {m.definition && <p className="text-xs text-white/50">{m.definition}</p>}
                {m.formula && <code className="text-xs text-green-400/70 font-mono mt-1 block">{m.formula}</code>}
                {m.value_observed && <span className="text-xs text-amber-400/80 mt-1 block">Observed: {m.value_observed}</span>}
              </div>
            ))}
          </div>
        </Collapsible>
      )}

      {/* Missing Fields Warning */}
      {(answer.missing_fields?.length > 0 || answer.data_sufficiency?.missing_required?.length > 0) && (
        <div className="rounded-xl bg-amber-400/5 border border-amber-400/20 p-4">
          <div className="flex items-center gap-1.5 mb-2">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">Missing Fields & Partial Analysis</span>
          </div>
          {(answer.missing_fields || answer.data_sufficiency?.missing_required || []).map((f, i) => (
            <div key={i} className="text-xs text-white/60 leading-relaxed">⚠️ Missing: <span className="text-amber-400 font-mono">{f}</span></div>
          ))}
          {answer.data_sufficiency?.partial_analysis_possible && (
            <p className="text-xs text-white/50 mt-2 leading-relaxed">{answer.data_sufficiency.partial_analysis_possible}</p>
          )}
        </div>
      )}

      {/* SQL Safety */}
      {answer.unsafe_columns?.length > 0 && (
        <div className="rounded-xl bg-red-400/5 border border-red-400/20 p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Shield className="w-3.5 h-3.5 text-red-400" />
            <span className="text-xs font-bold text-red-400 uppercase tracking-wider">SQL Safety — Never Aggregated</span>
          </div>
          <p className="text-xs text-white/50">These columns were blocked from SUM/AVG: <span className="font-mono text-red-400/70">{answer.unsafe_columns.join(', ')}</span></p>
        </div>
      )}

      {/* SQL Generated */}
      {answer.sql_generated && (
        <Collapsible title="SQL Evidence" icon={Code2} iconColor="text-green-400">
          <div className="space-y-2">
            {(answer.sql_queries || [{ title: 'Primary Query', sql: answer.sql_generated }]).map((q, i) => (
              <div key={i}>
                <div className="text-xs text-white/30 mb-1">{q.title || q.sql && 'Query'}</div>
                <pre className="bg-black/30 border border-white/8 rounded-xl p-3 text-xs text-green-400 font-mono overflow-x-auto whitespace-pre-wrap">{q.sql}</pre>
              </div>
            ))}
            {answer.sql_risk?.issues?.length > 0 && (
              <div className="flex items-start gap-2 p-3 rounded-xl bg-red-400/8 border border-red-400/20 text-red-400 text-xs">
                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold mb-1">SQL Risk Detected</div>
                  {answer.sql_risk.issues.map((issue, j) => <div key={j}>{issue.column}: {issue.issue}</div>)}
                </div>
              </div>
            )}
          </div>
        </Collapsible>
      )}

      {/* Limitations + Next Questions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {answer.limitations?.length > 0 && (
          <div className="rounded-xl bg-white/3 border border-white/8 p-4">
            <div className="flex items-center gap-1.5 mb-2">
              <AlertTriangle className="w-3.5 h-3.5 text-white/40" />
              <span className="text-xs font-bold text-white/40 uppercase tracking-wider">Limitations</span>
            </div>
            <ul className="space-y-1">
              {answer.limitations.map((l, i) => <li key={i} className="text-xs text-white/50 leading-relaxed">• {l}</li>)}
            </ul>
          </div>
        )}
        {answer.next_questions?.length > 0 && (
          <div className="rounded-xl bg-cyan-400/5 border border-cyan-400/15 p-4">
            <div className="flex items-center gap-1.5 mb-2">
              <Lightbulb className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider">Next Questions</span>
            </div>
            <ul className="space-y-1">
              {answer.next_questions.map((q, i) => <li key={i} className="text-xs text-white/60 leading-relaxed">• {q}</li>)}
            </ul>
          </div>
        )}
      </div>

      {/* Tools + Feedback */}
      <div className="flex items-center justify-between flex-wrap gap-3 pt-1 border-t border-white/5">
        {answer.tools_used?.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <Activity className="w-3 h-3 text-white/25" />
            {answer.tools_used.map(t => (
              <span key={t} className="text-xs px-2 py-0.5 rounded-full bg-white/5 border border-white/8 text-white/30">{t}</span>
            ))}
          </div>
        )}
        <div className="flex items-center gap-2">
          <span className="text-xs text-white/25">Was this helpful?</span>
          <button onClick={() => handleFeedback('up')}
            className={`p-1.5 rounded-lg transition-all ${feedback === 'up' ? 'text-green-400 bg-green-400/15' : 'text-white/30 hover:text-green-400'}`}>
            <ThumbsUp className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => handleFeedback('down')}
            className={`p-1.5 rounded-lg transition-all ${feedback === 'down' ? 'text-red-400 bg-red-400/15' : 'text-white/30 hover:text-red-400'}`}>
            <ThumbsDown className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}