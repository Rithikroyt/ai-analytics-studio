import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import {
  Target, CheckCircle2, AlertTriangle, Loader2, ChevronLeft,
  TrendingUp, Zap, Plus, Trash2, X
} from 'lucide-react';
import { Link } from 'react-router-dom';

const PRIORITY_COLORS = {
  critical: 'bg-red-400/10 border-red-400/25 text-red-400',
  high: 'bg-orange-400/10 border-orange-400/25 text-orange-400',
  medium: 'bg-yellow-400/10 border-yellow-400/25 text-yellow-400',
  low: 'bg-blue-400/10 border-blue-400/25 text-blue-400',
};

export default function ActionBoard() {
  const [actions, setActions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    recommendation: '',
    priority: 'high',
    expectedImpact: 0.8,
    effort: 0.5,
    confidence: 0.75,
  });

  useEffect(() => {
    fetchActions();
  }, []);

  const fetchActions = async () => {
    setLoading(true);
    const data = await base44.entities.ActionItem.list('-priorityScore', 50);
    setActions(data);
    setLoading(false);
  };

  const calculatePriorityScore = (impact, effort, confidence) => {
    return (impact * confidence) / effort;
  };

  const handleCreate = async () => {
    if (!form.recommendation) return;
    const priorityScore = calculatePriorityScore(form.expectedImpact, form.effort, form.confidence);
    await base44.entities.ActionItem.create({
      ...form,
      priorityScore,
    });
    setForm({
      recommendation: '',
      priority: 'high',
      expectedImpact: 0.8,
      effort: 0.5,
      confidence: 0.75,
    });
    setShowForm(false);
    fetchActions();
  };

  const handleDelete = async (id) => {
    await base44.entities.ActionItem.delete(id);
    fetchActions();
  };

  const handleStatusChange = async (id, newStatus) => {
    await base44.entities.ActionItem.update(id, { status: newStatus });
    fetchActions();
  };

  const sorted = [...actions].sort((a, b) => (b.priorityScore || 0) - (a.priorityScore || 0));

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-white/5 px-6 py-4 sticky top-0 z-10 bg-background/95 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link to="/workspace" className="p-1.5 rounded-lg text-white/40 hover:text-white/80 hover:bg-white/5 transition-all">
              <ChevronLeft className="w-4 h-4" />
            </Link>
            <div className="w-9 h-9 rounded-xl bg-red-400/10 border border-red-400/20 flex items-center justify-center">
              <Target className="w-4 h-4 text-red-400" />
            </div>
            <div>
              <h1 className="text-lg font-bold">Executive Action Board</h1>
              <p className="text-xs text-muted-foreground">Priority-scored recommendations</p>
            </div>
          </div>
          <button onClick={() => setShowForm(v => !v)}
            className="flex items-center gap-1.5 px-3 py-2 bg-red-400/10 border border-red-400/20 text-red-400 rounded-xl text-xs font-semibold hover:bg-red-400/15 transition-all">
            <Plus className="w-3.5 h-3.5" /> New Action
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-6 space-y-6">
        {/* Create form */}
        {showForm && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
            className="glass-card rounded-2xl p-5 border border-red-400/20 space-y-4">
            <textarea value={form.recommendation} onChange={e => setForm(f => ({ ...f, recommendation: e.target.value }))}
              placeholder="Recommendation..." rows={2}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none text-foreground resize-none" />

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
                className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none text-foreground">
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>

              <div>
                <label className="text-xs text-white/40 block mb-1">Impact (0-1)</label>
                <input type="number" min="0" max="1" step="0.1" value={form.expectedImpact}
                  onChange={e => setForm(f => ({ ...f, expectedImpact: Number(e.target.value) }))}
                  className="w-full px-2 py-2 bg-white/5 border border-white/10 rounded-lg text-sm focus:outline-none text-foreground" />
              </div>

              <div>
                <label className="text-xs text-white/40 block mb-1">Effort (0-1)</label>
                <input type="number" min="0" max="1" step="0.1" value={form.effort}
                  onChange={e => setForm(f => ({ ...f, effort: Number(e.target.value) }))}
                  className="w-full px-2 py-2 bg-white/5 border border-white/10 rounded-lg text-sm focus:outline-none text-foreground" />
              </div>

              <div>
                <label className="text-xs text-white/40 block mb-1">Confidence (0-1)</label>
                <input type="number" min="0" max="1" step="0.1" value={form.confidence}
                  onChange={e => setForm(f => ({ ...f, confidence: Number(e.target.value) }))}
                  className="w-full px-2 py-2 bg-white/5 border border-white/10 rounded-lg text-sm focus:outline-none text-foreground" />
              </div>
            </div>

            <div className="flex gap-2">
              <button onClick={handleCreate}
                className="flex items-center gap-1.5 px-4 py-2 bg-red-400/15 border border-red-400/25 text-red-400 rounded-xl text-xs font-semibold hover:bg-red-400/20 transition-all">
                <CheckCircle2 className="w-3.5 h-3.5" /> Create Action
              </button>
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-white/40 text-xs rounded-lg border border-white/8 hover:bg-white/5">Cancel</button>
            </div>
          </motion.div>
        )}

        {/* Actions grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 text-red-400 animate-spin" /></div>
        ) : sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center border border-white/5 rounded-2xl">
            <Target className="w-12 h-12 text-white/15 mb-4" />
            <h3 className="font-semibold mb-1">No actions yet</h3>
            <p className="text-sm text-muted-foreground max-w-xs">Add recommendations to your action board.</p>
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {sorted.map((action, i) => (
                <motion.div key={action.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }}
                  className={`rounded-2xl p-5 border transition-all ${PRIORITY_COLORS[action.priority]}`}>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex-1">
                      <div className="font-semibold text-sm">{action.recommendation}</div>
                      <div className="text-xs text-white/50 mt-1">{action.notes}</div>
                    </div>
                    <button onClick={() => handleDelete(action.id)}
                      className="p-1.5 rounded-lg text-white/30 hover:text-red-400 hover:bg-red-400/10 transition-all">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-4 gap-2 mb-3">
                    <div className="text-center p-2 rounded-lg bg-white/5">
                      <div className="text-xs text-white/40">Score</div>
                      <div className="text-lg font-bold">{(action.priorityScore || 0).toFixed(2)}</div>
                    </div>
                    <div className="text-center p-2 rounded-lg bg-white/5">
                      <div className="text-xs text-white/40">Impact</div>
                      <div className="text-lg font-bold">{(action.expectedImpact * 100).toFixed(0)}%</div>
                    </div>
                    <div className="text-center p-2 rounded-lg bg-white/5">
                      <div className="text-xs text-white/40">Effort</div>
                      <div className="text-lg font-bold">{(action.effort * 100).toFixed(0)}%</div>
                    </div>
                    <div className="text-center p-2 rounded-lg bg-white/5">
                      <div className="text-xs text-white/40">Confidence</div>
                      <div className="text-lg font-bold">{(action.confidence * 100).toFixed(0)}%</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <select value={action.status} onChange={e => handleStatusChange(action.id, e.target.value)}
                      className="flex-1 px-2 py-1 bg-white/5 border border-white/8 rounded-lg text-xs focus:outline-none text-foreground capitalize">
                      <option value="open">Open</option>
                      <option value="in_progress">In Progress</option>
                      <option value="done">Done</option>
                      <option value="dismissed">Dismissed</option>
                    </select>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* Impact-Effort matrix info */}
        <div className="p-4 glass rounded-xl border border-white/5 text-xs text-muted-foreground space-y-2">
          <div className="font-semibold text-white/60">Priority Score Formula</div>
          <code className="font-mono text-white/40 block">
            PriorityScore = (ExpectedImpact × Confidence) / Effort
          </code>
          <p>Actions sorted by priority score. High impact + low effort = highest priority.</p>
        </div>
      </div>
    </div>
  );
}