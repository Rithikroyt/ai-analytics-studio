import { useState, useMemo } from 'react';
import { useWorkspaceStore } from '@/lib/store';
import { motion } from 'framer-motion';
import {
  ScrollText, Search, Filter, Download, Eye, Edit3, Share2,
  Trash2, Upload, BarChart3, MessageSquare, Shield, RefreshCw,
  ChevronDown
} from 'lucide-react';

// Build synthetic audit log from store + shared reports
function buildAuditLog(reports, tables, savedCharts, stories, alerts) {
  const entries = [];

  // Report events
  reports.forEach(r => {
    entries.push({
      id: `rpt-create-${r.id}`,
      ts: r.created_date,
      actor: r.created_by || 'Unknown',
      action: 'report.created',
      label: 'Created report',
      target: r.title,
      targetType: 'report',
      meta: { accessLevel: r.accessLevel, isPublic: r.isPublic },
      severity: 'info',
    });
    if (r.updated_date && r.updated_date !== r.created_date) {
      entries.push({
        id: `rpt-update-${r.id}`,
        ts: r.updated_date,
        actor: r.created_by || 'Unknown',
        action: 'report.updated',
        label: 'Updated report',
        target: r.title,
        targetType: 'report',
        meta: { accessLevel: r.accessLevel },
        severity: 'info',
      });
    }
    if (r.isPublic) {
      entries.push({
        id: `rpt-share-${r.id}`,
        ts: r.updated_date || r.created_date,
        actor: r.created_by || 'Unknown',
        action: 'report.shared',
        label: 'Made report public',
        target: r.title,
        targetType: 'report',
        meta: { shareToken: r.shareToken },
        severity: 'warning',
      });
    }
    if (r.status === 'archived') {
      entries.push({
        id: `rpt-archive-${r.id}`,
        ts: r.updated_date,
        actor: r.created_by || 'Unknown',
        action: 'report.archived',
        label: 'Archived report',
        target: r.title,
        targetType: 'report',
        meta: {},
        severity: 'warning',
      });
    }
    (r.invitedEmails || []).forEach(email => {
      entries.push({
        id: `rpt-invite-${r.id}-${email}`,
        ts: r.updated_date || r.created_date,
        actor: r.created_by || 'Unknown',
        action: 'access.granted',
        label: 'Granted access',
        target: `${r.title} → ${email}`,
        targetType: 'access',
        meta: { email, accessLevel: r.accessLevel },
        severity: 'info',
      });
    });
  });

  // Dataset events
  tables.forEach(t => {
    entries.push({
      id: `ds-upload-${t.id}`,
      ts: t.uploadedAt || new Date(Date.now() - Math.random() * 7 * 86400000).toISOString(),
      actor: 'workspace',
      action: 'dataset.uploaded',
      label: 'Dataset uploaded',
      target: t.name,
      targetType: 'dataset',
      meta: { rows: t.rowCount, cols: t.columnCount, quality: t.qualityScore },
      severity: 'info',
    });
  });

  // Dashboard events
  savedCharts.slice(0, 20).forEach(c => {
    entries.push({
      id: `chart-save-${c.id}`,
      ts: c.savedAt,
      actor: 'workspace',
      action: 'chart.saved',
      label: 'Chart saved to dashboard',
      target: c.label || c.chart?.title || 'Chart',
      targetType: 'dashboard',
      meta: { dataset: c.datasetName, chartType: c.chart?.type },
      severity: 'info',
    });
  });

  // Story events
  stories.slice(0, 10).forEach(s => {
    entries.push({
      id: `story-${s.id}`,
      ts: s.createdAt,
      actor: 'workspace',
      action: 'story.created',
      label: 'Story created',
      target: s.title || 'Untitled Story',
      targetType: 'story',
      meta: { slides: s.slides?.length },
      severity: 'info',
    });
  });

  // Alert events
  alerts.slice(0, 10).forEach(a => {
    entries.push({
      id: `alert-${a.id}`,
      ts: a.createdAt,
      actor: 'workspace',
      action: 'alert.configured',
      label: 'Alert rule created',
      target: a.label || a.metric,
      targetType: 'alert',
      meta: { condition: a.condition, threshold: a.threshold },
      severity: 'info',
    });
    if (a.lastTriggered) {
      entries.push({
        id: `alert-trigger-${a.id}`,
        ts: a.lastTriggered,
        actor: 'system',
        action: 'alert.triggered',
        label: 'Alert triggered',
        target: a.label || a.metric,
        targetType: 'alert',
        meta: { condition: a.condition },
        severity: 'warning',
      });
    }
  });

  return entries.sort((a, b) => new Date(b.ts) - new Date(a.ts));
}

const ACTION_META = {
  'report.created':   { icon: BarChart3,    color: 'text-cyan-400',   bg: 'bg-cyan-400/10' },
  'report.updated':   { icon: Edit3,        color: 'text-blue-400',   bg: 'bg-blue-400/10' },
  'report.shared':    { icon: Share2,       color: 'text-green-400',  bg: 'bg-green-400/10' },
  'report.archived':  { icon: Trash2,       color: 'text-white/40',   bg: 'bg-white/5' },
  'access.granted':   { icon: Shield,       color: 'text-purple-400', bg: 'bg-purple-400/10' },
  'dataset.uploaded': { icon: Upload,       color: 'text-teal-400',   bg: 'bg-teal-400/10' },
  'chart.saved':      { icon: BarChart3,    color: 'text-cyan-400',   bg: 'bg-cyan-400/10' },
  'story.created':    { icon: MessageSquare,color: 'text-pink-400',   bg: 'bg-pink-400/10' },
  'alert.configured': { icon: Shield,       color: 'text-amber-400',  bg: 'bg-amber-400/10' },
  'alert.triggered':  { icon: RefreshCw,    color: 'text-red-400',    bg: 'bg-red-400/10' },
};

