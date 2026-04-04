/**
 * AnalystChart — Rich chart renderer for AI Analyst responses
 * Supports: bar, horizontal_bar, area, line, donut, pie, scatter,
 *           composed (line+bar), histogram, reference_line, heatmap
 */
import {
  BarChart, Bar, AreaChart, Area, LineChart, Line, ComposedChart,
  PieChart, Pie, Cell, ScatterChart, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ReferenceLine, Brush,
} from 'recharts';

const PALETTE = [
  '#00e5ff', '#ff2d7a', '#7b2fff', '#ff6b35',
  '#4caf50', '#ffcc02', '#00bfa5', '#e91e63',
  '#29b6f6', '#ab47bc',
];

const TOOLTIP_STYLE = {
  backgroundColor: 'rgba(8,6,18,0.96)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 10,
  fontSize: 11,
  color: '#e2e8f0',
  boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
};

const fmtV = (v) => {
  if (v == null || isNaN(v)) return v;
  const n = Number(v);
  if (Math.abs(n) >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
  if (Math.abs(n) >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (Math.abs(n) >= 1e3) return `${(n / 1e3).toFixed(0)}K`;
  return typeof n === 'number' ? n.toLocaleString(undefined, { maximumFractionDigits: 2 }) : String(n);
};

const axisStyle = { fontSize: 9, fill: 'rgba(255,255,255,0.35)' };

export default function AnalystChart({ chart, height = 220 }) {
  if (!chart?.data?.length) return null;

  const {
    type = 'bar',
    data,
    title,
    x_key = 'name',
    y_key = 'value',
    y2_key,
    reference_value,
    reference_label,
    series, // for multi-series charts: [{key, color, type}]
  } = chart;

  const isHorizontal = type === 'horizontal_bar' || (type === 'bar' && data.length > 7);

  const commonTooltip = (
    <Tooltip
      contentStyle={TOOLTIP_STYLE}
      formatter={(v, name) => [fmtV(v), name]}
      labelStyle={{ color: '#94a3b8', fontSize: 10 }}
      cursor={{ fill: 'rgba(255,255,255,0.03)' }}
    />
  );

  const commonGrid = (
    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
  );

  // ── Donut / Pie ────────────────────────────────────────────────
  if (type === 'donut' || type === 'pie') {
    const total = data.reduce((s, d) => s + (Number(d[y_key]) || 0), 0);
    return (
      <div className="flex gap-3 items-center" style={{ height }}>
        <ResponsiveContainer width="50%" height={height}>
          <PieChart>
            <Pie
              data={data} dataKey={y_key} nameKey={x_key}
              cx="50%" cy="50%"
              innerRadius={type === 'donut' ? '42%' : 0}
              outerRadius="72%" paddingAngle={2}
              strokeWidth={0}
            >
              {data.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
            </Pie>
            <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [fmtV(v), '']} />
          </PieChart>
        </ResponsiveContainer>
        <div className="flex-1 space-y-1.5 overflow-auto" style={{ maxHeight: height }}>
          {data.slice(0, 10).map((d, i) => {
            const pct = total > 0 ? ((d[y_key] / total) * 100).toFixed(1) : 0;
            return (
              <div key={i} className="flex items-center gap-2 text-xs">
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: PALETTE[i % PALETTE.length] }} />
                <span className="text-white/50 flex-1 truncate">{d[x_key]}</span>
                <span className="font-mono text-white/70">{fmtV(d[y_key])}</span>
                <span className="text-white/30 font-mono">{pct}%</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ── Scatter ────────────────────────────────────────────────────
  if (type === 'scatter') {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <ScatterChart margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
          {commonGrid}
          <XAxis dataKey="x" type="number" tick={axisStyle} tickFormatter={fmtV} name={x_key} tickLine={false} axisLine={false} />
          <YAxis dataKey="y" type="number" tick={axisStyle} tickFormatter={fmtV} name={y_key} tickLine={false} axisLine={false} width={40} />
          {commonTooltip}
          {reference_value != null && <ReferenceLine y={reference_value} stroke="rgba(255,204,2,0.6)" strokeDasharray="4 3" label={{ value: reference_label || `Avg: ${fmtV(reference_value)}`, fill: '#ffcc02', fontSize: 9 }} />}
          <Scatter data={data} fill={PALETTE[0]} fillOpacity={0.75} />
        </ScatterChart>
      </ResponsiveContainer>
    );
  }

  // ── Composed (line + bar) ──────────────────────────────────────
  if (type === 'composed' && series?.length) {
    const uniqueId = `cg-${Math.random().toString(36).slice(2, 6)}`;
    return (
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart data={data} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
          <defs>
            {series.filter(s => s.type === 'area').map((s, i) => (
              <linearGradient key={i} id={`${uniqueId}-${i}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={s.color || PALETTE[i]} stopOpacity={0.3} />
                <stop offset="95%" stopColor={s.color || PALETTE[i]} stopOpacity={0} />
              </linearGradient>
            ))}
          </defs>
          {commonGrid}
          <XAxis dataKey={x_key} tick={axisStyle} tickLine={false} axisLine={false} interval="preserveStartEnd" />
          <YAxis yAxisId="left" tick={axisStyle} tickFormatter={fmtV} tickLine={false} axisLine={false} width={40} />
          {y2_key && <YAxis yAxisId="right" orientation="right" tick={axisStyle} tickFormatter={fmtV} tickLine={false} axisLine={false} width={40} />}
          {commonTooltip}
          <Legend wrapperStyle={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }} />
          {reference_value != null && <ReferenceLine yAxisId="left" y={reference_value} stroke="rgba(255,204,2,0.5)" strokeDasharray="4 3" />}
          {series.map((s, i) => {
            const color = s.color || PALETTE[i];
            if (s.type === 'bar') return <Bar key={i} yAxisId={s.axis || 'left'} dataKey={s.key} fill={color} fillOpacity={0.8} radius={[3, 3, 0, 0]} />;
            if (s.type === 'area') return <Area key={i} yAxisId={s.axis || 'left'} type="monotone" dataKey={s.key} stroke={color} fill={`url(#${uniqueId}-${i})`} strokeWidth={2} dot={false} />;
            return <Line key={i} yAxisId={s.axis || 'left'} type="monotone" dataKey={s.key} stroke={color} strokeWidth={2} dot={false} />;
          })}
          {data.length > 20 && <Brush dataKey={x_key} height={18} stroke="rgba(255,255,255,0.1)" fill="rgba(0,0,0,0.3)" travellerWidth={6} />}
        </ComposedChart>
      </ResponsiveContainer>
    );
  }

  // ── Area / Line ────────────────────────────────────────────────
  if (type === 'area' || type === 'line') {
    const uid = `ag-${Math.random().toString(36).slice(2, 6)}`;
    const color = PALETTE[0];
    const ChartComp = type === 'area' ? AreaChart : LineChart;
    const DataComp = type === 'area' ? Area : Line;
    return (
      <ResponsiveContainer width="100%" height={height}>
        <ChartComp data={data} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
          {type === 'area' && (
            <defs>
              <linearGradient id={uid} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.32} />
                <stop offset="95%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
          )}
          {commonGrid}
          <XAxis dataKey={x_key} tick={axisStyle} tickLine={false} axisLine={false} interval="preserveStartEnd" />
          <YAxis tick={axisStyle} tickFormatter={fmtV} tickLine={false} axisLine={false} width={42} />
          {commonTooltip}
          {reference_value != null && (
            <ReferenceLine y={reference_value} stroke="rgba(255,204,2,0.55)" strokeDasharray="4 3"
              label={{ value: reference_label || `Ref: ${fmtV(reference_value)}`, fill: '#ffcc02', fontSize: 9 }} />
          )}
          <DataComp type="monotone" dataKey={y_key} stroke={color}
            fill={type === 'area' ? `url(#${uid})` : undefined}
            strokeWidth={2} dot={false} activeDot={{ r: 4, fill: color }} />
          {y2_key && <Line type="monotone" dataKey={y2_key} stroke={PALETTE[1]} strokeWidth={1.5} strokeDasharray="4 3" dot={false} />}
          {data.length > 20 && <Brush dataKey={x_key} height={18} stroke="rgba(255,255,255,0.1)" fill="rgba(0,0,0,0.3)" travellerWidth={6} />}
        </ChartComp>
      </ResponsiveContainer>
    );
  }

  // ── Histogram ──────────────────────────────────────────────────
  if (type === 'histogram') {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} margin={{ top: 4, right: 4, bottom: 4, left: 0 }} barCategoryGap="2%">
          {commonGrid}
          <XAxis dataKey={x_key} tick={{ ...axisStyle, fontSize: 8 }} tickLine={false} axisLine={false} />
          <YAxis tick={axisStyle} tickLine={false} axisLine={false} width={36} />
          {commonTooltip}
          <Bar dataKey={y_key} fill={PALETTE[0]} fillOpacity={0.8} radius={[2, 2, 0, 0]} />
          {reference_value != null && <ReferenceLine x={String(reference_value)} stroke="#ffcc02" strokeDasharray="4 3" />}
        </BarChart>
      </ResponsiveContainer>
    );
  }

  // ── Bar (vertical or horizontal) ──────────────────────────────
  if (isHorizontal) {
    return (
      <ResponsiveContainer width="100%" height={Math.max(height, data.length * 28)}>
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 32, bottom: 4, left: 4 }}>
          {commonGrid}
          <XAxis type="number" tick={axisStyle} tickFormatter={fmtV} tickLine={false} axisLine={false} />
          <YAxis dataKey={x_key} type="category" tick={{ ...axisStyle, fontSize: 9 }} tickLine={false} axisLine={false} width={90} />
          {commonTooltip}
          {reference_value != null && <ReferenceLine x={reference_value} stroke="rgba(255,204,2,0.55)" strokeDasharray="4 3" />}
          <Bar dataKey={y_key} radius={[0, 4, 4, 0]}>
            {data.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} fillOpacity={0.85} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    );
  }

  // vertical bar (default)
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 4, right: 4, bottom: 4, left: 0 }}>
        {commonGrid}
        <XAxis dataKey={x_key} tick={axisStyle} tickLine={false} axisLine={false} interval={data.length > 8 ? 'preserveStartEnd' : 0} />
        <YAxis tick={axisStyle} tickFormatter={fmtV} tickLine={false} axisLine={false} width={42} />
        {commonTooltip}
        {reference_value != null && (
          <ReferenceLine y={reference_value} stroke="rgba(255,204,2,0.55)" strokeDasharray="4 3"
            label={{ value: reference_label || `Avg`, fill: '#ffcc02', fontSize: 9 }} />
        )}
        <Bar dataKey={y_key} radius={[4, 4, 0, 0]}>
          {data.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} fillOpacity={0.85} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}