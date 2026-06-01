import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain, Loader2, ChevronDown, ChevronRight, BarChart2, TrendingUp,
  AlertTriangle, CheckCircle2, Target, Zap, Briefcase, Database,
  FileText, Copy, Shield, Activity, Upload
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { DEMO_DATASETS, generateDemoData } from '@/lib/demoDatasets';
import { profileDataset, calculateQualityScore, calculateKPIs } from '@/lib/analyticsEngine';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

const AGENTS = [
  { id: 'data_analyst', name: 'Data Analyst', icon: BarChart2, color: 'cyan', colorClass: 'text-cyan-400', bg: 'bg-cyan-400/10', border: 'border-cyan-400/25', persona: 'Senior Data Analyst (15 yrs)', focus: 'EDA, SQL analysis, KPIs, trends, charts, correlation, outliers, data quality storytelling' },
  { id: 'business_analyst', name: 'Business Analyst', icon: Briefcase, color: 'blue', colorClass: 'text-blue-400', bg: 'bg-blue-400/10', border: 'border-blue-400/25', persona: 'Principal Business Analyst', focus: 'Problem framing, stakeholder analysis, KPI definition, gap analysis, root cause, decision matrix, roadmap' },
  { id: 'marketing_analyst', name: 'Marketing Analyst', icon: TrendingUp, color: 'pink', colorClass: 'text-pink-400', bg: 'bg-pink-400/10', border: 'border-pink-400/25', persona: 'Senior Marketing Analyst', focus: 'Campaigns, CLV, CAC, ROAS, funnels, RFM segmentation, churn, A/B testing, channel attribution' },
  { id: 'data_scientist', name: 'Data Scientist', icon: Brain, color: 'purple', colorClass: 'text-purple-400', bg: 'bg-purple-400/10', border: 'border-purple-400/25', persona: 'Lead Data Scientist', focus: 'ML model selection, feature importance, regression, classification, clustering, forecasting, anomaly detection, SHAP' },
  { id: 'operations_analyst', name: 'Operations Analyst', icon: Activity, color: 'amber', colorClass: 'text-amber-400', bg: 'bg-amber-400/10', border: 'border-amber-400/25', persona: 'Operations Research Analyst', focus: 'Process efficiency, bottleneck detection, KPIs, SLA monitoring, operational risk, resource utilization' },
  { id: 'supply_chain', name: 'Supply Chain Analyst', icon: Target, color: 'teal', colorClass: 'text-teal-400', bg: 'bg-teal-400/10', border: 'border-teal-400/25', persona: 'Supply Chain Analyst', focus: 'Inventory turnover, suppliers, OTD, forecast accuracy, transportation cost, demand planning, backorder rate' },
  { id: 'cfo', name: 'CFO Analyst', icon: Database, color: 'green', colorClass: 'text-green-400', bg: 'bg-green-400/10', border: 'border-green-400/25', persona: 'Chief Financial Officer', focus: 'Revenue, cost structure, gross margin, P&L, budget variance, unit economics, EBITDA, financial KPIs' },
  { id: 'executive', name: 'Executive Report Writer', icon: FileText, color: 'orange', colorClass: 'text-orange-400', bg: 'bg-orange-400/10', border: 'border-orange-400/25', persona: 'Executive Report Writer', focus: 'Strategic summaries, board reports, investor narratives, CXO-level recommendations, executive storytelling' },
];

