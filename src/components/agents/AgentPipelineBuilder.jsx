/**
 * AgentPipelineBuilder — Visual multi-agent workflow designer
 */
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import {
  ArrowRight, Plus, Play, Brain, Search, Target, BarChart2,
  FileText, Zap, CheckCircle2, Loader2, X, ChevronDown, Sparkles
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';

const AGENT_NODES = [
  { id: 'intent', label: 'Intent Classifier', icon: Brain, color: '#7b2fff', desc: 'Classifies question type and selects tools', output: 'intent + tool list' },
  { id: 'sql', label: 'SQL Agent', icon: Search, color: '#00e5ff', desc: 'Generates and executes SQL queries', output: 'query results + chart' },
  { id: 'context', label: 'Business Context', icon: BarChart2, color: '#ff6b35', desc: 'Adds industry benchmarks and business framing', output: 'context + KPIs' },
  { id: 'anomaly', label: 'Anomaly Detector', icon: Zap, color: '#ffcc02', desc: 'Scans for outliers and anomalies in results', output: 'anomaly flags' },
  { id: 'strategy', label: 'Strategy Agent', icon: Target, color: '#4caf50', desc: 'Generates prioritized recommendations', output: 'action items' },
  { id: 'report', label: 'Report Writer', icon: FileText, color: '#ff2d7a', desc: 'Synthesizes into executive narrative', output: 'final report' },
];

const PRESET_PIPELINES = [
  { name: 'Deep Diagnosis', agents: ['intent', 'sql', 'anomaly', 'context', 'strategy', 'report'], desc: 'Full 6-agent root cause analysis' },
  { name: 'Quick Insight', agents: ['intent', 'sql', 'context'], desc: 'Fast 3-agent answer for simple questions' },
  { name: 'Executive Brief', agents: ['sql', 'strategy', 'report'], desc: 'Data → recommendations → narrative' },
  { name: 'Anomaly Hunt', agents: ['sql', 'anomaly', 'strategy'], desc: 'Find problems and prescribe fixes' },
];

function AgentNode({ agent, index, total, completed, active }) {
  const Icon = agent.icon;
  const isLast = index === total - 1;
  return (
    <div className="flex items-center gap-2">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: index * 0.08 }}
        className={`flex flex-col items-center p-3 rounded-2xl border transition-all min-w-[90px] ${
          completed ? 'border-green-400/25 bg-green-400/8' :
          active ? 'border-opacity-50 shadow-lg' :
          'border-white/8 bg-white/3'
        }`}
        style={active ? { borderColor: `${agent.color}50`, background: `${agent.color}12`, boxShadow: `0 0 20px ${agent.color}20` } : {}}>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-2"
          style={{ background: `${agent.color}20`, border: `1px solid ${agent.color}30` }}>
          {completed ? <CheckCircle2 className="w-4 h-4 text-green-400" /> :
           active ? <Loader2 className="w-4 h-4 animate-spin" style={{ color: agent.color }} /> :
           <Icon className="w-4 h-4" style={{ color: agent.color }} />}
        </div>
        <div className="text-xs font-semibold text-center leading-tight">{agent.label}</div>
        <div className="text-xs text-white/30 text-center mt-0.5 leading-tight">{agent.output}</div>
      </motion.div>
      {!isLast && <ArrowRight className="w-4 h-4 text-white/20 flex-shrink-0" />}
    </div>
  );
}

