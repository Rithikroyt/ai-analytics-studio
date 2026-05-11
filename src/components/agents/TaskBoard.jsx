/**
 * TaskBoard V2 — 11 senior task types with playbook linking and structured outputs
 */
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import {
  Plus, Play, Trash2, CheckCircle2, Loader2, AlertCircle, Clock,
  ChevronDown, ChevronUp, BarChart2, TrendingUp, Settings, Brain, Target
} from 'lucide-react';
import AgentStructuredAnswer from './AgentStructuredAnswer.jsx';

const TASK_TYPES = [
  { id: 'kpi_review', label: 'KPI Review', icon: BarChart2, color: '#00e5ff', agent: 'CFO Analyst' },
  { id: 'cost_variance_review', label: 'Cost Variance', icon: BarChart2, color: '#00e5ff', agent: 'CFO Analyst' },
  { id: 'payroll_efficiency_review', label: 'Payroll Efficiency', icon: BarChart2, color: '#00e5ff', agent: 'CFO Analyst' },
  { id: 'forecast_review', label: 'Forecast Review', icon: TrendingUp, color: '#a855f7', agent: 'CFO Analyst' },
  { id: 'funnel_diagnosis', label: 'Funnel Diagnosis', icon: TrendingUp, color: '#ff2d7a', agent: 'Growth Analyst' },
  { id: 'rfm_segmentation', label: 'RFM Segmentation', icon: Target, color: '#ff2d7a', agent: 'Growth Analyst' },
  { id: 'anomaly_review', label: 'Anomaly Review', icon: AlertCircle, color: '#ffcc02', agent: 'Growth Analyst' },
  { id: 'sql_analysis', label: 'SQL Analysis', icon: Brain, color: '#4caf50', agent: 'Operations Analyst' },
  { id: 'data_cleaning', label: 'Data Cleaning', icon: Settings, color: '#4caf50', agent: 'Operations Analyst' },
  { id: 'executive_report', label: 'Executive Report', icon: BarChart2, color: '#ff6b35', agent: 'CFO Analyst' },
  { id: 'recommendation_prioritization', label: 'Prioritize Actions', icon: Target, color: '#ff6b35', agent: 'CFO Analyst' },
];

const STATUS_CONFIG = {
  pending: { label: 'Pending', icon: Clock, cls: 'text-white/30 bg-white/5', iconCls: 'text-white/30' },
  running: { label: 'Running', icon: Loader2, cls: 'text-cyan-400 bg-cyan-400/10', iconCls: 'text-cyan-400 animate-spin' },
  done: { label: 'Done', icon: CheckCircle2, cls: 'text-green-400 bg-green-400/10', iconCls: 'text-green-400' },
  error: { label: 'Error', icon: AlertCircle, cls: 'text-red-400 bg-red-400/10', iconCls: 'text-red-400' },
};

const PRIORITY_COLORS = { critical: '#ef4444', high: '#ff6b35', medium: '#ffcc02', low: '#4caf50' };

const TASK_PROMPTS = {
  kpi_review: t => `Review the primary KPIs in this dataset. Identify top performers, laggards, and any concerning trends. Dataset: ${t}`,
  cost_variance_review: t => `Analyze cost variance in this dataset. Which departments or categories are over/under budget? What are the main cost drivers? Dataset: ${t}`,
  payroll_efficiency_review: t => `Calculate payroll efficiency: payroll cost ratio, revenue per employee, cost per employee. Identify outliers and efficiency opportunities. Dataset: ${t}`,
  forecast_review: t => `Review forecast accuracy vs actual performance. Identify where the forecast is most off and recommend adjustments. Dataset: ${t}`,
  funnel_diagnosis: t => `Diagnose the conversion funnel in this dataset. Find the biggest drop-off stage and recommend improvements. Dataset: ${t}`,
  rfm_segmentation: t => `Segment customers by RFM (Recency, Frequency, Monetary). Identify Champions, At-Risk, and Hibernating customers. Dataset: ${t}`,
  anomaly_review: t => `Scan this dataset for statistical anomalies and outliers. Explain each anomaly and its business significance. Dataset: ${t}`,
  sql_analysis: t => `Write and explain the optimal SQL query to extract the most valuable business insight from this dataset. Dataset: ${t}`,
  data_cleaning: t => `Assess data quality issues in this dataset: missing values, duplicates, outliers, format inconsistencies. Recommend cleaning actions. Dataset: ${t}`,
  executive_report: t => `Generate a complete executive report covering: KPI performance, key trends, risks, opportunities, and top 3 recommended actions. Dataset: ${t}`,
  recommendation_prioritization: t => `Analyze all available data and prioritize the top 5 business recommendations by financial impact, urgency, and effort required. Dataset: ${t}`,
};

