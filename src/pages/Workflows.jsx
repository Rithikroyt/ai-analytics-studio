import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useInView } from 'framer-motion';
import {
  BarChart3, Users, Heart, GraduationCap, TrendingUp, MessageSquare,
  Layers, ArrowRight, Zap, CheckCircle2, ChevronRight, Play
} from 'lucide-react';

function FadeIn({ children, delay = 0, className = '' }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });
  return (
    <motion.div ref={ref} initial={{ opacity: 0, y: 20 }} animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }} className={className}>
      {children}
    </motion.div>
  );
}

const WORKFLOWS = [
  {
    id: 'sales',
    icon: BarChart3,
    emoji: '📊',
    color: 'text-cyan-400',
    bg: 'bg-cyan-400/10',
    border: 'border-cyan-400/20',
    gradBg: 'bg-cyan-400/5',
    title: 'Sales & Revenue Operations',
    subtitle: 'Revenue analytics, pipeline, and performance',
    description: 'Upload your CRM exports, order data, or revenue CSVs. Get instant trend analysis, segment breakdowns, forecast modeling, and anomaly detection across regions, products, and reps.',
    sampleData: 'Sales & Revenue bundle →',
    bundleKey: 'sales',
    steps: [
      'Upload sales CSV or XLSX from CRM',
      'Auto-detect revenue, date, region, and product columns',
      'Generate trend + segment + forecast dashboard',
      'AI Analyst answers "What drove Q4 growth?" with evidence',
      'Export Executive Summary and Board Memo',
    ],
    outputs: ['Revenue trend chart', 'Regional breakdown', '6-period forecast', 'Anomaly report', 'Board memo'],
    kpis: ['Total Revenue', 'Growth Rate', 'Avg Deal Size', 'Win Rate', 'Churn Risk'],
  },
  {
    id: 'hr',
    icon: Users,
    emoji: '👥',
    color: 'text-teal-400',
    bg: 'bg-teal-400/10',
    border: 'border-teal-400/20',
    gradBg: 'bg-teal-400/5',
    title: 'HR, Workforce & Payroll',
    subtitle: 'People analytics, attrition, and compensation',
    description: 'Analyze workforce data, headcount trends, salary distributions, attrition rates, and performance scores. Identify flight risks, compensation gaps, and department health.',
    sampleData: 'Workforce bundle →',
    bundleKey: 'workforce',
    steps: [
      'Upload HRIS export (Excel or CSV)',
      'Classify employee_id, department, salary, tenure, status',
      'Generate attrition, comp, and performance dashboards',
      'AI Analyst flags high-attrition departments and root causes',
      'Export Data Quality Audit and People Analytics Report',
    ],
    outputs: ['Attrition analysis', 'Salary distribution', 'Tenure heatmap', 'Performance scatter', 'Dept comparison'],
    kpis: ['Attrition Rate', 'Avg Salary', 'Avg Tenure', 'Performance Score', 'Headcount'],
  },
  {
    id: 'healthcare',
    icon: Heart,
    emoji: '🏥',
    color: 'text-blue-400',
    bg: 'bg-blue-400/10',
    border: 'border-blue-400/20',
    gradBg: 'bg-blue-400/5',
    title: 'Healthcare Operations',
    subtitle: 'Clinical quality, throughput, and patient experience',
    description: 'Analyze admissions, bed occupancy, length of stay, readmission rates, patient satisfaction, and cost per case across departments and time periods.',
    sampleData: 'Healthcare bundle →',
    bundleKey: 'healthcare',
    steps: [
      'Upload operational data (admissions, cost, satisfaction)',
      'Detect department, month, metric columns',
      'Generate occupancy, readmission, and satisfaction dashboards',
      'AI identifies underperforming departments and quality risks',
      'Export Anomaly Report and Executive Summary',
    ],
    outputs: ['Readmission trend', 'Occupancy heatmap', 'Dept comparison', 'Cost analysis', 'Quality scorecard'],
    kpis: ['Admissions', 'Avg LOS', 'Occupancy %', 'Patient Satisfaction', 'Cost Per Case'],
  },
  {
    id: 'education',
    icon: GraduationCap,
    emoji: '🎓',
    color: 'text-purple-400',
    bg: 'bg-purple-400/10',
    border: 'border-purple-400/20',
    gradBg: 'bg-purple-400/5',
    title: 'Student Engagement & Retention',
    subtitle: 'Completion rates, satisfaction, and revenue',
    description: 'Analyze course completion, student satisfaction, assessment performance, dropout patterns, and revenue across programs, campuses, and time.',
    sampleData: 'Education bundle →',
    bundleKey: 'education',
    steps: [
      'Upload enrollment or LMS export (CSV)',
      'Classify enrolled, completed, dropped, satisfaction columns',
      'Generate completion, retention, and revenue dashboards',
      'AI identifies at-risk cohorts and intervention opportunities',
      'Export Retention Report and Forecast',
    ],
    outputs: ['Completion trend', 'Campus comparison', 'Revenue forecast', 'Dropout analysis', 'Satisfaction chart'],
    kpis: ['Enrolled', 'Completion Rate', 'Satisfaction', 'Revenue', 'Dropout Rate'],
  },
  {
    id: 'finance',
    icon: TrendingUp,
    emoji: '📈',
    color: 'text-green-400',
    bg: 'bg-green-400/10',
    border: 'border-green-400/20',
    gradBg: 'bg-green-400/5',
    title: 'Finance & Risk Analytics',
    subtitle: 'P&L, budget vs actuals, and risk scoring',
    description: 'Upload financial statements, budget vs actuals, or transaction data. Detect margin compression, budget deviations, and cash flow anomalies.',
    steps: [
      'Upload financial data (P&L, budget, transactions)',
      'Classify revenue, cost, profit, period columns',
      'Generate margin, variance, and cash flow dashboards',
      'AI flags budget overruns and margin risks with evidence',
      'Export Board Memo with risk assessment',
    ],
    outputs: ['Margin trend', 'Budget variance', 'Cash flow chart', 'Cost breakdown', 'Risk heatmap'],
    kpis: ['Revenue', 'Gross Margin', 'EBITDA', 'Budget Variance', 'Burn Rate'],
  },
  {
    id: 'survey',
    icon: MessageSquare,
    emoji: '📋',
    color: 'text-amber-400',
    bg: 'bg-amber-400/10',
    border: 'border-amber-400/20',
    gradBg: 'bg-amber-400/5',
    title: 'Survey & Feedback Analytics',
    subtitle: 'NPS, sentiment, themes, and action priorities',
    description: 'Upload survey exports or feedback CSVs. Analyze NPS trends, satisfaction scores, sentiment patterns, and surface actionable themes from text responses.',
    steps: [
      'Upload survey or NPS data (CSV or Excel)',
      'Detect score, date, segment, and text columns',
      'Generate NPS trend, satisfaction, and segment dashboards',
      'AI extracts themes and sentiment from text responses',
      'Export Survey Insights Report with action recommendations',
    ],
    outputs: ['NPS trend', 'Segment scores', 'Theme clustering', 'Sentiment distribution', 'Action priority matrix'],
    kpis: ['NPS Score', 'Avg Satisfaction', 'Response Rate', 'Promoter %', 'Detractor %'],
  },
];

