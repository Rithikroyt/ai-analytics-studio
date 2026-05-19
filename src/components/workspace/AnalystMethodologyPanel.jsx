/**
 * Analyst Methodology Panel — Documentation & Reproducibility
 * Records: dataset, cleaning, SQL, assumptions, limitations, chart logic, recommendation
 */
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWorkspaceStore } from '@/lib/store';
import { FileText, Plus, ChevronDown, ChevronRight, Copy, Download, CheckCircle2, BookOpen, Trash2 } from 'lucide-react';

const STEP_TYPES = [
  { id: 'dataset', label: 'Dataset Used', color: 'text-cyan-400', placeholder: 'Source, size, columns, date range…' },
  { id: 'cleaning', label: 'Cleaning Steps', color: 'text-green-400', placeholder: 'Removed duplicates, imputed nulls in revenue, standardized date format…' },
  { id: 'sql', label: 'SQL / Transformation', color: 'text-purple-400', placeholder: 'SELECT region, SUM(revenue) FROM …', mono: true },
  { id: 'metrics', label: 'Metric Definitions', color: 'text-amber-400', placeholder: 'Revenue = SUM(net_amount), Retention = Returning Users / Cohort Size…' },
  { id: 'assumptions', label: 'Assumptions', color: 'text-yellow-400', placeholder: 'Assumed January data is complete. Excluded refunds from revenue calc…' },
  { id: 'limitations', label: 'Limitations', color: 'text-red-400', placeholder: 'Missing Q4 data. Sample size < 1000 for segment analysis…' },
  { id: 'chart', label: 'Chart / Visual Logic', color: 'text-teal-400', placeholder: 'Bar chart sorted by revenue DESC, top 10 regions only…' },
  { id: 'recommendation', label: 'Final Recommendation', color: 'text-green-400', placeholder: 'Based on analysis, recommend focusing on Region A where ROI is 2.4×…' },
];

export default function AnalystMethodologyPanel() {
  const { getActiveTable, analystMemory } = useWorkspaceStore();
  const table = getActiveTable();
  const [notes, setNotes] = useState({});
  const [expanded, setExpanded] = useState({ dataset: true });
  const [saved, setSaved] = useState(false);
  const [analysisTitle, setAnalysisTitle] = useState('');

  const toggle = (id) => setExpanded(p => ({ ...p, [id]: !p[id] }));
  const update = (id, val) => setNotes(p => ({ ...p, [id]: val }));

  const filled = Object.values(notes).filter(v => v?.trim()).length;
  const total = STEP_TYPES.length;

  const exportMethodology = () => {
    const lines = [
      `# Analysis Methodology`,
      `**Title:** ${analysisTitle || 'Untitled Analysis'}`,
      `**Dataset:** ${table?.name || 'Unknown'}`,
      `**Rows:** ${(table?.rows?.length || 0).toLocaleString()}`,
      `**Exported:** ${new Date().toLocaleString()}`,
      `---`,
      ...STEP_TYPES.map(s => notes[s.id]?.trim() ? `## ${s.label}\n${notes[s.id]}` : null).filter(Boolean),
    ];
    const blob = new Blob([lines.join('\n\n')], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(analysisTitle || 'analysis').replace(/\s+/g, '_')}_methodology.md`;
    a.click();
  };

  const copyAll = () => {
    const text = STEP_TYPES.map(s => notes[s.id]?.trim() ? `[${s.label}]\n${notes[s.id]}` : null).filter(Boolean).join('\n\n');
    navigator.clipboard.writeText(text);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  // Auto-populate from analyst memory
  const autofill = () => {
    const insights = analystMemory?.sessionInsights || [];
    if (!insights.length) return;
    const latest = insights[0];
    setNotes(p => ({
      ...p,
      dataset: p.dataset || (table ? `${table.name} — ${(table.rows?.length || 0).toLocaleString()} rows, ${(table.columns?.length || 0)} columns` : ''),
      sql: p.sql || (latest.sql || ''),
      recommendation: p.recommendation || (latest.recommendation || latest.answer?.slice(0, 300) || ''),
    }));
  };

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-indigo-400/10 border border-indigo-400/20 flex items-center justify-center">
          <BookOpen className="w-5 h-5 text-indigo-400" />
        </div>
        <div className="flex-1">
          <h2 className="text-xl font-black">Analysis Documentation</h2>
          <p className="text-xs text-muted-foreground">Methodology · SQL · Assumptions · Reproducibility</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={autofill} className="text-xs px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white/40 hover:text-white/70 transition-all">Auto-fill</button>
          <button onClick={copyAll}
            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-all ${saved ? 'bg-green-400/15 border-green-400/25 text-green-400' : 'bg-white/5 border-white/10 text-white/40 hover:text-white/70'}`}>
            {saved ? <CheckCircle2 className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
            {saved ? 'Copied' : 'Copy'}
          </button>
          <button onClick={exportMethodology}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-indigo-400/10 border border-indigo-400/20 text-indigo-400 hover:bg-indigo-400/15 transition-all">
            <Download className="w-3 h-3" /> Export .md
          </button>
        </div>
      </div>

      {/* Progress */}
      <div className="flex items-center gap-3 p-3 rounded-xl bg-white/2 border border-white/8">
        <div className="flex-1 h-1.5 rounded-full bg-white/8">
          <div className="h-full rounded-full bg-indigo-400 transition-all duration-500" style={{ width: `${(filled / total) * 100}%` }} />
        </div>
        <span className="text-xs text-white/35 font-mono">{filled}/{total} sections</span>
      </div>

      {/* Title */}
      <input value={analysisTitle} onChange={e => setAnalysisTitle(e.target.value)}
        placeholder="Analysis title (e.g., Q2 Revenue by Region Analysis)"
        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-foreground focus:outline-none focus:border-indigo-400/30 font-semibold" />

      {/* Dataset context */}
      {table && (
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/3 border border-white/8 text-xs text-white/40">
          <FileText className="w-3 h-3 flex-shrink-0" />
          {table.name} · {(table.rows?.length || 0).toLocaleString()} rows · {(table.columns?.length || 0)} columns
        </div>
      )}

      {/* Step sections */}
      {STEP_TYPES.map((step) => (
        <div key={step.id} className="rounded-2xl border border-white/8 bg-white/1 overflow-hidden">
          <button onClick={() => toggle(step.id)}
            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/3 transition-all">
            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${notes[step.id]?.trim() ? 'bg-green-400' : 'bg-white/15'}`} />
            <span className={`text-sm font-semibold ${step.color}`}>{step.label}</span>
            {notes[step.id]?.trim() && <span className="text-xs text-white/25 ml-1">{notes[step.id].slice(0, 40)}…</span>}
            <span className="ml-auto text-white/25">{expanded[step.id] ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}</span>
          </button>
          <AnimatePresence>
            {expanded[step.id] && (
              <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                <textarea
                  value={notes[step.id] || ''}
                  onChange={e => update(step.id, e.target.value)}
                  placeholder={step.placeholder}
                  rows={step.id === 'sql' ? 5 : 3}
                  className={`w-full px-4 py-3 bg-white/3 text-sm text-white/70 focus:outline-none resize-none border-t border-white/8 placeholder:text-white/20 ${step.mono ? 'font-mono text-xs' : ''}`}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  );
}