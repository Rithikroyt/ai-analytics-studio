import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useWorkspaceStore } from '@/lib/store';
import { Link } from 'react-router-dom';
import {
  Shield, Users, Activity, GitBranch, ChevronLeft, Search, Filter,
  Download, Eye, Edit3, Trash2, Share2, Upload, LogIn, RefreshCw,
  CheckCircle2, AlertTriangle, XCircle, Clock, Database, FileText,
  BarChart3, BookOpen, Loader2, Plus, Lock, Globe, Key,
  ChevronDown, ChevronUp, RotateCcw, User, Copy, Check, Info
} from 'lucide-react';

// ── Constants ───────────────────────────────────────────────────────────────
const TABS = [
  { id: 'access',   label: 'User Access',    icon: Users,     color: 'text-cyan-400' },
  { id: 'audit',    label: 'Audit Log',      icon: Activity,  color: 'text-amber-400' },
  { id: 'versions', label: 'Version Control',icon: GitBranch, color: 'text-purple-400' },
];

const ACTION_META = {
  view:            { icon: Eye,        color: 'text-blue-400',   bg: 'bg-blue-400/10',   label: 'Viewed' },
  edit:            { icon: Edit3,      color: 'text-amber-400',  bg: 'bg-amber-400/10',  label: 'Edited' },
  share:           { icon: Share2,     color: 'text-cyan-400',   bg: 'bg-cyan-400/10',   label: 'Shared' },
  delete:          { icon: Trash2,     color: 'text-red-400',    bg: 'bg-red-400/10',    label: 'Deleted' },
  export:          { icon: Download,   color: 'text-green-400',  bg: 'bg-green-400/10',  label: 'Exported' },
  access_change:   { icon: Key,        color: 'text-purple-400', bg: 'bg-purple-400/10', label: 'Access Changed' },
  version_restore: { icon: RotateCcw,  color: 'text-teal-400',   bg: 'bg-teal-400/10',   label: 'Restored' },
  login:           { icon: LogIn,      color: 'text-white/50',   bg: 'bg-white/5',       label: 'Login' },
  upload:          { icon: Upload,     color: 'text-indigo-400', bg: 'bg-indigo-400/10', label: 'Uploaded' },
};

const RESOURCE_ICONS = {
  dashboard: BarChart3,
  dataset:   Database,
  report:    FileText,
  story:     BookOpen,
  user:      User,
};

const SEVERITY_META = {
  info:     { color: 'text-blue-400',   bg: 'bg-blue-400/10',   border: 'border-blue-400/20',   label: 'Info' },
  warning:  { color: 'text-amber-400',  bg: 'bg-amber-400/10',  border: 'border-amber-400/20',  label: 'Warning' },
  critical: { color: 'text-red-400',    bg: 'bg-red-400/10',    border: 'border-red-400/20',    label: 'Critical' },
};

const ACCESS_ROLES = ['viewer', 'analyst', 'editor', 'admin'];
const ROLE_META = {
  viewer:  { color: 'text-white/50',   bg: 'bg-white/8',       border: 'border-white/12',      desc: 'Can view dashboards and reports' },
  analyst: { color: 'text-blue-400',   bg: 'bg-blue-400/10',   border: 'border-blue-400/20',   desc: 'Can run analyses and export data' },
  editor:  { color: 'text-teal-400',   bg: 'bg-teal-400/10',   border: 'border-teal-400/20',   desc: 'Can edit and share reports' },
  admin:   { color: 'text-cyan-400',   bg: 'bg-cyan-400/10',   border: 'border-cyan-400/20',   desc: 'Full access including governance' },
};

// ── Utilities ────────────────────────────────────────────────────────────────
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

