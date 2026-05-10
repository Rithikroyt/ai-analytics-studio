/**
 * TaskBoard — Assign and manage data-cleaning / reporting tasks to AI personas
 */
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import {
  Plus, Play, CheckCircle2, Clock, Loader2, Trash2, Sparkles,
  ClipboardList, Database, FileText, Wand2, AlertTriangle, X
} from 'lucide-react';

const TASK_TYPES = [
  { id: 'data_cleaning', label: 'Data Cleaning', icon: Database, color: 'text-cyan-400', bg: 'bg-cyan-400/10', border: 'border-cyan-400/20', desc: 'Fix nulls, normalize formats, remove duplicates' },
  { id: 'reporting', label: 'Report Generation', icon: FileText, color: 'text-purple-400', bg: 'bg-purple-400/10', border: 'border-purple-400/20', desc: 'Generate structured business reports' },
  { id: 'anomaly_review', label: 'Anomaly Review', icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-400/10', border: 'border-amber-400/20', desc: 'Identify and explain data anomalies' },
  { id: 'insight_extraction', label: 'Insight Extraction', icon: Sparkles, color: 'text-pink-400', bg: 'bg-pink-400/10', border: 'border-pink-400/20', desc: 'Extract key business insights from the dataset' },
];

const STATUS_STYLES = {
  pending: { label: 'Pending', color: 'text-white/40', bg: 'bg-white/5', icon: Clock },
  running: { label: 'Running', color: 'text-cyan-400', bg: 'bg-cyan-400/10', icon: Loader2 },
  done: { label: 'Done', color: 'text-green-400', bg: 'bg-green-400/10', icon: CheckCircle2 },
  error: { label: 'Error', color: 'text-red-400', bg: 'bg-red-400/10', icon: AlertTriangle },
};

function TaskCard({ task, onRun, onDelete }) {
  const type = TASK_TYPES.find(t => t.id === task.type) || TASK_TYPES[0];
  const status = STATUS_STYLES[task.status] || STATUS_STYLES.pending;
  const Icon = type.icon;
  const StatusIcon = status.icon;

  return (
    <motion.div layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }}
      className={`p-4 rounded-2xl border transition-all ${type.border} bg-white/[0.02]`}>
      <div className="flex items-start gap-3">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${type.bg}`}>
          <Icon className={`w-4 h-4 ${type.color}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm truncate">{task.title}</div>
          <div className="text-xs text-white/40 mt-0.5">{task.personaName} · {type.label}</div>
          {task.instructions && <div className="text-xs text-white/30 mt-1 line-clamp-2 leading-relaxed">{task.instructions}</div>}

          {/* Result preview */}
          {task.result && (
            <div className="mt-2 p-2 rounded-lg bg-white/5 border border-white/8 text-xs text-white/60 leading-relaxed max-h-24 overflow-y-auto">
              {task.result}
            </div>
          )}
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0 mt-0.5">
          <div className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${status.bg} ${status.color}`}>
            <StatusIcon className={`w-3 h-3 ${task.status === 'running' ? 'animate-spin' : ''}`} />
            {status.label}
          </div>
          {task.status !== 'running' && (
            <button onClick={() => onRun(task)} className="p-1.5 text-white/25 hover:text-cyan-400 transition-colors" title="Run task">
              <Play className="w-3.5 h-3.5" />
            </button>
          )}
          <button onClick={() => onDelete(task.id)} className="p-1.5 text-white/25 hover:text-red-400 transition-colors">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function NewTaskForm({ personas, activeTable, onAdd, onClose }) {
  const [form, setForm] = useState({
    title: '',
    type: 'data_cleaning',
    personaId: personas[0]?.id || '',
    personaName: personas[0]?.name || '',
    instructions: '',
  });

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handlePersonaChange = (id) => {
    const p = personas.find(p => p.id === id);
    set('personaId', id);
    set('personaName', p?.name || '');
  };

  return (
    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
      className="glass-card rounded-2xl border border-pink-400/20 p-5 mb-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-sm flex items-center gap-2"><ClipboardList className="w-4 h-4 text-pink-400" /> New Task</h3>
        <button onClick={onClose}><X className="w-4 h-4 text-white/40 hover:text-white/70" /></button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="md:col-span-2">
          <label className="text-xs text-white/40 mb-1 block">Task Title *</label>
          <input value={form.title} onChange={e => set('title', e.target.value)}
            placeholder='e.g. "Clean null values in revenue column"'
            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-pink-400/30" />
        </div>
        <div>
          <label className="text-xs text-white/40 mb-1 block">Task Type</label>
          <select value={form.type} onChange={e => set('type', e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-pink-400/30 text-foreground">
            {TASK_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-white/40 mb-1 block">Assign to Persona *</label>
          <select value={form.personaId} onChange={e => handlePersonaChange(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-pink-400/30 text-foreground">
            {personas.map(p => <option key={p.id} value={p.id}>{p.name} ({p.department})</option>)}
          </select>
        </div>
        <div className="md:col-span-2">
          <label className="text-xs text-white/40 mb-1 block">Instructions (optional)</label>
          <textarea value={form.instructions} onChange={e => set('instructions', e.target.value)}
            rows={2} placeholder="Describe exactly what the agent should do…"
            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-pink-400/30 resize-none" />
        </div>
      </div>
      <div className="flex gap-2 mt-4">
        <button onClick={() => onAdd(form)} disabled={!form.title || !form.personaId}
          className="flex items-center gap-1.5 px-4 py-2 bg-pink-400/15 border border-pink-400/25 text-pink-400 text-xs font-semibold rounded-xl hover:bg-pink-400/20 transition-all disabled:opacity-40">
          <Plus className="w-3.5 h-3.5" /> Add Task
        </button>
        <button onClick={onClose} className="px-4 py-2 text-xs text-white/40 hover:text-white/70 rounded-xl border border-white/8 hover:bg-white/5 transition-all">Cancel</button>
      </div>
    </motion.div>
  );
}

export default function TaskBoard({ personas, activeTable }) {
  const [tasks, setTasks] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [filterPersona, setFilterPersona] = useState('all');

  const addTask = (form) => {
    setTasks(prev => [...prev, { ...form, id: Date.now().toString(), status: 'pending', result: null, createdAt: new Date().toISOString() }]);
    setShowForm(false);
  };

  const runTask = async (task) => {
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: 'running', result: null } : t));
    try {
      const persona = personas.find(p => p.id === task.personaId);
      const prompt = buildPrompt(task, persona, activeTable);
      const res = await base44.functions.invoke('runMultiAgentAnalysis', {
        question: prompt,
        persona: persona || personas[0],
        tableContext: activeTable ? {
          name: activeTable.name,
          rowCount: activeTable.rowCount,
          columns: activeTable.columns?.slice(0, 20),
          rows: activeTable.rows?.slice(0, 50),
        } : null,
      });
      const result = res.data?.synthesis || res.data?.answer || 'Task completed.';
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: 'done', result } : t));
    } catch (e) {
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: 'error', result: e.message } : t));
    }
  };

  const deleteTask = (id) => setTasks(prev => prev.filter(t => t.id !== id));

  const filtered = filterPersona === 'all' ? tasks : tasks.filter(t => t.personaId === filterPersona);

  const counts = { all: tasks.length, pending: tasks.filter(t => t.status === 'pending').length, done: tasks.filter(t => t.status === 'done').length };

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total Tasks', value: counts.all, color: 'text-white/70' },
          { label: 'Pending', value: counts.pending, color: 'text-amber-400' },
          { label: 'Completed', value: counts.done, color: 'text-green-400' },
        ].map(s => (
          <div key={s.label} className="glass-card rounded-2xl p-4 border border-white/8 text-center">
            <div className={`text-2xl font-black font-mono ${s.color}`}>{s.value}</div>
            <div className="text-xs text-white/35 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xs text-white/30">Filter by persona:</span>
          <select value={filterPersona} onChange={e => setFilterPersona(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-xs text-foreground focus:outline-none">
            <option value="all">All Personas</option>
            {personas.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <button onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-1.5 px-4 py-2 bg-pink-400/10 border border-pink-400/20 text-pink-400 text-xs font-semibold rounded-xl hover:bg-pink-400/15 transition-all">
          <Plus className="w-3.5 h-3.5" /> New Task
        </button>
      </div>

      {/* Form */}
      <AnimatePresence>
        {showForm && <NewTaskForm personas={personas} activeTable={activeTable} onAdd={addTask} onClose={() => setShowForm(false)} />}
      </AnimatePresence>

      {/* Task list */}
      {filtered.length === 0 ? (
        <div className="text-center py-14 border border-white/5 rounded-2xl text-muted-foreground">
          <ClipboardList className="w-10 h-10 mx-auto mb-3 opacity-20" />
          <p className="text-sm mb-1">No tasks yet.</p>
          <p className="text-xs opacity-60">Assign data-cleaning or reporting tasks to your AI personas.</p>
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

      {/* Task type guide */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
        {TASK_TYPES.map(t => (
          <div key={t.id} className={`p-3 rounded-xl border ${t.border} ${t.bg} text-xs`}>
            <t.icon className={`w-4 h-4 ${t.color} mb-1.5`} />
            <div className="font-semibold mb-0.5">{t.label}</div>
            <div className="text-white/35 leading-relaxed">{t.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function buildPrompt(task, persona, activeTable) {
  const typeInstructions = {
    data_cleaning: `Perform a data cleaning analysis. Identify and describe: null values, formatting inconsistencies, duplicates, outliers, and data type issues. Suggest specific fixes for each issue found.`,
    reporting: `Generate a comprehensive structured business report. Include: executive summary, key metrics, trends, segment performance, anomalies, and top 3 recommended actions.`,
    anomaly_review: `Perform a thorough anomaly review. Identify all statistical outliers, unexpected patterns, sudden spikes or drops, and explain the likely business cause of each anomaly.`,
    insight_extraction: `Extract the top business insights from this dataset. Focus on: growth opportunities, risk indicators, performance drivers, and actionable patterns.`,
  };
  const base = typeInstructions[task.type] || task.instructions || 'Analyze the data.';
  const extra = task.instructions ? ` Additional instructions: ${task.instructions}` : '';
  return `${base}${extra} Dataset: ${activeTable?.name || 'unknown'} (${activeTable?.rowCount || 0} rows).`;
}