/**
 * AgentPipelineBuilderV2 — 6 senior-level pipeline presets with real node descriptions.
 */
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { Play, Loader2, CheckCircle2, ChevronRight, Zap, Brain, FileText, AlertTriangle, TrendingUp, Users, Target, BarChart2 } from 'lucide-react';

const PIPELINE_PRESETS = [
  {
    id: 'quick_insight',
    label: 'Quick Insight',
    color: '#00e5ff',
    desc: 'Fast KPI answer with SQL evidence',
    useWhen: 'User asks a simple KPI or summary question',
    output: ['Direct answer', 'One supporting chart', 'One recommendation'],
    nodes: [
      { id: 'intent', label: 'Intent Classifier', icon: Brain, desc: 'Classify question as finance/growth/ops' },
      { id: 'sql', label: 'SQL Agent', icon: Target, desc: 'Generate and simulate SQL query' },
      { id: 'context', label: 'Business Context', icon: FileText, desc: 'Apply domain knowledge' },
      { id: 'report', label: 'Report Writer', icon: FileText, desc: 'Format executive answer' },
    ],
  },
  {
    id: 'deep_diagnosis',
    label: 'Deep Diagnosis',
    color: '#a855f7',
    desc: 'Root cause analysis for KPI drops or spikes',
    useWhen: 'Something dropped/spiked, anomaly detected, root cause needed',
    output: ['Driver breakdown', 'Anomaly evidence', 'Segment contribution', 'Action plan'],
    nodes: [
      { id: 'intent', label: 'Intent Classifier', icon: Brain, desc: 'Classify question type' },
      { id: 'quality', label: 'Data Quality Agent', icon: CheckCircle2, desc: 'Validate data completeness' },
      { id: 'sql', label: 'SQL Agent', icon: Target, desc: 'Pull evidence from dataset' },
      { id: 'anomaly', label: 'Anomaly Detector', icon: AlertTriangle, desc: 'Detect 2σ outliers and spikes' },
      { id: 'specialist', label: 'Specialist Agent', icon: Users, desc: 'CFO / Growth / Ops domain analysis' },
      { id: 'context', label: 'Business Context', icon: FileText, desc: 'Interpret findings' },
      { id: 'strategy', label: 'Strategy Agent', icon: Zap, desc: 'Score actions by priority' },
      { id: 'report', label: 'Report Writer', icon: FileText, desc: 'Format full executive answer' },
    ],
  },
  {
    id: 'executive_brief',
    label: 'Executive Brief',
    color: '#ffcc02',
    desc: 'Full board-ready business review across all three agents',
    useWhen: 'Weekly/monthly review, leadership summary, board memo',
    output: ['Executive summary', 'KPI performance', 'Risks', 'Decisions needed', 'Next actions'],
    nodes: [
      { id: 'quality', label: 'Data Quality Agent', icon: CheckCircle2, desc: 'Baseline data check' },
      { id: 'kpi', label: 'KPI Agent', icon: BarChart2, desc: 'Score all available KPIs' },
      { id: 'cfo', label: 'CFO Agent', icon: Target, desc: 'Finance: revenue, cost, margin' },
      { id: 'growth', label: 'Growth Agent', icon: TrendingUp, desc: 'Growth: funnel, retention, cohort' },
      { id: 'ops', label: 'Operations Agent', icon: Zap, desc: 'Ops: throughput, SLA, bottleneck' },
      { id: 'strategy', label: 'Strategy Agent', icon: Brain, desc: 'Synthesize across all domains' },
      { id: 'report', label: 'Report Writer', icon: FileText, desc: 'Generate board memo' },
    ],
  },
  {
    id: 'anomaly_hunt',
    label: 'Anomaly Hunt',
    color: '#ef4444',
    desc: 'Detect, explain, and fix data anomalies',
    useWhen: 'Anomalies need explanation, unexpected values found',
    output: ['Anomaly detected', 'Expected vs actual', 'Top contributing segment', 'Risk', 'Fix'],
    nodes: [
      { id: 'quality', label: 'Data Quality Agent', icon: CheckCircle2, desc: 'Find missing/null/outlier values' },
      { id: 'sql', label: 'SQL Agent', icon: Target, desc: 'Query suspicious segments' },
      { id: 'anomaly', label: 'Anomaly Detector', icon: AlertTriangle, desc: '2σ detection + spike analysis' },
      { id: 'contribution', label: 'Contribution Analyst', icon: TrendingUp, desc: 'Segment contribution breakdown' },
      { id: 'specialist', label: 'Specialist Agent', icon: Users, desc: 'Domain context for anomaly' },
      { id: 'strategy', label: 'Strategy Agent', icon: Zap, desc: 'Fix recommendation' },
    ],
  },
  {
    id: 'growth_opportunity',
    label: 'Growth Opportunity',
    color: '#4caf50',
    desc: 'Find the highest-impact growth lever',
    useWhen: 'User asks for growth opportunities, product improvements',
    output: ['Top conversion gap', 'Customer segments', 'Retention issue', 'Recommended experiments'],
    nodes: [
      { id: 'intent', label: 'Intent Classifier', icon: Brain, desc: 'Confirm growth question' },
      { id: 'funnel', label: 'Funnel Analyst', icon: Target, desc: 'Stage-by-stage drop-off analysis' },
      { id: 'rfm', label: 'RFM Analyst', icon: Users, desc: 'Recency/Frequency/Monetary scoring' },
      { id: 'cohort', label: 'Cohort Analyst', icon: TrendingUp, desc: 'Retention curve by cohort' },
      { id: 'growth', label: 'Growth Analyst', icon: Zap, desc: 'LTV/CAC, campaign ROI, churn' },
      { id: 'strategy', label: 'Strategy Agent', icon: Brain, desc: 'Score experiments by impact' },
      { id: 'report', label: 'Report Writer', icon: FileText, desc: 'Growth action plan' },
    ],
  },
  {
    id: 'ops_optimization',
    label: 'Ops Optimization',
    color: '#00bfa5',
    desc: 'Find and fix the top operational bottleneck',
    useWhen: 'User asks how to improve efficiency, reduce delays',
    output: ['Bottleneck identified', 'Cycle-time issue', 'Capacity risk', 'Operational fix'],
    nodes: [
      { id: 'intent', label: 'Intent Classifier', icon: Brain, desc: 'Confirm ops question' },
      { id: 'process', label: 'Process Analyst', icon: Target, desc: 'Map stages and cycle times' },
      { id: 'bottleneck', label: 'Bottleneck Detector', icon: AlertTriangle, desc: 'Score stages by delay and volume' },
      { id: 'sla', label: 'SLA Analyst', icon: CheckCircle2, desc: 'SLA compliance per stage' },
      { id: 'ops', label: 'Operations Analyst', icon: Zap, desc: 'DMAIC root cause analysis' },
      { id: 'strategy', label: 'Strategy Agent', icon: Brain, desc: 'Automation opportunity scoring' },
      { id: 'report', label: 'Report Writer', icon: FileText, desc: 'Process improvement plan' },
    ],
  },
];



