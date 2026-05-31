import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, Loader2, ChevronDown, ChevronRight, BarChart2, TrendingUp, AlertTriangle, CheckCircle2, Target, Users, Zap, Briefcase, Database, FileText, Copy } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { DEMO_DATASETS, generateDemoData } from '@/lib/demoDatasets';
import { profileDataset, calculateQualityScore, calculateKPIs } from '@/lib/analyticsEngine';

const AGENTS = [
  { id: 'data_analyst', name: 'Data Analyst', icon: BarChart2, color: 'cyan', colorClass: 'text-cyan-400', bg: 'bg-cyan-400/10', border: 'border-cyan-400/25', persona: 'Senior Data Analyst', focus: 'EDA, SQL analysis, KPIs, trends, charts, data quality' },
  { id: 'business_analyst', name: 'Business Analyst', icon: Briefcase, color: 'blue', colorClass: 'text-blue-400', bg: 'bg-blue-400/10', border: 'border-blue-400/25', persona: 'Principal Business Analyst', focus: 'Problem framing, KPI definition, gap analysis, recommendations' },
  { id: 'marketing_analyst', name: 'Marketing Analyst', icon: TrendingUp, color: 'pink', colorClass: 'text-pink-400', bg: 'bg-pink-400/10', border: 'border-pink-400/25', persona: 'Senior Marketing Analyst', focus: 'Campaigns, CLV, CAC, ROAS, funnels, segmentation' },
  { id: 'data_scientist', name: 'Data Scientist', icon: Brain, color: 'purple', colorClass: 'text-purple-400', bg: 'bg-purple-400/10', border: 'border-purple-400/25', persona: 'Lead Data Scientist', focus: 'ML, forecasting, regression, clustering, anomaly detection' },
  { id: 'operations_analyst', name: 'Operations Analyst', icon: Zap, color: 'amber', colorClass: 'text-amber-400', bg: 'bg-amber-400/10', border: 'border-amber-400/25', persona: 'Operations Research Analyst', focus: 'Process efficiency, KPIs, bottlenecks, operational risk' },
  { id: 'supply_chain', name: 'Supply Chain Analyst', icon: Target, color: 'teal', colorClass: 'text-teal-400', bg: 'bg-teal-400/10', border: 'border-teal-400/25', persona: 'Supply Chain Analyst', focus: 'Inventory, suppliers, on-time delivery, forecast accuracy, transportation' },
  { id: 'cfo', name: 'CFO Analyst', icon: Database, color: 'green', colorClass: 'text-green-400', bg: 'bg-green-400/10', border: 'border-green-400/25', persona: 'Chief Financial Officer', focus: 'Revenue, costs, margins, P&L, variance, financial KPIs' },
  { id: 'executive', name: 'Executive Report Writer', icon: FileText, color: 'orange', colorClass: 'text-orange-400', bg: 'bg-orange-400/10', border: 'border-orange-400/25', persona: 'Executive Report Writer', focus: 'Strategic summaries, board reports, investor briefs, executive narratives' },
];

const EXAMPLE_QUESTIONS = {
  data_analyst: [
    'Give me a full analysis of this dataset',
    'What are the top trends and patterns?',
    'Which columns have data quality issues?',
    'What KPIs should I track?',
    'What anomalies are present in the data?',
  ],
  business_analyst: [
    'Why are costs increasing faster than revenue?',
    'Define the KPIs I should track for this business',
    'What are the key business risks?',
    'Create a problem statement and root cause analysis',
    'What are the gaps between current and desired state?',
  ],
  marketing_analyst: [
    'Analyze campaign performance and identify the best channel',
    'Calculate CAC, ROAS, and CLV from this data',
    'Which customer segments are most valuable?',
    'What is the funnel conversion rate?',
    'Identify churn risk signals',
  ],
  data_scientist: [
    'What ML model should I use to predict revenue?',
    'Run a feature importance analysis',
    'Detect anomalies in the time series data',
    'Cluster customers into segments',
    'What is the forecast for next quarter?',
  ],
  operations_analyst: [
    'Identify operational bottlenecks',
    'Which processes have the highest error rate?',
    'Calculate on-time delivery rate and find risk factors',
    'What are the efficiency improvement opportunities?',
    'Where is capacity being wasted?',
  ],
  supply_chain: [
    'Analyze supplier performance and identify underperformers',
    'What is the inventory turnover rate?',
    'Calculate on-time delivery rate by region',
    'Which products have the highest stockout risk?',
    'Analyze transportation cost trends',
  ],
  cfo: [
    'Explain why gross margin is declining',
    'Give me a full P&L analysis',
    'What is driving cost increases?',
    'Calculate revenue growth and forecast next quarter',
    'What is our unit economics?',
  ],
  executive: [
    'Write an executive summary for leadership',
    'Summarize key business insights for a board presentation',
    'Create a decision brief with risks and recommendations',
    'Write a 1-page investor data narrative',
    'Summarize the operational risk assessment',
  ],
};

