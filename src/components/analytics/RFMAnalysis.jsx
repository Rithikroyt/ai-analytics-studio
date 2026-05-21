/**
 * RFM Analysis Module — Recency, Frequency, Monetary segmentation
 */
import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Users, Loader2, Play, Copy, CheckCircle2, AlertTriangle, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const RFM_SEGMENTS = {
  '555': 'Champions',    '554': 'Champions',    '544': 'Champions',    '545': 'Champions',
  '454': 'Loyal Customers', '455': 'Loyal Customers', '445': 'Loyal Customers',
  '355': 'Potential Loyalists', '354': 'Potential Loyalists', '345': 'Potential Loyalists', '344': 'Potential Loyalists', '335': 'Potential Loyalists',
  '512': 'New Customers', '511': 'New Customers', '521': 'New Customers', '522': 'New Customers',
  '155': 'At Risk', '154': 'At Risk', '145': 'At Risk', '144': 'At Risk',
  '111': 'Lost Customers', '112': 'Lost Customers', '121': 'Hibernating', '131': 'Hibernating',
};

const SEGMENT_COLORS = {
  'Champions': '#00e5ff',
  'Loyal Customers': '#4ade80',
  'Potential Loyalists': '#a855f7',
  'New Customers': '#f59e0b',
  'At Risk': '#f87171',
  'Hibernating': '#94a3b8',
  'Big Spenders': '#fb923c',
  'Lost Customers': '#ef4444',
};

function assignSegment(rScore, fScore, mScore) {
  const key = `${rScore}${fScore}${mScore}`;
  if (RFM_SEGMENTS[key]) return RFM_SEGMENTS[key];
  if (rScore >= 4 && fScore >= 4) return 'Champions';
  if (rScore >= 3 && fScore >= 3) return 'Loyal Customers';
  if (rScore >= 4 && fScore <= 2) return 'New Customers';
  if (mScore >= 4) return 'Big Spenders';
  if (rScore <= 2 && fScore >= 3) return 'At Risk';
  if (rScore <= 2 && fScore <= 2) return 'Hibernating';
  return 'Potential Loyalists';
}

function scoreQuintile(values, ascending = true) {
  const sorted = [...values].sort((a, b) => a - b);
  return values.map(v => {
    const rank = sorted.indexOf(v) / (sorted.length - 1);
    const score = Math.ceil(rank * 5) || 1;
    return ascending ? score : 6 - score;
  });
}

function buildRFM(rows, customerCol, dateCol, revenueCol) {
  const customers = {};
  const now = new Date();
  for (const row of rows) {
    const cid = String(row[customerCol] ?? '').trim();
    if (!cid) continue;
    const dateVal = new Date(row[dateCol]);
    const rev = parseFloat(row[revenueCol]) || 0;
    if (!customers[cid]) customers[cid] = { dates: [], revenue: 0 };
    if (!isNaN(dateVal.getTime())) customers[cid].dates.push(dateVal);
    customers[cid].revenue += rev;
  }

  const rfmRaw = Object.entries(customers).map(([id, d]) => {
    const lastDate = d.dates.length ? new Date(Math.max(...d.dates)) : now;
    const recency = Math.round((now - lastDate) / (1000 * 60 * 60 * 24));
    return { customer_id: id, recency, frequency: d.dates.length || 1, monetary: Math.round(d.revenue * 100) / 100 };
  });

  if (!rfmRaw.length) return [];

  const recencies = rfmRaw.map(r => r.recency);
  const frequencies = rfmRaw.map(r => r.frequency);
  const monetaries = rfmRaw.map(r => r.monetary);

  const rScores = scoreQuintile(recencies, false); // lower recency = better = higher score
  const fScores = scoreQuintile(frequencies, true);
  const mScores = scoreQuintile(monetaries, true);

  return rfmRaw.map((r, i) => ({
    ...r,
    r_score: rScores[i],
    f_score: fScores[i],
    m_score: mScores[i],
    rfm_score: `${rScores[i]}${fScores[i]}${mScores[i]}`,
    rfm_total: rScores[i] + fScores[i] + mScores[i],
    segment: assignSegment(rScores[i], fScores[i], mScores[i]),
  })).sort((a, b) => b.rfm_total - a.rfm_total);
}

