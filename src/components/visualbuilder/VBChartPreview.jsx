/**
 * VBChartPreview — Chart rendering for all supported chart types
 */
import {
  BarChart, Bar, AreaChart, Area, LineChart, Line, ComposedChart,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, ScatterChart, Scatter, ReferenceLine, Legend,
  FunnelChart, Funnel, LabelList, Treemap,
} from 'recharts';

const PALETTE = ['#00e5ff', '#a855f7', '#ff6b35', '#4caf50', '#ff2d7a', '#ffcc02', '#00bfa5', '#60a5fa', '#e91e63', '#fb923c'];
const TOOLTIP_STYLE = { backgroundColor: 'rgba(5,10,24,0.97)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, fontSize: 11 };
const AXIS_STYLE = { fontSize: 9, fill: 'rgba(255,255,255,0.3)' };

export function fmtV(v) {
  if (v == null || isNaN(v)) return String(v ?? '');
  const n = Number(v);
  if (Math.abs(n) >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (Math.abs(n) >= 1e3) return `${(n / 1e3).toFixed(0)}K`;
  return n.toLocaleString(undefined, { maximumFractionDigits: 1 });
}

export function buildChartData(rows, shelves, aggFn, chartType) {
  if (!rows?.length) return [];
  const xField = shelves.x?.[0]?.name;
  const yField = shelves.y?.[0]?.name;

  if (chartType === 'histogram' && yField) {
    const vals = rows.map(r => Number(r[yField])).filter(v => !isNaN(v));
    if (!vals.length) return [];
    const min = Math.min(...vals), max = Math.max(...vals);
    const bins = 12;
    const range = (max - min) || 1;
    const counts = new Array(bins).fill(0);
    vals.forEach(v => counts[Math.min(bins - 1, Math.floor(((v - min) / range) * bins))]++);
    return counts.map((count, i) => ({ name: fmtV(min + (i / bins) * range), value: count }));
  }

  if (chartType === 'scatter' && xField && yField) {
    return rows.slice(0, 400).map(r => ({ x: Number(r[xField]), y: Number(r[yField]) })).filter(d => !isNaN(d.x) && !isNaN(d.y));
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
      return { name, min: sorted[0], q1, median, q3, max: sorted[sorted.length - 1] };
    });
  }

  if (chartType === 'waterfall' && xField && yField) {
    const groups = {};
    rows.forEach(r => { const k = String(r[xField] ?? ''); groups[k] = (groups[k] || 0) + (Number(r[yField]) || 0); });
    let cum = 0;
    return Object.entries(groups).slice(0, 15).map(([name, value]) => {
      const start = cum; cum += value;
      return { name, value: Math.round(value), start: Math.round(start), positive: value >= 0 };
    });
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
      default: return g.values.reduce((a, b) => a + b, 0);
    }
  };
  const sorted = Object.entries(groups).map(([name, g]) => ({ name, value: Math.round(agg(g) * 100) / 100 })).sort((a, b) => b.value - a.value).slice(0, 20);
  return sorted;
}

function EmptyState({ msg }) {
  return <div className="flex items-center justify-center h-52 text-white/20 text-sm">{msg || 'Configure fields to preview chart'}</div>;
}

