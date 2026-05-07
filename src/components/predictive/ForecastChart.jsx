import { ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

const TOOLTIP_STYLE = { backgroundColor: 'rgba(5,10,24,0.97)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, fontSize: 11, color: '#e2e8f0' };
const axisStyle = { fontSize: 9, fill: 'rgba(255,255,255,0.3)' };

const fmtV = v => {
  if (v == null || isNaN(v)) return '—';
  const n = Number(v);
  if (Math.abs(n) >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (Math.abs(n) >= 1e3) return `${(n / 1e3).toFixed(0)}K`;
  return n.toLocaleString(undefined, { maximumFractionDigits: 1 });
};

const SCENARIO_COLORS = { base: '#a855f7', bull: '#4ade80', bear: '#f87171' };

export default function ForecastChart({ trendData = [], forecastData = [], primaryLabel, growthRate, scenarios, activeScenario }) {
  const combined = [
    ...trendData.map(d => ({ date: d.date, actual: d.value })),
    ...forecastData.map(d => ({ date: d.date, forecast: d.value })),
  ];

  const scenarioData = scenarios?.[activeScenario] || forecastData;
  const merged = [
    ...trendData.map(d => ({ date: d.date, actual: d.value })),
    ...scenarioData.map(d => ({ date: d.date, scenario: d.value })),
  ];

  const mean = trendData.length ? trendData.reduce((s, d) => s + d.value, 0) / trendData.length : null;

  return (
    <div className="glass-card rounded-2xl p-5 border border-white/8">
      <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
        <div>
          <h3 className="font-semibold text-sm">{primaryLabel || 'KPI'} — Trend &amp; Forecast</h3>
          <p className="text-xs text-white/30 mt-0.5">
            {trendData.length} historical periods
            {forecastData.length ? ` · ${forecastData.length}-period forecast` : ''}
            {activeScenario && scenarios ? ` · ${activeScenario} scenario` : ''}
          </p>
        </div>
        {growthRate != null && (
          <span className="font-mono text-lg font-black" style={{ color: growthRate >= 0 ? '#4ade80' : '#f87171' }}>
            {growthRate >= 0 ? '▲' : '▼'} {Math.abs(growthRate)}%
          </span>
        )}
      </div>

      {combined.length < 2 ? (
        <div className="flex items-center justify-center h-48 text-sm text-white/25">No time-series data available</div>
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <ComposedChart data={merged} margin={{ top: 8, right: 8, bottom: 4, left: 0 }}>
            <defs>
              <linearGradient id="fcActual" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis dataKey="date" tick={axisStyle} tickLine={false} axisLine={false} interval="preserveStartEnd" />
            <YAxis tick={axisStyle} tickFormatter={fmtV} tickLine={false} axisLine={false} width={44} />
            <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v, n) => [fmtV(v), n === 'actual' ? primaryLabel : 'Forecast']} />
            {mean && <ReferenceLine y={mean} stroke="rgba(255,255,255,0.1)" strokeDasharray="4 4" label={{ value: 'mean', fill: 'rgba(255,255,255,0.2)', fontSize: 9 }} />}
            <Area type="monotone" dataKey="actual" stroke="#a855f7" fill="url(#fcActual)" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
            <Line type="monotone" dataKey="scenario" stroke={SCENARIO_COLORS[activeScenario] || '#00e5ff'} strokeWidth={1.5} strokeDasharray="5 3" dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      )}

      <div className="flex items-center gap-4 mt-2 text-xs text-white/30">
        <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-purple-400 inline-block" /> Historical</span>
        {forecastData.length > 0 && <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 inline-block border-t border-dashed border-cyan-400" /> Forecast</span>}
      </div>
    </div>
  );
}