/**
 * VisualBuilder — Phase 8: Tableau-style chart builder
 * Natural language chart creation, axis selection, chart type picker, save to dashboard
 */
import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWorkspaceStore } from '@/lib/store';
import { base44 } from '@/api/base44Client';
import {
  BarChart2, TrendingUp, PieChart, Activity, Target,
  Layers, Sparkles, Save, Database, ArrowRight, Loader2,
  CheckCircle2
} from 'lucide-react';
import {
  BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart as RPieChart, Pie, Cell, ScatterChart, Scatter as RScatter
} from 'recharts';

const PALETTE = ['#00e5ff', '#a855f7', '#ff6b35', '#4caf50', '#ff2d7a', '#ffcc02', '#00bfa5', '#e91e63'];
const TOOLTIP_STYLE = { backgroundColor: 'rgba(5,10,24,0.97)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, fontSize: 11 };
const axisStyle = { fontSize: 9, fill: 'rgba(255,255,255,0.3)' };

const CHART_TYPES = [
  { id: 'bar', label: 'Bar', icon: BarChart2, desc: 'Compare categories' },
  { id: 'line_area', label: 'Line/Area', icon: TrendingUp, desc: 'Trends over time' },
  { id: 'donut', label: 'Donut', icon: PieChart, desc: 'Composition share' },
  { id: 'scatter', label: 'Scatter', icon: Activity, desc: 'Correlation' },
  { id: 'histogram', label: 'Histogram', icon: Layers, desc: 'Distribution' },
  { id: 'metric_card', label: 'KPI Card', icon: Target, desc: 'Single metric' },
];

const AGGREGATIONS = ['sum', 'avg', 'count', 'min', 'max'];

const fmtV = v => {
  if (v == null || isNaN(v)) return String(v ?? '');
  const n = Number(v);
  if (Math.abs(n) >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (Math.abs(n) >= 1e3) return `${(n / 1e3).toFixed(0)}K`;
  return n.toLocaleString(undefined, { maximumFractionDigits: 1 });
};

function buildChartData(rows, xCol, yCol, aggFn, chartType) {
  if (!rows?.length) return [];

  if (chartType === 'histogram' && yCol) {
    const vals = rows.map(r => Number(r[yCol])).filter(v => !isNaN(v));
    if (!vals.length) return [];
    const min = Math.min(...vals), max = Math.max(...vals);
    const bins = 12;
    const range = (max - min) || 1;
    const counts = new Array(bins).fill(0);
    vals.forEach(v => counts[Math.min(bins - 1, Math.floor(((v - min) / range) * bins))]++);
    return counts.map((count, i) => ({ range: `${fmtV(min + (i / bins) * range)}`, count }));
  }

  if (chartType === 'scatter' && xCol && yCol) {
    return rows.slice(0, 500)
      .map(r => ({ x: Number(r[xCol]), y: Number(r[yCol]) }))
      .filter(d => !isNaN(d.x) && !isNaN(d.y));
  }

  if (!xCol || !yCol) return [];

  const groups = {};
  rows.forEach(row => {
    const key = String(row[xCol] ?? 'Unknown');
    const val = Number(row[yCol]) || 0;
    if (!groups[key]) groups[key] = { values: [], count: 0 };
    groups[key].values.push(val);
    groups[key].count++;
  });

  const agg = (g) => {
    switch (aggFn) {
      case 'avg': return g.values.reduce((a, b) => a + b, 0) / g.values.length;
      case 'count': return g.count;
      case 'min': return Math.min(...g.values);
      case 'max': return Math.max(...g.values);
      default: return g.values.reduce((a, b) => a + b, 0);
    }
  };

  return Object.entries(groups)
    .map(([name, g]) => ({ name, value: Math.round(agg(g) * 100) / 100 }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 20);
}

function ChartPreview({ type, data, xCol, yCol, color }) {
  if (!data?.length) return (
    <div className="flex items-center justify-center h-48 text-white/20 text-sm">Configure chart to see preview</div>
  );

  const colorIdx = ['cyan', 'purple', 'orange', 'green', 'pink', 'yellow', 'teal'].indexOf(color);
  const stroke = PALETTE[colorIdx >= 0 ? colorIdx : 0];

  if (type === 'bar') return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 4, right: 8, bottom: 20, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
        <XAxis dataKey="name" tick={axisStyle} tickLine={false} axisLine={false} interval="preserveStartEnd" angle={-20} textAnchor="end" />
        <YAxis tick={axisStyle} tickFormatter={fmtV} tickLine={false} axisLine={false} width={40} />
        <Tooltip contentStyle={TOOLTIP_STYLE} formatter={fmtV} />
        <Bar dataKey="value" fill={stroke} fillOpacity={0.85} radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );

  if (type === 'line_area') return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={data} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
        <defs>
          <linearGradient id="vbGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={stroke} stopOpacity={0.3} />
            <stop offset="95%" stopColor={stroke} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
        <XAxis dataKey="name" tick={axisStyle} tickLine={false} axisLine={false} interval="preserveStartEnd" />
        <YAxis tick={axisStyle} tickFormatter={fmtV} tickLine={false} axisLine={false} width={40} />
        <Tooltip contentStyle={TOOLTIP_STYLE} formatter={fmtV} />
        <Area type="monotone" dataKey="value" stroke={stroke} fill="url(#vbGrad)" strokeWidth={2} dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  );

  if (type === 'donut') {
    const total = data.reduce((s, d) => s + d.value, 0);
    return (
      <div className="flex items-center gap-4">
        <ResponsiveContainer width={180} height={200}>
          <RPieChart>
            <Pie data={data.slice(0, 8)} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={2} dataKey="value">
              {data.slice(0, 8).map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
            </Pie>
            <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [fmtV(v)]} />
          </RPieChart>
        </ResponsiveContainer>
        <div className="flex-1 space-y-1.5 text-xs">
          {data.slice(0, 6).map((d, i) => (
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

  if (type === 'scatter') return (
    <ResponsiveContainer width="100%" height={240}>
      <ScatterChart margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
        <XAxis type="number" dataKey="x" name={xCol} tick={axisStyle} tickLine={false} axisLine={false} tickFormatter={fmtV} />
        <YAxis type="number" dataKey="y" name={yCol} tick={axisStyle} tickLine={false} axisLine={false} tickFormatter={fmtV} width={40} />
        <Tooltip contentStyle={TOOLTIP_STYLE} formatter={fmtV} />
        <RScatter data={data} fill={stroke} fillOpacity={0.6} />
      </ScatterChart>
    </ResponsiveContainer>
  );

  if (type === 'histogram') return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
        <XAxis dataKey="range" tick={axisStyle} tickLine={false} axisLine={false} />
        <YAxis tick={axisStyle} tickLine={false} axisLine={false} width={40} />
        <Tooltip contentStyle={TOOLTIP_STYLE} />
        <Bar dataKey="count" fill={stroke} fillOpacity={0.85} />
      </BarChart>
    </ResponsiveContainer>
  );

  if (type === 'metric_card') {
    const total = data.reduce((s, d) => s + d.value, 0);
    return (
      <div className="flex items-center justify-center h-48">
        <div className="text-center">
          <div className="text-5xl font-black font-mono" style={{ color: stroke }}>{fmtV(total)}</div>
          <div className="text-sm text-white/40 mt-2">{yCol?.replace(/_/g, ' ')}</div>
        </div>
      </div>
    );
  }

  return null;
}

export default function VisualBuilder() {
  const { getActiveTable, saveToDashboard, setActiveSection } = useWorkspaceStore();
  const table = getActiveTable();

  const [chartType, setChartType] = useState('bar');
  const [xCol, setXCol] = useState('');
  const [yCol, setYCol] = useState('');
  const [aggFn, setAggFn] = useState('sum');
  const [colorTheme, setColorTheme] = useState('cyan');
  const [chartTitle, setChartTitle] = useState('');
  const [nlPrompt, setNlPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [saved, setSaved] = useState(false);
  const [aiInsight, setAiInsight] = useState('');

  const columns = table?.columns || [];
  const numericCols = columns.filter(c => c.type === 'numeric');
  const catCols = columns.filter(c => c.type === 'category');
  const dateCols = columns.filter(c => c.type === 'date');
  const allXCols = [...catCols, ...dateCols, ...numericCols];

  const chartData = useMemo(() => {
    if (!table?.rows || !yCol) return [];
    return buildChartData(table.rows, xCol, yCol, aggFn, chartType);
  }, [table, xCol, yCol, aggFn, chartType]);

  const handleNLGenerate = async () => {
    if (!nlPrompt.trim() || !table) return;
    setGenerating(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a chart configuration assistant. Based on the user request and dataset, return a chart configuration.

User request: "${nlPrompt}"
Dataset: ${table.name}
Columns: ${columns.map(c => `${c.name} (${c.type})`).join(', ')}

Return ONLY valid JSON:
{
  "chart_type": "bar|line_area|donut|scatter|histogram|metric_card",
  "x_column": "exact column name or null",
  "y_column": "exact column name",
  "aggregation": "sum|avg|count|min|max",
  "title": "chart title (max 6 words)",
  "color_theme": "cyan|purple|orange|green|pink|yellow|teal",
  "insight": "one sentence insight about what this chart shows"
}`,
        response_json_schema: {
          type: 'object',
          properties: {
            chart_type: { type: 'string' },
            x_column: { type: ['string', 'null'] },
            y_column: { type: 'string' },
            aggregation: { type: 'string' },
            title: { type: 'string' },
            color_theme: { type: 'string' },
            insight: { type: 'string' },
          },
        },
      });
      if (result?.chart_type) setChartType(result.chart_type);
      if (result?.x_column) setXCol(result.x_column);
      if (result?.y_column) setYCol(result.y_column);
      if (result?.aggregation) setAggFn(result.aggregation);
      if (result?.title) setChartTitle(result.title);
      if (result?.color_theme) setColorTheme(result.color_theme);
      if (result?.insight) setAiInsight(result.insight);
    } catch (e) {
      console.error('[VisualBuilder] NL generate failed:', e);
    }
    setGenerating(false);
  };

  const handleSave = () => {
    if (!chartData.length) return;
    const title = chartTitle || `${yCol?.replace(/_/g, ' ')} by ${xCol?.replace(/_/g, ' ')}`;
    saveToDashboard({
      label: title,
      datasetName: table?.name,
      chart: {
        type: chartType,
        title,
        data: chartData,
        x_key: chartType === 'scatter' ? 'x' : (chartType === 'histogram' ? 'range' : 'name'),
        y_key: chartType === 'scatter' ? 'y' : (chartType === 'histogram' ? 'count' : 'value'),
        color_theme: colorTheme,
      },
      insight: aiInsight,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  if (!table) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[500px] text-center">
        <Database className="w-12 h-12 text-white/15 mb-4" />
        <h2 className="text-lg font-semibold mb-2">No Data Loaded</h2>
        <p className="text-sm text-muted-foreground mb-5">Upload a dataset to start building charts.</p>
        <button onClick={() => setActiveSection('intake')}
          className="flex items-center gap-2 px-5 py-2.5 bg-cyan-400/10 border border-cyan-400/20 text-cyan-400 rounded-xl text-sm font-semibold hover:bg-cyan-400/15 transition-colors">
          Upload Data <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-5">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-2 mb-1">
          <BarChart2 className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-mono text-white/40 uppercase tracking-widest">Visual Builder</span>
        </div>
        <h1 className="text-2xl font-bold">Chart Builder</h1>
        <p className="text-sm text-muted-foreground">Create charts visually or describe them in plain English. Save to Dashboard.</p>
      </motion.div>

      {/* NL prompt */}
      <div className="glass-card rounded-2xl p-4 border border-purple-400/15 bg-purple-400/3">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-purple-400 mb-2 uppercase tracking-widest">
          <Sparkles className="w-3 h-3" /> AI Chart Generator
        </div>
        <div className="flex gap-2">
          <input value={nlPrompt} onChange={e => setNlPrompt(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleNLGenerate()}
            placeholder={`e.g. "Show revenue trend by month" or "Bar chart of top 10 products"`}
            className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-purple-400/30 text-foreground" />
          <button onClick={handleNLGenerate} disabled={generating || !nlPrompt.trim()}
            className="flex items-center gap-1.5 px-4 py-2 bg-purple-400/15 border border-purple-400/25 text-purple-400 rounded-xl text-sm font-semibold hover:bg-purple-400/20 transition-all disabled:opacity-40">
            {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            {generating ? 'Building…' : 'Build'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* Controls */}
        <div className="lg:col-span-2 space-y-4">
          <div className="glass-card rounded-2xl p-4 border border-white/8">
            <div className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-3">Chart Type</div>
            <div className="grid grid-cols-3 gap-2">
              {CHART_TYPES.map(ct => (
                <button key={ct.id} onClick={() => setChartType(ct.id)}
                  className={`flex flex-col items-center gap-1 p-2.5 rounded-xl border text-xs font-medium transition-all ${chartType === ct.id ? 'bg-cyan-400/10 border-cyan-400/25 text-cyan-400' : 'border-white/8 text-white/35 hover:text-white/70 hover:border-white/20'}`}>
                  <ct.icon className="w-4 h-4" />
                  <span>{ct.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="glass-card rounded-2xl p-4 border border-white/8 space-y-3">
            <div className="text-xs font-semibold text-white/40 uppercase tracking-widest">Axes & Aggregation</div>
            <div>
              <label className="text-xs text-white/35 mb-1 block">X Axis (Dimension)</label>
              <select value={xCol} onChange={e => setXCol(e.target.value)}
                className="w-full px-2.5 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-foreground focus:outline-none focus:border-cyan-400/30">
                <option value="">None</option>
                {allXCols.map(c => <option key={c.name} value={c.name}>{c.name.replace(/_/g, ' ')}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-white/35 mb-1 block">Y Axis (Metric)</label>
              <select value={yCol} onChange={e => setYCol(e.target.value)}
                className="w-full px-2.5 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-foreground focus:outline-none focus:border-cyan-400/30">
                <option value="">Select metric…</option>
                {numericCols.map(c => <option key={c.name} value={c.name}>{c.name.replace(/_/g, ' ')}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-white/35 mb-1 block">Aggregation</label>
              <div className="flex gap-1">
                {AGGREGATIONS.map(a => (
                  <button key={a} onClick={() => setAggFn(a)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${aggFn === a ? 'bg-cyan-400/15 text-cyan-400' : 'bg-white/5 text-white/35 hover:text-white/65'}`}>
                    {a}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs text-white/35 mb-1 block">Chart Title</label>
              <input value={chartTitle} onChange={e => setChartTitle(e.target.value)}
                placeholder="Auto-generated"
                className="w-full px-2.5 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-foreground focus:outline-none focus:border-cyan-400/30" />
            </div>
            <div>
              <label className="text-xs text-white/35 mb-1 block">Color Theme</label>
              <div className="flex gap-1.5 flex-wrap">
                {['cyan', 'purple', 'orange', 'green', 'pink', 'yellow', 'teal'].map((c, i) => (
                  <button key={c} onClick={() => setColorTheme(c)}
                    className={`w-6 h-6 rounded-full border-2 transition-all ${colorTheme === c ? 'border-white scale-110' : 'border-transparent'}`}
                    style={{ background: PALETTE[i % PALETTE.length] }} />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Preview */}
        <div className="lg:col-span-3 space-y-4">
          <div className="glass-card rounded-2xl p-5 border border-white/8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="font-semibold text-sm">{chartTitle || (yCol ? `${yCol.replace(/_/g, ' ')}${xCol ? ` by ${xCol.replace(/_/g, ' ')}` : ''}` : 'Chart Preview')}</div>
                <div className="text-xs text-white/25 mt-0.5">{chartData.length} data points · {aggFn} aggregation</div>
              </div>
              <button onClick={handleSave} disabled={!chartData.length}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all disabled:opacity-40 ${saved ? 'bg-green-400/15 border border-green-400/25 text-green-400' : 'bg-cyan-400 hover:bg-cyan-300'}`}
                style={!saved ? { color: 'hsl(222,47%,6%)' } : {}}>
                {saved ? <><CheckCircle2 className="w-3 h-3" /> Saved!</> : <><Save className="w-3 h-3" /> Save to Dashboard</>}
              </button>
            </div>
            <ChartPreview type={chartType} data={chartData} xCol={xCol} yCol={yCol} color={colorTheme} />
          </div>

          {aiInsight && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className="flex items-start gap-3 p-4 rounded-xl bg-purple-400/5 border border-purple-400/15">
              <Sparkles className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-white/65 leading-relaxed italic">{aiInsight}</p>
            </motion.div>
          )}

          {chartData.length > 0 && !['scatter', 'histogram', 'metric_card'].includes(chartType) && (
            <div className="glass-card rounded-xl p-4 border border-white/6">
              <div className="text-xs font-semibold text-white/30 uppercase tracking-widest mb-2">Top Values</div>
              <div className="space-y-1.5">
                {chartData.slice(0, 5).map((d, i) => {
                  const max = chartData[0]?.value || 1;
                  return (
                    <div key={d.name || i} className="flex items-center gap-2 text-xs">
                      <span className="w-4 text-white/25 font-mono">{i + 1}</span>
                      <span className="flex-1 text-white/60 truncate">{d.name}</span>
                      <div className="w-20 h-1 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-cyan-400/60" style={{ width: `${(d.value / max) * 100}%` }} />
                      </div>
                      <span className="font-mono text-white/50 w-16 text-right">{fmtV(d.value)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}