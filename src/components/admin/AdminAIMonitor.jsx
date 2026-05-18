import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Brain, AlertTriangle, CheckCircle2, TrendingUp, ThumbsUp, ThumbsDown, Database, Zap, Clock, Search } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const TOOLTIP_STYLE = { backgroundColor: 'rgba(4,9,20,0.95)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, fontSize: 11 };

const STATUS_COLOR = { strong: '#4caf50', partial: '#f59e0b', limited: '#ff9800', insufficient: '#ef4444' };

export default function AdminAIMonitor({ recentEvents = [], aiByUser = {} }) {
  const [traces, setTraces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    base44.entities.AgentTrace.list('-timestamp', 200)
      .then(data => setTraces(data || []))
      .catch(() => setTraces([]))
      .finally(() => setLoading(false));
  }, []);

  // ── Derived metrics ──────────────────────────────────────────────────────────
  const total = traces.length;
  const avgConfidence = total > 0 ? Math.round(traces.reduce((s, t) => s + (t.confidenceScore || 0), 0) / total) : 0;
  const avgQuality = total > 0 ? Math.round(traces.reduce((s, t) => s + (t.answerQualityScore || 0), 0) / total) : 0;
  const fallbackCount = traces.filter(t => t.fallbackReason).length;
  const sqlFailCount = traces.filter(t => t.sqlSuccess === false).length;
  const feedbackCount = traces.filter(t => t.feedbackRating && t.feedbackRating !== '').length;

  // Questions by agent
  const agentMap = {};
  traces.forEach(t => { agentMap[t.agentName] = (agentMap[t.agentName] || 0) + 1; });
  const agentData = Object.entries(agentMap).map(([name, count]) => ({ name: name.replace(' Analyst', ''), count })).sort((a, b) => b.count - a.count);

  // Missing fields frequency
  const missingMap = {};
  traces.forEach(t => (t.missingFields || []).forEach(f => { missingMap[f] = (missingMap[f] || 0) + 1; }));
  const topMissing = Object.entries(missingMap).sort((a, b) => b[1] - a[1]).slice(0, 8);

  // Feedback breakdown
  const feedbackMap = {};
  traces.filter(t => t.feedbackRating).forEach(t => { feedbackMap[t.feedbackRating] = (feedbackMap[t.feedbackRating] || 0) + 1; });

  // Filtered recent traces
  const filtered = traces
    .filter(t => !search || t.userQuestion?.toLowerCase().includes(search.toLowerCase()) || t.agentName?.toLowerCase().includes(search.toLowerCase()))
    .slice(0, 50);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-white/30 text-sm gap-2">
        <div className="w-4 h-4 border-2 border-white/10 border-t-purple-400 rounded-full animate-spin" />
        Loading agent traces…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {[
          { label: 'Total Questions', value: total, color: '#a855f7', icon: Brain },
          { label: 'Avg Confidence', value: `${avgConfidence}%`, color: '#00e5ff', icon: CheckCircle2 },
          { label: 'Avg Quality', value: `${avgQuality}%`, color: '#4caf50', icon: TrendingUp },
          { label: 'Fallbacks', value: fallbackCount, color: fallbackCount > 5 ? '#ef4444' : '#f59e0b', icon: AlertTriangle },
          { label: 'SQL Failures', value: sqlFailCount, color: sqlFailCount > 3 ? '#ef4444' : '#f59e0b', icon: Database },
          { label: 'Feedback', value: feedbackCount, color: '#00e5ff', icon: ThumbsUp },
          { label: 'Agents Active', value: agentData.length, color: '#a78bfa', icon: Zap },
        ].map(k => {
          const Icon = k.icon;
          return (
            <div key={k.label} className="glass-card rounded-2xl border border-white/8 p-4 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-white/35 font-semibold leading-tight">{k.label}</span>
                <Icon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: k.color }} />
              </div>
              <div className="text-2xl font-black font-mono" style={{ color: k.color }}>{k.value}</div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Questions by Agent */}
        <div className="glass-card rounded-2xl border border-white/8 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Brain className="w-4 h-4 text-purple-400" />
            <span className="text-sm font-bold">Questions by Agent</span>
          </div>
          {agentData.length > 0 ? (
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={agentData} layout="vertical" margin={{ left: 55, right: 10, top: 2, bottom: 2 }}>
                <XAxis type="number" tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.28)' }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.45)' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Bar dataKey="count" fill="#a855f7" fillOpacity={0.7} radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-xs text-white/25 text-center py-8">No agent traces yet</div>
          )}
        </div>

        {/* Most Common Missing Fields */}
        <div className="glass-card rounded-2xl border border-white/8 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Database className="w-4 h-4 text-red-400" />
            <span className="text-sm font-bold">Top Missing Fields</span>
          </div>
          {topMissing.length > 0 ? (
            <div className="space-y-2">
              {topMissing.map(([field, count]) => (
                <div key={field} className="flex items-center gap-2">
                  <span className="text-xs font-mono text-red-300/70 flex-1 truncate">{field}</span>
                  <div className="w-16 h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-red-400/50" style={{ width: `${(count / (topMissing[0]?.[1] || 1)) * 100}%` }} />
                  </div>
                  <span className="text-xs font-mono text-red-400 w-5 text-right">{count}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-xs text-white/25 text-center py-8">No missing field data yet</div>
          )}
        </div>

        {/* Feedback Breakdown */}
        <div className="glass-card rounded-2xl border border-white/8 p-5">
          <div className="flex items-center gap-2 mb-4">
            <ThumbsUp className="w-4 h-4 text-green-400" />
            <span className="text-sm font-bold">User Feedback</span>
          </div>
          {Object.keys(feedbackMap).length > 0 ? (
            <div className="space-y-2">
              {[
                { key: 'useful', label: 'Useful', color: '#4caf50' },
                { key: 'improve', label: 'Needs Improvement', color: '#f59e0b' },
                { key: 'incorrect', label: 'Incorrect', color: '#ef4444' },
                { key: 'missing_data', label: 'Missing Data', color: '#a855f7' },
              ].map(f => feedbackMap[f.key] ? (
                <div key={f.key} className="flex items-center gap-2">
                  <span className="text-xs text-white/50 w-28">{f.label}</span>
                  <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${(feedbackMap[f.key] / feedbackCount) * 100}%`, background: f.color + '80' }} />
                  </div>
                  <span className="text-xs font-mono w-6 text-right" style={{ color: f.color }}>{feedbackMap[f.key]}</span>
                </div>
              ) : null)}
            </div>
          ) : (
            <div className="text-xs text-white/25 text-center py-8">No feedback recorded yet</div>
          )}
        </div>
      </div>

      {/* Recent Agent Traces Table */}
      <div className="glass-card rounded-2xl border border-white/8 p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-cyan-400" />
            <span className="text-sm font-bold">Recent Agent Traces</span>
            <span className="text-xs text-white/25 ml-1">({filtered.length})</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg">
            <Search className="w-3 h-3 text-white/30" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search question or agent…"
              className="bg-transparent text-xs text-white/60 placeholder:text-white/20 focus:outline-none w-40" />
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-10 text-white/25 text-sm">No traces found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-white/25 border-b border-white/5">
                  <th className="text-left py-2 px-3 font-semibold">Agent</th>
                  <th className="text-left py-2 px-3 font-semibold">Question</th>
                  <th className="text-left py-2 px-3 font-semibold">Domain</th>
                  <th className="text-left py-2 px-3 font-semibold">Sufficiency</th>
                  <th className="text-left py-2 px-3 font-semibold">Confidence</th>
                  <th className="text-left py-2 px-3 font-semibold">Quality</th>
                  <th className="text-left py-2 px-3 font-semibold">SQL</th>
                  <th className="text-left py-2 px-3 font-semibold">Feedback</th>
                  <th className="text-left py-2 px-3 font-semibold">Time</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((t, i) => (
                  <tr key={t.id || i} className="border-b border-white/4 hover:bg-white/2 transition-colors">
                    <td className="py-2 px-3 font-medium text-purple-400 whitespace-nowrap">{(t.agentName || '—').replace(' Analyst', '')}</td>
                    <td className="py-2 px-3 text-white/55 max-w-xs truncate" title={t.userQuestion}>{t.userQuestion || '—'}</td>
                    <td className="py-2 px-3 text-white/40 capitalize">{t.domain || t.intent || '—'}</td>
                    <td className="py-2 px-3">
                      {t.dataSufficiencyStatus ? (
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold capitalize"
                          style={{ background: (STATUS_COLOR[t.dataSufficiencyStatus] || '#999') + '20', color: STATUS_COLOR[t.dataSufficiencyStatus] || '#999' }}>
                          {t.dataSufficiencyStatus} {t.dataSufficiencyScore ? `(${t.dataSufficiencyScore}%)` : ''}
                        </span>
                      ) : <span className="text-white/20">—</span>}
                    </td>
                    <td className="py-2 px-3 font-mono" style={{ color: (t.confidenceScore || 0) >= 70 ? '#4caf50' : (t.confidenceScore || 0) >= 40 ? '#f59e0b' : '#ef4444' }}>
                      {t.confidenceScore != null ? `${t.confidenceScore}%` : '—'}
                    </td>
                    <td className="py-2 px-3 font-mono text-cyan-400">
                      {t.answerQualityScore != null ? `${t.answerQualityScore}%` : '—'}
                    </td>
                    <td className="py-2 px-3">
                      {t.sqlSuccess === false ? (
                        <span className="text-red-400 font-bold">✗</span>
                      ) : t.sqlSuccess === true ? (
                        <span className="text-green-400">✓</span>
                      ) : <span className="text-white/20">—</span>}
                    </td>
                    <td className="py-2 px-3">
                      {t.feedbackRating ? (
                        <span className="px-2 py-0.5 rounded-full text-xs capitalize"
                          style={{
                            background: t.feedbackRating === 'useful' ? '#4caf5020' : t.feedbackRating === 'incorrect' ? '#ef444420' : '#f59e0b20',
                            color: t.feedbackRating === 'useful' ? '#4caf50' : t.feedbackRating === 'incorrect' ? '#ef4444' : '#f59e0b',
                          }}>
                          {t.feedbackRating.replace('_', ' ')}
                        </span>
                      ) : <span className="text-white/20">—</span>}
                    </td>
                    <td className="py-2 px-3 text-white/25 whitespace-nowrap">
                      {t.timestamp ? new Date(t.timestamp).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {total === 0 && (
        <div className="text-center py-16 text-white/25">
          <Brain className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No agent traces yet. Traces appear automatically as users interact with the Principal Analyst system.</p>
        </div>
      )}
    </div>
  );
}