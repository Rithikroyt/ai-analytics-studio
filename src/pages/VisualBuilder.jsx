/**
 * VisualBuilder — Phase 2 Visual BI Canvas MVP
 * Chart gallery · Field shelves · Chart preview · AI explanation · View SQL · Save ChartSpec
 */
import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useWorkspaceStore } from '@/lib/store';
import {
  BarChart2, TrendingUp, Activity, Circle, Grid, Layers,
  Brain, Code2, Save, Loader2, CheckCircle2, AlertTriangle,
  Sparkles, Copy, X, ChevronLeft, Eye, Zap, Target
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area,
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, Legend
} from 'recharts';

const COLORS = ['#00e5ff', '#a855f7', '#4ade80', '#f59e0b', '#f87171', '#60a5fa', '#fb923c', '#e879f9'];

const CHART_TYPES = [
  { id: 'bar',       label: 'Bar Chart',    icon: BarChart2,  desc: 'Compare categories' },
  { id: 'line',      label: 'Line Chart',   icon: TrendingUp, desc: 'Show trends over time' },
  { id: 'area',      label: 'Area Chart',   icon: Activity,   desc: 'Cumulative trends' },
  { id: 'scatter',   label: 'Scatter Plot', icon: Circle,     desc: 'Correlation analysis' },
  { id: 'histogram', label: 'Histogram',    icon: BarChart2,  desc: 'Distribution view' },
  { id: 'kpi',       label: 'KPI Card',     icon: Target,     desc: 'Single metric focus' },
  { id: 'table',     label: 'Data Table',   icon: Grid,       desc: 'Tabular view' },
  { id: 'heatmap',   label: 'Heatmap',      icon: Layers,     desc: 'Matrix density' },
];

const AGG_FUNCTIONS = ['sum', 'avg', 'count', 'min', 'max', 'none'];

function generateChartSQL(spec, tableName = 'dataset') {
  const { xAxis, yAxis, aggregation = 'sum', color, filters = [], chartType } = spec;
  if (!xAxis || !yAxis) return '';
  const agg = aggregation === 'none' ? yAxis : `${aggregation.toUpperCase()}(${yAxis})`;
  const alias = aggregation === 'none' ? yAxis : `${aggregation}_${yAxis}`;
  const colorSel = color && color !== xAxis ? `, ${color}` : '';
  const groupBy = color && color !== xAxis ? `${xAxis}, ${color}` : xAxis;
  const where = filters.length > 0 ? `\nWHERE ${filters.map(f => `${f.col} ${f.op} '${f.val}'`).join(' AND ')}` : '';
  const dateFunc = chartType === 'line' ? `DATE_TRUNC('month', ${xAxis}) AS ${xAxis}` : xAxis;
  return `SELECT ${dateFunc}${colorSel},\n       ${agg} AS ${alias},\n       COUNT(*) AS record_count\nFROM ${tableName}${where}\nGROUP BY ${groupBy}\nORDER BY ${alias} DESC\nLIMIT 50;`;
}

function generateChartPython(spec, tableName = 'dataset') {
  const { xAxis, yAxis, aggregation = 'sum', chartType } = spec;
  if (!xAxis || !yAxis) return '';
  const aggMap = { sum: 'sum', avg: 'mean', count: 'count', min: 'min', max: 'max', none: 'first' };
  const fn = aggMap[aggregation] || 'sum';
  return `import pandas as pd
import matplotlib.pyplot as plt

# Load data
df = pd.read_csv('${tableName}.csv')

# Aggregate
chart_data = df.groupby('${xAxis}')['${yAxis}'].${fn}().reset_index()
chart_data.columns = ['${xAxis}', '${aggregation}_${yAxis}']
chart_data = chart_data.sort_values('${aggregation}_${yAxis}', ascending=False)

# Plot
fig, ax = plt.subplots(figsize=(12, 6))
ax.${chartType === 'line' ? 'plot' : 'bar'}(chart_data['${xAxis}'], chart_data['${aggregation}_${yAxis}'], color='#00e5ff')
ax.set_xlabel('${xAxis}')
ax.set_ylabel('${aggregation.toUpperCase()}(${yAxis})')
ax.set_title('${spec.chartTitle || `${yAxis} by ${xAxis}`}')
plt.xticks(rotation=45, ha='right')
plt.tight_layout()
plt.show()`;
}

