/**
 * VisualBuilder — AI-first, distraction-free chart builder
 * Clean: AI prompt hero + live chart preview + auto Insights Panel
 */
import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWorkspaceStore } from '@/lib/store';
import { base44 } from '@/api/base44Client';
import {
  Sparkles, Save, CheckCircle2, Loader2, Database, ArrowRight,
  Wand2, RefreshCw, TrendingUp, BarChart2, Map, Zap, ChevronDown,
  ChevronUp, Brain, X
} from 'lucide-react';

import VBChartPreview, { buildChartData, fmtV } from '@/components/visualbuilder/VBChartPreview.jsx';
import VBBottomPanel from '@/components/visualbuilder/VBBottomPanel.jsx';
import { recommendChartType } from '@/components/visualbuilder/VBShowMeGallery.jsx';
import VBMapTemplates, { autoMatchMapTemplate, resolveTemplateColumns } from '@/components/visualbuilder/VBMapTemplates.jsx';

// ── constants ──────────────────────────────────────────────────────────────────
const DEFAULT_MARKS = { color: '#00e5ff', opacity: 85, strokeWidth: 2, borderRadius: 4, sort: 'Desc', showGrid: true };

const GEO_KEYWORDS = ['country', 'countries', 'nation', 'state', 'region', 'city', 'location', 'place',
  'geo', 'lat', 'lon', 'latitude', 'longitude', 'zip', 'continent', 'province', 'territory', 'market'];

const QUICK_PROMPTS = [
  { label: 'Top 10 by value', icon: BarChart2, prompt: 'Show the top 10 categories by value as a bar chart' },
  { label: 'Trend over time', icon: TrendingUp, prompt: 'Show the trend over time as a line chart' },
  { label: 'By region on map', icon: Map, prompt: 'Show metrics by region or country on a map' },
  { label: 'Part-to-whole', icon: Zap, prompt: 'Show how each category contributes as a donut chart' },
];

const CHART_TYPE_LABELS = {
  bar: 'Bar', bar_horizontal: 'Horizontal Bar', bar_stacked: 'Stacked Bar', bar_grouped: 'Grouped Bar',
  line: 'Line', area: 'Area', area_stacked: 'Stacked Area', forecast_line: 'Forecast',
  scatter: 'Scatter', bubble: 'Bubble', histogram: 'Histogram', box_plot: 'Box Plot',
  donut: 'Donut', pie: 'Pie', treemap: 'Treemap', packed_bubble: 'Bubbles', sunburst: 'Sunburst',
  choropleth_map: 'Filled Map', symbol_map: 'Symbol Map', heat_map_geo: 'Density Map',
  heatmap: 'Heatmap', highlight_table: 'Highlight Table', text_table: 'Table', pivot: 'Pivot',
  funnel: 'Funnel', sankey: 'Sankey', radar: 'Radar', gauge: 'Gauge', metric_card: 'KPI Card',
  candlestick: 'Candlestick', gantt: 'Gantt', waterfall: 'Waterfall', dual_axis: 'Dual Axis', step_line: 'Step Line',
};

// ── helpers ────────────────────────────────────────────────────────────────────
function isGeoColumn(name) {
  const lower = (name || '').toLowerCase();
  return GEO_KEYWORDS.some(kw => lower.includes(kw));
}

function buildColumnsArray(table) {
  if (!table?.columns) return [];
  return table.columns.map(c => ({
    name: c.name || c,
    type: c.inferredType || c.type || 'text',
    isKpiCandidate: c.isKpiCandidate,
    isDateCandidate: c.isDateCandidate,
    isSegmentCandidate: c.isSegmentCandidate,
  }));
}

