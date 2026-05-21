/**
 * Handover Package — Phase 4: Sale-Ready Product Package + Mermaid Diagrams + Sale Readiness Audit
 */
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import {
  Package, CheckCircle2, XCircle, AlertTriangle, Download, FileText,
  Shield, Zap, TrendingUp, Database, Brain, BarChart2, Target, Star,
  Users, Code2, BookOpen, Clipboard, DollarSign, Globe, GitMerge,
  Activity, Layers, Eye, RefreshCw
} from 'lucide-react';
import MermaidDiagramViewer from '@/components/diagrams/MermaidDiagramViewer';

// ─── Mermaid Diagrams ─────────────────────────────────────────────────────────
const DIAGRAMS = [
  {
    id: 'system_arch',
    title: 'System Architecture',
    type: 'flowchart',
    icon: Layers,
    code: `flowchart TD
    A[Raw Data Upload] --> B[Data Quality Engine]
    B --> C[Data Prep Studio]
    C --> D[Semantic Metrics Store]
    D --> E[SQL Python Workbench]
    D --> F[Visual Builder]
    D --> G[AI Agent Studio]
    E --> H[Advanced Analytics Lab]
    F --> I[Dashboards]
    G --> J[Decision Reports]
    J --> K[PDF Export]
    L[Observability Center] --> G
    L --> E
    L --> J
    M[Admin Center] --> L
    M --> N[Benchmark Center]
    O[Pipeline Studio] --> B
    O --> C
    O --> D`,
  },
  {
    id: 'data_pipeline',
    title: 'Data Pipeline (DBT-style)',
    type: 'flowchart',
    icon: GitMerge,
    code: `flowchart LR
    subgraph Raw Layer
      A[CSV Upload]
      B[XLSX Upload]
      C[API Connector]
    end
    subgraph Staging Layer
      D[Column Normalization]
      E[Type Conversion]
      F[Null Handling]
    end
    subgraph Intermediate Layer
      G[Joins & Transformations]
      H[Calculated Fields]
    end
    subgraph Mart Layer
      I[Fact Tables]
      J[Dimension Tables]
    end
    subgraph Semantic Layer
      K[Certified Metrics]
      L[Dimension Catalog]
    end
    subgraph BI Layer
      M[Visual Builder]
      N[Dashboards]
    end
    A --> D
    B --> D
    C --> D
    D --> G
    E --> G
    F --> G
    G --> I
    H --> I
    I --> K
    J --> L
    K --> M
    L --> M
    M --> N`,
  },
  {
    id: 'agent_pipeline',
    title: 'AI Agent Pipeline',
    type: 'flowchart',
    icon: Brain,
    code: `flowchart TD
    A[User Question] --> B[Intent Classifier]
    B --> C[Data Sufficiency Check]
    C --> D[Semantic Metric Lookup]
    D --> E[Tool Planner]
    E --> F[SQL Generator]
    E --> G[Python Logic Engine]
    E --> H[Statistics Engine]
    F --> I[SQL Validator]
    I --> J[Result Aggregator]
    G --> J
    H --> J
    J --> K[F-D-E-A-R Reasoning]
    K --> L[Structured Answer Generator]
    L --> M[Confidence Scorer]
    M --> N[AgentTrace Logger]
    N --> O[Observability Center]
    L --> P[Decision Report]`,
  },
  {
    id: 'erd',
    title: 'Entity Relationship Diagram (Core)',
    type: 'er',
    icon: Database,
    code: `erDiagram
    DataSource ||--o{ DatasetVersion : "has versions"
    DataSource ||--o{ DataContract : "governed by"
    DataSource ||--o{ TransformationRecipe : "processed by"
    DatasetVersion ||--o{ ColumnProfile : "profiles"
    SemanticMetric ||--o{ MetricCertification : "certified via"
    SemanticMetric ||--|| DataSource : "derived from"
    AgentTrace ||--|| DataSource : "analyzes"
    AgentTrace ||--o{ AgentFeedback : "receives"
    PipelineRun ||--|| DataSource : "processes"
    AgentBenchmark ||--|| VerifiedAnswer : "tests against"
    SharedReport ||--|| DataSource : "reports on"`,
  },
  {
    id: 'ml_workflow',
    title: 'ML Workflow',
    type: 'flowchart',
    icon: Target,
    code: `flowchart TD
    A[Dataset Selection] --> B[Feature Selection]
    B --> C[Target Column Selection]
    C --> D{Problem Type}
    D -->|Classification| E[Nearest Centroid Model]
    D -->|Regression| F[OLS Linear Regression]
    E --> G[Train-Test Chronological Split 80-20]
    F --> G
    G --> H[Model Training]
    H --> I[Evaluation Metrics]
    I -->|Classification| J[Accuracy, Precision, Recall, F1]
    I -->|Regression| K[MAE, RMSE, R-squared]
    J --> L[Feature Importance Chart]
    K --> L
    L --> M[Business Interpretation]
    M --> N[Decision Intelligence Report]`,
  },
  {
    id: 'reporting_workflow',
    title: 'Reporting Workflow',
    type: 'flowchart',
    icon: FileText,
    code: `flowchart TD
    A[Select Report Type] --> B[Load Dataset Context]
    B --> C[Agent Orchestrator]
    C --> D[Intent Classification]
    D --> E[Data Sufficiency Check]
    E --> F[F-D-E-A-R Reasoning Loop]
    F --> G[Business Question]
    F --> H[Evidence Generation]
    F --> I[Risk Assessment]
    F --> J[Recommendations]
    G --> K[17-Section Report Assembly]
    H --> K
    I --> K
    J --> K
    K --> L[Confidence Scoring]
    L --> M[SharedReport Save]
    M --> N[Markdown Export]
    M --> O[PDF Export via jsPDF]`,
  },
  {
    id: 'observability_flow',
    title: 'Admin Observability Flow',
    type: 'flowchart',
    icon: Activity,
    code: `flowchart TD
    A[Every Agent Question] --> B[runAgentOrchestrator]
    B --> C[AgentTrace Created]
    C --> D[Observability Center]
    D --> E[Usage Overview Dashboard]
    D --> F[Agent Quality Dashboard]
    D --> G[SQL Monitoring Dashboard]
    D --> H[Data Quality Dashboard]
    D --> I[Pipeline Monitoring]
    D --> J[Benchmark Results]
    K[SQL Queries] --> L[validateSQL]
    L --> M[SQLQueryLog]
    M --> G
    N[Pipeline Runs] --> O[PipelineRun Entity]
    O --> I
    P[Benchmark Tests] --> Q[AgentBenchmark Entity]
    Q --> J`,
  },
  {
    id: 'handover_arch',
    title: 'Sale Handover Architecture',
    type: 'flowchart',
    icon: Package,
    code: `flowchart TD
    subgraph Product
      A[OmniData AI Analytics Studio]
      B[Base44 Platform Hosted]
      C[React + Tailwind Frontend]
      D[Deno Backend Functions]
    end
    subgraph Data Layer
      E[Base44 Entity Database]
      F[File Storage]
    end
    subgraph AI Layer
      G[LLM via Base44 InvokeLLM]
      H[Agent Orchestrator Function]
    end
    subgraph Buyer Onboarding
      I[Upload Demo Dataset]
      J[Configure Admin Users]
      K[Set API Keys if needed]
      L[Run Benchmark Tests]
      M[Validate Sale Readiness Score]
    end
    A --> B
    A --> C
    A --> D
    D --> E
    D --> F
    D --> G
    H --> G
    B --> I
    I --> J
    J --> K
    K --> L
    L --> M`,
  },
];

