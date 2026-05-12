/**
 * VisualBuilder — AI-first chart builder with manual controls
 * Fixed: column type inference, AI field matching, chart type selector, field assignment
 */
import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWorkspaceStore } from '@/lib/store';
import { base44 } from '@/api/base44Client';
import {
  Sparkles, CheckCircle2, Loader2, Database, ArrowRight,
  Wand2, RefreshCw, TrendingUp, BarChart2, ChevronDown, ChevronUp,
  Brain, Settings2, X, Map, Zap, PieChart, Activity,
  Layers, GitBranch, Grid, Target, Circle,
} from 'lucide-react';

import VBChartPreview, { buildChartData, fmtV } from '@/components/visualbuilder/VBChartPreview.jsx';
import VBBottomPanel from '@/components/visualbuilder/VBBottomPanel.jsx';

// ── Chart catalog ──────────────────────────────────────────────────────────────
const CHART_GROUPS = [
  {
    label: 'Bar & Compare', color: '#00e5ff',
    charts: [
      { id: 'bar', label: 'Bar', icon: BarChart2 },
      { id: 'bar_horizontal', label: 'Horiz. Bar', icon: BarChart2 },
      { id: 'bar_stacked', label: 'Stacked', icon: Layers },
      { id: 'bar_grouped', label: 'Grouped', icon: Layers },
      { id: 'waterfall', label: 'Waterfall', icon: BarChart2 },
    ],
  },
  {
    label: 'Line & Area', color: '#a855f7',
    charts: [
      { id: 'line', label: 'Line', icon: TrendingUp },
      { id: 'area', label: 'Area', icon: TrendingUp },
      { id: 'area_stacked', label: 'Stacked Area', icon: Layers },
      { id: 'step_line', label: 'Step', icon: Activity },
      { id: 'forecast_line', label: 'Forecast', icon: TrendingUp },
      { id: 'dual_axis', label: 'Dual Axis', icon: Activity },
    ],
  },
  {
    label: 'Part-to-Whole', color: '#ff6b35',
    charts: [
      { id: 'donut', label: 'Donut', icon: PieChart },
      { id: 'pie', label: 'Pie', icon: PieChart },
      { id: 'treemap', label: 'Treemap', icon: Layers },
      { id: 'sunburst', label: 'Sunburst', icon: Circle },
      { id: 'packed_bubble', label: 'Bubbles', icon: Circle },
    ],
  },
  {
    label: 'Distribution', color: '#4caf50',
    charts: [
      { id: 'scatter', label: 'Scatter', icon: Activity },
      { id: 'bubble', label: 'Bubble', icon: Circle },
      { id: 'histogram', label: 'Histogram', icon: BarChart2 },
      { id: 'box_plot', label: 'Box Plot', icon: Layers },
    ],
  },
  {
    label: 'Table & Grid', color: '#00bfa5',
    charts: [
      { id: 'heatmap', label: 'Heatmap', icon: Grid },
      { id: 'text_table', label: 'Table', icon: Grid },
      { id: 'highlight_table', label: 'Highlight', icon: Grid },
    ],
  },
  {
    label: 'Special', color: '#ffcc02',
    charts: [
      { id: 'funnel', label: 'Funnel', icon: GitBranch },
      { id: 'radar', label: 'Radar', icon: Activity },
      { id: 'gauge', label: 'Gauge', icon: Target },
      { id: 'metric_card', label: 'KPI Card', icon: Zap },
      { id: 'sankey', label: 'Sankey', icon: GitBranch },
      { id: 'choropleth_map', label: 'Map', icon: Map },
    ],
  },
];

const CHART_TYPE_LABELS = {};
CHART_GROUPS.forEach(g => g.charts.forEach(c => { CHART_TYPE_LABELS[c.id] = c.label; }));

const AGG_OPTIONS = ['SUM', 'AVG', 'COUNT', 'MIN', 'MAX'];

const DEFAULT_MARKS = { color: '#00e5ff', opacity: 85, strokeWidth: 2, borderRadius: 4, sort: 'Desc', showGrid: true };

