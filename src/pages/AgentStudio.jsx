/**
 * Agent Studio V2 — Executive Analytics War Room (standalone page)
 * Full-page version of the workspace section with expanded layout.
 */
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useWorkspaceStore } from '@/lib/store';
import { Brain, GitMerge, ClipboardList, Sparkles, Loader2, Send, Trash2, Users, LayoutDashboard } from 'lucide-react';
import AgentProfileCard from '@/components/agents/AgentProfileCard.jsx';
import AgentStructuredAnswer from '@/components/agents/AgentStructuredAnswer.jsx';
import AgentPipelineBuilderV2 from '@/components/agents/AgentPipelineBuilderV2.jsx';
import AgentTaskBoardV2 from '@/components/agents/AgentTaskBoardV2.jsx';
import ExecutiveSummaryTab from '@/components/agents/ExecutiveSummaryTab.jsx';

const DEFAULT_PERSONAS = [
  { id: 'cfo',       name: 'CFO Analyst',        department: 'Finance',     role: 'Senior FP&A / Finance Analytics Expert',          avatarColor: '#00e5ff' },
  { id: 'marketing', name: 'Growth Analyst',      department: 'Marketing',   role: 'Senior Growth / Product / Revenue Analyst',        avatarColor: '#ff2d7a' },
  { id: 'ops',       name: 'Operations Analyst',  department: 'Operations',  role: 'Senior Operations Excellence Specialist',          avatarColor: '#4caf50' },
];

const STARTER_QUESTIONS = {
  cfo:       ['Why is payroll cost increasing?', 'Which department is over budget?', 'What is our gross margin trend?', 'When do we run out of runway?'],
  marketing: ['Where is the biggest funnel drop-off?', 'Which customers are churning?', 'What is our LTV/CAC ratio?', 'Which campaign has the best ROI?'],
  ops:       ['Where is the biggest bottleneck?', 'Which stage is breaching SLA?', 'What is capacity utilization?', 'Where can we automate?'],
};

const TABS = [
  { id: 'chat',      label: 'War Room',    icon: Brain },
  { id: 'executive', label: 'Exec Summary',icon: LayoutDashboard },
  { id: 'tasks',     label: 'Tasks',       icon: ClipboardList },
  { id: 'pipeline',  label: 'Pipeline',    icon: GitMerge },
];

