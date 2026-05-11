/**
 * AgentPipelineBuilder V2 — 6 senior-level pipeline presets
 * Real orchestrator routing with structured outputs
 */
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import {
  Play, CheckCircle2, Loader2, ChevronRight, Zap, Search,
  BarChart2, TrendingUp, AlertTriangle, Users, Settings, Brain
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import AgentStructuredAnswer from './AgentStructuredAnswer.jsx';

const PIPELINE_PRESETS = [
  {
    id: 'quick_insight',
    label: 'Quick Insight',
    icon: Zap,
    color: '#00e5ff',
    desc: 'Fast KPI summary. Use for simple questions.',
    nodes: ['Intent Classifier', 'SQL Agent', 'Business Context', 'Report Writer'],
    useWhen: 'Simple KPI questions or summaries',
    output: 'Direct answer · 1 recommendation',
  },
  {
    id: 'deep_diagnosis',
    label: 'Deep Diagnosis',
    icon: Search,
    color: '#a855f7',
    desc: 'Full root cause analysis. For drops, spikes, anomalies.',
    nodes: ['Intent Classifier', 'Data Quality', 'SQL Agent', 'Anomaly Detector', 'Specialist Agent', 'Business Context', 'Strategy Agent', 'Report Writer'],
    useWhen: 'KPI changed, anomaly detected, root cause needed',
    output: 'Driver breakdown · Evidence · Action plan',
  },
  {
    id: 'executive_brief',
    label: 'Executive Brief',
    icon: Brain,
    color: '#ffcc02',
    desc: 'Full business review. CFO + Growth + Ops all collaborate.',
    nodes: ['Data Quality', 'KPI Agent', 'CFO Agent', 'Growth Agent', 'Ops Agent', 'Strategy Agent', 'Report Writer'],
    useWhen: 'Weekly/monthly review, board memo, leadership summary',
    output: 'Executive summary · All KPIs · Risks · Actions',
  },
  {
    id: 'anomaly_hunt',
    label: 'Anomaly Hunt',
    icon: AlertTriangle,
    color: '#ef4444',
    desc: 'Find and explain unexpected data patterns.',
    nodes: ['Data Quality', 'SQL Agent', 'Anomaly Detector', 'Contribution Analyst', 'Specialist Agent', 'Strategy Agent'],
    useWhen: 'Unexplained changes, outlier investigation',
    output: 'Anomaly · Expected vs Actual · Top driver · Fix',
  },
  {
    id: 'growth_opportunity',
    label: 'Growth Opportunity',
    icon: TrendingUp,
    color: '#ff2d7a',
    desc: 'Identifies the #1 growth lever in your dataset.',
    nodes: ['Intent Classifier', 'Funnel Analyst', 'RFM Analyst', 'Cohort Analyst', 'Growth Agent', 'Strategy Agent', 'Report Writer'],
    useWhen: 'Growth questions, retention issues, funnel optimization',
    output: 'Top conversion gap · Segments · Retention · Experiments',
  },
  {
    id: 'ops_optimization',
    label: 'Ops Optimization',
    icon: Settings,
    color: '#4caf50',
    desc: 'DMAIC-based process and efficiency analysis.',
    nodes: ['Intent Classifier', 'Process Analyst', 'Bottleneck Detector', 'SLA Analyst', 'Operations Agent', 'Strategy Agent', 'Report Writer'],
    useWhen: 'Efficiency improvement, SLA risk, capacity planning',
    output: 'Bottleneck · Cycle-time · Capacity risk · Fix',
  },
];

function PipelineNode({ label, index, status }) {
  const statusColors = { idle: 'bg-white/8 text-white/35', running: 'bg-cyan-400/15 text-cyan-400', done: 'bg-green-400/15 text-green-400' };
  return (
    <div className="flex items-center gap-1">
      <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium transition-all ${statusColors[status] || statusColors.idle}`}>
        {status === 'running' && <Loader2 className="w-3 h-3 animate-spin" />}
        {status === 'done' && <CheckCircle2 className="w-3 h-3" />}
        {status === 'idle' && <span className="w-3 h-3 rounded-full bg-white/20 inline-block" />}
        {label}
      </div>
      {index !== undefined && <ChevronRight className="w-3 h-3 text-white/15 flex-shrink-0" />}
    </div>
  );
}

export default function AgentPipelineBuilder({ activeTable, activePersona }) {
  const [selectedPreset, setSelectedPreset] = useState(PIPELINE_PRESETS[0]);
  const [question, setQuestion] = useState('');
  const [running, setRunning] = useState(false);
  const [nodeStatuses, setNodeStatuses] = useState({});
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const runPipeline = async () => {
    if (!question.trim() || running) return;
    setRunning(true);
    setResult(null);
    setError('');

    // Animate through nodes
    const nodes = selectedPreset.nodes;
    for (let i = 0; i < nodes.length; i++) {
      setNodeStatuses(prev => ({ ...prev, [nodes[i]]: 'running' }));
      await new Promise(r => setTimeout(r, 300 + i * 200));
      setNodeStatuses(prev => ({ ...prev, [nodes[i]]: 'done' }));
    }

    try {
      const res = await base44.functions.invoke('runAgentOrchestrator', {
        question,
        persona: activePersona,
        pipelinePreset: selectedPreset.id,
        sessionId: `pipeline_${Date.now()}`,
        tableContext: activeTable ? {
          name: activeTable.name,
          rowCount: activeTable.rowCount || activeTable.rows?.length,
          columns: activeTable.columns?.slice(0, 25),
          rows: activeTable.rows?.slice(0, 25),
        } : null,
      });
      setResult(res.data);
    } catch (e) {
      setError(e.message);
    }

    setRunning(false);
  };

  return (
    <div className="space-y-5">
      {/* Preset selector */}
      <div>
        <div className="text-xs text-white/30 uppercase tracking-widest mb-2">Select Pipeline Preset</div>
        <div className="grid grid-cols-2 gap-2">
          {PIPELINE_PRESETS.map(p => {
            const Icon = p.icon;
            const isSelected = selectedPreset.id === p.id;
            return (
              <button key={p.id} onClick={() => { setSelectedPreset(p); setResult(null); setNodeStatuses({}); }}
                className={`flex items-start gap-2.5 p-3 rounded-xl border text-left transition-all ${isSelected ? '' : 'border-white/8 bg-white/2 hover:border-white/15 hover:bg-white/4'}`}
                style={isSelected ? { borderColor: `${p.color}35`, background: `${p.color}0d` } : {}}>
                <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{ background: `${p.color}18`, border: `1px solid ${p.color}28` }}>
                  <Icon className="w-3.5 h-3.5" style={{ color: isSelected ? p.color : 'rgba(255,255,255,0.35)' }} />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold" style={{ color: isSelected ? p.color : 'rgba(255,255,255,0.6)' }}>{p.label}</div>
                  <div className="text-xs text-white/25 leading-tight mt-0.5 line-clamp-2">{p.desc}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected preset details */}
      <div className="px-4 py-3 rounded-xl border" style={{ background: `${selectedPreset.color}08`, borderColor: `${selectedPreset.color}25` }}>
        <div className="text-xs text-white/30 mb-1">Use when: <span className="text-white/55">{selectedPreset.useWhen}</span></div>
        <div className="text-xs text-white/30">Output: <span className="text-white/55">{selectedPreset.output}</span></div>

        {/* Node flow */}
        <div className="flex flex-wrap items-center gap-0.5 mt-3">
          {selectedPreset.nodes.map((node, i) => (
            <PipelineNode key={node} label={node} index={i < selectedPreset.nodes.length - 1 ? i : undefined} status={nodeStatuses[node] || 'idle'} />
          ))}
        </div>
      </div>

      {/* Input + Run */}
      <div className="flex gap-2">
        <input value={question} onChange={e => setQuestion(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && runPipeline()}
          placeholder={`Enter question for ${selectedPreset.label} pipeline…`}
          className="flex-1 px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-cyan-400/30 text-foreground placeholder:text-white/25" />
        <button onClick={runPipeline} disabled={running || !question.trim()}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all disabled:opacity-40"
          style={{ background: selectedPreset.color, color: 'hsl(222,47%,6%)' }}>
          {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
          {running ? 'Running…' : 'Run Pipeline'}
        </button>
      </div>

      {/* Running progress */}
      {running && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="flex flex-wrap items-center gap-1 p-3 rounded-xl bg-white/3 border border-white/8">
          {selectedPreset.nodes.map((node, i) => (
            <PipelineNode key={node} label={node} index={i < selectedPreset.nodes.length - 1 ? i : undefined} status={nodeStatuses[node] || 'idle'} />
          ))}
        </motion.div>
      )}

      {/* Error */}
      {error && <div className="text-xs text-red-400 p-3 rounded-xl bg-red-400/8 border border-red-400/20">{error}</div>}

      {/* Result */}
      {result && !running && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <div className="text-xs font-bold text-white/40 uppercase tracking-widest mb-2 flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-green-400" /> Pipeline Complete · {result.duration_ms}ms
          </div>
          <AgentStructuredAnswer result={result} persona={activePersona} onFollowUp={q => { setQuestion(q); setResult(null); setNodeStatuses({}); }} sessionId={result.session_id} />
        </motion.div>
      )}
    </div>
  );
}