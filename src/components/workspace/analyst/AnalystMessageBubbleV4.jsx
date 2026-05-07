/**
 * AnalystMessageBubble V4 — 9-Part Structured Response Renderer
 * Direct Answer · Business Meaning · Evidence · Root Cause · Actions · Confidence · Limitations · Next Question
 */
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import AnalystChart from '@/components/workspace/analyst/AnalystChart';
import {
  Brain, TrendingUp, AlertTriangle, Lightbulb, Target, Shield,
  ChevronDown, ChevronRight, Bookmark, User, BarChart2,
  CheckCircle2, Info, Zap, ArrowRight, Star
} from 'lucide-react';

const INTENT_META = {
  exploratory:    { label: 'Exploratory',   color: 'text-cyan-400',   bg: 'bg-cyan-400/10',   border: 'border-cyan-400/20' },
  predictive:     { label: 'Predictive',    color: 'text-purple-400', bg: 'bg-purple-400/10', border: 'border-purple-400/20' },
  diagnostic:     { label: 'Diagnostic',    color: 'text-orange-400', bg: 'bg-orange-400/10', border: 'border-orange-400/20' },
  prescriptive:   { label: 'Prescriptive',  color: 'text-green-400',  bg: 'bg-green-400/10',  border: 'border-green-400/20' },
  contribution:   { label: 'Contribution',  color: 'text-amber-400',  bg: 'bg-amber-400/10',  border: 'border-amber-400/20' },
  rfm:            { label: 'RFM',           color: 'text-teal-400',   bg: 'bg-teal-400/10',   border: 'border-teal-400/20' },
  funnel:         { label: 'Funnel',        color: 'text-pink-400',   bg: 'bg-pink-400/10',   border: 'border-pink-400/20' },
  cohort:         { label: 'Cohort',        color: 'text-indigo-400', bg: 'bg-indigo-400/10', border: 'border-indigo-400/20' },
  clv:            { label: 'CLV',           color: 'text-green-400',  bg: 'bg-green-400/10',  border: 'border-green-400/20' },
  forecast_eval:  { label: 'Forecast Eval', color: 'text-purple-400', bg: 'bg-purple-400/10', border: 'border-purple-400/20' },
  quality:        { label: 'Quality',       color: 'text-white/60',   bg: 'bg-white/5',       border: 'border-white/15' },
  sql:            { label: 'SQL',           color: 'text-cyan-400',   bg: 'bg-cyan-400/10',   border: 'border-cyan-400/20' },
  visual:         { label: 'Visual',        color: 'text-teal-400',   bg: 'bg-teal-400/10',   border: 'border-teal-400/20' },
};

