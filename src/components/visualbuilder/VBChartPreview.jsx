/**
 * VBChartPreview — Professional chart rendering for ALL chart types
 * Includes: maps, radar, gauge, candlestick, dual-axis, bubble, forecast, anomaly, trendlines
 */
import { useMemo } from 'react';
import {
  BarChart, Bar, AreaChart, Area, LineChart, Line, ComposedChart,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, ScatterChart, Scatter, ReferenceLine, Legend,
  FunnelChart, Funnel, LabelList, Treemap, RadarChart, Radar,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis, ZAxis,
} from 'recharts';

const PALETTE = ['#00e5ff', '#a855f7', '#ff6b35', '#4caf50', '#ff2d7a', '#ffcc02', '#00bfa5', '#60a5fa', '#e91e63', '#fb923c', '#34d399', '#f87171'];
const TOOLTIP_STYLE = { backgroundColor: 'rgba(4,9,20,0.97)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, fontSize: 11, padding: '8px 12px' };
const AXIS_STYLE = { fontSize: 9, fill: 'rgba(255,255,255,0.28)' };
const GRID_STROKE = 'rgba(255,255,255,0.04)';

export function fmtV(v) {
  if (v == null || isNaN(v)) return String(v ?? '');
  const n = Number(v);
  if (Math.abs(n) >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
  if (Math.abs(n) >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (Math.abs(n) >= 1e3) return `${(n / 1e3).toFixed(0)}K`;
  return n.toLocaleString(undefined, { maximumFractionDigits: 1 });
}

// Linear regression for ML trend line
function linearRegression(data) {
  const n = data.length;
  if (n < 2) return [];
  const xs = data.map((_, i) => i);
  const ys = data.map(d => d.value);
  const xm = xs.reduce((a, b) => a + b, 0) / n;
  const ym = ys.reduce((a, b) => a + b, 0) / n;
  const slope = xs.reduce((s, x, i) => s + (x - xm) * (ys[i] - ym), 0) / xs.reduce((s, x) => s + (x - xm) ** 2, 0);
  const intercept = ym - slope * xm;
  return data.map((d, i) => ({ ...d, trend: Math.round((slope * i + intercept) * 100) / 100 }));
}

// Simple anomaly detection: ±2 std dev
function detectAnomalies(data) {
  const vals = data.map(d => d.value);
  const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
  const std = Math.sqrt(vals.reduce((s, v) => s + (v - mean) ** 2, 0) / vals.length);
  return data.map(d => ({ ...d, isAnomaly: Math.abs(d.value - mean) > 2 * std }));
}

// Forecast extension (naive: double last slope)
function buildForecast(data, steps = 4) {
  if (data.length < 3) return [];
  const n = data.length;
  const slope = (data[n - 1].value - data[n - 3].value) / 2;
  const forecast = [];
  for (let i = 1; i <= steps; i++) {
    forecast.push({
      name: `+${i}`,
      value: null,
      forecast: Math.round((data[n - 1].value + slope * i) * 100) / 100,
      ci_upper: Math.round((data[n - 1].value + slope * i + Math.abs(slope) * i * 0.3) * 100) / 100,
      ci_lower: Math.round((data[n - 1].value + slope * i - Math.abs(slope) * i * 0.3) * 100) / 100,
    });
  }
  return forecast;
}

export function buildChartData(rows, shelves, aggFn, chartType, marks) {
  if (!rows?.length) return [];
  const xField = shelves.x?.[0]?.name;
  const yField = shelves.y?.[0]?.name;
  const y2Field = shelves.y?.[1]?.name;
  const sizeField = shelves.size?.[0]?.name;
  const colorField = shelves.color?.[0]?.name;

  if (chartType === 'histogram' && yField) {
    const vals = rows.map(r => Number(r[yField])).filter(v => !isNaN(v));
    if (!vals.length) return [];
    const min = Math.min(...vals), max = Math.max(...vals);
    const bins = 15;
    const range = (max - min) || 1;
    const counts = new Array(bins).fill(0);
    vals.forEach(v => counts[Math.min(bins - 1, Math.floor(((v - min) / range) * bins))]++);
    return counts.map((count, i) => ({ name: fmtV(min + (i / bins) * range), value: count }));
  }

  if ((chartType === 'scatter' || chartType === 'bubble') && xField && yField) {
    return rows.slice(0, 500).map(r => ({
      x: Number(r[xField]),
      y: Number(r[yField]),
      z: sizeField ? Number(r[sizeField]) || 10 : 10,
      label: colorField ? String(r[colorField]) : '',
    })).filter(d => !isNaN(d.x) && !isNaN(d.y));
  }

  if (chartType === 'box_plot' && xField && yField) {
    const groups = {};
    rows.forEach(r => {
      const key = String(r[xField] ?? 'All');
      const val = Number(r[yField]);
      if (!isNaN(val)) { if (!groups[key]) groups[key] = []; groups[key].push(val); }
    });
    return Object.entries(groups).slice(0, 12).map(([name, vals]) => {
      const sorted = [...vals].sort((a, b) => a - b);
      const q1 = sorted[Math.floor(sorted.length * 0.25)];
      const median = sorted[Math.floor(sorted.length * 0.5)];
      const q3 = sorted[Math.floor(sorted.length * 0.75)];
      const iqr = q3 - q1;
      return { name, min: sorted[0], q1, median, q3, max: sorted[sorted.length - 1], whisker_low: Math.max(sorted[0], q1 - 1.5 * iqr), whisker_high: Math.min(sorted[sorted.length - 1], q3 + 1.5 * iqr) };
    });
  }

  if (chartType === 'waterfall' && xField && yField) {
    const groups = {};
    rows.forEach(r => { const k = String(r[xField] ?? ''); groups[k] = (groups[k] || 0) + (Number(r[yField]) || 0); });
    let cum = 0;
    const entries = Object.entries(groups).slice(0, 15);
    const result = entries.map(([name, value]) => {
      const start = cum; cum += value;
      return { name, value: Math.round(value), start: Math.round(start), positive: value >= 0, total: Math.round(cum) };
    });
    result.push({ name: 'Total', value: cum, start: 0, positive: cum >= 0, isTotal: true });
    return result;
  }

  if (chartType === 'candlestick' && xField && yField) {
    return rows.slice(0, 50).map(r => ({
      name: String(r[xField] || ''),
      open: Number(r['open'] || r['Open'] || r[yField]) || 0,
      high: Number(r['high'] || r['High']) || Number(r[yField]) * 1.02,
      low: Number(r['low'] || r['Low']) || Number(r[yField]) * 0.98,
      close: Number(r['close'] || r['Close'] || r[yField]) || 0,
    })).filter(d => d.close > 0);
  }

  if (chartType === 'radar' && xField && yField) {
    const numCols = Object.keys(rows[0] || {}).filter(k => !isNaN(Number(rows[0][k]))).slice(0, 8);
    if (numCols.length === 0) return [];
    const means = {};
    rows.forEach(r => { numCols.forEach(col => { means[col] = (means[col] || 0) + (Number(r[col]) || 0); }); });
    const n = rows.length;
    return numCols.map(col => ({ subject: col.replace(/_/g, ' ').slice(0, 12), value: Math.round((means[col] / n) * 100) / 100, fullMark: Math.max(...rows.map(r => Number(r[col]) || 0)) }));
  }

  if ((chartType === 'choropleth_map' || chartType === 'symbol_map' || chartType === 'heat_map_geo') && xField && yField) {
    const groups = {};
    rows.forEach(r => { const k = String(r[xField] ?? ''); if (k) { groups[k] = (groups[k] || 0) + (Number(r[yField]) || 0); } });
    return Object.entries(groups).map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 })).sort((a, b) => b.value - a.value);
  }

  if ((chartType === 'dual_axis') && xField && yField && y2Field) {
    const groups = {};
    rows.forEach(row => {
      const key = String(row[xField] ?? '');
      if (!groups[key]) groups[key] = { v1: [], v2: [] };
      if (!isNaN(Number(row[yField]))) groups[key].v1.push(Number(row[yField]));
      if (!isNaN(Number(row[y2Field]))) groups[key].v2.push(Number(row[y2Field]));
    });
    const fn = (arr) => {
      const agg = (aggFn || 'SUM').toLowerCase();
      if (agg === 'avg') return arr.reduce((a, b) => a + b, 0) / (arr.length || 1);
      if (agg === 'count') return arr.length;
      if (agg === 'min') return Math.min(...arr);
      if (agg === 'max') return Math.max(...arr);
      return arr.reduce((a, b) => a + b, 0);
    };
    return Object.entries(groups).slice(0, 20).map(([name, g]) => ({ name, value: Math.round(fn(g.v1) * 100) / 100, value2: Math.round(fn(g.v2) * 100) / 100 }));
  }

  if ((chartType === 'sankey' || chartType === 'sunburst' || chartType === 'packed_bubble' || chartType === 'violin') && xField && yField) {
    const groups = {};
    rows.forEach(r => { const k = String(r[xField] ?? ''); groups[k] = (groups[k] || 0) + (Number(r[yField]) || 0); });
    return Object.entries(groups).slice(0, 20).map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 })).sort((a, b) => b.value - a.value);
  }

  if (!xField || !yField) return [];
  const groups = {};
  rows.forEach(row => {
    const key = String(row[xField] ?? 'Unknown');
    const val = Number(row[yField]) || 0;
    if (!groups[key]) groups[key] = { values: [], count: 0 };
    groups[key].values.push(val);
    groups[key].count++;
  });
  const agg = (g) => {
    switch ((aggFn || 'SUM').toLowerCase()) {
      case 'avg': return g.values.reduce((a, b) => a + b, 0) / g.values.length;
      case 'count': return g.count;
      case 'min': return Math.min(...g.values);
      case 'max': return Math.max(...g.values);
      case 'median': { const s = [...g.values].sort((a, b) => a - b); return s[Math.floor(s.length / 2)]; }
      default: return g.values.reduce((a, b) => a + b, 0);
    }
  };
  let result = Object.entries(groups).map(([name, g]) => ({ name, value: Math.round(agg(g) * 100) / 100 }));
  if ((marks?.sort || 'Desc') === 'Desc') result.sort((a, b) => b.value - a.value);
  else if ((marks?.sort) === 'Asc') result.sort((a, b) => a.value - b.value);
  else if ((marks?.sort) === 'Alpha') result.sort((a, b) => a.name.localeCompare(b.name));
  return result.slice(0, 30);
}