function PipelineNode({ node, index, total, status }) {
  const Icon = node.icon;
  const isLast = index === total - 1;
  const statusColor = status === 'done' ? '#4caf50' : status === 'running' ? '#00e5ff' : status === 'error' ? '#ef4444' : 'rgba(255,255,255,0.15)';

  return (
    <div className="flex items-center gap-1.5">
      <div className="flex flex-col items-center gap-1">
        <motion.div
          animate={status === 'running' ? { scale: [1, 1.1, 1], opacity: [0.7, 1, 0.7] } : {}}
          transition={{ repeat: Infinity, duration: 1.2 }}
          className="w-8 h-8 rounded-xl flex items-center justify-center border-2 transition-all"
          style={{ borderColor: statusColor, background: `${statusColor}15` }}>
          {status === 'done'
            ? <CheckCircle2 className="w-4 h-4" style={{ color: statusColor }} />
            : status === 'running'
            ? <Loader2 className="w-4 h-4 animate-spin" style={{ color: statusColor }} />
            : <Icon className="w-3.5 h-3.5" style={{ color: statusColor }} />}
        </motion.div>
        <div className="text-xs text-white/50 text-center max-w-[64px] leading-tight">{node.label}</div>
      </div>
      {!isLast && <ChevronRight className="w-3 h-3 text-white/15 flex-shrink-0 mb-4" />}
    </div>
  );
}

