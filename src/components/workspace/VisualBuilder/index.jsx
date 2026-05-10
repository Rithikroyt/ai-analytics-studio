/**
 * VisualBuilder — Tableau-inspired BI chart builder
 * Left: Show Me Gallery | Center: Marks + Shelves + Tooltip | Right: Preview | Bottom: Explain/SQL/Data
 */
import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWorkspaceStore } from '@/lib/store';
import { base44 } from '@/api/base44Client';
import { Sparkles, Save, CheckCircle2, Loader2, Database, ArrowRight, Wand2, LayoutPanelLeft } from 'lucide-react';

import VBShowMeGallery, { recommendChartType } from '@/components/visualbuilder/VBShowMeGallery.jsx';
import VBFieldShelves from '@/components/visualbuilder/VBFieldShelves.jsx';
import VBMarksCard from '@/components/visualbuilder/VBMarksCard.jsx';
import VBTooltipBuilder from '@/components/visualbuilder/VBTooltipBuilder.jsx';
import VBChartPreview, { buildChartData, fmtV } from '@/components/visualbuilder/VBChartPreview.jsx';
import VBBottomPanel from '@/components/visualbuilder/VBBottomPanel.jsx';

const CENTER_TABS = [
  { id: 'shelves', label: 'Shelves' },
  { id: 'marks', label: 'Marks' },
  { id: 'tooltip', label: 'Tooltip' },
];

const DEFAULT_MARKS = { markType: 'Automatic', color: '#00e5ff', size: 4, opacity: 85, showLabel: false, stacked: false, sort: 'Desc', shape: '●' };
const DEFAULT_TOOLTIP = { enabled: true, template: '', fields: [], show_ai_insight: false, show_anomaly_flag: false, show_sql_source: false };

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

