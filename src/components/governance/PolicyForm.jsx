import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Shield, Plus } from 'lucide-react';

const TYPES = ['masking', 'retention', 'access_control', 'quality_threshold', 'compliance'];
const ENFORCEMENTS = ['alert', 'block', 'mask', 'archive'];
const SEVERITIES = ['info', 'warning', 'critical'];
const FRAMEWORKS = ['', 'GDPR', 'HIPAA', 'SOC 2', 'ISO 27001'];

export default function PolicyForm({ onSubmit, onClose }) {
  const [form, setForm] = useState({
    name: '', description: '', policyType: 'quality_threshold',
    enforcement: 'alert', severity: 'warning', status: 'active',
    complianceFramework: '', ruleDefinition: { maxNullPct: 10 },
  });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }}
        className="w-full max-w-md glass-card rounded-2xl border border-white/10 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/8">
          <div className="flex items-center gap-2"><Shield className="w-5 h-5 text-green-400" /><span className="font-bold">New Policy</span></div>
          <button onClick={onClose} className="p-1.5 text-white/40 hover:text-white/70 rounded-lg hover:bg-white/5"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5 space-y-3 max-h-[70vh] overflow-y-auto">
          <div><label className="text-xs text-white/40 mb-1 block">Policy Name</label>
            <input value={form.name} onChange={e => set('name', e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-green-400/40" placeholder="e.g. PII Masking Rule" /></div>
          <div><label className="text-xs text-white/40 mb-1 block">Description</label>
            <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={2} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-green-400/40 resize-none" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs text-white/40 mb-1 block">Policy Type</label>
              <select value={form.policyType} onChange={e => set('policyType', e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-green-400/40">
                {TYPES.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
            <div><label className="text-xs text-white/40 mb-1 block">Severity</label>
              <select value={form.severity} onChange={e => set('severity', e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-green-400/40">
                {SEVERITIES.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs text-white/40 mb-1 block">Enforcement</label>
              <select value={form.enforcement} onChange={e => set('enforcement', e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-green-400/40">
                {ENFORCEMENTS.map(e => <option key={e} value={e}>{e}</option>)}</select></div>
            <div><label className="text-xs text-white/40 mb-1 block">Framework</label>
              <select value={form.complianceFramework} onChange={e => set('complianceFramework', e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-green-400/40">
                {FRAMEWORKS.map(f => <option key={f} value={f}>{f || 'None'}</option>)}</select></div>
          </div>
          {form.policyType === 'quality_threshold' && (
            <div><label className="text-xs text-white/40 mb-1 block">Max Null Rate (%)</label>
              <input type="number" value={form.ruleDefinition?.maxNullPct || 10} onChange={e => set('ruleDefinition', { ...form.ruleDefinition, maxNullPct: Number(e.target.value) })}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-green-400/40" /></div>
          )}
        </div>
        <div className="px-5 py-4 border-t border-white/8 flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-xs text-white/40 hover:text-white/70 rounded-xl hover:bg-white/5">Cancel</button>
          <button onClick={() => onSubmit(form)} disabled={!form.name}
            className="flex items-center gap-1.5 px-5 py-2 bg-green-400 text-xs font-bold rounded-xl hover:bg-green-300 transition-all disabled:opacity-40"
            style={{ color: 'hsl(222,47%,6%)' }}>
            <Plus className="w-3.5 h-3.5" /> Create Policy
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}