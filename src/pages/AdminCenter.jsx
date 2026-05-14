/**
 * AdminCenter — Full analytics + monitoring dashboard
 * Access: Admin role or allowlisted emails only
 */
import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import {
  Shield, Users, Activity, Brain, Database, AlertTriangle,
  ClipboardList, BarChart2, TrendingUp, RefreshCw, Loader2,
  Search, Filter, Eye, ChevronRight, X, CheckCircle2,
  AlertCircle, Clock, Globe, Zap, FileText, Lock,
} from 'lucide-react';
import AdminOverview from '@/components/admin/AdminOverview.jsx';
import AdminUsersTable from '@/components/admin/AdminUsersTable.jsx';
import AdminFeatureUsage from '@/components/admin/AdminFeatureUsage.jsx';
import AdminAIMonitor from '@/components/admin/AdminAIMonitor.jsx';
import AdminErrorLogs from '@/components/admin/AdminErrorLogs.jsx';
import AdminAuditLog from '@/components/admin/AdminAuditLog.jsx';
import AdminModuleUsage from '@/components/admin/AdminModuleUsage.jsx';

const ADMIN_EMAILS = ['rthati1@asu.edu', 'thatirithikroy@gmail.com'];

function isAdmin(user) {
  if (!user) return false;
  if ((user.role || '').toLowerCase() === 'admin') return true;
  return ADMIN_EMAILS.includes((user.email || '').toLowerCase());
}

const TABS = [
  { id: 'overview',  label: 'Overview',       icon: BarChart2 },
  { id: 'users',     label: 'Users',           icon: Users },
  { id: 'features',  label: 'Feature Usage',   icon: TrendingUp },
  { id: 'ai',        label: 'AI Monitor',      icon: Brain },
  { id: 'errors',    label: 'Error Logs',      icon: AlertTriangle },
  { id: 'modules',   label: 'Module Usage',    icon: Activity },
  { id: 'audit',     label: 'Audit Log',       icon: ClipboardList },
];

export default function AdminCenter() {
  const { user } = useAuth();
  const [tab, setTab] = useState('overview');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastRefresh, setLastRefresh] = useState(null);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await base44.functions.invoke('getAdminAnalytics', {});
      if (res.data?.error) throw new Error(res.data.error);
      setData(res.data);
      setLastRefresh(new Date());
    } catch (e) {
      setError(e.message || 'Failed to load admin data');
    }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  // ── Access denied ────────────────────────────────────────────────────────────
  if (!user || !isAdmin(user)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-red-400/10 border border-red-400/20 flex items-center justify-center mx-auto">
            <Lock className="w-8 h-8 text-red-400" />
          </div>
          <h2 className="text-xl font-bold">Access Denied</h2>
          <p className="text-sm text-muted-foreground">You do not have permission to view this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-white/8 px-8 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-400/15 border border-red-400/25 flex items-center justify-center">
            <Shield className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <h1 className="text-xl font-black">Admin Center</h1>
            <p className="text-xs text-muted-foreground">
              Secure analytics · {user.email}
              {lastRefresh && <span className="ml-2 text-white/20">· refreshed {lastRefresh.toLocaleTimeString()}</span>}
            </p>
          </div>
        </div>
        <button onClick={loadData} disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white/40 hover:text-white/70 hover:border-white/20 transition-all disabled:opacity-40">
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-white/8 px-8 flex gap-0.5 overflow-x-auto">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-3 text-xs font-semibold whitespace-nowrap border-b-2 transition-all ${tab === t.id ? 'border-red-400 text-red-400' : 'border-transparent text-white/35 hover:text-white/65'}`}>
            <t.icon className="w-3.5 h-3.5" />{t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-8">
        {loading && !data && (
          <div className="flex items-center justify-center py-24">
            <div className="text-center space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-red-400 mx-auto" />
              <p className="text-sm text-white/40">Loading admin analytics…</p>
            </div>
          </div>
        )}
        {error && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-red-400/8 border border-red-400/20 text-red-400 text-sm mb-6">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
          </div>
        )}
        {data && (
          <motion.div key={tab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
            {tab === 'overview'  && <AdminOverview overview={data.overview} featureUsage={data.featureUsage} pageViewsByDay={data.pageViewsByDay} />}
            {tab === 'users'     && <AdminUsersTable users={data.users} recentEvents={data.recentEvents} />}
            {tab === 'features'  && <AdminFeatureUsage featureUsage={data.featureUsage} recentEvents={data.recentEvents} />}
            {tab === 'ai'        && <AdminAIMonitor recentEvents={data.recentEvents} aiByUser={data.aiByUser} />}
            {tab === 'errors'    && <AdminErrorLogs errors={data.recentErrors} onRefresh={loadData} />}
            {tab === 'modules'   && <AdminModuleUsage recentEvents={data.recentEvents} recentErrors={data.recentErrors} />}
            {tab === 'audit'     && <AdminAuditLog logs={data.auditLogs} />}
          </motion.div>
        )}
      </div>

      {/* Privacy notice */}
      <div className="px-8 pb-6">
        <p className="text-xs text-white/15 border-t border-white/5 pt-4">
          🔒 Usage activity such as page visits, feature usage, and app interactions may be collected to improve OmniData AI Analytics Studio. No passwords are stored. Admin access only.
        </p>
      </div>
    </div>
  );
}