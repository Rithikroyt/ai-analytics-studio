/**
 * Observability Center — Production AI Monitoring
 * Tracks: agent traces, answer quality, latency, SQL success rate, tool calls
 * Admin only
 */
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import {
  Activity, Brain, Zap, Clock, CheckCircle2, AlertTriangle,
  TrendingUp, BarChart2, RefreshCw, Loader2, Lock, ChevronLeft,
  Database, Target, AlertCircle
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

const QUALITY_FORMULA = '0.25 × Relevance + 0.25 × Evidence + 0.20 × Completeness + 0.15 × Actionability + 0.15 × Clarity';

function MetricCard({ label, value, unit = '', color = 'text-cyan-400', sub }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/2 p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs text-white/40 uppercase tracking-widest">{label}</span>
      </div>
      <div className={`text-2xl font-black ${color}`}>{value}{unit}</div>
      {sub && <div className="text-xs text-white/30 mt-1">{sub}</div>}
    </div>
  );
}

export default function ObservabilityCenter() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('overview');

  const load = async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke('runObservability', { action: 'dashboard' });
      setData(res.data);
    } catch (e) {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  if (!user || (user.role !== 'admin' && !['rthati1@asu.edu','thatirithikroy@gmail.com'].includes(user.email?.toLowerCase()))) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-red-400/10 border border-red-400/20 flex items-center justify-center mx-auto">
            <Lock className="w-8 h-8 text-red-400" />
          </div>
          <h2 className="text-xl font-bold">Access Denied</h2>
          <p className="text-sm text-muted-foreground">Admin access required.</p>
        </div>
      </div>
    );
  }

  const TABS = [
    { id: 'overview', label: 'Overview', icon: BarChart2 },
    { id: 'agents', label: 'Agent Metrics', icon: Brain },
    { id: 'traces', label: 'Recent Traces', icon: Activity },
    { id: 'pipelines', label: 'Pipelines', icon: Database },
  ];

  const s = data?.summary || {};

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-white/8 px-8 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/admin" className="p-1.5 rounded-lg text-white/30 hover:text-white/70 hover:bg-white/5 transition-all">
            <ChevronLeft className="w-4 h-4" />
          </Link>
          <div className="w-10 h-10 rounded-xl bg-cyan-400/10 border border-cyan-400/20 flex items-center justify-center">
            <Activity className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <h1 className="text-xl font-black">Observability Center</h1>
            <p className="text-xs text-muted-foreground">Production AI monitoring · Agent traces · Answer quality · Pipeline health</p>
          </div>
        </div>
        <button onClick={load} disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white/40 hover:text-white/70 transition-all disabled:opacity-40">
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-white/8 px-8 flex gap-0.5">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-3 text-xs font-semibold whitespace-nowrap border-b-2 transition-all ${tab === t.id ? 'border-cyan-400 text-cyan-400' : 'border-transparent text-white/35 hover:text-white/65'}`}>
            <t.icon className="w-3.5 h-3.5" />{t.label}
          </button>
        ))}
      </div>

      <div className="p-8">
        {loading && !data && (
          <div className="flex items-center justify-center py-24">
            <div className="text-center space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-cyan-400 mx-auto" />
              <p className="text-sm text-white/40">Loading observability data…</p>
            </div>
          </div>
        )}

        {data && (
          <motion.div key={tab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
            {tab === 'overview' && (
              <div className="space-y-6">
                {/* Quality formula */}
                <div className="px-4 py-3 rounded-xl bg-cyan-400/5 border border-cyan-400/15 text-xs text-cyan-400 font-mono">
                  Answer Quality = {QUALITY_FORMULA}
                </div>

                {/* Metric cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <MetricCard label="Total Traces" value={s.totalTraces || 0} color="text-purple-400" />
                  <MetricCard label="Avg Answer Quality" value={s.avgAnswerQuality || 0} unit="%" color="text-cyan-400" sub="0.25×Relevance + 0.25×Evidence…" />
                  <MetricCard label="Avg Latency" value={s.avgLatencyMs || 0} unit="ms" color="text-amber-400" />
                  <MetricCard label="SQL Success Rate" value={s.sqlSuccessRate || 0} unit="%" color="text-green-400" />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <MetricCard label="High Confidence" value={s.highConfidenceAnswers || 0} color="text-green-400" sub="≥70% confidence" />
                  <MetricCard label="Low Confidence" value={s.lowConfidenceAnswers || 0} color="text-red-400" sub="<50% confidence" />
                  <MetricCard label="Pipeline Success" value={s.pipelineSuccessRate || 0} unit="%" color="text-teal-400" />
                  <MetricCard label="Unresolved Errors" value={s.recentErrors || 0} color="text-red-400" />
                </div>

                {/* Daily trends */}
                {data.dailyTrends?.length > 0 && (
                  <div className="rounded-2xl border border-white/8 bg-white/2 p-5">
                    <h3 className="text-sm font-semibold text-white/60 uppercase tracking-widest mb-4">Daily Answer Quality Trend</h3>
                    <ResponsiveContainer width="100%" height={200}>
                      <LineChart data={data.dailyTrends}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                        <XAxis dataKey="date" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }} />
                        <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }} domain={[0, 100]} />
                        <Tooltip contentStyle={{ background: 'hsl(222,44%,9%)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12 }} labelStyle={{ color: 'rgba(255,255,255,0.7)' }} />
                        <Line type="monotone" dataKey="avgQuality" stroke="#00e5ff" strokeWidth={2} dot={false} name="Avg Quality %" />
                        <Line type="monotone" dataKey="count" stroke="rgba(255,255,255,0.2)" strokeWidth={1} dot={false} name="Traces" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            )}

            {tab === 'agents' && (
              <div className="space-y-4">
                {data.agentMetrics?.length === 0 ? (
                  <div className="text-center py-16 text-sm text-white/30">No agent traces recorded yet</div>
                ) : (
                  <div className="rounded-2xl border border-white/8 bg-white/1 overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-white/8">
                          {['Agent','Queries','Avg Quality','Avg Latency'].map(h => (
                            <th key={h} className="text-left px-4 py-3 text-xs text-white/30 uppercase tracking-widest font-semibold">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {data.agentMetrics.map((m, i) => (
                          <tr key={i} className="border-b border-white/5 hover:bg-white/2 transition-all">
                            <td className="px-4 py-3 font-semibold text-cyan-400">{m.agent}</td>
                            <td className="px-4 py-3 text-white/60">{m.count}</td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <div className="flex-1 h-1.5 rounded-full bg-white/8 max-w-20">
                                  <div className="h-full rounded-full bg-cyan-400" style={{ width: `${m.avgQuality}%` }} />
                                </div>
                                <span className="text-white/70">{m.avgQuality}%</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-white/60 font-mono">{m.avgLatencyMs}ms</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {tab === 'traces' && (
              <div className="space-y-3">
                {data.recentTraces?.length === 0 ? (
                  <div className="text-center py-16 text-sm text-white/30">No traces yet</div>
                ) : (
                  data.recentTraces.map((t, i) => (
                    <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
                      className="p-4 rounded-2xl border border-white/8 bg-white/1 flex items-start gap-4">
                      <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${t.quality >= 70 ? 'bg-green-400' : t.quality >= 40 ? 'bg-amber-400' : 'bg-red-400'}`} />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-white/80 truncate">{t.question}</div>
                        <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                          <span className="text-xs text-purple-400">{t.agent}</span>
                          <span className="text-xs text-white/25">Quality: {t.quality}%</span>
                          <span className="text-xs text-white/25">Confidence: {t.confidence}%</span>
                          <span className="text-xs text-white/25 font-mono">{t.latency}ms</span>
                          <span className="text-xs text-white/20">{t.timestamp ? new Date(t.timestamp).toLocaleString() : ''}</span>
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            )}

            {tab === 'pipelines' && (
              <div className="space-y-3">
                {data.pipelineRuns?.length === 0 ? (
                  <div className="text-center py-16 text-sm text-white/30">No pipeline runs yet</div>
                ) : (
                  data.pipelineRuns.map((run, i) => (
                    <div key={i} className="p-4 rounded-2xl border border-white/8 bg-white/1 flex items-center gap-4">
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${run.status === 'success' ? 'bg-green-400' : run.status === 'failed' ? 'bg-red-400' : 'bg-amber-400'}`} />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-white/80">{run.pipelineName}</div>
                        <div className="text-xs text-white/30 mt-0.5">{run.status} · {run.durationMs}ms · {run.created_date ? new Date(run.created_date).toLocaleString() : ''}</div>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full border ${run.status === 'success' ? 'text-green-400 border-green-400/20 bg-green-400/10' : 'text-red-400 border-red-400/20 bg-red-400/10'}`}>{run.status}</span>
                    </div>
                  ))
                )}
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}