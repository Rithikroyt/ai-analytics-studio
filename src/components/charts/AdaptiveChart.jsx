/**
 * AdaptiveChart — renders the correct chart type based on AI recommendation
 * Supports: kpi_gauge, line_area, bar, horizontal_bar, donut, scatter, heatmap, histogram, metric_card
 */
import {
  AreaChart, Area, BarChart, Bar, ScatterChart, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend,
} from 'recharts';

const THEME_COLORS = {
  cyan:   { primary: '#00e5ff', secondary: '#0097a7', bg: 'rgba(0,229,255,0.08)', border: 'rgba(0,229,255,0.25)' },
  purple: { primary: '#9c27b0', secondary: '#7b2fff', bg: 'rgba(156,39,176,0.08)', border: 'rgba(156,39,176,0.25)' },
  orange: { primary: '#ff6b35', secondary: '#e64a19', bg: 'rgba(255,107,53,0.08)', border: 'rgba(255,107,53,0.25)' },
  green:  { primary: '#4caf50', secondary: '#00c853', bg: 'rgba(76,175,80,0.08)',  border: 'rgba(76,175,80,0.25)' },
  pink:   { primary: '#ff2d7a', secondary: '#e91e63', bg: 'rgba(255,45,122,0.08)', border: 'rgba(255,45,122,0.25)' },
  yellow: { primary: '#ffcc02', secondary: '#f9a825', bg: 'rgba(255,204,2,0.08)',  border: 'rgba(255,204,2,0.25)' },
  teal:   { primary: '#00bfa5', secondary: '#009688', bg: 'rgba(0,191,165,0.08)',  border: 'rgba(0,191,165,0.25)' },
};
const CHART_COLORS = ['#00e5ff','#ff2d7a','#7b2fff','#ff6b35','#4caf50','#ffcc02','#00bfa5','#e91e63'];