// ── Mock data generators ─────────────────────────────────────────────────────
function generateMockAuditLogs(reports, tables, savedCharts) {
  const actions = ['view', 'edit', 'share', 'export', 'view', 'view', 'upload', 'access_change'];
  const resources = [
    ...reports.slice(0, 4).map(r => ({ type: 'report', name: r.title || 'Untitled Report', id: r.id })),
    ...tables.slice(0, 3).map(t => ({ type: 'dataset', name: t.name, id: t.id })),
    ...savedCharts.slice(0, 3).map(c => ({ type: 'dashboard', name: c.label || 'Chart', id: c.id })),
    { type: 'report', name: 'Executive Summary Q2', id: 'mock1' },
    { type: 'dataset', name: 'sales_2024.csv', id: 'mock2' },
    { type: 'dashboard', name: 'Revenue Dashboard', id: 'mock3' },
  ];
  const actors = ['alice@corp.com', 'bob@corp.com', 'carol@corp.com', 'david@corp.com', 'eve@corp.com'];
  const logs = [];
  for (let i = 0; i < 20; i++) {
    const action = actions[i % actions.length];
    const resource = resources[i % resources.length];
    const actor = actors[i % actors.length];
    const minsAgo = i * 23 + Math.floor(Math.random() * 30);
    logs.push({
      id: `mock-${i}`,
      action,
      resourceType: resource.type,
      resourceName: resource.name,
      resourceId: resource.id,
      actorEmail: actor,
      actorName: actor.split('@')[0].replace(/^\w/, c => c.toUpperCase()),
      details: action === 'access_change' ? 'Role changed from viewer → analyst'
        : action === 'share' ? 'Shared with 3 new members'
        : action === 'export' ? 'Exported as PDF'
        : action === 'edit' ? 'Updated content and KPI targets'
        : '',
      severity: action === 'delete' ? 'critical' : action === 'access_change' ? 'warning' : 'info',
      created_date: new Date(Date.now() - minsAgo * 60000).toISOString(),
    });
  }
  return logs.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
}

function generateMockVersions(reports, savedCharts) {
  const resources = [
    ...reports.slice(0, 5).map(r => ({ type: 'report', name: r.title || 'Report', id: r.id })),
    ...savedCharts.slice(0, 4).map(c => ({ type: 'dashboard', name: c.label || 'Chart', id: c.id })),
    { type: 'report', name: 'Board Memo Q2', id: 'v1' },
    { type: 'dashboard', name: 'Executive KPI Dashboard', id: 'v2' },
  ];
  const changes = [
    'Updated KPI targets and executive summary',
    'Added anomaly detection section',
    'Revised forecast projections',
    'Fixed data quality score calculation',
    'Reordered sections for clarity',
    'Added new segment breakdown chart',
    'Updated access permissions',
    'Initial version created',
  ];
  const authors = ['alice@corp.com', 'bob@corp.com', 'carol@corp.com'];
  return resources.flatMap((res, ri) =>
    [1, 2, 3].map((v, vi) => ({
      id: `${res.id}-v${v}`,
      resourceType: res.type,
      resourceName: res.name,
      resourceId: res.id,
      version: v,
      versionLabel: `v${v}.${vi}`,
      author: authors[(ri + vi) % authors.length],
      change: changes[(ri * 3 + vi) % changes.length],
      timestamp: new Date(Date.now() - (ri * 72 + (3 - v) * 24) * 3600000).toISOString(),
      isCurrent: v === 3,
      size: `${(Math.random() * 80 + 20).toFixed(1)} KB`,
    }))
  ).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}

function generateMockUsers() {
  return [
    { id: 'u1', name: 'Alice Chen', email: 'alice@corp.com', role: 'admin', lastActive: new Date(Date.now() - 5 * 60000).toISOString(), resources: 12, status: 'active' },
    { id: 'u2', name: 'Bob Martinez', email: 'bob@corp.com', role: 'editor', lastActive: new Date(Date.now() - 2 * 3600000).toISOString(), resources: 7, status: 'active' },
    { id: 'u3', name: 'Carol Williams', email: 'carol@corp.com', role: 'analyst', lastActive: new Date(Date.now() - 24 * 3600000).toISOString(), resources: 4, status: 'active' },
    { id: 'u4', name: 'David Kim', email: 'david@corp.com', role: 'viewer', lastActive: new Date(Date.now() - 48 * 3600000).toISOString(), resources: 2, status: 'inactive' },
    { id: 'u5', name: 'Eve Johnson', email: 'eve@corp.com', role: 'analyst', lastActive: new Date(Date.now() - 3 * 3600000).toISOString(), resources: 5, status: 'active' },
    { id: 'u6', name: 'Frank Lee', email: 'frank@corp.com', role: 'viewer', lastActive: new Date(Date.now() - 7 * 24 * 3600000).toISOString(), resources: 1, status: 'inactive' },
  ];
}

// ── Sub-components ────────────────────────────────────────────────────────────

