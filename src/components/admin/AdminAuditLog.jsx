/**
 * AdminAuditLog — Full audit trail of all user actions and data access
 * Shows: exports, SQL runs, dashboard views, AI queries, chart saves, report generates
 */
import { useState, useMemo } from 'react';
import { Search, Filter, Download, X, Clock, User, Database, BarChart2, Brain, FileText, Terminal, BookmarkPlus } from 'lucide-react';

const ACTION_META = {
  export_data:       { label: 'Export',          color: '#ffcc02', icon: Download },
  run_sql:           { label: 'SQL Run',          color: '#00e5ff', icon: Terminal },
  view_dashboard:    { label: 'Dashboard View',   color: '#a855f7', icon: BarChart2 },
  save_chart:        { label: 'Chart Saved',      color: '#4caf50', icon: BookmarkPlus },
  generate_report:   { label: 'Report Generated', color: '#60a5fa', icon: FileText },
  ai_query:          { label: 'AI Query',         color: '#ff2d7a', icon: Brain },
  data_access_view:  { label: 'Data Viewed',      color: '#00bfa5', icon: Database },
  data_access_edit:  { label: 'Data Edited',      color: '#ff6b35', icon: Database },
  CREATE:            { label: 'Record Created',   color: '#4caf50', icon: Database },
  UPDATE:            { label: 'Record Updated',   color: '#ffcc02', icon: Database },
  DELETE:            { label: 'Record Deleted',   color: '#ef4444', icon: Database },
};

function getActionMeta(action) {
  return ACTION_META[action] || { label: action?.replace(/_/g, ' ') || 'Action', color: '#ffffff', icon: Database };
}

function ActionBadge({ action }) {
  const meta = getActionMeta(action);
  const Icon = meta.icon;
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold"
      style={{ color: meta.color, background: `${meta.color}18`, border: `1px solid ${meta.color}30` }}>
      <Icon className="w-2.5 h-2.5" />
      {meta.label}
    </span>
  );
}

export default function AdminAuditLog({ logs = [] }) {
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');

  const allActions = useMemo(() => [...new Set(logs.map(l => l.action).filter(Boolean))].sort(), [logs]);

  const filtered = useMemo(() => {
    let l = logs;
    if (search) {
      const q = search.toLowerCase();
      l = l.filter(e =>
        (e.adminEmail || '').toLowerCase().includes(q) ||
        (e.action || '').toLowerCase().includes(q) ||
        (e.targetEntity || '').toLowerCase().includes(q) ||
        (e.targetId || '').toLowerCase().includes(q)
      );
    }
    if (actionFilter) l = l.filter(e => e.action === actionFilter);
    return l.slice(0, 200);
  }, [logs, search, actionFilter]);

  const formatTime = (ts) => {
    if (!ts) return '—';
    try {
      return new Date(ts).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch { return ts; }
  };

  // Stats
  const stats = useMemo(() => {
    const exportCount = logs.filter(l => l.action?.includes('export')).length;
    const sqlCount = logs.filter(l => l.action === 'run_sql').length;
    const aiCount = logs.filter(l => l.action === 'ai_query').length;
    const uniqueUsers = new Set(logs.map(l => l.adminEmail)).size;
    return { exportCount, sqlCount, aiCount, uniqueUsers };
  }, [logs]);

  return (
    <div className="space-y-4">
      {/* Stats strip */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Total Actions', value: logs.length, color: '#00e5ff' },
          { label: 'Exports', value: stats.exportCount, color: '#ffcc02' },
          { label: 'SQL Runs', value: stats.sqlCount, color: '#4caf50' },
          { label: 'AI Queries', value: stats.aiCount, color: '#ff2d7a' },
        ].map(s => (
          <div key={s.label} className="glass-card rounded-xl border border-white/8 p-4 text-center">
            <div className="text-2xl font-black font-mono" style={{ color: s.color }}>{s.value}</div>
            <div className="text-xs text-white/35 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 flex-1 max-w-64 px-3 py-1.5 bg-white/4 border border-white/10 rounded-xl">
          <Search className="w-3.5 h-3.5 text-white/30" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search user, action, target…"
            className="flex-1 bg-transparent text-xs text-white/70 placeholder:text-white/25 focus:outline-none" />
          {search && <button onClick={() => setSearch('')}><X className="w-3 h-3 text-white/25" /></button>}
        </div>
        <select value={actionFilter} onChange={e => setActionFilter(e.target.value)}
          className="px-3 py-1.5 bg-white/4 border border-white/10 rounded-xl text-xs text-white/60 focus:outline-none">
          <option value="">All actions</option>
          {allActions.map(a => <option key={a} value={a}>{getActionMeta(a).label}</option>)}
        </select>
        <span className="text-xs text-white/25 ml-auto">{filtered.length} records</span>
      </div>

      {/* Table */}
      <div className="glass-card rounded-2xl border border-white/8 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-12 text-center text-sm text-white/25">No audit records found.</div>
        ) : (
          <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
            <table className="w-full text-xs min-w-max">
              <thead className="sticky top-0 z-10 bg-background">
                <tr className="border-b border-white/8">
                  <th className="px-4 py-3 text-left text-white/35 font-semibold">Timestamp</th>
                  <th className="px-4 py-3 text-left text-white/35 font-semibold">User</th>
                  <th className="px-4 py-3 text-left text-white/35 font-semibold">Action</th>
                  <th className="px-4 py-3 text-left text-white/35 font-semibold">Target</th>
                  <th className="px-4 py-3 text-left text-white/35 font-semibold">ID / Name</th>
                  <th className="px-4 py-3 text-left text-white/35 font-semibold">Details</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((log, i) => (
                  <tr key={log.id || i} className="border-b border-white/5 hover:bg-white/2 transition-colors">
                    <td className="px-4 py-2.5 text-white/35 whitespace-nowrap font-mono">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-2.5 h-2.5 flex-shrink-0" />
                        {formatTime(log.timestamp)}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-white/65 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <User className="w-2.5 h-2.5 text-white/25 flex-shrink-0" />
                        {log.adminEmail || '—'}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      <ActionBadge action={log.action} />
                    </td>
                    <td className="px-4 py-2.5 text-white/45 whitespace-nowrap">{log.targetEntity || '—'}</td>
                    <td className="px-4 py-2.5 text-white/60 font-medium max-w-36 truncate" title={log.targetId}>{log.targetId || '—'}</td>
                    <td className="px-4 py-2.5 text-white/30 max-w-48">
                      {log.details && typeof log.details === 'object' && (
                        <div className="flex flex-wrap gap-1">
                          {Object.entries(log.details)
                            .filter(([k]) => !['userAgent', 'url'].includes(k))
                            .slice(0, 3)
                            .map(([k, v]) => (
                              <span key={k} className="px-1.5 py-0.5 rounded bg-white/5 border border-white/8 text-white/35 truncate max-w-32" title={String(v)}>
                                {k}: {String(v).slice(0, 20)}
                              </span>
                            ))}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}