function buildChartData(rows, spec) {
  const { xAxis, yAxis, aggregation = 'sum', color } = spec;
  if (!xAxis || !yAxis || !rows.length) return [];
  const groups = {};
  for (const row of rows) {
    const key = String(row[xAxis] ?? 'N/A');
    if (!groups[key]) groups[key] = { [xAxis]: key, _rows: [], _color: row[color] };
    groups[key]._rows.push(row);
  }
  return Object.values(groups).slice(0, 30).map(g => {
    const vals = g._rows.map(r => parseFloat(r[yAxis])).filter(v => !isNaN(v));
    let val = 0;
    if (aggregation === 'sum') val = vals.reduce((a, b) => a + b, 0);
    else if (aggregation === 'avg') val = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
    else if (aggregation === 'count') val = g._rows.length;
    else if (aggregation === 'min') val = Math.min(...vals);
    else if (aggregation === 'max') val = Math.max(...vals);
    else val = parseFloat(g._rows[0]?.[yAxis]) || 0;
    return { [xAxis]: g[xAxis], [yAxis]: Math.round(val * 100) / 100, _count: g._rows.length };
  }).sort((a, b) => b[yAxis] - a[yAxis]);
}

function ChartPreview({ spec, data }) {
  const { chartType, xAxis, yAxis, chartTitle } = spec;
  if (!data.length) return (
    <div className="flex items-center justify-center h-full text-white/20 text-sm">Configure chart fields to preview</div>
  );

  if (chartType === 'kpi') {
    const total = data.reduce((s, r) => s + (r[yAxis] || 0), 0);
    const avg = total / data.length;
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-2">
          <div className="text-xs text-white/35 uppercase tracking-widest">{chartTitle || `${yAxis} Total`}</div>
          <div className="text-6xl font-black text-cyan-400">{total >= 1e6 ? `${(total/1e6).toFixed(1)}M` : total >= 1e3 ? `${(total/1e3).toFixed(0)}K` : Math.round(total).toLocaleString()}</div>
          <div className="text-sm text-white/40">Avg: {avg.toFixed(1)} · N={data.length}</div>
        </div>
      </div>
    );
  }

  if (chartType === 'table') {
    return (
      <div className="overflow-auto h-full">
        <table className="w-full text-xs">
          <thead><tr className="border-b border-white/8 bg-white/3">
            {Object.keys(data[0] || {}).filter(k => !k.startsWith('_')).map(k => (
              <th key={k} className="text-left px-3 py-2 text-white/40 font-mono">{k}</th>
            ))}
          </tr></thead>
          <tbody>{data.slice(0, 20).map((row, i) => (
            <tr key={i} className="border-b border-white/5 hover:bg-white/2">
              {Object.entries(row).filter(([k]) => !k.startsWith('_')).map(([k, v]) => (
                <td key={k} className="px-3 py-2 text-white/55 font-mono">{typeof v === 'number' ? v.toLocaleString() : String(v)}</td>
              ))}
            </tr>
          ))}</tbody>
        </table>
      </div>
    );
  }

  const commonProps = {
    data,
    margin: { top: 10, right: 20, left: 10, bottom: 40 },
  };
  const axisStyle = { fill: 'rgba(255,255,255,0.3)', fontSize: 10 };
  const tooltipStyle = { background: 'hsl(222,44%,9%)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, fontSize: 11 };

  return (
    <ResponsiveContainer width="100%" height="100%">
      {chartType === 'bar' ? (
        <BarChart {...commonProps}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
          <XAxis dataKey={xAxis} tick={axisStyle} angle={-35} textAnchor="end" height={60} />
          <YAxis tick={axisStyle} />
          <Tooltip contentStyle={tooltipStyle} />
          <Bar dataKey={yAxis} radius={[4, 4, 0, 0]}>
            {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
          </Bar>
        </BarChart>
      ) : chartType === 'line' ? (
        <LineChart {...commonProps}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
          <XAxis dataKey={xAxis} tick={axisStyle} angle={-35} textAnchor="end" height={60} />
          <YAxis tick={axisStyle} />
          <Tooltip contentStyle={tooltipStyle} />
          <Line type="monotone" dataKey={yAxis} stroke="#00e5ff" strokeWidth={2.5} dot={{ fill: '#00e5ff', r: 3 }} />
        </LineChart>
      ) : chartType === 'area' ? (
        <AreaChart {...commonProps}>
          <defs>
            <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#00e5ff" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#00e5ff" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
          <XAxis dataKey={xAxis} tick={axisStyle} angle={-35} textAnchor="end" height={60} />
          <YAxis tick={axisStyle} />
          <Tooltip contentStyle={tooltipStyle} />
          <Area type="monotone" dataKey={yAxis} stroke="#00e5ff" strokeWidth={2} fill="url(#areaGrad)" />
        </AreaChart>
      ) : chartType === 'scatter' ? (
        <ScatterChart {...commonProps}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
          <XAxis dataKey={xAxis} tick={axisStyle} name={xAxis} />
          <YAxis dataKey={yAxis} tick={axisStyle} name={yAxis} />
          <Tooltip contentStyle={tooltipStyle} cursor={{ strokeDasharray: '3 3' }} />
          <Scatter data={data} fill="#00e5ff" opacity={0.7} />
        </ScatterChart>
      ) : (
        <BarChart {...commonProps}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
          <XAxis dataKey={xAxis} tick={axisStyle} />
          <YAxis tick={axisStyle} />
          <Tooltip contentStyle={tooltipStyle} />
          <Bar dataKey={yAxis} fill="#00e5ff" radius={[4, 4, 0, 0]} />
        </BarChart>
      )}
    </ResponsiveContainer>
  );
}

function ExplanationPanel({ explanation, onClose }) {
  if (!explanation) return null;
  const e = explanation;
  const sections = [
    { label: 'What It Shows',        value: e.whatItShows },
    { label: 'Main Pattern',         value: e.trendOrPattern },
    { label: 'Top Insight',          value: e.topInsight,       color: 'text-cyan-400' },
    { label: 'Business Meaning',     value: e.businessMeaning },
    { label: 'Risk / Warning',       value: e.riskOrWarning,    color: e.hasAnomaly ? 'text-amber-400' : undefined },
    { label: 'Recommended Action',   value: e.recommendedNextStep, color: 'text-green-400' },
    { label: 'SQL to Reproduce',     value: e.sqlToReproduce,   code: true },
  ].filter(s => s.value);

  return (
    <div className="absolute inset-0 bg-background/95 backdrop-blur-sm z-10 overflow-y-auto rounded-2xl border border-cyan-400/20 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-cyan-400" />
          <span className="text-sm font-bold text-cyan-400">AI Chart Explanation</span>
        </div>
        <button onClick={onClose} className="text-white/30 hover:text-white/70 transition-all"><X className="w-4 h-4" /></button>
      </div>
      {sections.map(s => (
        <div key={s.label}>
          <div className="text-xs text-white/30 uppercase tracking-widest font-semibold mb-1">{s.label}</div>
          {s.code
            ? <pre className="bg-black/30 border border-white/8 rounded-xl p-3 text-xs text-green-400/80 font-mono overflow-x-auto whitespace-pre-wrap">{s.value}</pre>
            : <p className={`text-sm leading-relaxed ${s.color || 'text-white/65'}`}>{s.value}</p>
          }
        </div>
      ))}
    </div>
  );
}

export default function VisualBuilder() {
  const { getActiveTable } = useWorkspaceStore();
  const activeTable = getActiveTable();
  const rows = activeTable?.rows || [];
  const columns = activeTable?.columns || [];
  const colNames = columns.map(c => c.name || c);

  const [spec, setSpec] = useState({
    chartType: 'bar', chartTitle: '', xAxis: '', yAxis: '',
    color: '', aggregation: 'sum', tooltipFields: [], filters: [],
    metricDefinition: '',
  });
  const [explanation, setExplanation] = useState(null);
  const [explaining, setExplaining] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showSQL, setShowSQL] = useState(false);
  const [showPython, setShowPython] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [copied, setCopied] = useState('');

  const set = (k, v) => setSpec(s => ({ ...s, [k]: v }));

  const chartData = buildChartData(rows, spec);
  const sql = generateChartSQL(spec, activeTable?.name || 'dataset');
  const python = generateChartPython(spec, activeTable?.name || 'dataset');

  const explainChart = async () => {
    if (!chartData.length || !spec.xAxis || !spec.yAxis) return;
    setExplaining(true);
    try {
      const res = await base44.functions.invoke('explainChart', {
        title: spec.chartTitle || `${spec.yAxis} by ${spec.xAxis}`,
        type: spec.chartType,
        xKey: spec.xAxis, yKey: spec.yAxis,
        xLabel: spec.xAxis, yLabel: spec.yAxis,
        metricDefinition: spec.metricDefinition || `${spec.aggregation.toUpperCase()}(${spec.yAxis})`,
        data: chartData.slice(0, 20),
        tableName: activeTable?.name || 'dataset',
      });
      setExplanation(res.data?.explanation || res.data);
      setShowExplanation(true);
    } catch (e) {}
    setExplaining(false);
  };

  const saveChart = async () => {
    if (!spec.xAxis || !spec.yAxis) return;
    setSaving(true);
    try {
      const user = await base44.auth.me().catch(() => ({}));
      await base44.entities.ChartSpec.create({
        ...spec,
        generatedSql: sql,
        generatedPython: python,
        oneLineInsight: explanation?.topInsight || '',
        businessMeaning: explanation?.businessMeaning || '',
        recommendation: explanation?.recommendedNextStep || '',
        explanation: explanation || null,
        createdBy: user.email || '',
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {}
    setSaving(false);
  };

  const copyText = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(''), 1500);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="border-b border-white/8 px-8 py-5 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <Link to="/" className="p-1.5 rounded-lg text-white/30 hover:text-white/60 hover:bg-white/5 transition-all">
            <ChevronLeft className="w-4 h-4" />
          </Link>
          <div className="w-10 h-10 rounded-xl bg-pink-400/15 border border-pink-400/25 flex items-center justify-center">
            <BarChart2 className="w-5 h-5 text-pink-400" />
          </div>
          <div>
            <h1 className="text-xl font-black">Visual Builder</h1>
            <p className="text-xs text-muted-foreground">Chart Gallery · Field Shelves · AI Explanation · View SQL · Save ChartSpec</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {activeTable ? (
            <div className="px-3 py-1.5 rounded-xl bg-green-400/8 border border-green-400/15 text-xs text-green-400 font-mono">
              {activeTable.name} · {rows.length.toLocaleString()} rows
            </div>
          ) : (
            <div className="px-3 py-1.5 rounded-xl bg-amber-400/8 border border-amber-400/15 text-xs text-amber-400">
              ⚠ Load dataset in Workspace first
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left config panel */}
        <div className="w-72 border-r border-white/8 overflow-y-auto p-4 space-y-5 flex-shrink-0">

          {/* Chart Type Gallery */}
          <div>
            <div className="text-xs text-white/30 uppercase tracking-widest font-semibold mb-2">Chart Type</div>
            <div className="grid grid-cols-2 gap-1.5">
              {CHART_TYPES.map(ct => (
                <button key={ct.id} onClick={() => set('chartType', ct.id)}
                  className={`text-left p-2.5 rounded-xl border transition-all ${spec.chartType === ct.id ? 'border-pink-400/30 bg-pink-400/8 text-pink-400' : 'border-white/8 bg-white/2 text-white/45 hover:border-white/15'}`}>
                  <ct.icon className="w-4 h-4 mb-1" />
                  <div className="text-xs font-semibold leading-tight">{ct.label}</div>
                  <div className="text-xs opacity-50 leading-tight mt-0.5">{ct.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Chart Title */}
          <div>
            <div className="text-xs text-white/30 uppercase tracking-widest font-semibold mb-2">Chart Title</div>
            <input value={spec.chartTitle} onChange={e => set('chartTitle', e.target.value)}
              placeholder={`${spec.aggregation.toUpperCase()}(${spec.yAxis || 'metric'}) by ${spec.xAxis || 'dimension'}`}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs focus:outline-none" />
          </div>

          {/* Field Shelves */}
          <div>
            <div className="text-xs text-white/30 uppercase tracking-widest font-semibold mb-2">Field Shelves</div>
            <div className="space-y-2">
              {[
                { key: 'xAxis', label: '📐 X-Axis (Dimension)' },
                { key: 'yAxis', label: '📏 Y-Axis (Metric)' },
                { key: 'color', label: '🎨 Color By (optional)' },
                { key: 'size', label: '⭕ Size Field (optional)' },
                { key: 'label', label: '🏷️ Label Field (optional)' },
                { key: 'detail', label: '🔍 Detail Field (optional)' },
              ].map(f => (
                <div key={f.key}>
                  <label className="text-xs text-white/30 mb-1 block">{f.label}</label>
                  <select value={spec[f.key] || ''} onChange={e => set(f.key, e.target.value)}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs focus:outline-none">
                    <option value="">— Select —</option>
                    {colNames.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              ))}

              {/* Aggregation */}
              <div>
                <label className="text-xs text-white/30 mb-1 block">∑ Aggregation</label>
                <div className="flex gap-1 flex-wrap">
                  {AGG_FUNCTIONS.map(a => (
                    <button key={a} onClick={() => set('aggregation', a)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${spec.aggregation === a ? 'bg-pink-400/20 text-pink-400' : 'bg-white/5 text-white/35 hover:text-white/60'}`}>
                      {a.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Filters shelf */}
              <div>
                <label className="text-xs text-white/30 mb-1 block">🔧 Quick Filter (col = value)</label>
                <div className="flex gap-1">
                  <select onChange={e => { if (e.target.value) set('filters', [...(spec.filters || []), { col: e.target.value, op: '=', val: '' }]); e.target.value = ''; }}
                    className="flex-1 px-2 py-1.5 bg-white/5 border border-white/10 rounded-xl text-xs focus:outline-none">
                    <option value="">+ Add filter…</option>
                    {colNames.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                {(spec.filters || []).map((f, i) => (
                  <div key={i} className="flex gap-1 mt-1 items-center">
                    <span className="text-xs font-mono text-cyan-400 w-20 truncate">{f.col}</span>
                    <input value={f.val} onChange={e => set('filters', spec.filters.map((ff, j) => j === i ? { ...ff, val: e.target.value } : ff))}
                      placeholder="value" className="flex-1 px-2 py-1 bg-white/5 border border-white/10 rounded-lg text-xs focus:outline-none" />
                    <button onClick={() => set('filters', spec.filters.filter((_, j) => j !== i))} className="text-red-400/50 hover:text-red-400 text-xs px-1">✕</button>
                  </div>
                ))}
              </div>

              {/* Marks Card */}
              <div>
                <label className="text-xs text-white/30 mb-1 block">🎯 Marks</label>
                <div className="grid grid-cols-3 gap-1">
                  {['circle', 'square', 'bar', 'line', 'area', 'text'].map(m => (
                    <button key={m} onClick={() => set('markType', m)}
                      className={`px-2 py-1 rounded-lg text-xs transition-all ${spec.markType === m ? 'bg-pink-400/20 text-pink-400' : 'bg-white/5 text-white/35 hover:text-white/60'}`}>
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              {/* Theme Selector */}
              <div>
                <label className="text-xs text-white/30 mb-1 block">🎨 Theme</label>
                <div className="flex gap-1.5 flex-wrap">
                  {[
                    { id: 'dark', label: 'Dark', colors: ['#00e5ff', '#a855f7', '#4ade80'] },
                    { id: 'warm', label: 'Warm', colors: ['#f59e0b', '#f87171', '#fb923c'] },
                    { id: 'cool', label: 'Cool', colors: ['#60a5fa', '#818cf8', '#34d399'] },
                  ].map(theme => (
                    <button key={theme.id} onClick={() => set('theme', theme.id)}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs transition-all border ${spec.theme === theme.id ? 'border-white/25 bg-white/8' : 'border-white/8 hover:border-white/15'}`}>
                      <div className="flex gap-0.5">
                        {theme.colors.map(c => <div key={c} className="w-2.5 h-2.5 rounded-full" style={{ background: c }} />)}
                      </div>
                      {theme.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Tooltip Builder */}
              <div className="p-3 rounded-xl bg-white/3 border border-white/8 space-y-2">
                <label className="text-xs text-white/30 font-semibold block">💬 Custom Tooltip Builder</label>
                <div className="flex flex-wrap gap-1">
                  {colNames.slice(0, 8).map(c => (
                    <button key={c} onClick={() => set('tooltipFields', spec.tooltipFields.includes(c) ? spec.tooltipFields.filter(f => f !== c) : [...spec.tooltipFields, c])}
                      className={`px-2 py-0.5 rounded-lg text-xs transition-all ${spec.tooltipFields.includes(c) ? 'bg-cyan-400/20 text-cyan-400' : 'bg-white/5 text-white/30 hover:text-white/55'}`}>
                      {c}
                    </button>
                  ))}
                </div>
                <div className="space-y-1">
                  {[
                    { key: 'tooltipFormat', label: 'Number Format', options: ['default', 'currency', 'percentage', 'thousands'] },
                  ].map(f => (
                    <div key={f.key} className="flex items-center gap-2">
                      <span className="text-xs text-white/30 w-24">{f.label}</span>
                      <select value={spec[f.key] || 'default'} onChange={e => set(f.key, e.target.value)}
                        className="flex-1 px-2 py-1 bg-white/5 border border-white/8 rounded-lg text-xs focus:outline-none">
                        {f.options.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </div>
                  ))}
                  <input value={spec.tooltipNote || ''} onChange={e => set('tooltipNote', e.target.value)}
                    placeholder="Business note shown in tooltip…"
                    className="w-full px-2 py-1 bg-white/5 border border-white/8 rounded-lg text-xs focus:outline-none" />
                </div>
              </div>

              {/* Metric definition */}
              <div>
                <label className="text-xs text-white/30 mb-1 block">📖 Metric Definition</label>
                <input value={spec.metricDefinition} onChange={e => set('metricDefinition', e.target.value)}
                  placeholder={`e.g. Total ${spec.yAxis || 'revenue'} aggregated by ${spec.xAxis || 'region'}`}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs focus:outline-none" />
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="space-y-2 pt-2 border-t border-white/8">
            <button onClick={explainChart} disabled={explaining || !chartData.length}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-cyan-400/15 border border-cyan-400/25 text-cyan-400 rounded-xl text-xs font-semibold hover:bg-cyan-400/20 transition-all disabled:opacity-40">
              {explaining ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Brain className="w-3.5 h-3.5" />}
              Explain Chart (AI)
            </button>
            <button onClick={() => setShowSQL(v => !v)}
              className="w-full flex items-center justify-center gap-2 py-2 bg-green-400/10 border border-green-400/20 text-green-400 rounded-xl text-xs font-semibold hover:bg-green-400/15 transition-all">
              <Code2 className="w-3.5 h-3.5" /> {showSQL ? 'Hide' : 'View'} SQL
            </button>
            <button onClick={() => setShowPython(v => !v)}
              className="w-full flex items-center justify-center gap-2 py-2 bg-purple-400/10 border border-purple-400/20 text-purple-400 rounded-xl text-xs font-semibold hover:bg-purple-400/15 transition-all">
              <Zap className="w-3.5 h-3.5" /> {showPython ? 'Hide' : 'View'} Python
            </button>
            <button onClick={saveChart} disabled={saving || !spec.xAxis || !spec.yAxis}
              className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold transition-all disabled:opacity-40 ${saved ? 'bg-green-400/15 border border-green-400/25 text-green-400' : 'bg-pink-400/15 border border-pink-400/25 text-pink-400 hover:bg-pink-400/20'}`}>
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : saved ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
              {saved ? 'Saved!' : 'Save ChartSpec'}
            </button>
          </div>
        </div>

        {/* Right: Preview area */}
        <div className="flex-1 flex flex-col overflow-hidden p-6 space-y-4">
          {/* Chart meta bar */}
          {spec.xAxis && spec.yAxis && (
            <div className="flex items-center gap-4 flex-wrap text-xs">
              <div className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/8">
                <span className="text-white/35">X: </span><span className="text-cyan-400 font-mono">{spec.xAxis}</span>
              </div>
              <div className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/8">
                <span className="text-white/35">Y: </span><span className="text-cyan-400 font-mono">{spec.aggregation.toUpperCase()}({spec.yAxis})</span>
              </div>
              {spec.color && (
                <div className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/8">
                  <span className="text-white/35">Color: </span><span className="text-pink-400 font-mono">{spec.color}</span>
                </div>
              )}
              <div className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/8">
                <span className="text-white/35">N: </span><span className="font-mono">{chartData.length} points</span>
              </div>
              {spec.metricDefinition && (
                <div className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/8 text-white/35 max-w-sm truncate">
                  {spec.metricDefinition}
                </div>
              )}
            </div>
          )}

          {/* Chart canvas */}
          <div className="relative flex-1 min-h-80 rounded-2xl border border-white/8 bg-white/2 p-5">
            {spec.chartTitle && (
              <div className="text-sm font-bold text-white/70 mb-3">{spec.chartTitle}</div>
            )}
            {!spec.xAxis || !spec.yAxis ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-white/20">
                <BarChart2 className="w-12 h-12" />
                <div className="text-sm">Select X-Axis and Y-Axis to preview chart</div>
                {!rows.length && <div className="text-xs text-amber-400/50">No dataset loaded — go to Workspace and upload data</div>}
              </div>
            ) : (
              <ChartPreview spec={spec} data={chartData} />
            )}
            {showExplanation && <ExplanationPanel explanation={explanation} onClose={() => setShowExplanation(false)} />}
          </div>

          {/* SQL code block */}
          {showSQL && sql && (
            <div className="rounded-2xl border border-green-400/20 bg-black/20">
              <div className="flex items-center justify-between px-4 py-2 border-b border-white/5">
                <span className="text-xs text-green-400 font-semibold">Generated SQL</span>
                <button onClick={() => copyText(sql, 'sql')} className="flex items-center gap-1 text-xs text-white/30 hover:text-green-400 transition-all">
                  {copied === 'sql' ? <CheckCircle2 className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied === 'sql' ? 'Copied!' : 'Copy'}
                </button>
              </div>
              <pre className="p-4 text-xs text-green-400/80 font-mono overflow-x-auto whitespace-pre-wrap">{sql}</pre>
            </div>
          )}

          {/* Python code block */}
          {showPython && python && (
            <div className="rounded-2xl border border-purple-400/20 bg-black/20">
              <div className="flex items-center justify-between px-4 py-2 border-b border-white/5">
                <span className="text-xs text-purple-400 font-semibold">Generated Python / Pandas</span>
                <button onClick={() => copyText(python, 'py')} className="flex items-center gap-1 text-xs text-white/30 hover:text-purple-400 transition-all">
                  {copied === 'py' ? <CheckCircle2 className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied === 'py' ? 'Copied!' : 'Copy'}
                </button>
              </div>
              <pre className="p-4 text-xs text-purple-400/80 font-mono overflow-x-auto whitespace-pre-wrap">{python}</pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}