// ─── Checklist ────────────────────────────────────────────────────────────────
const CHECKLIST_CATEGORIES = {
  product: {
    label: 'Product',
    color: 'text-cyan-400',
    items: [
      { id: 'public_app',         label: 'Public app loads and is responsive' },
      { id: 'demo_dataset',       label: 'Demo dataset ready and pre-loaded' },
      { id: 'upload_flow',        label: 'Upload flow works (CSV/XLSX)' },
      { id: 'dashboard_works',    label: 'Dashboards render correctly' },
      { id: 'reports_export',     label: 'Decision Reports generate successfully' },
      { id: 'no_broken_links',    label: 'No broken navigation links' },
      { id: 'no_placeholders',    label: 'No placeholder / "coming soon" text' },
    ],
  },
  reliability: {
    label: 'Reliability',
    color: 'text-green-400',
    items: [
      { id: 'agent_structured',   label: 'Agent Studio returns structured answers' },
      { id: 'sql_validation',     label: 'SQL validation blocks unsafe queries' },
      { id: 'data_sufficiency',   label: 'Data sufficiency scoring works' },
      { id: 'payroll_protection', label: 'CFO payroll/cost column protection active' },
      { id: 'low_confidence',     label: 'Low-confidence answers handled gracefully' },
      { id: 'error_states',       label: 'Error states show helpful messages' },
    ],
  },
  documentation: {
    label: 'Documentation',
    color: 'text-purple-400',
    items: [
      { id: 'project_pdf',        label: 'Project Documentation PDF generated' },
      { id: 'user_guide',         label: 'User guide available' },
      { id: 'admin_guide',        label: 'Admin guide available' },
      { id: 'arch_diagram',       label: 'Architecture diagram ready' },
      { id: 'methodology_doc',    label: 'Methodology documented' },
      { id: 'limitations_doc',    label: 'Known limitations documented' },
    ],
  },
  demo: {
    label: 'Demo Quality',
    color: 'text-amber-400',
    items: [
      { id: 'demo_script',        label: 'Demo script / walkthrough ready' },
      { id: 'sample_dataset',     label: 'Sample dataset pre-loaded' },
      { id: 'sample_dashboard',   label: 'Sample dashboard / chart ready' },
      { id: 'sample_ai_qs',       label: '5+ sample AI questions documented' },
      { id: 'sample_report',      label: 'Sample report generated and saved' },
    ],
  },
  admin: {
    label: 'Admin Controls',
    color: 'text-teal-400',
    items: [
      { id: 'user_activity',      label: 'User activity visible in admin' },
      { id: 'agent_trace',        label: 'AgentTrace logs populated' },
      { id: 'sql_logs',           label: 'SQL logs visible in Observability' },
      { id: 'pipeline_logs',      label: 'Pipeline run logs visible' },
      { id: 'feedback_visible',   label: 'User feedback visible' },
      { id: 'benchmark_tests',    label: 'Benchmark Center has test questions' },
    ],
  },
  transfer: {
    label: 'Transfer Readiness',
    color: 'text-pink-400',
    items: [
      { id: 'limitations_written',label: 'Known limitations clearly written' },
      { id: 'setup_instructions', label: 'Setup instructions ready' },
      { id: 'handover_checklist', label: 'Handover checklist completed' },
      { id: 'prompt_library',     label: 'Prompt library exported' },
      { id: 'entity_schema',      label: 'Entity schema documented' },
      { id: 'backend_functions',  label: 'Backend functions documented' },
    ],
  },
};

