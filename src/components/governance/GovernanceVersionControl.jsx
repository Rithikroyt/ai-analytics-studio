import { useState } from 'react';
import { useWorkspaceStore } from '@/lib/store';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import {
  GitBranch, GitCommit, Clock, RotateCcw, Eye, Download,
  BarChart3, Database, BookOpen, ChevronDown, ChevronUp,
  CheckCircle2, Tag, Diff
} from 'lucide-react';

function timeAgo(iso) {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function hashId(str) {
  let h = 0;
  for (let i = 0; i < (str || '').length; i++) h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  return Math.abs(h).toString(16).slice(0, 7);
}

// Build synthetic version timeline from reports
function buildVersionTimeline(reports, savedCharts, tables) {
  const entries = [];

  reports.forEach(r => {
    entries.push({
      id: `v-create-${r.id}`,
      ts: r.created_date,
      hash: hashId(r.id + r.created_date),
      type: 'report',
      icon: BarChart3,
      color: 'text-cyan-400',
      bg: 'bg-cyan-400/10',
      border: 'border-cyan-400/20',
      name: r.title,
      author: r.created_by || 'Unknown',
      message: 'Initial version created',
      meta: { accessLevel: r.accessLevel, isPublic: r.isPublic, reportType: r.reportType },
      canRestore: false,
      diff: null,
    });
    if (r.updated_date && r.updated_date !== r.created_date) {
      entries.push({
        id: `v-update-${r.id}`,
        ts: r.updated_date,
        hash: hashId(r.id + r.updated_date),
        type: 'report',
        icon: BarChart3,
        color: 'text-blue-400',
        bg: 'bg-blue-400/10',
        border: 'border-blue-400/20',
        name: r.title,
        author: r.created_by || 'Unknown',
        message: r.isPublic ? 'Published to public link' : 'Updated content & settings',
        meta: { accessLevel: r.accessLevel, isPublic: r.isPublic },
        canRestore: true,
        diff: 'Content edited · Access settings changed',
      });
    }
  });

  tables.forEach(t => {
    entries.push({
      id: `v-ds-${t.id}`,
      ts: t.uploadedAt || new Date(Date.now() - 5 * 86400000).toISOString(),
      hash: hashId(t.id),
      type: 'dataset',
      icon: Database,
      color: 'text-teal-400',
      bg: 'bg-teal-400/10',
      border: 'border-teal-400/20',
      name: t.name,
      author: 'workspace',
      message: `Uploaded — ${t.rowCount?.toLocaleString()} rows, quality ${t.qualityScore}%`,
      meta: { rows: t.rowCount, cols: t.columnCount, quality: t.qualityScore },
      canRestore: false,
      diff: null,
    });
  });

  savedCharts.slice(0, 15).forEach(c => {
    entries.push({
      id: `v-chart-${c.id}`,
      ts: c.savedAt,
      hash: hashId(c.id),
      type: 'dashboard',
      icon: BarChart3,
      color: 'text-purple-400',
      bg: 'bg-purple-400/10',
      border: 'border-purple-400/20',
      name: c.label || 'Chart',
      author: 'workspace',
      message: `Saved to dashboard · ${c.chart?.type} · ${c.datasetName || 'dataset'}`,
      meta: { chartType: c.chart?.type, dataset: c.datasetName },
      canRestore: false,
      diff: null,
    });
  });

  return entries.sort((a, b) => new Date(b.ts) - new Date(a.ts));
}

function VersionEntry({ entry, index }) {
  const [expanded, setExpanded] = useState(false);
  const Icon = entry.icon;

  return (
    <div className="relative">
      {/* Timeline line */}
      <div className="absolute left-[22px] top-10 bottom-0 w-px bg-white/8" style={{ display: index === 0 ? 'block' : 'block' }} />

      <div className="flex gap-4">
        {/* Icon node */}
        <div className={`w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 z-10 border ${entry.bg} ${entry.border}`}>
          <Icon className={`w-4 h-4 ${entry.color}`} />
        </div>

        {/* Content */}
        <div className="flex-1 pb-5 min-w-0">
          <div className="glass-card rounded-2xl border border-white/8 hover:border-white/15 transition-all overflow-hidden">
            <div className="flex items-start justify-between gap-3 p-4 flex-wrap">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="font-semibold text-sm truncate">{entry.name}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded font-mono ${entry.bg} ${entry.color} border ${entry.border}`}>
                    {entry.hash}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/40`}>
                    {entry.type}
                  </span>
                </div>
                <div className="text-xs text-white/55 leading-relaxed">{entry.message}</div>
                <div className="flex items-center gap-3 mt-1.5 text-xs text-white/25">
                  <span className="flex items-center gap-1"><Clock className="w-2.5 h-2.5" /> {timeAgo(entry.ts)}</span>
                  <span>{new Date(entry.ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                  <span>by <span className="text-white/40">{entry.author}</span></span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {entry.diff && (
                  <button onClick={() => setExpanded(v => !v)}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs border border-white/10 text-white/40 hover:text-white/70 hover:bg-white/5 transition-all">
                    <Diff className="w-3 h-3" /> Diff
                    {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>
                )}
                {entry.canRestore && (
                  <button className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs border border-amber-400/20 text-amber-400/70 hover:text-amber-400 hover:bg-amber-400/8 transition-all">
                    <RotateCcw className="w-3 h-3" /> Restore
                  </button>
                )}
              </div>
            </div>

            {/* Meta strip */}
            <div className="px-4 pb-3 flex flex-wrap gap-2">
              {Object.entries(entry.meta || {}).map(([k, v]) => v != null && (
                <span key={k} className="text-xs px-1.5 py-0.5 rounded bg-white/4 border border-white/6 text-white/30 font-mono">
                  {k}: {String(v)}
                </span>
              ))}
            </div>

            {/* Diff panel */}
            <AnimatePresence>
              {expanded && entry.diff && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden border-t border-white/6">
                  <div className="px-4 py-3 bg-amber-400/3">
                    <div className="text-xs font-semibold text-amber-400/70 uppercase tracking-widest mb-1.5">Changes</div>
                    <div className="text-xs text-white/50 font-mono leading-relaxed">{entry.diff}</div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function GovernanceVersionControl({ reports }) {
  const { tables, savedCharts } = useWorkspaceStore();
  const [filterType, setFilterType] = useState('all');
  const [search, setSearch] = useState('');
  const [visibleCount, setVisibleCount] = useState(30);

  const timeline = buildVersionTimeline(reports, savedCharts, tables);

  const filtered = timeline.filter(e => {
    const matchType = filterType === 'all' || e.type === filterType;
    const matchSearch = !search || e.name?.toLowerCase().includes(search.toLowerCase()) || e.message?.toLowerCase().includes(search.toLowerCase());
    return matchType && matchSearch;
  });

  const typeGroups = ['report', 'dataset', 'dashboard'];

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {typeGroups.map(type => {
          const count = timeline.filter(e => e.type === type).length;
          const colorMap = { report: 'text-cyan-400', dataset: 'text-teal-400', dashboard: 'text-purple-400' };
          const bgMap = { report: 'border-cyan-400/20', dataset: 'border-teal-400/20', dashboard: 'border-purple-400/20' };
          return (
            <div key={type} className={`glass-card rounded-2xl p-4 border ${bgMap[type]} text-center`}>
              <div className={`text-2xl font-black font-mono ${colorMap[type]}`}>{count}</div>
              <div className="text-xs text-white/35 mt-1 capitalize">{type} versions</div>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-40">
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search versions…"
            className="w-full pl-4 pr-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs focus:outline-none focus:border-cyan-400/30 text-foreground" />
        </div>
        <div className="flex items-center gap-0.5 bg-white/5 border border-white/10 rounded-xl p-0.5">
          {['all', ...typeGroups].map(t => (
            <button key={t} onClick={() => setFilterType(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize ${filterType === t ? 'bg-white/10 text-white' : 'text-white/35 hover:text-white/65'}`}>
              {t}
            </button>
          ))}
        </div>
        <span className="text-xs text-white/25">{filtered.length} commits</span>
      </div>

      {/* Timeline */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-white/25">
          <GitBranch className="w-10 h-10 mx-auto mb-3 opacity-20" />
          <p className="text-sm">No version history yet. Upload data and create reports to start tracking.</p>
        </div>
      ) : (
        <div className="space-y-0">
          {filtered.slice(0, visibleCount).map((entry, i) => (
            <VersionEntry key={entry.id} entry={entry} index={i} />
          ))}
          {filtered.length > visibleCount && (
            <button onClick={() => setVisibleCount(v => v + 30)}
              className="w-full py-3 text-xs text-white/35 hover:text-white/65 border border-white/8 rounded-2xl hover:bg-white/3 transition-all flex items-center justify-center gap-1.5">
              <ChevronDown className="w-3.5 h-3.5" /> Show {filtered.length - visibleCount} more versions
            </button>
          )}
        </div>
      )}
    </div>
  );
}