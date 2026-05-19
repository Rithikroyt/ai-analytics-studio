/**
 * ChartSpecEditor — Phase 6: Vega-Lite-style declarative chart spec builder
 * Tableau-style shelves: Columns, Rows, Marks, Color, Size, Label, Tooltip, Filters
 * Stores every chart as a JSON spec
 */
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useWorkspaceStore } from '@/lib/store';
import {
  BarChart2, TrendingUp, Circle, Hash, Type, Filter, Palette,
  Tag, Eye, Save, X, ChevronDown, Maximize2, RefreshCw, Loader2,
  CheckCircle2, Info, Lightbulb, Code2, Brain, AlertTriangle, Zap
} from 'lucide-react';
import { BarChart, Bar, LineChart, Line, AreaChart, Area, ScatterChart, Scatter,
  XAxis, YAxis, Tooltip as RTooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';

const MARK_TYPES = [
  { id: 'bar', label: 'Bar', icon: BarChart2 },
  { id: 'line', label: 'Line', icon: TrendingUp },
  { id: 'area', label: 'Area', icon: TrendingUp },
  { id: 'scatter', label: 'Scatter', icon: Circle },
  { id: 'pie', label: 'Pie', icon: Circle },
];

const AGG_TYPES = ['SUM', 'AVG', 'COUNT', 'MIN', 'MAX', 'NONE'];
const COLORS = ['#00e5ff', '#a855f7', '#4ade80', '#f59e0b', '#f87171', '#60a5fa', '#fb923c', '#e879f9'];

function ShelfItem({ label, field, agg, onRemove, color = '#00e5ff' }) {
  return (
    <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg border text-xs font-mono" style={{ borderColor: `${color}30`, background: `${color}10`, color }}>
      {agg && agg !== 'NONE' && <span className="text-white/40">{agg}(</span>}
      <span>{field}</span>
      {agg && agg !== 'NONE' && <span className="text-white/40">)</span>}
      <button onClick={onRemove} className="ml-1 opacity-50 hover:opacity-100"><X className="w-2.5 h-2.5" /></button>
    </div>
  );
}

function Shelf({ label, icon: ShelfIcon, items, onAdd, onRemove, color, columns, aggEnabled = true }) {
  const Icon = ShelfIcon;
  const [open, setOpen] = useState(false);
  const [sel, setSel] = useState('');
  const [agg, setAgg] = useState('SUM');

  const add = () => {
    if (!sel) return;
    onAdd({ field: sel, agg: aggEnabled ? agg : 'NONE' });
    setSel(''); setOpen(false);
  };

  return (
    <div className="relative">
      <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-xl border border-white/8 bg-white/3 min-h-9">
        <Icon className="w-3 h-3 flex-shrink-0" style={{ color }} />
        <span className="text-xs text-white/30 flex-shrink-0 w-16">{label}</span>
        <div className="flex flex-wrap gap-1 flex-1">
          {items.map((it, i) => <ShelfItem key={i} {...it} color={color} onRemove={() => onRemove(i)} />)}
          <button onClick={() => setOpen(v => !v)} className="text-xs text-white/20 hover:text-white/50 px-1.5 py-0.5 rounded border border-white/8 hover:border-white/15 transition-all">+</button>
        </div>
      </div>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
            className="absolute top-full left-16 z-30 mt-1 p-2 rounded-xl border border-white/10 bg-background shadow-2xl min-w-48 space-y-1.5">
            <select value={sel} onChange={e => setSel(e.target.value)} className="w-full px-2 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs focus:outline-none">
              <option value="">Select field…</option>
              {columns.map(c => <option key={c.name} value={c.name}>{c.name} ({c.type})</option>)}
            </select>
            {aggEnabled && (
              <select value={agg} onChange={e => setAgg(e.target.value)} className="w-full px-2 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs focus:outline-none">
                {AGG_TYPES.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            )}
            <div className="flex gap-1">
              <button onClick={add} className="flex-1 py-1 bg-cyan-400/15 border border-cyan-400/20 text-cyan-400 rounded-lg text-xs hover:bg-cyan-400/20 transition-all">Add</button>
              <button onClick={() => setOpen(false)} className="px-2 py-1 text-white/30 border border-white/8 rounded-lg text-xs">✕</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ChartPreview({ spec, rows }) {
  if (!spec.x || !rows?.length) return (
    <div className="flex items-center justify-center h-full text-sm text-white/25">Configure X and Y axes to preview chart</div>
  );

  const aggFn = (vals, type) => {
    if (type === 'AVG') return vals.reduce((a, b) => a + b, 0) / Math.max(vals.length, 1);
    if (type === 'COUNT') return vals.length;
    if (type === 'MIN') return Math.min(...vals);
    if (type === 'MAX') return Math.max(...vals);
    return vals.reduce((a, b) => a + b, 0); // SUM default
  };

  const groups = {};
  for (const row of rows) {
    const key = String(row[spec.x] ?? 'Unknown');
    if (!groups[key]) groups[key] = [];
    groups[key].push(row);
  }
  const chartData = Object.entries(groups).map(([key, grp]) => {
    const entry = { name: key };
    if (spec.y) {
      const vals = grp.map(r => Number(r[spec.y]) || 0);
      entry.value = Math.round(aggFn(vals, spec.yAgg || 'SUM') * 100) / 100;
    }
    if (spec.color) entry.colorVal = grp[0][spec.color];
    return entry;
  }).sort((a, b) => (b.value || 0) - (a.value || 0)).slice(0, 20);

  const mark = spec.mark || 'bar';
  const stroke = COLORS[0];

  return (
    <ResponsiveContainer width="100%" height="100%">
      {mark === 'line' ? (
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
          <XAxis dataKey="name" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} />
          <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} />
          <RTooltip contentStyle={{ background: 'hsl(222,44%,9%)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12 }} />
          <Line type="monotone" dataKey="value" stroke={stroke} strokeWidth={2} dot={{ r: 3, fill: stroke }} name={spec.y} />
        </LineChart>
      ) : mark === 'area' ? (
        <AreaChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
          <XAxis dataKey="name" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} />
          <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} />
          <RTooltip contentStyle={{ background: 'hsl(222,44%,9%)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12 }} />
          <Area type="monotone" dataKey="value" stroke={stroke} fill={`${stroke}20`} strokeWidth={2} name={spec.y} />
        </AreaChart>
      ) : (
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
          <XAxis dataKey="name" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} />
          <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} />
          <RTooltip contentStyle={{ background: 'hsl(222,44%,9%)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12 }} />
          <Bar dataKey="value" name={spec.y} radius={[4, 4, 0, 0]}>
            {chartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
          </Bar>
        </BarChart>
      )}
    </ResponsiveContainer>
  );
}

export default function ChartSpecEditor({ onSave, onClose }) {
  const { getActiveTable } = useWorkspaceStore();
  const table = getActiveTable();
  const columns = table?.columns || [];
  const rows = table?.rows || [];

  const [spec, setSpec] = useState({
    title: '', mark: 'bar',
    x: null, xAgg: 'NONE',
    y: null, yAgg: 'SUM',
    color: null, size: null, label: null,
    filters: [], tooltipFields: [],
    insight: '', businessMeaning: '', recommendedAction: '',
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeShelf, setActiveShelf] = useState(null);
  const [explaining, setExplaining] = useState(false);
  const [explanation, setExplanation] = useState(null);
  const [showSQL, setShowSQL] = useState(false);

  const buildViewSQL = () => {
    if (!spec.x) return '-- Configure X axis to generate SQL';
    const tableName = table?.name || 'dataset';
    const xAggPart = spec.xAgg && spec.xAgg !== 'NONE' ? `${spec.xAgg}(${spec.x})` : spec.x;
    const yPart = spec.y ? (spec.yAgg && spec.yAgg !== 'NONE' ? `, ${spec.yAgg}(${spec.y}) AS ${spec.y}_${spec.yAgg.toLowerCase()}` : `, ${spec.y}`) : '';
    const colorPart = spec.color && spec.color !== spec.x ? `, ${spec.color}` : '';
    const tooltipParts = spec.tooltipFields.filter(f => f !== spec.x && f !== spec.y && f !== spec.color).map(f => `, ${f}`).join('');
    const groupBy = spec.y && spec.yAgg && spec.yAgg !== 'NONE' ? `\nGROUP BY ${spec.x}${colorPart}` : '';
    const orderBy = spec.y ? `\nORDER BY ${spec.y}${spec.yAgg && spec.yAgg !== 'NONE' ? '_' + spec.yAgg.toLowerCase() : ''} DESC` : '';
    return `SELECT ${xAggPart}${yPart}${colorPart}${tooltipParts}\nFROM ${tableName}${groupBy}${orderBy}\nLIMIT 50;`;
  };

  const handleExplainChart = async () => {
    if (!spec.x || !rows.length || !spec.title) return;
    setExplaining(true);
    setExplanation(null);
    try {
      // Build chart data for explanation
      const groups = {};
      for (const row of rows) {
        const key = String(row[spec.x] ?? 'Unknown');
        if (!groups[key]) groups[key] = [];
        groups[key].push(row);
      }
      const chartData = Object.entries(groups).map(([key, grp]) => {
        const entry = { name: key };
        if (spec.y) {
          const vals = grp.map(r => Number(r[spec.y]) || 0);
          const agg = spec.yAgg || 'SUM';
          entry.value = agg === 'AVG' ? vals.reduce((a, b) => a + b, 0) / Math.max(vals.length, 1) :
            agg === 'COUNT' ? vals.length : agg === 'MIN' ? Math.min(...vals) :
            agg === 'MAX' ? Math.max(...vals) : vals.reduce((a, b) => a + b, 0);
        }
        return entry;
      }).slice(0, 30);

      const res = await base44.functions.invoke('explainChart', {
        title: spec.title,
        type: spec.mark,
        xLabel: spec.x,
        yLabel: spec.y,
        data: chartData,
        xKey: 'name',
        yKey: 'value',
        tableName: table?.name,
      });
      setExplanation(res.data?.explanation);
      if (res.data?.explanation?.businessMeaning) {
        setSpec(s => ({ ...s, businessMeaning: res.data.explanation.businessMeaning }));
      }
      if (res.data?.explanation?.recommendedNextStep) {
        setSpec(s => ({ ...s, recommendedAction: res.data.explanation.recommendedNextStep }));
      }
      if (res.data?.explanation?.topInsight) {
        setSpec(s => ({ ...s, insight: res.data.explanation.topInsight }));
      }
    } catch (e) {}
    setExplaining(false);
  };

  const update = (key, val) => setSpec(s => ({ ...s, [key]: val }));

  const handleSave = async () => {
    if (!spec.title || !spec.x) return;
    setSaving(true);
    const chartSpec = {
      title: spec.title,
      mark: spec.mark,
      encoding: {
        x: spec.x ? { field: spec.x, aggregate: spec.xAgg } : null,
        y: spec.y ? { field: spec.y, aggregate: spec.yAgg } : null,
        color: spec.color ? { field: spec.color } : null,
        size: spec.size ? { field: spec.size } : null,
        label: spec.label ? { field: spec.label } : null,
        tooltip: spec.tooltipFields.map(f => ({ field: f })),
      },
      filters: spec.filters,
      metadata: {
        insight: spec.insight,
        businessMeaning: spec.businessMeaning,
        recommendedAction: spec.recommendedAction,
        tableName: table?.name || '',
        savedAt: new Date().toISOString(),
      },
    };
    try {
      if (onSave) await onSave(chartSpec);
    } catch (e) {}
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/8 flex-shrink-0">
        <div className="flex items-center gap-2">
          <BarChart2 className="w-4 h-4 text-cyan-400" />
          <span className="font-bold text-sm">Chart Builder</span>
          <span className="text-xs text-white/30">Vega-Lite-style declarative specs</span>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowSQL(v => !v)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${showSQL ? 'bg-green-400/15 border-green-400/25 text-green-400' : 'bg-white/5 border-white/10 text-white/40 hover:text-white/60'}`}>
            <Code2 className="w-3 h-3" /> View SQL
          </button>
          <button onClick={handleExplainChart} disabled={explaining || !spec.x || !spec.title}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-400/15 border border-purple-400/25 text-purple-400 rounded-xl text-xs font-semibold hover:bg-purple-400/20 transition-all disabled:opacity-40">
            {explaining ? <Loader2 className="w-3 h-3 animate-spin" /> : <Brain className="w-3 h-3" />}
            Explain Chart
          </button>
          <button onClick={handleSave} disabled={saving || !spec.title}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-400/15 border border-cyan-400/25 text-cyan-400 rounded-xl text-xs font-semibold hover:bg-cyan-400/20 transition-all disabled:opacity-40">
            {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : saved ? <CheckCircle2 className="w-3 h-3" /> : <Save className="w-3 h-3" />}
            {saved ? 'Saved!' : 'Save Chart'}
          </button>
          {onClose && <button onClick={onClose} className="p-1.5 text-white/30 hover:text-white/70 rounded-lg hover:bg-white/5 transition-all"><X className="w-4 h-4" /></button>}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Shelves panel */}
        <div className="w-72 border-r border-white/8 overflow-y-auto p-4 space-y-3 flex-shrink-0">
          {/* Mark type */}
          <div>
            <div className="text-xs text-white/30 uppercase tracking-widest mb-2">Mark Type</div>
            <div className="flex gap-1 flex-wrap">
              {MARK_TYPES.map(m => (
                <button key={m.id} onClick={() => update('mark', m.id)}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all ${spec.mark === m.id ? 'bg-cyan-400/15 border-cyan-400/25 text-cyan-400' : 'border-white/8 text-white/35 hover:text-white/60'}`}>
                  <m.icon className="w-3 h-3" />{m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div>
            <div className="text-xs text-white/30 uppercase tracking-widest mb-2">Chart Title</div>
            <input value={spec.title} onChange={e => update('title', e.target.value)} placeholder="e.g. Monthly Revenue Trend"
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none" />
          </div>

          {/* Tableau-style Shelves */}
          <div className="space-y-2">
            <div className="text-xs text-white/30 uppercase tracking-widest mb-2">Shelves</div>

            {/* X axis */}
            <div>
              <div className="text-xs text-white/25 mb-1 flex items-center gap-1"><Hash className="w-3 h-3" /> Columns (X-Axis)</div>
              <div className="flex gap-2">
                <select value={spec.x || ''} onChange={e => update('x', e.target.value || null)} className="flex-1 px-2 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs focus:outline-none">
                  <option value="">Drop field here…</option>
                  {columns.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                </select>
                <select value={spec.xAgg} onChange={e => update('xAgg', e.target.value)} className="w-16 px-2 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs focus:outline-none">
                  {AGG_TYPES.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
            </div>

            {/* Y axis */}
            <div>
              <div className="text-xs text-white/25 mb-1 flex items-center gap-1"><TrendingUp className="w-3 h-3" /> Rows (Y-Axis)</div>
              <div className="flex gap-2">
                <select value={spec.y || ''} onChange={e => update('y', e.target.value || null)} className="flex-1 px-2 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs focus:outline-none">
                  <option value="">Drop field here…</option>
                  {columns.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                </select>
                <select value={spec.yAgg} onChange={e => update('yAgg', e.target.value)} className="w-16 px-2 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs focus:outline-none">
                  {AGG_TYPES.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
            </div>

            {/* Color */}
            <div>
              <div className="text-xs text-white/25 mb-1 flex items-center gap-1"><Palette className="w-3 h-3" /> Color</div>
              <select value={spec.color || ''} onChange={e => update('color', e.target.value || null)} className="w-full px-2 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs focus:outline-none">
                <option value="">None</option>
                {columns.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
              </select>
            </div>

            {/* Tooltip */}
            <div>
              <div className="text-xs text-white/25 mb-1 flex items-center gap-1"><Eye className="w-3 h-3" /> Tooltip Fields</div>
              <div className="flex flex-wrap gap-1 mb-1">
                {spec.tooltipFields.map((f, i) => (
                  <span key={f} className="text-xs px-1.5 py-0.5 bg-white/8 border border-white/12 rounded text-white/50 flex items-center gap-1">
                    {f}<button onClick={() => update('tooltipFields', spec.tooltipFields.filter((_, j) => j !== i))}><X className="w-2 h-2" /></button>
                  </span>
                ))}
              </div>
              <select onChange={e => { if (e.target.value && !spec.tooltipFields.includes(e.target.value)) update('tooltipFields', [...spec.tooltipFields, e.target.value]); e.target.value = ''; }}
                className="w-full px-2 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs focus:outline-none">
                <option value="">Add tooltip field…</option>
                {columns.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
              </select>
            </div>
          </div>

          {/* Annotation fields */}
          <div className="space-y-2 pt-2 border-t border-white/8">
            <div className="text-xs text-white/30 uppercase tracking-widest">Annotation</div>
            <textarea value={spec.insight} onChange={e => update('insight', e.target.value)} placeholder="One-line insight from this chart…"
              rows={2} className="w-full px-2 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs focus:outline-none resize-none" />
            <textarea value={spec.businessMeaning} onChange={e => update('businessMeaning', e.target.value)} placeholder="Business meaning…"
              rows={2} className="w-full px-2 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs focus:outline-none resize-none" />
            <textarea value={spec.recommendedAction} onChange={e => update('recommendedAction', e.target.value)} placeholder="Recommended action…"
              rows={2} className="w-full px-2 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs focus:outline-none resize-none" />
          </div>
        </div>

        {/* Preview */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 p-6 overflow-y-auto">
            {spec.title && <h3 className="text-sm font-bold mb-1">{spec.title}</h3>}
            {spec.x && spec.y && (
              <div className="text-xs text-white/30 mb-3">
                X: <span className="text-cyan-400">{spec.x}</span>
                {spec.xAgg !== 'NONE' && <span className="text-white/20"> ({spec.xAgg})</span>}
                {' '}· Y: <span className="text-cyan-400">{spec.y}</span>
                {spec.yAgg !== 'NONE' && <span className="text-white/20"> ({spec.yAgg})</span>}
              </div>
            )}
            <div className="h-60">
              <ChartPreview spec={spec} rows={rows} />
            </div>

            {/* View SQL panel */}
            {showSQL && (
              <div className="mt-4 p-3 rounded-xl bg-black/30 border border-green-400/20">
                <div className="text-xs text-green-400 font-bold mb-2 flex items-center gap-1.5"><Code2 className="w-3 h-3" /> Generated SQL</div>
                <pre className="text-xs text-green-400/70 font-mono whitespace-pre-wrap overflow-x-auto">{buildViewSQL()}</pre>
              </div>
            )}

            {/* Explain Chart result */}
            {explanation && (
              <div className="mt-4 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-purple-400 mb-2">
                  <Brain className="w-3.5 h-3.5" /> AI Business Interpretation
                </div>
                {explanation.topInsight && (
                  <div className="p-3 rounded-xl bg-cyan-400/5 border border-cyan-400/15">
                    <div className="text-xs text-cyan-400 font-bold mb-1">Top Insight</div>
                    <p className="text-xs text-white/70">{explanation.topInsight}</p>
                  </div>
                )}
                {explanation.businessMeaning && (
                  <div className="p-3 rounded-xl bg-purple-400/5 border border-purple-400/15">
                    <div className="text-xs text-purple-400 font-bold mb-1">Business Meaning</div>
                    <p className="text-xs text-white/70">{explanation.businessMeaning}</p>
                  </div>
                )}
                {explanation.trendOrPattern && (
                  <div className="p-3 rounded-xl bg-white/3 border border-white/8">
                    <div className="text-xs text-white/40 font-bold mb-1">Trend / Pattern</div>
                    <p className="text-xs text-white/60">{explanation.trendOrPattern}</p>
                  </div>
                )}
                {explanation.riskOrWarning && explanation.riskOrWarning !== 'No significant risk detected' && (
                  <div className="p-3 rounded-xl bg-amber-400/5 border border-amber-400/15">
                    <div className="text-xs text-amber-400 font-bold mb-1 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Risk / Warning</div>
                    <p className="text-xs text-white/60">{explanation.riskOrWarning}</p>
                  </div>
                )}
                {explanation.recommendedNextStep && (
                  <div className="p-3 rounded-xl bg-green-400/5 border border-green-400/15">
                    <div className="text-xs text-green-400 font-bold mb-1"><Zap className="w-3 h-3 inline mr-1" />Recommended Action</div>
                    <p className="text-xs text-white/70">{explanation.recommendedNextStep}</p>
                  </div>
                )}
              </div>
            )}
            {explaining && (
              <div className="mt-4 flex items-center gap-2 text-xs text-purple-400">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating AI business interpretation…
              </div>
            )}
          </div>

          {/* Generated spec preview */}
          <div className="border-t border-white/8 p-4 flex-shrink-0">
            <div className="text-xs text-white/30 mb-2 flex items-center gap-1.5"><Type className="w-3 h-3" /> Declarative Spec (JSON)</div>
            <pre className="text-xs text-cyan-400/60 bg-white/3 rounded-xl p-3 font-mono overflow-x-auto max-h-24 overflow-y-auto">
{JSON.stringify({
  title: spec.title,
  mark: spec.mark,
  encoding: {
    x: spec.x ? { field: spec.x, aggregate: spec.xAgg } : null,
    y: spec.y ? { field: spec.y, aggregate: spec.yAgg } : null,
    color: spec.color ? { field: spec.color } : null,
    tooltip: spec.tooltipFields.map(f => ({ field: f })),
  },
}, null, 2)}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}