const EXAMPLE_QUESTIONS = {
  data_analyst: ['Give me a full analysis of this dataset', 'What are the top trends and patterns?', 'Which columns have data quality issues?', 'What KPIs should I track?', 'What anomalies are present in the data?'],
  business_analyst: ['Why are costs increasing faster than revenue?', 'Define the KPIs I should track for this business', 'What are the key business risks?', 'Create a problem statement and root cause analysis', 'What gaps exist between current and desired state?'],
  marketing_analyst: ['Analyze campaign performance and identify the best channel', 'Calculate CAC, ROAS, and CLV from this data', 'Which customer segments are most valuable?', 'What is the funnel conversion rate and drop-off?', 'Identify churn risk signals and retention opportunities'],
  data_scientist: ['What ML model should I use to predict revenue?', 'Run a feature importance and correlation analysis', 'Detect anomalies in the time series data', 'Cluster customers into business-meaningful segments', 'What is the forecast for next quarter?'],
  operations_analyst: ['Identify operational bottlenecks and inefficiencies', 'Which processes have the highest error or delay rate?', 'Calculate on-time delivery rate and find risk factors', 'What are the top efficiency improvement opportunities?', 'Where is capacity being wasted or underutilized?'],
  supply_chain: ['Analyze supplier performance and identify underperformers', 'What is the inventory turnover rate and target?', 'Calculate on-time delivery rate by region and supplier', 'Which products have the highest stockout risk?', 'Analyze transportation cost trends and drivers'],
  cfo: ['Explain why gross margin is declining', 'Give me a full P&L and cost structure analysis', 'What is driving cost increases by department?', 'Calculate revenue growth rate and forecast next quarter', 'What are our unit economics — CAC, LTV, payback period?'],
  executive: ['Write an executive summary for leadership review', 'Summarize key business insights for a board presentation', 'Create a decision brief with risks and recommendations', 'Write a 1-page investor data narrative', 'Summarize the operational risk assessment with action items'],
};

function SufficiencyBadge({ score }) {
  const color = score >= 90 ? 'text-green-400 bg-green-400/10 border-green-400/25' : score >= 70 ? 'text-cyan-400 bg-cyan-400/10 border-cyan-400/25' : score >= 50 ? 'text-yellow-400 bg-yellow-400/10 border-yellow-400/25' : 'text-red-400 bg-red-400/10 border-red-400/25';
  const label = score >= 90 ? 'Strong' : score >= 70 ? 'Partial' : score >= 50 ? 'Limited' : 'Insufficient';
  return <span className={`px-2 py-0.5 rounded text-xs font-bold border ${color}`}>{label} · {score}%</span>;
}

function Section({ title, children, defaultOpen = false, accent = 'white' }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-white/8 rounded-xl overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/3 transition-all text-left">
        <span className="text-xs font-bold text-white/60 uppercase tracking-wider">{title}</span>
        {open ? <ChevronDown className="w-3.5 h-3.5 text-white/30" /> : <ChevronRight className="w-3.5 h-3.5 text-white/30" />}
      </button>
      {open && <div className="px-4 pb-4 text-sm text-white/70 leading-relaxed">{children}</div>}
    </div>
  );
}