const QUICK_PROMPTS = [
  { label: 'Top 10 by value', prompt: 'Show the top 10 categories sorted by total value' },
  { label: 'Trend over time', prompt: 'Show the trend over time as a line chart' },
  { label: 'Part-to-whole', prompt: 'Show how each category contributes as a donut chart' },
  { label: 'Distribution', prompt: 'Show the distribution of values as a histogram' },
];

// ── Robust column type inference ───────────────────────────────────────────────
function inferColumnType(col, rows) {
  const name = (col.name || col).toLowerCase();

  // If already classified correctly, use it
  const existing = col.inferredType || col.type || '';
  if (['numeric', 'number', 'integer', 'float', 'double', 'decimal'].includes(existing)) return 'numeric';
  if (['date', 'datetime', 'timestamp'].includes(existing)) return 'date';
  if (['category', 'string', 'categorical'].includes(existing)) return 'category';

  // Name-based inference
  const dateKeywords = ['date', 'month', 'year', 'quarter', 'week', 'period', 'time', 'created', 'updated', 'timestamp', 'day'];
  const numericKeywords = ['revenue', 'cost', 'salary', 'wage', 'payroll', 'price', 'amount', 'value', 'fee', 'charge', 'spend',
    'budget', 'expense', 'income', 'profit', 'margin', 'payment', 'total', 'sum', 'count', 'num', 'qty', 'quantity',
    'rate', 'ratio', 'pct', 'percent', 'score', 'age', 'duration', 'hours', 'size', 'weight', 'height', 'length'];
  const idKeywords = ['_id', 'uuid', 'guid', 'pk_', 'fk_', 'key'];
  const geoKeywords = ['country', 'state', 'region', 'city', 'location', 'geo', 'lat', 'lon', 'latitude', 'longitude', 'zip', 'continent', 'nation', 'province', 'territory'];

  if (idKeywords.some(k => name.includes(k)) && !numericKeywords.some(k => name.includes(k))) return 'id';
  if (dateKeywords.some(k => name.includes(k))) return 'date';
  if (geoKeywords.some(k => name.includes(k))) return 'geo';
  if (numericKeywords.some(k => name.includes(k))) return 'numeric';

  // Sample value-based inference
  if (rows?.length > 0) {
    const colName = col.name || col;
    const samples = rows.slice(0, 20).map(r => r[colName]).filter(v => v != null && v !== '');
    if (samples.length === 0) return 'category';

    const numericCount = samples.filter(v => {
      const n = parseFloat(String(v).replace(/[$,€£%]/g, ''));
      return !isNaN(n) && isFinite(n);
    }).length;

    if (numericCount / samples.length >= 0.75) return 'numeric';

    const dateCount = samples.filter(v => {
      const d = new Date(v);
      return !isNaN(d.getTime()) && String(v).length > 4;
    }).length;
    if (dateCount / samples.length >= 0.5) return 'date';
  }

  return 'category';
}

function buildColumnsArray(table) {
  if (!table?.columns) return [];
  return table.columns.map(c => {
    const type = inferColumnType(c, table.rows);
    return {
      name: c.name || c,
      type,
      isKpiCandidate: type === 'numeric',
      isDateCandidate: type === 'date',
      isSegmentCandidate: type === 'category' || type === 'geo',
    };
  });
}

function isGeoColumn(name) {
  return ['country', 'countries', 'state', 'region', 'city', 'geo', 'lat', 'lon', 'latitude', 'longitude', 'zip', 'continent', 'province', 'territory', 'location', 'market']
    .some(kw => (name || '').toLowerCase().includes(kw));
}

