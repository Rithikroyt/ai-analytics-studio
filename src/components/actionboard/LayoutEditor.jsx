/**
 * LayoutEditor — drag-and-drop metric/chart widget board for ActionBoard
 * Uses @hello-pangea/dnd for drag ordering and inline resize for widget size.
 */
import { useState } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { motion } from 'framer-motion';
import {
  GripVertical, X, Plus, Maximize2, Minimize2,
  BarChart2, TrendingUp, Target, AlertTriangle, CheckCircle2,
  Zap, Users, DollarSign, Activity, Settings2
} from 'lucide-react';
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area,
  XAxis, YAxis, Tooltip, ResponsiveContainer
} from 'recharts';

// ── Widget catalogue ──────────────────────────────────────────────
const WIDGET_CATALOGUE = [
  { type: 'metric', id: 'kpi_score',     label: 'Priority Score',   icon: Target,      color: 'text-red-400',    bg: 'bg-red-400/10',    border: 'border-red-400/20'    },
  { type: 'metric', id: 'kpi_open',      label: 'Open Actions',     icon: AlertTriangle, color: 'text-orange-400', bg: 'bg-orange-400/10', border: 'border-orange-400/20' },
  { type: 'metric', id: 'kpi_done',      label: 'Completed',        icon: CheckCircle2, color: 'text-green-400',  bg: 'bg-green-400/10',  border: 'border-green-400/20'  },
  { type: 'metric', id: 'kpi_impact',    label: 'Avg Impact',       icon: Zap,         color: 'text-cyan-400',   bg: 'bg-cyan-400/10',   border: 'border-cyan-400/20'   },
  { type: 'metric', id: 'kpi_team',      label: 'Departments',      icon: Users,       color: 'text-purple-400', bg: 'bg-purple-400/10', border: 'border-purple-400/20' },
  { type: 'metric', id: 'kpi_value',     label: 'Est. Value ($K)',   icon: DollarSign,  color: 'text-teal-400',   bg: 'bg-teal-400/10',   border: 'border-teal-400/20'   },
  { type: 'chart',  id: 'chart_priority',label: 'Priority Breakdown',icon: BarChart2,   color: 'text-amber-400',  bg: 'bg-amber-400/10',  border: 'border-amber-400/20'  },
  { type: 'chart',  id: 'chart_impact',  label: 'Impact vs Effort', icon: TrendingUp,  color: 'text-cyan-400',   bg: 'bg-cyan-400/10',   border: 'border-cyan-400/20'   },
  { type: 'chart',  id: 'chart_trend',   label: 'Action Trend',     icon: Activity,    color: 'text-green-400',  bg: 'bg-green-400/10',  border: 'border-green-400/20'  },
];

const SIZE_LABELS = { 1: 'Small', 2: 'Medium', 3: 'Wide' };

// ── Compute widget values from actions ───────────────────────────
function computeMetric(id, actions) {
  const open = actions.filter(a => a.status === 'open' || a.status === 'in_progress');
  const done = actions.filter(a => a.status === 'done');
  switch (id) {
    case 'kpi_score': return { value: (actions.reduce((s, a) => s + (a.priorityScore || 0), 0) / Math.max(actions.length, 1)).toFixed(2), label: 'avg score' };
    case 'kpi_open':  return { value: open.length, label: 'items' };
    case 'kpi_done':  return { value: done.length, label: `of ${actions.length}` };
    case 'kpi_impact': return { value: ((actions.reduce((s, a) => s + (a.expectedImpact || 0), 0) / Math.max(actions.length, 1)) * 100).toFixed(0) + '%', label: 'avg impact' };
    case 'kpi_team':  return { value: new Set(actions.map(a => a.department).filter(Boolean)).size || '—', label: 'depts' };
    case 'kpi_value': return { value: (actions.reduce((s, a) => s + (a.estimatedValue || 0), 0) / 1000).toFixed(0) + 'K', label: 'est. value' };
    default: return { value: '—', label: '' };
  }
}

function buildChartData(id, actions) {
  if (id === 'chart_priority') {
    const counts = { critical: 0, high: 0, medium: 0, low: 0 };
    actions.forEach(a => { if (counts[a.priority] !== undefined) counts[a.priority]++; });
    return Object.entries(counts).map(([name, count]) => ({ name, count }));
  }
  if (id === 'chart_impact') {
    return actions.slice(0, 8).map(a => ({ name: (a.recommendation || '').slice(0, 12) + '…', impact: Math.round((a.expectedImpact || 0) * 100), effort: Math.round((a.effort || 0) * 100) }));
  }
  if (id === 'chart_trend') {
    // synthetic trend — group by status
    return [
      { name: 'Open', value: actions.filter(a => a.status === 'open').length },
      { name: 'In Progress', value: actions.filter(a => a.status === 'in_progress').length },
      { name: 'Done', value: actions.filter(a => a.status === 'done').length },
      { name: 'Dismissed', value: actions.filter(a => a.status === 'dismissed').length },
    ];
  }
  return [];
}

