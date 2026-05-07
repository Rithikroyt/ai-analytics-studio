import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useInView, AnimatePresence } from 'framer-motion';
import {
  Zap, BarChart2, Brain, FileText, ArrowRight, CheckCircle2,
  TrendingUp, Database, Shield, Sparkles, Target, Activity
} from 'lucide-react';
import OmniLogo from '@/components/ui/OmniLogo';
import InteractiveAudioExplainer from '@/components/home/InteractiveAudioExplainer';

const fadeUp = { hidden: { opacity: 0, y: 24 }, visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } } };
const stagger = { visible: { transition: { staggerChildren: 0.1 } } };

function FadeIn({ children, delay = 0, className = '' }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });
  return (
    <motion.div ref={ref} initial="hidden" animate={inView ? 'visible' : 'hidden'}
      variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] } } }}
      className={className}>
      {children}
    </motion.div>
  );
}

// ── Hero product mockup ──────────────────────────────────────────
function HeroMockup() {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick(n => n + 1), 2800);
    return () => clearInterval(t);
  }, []);

  const kpis = [
    { label: 'Total Revenue', value: '$4.82M', change: '+18.4%', up: true, color: '#00e5ff' },
    { label: 'Avg Deal Size', value: '$24.1K', change: '+6.2%', up: true, color: '#4caf50' },
    { label: 'Churn Rate', value: '3.8%', change: '-1.2%', up: false, color: '#ff6b35' },
    { label: 'NPS Score', value: '72', change: '+4pts', up: true, color: '#9c27b0' },
  ];

  const bars = [42, 68, 55, 81, 63, 94, 78, 89, 71, 96, 83, 100];

  return (
    <div className="relative w-full max-w-2xl mx-auto">
      {/* Glow */}
      <div className="absolute inset-0 bg-cyan-400/5 blur-3xl rounded-3xl pointer-events-none" />

      <div className="relative rounded-3xl border border-white/10 bg-navy-800/90 backdrop-blur-xl overflow-hidden shadow-2xl">
        {/* Top bar */}
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/6 bg-white/2">
          <div className="flex gap-1.5">
            {['#ff5f57','#febc2e','#28c840'].map(c => <div key={c} className="w-2.5 h-2.5 rounded-full" style={{ background: c }} />)}
          </div>
          <div className="flex-1 text-center">
            <span className="text-xs text-white/30 font-mono">AI Agent Analytics — Workspace</span>
          </div>
          <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
        </div>

        <div className="p-5 space-y-4">
          {/* KPI row */}
          <div className="grid grid-cols-4 gap-2">
            {kpis.map((k, i) => (
              <motion.div key={k.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
                className="rounded-xl p-3 text-center" style={{ background: `${k.color}10`, border: `1px solid ${k.color}25` }}>
                <div className="text-xs text-white/40 mb-1 leading-tight">{k.label}</div>
                <div className="text-base font-black font-mono leading-none" style={{ color: k.color }}>{k.value}</div>
                <div className={`text-xs mt-1 font-medium ${k.up ? 'text-green-400' : 'text-red-400'}`}>{k.change}</div>
              </motion.div>
            ))}
          </div>

          {/* Chart + AI Answer */}
          <div className="grid grid-cols-5 gap-3">
            {/* Trend chart */}
            <div className="col-span-3 rounded-xl border border-white/8 bg-white/3 p-3">
              <div className="text-xs text-white/40 mb-3 font-semibold">Revenue Trend — 12 Months</div>
              <div className="flex items-end gap-1 h-16">
                {bars.map((h, i) => (
                  <motion.div key={i} initial={{ height: 0 }} animate={{ height: `${h}%` }} transition={{ delay: 0.3 + i * 0.04, duration: 0.4, ease: 'easeOut' }}
                    className="flex-1 rounded-t-sm" style={{ background: i >= 9 ? 'rgba(0,229,255,0.7)' : 'rgba(0,229,255,0.25)' }} />
                ))}
              </div>
              <div className="flex justify-between text-xs text-white/20 mt-1">
                <span>Jan</span><span>Jun</span><span>Dec</span>
              </div>
            </div>

            {/* AI Answer card */}
            <div className="col-span-2 rounded-xl border border-purple-400/20 bg-purple-400/5 p-3 flex flex-col">
              <div className="flex items-center gap-1.5 mb-2">
                <div className="w-4 h-4 rounded bg-purple-400/20 flex items-center justify-center">
                  <Brain className="w-2.5 h-2.5 text-purple-400" />
                </div>
                <span className="text-xs text-purple-400 font-semibold">AI Analyst</span>
              </div>
              <AnimatePresence mode="wait">
                <motion.div key={tick % 3} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1">
                  {tick % 3 === 0 && <p className="text-xs text-white/55 leading-relaxed">Revenue grew <span className="text-cyan-400 font-semibold">18.4%</span> YoY. Q4 outperformed projections by $340K driven by Enterprise segment.</p>}
                  {tick % 3 === 1 && <p className="text-xs text-white/55 leading-relaxed">Churn risk is highest in the <span className="text-amber-400 font-semibold">SMB segment</span>. Recommend proactive outreach for accounts &lt;90 days old.</p>}
                  {tick % 3 === 2 && <p className="text-xs text-white/55 leading-relaxed">3 anomalies detected in <span className="text-red-400 font-semibold">October data</span>. These appear to be one-time events, not a systemic trend.</p>}
                </motion.div>
              </AnimatePresence>
              <div className="flex items-center gap-1 mt-2 text-xs text-white/25">
                <div className="w-1 h-1 rounded-full bg-green-400" />
                Grounded · High confidence
              </div>
            </div>
          </div>

          {/* Bottom row */}
          <div className="flex gap-2">
            <div className="flex-1 rounded-xl border border-white/8 bg-white/2 px-3 py-2">
              <div className="text-xs text-white/30 mb-1">Top Driver</div>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-3.5 h-3.5 text-green-400" />
                <span className="text-xs font-semibold text-green-400">Enterprise accounts +34%</span>
              </div>
            </div>
            <div className="flex-1 rounded-xl border border-amber-400/15 bg-amber-400/5 px-3 py-2">
              <div className="text-xs text-white/30 mb-1">Risk Signal</div>
              <div className="flex items-center gap-2">
                <Activity className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-xs font-semibold text-amber-400">SMB churn elevated</span>
              </div>
            </div>
            <div className="flex-1 rounded-xl border border-cyan-400/15 bg-cyan-400/5 px-3 py-2">
              <div className="text-xs text-white/30 mb-1">Forecast</div>
              <div className="flex items-center gap-2">
                <Target className="w-3.5 h-3.5 text-cyan-400" />
                <span className="text-xs font-semibold text-cyan-400">$5.6M next quarter</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const FEATURES = [
  {
    icon: Database, color: 'text-cyan-400', bg: 'bg-cyan-400/10', border: 'border-cyan-400/20',
    title: 'Universal Data Intake',
    desc: 'Upload CSV, XLSX, JSON, or TXT files. Auto-detect column types, clean headers, profile quality, and infer schema in seconds.',
  },
  {
    icon: Brain, color: 'text-purple-400', bg: 'bg-purple-400/10', border: 'border-purple-400/20',
    title: 'Grounded AI Analyst',
    desc: 'Ask anything in plain English. The AI Analyst answers from your actual data — never hallucinated, always grounded with evidence.',
  },
  {
    icon: BarChart2, color: 'text-teal-400', bg: 'bg-teal-400/10', border: 'border-teal-400/20',
    title: 'Executive Dashboards',
    desc: 'Auto-generated storytelling dashboards following a clear hierarchy: what happened, why, where the risk is, what to do next.',
  },
  {
    icon: TrendingUp, color: 'text-green-400', bg: 'bg-green-400/10', border: 'border-green-400/20',
    title: 'Predictive Analytics',
    desc: 'Time-series forecasting, anomaly detection, correlations, and regression — applied automatically when your data supports it.',
  },
  {
    icon: FileText, color: 'text-blue-400', bg: 'bg-blue-400/10', border: 'border-blue-400/20',
    title: 'Board-Ready Reports',
    desc: 'Generate Executive Summaries, Anomaly Reports, Forecast Reports, and Board Memos with one click. Export as PDF or CSV.',
  },
  {
    icon: Shield, color: 'text-amber-400', bg: 'bg-amber-400/10', border: 'border-amber-400/20',
    title: 'Semantic Model Layer',
    desc: 'Auto-build a reusable semantic model with KPI definitions, dimensions, measures, and natural language query examples.',
  },
];

const WORKFLOW_STEPS = [
  { num: '01', label: 'Upload Raw Data',     desc: 'CSV · Excel · JSON — auto schema', color: 'text-cyan-400',   output: 'Workspace created' },
  { num: '02', label: 'Clean It',            desc: 'Missing, duplicates, quality score', color: 'text-teal-400',  output: 'Cleaned dataset + score' },
  { num: '03', label: 'Define KPIs',         desc: 'Primary, secondary, custom formulas', color: 'text-blue-400', output: 'Semantic KPI layer' },
  { num: '04', label: 'Query with SQL',      desc: 'NL→SQL, execution, chart, explain', color: 'text-purple-400',output: 'SQL result + chart' },
  { num: '05', label: 'Build Dashboards',    desc: 'KPIs, trends, anomalies, stories', color: 'text-pink-400',   output: 'Story dashboard' },
  { num: '06', label: 'Explain Charts',      desc: 'Plain English + business meaning', color: 'text-amber-400',  output: 'Chart explanation' },
  { num: '07', label: 'Ask AI',              desc: 'Tool-grounded 9-part analysis', color: 'text-green-400',    output: 'Evidence-backed answer' },
  { num: '08', label: 'Generate Reports',    desc: 'Executive, board, forecast, RFM', color: 'text-orange-400', output: 'Decision-ready report' },
];

const TRUST = [
  { label: 'Sub-3s analysis', emoji: '⚡' },
  { label: 'Grounded AI answers', emoji: '🧠' },
  { label: 'Any data format', emoji: '📂' },
  { label: 'Statistical rigor', emoji: '📊' },
  { label: 'No hallucinations', emoji: '✅' },
  { label: 'Enterprise-ready', emoji: '🏆' },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* ── Hero ────────────────────────────────────────────────── */}
      <section className="hero-gradient pt-32 pb-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
                <h1 className="text-5xl lg:text-6xl font-black leading-[1.05] mb-5">
                  AI insights you can
                  <span className="block text-gradient">trust across any</span>
                  <span className="block">raw data</span>
                </h1>
                <p className="text-lg text-muted-foreground leading-relaxed mb-4 max-w-lg">
                  Upload raw data, infer structure, generate dashboards, ask an AI analyst, and export executive-ready reports — all in one platform.
                </p>
                <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 mb-6">
                  <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 flex-shrink-0" />
                  <span className="text-xs text-white/60 leading-relaxed">
                    <strong className="text-white/80">OmniData AI Analytics Studio</strong> helps you transform messy raw data into cleaned datasets, SQL-backed insights, explainable dashboards, AI recommendations, and executive decision reports.
                  </span>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Link to="/workspace"
                    className="inline-flex items-center gap-2 px-6 py-3.5 bg-cyan-400 rounded-xl font-bold text-sm hover:bg-cyan-300 transition-all hover:scale-105 shadow-lg shadow-cyan-400/20"
                    style={{ color: 'hsl(222,47%,6%)' }}>
                    <Zap className="w-4 h-4" /> Launch Workspace
                  </Link>
                  <Link to="/workflows"
                    className="inline-flex items-center gap-2 px-6 py-3.5 glass border border-white/10 rounded-xl text-sm font-semibold hover:border-cyan-400/30 transition-all">
                    Explore Workflows <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
                <div className="flex flex-wrap gap-4 mt-6">
                  {['No setup required', 'Any data format', 'Grounded AI'].map(t => (
                    <div key={t} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" /> {t}
                    </div>
                  ))}
                </div>
              </motion.div>
            </div>
            <motion.div initial={{ opacity: 0, x: 32 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.7, delay: 0.2 }}>
              <HeroMockup />
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── Interactive Audio Explainer ──────────────────────────── */}
      <InteractiveAudioExplainer />

      {/* ── Trust strip ─────────────────────────────────────────── */}
      <section className="border-y border-white/5 bg-white/2 py-5 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-wrap items-center justify-center gap-6 lg:gap-10">
            {TRUST.map(({ emoji, label }) => (
              <div key={label} className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>{emoji}</span> {label}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ────────────────────────────────────────────── */}
      <section className="section-gradient py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <FadeIn className="text-center mb-16">
            <div className="text-xs text-cyan-400 uppercase tracking-widest font-semibold mb-3">Platform Capabilities</div>
            <h2 className="text-4xl font-black mb-4">Everything you need to go from<br />raw data to executive insight</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              One integrated platform — from messy CSVs to board-ready analytics in minutes.
            </p>
          </FadeIn>
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f, i) => (
              <motion.div key={f.title} variants={fadeUp}
                className={`glass-card rounded-2xl p-6 border ${f.border} hover:scale-[1.01] transition-all duration-300 group`}>
                <div className={`w-10 h-10 rounded-xl ${f.bg} border ${f.border} flex items-center justify-center mb-4`}>
                  <f.icon className={`w-5 h-5 ${f.color}`} />
                </div>
                <h3 className="font-bold text-base mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── Workflow ─────────────────────────────────────────────── */}
      <section className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <FadeIn className="text-center mb-10">
            <div className="text-xs text-teal-400 uppercase tracking-widest font-semibold mb-3">How It Works</div>
            <h2 className="text-4xl font-black mb-4">From raw data to decision report<br />in 8 clear steps</h2>
            <p className="text-muted-foreground max-w-xl mx-auto text-sm">Each step produces a clear output. Nothing is disconnected — every stage feeds the next.</p>
          </FadeIn>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {WORKFLOW_STEPS.map((step, i) => (
              <FadeIn key={step.num} delay={i * 0.07}>
                <div className="glass-card rounded-2xl p-4 border border-white/5 hover:border-white/15 transition-all">
                  <div className={`text-xs font-black font-mono ${step.color} mb-2`}>{step.num}</div>
                  <h3 className="font-bold text-sm mb-1">{step.label}</h3>
                  <p className="text-xs text-muted-foreground mb-3 leading-relaxed">{step.desc}</p>
                  <div className={`text-xs px-2 py-1 rounded-full bg-white/5 border border-white/8 ${step.color} font-mono inline-block`}>→ {step.output}</div>
                </div>
              </FadeIn>
            ))}
          </div>

          <FadeIn className="mt-12 text-center">
            <Link to="/workspace"
              className="inline-flex items-center gap-2 px-8 py-4 bg-cyan-400 rounded-xl font-bold text-base hover:bg-cyan-300 transition-all hover:scale-105 shadow-lg shadow-cyan-400/20"
              style={{ color: 'hsl(222,47%,6%)' }}>
              <Zap className="w-5 h-5" /> Start Analyzing Your Data
            </Link>
          </FadeIn>
        </div>
      </section>

      {/* ── Use Cases ────────────────────────────────────────────── */}
      <section className="section-gradient py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <FadeIn className="text-center mb-12">
            <div className="text-xs text-purple-400 uppercase tracking-widest font-semibold mb-3">Use Cases</div>
            <h2 className="text-4xl font-black mb-4">Built for every industry</h2>
            <p className="text-muted-foreground">From startup ops to enterprise BI — one platform adapts to your data.</p>
          </FadeIn>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { emoji: '📊', label: 'Sales & Revenue' },
              { emoji: '👥', label: 'HR & Payroll' },
              { emoji: '🏥', label: 'Healthcare Ops' },
              { emoji: '🎓', label: 'Education' },
              { emoji: '📦', label: 'Supply Chain' },
              { emoji: '📈', label: 'Finance & Risk' },
            ].map((u) => (
              <FadeIn key={u.label}>
                <div className="glass-card rounded-2xl p-5 text-center border border-white/5 hover:border-white/15 transition-all hover:scale-105">
                  <div className="text-3xl mb-2">{u.emoji}</div>
                  <div className="text-xs font-semibold text-white/70">{u.label}</div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ────────────────────────────────────────────── */}
      <section className="py-24 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <FadeIn>
            <div className="glass-card rounded-3xl p-12 border border-cyan-400/15 glow-cyan">
              <div className="w-16 h-16 rounded-2xl bg-cyan-400/10 border border-cyan-400/20 flex items-center justify-center mx-auto mb-6">
                <Sparkles className="w-8 h-8 text-cyan-400" />
              </div>
              <h2 className="text-4xl font-black mb-3">Ready to unlock your data?</h2>
              <p className="text-sm text-cyan-400/70 font-mono mb-4 leading-relaxed max-w-lg mx-auto">
                "OmniData AI Analytics Studio helps users transform messy raw data into cleaned datasets, SQL-backed insights, explainable dashboards, AI recommendations, and executive decision reports."
              </p>
              <p className="text-muted-foreground mb-8 max-w-md mx-auto leading-relaxed text-sm">
                Upload your first dataset in seconds. No setup, no configuration, no data engineering required.
              </p>
              <div className="flex flex-wrap gap-3 justify-center">
                <Link to="/workspace"
                  className="inline-flex items-center gap-2 px-8 py-4 bg-cyan-400 rounded-xl font-bold hover:bg-cyan-300 transition-all hover:scale-105"
                  style={{ color: 'hsl(222,47%,6%)' }}>
                  <Zap className="w-5 h-5" /> Launch Workspace Free
                </Link>
                <Link to="/platform"
                  className="inline-flex items-center gap-2 px-8 py-4 glass border border-white/10 rounded-xl font-semibold hover:border-cyan-400/30 transition-all">
                  View Platform <ArrowRight className="w-4 h-4" />
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
            <Link to="/platform" className="hover:text-foreground transition-colors">Platform</Link>
            <Link to="/workflows" className="hover:text-foreground transition-colors">Workflows</Link>
            <Link to="/universal-data" className="hover:text-foreground transition-colors">Universal Data</Link>
            <Link to="/workspace" className="hover:text-foreground transition-colors">Workspace</Link>
            <Link to="/integrations" className="hover:text-foreground transition-colors">Integrations</Link>
            <Link to="/reports" className="hover:text-foreground transition-colors">Reports</Link>
          </div>
          <div className="text-xs text-muted-foreground">© 2026 OmniData AI Analytics Studio · Excel + SQL + Tableau + AI — in one platform.</div>
        </div>
      </footer>
    </div>
  );
}