// ── Chart Type Selector Panel ──────────────────────────────────────────────────
function ChartTypeSelector({ selected, onChange, onClose }) {
  return (
    <div className="absolute top-full left-0 z-50 mt-1 w-80 glass-card rounded-2xl border border-white/12 shadow-2xl overflow-hidden"
      style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.6)' }}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/8">
        <span className="text-xs font-bold text-white/60">Chart Type</span>
        <button onClick={onClose} className="p-1 text-white/30 hover:text-white/60"><X className="w-3.5 h-3.5" /></button>
      </div>
      <div className="overflow-y-auto max-h-96 p-3 space-y-3">
        {CHART_GROUPS.map(group => (
          <div key={group.label}>
            <div className="text-xs font-semibold mb-1.5 px-1" style={{ color: group.color + 'aa' }}>{group.label}</div>
            <div className="grid grid-cols-3 gap-1">
              {group.charts.map(chart => {
                const Icon = chart.icon;
                const isSelected = selected === chart.id;
                return (
                  <button key={chart.id} onClick={() => { onChange(chart.id); onClose(); }}
                    className={`flex flex-col items-center gap-1 p-2 rounded-xl border text-center transition-all ${isSelected ? 'border-opacity-50' : 'border-white/5 text-white/35 hover:text-white/70 hover:border-white/15 hover:bg-white/4'}`}
                    style={isSelected ? { borderColor: group.color + '60', background: group.color + '15', color: group.color } : {}}>
                    <Icon className="w-4 h-4" />
                    <span className="text-xs leading-tight">{chart.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Field Row with column picker ───────────────────────────────────────────────
function FieldRow({ label, color, field, columns, filterFn, onChange, onClear }) {
  const [open, setOpen] = useState(false);
  const filtered = filterFn ? columns.filter(filterFn) : columns;

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-white/30 w-6 font-bold flex-shrink-0">{label}</span>
      <div className="flex-1 relative">
        <button onClick={() => setOpen(v => !v)}
          className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg border text-xs transition-all"
          style={field
            ? { borderColor: color + '40', background: color + '10', color }
            : { borderColor: 'rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.03)', color: 'rgba(255,255,255,0.3)' }}>
          <span className="truncate">{field || `Select ${label} field…`}</span>
          <ChevronDown className="w-3 h-3 flex-shrink-0 ml-1" />
        </button>
        {open && (
          <div className="absolute top-full left-0 z-50 mt-1 w-full rounded-xl border border-white/12 overflow-hidden shadow-xl"
            style={{ background: 'hsl(222,44%,9%)' }}>
            <div className="max-h-44 overflow-y-auto">
              {filtered.map(c => (
                <button key={c.name} onClick={() => { onChange(c); setOpen(false); }}
                  className={`w-full text-left px-3 py-2 text-xs hover:bg-white/5 transition-colors flex items-center justify-between ${field === c.name ? 'text-white/80' : 'text-white/50'}`}>
                  <span>{c.name}</span>
                  <span className="text-white/25 ml-2">{c.type}</span>
                </button>
              ))}
              {filtered.length === 0 && <div className="px-3 py-2 text-xs text-white/25">No matching columns</div>}
            </div>
          </div>
        )}
      </div>
      {field && (
        <button onClick={onClear} className="text-white/20 hover:text-white/50 flex-shrink-0">
          <X className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}

// ── AI Insights Panel ──────────────────────────────────────────────────────────
function InsightsPanel({ chartData, chartType, xField, yField, tableName }) {
  const [bullets, setBullets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(true);
  const lastKey = useRef('');

  const genKey = `${chartType}|${xField}|${yField}|${chartData.length}`;

  useEffect(() => {
    if (!chartData.length || !yField || genKey === lastKey.current) return;
    lastKey.current = genKey;
    setLoading(true);
    setBullets([]);
    const run = async () => {
      try {
        const top5 = chartData.slice(0, 5).map(d => `${d.name}: ${fmtV(d.value)}`).join(', ');
        const total = chartData.reduce((s, d) => s + (d.value || 0), 0);
        const result = await base44.integrations.Core.InvokeLLM({
          model: 'gemini_3_flash',
          prompt: `Analyze this chart and write EXACTLY 3 bullet points for a business executive.

Chart: ${CHART_TYPE_LABELS[chartType] || chartType} of ${yField} by ${xField}
Dataset: ${tableName} | Points: ${chartData.length} | Total: ${fmtV(total)}
Top values: ${top5}

Rules: ONE sentence each. Start with 📊, 🔍, 💡. Be specific with numbers. No fluff.`,
          response_json_schema: {
            type: 'object',
            properties: { bullets: { type: 'array', items: { type: 'string' } } },
            required: ['bullets']
          }
        });
        if (result?.bullets?.length) setBullets(result.bullets);
      } catch {
        setBullets(['📊 Chart generated from your data.', '🔍 Explore the values using the chart above.', '💡 Use the AI generator for deeper analysis.']);
      }
      setLoading(false);
    };
    run();
  }, [genKey]);

  if (!chartData.length) return null;

  return (
    <div className="glass-card rounded-2xl border border-white/8 overflow-hidden">
      <button onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/3 transition-colors">
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-purple-400" />
          <span className="text-xs font-bold text-white/70">AI Insights</span>
          {loading && <Loader2 className="w-3 h-3 animate-spin text-purple-400" />}
        </div>
        {open ? <ChevronUp className="w-3.5 h-3.5 text-white/30" /> : <ChevronDown className="w-3.5 h-3.5 text-white/30" />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
            <div className="px-4 pb-4 space-y-2">
              {loading ? [1, 2, 3].map(i => <div key={i} className="h-4 rounded-full bg-white/5 shimmer" style={{ width: `${70 + i * 10}%` }} />) :
                bullets.map((b, i) => (
                  <motion.div key={i} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }}
                    className="flex items-start gap-2 p-2.5 rounded-xl bg-white/3 border border-white/6">
                    <p className="text-xs text-white/70 leading-relaxed">{b}</p>
                  </motion.div>
                ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function VisualBuilder() {
  const { getActiveTable, saveToDashboard, setActiveSection } = useWorkspaceStore();
  const table = getActiveTable();
  const columns = useMemo(() => buildColumnsArray(table), [table]);

  const [chartType, setChartType] = useState('bar');
  const [xField, setXField] = useState(null);
  const [yField, setYField] = useState(null);
  const [aggFn, setAggFn] = useState('SUM');
  const [marks] = useState(DEFAULT_MARKS);
  const [chartTitle, setChartTitle] = useState('');
  const [nlPrompt, setNlPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [saved, setSaved] = useState(false);
  const [aiSummary, setAiSummary] = useState('');
  const [showChartSelector, setShowChartSelector] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [generateError, setGenerateError] = useState('');

  // Build shelves from xField/yField for chart rendering
  const shelves = useMemo(() => ({
    x: xField ? [{ name: xField, agg: 'ATTR', type: columns.find(c => c.name === xField)?.type || 'category' }] : [],
    y: yField ? [{ name: yField, agg: aggFn, type: columns.find(c => c.name === yField)?.type || 'numeric' }] : [],
    color: [], size: [], detail: [], filter: [],
  }), [xField, yField, aggFn, columns]);

  const chartData = useMemo(() => {
    if (!table?.rows || !xField || !yField) return [];
    return buildChartData(table.rows, shelves, aggFn, chartType, marks);
  }, [table, shelves, aggFn, chartType, xField, yField]);

  const hasChart = chartData.length > 0;

  // Auto-populate fields when table loads
  useEffect(() => {
    if (!columns.length || xField || yField) return;
    const numCols = columns.filter(c => c.type === 'numeric');
    const catCols = columns.filter(c => c.type === 'category' || c.type === 'geo');
    const dateCols = columns.filter(c => c.type === 'date');

    if (catCols.length) setXField(catCols[0].name);
    else if (dateCols.length) setXField(dateCols[0].name);

    if (numCols.length) setYField(numCols[0].name);
  }, [columns]);

  // ── AI Chart Generator ───────────────────────────────────────────────────────
  const handleNLGenerate = useCallback(async (promptOverride) => {
    const prompt = (promptOverride || nlPrompt).trim();
    if (!prompt || !table) return;
    setGenerating(true);
    setAiSummary('');
    setGenerateError('');

    try {
      const colContext = columns.slice(0, 40).map(c => {
        const samples = table.rows?.slice(0, 5).map(r => r[c.name]).filter(v => v != null).slice(0, 3);
        return `"${c.name}" [${c.type}] e.g. ${samples?.join(', ') || 'N/A'}`;
      }).join('\n');

      const numCols = columns.filter(c => c.type === 'numeric');
      const catCols = columns.filter(c => c.type === 'category' || c.type === 'geo');
      const dateCols = columns.filter(c => c.type === 'date');

      const result = await base44.integrations.Core.InvokeLLM({
        model: 'claude_sonnet_4_6',
        prompt: `You are a BI Analyst. Given the user request and dataset, return the EXACT field names from the dataset.

USER REQUEST: "${prompt}"

DATASET: "${table.name}" — ${table.rowCount || table.rows?.length} rows
ALL COLUMNS (exact name [inferred type] sample values):
${colContext}

NUMERIC COLUMNS: ${numCols.map(c => c.name).join(', ') || 'none'}
CATEGORY/TEXT COLUMNS: ${catCols.map(c => c.name).join(', ') || 'none'}
DATE COLUMNS: ${dateCols.map(c => c.name).join(', ') || 'none'}

RULES — CRITICAL:
1. x_field MUST be the EXACT column name from the list above (categorical, date, or geo column)
2. y_field MUST be the EXACT column name from the list above (numeric column)
3. NEVER use a field name that is not in the column list above
4. Pick the most meaningful numeric column for the requested metric
5. Pick the best grouping column for x_field

CHART SELECTION GUIDE:
- "top/best/worst/rank/compare" → bar or bar_horizontal
- "trend/over time/monthly/by date" → line or area  
- "distribution/spread/histogram" → histogram
- "breakdown/share/proportion/percent" → donut or pie
- "map/region/country/city/geo" → choropleth_map
- "correlation/relationship" → scatter
- "forecast/predict/next" → forecast_line
- "funnel/stages/conversion" → funnel
- "total/kpi/summary number" → metric_card

AVAILABLE CHART TYPES: bar, bar_horizontal, bar_stacked, bar_grouped, line, area, area_stacked, scatter, bubble, histogram, donut, pie, treemap, box_plot, waterfall, heatmap, text_table, funnel, metric_card, gauge, radar, forecast_line, dual_axis, sankey, packed_bubble, sunburst, choropleth_map, step_line

Return JSON only:`,
        response_json_schema: {
          type: 'object',
          properties: {
            chart_type: { type: 'string' },
            x_field: { type: 'string' },
            y_field: { type: 'string' },
            aggregation: { type: 'string', enum: ['SUM', 'AVG', 'COUNT', 'MIN', 'MAX'] },
            title: { type: 'string' },
            insight: { type: 'string' },
          },
          required: ['chart_type', 'x_field', 'y_field', 'aggregation', 'title', 'insight'],
        },
      });

      if (!result) throw new Error('No response from AI');

      // ── Validate and fuzzy-match field names ──────────────────────────────────
      const colNames = columns.map(c => c.name);

      const findBestMatch = (fieldName, preferredType) => {
        if (!fieldName) return null;

        // Exact match first
        if (colNames.includes(fieldName)) return fieldName;

        // Case-insensitive match
        const lower = fieldName.toLowerCase();
        const caseMatch = colNames.find(n => n.toLowerCase() === lower);
        if (caseMatch) return caseMatch;

        // Partial match
        const partialMatch = colNames.find(n =>
          n.toLowerCase().includes(lower) || lower.includes(n.toLowerCase())
        );
        if (partialMatch) return partialMatch;

        // Fallback: pick first column of preferred type
        const typeFallback = columns.find(c => c.type === preferredType);
        return typeFallback?.name || null;
      };

      const resolvedX = findBestMatch(result.x_field, 'category') ||
        columns.find(c => c.type === 'category' || c.type === 'geo' || c.type === 'date')?.name;
      const resolvedY = findBestMatch(result.y_field, 'numeric') ||
        columns.find(c => c.type === 'numeric')?.name;

      if (!resolvedX || !resolvedY) {
        throw new Error('Could not identify suitable fields. Try rephrasing with column names.');
      }

      setChartType(result.chart_type || 'bar');
      setAggFn(result.aggregation || 'SUM');
      setChartTitle(result.title || '');
      setAiSummary(result.insight || '');
      setXField(resolvedX);
      setYField(resolvedY);

    } catch (e) {
      setGenerateError(e.message || 'Generation failed. Try a different prompt.');
    }
    setGenerating(false);
  }, [nlPrompt, table, columns]);

  const handleAutoRecommend = useCallback(() => {
    const numCols = columns.filter(c => c.type === 'numeric');
    const catCols = columns.filter(c => c.type === 'category');
    const dateCols = columns.filter(c => c.type === 'date');
    const geoCols = columns.filter(c => c.type === 'geo');

    if (geoCols.length && numCols.length) {
      setChartType('choropleth_map'); setXField(geoCols[0].name); setYField(numCols[0].name);
    } else if (dateCols.length && numCols.length) {
      setChartType('line'); setXField(dateCols[0].name); setYField(numCols[0].name);
    } else if (catCols.length && numCols.length) {
      setChartType('bar'); setXField(catCols[0].name); setYField(numCols[0].name);
    } else if (numCols.length >= 2) {
      setChartType('scatter'); setXField(numCols[0].name); setYField(numCols[1].name);
    }
    setChartTitle('Auto-recommended chart');
  }, [columns]);

  const handleSave = useCallback(() => {
    if (!hasChart) return;
    const title = chartTitle || `${yField} by ${xField}`;
    saveToDashboard({
      label: title,
      datasetName: table?.name,
      chart: { type: chartType, title, data: chartData, x_key: 'name', y_key: 'value', color_theme: marks.color },
      insight: aiSummary,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }, [chartData, chartTitle, xField, yField, table, chartType, marks, aiSummary, saveToDashboard]);

  // ── Empty state ──────────────────────────────────────────────────────────────
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
    <div className="flex h-full flex-col overflow-hidden">

      {/* ── Top bar ── */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/8 flex-shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <BarChart2 className="w-4 h-4 text-cyan-400 flex-shrink-0" />
          <span className="font-bold text-sm">Visual Builder</span>
          <span className="text-xs text-white/25 truncate">· {table.name} · {(table.rowCount || table.rows?.length)?.toLocaleString()} rows</span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button onClick={handleAutoRecommend}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-xl bg-white/5 border border-white/10 text-white/40 hover:text-white/70 hover:border-white/20 transition-all">
            <Wand2 className="w-3.5 h-3.5" /> Auto
          </button>
          <input value={chartTitle} onChange={e => setChartTitle(e.target.value)} placeholder="Chart title…"
            className="w-36 px-3 py-1.5 bg-white/5 border border-white/10 rounded-xl text-xs focus:outline-none focus:border-cyan-400/30 text-foreground" />
          <button onClick={handleSave} disabled={!hasChart}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold transition-all disabled:opacity-40 ${saved ? 'bg-green-400/15 border border-green-400/25 text-green-400' : 'bg-cyan-400 hover:bg-cyan-300'}`}
            style={!saved ? { color: 'hsl(222,47%,6%)' } : {}}>
            {saved ? <><CheckCircle2 className="w-3 h-3" /> Saved!</> : <><Save className="w-3 h-3" /> Save</>}
          </button>
        </div>
      </div>

      {/* ── AI Prompt Bar ── */}
      <div className="border-b border-white/5 flex-shrink-0 px-4 py-3 space-y-2"
        style={{ background: 'linear-gradient(135deg, rgba(168,85,247,0.07) 0%, rgba(0,229,255,0.04) 100%)' }}>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-2.5 flex-1 rounded-xl border border-purple-400/20 bg-white/3 focus-within:border-purple-400/40 transition-all">
            {generating ? <Loader2 className="w-3.5 h-3.5 text-purple-400 animate-spin flex-shrink-0" />
              : <Sparkles className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />}
            <input value={nlPrompt} onChange={e => setNlPrompt(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !generating && handleNLGenerate()}
              placeholder={`Describe your chart — e.g. "Top 10 products by revenue" or "Sales trend by month"`}
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-white/25 focus:outline-none"
              disabled={generating} />
          </div>
          <button onClick={() => handleNLGenerate()} disabled={generating || !nlPrompt.trim()}
            className="flex items-center gap-2 px-4 py-2.5 bg-purple-500 hover:bg-purple-400 text-white rounded-xl text-sm font-bold transition-all disabled:opacity-40 flex-shrink-0">
            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {generating ? 'Generating…' : 'Generate'}
          </button>
        </div>
        {/* Quick chips */}
        <div className="flex gap-2 overflow-x-auto pb-0.5">
          {QUICK_PROMPTS.map(({ label, prompt }) => (
            <button key={label} onClick={() => { setNlPrompt(prompt); handleNLGenerate(prompt); }}
              disabled={generating}
              className="flex-shrink-0 text-xs px-3 py-1.5 rounded-full bg-white/4 border border-white/8 text-white/40 hover:text-purple-300 hover:border-purple-400/30 hover:bg-purple-400/8 transition-all disabled:opacity-40">
              {label}
            </button>
          ))}
        </div>
        {generateError && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-400/8 border border-red-400/20 text-xs text-red-400">
            <X className="w-3 h-3 flex-shrink-0" />{generateError}
          </div>
        )}
      </div>

      {/* ── Main area: Controls sidebar + Chart ── */}
      <div className="flex flex-1 overflow-hidden min-h-0">

        {/* ── Controls Sidebar ── */}
        <div className={`flex-shrink-0 border-r border-white/8 overflow-y-auto transition-all duration-200 ${showControls ? 'w-56' : 'w-10'}`}>
          {showControls ? (
            <div className="p-3 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white/40 uppercase tracking-widest">Controls</span>
                <button onClick={() => setShowControls(false)} className="text-white/20 hover:text-white/50">
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Chart Type selector */}
              <div className="space-y-1.5">
                <label className="text-xs text-white/30 font-semibold">Chart Type</label>
                <div className="relative">
                  <button onClick={() => setShowChartSelector(v => !v)}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl border border-white/12 bg-white/4 text-xs text-white/70 hover:border-white/20 hover:bg-white/6 transition-all">
                    <span className="font-semibold">{CHART_TYPE_LABELS[chartType] || chartType}</span>
                    <ChevronDown className="w-3.5 h-3.5 text-white/30" />
                  </button>
                  {showChartSelector && (
                    <ChartTypeSelector selected={chartType} onChange={(t) => { setChartType(t); }}
                      onClose={() => setShowChartSelector(false)} />
                  )}
                </div>
              </div>

              {/* Fields */}
              <div className="space-y-2">
                <label className="text-xs text-white/30 font-semibold">Fields</label>
                <FieldRow label="X" color="#00e5ff" field={xField}
                  columns={columns}
                  filterFn={c => ['category', 'date', 'geo', 'id'].includes(c.type)}
                  onChange={c => setXField(c.name)}
                  onClear={() => setXField(null)} />
                <FieldRow label="Y" color="#a855f7" field={yField}
                  columns={columns}
                  filterFn={c => c.type === 'numeric'}
                  onChange={c => setYField(c.name)}
                  onClear={() => setYField(null)} />
              </div>

              {/* Aggregation */}
              <div className="space-y-1.5">
                <label className="text-xs text-white/30 font-semibold">Aggregation</label>
                <div className="grid grid-cols-3 gap-1">
                  {AGG_OPTIONS.map(agg => (
                    <button key={agg} onClick={() => setAggFn(agg)}
                      className={`px-2 py-1.5 rounded-lg text-xs font-bold transition-all ${aggFn === agg ? 'bg-cyan-400/15 border border-cyan-400/30 text-cyan-400' : 'bg-white/4 border border-white/8 text-white/35 hover:text-white/60 hover:bg-white/7'}`}>
                      {agg}
                    </button>
                  ))}
                </div>
              </div>

              {/* Column reference */}
              <div className="space-y-1.5">
                <label className="text-xs text-white/30 font-semibold">Columns ({columns.length})</label>
                <div className="space-y-0.5 max-h-40 overflow-y-auto">
                  {columns.map(c => (
                    <div key={c.name}
                      className="flex items-center justify-between px-2 py-1 rounded-lg hover:bg-white/4 cursor-pointer group"
                      onClick={() => {
                        if (c.type === 'numeric') setYField(c.name);
                        else setXField(c.name);
                      }}>
                      <span className="text-xs text-white/50 group-hover:text-white/75 truncate">{c.name}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded-full ml-1 flex-shrink-0 ${
                        c.type === 'numeric' ? 'bg-cyan-400/10 text-cyan-400/70' :
                        c.type === 'date' ? 'bg-green-400/10 text-green-400/70' :
                        c.type === 'geo' ? 'bg-yellow-400/10 text-yellow-400/70' :
                        'bg-white/5 text-white/30'}`}>
                        {c.type}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <button onClick={() => setShowControls(true)}
              className="w-10 h-full flex items-center justify-center text-white/20 hover:text-white/50 transition-colors">
              <Settings2 className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* ── Chart Area ── */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          <div className="flex-1 overflow-y-auto p-4 space-y-4">

            {/* Status bar */}
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2 text-xs">
                <span className="px-2 py-0.5 rounded-lg border border-white/10 bg-white/4 text-white/50 font-semibold">
                  {CHART_TYPE_LABELS[chartType] || chartType}
                </span>
                {xField && <span className="text-white/30">X: <span className="text-white/50">{xField}</span></span>}
                {yField && <><span className="text-white/20">·</span><span className="text-white/30">Y: <span className="text-white/50">{yField}</span> ({aggFn})</span></>}
                {hasChart && <span className="text-white/20">· {chartData.length} pts</span>}
              </div>
              <button onClick={handleAutoRecommend}
                className="flex items-center gap-1 text-xs text-white/20 hover:text-white/50 px-2 py-1 rounded-lg hover:bg-white/4 transition-all">
                <RefreshCw className="w-3 h-3" /> Re-detect
              </button>
            </div>

            {/* Chart */}
            <div className="glass-card rounded-2xl p-4 border border-white/8 min-h-[320px] flex items-center justify-center">
              {!xField && !yField ? (
                <div className="flex flex-col items-center gap-3 text-center py-8">
                  <div className="w-16 h-16 rounded-2xl bg-purple-400/8 border border-purple-400/15 flex items-center justify-center">
                    <Sparkles className="w-7 h-7 text-purple-400/50" />
                  </div>
                  <div>
                    <p className="text-sm text-white/40 font-semibold">Ask AI or pick fields manually</p>
                    <p className="text-xs text-white/25 mt-1">Type a prompt above · or select X and Y in the controls panel</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-1 w-full max-w-xs">
                    {QUICK_PROMPTS.map(({ label, prompt }) => (
                      <button key={label} onClick={() => { setNlPrompt(prompt); handleNLGenerate(prompt); }}
                        className="text-left text-xs p-2.5 rounded-xl bg-white/3 border border-white/8 hover:bg-white/5 hover:border-white/15 transition-all text-white/40">
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              ) : !hasChart ? (
                <div className="text-center py-8">
                  <p className="text-sm text-white/30">No data to display.</p>
                  <p className="text-xs text-white/20 mt-1">Try a different X field — needs a categorical or date column.</p>
                </div>
              ) : (
                <div className="w-full">
                  <VBChartPreview chartType={chartType} data={chartData} marks={marks} shelves={shelves} />
                </div>
              )}
            </div>

            {/* AI summary */}
            <AnimatePresence>
              {aiSummary && (
                <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="flex items-start gap-2.5 px-3.5 py-2.5 rounded-xl bg-purple-400/5 border border-purple-400/15">
                  <Sparkles className="w-3.5 h-3.5 text-purple-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-white/60 leading-relaxed">{aiSummary}</p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* AI Insights */}
            <InsightsPanel chartData={chartData} chartType={chartType}
              xField={xField} yField={yField} tableName={table?.name} />
          </div>

          {/* Bottom analysis panel */}
          <VBBottomPanel chartType={chartType} shelves={shelves} marks={marks}
            data={chartData} aggFn={aggFn} tableName={table?.name} rows={table?.rows} />
        </div>
      </div>
    </div>
  );
}

// Missing icon import fix
function Save(props) {
  return (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>
    </svg>
  );
}

function ChevronLeft(props) {
  return (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6"/>
    </svg>
  );
}