/**
 * VisualBuilder — AI-first chart builder
 * No Shelves / Marks / Tooltip panels. Just AI prompt + chart type selector + preview.
 */
import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWorkspaceStore } from '@/lib/store';
import { base44 } from '@/api/base44Client';
import {
  Sparkles, Save, CheckCircle2, Loader2, Database, ArrowRight,
  Wand2, LayoutPanelLeft, RefreshCw, ChevronRight
} from 'lucide-react';

import VBShowMeGallery, { recommendChartType } from '@/components/visualbuilder/VBShowMeGallery.jsx';
import VBChartPreview, { buildChartData, fmtV } from '@/components/visualbuilder/VBChartPreview.jsx';
import VBBottomPanel from '@/components/visualbuilder/VBBottomPanel.jsx';

const DEFAULT_MARKS = { color: '#00e5ff', opacity: 85, strokeWidth: 2, borderRadius: 4, sort: 'Desc', showGrid: true };

const GEO_KEYWORDS = ['country', 'countries', 'nation', 'state', 'region', 'city', 'location', 'place', 'geo', 'lat', 'lon', 'latitude', 'longitude', 'zip', 'continent', 'province', 'territory'];

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

const QUICK_PROMPTS = [
  'Show top 10 by value as bar chart',
  'Trend over time as line chart',
  'Revenue by country on a map',
  'Distribution as histogram',
  'Part-to-whole as donut chart',
  'Forecast next periods',
  'Scatter plot to find correlations',
  'Stacked area chart by category',
];

