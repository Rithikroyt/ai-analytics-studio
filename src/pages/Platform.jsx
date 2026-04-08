import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Brain, BarChart3, Database, Layers, Zap, GitBranch, FileText,
  ArrowRight, CheckCircle2, TrendingUp, Shield, Activity,
  Bot, Search, Target, FlaskConical, Lightbulb, Cpu
} from 'lucide-react';

const fadeUp = { hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0, transition: { duration: 0.5 } } };
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } };

const caps = [
  { icon: Database, color: 'text-cyan-400', bg: 'bg-cyan-400/10', border: 'border-cyan-400/20', title: 'Data Intake Engine', items: ['CSV, XLSX, JSON, TXT upload', 'Multi-sheet Excel detection', 'Header inference & cleaning', 'Column type classification', 'Multi-table workspace'] },
  { icon: Brain, color: 'text-purple-400', bg: 'bg-purple-400/10', border: 'border-purple-400/20', title: 'AI Analyst Agent', items: ['Natural language data queries', 'Schema & semantic layer grounding', 'SQL generation & execution', 'Evidence from uploaded docs', 'Structured answer framework'] },
  { icon: BarChart3, color: 'text-teal-400', bg: 'bg-teal-400/10', border: 'border-teal-400/20', title: 'Storytelling Dashboards', items: ['Narrative-driven chart layouts', 'KPI strip + executive headline', 'Anomaly detection panel', 'Forecast with confidence bands', 'Recommended actions panel'] },
  { icon: Layers, color: 'text-blue-400', bg: 'bg-blue-400/10', border: 'border-blue-400/20', title: 'Semantic Layer', items: ['Dimensions & measures catalog', 'KPI definitions & descriptions', 'Relationship inference', 'Consistent metric naming', 'Date grain management'] },
  { icon: GitBranch, color: 'text-amber-400', bg: 'bg-amber-400/10', border: 'border-amber-400/20', title: 'SQL Studio', items: ['Natural language to SQL', 'Query preview & results', 'Plain-English explanation', 'Safe fallback mode', 'Export query results'] },
  { icon: FileText, color: 'text-pink-400', bg: 'bg-pink-400/10', border: 'border-pink-400/20', title: 'Reports & Export', items: ['Executive summary memos', 'Board-ready PDF exports', 'Anomaly & forecast reports', 'Data quality audits', 'CSV exports of results'] },
];

const analysisLayers = [
  { icon: Activity, color: 'text-cyan-400', title: 'Descriptive Analytics', desc: 'Summary stats, KPI cards, trends, segment comparison, distribution, deviation from benchmarks, top/bottom performers.' },
  { icon: Shield, color: 'text-amber-400', title: 'Data Quality Analytics', desc: 'Missing value summary, duplicate detection, outlier suspicion, inconsistent categories, quality score and recommendations.' },
  { icon: FlaskConical, color: 'text-green-400', title: 'Statistical Analytics', desc: 'Correlations, t-tests, chi-square, ANOVA, confidence intervals, regression summaries — all in plain English.' },
  { icon: TrendingUp, color: 'text-purple-400', title: 'Predictive Analytics', desc: 'Time-series forecasting, anomaly detection, clustering, risk scoring — only applied where data supports it.' },
  { icon: Lightbulb, color: 'text-orange-400', title: 'Prescriptive Analytics', desc: 'Key risks, likely causes, recommended interventions, priority rankings, what-if scenarios.' },
  { icon: Bot, color: 'text-pink-400', title: 'Text & Feedback Analytics', desc: 'Sentiment analysis, theme extraction, cluster concerns, evidence snippets, action themes from documents.' },
];

const pipeline = [
  { step: 1, label: 'Raw Upload', icon: Database, color: '#00e5ff' },
  { step: 2, label: 'Auto-Profile', icon: Activity, color: '#00bfa5' },
  { step: 3, label: 'Semantic Model', icon: Layers, color: '#2196f3' },
  { step: 4, label: 'Analysis Engine', icon: Cpu, color: '#9c27b0' },
  { step: 5, label: 'AI Analyst', icon: Brain, color: '#e91e63' },
  { step: 6, label: 'Reports & Export', icon: FileText, color: '#ff6b35' },
];