// ── Individual widget renderers ───────────────────────────────────
function MetricWidget({ widget, actions }) {
  const { value, label } = computeMetric(widget.id, actions);
  const def = WIDGET_CATALOGUE.find(w => w.id === widget.id);
  const Icon = def?.icon || Target;
  return (
    <div className="flex flex-col items-start justify-between h-full p-1">
      <div className={`w-8 h-8 rounded-lg ${def?.bg} flex items-center justify-center mb-2`}>
        <Icon className={`w-4 h-4 ${def?.color}`} />
      </div>
      <div>
        <div className={`text-3xl font-black ${def?.color}`}>{value}</div>
        <div className="text-xs text-white/40 mt-0.5">{label}</div>
      </div>
    </div>
  );
}

function ChartWidget({ widget, actions }) {
  const data = buildChartData(widget.id, actions);
  const def = WIDGET_CATALOGUE.find(w => w.id === widget.id);
  const color = widget.id === 'chart_priority' ? '#fb923c'
    : widget.id === 'chart_impact' ? '#00e5ff'
    : '#4ade80';

  return (
    <div className="h-full flex flex-col">
      <div className={`text-xs font-semibold ${def?.color} mb-2`}>{def?.label}</div>
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          {widget.id === 'chart_impact' ? (
            <BarChart data={data} margin={{ top: 2, right: 4, bottom: 2, left: -20 }}>
              <XAxis dataKey="name" tick={{ fontSize: 8, fill: 'rgba(255,255,255,0.3)' }} />
              <YAxis tick={{ fontSize: 8, fill: 'rgba(255,255,255,0.3)' }} />
              <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 11 }} />
              <Bar dataKey="impact" fill="#00e5ff" radius={[3, 3, 0, 0]} />
              <Bar dataKey="effort" fill="#f59e0b" radius={[3, 3, 0, 0]} />
            </BarChart>
          ) : widget.id === 'chart_trend' ? (
            <AreaChart data={data} margin={{ top: 2, right: 4, bottom: 2, left: -20 }}>
              <XAxis dataKey="name" tick={{ fontSize: 8, fill: 'rgba(255,255,255,0.3)' }} />
              <YAxis tick={{ fontSize: 8, fill: 'rgba(255,255,255,0.3)' }} />
              <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 11 }} />
              <Area type="monotone" dataKey="value" stroke={color} fill={`${color}22`} strokeWidth={2} />
            </AreaChart>
          ) : (
            <BarChart data={data} margin={{ top: 2, right: 4, bottom: 2, left: -20 }}>
              <XAxis dataKey="name" tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.3)' }} />
              <YAxis tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.3)' }} />
              <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 11 }} />
              <Bar dataKey="count" fill={color} radius={[4, 4, 0, 0]} />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ── Main LayoutEditor ─────────────────────────────────────────────
const DEFAULT_LAYOUT = [
  { id: 'kpi_score', size: 1 },
  { id: 'kpi_open', size: 1 },
  { id: 'kpi_done', size: 1 },
  { id: 'kpi_impact', size: 1 },
  { id: 'chart_priority', size: 2 },
  { id: 'chart_trend', size: 2 },
];