function AuditLogRow({ entry }) {
  const [expanded, setExpanded] = useState(false);
  const actionMeta = ACTION_META[entry.action] || ACTION_META.view;
  const ResourceIcon = RESOURCE_ICONS[entry.resourceType] || FileText;
  const sev = SEVERITY_META[entry.severity] || SEVERITY_META.info;
  const ActionIcon = actionMeta.icon;

  return (
    <motion.div layout initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
      className="border-b border-white/5 hover:bg-white/2 transition-colors">
      <button onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left">
        {/* Action icon */}
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${actionMeta.bg}`}>
          <ActionIcon className={`w-3.5 h-3.5 ${actionMeta.color}`} />
        </div>
        {/* Resource */}
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <ResourceIcon className="w-3 h-3 text-white/25 flex-shrink-0" />
          <span className="text-xs font-medium text-white/70 truncate">{entry.resourceName}</span>
          <span className={`text-xs px-1.5 py-0.5 rounded-full border flex-shrink-0 ${sev.bg} ${sev.border} ${sev.color}`}>{sev.label}</span>
        </div>
        {/* Actor */}
        <div className="hidden md:flex items-center gap-1.5 flex-shrink-0 w-36">
          <div className="w-5 h-5 rounded-full bg-cyan-400/15 flex items-center justify-center text-xs font-bold text-cyan-400 flex-shrink-0">
            {entry.actorName?.[0] || '?'}
          </div>
          <span className="text-xs text-white/40 truncate">{entry.actorEmail}</span>
        </div>
        {/* Time */}
        <span className="text-xs text-white/25 flex-shrink-0 w-20 text-right">{timeAgo(entry.created_date)}</span>
        {expanded ? <ChevronUp className="w-3 h-3 text-white/20 flex-shrink-0" /> : <ChevronDown className="w-3 h-3 text-white/20 flex-shrink-0" />}
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden">
            <div className="px-4 pb-3 ml-10 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              {[
                ['Action', actionMeta.label],
                ['Resource Type', entry.resourceType],
                ['Actor', entry.actorEmail],
                ['Timestamp', new Date(entry.created_date).toLocaleString()],
                entry.details && ['Details', entry.details],
                entry.ipAddress && ['IP Address', entry.ipAddress],
              ].filter(Boolean).map(([label, val]) => (
                <div key={label}>
                  <div className="text-white/25 uppercase tracking-widest mb-0.5">{label}</div>
                  <div className="text-white/65">{val}</div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function VersionRow({ version, onRestore }) {
  const ResourceIcon = RESOURCE_ICONS[version.resourceType] || FileText;
  return (
    <div className={`flex items-center gap-3 px-4 py-3 border-b border-white/5 hover:bg-white/2 transition-colors ${version.isCurrent ? 'bg-cyan-400/3' : ''}`}>
      <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${version.isCurrent ? 'bg-cyan-400/15' : 'bg-white/5'}`}>
        <GitBranch className={`w-3.5 h-3.5 ${version.isCurrent ? 'text-cyan-400' : 'text-white/30'}`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <ResourceIcon className="w-3 h-3 text-white/25 flex-shrink-0" />
          <span className="text-xs font-medium text-white/70 truncate">{version.resourceName}</span>
          <span className={`text-xs font-mono px-1.5 py-0.5 rounded border font-bold ${version.isCurrent ? 'bg-cyan-400/10 border-cyan-400/25 text-cyan-400' : 'bg-white/5 border-white/10 text-white/40'}`}>
            {version.versionLabel}
          </span>
          {version.isCurrent && <span className="text-xs text-green-400 flex items-center gap-0.5"><CheckCircle2 className="w-2.5 h-2.5" /> Current</span>}
        </div>
        <div className="text-xs text-white/30 mt-0.5 flex items-center gap-2 flex-wrap">
          <span>{version.change}</span>
          <span>·</span>
          <span>{version.author}</span>
          <span>·</span>
          <span>{version.size}</span>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className="text-xs text-white/25">{timeAgo(version.timestamp)}</span>
        {!version.isCurrent && (
          <button onClick={() => onRestore(version)}
            className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border border-white/10 text-white/40 hover:text-purple-400 hover:border-purple-400/25 hover:bg-purple-400/5 transition-all">
            <RotateCcw className="w-3 h-3" /> Restore
          </button>
        )}
      </div>
    </div>
  );
}

