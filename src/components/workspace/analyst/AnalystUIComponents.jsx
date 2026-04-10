/**
 * Analyst UI Components — Structured response rendering
 */
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronDown, ChevronRight, CheckCircle2, AlertTriangle, Lightbulb,
  Target, Zap, Loader2
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';

// ── Thinking Indicator ──────────────────────────────────────
export function ThinkingIndicator({ step = 0, totalSteps = 7 }) {
  const steps = [
    'Intent detection',
    'Context loading',
    'Tool selection',
    'Analysis',
    'Chart support',
    'Recommendations',
    'Confidence'
  ];
  
  return (
    <div className="space-y-2 mb-3 pb-3 border-b border-white/10">
      <div className="flex items-center gap-2 text-xs text-white/40">
        <Loader2 className="w-3 h-3 animate-spin text-cyan-400" />
        <span>Step {step}/{totalSteps}</span>
      </div>
      <div className="flex gap-1">
        {steps.map((s, i) => (
          <div
            key={i}
            className={`flex-1 h-1 rounded-full transition-all ${
              i < step ? 'bg-cyan-400' : 'bg-white/10'
            }`}
          />
        ))}
      </div>
    </div>
  );
}

// ── Expandable Section ──────────────────────────────────────
function ExpandableSection({ title, icon: Icon, content, color = 'text-cyan-400', defaultOpen = true, children }) {
  const [open, setOpen] = useState(defaultOpen);
  
  return (
    <div className="border border-white/8 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-4 py-3 bg-white/3 hover:bg-white/5 transition-colors text-left"
      >
        <Icon className={`w-4 h-4 ${color}`} />
        <span className="flex-1 font-semibold text-sm">{title}</span>
        {open ? <ChevronDown className="w-4 h-4 text-white/40" /> : <ChevronRight className="w-4 h-4 text-white/40" />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 py-3 border-t border-white/5 space-y-2">
              {typeof content === 'string' ? (
                <ReactMarkdown className="prose prose-sm prose-invert max-w-none text-sm [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                  {content}
                </ReactMarkdown>
              ) : Array.isArray(content) ? (
                <ul className="space-y-1 text-sm text-white/70">
                  {content.map((item, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-cyan-400 mt-0.5">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                children
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Structured Response ─────────────────────────────────────
export function StructuredResponse({ message }) {
  if (!message || message.role === 'user') return null;

  const {
    answer,
    insights = [],
    evidence = [],
    recommendations = [],
    confidence = 50,
    limitations = [],
    steps = [],
  } = message;

  const confidenceColor = 'text-green-400 border-green-400/25 bg-green-400/8';

  return (
    <div className="space-y-3">
      {/* Thinking progress */}
      {steps && steps.length > 0 && !answer && <ThinkingIndicator step={steps.length} totalSteps={7} />}

      {/* Answer (always visible) */}
      {answer && (
        <ExpandableSection
          title="Answer"
          icon={Lightbulb}
          content={answer}
          color="text-cyan-400"
          defaultOpen={true}
        />
      )}

      {/* Insights */}
      {insights.length > 0 && (
        <ExpandableSection
          title={`Key Insights (${insights.length})`}
          icon={Zap}
          content={insights}
          color="text-purple-400"
          defaultOpen={true}
        />
      )}

      {/* Evidence */}
      {evidence.length > 0 && (
        <ExpandableSection
          title={`Supporting Evidence (${evidence.length})`}
          icon={CheckCircle2}
          content={evidence}
          color="text-teal-400"
          defaultOpen={false}
        />
      )}

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <ExpandableSection
          title={`Recommended Actions (${recommendations.length})`}
          icon={Target}
          content={recommendations.map(r => `[${r.priority?.toUpperCase()}] ${r.action}`)}
          color="text-green-400"
          defaultOpen={true}
        />
      )}

      {/* Confidence & Limitations */}
      <div className={`flex items-start gap-3 p-3 rounded-xl border ${confidenceColor}`}>
        <div className="flex-1">
          <div className="text-xs font-semibold uppercase tracking-widest mb-1">
            Confidence: {confidence}%
          </div>
          {limitations.length > 0 && (
            <div className="text-xs space-y-0.5">
              {limitations.map((lim, i) => (
                <div key={i} className="flex items-start gap-1.5">
                  <AlertTriangle className="w-3 h-3 flex-shrink-0 mt-0.5" />
                  <span>{lim}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}