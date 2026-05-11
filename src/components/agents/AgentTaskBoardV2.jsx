/**
 * AgentTaskBoardV2 — 11 senior task types linked to playbooks with priority scoring.
 */
import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Play, Trash2, CheckCircle2, AlertTriangle, Loader2, Clock, Target, Zap, BarChart2, TrendingUp, Users, Brain } from 'lucide-react';

const TASK_TYPES = [
  { id: 'kpi_review',                  label: 'KPI Review',                   icon: BarChart2,   color: '#00e5ff', agent: 'CFO Analyst',        prompt: 'Review all available KPIs in this dataset. Identify top performers and underperformers.' },
  { id: 'cost_variance_review',        label: 'Cost Variance Review',         icon: Target,      color: '#ef4444', agent: 'CFO Analyst',        prompt: 'Identify cost variances vs baseline. Find which categories are over budget and by how much.' },
  { id: 'payroll_efficiency_review',   label: 'Payroll Efficiency Review',    icon: Users,       color: '#a855f7', agent: 'CFO Analyst',        prompt: 'Calculate revenue per employee and payroll cost ratio. Find efficiency opportunities.' },
  { id: 'funnel_diagnosis',            label: 'Funnel Drop-off Diagnosis',    icon: TrendingUp,  color: '#4caf50', agent: 'Growth Analyst',     prompt: 'Identify the largest funnel drop-off stage. Calculate conversion rates at each step.' },
  { id: 'rfm_segmentation',            label: 'RFM Segmentation',             icon: Users,       color: '#ff6b35', agent: 'Growth Analyst',     prompt: 'Segment customers by Recency, Frequency, and Monetary value. Identify Champions and At-Risk groups.' },
  { id: 'anomaly_review',              label: 'Anomaly Review',               icon: AlertTriangle, color: '#ffcc02', agent: 'Growth Analyst',  prompt: 'Detect statistical anomalies in the dataset. Identify values more than 2 standard deviations from mean.' },
  { id: 'sql_analysis',                label: 'SQL Analysis',                 icon: Target,      color: '#60a5fa', agent: 'Operations Analyst', prompt: 'Generate SQL to aggregate key metrics by category and time. Return top 10 results.' },
  { id: 'forecast_review',             label: 'Forecast Review',              icon: TrendingUp,  color: '#00bfa5', agent: 'CFO Analyst',        prompt: 'Extrapolate the current trend forward 3 periods. Identify variance from target.' },
  { id: 'data_cleaning',               label: 'Data Quality Check',           icon: CheckCircle2, color: '#34d399', agent: 'Operations Analyst', prompt: 'Check data completeness, identify nulls, duplicates, and outliers. Score overall data quality.' },
  { id: 'recommendation_prioritization', label: 'Recommendation Prioritization', icon: Zap,     color: '#fb923c', agent: 'CFO Analyst',        prompt: 'Review all available metrics and prioritize the top 3 actions by business impact and urgency.' },
  { id: 'executive_report',            label: 'Executive Report',             icon: Brain,       color: '#e91e63', agent: 'CFO Analyst',        prompt: 'Generate a full executive summary covering financial performance, growth trends, operational efficiency, risks, and recommended actions.' },
];

const STATUS_CONFIG = {
  pending: { color: 'text-white/30', bg: 'bg-white/5',       border: 'border-white/8',        icon: Clock },
  running: { color: 'text-cyan-400', bg: 'bg-cyan-400/10',   border: 'border-cyan-400/20',    icon: Loader2 },
  done:    { color: 'text-green-400', bg: 'bg-green-400/10', border: 'border-green-400/20',   icon: CheckCircle2 },
  error:   { color: 'text-red-400',  bg: 'bg-red-400/10',    border: 'border-red-400/20',     icon: AlertTriangle },
};

