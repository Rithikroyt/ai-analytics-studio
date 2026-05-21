/**
 * Cohort Retention Module
 */
import { useState } from 'react';
import { Play, Copy, CheckCircle2 } from 'lucide-react';

function buildCohorts(rows, customerCol, dateCol) {
  const customerFirstDate = {};
  for (const row of rows) {
    const cid = String(row[customerCol] ?? '');
    const d = new Date(row[dateCol]);
    if (!cid || isNaN(d.getTime())) continue;
    if (!customerFirstDate[cid] || d < customerFirstDate[cid]) customerFirstDate[cid] = d;
  }

  const toYearMonth = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

  const cohortMap = {};
  for (const row of rows) {
    const cid = String(row[customerCol] ?? '');
    const actDate = new Date(row[dateCol]);
    const firstDate = customerFirstDate[cid];
    if (!cid || isNaN(actDate.getTime()) || !firstDate) continue;
    const cohortMonth = toYearMonth(firstDate);
    const actMonth = toYearMonth(actDate);
    const period = (actDate.getFullYear() - firstDate.getFullYear()) * 12 + (actDate.getMonth() - firstDate.getMonth());
    if (period < 0) continue;
    if (!cohortMap[cohortMonth]) cohortMap[cohortMonth] = {};
    if (!cohortMap[cohortMonth][period]) cohortMap[cohortMonth][period] = new Set();
    cohortMap[cohortMonth][period].add(cid);
  }

  const cohorts = Object.keys(cohortMap).sort();
  const maxPeriod = Math.max(...cohorts.flatMap(c => Object.keys(cohortMap[c]).map(Number)));

  return cohorts.slice(0, 12).map(cohort => {
    const periods = cohortMap[cohort];
    const size = periods[0]?.size || 0;
    const retention = {};
    for (let p = 0; p <= Math.min(maxPeriod, 11); p++) {
      retention[p] = size > 0 ? Math.round(((periods[p]?.size || 0) / size) * 100) : null;
    }
    return { cohort, size, retention };
  });
}

const PYTHON_CODE = (cCol, dCol) => `import pandas as pd

df['${dCol}'] = pd.to_datetime(df['${dCol}'], errors='coerce')
df['cohort_month'] = df.groupby('${cCol}')['${dCol}'].transform('min').dt.to_period('M')
df['activity_month'] = df['${dCol}'].dt.to_period('M')
df['period_index'] = (df['activity_month'] - df['cohort_month']).apply(lambda x: x.n)

cohort_data = df.groupby(['cohort_month', 'period_index'])['${cCol}'].nunique().reset_index()
cohort_pivot = cohort_data.pivot(index='cohort_month', columns='period_index', values='${cCol}')
cohort_size = cohort_pivot.iloc[:, 0]
retention = cohort_pivot.divide(cohort_size, axis=0).round(3) * 100
print(retention)`;

