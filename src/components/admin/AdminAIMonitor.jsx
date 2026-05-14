import { Brain, AlertTriangle, CheckCircle2, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

const TOOLTIP_STYLE = { backgroundColor: 'rgba(4,9,20,0.95)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, fontSize: 11 };

export default function AdminAIMonitor({ recentEvents = [], aiByUser = {} }) {
  const aiEvents = recentEvents.filter(e => e.eventType === 'ai_question');
  const errorEvents = recentEvents.filter(e => e.eventType === 'error' && e.feature?.toLowerCase().includes('ai'));

  const total = aiEvents.length;
  const fallbackCount = aiEvents.filter(e => e.metadata?.fallback === true).length;
  const fallbackRate = total > 0 ? ((fallbackCount / total) * 100).toFixed(1) : 0;
  const avgConfidence = total > 0
    ? (aiEvents.reduce((s, e) => s + (e.metadata?.confidence_score || 0), 0) / total).toFixed(0)
    : 0;

  // Agent persona usage
  const personaMap = {};
  aiEvents.forEach(e => {
    const p = e.metadata?.persona || e.metadata?.agent || 'Unknown';
    personaMap[p] = (personaMap[p] || 0) + 1;
  });
  const personaData = Object.entries(personaMap).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);

  // Questions per user
  const userAiData = Object.entries(aiByUser)
    .map(([email, count]) => ({ email: email.split('@')[0], count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Top questions
  const topQuestions = aiEvents
    .filter(e => e.metadata?.question)
    .slice(0, 10)
    .map(e => ({ q: e.metadata.question, ts: e.timestamp }));

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total AI Questions', value: total, color: '#a855f7', icon: Brain },
          { label: 'Fallback Rate', value: `${fallbackRate}%`, color: fallbackRate > 20 ? '#ef4444' : '#4caf50', icon: AlertTriangle },
          { label: 'Avg Confidence', value: `${avgConfidence}%`, color: '#00e5ff', icon: CheckCircle2 },
          { label: 'AI Error Events', value: errorEvents.length, color: '#ef4444', icon: AlertTriangle },
        ].map(k => {
          const Icon = k.icon;
          return (
            <div key={k.label} className="glass-card rounded-2xl border border-white/8 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-white/35 font-semibold">{k.label}</span>
                <Icon className="w-4 h-4" style={{ color: k.color }} />
              </div>
              <div className="text-3xl font-black font-mono" style={{ color: k.color }}>{k.value}</div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Agent persona usage */}
        {personaData.length > 0 && (
          <div className="glass-card rounded-2xl border border-white/8 p-5">
            <div className="flex items-center gap-2 mb-4">
              <Brain className="w-4 h-4 text-purple-400" />
              <span className="text-sm font-bold">Agent Persona Usage</span>
            </div>
            <div className="space-y-2">
              {personaData.map((p, i) => (
                <div key={p.name} className="flex items-center gap-3">
                  <span className="text-xs text-white/50 w-28 truncate">{p.name}</span>
                  <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-purple-400/60"
                      style={{ width: `${(p.count / (personaData[0]?.count || 1)) * 100}%` }} />
                  </div>
                  <span className="text-xs font-mono text-purple-400 w-8 text-right">{p.count}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Top users by AI questions */}
        {userAiData.length > 0 && (
          <div className="glass-card rounded-2xl border border-white/8 p-5">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-4 h-4 text-cyan-400" />
              <span className="text-sm font-bold">Top AI Users</span>
            </div>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={userAiData} layout="vertical" margin={{ left: 60, right: 10, top: 2, bottom: 2 }}>
                <XAxis type="number" tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.28)' }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="email" tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.45)' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Bar dataKey="count" fill="#00e5ff" fillOpacity={0.7} radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Top questions */}
      {topQuestions.length > 0 && (
        <div className="glass-card rounded-2xl border border-white/8 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Brain className="w-4 h-4 text-yellow-400" />
            <span className="text-sm font-bold">Recent AI Questions</span>
          </div>
          <div className="space-y-2">
            {topQuestions.map((q, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-white/2 border border-white/5 text-xs">
                <span className="w-5 h-5 rounded-full bg-yellow-400/15 text-yellow-400 flex items-center justify-center text-xs flex-shrink-0 font-bold">{i + 1}</span>
                <span className="text-white/65 leading-relaxed flex-1">{q.q}</span>
                <span className="text-white/20 whitespace-nowrap">{q.ts?.slice(0, 10)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {total === 0 && (
        <div className="text-center py-16 text-white/25">
          <Brain className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No AI events tracked yet. Events appear as users interact with the AI analyst.</p>
        </div>
      )}
    </div>
  );
}