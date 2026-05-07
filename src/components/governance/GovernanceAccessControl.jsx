import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, Globe, Lock, Shield, Eye, Edit3, MessageSquare,
  ChevronDown, ChevronUp, CheckCircle2, Trash2, UserPlus, Search, Filter
} from 'lucide-react';

const ACCESS_META = {
  view:    { label: 'View only',   color: 'text-white/50',   bg: 'bg-white/5',         border: 'border-white/10',      icon: Eye },
  comment: { label: 'Can comment', color: 'text-teal-400',   bg: 'bg-teal-400/8',      border: 'border-teal-400/20',   icon: MessageSquare },
  edit:    { label: 'Can edit',    color: 'text-cyan-400',   bg: 'bg-cyan-400/8',      border: 'border-cyan-400/20',   icon: Edit3 },
};

const ROLE_META = {
  owner:  { label: 'Owner',  color: 'text-cyan-400',   bg: 'bg-cyan-400/10',   border: 'border-cyan-400/20' },
  admin:  { label: 'Admin',  color: 'text-purple-400', bg: 'bg-purple-400/10', border: 'border-purple-400/20' },
  member: { label: 'Member', color: 'text-white/50',   bg: 'bg-white/5',       border: 'border-white/10' },
};

function AccessBadge({ level }) {
  const meta = ACCESS_META[level] || ACCESS_META.view;
  const Icon = meta.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border ${meta.color} ${meta.bg} ${meta.border}`}>
      <Icon className="w-2.5 h-2.5" /> {meta.label}
    </span>
  );
}

function ReportAccessRow({ report, onUpdate }) {
  const [expanded, setExpanded] = useState(false);
  const [updating, setUpdating] = useState('');

  const changeAccess = async (level) => {
    setUpdating(level);
    await base44.entities.SharedReport.update(report.id, { accessLevel: level });
    onUpdate();
    setUpdating('');
  };

  const togglePublic = async () => {
    await base44.entities.SharedReport.update(report.id, { isPublic: !report.isPublic });
    onUpdate();
  };

  const allMembers = [
    { email: report.created_by, role: 'owner' },
    ...(report.invitedEmails || []).map(e => ({ email: e, role: 'member' })),
  ].filter(m => m.email);

  return (
    <div className="glass-card rounded-2xl border border-white/8 overflow-hidden">
      <div className="flex items-center gap-4 p-4 flex-wrap">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm truncate">{report.title}</span>
            <span className="text-xs text-white/30">{report.reportType}</span>
          </div>
          <div className="flex items-center gap-2 mt-1 text-xs text-white/35 flex-wrap">
            <Users className="w-3 h-3" /> {allMembers.length} member{allMembers.length !== 1 ? 's' : ''}
            <span className="text-white/15">·</span>
            <span>{new Date(report.created_date).toLocaleDateString()}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Public / Private toggle */}
          <button onClick={togglePublic}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs border transition-all ${
              report.isPublic ? 'text-green-400 bg-green-400/8 border-green-400/20 hover:bg-green-400/15' : 'text-white/40 bg-white/4 border-white/10 hover:bg-white/8'
            }`}>
            {report.isPublic ? <Globe className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
            {report.isPublic ? 'Public' : 'Private'}
          </button>

          {/* Access level selector */}
          <div className="flex items-center gap-0.5 bg-white/5 border border-white/10 rounded-lg p-0.5">
            {Object.entries(ACCESS_META).map(([level, meta]) => {
              const Icon = meta.icon;
              const isActive = report.accessLevel === level;
              return (
                <button key={level} onClick={() => changeAccess(level)} disabled={updating === level}
                  title={meta.label}
                  className={`p-1.5 rounded transition-all text-xs flex items-center gap-1 ${isActive ? `${meta.color} bg-white/10` : 'text-white/30 hover:text-white/60'}`}>
                  <Icon className="w-3 h-3" />
                  <span className="hidden sm:inline text-xs">{meta.label}</span>
                </button>
              );
            })}
          </div>

          <button onClick={() => setExpanded(v => !v)} className="p-1.5 rounded-lg hover:bg-white/8 text-white/30 hover:text-white/70 transition-all">
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-white/6">
            <div className="p-4 space-y-2">
              <div className="text-xs text-white/30 uppercase tracking-widest mb-3">Members & Permissions</div>
              {allMembers.map(m => {
                const roleMeta = ROLE_META[m.role] || ROLE_META.member;
                return (
                  <div key={m.email} className="flex items-center gap-3 p-2.5 rounded-xl bg-white/3 border border-white/6">
                    <div className="w-7 h-7 rounded-full bg-cyan-400/10 border border-cyan-400/15 flex items-center justify-center text-xs font-bold text-cyan-400 flex-shrink-0">
                      {m.email?.[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-white/70 truncate">{m.email}</div>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${roleMeta.color} ${roleMeta.bg} ${roleMeta.border}`}>
                      {roleMeta.label}
                    </span>
                    <AccessBadge level={m.role === 'owner' ? 'edit' : report.accessLevel} />
                  </div>
                );
              })}
              {allMembers.length === 1 && (
                <div className="text-xs text-white/25 text-center py-2">No additional members — only owner has access.</div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function GovernanceAccessControl({ reports, user }) {
  const [search, setSearch] = useState('');
  const [filterAccess, setFilterAccess] = useState('all');
  const [filterVisibility, setFilterVisibility] = useState('all');
  const [version, setVersion] = useState(0); // force re-render after updates

  const onUpdate = () => setVersion(v => v + 1);

  const active = reports.filter(r => r.status !== 'archived');
  const filtered = active.filter(r => {
    const matchSearch = !search || r.title?.toLowerCase().includes(search.toLowerCase());
    const matchAccess = filterAccess === 'all' || r.accessLevel === filterAccess;
    const matchVis = filterVisibility === 'all' || (filterVisibility === 'public' ? r.isPublic : !r.isPublic);
    return matchSearch && matchAccess && matchVis;
  });

  // Unique users across all reports
  const allUsers = (() => {
    const map = {};
    active.forEach(r => {
      if (r.created_by) {
        if (!map[r.created_by]) map[r.created_by] = { email: r.created_by, ownedCount: 0, memberCount: 0 };
        map[r.created_by].ownedCount++;
      }
      (r.invitedEmails || []).forEach(e => {
        if (!map[e]) map[e] = { email: e, ownedCount: 0, memberCount: 0 };
        map[e].memberCount++;
      });
    });
    return Object.values(map);
  })();

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* User roster */}
      <div className="glass-card rounded-2xl p-5 border border-white/8">
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-4 h-4 text-cyan-400" />
          <h2 className="font-semibold text-sm">User Roster</h2>
          <span className="text-xs text-white/30 ml-auto">{allUsers.length} unique users</span>
        </div>
        {allUsers.length === 0 ? (
          <div className="text-xs text-white/25 text-center py-4">No users found — share a report to add members.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {allUsers.map(u => (
              <div key={u.email} className="flex items-center gap-3 p-3 rounded-xl bg-white/3 border border-white/6">
                <div className="w-8 h-8 rounded-full bg-purple-400/10 border border-purple-400/15 flex items-center justify-center text-xs font-bold text-purple-400 flex-shrink-0">
                  {u.email?.[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-white/70 font-medium truncate">{u.email}</div>
                  <div className="text-xs text-white/30 mt-0.5">
                    {u.ownedCount > 0 && `Owner of ${u.ownedCount}`}
                    {u.ownedCount > 0 && u.memberCount > 0 && ' · '}
                    {u.memberCount > 0 && `Member of ${u.memberCount}`}
                  </div>
                </div>
                {u.email === user?.email && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-400/10 border border-cyan-400/20 text-cyan-400">You</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Report access matrix */}
      <div>
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <h2 className="font-semibold text-sm flex items-center gap-2"><Shield className="w-4 h-4 text-amber-400" /> Report Access Matrix</h2>
          <div className="flex-1 relative min-w-40">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-white/30" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search reports…"
              className="w-full pl-8 pr-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs focus:outline-none focus:border-cyan-400/30 text-foreground" />
          </div>
          <select value={filterAccess} onChange={e => setFilterAccess(e.target.value)}
            className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-foreground focus:outline-none">
            <option value="all">All access levels</option>
            <option value="view">View only</option>
            <option value="comment">Can comment</option>
            <option value="edit">Can edit</option>
          </select>
          <select value={filterVisibility} onChange={e => setFilterVisibility(e.target.value)}
            className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-foreground focus:outline-none">
            <option value="all">All visibility</option>
            <option value="public">Public only</option>
            <option value="private">Private only</option>
          </select>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-16 text-white/25">
            <Shield className="w-10 h-10 mx-auto mb-3 opacity-20" />
            <p className="text-sm">No reports match your filters.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(report => (
              <ReportAccessRow key={report.id + version} report={report} onUpdate={onUpdate} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}