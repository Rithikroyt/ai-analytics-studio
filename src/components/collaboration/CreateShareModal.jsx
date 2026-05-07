import { useState } from 'react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { X, Plus, Trash2, Globe, Lock, Users, Share2, Loader2 } from 'lucide-react';

const REPORT_TYPES = [
  { id: 'executive', label: 'Executive Summary', icon: '📄' },
  { id: 'board', label: 'Board Memo', icon: '🏛️' },
  { id: 'kpi_trend', label: 'KPI & Trends', icon: '📈' },
  { id: 'anomaly', label: 'Anomaly Report', icon: '⚠️' },
  { id: 'forecast', label: 'Forecast', icon: '🔮' },
  { id: 'quality', label: 'Quality Audit', icon: '🔍' },
  { id: 'feedback', label: 'Feedback Insights', icon: '💬' },
  { id: 'custom', label: 'Custom Report', icon: '📊' },
];

export default function CreateShareModal({ onClose, onCreated, currentUser }) {
  const [form, setForm] = useState({
    title: '',
    description: '',
    reportType: 'executive',
    content: '',
    accessLevel: 'comment',
    isPublic: false,
    invitedEmails: [],
  });
  const [emailInput, setEmailInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const addEmail = () => {
    const e = emailInput.trim().toLowerCase();
    if (!e || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) { setError('Enter a valid email'); return; }
    if (form.invitedEmails.includes(e)) { setError('Already added'); return; }
    setForm(f => ({ ...f, invitedEmails: [...f.invitedEmails, e] }));
    setEmailInput('');
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) { setError('Title is required'); return; }
    setSaving(true);
    const shareToken = Math.random().toString(36).slice(2) + Date.now().toString(36);
    await base44.entities.SharedReport.create({ ...form, shareToken });
    setSaving(false);
    onCreated();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.96, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96, y: 16 }}
        className="w-full max-w-lg glass-card rounded-2xl border border-white/10 shadow-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/8">
          <div className="flex items-center gap-2">
            <Share2 className="w-4 h-4 text-cyan-400" />
            <h2 className="font-bold text-base">Share Report</h2>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg hover:bg-white/10 flex items-center justify-center text-white/40 hover:text-white/80 transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Title */}
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">Report Title *</label>
            <input
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="Q3 Revenue Analysis…"
              className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-cyan-400/30 text-foreground"
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">Description</label>
            <textarea
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Brief context for collaborators…"
              rows={2}
              className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-cyan-400/30 text-foreground resize-none"
            />
          </div>

          {/* Report type */}
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">Report Type</label>
            <div className="grid grid-cols-4 gap-1.5">
              {REPORT_TYPES.map(t => (
                <button key={t.id} type="button" onClick={() => setForm(f => ({ ...f, reportType: t.id }))}
                  className={`flex flex-col items-center gap-1 p-2 rounded-xl border text-xs transition-all ${form.reportType === t.id ? 'border-cyan-400/30 bg-cyan-400/10 text-cyan-400' : 'border-white/8 bg-white/3 text-white/40 hover:border-white/20'}`}>
                  <span className="text-lg">{t.icon}</span>
                  <span className="leading-tight text-center" style={{ fontSize: 9 }}>{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Report content */}
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">Report Content <span className="text-white/25">(optional)</span></label>
            <textarea
              value={form.content}
              onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
              placeholder="Paste report text, key findings, or insights here…"
              rows={4}
              className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs font-mono focus:outline-none focus:border-cyan-400/30 text-foreground resize-none"
            />
          </div>

          {/* Access level + visibility */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Access Level</label>
              <select value={form.accessLevel} onChange={e => setForm(f => ({ ...f, accessLevel: e.target.value }))}
                className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none text-foreground">
                <option value="view">View only</option>
                <option value="comment">Can comment</option>
                <option value="edit">Can edit</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Visibility</label>
              <div className="flex gap-2">
                {[
                  { val: false, icon: Lock, label: 'Private' },
                  { val: true, icon: Globe, label: 'Public' },
                ].map(opt => (
                  <button key={String(opt.val)} type="button"
                    onClick={() => setForm(f => ({ ...f, isPublic: opt.val }))}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border text-xs font-medium transition-all ${form.isPublic === opt.val ? 'border-cyan-400/30 bg-cyan-400/10 text-cyan-400' : 'border-white/10 bg-white/3 text-white/40 hover:border-white/20'}`}>
                    <opt.icon className="w-3 h-3" /> {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Invite emails */}
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block flex items-center gap-1.5">
              <Users className="w-3 h-3 text-teal-400" /> Invite Team Members
            </label>
            <div className="flex gap-2">
              <input
                value={emailInput}
                onChange={e => { setEmailInput(e.target.value); setError(''); }}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addEmail())}
                placeholder="colleague@company.com"
                className="flex-1 px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-teal-400/30 text-foreground"
              />
              <button type="button" onClick={addEmail}
                className="px-3 py-2.5 bg-teal-400/10 border border-teal-400/20 text-teal-400 rounded-xl text-sm hover:bg-teal-400/15 transition-colors">
                <Plus className="w-4 h-4" />
              </button>
            </div>
            {form.invitedEmails.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {form.invitedEmails.map(email => (
                  <span key={email} className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-teal-400/10 border border-teal-400/20 text-teal-400">
                    {email}
                    <button type="button" onClick={() => setForm(f => ({ ...f, invitedEmails: f.invitedEmails.filter(e => e !== email) }))}>
                      <X className="w-3 h-3 hover:text-red-400 transition-colors" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-white/10 text-sm text-white/50 hover:text-white/80 hover:bg-white/5 transition-all">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-cyan-400 rounded-xl font-bold text-sm disabled:opacity-50 hover:bg-cyan-300 transition-all"
              style={{ color: 'hsl(222,47%,6%)' }}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4" />}
              {saving ? 'Sharing…' : 'Share Report'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}