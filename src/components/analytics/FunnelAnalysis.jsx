/**
 * Funnel Analysis Module
 */
import { useState } from 'react';
import { Play, Copy, CheckCircle2, AlertTriangle } from 'lucide-react';

const PYTHON_CODE = (userCol, stageCol) => `import pandas as pd

def funnel_analysis(df, user_col='${userCol}', stage_col='${stageCol}'):
    stage_counts = df.groupby(stage_col)[user_col].nunique()
    stages = list(stage_counts.index)
    counts = list(stage_counts.values)
    
    result = []
    for i, (stage, count) in enumerate(zip(stages, counts)):
        conv = count / counts[0] if counts[0] > 0 else 0
        drop = 1 - (count / counts[i-1]) if i > 0 and counts[i-1] > 0 else 0
        result.append({
            'stage': stage, 'users': count,
            'overall_conversion': round(conv * 100, 1),
            'step_dropoff': round(drop * 100, 1),
        })
    return pd.DataFrame(result)

funnel_df = funnel_analysis(df)
print(funnel_df)`;

function buildFunnel(rows, userCol, stageCol, stageOrder) {
  const stageCounts = {};
  for (const row of rows) {
    const stage = String(row[stageCol] ?? '');
    if (!stage) continue;
    if (!stageCounts[stage]) stageCounts[stage] = new Set();
    stageCounts[stage].add(String(row[userCol] ?? ''));
  }
  let stages = Object.keys(stageCounts);
  if (stageOrder) {
    const order = stageOrder.split(',').map(s => s.trim()).filter(Boolean);
    stages = order.filter(s => stageCounts[s]);
    const remaining = Object.keys(stageCounts).filter(s => !order.includes(s));
    stages = [...stages, ...remaining];
  }

  return stages.map((stage, i) => {
    const count = stageCounts[stage]?.size || 0;
    const first = stageCounts[stages[0]]?.size || 1;
    const prev = i > 0 ? (stageCounts[stages[i - 1]]?.size || 1) : count;
    return {
      stage,
      users: count,
      overall_conversion: Math.round((count / first) * 100 * 10) / 10,
      step_dropoff: i === 0 ? 0 : Math.round(((1 - count / prev)) * 100 * 10) / 10,
    };
  });
}

