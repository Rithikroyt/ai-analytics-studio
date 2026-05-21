/**
 * Churn Analysis Module
 */
import { useState } from 'react';
import { Play, Copy, CheckCircle2, AlertTriangle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const COLORS = ['#00e5ff', '#a855f7', '#4ade80', '#f59e0b', '#f87171', '#60a5fa'];

function buildChurn(rows, customerCol, churnCol, segmentCol, tenureCol, revenueCol) {
  const total = rows.length;
  if (!total) return null;

  let churned = 0;
  const segmentChurn = {};
  const tenureBuckets = { '0-6m': { churn: 0, total: 0 }, '6-12m': { churn: 0, total: 0 }, '12-24m': { churn: 0, total: 0 }, '24m+': { churn: 0, total: 0 } };
  let totalRevenueLost = 0;

  for (const row of rows) {
    const isChurned = churnCol ? (String(row[churnCol]).toLowerCase() === '1' || String(row[churnCol]).toLowerCase() === 'true' || String(row[churnCol]).toLowerCase() === 'yes' || String(row[churnCol]).toLowerCase() === 'churned') : false;
    if (isChurned) churned++;

    const seg = segmentCol ? String(row[segmentCol] ?? 'Unknown') : null;
    if (seg) {
      if (!segmentChurn[seg]) segmentChurn[seg] = { churn: 0, total: 0 };
      segmentChurn[seg].total++;
      if (isChurned) segmentChurn[seg].churn++;
    }

    const tenure = tenureCol ? parseFloat(row[tenureCol]) || 0 : null;
    if (tenure !== null) {
      const bucket = tenure <= 6 ? '0-6m' : tenure <= 12 ? '6-12m' : tenure <= 24 ? '12-24m' : '24m+';
      tenureBuckets[bucket].total++;
      if (isChurned) tenureBuckets[bucket].churn++;
    }

    const rev = revenueCol ? parseFloat(row[revenueCol]) || 0 : 0;
    if (isChurned) totalRevenueLost += rev;
  }

  const churnRate = Math.round((churned / total) * 100 * 10) / 10;
  const segmentData = Object.entries(segmentChurn).map(([name, d]) => ({
    name, churnRate: Math.round((d.churn / Math.max(d.total, 1)) * 100 * 10) / 10, total: d.total, churned: d.churn,
  })).sort((a, b) => b.churnRate - a.churnRate);

  const tenureData = Object.entries(tenureBuckets).filter(([, d]) => d.total > 0).map(([bucket, d]) => ({
    bucket, churnRate: Math.round((d.churn / d.total) * 100 * 10) / 10, total: d.total,
  }));

  const highRiskSegment = segmentData[0];

  return { churnRate, churned, total, segmentData, tenureData, highRiskSegment, totalRevenueLost: Math.round(totalRevenueLost), hasChurnCol: !!churnCol };
}

const PYTHON_CODE = (cCol, chCol, sCol) => `import pandas as pd

# Churn Rate
churn_rate = df['${chCol}'].astype(int).mean() * 100

# Churn by Segment
churn_by_segment = df.groupby('${sCol}')['${chCol}'].agg(['sum', 'count'])
churn_by_segment['churn_rate'] = churn_by_segment['sum'] / churn_by_segment['count'] * 100

# High-Risk Segment
high_risk = churn_by_segment.sort_values('churn_rate', ascending=False).index[0]

print(f"Overall churn rate: {churn_rate:.1f}%")
print(f"High-risk segment: {high_risk}")
print(churn_by_segment)`;

export default function ChurnAnalysis({ rows = [], columns = [] }) {
  const colNames = columns.map(c => c.name || c);
  const [customerCol, setCustomerCol] = useState('');
  const [churnCol, setChurnCol] = useState('');
  const [segmentCol, setSegmentCol] = useState('');
  const [tenureCol, setTenureCol] = useState('');
  const [revenueCol, setRevenueCol] = useState('');
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);

  const run = () => {
    if (!rows.length) return;
    setResult(buildChurn(rows, customerCol, churnCol, segmentCol, tenureCol, revenueCol));
  };

  return (
    <div className="space-y-6">
      <div className="p-4 rounded-xl bg-red-400/5 border border-red-400/15 text-xs text-white/55 leading-relaxed">
        <strong className="text-red-400">Churn Analysis</strong> — Calculates overall churn rate, identifies at-risk segments, and quantifies revenue impact. Requires a churn flag column (1/0, yes/no, churned) or uses inactivity heuristics.
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: '👤 Customer ID (optional)', val: customerCol, set: setCustomerCol },
          { label: '🔴 Churn Flag Column (1/0, yes/no)', val: churnCol, set: setChurnCol },
          { label: '📦 Segment Column', val: segmentCol, set: setSegmentCol },
          { label: '⏱ Tenure Column (months)', val: tenureCol, set: setTenureCol },
          { label: '💰 Revenue Column', val: revenueCol, set: setRevenueCol },
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
      </div>

      <button onClick={run} disabled={!rows.length}
        className="flex items-center gap-2 px-5 py-2.5 bg-red-400/15 border border-red-400/25 text-red-400 rounded-xl text-sm font-bold disabled:opacity-40 hover:bg-red-400/20 transition-all">
        <Play className="w-4 h-4" /> Run Churn Analysis
      </button>

      {result && (
        <div className="space-y-5">
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: 'Overall Churn Rate', value: `${result.churnRate}%`, color: result.churnRate > 20 ? 'text-red-400' : result.churnRate > 10 ? 'text-amber-400' : 'text-green-400' },
              { label: 'Churned Customers', value: result.churned.toLocaleString(), color: 'text-red-400' },
              { label: 'Total Customers', value: result.total.toLocaleString(), color: 'text-cyan-400' },
              { label: 'Revenue at Risk', value: result.totalRevenueLost > 0 ? `$${result.totalRevenueLost.toLocaleString()}` : '—', color: 'text-amber-400' },
            ].map(s => (
              <div key={s.label} className="p-3 rounded-xl bg-white/3 border border-white/8 text-center">
                <div className={`text-2xl font-black ${s.color}`}>{s.value}</div>
                <div className="text-xs text-white/35">{s.label}</div>
              </div>
            ))}
          </div>

          {!result.hasChurnCol && (
            <div className="p-3 rounded-xl bg-amber-400/8 border border-amber-400/20 text-xs text-amber-400 flex items-start gap-2">
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              No churn flag column selected — churn rate is 0. Select a column with 1/0 or yes/no values for accurate results.
            </div>
          )}

          {result.highRiskSegment && (
            <div className="p-4 rounded-xl bg-red-400/8 border border-red-400/20 text-sm">
              <span className="text-red-400 font-bold">Highest Risk Segment: </span>
              <span className="text-white/70">"{result.highRiskSegment.name}" — {result.highRiskSegment.churnRate}% churn rate ({result.highRiskSegment.churned} of {result.highRiskSegment.total} customers)</span>
              <p className="text-xs text-white/40 mt-1">Run targeted retention campaigns for this segment. Investigate contract type, product fit, and support ticket history.</p>
            </div>
          )}

          {result.segmentData.length > 1 && (
            <div className="rounded-2xl border border-white/8 bg-white/2 p-4" style={{ height: 220 }}>
              <div className="text-xs text-white/40 font-semibold mb-2">Churn Rate by Segment</div>
              <ResponsiveContainer width="100%" height="80%">
                <BarChart data={result.segmentData} margin={{ bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="name" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 9 }} angle={-30} textAnchor="end" height={50} />
                  <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 9 }} unit="%" />
                  <Tooltip contentStyle={{ background: 'hsl(222,44%,9%)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10 }} />
                  <Bar dataKey="churnRate" radius={[4, 4, 0, 0]}>
                    {result.segmentData.map((d, i) => (
                      <Cell key={i} fill={d.churnRate > 30 ? '#f87171' : d.churnRate > 15 ? '#f59e0b' : '#4ade80'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="rounded-xl border border-purple-400/20 bg-black/20">
            <div className="flex items-center justify-between px-4 py-2 border-b border-white/5">
              <span className="text-xs text-purple-400 font-semibold">Generated Python</span>
              <button onClick={() => { navigator.clipboard.writeText(PYTHON_CODE(customerCol, churnCol || 'churn', segmentCol || 'segment')); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
                className="flex items-center gap-1 text-xs text-white/30 hover:text-purple-400 transition-all">
                {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
            <pre className="p-4 text-xs text-purple-400/80 font-mono overflow-x-auto whitespace-pre-wrap">{PYTHON_CODE(customerCol, churnCol || 'churn', segmentCol || 'segment')}</pre>
          </div>
        </div>
      )}
    </div>
  );
}