function AnalystResponse({ response, agent }) {
  const [copied, setCopied] = useState(false);
  if (!response) return null;
  const copy = () => {
    navigator.clipboard.writeText(typeof response === 'string' ? response : JSON.stringify(response, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  const r = typeof response === 'string' ? { executiveSummary: response } : response;

  return (
    <div className="space-y-3">
      {/* Header bar */}
      <div className={`flex items-center justify-between p-3 rounded-xl border ${agent.bg} ${agent.border}`}>
        <div className="flex items-center gap-2 flex-wrap">
          <agent.icon className={`w-4 h-4 ${agent.colorClass}`} />
          <span className={`text-xs font-bold ${agent.colorClass}`}>{agent.persona}</span>
          {r.dataSufficiencyScore !== undefined && <SufficiencyBadge score={r.dataSufficiencyScore} />}
        </div>
        <div className="flex items-center gap-3">
          {r.confidenceScore !== undefined && <span className="text-xs text-white/40">Confidence: <strong className={agent.colorClass}>{r.confidenceScore}%</strong></span>}
          <button onClick={copy} className="p-1 rounded text-white/30 hover:text-white/60 transition-all">
            {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {r.businessQuestionUnderstood && (
        <div className="px-4 py-2 bg-white/3 rounded-xl text-xs text-white/50 italic border border-white/5">
          📌 Business Question: {r.businessQuestionUnderstood}
        </div>
      )}

      {r.executiveSummary && (
        <Section title="📋 Executive Summary" defaultOpen>
          <p className="whitespace-pre-line text-white/80">{r.executiveSummary}</p>
        </Section>
      )}

      {/* Data Sufficiency */}
      {(r.availableFields || r.missingFields) && (
        <Section title="🔍 Data Sufficiency Assessment">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {r.availableFields && r.availableFields.length > 0 && (
              <div>
                <div className="text-xs font-bold text-green-400 mb-1">Available Fields ({r.availableFields.length})</div>
                <div className="flex flex-wrap gap-1">{r.availableFields.map(f => <span key={f} className="px-1.5 py-0.5 bg-green-400/10 text-green-400 text-xs rounded">{f}</span>)}</div>
              </div>
            )}
            {r.missingFields && r.missingFields.length > 0 && (
              <div>
                <div className="text-xs font-bold text-orange-400 mb-1">Missing Fields ({r.missingFields.length})</div>
                <div className="flex flex-wrap gap-1">{r.missingFields.map(f => <span key={f} className="px-1.5 py-0.5 bg-orange-400/10 text-orange-400 text-xs rounded">{f}</span>)}</div>
              </div>
            )}
          </div>
        </Section>
      )}

      {r.evidence && r.evidence.length > 0 && (
        <Section title="📊 Evidence & Key Findings" defaultOpen>
          <ul className="space-y-2">
            {r.evidence.map((e, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className={`mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 ${agent.colorClass.replace('text-', 'bg-')}`} />
                <span className="text-white/75">{e}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {r.metricsCalculated && r.metricsCalculated.length > 0 && (
        <Section title="📐 Metrics Calculated">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {r.metricsCalculated.map((m, i) => (
              <div key={i} className="bg-white/3 rounded-xl p-3 border border-white/6">
                <div className="text-xs text-white/40 mb-1">{m.name || m.metric}</div>
                <div className={`text-lg font-black font-mono ${agent.colorClass}`}>{m.value}</div>
                {m.formula && <div className="text-xs text-white/25 font-mono mt-1 truncate" title={m.formula}>{m.formula}</div>}
              </div>
            ))}
          </div>
        </Section>
      )}

      {r.sqlGenerated && (
        <Section title="💻 SQL Logic Used">
          <div className="relative">
            <pre className="font-mono text-xs text-green-400/85 whitespace-pre-wrap bg-navy-900/60 rounded-xl p-4 leading-relaxed">{r.sqlGenerated}</pre>
            <button onClick={() => navigator.clipboard.writeText(r.sqlGenerated)} className="absolute top-2 right-2 p-1.5 bg-white/5 rounded-lg text-white/30 hover:text-white/60">
              <Copy className="w-3 h-3" />
            </button>
          </div>
        </Section>
      )}

      {r.pythonGenerated && (
        <Section title="🐍 Python Logic Used">
          <div className="relative">
            <pre className="font-mono text-xs text-purple-400/85 whitespace-pre-wrap bg-navy-900/60 rounded-xl p-4 leading-relaxed">{r.pythonGenerated}</pre>
            <button onClick={() => navigator.clipboard.writeText(r.pythonGenerated)} className="absolute top-2 right-2 p-1.5 bg-white/5 rounded-lg text-white/30 hover:text-white/60">
              <Copy className="w-3 h-3" />
            </button>
          </div>
        </Section>
      )}

      {r.chartsRecommended && r.chartsRecommended.length > 0 && (
        <Section title="📈 Chart Recommendations">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {r.chartsRecommended.map((c, i) => (
              <div key={i} className="flex items-start gap-2 p-2 bg-white/3 rounded-lg">
                <BarChart2 className={`w-4 h-4 flex-shrink-0 mt-0.5 ${agent.colorClass}`} />
                <div>
                  <div className="text-xs font-semibold">{c.type || c}</div>
                  {c.fields && <div className="text-xs text-white/35 mt-0.5">Fields: {c.fields}</div>}
                  {c.reason && <div className="text-xs text-white/40 mt-0.5 italic">{c.reason}</div>}
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {(r.trendAnalysis || r.rootCauseAnalysis) && (
        <Section title="🔬 Trend & Root Cause Analysis">
          {r.trendAnalysis && <p className="mb-3 text-white/70">{r.trendAnalysis}</p>}
          {r.rootCauseAnalysis && <p className="text-white/65 border-t border-white/8 pt-3 mt-3">{r.rootCauseAnalysis}</p>}
        </Section>
      )}

      {r.businessImpact && (
        <Section title="💼 Business Impact">
          <p className="text-white/70 whitespace-pre-line">{r.businessImpact}</p>
        </Section>
      )}

      {r.recommendations && r.recommendations.length > 0 && (
        <Section title="✅ Recommendations" defaultOpen>
          <ol className="space-y-2.5">
            {r.recommendations.map((rec, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${agent.bg} border ${agent.border} ${agent.colorClass}`}>{i + 1}</span>
                <span className="text-white/75 leading-relaxed">{rec}</span>
              </li>
            ))}
          </ol>
        </Section>
      )}

      {r.limitations && r.limitations.length > 0 && (
        <Section title="⚠️ Limitations & Caveats">
          <ul className="space-y-1.5">
            {r.limitations.map((l, i) => (
              <li key={i} className="flex items-start gap-2 text-white/50">
                <AlertTriangle className="w-3 h-3 text-yellow-400 flex-shrink-0 mt-0.5" />{l}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {r.nextQuestions && r.nextQuestions.length > 0 && (
        <Section title="💡 Next Questions to Explore">
          <ul className="space-y-1.5">
            {r.nextQuestions.map((q, i) => (
              <li key={i} className="text-xs text-white/50 flex items-center gap-2">
                <ChevronRight className="w-3 h-3 text-white/25" /> {q}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {!r.executiveSummary && !r.evidence && (
        <div className="p-4 bg-white/3 rounded-xl text-sm text-white/70 whitespace-pre-line leading-relaxed">
          {typeof response === 'string' ? response : JSON.stringify(response, null, 2)}
        </div>
      )}
    </div>
  );
}

export default function AIAnalystTeam() {
  const [activeAgent, setActiveAgent] = useState(AGENTS[0]);
  const [question, setQuestion] = useState('');
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeDataset, setActiveDataset] = useState(null);
  const [datasetRows, setDatasetRows] = useState([]);
  const [columnProfiles, setColumnProfiles] = useState([]);
  const [sessions, setSessions] = useState([]);
  const fileRef = useRef();

  const loadDataset = (ds) => {
    const data = generateDemoData(ds.id);
    const cols = Object.keys(data[0] || {});
    const profiles = profileDataset(data, cols);
    setActiveDataset({ ...ds, source: 'demo' });
    setDatasetRows(data);
    setColumnProfiles(profiles);
    setResponse(null);
  };

  const handleFile = (file) => {
    if (!file) return;
    const ext = file.name.split('.').pop().toLowerCase();
    if (ext === 'csv') {
      Papa.parse(file, {
        header: true, skipEmptyLines: true,
        complete: (res) => {
          const data = res.data;
          const cols = Object.keys(data[0] || {});
          const profiles = profileDataset(data, cols);
          setActiveDataset({ id: 'uploaded', name: file.name, domain: 'general', icon: '📁', source: 'upload' });
          setDatasetRows(data);
          setColumnProfiles(profiles);
          setResponse(null);
        }
      });
    } else if (ext === 'xlsx' || ext === 'xls') {
      const reader = new FileReader();
      reader.onload = (e) => {
        const wb = XLSX.read(e.target.result, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(ws, { defval: '' });
        const cols = Object.keys(data[0] || {});
        const profiles = profileDataset(data, cols);
        setActiveDataset({ id: 'uploaded', name: file.name, domain: 'general', icon: '📁', source: 'upload' });
        setDatasetRows(data);
        setColumnProfiles(profiles);
        setResponse(null);
      };
      reader.readAsBinaryString(file);
    }
  };

  const handleAsk = async () => {
    if (!question.trim()) return;
    setLoading(true);
    setResponse(null);

    const qs = activeDataset ? calculateQualityScore(datasetRows, columnProfiles) : null;
    const kpis = activeDataset ? calculateKPIs(datasetRows, columnProfiles) : {};
    const cols = columnProfiles.slice(0, 25).map(cp => ({
      name: cp.columnName, type: cp.detectedType, role: cp.semanticRole,
      missing: `${(cp.missingRate * 100).toFixed(1)}%`,
      unique: cp.uniqueCount,
      min: cp.min, max: cp.max,
      sample: cp.sampleValues?.slice(0, 3).join(', ')
    }));

    const kpiSummary = Object.entries(kpis).slice(0, 8).map(([k, v]) =>
      `${k}: sum=${v.sum.toLocaleString()}, avg=${v.avg.toLocaleString()}, count=${v.count}`
    ).join('\n');

    const systemPrompt = `You are a ${activeAgent.persona} with 15+ years of experience. Focus: ${activeAgent.focus}.

DATASET: "${activeDataset?.name || 'No dataset loaded (respond generically)'}"
ROWS: ${datasetRows.length.toLocaleString()}
DOMAIN: ${activeDataset?.domain || 'general'}
COLUMNS (${cols.length}): ${JSON.stringify(cols, null, 2)}
QUALITY SCORE: ${qs?.score || 'N/A'}/100 (completeness=${qs?.completeness}%, validity=${qs?.validity}%, uniqueness=${qs?.uniqueness}%)
AVAILABLE KPIs:
${kpiSummary || 'No numeric KPIs detected'}

MANDATORY RESPONSE STRUCTURE — return a JSON with ALL these fields:
- executiveSummary: 3–4 strong analytical paragraphs. Use REAL column names and ACTUAL data observations. Start with the key finding.
- businessQuestionUnderstood: One sentence restating what the user is asking.
- evidence: 6–10 specific evidence bullets with real numbers (use the KPI data provided).
- metricsCalculated: 4–6 specific metrics with name, value (calculated from data if possible), formula.
- sqlGenerated: A complete, runnable SQL query for this exact question using the actual column names.
- pythonGenerated: A pandas code snippet for this analysis.
- chartsRecommended: 3 charts with type, fields (use actual column names), reason.
- trendAnalysis: 2 paragraphs on patterns and trends observed.
- rootCauseAnalysis: What is causing the patterns (2 paragraphs).
- businessImpact: Quantified business impact of findings.
- recommendations: 4–6 highly specific, actionable recommendations.
- limitations: 3+ honest limitations of this analysis.
- nextQuestions: 4–5 follow-up questions this analysis raises.
- availableFields: List of column names that ARE relevant to this question.
- missingFields: List of columns that WOULD help but are missing.
- dataSufficiencyScore: 0–100 (how well the dataset supports this question).
- confidenceScore: 0–100 (confidence in the analysis quality).

RULES:
- Never make up numbers not supported by data.
- Always use actual column names from the dataset.
- If a KPI value is provided in the KPI summary, USE IT exactly.
- Be specific: "Revenue increased by X%" not "Revenue increased".
- Provide minimum 3 recommendations, each with a specific action and expected outcome.`;

    try {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `${systemPrompt}\n\nUSER QUESTION: "${question}"`,
        model: 'claude_sonnet_4_6',
        response_json_schema: {
          type: 'object',
          properties: {
            executiveSummary: { type: 'string' },
            businessQuestionUnderstood: { type: 'string' },
            evidence: { type: 'array', items: { type: 'string' } },
            metricsCalculated: { type: 'array', items: { type: 'object', properties: { name: { type: 'string' }, value: { type: 'string' }, formula: { type: 'string' } } } },
            sqlGenerated: { type: 'string' },
            pythonGenerated: { type: 'string' },
            chartsRecommended: { type: 'array', items: { type: 'object', properties: { type: { type: 'string' }, fields: { type: 'string' }, reason: { type: 'string' } } } },
            trendAnalysis: { type: 'string' },
            rootCauseAnalysis: { type: 'string' },
            businessImpact: { type: 'string' },
            recommendations: { type: 'array', items: { type: 'string' } },
            limitations: { type: 'array', items: { type: 'string' } },
            nextQuestions: { type: 'array', items: { type: 'string' } },
            availableFields: { type: 'array', items: { type: 'string' } },
            missingFields: { type: 'array', items: { type: 'string' } },
            dataSufficiencyScore: { type: 'number' },
            confidenceScore: { type: 'number' }
          }
        }
      });
      setResponse(res);
      setSessions(s => [{ agent: activeAgent.name, question: question.slice(0, 60), ts: new Date().toISOString() }, ...s.slice(0, 9)]);
    } catch (e) {
      setResponse({ executiveSummary: `Analysis error: ${e.message}`, evidence: [], recommendations: [], limitations: ['API error occurred'], nextQuestions: [], dataSufficiencyScore: 0, confidenceScore: 0 });
    }
    setLoading(false);
  };

  const qs = activeDataset && datasetRows.length ? calculateQualityScore(datasetRows, columnProfiles) : null;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-white/6 px-6 py-4 bg-navy-800/50 backdrop-blur sticky top-0 z-20">
        <div className="max-w-7xl mx-auto flex items-center gap-3 flex-wrap">
          <div className="w-9 h-9 rounded-xl bg-purple-400/10 border border-purple-400/20 flex items-center justify-center">
            <Brain className="w-4.5 h-4.5 text-purple-400" />
          </div>
          <div>
            <h1 className="text-base font-bold">AI Analyst Team</h1>
            <p className="text-xs text-white/40">8 specialized AI analysts · 19-section structured analysis · Evidence-backed · Grounded on your data</p>
          </div>
          {activeDataset && (
            <div className="ml-auto flex items-center gap-2 px-3 py-1.5 bg-cyan-400/10 border border-cyan-400/20 rounded-xl">
              <Database className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-xs font-semibold text-cyan-400">{activeDataset.name} · {datasetRows.length.toLocaleString()} rows</span>
              {qs && <span className={`text-xs font-bold ml-1 ${qs.score >= 80 ? 'text-green-400' : qs.score >= 60 ? 'text-yellow-400' : 'text-red-400'}`}>Q:{qs.score}/100</span>}
            </div>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left sidebar */}
          <div className="space-y-5">
            {/* Agent selector */}
            <div>
              <div className="text-xs font-bold text-white/40 mb-2 uppercase tracking-wider">Select Analyst</div>
              <div className="space-y-1">
                {AGENTS.map(agent => (
                  <button key={agent.id} onClick={() => { setActiveAgent(agent); setResponse(null); }}
                    className={`w-full text-left flex items-center gap-2.5 px-3 py-2.5 rounded-xl border transition-all ${activeAgent.id === agent.id ? `${agent.bg} ${agent.border} ${agent.colorClass}` : 'border-transparent text-white/50 hover:bg-white/4'}`}>
                    <agent.icon className="w-4 h-4 flex-shrink-0" />
                    <div className="min-w-0">
                      <div className="text-xs font-semibold truncate">{agent.name}</div>
                      <div className="text-xs opacity-40 leading-tight truncate">{agent.persona.split('(')[0].trim()}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Upload */}
            <div>
              <div className="text-xs font-bold text-white/40 mb-2 uppercase tracking-wider">Upload Your Data</div>
              <button onClick={() => fileRef.current?.click()}
                className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl border border-dashed border-white/15 text-white/40 hover:border-cyan-400/30 hover:text-cyan-400 transition-all text-xs">
                <Upload className="w-3.5 h-3.5" /> Click to upload CSV / XLSX
              </button>
              <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={e => handleFile(e.target.files[0])} />
            </div>

            {/* Dataset selector */}
            <div>
              <div className="text-xs font-bold text-white/40 mb-2 uppercase tracking-wider">or Load Demo Dataset</div>
              <div className="space-y-1">
                {DEMO_DATASETS.map(ds => (
                  <button key={ds.id} onClick={() => loadDataset(ds)}
                    className={`w-full text-left flex items-center gap-2 px-3 py-2 rounded-xl border transition-all text-xs ${activeDataset?.id === ds.id ? 'border-cyan-400/25 bg-cyan-400/8 text-cyan-400' : 'border-transparent text-white/40 hover:text-white/70 hover:bg-white/4'}`}>
                    <span>{ds.icon}</span> <span className="truncate">{ds.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Recent sessions */}
            {sessions.length > 0 && (
              <div>
                <div className="text-xs font-bold text-white/40 mb-2 uppercase tracking-wider">Recent Sessions</div>
                <div className="space-y-1">
                  {sessions.slice(0, 5).map((s, i) => (
                    <div key={i} className="px-2 py-1.5 rounded-lg bg-white/3 border border-white/6">
                      <div className="text-xs text-white/50 font-semibold">{s.agent}</div>
                      <div className="text-xs text-white/30 truncate mt-0.5">{s.question}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Main area */}
          <div className="lg:col-span-3 space-y-4">
            {/* Agent card */}
            <div className={`rounded-2xl border p-4 ${activeAgent.bg} ${activeAgent.border}`}>
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-xl ${activeAgent.bg} border ${activeAgent.border} flex items-center justify-center flex-shrink-0`}>
                  <activeAgent.icon className={`w-5 h-5 ${activeAgent.colorClass}`} />
                </div>
                <div className="flex-1">
                  <div className={`font-bold ${activeAgent.colorClass}`}>{activeAgent.persona}</div>
                  <div className="text-xs text-white/45 mt-0.5 leading-relaxed">{activeAgent.focus}</div>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {(EXAMPLE_QUESTIONS[activeAgent.id] || []).map(q => (
                      <button key={q} onClick={() => setQuestion(q)}
                        className="text-xs px-2 py-1 bg-white/5 border border-white/8 rounded-lg text-white/45 hover:text-white/75 hover:border-white/15 transition-all leading-tight">
                        {q.length > 45 ? q.slice(0, 45) + '…' : q}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Question input */}
            <div className="glass-card rounded-2xl border border-white/8 p-4 space-y-3">
              <textarea value={question} onChange={e => setQuestion(e.target.value)} rows={3}
                onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) handleAsk(); }}
                placeholder={`Ask ${activeAgent.name}: e.g., "${EXAMPLE_QUESTIONS[activeAgent.id]?.[0]}"\n\nCtrl+Enter to send`}
                className="w-full px-4 py-3 bg-white/4 border border-white/10 rounded-xl text-sm focus:outline-none resize-none focus:border-cyan-400/30 leading-relaxed" />
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="text-xs text-white/30">
                  {activeDataset ? `📂 ${activeDataset.name} · ${datasetRows.length.toLocaleString()} rows · Quality: ${qs?.score || '–'}/100 · ${columnProfiles.length} columns` : '⚠ No dataset loaded — AI will respond generically without data context'}
                </div>
                <button onClick={handleAsk} disabled={loading || !question.trim()}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-50 ${activeAgent.bg} border ${activeAgent.border} ${activeAgent.colorClass} hover:opacity-90`}>
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />}
                  {loading ? 'Analyzing…' : 'Ask Analyst'}
                </button>
              </div>
            </div>

            {/* Loading */}
            {loading && (
              <div className={`rounded-2xl border p-8 text-center ${activeAgent.bg} ${activeAgent.border}`}>
                <Loader2 className={`w-10 h-10 animate-spin mx-auto mb-4 ${activeAgent.colorClass}`} />
                <div className={`text-sm font-bold ${activeAgent.colorClass}`}>{activeAgent.persona} is analyzing your data…</div>
                <div className="text-xs text-white/30 mt-2">Running deep analysis · Generating SQL · Building evidence table · Formulating recommendations</div>
                <div className="mt-4 flex justify-center gap-2 flex-wrap text-xs text-white/20">
                  {['Understanding question', 'Profiling data', 'Calculating metrics', 'Generating SQL', 'Building evidence', 'Writing recommendations'].map(s => (
                    <span key={s} className="px-2 py-0.5 bg-white/5 rounded">{s}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Response */}
            {!loading && response && <AnalystResponse response={response} agent={activeAgent} />}

            {/* Empty state */}
            {!loading && !response && (
              <div className="text-center py-20 text-white/20">
                <Brain className="w-16 h-16 mx-auto mb-4 opacity-15" />
                <div className="text-lg font-semibold mb-2">Ready to Analyze</div>
                <div className="text-sm">1. Load a demo dataset or upload your own data</div>
                <div className="text-sm">2. Choose an analyst specialized in your domain</div>
                <div className="text-sm">3. Ask any business question to get a deep analysis</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}