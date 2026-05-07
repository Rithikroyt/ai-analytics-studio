/**
 * AnalystMessageBubble — Polished chat bubbles for AI Analyst
 */
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, User, BarChart2, Bookmark, ChevronDown, ChevronRight, Zap, CheckCircle2, Target, AlertTriangle, Lightbulb, Copy, Check } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import AnalystChartWithTrendline from './AnalystChartWithTrendline';

// Typing animation for assistant responses
function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-4 py-3">
      {[0, 1, 2].map(i => (
        <motion.div
          key={i}
          className="w-2 h-2 rounded-full bg-purple-400"
          animate={{ scale: [1, 1.4, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15 }}
        />
      ))}
    </div>
  );
}

// Insight pill
function InsightPill({ text, index }) {
  const colors = [
    'text-cyan-400 bg-cyan-400/8 border-cyan-400/20',
    'text-purple-400 bg-purple-400/8 border-purple-400/20',
    'text-teal-400 bg-teal-400/8 border-teal-400/20',
    'text-green-400 bg-green-400/8 border-green-400/20',
    'text-blue-400 bg-blue-400/8 border-blue-400/20',
  ];
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.06 }}
      className={`flex items-start gap-2 px-3 py-2 rounded-xl border text-xs leading-relaxed ${colors[index % colors.length]}`}
    >
      <span className="mt-0.5 shrink-0">•</span>
      <span>{text}</span>
    </motion.div>
  );
}

// Recommendation card
function RecommendationCard({ rec, index }) {
  const priorityStyle = {
    critical: 'text-red-400 bg-red-400/10 border-red-400/25',
    high: 'text-orange-400 bg-orange-400/10 border-orange-400/25',
    medium: 'text-amber-400 bg-amber-400/10 border-amber-400/25',
    low: 'text-green-400 bg-green-400/10 border-green-400/25',
  };
  const style = priorityStyle[rec.priority] || priorityStyle.medium;
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08 }}
      className="flex items-start gap-3 p-3 rounded-xl bg-white/3 border border-white/8 hover:bg-white/5 transition-colors"
    >
      <div className="w-5 h-5 rounded-full bg-white/8 flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-bold text-white/50">
        {index + 1}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-white/80 leading-relaxed">{rec.action}</p>
      </div>
      <span className={`text-xs px-2 py-0.5 rounded-full border font-semibold shrink-0 ${style}`}>
        {rec.priority?.toUpperCase() || 'MED'}
      </span>
    </motion.div>
  );
}

