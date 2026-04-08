import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  ArrowRight, Play, Upload, Brain, BarChart3, FileText,
  Zap, Shield, Database, GitBranch, Sparkles, TrendingUp, TrendingDown,
  CheckCircle2, Layers, Activity, Target, AlertTriangle,
  ChevronRight, Star, Globe, Bot, LineChart, PieChart
} from 'lucide-react';
import OmniLogo from '../components/ui/OmniLogo';

const fadeUp = { hidden: { opacity: 0, y: 28 }, show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } } };
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.1 } } };

const features = [
  { icon: Upload, color: 'text-cyan-400', bg: 'bg-cyan-400/10', border: 'border-cyan-400/20', title: 'Universal Data Intake', desc: 'Upload CSV, XLSX, JSON — detect sheets, clean headers, infer types automatically.' },
  { icon: GitBranch, color: 'text-teal-400', bg: 'bg-teal-400/10', border: 'border-teal-400/20', title: 'Auto Relationship Inference', desc: 'Infers joins between tables using shared IDs and field names automatically.' },
  { icon: Layers, color: 'text-blue-400', bg: 'bg-blue-400/10', border: 'border-blue-400/20', title: 'Semantic Layer', desc: 'Dimensions, measures, KPI definitions — your data speaks a consistent language.' },
  { icon: BarChart3, color: 'text-purple-400', bg: 'bg-purple-400/10', border: 'border-purple-400/20', title: 'Storytelling Dashboards', desc: 'Narrative-driven visuals: what happened, why, where risk is, what to do next.' },
  { icon: Brain, color: 'text-pink-400', bg: 'bg-pink-400/10', border: 'border-pink-400/20', title: 'AI Analyst Agent', desc: 'Ask anything in plain English. Grounded answers from data, semantic layer, and docs.' },
  { icon: FileText, color: 'text-amber-400', bg: 'bg-amber-400/10', border: 'border-amber-400/20', title: 'Executive Reports', desc: 'One-click board memos, anomaly reports, and PDF-ready exports.' },
];

const workflow = [
  { step: '01', title: 'Upload Your Data', desc: 'Drop any structured file — CSV, XLSX, JSON. The platform handles the rest.', color: 'text-cyan-400', border: 'border-cyan-400/25', bg: 'bg-cyan-400/10' },
  { step: '02', title: 'Auto-Profile & Prepare', desc: 'Detect types, clean headers, score quality, and flag issues — instantly.', color: 'text-teal-400', border: 'border-teal-400/25', bg: 'bg-teal-400/10' },
  { step: '03', title: 'Generate Dashboards', desc: 'AI creates an executive storytelling dashboard with insights and annotations.', color: 'text-blue-400', border: 'border-blue-400/25', bg: 'bg-blue-400/10' },
  { step: '04', title: 'Ask the AI Analyst', desc: 'Query your data in plain English. Get grounded, structured answers with evidence.', color: 'text-purple-400', border: 'border-purple-400/25', bg: 'bg-purple-400/10' },
  { step: '05', title: 'Export & Share', desc: 'Board memos, PDFs, CSVs — ready in seconds. No formatting required.', color: 'text-pink-400', border: 'border-pink-400/25', bg: 'bg-pink-400/10' },
];

const trust = [
  { icon: Shield, label: 'Enterprise Security' },
  { icon: CheckCircle2, label: 'SOC 2 Ready' },
  { icon: Globe, label: 'GDPR Compliant' },
  { icon: Zap, label: 'AI-Powered Analysis' },
  { icon: Activity, label: '99.9% Uptime' },
  { icon: Target, label: 'Fortune 500 Trusted' },
];

const testimonials = [
  { name: 'Sarah Chen', role: 'VP Analytics, TechCorp', quote: 'Cut our time to insight from 3 days to 15 minutes. The AI analyst is genuinely impressive.', stars: 5 },
  { name: 'Marcus Webb', role: 'CFO, FinanceGroup', quote: 'Board-ready dashboards in one click. The storytelling structure is exactly what executives need.', stars: 5 },
  { name: 'Dr. Priya Sharma', role: 'Data Science Lead, HealthNet', quote: 'The semantic layer ensures everyone uses the same definitions. No more metric debates.', stars: 5 },
];