export default function Platform() {
  return (
    <div className="min-h-screen bg-background pt-20">
      {/* Hero */}
      <section className="py-24 hero-gradient">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0, transition: { duration: 0.6 } }}>
            <span className="text-xs font-semibold tracking-widest text-cyan-400 uppercase">The Platform</span>
            <h1 className="text-5xl md:text-6xl font-black mt-4 mb-6">
              One platform.<br /><span className="text-gradient">Infinite data stories.</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              The only platform that takes raw structured data all the way to executive-ready AI insights — with no setup, no code, and no data engineering team required.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Pipeline visual */}
      <section className="py-16 border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-center flex-wrap gap-0">
            {pipeline.map((p, i) => (
              <div key={p.step} className="flex items-center">
                <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }}
                  className="flex flex-col items-center gap-2">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center border" style={{ background: `${p.color}15`, borderColor: `${p.color}30` }}>
                    <p.icon className="w-5 h-5" style={{ color: p.color }} />
                  </div>
                  <div className="text-xs text-white/50 font-medium text-center max-w-16 leading-tight">{p.label}</div>
                </motion.div>
                {i < pipeline.length - 1 && (
                  <div className="w-8 md:w-12 h-px bg-gradient-to-r from-white/20 to-white/5 mx-2 flex-shrink-0" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Capabilities grid */}
      <section className="py-24 max-w-7xl mx-auto px-6">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-14">
          <span className="text-xs font-semibold tracking-widest text-cyan-400 uppercase">Platform Capabilities</span>
          <h2 className="text-4xl font-black mt-3 mb-4">Six integrated modules</h2>
          <p className="text-muted-foreground max-w-xl mx-auto">Each module is designed to work seamlessly with the others — creating a unified analytics experience.</p>
        </motion.div>

        <motion.div variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true }} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {caps.map((cap) => (
            <motion.div key={cap.title} variants={fadeUp} className={`glass-card rounded-2xl p-6 border ${cap.border} hover:border-opacity-70 transition-all`}>
              <div className={`w-10 h-10 rounded-xl ${cap.bg} flex items-center justify-center mb-4`}>
                <cap.icon className={`w-5 h-5 ${cap.color}`} />
              </div>
              <h3 className="font-bold text-lg mb-4">{cap.title}</h3>
              <ul className="space-y-2">
                {cap.items.map(item => (
                  <li key={item} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" /> {item}
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* Analysis Engine section */}
      <section className="py-24 section-gradient">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-14">
            <span className="text-xs font-semibold tracking-widest text-purple-400 uppercase">Analysis Engine</span>
            <h2 className="text-4xl font-black mt-3 mb-4">Six layers of analytics intelligence</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">Not every model applies to every dataset. The engine selects the right analytical approach based on your data's structure.</p>
          </motion.div>

          <motion.div variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true }} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {analysisLayers.map((layer) => (
              <motion.div key={layer.title} variants={fadeUp} className="glass-card rounded-2xl p-5 border border-white/5 hover:border-white/10 transition-all">
                <div className="flex items-center gap-3 mb-3">
                  <layer.icon className={`w-4 h-4 ${layer.color}`} />
                  <h3 className={`font-semibold text-sm ${layer.color}`}>{layer.title}</h3>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{layer.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* AI Agent answer format */}
      <section className="py-24 max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <motion.div initial={{ opacity: 0, x: -32 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
            <span className="text-xs font-semibold tracking-widest text-purple-400 uppercase">AI Agent Answer Format</span>
            <h2 className="text-4xl font-black mt-4 mb-6">Every answer is structured.<br /><span className="text-gradient">Every answer is grounded.</span></h2>
            <p className="text-muted-foreground leading-relaxed mb-6">The AI Analyst never returns blank answers or generic fallbacks. Every response follows a proven decision-intelligence framework.</p>
            <div className="space-y-3">
              {[
                ['1', 'Direct Answer', 'text-cyan-400', 'The most important finding, stated clearly.'],
                ['2', 'Why It Matters', 'text-teal-400', 'Business context and impact of the finding.'],
                ['3', 'Supporting Evidence', 'text-blue-400', 'Data points, statistical tests, and document snippets.'],
                ['4', 'Recommended Actions', 'text-purple-400', 'Priority interventions and next steps.'],
                ['5', 'Confidence & Limitations', 'text-amber-400', 'What is known, what is uncertain, what to explore next.'],
              ].map(([num, label, color, desc]) => (
                <div key={num} className="flex items-start gap-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5 ${color} bg-white/5`}>{num}</div>
                  <div>
                    <div className={`text-sm font-semibold ${color}`}>{label}</div>
                    <div className="text-xs text-muted-foreground">{desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 32 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
            className="glass-card rounded-2xl border border-purple-400/20 p-6 space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-lg bg-purple-400/15 flex items-center justify-center">
                <Bot className="w-3.5 h-3.5 text-purple-400" />
              </div>
              <span className="text-sm font-semibold text-purple-400">AI Analyst Response</span>
            </div>
            {[
              { label: 'Direct Answer', color: 'border-cyan-400/30 bg-cyan-400/5', text: 'Revenue grew 18.3% YoY, exceeding the 15% forecast target.' },
              { label: 'Why It Matters', color: 'border-teal-400/30 bg-teal-400/5', text: 'This growth positions the company for Series B fundraising at a premium valuation.' },
              { label: 'Supporting Evidence', color: 'border-blue-400/30 bg-blue-400/5', text: 'NA enterprise segment: +$2.1M. APAC new logos: +$0.8M. Q4 SaaS expansion: +$1.4M.' },
              { label: 'Recommended Actions', color: 'border-purple-400/30 bg-purple-400/5', text: 'Double-down on NA enterprise. Accelerate APAC hiring. Address LatAm underperformance.' },
              { label: 'Confidence: High', color: 'border-green-400/30 bg-green-400/5', text: 'Based on 2,304 transaction records, 4 regional datasets, Q3/Q4 board reports.' },
            ].map((item) => (
              <div key={item.label} className={`rounded-xl p-3 border ${item.color}`}>
                <div className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-1">{item.label}</div>
                <div className="text-xs text-white/70 leading-relaxed">{item.text}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 max-w-7xl mx-auto px-6">
        <div className="text-center">
          <Link to="/workspace" className="inline-flex items-center gap-2 px-8 py-4 bg-cyan-400 rounded-xl font-bold hover:bg-cyan-300 transition-all hover:scale-105" style={{ color: 'hsl(222,47%,6%)' }}>
            <Zap className="w-5 h-5" /> Launch Workspace <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>
    </div>
  );
}