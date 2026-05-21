/**
 * Product Sale Pitch — Admin Only
 * $20K–$25K OmniData AI Analytics Studio Sale Package
 */
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import {
  Package, Lock, DollarSign, Target, Zap, Brain, Database,
  BarChart2, Shield, Users, FileText, TrendingUp, CheckCircle2,
  Star, ArrowRight, Download, Globe, Code2, Activity, Eye,
  ChevronRight, Layers, GitMerge, AlertTriangle, BookOpen
} from 'lucide-react';

const ADMIN_EMAILS = ['rthati1@asu.edu', 'thatirithikroy@gmail.com'];

const CORE_FEATURES = [
  { icon: Database, color: 'text-cyan-400', bg: 'bg-cyan-400/10', title: 'Data Engineering Studio', desc: 'CSV/XLSX/JSON upload, schema inference, column profiling, 5-dimension quality scoring, data versioning, automated cleaning pipeline.' },
  { icon: Shield, color: 'text-amber-400', bg: 'bg-amber-400/10', title: 'Semantic Metric Store', desc: 'Define, certify, and govern business metrics. Formula validation, non-additive metric protection, domain classification, certification workflow.' },
  { icon: Code2, color: 'text-green-400', bg: 'bg-green-400/10', title: 'SQL / Python Workbench', desc: 'NL-to-SQL generation, 15 query templates, SQL safety validation (blocks DROP/INSERT/UPDATE), result charts, Python export.' },
  { icon: BarChart2, color: 'text-pink-400', bg: 'bg-pink-400/10', title: 'Visual Builder', desc: '8 chart types, Tableau-style field shelves, AI chart explanation, custom tooltip builder, theme selector, save ChartSpecs.' },
  { icon: Brain, color: 'text-purple-400', bg: 'bg-purple-400/10', title: 'AI Agent Studio', desc: '5 Principal Analysts (CFO, Growth, Ops, DQ, Strategy). F-D-E-A-R reasoning, data sufficiency scoring, structured output, full AgentTrace logging.' },
  { icon: TrendingUp, color: 'text-teal-400', bg: 'bg-teal-400/10', title: 'Advanced Analytics Lab', desc: 'RFM, Funnel, Cohort, Churn, Market Basket, Forecasting, Anomaly Detection, Customer Clustering, ML Studio, What-If Simulator.' },
  { icon: FileText, color: 'text-orange-400', bg: 'bg-orange-400/10', title: 'Decision Intelligence Reports', desc: '14 report types, 17-section structure (Business Question → Evidence → Risks → Recommendations), Markdown export, SharedReport storage.' },
  { icon: GitMerge, color: 'text-blue-400', bg: 'bg-blue-400/10', title: 'Pipeline Studio', desc: '10-step DAG pipeline (Raw → Documentation), DBT-style layer visualization, run history, PipelineRun entity tracking.' },
  { icon: Activity, color: 'text-cyan-400', bg: 'bg-cyan-400/10', title: 'Admin Observability Center', desc: '8 monitoring dashboards: Usage, Agent Quality, SQL, Data Quality, Reports, Pipelines, Live Traces, Benchmarks.' },
  { icon: Eye, color: 'text-green-400', bg: 'bg-green-400/10', title: 'Benchmark Center', desc: 'SQL accuracy testing, regression tracking, weighted scoring (SQLCorrectness + AnswerMatch), pass/fail history by domain.' },
  { icon: BookOpen, color: 'text-purple-400', bg: 'bg-purple-400/10', title: 'Project Documentation', desc: '26-section PDF generator, Mermaid architecture diagrams, code snippets, version history, stakeholder-ready export.' },
  { icon: Package, color: 'text-amber-400', bg: 'bg-amber-400/10', title: 'Handover Package', desc: 'Sale Readiness Audit (7 dimensions), Feature Matrix (50+ features), Handover Checklist (38 items), Known Limitations, Roadmap.' },
];

