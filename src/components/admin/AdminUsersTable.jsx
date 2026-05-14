import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Search, Eye, X, Loader2, ChevronDown, ChevronUp, Shield, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

function fmt(dt) {
  if (!dt) return '—';
  return new Date(dt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' });
}

function StatusBadge({ status }) {
  const colors = { Active: 'text-green-400 bg-green-400/10 border-green-400/20', Inactive: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20', Blocked: 'text-red-400 bg-red-400/10 border-red-400/20' };
  return <span className={`text-xs px-2 py-0.5 rounded-full border ${colors[status] || colors.Active}`}>{status || 'Active'}</span>;
}

function UserDetail({ user, onClose }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);

  useState(() => {
    base44.functions.invoke('getUserActivityDetail', { email: user.email })
      .then(r => { setDetail(r.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
      className="w-96 flex-shrink-0 border-l border-white/8 overflow-y-auto bg-background">
      <div className="sticky top-0 bg-background border-b border-white/8 px-5 py-4 flex items-center justify-between z-10">
        <div>
          <div className="font-bold text-sm">{user.fullName || user.email}</div>
          <div className="text-xs text-white/35">{user.email}</div>
        </div>
        <button onClick={onClose} className="text-white/30 hover:text-white/60"><X className="w-4 h-4" /></button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-white/30" /></div>
      ) : detail ? (
        <div className="p-5 space-y-5">
          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'AI Questions', value: detail.stats?.totalAIQuestions },
              { label: 'Uploads', value: detail.stats?.totalUploads },
              { label: 'Charts', value: detail.stats?.totalCharts },
              { label: 'Reports', value: detail.stats?.totalReports },
              { label: 'Page Views', value: detail.stats?.totalPageViews },
              { label: 'Sessions', value: detail.sessions?.length },
            ].map(s => (
              <div key={s.label} className="glass-card rounded-xl border border-white/8 p-3 text-center">
                <div className="text-2xl font-black text-cyan-400">{s.value ?? 0}</div>
                <div className="text-xs text-white/30">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Profile */}
          <div className="space-y-1.5 text-xs">
            <div className="text-white/25 font-semibold uppercase tracking-widest mb-2">Profile</div>
            {[
              ['Login Provider', detail.profile?.loginProvider],
              ['First Login', fmt(detail.profile?.firstLoginAt)],
              ['Last Login', fmt(detail.profile?.lastLoginAt)],
              ['Last Active Page', detail.profile?.lastActivePage],
              ['Status', detail.profile?.status],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between py-1.5 border-b border-white/5">
                <span className="text-white/35">{k}</span>
                <span className="text-white/65">{v || '—'}</span>
              </div>
            ))}
          </div>

          {/* Pages visited */}
          {detail.stats?.pagesVisited?.length > 0 && (
            <div>
              <div className="text-xs text-white/25 font-semibold uppercase tracking-widest mb-2">Pages Visited</div>
              <div className="flex flex-wrap gap-1">
                {detail.stats.pagesVisited.map(p => (
                  <span key={p} className="text-xs px-2 py-0.5 rounded-full bg-white/5 border border-white/8 text-white/40">{p}</span>
                ))}
              </div>
            </div>
          )}

          {/* Features used */}
          {detail.stats?.featuresUsed?.length > 0 && (
            <div>
              <div className="text-xs text-white/25 font-semibold uppercase tracking-widest mb-2">Features Used</div>
              <div className="flex flex-wrap gap-1">
                {detail.stats.featuresUsed.map(f => (
                  <span key={f} className="text-xs px-2 py-0.5 rounded-full bg-purple-400/10 border border-purple-400/20 text-purple-400">{f}</span>
                ))}
              </div>
            </div>
          )}

          {/* Recent events */}
          {detail.recentEvents?.length > 0 && (
            <div>
              <div className="text-xs text-white/25 font-semibold uppercase tracking-widest mb-2">Recent Activity</div>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {detail.recentEvents.slice(0, 20).map((e, i) => (
                  <div key={i} className="flex items-center justify-between text-xs py-1.5 border-b border-white/5">
                    <span className="text-white/50">{e.eventType?.replace(/_/g, ' ')}</span>
                    <span className="text-white/25">{fmt(e.timestamp)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : <p className="p-5 text-sm text-white/30">No detail data available.</p>}
    </motion.div>
  );
}

export default function AdminUsersTable({ users = [], recentEvents = [] }) {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedUser, setSelectedUser] = useState(null);
  const [sortBy, setSortBy] = useState('lastActiveAt');

  const filtered = users.filter(u => {
    const q = search.toLowerCase();
    if (q && !u.email?.toLowerCase().includes(q) && !u.fullName?.toLowerCase().includes(q)) return false;
    if (roleFilter !== 'all' && u.role !== roleFilter) return false;
    if (statusFilter !== 'all' && u.status !== statusFilter) return false;
    return true;
  }).sort((a, b) => {
    if (sortBy === 'lastActiveAt') return new Date(b.lastActiveAt || 0) - new Date(a.lastActiveAt || 0);
    if (sortBy === 'loginCount') return (b.loginCount || 0) - (a.loginCount || 0);
    if (sortBy === 'visitCount') return (b.visitCount || 0) - (a.visitCount || 0);
    return 0;
  });

  return (
    <div className="flex gap-4 h-full">
      <div className="flex-1 space-y-4 min-w-0">
        {/* Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-white/10 bg-white/3 flex-1 min-w-48">
            <Search className="w-3.5 h-3.5 text-white/25 flex-shrink-0" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or email…"
              className="bg-transparent text-sm text-foreground placeholder:text-white/25 focus:outline-none flex-1" />
          </div>
          <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-white/10 bg-white/3 text-xs text-white/60 focus:outline-none">
            <option value="all">All Roles</option>
            <option value="admin">Admin</option>
            <option value="user">User</option>
          </select>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-white/10 bg-white/3 text-xs text-white/60 focus:outline-none">
            <option value="all">All Status</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
            <option value="Blocked">Blocked</option>
          </select>
          <select value={sortBy} onChange={e => setSortBy(e.target.value)}
            className="px-3 py-2 rounded-xl border border-white/10 bg-white/3 text-xs text-white/60 focus:outline-none">
            <option value="lastActiveAt">Last Active</option>
            <option value="loginCount">Login Count</option>
            <option value="visitCount">Visit Count</option>
          </select>
          <span className="text-xs text-white/25">{filtered.length} users</span>
        </div>

        {/* Table */}
        <div className="glass-card rounded-2xl border border-white/8 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/8 bg-white/2">
                  {['Name / Email', 'Role', 'First Login', 'Last Login', 'Logins', 'Visits', 'Last Page', 'Status', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-white/30 font-semibold whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr><td colSpan={9} className="px-4 py-8 text-center text-white/25 text-sm">No users found</td></tr>
                )}
                {filtered.map(u => (
                  <tr key={u.email} onClick={() => setSelectedUser(u)}
                    className={`border-b border-white/5 hover:bg-white/3 cursor-pointer transition-colors ${selectedUser?.email === u.email ? 'bg-white/4' : ''}`}>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-white/75">{u.fullName || '—'}</div>
                      <div className="text-white/30">{u.email}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`flex items-center gap-1 ${(u.role || '').toLowerCase() === 'admin' ? 'text-red-400' : 'text-white/40'}`}>
                        {(u.role || '').toLowerCase() === 'admin' ? <Shield className="w-3 h-3" /> : <User className="w-3 h-3" />}
                        {u.role || 'user'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-white/40">{fmt(u.firstLoginAt)}</td>
                    <td className="px-4 py-3 text-white/40">{fmt(u.lastLoginAt)}</td>
                    <td className="px-4 py-3 text-cyan-400 font-mono">{u.loginCount || 0}</td>
                    <td className="px-4 py-3 text-white/40 font-mono">{u.visitCount || 0}</td>
                    <td className="px-4 py-3 text-white/35 max-w-32 truncate">{u.lastActivePage || '—'}</td>
                    <td className="px-4 py-3"><StatusBadge status={u.status} /></td>
                    <td className="px-4 py-3"><Eye className="w-3.5 h-3.5 text-white/25" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Detail panel */}
      <AnimatePresence>
        {selectedUser && (
          <UserDetail user={selectedUser} onClose={() => setSelectedUser(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}