export default function AgentStudio() {
  const { getActiveTable } = useWorkspaceStore();
  const activeTable = getActiveTable();
  const [personas, setPersonas] = useState(DEFAULT_PERSONAS);
  const [activePersona, setActivePersona] = useState(DEFAULT_PERSONAS[0]);
  const [chatHistory, setChatHistory] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState('chat');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    base44.entities.AgentPersona.list('-usageCount', 10)
      .then(saved => { if (saved?.length > 0) setPersonas([...DEFAULT_PERSONAS, ...saved]); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, loading]);

  const handleSend = async (textOverride) => {
    const q = (textOverride || input).trim();
    if (!q || loading) return;
    setInput('');
    setChatHistory(prev => [...prev, { role: 'user', content: q }]);
    setLoading(true);
    const tableContext = activeTable ? {
      name: activeTable.name,
      rowCount: activeTable.rowCount || activeTable.rows?.length,
      columns: activeTable.columns?.slice(0, 25),
      rows: activeTable.rows?.slice(0, 50),
    } : null;

    let result = null;
    let attempts = 0;
    while (attempts < 2) {
      try {
        const res = await base44.functions.invoke('runAgentOrchestrator', {
          question: q, persona: activePersona, tableContext, pipelinePreset: 'deep_diagnosis',
        });
        result = res.data;
        const hasAnswer = result?.direct_answer && result.direct_answer.length > 30 &&
          !['analysis complete','done','completed'].includes(result.direct_answer.toLowerCase().trim());
        if (hasAnswer) break;
        attempts++;
      } catch (e) {
        attempts++;
        if (attempts >= 2) {
          result = {
            direct_answer: `${activePersona.name} encountered an issue. Please rephrase your question or load a dataset.`,
            key_takeaways: ['Analysis could not complete — a temporary error occurred.', 'Try rephrasing with specific field names.', 'Ensure a dataset is loaded in the Workspace.'],
            confidence_score: 0, evidence: [],
            recommendation: ['Reload the dataset and try again', 'Rephrase the question with specific terms', 'Check the dataset contains relevant fields'],
            thought_process: ['1. Received the question', '2. Attempted analysis pipeline', `3. Error: ${e.message?.slice(0,80)||'Unknown'}`, '4. Graceful fallback activated', '5. Remediation steps suggested'],
          };
        }
      }
    }
    setChatHistory(prev => [...prev, {
      role: 'assistant', persona: activePersona,
      result, timestamp: new Date().toLocaleTimeString(),
    }]);
    setLoading(false);
  };

  const color = activePersona.avatarColor || '#00e5ff';
  const starters = STARTER_QUESTIONS[activePersona.id] || STARTER_QUESTIONS.cfo;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="border-b border-white/8 px-8 py-5 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-pink-400/15 border border-pink-400/25 flex items-center justify-center">
            <Users className="w-5 h-5 text-pink-400" />
          </div>
          <div>
            <h1 className="text-xl font-black">Executive Analytics War Room</h1>
            <p className="text-xs text-muted-foreground">Multi-agent system · CFO, Growth, Operations · F-D-E-A-R reasoning loop</p>
          </div>
        </div>
        <div className="flex gap-0.5 p-1 bg-white/5 rounded-xl border border-white/8">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${tab === t.id ? 'text-white' : 'text-white/35 hover:text-white/65'}`}
              style={tab === t.id ? { background: `${color}22`, color } : {}}>
              <t.icon className="w-3.5 h-3.5" /> {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Persona Sidebar */}
        <div className="w-64 border-r border-white/8 overflow-y-auto p-3 flex-shrink-0 space-y-1.5">
          <div className="text-xs text-white/25 uppercase tracking-widest mb-3 px-1 font-semibold">Senior Analysts</div>
          {personas.map(p => (
            <AgentProfileCard key={p.id} persona={p} active={activePersona.id === p.id}
              onClick={() => { setActivePersona(p); setChatHistory([]); }} />
          ))}
        </div>

        {/* Executive Summary */}
        {tab === 'executive' && (
          <div className="flex-1 overflow-hidden">
            <ExecutiveSummaryTab activeTable={activeTable} />
          </div>
        )}

        {/* Pipeline */}
        {tab === 'pipeline' && (
          <div className="flex-1 overflow-y-auto p-6">
            <AgentPipelineBuilderV2 activeTable={activeTable} activePersona={activePersona} />
          </div>
        )}

        {/* Tasks */}
        {tab === 'tasks' && (
          <div className="flex-1 overflow-y-auto p-6">
            <AgentTaskBoardV2 personas={personas} activeTable={activeTable} />
          </div>
        )}

        {/* War Room Chat */}
        {tab === 'chat' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Active persona banner */}
            <div className="px-6 py-3 border-b border-white/5 flex items-center gap-3 flex-shrink-0"
              style={{ background: `${color}08`, borderBottom: `1px solid ${color}18` }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg font-black"
                style={{ background: `${color}20`, color }}>
                {activePersona.name[0]}
              </div>
              <div>
                <div className="text-sm font-bold" style={{ color }}>{activePersona.name}</div>
                <div className="text-xs text-white/35">{activePersona.role} · Reasoning: Frame → Diagnose → Explain → Act → Review</div>
              </div>
              {chatHistory.length > 0 && (
                <button onClick={() => setChatHistory([])} className="ml-auto text-xs text-white/25 hover:text-white/55 flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-white/5 transition-all">
                  <Trash2 className="w-3 h-3" /> Clear
                </button>
              )}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {chatHistory.length === 0 && (
                <div className="max-w-2xl mx-auto space-y-6">
                  <div className="text-center py-6">
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl font-black mx-auto mb-3"
                      style={{ background: `${color}18`, border: `1px solid ${color}25`, color }}>
                      {activePersona.name[0]}
                    </div>
                    <h3 className="font-bold text-base mb-1">{activePersona.name}</h3>
                    <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
                      I analyze your data using the F-D-E-A-R reasoning loop: Frame the question, Diagnose with evidence, Explain root causes, Act with recommendations, and Review with follow-up metrics.
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {starters.map(q => (
                      <button key={q} onClick={() => handleSend(q)}
                        className="text-left text-sm p-3.5 rounded-xl bg-white/3 border border-white/8 hover:border-white/18 hover:bg-white/5 transition-all text-white/55 hover:text-white/80 leading-relaxed">
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <AnimatePresence>
                {chatHistory.map((msg, i) => (
                  <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} gap-3 max-w-4xl ${msg.role === 'assistant' ? 'mx-auto w-full' : 'ml-auto'}`}>
                    {msg.role === 'assistant' && (
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center text-sm font-black flex-shrink-0 mt-1"
                        style={{ background: `${msg.persona?.avatarColor || color}20`, color: msg.persona?.avatarColor || color }}>
                        {(msg.persona?.name || 'A')[0]}
                      </div>
                    )}
                    <div className={msg.role === 'user' ? 'max-w-lg' : 'flex-1'}>
                      {msg.role === 'user' ? (
                        <div className="px-4 py-3 rounded-2xl bg-white/8 border border-white/12">
                          <p className="text-sm text-white/85">{msg.content}</p>
                        </div>
                      ) : (
                        <div>
                          <div className="flex items-center gap-2 mb-2.5">
                            <span className="text-sm font-bold" style={{ color: msg.persona?.avatarColor || color }}>{msg.persona?.name}</span>
                            <span className="text-xs text-white/20">{msg.timestamp}</span>
                            {msg.result?.intent && <span className="text-xs px-2 py-0.5 rounded-full bg-white/5 border border-white/8 text-white/30 capitalize">{msg.result.intent}</span>}
                          </div>
                          <AgentStructuredAnswer
                            result={msg.result}
                            agentColor={msg.persona?.avatarColor || color}
                            agentName={msg.persona?.name || 'Agent'}
                            rows={activeTable?.rows}
                            columns={activeTable?.columns}
                          />
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {loading && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3 max-w-4xl mx-auto w-full">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center text-sm font-black flex-shrink-0"
                    style={{ background: `${color}20`, color }}>
                    {activePersona.name[0]}
                  </div>
                  <div className="glass-card rounded-2xl px-5 py-4 border border-white/8 space-y-2.5">
                    <div className="flex items-center gap-2 text-sm text-white/45">
                      <Loader2 className="w-4 h-4 animate-spin" style={{ color }} />
                      Running F-D-E-A-R analysis pipeline…
                    </div>
                    <div className="flex gap-1.5 flex-wrap">
                      {['Intent Classifier','Data Context Agent','SQL Agent','Anomaly Detector','Specialist Agent','Strategy Agent','Report Writer'].map((s, i) => (
                        <motion.span key={s} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.25 }}
                          className="text-xs px-2 py-0.5 rounded-full bg-white/5 border border-white/8 text-white/30">
                          {s}
                        </motion.span>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="px-6 py-4 border-t border-white/5 flex-shrink-0">
              <div className="flex gap-3 items-end max-w-4xl mx-auto">
                <textarea value={input} onChange={e => setInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                  placeholder={`Ask ${activePersona.name} — Frame → Diagnose → Explain → Act → Review…`}
                  rows={1} disabled={loading}
                  className="flex-1 bg-white/[0.04] border border-white/10 rounded-2xl px-4 py-3 text-sm placeholder:text-white/20 focus:outline-none focus:border-white/20 resize-none transition-all disabled:opacity-50"
                  style={{ minHeight: 48, maxHeight: 130 }} />
                <button onClick={() => handleSend()} disabled={!input.trim() || loading}
                  className="w-11 h-11 rounded-xl flex items-center justify-center transition-all disabled:opacity-30 flex-shrink-0"
                  style={{ background: `${color}22`, border: `1px solid ${color}35`, color }}>
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}