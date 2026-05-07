import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import SharedReportCard from '@/components/collaboration/SharedReportCard';
import CreateShareModal from '@/components/collaboration/CreateShareModal';
import ReportViewer from '@/components/collaboration/ReportViewer';
import {
  Users, Plus, Search, Filter, Share2, Lock, Globe,
  BarChart3, FileText, Loader2, Archive, Inbox
} from 'lucide-react';

export default function Collaboration() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all'); // all | mine | shared
  const [showCreate, setShowCreate] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [user, setUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
    fetchReports();
  }, []);

  const fetchReports = async () => {
    setLoading(true);
    const data = await base44.entities.SharedReport.list('-created_date', 50);
    setReports(data);
    setLoading(false);
  };

  const filtered = reports.filter(r => {
    const matchSearch = !search || r.title?.toLowerCase().includes(search.toLowerCase()) || r.description?.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'all' ||
      (filter === 'mine' && r.created_by === user?.email) ||
      (filter === 'shared' && r.created_by !== user?.email);
    return matchSearch && matchFilter && r.status !== 'archived';
  });

  const archived = reports.filter(r => r.status === 'archived');

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-white/5 bg-white/[0.01] px-8 py-5">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Users className="w-5 h-5 text-cyan-400" />
              <h1 className="text-xl font-bold">Collaboration Workspace</h1>
            </div>
            <p className="text-sm text-muted-foreground">Share reports securely and collaborate with your team</p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-cyan-400 rounded-xl text-sm font-bold hover:bg-cyan-300 transition-all"
            style={{ color: 'hsl(222,47%,6%)' }}
          >
            <Plus className="w-4 h-4" /> Share Report
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-8 py-6 space-y-6">
        {/* Stats strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Total Shared', value: reports.filter(r => r.status !== 'archived').length, color: 'text-cyan-400', icon: Share2 },
            { label: 'My Reports', value: reports.filter(r => r.created_by === user?.email && r.status !== 'archived').length, color: 'text-purple-400', icon: FileText },
            { label: 'Public Links', value: reports.filter(r => r.isPublic && r.status !== 'archived').length, color: 'text-green-400', icon: Globe },
            { label: 'Private', value: reports.filter(r => !r.isPublic && r.status !== 'archived').length, color: 'text-amber-400', icon: Lock },
          ].map((stat, i) => (
            <motion.div key={stat.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="glass-card rounded-2xl p-4 border border-white/8">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-white/35 uppercase tracking-wider">{stat.label}</span>
                <stat.icon className={`w-3.5 h-3.5 ${stat.color}`} />
              </div>
              <div className={`text-2xl font-black font-mono ${stat.color}`}>{stat.value}</div>
            </motion.div>
          ))}
        </div>

        {/* Search + filters */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search reports…"
              className="w-full pl-9 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-cyan-400/30 text-foreground"
            />
          </div>
          <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-xl p-1">
            {[['all', 'All'], ['mine', 'Mine'], ['shared', 'Shared with me']].map(([val, label]) => (
              <button key={val} onClick={() => setFilter(val)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filter === val ? 'bg-cyan-400/15 text-cyan-400' : 'text-white/40 hover:text-white/70'}`}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Reports grid */}
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-6 h-6 text-cyan-400 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/8 flex items-center justify-center mb-4">
              <Inbox className="w-7 h-7 text-white/20" />
            </div>
            <h3 className="font-semibold mb-1">No shared reports yet</h3>
            <p className="text-sm text-muted-foreground mb-5 max-w-xs">
              {search ? 'No reports match your search.' : 'Share your first report to start collaborating with your team.'}
            </p>
            {!search && (
              <button onClick={() => setShowCreate(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-cyan-400/10 border border-cyan-400/20 text-cyan-400 rounded-xl text-sm font-semibold hover:bg-cyan-400/15 transition-colors">
                <Plus className="w-4 h-4" /> Share a Report
              </button>
            )}
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            <AnimatePresence>
              {filtered.map((report, i) => (
                <SharedReportCard
                  key={report.id}
                  report={report}
                  currentUser={user}
                  index={i}
                  onClick={() => setSelectedReport(report)}
                  onArchive={async () => {
                    await base44.entities.SharedReport.update(report.id, { status: 'archived' });
                    fetchReports();
                  }}
                  onRefresh={fetchReports}
                />
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* Archived */}
        {archived.length > 0 && (
          <details className="group">
            <summary className="flex items-center gap-2 text-xs text-white/30 cursor-pointer hover:text-white/50 transition-colors py-2">
              <Archive className="w-3.5 h-3.5" />
              {archived.length} archived report{archived.length > 1 ? 's' : ''}
            </summary>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mt-3">
              {archived.map((report, i) => (
                <SharedReportCard
                  key={report.id}
                  report={report}
                  currentUser={user}
                  index={i}
                  onClick={() => setSelectedReport(report)}
                  onArchive={async () => {
                    await base44.entities.SharedReport.update(report.id, { status: 'active' });
                    fetchReports();
                  }}
                  isArchived
                  onRefresh={fetchReports}
                />
              ))}
            </div>
          </details>
        )}
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showCreate && (
          <CreateShareModal
            onClose={() => setShowCreate(false)}
            onCreated={() => { setShowCreate(false); fetchReports(); }}
            currentUser={user}
          />
        )}
        {selectedReport && (
          <ReportViewer
            report={selectedReport}
            currentUser={user}
            onClose={() => setSelectedReport(null)}
            onUpdate={fetchReports}
          />
        )}
      </AnimatePresence>
    </div>
  );
}