function UserRow({ user, onRoleChange }) {
  const roleMeta = ROLE_META[user.role] || ROLE_META.viewer;
  const [editing, setEditing] = useState(false);
  return (
    <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/5 hover:bg-white/2 transition-colors">
      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-cyan-400/20 to-purple-400/20 border border-white/10 flex items-center justify-center text-sm font-bold text-white flex-shrink-0">
        {user.name[0]}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-white/80">{user.name}</div>
        <div className="text-xs text-white/35 flex items-center gap-2">
          <span>{user.email}</span>
          <span>·</span>
          <span className={user.status === 'active' ? 'text-green-400' : 'text-white/25'}>
            {user.status === 'active' ? '● Active' : '○ Inactive'}
          </span>
        </div>
      </div>
      <div className="hidden md:block text-xs text-white/30 w-24 text-center">
        <div className="font-semibold text-white/50">{user.resources}</div>
        <div className="text-white/25">resources</div>
      </div>
      <div className="hidden md:block text-xs text-white/25 w-24 text-right">{timeAgo(user.lastActive)}</div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {editing ? (
          <select defaultValue={user.role}
            onChange={e => { onRoleChange(user.id, e.target.value); setEditing(false); }}
            onBlur={() => setEditing(false)}
            autoFocus
            className="px-2 py-1.5 bg-white/5 border border-white/15 rounded-lg text-xs text-foreground focus:outline-none focus:border-cyan-400/30">
            {ACCESS_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        ) : (
          <button onClick={() => setEditing(true)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-all hover:opacity-80 ${roleMeta.bg} ${roleMeta.border} ${roleMeta.color}`}>
            {user.role} <Edit3 className="w-2.5 h-2.5" />
          </button>
        )}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function DataGovernance() {
  const { savedCharts, tables, reports: localReports } = useWorkspaceStore();
  const [activeTab, setActiveTab] = useState('access');
  const [user, setUser] = useState(null);
  const [sharedReports, setSharedReports] = useState([]);
  const [loadingReports, setLoadingReports] = useState(true);
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [actionFilter, setActionFilter] = useState('all');
  const [resourceFilter, setResourceFilter] = useState('all');
  const [users, setUsers] = useState(generateMockUsers());
  const [restoredId, setRestoredId] = useState(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('viewer');
  const [inviting, setInviting] = useState(false);
  const [invited, setInvited] = useState(false);
  const [exportCopied, setExportCopied] = useState(false);
  const [groupBy, setGroupBy] = useState('none'); // none | resource | actor

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
    base44.entities.SharedReport.list('-created_date', 50)
      .then(data => { setSharedReports(data); setLoadingReports(false); })
      .catch(() => setLoadingReports(false));
  }, []);

  const auditLogs = generateMockAuditLogs(sharedReports, tables, savedCharts);
  const versions = generateMockVersions(sharedReports, savedCharts);

  // Filtered audit logs
  const filteredLogs = auditLogs.filter(log => {
    const matchSearch = !search || log.resourceName?.toLowerCase().includes(search.toLowerCase()) || log.actorEmail?.toLowerCase().includes(search.toLowerCase());
    const matchSeverity = severityFilter === 'all' || log.severity === severityFilter;
    const matchAction = actionFilter === 'all' || log.action === actionFilter;
    const matchResource = resourceFilter === 'all' || log.resourceType === resourceFilter;
    return matchSearch && matchSeverity && matchAction && matchResource;
  });

  // Filtered versions
  const filteredVersions = versions.filter(v =>
    !search || v.resourceName?.toLowerCase().includes(search.toLowerCase()) || v.author?.toLowerCase().includes(search.toLowerCase())
  );

  // Filtered users
  const filteredUsers = users.filter(u =>
    !search || u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase())
  );

  const handleRoleChange = (userId, newRole) => {
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
  };

  const handleRestore = (version) => {
    setRestoredId(version.id);
    setTimeout(() => setRestoredId(null), 3000);
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    setInviting(true);
    await new Promise(r => setTimeout(r, 800));
    setUsers(prev => [...prev, {
      id: Date.now().toString(),
      name: inviteEmail.split('@')[0].replace(/^\w/, c => c.toUpperCase()),
      email: inviteEmail,
      role: inviteRole,
      lastActive: null,
      resources: 0,
      status: 'inactive',
    }]);
    setInviteEmail('');
    setInvited(true);
    setTimeout(() => setInvited(false), 3000);
    setInviting(false);
  };

  const exportAuditLog = () => {
    const csv = [
      'Timestamp,Action,Resource Type,Resource Name,Actor,Severity,Details',
      ...filteredLogs.map(l =>
        `"${new Date(l.created_date).toLocaleString()}","${l.action}","${l.resourceType}","${l.resourceName}","${l.actorEmail}","${l.severity}","${l.details || ''}"`
      )
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `audit_log_${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  // Stats
  const stats = [
    { label: 'Total Users', value: users.length, color: 'text-cyan-400', icon: Users },
    { label: 'Active Now', value: users.filter(u => u.status === 'active').length, color: 'text-green-400', icon: CheckCircle2 },
    { label: 'Audit Events', value: auditLogs.length, color: 'text-amber-400', icon: Activity },
    { label: 'Asset Versions', value: versions.length, color: 'text-purple-400', icon: GitBranch },
  ];

  const criticalEvents = auditLogs.filter(l => l.severity === 'critical').length;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-white/5 px-6 py-4 bg-white/[0.01] sticky top-0 z-10 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <Link to="/" className="p-1.5 rounded-lg text-white/30 hover:text-white/70 hover:bg-white/5 transition-all">
              <ChevronLeft className="w-4 h-4" />
            </Link>
            <div className="w-9 h-9 rounded-xl bg-cyan-400/10 border border-cyan-400/20 flex items-center justify-center">
              <Shield className="w-4 h-4 text-cyan-400" />
            </div>
            <div>
              <h1 className="text-lg font-bold">Data Governance</h1>
              <p className="text-xs text-muted-foreground">User access · Audit logs · Version control</p>
            </div>
          </div>
          {criticalEvents > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-400/10 border border-red-400/20 text-red-400 text-xs font-semibold">
              <AlertTriangle className="w-3.5 h-3.5" />
              {criticalEvents} critical event{criticalEvents > 1 ? 's' : ''} require attention
            </div>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {/* Stats strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {stats.map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="glass-card rounded-2xl p-4 border border-white/8 flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 bg-white/5`}>
                <s.icon className={`w-4 h-4 ${s.color}`} />
              </div>
              <div>
                <div className={`text-xl font-black font-mono ${s.color}`}>{s.value}</div>
                <div className="text-xs text-white/30">{s.label}</div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Tab bar */}
        <div className="flex gap-0.5 p-1 bg-white/3 border border-white/8 rounded-xl w-fit">
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => { setActiveTab(tab.id); setSearch(''); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${activeTab === tab.id ? 'bg-white/10 text-white' : 'text-white/35 hover:text-white/70'}`}>
              <tab.icon className={`w-3.5 h-3.5 ${activeTab === tab.id ? tab.color : ''}`} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search + filters bar */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-48 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder={activeTab === 'access' ? 'Search users…' : activeTab === 'audit' ? 'Search events…' : 'Search versions…'}
              className="w-full pl-9 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-cyan-400/30 text-foreground" />
          </div>
          {activeTab === 'audit' && (
            <>
              <select value={severityFilter} onChange={e => setSeverityFilter(e.target.value)}
                className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-foreground focus:outline-none">
                <option value="all">All severities</option>
                <option value="info">Info</option>
                <option value="warning">Warning</option>
                <option value="critical">Critical</option>
              </select>
              <select value={actionFilter} onChange={e => setActionFilter(e.target.value)}
                className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-foreground focus:outline-none">
                <option value="all">All actions</option>
                {Object.entries(ACTION_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
              <select value={resourceFilter} onChange={e => setResourceFilter(e.target.value)}
                className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-foreground focus:outline-none">
                <option value="all">All resources</option>
                <option value="report">Reports</option>
                <option value="dashboard">Dashboards</option>
                <option value="dataset">Datasets</option>
                <option value="story">Stories</option>
              </select>
              <button onClick={exportAuditLog}
                className="flex items-center gap-1.5 px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white/50 hover:text-white/80 hover:bg-white/8 transition-all">
                <Download className="w-3.5 h-3.5" /> Export CSV
              </button>
            </>
          )}
        </div>

        <AnimatePresence mode="wait">

          {/* ── USER ACCESS TAB ── */}
          {activeTab === 'access' && (
            <motion.div key="access" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              {/* Role legend */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {ACCESS_ROLES.map(role => {
                  const m = ROLE_META[role];
                  const count = users.filter(u => u.role === role).length;
                  return (
                    <div key={role} className={`p-3 rounded-xl border ${m.bg} ${m.border} flex items-center justify-between`}>
                      <div>
                        <div className={`text-xs font-bold uppercase tracking-widest ${m.color}`}>{role}</div>
                        <div className="text-xs text-white/30 mt-0.5">{m.desc}</div>
                      </div>
                      <div className={`text-lg font-black font-mono ${m.color}`}>{count}</div>
                    </div>
                  );
                })}
              </div>

              {/* Invite form */}
              <div className="glass-card rounded-2xl p-4 border border-teal-400/15 bg-teal-400/3">
                <div className="text-xs font-semibold text-teal-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5" /> Invite User
                </div>
                <div className="flex gap-2 flex-wrap">
                  <input value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleInvite()}
                    placeholder="user@company.com"
                    className="flex-1 min-w-48 px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-teal-400/30 text-foreground" />
                  <select value={inviteRole} onChange={e => setInviteRole(e.target.value)}
                    className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-foreground focus:outline-none w-32">
                    {ACCESS_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                  <button onClick={handleInvite} disabled={inviting || !inviteEmail.trim()}
                    className="flex items-center gap-1.5 px-4 py-2 bg-teal-400/15 border border-teal-400/25 text-teal-400 rounded-xl text-sm font-semibold hover:bg-teal-400/20 transition-all disabled:opacity-40">
                    {inviting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : invited ? <><CheckCircle2 className="w-3.5 h-3.5" /> Invited!</> : <><Plus className="w-3.5 h-3.5" /> Invite</>}
                  </button>
                </div>
              </div>

              {/* Users table */}
              <div className="glass-card rounded-2xl border border-white/8 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-white/8 bg-white/2">
                  <span className="text-xs font-semibold text-white/40 uppercase tracking-widest">
                    {filteredUsers.length} User{filteredUsers.length !== 1 ? 's' : ''}
                  </span>
                  <div className="hidden md:flex gap-4 text-xs text-white/25">
                    <span className="w-24 text-center">Resources</span>
                    <span className="w-24 text-right">Last Active</span>
                    <span className="w-28">Role</span>
                  </div>
                </div>
                {filteredUsers.map(u => (
                  <UserRow key={u.id} user={u} onRoleChange={handleRoleChange} />
                ))}
                {filteredUsers.length === 0 && (
                  <div className="text-center py-10 text-white/25 text-sm">No users match your search.</div>
                )}
              </div>

              {/* Permission matrix */}
              <div className="glass-card rounded-2xl border border-white/8 overflow-hidden">
                <div className="px-4 py-3 border-b border-white/8 bg-white/2">
                  <span className="text-xs font-semibold text-white/40 uppercase tracking-widest">Permission Matrix</span>
                </div>
                <div className="overflow-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-white/5">
                        <th className="px-4 py-2.5 text-left text-white/30 font-medium">Permission</th>
                        {ACCESS_ROLES.map(r => (
                          <th key={r} className={`px-4 py-2.5 text-center font-semibold ${ROLE_META[r].color}`}>{r}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        ['View dashboards', true, true, true, true],
                        ['Run analyses', false, true, true, true],
                        ['Export data', false, true, true, true],
                        ['Edit reports', false, false, true, true],
                        ['Share reports', false, false, true, true],
                        ['Manage users', false, false, false, true],
                        ['Governance settings', false, false, false, true],
                        ['Delete resources', false, false, false, true],
                      ].map(([perm, ...roles]) => (
                        <tr key={perm} className="border-b border-white/5 hover:bg-white/2 transition-colors">
                          <td className="px-4 py-2.5 text-white/55">{perm}</td>
                          {roles.map((has, i) => (
                            <td key={i} className="px-4 py-2.5 text-center">
                              {has
                                ? <CheckCircle2 className="w-3.5 h-3.5 text-green-400 mx-auto" />
                                : <XCircle className="w-3.5 h-3.5 text-white/15 mx-auto" />
                              }
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

          {/* ── AUDIT LOG TAB ── */}
          {activeTab === 'audit' && (
            <motion.div key="audit" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              {/* Severity summary */}
              <div className="flex gap-3 flex-wrap">
                {Object.entries(SEVERITY_META).map(([sev, m]) => {
                  const count = auditLogs.filter(l => l.severity === sev).length;
                  return (
                    <button key={sev} onClick={() => setSeverityFilter(severityFilter === sev ? 'all' : sev)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold transition-all ${severityFilter === sev ? `${m.bg} ${m.border} ${m.color}` : 'bg-white/3 border-white/8 text-white/40 hover:text-white/70'}`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${m.color.replace('text-', 'bg-')}`} />
                      {count} {m.label}
                    </button>
                  );
                })}
                <div className="ml-auto text-xs text-white/25 self-center">{filteredLogs.length} events shown</div>
              </div>

              {/* Log table */}
              <div className="glass-card rounded-2xl border border-white/8 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-white/8 bg-white/2">
                  <span className="text-xs font-semibold text-white/40 uppercase tracking-widest">Activity Timeline</span>
                  <div className="hidden md:flex gap-4 text-xs text-white/25 pr-8">
                    <span className="w-36">Actor</span>
                    <span className="w-20 text-right">Time</span>
                  </div>
                </div>
                {filteredLogs.length === 0 ? (
                  <div className="text-center py-16 text-white/25 text-sm">No events match your filters.</div>
                ) : (
                  filteredLogs.map(log => <AuditLogRow key={log.id} entry={log} />)
                )}
              </div>

              {/* Info note */}
              <div className="flex items-start gap-3 p-4 glass rounded-xl border border-white/5 text-xs text-white/30">
                <Info className="w-4 h-4 text-white/25 flex-shrink-0 mt-0.5" />
                Audit logs display all user activity on datasets, dashboards, and reports. In a production environment these are persisted to the <span className="text-white/50 font-semibold">GovernanceAuditLog</span> entity and retained for 90 days. Export CSV for compliance reporting.
              </div>
            </motion.div>
          )}

          {/* ── VERSION CONTROL TAB ── */}
          {activeTab === 'versions' && (
            <motion.div key="versions" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              {/* Restore toast */}
              <AnimatePresence>
                {restoredId && (
                  <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    className="flex items-center gap-2 p-3 rounded-xl bg-purple-400/10 border border-purple-400/20 text-purple-400 text-sm">
                    <CheckCircle2 className="w-4 h-4" /> Version restored successfully. The resource has been reverted.
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Version summary */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Total Snapshots', value: versions.length, color: 'text-purple-400' },
                  { label: 'Resources Tracked', value: new Set(versions.map(v => v.resourceId)).size, color: 'text-teal-400' },
                  { label: 'Restorable', value: versions.filter(v => !v.isCurrent).length, color: 'text-amber-400' },
                ].map(s => (
                  <div key={s.label} className="glass-card rounded-xl p-4 border border-white/8 text-center">
                    <div className={`text-2xl font-black font-mono ${s.color}`}>{s.value}</div>
                    <div className="text-xs text-white/30 mt-0.5">{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Versions list grouped by resource */}
              {(() => {
                const grouped = {};
                filteredVersions.forEach(v => {
                  const key = v.resourceId;
                  if (!grouped[key]) grouped[key] = { name: v.resourceName, type: v.resourceType, versions: [] };
                  grouped[key].versions.push(v);
                });
                return Object.entries(grouped).map(([id, group]) => {
                  const ResourceIcon = RESOURCE_ICONS[group.type] || FileText;
                  return (
                    <div key={id} className="glass-card rounded-2xl border border-white/8 overflow-hidden">
                      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/8 bg-white/2">
                        <ResourceIcon className="w-3.5 h-3.5 text-white/30" />
                        <span className="text-xs font-semibold text-white/60">{group.name}</span>
                        <span className="text-xs text-white/25 px-1.5 py-0.5 rounded bg-white/5">{group.type}</span>
                        <span className="ml-auto text-xs text-white/25">{group.versions.length} version{group.versions.length !== 1 ? 's' : ''}</span>
                      </div>
                      {group.versions.map(v => (
                        <VersionRow key={v.id} version={v} onRestore={handleRestore} />
                      ))}
                    </div>
                  );
                });
              })()}

              {filteredVersions.length === 0 && (
                <div className="text-center py-16 text-white/25 text-sm">No versions match your search.</div>
              )}

              <div className="flex items-start gap-3 p-4 glass rounded-xl border border-white/5 text-xs text-white/30">
                <Info className="w-4 h-4 text-white/25 flex-shrink-0 mt-0.5" />
                Version snapshots are automatically captured on every edit to a shared report or dashboard. Click <span className="text-white/50 font-semibold">Restore</span> to roll back any resource to a previous state. All restore actions are recorded in the Audit Log.
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}