const useCases = [
  { icon: '📊', label: 'Sales & Revenue', desc: 'Track pipeline, forecast revenue, identify top performers.' },
  { icon: '👥', label: 'HR & Workforce', desc: 'Headcount trends, payroll analysis, retention risk scoring.' },
  { icon: '🏥', label: 'Healthcare Ops', desc: 'Patient throughput, quality metrics, cost per episode.' },
  { icon: '🎓', label: 'Student Analytics', desc: 'Engagement, retention, at-risk identification, outcomes.' },
  { icon: '📈', label: 'Market Research', desc: 'Survey insights, sentiment trends, segment analysis.' },
  { icon: '⚙️', label: 'Operations', desc: 'Efficiency metrics, anomaly detection, process optimization.' },
];

// Mini AI Answer card mock
function AIAnswerMock() {
  return (
    <div className="glass rounded-xl border border-purple-400/20 p-4 text-left">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-6 h-6 rounded-lg bg-purple-400/15 flex items-center justify-center">
          <Bot className="w-3 h-3 text-purple-400" />
        </div>
        <span className="text-xs text-purple-400 font-semibold">AI Analyst</span>
        <span className="text-xs text-white/20 ml-auto">Grounded answer</span>
      </div>
      <p className="text-xs text-white/70 leading-relaxed mb-2">
        <span className="text-white font-semibold">Revenue grew 18.3% YoY</span>, driven primarily by North America (+24%) and new enterprise contracts signed in Q3.
      </p>
      <div className="flex items-center gap-2 text-xs">
        <span className="px-2 py-0.5 rounded-full bg-green-400/15 text-green-400">↑ Confidence: High</span>
        <span className="text-white/25">· 4 data sources</span>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="hero-gradient min-h-screen flex items-center pt-16">
        <div className="max-w-7xl mx-auto px-6 py-24">
          <motion.div variants={stagger} initial="hidden" animate="show" className="text-center space-y-8">
            <motion.div variants={fadeUp}>
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold tracking-widest border border-cyan-400/30 text-cyan-400 bg-cyan-400/5">
                <Sparkles className="w-3 h-3" /> UNIVERSAL AI ANALYTICS PLATFORM
              </span>
            </motion.div>

            <motion.h1 variants={fadeUp} className="text-5xl md:text-7xl font-black tracking-tight leading-[1.05]">
              <span className="text-foreground">AI insights you can</span>
              <br />
              <span className="text-gradient">trust across any raw data</span>
            </motion.h1>

            <motion.p variants={fadeUp} className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Upload raw data, infer structure, generate executive dashboards, ask an AI analyst, and export board-ready reports — in minutes.
            </motion.p>

            <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/workspace" className="inline-flex items-center gap-2 px-7 py-3.5 bg-cyan-400 text-navy-900 rounded-xl text-sm font-bold hover:bg-cyan-300 transition-all hover:scale-105 glow-cyan-sm" style={{ color: 'hsl(222, 47%, 6%)' }}>
                <Zap className="w-4 h-4" /> Launch Workspace <ArrowRight className="w-4 h-4" />
              </Link>
              <Link to="/workflows" className="inline-flex items-center gap-2 px-7 py-3.5 glass border border-white/10 rounded-xl text-sm font-medium text-foreground hover:border-cyan-400/30 transition-all">
                <Play className="w-4 h-4 text-cyan-400" /> Explore Workflows
              </Link>
            </motion.div>

            {/* ── Rich Hero Dashboard Mock ── */}
            <motion.div variants={fadeUp} className="mt-16 relative max-w-5xl mx-auto">
              <div className="absolute -inset-4 bg-cyan-400/5 blur-3xl rounded-3xl pointer-events-none" />
              <div className="relative glass-card rounded-2xl border border-white/8 overflow-hidden glow-cyan">
                {/* Top bar */}
                <div className="bg-navy-800/90 px-5 py-3 flex items-center gap-3 border-b border-white/5">
                  <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-400/60" />
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-400/60" />
                    <div className="w-2.5 h-2.5 rounded-full bg-green-400/60" />
                  </div>
                  <div className="flex-1 h-5 bg-white/5 rounded-full max-w-xs mx-auto" />
                  <div className="text-xs text-white/25 font-mono">Sales_Q4_2024.xlsx</div>
                </div>

                <div className="bg-navy-800/60 p-5">
                  {/* KPI Strip */}
                  <div className="grid grid-cols-4 gap-3 mb-5">
                    {[
                      { label: 'Total Revenue', value: '$12.4M', change: '+18.3%', color: 'text-cyan-400', up: true },
                      { label: 'Gross Margin', value: '68.2%', change: '+2.1pp', color: 'text-teal-400', up: true },
                      { label: 'Active Regions', value: '4', change: 'Stable', color: 'text-blue-400', up: null },
                      { label: 'YoY Growth', value: '18.3%', change: 'Q4 Peak', color: 'text-purple-400', up: true },
                    ].map((kpi) => (
                      <div key={kpi.label} className="glass p-3.5 rounded-xl border border-white/5">
                        <div className="text-xs text-muted-foreground mb-1.5">{kpi.label}</div>
                        <div className={`text-xl font-black font-mono ${kpi.color}`}>{kpi.value}</div>
                        <div className={`text-xs mt-1 flex items-center gap-1 ${kpi.up === true ? 'text-green-400' : kpi.up === false ? 'text-red-400' : 'text-white/40'}`}>
                          {kpi.up === true && <TrendingUp className="w-3 h-3" />}
                          {kpi.up === false && <TrendingDown className="w-3 h-3" />}
                          {kpi.change}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Charts + AI Answer row */}
                  <div className="grid grid-cols-3 gap-3 mb-3">
                    {/* Big trend chart */}
                    <div className="col-span-2 glass rounded-xl p-4 border border-white/5">
                      <div className="flex items-center justify-between mb-3">
                        <div className="text-xs font-semibold text-white/50 uppercase tracking-widest">Revenue Trend</div>
                        <div className="text-xs text-cyan-400">+18.3% YoY</div>
                      </div>
                      <div className="flex items-end gap-1.5 h-20">
                        {[38,47,42,61,55,73,68,82,71,89,82,96].map((h, i) => (
                          <div key={i} className="flex-1 rounded-t-sm" style={{
                            height:`${h}%`,
                            background: i === 11 ? 'rgba(0,229,255,0.9)' : `rgba(0,229,255,${0.25 + h/300})`,
                          }} />
                        ))}
                      </div>
                      <div className="flex justify-between mt-2 text-xs text-white/20">
                        <span>Jan</span><span>Apr</span><span>Jul</span><span>Oct</span><span>Dec</span>
                      </div>
                    </div>

                    {/* Segment donut */}
                    <div className="glass rounded-xl p-4 border border-white/5">
                      <div className="text-xs font-semibold text-white/50 uppercase tracking-widest mb-3">By Region</div>
                      <div className="space-y-2">
                        {[['North America','42%','bg-cyan-400'],['Europe','28%','bg-teal-400'],['APAC','18%','bg-blue-400'],['LatAm','12%','bg-purple-400']].map(([r,p,c]) => (
                          <div key={r} className="flex items-center gap-2">
                            <div className={`w-1.5 h-1.5 rounded-full ${c} flex-shrink-0`} />
                            <span className="text-xs text-white/50 flex-1 truncate">{r}</span>
                            <span className="text-xs font-mono text-white/70">{p}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* AI Answer + Insight row */}
                  <div className="grid grid-cols-2 gap-3">
                    <AIAnswerMock />
                    <div className="glass rounded-xl border border-amber-400/20 p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                        <span className="text-xs text-amber-400 font-semibold">Anomaly Detected</span>
                      </div>
                      <p className="text-xs text-white/60 leading-relaxed">LatAm region showed a <span className="text-amber-400 font-semibold">-34% drop</span> in August — 2.8σ below expected. Likely linked to FX volatility event.</p>
                    </div>
                  </div>
                </div>
              </div>
              {/* Bottom fade */}
              <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-background to-transparent pointer-events-none" />
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ── Trust Bar ─────────────────────────────────────────── */}
      <section className="border-y border-border/50 py-5 bg-navy-800/40">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-wrap items-center justify-center gap-8">
            {trust.map(item => (
              <div key={item.label} className="flex items-center gap-2 text-sm text-muted-foreground">
                <item.icon className="w-4 h-4 text-cyan-400" /> {item.label}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Use Cases ─────────────────────────────────────────── */}
      <section className="py-24 section-gradient">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-14">
            <span className="text-xs font-semibold tracking-widest text-cyan-400 uppercase">Use Cases</span>
            <h2 className="text-4xl font-black mt-3 mb-4">Built for every domain</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">From sales operations to healthcare analytics — one platform handles them all.</p>
          </motion.div>
          <motion.div variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true }} className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {useCases.map((uc, i) => (
              <motion.div key={uc.label} variants={fadeUp} className="glass-card rounded-2xl p-5 border border-white/5 text-center hover:border-cyan-400/20 transition-all cursor-default group">
                <div className="text-3xl mb-3">{uc.icon}</div>
                <div className="text-sm font-semibold mb-1.5">{uc.label}</div>
                <div className="text-xs text-muted-foreground leading-relaxed">{uc.desc}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── Features ──────────────────────────────────────────── */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-14">
            <span className="text-xs font-semibold tracking-widest text-cyan-400 uppercase">Core Capabilities</span>
            <h2 className="text-4xl font-black mt-3 mb-4">Everything your data team needs</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">From raw upload to board-ready insights — in a single, unified workspace.</p>
          </motion.div>
          <motion.div variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true }} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f) => (
              <motion.div key={f.title} variants={fadeUp} className={`glass-card rounded-2xl p-6 border ${f.border} hover:border-opacity-80 transition-all group cursor-default`}>
                <div className={`w-10 h-10 rounded-xl ${f.bg} flex items-center justify-center mb-4`}>
                  <f.icon className={`w-5 h-5 ${f.color}`} />
                </div>
                <h3 className="font-semibold text-foreground mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── AI Analyst Highlight ─────────────────────────────── */}
      <section className="py-24 section-gradient">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <motion.div initial={{ opacity: 0, x: -32 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
              <span className="text-xs font-semibold tracking-widest text-purple-400 uppercase">AI Analyst Agent</span>
              <h2 className="text-4xl font-black mt-4 mb-6">Ask anything.<br /><span className="text-gradient">Get grounded answers.</span></h2>
              <p className="text-muted-foreground leading-relaxed mb-8">
                The AI Analyst is grounded in your uploaded data, semantic model, SQL results, and evidence documents. It never returns blank answers or generic fallbacks — every response is structured, evidence-backed, and actionable.
              </p>
              <div className="space-y-3">
                {['Direct answer with supporting data','Why it matters — business context','Supporting evidence from documents','Recommended next actions','Confidence score and limitations'].map((item, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm">
                    <div className="w-5 h-5 rounded-full bg-purple-400/15 flex items-center justify-center flex-shrink-0">
                      <CheckCircle2 className="w-3 h-3 text-purple-400" />
                    </div>
                    <span className="text-muted-foreground">{item}</span>
                  </div>
                ))}
              </div>
              <Link to="/workspace" className="inline-flex items-center gap-2 mt-8 px-6 py-3 bg-purple-400/10 border border-purple-400/25 text-purple-400 rounded-xl text-sm font-semibold hover:bg-purple-400/15 transition-all">
                <Bot className="w-4 h-4" /> Try the AI Analyst <ChevronRight className="w-4 h-4" />
              </Link>
            </motion.div>

            {/* Chat mock */}
            <motion.div initial={{ opacity: 0, x: 32 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="space-y-3">
              {[
                { role: 'user', text: 'What drove the revenue increase in Q3?' },
                { role: 'ai', text: 'Q3 revenue grew 22.4% QoQ, driven by **North America enterprise deals** (+$1.2M) and **new APAC partnerships** (+$0.4M). The SaaS segment outperformed forecast by 14%. Main risk: LatAm lagged by -8%, suggesting regional headwinds.', confidence: 'High' },
                { role: 'user', text: 'Which customers are at risk of churn?' },
                { role: 'ai', text: 'Based on engagement scores and payment history, **3 enterprise accounts** show high churn risk (score > 0.75): Acme Corp, GlobalTech, and MidWest Partners. Recommend immediate CSM outreach.', confidence: 'Medium' },
              ].map((msg, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.15 }}
                  className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.role === 'ai' && (
                    <div className="w-7 h-7 rounded-lg bg-purple-400/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Bot className="w-3.5 h-3.5 text-purple-400" />
                    </div>
                  )}
                  <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs leading-relaxed ${msg.role === 'user' ? 'bg-cyan-400/10 border border-cyan-400/20 text-white/80' : 'bg-white/4 border border-white/8 text-white/70'}`}>
                    {msg.text}
                    {msg.confidence && (
                      <div className="mt-1.5">
                        <span className={`px-1.5 py-0.5 rounded-full text-xs ${msg.confidence === 'High' ? 'bg-green-400/15 text-green-400' : 'bg-amber-400/15 text-amber-400'}`}>
                          {msg.confidence} confidence
                        </span>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── Workflow Steps ─────────────────────────────────────── */}
      <section className="py-24">
        <div className="max-w-5xl mx-auto px-6">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-14">
            <span className="text-xs font-semibold tracking-widest text-cyan-400 uppercase">How It Works</span>
            <h2 className="text-4xl font-black mt-3 mb-4">From upload to insight in minutes</h2>
          </motion.div>
          <div className="space-y-4">
            {workflow.map((step, i) => (
              <motion.div key={step.step} initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                className={`flex items-start gap-5 glass-card rounded-2xl p-5 border ${step.border}`}>
                <div className={`flex-shrink-0 w-12 h-12 rounded-xl ${step.bg} flex items-center justify-center`}>
                  <span className={`font-mono font-bold text-sm ${step.color}`}>{step.step}</span>
                </div>
                <div>
                  <h3 className={`font-semibold mb-1 ${step.color}`}>{step.title}</h3>
                  <p className="text-sm text-muted-foreground">{step.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ─────────────────────────────────────── */}
      <section className="py-24 section-gradient">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-14">
            <span className="text-xs font-semibold tracking-widest text-cyan-400 uppercase">Customer Stories</span>
            <h2 className="text-4xl font-black mt-3">Trusted by data leaders</h2>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <motion.div key={t.name} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                className="glass-card rounded-2xl p-6 border border-white/5">
                <div className="flex gap-1 mb-4">
                  {[...Array(t.stars)].map((_, j) => <Star key={j} className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />)}
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed mb-5 italic">"{t.quote}"</p>
                <div>
                  <div className="text-sm font-semibold">{t.name}</div>
                  <div className="text-xs text-muted-foreground">{t.role}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────── */}
      <section className="py-24">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="glass-card rounded-3xl border-gradient p-16 glow-cyan relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-cyan-400/5 to-transparent pointer-events-none" />
            <span className="text-xs font-semibold tracking-widest text-cyan-400 uppercase relative z-10">Get Started</span>
            <h2 className="text-4xl font-black mb-4 mt-3 relative z-10">
              Your data is waiting.<br /><span className="text-gradient">Start the analysis.</span>
            </h2>
            <p className="text-muted-foreground mb-8 relative z-10">Drop any CSV, XLSX, or JSON and get executive insights in under 60 seconds.</p>
            <Link to="/workspace" className="inline-flex items-center gap-2 px-8 py-4 bg-cyan-400 text-navy-900 rounded-xl font-bold hover:bg-cyan-300 transition-all hover:scale-105 relative z-10" style={{ color: 'hsl(222, 47%, 6%)' }}>
              <Zap className="w-5 h-5" /> Launch Free Workspace <ArrowRight className="w-5 h-5" />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────── */}
      <footer className="border-t border-border/50 py-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <OmniLogo size="sm" />
            <div className="flex gap-8">
              {[['Platform','/platform'],['Workflows','/workflows'],['Universal Data','/universal-data'],['Workspace','/workspace']].map(([label, path]) => (
                <Link key={label} to={path} className="text-sm text-muted-foreground hover:text-foreground transition-colors">{label}</Link>
              ))}
            </div>
            <div className="text-xs text-muted-foreground">© 2026 AI Agent Analytics. All rights reserved.</div>
          </div>
        </div>
      </footer>
    </div>
  );
}