export default function LayoutEditor({ actions, department, onDepartmentChange, departments }) {
  const [editing, setEditing] = useState(false);
  const [layout, setLayout] = useState(() => {
    try { return JSON.parse(localStorage.getItem('actionboard_layout') || 'null') || DEFAULT_LAYOUT; }
    catch { return DEFAULT_LAYOUT; }
  });
  const [showCatalogue, setShowCatalogue] = useState(false);

  const saveLayout = (newLayout) => {
    setLayout(newLayout);
    localStorage.setItem('actionboard_layout', JSON.stringify(newLayout));
  };

  const onDragEnd = (result) => {
    if (!result.destination) return;
    const items = [...layout];
    const [moved] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, moved);
    saveLayout(items);
  };

  const removeWidget = (id) => saveLayout(layout.filter(w => w.id !== id));

  const cycleSize = (id) => saveLayout(layout.map(w => w.id === id ? { ...w, size: (w.size % 3) + 1 } : w));

  const addWidget = (id) => {
    if (layout.find(w => w.id === id)) return;
    const def = WIDGET_CATALOGUE.find(w => w.id === id);
    saveLayout([...layout, { id, size: def?.type === 'chart' ? 2 : 1 }]);
    setShowCatalogue(false);
  };

  const resetLayout = () => saveLayout(DEFAULT_LAYOUT);

  const widgetHeight = (size) => size === 1 ? 'h-28' : size === 2 ? 'h-44' : 'h-44';
  const widgetCols = (size) => size === 3 ? 'col-span-3' : size === 2 ? 'col-span-2' : 'col-span-1';

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-white/40 uppercase tracking-widest">Custom Dashboard</span>
          {departments.length > 0 && (
            <select value={department} onChange={e => onDepartmentChange(e.target.value)}
              className="px-2 py-1 bg-white/5 border border-white/10 rounded-lg text-xs text-foreground focus:outline-none">
              <option value="">All Departments</option>
              {departments.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          )}
        </div>
        <div className="flex items-center gap-2">
          {editing && (
            <>
              <button onClick={() => setShowCatalogue(v => !v)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-cyan-400/10 border border-cyan-400/20 text-cyan-400 rounded-lg hover:bg-cyan-400/15 transition-all">
                <Plus className="w-3 h-3" /> Add Widget
              </button>
              <button onClick={resetLayout}
                className="px-3 py-1.5 text-xs bg-white/5 border border-white/10 text-white/40 rounded-lg hover:bg-white/8 transition-all">
                Reset
              </button>
            </>
          )}
          <button onClick={() => { setEditing(v => !v); setShowCatalogue(false); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border transition-all font-semibold ${editing ? 'bg-green-400/10 border-green-400/20 text-green-400' : 'bg-white/5 border-white/10 text-white/50 hover:text-white/80'}`}>
            <Settings2 className="w-3 h-3" /> {editing ? 'Done Editing' : 'Edit Layout'}
          </button>
        </div>
      </div>

      {/* Widget catalogue dropdown */}
      {showCatalogue && (
        <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
          className="glass rounded-xl border border-cyan-400/20 p-3">
          <div className="text-xs font-semibold text-white/40 mb-2 uppercase tracking-widest">Add Widget</div>
          <div className="flex flex-wrap gap-2">
            {WIDGET_CATALOGUE.map(w => {
              const already = !!layout.find(l => l.id === w.id);
              const Icon = w.icon;
              return (
                <button key={w.id} onClick={() => addWidget(w.id)} disabled={already}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border transition-all ${already ? 'opacity-30 cursor-not-allowed border-white/8 bg-white/3' : `${w.bg} ${w.border} ${w.color} hover:opacity-80`}`}>
                  <Icon className="w-3 h-3" /> {w.label}
                </button>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Grid */}
      {editing ? (
        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="layout-grid" direction="horizontal">
            {(provided) => (
              <div ref={provided.innerRef} {...provided.droppableProps}
                className="grid grid-cols-3 gap-3 items-start">
                {layout.map((widget, index) => {
                  const def = WIDGET_CATALOGUE.find(w => w.id === widget.id);
                  if (!def) return null;
                  return (
                    <Draggable key={widget.id} draggableId={widget.id} index={index}>
                      {(drag, snapshot) => (
                        <div ref={drag.innerRef} {...drag.draggableProps}
                          className={`${widgetCols(widget.size)} ${widgetHeight(widget.size)} glass rounded-xl border ${def.border} ${snapshot.isDragging ? 'shadow-lg shadow-cyan-400/10 ring-1 ring-cyan-400/30' : ''} p-3 relative group transition-all`}>
                          {/* Drag handle */}
                          <div {...drag.dragHandleProps} className="absolute top-2 left-2 cursor-grab active:cursor-grabbing text-white/20 hover:text-white/50">
                            <GripVertical className="w-3.5 h-3.5" />
                          </div>
                          {/* Controls */}
                          <div className="absolute top-2 right-2 flex items-center gap-1">
                            <button onClick={() => cycleSize(widget.id)}
                              title={`Size: ${SIZE_LABELS[widget.size]} → ${SIZE_LABELS[(widget.size % 3) + 1]}`}
                              className="p-1 rounded bg-white/5 text-white/30 hover:text-cyan-400 hover:bg-cyan-400/10 transition-all">
                              {widget.size < 3 ? <Maximize2 className="w-3 h-3" /> : <Minimize2 className="w-3 h-3" />}
                            </button>
                            <button onClick={() => removeWidget(widget.id)}
                              className="p-1 rounded bg-white/5 text-white/30 hover:text-red-400 hover:bg-red-400/10 transition-all">
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                          {/* Content placeholder in edit mode */}
                          <div className="mt-5 flex items-center gap-2">
                            <def.icon className={`w-4 h-4 ${def.color}`} />
                            <span className={`text-xs font-semibold ${def.color}`}>{def.label}</span>
                            <span className="text-xs text-white/25 ml-auto">{SIZE_LABELS[widget.size]}</span>
                          </div>
                          <div className="text-xs text-white/25 mt-1 ml-6">{def.type === 'chart' ? 'Chart' : 'Metric'} · drag to reorder</div>
                        </div>
                      )}
                    </Draggable>
                  );
                })}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      ) : (
        <div className="grid grid-cols-3 gap-3 items-start">
          {layout.map((widget) => {
            const def = WIDGET_CATALOGUE.find(w => w.id === widget.id);
            if (!def) return null;
            return (
              <motion.div key={widget.id} layout
                className={`${widgetCols(widget.size)} ${widgetHeight(widget.size)} glass rounded-xl border ${def.border} p-3`}>
                {def.type === 'metric'
                  ? <MetricWidget widget={widget} actions={actions} />
                  : <ChartWidget widget={widget} actions={actions} />}
              </motion.div>
            );
          })}
        </div>
      )}

      {editing && (
        <div className="text-xs text-white/25 text-center">
          Drag widgets to reorder · Click <Maximize2 className="w-2.5 h-2.5 inline" /> to resize · Click <X className="w-2.5 h-2.5 inline" /> to remove
        </div>
      )}
    </div>
  );
}