/**
 * ObservabilityDashboard — Phase 9: Enhanced admin observability
 * AnswerQuality = 0.25×Relevance + 0.25×Evidence + 0.20×Completeness + 0.15×Actionability + 0.15×Clarity
 * Tracks: questions, tools, SQL, sufficiency, confidence, feedback, latency, missing fields
 */
import { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity, Brain, Clock, CheckCircle2, XCircle, AlertTriangle,
  TrendingUp, TrendingDown, Minus, Search, RefreshCw, Loader2,
  ChevronDown, ChevronRight, ThumbsUp, ThumbsDown, Database
} from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import AgentTraceDetail from './AgentTraceDetail.jsx';

function KPICard({ label, value, unit = '', color = 'text-cyan-400', trend, sub }) {
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const trendColor = trend === 'up' ? 'text-green-400' : trend === 'down' ? 'text-red-400' : 'text-white/30';
  return (
    <div className="rounded-2xl border border-white/8 bg-white/2 p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-white/35 uppercase tracking-widest">{label}</span>
        {trend && <TrendIcon className={`w-3.5 h-3.5 ${trendColor}`} />}
      </div>
      <div className={`text-2xl font-black ${color}`}>{value}{unit}</div>
      {sub && <div className="text-xs text-white/25 mt-1">{sub}</div>}
    </div>
  );
}

