import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight, ChevronLeft, Zap, Database, Brain, BarChart2, FileText, TrendingUp, Shield, Activity } from 'lucide-react';

const STEPS = [
  {
    icon: Database,
    color: '#00e5ff',
    title: 'Step 1 — Upload & Profile Your Data',
    section: 'Data Intake',
    desc: 'Drag-and-drop any CSV or Excel file. OmniData auto-detects schema, infers column types, and creates a versioned dataset instantly.',
    highlight: 'Supports CSV, Excel, JSON · Auto schema inference · Up to 500K rows in-browser',
  },
  {
    icon: Shield,
    color: '#fbbf24',
    title: 'Step 2 — Automated Data Quality',
    section: 'Quality Studio',
    desc: 'Get a DQ score across Completeness, Validity, Uniqueness, Consistency, and Timeliness. Auto-fix missing values, duplicates, and type mismatches with one click.',
    highlight: '5-dimension quality scoring · Auto-clean pipeline · Data contracts',
  },
  {
    icon: Brain,
    color: '#a855f7',
    title: 'Step 3 — AI Analyst (Ask Anything)',
    section: 'AI Analyst',
    desc: 'Ask any business question in plain English. The AI generates SQL, runs it, builds a chart, and delivers a grounded 9-part answer with evidence, risks, and recommendations.',
    highlight: 'NL → SQL → Chart → Answer · F-D-E-A-R reasoning · Causal inference',
  },
  {
    icon: BarChart2,
    color: '#4ade80',
    title: 'Step 4 — Visual Dashboard Builder',
    section: 'Visual Builder',
    desc: 'Drag fields onto a canvas to create bar, line, scatter, and funnel charts. AI auto-generates business meaning and one-line insights for every visualization.',
    highlight: '9 chart types · AI chart explanation · Export SQL & Python',
  },
  {
    icon: TrendingUp,
    color: '#fb923c',
    title: 'Step 5 — Advanced Analytics Lab',
    section: 'Analytics Lab',
    desc: 'Run RFM segmentation, funnel analysis, cohort retention, churn prediction, market basket analysis, and ML forecasting — no code needed.',
    highlight: 'RFM · Cohort · Churn · Forecast · Anomaly · Clustering',
  },
  {
    icon: FileText,
    color: '#60a5fa',
    title: 'Step 6 — Decision Reports',
    section: 'Reports',
    desc: 'Generate executive summaries, board memos, CFO financial reports, and 11 other report types with evidence, risk assessment, and prioritized recommendations.',
    highlight: '14 report types · Auto-structured · Export as Markdown',
  },
  {
    icon: Activity,
    color: '#f472b6',
    title: 'Step 7 — Pipeline & Observability',
    section: 'Pipeline Studio',
    desc: 'Monitor your full data pipeline — ingestion, cleaning, enrichment, and delivery — with real-time SLA tracking, latency metrics, and anomaly alerts.',
    highlight: 'Live DAG · P50/P99 latency · SLA alerts · Error logs',
  },
  {
    icon: Zap,
    color: '#00e5ff',
    title: 'You\'re Ready to Analyze!',
    section: 'Launch',
    desc: 'OmniData transforms raw data into executive-grade insights in minutes. Upload your first dataset and experience the full analytics lifecycle.',
    highlight: 'Enterprise-grade · Sale-ready · $20K–$25K platform value',
    isFinal: true,
  },
];

export default function GuidedTour({ onClose }) {
  const [step, setStep] = useState(0);
  const current = STEPS[step];
  const Icon = current.icon;
  const isFirst = step === 0;
  const isLast = step === STEPS.length - 1;

  return (
    <AnimatePresence>
      {/* Backdrop */}
      <motion.div
        key="tour-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={onClose}
      >
        {/* Card */}
        <motion.div
          key={`step-${step}`}
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -8 }}
          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          className="relative w-full max-w-lg bg-navy-800 border border-white/10 rounded-3xl shadow-2xl overflow-hidden"
          onClick={e => e.stopPropagation()}
          style={{ background: 'hsl(222,44%,9%)' }}
        >
          {/* Color accent bar */}
          <div className="h-1 w-full" style={{ background: `linear-gradient(90deg, ${current.color}, transparent)` }} />

          {/* Close */}
          <button onClick={onClose} className="absolute top-4 right-4 p-1.5 rounded-lg text-white/30 hover:text-white/70 hover:bg-white/5 transition-all">
            <X className="w-4 h-4" />
          </button>

          <div className="p-8">
            {/* Progress dots */}
            <div className="flex items-center gap-1.5 mb-6">
              {STEPS.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setStep(i)}
                  className="h-1.5 rounded-full transition-all duration-300"
                  style={{
                    width: i === step ? '24px' : '6px',
                    background: i === step ? current.color : i < step ? `${current.color}60` : 'rgba(255,255,255,0.12)',
                  }}
                />
              ))}
              <span className="ml-2 text-xs text-white/25">{step + 1} / {STEPS.length}</span>
            </div>

            {/* Icon + section label */}
            <div className="flex items-center gap-3 mb-5">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                style={{ background: `${current.color}18`, border: `1px solid ${current.color}30` }}>
                <Icon className="w-6 h-6" style={{ color: current.color }} />
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-widest mb-0.5" style={{ color: current.color }}>
                  {current.section}
                </div>
                <h2 className="text-lg font-black text-white/90 leading-tight">{current.title}</h2>
              </div>
            </div>

            {/* Description */}
            <p className="text-sm text-white/60 leading-relaxed mb-5">{current.desc}</p>

            {/* Highlight pill */}
            <div className="px-4 py-2.5 rounded-xl text-xs font-mono text-white/50 mb-7"
              style={{ background: `${current.color}0d`, border: `1px solid ${current.color}20` }}>
              {current.highlight}
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between">
              <button
                onClick={() => setStep(s => s - 1)}
                disabled={isFirst}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white/40 hover:text-white/70 hover:bg-white/5 transition-all disabled:opacity-0 disabled:pointer-events-none"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Back
              </button>

              {isLast ? (
                <button
                  onClick={onClose}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all hover:scale-105"
                  style={{ background: current.color, color: 'hsl(222,47%,6%)' }}
                >
                  <Zap className="w-4 h-4" /> Start Analyzing
                </button>
              ) : (
                <button
                  onClick={() => setStep(s => s + 1)}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all hover:scale-105"
                  style={{ background: current.color, color: 'hsl(222,47%,6%)' }}
                >
                  Next <ChevronRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}