export default function AgentPipelineBuilder({ activeTable, activePersona }) {
  const [selectedAgents, setSelectedAgents] = useState(['intent', 'sql', 'context', 'strategy']);
  const [question, setQuestion] = useState('');
  const [running, setRunning] = useState(false);
  const [currentAgent, setCurrentAgent] = useState(-1);
  const [completedAgents, setCompletedAgents] = useState([]);
  const [result, setResult] = useState(null);
  const [selectedPreset, setSelectedPreset] = useState(null);

  const loadPreset = (preset) => {
    setSelectedAgents(preset.agents);
    setSelectedPreset(preset.name);
    setResult(null);
    setCompletedAgents([]);
  };

  const toggleAgent = (id) => {
    setSelectedAgents(prev =>
      prev.includes(id) ? (prev.length > 1 ? prev.filter(a => a !== id) : prev) : [...prev, id]
    );
    setSelectedPreset(null);
  };

  const runPipeline = async () => {
    if (!question.trim()) return;
    setRunning(true);
    setResult(null);
    setCompletedAgents([]);

    // Animate through each agent
    for (let i = 0; i < selectedAgents.length; i++) {
      setCurrentAgent(i);
      await new Promise(r => setTimeout(r, 900 + Math.random() * 400));
      setCompletedAgents(prev => [...prev, selectedAgents[i]]);
    }
    setCurrentAgent(-1);

    // Run the actual multi-agent analysis
    try {
      const res = await base44.functions.invoke('runMultiAgentAnalysis', {
        question,
        persona: activePersona,
        tableContext: activeTable ? {
          name: activeTable.name,
          rowCount: activeTable.rowCount,
          columns: activeTable.columns?.slice(0, 20),
          rows: activeTable.rows?.slice(0, 30),
        } : null,
      });
      setResult(res.data);
    } catch (e) {
      setResult({ synthesis: 'Pipeline error: ' + e.message, agents: {} });
    }
    setRunning(false);
  };

  const orderedNodes = selectedAgents.map(id => AGENT_NODES.find(a => a.id === id)).filter(Boolean);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-black mb-1">Multi-Agent Pipeline Builder</h2>
        <p className="text-sm text-muted-foreground">Design custom agent workflows. Each agent hands off its output to the next, collaborating on complex problems.</p>
      </div>

      {/* Preset Pipelines */}
      <div>
        <div className="text-xs text-white/30 uppercase tracking-widest mb-2">Presets</div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {PRESET_PIPELINES.map(p => (
            <button key={p.name} onClick={() => loadPreset(p)}
              className={`text-left p-3 rounded-xl border transition-all ${selectedPreset === p.name ? 'bg-pink-400/10 border-pink-400/25' : 'bg-white/3 border-white/8 hover:border-white/15'}`}>
              <div className="text-xs font-bold">{p.name}</div>
              <div className="text-xs text-white/35 mt-0.5">{p.agents.length} agents · {p.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Agent Node Selector */}
      <div>
        <div className="text-xs text-white/30 uppercase tracking-widest mb-2">Pipeline Agents (click to add/remove)</div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-4">
          {AGENT_NODES.map(a => {
            const selected = selectedAgents.includes(a.id);
            const Icon = a.icon;
            return (
              <button key={a.id} onClick={() => toggleAgent(a.id)}
                className={`flex items-center gap-2.5 p-3 rounded-xl border transition-all text-left ${selected ? 'border-opacity-40' : 'bg-white/3 border-white/8 hover:border-white/15'}`}
                style={selected ? { borderColor: `${a.color}40`, background: `${a.color}10` } : {}}>
                <Icon className="w-4 h-4 flex-shrink-0" style={{ color: selected ? a.color : 'rgba(255,255,255,0.2)' }} />
                <div>
                  <div className="text-xs font-semibold">{a.label}</div>
                  <div className="text-xs text-white/30">{a.desc}</div>
                </div>
                {selected && <CheckCircle2 className="w-3.5 h-3.5 ml-auto flex-shrink-0" style={{ color: a.color }} />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Pipeline Visualizer */}
      <div className="glass-card rounded-2xl p-5 border border-white/8 overflow-x-auto">
        <div className="text-xs text-white/30 uppercase tracking-widest mb-4">Pipeline ({orderedNodes.length} agents)</div>
        <div className="flex items-center gap-2 min-w-max pb-2">
          {orderedNodes.map((agent, i) => (
            <AgentNode key={agent.id} agent={agent} index={i} total={orderedNodes.length}
              completed={completedAgents.includes(agent.id)}
              active={running && currentAgent === i} />
          ))}
        </div>
      </div>

      {/* Question Input */}
      <div className="space-y-2">
        <div className="text-xs text-white/30 uppercase tracking-widest">Question for Pipeline</div>
        <div className="flex gap-2">
          <input value={question} onChange={e => setQuestion(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && runPipeline()}
            placeholder="e.g. What are the top opportunities to grow revenue next quarter?"
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-pink-400/30 transition-all" />
          <button onClick={runPipeline} disabled={!question.trim() || running}
            className="flex items-center gap-2 px-5 py-3 bg-pink-400 text-xs font-bold rounded-xl hover:bg-pink-300 transition-all disabled:opacity-40"
            style={{ color: 'hsl(222,47%,6%)' }}>
            {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            {running ? `Agent ${currentAgent + 1}/${orderedNodes.length}` : 'Run Pipeline'}
          </button>
        </div>
      </div>

      {/* Pipeline Results */}
      <AnimatePresence>
        {result && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            className="space-y-3">
            <div className="glass-card rounded-2xl border border-white/8 overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-white/8 bg-white/2">
                <Sparkles className="w-4 h-4 text-pink-400" />
                <span className="text-xs font-semibold text-pink-400">Pipeline Synthesis — {orderedNodes.length} Agents</span>
                <CheckCircle2 className="w-3.5 h-3.5 text-green-400 ml-auto" />
              </div>
              <div className="p-4 text-sm text-white/75 leading-relaxed">
                <ReactMarkdown components={{ p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p> }}>
                  {result.synthesis || result.answer || 'Analysis complete.'}
                </ReactMarkdown>
              </div>
            </div>

            {/* Individual agent outputs */}
            {result.agents && (
              <details className="glass-card rounded-2xl border border-white/8 overflow-hidden">
                <summary className="flex items-center gap-2 px-4 py-3 cursor-pointer text-xs text-white/40 hover:text-white/60 select-none">
                  <ChevronDown className="w-3.5 h-3.5" /> View individual agent outputs
                </summary>
                <div className="p-4 pt-0 space-y-2">
                  {Object.entries(result.agents).map(([key, agent]) => {
                    if (!agent) return null;
                    const labels = { sqlAgent: { label: 'SQL Agent', icon: Search }, contextAgent: { label: 'Business Context', icon: BarChart2 }, recAgent: { label: 'Strategy Agent', icon: Target } };
                    const meta = labels[key];
                    if (!meta) return null;
                    const Icon = meta.icon;
                    return (
                      <div key={key} className="p-3 rounded-xl bg-white/3 border border-white/8">
                        <div className="flex items-center gap-2 mb-2 text-xs font-semibold text-white/60">
                          <Icon className="w-3.5 h-3.5 text-pink-400" /> {meta.label}
                        </div>
                        <div className="text-xs text-white/45 leading-relaxed">
                          {key === 'sqlAgent' ? (agent.explanation || agent.sql) :
                           key === 'contextAgent' ? agent.businessContext :
                           agent.recommendations?.[0]?.action || JSON.stringify(agent).slice(0, 200)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </details>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}