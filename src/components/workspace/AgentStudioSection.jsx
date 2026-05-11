/**
 * AgentStudioSection V2 — Executive Analytics War Room
 * Senior multi-agent system: Intent → Data → Specialist → Tools → Evidence → Strategy → Report
 */
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useWorkspaceStore } from '@/lib/store';
import {
  Bot, Plus, Sparkles, Brain, Users, Loader2, Send, Trash2,
  GitMerge, ClipboardList, UserCircle2
} from 'lucide-react';
import PersonaCard from '@/components/agents/PersonaCard.jsx';
import PersonaForm from '@/components/agents/PersonaForm.jsx';
import AgentPipelineBuilder from '@/components/agents/AgentPipelineBuilder.jsx';
import TaskBoard from '@/components/agents/TaskBoard.jsx';
import AgentStructuredAnswer from '@/components/agents/AgentStructuredAnswer.jsx';
import AgentProfileCard from '@/components/agents/AgentProfileCard.jsx';


const DEFAULT_PERSONAS = [
  {
    id: 'cfo', name: 'CFO Analyst', department: 'Finance', role: 'Chief Financial Officer',
    personality: 'Conservative, data-driven, ROI-focused',
    systemInstructions: 'Focus on financial metrics, cost efficiency, revenue, margins, and budget impact.',
    focusMetrics: ['Revenue', 'Gross Margin %', 'Payroll Cost', 'Budget Variance', 'ROI'],
    defaultMode: 'diagnostic', avatarColor: '#00e5ff', usageCount: 0,
  },
  {
    id: 'marketing', name: 'Growth Analyst', department: 'Marketing', role: 'Growth Marketing Manager',
    personality: 'Creative, trend-focused, customer-centric',
    systemInstructions: 'Focus on acquisition, conversion, customer segments, campaigns, and growth levers.',
    focusMetrics: ['Conversion Rate', 'Churn Rate', 'CAC', 'LTV', 'Funnel Drop-off'],
    defaultMode: 'exploratory', avatarColor: '#ff2d7a', usageCount: 0,
  },
  {
    id: 'ops', name: 'Operations Analyst', department: 'Operations', role: 'Operations Director',
    personality: 'Efficiency-focused, process-oriented, detail-driven',
    systemInstructions: 'Focus on efficiency, throughput, bottlenecks, SLAs, and operational excellence.',
    focusMetrics: ['Cycle Time', 'SLA Compliance', 'Throughput', 'Defect Rate', 'Utilization'],
    defaultMode: 'diagnostic', avatarColor: '#4caf50', usageCount: 0,
  },
];

const STARTER_QUESTIONS = {
  cfo: [
    'Why is payroll cost increasing?',
    'Which department is over budget?',
    'What is our revenue per employee trend?',
  ],
  marketing: [
    'Where is the biggest drop-off in our funnel?',
    'Which customer segments have the highest churn?',
    'What is our LTV to CAC ratio?',
  ],
  ops: [
    'Where are the process bottlenecks?',
    'Which stages have SLA compliance issues?',
    'What is our capacity utilization?',
  ],
};

const TABS = [
  { id: 'chat', label: 'Chat', icon: Brain },
  { id: 'tasks', label: 'Tasks', icon: ClipboardList },
  { id: 'pipeline', label: 'Pipeline', icon: GitMerge },
  { id: 'profile', label: 'Profile', icon: UserCircle2 },
];