export default function Workflows() {
  const [active, setActive] = useState('sales');
  const workflow = WORKFLOWS.find(w => w.id === active);

  return (
    <div className="min-h-screen bg-background pt-20">
      {/* Hero */}
      <section className="hero-gradient py-20 px-6 text-center">
        <div className="max-w-4xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-teal-400/25 bg-teal-400/8 mb-6">
              <Layers className="w-3.5 h-3.5 text-teal-400" />
              <span className="text-xs font-semibold text-teal-400 tracking-widest uppercase">Industry Workflows</span>
            </div>
            <h1 className="text-5xl font-black mb-5">
              Purpose-built analytics for
              <span className="text-gradient block">every industry workflow</span>
            </h1>
            <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
              Select your use case — we show you exactly how the platform handles your data, what analytics run, and what outputs you get.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Workflow selector */}
      <section className="py-12 px-6">
        <div className="max-w-7xl mx-auto">
          {/* Tab strip */}
          <div className="flex flex-wrap gap-2 mb-8 justify-center">
            {WORKFLOWS.map((w) => (
              <button key={w.id} onClick={() => setActive(w.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all border ${
                  active === w.id ? `${w.color} ${w.bg} ${w.border}` : 'text-white/40 border-transparent hover:text-white/70 hover:bg-white/5'
                }`}>
                <span>{w.emoji}</span>
                <span className="hidden sm:inline">{w.title.split('&')[0].trim()}</span>
              </button>
            ))}
          </div>

          {/* Detail panel */}
          {workflow && (
            <motion.div key={workflow.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
              <div className={`rounded-3xl border ${workflow.border} ${workflow.gradBg} p-8`}>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                  {/* Left */}
                  <div>
                    <div className="flex items-center gap-3 mb-4">
                      <div className={`w-12 h-12 rounded-2xl ${workflow.bg} border ${workflow.border} flex items-center justify-center text-2xl`}>
                        {workflow.emoji}
                      </div>
                      <div>
                        <h2 className="text-xl font-black">{workflow.title}</h2>
                        <p className={`text-xs font-semibold ${workflow.color}`}>{workflow.subtitle}</p>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed mb-6">{workflow.description}</p>

                    {/* Steps */}
                    <h3 className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-3">How it works</h3>
                    <ol className="space-y-2.5 mb-6">
                      {workflow.steps.map((step, i) => (
                        <li key={i} className="flex items-start gap-3 text-sm text-white/65">
                          <div className={`w-5 h-5 rounded-full ${workflow.bg} border ${workflow.border} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                            <span className={`text-xs font-black ${workflow.color}`}>{i + 1}</span>
                          </div>
                          {step}
                        </li>
                      ))}
                    </ol>

                    {/* KPIs */}
                    <h3 className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-3">Tracked KPIs</h3>
                    <div className="flex flex-wrap gap-2 mb-6">
                      {workflow.kpis.map(kpi => (
                        <span key={kpi} className={`text-xs px-2.5 py-1 rounded-full border ${workflow.color} ${workflow.bg} ${workflow.border}`}>{kpi}</span>
                      ))}
                    </div>

                    <div className="flex gap-3">
                      <Link to="/workspace"
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${workflow.bg} border ${workflow.border} ${workflow.color} hover:opacity-80`}>
                        <Play className="w-4 h-4" /> Try with Sample Data
                      </Link>
                      <Link to="/workspace"
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold glass border border-white/10 hover:border-white/20 transition-all text-muted-foreground hover:text-foreground">
                        Upload My Data <ArrowRight className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>

                  {/* Right: outputs */}
                  <div>
                    <h3 className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-4">Platform Outputs</h3>
                    <div className="grid grid-cols-1 gap-3">
                      {workflow.outputs.map((output, i) => (
                        <div key={output} className="flex items-center gap-3 p-3 glass-card rounded-xl border border-white/8">
                          <div className={`w-7 h-7 rounded-lg ${workflow.bg} border ${workflow.border} flex items-center justify-center flex-shrink-0`}>
                            <CheckCircle2 className={`w-3.5 h-3.5 ${workflow.color}`} />
                          </div>
                          <span className="text-sm text-white/70">{output}</span>
                          <ArrowRight className="w-3.5 h-3.5 text-white/20 ml-auto" />
                        </div>
                      ))}
                    </div>

                    {/* Sample bundle CTA */}
                    {workflow.bundleKey && (
                      <div className={`mt-5 p-4 rounded-2xl border ${workflow.border} ${workflow.gradBg}`}>
                        <div className="text-xs text-white/40 uppercase tracking-widest mb-2">Ready-to-run demo</div>
                        <p className="text-sm text-white/60 mb-3">Load the pre-built {workflow.title} sample bundle — 0 setup required.</p>
                        <Link to="/workspace"
                          className={`inline-flex items-center gap-2 text-xs font-bold px-3 py-2 rounded-lg ${workflow.bg} border ${workflow.border} ${workflow.color} hover:opacity-80 transition-all`}>
                          <Zap className="w-3.5 h-3.5" /> Load Sample Bundle
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-6 text-center">
        <div className="max-w-2xl mx-auto">
          <FadeIn>
            <h2 className="text-3xl font-black mb-4">Don't see your use case?</h2>
            <p className="text-muted-foreground mb-6">The platform works with any structured CSV, Excel, or JSON — upload your data and the AI figures out the rest.</p>
            <Link to="/workspace"
              className="inline-flex items-center gap-2 px-6 py-3.5 bg-cyan-400 rounded-xl font-bold hover:bg-cyan-300 transition-all"
              style={{ color: 'hsl(222,47%,6%)' }}>
              <Zap className="w-4 h-4" /> Start with Your Own Data
            </Link>
          </FadeIn>
        </div>
      </section>
    </div>
  );
}