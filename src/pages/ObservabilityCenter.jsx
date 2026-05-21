/**
 * Observability Center — Phase 4 Full Upgrade
 * Usage · Agent Quality · SQL Monitoring · Data Quality · Reports · Pipelines
 * Admin only
 */
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import {
  Activity, Brain, Zap, Clock, CheckCircle2, AlertTriangle,
  TrendingUp, BarChart2, RefreshCw, Loader2, Lock, ChevronLeft,
  Database, Target, AlertCircle, Users, FileText, GitMerge, Shield,
  XCircle, Eye
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell } from 'recharts';
import ObservabilityDashboard from '@/components/observability/ObservabilityDashboard';

const ADMIN_EMAILS = ['rthati1@asu.edu', 'thatirithikroy@gmail.com'];
const COLORS = ['#00e5ff', '#4ade80', '#f59e0b', '#f87171', '#a855f7'];

function MetricCard({ label, value, unit = '', color = 'text-cyan-400', sub, icon: Icon }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/2 p-4">
      <div className="flex items-center gap-2 mb-2">
        {Icon && <Icon className={`w-4 h-4 ${color}`} />}
        <span className="text-xs text-white/40 uppercase tracking-widest">{label}</span>
      </div>
      <div className={`text-2xl font-black ${color}`}>{value}{unit}</div>
      {sub && <div className="text-xs text-white/30 mt-1">{sub}</div>}
    </div>
  );
}

function SectionHeader({ title, icon: Icon, color = 'text-cyan-400' }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <Icon className={`w-4 h-4 ${color}`} />
      <h2 className="text-sm font-bold text-white/70 uppercase tracking-widest">{title}</h2>
    </div>
  );
}

