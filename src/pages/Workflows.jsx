import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight, Zap, Upload, Settings, BarChart3, MessageSquare, Download, ChevronRight, CheckCircle2 } from 'lucide-react';

const fadeUp = { hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0, transition: { duration: 0.5 } } };
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } };

const steps = [
  {
    icon: Upload, num: '01', title: 'Upload', color: 'text-cyan-400', border: 'border-cyan-400/30', bg: 'bg-cyan-400/10',
    desc: 'Drop CSV, XLSX, or JSON. The platform detects sheets, cleans headers, and classifies columns automatically. Supports multi-table workspaces and optional context documents.',
    details: ['Auto-detect file encoding and separator', 'Multi-sheet Excel workbook support', 'Preview first rows before confirming', 'Optional PDF/DOCX context upload'],
  },
  {
    icon: Settings, num: '02', title: 'Prepare', color: 'text-teal-400', border: 'border-teal-400/30', bg: 'bg-teal-400/10',
    desc: 'Auto-profile each table: detect missing values, duplicates, primary keys, date fields, KPIs, and dimensions. Assign a trust/quality score. Confirm key fields.',
    details: ['Column type classification (ID, Date, KPI, Category)', 'Data quality score with recommendations', 'Missing value and duplicate detection', 'Primary KPI and date field suggestion'],
  },
  {
    icon: BarChart3, num: '03', title: 'Analyze', color: 'text-blue-400', border: 'border-blue-400/30', bg: 'bg-blue-400/10',
    desc: 'Descriptive profiling, trend analysis, anomaly detection, forecasting (when valid date + KPI exist), contribution breakdown, and statistical driver analysis.',
    details: ['Descriptive stats + KPI cards', 'Forecasting with confidence bands', 'Anomaly detection (Z-score + IQR)', 'Pearson correlation + regression'],
  },
  {
    icon: MessageSquare, num: '04', title: 'Ask AI', color: 'text-purple-400', border: 'border-purple-400/30', bg: 'bg-purple-400/10',
    desc: 'The AI Analyst is grounded in your uploaded data, semantic layer, and generated SQL. Ask anything and receive structured answers with evidence.',
    details: ['Natural language to data insight', 'Evidence from docs + analysis', 'Structured 5-part answer format', 'Follow-up suggestions included'],
  },
  {
    icon: Download, num: '05', title: 'Export', color: 'text-pink-400', border: 'border-pink-400/30', bg: 'bg-pink-400/10',
    desc: 'Generate executive memos, board reports, anomaly summaries, and CSV exports. One click — professional results.',
    details: ['Executive summary PDF export', 'Board memo format', 'Anomaly & forecast reports', 'CSV of cleaned data & results'],
  },
];

const useCaseWorkflows = [
  {
    icon: '📊', title: 'Sales & Revenue Analytics',
    steps: ['Upload sales transaction CSV', 'Detect revenue KPI + date + region', 'Generate revenue trend + forecast', 'Identify top deals + anomalies', 'Export board revenue memo'],
    color: 'border-cyan-400/20 bg-cyan-400/5',
  },
  {
    icon: '👥', title: 'HR & Workforce Analytics',
    steps: ['Upload employee payroll data', 'Detect headcount + date + department', 'Analyze attrition risk + salary bands', 'Identify at-risk employees', 'Export workforce health report'],
    color: 'border-teal-400/20 bg-teal-400/5',
  },
  {
    icon: '🏥', title: 'Healthcare Operations',
    steps: ['Upload patient encounter data', 'Detect volumes + dates + cost columns', 'Analyze throughput + quality metrics', 'Flag anomalous departments', 'Export clinical operations report'],
    color: 'border-blue-400/20 bg-blue-400/5',
  },
  {
    icon: '🎓', title: 'Student Engagement & Retention',
    steps: ['Upload student engagement dataset', 'Detect attendance + score + date', 'Identify at-risk student segments', 'Forecast retention trajectory', 'Export student retention memo'],
    color: 'border-purple-400/20 bg-purple-400/5',
  },
  {
    icon: '📈', title: 'Market & Survey Analytics',
    steps: ['Upload survey response CSV', 'Detect sentiment + category columns', 'Extract themes + cluster concerns', 'Identify positive & negative drivers', 'Export feedback insights report'],
    color: 'border-pink-400/20 bg-pink-400/5',
  },
  {
    icon: '⚙️', title: 'Custom Multi-Table Analytics',
    steps: ['Upload multiple related datasets', 'Detect join keys + relationships', 'Build unified semantic model', 'Analyze across combined tables', 'Export unified analytics bundle'],
    color: 'border-amber-400/20 bg-amber-400/5',
  },
];

