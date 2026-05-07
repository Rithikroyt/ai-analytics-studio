/**
 * V5 Analyst Message Bubble — Full 10-part structured output renderer
 * Direct Answer | Business Meaning | Evidence | Root Cause | Recommendation |
 * Expected Impact | Confidence | Limitations | Insight Score | Suggested Next Question
 */
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import AnalystChart from './AnalystChart';
import {
  Sparkles, BarChart2, Save, ChevronDown, ChevronUp, TrendingUp, TrendingDown,
  Lightbulb, AlertTriangle, Target, Shield, Info, ArrowRight, Brain,
  CheckCircle2, Zap, Code2, Eye, Copy
} from 'lucide-react';

function InsightScoreBadge({ score }) {
  const color = score >= 80 ? 'text-green-400 bg-green-400/10 border-green-400/25'
    : score >= 60 ? 'text-yellow-400 bg-yellow-400/10 border-yellow-400/25'
    : 'text-red-400 bg-red-400/10 border-red-400/25';
  const label = score >= 80 ? 'High Quality' : score >= 60 ? 'Moderate' : 'Low';
  return (
    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold ${color}`}>
      <Shield className="w-3 h-3" />
      {score}/100 · {label}
    </div>
  );
}

function ConfidenceMeter({ confidence }) {
  const pct = typeof confidence === 'string'
    ? confidence === 'high' ? 85 : confidence === 'medium' ? 60 : 35
    : confidence;
  const color = pct >= 80 ? '#4ade80' : pct >= 60 ? '#fbbf24' : '#f87171';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-xs font-mono" style={{ color }}>{pct}%</span>
    </div>
  );
}

function V5StructuredSection({ icon: SectionIcon, title, children, color = 'text-white/50', expandable = false }) {
  const Icon = SectionIcon;
  const [open, setOpen] = useState(true);
  return (
    <div className="border border-white/5 rounded-xl overflow-hidden">
      <button
        onClick={() => expandable && setOpen(v => !v)}
        className={`w-full flex items-center gap-2 px-3 py-2 bg-white/[0.02] text-left ${expandable ? 'cursor-pointer hover:bg-white/5' : 'cursor-default'}`}>
        <Icon className={`w-3.5 h-3.5 ${color} flex-shrink-0`} />
        <span className={`text-xs font-semibold uppercase tracking-wider ${color}`}>{title}</span>
        {expandable && (open ? <ChevronUp className="w-3 h-3 text-white/30 ml-auto" /> : <ChevronDown className="w-3 h-3 text-white/30 ml-auto" />)}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
            className="overflow-hidden">
            <div className="px-3 py-2.5">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function WorkflowTrail({ steps }) {
  if (!steps) return null;
  const STEP_LABELS = ['Intent', 'KPI', 'Readiness', 'Tools', 'Execute', 'Validate', 'Score', 'Explain', 'Recommend', 'Report'];
  const completedCount = Object.values(steps).filter(v => v !== null).length;
  return (
    <div className="flex items-center gap-0.5 overflow-x-auto py-1">
      {STEP_LABELS.map((label, i) => {
        const done = completedCount > i;
        return (
          <div key={i} className="flex items-center gap-0.5">
            <div className={`text-xs px-1.5 py-0.5 rounded font-medium whitespace-nowrap ${done ? 'bg-green-400/15 text-green-400' : 'bg-white/5 text-white/20'}`}>
              {done ? '✓' : '○'} {label}
            </div>
            {i < STEP_LABELS.length - 1 && <ArrowRight className="w-2.5 h-2.5 text-white/15 flex-shrink-0" />}
          </div>
        );
      })}
    </div>
  );
}

export default function AnalystMessageBubbleV5({ message, onSaveChart, onFollowUp }) {
  const [showCode, setShowCode] = useState(false);

  if (!message) return null;

  const isUser = message.role === 'user';

  if (isUser) {
    return (
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        className="flex justify-end mb-3">
        <div className="max-w-[75%] px-4 py-2.5 rounded-2xl bg-purple-400/15 border border-purple-400/20 text-sm text-white/80">
          {message.content}
        </div>
      </motion.div>
    );
  }

  const {
    answer,
    businessMeaning,
    charts,
    tables,
    evidence,
    rootCause,
    recommendations,
    expectedImpact,
    confidence,
    limitations,
    insightScore,
    nextQuestion,
    sqlUsed,
    pythonUsed,
    workflowSteps,
  } = message;

  const score = insightScore?.overallScore || insightScore?.data?.overallScore;
  const conf = confidence?.confidence || confidence;
  const recs = Array.isArray(recommendations) ? recommendations : (recommendations ? [recommendations] : []);

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex gap-3 mb-5">
      {/* Avatar */}
      <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-purple-400/20 to-blue-400/10 border border-purple-400/25 flex items-center justify-center flex-shrink-0 mt-0.5">
        <Brain className="w-3.5 h-3.5 text-purple-400" />
      </div>

      <div className="flex-1 min-w-0 space-y-2">
        {/* Workflow trail */}
        {workflowSteps && <WorkflowTrail steps={workflowSteps} />}

        {/* Part 1: Direct Answer */}
        {answer && (
          <div className="glass-card rounded-2xl border border-white/8 overflow-hidden">
            <div className="flex items-center gap-2 px-4 pt-3 pb-1">
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              <span className="text-xs font-semibold text-purple-400/80 uppercase tracking-wide">AI Analyst V5</span>
              {score && <InsightScoreBadge score={score} />}
            </div>
            <div className="px-4 pb-4 pt-2 text-sm text-white/80 leading-relaxed">
              <ReactMarkdown components={{
                p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                strong: ({ children }) => <strong className="text-white font-semibold">{children}</strong>,
                ul: ({ children }) => <ul className="list-disc list-inside space-y-1 my-2">{children}</ul>,
                li: ({ children }) => <li className="text-white/70">{children}</li>,
              }}>
                {answer}
              </ReactMarkdown>
            </div>
          </div>
        )}

        {/* Part 2: Charts & Evidence */}
        {charts?.length > 0 && (
          <div className="space-y-3">
            {charts.map((chart, i) => (
              <div key={i} className="glass-card rounded-2xl border border-white/8 p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-white/60">{chart.title}</span>
                  {onSaveChart && (
                    <button onClick={() => onSaveChart(chart)}
                      className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg bg-cyan-400/10 border border-cyan-400/20 text-cyan-400 hover:bg-cyan-400/15 transition-all">
                      <Save className="w-3 h-3" /> Save
                    </button>
                  )}
                </div>
                <AnalystChart chart={chart} height={200} />
              </div>
            ))}
          </div>
        )}

        {/* Parts 3-10: Structured sections */}
        <div className="space-y-1.5">
          {/* Part 3: Business Meaning */}
          {businessMeaning && (
            <V5StructuredSection icon={TrendingUp} title="Business Meaning" color="text-cyan-400" expandable>
              <p className="text-xs text-white/65 leading-relaxed">{businessMeaning}</p>
            </V5StructuredSection>
          )}

          {/* Part 4: Root Cause */}
          {rootCause && (
            <V5StructuredSection icon={AlertTriangle} title="Root Cause" color="text-amber-400" expandable>
              <p className="text-xs text-white/65 leading-relaxed">{rootCause}</p>
            </V5StructuredSection>
          )}

          {/* Part 5-6: Recommendations & Impact */}
          {recs.length > 0 && (
            <V5StructuredSection icon={Target} title="Recommendations" color="text-green-400" expandable>
              <div className="space-y-2">
                {recs.slice(0, 3).map((rec, i) => {
                  const text = typeof rec === 'string' ? rec : rec.recommendation;
                  return (
                    <div key={i} className="flex items-start gap-2">
                      <div className="w-4 h-4 rounded-full bg-green-400/15 flex items-center justify-center text-xs font-bold text-green-400 flex-shrink-0 mt-0.5">{i + 1}</div>
                      <p className="text-xs text-white/65 leading-relaxed">{text}</p>
                    </div>
                  );
                })}
              </div>
            </V5StructuredSection>
          )}

          {/* Part 7-8: Confidence & Limitations */}
          {(conf || limitations) && (
            <V5StructuredSection icon={Shield} title="Confidence & Limitations" color="text-blue-400" expandable>
              <div className="space-y-2">
                {conf && (
                  <div>
                    <div className="text-xs text-white/40 mb-1">Confidence</div>
                    <ConfidenceMeter confidence={conf} />
                  </div>
                )}
                {limitations && (
                  <div>
                    <div className="text-xs text-white/40 mb-1">Limitations</div>
                    {Array.isArray(limitations)
                      ? limitations.map((l, i) => <p key={i} className="text-xs text-white/50">• {l}</p>)
                      : <p className="text-xs text-white/50">{limitations}</p>}
                  </div>
                )}
              </div>
            </V5StructuredSection>
          )}

          {/* Insight Score Breakdown */}
          {score && (
            <V5StructuredSection icon={Zap} title="Insight Quality Score" color="text-purple-400" expandable>
              <div className="grid grid-cols-2 gap-2">
                {[
                  ['Data Quality', insightScore?.dataQuality ?? insightScore?.data?.dataQuality],
                  ['Sample Strength', insightScore?.sampleStrength ?? insightScore?.data?.sampleStrength],
                  ['Statistical', insightScore?.statisticalStrength ?? insightScore?.data?.statisticalStrength],
                  ['Business', insightScore?.businessRelevance ?? insightScore?.data?.businessRelevance],
                ].map(([label, val]) => val != null && (
                  <div key={label} className="p-2 rounded-lg bg-white/3">
                    <div className="text-xs text-white/40">{label}</div>
                    <div className="text-sm font-bold font-mono text-purple-400">{val}%</div>
                  </div>
                ))}
              </div>
            </V5StructuredSection>
          )}

          {/* SQL / Python Transparency Panel */}
          {(sqlUsed || pythonUsed) && (
            <V5StructuredSection icon={Code2} title="Transparency Panel" color="text-white/40" expandable>
              {showCode ? (
                <div className="space-y-2">
                  {sqlUsed && (
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <div className="text-xs text-white/30">SQL Used</div>
                        <button onClick={() => navigator.clipboard.writeText(sqlUsed)} className="text-xs text-white/30 hover:text-cyan-400"><Copy className="w-3 h-3" /></button>
                      </div>
                      <pre className="text-xs font-mono text-green-300/75 bg-black/30 p-2 rounded-lg overflow-auto max-h-24">{sqlUsed}</pre>
                    </div>
                  )}
                  {pythonUsed && (
                    <div>
                      <div className="text-xs text-white/30 mb-1">Python Logic</div>
                      <pre className="text-xs font-mono text-blue-300/75 bg-black/30 p-2 rounded-lg overflow-auto max-h-24">{pythonUsed}</pre>
                    </div>
                  )}
                  <button onClick={() => setShowCode(false)} className="text-xs text-white/30 hover:text-white/60">Hide code</button>
                </div>
              ) : (
                <button onClick={() => setShowCode(true)} className="flex items-center gap-1.5 text-xs text-white/40 hover:text-cyan-400 transition-colors">
                  <Eye className="w-3 h-3" /> View SQL & Python code
                </button>
              )}
            </V5StructuredSection>
          )}
        </div>

        {/* Part 10: Suggested Next Question */}
        {nextQuestion && onFollowUp && (
          <button onClick={() => onFollowUp(nextQuestion)}
            className="w-full flex items-center gap-2 p-3 rounded-xl border border-white/5 bg-white/2 hover:border-purple-400/25 hover:bg-purple-400/5 transition-all text-left group">
            <ArrowRight className="w-3.5 h-3.5 text-white/25 group-hover:text-purple-400 transition-colors flex-shrink-0" />
            <span className="text-xs text-white/40 group-hover:text-white/70 transition-colors">{nextQuestion}</span>
          </button>
        )}
      </div>
    </motion.div>
  );
}