const PYTHON_CODE = (cCol, dCol, rCol) => `import pandas as pd

def build_rfm(df, customer_col='${cCol}', date_col='${dCol}', revenue_col='${rCol}'):
    df[date_col] = pd.to_datetime(df[date_col], errors='coerce')
    reference_date = df[date_col].max()
    
    rfm = df.groupby(customer_col).agg(
        recency=(date_col, lambda x: (reference_date - x.max()).days),
        frequency=(customer_col, 'count'),
        monetary=(revenue_col, 'sum')
    ).reset_index()
    
    rfm['r_score'] = pd.qcut(rfm['recency'].rank(method='first'), 5, labels=[5,4,3,2,1])
    rfm['f_score'] = pd.qcut(rfm['frequency'].rank(method='first'), 5, labels=[1,2,3,4,5])
    rfm['m_score'] = pd.qcut(rfm['monetary'].rank(method='first'), 5, labels=[1,2,3,4,5])
    rfm['rfm_score'] = rfm['r_score'].astype(str) + rfm['f_score'].astype(str) + rfm['m_score'].astype(str)
    return rfm

rfm_table = build_rfm(df)
print(rfm_table.head(20))`;

export default function RFMAnalysis({ rows = [], columns = [] }) {
  const colNames = columns.map(c => c.name || c);
  const [customerCol, setCustomerCol] = useState('');
  const [dateCol, setDateCol] = useState('');
  const [revenueCol, setRevenueCol] = useState('');
  const [rfmData, setRfmData] = useState(null);
  const [running, setRunning] = useState(false);
  const [copied, setCopied] = useState(false);

  const run = () => {
    if (!customerCol || !dateCol || !revenueCol) return;
    setRunning(true);
    setTimeout(() => {
      const data = buildRFM(rows, customerCol, dateCol, revenueCol);
      setRfmData(data);
      setRunning(false);
    }, 300);
  };

  const segmentCounts = rfmData ? rfmData.reduce((acc, r) => {
    acc[r.segment] = (acc[r.segment] || 0) + 1;
    return acc;
  }, {}) : {};
  const chartData = Object.entries(segmentCounts).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
  const champions = rfmData?.filter(r => r.segment === 'Champions').slice(0, 5) || [];
  const atRisk = rfmData?.filter(r => r.segment === 'At Risk' || r.segment === 'Hibernating').slice(0, 5) || [];

  const RECOMMENDATIONS = {
    'Champions': 'Reward them, ask for reviews, upsell premium offerings.',
    'Loyal Customers': 'Offer loyalty programs and early access to new products.',
    'Potential Loyalists': 'Offer membership or loyalty program to convert.',
    'New Customers': 'Onboard with welcome emails and first-purchase incentives.',
    'At Risk': 'Win-back campaigns with personalized offers.',
    'Hibernating': 'Reactivate with targeted discount or product update.',
    'Big Spenders': 'Cross-sell complementary high-margin products.',
    'Lost Customers': 'Final win-back survey — understand why they left.',
  };

  return (
    <div className="space-y-6">
      <div className="p-4 rounded-xl bg-cyan-400/5 border border-cyan-400/15 text-xs text-white/55 leading-relaxed">
        <strong className="text-cyan-400">RFM Analysis</strong> — Segments customers by Recency (when did they last buy?), Frequency (how often?), and Monetary (how much?). Each dimension is scored 1–5 and combined to assign a business segment.
      </div>

      {/* Field mapping */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: '👤 Customer ID Column', val: customerCol, set: setCustomerCol },
          { label: '📅 Date / Order Date Column', val: dateCol, set: setDateCol },
          { label: '💰 Revenue / Amount Column', val: revenueCol, set: setRevenueCol },
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

      <button onClick={run} disabled={running || !customerCol || !dateCol || !revenueCol || !rows.length}
        className="flex items-center gap-2 px-5 py-2.5 bg-cyan-400/15 border border-cyan-400/25 text-cyan-400 rounded-xl text-sm font-bold disabled:opacity-40 hover:bg-cyan-400/20 transition-all">
        {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
        {running ? 'Building RFM…' : 'Run RFM Analysis'}
      </button>

      {!rows.length && <div className="p-3 rounded-xl bg-amber-400/8 border border-amber-400/20 text-xs text-amber-400">⚠ Load a dataset in Workspace first.</div>}

      {rfmData && (
        <div className="space-y-5">
          {/* Summary KPIs */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: 'Total Customers', value: rfmData.length, color: 'text-cyan-400' },
              { label: 'Champions', value: segmentCounts['Champions'] || 0, color: 'text-green-400' },
              { label: 'At Risk', value: (segmentCounts['At Risk'] || 0) + (segmentCounts['Hibernating'] || 0), color: 'text-red-400' },
              { label: 'Avg RFM Score', value: (rfmData.reduce((s, r) => s + r.rfm_total, 0) / rfmData.length).toFixed(1), color: 'text-amber-400' },
            ].map(s => (
              <div key={s.label} className="p-3 rounded-xl bg-white/3 border border-white/8 text-center">
                <div className={`text-2xl font-black ${s.color}`}>{s.value}</div>
                <div className="text-xs text-white/35">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Segment chart */}
          <div className="rounded-2xl border border-white/8 bg-white/2 p-4" style={{ height: 240 }}>
            <div className="text-xs text-white/40 font-semibold mb-2">Customer Segment Distribution</div>
            <ResponsiveContainer width="100%" height="85%">
              <BarChart data={chartData} margin={{ bottom: 30 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="name" tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 9 }} angle={-30} textAnchor="end" height={50} />
                <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 9 }} />
                <Tooltip contentStyle={{ background: 'hsl(222,44%,9%)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, fontSize: 11 }} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {chartData.map((d, i) => <Cell key={i} fill={SEGMENT_COLORS[d.name] || '#00e5ff'} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Segment recommendations */}
          <div className="grid grid-cols-2 gap-3">
            {Object.entries(RECOMMENDATIONS).filter(([seg]) => segmentCounts[seg] > 0).map(([seg, rec]) => (
              <div key={seg} className="p-3 rounded-xl bg-white/3 border border-white/8">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-2 h-2 rounded-full" style={{ background: SEGMENT_COLORS[seg] || '#888' }} />
                  <span className="text-xs font-bold text-white/70">{seg}</span>
                  <span className="text-xs text-white/30 ml-auto">{segmentCounts[seg]} customers</span>
                </div>
                <p className="text-xs text-white/45 leading-relaxed">{rec}</p>
              </div>
            ))}
          </div>

          {/* Top champions / at-risk */}
          <div className="grid grid-cols-2 gap-4">
            {[
              { title: '🏆 Top Champions', data: champions, color: 'text-green-400' },
              { title: '⚠️ At Risk / Hibernating', data: atRisk, color: 'text-red-400' },
            ].map(({ title, data, color }) => (
              <div key={title}>
                <div className={`text-xs font-bold mb-2 ${color}`}>{title}</div>
                <div className="space-y-1">
                  {data.map((r, i) => (
                    <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-xl bg-white/3 border border-white/8 text-xs">
                      <span className="font-mono text-white/50 truncate max-w-24">{r.customer_id}</span>
                      <span className="text-white/30">R={r.recency}d</span>
                      <span className="text-white/30">F={r.frequency}</span>
                      <span className="text-white/50 ml-auto font-mono">${r.monetary.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* RFM Table */}
          <div className="rounded-xl border border-white/8 overflow-auto max-h-72">
            <table className="w-full text-xs min-w-max">
              <thead>
                <tr className="border-b border-white/8 bg-white/3">
                  {['Customer', 'Recency (days)', 'Frequency', 'Monetary', 'R', 'F', 'M', 'Score', 'Segment'].map(h => (
                    <th key={h} className="px-3 py-2 text-left text-white/35 font-mono whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rfmData.slice(0, 50).map((r, i) => (
                  <tr key={i} className="border-b border-white/5 hover:bg-white/2">
                    <td className="px-3 py-2 font-mono text-cyan-400/80 truncate max-w-24">{r.customer_id}</td>
                    <td className="px-3 py-2 font-mono text-white/55">{r.recency}</td>
                    <td className="px-3 py-2 font-mono text-white/55">{r.frequency}</td>
                    <td className="px-3 py-2 font-mono text-white/55">${r.monetary.toLocaleString()}</td>
                    <td className="px-3 py-2 font-mono text-purple-400">{r.r_score}</td>
                    <td className="px-3 py-2 font-mono text-blue-400">{r.f_score}</td>
                    <td className="px-3 py-2 font-mono text-green-400">{r.m_score}</td>
                    <td className="px-3 py-2 font-mono font-bold text-amber-400">{r.rfm_score}</td>
                    <td className="px-3 py-2">
                      <span className="px-2 py-0.5 rounded-full text-xs" style={{ background: (SEGMENT_COLORS[r.segment] || '#888') + '20', color: SEGMENT_COLORS[r.segment] || '#888' }}>{r.segment}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Python code */}
          <div className="rounded-xl border border-purple-400/20 bg-black/20">
            <div className="flex items-center justify-between px-4 py-2 border-b border-white/5">
              <span className="text-xs text-purple-400 font-semibold">Generated Python / Pandas</span>
              <button onClick={() => { navigator.clipboard.writeText(PYTHON_CODE(customerCol, dateCol, revenueCol)); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
                className="flex items-center gap-1 text-xs text-white/30 hover:text-purple-400 transition-all">
                {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
            <pre className="p-4 text-xs text-purple-400/80 font-mono overflow-x-auto whitespace-pre-wrap">{PYTHON_CODE(customerCol, dateCol, revenueCol)}</pre>
          </div>

          <div className="p-3 rounded-xl bg-white/3 border border-white/8 text-xs text-white/40">
            <strong className="text-white/55">Limitations:</strong> Quintile scoring may be unstable with fewer than 100 customers. Monetary values assume all records represent purchases. Recency is calculated from today's date.
          </div>
        </div>
      )}
    </div>
  );
}