export default function Workflows() {
  return (
    <div className="min-h-screen bg-background pt-20">
      {/* Hero */}
      <section className="py-24 hero-gradient">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0, transition: { duration: 0.6 } }}>
            <span className="text-xs font-semibold tracking-widest text-cyan-400 uppercase">Guided Workflows</span>
            <h1 className="text-5xl md:text-6xl font-black mt-4 mb-6">
              A workflow designed for<br /><span className="text-gradient">every data scenario</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              The platform guides you from messy raw data to polished executive insight — with guardrails, quality checks, and AI assistance at every step.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Main workflow steps */}
      <section className="py-24 max-w-5xl mx-auto px-6">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-14">
          <span className="text-xs font-semibold tracking-widest text-cyan-400 uppercase">The Core Workflow</span>
          <h2 className="text-4xl font-black mt-3 mb-4">Five steps. Zero setup.</h2>
        </motion.div>

        <div className="relative">
          <div className="absolute left-7 top-0 bottom-0 w-px bg-gradient-to-b from-cyan-400/40 via-teal-400/20 to-transparent hidden md:block" />
          <div className="space-y-6">
            {steps.map((step, i) => (
              <motion.div key={step.title} initial={{ opacity: 0, x: -24 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                className={`flex gap-6 glass-card rounded-2xl p-6 border ${step.border} ml-0 md:ml-4`}>
                <div className={`flex-shrink-0 w-14 h-14 rounded-2xl ${step.bg} flex flex-col items-center justify-center`}>
                  <step.icon className={`w-5 h-5 ${step.color}`} />
                  <span className={`text-xs font-mono ${step.color} mt-1`}>{step.num}</span>
                </div>
                <div className="flex-1">
                  <h3 className={`font-bold text-xl mb-2 ${step.color}`}>{step.title}</h3>
                  <p className="text-muted-foreground leading-relaxed mb-4 text-sm">{step.desc}</p>
                  <div className="grid grid-cols-2 gap-2">
                    {step.details.map(detail => (
                      <div key={detail} className="flex items-center gap-2 text-xs text-white/50">
                        <CheckCircle2 className={`w-3 h-3 ${step.color} flex-shrink-0`} />
                        {detail}
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Use case workflows */}
      <section className="py-24 section-gradient">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-14">
            <span className="text-xs font-semibold tracking-widest text-teal-400 uppercase">Domain Workflows</span>
            <h2 className="text-4xl font-black mt-3 mb-4">Pre-built workflows for every domain</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">Each domain workflow is optimized for the typical data structure, KPIs, and insights needed in that field.</p>
          </motion.div>

          <motion.div variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true }} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {useCaseWorkflows.map((uc) => (
              <motion.div key={uc.title} variants={fadeUp} className={`glass-card rounded-2xl p-6 border ${uc.color} hover:scale-[1.01] transition-all`}>
                <div className="text-3xl mb-3">{uc.icon}</div>
                <h3 className="font-bold text-sm mb-4">{uc.title}</h3>
                <div className="space-y-2">
                  {uc.steps.map((step, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                      <div className="w-4 h-4 rounded-full bg-white/8 flex items-center justify-center flex-shrink-0 text-white/40 font-mono text-xs">{i + 1}</div>
                      {step}
                    </div>
                  ))}
                </div>
                <Link to="/workspace" className="inline-flex items-center gap-1 text-xs text-cyan-400 hover:underline mt-4">
                  Try this workflow <ChevronRight className="w-3 h-3" />
                </Link>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 max-w-4xl mx-auto px-6 text-center">
        <Link to="/workspace" className="inline-flex items-center gap-2 px-8 py-4 bg-cyan-400 rounded-xl font-bold hover:bg-cyan-300 transition-all hover:scale-105" style={{ color: 'hsl(222,47%,6%)' }}>
          <Zap className="w-5 h-5" /> Start Your Workflow <ArrowRight className="w-5 h-5" />
        </Link>
      </section>
    </div>
  );
}