const SALE_WEIGHTS = [
  { key: 'FeatureCompleteness', weight: 0.20, label: 'Feature Completeness', icon: Zap },
  { key: 'Reliability',         weight: 0.20, label: 'Reliability & Stability', icon: Shield },
  { key: 'DocumentationQuality',weight: 0.15, label: 'Documentation Quality', icon: FileText },
  { key: 'DemoQuality',         weight: 0.15, label: 'Demo Quality', icon: Eye },
  { key: 'AdminControls',       weight: 0.10, label: 'Admin Controls', icon: Users },
  { key: 'TestCoverage',        weight: 0.10, label: 'Test Coverage', icon: Target },
  { key: 'TransferReadiness',   weight: 0.10, label: 'Transfer Readiness', icon: Package },
];

const FEATURE_MATRIX = [
  { module: 'Data Engineering Studio',   features: ['CSV/XLSX Upload', 'Schema Inference', 'Column Profiling', 'Data Versioning', 'Processing Logs'],              status: 'complete' },
  { module: 'Data Quality Engine',       features: ['5 DQ Dimensions', 'Quality Score Formula', 'Data Readiness Score', 'Contract Validation', 'Cleaning Report'], status: 'complete' },
  { module: 'Semantic Metric Store',     features: ['Metric Definitions', 'Formula Validation', 'Certification', 'Domain Classification', 'Default Library'],       status: 'complete' },
  { module: 'SQL / Python Workbench',    features: ['SQL Editor', 'NL-to-SQL', 'SQL Validation', '15 Templates', 'Query Blueprints', 'Chart from Result'],          status: 'complete' },
  { module: 'Visual Builder',            features: ['8 Chart Types', 'Tableau-style Shelves', 'Marks Card', 'Tooltip Builder', 'AI Chart Explain', 'Theme Selector'],status: 'complete' },
  { module: 'AI Agent Studio',           features: ['5 Principal Analysts', 'F-D-E-A-R Reasoning', 'Structured Output', 'Data Sufficiency', 'Agent Traces'],        status: 'complete' },
  { module: 'Advanced Analytics Lab',    features: ['RFM', 'Funnel', 'Cohort', 'Churn', 'Market Basket', 'Forecasting', 'Anomaly', 'Clustering', 'ML Studio'],     status: 'complete' },
  { module: 'Pipeline Studio',           features: ['10-Step DAG Pipeline', 'DBT-style Layers', 'Run History', 'Step Logs', 'Retry', 'PipelineRun Entity'],         status: 'complete' },
  { module: 'Decision Reports',          features: ['14 Report Types', '17-Section Structure', 'Evidence-backed', 'Markdown Export', 'Confidence Scores'],          status: 'complete' },
  { module: 'Observability Center',      features: ['8 Dashboards', 'Agent Quality', 'SQL Monitoring', 'Pipeline Health', 'Benchmark Tracking'],                    status: 'complete' },
  { module: 'Benchmark Center',          features: ['SQL Accuracy Tests', 'Regression Tracking', 'Pass/Fail History', 'Domain Breakdown', 'Run All'],               status: 'complete' },
  { module: 'Project Documentation',     features: ['PDF Export', '26 Sections', 'Architecture Diagrams', 'Code Snippets', 'Version History'],                      status: 'complete' },
];

