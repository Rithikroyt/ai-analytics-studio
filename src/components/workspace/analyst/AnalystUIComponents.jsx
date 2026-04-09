/**
 * AnalystUIComponents — Structured response rendering for AI Analyst
 * Handles the new response format: Answer → Insights → Evidence → Actions → Confidence
 */
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronDown, ChevronUp, CheckCircle2, Lightbulb, BarChart2, Target,
  AlertCircle, Clock, Zap
} from 'lucide-react';

export function StructuredResponse({ message }) {
  const [expandedSections, setExpandedSections] = useState({ answer: true }); // answer open by default

  const sections = [
    { id: 'answer', label: 'Answer', icon: CheckCircle2, color: 'text-cyan-400' },
    { id: 'insights', label: 'Key Insights', icon: Lightbulb, color: 'text-cyan-400' },
    { id: 'evidence', label: 'Supporting Evidence', icon: BarChart2, color: 'text-teal-400' },
    { id: 'actions', label: 'Recommended Actions', icon: Target, color: 'text-green-400' },
    { id: 'confidence', label: 'Confidence & Limitations', icon: AlertCircle, color: 'text-amber-400' },
  ];

  const toggleSection = (id) => {
    setExpandedSections(s => ({ ...s, [id]: !s[id] }));
  };

  const renderContent = (id) => {
    switch (id) {
      case 'answer':
        return <p className="text-sm leading-relaxed text-white/80">{message.answer || 'No direct answer available.'}</p>;

      case 'insights':
        return (
          <ul className="space-y-1.5">
            {message.insights && message.insights.length > 0 ? (
              message.insights.map((insight, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm text-white/70">
                  <span className="text-cyan-400 font-bold text-lg leading-none mt-0.5">•</span>
                  <span>{insight}</span>
                </li>
              ))
            ) : (
              <li className="text-xs text-white/40 italic">No additional insights available.</li>
            )}
          </ul>
        );

      case 'evidence':
        return (
          <div className="space-y-2">
            {message.evidence && message.evidence.length > 0 ? (
              message.evidence.map((ev, i) => (
                <div key={i} className="flex items-start gap-2 p-2.5 rounded-lg bg-white/3 border border-white/5 text-sm">
                  <span className="text-teal-400 text-xs font-mono flex-shrink-0 mt-0.5 font-bold">#</span>
                  <span className="text-white/70">{ev}</span>
                </div>
              ))
            ) : (
              <p className="text-xs text-white/40 italic">No specific evidence or data points to cite.</p>
            )}
          </div>
        );

      case 'actions':
        return (
          <ol className="space-y-1.5 list-decimal list-inside">
            {message.recommendations && message.recommendations.length > 0 ? (
              message.recommendations.map((rec, i) => (
                <li key={i} className="text-sm text-white/70 ml-2">
                  <span className="text-green-400 font-semibold text-xs uppercase">[{rec.priority}]</span> {rec.action}
                </li>
              ))
            ) : (
              <li className="text-xs text-white/40 italic">No specific recommendations at this time.</li>
            )}
          </ol>
        );

      case 'confidence':
        return (
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-3">
              <span className="text-white/60 font-semibold">Confidence Score:</span>
              <div className="flex items-center gap-2">
                <div className="w-24 h-2 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      message.confidence >= 80
                        ? 'bg-green-400'
                        : message.confidence >= 60
                        ? 'bg-amber-400'
                        : 'bg-orange-400'
                    }`}
                    style={{ width: `${message.confidence || 70}%` }}
                  />
                </div>
                <span className="text-xs font-mono font-bold">{message.confidence || 70}%</span>
              </div>
            </div>
            {message.limitations && message.limitations.length > 0 && (
              <div>
                <div className="text-white/60 font-semibold mb-1">Limitations:</div>
                <ul className="ml-3 space-y-0.5">
                  {message.limitations.map((lim, i) => (
                    <li key={i} className="text-xs text-white/50 flex items-start gap-1.5">
                      <span className="text-orange-400 flex-shrink-0 mt-0.5">⚠</span> {lim}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-1.5">
      {sections.map(s => {
        const Icon = s.icon;
        const isOpen = expandedSections[s.id];
        const hasContent =
          (s.id === 'answer' && message.answer) ||
          (s.id === 'insights' && message.insights?.length) ||
          (s.id === 'evidence' && message.evidence?.length) ||
          (s.id === 'actions' && message.recommendations?.length) ||
          (s.id === 'confidence' && (message.confidence || message.limitations?.length));

        if (!hasContent && s.id !== 'answer' && s.id !== 'confidence') return null;

        return (
          <div key={s.id}>
            <button
              onClick={() => toggleSection(s.id)}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg bg-white/3 border border-white/5 hover:border-white/15 hover:bg-white/5 transition-all text-left"
            >
              <Icon className={`w-3.5 h-3.5 ${s.color} flex-shrink-0`} />
              <span className="text-xs font-semibold flex-1 text-white/80">{s.label}</span>
              {isOpen ? (
                <ChevronUp className="w-3 h-3 text-white/35" />
              ) : (
                <ChevronDown className="w-3 h-3 text-white/35" />
              )}
            </button>
            <AnimatePresence>
              {isOpen && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.15 }}
                  className="overflow-hidden"
                >
                  <div className="p-3 mt-1 rounded-lg bg-white/2 border border-white/5 ml-1">
                    {renderContent(s.id)}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}

export function ThinkingIndicator({ step, totalSteps = 5 }) {
  const steps = [
    'Detecting intent...',
    'Loading context...',
    'Selecting tools...',
    'Analyzing data...',
    'Generating insights...',
  ];

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="w-5 h-5 rounded-lg bg-purple-400/10 border border-purple-400/20 flex items-center justify-center">
          <Clock className="w-3 h-3 text-purple-400 animate-spin" />
        </div>
        <span className="text-xs text-purple-400 font-medium">{steps[Math.min(step, steps.length - 1)]}</span>
      </div>
      <div className="flex gap-1">
        {Array.from({ length: totalSteps }).map((_, i) => (
          <div
            key={i}
            className={`flex-1 h-1 rounded-full transition-all ${
              i < step ? 'bg-purple-400' : 'bg-white/10'
            }`}
          />
        ))}
      </div>
    </div>
  );
}