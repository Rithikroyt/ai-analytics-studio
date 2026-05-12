/**
 * AgentStudioSection V2 — Executive Analytics War Room
 * Multi-agent system: CFO, Growth, Operations with F-D-E-A-R reasoning loop.
 */
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useWorkspaceStore } from '@/lib/store';
import { Sparkles, Loader2, Send, Trash2, GitMerge, ClipboardList, Brain, LayoutDashboard } from 'lucide-react';
import AgentProfileCard from '@/components/agents/AgentProfileCard.jsx';
import AgentStructuredAnswer from '@/components/agents/AgentStructuredAnswer.jsx';
import AgentPipelineBuilderV2 from '@/components/agents/AgentPipelineBuilderV2.jsx';
import AgentTaskBoardV2 from '@/components/agents/AgentTaskBoardV2.jsx';
import ExecutiveSummaryTab from '@/components/agents/ExecutiveSummaryTab.jsx';

const DEFAULT_PERSONAS = [
  { id: 'cfo',       name: 'CFO Analyst',        department: 'Finance',     role: 'Chief Financial Officer',       avatarColor: '#00e5ff', usageCount: 0 },
  { id: 'marketing', name: 'Growth Analyst',      department: 'Marketing',   role: 'Growth Marketing Manager',      avatarColor: '#ff2d7a', usageCount: 0 },
  { id: 'ops',       name: 'Operations Analyst',  department: 'Operations',  role: 'Operations Director',           avatarColor: '#4caf50', usageCount: 0 },
];

const STARTER_QUESTIONS = {
  cfo:       ['Why is payroll cost increasing?', 'Which department is over budget?', 'What is our gross margin trend?', 'When do we run out of runway?'],
  marketing: ['Where is the biggest funnel drop-off?', 'Which customers are at risk of churn?', 'What is our LTV/CAC ratio?', 'Which cohort has the best retention?'],
  ops:       ['Where is the biggest process bottleneck?', 'Which stage is breaching SLA?', 'What is our capacity utilization?', 'Where can we reduce cycle time?'],
};

const TABS = [
  { id: 'chat',      label: 'War Room',    icon: Brain },
  { id: 'executive', label: 'Exec Summary',icon: LayoutDashboard },
  { id: 'tasks',     label: 'Tasks',       icon: ClipboardList },
  { id: 'pipeline',  label: 'Pipeline',    icon: GitMerge },
];