export default function AgentStudioSection() {
  const { getActiveTable } = useWorkspaceStore();
  const activeTable = getActiveTable();
  const [personas, setPersonas] = useState(DEFAULT_PERSONAS);
  const [activePersona, setActivePersona] = useState(DEFAULT_PERSONAS[0]);
  const [showForm, setShowForm] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [studioTab, setStudioTab] = useState('chat');
  const bottomRef = useRef(null);
  const sessionId = useRef(`chat_${Date.now()}`);

  useEffect(() => {
    base44.entities.AgentPersona.list('-usageCount', 20)
      .then(saved => { if (saved.length > 0) setPersonas([...DEFAULT_PERSONAS, ...saved]); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, loading]);

  const handleSend = async (text) => {
    const q = (text || input).trim();
    if (!q || loading) return;
    setInput('');
    setChatHistory(prev => [...prev, { role: 'user', content: q }]);
    setLoading(true);
    try {
      const res = await base44.functions.invoke('runAgentOrchestrator', {
        question: q,
        persona: activePersona,
        sessionId: sessionId.current,
        tableContext: activeTable ? {
          name: activeTable.name,
          rowCount: activeTable.rowCount || activeTable.rows?.length,
          columns: activeTable.columns?.slice(0, 25),
          rows: activeTable.rows?.slice(0, 25),
        } : null,
      });
      setChatHistory(prev => [...prev, {
        role: 'assistant',
        persona: activePersona.name,
        result: res.data,
        timestamp: new Date().toLocaleTimeString(),
      }]);
    } catch (e) {
      setChatHistory(prev => [...prev, {
        role: 'assistant',
        persona: activePersona.name,
        result: { direct_answer: `Error: ${e.message}`, evidence: [], recommendations: [], confidence: 0 },
        timestamp: new Date().toLocaleTimeString(),
      }]);
    }
    setLoading(false);
  };

  const handleSavePersona = async (data) => {
    const saved = await base44.entities.AgentPersona.create(data);
    setPersonas(prev => [...prev, { ...saved }]);
    setShowForm(false);
  };

  const starters = STARTER_QUESTIONS[activePersona.id] || STARTER_QUESTIONS.cfo;

  return (
    <div className="flex h-full overflow-hidden">
      {/* Persona Sidebar */}
      <div className="w-52 border-r border-white/8 overflow-y-auto p-3 flex-shrink-0 space-y-1.5">
        <div className="flex items-center justify-between mb-2 px-1">
          <span className="text-xs text-white/30 uppercase tracking-widest">Agents</span>
          <button onClick={() => setShowForm(true)}
            className="p-1 rounded-lg text-white/30 hover:text-pink-400 hover:bg-pink-400/10 transition-all" title="Add persona">
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
        {personas.map(p => (
          <div key={p.id || p.name}>
            <PersonaCard persona={p} active={activePersona?.id === p.id || activePersona?.name === p.name}
              onClick={() => { setActivePersona(p); setChatHistory([]); sessionId.current = `chat_${Date.now()}`; }} />
            {(activePersona?.id === p.id || activePersona?.name === p.name) && studioTab === 'chat' && (
              <AgentProfileCard persona={p} compact={true} />
            )}
          </div>
        ))}
      </div>

      {/* Main area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Tab bar */}
        <div className="flex items-center gap-1 px-4 py-2 border-b border-white/8 flex-shrink-0">
          <div className="flex gap-0.5 p-1 bg-white/5 rounded-xl border border-white/8">
            {TABS.map(t => (
              <button key={t.id} onClick={() => setStudioTab(t.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${studioTab === t.id ? 'bg-pink-400/20 text-pink-400' : 'text-white/40 hover:text-white/70'}`}>
                <t.icon className="w-3.5 h-3.5" /> {t.label}
              </button>
            ))}
          </div>
          {/* Active persona indicator */}
          <div className="ml-3 flex items-center gap-2 text-xs text-white/40">
            <div className="w-5 h-5 rounded-lg flex items-center justify-center text-xs font-bold"
              style={{ background: `${activePersona.avatarColor}20`, color: activePersona.avatarColor }}>
              {activePersona.name[0]}
            </div>
            <span style={{ color: activePersona.avatarColor }} className="font-semibold">{activePersona.name}</span>
            <span className="text-white/25">· {activePersona.department}</span>
            {activeTable && <span className="text-white/20">· {activeTable.name}</span>}
          </div>
        </div>

        {/* Pipeline */}
        {studioTab === 'pipeline' && (
          <div className="flex-1 overflow-y-auto p-5">
            <AgentPipelineBuilder activeTable={activeTable} activePersona={activePersona} />
          </div>
        )}

        {/* Tasks */}
        {studioTab === 'tasks' && (
          <div className="flex-1 overflow-y-auto p-5">
            <TaskBoard personas={personas} activeTable={activeTable} />
          </div>
        )}

        {/* Profile */}
        {studioTab === 'profile' && (
          <div className="flex-1 overflow-y-auto p-5">
            <AgentProfileCard persona={activePersona} compact={false} />
          </div>
        )}

        {/* Chat */}
        {studioTab === 'chat' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {chatHistory.length === 0 && (
                <div className="space-y-5">
                  <div className="text-center py-6">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3 text-2xl font-black"
                      style={{ background: `${activePersona.avatarColor}15`, border: `1px solid ${activePersona.avatarColor}25`, color: activePersona.avatarColor }}>
                      {activePersona.name[0]}
                    </div>
                    <h3 className="font-bold text-sm mb-1">I'm {activePersona.name}</h3>
                    <p className="text-xs text-white/35 max-w-xs mx-auto leading-relaxed mb-1">{activePersona.systemInstructions}</p>
                    <p className="text-xs text-white/20">I use F-D-E-A-R reasoning: Frame → Diagnose → Explain → Act → Review</p>
                  </div>
                  {/* KPI chips */}
                  <div className="flex flex-wrap justify-center gap-1 max-w-sm mx-auto">
                    {activePersona.focusMetrics?.map(m => (
                      <span key={m} className="text-xs px-2 py-0.5 rounded-full border text-white/40"
                        style={{ borderColor: `${activePersona.avatarColor}30`, background: `${activePersona.avatarColor}08` }}>
                        {m}
                      </span>
                    ))}
                  </div>
                  {/* Starters */}
                  <div className="grid grid-cols-1 gap-2 max-w-sm mx-auto">
                    {starters.map(q => (
                      <button key={q} onClick={() => handleSend(q)}
                        className="text-left text-xs p-3 rounded-xl bg-white/3 border border-white/7 hover:border-white/15 hover:bg-white/5 transition-all text-white/50 hover:text-white/75">
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <AnimatePresence>
                {chatHistory.map((msg, i) => (
                  <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} gap-2`}>
                    {msg.role === 'assistant' && (
                      <div className="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5"
                        style={{ background: `${activePersona.avatarColor}20`, color: activePersona.avatarColor }}>
                        {(msg.persona || 'A')[0]}
                      </div>
                    )}
                    <div className={`max-w-[82%] ${msg.role === 'user' ? '' : ''}`}>
                      {msg.role === 'user' ? (
                        <div className="px-3 py-2.5 rounded-2xl bg-white/8 border border-white/10 text-sm text-white/80">
                          {msg.content}
                        </div>
                      ) : (
                        <div>
                          <div className="text-xs mb-1.5 flex items-center gap-1.5" style={{ color: activePersona.avatarColor }}>
                            <Sparkles className="w-3 h-3" /> {msg.persona}
                            {msg.result?.intent && <span className="text-white/25">· {msg.result.intent}</span>}
                            <span className="text-white/20">{msg.timestamp}</span>
                          </div>
                          <AgentStructuredAnswer
                            result={msg.result}
                            persona={activePersona}
                            onFollowUp={q => handleSend(q)}
                            sessionId={sessionId.current}
                          />
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {loading && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-2">
                  <div className="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
                    style={{ background: `${activePersona.avatarColor}20`, color: activePersona.avatarColor }}>
                    {activePersona.name[0]}
                  </div>
                  <div className="glass-card rounded-2xl px-3 py-2.5 border border-white/8 text-xs text-white/40 flex items-center gap-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: activePersona.avatarColor }} />
                    Running F-D-E-A-R reasoning loop…
                  </div>
                </motion.div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="px-4 py-3 border-t border-white/5 flex-shrink-0">
              <div className="flex gap-2 items-end">
                <textarea value={input} onChange={e => setInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                  placeholder={`Ask ${activePersona.name} — e.g. "${starters[0]}"`} rows={1}
                  className="flex-1 bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2.5 text-sm placeholder:text-white/20 focus:outline-none focus:border-pink-400/30 resize-none transition-all"
                  style={{ minHeight: 40, maxHeight: 100 }} />
                {chatHistory.length > 0 && (
                  <button onClick={() => { setChatHistory([]); sessionId.current = `chat_${Date.now()}`; }}
                    className="p-2 text-white/20 hover:text-white/50 transition-colors" title="Clear chat">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
                <button onClick={() => handleSend()} disabled={!input.trim() || loading}
                  className="w-9 h-9 rounded-xl flex items-center justify-center transition-all disabled:opacity-30"
                  style={{ background: `${activePersona.avatarColor}20`, border: `1px solid ${activePersona.avatarColor}30`, color: activePersona.avatarColor }}>
                  <Send className="w-4 h-4" />
                </button>
              </div>
              <div className="text-xs text-white/15 mt-1.5 px-1">Uses F-D-E-A-R: Frame → Diagnose → Explain → Act → Review</div>
            </div>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showForm && <PersonaForm onSubmit={handleSavePersona} onClose={() => setShowForm(false)} />}
      </AnimatePresence>
    </div>
  );
}