// Collapsible section
function Section({ title, icon: Icon, color = 'text-cyan-400', children, defaultOpen = true, badge }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-2xl border border-white/8 overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-2.5 px-4 py-3 bg-white/[0.02] hover:bg-white/[0.04] transition-colors text-left"
      >
        <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${color}`} />
        <span className="flex-1 text-sm font-semibold text-white/85">{title}</span>
        {badge != null && (
          <span className={`text-xs px-2 py-0.5 rounded-full bg-white/8 text-white/45 font-mono`}>{badge}</span>
        )}
        {open
          ? <ChevronDown className="w-3.5 h-3.5 text-white/30" />
          : <ChevronRight className="w-3.5 h-3.5 text-white/30" />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-2 border-t border-white/6 space-y-2">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function AnalystMessageBubble({ message, onSaveChart, onFollowUp }) {
  const isUser = message.role === 'user';
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.answer || message.content || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isUser) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex gap-3 justify-end"
      >
        <div className="max-w-[80%] rounded-2xl rounded-tr-sm px-4 py-3 bg-gradient-to-br from-cyan-400/15 to-blue-400/10 border border-cyan-400/20">
          <p className="text-sm text-white/90 leading-relaxed">{message.content}</p>
        </div>
        <div className="w-7 h-7 rounded-xl bg-cyan-400/15 border border-cyan-400/25 flex items-center justify-center flex-shrink-0 mt-0.5">
          <User className="w-3.5 h-3.5 text-cyan-400" />
        </div>
      </motion.div>
    );
  }

  const { answer, insights = [], recommendations = [], charts = [], confidence = 100, limitations = [], businessMeaning, rootCauses = [], nextQuestion, intent } = message;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex gap-3 justify-start"
    >
      {/* Avatar */}
      <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-purple-400/20 to-blue-400/10 border border-purple-400/25 flex items-center justify-center flex-shrink-0 mt-0.5">
        <Bot className="w-3.5 h-3.5 text-purple-400" />
      </div>

      <div className="max-w-[88%] space-y-2.5 min-w-0">

        {/* Intent badge */}
        {intent && intent !== 'exploratory' && (
          <div className="flex items-center gap-1.5 text-xs text-white/30">
            <span className="px-2 py-0.5 rounded-full bg-purple-400/10 text-purple-400 border border-purple-400/20 font-mono capitalize">{intent}</span>
            <span>analysis mode</span>
          </div>
        )}

        {/* Answer */}
        {answer && (
          <Section title="Analysis" icon={Lightbulb} color="text-cyan-400" defaultOpen={true}>
            <div className="group relative">
              <ReactMarkdown className="prose prose-sm prose-invert max-w-none text-sm text-white/75 leading-relaxed [&>p]:my-1.5 [&>ul]:my-1.5 [&>ol]:my-1.5 [&>li]:my-0.5">
                {answer}
              </ReactMarkdown>
              <button
                onClick={handleCopy}
                className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg bg-white/5 border border-white/10 text-white/40 hover:text-white/70"
              >
                {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
              </button>
            </div>
          </Section>
        )}

        {/* Key Insights */}
        {insights.length > 0 && (
          <Section title="Key Insights" icon={Zap} color="text-purple-400" badge={insights.length} defaultOpen={true}>
            <div className="space-y-1.5">
              {insights.map((ins, i) => <InsightPill key={i} text={ins} index={i} />)}
            </div>
          </Section>
        )}

        {/* Recommendations */}
        {recommendations.length > 0 && (
          <Section title="Recommended Actions" icon={Target} color="text-green-400" badge={recommendations.length} defaultOpen={true}>
            <div className="space-y-2">
              {recommendations.map((rec, i) => <RecommendationCard key={i} rec={rec} index={i} />)}
            </div>
          </Section>
        )}

        {/* Charts */}
        {charts.length > 0 && charts.map((chart, ci) => (
          <div key={ci} className="rounded-2xl overflow-hidden border border-white/8 bg-black/20 p-3">
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-1.5">
                <BarChart2 className="w-3.5 h-3.5 text-cyan-400" />
                <span className="text-xs font-semibold text-white/50 uppercase tracking-widest">{chart.title}</span>
              </div>
              {onSaveChart && (
                <button onClick={() => onSaveChart(chart)}
                  className="flex items-center gap-1 text-xs text-white/30 hover:text-cyan-400 transition-colors px-2 py-1 rounded-lg hover:bg-white/5">
                  <Bookmark className="w-3 h-3" /> Save
                </button>
              )}
            </div>
            <AnalystChartWithTrendline chart={chart} height={220} />
          </div>
        ))}

        {/* Business meaning */}
        {businessMeaning && (
          <div className="px-3 py-2.5 rounded-xl bg-teal-400/5 border border-teal-400/15">
            <div className="text-xs font-semibold text-teal-400 uppercase tracking-widest mb-1">Business Meaning</div>
            <p className="text-xs text-white/60 leading-relaxed">{businessMeaning}</p>
          </div>
        )}

        {/* Root causes */}
        {rootCauses.length > 0 && (
          <Section title="Root Causes / Drivers" icon={AlertTriangle} color="text-amber-400" defaultOpen={false} badge={rootCauses.length}>
            {rootCauses.map((rc, i) => (
              <div key={i} className="flex items-start gap-2 text-xs text-white/55">
                <span className="text-amber-400 flex-shrink-0">▸</span> {rc}
              </div>
            ))}
          </Section>
        )}

        {/* Confidence + limitations */}
        <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-white/[0.02] border border-white/6">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3 h-3 text-green-400" />
            <span className="text-xs font-semibold text-green-400">Confidence: {confidence}%</span>
          </div>
          {limitations.length > 0 && (
            <>
              <span className="text-white/15">·</span>
              <div className="flex items-center gap-1 text-xs text-white/30">
                <AlertTriangle className="w-3 h-3" />
                <span>{limitations[0]}</span>
              </div>
            </>
          )}
        </div>

        {/* Next question suggestion */}
        {nextQuestion && onFollowUp && (
          <div className="flex items-center gap-2 pt-1">
            <span className="text-xs text-white/25">Suggested next:</span>
            <button onClick={() => onFollowUp(nextQuestion)}
              className="text-xs px-2.5 py-1 rounded-lg bg-purple-400/8 border border-purple-400/20 text-purple-400/80 hover:text-purple-400 hover:bg-purple-400/12 transition-all">
              {nextQuestion} →
            </button>
          </div>
        )}

        {/* Follow-up suggestions */}
        {onFollowUp && answer && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {['Show distribution', 'Compare segments', 'What are the risks?'].map(q => (
              <button key={q} onClick={() => onFollowUp(q)}
                className="text-xs px-2.5 py-1 rounded-lg bg-white/4 border border-white/8 text-white/35 hover:text-white/65 hover:bg-white/7 hover:border-purple-400/25 transition-all">
                {q} →
              </button>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}