function EmptyState({ msg }) {
  return (
    <div className="flex flex-col items-center justify-center h-52 gap-2 text-white/15">
      <div className="text-3xl">📊</div>
      <div className="text-sm">{msg || 'Configure fields to preview chart'}</div>
    </div>
  );
}

function GaugeChart({ value, max, color }) {
  const pct = Math.min(1, Math.max(0, value / (max || 100)));
  const angle = -135 + pct * 270;
  return (
    <div className="flex flex-col items-center justify-center h-52 gap-2">
      <svg width={180} height={120} viewBox="0 0 180 120">
        <path d="M 20 110 A 70 70 0 0 1 160 110" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={14} strokeLinecap="round" />
        <path d="M 20 110 A 70 70 0 0 1 160 110" fill="none" stroke={color} strokeWidth={14} strokeLinecap="round"
          strokeDasharray={`${pct * 220} 220`} />
        <text x={90} y={95} textAnchor="middle" fill={color} fontSize={22} fontWeight="900" fontFamily="monospace">{fmtV(value)}</text>
        <text x={20} y={118} textAnchor="start" fill="rgba(255,255,255,0.2)" fontSize={9}>0</text>
        <text x={160} y={118} textAnchor="end" fill="rgba(255,255,255,0.2)" fontSize={9}>{fmtV(max)}</text>
      </svg>
      <div className="text-xs text-white/30 font-mono">{Math.round(pct * 100)}% of target</div>
    </div>
  );
}