function TaskCard({ task, onRun, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const taskType = TASK_TYPES.find(t => t.id === task.taskType);
  const statusCfg = STATUS_CONFIG[task.status] || STATUS_CONFIG.pending;
  const StatusIcon = statusCfg.icon;
  const Icon = taskType?.icon || BarChart2;

  return (
    <motion.div layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97 }}
      className="glass-card rounded-xl border border-white/8 overflow-hidden">
      <div className="flex items-center gap-3 p-3">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: `${taskType?.color || '#fff'}15`, border: `1px solid ${taskType?.color || '#fff'}25` }}>
          <Icon className="w-4 h-4" style={{ color: taskType?.color }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold truncate">{task.title}</span>
            {task.priority && (
              <span className="text-xs px-1.5 py-0.5 rounded-full font-bold"
                style={{ background: `${PRIORITY_COLORS[task.priority]}18`, color: PRIORITY_COLORS[task.priority] }}>
                {task.priority}
              </span>
            )}
          </div>
          <div className="text-xs text-white/30 mt-0.5 flex items-center gap-2">
            <span>{taskType?.label}</span>
            <span>·</span>
            <span>{task.assignedAgent}</span>
            {task.confidenceScore && <span>· {task.confidenceScore}% confidence</span>}
          </div>
        </div>
        <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium ${statusCfg.cls}`}>
          <StatusIcon className={`w-3 h-3 ${statusCfg.iconCls}`} />
          {statusCfg.label}
        </div>
        <div className="flex items-center gap-1">
          {(task.status === 'pending' || task.status === 'error') && (
            <button onClick={() => onRun(task.id)}
              className="p-1.5 rounded-lg text-white/30 hover:text-cyan-400 hover:bg-cyan-400/10 transition-all">
              <Play className="w-3.5 h-3.5" />
            </button>
          )}
          {task.output && (
            <button onClick={() => setExpanded(v => !v)}
              className="p-1.5 rounded-lg text-white/30 hover:text-white/70 hover:bg-white/8 transition-all">
              {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          )}
          <button onClick={() => onDelete(task.id)}
            className="p-1.5 rounded-lg text-white/30 hover:text-red-400 hover:bg-red-400/10 transition-all">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {expanded && task.output && (
          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
            <div className="px-3 pb-3 border-t border-white/6 pt-3">
              <AgentStructuredAnswer result={task.output} persona={{ name: task.assignedAgent, avatarColor: taskType?.color }} sessionId={task.id} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function NewTaskForm({ personas, activeTable, onAdd, onClose }) {
  const [form, setForm] = useState({ title: '', taskType: 'kpi_review', assignedAgent: 'CFO Analyst', priority: 'medium', input: '' });
  const taskType = TASK_TYPES.find(t => t.id === form.taskType);

  const submit = () => {
    if (!form.title.trim()) return;
    const input = form.input.trim() || (TASK_PROMPTS[form.taskType]?.(activeTable?.name || 'dataset') ?? form.title);
    onAdd({ ...form, input, status: 'pending', id: Date.now().toString() });
  };

  return (
    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
      className="glass-card rounded-xl border border-cyan-400/20 p-4 space-y-3 mb-3">
      <div className="text-sm font-bold text-cyan-400">New Analysis Task</div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <div className="text-xs text-white/35 mb-1">Task Title</div>
          <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            placeholder="e.g. Q3 Payroll Review"
            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-cyan-400/30 text-foreground" />
        </div>
        <div>
          <div className="text-xs text-white/35 mb-1">Priority</div>
          <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none text-foreground">
            {['critical', 'high', 'medium', 'low'].map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
          </select>
        </div>
        <div>
          <div className="text-xs text-white/35 mb-1">Task Type</div>
          <select value={form.taskType} onChange={e => { const tt = TASK_TYPES.find(t => t.id === e.target.value); setForm(f => ({ ...f, taskType: e.target.value, assignedAgent: tt?.agent || f.assignedAgent })); }}
            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none text-foreground">
            {TASK_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
        </div>
        <div>
          <div className="text-xs text-white/35 mb-1">Assigned Agent</div>
          <select value={form.assignedAgent} onChange={e => setForm(f => ({ ...f, assignedAgent: e.target.value }))}
            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none text-foreground">
            {(personas || []).map(p => <option key={p.id || p.name} value={p.name}>{p.name}</option>)}
          </select>
        </div>
      </div>
      <div>
        <div className="text-xs text-white/35 mb-1">Custom Instructions (optional)</div>
        <textarea value={form.input} onChange={e => setForm(f => ({ ...f, input: e.target.value }))} rows={2}
          placeholder={TASK_PROMPTS[form.taskType]?.(activeTable?.name || 'dataset') || 'Describe what to analyze…'}
          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-cyan-400/30 text-foreground resize-none" />
      </div>
      <div className="flex gap-2 justify-end">
        <button onClick={onClose} className="px-3 py-1.5 text-xs text-white/40 hover:text-white/70 rounded-xl hover:bg-white/5 transition-all">Cancel</button>
        <button onClick={submit} className="px-4 py-1.5 text-xs font-bold bg-cyan-400 rounded-xl hover:bg-cyan-300 transition-all" style={{ color: 'hsl(222,47%,6%)' }}>
          Add Task
        </button>
      </div>
    </motion.div>
  );
}

export default function TaskBoard({ personas, activeTable }) {
  const [tasks, setTasks] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState('all');

  const addTask = (task) => { setTasks(prev => [task, ...prev]); setShowForm(false); };
  const deleteTask = (id) => setTasks(prev => prev.filter(t => t.id !== id));

  const runTask = async (id) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status: 'running' } : t));
    try {
      const res = await base44.functions.invoke('runAgentOrchestrator', {
        question: task.input,
        persona: personas?.find(p => p.name === task.assignedAgent) || { name: task.assignedAgent },
        sessionId: `task_${id}`,
        tableContext: activeTable ? {
          name: activeTable.name,
          rowCount: activeTable.rowCount || activeTable.rows?.length,
          columns: activeTable.columns?.slice(0, 20),
          rows: activeTable.rows?.slice(0, 20),
        } : null,
      });
      setTasks(prev => prev.map(t => t.id === id ? {
        ...t,
        status: 'done',
        output: res.data,
        confidenceScore: res.data?.confidence || null,
      } : t));
    } catch (e) {
      setTasks(prev => prev.map(t => t.id === id ? { ...t, status: 'error' } : t));
    }
  };

  const filtered = filter === 'all' ? tasks : tasks.filter(t => t.status === filter);
  const stats = { total: tasks.length, done: tasks.filter(t => t.status === 'done').length, pending: tasks.filter(t => t.status === 'pending').length };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="text-sm font-bold">Analysis Tasks</div>
          <div className="flex items-center gap-2 text-xs text-white/30">
            <span>{stats.total} total</span>
            {stats.done > 0 && <span className="text-green-400">{stats.done} done</span>}
            {stats.pending > 0 && <span className="text-white/40">{stats.pending} pending</span>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select value={filter} onChange={e => setFilter(e.target.value)}
            className="px-2 py-1 bg-white/5 border border-white/10 rounded-lg text-xs text-muted-foreground focus:outline-none">
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="running">Running</option>
            <option value="done">Done</option>
          </select>
          <button onClick={() => setShowForm(v => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-cyan-400/10 border border-cyan-400/20 text-cyan-400 rounded-xl hover:bg-cyan-400/15 transition-all">
            <Plus className="w-3 h-3" /> New Task
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showForm && <NewTaskForm personas={personas} activeTable={activeTable} onAdd={addTask} onClose={() => setShowForm(false)} />}
      </AnimatePresence>

      {filtered.length === 0 ? (
        <div className="text-center py-10 text-white/20 text-sm">
          No tasks yet. Click "New Task" to assign analysis to an agent.
        </div>
      ) : (
        <div className="space-y-2">
          <AnimatePresence>
            {filtered.map(task => (
              <TaskCard key={task.id} task={task} onRun={runTask} onDelete={deleteTask} />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}