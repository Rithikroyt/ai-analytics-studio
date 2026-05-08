/**
 * Agent Studio — Build, customize, and run multi-agent AI analysis
 */
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useWorkspaceStore } from '@/lib/store';
import { Bot, Plus, Sparkles, Play, Brain, Zap, Users, ChevronRight, Loader2, Send, Trash2, Star, Settings, GitMerge } from 'lucide-react';
import PersonaCard from '@/components/agents/PersonaCard';
import PersonaForm from '@/components/agents/PersonaForm';
import AgentPipelineBuilder from '@/components/agents/AgentPipelineBuilder';
import ReactMarkdown from 'react-markdown';

const DEFAULT_PERSONAS = [
  { id: 'cfo', name: 'CFO Analyst', department: 'Finance', role: 'Chief Financial Officer', personality: 'Conservative, data-driven, ROI-focused', systemInstructions: 'Focus on financial metrics, cost efficiency, revenue, margins, and budget impact.', focusMetrics: ['revenue', 'margin', 'cost', 'budget', 'ROI'], defaultMode: 'diagnostic', avatarColor: '#00e5ff', usageCount: 0 },
  { id: 'marketing', name: 'Growth Analyst', department: 'Marketing', role: 'Growth Marketing Manager', personality: 'Creative, trend-focused, customer-centric', systemInstructions: 'Focus on acquisition, conversion, customer segments, campaigns, and growth levers.', focusMetrics: ['conversions', 'CAC', 'LTV', 'churn', 'engagement'], defaultMode: 'exploratory', avatarColor: '#ff2d7a', usageCount: 0 },
  { id: 'ops', name: 'Operations Analyst', department: 'Operations', role: 'Operations Director', personality: 'Efficiency-focused, process-oriented, detail-driven', systemInstructions: 'Focus on efficiency, throughput, bottlenecks, SLAs, and operational excellence.', focusMetrics: ['efficiency', 'throughput', 'SLA', 'utilization', 'defects'], defaultMode: 'diagnostic', avatarColor: '#4caf50', usageCount: 0 },
];