function MapChart({ data, color, chartType }) {
  if (!data?.length) return <EmptyState msg="Need a location field (country/region) on X and a numeric on Y" />;
  const max = Math.max(...data.map(d => d.value), 1);
  const isSymbol = chartType === 'symbol_map';
  return (
    <div className="space-y-2">
      <div className="text-xs text-white/30 px-1 flex items-center gap-2">
        <span className="text-yellow-400">🗺</span>
        {chartType === 'choropleth_map' ? 'Filled Map' : chartType === 'symbol_map' ? 'Symbol Map' : 'Density Map'}
        <span className="text-white/20">— geographic rendering</span>
      </div>
      <div className="grid grid-cols-2 gap-1.5 max-h-52 overflow-y-auto">
        {data.slice(0, 20).map((d, i) => {
          const pct = d.value / max;
          return (
            <div key={d.name} className="flex items-center gap-2 p-2 rounded-xl border border-white/5 bg-white/2 hover:bg-white/4 transition-all">
              <div className="flex-shrink-0">
                {isSymbol ? (
                  <div className="rounded-full flex items-center justify-center font-bold text-white/80"
                    style={{ width: 8 + pct * 18, height: 8 + pct * 18, background: color, opacity: 0.5 + pct * 0.5 }} />
                ) : (
                  <div className="w-4 h-4 rounded-sm" style={{ background: color, opacity: 0.15 + pct * 0.8 }} />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs text-white/60 truncate font-medium">{d.name}</div>
                <div className="text-xs text-white/35 font-mono">{fmtV(d.value)}</div>
              </div>
              <div className="w-8 h-1 bg-white/5 rounded-full overflow-hidden flex-shrink-0">
                <div className="h-full rounded-full" style={{ width: `${pct * 100}%`, background: color }} />
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-2 text-xs text-white/20 px-1">
        <div className="w-12 h-2 rounded-full" style={{ background: `linear-gradient(90deg, ${color}20, ${color})` }} />
        <span>Low → High</span>
      </div>
    </div>
  );
}

function CandlestickChart({ data, color }) {
  if (!data?.length) return <EmptyState msg="Need date X field + open/high/low/close columns" />;
  const allVals = data.flatMap(d => [d.high, d.low]);
  const minV = Math.min(...allVals);
  const maxV = Math.max(...allVals);
  const range = maxV - minV || 1;
  const h = 200;
  const w = Math.max(600, data.length * 20);
  const barW = Math.min(14, (w / data.length) * 0.6);

  return (
    <div className="overflow-x-auto">
      <svg width={w} height={h + 30} style={{ display: 'block' }}>
        {data.map((d, i) => {
          const x = (i / data.length) * w + (w / data.length) / 2;
          const bullish = d.close >= d.open;
          const col = bullish ? '#4caf50' : '#f87171';
          const highY = ((maxV - d.high) / range) * h;
          const lowY = ((maxV - d.low) / range) * h;
          const openY = ((maxV - d.open) / range) * h;
          const closeY = ((maxV - d.close) / range) * h;
          const bodyTop = Math.min(openY, closeY);
          const bodyH = Math.max(2, Math.abs(closeY - openY));
          return (
            <g key={i}>
              <line x1={x} y1={highY} x2={x} y2={lowY} stroke={col} strokeWidth={1} opacity={0.8} />
              <rect x={x - barW / 2} y={bodyTop} width={barW} height={bodyH} fill={col} fillOpacity={0.85} rx={1} />
            </g>
          );
        })}
        {[0, 0.25, 0.5, 0.75, 1].map(t => (
          <text key={t} x={2} y={t * h + 3} fill="rgba(255,255,255,0.2)" fontSize={8} fontFamily="monospace">
            {fmtV(maxV - t * range)}
          </text>
        ))}
      </svg>
    </div>
  );
}

function PackedBubbleChart({ data, color }) {
  if (!data?.length) return <EmptyState />;
  const max = Math.max(...data.map(d => d.value), 1);
  const W = 480, H = 220;
  const placed = [];
  const bubbles = data.slice(0, 16).map((d, i) => {
    const r = 14 + (d.value / max) * 52;
    return { ...d, r, color: PALETTE[i % PALETTE.length] };
  });
  // Simple packing: spiral placement
  const packed = bubbles.map((b, i) => {
    const angle = i * 2.4;
    const dist = i === 0 ? 0 : 30 + i * 20;
    return { ...b, cx: W / 2 + Math.cos(angle) * dist, cy: H / 2 + Math.sin(angle) * (dist * 0.6) };
  });
  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ maxHeight: 240 }}>
      {packed.map((b, i) => (
        <g key={b.name}>
          <circle cx={b.cx} cy={b.cy} r={b.r} fill={b.color} fillOpacity={0.7} stroke={b.color} strokeWidth={1} strokeOpacity={0.4} />
          {b.r > 22 && (
            <text x={b.cx} y={b.cy} textAnchor="middle" dominantBaseline="middle" fill="white" fontSize={Math.min(11, b.r / 3)} fontWeight="600">
              {b.name.slice(0, 8)}
            </text>
          )}
        </g>
      ))}
    </svg>
  );
}

function SankeyChart({ data, color }) {
  if (data.length < 2) return <EmptyState msg="Need at least 2 data points for Sankey flow" />;
  const total = data.reduce((s, d) => s + d.value, 0);
  const H = 200;
  const W = 400;
  let y = 0;
  const bars = data.slice(0, 8).map((d, i) => {
    const h = Math.max(8, (d.value / total) * H * 0.9);
    const bar = { ...d, y, h, color: PALETTE[i % PALETTE.length] };
    y += h + 4;
    return bar;
  });
  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ maxHeight: 220 }}>
      {bars.map((b, i) => (
        <g key={b.name}>
          <rect x={20} y={b.y} width={60} height={b.h} fill={b.color} fillOpacity={0.7} rx={3} />
          {i < bars.length - 1 && (
            <path d={`M 80 ${b.y + b.h / 2} C 160 ${b.y + b.h / 2}, 160 ${bars[i + 1].y + bars[i + 1].h / 2}, 240 ${bars[i + 1].y + bars[i + 1].h / 2}`}
              fill="none" stroke={b.color} strokeWidth={Math.max(2, b.h * 0.4)} strokeOpacity={0.3} />
          )}
          <rect x={240} y={b.y} width={60} height={b.h} fill={bars[(i + 1) % bars.length].color} fillOpacity={0.7} rx={3} />
          <text x={90} y={b.y + b.h / 2 + 4} fill="rgba(255,255,255,0.5)" fontSize={9}>{b.name.slice(0, 12)}</text>
        </g>
      ))}
    </svg>
  );
}