export default function ObservabilityDashboard() {
  const [traces, setTraces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedTrace, setSelectedTrace] = useState(null);
  const [agentFilter, setAgentFilter] = useState('all');

  const load = async () => {
    setLoading(true);
    try {
      const data = await base44.entities.AgentTrace.list('-created_date', 100);
      setTraces(data);
    } catch (e) {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const metrics = useMemo(() => {
    if (!traces.length) return {};
    const total = traces.length;
    const avgConf = Math.round(traces.reduce((s, t) => s + (t.confidenceScore || 0), 0) / total);
    const avgQual = Math.round(traces.reduce((s, t) => s + (t.answerQualityScore || 0), 0) / total);
    const avgLatency = Math.round(traces.reduce((s, t) => s + (t.durationMs || 0), 0) / total);
    const sqlSuccess = traces.filter(t => t.sqlSuccess).length;
    const highConf = traces.filter(t => (t.confidenceScore || 0) >= 70).length;
    const lowConf = traces.filter(t => (t.confidenceScore || 0) < 50).length;
    const feedbackUseful = traces.filter(t => t.feedbackRating === 'useful').length;
    const feedbackBad = traces.filter(t => ['improve', 'incorrect'].includes(t.feedbackRating)).length;

    // Missing fields frequency
    const missingFreq = {};
    traces.forEach(t => (t.missingFields || []).forEach(f => { missingFreq[f] = (missingFreq[f] || 0) + 1; }));
    const topMissing = Object.entries(missingFreq).sort((a, b) => b[1] - a[1]).slice(0, 6);

    // Agent breakdown
    const agentMap = {};
    traces.forEach(t => {
      const a = t.agentName || 'Unknown';
      if (!agentMap[a]) agentMap[a] = { count: 0, totalConf: 0, totalQual: 0, totalLatency: 0 };
      agentMap[a].count++;
      agentMap[a].totalConf += t.confidenceScore || 0;
      agentMap[a].totalQual += t.answerQualityScore || 0;
      agentMap[a].totalLatency += t.durationMs || 0;
    });
    const agentBreakdown = Object.entries(agentMap).map(([agent, d]) => ({
      agent, count: d.count,
      avgConf: Math.round(d.totalConf / d.count),
      avgQual: Math.round(d.totalQual / d.count),
      avgLatency: Math.round(d.totalLatency / d.count),
    })).sort((a, b) => b.count - a.count);

    // Daily trend (last 14 days)
    const daily = {};
    traces.forEach(t => {
      const day = t.created_date?.split('T')[0] || t.timestamp?.split('T')[0] || 'unknown';
      if (!daily[day]) daily[day] = { count: 0, totalQual: 0, totalConf: 0 };
      daily[day].count++;
      daily[day].totalQual += t.answerQualityScore || 0;
      daily[day].totalConf += t.confidenceScore || 0;
    });
    const trend = Object.entries(daily).sort(([a], [b]) => a.localeCompare(b)).slice(-14).map(([date, d]) => ({
      date: date.slice(5), count: d.count,
      avgQuality: Math.round(d.totalQual / d.count),
      avgConf: Math.round(d.totalConf / d.count),
    }));

    // Domain breakdown
    const domainMap = {};
    traces.forEach(t => { const d = t.domain || 'general'; domainMap[d] = (domainMap[d] || 0) + 1; });
    const domainBreakdown = Object.entries(domainMap).map(([domain, count]) => ({ domain, count })).sort((a, b) => b.count - a.count);

    return { total, avgConf, avgQual, avgLatency, sqlSuccess, highConf, lowConf, feedbackUseful, feedbackBad, topMissing, agentBreakdown, trend, domainBreakdown };
  }, [traces]);

  const agents = ['all', ...new Set(traces.map(t => t.agentName).filter(Boolean))];
  const filtered = traces.filter(t =>
    (agentFilter === 'all' || t.agentName === agentFilter) &&
    (search === '' || t.userQuestion?.toLowerCase().includes(search.toLowerCase()))
  );

  // SQL failure traces
  const sqlFailures = filtered.filter(t => t.sqlSuccess === false);
  const sqlFailureRate = metrics.total > 0 ? Math.round((sqlFailures.length / metrics.total) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Quality formula */}
      <div className="px-4 py-2.5 rounded-xl bg-cyan-400/5 border border-cyan-400/15 text-xs text-cyan-400 font-mono">
        AnswerQuality = 0.25×Relevance + 0.25×Evidence + 0.20×Completeness + 0.15×Actionability + 0.15×Clarity
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard label="Total Traces" value={metrics.total || 0} color="text-purple-400" />
        <KPICard label="Avg Answer Quality" value={metrics.avgQual || 0} unit="%" color="text-cyan-400" sub="0.25×Relevance + 0.25×Evidence…" />
        <KPICard label="Avg Confidence" value={metrics.avgConf || 0} unit="%" color="text-green-400" />
        <KPICard label="Avg Latency" value={metrics.avgLatency || 0} unit="ms" color="text-amber-400" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard label="SQL Success" value={metrics.sqlSuccess || 0} color="text-green-400" sub={`of ${metrics.total || 0} traces`} />
        <KPICard label="SQL Failures" value={sqlFailures.length} color="text-red-400" sub={`${sqlFailureRate}% failure rate`} />
        <KPICard label="High Confidence (≥70%)" value={metrics.highConf || 0} color="text-green-400" />
        <KPICard label="Low Confidence (<50%)" value={metrics.lowConf || 0} color="text-red-400" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard label="Useful Feedback" value={metrics.feedbackUseful || 0} color="text-cyan-400" sub={`${metrics.feedbackBad || 0} negative`} />
        <KPICard label="Shallow Answers (quality<40)" value={traces.filter(t => (t.answerQualityScore||0) < 40).length} color="text-amber-400" sub="Needs improvement" />
        <KPICard label="Missing Fields Reports" value={traces.filter(t => t.missingFields?.length > 0).length} color="text-orange-400" sub="Traces with missing data" />
        <KPICard label="Insufficient Data" value={traces.filter(t => t.dataSufficiencyStatus === 'insufficient').length} color="text-red-400" sub="Cannot answer" />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {metrics.trend?.length > 1 && (
          <div className="rounded-2xl border border-white/8 bg-white/2 p-5">
            <h3 className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-4">Daily Answer Quality & Confidence</h3>
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={metrics.trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="date" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} />
                <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} domain={[0, 100]} />
                <Tooltip contentStyle={{ background: 'hsl(222,44%,9%)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12 }} />
                <Line type="monotone" dataKey="avgQuality" stroke="#00e5ff" strokeWidth={2} dot={false} name="Quality %" />
                <Line type="monotone" dataKey="avgConf" stroke="#4ade80" strokeWidth={1.5} dot={false} name="Confidence %" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {metrics.agentBreakdown?.length > 0 && (
          <div className="rounded-2xl border border-white/8 bg-white/2 p-5">
            <h3 className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-4">Queries by Agent</h3>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={metrics.agentBreakdown}>
                <XAxis dataKey="agent" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 9 }} />
                <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} />
                <Tooltip contentStyle={{ background: 'hsl(222,44%,9%)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12 }} />
                <Bar dataKey="count" fill="#a855f7" radius={[4, 4, 0, 0]} name="Queries" />
                <Bar dataKey="avgQual" fill="#00e5ff" radius={[4, 4, 0, 0]} name="Avg Quality %" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Top Missing Fields */}
      {metrics.topMissing?.length > 0 && (
        <div className="rounded-2xl border border-white/8 bg-white/2 p-5">
          <h3 className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-3">Most Commonly Missing Fields</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {metrics.topMissing.map(([field, count]) => (
              <div key={field} className="flex items-center justify-between px-3 py-2 rounded-xl bg-amber-400/5 border border-amber-400/15 text-xs">
                <span className="font-mono text-amber-400/80">{field}</span>
                <span className="text-white/30">{count}×</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Trace list */}
      <div className="space-y-3">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-white/25" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search questions…"
              className="w-full pl-8 pr-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs focus:outline-none" />
          </div>
          <div className="flex gap-1 flex-wrap">
            {agents.slice(0, 5).map(a => (
              <button key={a} onClick={() => setAgentFilter(a)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${agentFilter === a ? 'bg-purple-400/20 text-purple-400' : 'text-white/30 hover:text-white/60'}`}>
                {a === 'all' ? 'All' : a.split(' ')[0]}
              </button>
            ))}
          </div>
          <button onClick={load} disabled={loading} className="p-2 rounded-xl bg-white/5 border border-white/10 text-white/30 hover:text-white/60 transition-all">
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          </button>
        </div>

        {loading && !traces.length ? (
          <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 text-cyan-400 animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-sm text-white/30">No traces found</div>
        ) : (
          filtered.slice(0, 50).map((t, i) => (
            <motion.div key={t.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}
              className="p-4 rounded-2xl border border-white/8 bg-white/1 cursor-pointer hover:border-white/15 hover:bg-white/3 transition-all"
              onClick={() => setSelectedTrace(selectedTrace?.id === t.id ? null : t)}>
              <div className="flex items-start gap-3">
                <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${(t.answerQualityScore || 0) >= 70 ? 'bg-green-400' : (t.answerQualityScore || 0) >= 40 ? 'bg-amber-400' : 'bg-red-400'}`} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-white/80 truncate">{t.userQuestion}</div>
                  <div className="flex items-center gap-2 mt-1 flex-wrap text-xs">
                    <span className="text-purple-400">{t.agentName}</span>
                    <span className={`font-semibold ${(t.answerQualityScore||0) >= 70 ? 'text-green-400' : (t.answerQualityScore||0) >= 40 ? 'text-amber-400' : 'text-red-400'}`}>
                      Q: {t.answerQualityScore || 0}%
                    </span>
                    <span className="text-white/25">Conf: {t.confidenceScore || 0}%</span>
                    <span className={`${t.dataSufficiencyStatus === 'strong' ? 'text-green-400' : t.dataSufficiencyStatus === 'partial' ? 'text-amber-400' : 'text-red-400'}`}>
                      {t.dataSufficiencyStatus}
                    </span>
                    {t.durationMs > 0 && <span className="text-white/20 font-mono">{t.durationMs}ms</span>}
                    {t.sqlSuccess === false && <span className="text-red-400 flex items-center gap-0.5"><XCircle className="w-3 h-3" /> SQL failed</span>}
                    {t.missingFields?.length > 0 && <span className="text-orange-400">{t.missingFields.length} missing fields</span>}
                    {t.feedbackRating === 'useful' && <span className="text-green-400 flex items-center gap-0.5"><ThumbsUp className="w-3 h-3" /></span>}
                    {t.feedbackRating === 'incorrect' && <span className="text-red-400 flex items-center gap-0.5"><ThumbsDown className="w-3 h-3" /></span>}
                    {t.qualityBreakdown?.quality_score !== undefined && t.qualityBreakdown.quality_score < 40 && (
                      <span className="text-amber-400 border border-amber-400/20 bg-amber-400/8 px-1.5 py-0.5 rounded-full">Shallow</span>
                    )}
                  </div>
                </div>
                {selectedTrace?.id === t.id ? <ChevronDown className="w-4 h-4 text-white/25 flex-shrink-0" /> : <ChevronRight className="w-4 h-4 text-white/25 flex-shrink-0" />}
              </div>
              <AnimatePresence>
                {selectedTrace?.id === t.id && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden mt-3 pt-3 border-t border-white/8">
                    <AgentTraceDetail trace={t} onClose={() => setSelectedTrace(null)} />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}