// ── InsightsPanel ──────────────────────────────────────────────────────────────
function InsightsPanel({ chartData, chartType, xField, yField, tableName, columns }) {
  const [bullets, setBullets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(true);
  const lastKey = useRef('');

  const genKey = `${chartType}|${xField}|${yField}|${chartData.length}`;

  useEffect(() => {
    if (!chartData.length || !yField || genKey === lastKey.current) return;
    lastKey.current = genKey;

    const run = async () => {
      setLoading(true);
      setBullets([]);
      try {
        const top5 = chartData.slice(0, 5).map(d => `${d.name}: ${fmtV(d.value)}`).join(', ');
        const total = chartData.reduce((s, d) => s + (d.value || 0), 0);
        const min = chartData[chartData.length - 1]?.value;
        const max = chartData[0]?.value;
        const result = await base44.integrations.Core.InvokeLLM({
          model: 'gemini_3_flash',
          prompt: `You are a concise data analyst. Analyze this chart and write EXACTLY 3 short bullet points.

Chart: ${CHART_TYPE_LABELS[chartType] || chartType} of ${yField} by ${xField}
Dataset: ${tableName}
Top values: ${top5}
Total: ${fmtV(total)} | Max: ${fmtV(max)} | Min: ${fmtV(min)} | Points: ${chartData.length}

Rules:
- Each bullet must be ONE sentence, max 18 words
- Focus on: #1 the dominant pattern, #2 a notable outlier or gap, #3 a business recommendation
- Start each with an emoji: 📊 🔍 💡
- Be specific with numbers from the data above
- No generic observations, no fluff`,
          response_json_schema: {
            type: 'object',
            properties: {
              bullets: { type: 'array', items: { type: 'string' }, minItems: 3, maxItems: 3 }
            },
            required: ['bullets']
          }
        });
        if (result?.bullets?.length) setBullets(result.bullets);
      } catch {
        setBullets(['📊 Chart generated from your data.', '🔍 Explore the values using the chart above.', '💡 Try the AI generator for deeper analysis.']);
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
          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
            className="overflow-hidden">
            <div className="px-4 pb-4 space-y-2">
              {loading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-4 rounded-full bg-white/5 shimmer" style={{ width: `${70 + i * 10}%` }} />
                  ))}
                </div>
              ) : bullets.map((b, i) => (
                <motion.div key={i} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.08 }}
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

// ── Main ───────────────────────────────────────────────────────────────────────
export default function VisualBuilder() {
  const { getActiveTable, saveToDashboard, setActiveSection } = useWorkspaceStore();
  const table = getActiveTable();
  const columns = useMemo(() => buildColumnsArray(table), [table]);

  const [chartType, setChartType] = useState('bar');
  const [shelves, setShelves] = useState({ x: [], y: [], color: [], size: [], detail: [], filter: [] });
  const [aggFn, setAggFn] = useState('SUM');
  const marks = DEFAULT_MARKS;
  const [chartTitle, setChartTitle] = useState('');
  const [nlPrompt, setNlPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [saved, setSaved] = useState(false);
  const [aiSummary, setAiSummary] = useState('');
  const [showMapTemplates, setShowMapTemplates] = useState(false);

  const chartData = useMemo(() => {
    if (!table?.rows) return [];
    return buildChartData(table.rows, shelves, aggFn, chartType, marks);
  }, [table, shelves, aggFn, chartType]);

  const handleNLGenerate = useCallback(async (promptOverride) => {
    const prompt = (promptOverride || nlPrompt).trim();
    if (!prompt || !table) return;
    setGenerating(true);
    setAiSummary('');
    try {
      const colContext = columns.slice(0, 40).map(c => {
        const vals = table.rows?.slice(0, 5).map(r => r[c.name]).filter(v => v != null).slice(0, 3);
        return `${c.name} [${c.type}] e.g. ${vals?.join(', ') || 'N/A'}`;
      }).join('\n');

      const geoCols = columns.filter(c => isGeoColumn(c.name));
      const numCols = columns.filter(c => c.type === 'numeric' || c.isKpiCandidate);
      const dateCols = columns.filter(c => c.type === 'date' || c.isDateCandidate);

      // Infer business domain from dataset name + column names
      const allColNames = columns.map(c => c.name.toLowerCase()).join(' ');
      const domainHints = [
        allColNames.match(/revenue|sales|gmv|arr|mrr|deal|pipeline/) ? 'SALES/REVENUE dataset' : null,
        allColNames.match(/churn|retention|ltv|clv|nps|satisfaction/) ? 'CUSTOMER SUCCESS dataset' : null,
        allColNames.match(/session|pageview|bounce|ctr|conversion|funnel/) ? 'MARKETING/WEB ANALYTICS dataset' : null,
        allColNames.match(/open|high|low|close|volume|price/) ? 'FINANCIAL/STOCK dataset' : null,
        allColNames.match(/defect|yield|throughput|cycle|sla|uptime/) ? 'OPERATIONS dataset' : null,
        allColNames.match(/country|state|region|city|latitude|longitude/) ? 'GEO/REGIONAL dataset' : null,
      ].filter(Boolean).join(', ') || 'general business dataset';

      // KPI-aware aggregation hints
      const kpiHints = numCols.slice(0, 6).map(c => {
        const n = c.name.toLowerCase();
        const agg = n.match(/rate|pct|percent|ratio|avg|score|nps/) ? 'AVG'
          : n.match(/count|num_|number|qty|quantity/) ? 'COUNT'
          : 'SUM';
        return `${c.name} → ${agg}`;
      }).join(', ');

      const result = await base44.integrations.Core.InvokeLLM({
        model: 'claude_sonnet_4_6',
        prompt: `You are a world-class Senior BI Analyst. Choose the BEST chart configuration.

USER REQUEST: "${prompt}"

DATASET: "${table.name}" — detected as: ${domainHints}
ROWS: ${table.rowCount || table.rows?.length}

COLUMNS (name [type] sample values):
${colContext}

KPI AGGREGATION HINTS: ${kpiHints || 'none'}
GEOGRAPHIC COLUMNS: ${geoCols.map(c => c.name).join(', ') || 'none'}
DATE COLUMNS: ${dateCols.map(c => c.name).join(', ') || 'none'}
NUMERIC KPI COLUMNS: ${numCols.map(c => c.name).join(', ') || 'none'}

SMART CHART SELECTION (business domain aware):
SALES/REVENUE: revenue trends → line/area | by region → choropleth_map | top products → bar_horizontal | breakdown → donut
CUSTOMER: churn/retention → line | segments → bar/treemap | NPS scores → gauge/radar | cohorts → heatmap
MARKETING: funnel/conversion → funnel | CTR/bounce → dual_axis | traffic over time → area_stacked
FINANCIAL: stock prices → candlestick | P&L variance → waterfall | portfolio → treemap
OPERATIONS: SLA/uptime → line | process steps → gantt | throughput → histogram
GEO/REGIONAL: by country/state → choropleth_map or symbol_map | city density → heat_map_geo

UNIVERSAL RULES (highest priority):
1. MAPS: any mention of "map/region/country/state/city/geography" → choropleth_map; x_field=geo column, y_field=numeric KPI
2. TIME: "trend/over time/monthly/quarterly" → line or area; x_field=date column
3. RANKING: "top N/best/worst/rank" → bar_horizontal (sorted)
4. SINGLE NUMBER: "total/KPI/summary/how much" → metric_card
5. TWO MEASURES: "vs/compare X and Y" → dual_axis
6. FORECAST: "predict/forecast/next" → forecast_line
7. x_field MUST be categorical/date/geo — NEVER a pure numeric ID
8. y_field MUST be the numeric measure matching the request intent
9. Pick aggregation from KPI hints above — rates/scores → AVG, counts → COUNT, sums → SUM

AVAILABLE: bar, bar_horizontal, bar_stacked, bar_grouped, line, area, area_stacked, scatter, bubble,
histogram, donut, pie, treemap, box_plot, waterfall, heatmap, highlight_table, text_table, funnel,
metric_card, gauge, radar, forecast_line, dual_axis, sankey, packed_bubble, sunburst,
choropleth_map, symbol_map, heat_map_geo, gantt, step_line, candlestick

RESPOND ONLY with JSON:`,
        response_json_schema: {
          type: 'object',
          properties: {
            chart_type: { type: 'string' },
            x_field: { type: 'string' },
            y_field: { type: 'string' },
            y2_field: { type: 'string' },
            aggregation: { type: 'string' },
            title: { type: 'string' },
            insight: { type: 'string' },
          },
          required: ['chart_type', 'x_field', 'y_field', 'aggregation', 'title', 'insight'],
        },
      });

      if (result?.chart_type) setChartType(result.chart_type);
      if (result?.aggregation) setAggFn(result.aggregation);
      if (result?.title) setChartTitle(result.title);
      if (result?.insight) setAiSummary(result.insight);

      // Validate x_field is not a numeric column for maps
      let xFieldName = result?.x_field;
      const isMapChart = ['choropleth_map', 'symbol_map', 'heat_map_geo'].includes(result?.chart_type);
      if (isMapChart) {
        const xCol = columns.find(c => c.name === xFieldName);
        if (!xCol || xCol.type === 'numeric') {
          // Auto-fix: find a geo column or categorical column
          const fallback = geoCols[0] || columns.find(c => c.type === 'category' || c.type === 'text' || c.isSegmentCandidate);
          if (fallback) xFieldName = fallback.name;
        }
      }

      const xCol = columns.find(c => c.name === xFieldName);
      const yCol = columns.find(c => c.name === result?.y_field);
      const y2Col = result?.y2_field ? columns.find(c => c.name === result.y2_field) : null;

      const newShelves = { x: [], y: [], color: [], size: [], detail: [], filter: [] };
      if (xCol) newShelves.x = [{ name: xCol.name, agg: 'ATTR', type: xCol.type }];
      if (yCol) newShelves.y = [{ name: yCol.name, agg: result.aggregation || 'SUM', type: yCol.type }];
      if (y2Col) newShelves.y = [...newShelves.y, { name: y2Col.name, agg: result.aggregation || 'SUM', type: y2Col.type }];
      setShelves(newShelves);

    } catch (e) {
      console.error(e);
      setAiSummary('Could not generate chart. Try rephrasing — e.g. "Top 5 sales by category"');
    }
    setGenerating(false);
  }, [nlPrompt, table, columns]);

  // Apply a map template one-click
  const handleApplyMapTemplate = useCallback((template) => {
    const { geoCol, kpiCol } = resolveTemplateColumns(template, columns);
    if (!geoCol || !kpiCol) return;
    setChartType(template.chartType);
    setAggFn(template.aggFn);
    setChartTitle(template.label);
    setAiSummary(template.desc);
    setShelves({
      x: [{ name: geoCol.name, agg: 'ATTR', type: geoCol.type }],
      y: [{ name: kpiCol.name, agg: template.aggFn, type: kpiCol.type }],
      color: [], size: [], detail: [], filter: [],
    });
    setShowMapTemplates(false);
  }, [columns]);

  const handleAutoRecommend = useCallback(() => {
    const rec = recommendChartType(columns);
    setChartType(rec);
    const numCols = columns.filter(c => c.type === 'numeric' || c.isKpiCandidate);
    const catCols = columns.filter(c => c.type === 'category' || c.isSegmentCandidate);
    const dateCols = columns.filter(c => c.type === 'date' || c.isDateCandidate);
    const geoCols = columns.filter(c => isGeoColumn(c.name));
    const newShelves = { x: [], y: [], color: [], size: [], detail: [], filter: [] };
    if (geoCols.length && (rec === 'choropleth_map' || rec === 'symbol_map')) {
      newShelves.x = [{ name: geoCols[0].name, agg: 'ATTR', type: geoCols[0].type }];
    } else if (dateCols.length) {
      newShelves.x = [{ name: dateCols[0].name, agg: 'ATTR', type: 'date' }];
    } else if (catCols.length) {
      newShelves.x = [{ name: catCols[0].name, agg: 'ATTR', type: 'category' }];
    }
    if (numCols.length) newShelves.y = [{ name: numCols[0].name, agg: 'SUM', type: 'numeric' }];
    setShelves(newShelves);
    setChartTitle('Auto-recommended chart');
  }, [columns]);

  const handleSave = useCallback(() => {
    if (!chartData.length) return;
    const title = chartTitle || shelves.y[0]?.name?.replace(/_/g, ' ') || 'Chart';
    saveToDashboard({
      label: title,
      datasetName: table?.name,
      chart: { type: chartType, title, data: chartData, x_key: 'name', y_key: 'value', color_theme: marks.color },
      insight: aiSummary,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }, [chartData, chartTitle, shelves, table, chartType, marks, aiSummary, saveToDashboard]);

  // ── empty state ──
  if (!table) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[500px] text-center">
        <Database className="w-12 h-12 text-white/15 mb-4" />
        <h2 className="text-lg font-semibold mb-2">No Data Loaded</h2>
        <p className="text-sm text-muted-foreground mb-5">Upload a dataset to start building charts with AI.</p>
        <button onClick={() => setActiveSection('intake')}
          className="flex items-center gap-2 px-5 py-2.5 bg-cyan-400/10 border border-cyan-400/20 text-cyan-400 rounded-xl text-sm font-semibold hover:bg-cyan-400/15 transition-colors">
          Upload Data <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    );
  }

  const xField = shelves.x[0]?.name;
  const yField = shelves.y[0]?.name;
  const hasChart = !!(xField || yField) && chartData.length > 0;

  return (
    <div className="flex h-full flex-col overflow-hidden">

      {/* ── Top bar ── */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/8 flex-shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <BarChart2 className="w-4 h-4 text-cyan-400 flex-shrink-0" />
          <span className="font-bold text-sm">Visual Builder</span>
          <span className="text-xs text-white/25 truncate">· {table.name} · {(table.rowCount || table.rows?.length)?.toLocaleString()} rows</span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button onClick={handleAutoRecommend}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-xl bg-white/5 border border-white/10 text-white/40 hover:text-white/70 hover:border-white/20 transition-all">
            <Wand2 className="w-3.5 h-3.5" /> Auto Recommend
          </button>
          <button onClick={() => setShowMapTemplates(v => !v)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-xl border transition-all ${showMapTemplates ? 'bg-yellow-400/10 border-yellow-400/25 text-yellow-400' : 'bg-white/5 border-white/10 text-white/40 hover:text-yellow-400 hover:border-yellow-400/25'}`}>
            <Map className="w-3.5 h-3.5" /> Map Templates
          </button>
          <input value={chartTitle} onChange={e => setChartTitle(e.target.value)} placeholder="Chart title…"
            className="w-40 px-3 py-1.5 bg-white/5 border border-white/10 rounded-xl text-xs focus:outline-none focus:border-cyan-400/30 text-foreground" />
          <button onClick={handleSave} disabled={!hasChart}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold transition-all disabled:opacity-40 ${saved ? 'bg-green-400/15 border border-green-400/25 text-green-400' : 'bg-cyan-400 hover:bg-cyan-300'}`}
            style={!saved ? { color: 'hsl(222,47%,6%)' } : {}}>
            {saved ? <><CheckCircle2 className="w-3 h-3" /> Saved!</> : <><Save className="w-3 h-3" /> Save to Dashboard</>}
          </button>
        </div>
      </div>

      {/* ── AI Prompt Bar (hero) ── */}
      <div className="border-b border-white/5 flex-shrink-0" style={{ background: 'linear-gradient(135deg, rgba(168,85,247,0.07) 0%, rgba(0,229,255,0.04) 100%)' }}>
        <div className="px-5 pt-4 pb-2 flex items-center gap-3">
          <div className="flex items-center gap-2 px-4 py-3 flex-1 rounded-2xl border border-purple-400/20 bg-white/3 focus-within:border-purple-400/40 focus-within:bg-white/5 transition-all">
            {generating
              ? <Loader2 className="w-4 h-4 text-purple-400 animate-spin flex-shrink-0" />
              : <Sparkles className="w-4 h-4 text-purple-400 flex-shrink-0" />}
            <input
              value={nlPrompt}
              onChange={e => setNlPrompt(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !generating && handleNLGenerate()}
              placeholder='Describe your chart — e.g. "Show sales by country on a map" or "Top 10 products by revenue"'
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-white/30 focus:outline-none"
              disabled={generating}
            />
          </div>
          <button onClick={() => handleNLGenerate()} disabled={generating || !nlPrompt.trim()}
            className="flex items-center gap-2 px-5 py-3 bg-purple-500 hover:bg-purple-400 text-white rounded-2xl text-sm font-bold shadow-lg transition-all disabled:opacity-40 flex-shrink-0"
            style={{ boxShadow: '0 0 20px rgba(168,85,247,0.3)' }}>
            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {generating ? 'Generating…' : 'Generate'}
          </button>
        </div>

        {/* Quick prompt chips */}
        <div className="flex gap-2 px-5 pb-3 overflow-x-auto">
          {QUICK_PROMPTS.map(({ label, icon: Icon, prompt }) => (
            <button key={label}
              onClick={() => { setNlPrompt(prompt); handleNLGenerate(prompt); }}
              disabled={generating}
              className="flex-shrink-0 flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-white/4 border border-white/8 text-white/45 hover:text-purple-300 hover:border-purple-400/30 hover:bg-purple-400/8 transition-all disabled:opacity-40">
              <Icon className="w-3 h-3" /> {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Map Templates Panel ── */}
      <AnimatePresence>
        {showMapTemplates && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-b border-white/8 flex-shrink-0" style={{ background: 'rgba(255,204,2,0.04)' }}>
            <div className="px-5 py-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Map className="w-4 h-4 text-yellow-400" />
                  <span className="text-sm font-bold text-yellow-400">Geographic Map Templates</span>
                  <span className="text-xs text-white/30">— one-click regional visualizations</span>
                </div>
                <button onClick={() => setShowMapTemplates(false)} className="p-1 text-white/30 hover:text-white/60 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <VBMapTemplates columns={columns} onApply={handleApplyMapTemplate} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Main content: Chart + Insights side by side ── */}
      <div className="flex flex-1 overflow-hidden min-h-0">

        {/* Chart area */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          <div className="flex-1 overflow-y-auto p-5 space-y-4">

            {/* Chart type + meta bar */}
            {hasChart && (
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="font-semibold text-sm">{chartTitle || yField?.replace(/_/g, ' ') || 'Chart'}</div>
                  <div className="text-xs text-white/25 mt-0.5 flex items-center gap-1.5">
                    <span className="px-1.5 py-0.5 rounded-md bg-white/5 border border-white/8">{CHART_TYPE_LABELS[chartType] || chartType}</span>
                    {xField && <span className="text-white/20">X: {xField}</span>}
                    {yField && <><span className="text-white/15">·</span><span className="text-white/20">Y: {yField} ({aggFn})</span></>}
                    <span className="text-white/15">·</span>
                    <span className="text-white/20">{chartData.length} pts</span>
                  </div>
                </div>
                <button onClick={handleAutoRecommend}
                  className="flex items-center gap-1 text-xs text-white/20 hover:text-white/55 px-2 py-1 rounded-lg hover:bg-white/5 transition-all">
                  <RefreshCw className="w-3 h-3" /> Refresh
                </button>
              </div>
            )}

            {/* Chart card */}
            <div className="glass-card rounded-2xl p-4 border border-white/8 min-h-[300px] flex items-center justify-center">
              {!hasChart ? (
                <div className="flex flex-col items-center gap-3 text-white/20 py-8">
                  <div className="w-16 h-16 rounded-2xl bg-purple-400/8 border border-purple-400/15 flex items-center justify-center">
                    <Sparkles className="w-7 h-7 text-purple-400/50" />
                  </div>
                  <div className="text-sm text-center leading-relaxed max-w-xs">
                    <span className="text-white/40 font-medium">Ask AI to build your chart</span><br />
                    <span className="text-white/25 text-xs">Try: "Show sales by region on a map"</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-2 w-full max-w-xs">
                    {QUICK_PROMPTS.map(({ label, icon: Icon, prompt }) => (
                      <button key={label}
                        onClick={() => { setNlPrompt(prompt); handleNLGenerate(prompt); }}
                        className="flex items-center gap-1.5 p-2.5 rounded-xl bg-white/3 border border-white/8 hover:bg-white/6 hover:border-white/15 transition-all text-left">
                        <Icon className="w-3.5 h-3.5 text-purple-400/60 flex-shrink-0" />
                        <span className="text-xs text-white/40">{label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="w-full">
                  <VBChartPreview chartType={chartType} data={chartData} marks={marks} shelves={shelves} />
                </div>
              )}
            </div>

            {/* AI one-liner summary */}
            <AnimatePresence>
              {aiSummary && (
                <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="flex items-start gap-2.5 px-3.5 py-2.5 rounded-xl bg-purple-400/5 border border-purple-400/15">
                  <Sparkles className="w-3.5 h-3.5 text-purple-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-white/60 leading-relaxed">{aiSummary}</p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Insights Panel */}
            <InsightsPanel
              chartData={chartData}
              chartType={chartType}
              xField={xField}
              yField={yField}
              tableName={table?.name}
              columns={columns}
            />

            {/* Available columns */}
            {columns.length > 0 && (
              <div className="glass-card rounded-xl p-3 border border-white/5">
                <div className="text-xs text-white/20 uppercase tracking-widest mb-2">Dataset columns</div>
                <div className="flex flex-wrap gap-1">
                  {columns.map(c => (
                    <span key={c.name} title={`${c.name} [${c.type}]`}
                      className="text-xs px-2 py-0.5 rounded-full border text-white/30 cursor-default"
                      style={{
                        borderColor: (c.type === 'numeric' || c.isKpiCandidate) ? 'rgba(0,229,255,0.2)'
                          : (c.type === 'date' || c.isDateCandidate) ? 'rgba(74,222,128,0.2)'
                          : isGeoColumn(c.name) ? 'rgba(255,204,2,0.25)'
                          : 'rgba(255,255,255,0.07)',
                        background: isGeoColumn(c.name) ? 'rgba(255,204,2,0.04)' : 'transparent',
                      }}>
                      {c.name.replace(/_/g, ' ')}
                    </span>
                  ))}
                </div>
                <div className="flex items-center gap-3 mt-2 text-xs text-white/15">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full inline-block" style={{ background: 'rgba(0,229,255,0.4)' }} />Numeric</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full inline-block" style={{ background: 'rgba(74,222,128,0.4)' }} />Date</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full inline-block" style={{ background: 'rgba(255,204,2,0.4)' }} />Geographic</span>
                </div>
              </div>
            )}
          </div>

          {/* Bottom analysis panel */}
          <VBBottomPanel
            chartType={chartType}
            shelves={shelves}
            marks={marks}
            data={chartData}
            aggFn={aggFn}
            tableName={table?.name}
            rows={table?.rows}
          />
        </div>
      </div>
    </div>
  );
}