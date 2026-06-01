import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useInView, AnimatePresence } from 'framer-motion';
import {
  Zap, BarChart2, Brain, FileText, ArrowRight, CheckCircle2,
  TrendingUp, Database, Shield, Sparkles, Target, Activity,
  Briefcase, Users, ChevronRight, Play, Star, Award, LayoutDashboard
} from 'lucide-react';
import OmniLogo from '@/components/ui/OmniLogo';

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

const ROLES = [
  {
    icon: BarChart2, color: 'text-cyan-400', bg: 'bg-cyan-400/10', border: 'border-cyan-400/25',
    label: 'Data Analyst', tag: 'Most Popular',
    desc: 'Clean data, run SQL, calculate KPIs, build charts, generate reports.',
    workflow: 'Upload → Profile → Clean → SQL/Python EDA → Dashboard → AI Insight → Report',
    questions: ['What KPIs should I track?', 'What are the top trends?', 'Give me a full EDA analysis'],
    tools: ['SQL Workbench', 'Python Notebook', 'BI Builder', 'AI Analyst'],
    path: '/workspace/data-analyst',
  },
  {
    icon: Briefcase, color: 'text-blue-400', bg: 'bg-blue-400/10', border: 'border-blue-400/25',
    label: 'Business Analyst',
    desc: 'Frame problems, define KPIs, create business cases, map stakeholders.',
    workflow: 'Problem → Stakeholders → KPIs → Gap Analysis → Recommendation → Roadmap',
    questions: ['Why are costs increasing?', 'What are the key business risks?', 'Create a decision matrix'],
    tools: ['Problem Framing', 'KPI Builder', 'Decision Matrix', 'Business Case'],
    path: '/workspace/business-analyst',
  },
  {
    icon: TrendingUp, color: 'text-pink-400', bg: 'bg-pink-400/10', border: 'border-pink-400/25',
    label: 'Marketing Analyst',
    desc: 'Analyze campaigns, calculate CAC/ROAS/CLV, run funnels and A/B tests.',
    workflow: 'Campaigns → Funnel → Segmentation → CLV → A/B Test → Budget → Report',
    questions: ['Which segments are most valuable?', 'What is our ROAS and CAC?', 'Run an A/B test analysis'],
    tools: ['Campaign Analyzer', 'Funnel Builder', 'CLV Model', 'A/B Test Lab'],
    path: '/workspace/marketing-analyst',
  },
  {
    icon: Brain, color: 'text-purple-400', bg: 'bg-purple-400/10', border: 'border-purple-400/25',
    label: 'Data Scientist',
    desc: 'Build ML models, run forecasting, detect anomalies, explain predictions.',
    workflow: 'Feature Eng → Model Select → Train → Evaluate → Explain → Deploy → Monitor',
    questions: ['Predict next quarter revenue', 'Cluster customers into segments', 'Detect anomalies in this data'],
    tools: ['AutoML Pipeline', 'SHAP Explainability', 'Forecast Engine', 'MLOps Registry'],
    path: '/workspace/data-scientist',
  },
  {
    icon: Target, color: 'text-amber-400', bg: 'bg-amber-400/10', border: 'border-amber-400/25',
    label: 'Supply Chain Analyst',
    desc: 'Monitor inventory, supplier performance, on-time delivery, and demand.',
    workflow: 'Orders → Inventory → Suppliers → Forecast → Risk Alerts → Recommendations',
    questions: ['Which supplier is underperforming?', 'What is the inventory turnover?', 'Analyze on-time delivery'],
    tools: ['Supplier Scorecard', 'Demand Forecast', 'Risk Monitor', 'OTD Dashboard'],
    path: '/v2/supply-chain',
  },
  {
    icon: Database, color: 'text-green-400', bg: 'bg-green-400/10', border: 'border-green-400/25',
    label: 'CFO / Executive',
    desc: 'P&L analysis, margin analysis, cost variance, executive reports.',
    workflow: 'Revenue → Cost → Margin → Variance → Forecast → Board Report → Decision',
    questions: ['Explain why gross margin is declining', 'Give me a full P&L analysis', 'What is driving cost increases?'],
    tools: ['CFO Agent', 'P&L Builder', 'Forecast Hub', 'Board Report'],
    path: '/v2/ai-analysts',
  },
];

