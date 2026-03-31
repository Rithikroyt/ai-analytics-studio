import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  ArrowRight, Play, Upload, Brain, BarChart3, FileText,
  Zap, Shield, Database, GitBranch, Sparkles, TrendingUp,
  ChevronRight, Star, CheckCircle2, Globe, Layers, Search
} from 'lucide-react';
import OmniLogo from '../components/ui/OmniLogo';

const fadeUp = { hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0 } };
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.1 } } };

const features = [
  { icon: Upload, color: 'text-cyan-400', bg: 'bg-cyan-400/10', border: 'border-cyan-400/20', title: 'Universal Data Intake', desc: 'Upload CSV, XLSX, JSON — detect sheets, clean headers, infer types automatically.' },
  { icon: GitBranch, color: 'text-teal-400', bg: 'bg-teal-400/10', border: 'border-teal-400/20', title: 'Auto Relationship Inference', desc: 'OmniData infers joins between tables using shared IDs and field names.' },
  { icon: Layers, color: 'text-blue-400', bg: 'bg-blue-400/10', border: 'border-blue-400/20', title: 'Semantic Layer', desc: 'Dimensions, measures, KPI definitions — your data speaks a consistent language.' },
  { icon: BarChart3, color: 'text-purple-400', bg: 'bg-purple-400/10', border: 'border-purple-400/20', title: 'Storytelling Dashboards', desc: 'Tableau-grade visuals that follow a narrative: what happened, why, where risk is, what to do.' },
  { icon: Brain, color: 'text-pink-400', bg: 'bg-pink-400/10', border: 'border-pink-400/20', title: 'AI Analyst Agent', desc: 'Ask anything in plain English. Grounded answers from data, semantic layer, and docs.' },
  { icon: FileText, color: 'text-amber-400', bg: 'bg-amber-400/10', border: 'border-amber-400/20', title: 'Executive Reports', desc: 'One-click board memos, anomaly reports, and PDF-ready exports.' },
];

const workflow = [
  { step: '01', title: 'Upload Your Data', desc: 'Drop any structured file — CSV, XLSX, JSON. OmniData handles the rest.' },
  { step: '02', title: 'Auto-Profile & Prepare', desc: 'Detect types, clean headers, score quality, and flag issues — instantly.' },
  { step: '03', title: 'Generate Dashboards', desc: 'AI creates an executive storytelling dashboard with insights and annotations.' },
  { step: '04', title: 'Ask the AI Analyst', desc: 'Query your data in plain English. Get grounded, structured answers with evidence.' },
  { step: '05', title: 'Export & Share', desc: 'Board memos, PDFs, CSVs — ready in seconds. No formatting required.' },
];

const trust = [
  'Fortune 500 Trusted', 'SOC 2 Ready', 'GDPR Compliant', 
  'AI-Powered Analysis', 'Enterprise Security', '99.9% Uptime'
];