export default function CohortRetention({ rows = [], columns = [] }) {
  const colNames = columns.map(c => c.name || c);
  const [customerCol, setCustomerCol] = useState('');
  const [dateCol, setDateCol] = useState('');
  const [cohortData, setCohortData] = useState(null);
  const [copied, setCopied] = useState(false);

  const run = () => {
    if (!customerCol || !dateCol || !rows.length) return;
    setCohortData(buildCohorts(rows, customerCol, dateCol));
  };

  const maxPeriod = cohortData ? Math.max(...cohortData.map(c => Object.keys(c.retention).length)) : 0;
  const periods = Array.from({ length: Math.min(maxPeriod, 12) }, (_, i) => i);

  const getColor = (pct) => {
    if (pct === null) return 'bg-white/3 text-white/15';
    if (pct >= 70) return 'bg-green-400/30 text-green-300';
    if (pct >= 50) return 'bg-green-400/20 text-green-400';
    if (pct >= 30) return 'bg-amber-400/20 text-amber-400';
    if (pct >= 15) return 'bg-orange-400/15 text-orange-400';
    return 'bg-red-400/15 text-red-400';
  };

  const bestCohort = cohortData?.sort((a, b) => (b.retention[1] || 0) - (a.retention[1] || 0))[0];
  const worstCohort = cohortData?.sort((a, b) => (a.retention[1] || 0) - (b.retention[1] || 0))[0];

  return (
    <div className="space-y-6">
      <div className="p-4 rounded-xl bg-teal-400/5 border border-teal-400/15 text-xs text-white/55 leading-relaxed">
        <strong className="text-teal-400">Cohort Retention Analysis</strong> — Groups customers by first activity month and tracks what percentage remain active in subsequent months. Reveals lifecycle patterns and churn risk.
      </div>

      <div className="grid grid-cols-2 gap-4">
        {[
          { label: '👤 Customer / User ID', val: customerCol, set: setCustomerCol },
          { label: '📅 Activity / Order Date', val: dateCol, set: setDateCol },
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

      <button onClick={run} disabled={!customerCol || !dateCol || !rows.length}
        className="flex items-center gap-2 px-5 py-2.5 bg-teal-400/15 border border-teal-400/25 text-teal-400 rounded-xl text-sm font-bold disabled:opacity-40 hover:bg-teal-400/20 transition-all">
        <Play className="w-4 h-4" /> Build Cohort Table
      </button>

      {cohortData && (
        <div className="space-y-5">
          {bestCohort && (
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-green-400/8 border border-green-400/20 text-xs">
                <div className="text-green-400 font-bold">Best Cohort: {bestCohort.cohort}</div>
                <div className="text-white/50 mt-0.5">Month-1 retention: {bestCohort.retention[1] ?? 0}% · Size: {bestCohort.size}</div>
              </div>
              <div className="p-3 rounded-xl bg-red-400/8 border border-red-400/20 text-xs">
                <div className="text-red-400 font-bold">Weakest Cohort: {worstCohort?.cohort}</div>
                <div className="text-white/50 mt-0.5">Month-1 retention: {worstCohort?.retention[1] ?? 0}% · Size: {worstCohort?.size}</div>
              </div>
            </div>
          )}

          {/* Heatmap */}
          <div className="overflow-x-auto">
            <table className="text-xs border-collapse min-w-max">
              <thead>
                <tr>
                  <th className="px-3 py-2 text-white/30 text-left whitespace-nowrap">Cohort</th>
                  <th className="px-3 py-2 text-white/30 text-right">Size</th>
                  {periods.map(p => (
                    <th key={p} className="px-2 py-2 text-white/25 text-center w-12">M{p}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {cohortData.map(({ cohort, size, retention }) => (
                  <tr key={cohort}>
                    <td className="px-3 py-1.5 font-mono text-white/60 whitespace-nowrap">{cohort}</td>
                    <td className="px-3 py-1.5 font-mono text-white/40 text-right">{size}</td>
                    {periods.map(p => (
                      <td key={p} className="px-1 py-1.5 text-center">
                        {retention[p] !== null && retention[p] !== undefined ? (
                          <div className={`w-10 h-7 rounded flex items-center justify-center text-xs font-mono font-bold ${getColor(retention[p])}`}>
                            {retention[p]}%
                          </div>
                        ) : (
                          <div className="w-10 h-7" />
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="p-3 rounded-xl bg-white/3 border border-white/8 text-xs text-white/40">
            <strong className="text-white/55">Interpretation:</strong> M0 = cohort month (always 100%). Each subsequent column shows % of original cohort still active. Green = high retention, red = high churn.
          </div>

          <div className="rounded-xl border border-purple-400/20 bg-black/20">
            <div className="flex items-center justify-between px-4 py-2 border-b border-white/5">
              <span className="text-xs text-purple-400 font-semibold">Generated Python</span>
              <button onClick={() => { navigator.clipboard.writeText(PYTHON_CODE(customerCol, dateCol)); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
                className="flex items-center gap-1 text-xs text-white/30 hover:text-purple-400 transition-all">
                {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
            <pre className="p-4 text-xs text-purple-400/80 font-mono overflow-x-auto whitespace-pre-wrap">{PYTHON_CODE(customerCol, dateCol)}</pre>
          </div>
        </div>
      )}
    </div>
  );
}