const WORKFLOWS = [
  { emoji: '📊', title: 'Analyze Sales Performance', desc: 'Upload sales data → clean → KPIs → trends → AI insight → PDF', path: '/v2/data-studio', color: 'cyan' },
  { emoji: '📣', title: 'Build Marketing Funnel Report', desc: 'CAC · ROAS · CLV · A/B test analysis in one place', path: '/v2/marketing-studio', color: 'pink' },
  { emoji: '🚚', title: 'Create Supply Chain Dashboard', desc: 'Inventory · Suppliers · OTD · Demand Forecast', path: '/v2/supply-chain', color: 'amber' },
  { emoji: '🧠', title: 'Run AI Deep Analysis', desc: '8 AI analysts · Evidence-backed · SQL+charts', path: '/v2/ai-analysts', color: 'purple' },
  { emoji: '📈', title: 'Forecast Revenue', desc: 'Holt-Winters · Prophet · accuracy metrics · confidence bands', path: '/forecast-hub', color: 'green' },
  { emoji: '🔬', title: 'Advanced Analytics Lab', desc: 'Descriptive · Diagnostic · Predictive · Causal', path: '/v2/analytics-lab', color: 'teal' },
  { emoji: '🧹', title: 'Clean Messy Dataset', desc: 'Profile · Quality score · 11 cleaning actions · Python code', path: '/v2/data-studio', color: 'blue' },
  { emoji: '📋', title: 'Generate Executive PDF Report', desc: '14 report types · evidence · decisions · board-ready', path: '/decision-reports', color: 'orange' },
];

const PLATFORM_MODULES = [
  { emoji: '🗄️', label: 'Data Studio', sub: 'Upload · Profile · Clean · Version · Export', path: '/v2/data-studio', color: 'text-cyan-400' },
  { emoji: '💻', label: 'SQL + Python Lab', sub: 'NL→SQL · 10 Templates · Python Notebook', path: '/v2/sql-lab', color: 'text-green-400' },
  { emoji: '🧠', label: 'AI Analyst Team', sub: '8 agents · Deep structured analysis', path: '/v2/ai-analysts', color: 'text-purple-400' },
  { emoji: '📣', label: 'Marketing Studio', sub: 'CAC · ROAS · A/B · CLV · Funnel', path: '/v2/marketing-studio', color: 'text-pink-400' },
  { emoji: '🚚', label: 'Supply Chain', sub: 'Inventory · Suppliers · OTD · Risk', path: '/v2/supply-chain', color: 'text-amber-400' },
  { emoji: '🔬', label: 'Analytics Lab', sub: 'Descriptive · Predictive · Causal', path: '/v2/analytics-lab', color: 'text-teal-400' },
  { emoji: '📊', label: 'BI Dashboards', sub: 'Charts · KPIs · Visual Builder · Stories', path: '/visual-builder', color: 'text-blue-400' },
  { emoji: '📋', label: 'Decision Reports', sub: '14 report types · evidence · PDF export', path: '/decision-reports', color: 'text-orange-400' },
  { emoji: '🎯', label: 'Business Analyst', sub: 'Problem framing · KPIs · Decision matrix', path: '/workspace/business-analyst', color: 'text-blue-400' },
  { emoji: '⚗️', label: 'Data Science Lab', sub: 'AutoML · SHAP · Forecast · MLOps', path: '/workspace/data-scientist', color: 'text-indigo-400' },
  { emoji: '📐', label: 'Semantic Metrics', sub: 'Define · Certify · Govern KPIs', path: '/semantic-metrics', color: 'text-purple-400' },
  { emoji: '👁️', label: 'Observability', sub: 'AI logs · pipeline runs · trust center', path: '/observability', color: 'text-white/50' },
];

