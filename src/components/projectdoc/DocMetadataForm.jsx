import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Save, Loader2, Plus, X } from 'lucide-react';

export default function DocMetadataForm({ config, onSaved }) {
  const [form, setForm] = useState({
    projectTitle: config?.projectTitle || 'OmniData AI Analytics Studio',
    subtitle: config?.subtitle || 'AI-Powered Full-Stack Analytics and Decision Intelligence Platform',
    authorName: config?.authorName || '',
    organization: config?.organization || '',
    university: config?.university || '',
    program: config?.program || '',
    course: config?.course || '',
    professorName: config?.professorName || '',
    semester: config?.semester || '',
    version: config?.version || '1.0',
    appUrl: config?.appUrl || '',
    githubUrl: config?.githubUrl || '',
    logoUrl: config?.logoUrl || '',
    abstract: config?.abstract || '',
    confidentialityNote: config?.confidentialityNote || 'This document is intended for academic and review purposes only.',
    acknowledgementText: config?.acknowledgementText || '',
    keywords: config?.keywords || ['AI Analytics', 'Business Intelligence', 'Machine Learning', 'AI Agents', 'Decision Intelligence'],
    pageFormat: config?.pageFormat || 'A4',
    fontFamily: config?.fontFamily || 'Helvetica',
    lineSpacing: config?.lineSpacing || 1.15,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [newKeyword, setNewKeyword] = useState('');

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const data = { ...form, updatedAt: new Date().toISOString() };
      let updated;
      if (config?.id) {
        updated = await base44.entities.ProjectDocumentConfig.update(config.id, data);
      } else {
        updated = await base44.entities.ProjectDocumentConfig.create(data);
      }
      onSaved(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      console.error(e);
    }
    setSaving(false);
  };

  const addKeyword = () => {
    if (newKeyword.trim() && !form.keywords.includes(newKeyword.trim())) {
      set('keywords', [...form.keywords, newKeyword.trim()]);
      setNewKeyword('');
    }
  };

  const removeKeyword = (kw) => set('keywords', form.keywords.filter(k => k !== kw));

  const Field = ({ label, field, textarea = false, placeholder = '', type = 'text' }) => (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold text-white/50 uppercase tracking-wider">{label}</label>
      {textarea ? (
        <textarea value={form[field]} onChange={e => set(field, e.target.value)}
          placeholder={placeholder} rows={4}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white/80 placeholder:text-white/20 focus:outline-none focus:border-cyan-400/40 resize-none" />
      ) : (
        <input type={type} value={form[field]} onChange={e => set(field, e.target.value)}
          placeholder={placeholder}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white/80 placeholder:text-white/20 focus:outline-none focus:border-cyan-400/40" />
      )}
    </div>
  );

  return (
    <div className="max-w-4xl space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold">Project Metadata</h2>
          <p className="text-sm text-white/40 mt-0.5">Configure the project identification information for the document cover and headers.</p>
        </div>
        <button onClick={handleSave} disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 bg-cyan-400/15 border border-cyan-400/30 text-cyan-400 rounded-xl text-sm font-bold hover:bg-cyan-400/25 transition-all disabled:opacity-40">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saved ? 'Saved!' : 'Save Configuration'}
        </button>
      </div>

      {/* Document Identity */}
      <section className="glass-card rounded-2xl border border-white/8 p-6 space-y-4">
        <h3 className="text-sm font-bold text-cyan-400 uppercase tracking-widest">Document Identity</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2"><Field label="Project Title *" field="projectTitle" placeholder="OmniData AI Analytics Studio" /></div>
          <div className="md:col-span-2"><Field label="Subtitle" field="subtitle" placeholder="AI-Powered Full-Stack Analytics and Decision Intelligence Platform" /></div>
        </div>
      </section>

      {/* Academic / Organization Info */}
      <section className="glass-card rounded-2xl border border-white/8 p-6 space-y-4">
        <h3 className="text-sm font-bold text-cyan-400 uppercase tracking-widest">Academic / Organization Info</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Author Name *" field="authorName" placeholder="Your Full Name" />
          <Field label="Organization / Company" field="organization" placeholder="Organization Name" />
          <Field label="University / Institution" field="university" placeholder="University / College Name" />
          <Field label="Program Name" field="program" placeholder="e.g., MS Computer Science" />
          <Field label="Course Name" field="course" placeholder="e.g., Capstone Project / Thesis" />
          <Field label="Professor / Mentor" field="professorName" placeholder="Prof. Name" />
          <Field label="Semester / Term" field="semester" placeholder="e.g., Spring 2026" />
          <Field label="Version" field="version" placeholder="1.0" />
        </div>
      </section>

      {/* Links */}
      <section className="glass-card rounded-2xl border border-white/8 p-6 space-y-4">
        <h3 className="text-sm font-bold text-cyan-400 uppercase tracking-widest">Links & Assets</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Application URL" field="appUrl" placeholder="https://..." />
          <Field label="GitHub URL (Optional)" field="githubUrl" placeholder="https://github.com/..." />
          <div className="md:col-span-2"><Field label="Logo URL (Optional)" field="logoUrl" placeholder="https://... (public image URL)" /></div>
        </div>
      </section>

      {/* Abstract & Keywords */}
      <section className="glass-card rounded-2xl border border-white/8 p-6 space-y-4">
        <h3 className="text-sm font-bold text-cyan-400 uppercase tracking-widest">Abstract & Keywords</h3>
        <Field label="Abstract (250–400 words recommended)" field="abstract" textarea placeholder="Describe the project: problem, solution, technology, business value, AI/ML contribution, impact..." />
        <div className="space-y-2">
          <label className="text-xs font-semibold text-white/50 uppercase tracking-wider">Keywords</label>
          <div className="flex flex-wrap gap-2 mb-2">
            {form.keywords.map(kw => (
              <span key={kw} className="flex items-center gap-1.5 px-3 py-1 bg-cyan-400/10 border border-cyan-400/20 text-cyan-400 rounded-full text-xs">
                {kw}
                <button onClick={() => removeKeyword(kw)} className="hover:text-red-400 transition-colors"><X className="w-3 h-3" /></button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input value={newKeyword} onChange={e => setNewKeyword(e.target.value)} onKeyDown={e => e.key === 'Enter' && addKeyword()}
              placeholder="Add keyword..." className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white/80 placeholder:text-white/20 focus:outline-none focus:border-cyan-400/40" />
            <button onClick={addKeyword} className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white/50 hover:text-cyan-400 hover:border-cyan-400/30 transition-all">
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* Document Settings */}
      <section className="glass-card rounded-2xl border border-white/8 p-6 space-y-4">
        <h3 className="text-sm font-bold text-cyan-400 uppercase tracking-widest">Document Settings</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-white/50 uppercase tracking-wider">Page Format</label>
            <select value={form.pageFormat} onChange={e => set('pageFormat', e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white/80 focus:outline-none focus:border-cyan-400/40">
              <option value="A4">A4 (International)</option>
              <option value="Letter">Letter (US)</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-white/50 uppercase tracking-wider">Font Family</label>
            <select value={form.fontFamily} onChange={e => set('fontFamily', e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white/80 focus:outline-none focus:border-cyan-400/40">
              <option value="Helvetica">Helvetica / Arial</option>
              <option value="Times">Times New Roman</option>
              <option value="Courier">Courier (Mono)</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-white/50 uppercase tracking-wider">Line Spacing</label>
            <select value={form.lineSpacing} onChange={e => set('lineSpacing', parseFloat(e.target.value))}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white/80 focus:outline-none focus:border-cyan-400/40">
              <option value="1.15">1.15 (Compact)</option>
              <option value="1.25">1.25 (Standard)</option>
              <option value="1.5">1.5 (Spacious)</option>
            </select>
          </div>
        </div>
      </section>

      {/* Acknowledgement & Confidentiality */}
      <section className="glass-card rounded-2xl border border-white/8 p-6 space-y-4">
        <h3 className="text-sm font-bold text-cyan-400 uppercase tracking-widest">Acknowledgement & Confidentiality</h3>
        <Field label="Acknowledgement Text" field="acknowledgementText" textarea placeholder="Thank professors, mentors, team members..." />
        <Field label="Confidentiality Note" field="confidentialityNote" placeholder="This document is intended for academic and review purposes only." />
      </section>

      <div className="flex justify-end">
        <button onClick={handleSave} disabled={saving}
          className="flex items-center gap-2 px-6 py-3 bg-cyan-400/15 border border-cyan-400/30 text-cyan-400 rounded-xl font-bold hover:bg-cyan-400/25 transition-all disabled:opacity-40">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saved ? 'Saved!' : 'Save Configuration'}
        </button>
      </div>
    </div>
  );
}