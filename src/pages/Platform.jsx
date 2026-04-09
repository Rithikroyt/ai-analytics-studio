import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useInView } from 'framer-motion';
import {
  Upload, Settings2, BarChart3, Brain, FileText, Layers,
  Terminal, ArrowRight, Zap, CheckCircle2, Activity,
  TrendingUp, Database, Shield, Sparkles, GitBranch,
  ChevronRight, Target, AlertTriangle
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

const PIPELINE = [
  {
    icon: Upload, color: 'text-cyan-400', bg: 'bg-cyan-400/10', border: 'border-cyan-400/25', num: '01',
    title: 'Universal Data Intake',
    desc: 'Upload CSV, XLSX, JSON, or text documents. Multi-sheet Excel detection, robust CSV parsing, JSON flattening, and document extraction.',
    features: ['Auto-detect column types', 'Excel sheet selector', 'Data quality scoring', 'Multi-file bundles'],
  },
  {
    icon: Settings2, color: 'text-teal-400', bg: 'bg-teal-400/10', border: 'border-teal-400/25', num: '02',
    title: 'Auto-Prepare & Profile',
    desc: 'Automated data profiling, schema inference, missing value detection, duplicate analysis, and quality scoring with actionable recommendations.',
    features: ['Missing value analysis', 'Duplicate detection', 'KPI candidate ranking', 'Date field inference'],
  },
  {
    icon: Activity, color: 'text-purple-400', bg: 'bg-purple-400/10', border: 'border-purple-400/25', num: '03',
    title: 'Statistical Analysis Engine',
    desc: 'Full local statistics: descriptive analytics, Pearson correlations, anomaly detection, t-tests, regression, and exponential smoothing forecasts.',
    features: ['Anomaly detection', 'Correlation matrix', 'Forecasting (6 periods)', 'Descriptive stats'],
  },
  {
    icon: Layers, color: 'text-blue-400', bg: 'bg-blue-400/10', border: 'border-blue-400/25', num: '04',
    title: 'Semantic Model Layer',
    desc: 'Auto-generate a business-friendly semantic model with KPI definitions, dimensions, measures, and natural language query examples.',
    features: ['Metric definitions', 'Business labels', 'NL query examples', 'Used across all modules'],
  },
  {
    icon: BarChart3, color: 'text-green-400', bg: 'bg-green-400/10', border: 'border-green-400/25', num: '05',
    title: 'Storytelling Dashboards',
    desc: 'Executive dashboards following the hierarchy: What happened → Why → Where the risk is → What to do next. AI-generated chart panels.',
    features: ['KPI summary strip', 'Trend + forecast chart', 'Anomaly panel', 'AI recommendations'],
  },
  {
    icon: Brain, color: 'text-pink-400', bg: 'bg-pink-400/10', border: 'border-pink-400/25', num: '06',
    title: 'Grounded AI Analyst',
    desc: 'Chat agent powered by Claude, grounded in your actual data. Statistical context, chart analysis, and evidence-based answers — never hallucinated.',
    features: ['4 analysis modes', 'Trendline overlay', 'Follow-up suggestions', 'Confidence scores'],
  },
  {
    icon: FileText, color: 'text-amber-400', bg: 'bg-amber-400/10', border: 'border-amber-400/25', num: '07',
    title: 'Reports & Export',
    desc: 'AI-written Executive Summaries, Board Memos, Anomaly Reports, and Forecast Reports. Export as PDF, CSV, or Excel workbook.',
    features: ['5 report types', 'PDF export', 'CSV export', 'Excel workbook'],
  },
  {
    icon: Terminal, color: 'text-orange-400', bg: 'bg-orange-400/10', border: 'border-orange-400/25', num: '08',
    title: 'SQL Studio',
    desc: 'Natural language → SQL translation with in-memory execution, result tables, auto-visualization, and query history.',
    features: ['NL to SQL', 'In-memory execution', 'Auto chart', 'Download results'],
  },
];

const INTELLIGENCE_LAYERS = [
  {
    title: 'Descriptive Analytics',
    color: 'text-cyan-400', border: 'border-cyan-400/20', bg: 'bg-cyan-400/5',
    items: ['Summary statistics', 'KPI cards', 'Segment comparison', 'Distribution analysis', 'Top/bottom performers'],
  },
  {
    title: 'Diagnostic Analytics',
    color: 'text-purple-400', border: 'border-purple-400/20', bg: 'bg-purple-400/5',
    items: ['Anomaly detection (Z-score + IQR)', 'Pearson correlation matrix', 'Root cause analysis', 'Statistical significance (p-values)', 'Deviation from benchmark'],
  },
  {
    title: 'Predictive Analytics',
    color: 'text-green-400', border: 'border-green-400/20', bg: 'bg-green-400/5',
    items: ['Exponential smoothing forecast', 'Linear regression model', '6-period projections', 'Confidence bands', 'Feature importance'],
  },
  {
    title: 'Prescriptive Analytics',
    color: 'text-amber-400', border: 'border-amber-400/20', bg: 'bg-amber-400/5',
    items: ['Priority recommendations', 'Risk identification', 'Intervention suggestions', 'Opportunity ranking', 'Scenario planning'],
  },
];

export default function Platform() {
  return (
    <div className="min-h-screen bg-background pt-20">
      {/* Hero */}
      <section className="hero-gradient py-20 px-6 text-center">
        <div className="max-w-4xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-cyan-400/25 bg-cyan-400/8 mb-6">
              <Zap className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-xs font-semibold text-cyan-400 tracking-widest uppercase">Integrated Platform Architecture</span>
            </div>
            <h1 className="text-5xl font-black mb-5">
              One platform. Every step from
              <span className="text-gradient block">raw data to executive insight.</span>
            </h1>
            <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
              AI Agent Analytics is a vertically integrated decision intelligence platform — upload, prepare, analyze, visualize, and report without switching tools or writing code.
            </p>
            <Link to="/workspace"
              className="inline-flex items-center gap-2 px-6 py-3.5 bg-cyan-400 rounded-xl font-bold hover:bg-cyan-300 transition-all"
              style={{ color: 'hsl(222,47%,6%)' }}>
              <Zap className="w-4 h-4" /> Launch Workspace
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Pipeline */}
      <section className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <FadeIn className="text-center mb-16">
            <div className="text-xs text-cyan-400 uppercase tracking-widest font-semibold mb-3">8-Stage Pipeline</div>
            <h2 className="text-4xl font-black mb-4">From raw file to board-ready insights</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">Each stage is automated — you guide, the platform executes.</p>
          </FadeIn>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {PIPELINE.map((stage, i) => (
              <FadeIn key={stage.num} delay={i * 0.05}>
                <div className={`glass-card rounded-2xl p-5 border ${stage.border} hover:scale-[1.01] transition-all`}>
                  <div className="flex items-start gap-4">
                    <div className={`w-10 h-10 rounded-xl ${stage.bg} border ${stage.border} flex items-center justify-center flex-shrink-0`}>
                      <stage.icon className={`w-5 h-5 ${stage.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs font-black font-mono ${stage.color}`}>{stage.num}</span>
                        <h3 className="font-bold text-sm">{stage.title}</h3>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed mb-3">{stage.desc}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {stage.features.map(f => (
                          <span key={f} className="text-xs px-2 py-0.5 bg-white/5 border border-white/8 rounded-full text-white/50">
                            <CheckCircle2 className="w-2.5 h-2.5 inline mr-1 text-green-400" />{f}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* Intelligence layers */}
      <section className="section-gradient py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <FadeIn className="text-center mb-16">
            <div className="text-xs text-purple-400 uppercase tracking-widest font-semibold mb-3">Analysis Engine</div>
            <h2 className="text-4xl font-black mb-4">Four layers of analytical intelligence</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">Applied contextually based on your data — not forced on every dataset.</p>
          </FadeIn>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
            {INTELLIGENCE_LAYERS.map((layer, i) => (
              <FadeIn key={layer.title} delay={i * 0.08}>
                <div className={`glass-card rounded-2xl p-5 border ${layer.border} ${layer.bg} h-full`}>
                  <h3 className={`font-bold text-sm mb-4 ${layer.color}`}>{layer.title}</h3>
                  <ul className="space-y-2">
                    {layer.items.map(item => (
                      <li key={item} className="flex items-start gap-2 text-xs text-white/60">
                        <ChevronRight className={`w-3 h-3 flex-shrink-0 mt-0.5 ${layer.color}`} />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* AI Analyst deep dive */}
      <section className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <FadeIn>
              <div className="text-xs text-pink-400 uppercase tracking-widest font-semibold mb-3">AI Analyst Agent</div>
              <h2 className="text-4xl font-black mb-5">Answers grounded in your data.<br />Never hallucinated.</h2>
              <p className="text-muted-foreground mb-6 leading-relaxed">
                The AI Analyst is powered by Claude and pre-loaded with statistical context from your actual data — descriptive stats, correlations, anomalies, and forecasts — before it answers.
              </p>
              <ul className="space-y-3 mb-6">
                {[
                  'Pre-computed statistics as factual ground truth',
                  '4 analysis modes: Exploratory, Predictive, Diagnostic, Prescriptive',
                  'Anomaly trendline overlay on every chart',
                  'Confidence scores and methodology notes',
                  'Follow-up question suggestions',
                  'Export AI session as Excel or PDF',
                ].map(item => (
                  <li key={item} className="flex items-center gap-2.5 text-sm text-muted-foreground">
                    <CheckCircle2 className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <Link to="/workspace" className="inline-flex items-center gap-2 px-5 py-3 bg-pink-400/10 border border-pink-400/20 text-pink-400 rounded-xl font-semibold text-sm hover:bg-pink-400/15 transition-all">
                <Brain className="w-4 h-4" /> Try AI Analyst <ArrowRight className="w-4 h-4" />
              </Link>
            </FadeIn>

            {/* Answer format mockup */}
            <FadeIn delay={0.2}>
              <div className="glass-card rounded-2xl p-6 border border-pink-400/20">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-7 h-7 rounded-lg bg-pink-400/10 flex items-center justify-center">
                    <Brain className="w-3.5 h-3.5 text-pink-400" />
                  </div>
                  <span className="text-sm font-semibold">AI Analyst Response Format</span>
                </div>
                {[
                  { num: '1', label: 'Direct Answer', color: 'bg-cyan-400', desc: 'Factual, specific, data-grounded response' },
                  { num: '2', label: 'Why It Matters', color: 'bg-purple-400', desc: 'Business impact and strategic relevance' },
                  { num: '3', label: 'Supporting Evidence', color: 'bg-teal-400', desc: 'Statistics, charts, and anomaly flags' },
                  { num: '4', label: 'Recommended Actions', color: 'bg-green-400', desc: 'Prioritized, actionable next steps' },
                  { num: '5', label: 'Confidence & Limitations', color: 'bg-amber-400', desc: 'Transparency about uncertainty' },
                ].map(item => (
                  <div key={item.num} className="flex items-start gap-3 mb-3 last:mb-0">
                    <div className={`w-5 h-5 rounded-full ${item.color} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                      <span className="text-xs font-black text-navy-900">{item.num}</span>
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-white/80">{item.label}</div>
                      <div className="text-xs text-muted-foreground">{item.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* Semantic layer */}
      <section className="section-gradient py-24 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <FadeIn>
            <div className="text-xs text-blue-400 uppercase tracking-widest font-semibold mb-3">Semantic Layer</div>
            <h2 className="text-4xl font-black mb-5">One semantic model, used everywhere</h2>
            <p className="text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
              The auto-generated semantic model ensures consistent KPI definitions, business-friendly labels, and accurate metric calculations across every module.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
              {['Dashboard labels', 'SQL generation', 'AI answers', 'Report narratives'].map((item, i) => (
                <div key={item} className="glass-card rounded-xl p-4 border border-blue-400/15 bg-blue-400/5">
                  <GitBranch className="w-5 h-5 text-blue-400 mx-auto mb-2" />
                  <div className="text-xs font-semibold text-blue-400">{item}</div>
                </div>
              ))}
            </div>
            <Link to="/workspace" className="inline-flex items-center gap-2 px-6 py-3.5 bg-cyan-400 rounded-xl font-bold hover:bg-cyan-300 transition-all"
              style={{ color: 'hsl(222,47%,6%)' }}>
              <Zap className="w-4 h-4" /> Try the Full Platform
            </Link>
          </FadeIn>
        </div>
      </section>
    </div>
  );
}