function ConfidenceBadge({ value }) {
  const color = value >= 80 ? 'text-green-400' : value >= 60 ? 'text-amber-400' : 'text-red-400';
  const bg = value >= 80 ? 'bg-green-400/10 border-green-400/20' : value >= 60 ? 'bg-amber-400/10 border-amber-400/20' : 'bg-red-400/10 border-red-400/20';
  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold ${bg} ${color}`}>
      <div className={`w-1.5 h-1.5 rounded-full ${color.replace('text-', 'bg-')}`} />
      {value}% confidence
    </div>
  );
}

function Section({ icon: SectionIcon, label, color, children, defaultOpen = false, compact = false }) {
  const Icon = SectionIcon;
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={`border-t ${compact ? 'border-white/4' : 'border-white/6'} pt-2`}>
      <button onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between text-left py-1 group">
        <div className="flex items-center gap-1.5">
          <Icon className={`w-3.5 h-3.5 ${color}`} />
          <span className={`text-xs font-semibold uppercase tracking-wider ${color}`}>{label}</span>
        </div>
        <ChevronDown className={`w-3 h-3 text-white/25 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="pb-2 pt-1 text-xs text-white/65 leading-relaxed">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function RecommendationCard({ rec, index }) {
  const priorityColors = { high: 'text-red-400 bg-red-400/10 border-red-400/20', medium: 'text-amber-400 bg-amber-400/10 border-amber-400/20', low: 'text-blue-400 bg-blue-400/10 border-blue-400/20' };
  const pc = priorityColors[rec.priority] || priorityColors.medium;
  return (
    <div className="flex items-start gap-2.5 py-2">
      <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0 mt-0.5 ${pc} border`}>{index + 1}</div>
      <p className="text-xs text-white/70 leading-relaxed flex-1">{rec.action}</p>
      <span className={`text-xs px-1.5 py-0.5 rounded-full border flex-shrink-0 ${pc} font-medium`}>{rec.priority}</span>
    </div>
  );
}

export default function AnalystMessageBubbleV4({ message, onSaveChart, onFollowUp }) {
  const isUser = message.role === 'user';
  const isV4 = message.v4 === true;
  const { sections = {}, confidenceNum, intent, insights = [], recommendations = [], charts = [], nextQuestion } = message;
  const meta = INTENT_META[intent] || INTENT_META.exploratory;

  if (isUser) {
    return (
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex justify-end">
        <div className="flex items-end gap-2 max-w-[80%]">
          <div className="px-4 py-3 rounded-2xl rounded-br-sm bg-white/8 border border-white/10 text-sm text-white/85 leading-relaxed">
            {message.answer || message.content}
          </div>
          <div className="w-7 h-7 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
            <User className="w-3.5 h-3.5 text-white/50" />
          </div>
        </div>
      </motion.div>
    );
  }

  // Legacy non-V4 fallback
  if (!isV4) {
    return (
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex gap-3">
        <div className="w-7 h-7 rounded-xl bg-purple-400/15 border border-purple-400/25 flex items-center justify-center flex-shrink-0 mt-1">
          <Brain className="w-3.5 h-3.5 text-purple-400" />
        </div>
        <div className="flex-1 max-w-[90%] space-y-3">
          <div className="px-4 py-3 rounded-2xl bg-white/3 border border-white/8 text-sm text-white/80 leading-relaxed">
            {message.answer}
          </div>
          {charts?.map((chart, i) => (
            <div key={i} className="rounded-2xl border border-white/8 overflow-hidden">
              <AnalystChart chart={chart} height={200} />
              {onSaveChart && (
                <button onClick={() => onSaveChart(chart)} className="w-full flex items-center justify-center gap-1.5 py-2 text-xs text-white/35 hover:text-cyan-400 hover:bg-cyan-400/5 transition-all border-t border-white/5">
                  <Bookmark className="w-3 h-3" /> Save to Dashboard
                </button>
              )}
            </div>
          ))}
        </div>
      </motion.div>
    );
  }

  // V4 full structured render
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex gap-3">
      <div className="w-7 h-7 rounded-xl bg-purple-400/15 border border-purple-400/25 flex items-center justify-center flex-shrink-0 mt-1">
        <Brain className="w-3.5 h-3.5 text-purple-400" />
      </div>

      <div className="flex-1 max-w-[92%] space-y-3">
        {/* Intent badge */}
        <div className="flex items-center gap-2">
          <span className={`text-xs px-2.5 py-1 rounded-full border font-semibold ${meta.color} ${meta.bg} ${meta.border}`}>
            {meta.label}
          </span>
          {confidenceNum != null && <ConfidenceBadge value={confidenceNum} />}
        </div>

        {/* Main answer card */}
        <div className="rounded-2xl bg-white/3 border border-white/8 overflow-hidden">
          {/* Direct Answer — always visible */}
          <div className="px-4 py-4">
            <div className="flex items-center gap-1.5 mb-2">
              <Zap className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider">Direct Answer</span>
            </div>
            <p className="text-sm text-white/85 leading-relaxed">{sections.directAnswer || message.answer}</p>
          </div>

          {/* Business Meaning */}
          {sections.businessMeaning && (
            <Section icon={TrendingUp} label="Business Meaning" color="text-green-400" defaultOpen={true}>
              {sections.businessMeaning}
            </Section>
          )}

          {/* Evidence */}
          {sections.evidence && (
            <Section icon={Shield} label="Evidence" color="text-blue-400">
              <div className="space-y-1">
                {sections.evidence.split('\n').filter(Boolean).map((line, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <div className="w-1 h-1 rounded-full bg-blue-400/50 flex-shrink-0 mt-1.5" />
                    <span>{line.replace(/^[-•*]\s*/, '')}</span>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Root Cause */}
          {sections.rootCause && (
            <Section icon={AlertTriangle} label="Root Cause / Driver" color="text-amber-400">
              {sections.rootCause}
            </Section>
          )}

          {/* Recommendations */}
          {(recommendations?.length > 0 || sections.recommendedActions) && (
            <Section icon={Target} label="Recommended Actions" color="text-purple-400" defaultOpen={true}>
              {recommendations?.length > 0 ? (
                <div className="space-y-1">
                  {recommendations.map((rec, i) => <RecommendationCard key={i} rec={rec} index={i} />)}
                </div>
              ) : (
                <div className="space-y-1">
                  {(sections.recommendedActions || '').split('\n').filter(Boolean).map((line, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <div className="w-1 h-1 rounded-full bg-purple-400/50 flex-shrink-0 mt-1.5" />
                      <span>{line.replace(/^[-•*\d.]\s*/, '')}</span>
                    </div>
                  ))}
                </div>
              )}
            </Section>
          )}

          {/* Limitations */}
          {sections.limitations && (
            <Section icon={Info} label="Limitations" color="text-white/40" compact>
              {sections.limitations}
            </Section>
          )}

          {/* Confidence detail */}
          {sections.confidence && (
            <Section icon={CheckCircle2} label="Confidence Detail" color="text-white/40" compact>
              {sections.confidence}
            </Section>
          )}
        </div>

        {/* Charts */}
        {charts?.map((chart, i) => (
          <div key={i} className="rounded-2xl border border-white/8 overflow-hidden">
            <AnalystChart chart={chart} height={210} />
            {onSaveChart && (
              <button onClick={() => onSaveChart(chart)}
                className="w-full flex items-center justify-center gap-1.5 py-2 text-xs text-white/35 hover:text-cyan-400 hover:bg-cyan-400/5 transition-all border-t border-white/5">
                <Bookmark className="w-3 h-3" /> Save to Dashboard
              </button>
            )}
          </div>
        ))}

        {/* Insight pills */}
        {insights?.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {insights.map((ins, i) => (
              <span key={i} className="text-xs px-2.5 py-1 rounded-full bg-white/4 border border-white/8 text-white/45">{ins}</span>
            ))}
          </div>
        )}

        {/* Suggested next question */}
        {nextQuestion && (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs text-white/30">
              <Star className="w-3 h-3 text-purple-400/50" />
              <span>Suggested:</span>
            </div>
            <button onClick={() => onFollowUp?.(nextQuestion)}
              className="text-xs text-purple-400/70 hover:text-purple-400 border border-purple-400/15 hover:border-purple-400/30 px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 bg-purple-400/5 hover:bg-purple-400/10">
              {nextQuestion}
              <ArrowRight className="w-3 h-3 flex-shrink-0" />
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}