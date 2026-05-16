/**
 * AI Command Center — Phase 3: Proactive CXO Intelligence Hub
 * Real-time AI monitoring, proactive insights, alerts, and strategic recommendations
 * Think: Microsoft Copilot + IBM Watson + Amazon QuickSight Q combined
 */
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useWorkspaceStore } from '@/lib/store';
import {
  Brain, Zap, TrendingUp, TrendingDown, AlertTriangle, CheckCircle2,
  Target, Activity, RefreshCw, Sparkles, ChevronRight, BarChart2,
  DollarSign, Users, Shield, Clock, ArrowUpRight, ArrowDownRight,
  Loader2, Send, Bell, Filter, Star, BookOpen, X
} from 'lucide-react';
import { Link } from 'react-router-dom';

const SIGNAL_TYPES = {
  anomaly:        { color: '#ef4444', bg: 'bg-red-400/10',    border: 'border-red-400/20',    icon: AlertTriangle, label: 'Anomaly' },
  opportunity:    { color: '#4caf50', bg: 'bg-green-400/10',  border: 'border-green-400/20',  icon: TrendingUp,    label: 'Opportunity' },
  risk:           { color: '#ffcc02', bg: 'bg-amber-400/10',  border: 'border-amber-400/20',  icon: Shield,        label: 'Risk' },
  insight:        { color: '#00e5ff', bg: 'bg-cyan-400/10',   border: 'border-cyan-400/20',   icon: Sparkles,      label: 'Insight' },
  forecast:       { color: '#a855f7', bg: 'bg-purple-400/10', border: 'border-purple-400/20', icon: Target,        label: 'Forecast' },
  recommendation: { color: '#ff6b35', bg: 'bg-orange-400/10', border: 'border-orange-400/20', icon: Star,          label: 'Action' },
};

const DEMO_SIGNALS = [
  { type: 'anomaly', title: 'Revenue spike detected', desc: 'Q4 Enterprise revenue is 34% above forecast — confirm data integrity or capitalize on momentum.', confidence: 92, kpi: 'Revenue', urgency: 'immediate', time: '2 min ago' },
  { type: 'risk', title: 'SMB churn rate elevated', desc: 'Churn rate for SMB accounts <90 days old has risen 2.1× in the past 30 days. Recommend proactive outreach.', confidence: 88, kpi: 'Churn Rate', urgency: 'this_week', time: '8 min ago' },
  { type: 'opportunity', title: 'Enterprise upsell window', desc: 'Enterprise accounts with >6 months tenure and NPS >70 show 3.2× higher upgrade probability right now.', confidence: 81, kpi: 'LTV', urgency: 'this_week', time: '15 min ago' },
  { type: 'forecast', title: 'Q1 target achievable at 78%', desc: 'Linear trajectory predicts $5.2M vs $6.7M target. Closing 12 identified pipeline deals would close the gap.', confidence: 76, kpi: 'Revenue Forecast', urgency: 'this_month', time: '1 hr ago' },
  { type: 'insight', title: 'Marketing → Sales conversion lagging', desc: 'MQL-to-SQL conversion dropped 18% this month. Top cause: Demo scheduling delay >3 days.', confidence: 84, kpi: 'Conversion Rate', urgency: 'this_week', time: '2 hr ago' },
  { type: 'recommendation', title: 'Automate payroll reconciliation', desc: 'Manual payroll processing costs ~$14K/mo in analyst hours. Automation ROI payback is 1.8 months.', confidence: 91, kpi: 'Operational Cost', urgency: 'backlog', time: '4 hr ago' },
];

const KPI_GRID = [
  { label: 'ARR', value: '$4.82M', change: '+18.4%', up: true,  color: '#00e5ff', icon: DollarSign },
  { label: 'Net Churn', value: '3.8%',   change: '-1.2%', up: false, color: '#4caf50', icon: TrendingDown },
  { label: 'NRR',      value: '118%',  change: '+4pts', up: true,  color: '#a855f7', icon: TrendingUp },
  { label: 'CAC',      value: '$1,240', change: '-8.3%', up: false, color: '#00bfa5', icon: Users },
  { label: 'LTV/CAC',  value: '6.2×',  change: '+0.8×', up: true,  color: '#ffcc02', icon: Target },
  { label: 'GM %',     value: '71.4%', change: '+1.9%', up: true,  color: '#ff6b35', icon: BarChart2 },
  { label: 'Runway',   value: '18mo',  change: '+2mo',  up: true,  color: '#60a5fa', icon: Clock },
  { label: 'NPS',      value: '72',    change: '+4pts', up: true,  color: '#f472b6', icon: Star },
];