export default function AgentStudioSection() {
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
          question: q,
          persona: activePersona,
          tableContext,
          pipelinePreset: 'deep_diagnosis',
        });
        result = res.data;
        // Validate the result has substance
        const hasAnswer = result?.direct_answer && result.direct_answer.length > 30 &&
          !['analysis complete','done','completed'].includes(result.direct_answer.toLowerCase().trim());
        if (hasAnswer) break;
        attempts++;
      } catch (e) {
        attempts++;
        if (attempts >= 2) {
          result = {
            direct_answer: `${activePersona.name} encountered an issue processing this request. Please try rephrasing your question or ensure a dataset is loaded for analysis.`,
            key_takeaways: ['Analysis could not complete — the system encountered a temporary error.', 'Try rephrasing your question with more specific terms.', 'Ensure your dataset is loaded in the Workspace.'],
            confidence_score: 0,
            evidence: [],
            recommendation: ['Reload the dataset and try again', 'Rephrase the question with specific field names', 'Check that the dataset contains relevant fields for this question type'],
            thought_process: ['1. Received the question', '2. Attempted to invoke analysis pipeline', `3. Error encountered: ${e.message?.slice(0, 80) || 'Unknown error'}`, '4. Graceful fallback activated', '5. Suggested remediation steps generated'],
          };
        }
      }
    }

    setChatHistory(prev => [...prev, {
      role: 'assistant',
      persona: activePersona,
      result,
      timestamp: new Date().toLocaleTimeString(),
    }]);
    setLoading(false);
  };

  const color = activePersona.avatarColor || '#00e5ff';
  const starters = STARTER_QUESTIONS[activePersona.id] || STARTER_QUESTIONS.cfo;

  return (
    <div className="flex h-full overflow-hidden">

      {/* ── Persona Sidebar ───────────────────────────────────────────────────── */}
      <div className="w-56 border-r border-white/8 overflow-y-auto p-3 flex-shrink-0 space-y-1.5">
        <div className="flex items-center justify-between mb-2 px-1">
          <span className="text-xs text-white/25 uppercase tracking-widest font-semibold">Analysts</span>
        </div>
        {personas.map(p => (
          <AgentProfileCard key={p.id} persona={p} active={activePersona.id === p.id}
            onClick={() => { setActivePersona(p); setChatHistory([]); }} />
        ))}
      </div>

      {/* ── Main Area ─────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">

        {/* Tab bar + active persona indicator */}
        <div className="flex items-center gap-1 px-4 py-2.5 border-b border-white/8 flex-shrink-0">
          <div className="flex gap-0.5 p-1 bg-white/5 rounded-xl border border-white/8">
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${tab === t.id ? 'text-white' : 'text-white/35 hover:text-white/65'}`}
                style={tab === t.id ? { background: `${color}22`, color } : {}}>
                <t.icon className="w-3.5 h-3.5" /> {t.label}
              </button>
            ))}
          </div>
          <div className="ml-3 flex items-center gap-2">
            <div className="w-5 h-5 rounded-lg flex items-center justify-center text-xs font-black"
              style={{ background: `${color}22`, color }}>
              {activePersona.name[0]}
            </div>
            <span className="text-xs font-bold" style={{ color }}>{activePersona.name}</span>
            <span className="text-xs text-white/25">&middot; {activePersona.role}</span>
            {activeTable && <span className="text-xs text-white/20">&middot; {activeTable.name}</span>}
          </div>
          {tab === 'chat' && chatHistory.length > 0 && (
            <button onClick={() => setChatHistory([])} className="ml-auto p-1.5 text-white/20 hover:text-white/55 transition-colors" title="Clear chat">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* ── Pipeline tab ── */}
        {tab === 'pipeline' && (
          <div className="flex-1 overflow-y-auto p-5">
            <AgentPipelineBuilderV2 activeTable={activeTable} activePersona={activePersona} />
          </div>
        )}

        {/* ── Executive Summary tab ── */}
        {tab === 'executive' && (
          <ExecutiveSummaryTab activeTable={activeTable} />
        )}

        {/* ── Tasks tab ── */}
        {tab === 'tasks' && (
          <div className="flex-1 overflow-y-auto p-5">
            <AgentTaskBoardV2 personas={personas} activeTable={activeTable} />
          </div>
        )}

        {/* ── Chat / War Room tab ── */}
        {tab === 'chat' && (
          <div className="flex-1 flex flex-col overflow-hidden">

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-5">
              {chatHistory.length === 0 && (
                <div className="space-y-5 py-4">
                  {/* Agent intro */}
                  <div className="flex items-center gap-3 p-4 rounded-2xl border"
                    style={{ background: `${color}08`, borderColor: `${color}20` }}>
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl font-black flex-shrink-0"
                      style={{ background: `${color}18`, color }}>
                      {activePersona.name[0]}
                    </div>
                    <div>
                      <div className="font-bold text-sm" style={{ color }}>{activePersona.name}</div>
                      <div className="text-xs text-white/40">{activePersona.role}</div>
                      <div className="text-xs text-white/30 mt-1">
                        Senior analyst using F-D-E-A-R: Frame → Diagnose → Explain → Act → Review
                      </div>
                    </div>
                  </div>

                  {/* Starter questions */}
                  <div>
                    <div className="text-xs text-white/25 mb-2 px-1">Starter questions</div>
                    <div className="grid grid-cols-1 gap-2">
                      {starters.map(q => (
                        <button key={q} onClick={() => handleSend(q)} disabled={loading}
                          className="text-left text-xs p-3 rounded-xl bg-white/3 border border-white/7 hover:border-white/15 hover:bg-white/5 transition-all text-white/55 hover:text-white/80 disabled:opacity-40">
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <AnimatePresence>
                {chatHistory.map((msg, i) => (
                  <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} gap-2.5`}>
                    {msg.role === 'assistant' && (
                      <div className="w-7 h-7 rounded-xl flex items-center justify-center text-xs font-black flex-shrink-0 mt-1"
                        style={{ background: `${msg.persona?.avatarColor || color}20`, color: msg.persona?.avatarColor || color }}>
                        {(msg.persona?.name || 'A')[0]}
                      </div>
                    )}
                    <div className={`max-w-[82%] ${msg.role === 'user' ? '' : 'w-full'}`}>
                      {msg.role === 'user' ? (
                        <div className="px-4 py-2.5 rounded-2xl bg-white/8 border border-white/10">
                          <p className="text-sm text-white/85">{msg.content}</p>
                        </div>
                      ) : (
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-xs font-bold" style={{ color: msg.persona?.avatarColor || color }}>
                              {msg.persona?.name}
                            </span>
                            <span className="text-xs text-white/20">{msg.timestamp}</span>
                            {msg.result?.intent && (
                              <span className="text-xs px-1.5 py-0.5 rounded-full bg-white/5 border border-white/8 text-white/30 capitalize">
                                {msg.result.intent}
                              </span>
                            )}
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
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-2.5">
                  <div className="w-7 h-7 rounded-xl flex items-center justify-center text-xs font-black flex-shrink-0"
                    style={{ background: `${color}20`, color }}>
                    {activePersona.name[0]}
                  </div>
                  <div className="glass-card rounded-2xl px-4 py-3 border border-white/8">
                    <div className="flex items-center gap-2 text-xs text-white/40">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color }} />
                      <span>Running F-D-E-A-R analysis pipeline…</span>
                    </div>
                    <div className="flex gap-1.5 mt-2 flex-wrap">
                      {['Intent Classifier','Data Context','SQL Agent','Anomaly Detector','Strategy Agent','Report Writer'].map((s, i) => (
                        <motion.span key={s} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.3 }}
                          className="text-xs px-1.5 py-0.5 rounded-full bg-white/5 border border-white/8 text-white/30">
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
            <div className="px-4 py-3 border-t border-white/5 flex-shrink-0">
              <div className="flex gap-2 items-end">
                <textarea value={input} onChange={e => setInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                  placeholder={`Ask ${activePersona.name} — uses F-D-E-A-R reasoning loop with your data…`}
                  rows={1} disabled={loading}
                  className="flex-1 bg-white/[0.04] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm placeholder:text-white/20 focus:outline-none focus:border-white/20 resize-none transition-all disabled:opacity-50"
                  style={{ minHeight: 42, maxHeight: 110 }} />
                <button onClick={() => handleSend()} disabled={!input.trim() || loading}
                  className="w-10 h-10 rounded-xl flex items-center justify-center transition-all disabled:opacity-30 flex-shrink-0"
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