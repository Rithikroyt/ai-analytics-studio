/**
 * AnalystChartWithTrendline
 * Wraps AnalystChart and adds an optional anomaly trendline overlay.
 * For numeric sequential charts (line/area/bar/composed) it computes:
 *   - Rolling mean band (μ)
 *   - Upper bound (μ + 2σ)
 *   - Lower bound (μ - 2σ)
 *   - Highlights anomalous data points in red
 * Pie/donut/scatter/histogram are passed through unchanged.
 */
import { useState, useMemo } from 'react';
import {
  ComposedChart, Line, Area, Bar, Cell, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Legend
} from 'recharts';
import { Activity } from 'lucide-react';
import AnalystChart from './AnalystChart';

const TOOLTIP_STYLE = {
  backgroundColor: 'rgba(8,6,18,0.96)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 10,
  fontSize: 11,
  color: '#e2e8f0',
};

const fmtV = (v) => {
  if (v == null || isNaN(v)) return v;
  const n = Number(v);
  if (Math.abs(n) >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
  if (Math.abs(n) >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (Math.abs(n) >= 1e3) return `${(n / 1e3).toFixed(0)}K`;
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
};

const axisStyle = { fontSize: 9, fill: 'rgba(255,255,255,0.35)' };

// Compute rolling window stats + global μ/σ
function computeAnomalyOverlay(data, yKey, windowSize = 5) {
  const vals = data.map(d => Number(d[yKey])).filter(v => !isNaN(v));
  if (vals.length < 3) return null;

  const globalMean = vals.reduce((a, b) => a + b, 0) / vals.length;
  const globalStd = Math.sqrt(vals.reduce((a, b) => a + (b - globalMean) ** 2, 0) / vals.length);

  return data.map((d, i) => {
    const val = Number(d[yKey]);
    const windowStart = Math.max(0, i - Math.floor(windowSize / 2));
    const windowEnd = Math.min(data.length, i + Math.ceil(windowSize / 2));
    const window = vals.slice(windowStart, windowEnd);
    const wMean = window.reduce((a, b) => a + b, 0) / window.length;
    const wStd = Math.sqrt(window.reduce((a, b) => a + (b - wMean) ** 2, 0) / window.length) || globalStd * 0.5;

    const upper = wMean + 2 * wStd;
    const lower = wMean - 2 * wStd;
    const isAnomaly = val > upper || val < lower;
    const zScore = globalStd > 0 ? Math.abs((val - globalMean) / globalStd) : 0;

    return {
      ...d,
      __mean: +wMean.toFixed(2),
      __upper: +upper.toFixed(2),
      __lower: +lower.toFixed(2),
      __isAnomaly: isAnomaly,
      __zScore: +zScore.toFixed(2),
      __band: [+lower.toFixed(2), +upper.toFixed(2)],
    };
  });
}

// Custom anomaly dot for Line charts
function AnomalyDot({ cx, cy, payload, dataKey }) {
  if (!payload?.__isAnomaly) return null;
  return (
    <g>
      <circle cx={cx} cy={cy} r={5} fill="rgba(255,45,122,0.9)" stroke="rgba(255,255,255,0.3)" strokeWidth={1} />
      <circle cx={cx} cy={cy} r={9} fill="none" stroke="rgba(255,45,122,0.4)" strokeWidth={1} />
    </g>
  );
}

// Custom tooltip that shows anomaly context
function AnomalyTooltip({ active, payload, label, yKey }) {
  if (!active || !payload?.length) return null;
  const main = payload.find(p => p.dataKey === yKey);
  const entry = main?.payload;
  return (
    <div style={TOOLTIP_STYLE} className="rounded-xl p-3 space-y-1 min-w-32">
      <div className="text-white/50 text-xs mb-1.5">{label}</div>
      {payload.filter(p => !p.dataKey.startsWith('__')).map((p, i) => (
        <div key={i} className="flex items-center justify-between gap-3 text-xs">
          <span style={{ color: p.color || '#e2e8f0' }}>{p.name}</span>
          <span className="font-mono font-semibold">{fmtV(p.value)}</span>
        </div>
      ))}
      {entry?.__isAnomaly && (
        <div className="mt-2 pt-2 border-t border-white/10 text-xs text-red-400 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-red-400 inline-block" />
          Anomaly · z={entry.__zScore}σ
        </div>
      )}
      {!entry?.__isAnomaly && entry?.__mean != null && (
        <div className="mt-1.5 pt-1.5 border-t border-white/8 text-xs text-white/30">
          μ={fmtV(entry.__mean)} · σ-band [{fmtV(entry.__lower)}, {fmtV(entry.__upper)}]
        </div>
      )}
    </div>
  );
}

const PASSES_THROUGH = ['donut', 'pie', 'scatter', 'histogram'];

export default function AnalystChartWithTrendline({ chart, height = 220, showTrendline = true }) {
  const [trendlineOn, setTrendlineOn] = useState(showTrendline);

  const chartType = chart?.type || 'bar';
  const passThrough = PASSES_THROUGH.includes(chartType) || chartType === 'composed';

  // If chart type doesn't support trendline, just render the original
  if (passThrough || !chart?.data?.length) {
    return <AnalystChart chart={chart} height={height} />;
  }

  const { data, x_key = 'name', y_key = 'value', y2_key, reference_value, reference_label } = chart;

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const overlayData = useMemo(() => {
    if (!trendlineOn) return data;
    return computeAnomalyOverlay(data, y_key) || data;
  }, [data, y_key, trendlineOn]);

  const anomalyCount = trendlineOn ? overlayData.filter(d => d.__isAnomaly).length : 0;
  const isHorizontal = chartType === 'horizontal_bar' || (chartType === 'bar' && data.length > 7);
  const uid = `atl-${Math.abs(y_key.charCodeAt(0) + data.length)}`;

  return (
    <div className="relative">
      {/* Trendline toggle */}
      <button
        onClick={() => setTrendlineOn(v => !v)}
        className={`absolute top-0 right-0 z-10 flex items-center gap-1 text-xs px-2 py-0.5 rounded-md transition-all ${
          trendlineOn
            ? 'bg-red-400/10 border border-red-400/25 text-red-400'
            : 'bg-white/5 border border-white/10 text-white/30 hover:text-white/60'
        }`}
        title={trendlineOn ? 'Hide anomaly overlay' : 'Show anomaly trendline'}
      >
        <Activity className="w-2.5 h-2.5" />
        {trendlineOn ? (
          anomalyCount > 0
            ? <span className="font-semibold">{anomalyCount} anomal{anomalyCount === 1 ? 'y' : 'ies'}</span>
            : <span>Normal</span>
        ) : (
          <span>Trendline</span>
        )}
      </button>

      {/* Chart */}
      {!trendlineOn ? (
        <AnalystChart chart={chart} height={height} />
      ) : (
        <ResponsiveContainer width="100%" height={isHorizontal ? Math.max(height, data.length * 28) : height}>
          {isHorizontal ? (
            // Horizontal bar — just add reference lines for mean/bounds
            <ComposedChart data={overlayData} layout="vertical" margin={{ top: 4, right: 40, bottom: 4, left: 4 }}>
              <defs>
                <linearGradient id={`${uid}-band`} x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="rgba(255,45,122,0)" />
                  <stop offset="100%" stopColor="rgba(255,45,122,0.08)" />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis type="number" tick={axisStyle} tickFormatter={fmtV} tickLine={false} axisLine={false} />
              <YAxis dataKey={x_key} type="category" tick={{ ...axisStyle, fontSize: 9 }} tickLine={false} axisLine={false} width={90} />
              <Tooltip content={<AnomalyTooltip yKey={y_key} />} />
              {overlayData[0]?.__mean != null && (
                <ReferenceLine x={overlayData[0].__mean} stroke="rgba(0,229,255,0.4)" strokeDasharray="4 3"
                  label={{ value: `μ`, fill: '#00e5ff', fontSize: 8 }} />
              )}
              {overlayData[0]?.__upper != null && (
                <ReferenceLine x={overlayData[0].__upper} stroke="rgba(255,45,122,0.35)" strokeDasharray="2 4"
                  label={{ value: '+2σ', fill: 'rgba(255,45,122,0.7)', fontSize: 8 }} />
              )}
              <Bar dataKey={y_key} radius={[0, 4, 4, 0]}>
                {overlayData.map((d, i) => (
                  <Cell key={i}
                    fill={d.__isAnomaly ? '#ff2d7a' : ['#00e5ff','#ff2d7a','#7b2fff','#ff6b35','#4caf50','#ffcc02','#00bfa5','#e91e63'][i % 8]}
                    fillOpacity={d.__isAnomaly ? 1 : 0.85}
                  />
                ))}
              </Bar>
            </ComposedChart>
          ) : (
            // Standard vertical/line/area chart with band overlay
            <ComposedChart data={overlayData} margin={{ top: 10, right: 8, bottom: 4, left: 0 }}>
              <defs>
                <linearGradient id={`${uid}-main`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00e5ff" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#00e5ff" stopOpacity={0} />
                </linearGradient>
                <linearGradient id={`${uid}-band-fill`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="rgba(0,229,255,0.12)" />
                  <stop offset="100%" stopColor="rgba(0,229,255,0.03)" />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey={x_key} tick={axisStyle} tickLine={false} axisLine={false} interval="preserveStartEnd" />
              <YAxis tick={axisStyle} tickFormatter={fmtV} tickLine={false} axisLine={false} width={42} />
              <Tooltip content={<AnomalyTooltip yKey={y_key} />} />

              {reference_value != null && (
                <ReferenceLine y={reference_value} stroke="rgba(255,204,2,0.55)" strokeDasharray="4 3"
                  label={{ value: reference_label || 'Ref', fill: '#ffcc02', fontSize: 9 }} />
              )}

              {/* μ mean line */}
              <Line
                type="monotone" dataKey="__mean"
                stroke="rgba(0,229,255,0.5)" strokeWidth={1} strokeDasharray="4 3"
                dot={false} legendType="none" name="Mean (μ)"
              />

              {/* σ band — rendered as area between upper/lower */}
              <Area
                type="monotone" dataKey="__upper"
                stroke="rgba(0,229,255,0.15)" strokeWidth={0}
                fill={`url(#${uid}-band-fill)`}
                dot={false} legendType="none" name="Upper bound"
              />
              <Line
                type="monotone" dataKey="__lower"
                stroke="rgba(0,229,255,0.12)" strokeWidth={0.5} strokeDasharray="2 4"
                dot={false} legendType="none" name="Lower bound"
              />

              {/* Main data series */}
              {(chartType === 'line' || chartType === 'area') ? (
                <>
                  {chartType === 'area' && (
                    <Area type="monotone" dataKey={y_key} stroke="#00e5ff"
                      fill={`url(#${uid}-main)`} strokeWidth={2}
                      dot={<AnomalyDot />} activeDot={{ r: 4, fill: '#00e5ff' }}
                      name={y_key}
                    />
                  )}
                  {chartType === 'line' && (
                    <Line type="monotone" dataKey={y_key} stroke="#00e5ff"
                      strokeWidth={2} dot={<AnomalyDot />} activeDot={{ r: 4, fill: '#00e5ff' }}
                      name={y_key}
                    />
                  )}
                  {y2_key && (
                    <Line type="monotone" dataKey={y2_key} stroke="#ff2d7a"
                      strokeWidth={1.5} strokeDasharray="4 3" dot={false} name={y2_key}
                    />
                  )}
                </>
              ) : (
                /* Bar chart with anomaly coloring */
                <Bar dataKey={y_key} radius={[4, 4, 0, 0]} name={y_key}>
                  {overlayData.map((d, i) => (
                    <Cell key={i}
                      fill={d.__isAnomaly ? '#ff2d7a' : ['#00e5ff','#7b2fff','#ff6b35','#4caf50','#ffcc02','#00bfa5'][i % 6]}
                      fillOpacity={d.__isAnomaly ? 1 : 0.82}
                    />
                  ))}
                </Bar>
              )}
            </ComposedChart>
          )}
        </ResponsiveContainer>
      )}

      {/* Anomaly legend */}
      {trendlineOn && anomalyCount > 0 && (
        <div className="flex items-center gap-3 mt-1.5 text-xs text-white/35 flex-wrap">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-red-400" />
            <span>{anomalyCount} anomalous point{anomalyCount !== 1 ? 's' : ''} (|z| &gt; 2σ)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-px bg-cyan-400/60 border-t border-dashed border-cyan-400/60" />
            <span>Rolling mean (μ)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-2 rounded-sm bg-cyan-400/15" />
            <span>Normal band (±2σ)</span>
          </div>
        </div>
      )}
      {trendlineOn && anomalyCount === 0 && overlayData[0]?.__mean != null && (
        <div className="flex items-center gap-3 mt-1.5 text-xs text-white/25">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-green-400/70" />
            <span>All points within normal range (±2σ)</span>
          </div>
        </div>
      )}
    </div>
  );
}