const testimonials = [
  { name: 'Sarah Chen', role: 'VP Analytics, TechCorp', quote: 'OmniData cut our time to insight from 3 days to 15 minutes. The AI analyst is genuinely impressive.' },
  { name: 'Marcus Webb', role: 'CFO, FinanceGroup', quote: 'Board-ready dashboards in one click. The storytelling structure is exactly what executives need.' },
  { name: 'Dr. Priya Sharma', role: 'Data Science Lead, HealthNet', quote: 'The semantic layer ensures everyone uses the same definitions. No more metric debates in meetings.' },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <section className="hero-gradient min-h-screen flex items-center pt-16">
        <div className="max-w-7xl mx-auto px-6 py-24 text-center">
          <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-8">
            <motion.div variants={fadeUp}>
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold tracking-widest border border-cyan-400/30 text-cyan-400 bg-cyan-400/5">
                <Sparkles className="w-3 h-3" />
                UNIVERSAL AI ANALYTICS PLATFORM
              </span>
            </motion.div>

            <motion.h1 variants={fadeUp} className="text-5xl md:text-7xl font-black tracking-tight leading-none">
              <span className="text-foreground">AI insights you can</span>
              <br />
              <span className="text-gradient">trust across any raw data</span>
            </motion.h1>

            <motion.p variants={fadeUp} className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Upload any structured raw data, infer relationships, generate dashboards, ask an AI analyst, and export executive-ready reports.
            </motion.p>

            <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/workspace"
                className="inline-flex items-center gap-2 px-6 py-3.5 bg-cyan-400 text-navy-900 rounded-xl text-sm font-bold hover:bg-cyan-300 transition-all hover:scale-105 glow-cyan-sm"
                style={{ color: 'hsl(222, 47%, 6%)' }}
              >
                <Zap className="w-4 h-4" />
                Launch Workspace
                <ArrowRight className="w-4 h-4" />
              </Link>
              <button className="inline-flex items-center gap-2 px-6 py-3.5 glass border border-white/10 rounded-xl text-sm font-medium text-foreground hover:border-cyan-400/30 transition-all">
                <Play className="w-4 h-4 text-cyan-400" />
                Watch Product Tour
              </button>
            </motion.div>

            {/* Mock dashboard preview */}
            <motion.div variants={fadeUp} className="mt-16 relative max-w-5xl mx-auto">
              <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent z-10 pointer-events-none" style={{bottom:0,height:'40%',top:'auto'}} />
              <div className="glass-card rounded-2xl border-gradient overflow-hidden glow-cyan p-1">
                <div className="bg-navy-800 rounded-xl p-6">
                  {/* Fake dashboard header */}
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <div className="h-4 w-48 bg-navy-600 rounded shimmer" />
                      <div className="h-3 w-32 bg-navy-600/50 rounded mt-2 shimmer" />
                    </div>
                    <div className="flex gap-2">
                      {[...Array(3)].map((_,i) => <div key={i} className="h-8 w-20 bg-navy-700 rounded-lg shimmer" />)}
                    </div>
                  </div>
                  {/* KPI Strip */}
                  <div className="grid grid-cols-4 gap-4 mb-6">
                    {[
                      { label: 'Total Revenue', value: '$12.4M', change: '+18.3%', color: 'text-cyan-400' },
                      { label: 'Gross Margin', value: '68.2%', change: '+2.1pp', color: 'text-teal-400' },
                      { label: 'Active Regions', value: '4', change: 'Stable', color: 'text-blue-400' },
                      { label: 'YoY Growth', value: '18.3%', change: 'Q4 Peak', color: 'text-purple-400' },
                    ].map((kpi) => (
                      <div key={kpi.label} className="glass p-4 rounded-xl border border-white/5">
                        <div className="text-xs text-muted-foreground mb-1">{kpi.label}</div>
                        <div className={`text-xl font-bold ${kpi.color}`}>{kpi.value}</div>
                        <div className="text-xs text-green-400 mt-1">{kpi.change}</div>
                      </div>
                    ))}
                  </div>
                  {/* Chart placeholders */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-2 glass rounded-xl p-4 border border-white/5 h-36">
                      <div className="h-3 w-24 bg-navy-600 rounded shimmer mb-3" />
                      <div className="flex items-end gap-1 h-20">
                        {[40,55,45,70,60,80,72,88,75,92,85,96].map((h, i) => (
                          <div key={i} className="flex-1 bg-gradient-to-t from-cyan-400/60 to-cyan-400/20 rounded-sm" style={{height:`${h}%`}} />
                        ))}
                      </div>
                    </div>
                    <div className="glass rounded-xl p-4 border border-white/5 h-36">
                      <div className="h-3 w-20 bg-navy-600 rounded shimmer mb-3" />
                      <div className="space-y-2">
                        {[['North America','42%','bg-cyan-400'],['Europe','28%','bg-teal-400'],['APAC','18%','bg-blue-400'],['LatAm','12%','bg-purple-400']].map(([r,p,c]) => (
                          <div key={r} className="flex items-center gap-2">
                            <div className={`h-1.5 rounded-full ${c}`} style={{width:`${parseInt(p)*2}px`}} />
                            <span className="text-xs text-muted-foreground">{r}</span>
                            <span className="text-xs text-foreground ml-auto">{p}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Trust bar */}
      <section className="border-y border-border/50 py-5 bg-navy-800/50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-wrap items-center justify-center gap-8">
            {trust.map(item => (
              <div key={item} className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-28 section-gradient">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <span className="text-xs font-semibold tracking-widest text-cyan-400 uppercase">Core Capabilities</span>
            <h2 className="text-4xl font-black mt-3 mb-4">Everything your data team needs</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">From raw upload to board-ready insights — in a single, unified workspace.</p>
          </motion.div>

          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {features.map((f) => (
              <motion.div
                key={f.title}
                variants={fadeUp}
                className={`glass-card rounded-2xl p-6 border ${f.border} hover:border-opacity-60 transition-all group cursor-default`}
              >
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

      {/* Workflow */}
      <section className="py-28">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <span className="text-xs font-semibold tracking-widest text-cyan-400 uppercase">How It Works</span>
            <h2 className="text-4xl font-black mt-3 mb-4">From upload to insight in minutes</h2>
          </motion.div>

          <div className="space-y-6">
            {workflow.map((step, i) => (
              <motion.div
                key={step.step}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="flex items-start gap-6 glass-card rounded-2xl p-6 border-gradient"
              >
                <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-cyan-400/10 border border-cyan-400/20 flex items-center justify-center">
                  <span className="text-cyan-400 font-mono font-bold text-sm">{step.step}</span>
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">{step.title}</h3>
                  <p className="text-sm text-muted-foreground">{step.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-28 section-gradient">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <span className="text-xs font-semibold tracking-widest text-cyan-400 uppercase">Customer Stories</span>
            <h2 className="text-4xl font-black mt-3">Trusted by data leaders</h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <motion.div
                key={t.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="glass-card rounded-2xl p-6 border border-white/5"
              >
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, j) => <Star key={j} className="w-4 h-4 text-amber-400 fill-amber-400" />)}
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed mb-6 italic">"{t.quote}"</p>
                <div>
                  <div className="text-sm font-semibold">{t.name}</div>
                  <div className="text-xs text-muted-foreground">{t.role}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-28">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="glass-card rounded-3xl border-gradient p-16 glow-cyan relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-b from-cyan-400/5 to-transparent pointer-events-none" />
            <h2 className="text-4xl font-black mb-4 relative z-10">
              Your data is waiting.<br />
              <span className="text-gradient">Start the analysis.</span>
            </h2>
            <p className="text-muted-foreground mb-8 relative z-10">Drop any CSV, XLSX, or JSON and get executive insights in under 60 seconds.</p>
            <Link
              to="/workspace"
              className="inline-flex items-center gap-2 px-8 py-4 bg-cyan-400 text-navy-900 rounded-xl font-bold hover:bg-cyan-300 transition-all hover:scale-105 relative z-10"
              style={{ color: 'hsl(222, 47%, 6%)' }}
            >
              <Zap className="w-5 h-5" />
              Launch Free Workspace
              <ArrowRight className="w-5 h-5" />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <OmniLogo size="sm" />
            <div className="flex gap-8">
              {['Platform', 'Workflows', 'Universal Data', 'Workspace'].map(link => (
                <Link key={link} to={`/${link.toLowerCase().replace(' ', '-')}`} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  {link}
                </Link>
              ))}
            </div>
            <div className="text-xs text-muted-foreground">© 2026 OmniData AI. All rights reserved.</div>
          </div>
        </div>
      </footer>
    </div>
  );
}