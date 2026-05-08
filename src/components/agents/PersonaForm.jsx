import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Users, Plus } from 'lucide-react';

const COLORS = ['#00e5ff', '#ff2d7a', '#7b2fff', '#ff6b35', '#4caf50', '#ffcc02', '#00bfa5', '#e91e63'];
const MODES = ['exploratory', 'diagnostic', 'predictive', 'prescriptive'];
const DEPARTMENTS = ['Finance', 'Marketing', 'Operations', 'Sales', 'HR', 'Product', 'Engineering', 'Executive'];

export default function PersonaForm({ onSubmit, onClose }) {
  const [form, setForm] = useState({
    name: '', department: 'Finance', role: '', personality: 'professional and analytical',
    systemInstructions: '', focusMetrics: [], defaultMode: 'exploratory', avatarColor: COLORS[0],
  });
  const [metricInput, setMetricInput] = useState('');
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const addMetric = () => {
    if (metricInput.trim()) {
      set('focusMetrics', [...form.focusMetrics, metricInput.trim()]);
      setMetricInput('');
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }}
        className="w-full max-w-md glass-card rounded-2xl border border-white/10 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/8">
          <div className="flex items-center gap-2"><Users className="w-5 h-5 text-pink-400" /><span className="font-bold">Custom Agent Persona</span></div>
          <button onClick={onClose} className="p-1.5 text-white/40 hover:text-white/70 rounded-lg hover:bg-white/5"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5 space-y-3 max-h-[70vh] overflow-y-auto">
          <div><label className="text-xs text-white/40 mb-1 block">Persona Name</label>
            <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Sales Analyst" className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-pink-400/40" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs text-white/40 mb-1 block">Department</label>
              <select value={form.department} onChange={e => set('department', e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-pink-400/40">
                {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}</select></div>
            <div><label className="text-xs text-white/40 mb-1 block">Role</label>
              <input value={form.role} onChange={e => set('role', e.target.value)} placeholder="e.g. Sales Director" className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-pink-400/40" /></div>
          </div>
          <div><label className="text-xs text-white/40 mb-1 block">Personality / Tone</label>
            <input value={form.personality} onChange={e => set('personality', e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-pink-400/40" /></div>
          <div><label className="text-xs text-white/40 mb-1 block">System Instructions</label>
            <textarea value={form.systemInstructions} onChange={e => set('systemInstructions', e.target.value)} rows={3} placeholder="What should this agent focus on?" className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-pink-400/40 resize-none" /></div>
          <div><label className="text-xs text-white/40 mb-1 block">Default Analysis Mode</label>
            <select value={form.defaultMode} onChange={e => set('defaultMode', e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-pink-400/40">
              {MODES.map(m => <option key={m} value={m}>{m}</option>)}</select></div>
          <div>
            <label className="text-xs text-white/40 mb-1 block">Focus Metrics</label>
            <div className="flex gap-2 mb-2">
              <input value={metricInput} onChange={e => setMetricInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && addMetric()} placeholder="e.g. revenue" className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-pink-400/40" />
              <button onClick={addMetric} className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs hover:bg-white/10 transition-all">+</button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {form.focusMetrics.map(m => (
                <span key={m} onClick={() => set('focusMetrics', form.focusMetrics.filter(x => x !== m))} className="text-xs px-2 py-0.5 bg-pink-400/10 border border-pink-400/20 text-pink-400 rounded-full cursor-pointer hover:bg-red-400/10 hover:text-red-400 transition-all">{m} ×</span>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs text-white/40 mb-1.5 block">Avatar Color</label>
            <div className="flex gap-2">{COLORS.map(c => (
              <button key={c} onClick={() => set('avatarColor', c)} className="w-6 h-6 rounded-full border-2 transition-all" style={{ background: c, borderColor: form.avatarColor === c ? 'white' : 'transparent' }} />
            ))}</div>
          </div>
        </div>
        <div className="px-5 py-4 border-t border-white/8 flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-xs text-white/40 hover:text-white/70 rounded-xl hover:bg-white/5">Cancel</button>
          <button onClick={() => onSubmit(form)} disabled={!form.name || !form.role}
            className="flex items-center gap-1.5 px-5 py-2 bg-pink-400 text-xs font-bold rounded-xl hover:bg-pink-300 transition-all disabled:opacity-40"
            style={{ color: 'hsl(222,47%,6%)' }}>
            <Plus className="w-3.5 h-3.5" /> Save Persona
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}