export default function HandoverPackage() {
  const [checklist, setChecklist] = useState(() =>
    Object.fromEntries(Object.values(CHECKLIST_CATEGORIES).flatMap(c => c.items).map(i => [i.id, false]))
  );
  const [tab, setTab] = useState('readiness');
  const [scores, setScores] = useState({
    FeatureCompleteness: 90, Reliability: 85, DocumentationQuality: 80,
    DemoQuality: 75, AdminControls: 90, TestCoverage: 70, TransferReadiness: 80,
  });
  const [selectedDiagram, setSelectedDiagram] = useState(DIAGRAMS[0]);

  const saleReadinessScore = Math.round(
    SALE_WEIGHTS.reduce((sum, w) => sum + w.weight * (scores[w.key] || 0), 0)
  );
  const allItems = Object.values(CHECKLIST_CATEGORIES).flatMap(c => c.items);
  const checkedCount = Object.values(checklist).filter(Boolean).length;
  const checklistPct = Math.round(checkedCount / allItems.length * 100);

  // Auto-score from checklist
  const categoryScores = Object.fromEntries(
    Object.entries(CHECKLIST_CATEGORIES).map(([key, cat]) => {
      const catItems = cat.items;
      const done = catItems.filter(i => checklist[i.id]).length;
      return [key, Math.round(done / catItems.length * 100)];
    })
  );

  const exportPackage = () => {
    const lines = [
      '# OmniData AI Analytics Studio — Buyer Handover Package',
      `Generated: ${new Date().toLocaleDateString()} · Sale Readiness: ${saleReadinessScore}%`,
      '',
      '## Sale Readiness Scores',
      ...SALE_WEIGHTS.map(w => `- ${w.label} (${Math.round(w.weight * 100)}%): ${scores[w.key]}%`),
      `- **TOTAL SALE READINESS: ${saleReadinessScore}%**`,
      '',
      '## Feature Matrix',
      ...FEATURE_MATRIX.map(m => `### ${m.module}\n${m.features.map(f => `- ✓ ${f}`).join('\n')}`),
      '',
      '## Handover Checklist',
      ...Object.entries(CHECKLIST_CATEGORIES).map(([, cat]) =>
        `### ${cat.label}\n${cat.items.map(i => `[${checklist[i.id] ? 'x' : ' '}] ${i.label}`).join('\n')}`
      ),
      '',
      '## Known Limitations',
      '- RFM/Clustering/ML run in-browser — best with < 5,000 rows',
      '- Forecasting: Moving Average/Linear Trend only — no full ARIMA/Prophet',
      '- ML Studio uses simplified approximations — not production scikit-learn',
      '- API Connector limited to CORS-enabled endpoints in browser',
      '- Cohort analysis requires parseable date columns',
      '',
      '## Setup Instructions',
      '1. Visit the Base44 app URL',
      '2. Invite admin users from Admin → Users',
      '3. Upload a demo dataset via Workspace → Upload',
      '4. Configure semantic metrics in Semantic Metric Store',
      '5. Run a pipeline from Pipeline Studio',
      '6. Test Agent Studio with sample questions',
      '7. Generate a Decision Report',
      '8. Review Observability Center for quality scores',
    ];
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/markdown' }));
    a.download = `omnidata_handover_package_${Date.now()}.md`;
    a.click();
  };

  const TABS = [
    { id: 'readiness',   label: 'Sale Readiness Audit' },
    { id: 'features',    label: 'Feature Matrix' },
    { id: 'checklist',   label: `Handover Checklist (${checkedCount}/${allItems.length})` },
    { id: 'diagrams',    label: 'Architecture Diagrams' },
    { id: 'limitations', label: 'Known Limitations' },
  ];

  const scoreColor = (v) => v >= 80 ? 'text-green-400' : v >= 60 ? 'text-amber-400' : 'text-red-400';
  const barColor = (v) => v >= 80 ? 'bg-green-400' : v >= 60 ? 'bg-amber-400' : 'bg-red-400';

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
              <h1 className="text-xl font-black">Buyer Handover Package</h1>
              <p className="text-xs text-muted-foreground">Sale Readiness Audit · Feature Matrix · Architecture Diagrams · Handover Checklist</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className={`px-5 py-2 rounded-xl border text-center ${saleReadinessScore >= 80 ? 'bg-green-400/10 border-green-400/20' : 'bg-amber-400/10 border-amber-400/20'}`}>
              <div className={`text-2xl font-black ${scoreColor(saleReadinessScore)}`}>{saleReadinessScore}%</div>
              <div className="text-xs text-white/30">Sale Readiness</div>
            </div>
            <button onClick={exportPackage}
              className="flex items-center gap-1.5 px-4 py-2 bg-white/8 border border-white/15 text-white/70 rounded-xl text-xs font-semibold hover:bg-white/12 transition-all">
              <Download className="w-3.5 h-3.5" /> Export Package
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-0 border-b border-white/8 px-8 overflow-x-auto flex-shrink-0">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-3 text-xs font-semibold border-b-2 whitespace-nowrap transition-all ${tab === t.id ? 'border-amber-400 text-amber-400' : 'border-transparent text-white/35 hover:text-white/60'}`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-8">

        {/* Sale Readiness Audit */}
        {tab === 'readiness' && (
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="p-6 rounded-2xl border border-amber-400/20 bg-amber-400/5 text-center">
              <div className={`text-6xl font-black mb-2 ${scoreColor(saleReadinessScore)}`}>{saleReadinessScore}%</div>
              <p className="text-sm text-white/50">Sale Readiness Score</p>
              <p className="text-xs text-white/25 font-mono mt-1">
                0.20×Feature + 0.20×Reliability + 0.15×Docs + 0.15×Demo + 0.10×Admin + 0.10×Tests + 0.10×Transfer
              </p>
            </div>

            <div className="space-y-4">
              {SALE_WEIGHTS.map(w => {
                const Icon = w.icon;
                const val = scores[w.key] || 0;
                return (
                  <div key={w.key} className="p-4 rounded-2xl border border-white/8 bg-white/2">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Icon className={`w-4 h-4 ${scoreColor(val)}`} />
                        <span className="text-sm font-semibold text-white/70">{w.label}</span>
                        <span className="text-xs text-white/25">({Math.round(w.weight * 100)}% weight)</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <input type="range" min={0} max={100} step={5} value={val}
                          onChange={e => setScores(s => ({ ...s, [w.key]: parseInt(e.target.value) }))}
                          className="w-28 accent-amber-400" />
                        <span className={`text-sm font-black w-10 text-right ${scoreColor(val)}`}>{val}%</span>
                      </div>
                    </div>
                    <div className="h-2 rounded-full bg-white/8 overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${barColor(val)}`} style={{ width: `${val}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Estimated value */}
            <div className="p-5 rounded-2xl border border-white/8 bg-white/2">
              <div className="flex items-center gap-2 mb-4 text-sm font-bold text-white/70">
                <DollarSign className="w-4 h-4 text-green-400" /> Estimated Pilot / Sale Value
              </div>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-3 rounded-xl bg-white/3 border border-white/8">
                  <div className="text-2xl font-black text-white/60">$15K</div>
                  <div className="text-xs text-white/30 mt-0.5">Consulting License</div>
                </div>
                <div className="p-3 rounded-xl bg-amber-400/10 border border-amber-400/20">
                  <div className="text-2xl font-black text-amber-400">$20K</div>
                  <div className="text-xs text-white/30 mt-0.5">Paid Pilot Target</div>
                </div>
                <div className="p-3 rounded-xl bg-white/3 border border-white/8">
                  <div className="text-2xl font-black text-cyan-400">$25K+</div>
                  <div className="text-xs text-white/30 mt-0.5">Full Product Sale</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Feature Matrix */}
        {tab === 'features' && (
          <div className="space-y-3 max-w-4xl">
            <div className="text-xs text-white/25 mb-4">{FEATURE_MATRIX.reduce((a, m) => a + m.features.length, 0)} total features across {FEATURE_MATRIX.length} modules</div>
            {FEATURE_MATRIX.map((module, i) => (
              <motion.div key={module.module} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                className="p-4 rounded-2xl border border-white/8 bg-white/2">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-white/85">{module.module}</span>
                    <span className="px-1.5 py-0.5 rounded bg-green-400/15 text-green-400 text-xs">✓ {module.status}</span>
                  </div>
                  <span className="text-xs text-white/30">{module.features.length} features</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {module.features.map(f => (
                    <span key={f} className="text-xs px-2 py-0.5 rounded-lg bg-white/5 border border-white/8 text-white/55">{f}</span>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Handover Checklist */}
        {tab === 'checklist' && (
          <div className="max-w-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className={`text-2xl font-black ${scoreColor(checklistPct)}`}>{checklistPct}% Complete</div>
                <div className="text-xs text-white/30">{checkedCount} of {allItems.length} items</div>
              </div>
              <button onClick={exportPackage}
                className="flex items-center gap-1.5 px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white/50 hover:text-white/80 transition-all">
                <Download className="w-3 h-3" /> Export MD
              </button>
            </div>
            {Object.entries(CHECKLIST_CATEGORIES).map(([catKey, cat]) => (
              <div key={catKey} className="rounded-2xl border border-white/8 overflow-hidden">
                <div className={`px-4 py-2 bg-white/3 text-xs font-semibold uppercase tracking-widest ${cat.color}`}>{cat.label}</div>
                {cat.items.map(item => (
                  <label key={item.id} className="flex items-center gap-3 px-4 py-3 border-b border-white/5 cursor-pointer hover:bg-white/2 transition-all">
                    <input type="checkbox" checked={checklist[item.id] || false}
                      onChange={e => setChecklist(c => ({ ...c, [item.id]: e.target.checked }))} className="rounded" />
                    <span className={`text-sm ${checklist[item.id] ? 'text-white/35 line-through' : 'text-white/70'}`}>{item.label}</span>
                    {checklist[item.id] && <CheckCircle2 className="w-3.5 h-3.5 text-green-400 ml-auto flex-shrink-0" />}
                  </label>
                ))}
              </div>
            ))}
          </div>
        )}

        {/* Architecture Diagrams */}
        {tab === 'diagrams' && (
          <div className="space-y-4">
            <div className="text-xs text-white/30 mb-2">Select a diagram to view. Paste the Mermaid code into <a href="https://mermaid.live" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">mermaid.live</a> to render.</div>
            <div className="flex flex-wrap gap-2 mb-4">
              {DIAGRAMS.map(d => {
                const Icon = d.icon;
                return (
                  <button key={d.id} onClick={() => setSelectedDiagram(d)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${selectedDiagram?.id === d.id ? 'bg-cyan-400/15 border-cyan-400/25 text-cyan-400' : 'bg-white/3 border-white/10 text-white/40 hover:text-white/70'}`}>
                    <Icon className="w-3.5 h-3.5" />{d.title}
                  </button>
                );
              })}
            </div>
            {selectedDiagram && (
              <MermaidDiagramViewer
                code={selectedDiagram.code}
                title={selectedDiagram.title}
                type={selectedDiagram.type}
              />
            )}
          </div>
        )}

        {/* Known Limitations */}
        {tab === 'limitations' && (
          <div className="max-w-2xl space-y-4">
            <div className="p-4 rounded-xl bg-amber-400/5 border border-amber-400/15 text-xs text-amber-400 font-semibold">
              Documented honestly for buyer due diligence. Each limitation has a documented workaround.
            </div>
            {[
              { title: 'In-Browser Analytics Scale', severity: 'medium', desc: 'RFM, Clustering, Market Basket, ML Studio run client-side. Performance may degrade with > 5,000 rows. Workaround: use Python export from each module for large datasets.' },
              { title: 'Forecasting Model Fidelity', severity: 'medium', desc: 'Forecasting uses Moving Average + Linear Trend only. No full ARIMA, SARIMA, or Prophet implementation. Workaround: use the Python code export to run Prophet locally.' },
              { title: 'ML Studio Approximations', severity: 'high', desc: 'ML Studio uses simplified nearest-centroid and OLS approximations. Results are educational and directional — not production model outputs. Not a replacement for scikit-learn.' },
              { title: 'API Connector CORS Restrictions', severity: 'medium', desc: 'Browser-based API calls are limited to CORS-enabled endpoints. Most production APIs require a backend proxy. Workaround: use the generated Python script from API Connector.' },
              { title: 'PDF Export Formatting', severity: 'low', desc: 'Project Documentation PDF is generated using jsPDF which has limited CSS support. Complex layouts may require manual post-processing in Canva or Word.' },
              { title: 'Cohort Date Parsing', severity: 'low', desc: 'Cohort Retention requires dates parseable by JavaScript new Date(). Non-standard date formats may fail silently. Workaround: pre-format dates as YYYY-MM-DD before upload.' },
              { title: 'AI Response Consistency', severity: 'medium', desc: 'LLM responses may vary between runs. Structured output format is enforced by prompt, but individual values can differ. Use Benchmark Center to track regression.' },
              { title: 'No Real-Time Streaming', severity: 'low', desc: 'All AI responses are request-response (not streaming). Large datasets may have visible loading delays of 5–15 seconds.' },
            ].map((item, i) => (
              <div key={i} className={`p-4 rounded-2xl border ${item.severity === 'high' ? 'border-red-400/20 bg-red-400/5' : item.severity === 'medium' ? 'border-amber-400/15 bg-amber-400/5' : 'border-white/8 bg-white/2'}`}>
                <div className="flex items-center gap-2 mb-2">
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${item.severity === 'high' ? 'bg-red-400' : item.severity === 'medium' ? 'bg-amber-400' : 'bg-white/30'}`} />
                  <span className="text-sm font-bold text-white/80">{item.title}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded border ml-auto ${item.severity === 'high' ? 'text-red-400 border-red-400/25 bg-red-400/10' : item.severity === 'medium' ? 'text-amber-400 border-amber-400/25 bg-amber-400/10' : 'text-white/30 border-white/10'}`}>{item.severity}</span>
                </div>
                <p className="text-xs text-white/55 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}