export default function AgentPipelineBuilderV2({ activeTable, activePersona, onRunComplete }) {
  const [selectedPreset, setSelectedPreset] = useState('quick_insight');
  const [running, setRunning] = useState(false);
  const [nodeStatuses, setNodeStatuses] = useState({});
  const [result, setResult] = useState(null);
  const [customQuestion, setCustomQuestion] = useState('');

  const preset = PIPELINE_PRESETS.find(p => p.id === selectedPreset);

  const runPipeline = async () => {
    if (!customQuestion.trim()) return;
    setRunning(true);
    setResult(null);
    setNodeStatuses({});

    // Animate nodes sequentially
    for (let i = 0; i < preset.nodes.length; i++) {
      setNodeStatuses(prev => ({ ...prev, [preset.nodes[i].id]: 'running' }));
      await new Promise(r => setTimeout(r, 600 + Math.random() * 400));
      setNodeStatuses(prev => ({ ...prev, [preset.nodes[i].id]: 'done' }));
    }

    try {
      const res = await base44.functions.invoke('runAgentOrchestrator', {
        question: customQuestion,
        persona: activePersona,
        tableContext: activeTable ? {
          name: activeTable.name,
          rowCount: activeTable.rowCount || activeTable.rows?.length,
          columns: activeTable.columns?.slice(0, 25),
          rows: activeTable.rows?.slice(0, 50),
        } : null,
        pipelinePreset: selectedPreset,
      });
      setResult(res.data);
      if (onRunComplete) onRunComplete(res.data);
    } catch (e) {
      setResult({ error: e.message });
    }
    setRunning(false);
  };

  return (
    <div className="space-y-5">
      {/* Preset selector */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
        {PIPELINE_PRESETS.map(p => (
          <button key={p.id} onClick={() => setSelectedPreset(p.id)}
            className={`text-left p-3 rounded-xl border transition-all ${selectedPreset === p.id ? 'border-opacity-40' : 'border-white/8 hover:border-white/15 hover:bg-white/3'}`}
            style={selectedPreset === p.id ? { borderColor: `${p.color}40`, background: `${p.color}0c` } : {}}>
            <div className="text-xs font-bold mb-0.5" style={{ color: selectedPreset === p.id ? p.color : 'rgba(255,255,255,0.55)' }}>{p.label}</div>
            <div className="text-xs text-white/30 leading-tight">{p.desc}</div>
          </button>
        ))}
      </div>

      {/* Selected pipeline detail */}
      <div className="glass-card rounded-2xl border border-white/8 p-4 space-y-4" style={{ borderColor: `${preset.color}20` }}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="font-bold text-sm" style={{ color: preset.color }}>{preset.label} Pipeline</div>
            <div className="text-xs text-white/35 mt-0.5">Use when: {preset.useWhen}</div>
          </div>
          <div className="flex flex-wrap gap-1">
            {preset.output.map((o, i) => (
              <span key={i} className="text-xs px-1.5 py-0.5 rounded-full bg-white/5 border border-white/8 text-white/35">{o}</span>
            ))}
          </div>
        </div>

        {/* Node flow */}
        <div className="flex flex-wrap items-start gap-1 py-2">
          {preset.nodes.map((node, i) => (
            <PipelineNode key={node.id} node={node} index={i} total={preset.nodes.length}
              status={nodeStatuses[node.id] || 'idle'} />
          ))}
        </div>

        {/* Input */}
        <div className="space-y-2">
          <input value={customQuestion} onChange={e => setCustomQuestion(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !running && runPipeline()}
            placeholder={`Ask a question to run through the ${preset.label} pipeline…`}
            className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm placeholder:text-white/25 focus:outline-none focus:border-white/25 text-foreground transition-all" />
          <button onClick={runPipeline} disabled={running || !customQuestion.trim()}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-40"
            style={{ background: preset.color, color: 'hsl(222,47%,6%)' }}>
            {running ? <><Loader2 className="w-4 h-4 animate-spin" /> Running {preset.nodes.length} agents…</> : <><Play className="w-4 h-4" /> Run Pipeline</>}
          </button>
        </div>
      </div>

      {/* Result */}
      {result && !result.error && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="glass-card rounded-2xl border border-white/8 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-400" />
            <span className="text-sm font-bold">Pipeline Complete</span>
            <span className="text-xs text-white/30">{result.duration_ms}ms · {result.agent}</span>
          </div>
          {result.direct_answer && <p className="text-sm text-white/75 leading-relaxed">{result.direct_answer}</p>}
          {result.recommendation?.length > 0 && (
            <ol className="space-y-1">
              {result.recommendation.map((r, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-white/60">
                  <span className="w-4 h-4 rounded-full bg-green-400/20 text-green-400 flex items-center justify-center flex-shrink-0 font-bold mt-0.5">{i+1}</span>{r}
                </li>
              ))}
            </ol>
          )}
          <div className="flex items-center gap-2 text-xs text-white/30">
            <span>Confidence: {result.confidence_score}%</span>
            {result.follow_up_metric && <><span>·</span><span>Follow-up: {result.follow_up_metric}</span></>}
          </div>
        </motion.div>
      )}
      {result?.error && (
        <div className="p-3 rounded-xl bg-red-400/8 border border-red-400/20 text-xs text-red-400">{result.error}</div>
      )}
    </div>
  );
}