function SignalCard({ signal, onAsk }) {
  const meta = SIGNAL_TYPES[signal.type] || SIGNAL_TYPES.insight;
  const Icon = meta.icon;
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className={`glass-card rounded-2xl p-4 border ${meta.border} hover:scale-[1.01] transition-all group`}>
      <div className="flex items-start gap-3">
        <div className={`w-8 h-8 rounded-xl ${meta.bg} border ${meta.border} flex items-center justify-center flex-shrink-0`}>
          <Icon className="w-4 h-4" style={{ color: meta.color }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-xs font-bold" style={{ color: meta.color }}>{meta.label}</span>
            <span className="text-xs text-white/20">{signal.time}</span>
            <span className="text-xs px-1.5 py-0.5 rounded-full bg-white/5 border border-white/8 text-white/30">
              {signal.confidence}% confidence
            </span>
          </div>
          <h4 className="text-sm font-bold mb-1 text-white/90">{signal.title}</h4>
          <p className="text-xs text-white/50 leading-relaxed">{signal.desc}</p>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs text-white/25">KPI: <span className="text-white/45">{signal.kpi}</span></span>
            <button onClick={() => onAsk(signal.title)} className="ml-auto text-xs px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-white/40 hover:text-white/70 hover:bg-white/8 transition-all flex items-center gap-1">
              Ask AI <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function MiniChat({ initialQ }) {
  const { getActiveTable } = useWorkspaceStore();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState(initialQ || '');
  const [loading, setLoading] = useState(false);
  const endRef = useRef(null);
  const table = getActiveTable();

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, loading]);
  useEffect(() => { if (initialQ) { setInput(initialQ); } }, [initialQ]);

  const send = async (text) => {
    const q = (text || input).trim();
    if (!q || loading) return;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: q }]);
    setLoading(true);
    try {
      const res = await base44.functions.invoke('runAgentOrchestrator', {
        question: q,
        persona: { id: 'cfo', name: 'CXO Advisor', avatarColor: '#00e5ff' },
        tableContext: table ? { name: table.name, rowCount: table.rowCount || table.rows?.length, columns: table.columns?.slice(0, 20), rows: table.rows?.slice(0, 40) } : null,
        pipelinePreset: 'executive_brief',
      });
      const r = res.data;
      setMessages(prev => [...prev, { role: 'assistant', content: r?.direct_answer || 'Analysis complete.', takeaways: r?.key_takeaways, confidence: r?.confidence_score }]);
    } catch (e) {
      setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${e.message}`, takeaways: [], confidence: 0 }]);
    }
    setLoading(false);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
        {messages.length === 0 && (
          <div className="text-center py-8 text-white/25 text-sm">
            <Brain className="w-8 h-8 mx-auto mb-2 opacity-30" />
            Ask any strategic question about your business.
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {m.role === 'user' ? (
              <div className="max-w-[80%] px-3 py-2 rounded-xl bg-white/8 border border-white/10 text-sm text-white/80">{m.content}</div>
            ) : (
              <div className="max-w-[90%] space-y-2">
                <div className="px-3 py-2.5 rounded-xl bg-cyan-400/5 border border-cyan-400/15 text-sm text-white/75 leading-relaxed">{m.content}</div>
                {m.takeaways?.length > 0 && (
                  <div className="space-y-1">
                    {m.takeaways.slice(0,3).map((t, j) => (
                      <div key={j} className="flex items-start gap-2 text-xs text-white/45 px-1">
                        <CheckCircle2 className="w-3 h-3 text-cyan-400 flex-shrink-0 mt-0.5" />
                        {t}
                      </div>
                    ))}
                  </div>
                )}
                {m.confidence > 0 && <div className="text-xs text-white/20 px-1">{m.confidence}% confidence</div>}
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div className="flex items-center gap-2 text-xs text-white/35">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" /> Analyzing with CXO Advisor…
          </div>
        )}
        <div ref={endRef} />
      </div>
      <div className="p-3 border-t border-white/8 flex gap-2">
        <input value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
          placeholder="Ask a strategic question…"
          className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white/80 placeholder:text-white/20 focus:outline-none focus:border-cyan-400/30" />
        <button onClick={() => send()} disabled={!input.trim() || loading}
          className="w-9 h-9 rounded-xl bg-cyan-400/15 border border-cyan-400/25 text-cyan-400 flex items-center justify-center disabled:opacity-30 hover:bg-cyan-400/25 transition-all">
          <Send className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

export default function AICommandCenter() {
  const [filter, setFilter] = useState('all');
  const [chatQ, setChatQ] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [signals, setSignals] = useState(DEMO_SIGNALS);

  const filtered = filter === 'all' ? signals : signals.filter(s => s.type === filter);

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1400);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-white/8 px-8 py-5 flex items-center justify-between"
        style={{ background: 'linear-gradient(135deg, rgba(0,229,255,0.05) 0%, rgba(168,85,247,0.04) 100%)' }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-400/15 border border-cyan-400/25 flex items-center justify-center">
            <Brain className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <h1 className="text-xl font-black">AI Command Center</h1>
            <p className="text-xs text-muted-foreground">Proactive intelligence · Real-time signals · CXO-level strategic insights</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleRefresh}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white/40 hover:text-white/70 transition-all">
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
          </button>
          <Link to="/agent-studio"
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cyan-400 text-xs font-bold hover:bg-cyan-300 transition-all"
            style={{ color: 'hsl(222,47%,6%)' }}>
            <Zap className="w-3.5 h-3.5" /> Agent Studio
          </Link>
        </div>
      </div>

      <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
        {/* KPI Strip */}
        <div className="grid grid-cols-4 md:grid-cols-8 gap-3">
          {KPI_GRID.map(k => (
            <motion.div key={k.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className="glass-card rounded-xl p-3 border border-white/8 text-center hover:border-white/15 transition-all group cursor-default">
              <k.icon className="w-3.5 h-3.5 mx-auto mb-1.5" style={{ color: k.color }} />
              <div className="text-xs text-white/35 mb-0.5">{k.label}</div>
              <div className="text-sm font-black font-mono" style={{ color: k.color }}>{k.value}</div>
              <div className={`text-xs mt-0.5 font-semibold flex items-center justify-center gap-0.5 ${k.up ? 'text-green-400' : 'text-red-400'}`}>
                {k.up ? <ArrowUpRight className="w-2.5 h-2.5" /> : <ArrowDownRight className="w-2.5 h-2.5" />}
                {k.change}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Main grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Signals Feed */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-amber-400" />
                <h2 className="font-bold text-sm">Live Intelligence Feed</h2>
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-400/10 border border-amber-400/20 text-amber-400">{filtered.length} signals</span>
              </div>
              <div className="flex items-center gap-1">
                {['all', 'anomaly', 'risk', 'opportunity', 'forecast', 'insight', 'recommendation'].map(f => (
                  <button key={f} onClick={() => setFilter(f)}
                    className={`text-xs px-2.5 py-1 rounded-lg capitalize transition-all ${filter === f ? 'bg-white/10 text-white/80 border border-white/15' : 'text-white/30 hover:text-white/60'}`}>
                    {f === 'all' ? 'All' : f}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-3">
              {filtered.map((s, i) => (
                <SignalCard key={i} signal={s} onAsk={(title) => setChatQ(`Tell me more about: ${title}`)} />
              ))}
            </div>
          </div>

          {/* CXO Chat */}
          <div className="glass-card rounded-2xl border border-white/8 flex flex-col" style={{ height: 580 }}>
            <div className="px-4 py-3 border-b border-white/8 flex items-center gap-2 flex-shrink-0">
              <Brain className="w-4 h-4 text-cyan-400" />
              <span className="text-sm font-bold">CXO Advisor</span>
              <div className="w-1.5 h-1.5 rounded-full bg-green-400 ml-auto animate-pulse" />
            </div>
            <div className="flex-1 min-h-0">
              <MiniChat initialQ={chatQ} />
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { icon: BarChart2, label: 'Visual Builder', desc: 'Build charts from data', to: '/workspace', color: '#00e5ff' },
            { icon: BookOpen, label: 'Decision Reports', desc: 'AI-generated executive reports', to: '/decision-reports', color: '#a855f7' },
            { icon: Target, label: 'Agent Studio', desc: 'Multi-agent war room', to: '/agent-studio', color: '#ff6b35' },
            { icon: Activity, label: 'ML Workbench', desc: 'Train predictive models', to: '/ml-workbench', color: '#4caf50' },
          ].map(a => (
            <Link key={a.label} to={a.to}
              className="glass-card rounded-2xl p-4 border border-white/8 hover:border-white/18 hover:scale-[1.01] transition-all group flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${a.color}15`, border: `1px solid ${a.color}25` }}>
                <a.icon className="w-4 h-4" style={{ color: a.color }} />
              </div>
              <div>
                <div className="text-sm font-bold">{a.label}</div>
                <div className="text-xs text-white/35">{a.desc}</div>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-white/20 ml-auto group-hover:text-white/50 transition-colors" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}