export default function VisualBuilder() {
  const { getActiveTable, saveToDashboard, setActiveSection } = useWorkspaceStore();
  const table = getActiveTable();
  const columns = useMemo(() => buildColumnsArray(table), [table]);

  const [chartType, setChartType] = useState('bar');
  const [shelves, setShelves] = useState({ x: [], y: [], color: [], size: [], detail: [], filter: [], date: [], group: [] });
  const [aggFn, setAggFn] = useState('SUM');
  const [marks, setMarks] = useState(DEFAULT_MARKS);
  const [tooltip, setTooltip] = useState(DEFAULT_TOOLTIP);
  const [chartTitle, setChartTitle] = useState('');
  const [nlPrompt, setNlPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [saved, setSaved] = useState(false);
  const [aiInsight, setAiInsight] = useState('');
  const [centerTab, setCenterTab] = useState('shelves');

  const chartData = useMemo(() => {
    if (!table?.rows) return [];
    return buildChartData(table.rows, shelves, aggFn, chartType, marks);
  }, [table, shelves, aggFn, chartType, marks]);

  const addToShelf = useCallback((shelfId, colName, cols) => {
    const col = cols.find(c => c.name === colName);
    if (!col) return;
    const isNumeric = col.type === 'numeric' || col.isKpiCandidate;
    const entry = { name: col.name, agg: isNumeric ? aggFn : 'ATTR', type: col.type };
    setShelves(prev => ({ ...prev, [shelfId]: [...(prev[shelfId] || []), entry] }));
    if (shelfId === 'y' && !chartTitle) setChartTitle(col.name.replace(/_/g, ' '));
  }, [aggFn, chartTitle]);

  const removeFromShelf = useCallback((shelfId, colName) => {
    setShelves(prev => ({ ...prev, [shelfId]: (prev[shelfId] || []).filter(f => f.name !== colName) }));
  }, []);

  const updateShelfAgg = useCallback((shelfId, colName, agg) => {
    setShelves(prev => ({ ...prev, [shelfId]: (prev[shelfId] || []).map(f => f.name === colName ? { ...f, agg } : f) }));
  }, []);

  const handleNLGenerate = async () => {
    if (!nlPrompt.trim() || !table) return;
    setGenerating(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a chart builder AI. Given a dataset and user request, configure the chart.

User request: "${nlPrompt}"
Dataset: ${table.name}
Columns: ${columns.slice(0, 30).map(c => `${c.name}(${c.type})`).join(', ')}

Return JSON only:
{
  "chart_type": "bar|bar_horizontal|bar_stacked|line|area|scatter|histogram|donut|pie|treemap|box_plot|waterfall|heatmap|highlight_table|text_table|funnel|metric_card",
  "x_field": "column name or null",
  "y_field": "column name",
  "aggregation": "SUM|AVG|COUNT|MIN|MAX",
  "title": "short chart title",
  "color": "#hexcolor",
  "insight": "one sentence insight"
}`,
        response_json_schema: {
          type: 'object',
          properties: {
            chart_type: { type: 'string' },
            x_field: { type: ['string', 'null'] },
            y_field: { type: 'string' },
            aggregation: { type: 'string' },
            title: { type: 'string' },
            color: { type: 'string' },
            insight: { type: 'string' },
          },
        },
      });
      if (result?.chart_type) setChartType(result.chart_type);
      if (result?.y_field) {
        const newShelves = { ...shelves };
        if (result.x_field) newShelves.x = [{ name: result.x_field, agg: 'ATTR', type: 'category' }];
        newShelves.y = [{ name: result.y_field, agg: result.aggregation || 'SUM', type: 'numeric' }];
        setShelves(newShelves);
      }
      if (result?.aggregation) setAggFn(result.aggregation);
      if (result?.title) setChartTitle(result.title);
      if (result?.color) setMarks(m => ({ ...m, color: result.color }));
      if (result?.insight) setAiInsight(result.insight);
    } catch (e) { console.error(e); }
    setGenerating(false);
  };

  const handleAutoRecommend = () => {
    const rec = recommendChartType(columns);
    setChartType(rec);
    const numCols = columns.filter(c => c.type === 'numeric' || c.isKpiCandidate);
    const catCols = columns.filter(c => c.type === 'category' || c.isSegmentCandidate);
    const dateCols = columns.filter(c => c.type === 'date' || c.isDateCandidate);
    const newShelves = { ...shelves };
    if (dateCols.length) newShelves.x = [{ name: dateCols[0].name, agg: 'ATTR', type: 'date' }];
    else if (catCols.length) newShelves.x = [{ name: catCols[0].name, agg: 'ATTR', type: 'category' }];
    if (numCols.length) newShelves.y = [{ name: numCols[0].name, agg: 'SUM', type: 'numeric' }];
    setShelves(newShelves);
  };

  const handleSave = () => {
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
    <div className="flex h-full flex-col overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/8 flex-shrink-0">
        <div className="flex items-center gap-2">
          <LayoutPanelLeft className="w-4 h-4 text-cyan-400" />
          <span className="font-bold text-sm">Visual Builder</span>
          <span className="text-xs text-white/30 ml-1">· {table.name} · {table.rowCount?.toLocaleString()} rows</span>
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

      {/* AI Chart Generator bar */}
      <div className="px-5 py-2.5 border-b border-white/5 flex-shrink-0 bg-purple-400/3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
          <input value={nlPrompt} onChange={e => setNlPrompt(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleNLGenerate()}
            placeholder='AI Chart Generator — e.g. "Show monthly revenue trend by region"'
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-white/25 focus:outline-none" />
          <button onClick={handleNLGenerate} disabled={generating || !nlPrompt.trim()}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-400/15 border border-purple-400/25 text-purple-400 rounded-xl text-xs font-semibold hover:bg-purple-400/20 transition-all disabled:opacity-40">
            {generating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
            {generating ? 'Building…' : 'Build'}
          </button>
        </div>
      </div>

      {/* Main 3-panel layout */}
      <div className="flex flex-1 overflow-hidden min-h-0">
        {/* LEFT: Show Me Gallery */}
        <div className="w-44 flex-shrink-0 border-r border-white/8 overflow-y-auto">
          <VBShowMeGallery selected={chartType} onChange={setChartType} />
        </div>

        {/* CENTER: Marks / Shelves / Tooltip */}
        <div className="w-56 flex-shrink-0 border-r border-white/8 flex flex-col overflow-hidden">
          <div className="flex border-b border-white/8 flex-shrink-0">
            {CENTER_TABS.map(t => (
              <button key={t.id} onClick={() => setCenterTab(t.id)}
                className={`flex-1 py-2 text-xs font-medium transition-all border-b-2 ${centerTab === t.id ? 'text-cyan-400 border-cyan-400' : 'text-white/30 border-transparent hover:text-white/60'}`}>
                {t.label}
              </button>
            ))}
          </div>
          <div className="flex-1 overflow-y-auto">
            {centerTab === 'marks' && <VBMarksCard marks={marks} onChange={setMarks} />}
            {centerTab === 'shelves' && (
              <VBFieldShelves shelves={shelves} columns={columns}
                onAdd={addToShelf} onRemove={removeFromShelf} onAggChange={updateShelfAgg}
                aggregation={aggFn} onAggFnChange={setAggFn} />
            )}
            {centerTab === 'tooltip' && <VBTooltipBuilder tooltip={tooltip} columns={columns} onChange={setTooltip} />}
          </div>
        </div>

        {/* RIGHT: Chart Preview */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="font-semibold text-sm">{chartTitle || shelves.y[0]?.name?.replace(/_/g, ' ') || 'Chart Preview'}</div>
                <div className="text-xs text-white/25 mt-0.5">
                  {chartType.replace(/_/g, ' ')} · {chartData.length} points · {aggFn}
                  {shelves.x[0] && ` · X: ${shelves.x[0].name}`}
                  {shelves.y[0] && ` · Y: ${shelves.y[0].name}`}
                </div>
              </div>
            </div>

            <div className="glass-card rounded-2xl p-4 border border-white/8">
              <VBChartPreview chartType={chartType} data={chartData} marks={marks} shelves={shelves} />
            </div>

            <AnimatePresence>
              {aiInsight && (
                <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="flex items-start gap-2.5 p-3 rounded-xl bg-purple-400/5 border border-purple-400/15">
                  <Sparkles className="w-3.5 h-3.5 text-purple-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-white/60 leading-relaxed italic">{aiInsight}</p>
                </motion.div>
              )}
            </AnimatePresence>

            {chartData.length > 0 && !['scatter', 'box_plot', 'text_table', 'pivot', 'metric_card', 'gauge'].includes(chartType) && (
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
                          <div className="h-full rounded-full" style={{ width: `${(d.value / max) * 100}%`, background: marks.color || '#00e5ff', opacity: 0.6 }} />
                        </div>
                        <span className="font-mono text-white/45 w-14 text-right">{fmtV(d.value)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

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