export default function ObservabilityCenter() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('usage');
  const [traces, setTraces] = useState([]);
  const [pipelineRuns, setPipelineRuns] = useState([]);
  const [benchmarks, setBenchmarks] = useState([]);

  const isAdmin = user && (
    (user.role || '').toLowerCase() === 'admin' ||
    ADMIN_EMAILS.includes((user.email || '').toLowerCase())
  );

  const load = async () => {
    setLoading(true);
    try {
      const [obsRes, tracesData, runsData, benchData] = await Promise.all([
        base44.functions.invoke('runObservability', { action: 'dashboard' }),
        base44.entities.AgentTrace.list('-created_date', 50).catch(() => []),
        base44.entities.PipelineRun.list('-created_date', 20).catch(() => []),
        base44.entities.AgentBenchmark.list('-created_date', 20).catch(() => []),
      ]);
      setData(obsRes.data);
      setTraces(tracesData);
      setPipelineRuns(runsData);
      setBenchmarks(benchData);
    } catch (e) {}
    setLoading(false);
  };

  useEffect(() => { if (isAdmin) load(); }, [isAdmin]);

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-red-400/10 border border-red-400/20 flex items-center justify-center mx-auto">
            <Lock className="w-8 h-8 text-red-400" />
          </div>
          <h2 className="text-xl font-bold">Access Denied</h2>
          <p className="text-sm text-muted-foreground">Admin access required.</p>
          <Link to="/" className="text-cyan-400 text-sm hover:underline">← Go Home</Link>
        </div>
      </div>
    );
  }

  const TABS = [
    { id: 'usage',      label: 'Usage Overview',      icon: Users },
    { id: 'agents',     label: 'Agent Quality',        icon: Brain },
    { id: 'sql',        label: 'SQL Monitoring',        icon: Database },
    { id: 'dataquality',label: 'Data Quality',          icon: Shield },
    { id: 'reports',    label: 'Reports',               icon: FileText },
    { id: 'pipelines',  label: 'Pipelines',             icon: GitMerge },
    { id: 'live',       label: 'Live Traces',           icon: Activity },
    { id: 'benchmarks', label: 'Benchmarks',            icon: Target },
  ];

  const s = data?.summary || {};

  // Derived stats
  const passRate = benchmarks.length > 0
    ? Math.round(benchmarks.filter(b => b.regressionStatus === 'pass').length / benchmarks.length * 100)
    : 0;
  const pipelineSuccessRate = pipelineRuns.length > 0
    ? Math.round(pipelineRuns.filter(r => r.status === 'success').length / pipelineRuns.length * 100)
    : 0;
  const lowConfidenceTraces = traces.filter(t => (t.confidenceScore || 0) < 50);
  const avgLatency = traces.length > 0
    ? Math.round(traces.reduce((a, b) => a + (b.durationMs || 0), 0) / traces.length)
    : 0;

  // Agent persona breakdown
  const agentBreakdown = Object.entries(
    traces.reduce((acc, t) => { acc[t.agentName || 'Unknown'] = (acc[t.agentName || 'Unknown'] || 0) + 1; return acc; }, {})
  ).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="border-b border-white/8 px-8 py-5 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <Link to="/admin" className="p-1.5 rounded-lg text-white/30 hover:text-white/70 hover:bg-white/5 transition-all">
            <ChevronLeft className="w-4 h-4" />
          </Link>
          <div className="w-10 h-10 rounded-xl bg-cyan-400/10 border border-cyan-400/20 flex items-center justify-center">
            <Activity className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <h1 className="text-xl font-black">Observability Center</h1>
            <p className="text-xs text-muted-foreground">Usage · Agent Quality · SQL · Data Quality · Reports · Pipelines</p>
          </div>
        </div>
        <button onClick={load} disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white/40 hover:text-white/70 transition-all disabled:opacity-40">
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-white/8 px-8 flex gap-0 overflow-x-auto flex-shrink-0">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-3 text-xs font-semibold whitespace-nowrap border-b-2 transition-all ${tab === t.id ? 'border-cyan-400 text-cyan-400' : 'border-transparent text-white/35 hover:text-white/65'}`}>
            <t.icon className="w-3.5 h-3.5" />{t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-8">
        {loading && !data && (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-8 h-8 animate-spin text-cyan-400 mx-auto" />
          </div>
        )}

        {tab === 'live' && <ObservabilityDashboard />}

        {/* Usage Overview */}
        {tab === 'usage' && (
          <motion.div key="usage" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <SectionHeader title="Usage Overview" icon={Users} />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <MetricCard label="Total AI Questions" value={traces.length} color="text-purple-400" icon={Brain} />
              <MetricCard label="Agent Traces" value={s.totalTraces || traces.length} color="text-cyan-400" icon={Activity} />
              <MetricCard label="Avg Latency" value={avgLatency} unit="ms" color="text-amber-400" icon={Clock} />
              <MetricCard label="Pipeline Runs" value={pipelineRuns.length} color="text-teal-400" icon={GitMerge} />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <MetricCard label="Avg Answer Quality" value={s.avgAnswerQuality || 0} unit="%" color="text-green-400" sub="0.25×Relevance + 0.25×Evidence…" icon={Target} />
              <MetricCard label="SQL Success Rate" value={s.sqlSuccessRate || 0} unit="%" color="text-green-400" icon={Database} />
              <MetricCard label="Low Confidence" value={lowConfidenceTraces.length} color="text-red-400" sub="< 50% confidence" icon={AlertTriangle} />
              <MetricCard label="Benchmark Pass Rate" value={`${passRate}%`} color={passRate >= 70 ? 'text-green-400' : 'text-amber-400'} icon={CheckCircle2} />
            </div>
            {data?.dailyTrends?.length > 0 && (
              <div className="rounded-2xl border border-white/8 bg-white/2 p-5">
                <div className="text-xs text-white/40 uppercase tracking-widest mb-4 font-semibold">Daily Answer Quality Trend</div>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={data.dailyTrends}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                    <XAxis dataKey="date" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} />
                    <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} domain={[0, 100]} />
                    <Tooltip contentStyle={{ background: 'hsl(222,44%,9%)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12 }} />
                    <Line type="monotone" dataKey="avgQuality" stroke="#00e5ff" strokeWidth={2} dot={false} name="Avg Quality %" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </motion.div>
        )}

        {/* Agent Quality */}
        {tab === 'agents' && (
          <motion.div key="agents" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <SectionHeader title="Agent Quality Monitoring" icon={Brain} color="text-purple-400" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <MetricCard label="Avg Confidence" value={traces.length ? Math.round(traces.reduce((a, t) => a + (t.confidenceScore || 0), 0) / traces.length) : 0} unit="%" color="text-cyan-400" icon={Target} />
              <MetricCard label="Avg Quality" value={s.avgAnswerQuality || 0} unit="%" color="text-green-400" icon={CheckCircle2} />
              <MetricCard label="Low Confidence" value={lowConfidenceTraces.length} color="text-red-400" sub="< 50%" icon={AlertTriangle} />
              <MetricCard label="Unique Agents" value={agentBreakdown.length} color="text-purple-400" icon={Brain} />
            </div>

            {/* Agent breakdown */}
            {agentBreakdown.length > 0 && (
              <div className="rounded-2xl border border-white/8 bg-white/2 p-5">
                <div className="text-xs text-white/40 uppercase tracking-widest mb-4 font-semibold">Usage by Persona</div>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={agentBreakdown.slice(0, 8)}>
                    <XAxis dataKey="name" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 9 }} />
                    <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} />
                    <Tooltip contentStyle={{ background: 'hsl(222,44%,9%)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12 }} />
                    <Bar dataKey="count" name="Queries" fill="#a855f7" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Low confidence answers */}
            {lowConfidenceTraces.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs text-white/30 uppercase tracking-widest font-semibold">Low Confidence Answers (&lt; 50%)</div>
                {lowConfidenceTraces.slice(0, 10).map((t, i) => (
                  <div key={i} className="p-3 rounded-xl bg-red-400/5 border border-red-400/15 text-xs">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-red-400/80 font-semibold">{t.agentName}</span>
                      <span className="text-red-400 font-mono">{t.confidenceScore || 0}% confidence</span>
                    </div>
                    <p className="text-white/40 truncate">{t.userQuestion}</p>
                    {t.fallbackReason && <p className="text-white/25 mt-0.5">Reason: {t.fallbackReason}</p>}
                  </div>
                ))}
              </div>
            )}

            {/* Recent traces table */}
            {traces.length > 0 && (
              <div className="rounded-2xl border border-white/8 overflow-hidden">
                <div className="px-4 py-2 bg-white/3 text-xs font-semibold text-white/30 uppercase tracking-widest">Recent Agent Traces</div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead><tr className="border-b border-white/8">
                      {['Agent', 'Question', 'Confidence', 'Quality', 'Latency', 'Time'].map(h => (
                        <th key={h} className="text-left px-3 py-2 text-white/25 font-mono">{h}</th>
                      ))}
                    </tr></thead>
                    <tbody>
                      {traces.slice(0, 15).map((t, i) => (
                        <tr key={i} className="border-b border-white/5 hover:bg-white/2">
                          <td className="px-3 py-2 text-purple-400/80 font-semibold">{t.agentName}</td>
                          <td className="px-3 py-2 text-white/50 max-w-xs truncate">{t.userQuestion}</td>
                          <td className={`px-3 py-2 font-mono ${(t.confidenceScore || 0) >= 70 ? 'text-green-400' : (t.confidenceScore || 0) >= 50 ? 'text-amber-400' : 'text-red-400'}`}>{t.confidenceScore || 0}%</td>
                          <td className={`px-3 py-2 font-mono ${(t.answerQualityScore || 0) >= 70 ? 'text-green-400' : 'text-amber-400'}`}>{t.answerQualityScore || 0}%</td>
                          <td className="px-3 py-2 font-mono text-white/40">{t.durationMs || 0}ms</td>
                          <td className="px-3 py-2 text-white/25">{t.created_date ? new Date(t.created_date).toLocaleString() : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* SQL Monitoring */}
        {tab === 'sql' && (
          <motion.div key="sql" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <SectionHeader title="SQL Query Monitoring" icon={Database} color="text-green-400" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <MetricCard label="SQL Success Rate" value={s.sqlSuccessRate || 0} unit="%" color="text-green-400" icon={CheckCircle2} />
              <MetricCard label="SQL Generated" value={traces.filter(t => t.sqlGenerated).length} color="text-cyan-400" icon={Database} />
              <MetricCard label="SQL Failures" value={traces.filter(t => t.sqlSuccess === false).length} color="text-red-400" icon={XCircle} />
              <MetricCard label="Avg Latency" value={avgLatency} unit="ms" color="text-amber-400" icon={Clock} />
            </div>
            <div className="p-4 rounded-xl bg-cyan-400/5 border border-cyan-400/15 text-xs">
              <div className="text-cyan-400 font-semibold mb-2">SQL Safety Rules Active</div>
              <div className="grid grid-cols-2 gap-2 text-white/50">
                <div>✓ Blocks INSERT / UPDATE / DELETE / DROP</div>
                <div>✓ Never SUMs ID, rank, age, zip fields</div>
                <div>✓ Requires SELECT before execution</div>
                <div>✓ LIMIT enforced on all queries</div>
                <div>✓ Payroll/cost column protection</div>
                <div>✓ Non-additive metric flagging</div>
              </div>
            </div>
            {/* SQL traces */}
            {traces.filter(t => t.sqlGenerated).length > 0 ? (
              <div className="rounded-2xl border border-white/8 overflow-hidden">
                <div className="px-4 py-2 bg-white/3 text-xs font-semibold text-white/30 uppercase tracking-widest">Generated SQL Log</div>
                <div className="divide-y divide-white/5">
                  {traces.filter(t => t.sqlGenerated).slice(0, 10).map((t, i) => (
                    <div key={i} className="px-4 py-3 hover:bg-white/2">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${t.sqlSuccess !== false ? 'bg-green-400' : 'bg-red-400'}`} />
                        <span className="text-xs text-white/50 truncate">{t.userQuestion}</span>
                        <span className="text-xs text-white/25 ml-auto">{t.agentName}</span>
                      </div>
                      <code className="text-xs text-green-400/60 font-mono block bg-black/20 rounded px-2 py-1 truncate">{t.sqlGenerated?.slice(0, 120)}</code>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-white/25 text-sm">No SQL generated yet.</div>
            )}
          </motion.div>
        )}

        {/* Data Quality */}
        {tab === 'dataquality' && (
          <motion.div key="dq" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <SectionHeader title="Data Quality Monitoring" icon={Shield} color="text-amber-400" />
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <MetricCard label="Avg Quality Score" value={s.avgQualityScore || 0} unit="%" color="text-green-400" icon={Shield} sub="Completeness+Validity+Uniqueness" />
              <MetricCard label="Avg Readiness" value={s.avgReadinessScore || 0} unit="%" color="text-cyan-400" icon={CheckCircle2} />
              <MetricCard label="Data Quality Formula" value="5 Dimensions" color="text-amber-400" icon={Target} sub="C+V+U+C+T weighted" />
            </div>
            <div className="p-4 rounded-xl bg-amber-400/5 border border-amber-400/15 text-xs space-y-1">
              <div className="text-amber-400 font-semibold mb-2">DQ Score Formula</div>
              <div className="font-mono text-white/50">DQScore = 0.25×Completeness + 0.25×Validity + 0.20×Uniqueness + 0.20×Consistency + 0.10×Timeliness</div>
              <div className="font-mono text-white/50">DataReadiness = DQScore × (1 − missingRate) × (1 − duplicateRate)</div>
            </div>
            {data?.dataQualityIssues?.length > 0 ? (
              <div className="space-y-2">
                <div className="text-xs text-white/25 uppercase tracking-widest font-semibold">Recent DQ Issues</div>
                {data.dataQualityIssues.map((issue, i) => (
                  <div key={i} className="p-3 rounded-xl bg-amber-400/5 border border-amber-400/15 text-xs">
                    <div className="flex items-center gap-2"><AlertTriangle className="w-3.5 h-3.5 text-amber-400" /><span className="text-amber-400/80">{issue.dataset}</span></div>
                    <p className="text-white/40 mt-0.5">{issue.issue}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-white/25 text-sm">No data quality issues tracked yet. Upload datasets to populate.</div>
            )}
          </motion.div>
        )}

        {/* Reports */}
        {tab === 'reports' && (
          <motion.div key="reports" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <SectionHeader title="Reports Monitoring" icon={FileText} color="text-orange-400" />
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <MetricCard label="Reports Generated" value={s.reportsGenerated || 0} color="text-orange-400" icon={FileText} />
              <MetricCard label="Failed Reports" value={s.failedReports || 0} color="text-red-400" icon={XCircle} />
              <MetricCard label="Report Templates" value={14} color="text-cyan-400" icon={Eye} sub="Executive · Board · CFO · Growth · Ops · DQ · SQL…" />
            </div>
            <div className="p-4 rounded-xl bg-orange-400/5 border border-orange-400/15 text-xs">
              <div className="text-orange-400 font-semibold mb-2">Available Report Types</div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-1.5 text-white/50">
                {['Executive Summary', 'Board Memo', 'Data Quality Audit', 'SQL Analysis', 'Forecast Report',
                  'RFM Customer', 'Funnel Analysis', 'Cohort Retention', 'Churn Risk', 'Anomaly & Risk',
                  'CFO Financial', 'Growth Report', 'Operations Report', 'Project Documentation'].map(r => (
                  <div key={r} className="text-xs">✓ {r}</div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* Pipelines */}
        {tab === 'pipelines' && (
          <motion.div key="pipelines" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <SectionHeader title="Pipeline Monitoring" icon={GitMerge} color="text-purple-400" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <MetricCard label="Total Runs" value={pipelineRuns.length} color="text-purple-400" icon={GitMerge} />
              <MetricCard label="Success Rate" value={`${pipelineSuccessRate}%`} color={pipelineSuccessRate >= 80 ? 'text-green-400' : 'text-amber-400'} icon={CheckCircle2} />
              <MetricCard label="Failed Runs" value={pipelineRuns.filter(r => r.status === 'failed').length} color="text-red-400" icon={XCircle} />
              <MetricCard label="Avg Duration" value={pipelineRuns.length ? Math.round(pipelineRuns.reduce((a, r) => a + (r.durationMs || 0), 0) / pipelineRuns.length) : 0} unit="ms" color="text-amber-400" icon={Clock} />
            </div>
            {pipelineRuns.length > 0 ? (
              <div className="rounded-2xl border border-white/8 overflow-hidden">
                <div className="px-4 py-2 bg-white/3 text-xs font-semibold text-white/30 uppercase tracking-widest">Pipeline Run History</div>
                <div className="divide-y divide-white/5">
                  {pipelineRuns.slice(0, 15).map((run, i) => (
                    <div key={i} className="flex items-center gap-4 px-4 py-3 hover:bg-white/2">
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${run.status === 'success' ? 'bg-green-400' : run.status === 'failed' ? 'bg-red-400' : 'bg-amber-400'}`} />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-white/70">{run.pipelineName}</div>
                        <div className="text-xs text-white/30">{run.datasetId} · {run.durationMs || '—'}ms</div>
                      </div>
                      <span className={`text-xs font-mono ${run.status === 'success' ? 'text-green-400' : 'text-red-400'}`}>{run.status}</span>
                      <span className="text-xs text-white/20">{run.created_date ? new Date(run.created_date).toLocaleDateString() : '—'}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-white/25 text-sm">No pipeline runs yet. Run a pipeline from Pipeline Studio.</div>
            )}
          </motion.div>
        )}

        {/* Benchmarks */}
        {tab === 'benchmarks' && (
          <motion.div key="benchmarks" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <SectionHeader title="Benchmark Results" icon={Target} color="text-teal-400" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <MetricCard label="Total Tests" value={benchmarks.length} color="text-white/70" icon={Target} />
              <MetricCard label="Pass Rate" value={`${passRate}%`} color={passRate >= 70 ? 'text-green-400' : 'text-amber-400'} icon={CheckCircle2} />
              <MetricCard label="Passed" value={benchmarks.filter(b => b.regressionStatus === 'pass').length} color="text-green-400" icon={CheckCircle2} />
              <MetricCard label="Failed" value={benchmarks.filter(b => b.regressionStatus === 'fail').length} color="text-red-400" icon={XCircle} />
            </div>
            {benchmarks.length > 0 ? (
              <div className="rounded-2xl border border-white/8 overflow-hidden">
                <div className="px-4 py-2 bg-white/3 text-xs font-semibold text-white/30 uppercase tracking-widest">Recent Benchmark Runs</div>
                {benchmarks.slice(0, 10).map((b, i) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-3 border-b border-white/5 hover:bg-white/2">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${b.regressionStatus === 'pass' ? 'bg-green-400' : b.regressionStatus === 'fail' ? 'bg-red-400' : 'bg-white/20'}`} />
                    <div className="flex-1 min-w-0 text-xs text-white/60 truncate">{b.testQuestion}</div>
                    <span className="text-xs text-white/30">{b.agentName}</span>
                    {b.sqlMatchScore > 0 && <span className={`text-xs font-mono ${b.sqlMatchScore >= 60 ? 'text-green-400' : 'text-red-400'}`}>{b.sqlMatchScore}%</span>}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-white/25 text-sm">No benchmark results. Run benchmarks from the Benchmark Center.</div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}