const PRIORITY_CONFIG = {
  critical: { label: 'Critical', color: 'text-red-400',    bg: 'bg-red-400/10',    border: 'border-red-400/20' },
  high:     { label: 'High',     color: 'text-amber-400',  bg: 'bg-amber-400/10',  border: 'border-amber-400/20' },
  medium:   { label: 'Medium',   color: 'text-blue-400',   bg: 'bg-blue-400/10',   border: 'border-blue-400/20' },
  low:      { label: 'Low',      color: 'text-white/30',   bg: 'bg-white/5',       border: 'border-white/8' },
};

function TaskCard({ task, onRun, onDelete }) {
  const taskType = TASK_TYPES.find(t => t.id === task.taskType) || TASK_TYPES[0];
  const Icon = taskType.icon;
  const status = STATUS_CONFIG[task.status] || STATUS_CONFIG.pending;
  const priority = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium;
  const StatusIcon = status.icon;

  return (
    <motion.div layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
      className={`rounded-xl border p-3.5 space-y-2.5 ${status.bg} ${status.border}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: `${taskType.color}18`, border: `1px solid ${taskType.color}30` }}>
            <Icon className="w-3.5 h-3.5" style={{ color: taskType.color }} />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-bold truncate">{task.title}</div>
            <div className="text-xs text-white/30">{task.assignedAgent}</div>
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <span className={`text-xs px-1.5 py-0.5 rounded-full border ${priority.color} ${priority.bg} ${priority.border}`}>{priority.label}</span>
          <StatusIcon className={`w-3.5 h-3.5 ${status.color} ${task.status === 'running' ? 'animate-spin' : ''}`} />
        </div>
      </div>

      {task.input && <p className="text-xs text-white/45 leading-relaxed line-clamp-2">{task.input}</p>}

      {task.status === 'done' && task.output?.direct_answer && (
        <div className="p-2.5 rounded-lg bg-white/5 border border-white/8">
          <p className="text-xs text-white/65 leading-relaxed line-clamp-3">{task.output.direct_answer}</p>
          {task.output.confidence_score && (
            <div className="text-xs text-white/30 mt-1">Confidence: {task.output.confidence_score}%</div>
          )}
        </div>
      )}

      {task.status === 'error' && task.output?.error && (
        <p className="text-xs text-red-400">{task.output.error}</p>
      )}

      <div className="flex items-center gap-1.5">
        {task.status !== 'running' && (
          <button onClick={() => onRun(task.id)}
            className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg transition-all font-semibold"
            style={{ background: `${taskType.color}18`, color: taskType.color, border: `1px solid ${taskType.color}30` }}>
            <Play className="w-3 h-3" /> {task.status === 'done' ? 'Re-run' : 'Run'}
          </button>
        )}
        <button onClick={() => onDelete(task.id)}
          className="p-1 rounded-lg text-white/20 hover:text-red-400 hover:bg-red-400/10 transition-all ml-auto">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </motion.div>
  );
}

export default function AgentTaskBoardV2({ personas, activeTable }) {
  const [tasks, setTasks] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', taskType: 'kpi_review', priority: 'medium', input: '' });

  useEffect(() => {
    base44.entities.AgentTask.list('-created_date', 30)
      .then(setTasks).catch(() => {});
  }, []);

  const handleCreate = async () => {
    const taskType = TASK_TYPES.find(t => t.id === form.taskType);
    const data = {
      ...form,
      assignedAgent: taskType?.agent || 'CFO Analyst',
      status: 'pending',
      input: form.input || taskType?.prompt || '',
    };
    const created = await base44.entities.AgentTask.create(data);
    setTasks(prev => [created, ...prev]);
    setShowForm(false);
    setForm({ title: '', taskType: 'kpi_review', priority: 'medium', input: '' });
  };

  const handleRun = async (id) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status: 'running' } : t));
    try {
      const res = await base44.functions.invoke('runAgentOrchestrator', {
        question: task.input || TASK_TYPES.find(tt => tt.id === task.taskType)?.prompt || task.title,
        persona: { id: task.assignedAgent.includes('CFO') ? 'cfo' : task.assignedAgent.includes('Growth') ? 'marketing' : 'ops', name: task.assignedAgent },
        tableContext: activeTable ? {
          name: activeTable.name,
          rowCount: activeTable.rowCount || activeTable.rows?.length,
          columns: activeTable.columns?.slice(0, 20),
          rows: activeTable.rows?.slice(0, 40),
        } : null,
        pipelinePreset: 'quick_insight',
      });
      const output = res.data;
      await base44.entities.AgentTask.update(id, { status: 'done', output, confidenceScore: output?.confidence_score });
      setTasks(prev => prev.map(t => t.id === id ? { ...t, status: 'done', output, confidenceScore: output?.confidence_score } : t));
    } catch (e) {
      await base44.entities.AgentTask.update(id, { status: 'error', output: { error: e.message } });
      setTasks(prev => prev.map(t => t.id === id ? { ...t, status: 'error', output: { error: e.message } } : t));
    }
  };

  const handleDelete = async (id) => {
    await base44.entities.AgentTask.delete(id).catch(() => {});
    setTasks(prev => prev.filter(t => t.id !== id));
  };

  const pending = tasks.filter(t => t.status === 'pending').length;
  const done = tasks.filter(t => t.status === 'done').length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 text-xs">
          <span className="text-white/40">{tasks.length} tasks</span>
          {pending > 0 && <span className="px-2 py-0.5 rounded-full bg-white/5 text-white/40">{pending} pending</span>}
          {done > 0 && <span className="px-2 py-0.5 rounded-full bg-green-400/10 text-green-400">{done} done</span>}
        </div>
        <button onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl bg-cyan-400/10 border border-cyan-400/20 text-cyan-400 hover:bg-cyan-400/15 transition-all font-semibold">
          <Plus className="w-3.5 h-3.5" /> New Task
        </button>
      </div>

      {/* Task form */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
            className="glass-card rounded-xl border border-cyan-400/20 p-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-xs text-white/35 mb-1.5">Task Title</div>
                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. Q2 Budget Review"
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-foreground focus:outline-none focus:border-cyan-400/30" />
              </div>
              <div>
                <div className="text-xs text-white/35 mb-1.5">Task Type</div>
                <select value={form.taskType} onChange={e => setForm(f => ({ ...f, taskType: e.target.value }))}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-foreground focus:outline-none focus:border-cyan-400/30">
                  {TASK_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <div className="text-xs text-white/35 mb-1.5">Priority</div>
                <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-foreground focus:outline-none focus:border-cyan-400/30">
                  {Object.keys(PRIORITY_CONFIG).map(p => <option key={p} value={p}>{PRIORITY_CONFIG[p].label}</option>)}
                </select>
              </div>
              <div>
                <div className="text-xs text-white/35 mb-1.5">Assigned Agent</div>
                <div className="px-3 py-2 bg-white/3 border border-white/8 rounded-xl text-xs text-white/45">
                  {TASK_TYPES.find(t => t.id === form.taskType)?.agent}
                </div>
              </div>
            </div>
            <div>
              <div className="text-xs text-white/35 mb-1.5">Custom Instructions (optional)</div>
              <textarea value={form.input} onChange={e => setForm(f => ({ ...f, input: e.target.value }))}
                placeholder={TASK_TYPES.find(t => t.id === form.taskType)?.prompt}
                rows={2} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-foreground focus:outline-none focus:border-cyan-400/30 resize-none" />
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowForm(false)} className="text-xs px-3 py-1.5 rounded-xl text-white/35 hover:text-white/60 hover:bg-white/5 transition-all">Cancel</button>
              <button onClick={handleCreate} disabled={!form.title}
                className="text-xs px-4 py-1.5 rounded-xl bg-cyan-400 font-bold hover:bg-cyan-300 transition-all disabled:opacity-40"
                style={{ color: 'hsl(222,47%,6%)' }}>
                Create Task
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {tasks.length === 0 ? (
        <div className="text-center py-10 text-white/20">
          <Brain className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No tasks yet. Create one to run a senior-level analysis.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <AnimatePresence>
            {tasks.map(t => (
              <TaskCard key={t.id} task={t} onRun={handleRun} onDelete={handleDelete} />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}