export default function VBChartPreview({ chartType, data, marks, shelves }) {
  const color = marks?.color || '#00e5ff';
  const opacity = (marks?.opacity ?? 85) / 100;
  const showLabel = marks?.showLabel;
  const showGrid = marks?.showGrid !== false;
  const showLegend = marks?.showLegend;
  const showDots = marks?.showDots;
  const strokeWidth = marks?.strokeWidth ?? 2;
  const borderRadius = marks?.borderRadius ?? 4;
  const xField = shelves?.x?.[0]?.name;
  const yField = shelves?.y?.[0]?.name;
  const y2Field = shelves?.y?.[1]?.name;

  // Apply ML trend & anomaly detection — hooks must be before any early return
  const enrichedData = useMemo(() => {
    if (!data?.length) return [];
    let d = data;
    if (marks?.showTrendLine) d = linearRegression(d);
    if (marks?.showAnomalies) d = detectAnomalies(d);
    return d;
  }, [data, marks?.showTrendLine, marks?.showAnomalies]);

  const gradient = marks?.gradient;

  if (!data?.length) return <EmptyState />;
  const gradId = `grad_${color.replace('#', '')}`;

  // Gradient defs
  const GradDefs = () => (
    <defs>
      <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={gradient ? gradient.from : color} stopOpacity={0.45} />
        <stop offset="100%" stopColor={gradient ? gradient.to : color} stopOpacity={0.02} />
      </linearGradient>
    </defs>
  );

  // ── BAR CHARTS ──
  if (chartType === 'bar' || chartType === 'bar_horizontal') {
    const layout = chartType === 'bar_horizontal' ? 'vertical' : 'horizontal';
    return (
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={enrichedData} layout={layout} margin={{ top: 4, right: 16, bottom: 28, left: 0 }}>
          {showGrid && <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />}
          {layout === 'horizontal' ? (
            <>
              <XAxis dataKey="name" tick={AXIS_STYLE} tickLine={false} axisLine={false} interval={0} angle={-20} textAnchor="end" />
              <YAxis tick={AXIS_STYLE} tickFormatter={fmtV} tickLine={false} axisLine={false} width={44} />
            </>
          ) : (
            <>
              <XAxis type="number" tick={AXIS_STYLE} tickFormatter={fmtV} tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey="name" tick={AXIS_STYLE} tickLine={false} axisLine={false} width={96} />
            </>
          )}
          <Tooltip contentStyle={TOOLTIP_STYLE} formatter={fmtV} />
          {marks?.showReferenceLine && <ReferenceLine y={marks.referenceValue || 0} stroke="rgba(255,255,255,0.25)" strokeDasharray="5 3" label={{ value: 'Target', fill: 'rgba(255,255,255,0.4)', fontSize: 9 }} />}
          {marks?.showTrendLine && <Line type="monotone" dataKey="trend" stroke="#ffcc02" strokeWidth={1.5} dot={false} strokeDasharray="4 2" />}
          <Bar dataKey="value" radius={[borderRadius, borderRadius, 0, 0]}>
            {enrichedData.map((d, i) => (
              <Cell key={i} fill={gradient ? `url(#${gradId})` : color} fillOpacity={d.isAnomaly ? 1 : opacity} stroke={d.isAnomaly ? '#ef4444' : 'none'} strokeWidth={d.isAnomaly ? 2 : 0} />
            ))}
            {showLabel && <LabelList dataKey="value" formatter={fmtV} style={{ fontSize: 9, fill: 'rgba(255,255,255,0.55)' }} />}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    );
  }

  if (chartType === 'bar_stacked' || chartType === 'bar_grouped') {
    return (
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={enrichedData} margin={{ top: 4, right: 16, bottom: 28, left: 0 }}>
          {showGrid && <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />}
          <XAxis dataKey="name" tick={AXIS_STYLE} tickLine={false} axisLine={false} angle={-15} textAnchor="end" interval="preserveStartEnd" />
          <YAxis tick={AXIS_STYLE} tickFormatter={fmtV} tickLine={false} axisLine={false} width={44} />
          <Tooltip contentStyle={TOOLTIP_STYLE} formatter={fmtV} />
          <Bar dataKey="value" fill={color} fillOpacity={opacity} stackId={chartType === 'bar_stacked' ? 's' : undefined} radius={[borderRadius, borderRadius, 0, 0]}>
            {showLabel && <LabelList dataKey="value" formatter={fmtV} style={{ fontSize: 9, fill: 'rgba(255,255,255,0.55)' }} />}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    );
  }

  // ── LINE / AREA ──
  if (chartType === 'line' || chartType === 'step_line') {
    return (
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={enrichedData} margin={{ top: 4, right: 16, bottom: 4, left: 0 }}>
          <defs><GradDefs /></defs>
          {showGrid && <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />}
          <XAxis dataKey="name" tick={AXIS_STYLE} tickLine={false} axisLine={false} interval="preserveStartEnd" />
          <YAxis tick={AXIS_STYLE} tickFormatter={fmtV} tickLine={false} axisLine={false} width={44} />
          <Tooltip contentStyle={TOOLTIP_STYLE} formatter={fmtV} />
          {showLegend && <Legend wrapperStyle={{ fontSize: 10 }} />}
          {marks?.showReferenceLine && <ReferenceLine y={marks.referenceValue || 0} stroke="rgba(255,255,255,0.25)" strokeDasharray="5 3" />}
          <Line type={chartType === 'step_line' ? 'stepAfter' : 'monotone'} dataKey="value" stroke={color} strokeWidth={strokeWidth} dot={showDots ? { fill: color, r: 3 } : false}>
            {enrichedData.map((d, i) => d.isAnomaly && (
              <Cell key={i} stroke="#ef4444" strokeWidth={3} />
            ))}
          </Line>
          {marks?.showTrendLine && <Line type="monotone" dataKey="trend" stroke="#ffcc02" strokeWidth={1.5} dot={false} strokeDasharray="6 3" />}
        </LineChart>
      </ResponsiveContainer>
    );
  }

  if (chartType === 'area' || chartType === 'area_stacked') {
    return (
      <ResponsiveContainer width="100%" height={260}>
        <AreaChart data={enrichedData} margin={{ top: 4, right: 16, bottom: 4, left: 0 }}>
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={gradient?.from || color} stopOpacity={0.4} />
              <stop offset="95%" stopColor={gradient?.to || color} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          {showGrid && <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />}
          <XAxis dataKey="name" tick={AXIS_STYLE} tickLine={false} axisLine={false} interval="preserveStartEnd" />
          <YAxis tick={AXIS_STYLE} tickFormatter={fmtV} tickLine={false} axisLine={false} width={44} />
          <Tooltip contentStyle={TOOLTIP_STYLE} formatter={fmtV} />
          {marks?.showReferenceLine && <ReferenceLine y={marks.referenceValue || 0} stroke="rgba(255,255,255,0.25)" strokeDasharray="5 3" />}
          <Area type="monotone" dataKey="value" stroke={color} strokeWidth={strokeWidth} fill={`url(#${gradId})`} dot={showDots ? { fill: color, r: 3 } : false} stackId={chartType === 'area_stacked' ? 's' : undefined} />
          {marks?.showTrendLine && <Line type="monotone" dataKey="trend" stroke="#ffcc02" strokeWidth={1.5} dot={false} strokeDasharray="6 3" />}
        </AreaChart>
      </ResponsiveContainer>
    );
  }

  // ── FORECAST LINE ──
  if (chartType === 'forecast_line') {
    const combinedData = [...data.map(d => ({ ...d, historical: d.value })), ...buildForecast(data)];
    return (
      <ResponsiveContainer width="100%" height={260}>
        <ComposedChart data={combinedData} margin={{ top: 4, right: 16, bottom: 4, left: 0 }}>
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.4} />
              <stop offset="95%" stopColor={color} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          {showGrid && <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />}
          <XAxis dataKey="name" tick={AXIS_STYLE} tickLine={false} axisLine={false} interval="preserveStartEnd" />
          <YAxis tick={AXIS_STYLE} tickFormatter={fmtV} tickLine={false} axisLine={false} width={44} />
          <Tooltip contentStyle={TOOLTIP_STYLE} formatter={fmtV} />
          <Area type="monotone" dataKey="ci_upper" stroke="none" fill={color} fillOpacity={0.08} />
          <Area type="monotone" dataKey="ci_lower" stroke="none" fill="transparent" />
          <Line type="monotone" dataKey="historical" stroke={color} strokeWidth={strokeWidth} dot={false} connectNulls />
          <Line type="monotone" dataKey="forecast" stroke={color} strokeWidth={1.5} dot={{ fill: color, r: 4, strokeWidth: 2, stroke: 'rgba(0,0,0,0.5)' }} strokeDasharray="6 3" connectNulls />
        </ComposedChart>
      </ResponsiveContainer>
    );
  }

  // ── DUAL AXIS ──
  if (chartType === 'dual_axis') {
    const hasDual = enrichedData.some(d => d.value2 != null);
    if (!hasDual) return (
      <div className="space-y-2">
        <div className="text-xs text-amber-400 px-1 flex items-center gap-1.5">⚠ Add a second Y field to enable Dual Axis</div>
        <ResponsiveContainer width="100%" height={220}>
          <ComposedChart data={enrichedData} margin={{ top: 4, right: 16, bottom: 28, left: 0 }}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />}
            <XAxis dataKey="name" tick={AXIS_STYLE} tickLine={false} axisLine={false} angle={-15} textAnchor="end" interval="preserveStartEnd" />
            <YAxis tick={AXIS_STYLE} tickFormatter={fmtV} tickLine={false} axisLine={false} width={44} />
            <Tooltip contentStyle={TOOLTIP_STYLE} formatter={fmtV} />
            <Bar dataKey="value" fill={color} fillOpacity={opacity} radius={[borderRadius, borderRadius, 0, 0]} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    );
    return (
      <ResponsiveContainer width="100%" height={260}>
        <ComposedChart data={enrichedData} margin={{ top: 4, right: 44, bottom: 28, left: 0 }}>
          {showGrid && <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />}
          <XAxis dataKey="name" tick={AXIS_STYLE} tickLine={false} axisLine={false} angle={-15} textAnchor="end" interval="preserveStartEnd" />
          <YAxis yAxisId="left" tick={AXIS_STYLE} tickFormatter={fmtV} tickLine={false} axisLine={false} width={44} />
          <YAxis yAxisId="right" orientation="right" tick={AXIS_STYLE} tickFormatter={fmtV} tickLine={false} axisLine={false} width={44} />
          <Tooltip contentStyle={TOOLTIP_STYLE} formatter={fmtV} />
          {showLegend && <Legend wrapperStyle={{ fontSize: 10 }} />}
          <Bar yAxisId="left" dataKey="value" fill={color} fillOpacity={opacity} radius={[borderRadius, borderRadius, 0, 0]} name={yField} />
          <Line yAxisId="right" type="monotone" dataKey="value2" stroke="#a855f7" strokeWidth={strokeWidth} dot={false} name={y2Field} />
        </ComposedChart>
      </ResponsiveContainer>
    );
  }

  // ── SCATTER / BUBBLE ──
  if (chartType === 'scatter' || chartType === 'bubble') {
    return (
      <ResponsiveContainer width="100%" height={260}>
        <ScatterChart margin={{ top: 4, right: 16, bottom: 4, left: 0 }}>
          {showGrid && <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />}
          <XAxis type="number" dataKey="x" tick={AXIS_STYLE} tickLine={false} axisLine={false} tickFormatter={fmtV} name={xField} />
          <YAxis type="number" dataKey="y" tick={AXIS_STYLE} tickLine={false} axisLine={false} tickFormatter={fmtV} width={44} name={yField} />
          {chartType === 'bubble' && <ZAxis type="number" dataKey="z" range={[40, 400]} />}
          <Tooltip contentStyle={TOOLTIP_STYLE} formatter={fmtV} cursor={{ strokeDasharray: '3 3' }} />
          <Scatter data={data} fill={color} fillOpacity={opacity} />
        </ScatterChart>
      </ResponsiveContainer>
    );
  }

  // ── HISTOGRAM ──
  if (chartType === 'histogram') {
    return (
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={enrichedData} margin={{ top: 4, right: 16, bottom: 4, left: 0 }}>
          <defs><GradDefs /></defs>
          {showGrid && <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />}
          <XAxis dataKey="name" tick={AXIS_STYLE} tickLine={false} axisLine={false} />
          <YAxis tick={AXIS_STYLE} tickLine={false} axisLine={false} width={44} />
          <Tooltip contentStyle={TOOLTIP_STYLE} />
          <Bar dataKey="value" fill={gradient ? `url(#${gradId})` : color} fillOpacity={opacity} name="Frequency" radius={[2, 2, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    );
  }

  // ── PIE / DONUT ──
  if (chartType === 'donut' || chartType === 'pie') {
    const total = data.reduce((s, d) => s + d.value, 0);
    const inner = chartType === 'donut' ? 60 : 0;
    return (
      <div className="flex items-center gap-4">
        <ResponsiveContainer width={200} height={220}>
          <PieChart>
            <defs>
              {data.slice(0, 10).map((_, i) => (
                <radialGradient key={i} id={`rg${i}`}>
                  <stop offset="0%" stopColor={PALETTE[i % PALETTE.length]} stopOpacity={0.9} />
                  <stop offset="100%" stopColor={PALETTE[i % PALETTE.length]} stopOpacity={0.6} />
                </radialGradient>
              ))}
            </defs>
            <Pie data={data.slice(0, 10)} cx="50%" cy="50%" innerRadius={inner} outerRadius={88} paddingAngle={2} dataKey="value"
              startAngle={90} endAngle={-270}>
              {data.slice(0, 10).map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} fillOpacity={opacity} stroke="rgba(0,0,0,0.2)" strokeWidth={1} />)}
            </Pie>
            <Tooltip contentStyle={TOOLTIP_STYLE} formatter={v => [fmtV(v)]} />
          </PieChart>
        </ResponsiveContainer>
        <div className="flex-1 space-y-1.5 text-xs">
          {data.slice(0, 8).map((d, i) => (
            <div key={d.name} className="flex items-center gap-2 group cursor-default">
              <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: PALETTE[i % PALETTE.length] }} />
              <span className="flex-1 truncate text-white/55 group-hover:text-white/80 transition-colors">{d.name}</span>
              <span className="font-mono text-white/35">{total > 0 ? Math.round(d.value / total * 100) : 0}%</span>
            </div>
          ))}
          {data.length > 8 && <div className="text-white/20 text-xs">+{data.length - 8} more</div>}
        </div>
      </div>
    );
  }

  // ── TREEMAP ──
  if (chartType === 'treemap') {
    return (
      <ResponsiveContainer width="100%" height={260}>
        <Treemap data={data.slice(0, 20).map(d => ({ ...d, size: Math.max(1, d.value) }))}
          dataKey="size" aspectRatio={4 / 3}
          content={({ x, y, width, height, name, value, index }) => (
            <g>
              <rect x={x + 1} y={y + 1} width={width - 2} height={height - 2} fill={PALETTE[index % PALETTE.length]} fillOpacity={opacity} rx={4} stroke="rgba(0,0,0,0.2)" strokeWidth={1} />
              {width > 50 && height > 25 && (
                <>
                  <text x={x + 8} y={y + height / 2 - 5} fill="white" fillOpacity={0.85} fontSize={Math.min(11, width / 8)} fontWeight="600">{name?.slice(0, 14)}</text>
                  <text x={x + 8} y={y + height / 2 + 9} fill="white" fillOpacity={0.5} fontSize={9} fontFamily="monospace">{fmtV(value)}</text>
                </>
              )}
            </g>
          )} />
      </ResponsiveContainer>
    );
  }

  // ── WATERFALL ──
  if (chartType === 'waterfall') {
    return (
      <ResponsiveContainer width="100%" height={260}>
        <ComposedChart data={enrichedData} margin={{ top: 4, right: 16, bottom: 28, left: 0 }}>
          {showGrid && <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />}
          <XAxis dataKey="name" tick={AXIS_STYLE} tickLine={false} axisLine={false} angle={-20} textAnchor="end" interval="preserveStartEnd" />
          <YAxis tick={AXIS_STYLE} tickFormatter={fmtV} tickLine={false} axisLine={false} width={44} />
          <Tooltip contentStyle={TOOLTIP_STYLE} formatter={fmtV} />
          <Bar dataKey="start" stackId="a" fill="transparent" radius={0} />
          <Bar dataKey="value" stackId="a" radius={[borderRadius, borderRadius, 0, 0]}>
            {enrichedData.map((d, i) => <Cell key={i} fill={d.isTotal ? color : d.positive ? '#4caf50' : '#f87171'} fillOpacity={opacity} />)}
            {showLabel && <LabelList dataKey="total" formatter={fmtV} style={{ fontSize: 9, fill: 'rgba(255,255,255,0.55)' }} />}
          </Bar>
        </ComposedChart>
      </ResponsiveContainer>
    );
  }

  // ── BOX PLOT ──
  if (chartType === 'box_plot') {
    return (
      <div className="space-y-2 overflow-auto max-h-56 px-1">
        {enrichedData.slice(0, 10).map((d, i) => {
          const range = (d.max - d.min) || 1;
          const pct = (v) => `${Math.max(0, Math.min(100, ((v - d.min) / range) * 100))}%`;
          return (
            <div key={i} className="flex items-center gap-3 text-xs py-1">
              <span className="w-24 text-white/40 truncate shrink-0">{d.name}</span>
              <div className="flex-1 relative h-6 min-w-0">
                {/* Whiskers */}
                <div className="absolute top-1/2 h-px bg-white/20" style={{ left: pct(d.whisker_low || d.min), right: `${100 - parseFloat(pct(d.whisker_high || d.max))}%` }} />
                <div className="absolute top-0 bottom-0 w-px bg-white/25" style={{ left: pct(d.whisker_low || d.min) }} />
                <div className="absolute top-0 bottom-0 w-px bg-white/25" style={{ left: pct(d.whisker_high || d.max) }} />
                {/* IQR box */}
                <div className="absolute inset-y-1 rounded-sm border"
                  style={{ left: pct(d.q1), right: `${100 - parseFloat(pct(d.q3))}%`, background: `${color}25`, borderColor: `${color}60` }} />
                {/* Median */}
                <div className="absolute inset-y-0 w-0.5 rounded" style={{ left: pct(d.median), background: color }} />
              </div>
              <span className="font-mono text-white/35 w-12 text-right">{fmtV(d.median)}</span>
            </div>
          );
        })}
        <div className="flex items-center gap-3 text-xs text-white/20 pt-1 border-t border-white/5">
          <span className="w-24" />
          <div className="flex-1 flex justify-between"><span>Min</span><span>Q1</span><span style={{ color }}>Median</span><span>Q3</span><span>Max</span></div>
        </div>
      </div>
    );
  }

  // ── HEATMAP / HIGHLIGHT TABLE ──
  if (chartType === 'heatmap' || chartType === 'highlight_table') {
    const max = Math.max(...data.map(d => d.value), 1);
    const cols = Math.min(Math.ceil(Math.sqrt(data.slice(0, 30).length)), 6);
    return (
      <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
        {data.slice(0, 30).map((d, i) => {
          const pct = d.value / max;
          const hex = Math.round(pct * 160 + 15).toString(16).padStart(2, '0');
          return (
            <div key={i} className="rounded-xl p-2 text-center cursor-default hover:scale-105 transition-transform"
              style={{ background: `${color}${hex}`, border: `1px solid ${color}25` }}>
              <div className="text-white/50 truncate text-xs leading-tight">{d.name}</div>
              <div className="font-mono font-bold text-white mt-0.5 text-xs">{fmtV(d.value)}</div>
            </div>
          );
        })}
      </div>
    );
  }

  // ── TEXT TABLE / PIVOT ──
  if (chartType === 'text_table' || chartType === 'pivot') {
    const total = data.reduce((s, d) => s + d.value, 0);
    const max = Math.max(...data.map(d => d.value), 1);
    return (
      <div className="overflow-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-white/10">
              <th className="px-3 py-2 text-left text-white/35 font-semibold">{xField?.replace(/_/g, ' ') || 'Name'}</th>
              <th className="px-3 py-2 text-right text-white/35 font-semibold">{yField?.replace(/_/g, ' ') || 'Value'}</th>
              <th className="px-3 py-2 text-right text-white/35 font-semibold">% Total</th>
              <th className="px-3 py-2 text-white/35 font-semibold w-24">Bar</th>
            </tr>
          </thead>
          <tbody>
            {data.slice(0, 20).map((d, i) => {
              const pct = total > 0 ? d.value / total : 0;
              return (
                <tr key={i} className="border-b border-white/5 hover:bg-white/3 transition-colors">
                  <td className="px-3 py-2 text-white/65">{d.name}</td>
                  <td className="px-3 py-2 text-right font-mono text-white/80 font-semibold">{fmtV(d.value)}</td>
                  <td className="px-3 py-2 text-right font-mono text-white/35">{Math.round(pct * 100)}%</td>
                  <td className="px-3 py-2">
                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${(d.value / max) * 100}%`, background: color }} />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  // ── FUNNEL ──
  if (chartType === 'funnel') {
    return (
      <ResponsiveContainer width="100%" height={260}>
        <FunnelChart>
          <Tooltip contentStyle={TOOLTIP_STYLE} formatter={fmtV} />
          <Funnel dataKey="value" data={data.slice(0, 8).map((d, i) => ({ ...d, fill: PALETTE[i % PALETTE.length] }))} isAnimationActive>
            <LabelList dataKey="name" position="right" style={{ fontSize: 10, fill: 'rgba(255,255,255,0.55)' }} />
            <LabelList dataKey="value" position="center" formatter={fmtV} style={{ fontSize: 9, fill: 'rgba(255,255,255,0.7)', fontFamily: 'monospace' }} />
          </Funnel>
        </FunnelChart>
      </ResponsiveContainer>
    );
  }

  // ── RADAR ──
  if (chartType === 'radar') {
    return (
      <ResponsiveContainer width="100%" height={260}>
        <RadarChart data={enrichedData} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
          <PolarGrid stroke={GRID_STROKE} />
          <PolarAngleAxis dataKey="subject" tick={{ ...AXIS_STYLE, fontSize: 10 }} />
          <PolarRadiusAxis tick={AXIS_STYLE} axisLine={false} tickFormatter={fmtV} />
          <Radar dataKey="value" stroke={color} fill={color} fillOpacity={0.2} strokeWidth={strokeWidth} dot={{ fill: color, r: 3 }} />
          <Tooltip contentStyle={TOOLTIP_STYLE} formatter={fmtV} />
        </RadarChart>
      </ResponsiveContainer>
    );
  }

  // ── GAUGE ──
  if (chartType === 'gauge') {
    const total = data.reduce((s, d) => s + d.value, 0);
    const max = data.length > 0 ? Math.max(...data.map(d => d.value)) * data.length : 100;
    return <GaugeChart value={total} max={max || 100} color={color} />;
  }

  // ── KPI CARD / METRIC ──
  if (chartType === 'metric_card' || chartType === 'bullet') {
    const total = data.reduce((s, d) => s + d.value, 0);
    const max = Math.max(...data.map(d => d.value), 1);
    const top = data.slice(0, 3);
    return (
      <div className="flex flex-col items-center justify-center h-52 gap-4">
        <div className="text-center">
          <div className="text-5xl font-black font-mono leading-none" style={{ color, textShadow: `0 0 30px ${color}50` }}>{fmtV(total)}</div>
          <div className="text-sm text-white/35 mt-2 font-medium">{yField?.replace(/_/g, ' ') || 'KPI'}</div>
        </div>
        <div className="flex gap-4">
          {top.map((d, i) => (
            <div key={d.name} className="text-center">
              <div className="font-mono text-sm font-bold" style={{ color: PALETTE[i] }}>{fmtV(d.value)}</div>
              <div className="text-xs text-white/30 truncate max-w-20">{d.name}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── MAP CHARTS ──
  if (chartType === 'choropleth_map' || chartType === 'symbol_map' || chartType === 'heat_map_geo') {
    return <MapChart data={enrichedData} color={color} chartType={chartType} />;
  }

  // ── CANDLESTICK ──
  if (chartType === 'candlestick') {
    return <CandlestickChart data={enrichedData} color={color} />;
  }

  // ── PACKED BUBBLE ──
  if (chartType === 'packed_bubble') {
    return <PackedBubbleChart data={enrichedData} color={color} />;
  }

  // ── SANKEY ──
  if (chartType === 'sankey') {
    return <SankeyChart data={enrichedData} color={color} />;
  }

  // ── SUNBURST ── (simple ring visualization)
  if (chartType === 'sunburst') {
    const total = data.reduce((s, d) => s + d.value, 0);
    const W = 220, H = 220, cx = W / 2, cy = H / 2;
    let angle = -Math.PI / 2;
    const arcs = data.slice(0, 10).map((d, i) => {
      const sweep = (d.value / total) * 2 * Math.PI;
      const a1 = angle, a2 = angle + sweep;
      angle = a2;
      const r1 = 50, r2 = 90;
      const x1 = cx + r1 * Math.cos(a1), y1 = cy + r1 * Math.sin(a1);
      const x2 = cx + r2 * Math.cos(a1), y2 = cy + r2 * Math.sin(a1);
      const x3 = cx + r2 * Math.cos(a2), y3 = cy + r2 * Math.sin(a2);
      const x4 = cx + r1 * Math.cos(a2), y4 = cy + r1 * Math.sin(a2);
      const large = sweep > Math.PI ? 1 : 0;
      const path = `M ${x1} ${y1} A ${r1} ${r1} 0 ${large} 1 ${x4} ${y4} L ${x3} ${y3} A ${r2} ${r2} 0 ${large} 0 ${x2} ${y2} Z`;
      return { path, color: PALETTE[i % PALETTE.length], name: d.name, pct: Math.round((d.value / total) * 100) };
    });
    return (
      <div className="flex items-center gap-4">
        <svg width={W} height={H}>
          {arcs.map((a, i) => <path key={i} d={a.path} fill={a.color} fillOpacity={opacity} stroke="rgba(0,0,0,0.2)" strokeWidth={1} />)}
          <circle cx={cx} cy={cy} r={45} fill="rgba(4,9,20,0.8)" />
          <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle" fill="rgba(255,255,255,0.5)" fontSize={10}>Total</text>
        </svg>
        <div className="flex-1 space-y-1 text-xs">
          {arcs.map(a => (
            <div key={a.name} className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: a.color }} />
              <span className="flex-1 truncate text-white/55">{a.name}</span>
              <span className="font-mono text-white/35">{a.pct}%</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── DENSITY STRIP ── (violin-like)
  if (chartType === 'violin') {
    return (
      <div className="space-y-2 max-h-56 overflow-y-auto">
        {enrichedData.slice(0, 10).map((d, i) => (
          <div key={d.name} className="flex items-center gap-3 text-xs">
            <span className="w-24 text-white/40 truncate shrink-0">{d.name}</span>
            <div className="flex-1 h-4 relative overflow-hidden">
              <div className="absolute inset-0 rounded-full overflow-hidden"
                style={{ background: `radial-gradient(ellipse at ${(d.value / Math.max(...enrichedData.map(x => x.value), 1)) * 90}% 50%, ${color}70, transparent)` }} />
              <div className="absolute inset-y-1 left-0 rounded-full" style={{ width: `${(d.value / Math.max(...enrichedData.map(x => x.value), 1)) * 100}%`, background: `${color}30` }} />
              <div className="absolute inset-y-0 rounded-full w-1" style={{ left: `${(d.value / Math.max(...enrichedData.map(x => x.value), 1)) * 100}%`, background: color }} />
            </div>
            <span className="font-mono text-white/35 w-10 text-right">{fmtV(d.value)}</span>
          </div>
        ))}
      </div>
    );
  }

  // ── GANTT ──
  if (chartType === 'gantt') {
    return (
      <div className="space-y-1.5 overflow-auto max-h-56">
        {data.slice(0, 15).map((d, i) => {
          const total = data.reduce((s, x) => s + x.value, 0);
          const pct = total > 0 ? (d.value / total) * 100 : 0;
          const offset = data.slice(0, i).reduce((s, x) => s + x.value, 0) / total * 100;
          return (
            <div key={d.name} className="flex items-center gap-2 text-xs">
              <span className="w-24 text-white/40 truncate shrink-0">{d.name}</span>
              <div className="flex-1 h-5 bg-white/3 rounded relative overflow-hidden">
                <div className="absolute inset-y-0.5 rounded" style={{ left: `${offset}%`, width: `${pct}%`, background: PALETTE[i % PALETTE.length], opacity: opacity }} />
              </div>
              <span className="font-mono text-white/35 w-10 text-right">{fmtV(d.value)}</span>
            </div>
          );
        })}
      </div>
    );
  }

  // ── Fallback: bar ──
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={enrichedData} margin={{ top: 4, right: 16, bottom: 28, left: 0 }}>
        <defs><GradDefs /></defs>
        {showGrid && <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />}
        <XAxis dataKey="name" tick={AXIS_STYLE} tickLine={false} axisLine={false} angle={-20} textAnchor="end" interval="preserveStartEnd" />
        <YAxis tick={AXIS_STYLE} tickFormatter={fmtV} tickLine={false} axisLine={false} width={44} />
        <Tooltip contentStyle={TOOLTIP_STYLE} formatter={fmtV} />
        <Bar dataKey="value" fill={gradient ? `url(#${gradId})` : color} fillOpacity={opacity} radius={[borderRadius, borderRadius, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}