import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Save, Loader2, CheckSquare, Square } from 'lucide-react';

const ALL_SECTIONS = [
  { id: 'cover',          label: 'Cover Page',                   chapter: 'Front Matter' },
  { id: 'declaration',    label: 'Declaration',                  chapter: 'Front Matter' },
  { id: 'acknowledgement',label: 'Acknowledgement',              chapter: 'Front Matter' },
  { id: 'abstract',       label: 'Abstract',                     chapter: 'Front Matter' },
  { id: 'toc',            label: 'Table of Contents',            chapter: 'Front Matter' },
  { id: 'abbreviations',  label: 'List of Abbreviations',        chapter: 'Front Matter' },
  { id: 'ch1',  label: 'Chapter 1 — Introduction',               chapter: 'Chapters' },
  { id: 'ch2',  label: 'Chapter 2 — Literature Review',          chapter: 'Chapters' },
  { id: 'ch3',  label: 'Chapter 3 — System Analysis',            chapter: 'Chapters' },
  { id: 'ch4',  label: 'Chapter 4 — System Architecture',        chapter: 'Chapters' },
  { id: 'ch5',  label: 'Chapter 5 — System Design',              chapter: 'Chapters' },
  { id: 'ch6',  label: 'Chapter 6 — Module Description',         chapter: 'Chapters' },
  { id: 'ch7',  label: 'Chapter 7 — Data Engineering Pipeline',  chapter: 'Chapters' },
  { id: 'ch8',  label: 'Chapter 8 — Semantic Metrics Layer',     chapter: 'Chapters' },
  { id: 'ch9',  label: 'Chapter 9 — SQL Analytics Engine',       chapter: 'Chapters' },
  { id: 'ch10', label: 'Chapter 10 — AI & Machine Learning',     chapter: 'Chapters' },
  { id: 'ch11', label: 'Chapter 11 — AI Agent Architecture',     chapter: 'Chapters' },
  { id: 'ch12', label: 'Chapter 12 — Visualization & Dashboards',chapter: 'Chapters' },
  { id: 'ch13', label: 'Chapter 13 — Admin Portal',              chapter: 'Chapters' },
  { id: 'ch14', label: 'Chapter 14 — PDF Export Implementation', chapter: 'Chapters' },
  { id: 'ch15', label: 'Chapter 15 — Testing & Validation',      chapter: 'Chapters' },
  { id: 'ch16', label: 'Chapter 16 — Results & Output Screens',  chapter: 'Chapters' },
  { id: 'ch17', label: 'Chapter 17 — Business Impact',           chapter: 'Chapters' },
  { id: 'ch18', label: 'Chapter 18 — Limitations',               chapter: 'Chapters' },
  { id: 'ch19', label: 'Chapter 19 — Future Enhancements',       chapter: 'Chapters' },
  { id: 'ch20', label: 'Chapter 20 — Conclusion',                chapter: 'Chapters' },
  { id: 'ch21', label: 'Chapter 21 — References',                chapter: 'Chapters' },
];

export default function DocSectionSelector({ config, onSaved }) {
  const [selected, setSelected] = useState(new Set(config?.selectedSections || ALL_SECTIONS.map(s => s.id)));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const toggle = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelected(new Set(ALL_SECTIONS.map(s => s.id)));
  const clearAll = () => setSelected(new Set());

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await base44.entities.ProjectDocumentConfig.update(config.id, {
        selectedSections: Array.from(selected),
        updatedAt: new Date().toISOString(),
      });
      onSaved(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) { console.error(e); }
    setSaving(false);
  };

  const groups = [...new Set(ALL_SECTIONS.map(s => s.chapter))];

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold">Section Selector</h2>
          <p className="text-sm text-white/40 mt-0.5">Choose which chapters and sections to include in the generated PDF.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-white/30">{selected.size}/{ALL_SECTIONS.length} selected</span>
          <button onClick={selectAll} className="px-3 py-1.5 text-xs bg-white/5 border border-white/10 rounded-lg text-white/50 hover:text-cyan-400 transition-all">All</button>
          <button onClick={clearAll} className="px-3 py-1.5 text-xs bg-white/5 border border-white/10 rounded-lg text-white/50 hover:text-red-400 transition-all">None</button>
          <button onClick={handleSave} disabled={saving || !config?.id}
            className="flex items-center gap-2 px-4 py-2 bg-cyan-400/15 border border-cyan-400/30 text-cyan-400 rounded-xl text-sm font-bold hover:bg-cyan-400/25 transition-all disabled:opacity-40">
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            {saved ? 'Saved!' : 'Save'}
          </button>
        </div>
      </div>

      {groups.map(group => (
        <div key={group} className="glass-card rounded-2xl border border-white/8 p-5 space-y-3">
          <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-widest">{group}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {ALL_SECTIONS.filter(s => s.chapter === group).map(s => (
              <button key={s.id} onClick={() => toggle(s.id)}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left text-sm transition-all border ${selected.has(s.id) ? 'bg-cyan-400/8 border-cyan-400/25 text-white/90' : 'bg-white/2 border-white/8 text-white/40 hover:text-white/70'}`}>
                {selected.has(s.id)
                  ? <CheckSquare className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                  : <Square className="w-4 h-4 flex-shrink-0" />}
                {s.label}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}