export default function AgentStudio() {
  const { getActiveTable } = useWorkspaceStore();
  const activeTable = getActiveTable();
  const [personas, setPersonas] = useState(DEFAULT_PERSONAS);
  const [activePersona, setActivePersona] = useState(DEFAULT_PERSONAS[0]);
  const [showForm, setShowForm] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [studioTab, setStudioTab] = useState('chat'); // 'chat' | 'pipeline'

  useEffect(() => {
    base44.entities.AgentPersona.list('-usageCount', 20)
      .then(saved => { if (saved.length > 0) setPersonas([...DEFAULT_PERSONAS, ...saved]); })
      .catch(() => {});
  }, []);

  const handleSend = async (text) => {
    const q = (text || input).trim();
    if (!q) return;
    setInput('');
    setChatHistory(prev => [...prev, { role: 'user', content: q }]);
    setLoading(true);
    try {
      const res = await base44.functions.invoke('runMultiAgentAnalysis', {
        question: q,
        persona: activePersona,
        tableContext: activeTable ? {
          name: activeTable.name,
          rowCount: activeTable.rowCount,
          columns: activeTable.columns?.slice(0, 20),
          rows: activeTable.rows?.slice(0, 30),
        } : null,
      });
      const result = res.data;
      setChatHistory(prev => [...prev, {
        role: 'assistant',
        persona: activePersona.name,
        content: result?.synthesis || 'Analysis complete.',
        agents: result?.agents,
        timestamp: new Date().toLocaleTimeString(),
      }]);
    } catch (e) {
      setChatHistory(prev => [...prev, { role: 'assistant', content: 'Error: ' + e.message, persona: activePersona.name }]);
    }
    setLoading(false);
  };

  const handleSavePersona = async (data) => {
    const saved = await base44.entities.AgentPersona.create(data);
    setPersonas(prev => [...prev, { ...saved, id: saved.id }]);
    setShowForm(false);
  };

  const STARTER_QUESTIONS = activePersona.focusMetrics?.length
    ? [`What are the top trends in ${activePersona.focusMetrics[0]}?`, `Which segments show the highest ${activePersona.focusMetrics[1] || 'growth'}?`, `What actions should the ${activePersona.department} team prioritize?`]
    : ['What are the key insights?', 'Where should we focus?', 'What are the risks?'];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="border-b border-white/8 px-8 py-5 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-pink-400/15 border border-pink-400/25 flex items-center justify-center">
            <Users className="w-5 h-5 text-pink-400" />
          </div>
          <div>
            <h1 className="text-xl font-black">Agent Studio</h1>
            <p className="text-xs text-muted-foreground">Multi-agent AI with specialized department personas</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-0.5 p-1 bg-white/5 rounded-xl border border-white/8">
            <button onClick={() => setStudioTab('chat')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${studioTab === 'chat' ? 'bg-pink-400/20 text-pink-400' : 'text-white/40 hover:text-white/70'}`}>
              <Brain className="w-3.5 h-3.5" /> Chat
            </button>
            <button onClick={() => setStudioTab('pipeline')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${studioTab === 'pipeline' ? 'bg-pink-400/20 text-pink-400' : 'text-white/40 hover:text-white/70'}`}>
              <GitMerge className="w-3.5 h-3.5" /> Pipeline
            </button>
          </div>
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-pink-400/10 border border-pink-400/20 text-pink-400 text-xs font-semibold rounded-xl hover:bg-pink-400/15 transition-all">
            <Plus className="w-3.5 h-3.5" /> Custom Persona
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Persona Sidebar */}
        <div className="w-64 border-r border-white/8 overflow-y-auto p-3 flex-shrink-0 space-y-2">
          <div className="text-xs text-white/30 uppercase tracking-widest mb-3 px-1">Personas</div>
          {personas.map(p => (
            <PersonaCard key={p.id} persona={p} active={activePersona?.id === p.id}
              onClick={() => { setActivePersona(p); setChatHistory([]); }} />
          ))}
        </div>

        {/* Pipeline Tab */}
        {studioTab === 'pipeline' && (
          <div className="flex-1 overflow-y-auto p-6">
            <AgentPipelineBuilder activeTable={activeTable} activePersona={activePersona} />
          </div>
        )}

        {/* Chat Area */}
        {studioTab === 'chat' && <div className="flex-1 flex flex-col overflow-hidden" key="chat-area">
          {/* Active Persona Banner */}
          <div className="px-5 py-3 border-b border-white/5 flex items-center gap-3 flex-shrink-0"
            style={{ background: `${activePersona.avatarColor}10`, borderColor: `${activePersona.avatarColor}20` }}>
            <div className="w-8 h-8 rounded-xl flex items-center justify-center text-lg font-bold"
              style={{ background: `${activePersona.avatarColor}20`, border: `1px solid ${activePersona.avatarColor}30`, color: activePersona.avatarColor }}>
              {activePersona.name[0]}
            </div>
            <div>
              <div className="text-sm font-bold" style={{ color: activePersona.avatarColor }}>{activePersona.name}</div>
              <div className="text-xs text-white/40">{activePersona.role} · {activePersona.department} · Focuses on: {activePersona.focusMetrics?.slice(0, 3).join(', ')}</div>
            </div>
            {chatHistory.length > 0 && (
              <button onClick={() => setChatHistory([])} className="ml-auto text-xs text-white/30 hover:text-white/60">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {chatHistory.length === 0 && (
              <div className="space-y-6">
                <div className="text-center py-10">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3 text-2xl"
                    style={{ background: `${activePersona.avatarColor}15`, border: `1px solid ${activePersona.avatarColor}25` }}>
                    🤖
                  </div>
                  <h3 className="font-semibold mb-1">Hi! I'm {activePersona.name}</h3>
                  <p className="text-sm text-muted-foreground max-w-sm mx-auto">{activePersona.systemInstructions || `Ask me anything about your data from a ${activePersona.role} perspective.`}</p>
                </div>
                <div className="grid grid-cols-1 gap-2 max-w-lg mx-auto">
                  {STARTER_QUESTIONS.map(q => (
                    <button key={q} onClick={() => handleSend(q)}
                      className="text-left text-xs p-3 rounded-xl bg-white/3 border border-white/7 hover:border-white/15 hover:bg-white/5 transition-all text-white/55 hover:text-white/80">
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <AnimatePresence>
              {chatHistory.map((msg, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} gap-3`}>
                  {msg.role === 'assistant' && (
                    <div className="w-7 h-7 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5"
                      style={{ background: `${activePersona.avatarColor}20`, color: activePersona.avatarColor }}>
                      {(msg.persona || 'A')[0]}
                    </div>
                  )}
                  <div className={`max-w-[75%] ${msg.role === 'user' ? 'bg-white/8 border border-white/10' : 'glass-card border border-white/8'} rounded-2xl px-4 py-3`}>
                    {msg.role === 'assistant' && (
                      <div className="text-xs font-semibold mb-2 flex items-center gap-2" style={{ color: activePersona.avatarColor }}>
                        <Sparkles className="w-3 h-3" /> {msg.persona} · 4-Agent Synthesis
                        <span className="text-white/25 font-normal">{msg.timestamp}</span>
                      </div>
                    )}
                    <div className="text-sm text-white/80 leading-relaxed">
                      <ReactMarkdown components={{ p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p> }}>
                        {msg.content}
                      </ReactMarkdown>
                    </div>
                    {/* Agent breakdown */}
                    {msg.agents && (
                      <details className="mt-3">
                        <summary className="text-xs text-white/30 cursor-pointer hover:text-white/50 select-none">View agent outputs ↓</summary>
                        <div className="mt-2 space-y-2 pt-2 border-t border-white/5">
                          {['sqlAgent', 'contextAgent', 'recAgent'].map(key => {
                            const agent = msg.agents[key];
                            if (!agent) return null;
                            const labels = { sqlAgent: '🔍 SQL Agent', contextAgent: '💼 Context Agent', recAgent: '🎯 Strategy Agent' };
                            return (
                              <div key={key} className="text-xs text-white/40 p-2 rounded-lg bg-white/3 border border-white/5">
                                <div className="font-semibold mb-1 text-white/60">{labels[key]}</div>
                                <div>{key === 'sqlAgent' ? agent.explanation : key === 'contextAgent' ? agent.businessContext : agent.recommendations?.[0]?.action}</div>
                              </div>
                            );
                          })}
                        </div>
                      </details>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {loading && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
                <div className="w-7 h-7 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0"
                  style={{ background: `${activePersona.avatarColor}20`, color: activePersona.avatarColor }}>
                  {activePersona.name[0]}
                </div>
                <div className="glass-card rounded-2xl px-4 py-3 border border-white/8 text-xs text-white/40 flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: activePersona.avatarColor }} />
                  Running 4 specialized agents in parallel…
                </div>
              </motion.div>
            )}
          </div>

          {/* Input */}
          <div className="px-5 py-4 border-t border-white/5 flex-shrink-0">
            <div className="flex gap-2.5 items-end">
              <textarea value={input} onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                placeholder={`Ask ${activePersona.name}…`} rows={1}
                className="flex-1 bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3 text-sm placeholder:text-white/25 focus:outline-none focus:border-pink-400/30 resize-none transition-all"
                style={{ minHeight: 44, maxHeight: 120 }} />
              <button onClick={() => handleSend()} disabled={!input.trim() || loading}
                className="w-10 h-10 rounded-xl flex items-center justify-center transition-all disabled:opacity-30"
                style={{ background: `${activePersona.avatarColor}20`, border: `1px solid ${activePersona.avatarColor}30`, color: activePersona.avatarColor }}>
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>}
      </div>

      <AnimatePresence>
        {showForm && <PersonaForm onSubmit={handleSavePersona} onClose={() => setShowForm(false)} />}
      </AnimatePresence>
    </div>
  );
}