export default function VBChartPreview({ chartType, data, marks, shelves }) {
  if (!data?.length) return <EmptyState />;
  const color = marks?.color || '#00e5ff';
  const opacity = (marks?.opacity ?? 85) / 100;
  const showLabel = marks?.showLabel;
  const xField = shelves?.x?.[0]?.name;
  const yField = shelves?.y?.[0]?.name;

  if (chartType === 'bar' || chartType === 'bar_horizontal') {
    const layout = chartType === 'bar_horizontal' ? 'vertical' : 'horizontal';
    return (
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data} layout={layout} margin={{ top: 4, right: 12, bottom: 24, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
          {layout === 'horizontal' ? (
            <>
              <XAxis dataKey="name" tick={AXIS_STYLE} tickLine={false} axisLine={false} interval="preserveStartEnd" angle={-20} textAnchor="end" />
              <YAxis tick={AXIS_STYLE} tickFormatter={fmtV} tickLine={false} axisLine={false} width={42} />
            </>
          ) : (
            <>
              <XAxis type="number" tick={AXIS_STYLE} tickFormatter={fmtV} tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey="name" tick={AXIS_STYLE} tickLine={false} axisLine={false} width={90} />
            </>
          )}
          <Tooltip contentStyle={TOOLTIP_STYLE} formatter={fmtV} />
          <Bar dataKey="value" fill={color} fillOpacity={opacity} radius={[3, 3, 0, 0]}>
            {showLabel && <LabelList dataKey="value" formatter={fmtV} style={{ fontSize: 9, fill: 'rgba(255,255,255,0.6)' }} />}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    );
  }

  if (chartType === 'bar_stacked') {
    return (
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data} margin={{ top: 4, right: 12, bottom: 24, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
          <XAxis dataKey="name" tick={AXIS_STYLE} tickLine={false} axisLine={false} angle={-20} textAnchor="end" interval="preserveStartEnd" />
          <YAxis tick={AXIS_STYLE} tickFormatter={fmtV} tickLine={false} axisLine={false} width={42} />
          <Tooltip contentStyle={TOOLTIP_STYLE} formatter={fmtV} />
          <Bar dataKey="value" fill={color} fillOpacity={opacity} stackId="s" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    );
  }

  if (chartType === 'line' || chartType === 'dual_line') {
    return (
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={data} margin={{ top: 4, right: 12, bottom: 4, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
          <XAxis dataKey="name" tick={AXIS_STYLE} tickLine={false} axisLine={false} interval="preserveStartEnd" />
          <YAxis tick={AXIS_STYLE} tickFormatter={fmtV} tickLine={false} axisLine={false} width={42} />
          <Tooltip contentStyle={TOOLTIP_STYLE} formatter={fmtV} />
          <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    );
  }

  if (chartType === 'area' || chartType === 'area_stacked') {
    return (
      <ResponsiveContainer width="100%" height={260}>
        <AreaChart data={data} margin={{ top: 4, right: 12, bottom: 4, left: 0 }}>
          <defs>
            <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.3} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
          <XAxis dataKey="name" tick={AXIS_STYLE} tickLine={false} axisLine={false} interval="preserveStartEnd" />
          <YAxis tick={AXIS_STYLE} tickFormatter={fmtV} tickLine={false} axisLine={false} width={42} />
          <Tooltip contentStyle={TOOLTIP_STYLE} formatter={fmtV} />
          <Area type="monotone" dataKey="value" stroke={color} fill="url(#areaGrad)" strokeWidth={2} dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    );
  }

  if (chartType === 'scatter') {
    return (
      <ResponsiveContainer width="100%" height={260}>
        <ScatterChart margin={{ top: 4, right: 12, bottom: 4, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
          <XAxis type="number" dataKey="x" tick={AXIS_STYLE} tickLine={false} axisLine={false} tickFormatter={fmtV} name={xField} />
          <YAxis type="number" dataKey="y" tick={AXIS_STYLE} tickLine={false} axisLine={false} tickFormatter={fmtV} width={42} name={yField} />
          <Tooltip contentStyle={TOOLTIP_STYLE} formatter={fmtV} cursor={{ strokeDasharray: '3 3' }} />
          <Scatter data={data} fill={color} fillOpacity={opacity} />
        </ScatterChart>
      </ResponsiveContainer>
    );
  }

  if (chartType === 'histogram') {
    return (
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data} margin={{ top: 4, right: 12, bottom: 4, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
          <XAxis dataKey="name" tick={AXIS_STYLE} tickLine={false} axisLine={false} />
          <YAxis tick={AXIS_STYLE} tickLine={false} axisLine={false} width={42} />
          <Tooltip contentStyle={TOOLTIP_STYLE} />
          <Bar dataKey="value" fill={color} fillOpacity={opacity} name="Frequency" />
        </BarChart>
      </ResponsiveContainer>
    );
  }

  if (chartType === 'donut' || chartType === 'pie') {
    const total = data.reduce((s, d) => s + d.value, 0);
    const innerRadius = chartType === 'donut' ? 55 : 0;
    return (
      <div className="flex items-center gap-4">
        <ResponsiveContainer width={180} height={210}>
          <PieChart>
            <Pie data={data.slice(0, 8)} cx="50%" cy="50%" innerRadius={innerRadius} outerRadius={82} paddingAngle={2} dataKey="value">
              {data.slice(0, 8).map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} fillOpacity={opacity} />)}
            </Pie>
            <Tooltip contentStyle={TOOLTIP_STYLE} formatter={v => [fmtV(v)]} />
          </PieChart>
        </ResponsiveContainer>
        <div className="flex-1 space-y-1.5 text-xs">
          {data.slice(0, 7).map((d, i) => (
            <div key={d.name} className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: PALETTE[i % PALETTE.length] }} />
              <span className="truncate text-white/60">{d.name}</span>
              <span className="ml-auto font-mono text-white/40">{total > 0 ? Math.round(d.value / total * 100) : 0}%</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (chartType === 'treemap') {
    return (
      <ResponsiveContainer width="100%" height={260}>
        <Treemap data={data.slice(0, 20).map(d => ({ ...d, size: d.value })).filter(d => d.size > 0)}
          dataKey="size" aspectRatio={4 / 3}
          content={({ x, y, width, height, name, value, index }) => (
            <g>
              <rect x={x} y={y} width={width} height={height} fill={PALETTE[index % PALETTE.length]} fillOpacity={opacity} stroke="rgba(0,0,0,0.3)" rx={4} />
              {width > 40 && height > 20 && (
                <text x={x + width / 2} y={y + height / 2} textAnchor="middle" dominantBaseline="middle" fontSize={10} fill="white" fillOpacity={0.8}>{name}</text>
              )}
            </g>
          )} />
      </ResponsiveContainer>
    );
  }

  if (chartType === 'waterfall') {
    return (
      <ResponsiveContainer width="100%" height={260}>
        <ComposedChart data={data} margin={{ top: 4, right: 12, bottom: 24, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
          <XAxis dataKey="name" tick={AXIS_STYLE} tickLine={false} axisLine={false} angle={-20} textAnchor="end" interval="preserveStartEnd" />
          <YAxis tick={AXIS_STYLE} tickFormatter={fmtV} tickLine={false} axisLine={false} width={42} />
          <Tooltip contentStyle={TOOLTIP_STYLE} formatter={fmtV} />
          <Bar dataKey="start" stackId="a" fill="transparent" />
          <Bar dataKey="value" stackId="a" radius={[3, 3, 0, 0]}>
            {data.map((d, i) => <Cell key={i} fill={d.positive ? '#4caf50' : '#f87171'} fillOpacity={opacity} />)}
          </Bar>
        </ComposedChart>
      </ResponsiveContainer>
    );
  }

  if (chartType === 'box_plot') {
    if (!data?.length) return <EmptyState msg="Need X and Y fields for box plot" />;
    return (
      <div className="space-y-3 overflow-auto px-1">
        {data.slice(0, 8).map((d, i) => {
          const range = (d.max - d.min) || 1;
          return (
            <div key={i} className="flex items-center gap-3 text-xs">
              <span className="w-20 text-white/40 truncate">{d.name}</span>
              <div className="flex-1 relative h-5">
                <div className="absolute inset-y-0 rounded-sm" style={{ left: `${((d.q1 - d.min) / range) * 100}%`, right: `${((d.max - d.q3) / range) * 100}%`, background: `${color}30`, border: `1px solid ${color}60` }} />
                <div className="absolute inset-y-0 w-0.5 rounded" style={{ left: `${((d.median - d.min) / range) * 100}%`, background: color }} />
                <div className="absolute top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-white/20" style={{ left: 0 }} />
                <div className="absolute top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-white/20" style={{ right: 0 }} />
              </div>
              <span className="font-mono text-white/30 text-xs">{fmtV(d.median)}</span>
            </div>
          );
        })}
        <div className="flex items-center gap-4 text-xs text-white/25 pt-1 border-t border-white/5">
          <span>Min</span><div className="flex-1 h-px bg-white/5" /><span style={{ color }}>Median</span><div className="flex-1 h-px bg-white/5" /><span>Max</span>
        </div>
      </div>
    );
  }

  if (chartType === 'heatmap' || chartType === 'highlight_table') {
    const max = Math.max(...data.map(d => d.value));
    return (
      <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${Math.min(data.length, 6)}, 1fr)` }}>
        {data.slice(0, 24).map((d, i) => {
          const intensity = max > 0 ? d.value / max : 0;
          return (
            <div key={i} className="rounded-lg p-2 text-center text-xs"
              style={{ background: `${color}${Math.round(intensity * 60 + 10).toString(16).padStart(2, '0')}`, border: `1px solid ${color}25` }}>
              <div className="text-white/50 truncate text-xs">{d.name}</div>
              <div className="font-mono font-bold text-white/80 text-xs mt-0.5">{fmtV(d.value)}</div>
            </div>
          );
        })}
      </div>
    );
  }

  if (chartType === 'text_table' || chartType === 'pivot') {
    return (
      <div className="overflow-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-white/8">
              <th className="px-3 py-2 text-left text-white/35">Name</th>
              <th className="px-3 py-2 text-right text-white/35">Value</th>
              <th className="px-3 py-2 text-right text-white/35">% of Total</th>
            </tr>
          </thead>
          <tbody>
            {data.slice(0, 15).map((d, i) => {
              const total = data.reduce((s, x) => s + x.value, 0);
              return (
                <tr key={i} className="border-b border-white/5 hover:bg-white/2">
                  <td className="px-3 py-2 text-white/60">{d.name}</td>
                  <td className="px-3 py-2 text-right font-mono text-white/75">{fmtV(d.value)}</td>
                  <td className="px-3 py-2 text-right font-mono text-white/35">{total > 0 ? Math.round(d.value / total * 100) : 0}%</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  if (chartType === 'funnel') {
    return (
      <ResponsiveContainer width="100%" height={260}>
        <FunnelChart>
          <Tooltip contentStyle={TOOLTIP_STYLE} formatter={fmtV} />
          <Funnel dataKey="value" data={data.slice(0, 8).map((d, i) => ({ ...d, fill: PALETTE[i % PALETTE.length] }))} isAnimationActive>
            <LabelList dataKey="name" position="right" style={{ fontSize: 10, fill: 'rgba(255,255,255,0.5)' }} />
          </Funnel>
        </FunnelChart>
      </ResponsiveContainer>
    );
  }

  if (chartType === 'metric_card' || chartType === 'gauge' || chartType === 'bullet') {
    const total = data.reduce((s, d) => s + d.value, 0);
    return (
      <div className="flex items-center justify-center h-52">
        <div className="text-center">
          <div className="text-5xl font-black font-mono" style={{ color }}>{fmtV(total)}</div>
          <div className="text-sm text-white/40 mt-2">{yField?.replace(/_/g, ' ') || 'KPI'}</div>
        </div>
      </div>
    );
  }

  // Fallback: bar
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 4, right: 12, bottom: 24, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
        <XAxis dataKey="name" tick={AXIS_STYLE} tickLine={false} axisLine={false} angle={-20} textAnchor="end" interval="preserveStartEnd" />
        <YAxis tick={AXIS_STYLE} tickFormatter={fmtV} tickLine={false} axisLine={false} width={42} />
        <Tooltip contentStyle={TOOLTIP_STYLE} formatter={fmtV} />
        <Bar dataKey="value" fill={color} fillOpacity={opacity} radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}