export default function VisualBuilder() {
  const { getActiveTable, saveToDashboard, setActiveSection } = useWorkspaceStore();
  const table = getActiveTable();
  const columns = useMemo(() => buildColumnsArray(table), [table]);

  const [chartType, setChartType] = useState('bar');
  const [shelves, setShelves] = useState({ x: [], y: [], color: [], size: [], detail: [], filter: [], date: [], group: [] });
  const [aggFn, setAggFn] = useState('SUM');
  const [marks] = useState(DEFAULT_MARKS);
  const [chartTitle, setChartTitle] = useState('');
  const [nlPrompt, setNlPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [saved, setSaved] = useState(false);
  const [aiInsight, setAiInsight] = useState('');
  const [showGallery, setShowGallery] = useState(false);

  const chartData = useMemo(() => {
    if (!table?.rows) return [];
    return buildChartData(table.rows, shelves, aggFn, chartType, marks);
  }, [table, shelves, aggFn, chartType, marks]);

  const handleNLGenerate = useCallback(async (promptOverride) => {
    const prompt = (promptOverride || nlPrompt).trim();
    if (!prompt || !table) return;
    setGenerating(true);
    setAiInsight('');
    try {
      const colContext = columns.slice(0, 40).map(c => {
        const vals = table.rows?.slice(0, 5).map(r => r[c.name]).filter(v => v != null).slice(0, 3);
        return `${c.name} [${c.type}] (e.g. ${vals?.join(', ') || 'N/A'})`;
      }).join('\n');

      const sampleRows = JSON.stringify(table.rows?.slice(0, 3) || [], null, 0).slice(0, 600);

      // Detect geo columns for smarter map routing
      const geoCols = columns.filter(c => isGeoColumn(c.name));
      const numCols = columns.filter(c => c.type === 'numeric' || c.isKpiCandidate);
      const dateCols = columns.filter(c => c.type === 'date' || c.isDateCandidate);

      const result = await base44.integrations.Core.InvokeLLM({
        model: 'claude_sonnet_4_6',
        prompt: `You are a world-class Senior Data Analyst. Your job: pick the PERFECT chart configuration for this request.

USER REQUEST: "${prompt}"

DATASET: "${table.name}" (${table.rowCount || table.rows?.length} rows)

COLUMNS (name [type] sample values):
${colContext}

SAMPLE ROWS: ${sampleRows}

GEOGRAPHIC COLUMNS DETECTED: ${geoCols.map(c => c.name).join(', ') || 'none'}
DATE COLUMNS DETECTED: ${dateCols.map(c => c.name).join(', ') || 'none'}
NUMERIC COLUMNS DETECTED: ${numCols.map(c => c.name).join(', ') || 'none'}

CHART SELECTION RULES:
- Time-series / trend → line, area, forecast_line
- Comparison by category → bar, bar_horizontal
- Part-to-whole → donut, treemap, pie
- Geographic / location / country / state / city → choropleth_map or symbol_map (MUST use geo column for x_field)
- Correlation → scatter, bubble
- Distribution → histogram, box_plot
- KPI single number → metric_card
- Flow/stages → funnel, sankey
- Multi-metric profile → radar
- Two measures → dual_axis

CRITICAL RULES:
1. x_field and y_field MUST be exact column names from the list above
2. For map charts: x_field MUST be the geographic column (country/state/city name column), NOT a numeric column
3. For map charts: y_field MUST be the numeric measure to plot
4. Choose the most meaningful columns — do NOT pick ID columns for y_field
5. If user mentions "map", "geography", "country", "state", "region" → use choropleth_map or symbol_map
6. aggregation: SUM for totals/revenue, AVG for rates/scores, COUNT for records, MAX for peaks

AVAILABLE CHART TYPES: bar, bar_horizontal, bar_stacked, bar_grouped, line, area, area_stacked, scatter, bubble, histogram, donut, pie, treemap, box_plot, waterfall, heatmap, highlight_table, text_table, funnel, metric_card, gauge, radar, forecast_line, dual_axis, candlestick, sankey, packed_bubble, sunburst, choropleth_map, symbol_map, heat_map_geo, gantt, step_line

Respond ONLY with valid JSON, no other text:`,
        response_json_schema: {
          type: 'object',
          properties: {
            chart_type: { type: 'string' },
            x_field: { type: 'string' },
            y_field: { type: 'string' },
            y2_field: { type: 'string' },
            aggregation: { type: 'string' },
            title: { type: 'string' },
            color: { type: 'string' },
            insight: { type: 'string' },
            sort: { type: 'string' },
            reasoning: { type: 'string' },
          },
          required: ['chart_type', 'y_field', 'aggregation', 'title', 'insight'],
        },
      });

      if (result?.chart_type) setChartType(result.chart_type);
      if (result?.aggregation) setAggFn(result.aggregation);
      if (result?.title) setChartTitle(result.title);
      if (result?.insight) setAiInsight(result.insight);

      if (result?.y_field) {
        const xCol = columns.find(c => c.name === result.x_field);
        const yCol = columns.find(c => c.name === result.y_field);
        const y2Col = result.y2_field ? columns.find(c => c.name === result.y2_field) : null;

        const newShelves = { ...shelves, x: [], y: [], color: [] };
        if (xCol) newShelves.x = [{ name: xCol.name, agg: 'ATTR', type: xCol.type }];
        if (yCol) newShelves.y = [{ name: yCol.name, agg: result.aggregation || 'SUM', type: yCol.type }];
        if (y2Col) newShelves.y = [...newShelves.y, { name: y2Col.name, agg: result.aggregation || 'SUM', type: y2Col.type }];
        setShelves(newShelves);
      }
    } catch (e) {
      console.error(e);
      setAiInsight('Could not generate chart. Try rephrasing your request.');
    }
    setGenerating(false);
  }, [nlPrompt, table, columns, shelves]);

  const handleAutoRecommend = useCallback(() => {
    const rec = recommendChartType(columns);
    setChartType(rec);
    const numCols = columns.filter(c => c.type === 'numeric' || c.isKpiCandidate);
    const catCols = columns.filter(c => c.type === 'category' || c.isSegmentCandidate);
    const dateCols = columns.filter(c => c.type === 'date' || c.isDateCandidate);
    const geoCols = columns.filter(c => isGeoColumn(c.name));
    const newShelves = { ...shelves };
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
  }, [columns, shelves]);

  const handleSave = useCallback(() => {
    if (!chartData.length) return;
    const title = chartTitle || (shelves.y[0]?.name?.replace(/_/g, ' ') || 'Chart');
    saveToDashboard({
      label: title,
      datasetName: table?.name,
      chart: {
        type: chartType,
        title,
        data: chartData,
        x_key: 'name',
        y_key: chartType === 'scatter' ? 'y' : 'value',
        color_theme: marks.color,
      },
      insight: aiInsight,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }, [chartData, chartTitle, shelves, table, chartType, marks, aiInsight, saveToDashboard]);

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

  const xField = shelves.x[0]?.name;
  const yField = shelves.y[0]?.name;

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/8 flex-shrink-0">
        <div className="flex items-center gap-2">
          <LayoutPanelLeft className="w-4 h-4 text-cyan-400" />
          <span className="font-bold text-sm">Visual Builder</span>
          <span className="text-xs text-white/30 ml-1">· {table.name} · {(table.rowCount || table.rows?.length)?.toLocaleString()} rows</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleAutoRecommend}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-xl bg-white/5 border border-white/10 text-white/40 hover:text-white/70 hover:border-white/20 transition-all">
            <Wand2 className="w-3.5 h-3.5" /> Auto Recommend
          </button>
          <input value={chartTitle} onChange={e => setChartTitle(e.target.value)} placeholder="Chart title…"
            className="w-44 px-3 py-1.5 bg-white/5 border border-white/10 rounded-xl text-xs focus:outline-none focus:border-cyan-400/30 text-foreground" />
          <button onClick={handleSave} disabled={!chartData.length}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold transition-all disabled:opacity-40 ${saved ? 'bg-green-400/15 border border-green-400/25 text-green-400' : 'bg-cyan-400 hover:bg-cyan-300'}`}
            style={!saved ? { color: 'hsl(222,47%,6%)' } : {}}>
            {saved ? <><CheckCircle2 className="w-3 h-3" /> Saved!</> : <><Save className="w-3 h-3" /> Save to Dashboard</>}
          </button>
        </div>
      </div>

      {/* AI Generator — hero bar */}
      <div className="border-b border-white/5 flex-shrink-0" style={{ background: 'rgba(168,85,247,0.06)' }}>
        <div className="px-5 py-3 flex items-center gap-3">
          <Sparkles className="w-4 h-4 text-purple-400 flex-shrink-0" />
          <input
            value={nlPrompt}
            onChange={e => setNlPrompt(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleNLGenerate()}
            placeholder='Describe what you want to see — e.g. "Revenue by country on a map" or "Top 10 products by sales"'
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-white/30 focus:outline-none"
          />
          <button onClick={() => handleNLGenerate()} disabled={generating || !nlPrompt.trim()}
            className="flex items-center gap-2 px-4 py-2 bg-purple-400/20 border border-purple-400/30 text-purple-300 rounded-xl text-sm font-bold hover:bg-purple-400/30 transition-all disabled:opacity-40">
            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {generating ? 'Generating…' : 'Generate Chart'}
          </button>
        </div>

        {/* Quick prompts */}
        {!generating && (
          <div className="flex gap-1.5 px-5 pb-2.5 overflow-x-auto">
            {QUICK_PROMPTS.map(q => (
              <button key={q}
                onClick={() => { setNlPrompt(q); handleNLGenerate(q); }}
                className="flex-shrink-0 text-xs px-2.5 py-1 rounded-full bg-white/4 border border-white/8 text-white/40 hover:text-purple-400 hover:border-purple-400/30 hover:bg-purple-400/5 transition-all whitespace-nowrap">
                {q}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Main layout: Gallery LEFT + Chart RIGHT */}
      <div className="flex flex-1 overflow-hidden min-h-0">
        {/* Chart Type Gallery — compact left panel */}
        <div className="w-40 flex-shrink-0 border-r border-white/8 overflow-y-auto">
          <VBShowMeGallery selected={chartType} onChange={setChartType} />
        </div>

        {/* Chart Preview — takes all remaining space */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {/* Chart header */}
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="font-semibold text-sm">{chartTitle || yField?.replace(/_/g, ' ') || 'Chart Preview'}</div>
                <div className="text-xs text-white/25 mt-0.5">
                  {chartType.replace(/_/g, ' ')}
                  {xField && ` · X: ${xField}`}
                  {yField && ` · Y: ${yField} (${aggFn})`}
                  {chartData.length > 0 && ` · ${chartData.length} points`}
                </div>
              </div>
              {chartData.length > 0 && (
                <button onClick={handleAutoRecommend}
                  className="flex items-center gap-1 text-xs text-white/25 hover:text-white/60 px-2 py-1 rounded-lg hover:bg-white/5 transition-all">
                  <RefreshCw className="w-3 h-3" /> Re-recommend
                </button>
              )}
            </div>

            {/* Chart */}
            <div className="glass-card rounded-2xl p-4 border border-white/8">
              {!xField && !yField ? (
                <div className="flex flex-col items-center justify-center h-52 gap-3 text-white/20">
                  <Sparkles className="w-8 h-8 text-purple-400/40" />
                  <div className="text-sm text-center leading-relaxed">
                    Use the AI generator above to create your chart<br />
                    <span className="text-purple-400/60">Try: "Show top 10 products by revenue as bar chart"</span>
                  </div>
                </div>
              ) : (
                <VBChartPreview chartType={chartType} data={chartData} marks={marks} shelves={shelves} />
              )}
            </div>

            {/* AI Insight */}
            <AnimatePresence>
              {aiInsight && (
                <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="flex items-start gap-2.5 p-3 rounded-xl bg-purple-400/5 border border-purple-400/15">
                  <Sparkles className="w-3.5 h-3.5 text-purple-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-white/65 leading-relaxed italic">{aiInsight}</p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Top values summary */}
            {chartData.length > 0 && !['scatter', 'box_plot', 'text_table', 'pivot', 'metric_card', 'gauge', 'choropleth_map', 'symbol_map', 'heat_map_geo'].includes(chartType) && (
              <div className="glass-card rounded-xl p-3 border border-white/6">
                <div className="text-xs font-semibold text-white/30 uppercase tracking-widest mb-2">Top Values</div>
                <div className="space-y-1.5">
                  {chartData.slice(0, 5).map((d, i) => {
                    const max = chartData[0]?.value || 1;
                    return (
                      <div key={d.name || i} className="flex items-center gap-2 text-xs">
                        <span className="w-3 text-white/20 font-mono">{i + 1}</span>
                        <span className="flex-1 text-white/55 truncate">{d.name}</span>
                        <div className="w-16 h-1 bg-white/5 rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${(d.value / max) * 100}%`, background: marks.color, opacity: 0.6 }} />
                        </div>
                        <span className="font-mono text-white/45 w-14 text-right">{fmtV(d.value)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Dataset columns preview */}
            {columns.length > 0 && (
              <div className="glass-card rounded-xl p-3 border border-white/6">
                <div className="text-xs font-semibold text-white/25 uppercase tracking-widest mb-2">Available Columns</div>
                <div className="flex flex-wrap gap-1.5">
                  {columns.map(c => (
                    <span key={c.name} className="text-xs px-2 py-0.5 rounded-full border border-white/8 text-white/35"
                      style={{ borderColor: c.type === 'numeric' || c.isKpiCandidate ? 'rgba(0,229,255,0.2)' : c.type === 'date' ? 'rgba(74,222,128,0.2)' : 'rgba(255,255,255,0.08)' }}>
                      {c.name.replace(/_/g, ' ')}
                    </span>
                  ))}
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