const SEV_COLORS = { info: 'text-white/40', warning: 'text-amber-400', critical: 'text-red-400' };

const TARGET_TYPE_OPTIONS = ['all', 'report', 'dataset', 'dashboard', 'access', 'alert', 'story'];

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

export default function GovernanceAuditLog({ reports }) {
  const { tables, savedCharts, stories, alerts } = useWorkspaceStore();
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterSev, setFilterSev] = useState('all');
  const [visibleCount, setVisibleCount] = useState(50);

  const allLogs = useMemo(
    () => buildAuditLog(reports, tables, savedCharts, stories, alerts),
    [reports, tables, savedCharts, stories, alerts]
  );

  const filtered = allLogs.filter(e => {
    const matchSearch = !search || e.label?.toLowerCase().includes(search.toLowerCase()) || e.target?.toLowerCase().includes(search.toLowerCase()) || e.actor?.toLowerCase().includes(search.toLowerCase());
    const matchType = filterType === 'all' || e.targetType === filterType;
    const matchSev = filterSev === 'all' || e.severity === filterSev;
    return matchSearch && matchType && matchSev;
  });

  const downloadCSV = () => {
    const rows = ['Timestamp,Actor,Action,Target,Type,Severity',
      ...filtered.map(e => `"${e.ts}","${e.actor}","${e.action}","${e.target}","${e.targetType}","${e.severity}"`)
    ].join('\n');
    const blob = new Blob([rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'audit_log.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">
      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Events', value: allLogs.length, color: 'text-cyan-400' },
          { label: 'Today', value: allLogs.filter(e => e.ts && Date.now() - new Date(e.ts) < 86400000).length, color: 'text-teal-400' },
          { label: 'Warnings', value: allLogs.filter(e => e.severity === 'warning').length, color: 'text-amber-400' },
          { label: 'Access Events', value: allLogs.filter(e => e.targetType === 'access' || e.action.includes('share')).length, color: 'text-purple-400' },
        ].map(s => (
          <div key={s.label} className="glass-card rounded-2xl p-4 border border-white/8 text-center">
            <div className={`text-2xl font-black font-mono ${s.color}`}>{s.value}</div>
            <div className="text-xs text-white/35 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-40">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-white/30" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search events, actors, targets…"
            className="w-full pl-8 pr-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs focus:outline-none focus:border-cyan-400/30 text-foreground" />
        </div>
        <select value={filterType} onChange={e => setFilterType(e.target.value)}
          className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-foreground focus:outline-none">
          {TARGET_TYPE_OPTIONS.map(t => <option key={t} value={t}>{t === 'all' ? 'All types' : t}</option>)}
        </select>
        <select value={filterSev} onChange={e => setFilterSev(e.target.value)}
          className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-foreground focus:outline-none">
          <option value="all">All severity</option>
          <option value="info">Info</option>
          <option value="warning">Warning</option>
        </select>
        <button onClick={downloadCSV}
          className="flex items-center gap-1.5 px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white/50 hover:text-white/80 hover:bg-white/8 transition-all">
          <Download className="w-3.5 h-3.5" /> Export CSV
        </button>
        <span className="text-xs text-white/25 ml-auto">{filtered.length} events</span>
      </div>

      {/* Log table */}
      <div className="glass-card rounded-2xl border border-white/8 overflow-hidden">
        <div className="overflow-auto max-h-[60vh]">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-white/8 bg-white/3 sticky top-0">
                {['Time', 'Actor', 'Action', 'Target', 'Type', 'Sev'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-white/35 font-medium whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, visibleCount).map((e, i) => {
                const meta = ACTION_META[e.action] || { icon: ScrollText, color: 'text-white/40', bg: 'bg-white/5' };
                const Icon = meta.icon;
                return (
                  <motion.tr key={e.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.01 }}
                    className="border-b border-white/5 hover:bg-white/2 transition-colors">
                    <td className="px-4 py-3 text-white/30 whitespace-nowrap font-mono">{timeAgo(e.ts)}</td>
                    <td className="px-4 py-3 max-w-[120px]">
                      <span className="truncate block text-white/65">{e.actor}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <div className={`w-5 h-5 rounded flex items-center justify-center ${meta.bg}`}>
                          <Icon className={`w-2.5 h-2.5 ${meta.color}`} />
                        </div>
                        <span className="text-white/65">{e.label}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-white/50 max-w-[200px]">
                      <span className="truncate block">{e.target}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`px-1.5 py-0.5 rounded-full text-xs ${meta.bg} ${meta.color}`}>{e.targetType}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium ${SEV_COLORS[e.severity] || SEV_COLORS.info}`}>
                        {e.severity}
                      </span>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="text-center py-12 text-white/25 text-sm">No audit events match your filters.</div>
          )}
        </div>
        {filtered.length > visibleCount && (
          <div className="px-4 py-3 border-t border-white/6 flex items-center justify-center">
            <button onClick={() => setVisibleCount(v => v + 50)}
              className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 transition-colors">
              <ChevronDown className="w-3.5 h-3.5" /> Load more ({filtered.length - visibleCount} remaining)
            </button>
          </div>
        )}
      </div>
    </div>
  );
}