const VALUE_BREAKDOWN = [
  { item: 'Full-stack data pipeline (Bronze→Gold)', comparable: 'dbt Cloud → $500/mo', value: 4000 },
  { item: 'AI Agent System (5 personas + F-D-E-A-R)', comparable: 'Custom LLM agent → $8K dev', value: 5000 },
  { item: 'Semantic Metrics + Certification Layer', comparable: 'Looker Semantic → $2K/mo', value: 3000 },
  { item: 'SQL/Python Workbench + NL-to-SQL', comparable: 'Mode Analytics → $400/mo', value: 2000 },
  { item: 'Visual Builder (8 chart types)', comparable: 'Tableau → $840/yr/user', value: 2000 },
  { item: 'Advanced Analytics Lab (10 modules)', comparable: 'Custom dev → $6K', value: 3000 },
  { item: 'Decision Reports (14 types + PDF export)', comparable: 'Crystal Reports → $200/mo', value: 2000 },
  { item: 'Admin Observability (8 dashboards)', comparable: 'Datadog custom → $500/mo', value: 1500 },
  { item: 'Demo Datasets + Guided Tour', comparable: 'Product marketing asset', value: 500 },
  { item: 'Project Documentation + Handover Guide', comparable: 'Consulting doc → $3K', value: 2000 },
];

const USE_CASES = [
  { emoji: '🚀', title: 'Startup Analytics', desc: 'Replace 4–5 BI tools with one integrated platform. Get from raw CSV to investor-ready reports in hours.' },
  { emoji: '🎓', title: 'Capstone / Academic', desc: 'Full data science project framework. Upload real data, run ML, generate documentation, present to committee.' },
  { emoji: '💼', title: 'Analytics Consulting', desc: 'Demo platform to clients. Use demo datasets, pre-built dashboards, and AI reports to close engagements.' },
  { emoji: '🏢', title: 'Small Business BI', desc: 'Replace Power BI + Excel + Chatbot with one tool. Weekly reports in one click.' },
  { emoji: '📊', title: 'Internal Data Analysis', desc: 'Data team self-service platform. Reduce analyst bottleneck with NL-to-SQL and AI explanations.' },
  { emoji: '🎯', title: 'AI Demo Product', desc: 'White-label or brand as your own analytics SaaS. Ready-to-demo with 4 built-in datasets.' },
];

const ROADMAP = [
  { phase: 'V2', items: ['Real-time streaming connectors (Kafka, Websockets)', 'Multi-tenant workspace isolation', 'Role-based column-level security', 'Slack / Teams alerting integration'] },
  { phase: 'V3', items: ['Custom GPT fine-tuning per dataset', 'Automated weekly digest emails', 'API endpoints for external embedding', 'White-label branding support'] },
  { phase: 'V4', items: ['Marketplace of analytics templates', 'Collaborative annotation layer', 'Mobile app (iOS / Android)', 'Enterprise SSO (Okta, Azure AD)'] },
];

const LIMITATIONS = [
  { title: 'In-Browser Analytics Scale', severity: 'medium', workaround: 'Use Python export for > 5,000 rows.' },
  { title: 'Forecasting: MA + Linear only', severity: 'medium', workaround: 'Export Python code to run Prophet locally.' },
  { title: 'ML Studio: Simplified approximations', severity: 'high', workaround: 'Educational output only. Export for scikit-learn production use.' },
  { title: 'API Connector: CORS-limited', severity: 'medium', workaround: 'Use generated Python script for non-CORS APIs.' },
  { title: 'AI response variability between runs', severity: 'low', workaround: 'Use Benchmark Center to track regression.' },
];