export default function FunnelAnalysis({ rows = [], columns = [] }) {
  const colNames = columns.map(c => c.name || c);
  const [userCol, setUserCol] = useState('');
  const [stageCol, setStageCol] = useState('');
  const [stageOrder, setStageOrder] = useState('');
  const [funnelData, setFunnelData] = useState(null);
  const [copied, setCopied] = useState(false);

  const run = () => {
    if (!userCol || !stageCol) return;
    setFunnelData(buildFunnel(rows, userCol, stageCol, stageOrder));
  };

  const worstStep = funnelData?.slice(1).sort((a, b) => b.step_dropoff - a.step_dropoff)[0];
  const maxUsers = funnelData?.[0]?.users || 1;

  return (
    <div className="space-y-6">
      <div className="p-4 rounded-xl bg-purple-400/5 border border-purple-400/15 text-xs text-white/55 leading-relaxed">
        <strong className="text-purple-400">Funnel Analysis</strong> — Measures how users progress through sequential stages (e.g., Visit → Sign Up → Checkout → Purchase). Identifies the biggest drop-off point.
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: '👤 User / Session ID', val: userCol, set: setUserCol },
          { label: '🎯 Funnel Stage Column', val: stageCol, set: setStageCol },
        ].map(f => (
          <div key={f.label}>
            <label className="text-xs text-white/35 mb-1 block">{f.label}</label>
            <select value={f.val} onChange={e => f.set(e.target.value)}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none">
              <option value="">— Select —</option>
              {colNames.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        ))}
        <div>
          <label className="text-xs text-white/35 mb-1 block">📋 Stage Order (comma-separated, optional)</label>
          <input value={stageOrder} onChange={e => setStageOrder(e.target.value)}
            placeholder="e.g. View, Cart, Checkout, Purchase"
            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none" />
        </div>
      </div>

      <button onClick={run} disabled={!userCol || !stageCol || !rows.length}
        className="flex items-center gap-2 px-5 py-2.5 bg-purple-400/15 border border-purple-400/25 text-purple-400 rounded-xl text-sm font-bold disabled:opacity-40 hover:bg-purple-400/20 transition-all">
        <Play className="w-4 h-4" /> Run Funnel Analysis
      </button>

      {funnelData && (
        <div className="space-y-5">
          {worstStep && (
            <div className="p-4 rounded-xl bg-red-400/8 border border-red-400/20 flex items-start gap-2 text-sm">
              <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <span className="text-red-400 font-bold">Biggest Drop-off: </span>
                <span className="text-white/70">"{worstStep.stage}" stage loses <strong className="text-red-400">{worstStep.step_dropoff}%</strong> of users from the previous step.</span>
                <p className="text-xs text-white/40 mt-1">Investigate UX friction, pricing barriers, or messaging issues at this stage.</p>
              </div>
            </div>
          )}

          {/* Visual funnel */}
          <div className="space-y-2">
            {funnelData.map((stage, i) => (
              <div key={stage.stage} className="space-y-1">
                <div className="flex items-center gap-4 text-xs">
                  <span className="w-32 text-white/60 font-semibold truncate">{stage.stage}</span>
                  <span className="font-mono text-cyan-400 w-16 text-right">{stage.users.toLocaleString()}</span>
                  <div className="flex-1 h-7 rounded-lg overflow-hidden bg-white/5 relative">
                    <div className="h-full rounded-lg transition-all" style={{
                      width: `${(stage.users / maxUsers) * 100}%`,
                      background: `hsl(${270 - i * 25}, 70%, 60%)`,
                      opacity: 0.8,
                    }} />
                    <span className="absolute inset-0 flex items-center pl-2 text-white/80 font-semibold" style={{ fontSize: 10 }}>
                      {stage.overall_conversion}% overall
                    </span>
                  </div>
                  {i > 0 && (
                    <span className={`text-xs font-mono font-bold w-20 text-right ${stage.step_dropoff > 30 ? 'text-red-400' : stage.step_dropoff > 15 ? 'text-amber-400' : 'text-green-400'}`}>
                      −{stage.step_dropoff}% drop
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Table */}
          <div className="rounded-xl border border-white/8 overflow-auto">
            <table className="w-full text-xs">
              <thead><tr className="border-b border-white/8 bg-white/3">
                {['Stage', 'Users', 'Overall Conv. %', 'Step Drop-off %'].map(h => (
                  <th key={h} className="px-3 py-2 text-left text-white/35 font-mono">{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {funnelData.map((s, i) => (
                  <tr key={i} className="border-b border-white/5 hover:bg-white/2">
                    <td className="px-3 py-2 text-white/70 font-semibold">{s.stage}</td>
                    <td className="px-3 py-2 font-mono text-cyan-400">{s.users.toLocaleString()}</td>
                    <td className="px-3 py-2 font-mono text-green-400">{s.overall_conversion}%</td>
                    <td className={`px-3 py-2 font-mono font-bold ${s.step_dropoff > 30 ? 'text-red-400' : s.step_dropoff > 15 ? 'text-amber-400' : 'text-green-400'}`}>{i === 0 ? '—' : `${s.step_dropoff}%`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="rounded-xl border border-purple-400/20 bg-black/20">
            <div className="flex items-center justify-between px-4 py-2 border-b border-white/5">
              <span className="text-xs text-purple-400 font-semibold">Generated Python</span>
              <button onClick={() => { navigator.clipboard.writeText(PYTHON_CODE(userCol, stageCol)); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
                className="flex items-center gap-1 text-xs text-white/30 hover:text-purple-400 transition-all">
                {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
            <pre className="p-4 text-xs text-purple-400/80 font-mono overflow-x-auto whitespace-pre-wrap">{PYTHON_CODE(userCol, stageCol)}</pre>
          </div>
        </div>
      )}
    </div>
  );
}