const fmtV = (v) => {
  if (v == null || isNaN(v)) return '—';
  const n = Number(v);
  if (Math.abs(n) >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
  if (Math.abs(n) >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (Math.abs(n) >= 1e3) return `${(n / 1e3).toFixed(0)}K`;
  return typeof n === 'number' ? n.toLocaleString(undefined, { maximumFractionDigits: 2 }) : String(n);
};

const tooltipStyle = {
  backgroundColor: 'rgba(10,8,20,0.95)',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 8,
  fontSize: 11,
  color: '#e2e8f0',
};

// ── KPI Gauge (Radial SVG) ────────────────────────────────────────
function KpiGauge({ value, max, label, color, number, unit = '' }) {
  const pct = Math.min(Math.max((value / (max || 1)), 0), 1);
  const size = 140;
  const r = size / 2 - 16;
  const circ = 2 * Math.PI * r;
  const dash = pct * circ;
  const tc = THEME_COLORS[color] || THEME_COLORS.cyan;
  const gId = `g-${color}-${label?.replace(/\W/g, '')}`;
  return (
    <div className="flex flex-col items-center justify-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
          <defs>
            <linearGradient id={gId} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={tc.primary} />
              <stop offset="100%" stopColor={tc.secondary} />
            </linearGradient>
          </defs>
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" />
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={`url(#${gId})`} strokeWidth="10"
            strokeLinecap="round" strokeDasharray={`${dash} ${circ}`}
            style={{ filter: `drop-shadow(0 0 6px ${tc.primary}88)` }} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="font-black font-mono text-2xl leading-none" style={{ color: tc.primary, textShadow: `0 0 14px ${tc.primary}99` }}>
            {number ?? `${Math.round(pct * 100)}${unit}`}
          </span>
          {label && <span className="text-xs text-white/40 mt-1 uppercase tracking-wider">{label}</span>}
        </div>
      </div>
    </div>
  );
}

// ── Metric Card ───────────────────────────────────────────────────
function MetricCard({ value, label, sublabel, change, color }) {
  const tc = THEME_COLORS[color] || THEME_COLORS.cyan;
  const isPos = Number(change) >= 0;
  return (
    <div className="flex flex-col justify-between h-full">
      <div className="text-xs text-white/40 uppercase tracking-widest">{label}</div>
      <div className="font-black text-3xl font-mono leading-none mt-2" style={{ color: tc.primary, textShadow: `0 0 20px ${tc.primary}66` }}>
        {fmtV(value)}
      </div>
      {sublabel && <div className="text-xs text-white/40 mt-1">{sublabel}</div>}
      {change != null && (
        <div className="text-xs font-mono mt-2" style={{ color: isPos ? '#4caf50' : '#ff4466' }}>
          {isPos ? '▲' : '▼'} {Math.abs(Number(change)).toFixed(1)}%
        </div>
      )}
    </div>
  );
}

// ── Main AdaptiveChart component ──────────────────────────────────
export default function AdaptiveChart({ panel, data, rows, columns, height = 220 }) {
  if (!panel) return null;
  const { chart_type, x_column, y_column, color_theme = 'cyan' } = panel;
  const tc = THEME_COLORS[color_theme] || THEME_COLORS.cyan;

  // Build chart data from raw rows
  const buildSeriesData = () => {
    if (!rows || !rows.length) return data || [];
    if (x_column && y_column) {
      // Group by x, sum y
      const grouped = {};
      rows.forEach(row => {
        const xVal = String(row[x_column] ?? '').slice(0, 10);
        const yVal = Number(row[y_column]) || 0;
        if (!xVal || xVal === 'null') return;
        grouped[xVal] = (grouped[xVal] || 0) + yVal;
      });
      return Object.entries(grouped)
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(0, 20)
        .map(([name, value]) => ({ name, value: Math.round(value) }));
    }
    if (x_column && !y_column) {
      // Count occurrences
      const grouped = {};
      rows.forEach(row => {
        const k = String(row[x_column] ?? 'Unknown');
        grouped[k] = (grouped[k] || 0) + 1;
      });
      return Object.entries(grouped)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 12)
        .map(([name, value]) => ({ name, value }));
    }
    return data || [];
  };

  const chartData = buildSeriesData();
  if (!chartData.length) return (
    <div className="flex items-center justify-center h-full text-white/30 text-xs">No data</div>
  );

  const commonProps = {
    style: tooltipStyle,
    formatter: (v) => [fmtV(v), y_column || 'Value'],
    labelStyle: { color: '#94a3b8', fontSize: 10 },
    contentStyle: tooltipStyle,
    cursor: { fill: 'rgba(255,255,255,0.03)' },
  };

  // ── Render chart by type ──
  if (chart_type === 'line_area' || chart_type === 'area') {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 4, left: 0 }}>
          <defs>
            <linearGradient id={`ag-${color_theme}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={tc.primary} stopOpacity={0.35} />
              <stop offset="95%" stopColor={tc.primary} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
          <XAxis dataKey="name" tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.3)' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
          <YAxis tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.3)' }} tickLine={false} axisLine={false} tickFormatter={fmtV} width={45} />
          <Tooltip {...commonProps} />
          <Area type="monotone" dataKey="value" stroke={tc.primary} fill={`url(#ag-${color_theme})`}
            strokeWidth={2} dot={false} activeDot={{ r: 4, fill: tc.primary }} />
        </AreaChart>
      </ResponsiveContainer>
    );
  }

  if (chart_type === 'bar') {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={chartData} margin={{ top: 4, right: 4, bottom: 4, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
          <XAxis dataKey="name" tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.3)' }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.3)' }} tickLine={false} axisLine={false} tickFormatter={fmtV} width={45} />
          <Tooltip {...commonProps} />
          <Bar dataKey="value" radius={[4, 4, 0, 0]}>
            {chartData.map((_, i) => (
              <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} fillOpacity={0.85} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    );
  }

  if (chart_type === 'horizontal_bar') {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={chartData} layout="vertical" margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.3)' }} tickLine={false} axisLine={false} tickFormatter={fmtV} />
          <YAxis dataKey="name" type="category" tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.5)' }} tickLine={false} axisLine={false} width={80} />
          <Tooltip {...commonProps} />
          <Bar dataKey="value" radius={[0, 4, 4, 0]}>
            {chartData.map((_, i) => (
              <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} fillOpacity={0.85} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    );
  }

  if (chart_type === 'donut') {
    const total = chartData.reduce((s, d) => s + d.value, 0);
    return (
      <div className="flex gap-3 items-center h-full">
        <ResponsiveContainer width="55%" height={height}>
          <PieChart>
            <Pie data={chartData.slice(0, 8)} cx="50%" cy="50%" innerRadius="45%" outerRadius="75%"
              dataKey="value" paddingAngle={2}>
              {chartData.slice(0, 8).map((_, i) => (
                <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip contentStyle={tooltipStyle} formatter={(v) => [fmtV(v), '']} />
          </PieChart>
        </ResponsiveContainer>
        <div className="flex-1 space-y-1.5 overflow-auto" style={{ maxHeight: height }}>
          {chartData.slice(0, 8).map((d, i) => (
            <div key={d.name} className="flex items-center gap-2 text-xs">
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
              <span className="text-white/50 flex-1 truncate">{d.name}</span>
              <span className="font-mono text-white/70">{total > 0 ? `${Math.round(d.value / total * 100)}%` : '—'}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (chart_type === 'scatter') {
    const scatterData = rows?.slice(0, 200).map(row => ({
      x: Number(row[x_column]) || 0,
      y: Number(row[y_column]) || 0,
    })).filter(d => !isNaN(d.x) && !isNaN(d.y)) || [];
    return (
      <ResponsiveContainer width="100%" height={height}>
        <ScatterChart margin={{ top: 4, right: 4, bottom: 4, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
          <XAxis dataKey="x" type="number" tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.3)' }} tickFormatter={fmtV} name={x_column} />
          <YAxis dataKey="y" type="number" tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.3)' }} tickFormatter={fmtV} name={y_column} />
          <Tooltip contentStyle={tooltipStyle} cursor={{ strokeDasharray: '3 3' }} />
          <Scatter data={scatterData} fill={tc.primary} fillOpacity={0.7} />
        </ScatterChart>
      </ResponsiveContainer>
    );
  }

  if (chart_type === 'histogram') {
    // Build histogram buckets
    const vals = rows?.map(r => Number(r[x_column])).filter(v => !isNaN(v)) || [];
    if (!vals.length) return <div className="flex items-center justify-center h-full text-white/30 text-xs">No data</div>;
    const min = Math.min(...vals), max = Math.max(...vals);
    const buckets = 10;
    const bw = (max - min) / buckets || 1;
    const bins = Array.from({ length: buckets }, (_, i) => ({
      name: fmtV(Math.round(min + i * bw)),
      value: 0,
    }));
    vals.forEach(v => {
      const idx = Math.min(Math.floor((v - min) / bw), buckets - 1);
      bins[idx].value++;
    });
    return (
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={bins} margin={{ top: 4, right: 4, bottom: 4, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
          <XAxis dataKey="name" tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.3)' }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.3)' }} tickLine={false} axisLine={false} />
          <Tooltip contentStyle={tooltipStyle} formatter={(v) => [v, 'Count']} />
          <Bar dataKey="value" fill={tc.primary} fillOpacity={0.8} radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    );
  }

  if (chart_type === 'kpi_gauge') {
    const total = rows?.reduce((s, r) => s + (Number(r[y_column || x_column]) || 0), 0) || 0;
    const col = columns?.find(c => c.name === (y_column || x_column));
    const max = col?.max || total;
    return (
      <div className="flex items-center justify-center h-full">
        <KpiGauge value={total} max={max * (rows?.length || 1)} label={y_column || x_column} color={color_theme} number={fmtV(total)} />
      </div>
    );
  }

  if (chart_type === 'metric_card') {
    const vals = rows?.map(r => Number(r[y_column || x_column])).filter(v => !isNaN(v)) || [];
    const total = vals.reduce((s, v) => s + v, 0);
    return (
      <MetricCard value={total} label={y_column || x_column || panel.title} color={color_theme} />
    );
  }

  if (chart_type === 'heatmap') {
    // Simple category × category count heatmap
    const xVals = [...new Set(rows?.map(r => String(r[x_column])).filter(Boolean))].slice(0, 6);
    const yVals = [...new Set(rows?.map(r => String(r[y_column])).filter(Boolean))].slice(0, 6);
    const matrix = {};
    rows?.forEach(row => {
      const xk = String(row[x_column]);
      const yk = String(row[y_column]);
      if (!matrix[xk]) matrix[xk] = {};
      matrix[xk][yk] = (matrix[xk][yk] || 0) + 1;
    });
    const maxCount = Math.max(...Object.values(matrix).flatMap(row => Object.values(row)), 1);
    return (
      <div className="overflow-auto" style={{ maxHeight: height }}>
        <table className="text-xs w-full">
          <thead>
            <tr>
              <th className="text-white/30 p-1 text-left font-normal">↓{y_column} / {x_column}→</th>
              {xVals.map(x => <th key={x} className="text-white/40 p-1 font-mono text-center truncate max-w-16">{x}</th>)}
            </tr>
          </thead>
          <tbody>
            {yVals.map(y => (
              <tr key={y}>
                <td className="text-white/40 p-1 font-mono truncate max-w-20">{y}</td>
                {xVals.map(x => {
                  const v = matrix[x]?.[y] || 0;
                  const pct = v / maxCount;
                  return (
                    <td key={x} className="p-0.5 text-center">
                      <div className="rounded text-xs font-mono py-1"
                        style={{ background: `${tc.primary}${Math.round(pct * 80 + 10).toString(16)}`, color: pct > 0.5 ? '#fff' : 'rgba(255,255,255,0.5)' }}>
                        {v || ''}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  // Fallback: bar
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={chartData} margin={{ top: 4, right: 4, bottom: 4, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
        <XAxis dataKey="name" tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.3)' }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.3)' }} tickLine={false} axisLine={false} tickFormatter={fmtV} width={45} />
        <Tooltip {...commonProps} />
        <Bar dataKey="value" fill={tc.primary} fillOpacity={0.85} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}