export default function ProductSalePitch() {
  const { user } = useAuth();
  const [tab, setTab] = useState('summary');

  const isAdmin = user && (
    (user.role || '').toLowerCase() === 'admin' ||
    ADMIN_EMAILS.includes((user.email || '').toLowerCase())
  );

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-red-400/10 border border-red-400/20 flex items-center justify-center mx-auto">
            <Lock className="w-8 h-8 text-red-400" />
          </div>
          <h2 className="text-xl font-bold">Admin Access Required</h2>
          <p className="text-sm text-muted-foreground">This page is for internal sale preparation only.</p>
          <Link to="/" className="text-cyan-400 text-sm hover:underline">← Go Home</Link>
        </div>
      </div>
    );
  }

  const totalValue = VALUE_BREAKDOWN.reduce((a, v) => a + v.value, 0);

  const TABS = [
    { id: 'summary', label: 'Product Summary' },
    { id: 'features', label: 'Core Features' },
    { id: 'value', label: 'Value Justification' },
    { id: 'usecases', label: 'Use Cases' },
    { id: 'architecture', label: 'Architecture' },
    { id: 'limitations', label: 'Limitations' },
    { id: 'roadmap', label: 'Roadmap' },
    { id: 'pitch', label: 'Sale Pitch Deck' },
  ];

  const exportPitch = () => {
    const lines = [
      '# OmniData AI Analytics Studio — Product Sale Pitch',
      '## Positioning Statement',
      '"OmniData AI Analytics Studio is a full-stack AI analytics platform that converts messy CSV/Excel/API data into cleaned datasets, governed metrics, SQL/Python analysis, explainable dashboards, AI analyst recommendations, forecasts, and executive-ready reports."',
      '',
      '## Target Price: $20,000 – $25,000 one-time transfer',
      '',
      '## Target Users',
      '- Analytics consultants building client-facing demo tools',
      '- Startups replacing 4–5 BI tools with one platform',
      '- Academic capstone projects needing full data science framework',
      '- Small businesses needing self-service BI',
      '- AI product teams needing a white-label analytics SaaS base',
      '',
      '## Core Features (12 modules)',
      ...CORE_FEATURES.map(f => `- **${f.title}**: ${f.desc}`),
      '',
      '## Value Breakdown',
      ...VALUE_BREAKDOWN.map(v => `- ${v.item} (comparable: ${v.comparable}) — value: $${v.value.toLocaleString()}`),
      `- **TOTAL JUSTIFIABLE VALUE: $${totalValue.toLocaleString()}**`,
      `- **ASKING PRICE: $20,000–$25,000** (80% discount to comparable stack)`,
      '',
      '## Known Limitations',
      ...LIMITATIONS.map(l => `- [${l.severity}] ${l.title} — Workaround: ${l.workaround}`),
      '',
      '## Roadmap',
      ...ROADMAP.map(r => `### ${r.phase}\n${r.items.map(i => `- ${i}`).join('\n')}`),
    ];
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/markdown' }));
    a.download = `omnidata_sale_pitch_${Date.now()}.md`;
    a.click();
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="border-b border-white/8 px-8 py-5 flex-shrink-0">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-400/15 border border-amber-400/25 flex items-center justify-center">
              <Package className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h1 className="text-xl font-black">Product Sale Pitch</h1>
              <p className="text-xs text-muted-foreground">Admin only · $20K–$25K acquisition package · OmniData AI Analytics Studio</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="px-4 py-2 rounded-xl bg-green-400/10 border border-green-400/20 text-center">
              <div className="text-xl font-black text-green-400">$22.5K</div>
              <div className="text-xs text-white/30">Target Price</div>
            </div>
            <button onClick={exportPitch}
              className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 text-white/50 rounded-xl text-xs font-semibold hover:text-white/80 hover:bg-white/8 transition-all">
              <Download className="w-3.5 h-3.5" /> Export MD
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-0 border-b border-white/8 px-8 overflow-x-auto flex-shrink-0">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-3 text-xs font-semibold whitespace-nowrap border-b-2 transition-all ${tab === t.id ? 'border-amber-400 text-amber-400' : 'border-transparent text-white/35 hover:text-white/60'}`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-8">
        <motion.div key={tab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>

          {/* Product Summary */}
          {tab === 'summary' && (
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="p-6 rounded-2xl border border-amber-400/20 bg-amber-400/5">
                <div className="text-xs text-amber-400/60 uppercase tracking-widest font-semibold mb-3">Positioning Statement</div>
                <p className="text-lg font-semibold text-white/85 leading-relaxed">
                  "OmniData AI Analytics Studio is a full-stack AI analytics platform that converts messy CSV/Excel/API data into cleaned datasets, governed metrics, SQL/Python analysis, explainable dashboards, AI analyst recommendations, forecasts, and executive-ready reports."
                </p>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'Modules', value: '12', color: 'text-cyan-400', sub: 'integrated modules' },
                  { label: 'Features', value: '50+', color: 'text-purple-400', sub: 'production features' },
                  { label: 'Report Types', value: '14', color: 'text-amber-400', sub: 'AI report templates' },
                  { label: 'Value Stack', value: `$${(totalValue/1000).toFixed(0)}K`, color: 'text-green-400', sub: 'comparable tooling' },
                ].map(m => (
                  <div key={m.label} className="p-4 rounded-2xl border border-white/8 bg-white/2 text-center">
                    <div className={`text-3xl font-black ${m.color}`}>{m.value}</div>
                    <div className="text-xs text-white/40 mt-1">{m.sub}</div>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-5 rounded-2xl border border-white/8 bg-white/2">
                  <div className="text-xs text-white/30 uppercase tracking-widest font-semibold mb-3">Target Buyers</div>
                  {['Analytics consultants', 'Early-stage startups (Seed–Series A)', 'Academic / capstone projects', 'Small business operators', 'AI product teams', 'Internal data teams'].map(u => (
                    <div key={u} className="flex items-center gap-2 py-1.5 text-sm text-white/60 border-b border-white/5 last:border-0">
                      <ChevronRight className="w-3 h-3 text-amber-400 flex-shrink-0" /> {u}
                    </div>
                  ))}
                </div>
                <div className="p-5 rounded-2xl border border-white/8 bg-white/2">
                  <div className="text-xs text-white/30 uppercase tracking-widest font-semibold mb-3">Business Problem Solved</div>
                  {['Raw data has no insights without expert tooling', 'BI tools cost $500–$2K/mo per user', 'AI analytics needs months of custom dev', 'Reports take days — should take minutes', 'No governed metric definitions → inconsistent answers', 'No full-stack platform for < $10K builds'].map(p => (
                    <div key={p} className="flex items-center gap-2 py-1.5 text-sm text-white/60 border-b border-white/5 last:border-0">
                      <AlertTriangle className="w-3 h-3 text-red-400 flex-shrink-0" /> {p}
                    </div>
                  ))}
                </div>
              </div>
              <div className="p-5 rounded-2xl border border-cyan-400/15 bg-cyan-400/5">
                <div className="text-xs text-cyan-400/60 uppercase tracking-widest font-semibold mb-3">Competitive Advantage</div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs text-white/55">
                  {[
                    'Only platform combining data cleaning + metrics + SQL + AI agents + reports in one',
                    'F-D-E-A-R reasoning produces evidence-backed answers, not hallucinations',
                    'Semantic Metric Store prevents metric inconsistency across teams',
                    'Admin Observability traces every AI question with confidence + SQL logs',
                    'Benchmark Center enables regression testing of AI output quality',
                    'Built-in demo datasets + guided tour = zero-friction sales demo',
                  ].map((c, i) => (
                    <div key={i} className="flex items-start gap-2 p-3 rounded-xl bg-white/3 border border-white/8">
                      <CheckCircle2 className="w-3 h-3 text-cyan-400 flex-shrink-0 mt-0.5" />
                      {c}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Core Features */}
          {tab === 'features' && (
            <div className="max-w-5xl mx-auto">
              <div className="text-xs text-white/25 mb-4">{CORE_FEATURES.length} modules · {CORE_FEATURES.reduce((a) => a + 1, 0) * 4}+ features · all production-ready</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {CORE_FEATURES.map((f, i) => (
                  <motion.div key={f.title} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                    className="p-5 rounded-2xl border border-white/8 bg-white/2 flex gap-4">
                    <div className={`w-10 h-10 rounded-xl ${f.bg} flex items-center justify-center flex-shrink-0`}>
                      <f.icon className={`w-5 h-5 ${f.color}`} />
                    </div>
                    <div>
                      <div className="font-bold text-sm text-white/80 mb-1">{f.title}</div>
                      <p className="text-xs text-white/45 leading-relaxed">{f.desc}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* Value Justification */}
          {tab === 'value' && (
            <div className="max-w-3xl mx-auto space-y-4">
              <div className="p-5 rounded-2xl border border-green-400/20 bg-green-400/5 text-center">
                <div className="text-4xl font-black text-green-400">${totalValue.toLocaleString()}</div>
                <div className="text-sm text-white/40 mt-1">Comparable tooling replacement value</div>
                <div className="text-xs text-white/25 mt-1">OmniData asking price: $20,000–$25,000 (80% discount)</div>
              </div>
              <div className="space-y-2">
                {VALUE_BREAKDOWN.map((v, i) => (
                  <div key={i} className="flex items-center gap-4 p-4 rounded-xl border border-white/8 bg-white/2">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-white/70">{v.item}</div>
                      <div className="text-xs text-white/30 mt-0.5">Comparable: {v.comparable}</div>
                    </div>
                    <div className="text-sm font-black text-green-400 flex-shrink-0">${v.value.toLocaleString()}</div>
                  </div>
                ))}
              </div>
              <div className="p-4 rounded-xl bg-amber-400/5 border border-amber-400/15 text-xs text-amber-400/70">
                Note: Comparable values represent either subscription tools (annualized to 2-year cost) or custom development estimates. The $20K–$25K asking price is positioned as a one-time acquisition vs. recurring subscription costs that would exceed this within 12–18 months.
              </div>
            </div>
          )}

          {/* Use Cases */}
          {tab === 'usecases' && (
            <div className="max-w-4xl mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {USE_CASES.map((uc, i) => (
                  <motion.div key={uc.title} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                    className="p-5 rounded-2xl border border-white/8 bg-white/2 hover:border-white/15 transition-all">
                    <div className="text-3xl mb-3">{uc.emoji}</div>
                    <div className="font-bold text-sm text-white/80 mb-2">{uc.title}</div>
                    <p className="text-xs text-white/45 leading-relaxed">{uc.desc}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* Architecture */}
          {tab === 'architecture' && (
            <div className="max-w-3xl mx-auto space-y-4">
              <div className="p-4 rounded-xl bg-cyan-400/5 border border-cyan-400/15 text-xs text-white/50">
                OmniData is built on Base44 (React + Deno backend) with Tailwind CSS. No external databases required — all entity storage is managed by the Base44 platform. View full architecture diagrams in the Handover Package.
              </div>
              {[
                { layer: 'Frontend', tech: 'React 18 + Tailwind CSS + Framer Motion', color: 'text-cyan-400', items: ['50+ page components', 'Recharts for visualization', 'Zustand global state', 'React Query for data fetching'] },
                { layer: 'Backend Functions', tech: 'Deno Deploy (serverless)', color: 'text-green-400', items: ['31 backend functions', 'runAgentOrchestrator (LLM orchestration)', 'validateSQL (safety layer)', 'processDataset, generateReport, runObservability'] },
                { layer: 'Database', tech: 'Base44 Entity Store (hosted)', color: 'text-purple-400', items: ['35+ entity types', 'AgentTrace, PipelineRun, SharedReport', 'DataSource, DatasetVersion, SemanticMetric', 'AgentBenchmark, ProjectDocumentConfig'] },
                { layer: 'AI Layer', tech: 'Base44 InvokeLLM (OpenAI/Gemini)', color: 'text-amber-400', items: ['F-D-E-A-R reasoning prompt system', '5 principal analyst personas', 'Structured JSON output enforcement', 'Confidence scoring + fallback handling'] },
              ].map(l => (
                <div key={l.layer} className="p-5 rounded-2xl border border-white/8 bg-white/2">
                  <div className="flex items-center gap-3 mb-3">
                    <span className={`text-sm font-black ${l.color}`}>{l.layer}</span>
                    <span className="text-xs text-white/30 font-mono">{l.tech}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {l.items.map(item => (
                      <span key={item} className="text-xs px-2 py-1 rounded-lg bg-white/5 border border-white/8 text-white/50">{item}</span>
                    ))}
                  </div>
                </div>
              ))}
              <div className="flex gap-3">
                <Link to="/handover" className="flex items-center gap-2 px-4 py-2 bg-amber-400/10 border border-amber-400/20 text-amber-400 rounded-xl text-xs font-semibold hover:bg-amber-400/15 transition-all">
                  <Package className="w-3.5 h-3.5" /> View Full Handover Package
                </Link>
                <Link to="/admin/project-documentation" className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 text-white/50 rounded-xl text-xs font-semibold hover:text-white/80 transition-all">
                  <FileText className="w-3.5 h-3.5" /> Project Documentation
                </Link>
              </div>
            </div>
          )}

          {/* Limitations */}
          {tab === 'limitations' && (
            <div className="max-w-2xl mx-auto space-y-3">
              <div className="p-3 rounded-xl bg-amber-400/5 border border-amber-400/15 text-xs text-amber-400/70 font-semibold">
                Disclosed honestly for due diligence. Each has a documented workaround.
              </div>
              {LIMITATIONS.map((l, i) => (
                <div key={i} className={`p-4 rounded-2xl border ${l.severity === 'high' ? 'border-red-400/20 bg-red-400/5' : l.severity === 'medium' ? 'border-amber-400/15 bg-amber-400/5' : 'border-white/8 bg-white/2'}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`w-2 h-2 rounded-full ${l.severity === 'high' ? 'bg-red-400' : l.severity === 'medium' ? 'bg-amber-400' : 'bg-white/30'}`} />
                    <span className="text-sm font-bold text-white/75">{l.title}</span>
                    <span className={`ml-auto text-xs px-2 py-0.5 rounded border ${l.severity === 'high' ? 'text-red-400 border-red-400/25' : 'text-amber-400 border-amber-400/25'}`}>{l.severity}</span>
                  </div>
                  <p className="text-xs text-white/45 ml-4">Workaround: {l.workaround}</p>
                </div>
              ))}
            </div>
          )}

          {/* Roadmap */}
          {tab === 'roadmap' && (
            <div className="max-w-3xl mx-auto space-y-4">
              <div className="p-3 rounded-xl bg-cyan-400/5 border border-cyan-400/15 text-xs text-cyan-400/70">
                Roadmap is included in the handover as a value-add for buyers — demonstrates that the product has clear growth potential.
              </div>
              {ROADMAP.map((r, i) => (
                <div key={r.phase} className="p-5 rounded-2xl border border-white/8 bg-white/2">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-xs font-black text-white/30 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10">Phase {r.phase}</span>
                    <div className="h-px flex-1 bg-white/8" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {r.items.map(item => (
                      <div key={item} className="flex items-start gap-2 text-xs text-white/55 p-2">
                        <ChevronRight className="w-3 h-3 text-cyan-400 flex-shrink-0 mt-0.5" /> {item}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Sale Pitch Deck */}
          {tab === 'pitch' && (
            <div className="max-w-3xl mx-auto space-y-4">
              <div className="p-6 rounded-2xl border border-amber-400/20 bg-amber-400/5 text-center">
                <div className="text-xs text-amber-400/60 uppercase tracking-widest font-semibold mb-3">One-Page Pitch</div>
                <h2 className="text-2xl font-black mb-2">OmniData AI Analytics Studio</h2>
                <p className="text-sm text-white/60 mb-4 max-w-xl mx-auto">Full-stack AI analytics platform. From raw CSV to executive-ready reports in minutes. 12 modules. 14 AI report types. 31 backend functions. 4 demo datasets. Sale-ready.</p>
                <div className="inline-flex items-center gap-3 px-6 py-3 rounded-2xl bg-green-400/15 border border-green-400/25">
                  <DollarSign className="w-5 h-5 text-green-400" />
                  <div className="text-left">
                    <div className="text-xl font-black text-green-400">$20,000 – $25,000</div>
                    <div className="text-xs text-white/35">One-time acquisition price</div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: 'What buyer gets', items: ['Full source code', 'Base44 app transfer', 'All entities & data', 'Documentation PDF', 'Demo datasets', 'Admin credentials', 'Handover guide', '30-day Q&A support'] },
                  { label: 'What buyer can do', items: ['White-label as own product', 'Use for client demos', 'Academic submission', 'Train their own team', 'Build on top of it', 'Extend with new agents', 'Add new data sources', 'Sell as SaaS'] },
                  { label: 'Buyer protections', items: ['Known limitations documented', 'Workarounds provided', 'Architecture diagrams', 'Entity schema included', 'Backend function docs', 'Roadmap provided', 'QA checklist passed', 'Sale Readiness audit'] },
                ].map(col => (
                  <div key={col.label} className="p-4 rounded-2xl border border-white/8 bg-white/2">
                    <div className="text-xs text-white/30 uppercase tracking-widest font-semibold mb-3">{col.label}</div>
                    {col.items.map(item => (
                      <div key={item} className="flex items-center gap-2 py-1 text-xs text-white/55 border-b border-white/5 last:border-0">
                        <CheckCircle2 className="w-3 h-3 text-green-400 flex-shrink-0" /> {item}
                      </div>
                    ))}
                  </div>
                ))}
              </div>

              <button onClick={exportPitch}
                className="w-full flex items-center justify-center gap-2 py-4 bg-amber-400/15 border border-amber-400/25 text-amber-400 rounded-2xl text-sm font-bold hover:bg-amber-400/20 transition-all">
                <Download className="w-4 h-4" /> Export Full Pitch as Markdown
              </button>
            </div>
          )}

        </motion.div>
      </div>
    </div>
  );
}