const DATA_FLOW_STEPS = [
  { n: '01', label: 'Raw Data', desc: 'CSV · XLSX · JSON · API · Demo datasets', color: 'text-cyan-400' },
  { n: '02', label: 'Clean & Profile', desc: 'Quality score · 11 cleaning actions · versions', color: 'text-teal-400' },
  { n: '03', label: 'Define KPIs', desc: 'Semantic metric layer · formulas · governance', color: 'text-blue-400' },
  { n: '04', label: 'SQL / Python', desc: 'NL→SQL · Advanced builder · Python notebook', color: 'text-purple-400' },
  { n: '05', label: 'AI Analysis', desc: '8 agents · evidence-backed · 19-section output', color: 'text-pink-400' },
  { n: '06', label: 'Dashboard', desc: 'Charts · stories · KPI cards · geo maps', color: 'text-amber-400' },
  { n: '07', label: 'Forecast / ML', desc: 'Holt-Winters · AutoML · SHAP · anomaly detection', color: 'text-green-400' },
  { n: '08', label: 'Decision Report', desc: 'PDF · board-ready · evidence · recommendations', color: 'text-orange-400' },
];

export default function Home() {
  const [selectedRole, setSelectedRole] = useState(null);

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* ── HERO ─────────────────────────────────────────────────── */}
      <section className="hero-gradient pt-28 pb-16 px-6">
        <div className="max-w-7xl mx-auto text-center">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-cyan-400/10 border border-cyan-400/20 text-xs font-bold text-cyan-400 mb-6">
              <Star className="w-3 h-3" /> OmniData AI Analytics Studio v2.0
            </div>
            <h1 className="text-5xl lg:text-7xl font-black leading-[1.05] mb-5">
              <span className="block">Your AI-Powered</span>
              <span className="block text-gradient">Analytics Team</span>
              <span className="block text-3xl lg:text-4xl font-bold text-white/50 mt-2">in One Platform</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8 leading-relaxed">
              Upload messy data → clean it → run SQL → build dashboards → ask AI analysts → forecast → generate executive PDF reports. Like having Power BI + Tableau + ChatGPT + a data team — all in one app.
            </p>
            <div className="flex flex-wrap gap-3 justify-center mb-10">
              <Link to="/workspace"
                className="inline-flex items-center gap-2 px-7 py-4 bg-cyan-400 rounded-xl font-bold text-base hover:bg-cyan-300 transition-all hover:scale-105 shadow-lg shadow-cyan-400/20"
                style={{ color: 'hsl(222,47%,6%)' }}>
                <Zap className="w-5 h-5" /> Launch Workspace
              </Link>
              <Link to="/v2/data-studio"
                className="inline-flex items-center gap-2 px-7 py-4 glass border border-cyan-400/30 rounded-xl font-bold text-base text-cyan-400 hover:border-cyan-400/50 transition-all">
                <Database className="w-5 h-5" /> Data Studio
              </Link>
              <Link to="/v2/ai-analysts"
                className="inline-flex items-center gap-2 px-7 py-4 glass border border-purple-400/30 rounded-xl font-bold text-base text-purple-400 hover:border-purple-400/50 transition-all">
                <Brain className="w-5 h-5" /> Ask AI Analyst
              </Link>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-xs text-white/40">
              {['No setup required', 'Any data format', 'Grounded AI only', '8 specialist agents', 'PDF export'].map(f => (
                <span key={f} className="flex items-center gap-1.5"><CheckCircle2 className="w-3 h-3 text-cyan-400" />{f}</span>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── QUICK ACCESS PLATFORM MODULES ──────────────────────── */}
      <section className="py-12 px-6 border-b border-white/5 bg-white/1">
        <div className="max-w-7xl mx-auto">
          <FadeIn className="text-center mb-6">
            <h2 className="text-xl font-black">Start your analytics workflow</h2>
            <p className="text-sm text-muted-foreground mt-1">12 integrated modules · one unified platform</p>
          </FadeIn>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
            {PLATFORM_MODULES.map(m => (
              <Link key={m.label} to={m.path}
                className="glass-card rounded-xl p-3.5 border border-white/8 hover:border-white/18 hover:scale-[1.03] transition-all group text-left">
                <div className="text-xl mb-1.5">{m.emoji}</div>
                <div className={`text-xs font-bold ${m.color}`}>{m.label}</div>
                <div className="text-xs text-white/28 mt-0.5 leading-relaxed">{m.sub}</div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── DATA FLOW PIPELINE ─────────────────────────────────── */}
      <section className="py-16 px-6 border-b border-white/5">
        <div className="max-w-7xl mx-auto">
          <FadeIn className="text-center mb-10">
            <div className="text-xs text-cyan-400 uppercase tracking-widest font-semibold mb-2">Core Analytics Pipeline</div>
            <h2 className="text-3xl font-black mb-2">From Raw Data → Business Decision</h2>
            <p className="text-sm text-muted-foreground">Every step produces a real output. Nothing is disconnected.</p>
          </FadeIn>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {DATA_FLOW_STEPS.map((step, i) => (
              <FadeIn key={step.n} delay={i * 0.06}>
                <div className="glass-card rounded-2xl p-4 border border-white/6 hover:border-white/15 transition-all h-full">
                  <div className={`text-xs font-black font-mono ${step.color} mb-2`}>{step.n}</div>
                  <h3 className={`font-bold text-sm mb-1 ${step.color}`}>{step.label}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{step.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── ROLE SELECTOR ──────────────────────────────────────── */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <FadeIn className="text-center mb-10">
            <div className="text-xs text-purple-400 uppercase tracking-widest font-semibold mb-3">AI Analytics Team-in-a-Box</div>
            <h2 className="text-3xl font-black mb-3">I want help as a…</h2>
            <p className="text-sm text-muted-foreground">Choose your role for a purpose-built workspace, AI agent, tools, and structured outputs.</p>
          </FadeIn>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {ROLES.map((role, i) => (
              <FadeIn key={role.label} delay={i * 0.06}>
                <div
                  onClick={() => setSelectedRole(selectedRole?.label === role.label ? null : role)}
                  className={`glass-card rounded-2xl p-5 border cursor-pointer transition-all duration-200 ${selectedRole?.label === role.label ? `${role.border} ${role.bg}` : 'border-white/8 hover:border-white/18'}`}
                >
                  <div className="flex items-start gap-3 mb-3">
                    <div className={`w-10 h-10 rounded-xl ${role.bg} border ${role.border} flex items-center justify-center flex-shrink-0`}>
                      <role.icon className={`w-5 h-5 ${role.color}`} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <div className={`text-sm font-black ${role.color}`}>{role.label}</div>
                        {role.tag && <span className="text-xs px-1.5 py-0.5 rounded-full bg-cyan-400/10 text-cyan-400 border border-cyan-400/20">{role.tag}</span>}
                      </div>
                      <div className="text-xs text-white/40 mt-0.5 leading-relaxed">{role.desc}</div>
                    </div>
                  </div>

                  <AnimatePresence>
                    {selectedRole?.label === role.label && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="space-y-3 border-t border-white/8 pt-3 mt-3">
                        <div>
                          <div className="text-xs font-bold text-white/40 mb-1">WORKFLOW</div>
                          <div className="text-xs text-white/55 leading-relaxed">{role.workflow}</div>
                        </div>
                        <div>
                          <div className="text-xs font-bold text-white/40 mb-1">EXAMPLE QUESTIONS</div>
                          <div className="space-y-1">
                            {role.questions.map(q => <div key={q} className="text-xs text-white/45 flex items-center gap-1"><ChevronRight className="w-3 h-3 text-white/25" />{q}</div>)}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs font-bold text-white/40 mb-1">TOOLS</div>
                          <div className="flex flex-wrap gap-1">
                            {role.tools.map(t => <span key={t} className={`text-xs px-2 py-0.5 rounded ${role.bg} ${role.color} border ${role.border}`}>{t}</span>)}
                          </div>
                        </div>
                        <Link to={role.path} className={`flex items-center gap-1.5 text-xs font-bold ${role.color} hover:opacity-80 transition-all`}>
                          Open {role.label} Workspace <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {selectedRole?.label !== role.label && (
                    <div className={`flex items-center gap-1 text-xs font-semibold mt-3 ${role.color}`}>
                      Open Workspace <ArrowRight className="w-3 h-3" />
                    </div>
                  )}
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── QUICK START WORKFLOWS ────────────────────────────────── */}
      <section className="py-16 px-6 border-t border-white/5 bg-white/1">
        <div className="max-w-7xl mx-auto">
          <FadeIn className="text-center mb-8">
            <div className="text-xs text-teal-400 uppercase tracking-widest font-semibold mb-3">Quick Start Workflows</div>
            <h2 className="text-3xl font-black mb-2">Pick a workflow, start in 30 seconds</h2>
            <p className="text-sm text-muted-foreground">Each workflow guides you from dataset to decision.</p>
          </FadeIn>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {WORKFLOWS.map((wf, i) => (
              <FadeIn key={wf.title} delay={i * 0.05}>
                <Link to={wf.path} className="glass-card rounded-2xl p-5 border border-white/8 hover:border-white/20 transition-all group flex flex-col gap-3 h-full">
                  <div className="text-3xl">{wf.emoji}</div>
                  <div>
                    <div className="font-bold text-sm text-white/90 mb-1 group-hover:text-white transition-colors">{wf.title}</div>
                    <div className="text-xs text-white/35 leading-relaxed">{wf.desc}</div>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-cyan-400 font-semibold mt-auto">
                    Start Workflow <ArrowRight className="w-3 h-3" />
                  </div>
                </Link>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ───────────────────────────────────────────── */}
      <section className="py-20 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <FadeIn>
            <div className="glass-card rounded-3xl p-12 border border-cyan-400/15 glow-cyan">
              <Award className="w-12 h-12 text-cyan-400 mx-auto mb-4" />
              <h2 className="text-4xl font-black mb-3">Ready to analyze your data?</h2>
              <p className="text-muted-foreground mb-8 max-w-md mx-auto leading-relaxed text-sm">
                Upload your first dataset in seconds. No setup, no configuration. Get AI-powered insights in minutes.
              </p>
              <div className="flex flex-wrap gap-3 justify-center">
                <Link to="/workspace"
                  className="inline-flex items-center gap-2 px-8 py-4 bg-cyan-400 rounded-xl font-bold hover:bg-cyan-300 transition-all hover:scale-105"
                  style={{ color: 'hsl(222,47%,6%)' }}>
                  <Zap className="w-5 h-5" /> Launch Workspace
                </Link>
                <Link to="/v2/data-studio"
                  className="inline-flex items-center gap-2 px-8 py-4 glass border border-cyan-400/25 rounded-xl font-semibold text-cyan-400 hover:border-cyan-400/45 transition-all">
                  <Database className="w-5 h-5" /> Data Studio
                </Link>
                <Link to="/v2/ai-analysts"
                  className="inline-flex items-center gap-2 px-8 py-4 glass border border-purple-400/25 rounded-xl font-semibold text-purple-400 hover:border-purple-400/45 transition-all">
                  <Brain className="w-5 h-5" /> Ask AI Analyst
                </Link>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <OmniLogo size="sm" showText={true} />
          <div className="flex gap-6 text-xs text-muted-foreground flex-wrap justify-center">
            {[
              { label: 'Workspace', path: '/workspace' },
              { label: 'Data Studio', path: '/v2/data-studio' },
              { label: 'SQL Lab', path: '/v2/sql-lab' },
              { label: 'AI Analysts', path: '/v2/ai-analysts' },
              { label: 'Marketing Studio', path: '/v2/marketing-studio' },
              { label: 'Supply Chain', path: '/v2/supply-chain' },
              { label: 'Reports', path: '/decision-reports' },
            ].map(l => <Link key={l.path} to={l.path} className="hover:text-foreground transition-colors">{l.label}</Link>)}
          </div>
          <div className="text-xs text-muted-foreground">© 2026 OmniData AI Analytics Studio v2.0</div>
        </div>
      </footer>
    </div>
  );
}