function SufficiencyBadge({ score }) {
  const color = score >= 90 ? 'text-green-400 bg-green-400/10 border-green-400/25' : score >= 70 ? 'text-cyan-400 bg-cyan-400/10 border-cyan-400/25' : score >= 50 ? 'text-yellow-400 bg-yellow-400/10 border-yellow-400/25' : 'text-red-400 bg-red-400/10 border-red-400/25';
  const label = score >= 90 ? 'Strong' : score >= 70 ? 'Partial' : score >= 50 ? 'Limited' : 'Insufficient';
  return <span className={`px-2 py-0.5 rounded text-xs font-bold border ${color}`}>{label} · {score}%</span>;
}

function Section({ title, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-white/8 rounded-xl overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/3 transition-all">
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

  // Parse structured response
  const r = typeof response === 'string' ? { executiveSummary: response } : response;

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className={`flex items-center justify-between p-3 rounded-xl border ${agent.bg} ${agent.border}`}>
        <div className="flex items-center gap-2">
          <agent.icon className={`w-4 h-4 ${agent.colorClass}`} />
          <span className={`text-xs font-bold ${agent.colorClass}`}>{agent.persona}</span>
          {r.dataSufficiencyScore !== undefined && <SufficiencyBadge score={r.dataSufficiencyScore} />}
        </div>
        <div className="flex items-center gap-2">
          {r.confidenceScore !== undefined && <span className="text-xs text-white/40">Confidence: {r.confidenceScore}%</span>}
          <button onClick={copy} className="p-1 rounded text-white/30 hover:text-white/60 transition-all">
            {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Executive Summary */}
      {r.executiveSummary && (
        <Section title="Executive Summary" defaultOpen>
          <p className="whitespace-pre-line">{r.executiveSummary}</p>
        </Section>
      )}

      {/* Evidence bullets */}
      {r.evidence && r.evidence.length > 0 && (
        <Section title="Evidence" defaultOpen>
          <ul className="space-y-1.5">
            {r.evidence.map((e, i) => <li key={i} className="flex items-start gap-2"><span className={`mt-0.5 w-1.5 h-1.5 rounded-full flex-shrink-0 ${agent.colorClass.replace('text-', 'bg-')}`} />{e}</li>)}
          </ul>
        </Section>
      )}

      {/* Metrics */}
      {r.metricsCalculated && r.metricsCalculated.length > 0 && (
        <Section title="Metrics Calculated">
          <div className="grid grid-cols-2 gap-2">
            {r.metricsCalculated.map((m, i) => (
              <div key={i} className="bg-white/3 rounded-lg p-2.5">
                <div className="text-xs text-white/40">{m.name || m.metric}</div>
                <div className={`text-base font-bold font-mono ${agent.colorClass}`}>{m.value}</div>
                {m.formula && <div className="text-xs text-white/25 font-mono mt-0.5">{m.formula}</div>}
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* SQL */}
      {r.sqlGenerated && (
        <Section title="SQL Logic Used">
          <pre className="font-mono text-xs text-green-400/80 whitespace-pre-wrap bg-navy-900/60 rounded-lg p-3">{r.sqlGenerated}</pre>
        </Section>
      )}

      {/* Charts */}
      {r.chartsRecommended && r.chartsRecommended.length > 0 && (
        <Section title="Chart Recommendations">
          <div className="space-y-1.5">
            {r.chartsRecommended.map((c, i) => <div key={i} className="flex items-center gap-2 text-xs"><BarChart2 className="w-3.5 h-3.5 text-cyan-400" />{c.type || c} {c.fields ? `(${c.fields})` : ''}</div>)}
          </div>
        </Section>
      )}

      {/* Recommendations */}
      {r.recommendations && r.recommendations.length > 0 && (
        <Section title="Recommendations" defaultOpen>
          <ol className="space-y-2">
            {r.recommendations.map((rec, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${agent.bg} ${agent.colorClass}`}>{i + 1}</span>
                <span>{rec}</span>
              </li>
            ))}
          </ol>
        </Section>
      )}

      {/* Limitations */}
      {r.limitations && r.limitations.length > 0 && (
        <Section title="Limitations & Caveats">
          <ul className="space-y-1">
            {r.limitations.map((l, i) => <li key={i} className="flex items-start gap-2 text-white/50"><AlertTriangle className="w-3 h-3 text-yellow-400 flex-shrink-0 mt-0.5" />{l}</li>)}
          </ul>
        </Section>
      )}

      {/* Next Questions */}
      {r.nextQuestions && r.nextQuestions.length > 0 && (
        <Section title="Next Questions to Explore">
          <ul className="space-y-1">
            {r.nextQuestions.map((q, i) => <li key={i} className="text-xs text-white/50">→ {q}</li>)}
          </ul>
        </Section>
      )}

      {/* Fallback: raw text */}
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

  const loadDataset = (ds) => {
    const data = generateDemoData(ds.id);
    const cols = Object.keys(data[0] || {});
    const profiles = profileDataset(data, cols);
    setActiveDataset(ds);
    setDatasetRows(data);
    setColumnProfiles(profiles);
  };

  const handleAsk = async () => {
    if (!question.trim()) return;
    setLoading(true);
    setResponse(null);

    const qs = activeDataset ? calculateQualityScore(datasetRows, columnProfiles) : null;
    const kpis = activeDataset ? calculateKPIs(datasetRows, columnProfiles) : {};
    const cols = columnProfiles.map(cp => ({ name: cp.columnName, type: cp.detectedType, role: cp.semanticRole, missing: `${(cp.missingRate * 100).toFixed(1)}%` }));

    const systemPrompt = `You are a ${activeAgent.persona} with 15+ years of experience. Your focus areas: ${activeAgent.focus}.

Dataset: "${activeDataset?.name || 'No dataset loaded'}"
Rows: ${datasetRows.length || 0}
Columns: ${JSON.stringify(cols.slice(0, 20))}
Quality Score: ${qs?.score || 'N/A'}/100
KPIs available: ${Object.keys(kpis).join(', ')}

You MUST produce a detailed analysis in the required JSON format. Do not produce generic or short answers.
Every response MUST contain:
- executiveSummary: 3–4 strong paragraphs
- evidence: At least 5–8 specific evidence bullets with real numbers from the data
- metricsCalculated: At least 3 specific metrics with formulas and calculated values
- sqlGenerated: A relevant SQL query
- chartsRecommended: At least 2 chart recommendations
- recommendations: At least 4 specific, actionable recommendations
- limitations: Honest limitations
- nextQuestions: 3–5 follow-up questions
- dataSufficiencyScore: 0–100
- confidenceScore: 0–100

Use actual column names and data characteristics in your response. Never make up unrelated metrics.`;

    try {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `${systemPrompt}\n\nUser Question: ${question}`,
        model: 'claude_sonnet_4_6',
        response_json_schema: {
          type: 'object',
          properties: {
            executiveSummary: { type: 'string' },
            businessQuestionUnderstood: { type: 'string' },
            datasetUsed: { type: 'string' },
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
            dataSufficiencyScore: { type: 'number' },
            confidenceScore: { type: 'number' }
          }
        }
      });

      setResponse(res);
      setSessions(s => [{ agent: activeAgent.name, question, ts: new Date().toISOString() }, ...s.slice(0, 9)]);
    } catch (e) {
      setResponse({ executiveSummary: `Analysis error: ${e.message}`, evidence: [], recommendations: [], limitations: ['API error occurred'], nextQuestions: [], dataSufficiencyScore: 0, confidenceScore: 0 });
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-white/6 px-6 py-4 bg-navy-800/50 backdrop-blur sticky top-0 z-20">
        <div className="max-w-7xl mx-auto flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-purple-400/10 border border-purple-400/20 flex items-center justify-center">
            <Brain className="w-4.5 h-4.5 text-purple-400" />
          </div>
          <div>
            <h1 className="text-base font-bold">AI Analyst Team</h1>
            <p className="text-xs text-white/40">8 specialized AI analysts · Deep structured analysis · Evidence-backed answers</p>
          </div>
          {activeDataset && (
            <div className="ml-auto flex items-center gap-2 px-3 py-1.5 bg-cyan-400/10 border border-cyan-400/20 rounded-xl">
              <Database className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-xs font-semibold text-cyan-400">{activeDataset.name} · {datasetRows.length.toLocaleString()} rows</span>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left: Agent selector + dataset */}
          <div className="space-y-4">
            <div>
              <div className="text-xs font-bold text-white/40 mb-2">SELECT ANALYST</div>
              <div className="space-y-1.5">
                {AGENTS.map(agent => (
                  <button key={agent.id} onClick={() => { setActiveAgent(agent); setResponse(null); }}
                    className={`w-full text-left flex items-center gap-2 px-3 py-2.5 rounded-xl border transition-all ${activeAgent.id === agent.id ? `${agent.bg} ${agent.border} ${agent.colorClass}` : 'border-transparent text-white/50 hover:bg-white/4'}`}>
                    <agent.icon className="w-4 h-4 flex-shrink-0" />
                    <div>
                      <div className="text-xs font-semibold">{agent.name}</div>
                      <div className="text-xs opacity-50 leading-tight">{agent.persona}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="text-xs font-bold text-white/40 mb-2">LOAD DATASET</div>
              <div className="space-y-1.5">
                {DEMO_DATASETS.map(ds => (
                  <button key={ds.id} onClick={() => loadDataset(ds)}
                    className={`w-full text-left flex items-center gap-2 px-3 py-2 rounded-xl border transition-all text-xs ${activeDataset?.id === ds.id ? 'border-cyan-400/25 bg-cyan-400/8 text-cyan-400' : 'border-transparent text-white/40 hover:text-white/70 hover:bg-white/4'}`}>
                    <span>{ds.icon}</span> {ds.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Main area */}
          <div className="lg:col-span-3 space-y-4">
            {/* Agent info card */}
            <div className={`rounded-2xl border p-4 ${activeAgent.bg} ${activeAgent.border}`}>
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-xl ${activeAgent.bg} border ${activeAgent.border} flex items-center justify-center`}>
                  <activeAgent.icon className={`w-5 h-5 ${activeAgent.colorClass}`} />
                </div>
                <div className="flex-1">
                  <div className={`font-bold ${activeAgent.colorClass}`}>{activeAgent.persona}</div>
                  <div className="text-xs text-white/50 mt-0.5">{activeAgent.focus}</div>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {(EXAMPLE_QUESTIONS[activeAgent.id] || []).map(q => (
                      <button key={q} onClick={() => setQuestion(q)} className="text-xs px-2 py-0.5 bg-white/5 border border-white/8 rounded text-white/50 hover:text-white/80 hover:border-white/15 transition-all">
                        {q.length > 40 ? q.slice(0, 40) + '…' : q}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Question input */}
            <div className="glass-card rounded-2xl border border-white/8 p-4 space-y-3">
              <textarea value={question} onChange={e => setQuestion(e.target.value)} rows={3}
                placeholder={`Ask ${activeAgent.name}: e.g., "${EXAMPLE_QUESTIONS[activeAgent.id]?.[0]}"`}
                className="w-full px-4 py-3 bg-white/4 border border-white/10 rounded-xl text-sm focus:outline-none resize-none focus:border-cyan-400/30" />
              <div className="flex items-center justify-between">
                <div className="text-xs text-white/30">
                  {activeDataset ? `Dataset: ${activeDataset.name} · ${datasetRows.length} rows · Quality: ${calculateQualityScore(datasetRows, columnProfiles)?.score || '–'}/100` : 'No dataset loaded — AI will respond generically'}
                </div>
                <button onClick={handleAsk} disabled={loading || !question.trim()}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-50 ${activeAgent.bg} border ${activeAgent.border} ${activeAgent.colorClass} hover:opacity-90`}>
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />}
                  {loading ? 'Analyzing…' : 'Ask Analyst'}
                </button>
              </div>
            </div>

            {/* Loading state */}
            {loading && (
              <div className={`rounded-2xl border p-6 text-center ${activeAgent.bg} ${activeAgent.border}`}>
                <Loader2 className={`w-8 h-8 animate-spin mx-auto mb-3 ${activeAgent.colorClass}`} />
                <div className={`text-sm font-semibold ${activeAgent.colorClass}`}>
                  {activeAgent.persona} is analyzing your data…
                </div>
                <div className="text-xs text-white/30 mt-1">Running deep analysis · Generating SQL · Building evidence table</div>
              </div>
            )}

            {/* Response */}
            {!loading && response && (
              <AnalystResponse response={response} agent={activeAgent} />
            )}

            {/* Empty state */}
            {!loading && !response && (
              <div className="text-center py-16 text-white/20">
                <Brain className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <div>Select a dataset, choose an analyst, and ask a question</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}