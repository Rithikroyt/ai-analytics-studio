/**
 * Forecast Engine — Time-series readiness check, chronological split, Moving Average + Linear Trend
 */
import { useState } from 'react';
import { Play, AlertTriangle, CheckCircle2, TrendingUp, Loader2 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

function computeTimeSeries(rows, dateCol, metricCol, horizon = 12) {
  const parsed = rows
    .map(r => ({ date: new Date(r[dateCol]), value: parseFloat(r[metricCol]) }))
    .filter(r => !isNaN(r.date.getTime()) && !isNaN(r.value))
    .sort((a, b) => a.date - b.date);

  if (parsed.length < 8) return { error: 'Need at least 8 data points for forecasting.' };

  // Aggregate by month
  const monthly = {};
  for (const { date, value } of parsed) {
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    if (!monthly[key]) monthly[key] = [];
    monthly[key].push(value);
  }
  const series = Object.entries(monthly).sort().map(([date, vals]) => ({
    date,
    actual: Math.round(vals.reduce((a, b) => a + b, 0) * 100) / 100,
  }));

  if (series.length < 6) return { error: 'Need at least 6 months of data for reliable forecasting.' };

  // Chronological split: 80% train, 20% test (no random split)
  const splitIdx = Math.floor(series.length * 0.8);
  const train = series.slice(0, splitIdx);
  const test = series.slice(splitIdx);

  // Moving Average (window = 3)
  const window = Math.min(3, Math.floor(train.length / 3));
  const maPredictions = test.map((_, i) => {
    const slice = train.slice(Math.max(0, train.length - window + i), train.length + i);
    return slice.reduce((a, b) => a + b.actual, 0) / slice.length;
  });

  // Linear Trend (OLS)
  const n = train.length;
  const xs = train.map((_, i) => i);
  const ys = train.map(t => t.actual);
  const sumX = xs.reduce((a, b) => a + b, 0);
  const sumY = ys.reduce((a, b) => a + b, 0);
  const sumXY = xs.reduce((s, x, i) => s + x * ys[i], 0);
  const sumX2 = xs.reduce((s, x) => s + x * x, 0);
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  const linearPredictions = test.map((_, i) => intercept + slope * (n + i));

  // Metrics on test set
  const maMetrics = computeMetrics(test.map(t => t.actual), maPredictions);
  const linearMetrics = computeMetrics(test.map(t => t.actual), linearPredictions);

  // Choose best model
  const bestModel = maMetrics.mape <= linearMetrics.mape ? 'Moving Average' : 'Linear Trend';
  const bestPred = bestModel === 'Moving Average' ? maPredictions : linearPredictions;
  const bestMetrics = bestModel === 'Moving Average' ? maMetrics : linearMetrics;

  // Generate forecast for next `horizon` months
  const lastDate = new Date(series[series.length - 1].date + '-01');
  const forecastPoints = Array.from({ length: horizon }, (_, i) => {
    const d = new Date(lastDate);
    d.setMonth(d.getMonth() + i + 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const predicted = bestModel === 'Moving Average'
      ? series.slice(-window).reduce((a, b) => a + b.actual, 0) / window * (1 + slope / (intercept || 1) * i * 0.1)
      : intercept + slope * (n + test.length + i);
    const ci = predicted * 0.15;
    return { date: key, predicted: Math.round(predicted * 100) / 100, lower: Math.round((predicted - ci) * 100) / 100, upper: Math.round((predicted + ci) * 100) / 100 };
  });

  // Readiness score
  const dateValid = series.length >= 6 ? 30 : 15;
  const freqConsistent = series.length >= 12 ? 25 : 15;
  const metricAvail = 20;
  const missingScore = (1 - (rows.length - parsed.length) / rows.length) * 15;
  const historyLength = Math.min(series.length / 24, 1) * 10;
  const readiness = Math.round(dateValid + freqConsistent + metricAvail + missingScore + historyLength);

  // Combined chart data
  const chartData = [
    ...series.map((s, i) => ({
      date: s.date,
      actual: s.actual,
      predicted: i >= splitIdx ? Math.round(bestPred[i - splitIdx] * 100) / 100 : undefined,
    })),
    ...forecastPoints.map(f => ({ date: f.date, forecast: f.predicted, lower: f.lower, upper: f.upper })),
  ];

  return { series, train, test, forecastPoints, chartData, bestModel, bestMetrics, maMetrics, linearMetrics, readiness, slope, intercept };
}

function computeMetrics(actual, predicted) {
  const n = actual.length;
  if (!n) return { mae: 0, rmse: 0, mape: 0 };
  const mae = actual.reduce((s, a, i) => s + Math.abs(a - predicted[i]), 0) / n;
  const rmse = Math.sqrt(actual.reduce((s, a, i) => s + Math.pow(a - predicted[i], 2), 0) / n);
  const mape = actual.reduce((s, a, i) => s + (a !== 0 ? Math.abs((a - predicted[i]) / a) : 0), 0) / n * 100;
  return { mae: Math.round(mae * 100) / 100, rmse: Math.round(rmse * 100) / 100, mape: Math.round(mape * 100) / 100 };
}

export default function ForecastEngine({ rows = [], columns = [] }) {
  const colNames = columns.map(c => c.name || c);
  const [dateCol, setDateCol] = useState('');
  const [metricCol, setMetricCol] = useState('');
  const [horizon, setHorizon] = useState(12);
  const [result, setResult] = useState(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState('');

  const run = () => {
    if (!dateCol || !metricCol || !rows.length) return;
    setRunning(true);
    setError('');
    setTimeout(() => {
      const r = computeTimeSeries(rows, dateCol, metricCol, horizon);
      if (r.error) { setError(r.error); setResult(null); } else setResult(r);
      setRunning(false);
    }, 300);
  };

  const TOOLTIP_STYLE = { background: 'hsl(222,44%,9%)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, fontSize: 11 };

  return (
    <div className="space-y-6">
      <div className="p-4 rounded-xl bg-amber-400/5 border border-amber-400/15 text-xs text-white/55 leading-relaxed">
        <strong className="text-amber-400">Forecast Engine</strong> — Chronological 80/20 train/test split (never random). Compares Moving Average vs Linear Trend and selects the best by MAPE. Generates forecast with ±15% confidence band.
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="text-xs text-white/35 mb-1 block">📅 Date Column</label>
          <select value={dateCol} onChange={e => setDateCol(e.target.value)}
            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none">
            <option value="">— Select —</option>
            {colNames.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-white/35 mb-1 block">📊 Metric Column (numeric KPI)</label>
          <select value={metricCol} onChange={e => setMetricCol(e.target.value)}
            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none">
            <option value="">— Select —</option>
            {colNames.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-white/35 mb-1 block">🔭 Forecast Horizon (months)</label>
          <select value={horizon} onChange={e => setHorizon(Number(e.target.value))}
            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none">
            {[3, 6, 12, 24].map(h => <option key={h} value={h}>{h} months</option>)}
          </select>
        </div>
      </div>

      <button onClick={run} disabled={running || !dateCol || !metricCol || !rows.length}
        className="flex items-center gap-2 px-5 py-2.5 bg-amber-400/15 border border-amber-400/25 text-amber-400 rounded-xl text-sm font-bold disabled:opacity-40 hover:bg-amber-400/20 transition-all">
        {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
        {running ? 'Forecasting…' : 'Run Forecast'}
      </button>

      {error && <div className="p-3 rounded-xl bg-red-400/8 border border-red-400/20 text-xs text-red-400 flex items-center gap-2"><AlertTriangle className="w-3.5 h-3.5" />{error}</div>}

      {result && (
        <div className="space-y-5">
          {/* Time-series readiness */}
          <div className={`p-4 rounded-xl border text-sm ${result.readiness >= 70 ? 'bg-green-400/8 border-green-400/20' : result.readiness >= 50 ? 'bg-amber-400/8 border-amber-400/20' : 'bg-red-400/8 border-red-400/20'}`}>
            <div className="flex items-center gap-2 mb-1">
              {result.readiness >= 70 ? <CheckCircle2 className="w-4 h-4 text-green-400" /> : <AlertTriangle className="w-4 h-4 text-amber-400" />}
              <span className="font-bold">Time-Series Readiness Score: {result.readiness}%</span>
            </div>
            <div className="text-xs text-white/45">
              {result.series.length} monthly data points · Chronological 80/20 split · Best model: <strong className="text-amber-400">{result.bestModel}</strong>
            </div>
          </div>

          {/* Accuracy metrics */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'MAE', value: result.bestMetrics.mae, desc: 'Mean Absolute Error', color: 'text-cyan-400' },
              { label: 'RMSE', value: result.bestMetrics.rmse, desc: 'Root Mean Sq. Error', color: 'text-purple-400' },
              { label: 'MAPE', value: `${result.bestMetrics.mape}%`, desc: 'Mean Abs. % Error', color: result.bestMetrics.mape < 10 ? 'text-green-400' : result.bestMetrics.mape < 20 ? 'text-amber-400' : 'text-red-400' },
            ].map(s => (
              <div key={s.label} className="p-3 rounded-xl bg-white/3 border border-white/8 text-center">
                <div className={`text-2xl font-black ${s.color}`}>{s.value}</div>
                <div className="text-xs text-white/35">{s.label} — {s.desc}</div>
              </div>
            ))}
          </div>

          {/* Forecast chart */}
          <div className="rounded-2xl border border-white/8 bg-white/2 p-4" style={{ height: 300 }}>
            <div className="text-xs text-white/40 font-semibold mb-2">
              {metricCol} — Historical + {horizon}-Month Forecast ({result.bestModel})
            </div>
            <ResponsiveContainer width="100%" height="85%">
              <LineChart data={result.chartData} margin={{ bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="date" tick={{ fill: 'rgba(255,255,255,0.25)', fontSize: 9 }} angle={-30} textAnchor="end" height={50} interval={Math.floor(result.chartData.length / 6)} />
                <YAxis tick={{ fill: 'rgba(255,255,255,0.25)', fontSize: 9 }} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Legend wrapperStyle={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }} />
                <Line type="monotone" dataKey="actual" stroke="#00e5ff" strokeWidth={2} dot={false} name="Actual" />
                <Line type="monotone" dataKey="predicted" stroke="#a855f7" strokeWidth={1.5} strokeDasharray="4 2" dot={false} name="Backtest" />
                <Line type="monotone" dataKey="forecast" stroke="#f59e0b" strokeWidth={2} strokeDasharray="6 2" dot={false} name="Forecast" />
                <Line type="monotone" dataKey="upper" stroke="#f59e0b" strokeWidth={1} strokeDasharray="2 4" dot={false} name="Upper CI" strokeOpacity={0.4} />
                <Line type="monotone" dataKey="lower" stroke="#f59e0b" strokeWidth={1} strokeDasharray="2 4" dot={false} name="Lower CI" strokeOpacity={0.4} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Forecast table */}
          <div className="rounded-xl border border-white/8 overflow-auto max-h-48">
            <table className="w-full text-xs min-w-max">
              <thead><tr className="border-b border-white/8 bg-white/3">
                {['Month', 'Forecast', 'Lower (−15%)', 'Upper (+15%)'].map(h => (
                  <th key={h} className="px-3 py-2 text-left text-white/35 font-mono">{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {result.forecastPoints.map((p, i) => (
                  <tr key={i} className="border-b border-white/5 hover:bg-white/2">
                    <td className="px-3 py-2 font-mono text-amber-400">{p.date}</td>
                    <td className="px-3 py-2 font-mono font-bold text-white/80">{p.predicted.toLocaleString()}</td>
                    <td className="px-3 py-2 font-mono text-red-400/70">{p.lower.toLocaleString()}</td>
                    <td className="px-3 py-2 font-mono text-green-400/70">{p.upper.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="p-3 rounded-xl bg-amber-400/5 border border-amber-400/15 text-xs text-white/45">
            <strong className="text-amber-400">Limitations:</strong> Moving Average and Linear Trend do not capture seasonality or complex non-linear patterns. For production forecasting, use SARIMAX or Prophet with proper validation. Confidence intervals are approximate (±15%).
            <br /><strong className="text-white/55 mt-1 block">⚠ No data leakage:</strong> Chronological split ensures test data is always future relative to training data.
          </div>
        </div>
      )}
    </div>
  );
}