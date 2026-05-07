import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import {
  Shield, ChevronLeft, Users, ScrollText, GitBranch,
  Database, Lock, Globe, BarChart3
} from 'lucide-react';
import GovernanceAccessControl from '@/components/governance/GovernanceAccessControl';
import GovernanceAuditLog from '@/components/governance/GovernanceAuditLog';
import GovernanceVersionControl from '@/components/governance/GovernanceVersionControl';

const TABS = [
  { id: 'access',   label: 'User Access',      icon: Users,      color: 'text-cyan-400',   desc: 'Permissions & roles per dataset and dashboard' },
  { id: 'audit',    label: 'Audit Log',         icon: ScrollText, color: 'text-amber-400',  desc: 'All read, write, share, and delete events' },
  { id: 'versions', label: 'Version Control',   icon: GitBranch,  color: 'text-purple-400', desc: 'Snapshot history for reports and datasets' },
];

export default function Governance() {
  const [activeTab, setActiveTab] = useState('access');
  const [reports, setReports] = useState([]);
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({ reports: 0, public: 0, private: 0, users: 0 });

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
    base44.entities.SharedReport.list('-created_date', 100).then(data => {
      setReports(data);
      const emails = new Set(data.map(r => r.created_by).filter(Boolean));
      data.forEach(r => (r.invitedEmails || []).forEach(e => emails.add(e)));
      setStats({
        reports: data.filter(r => r.status !== 'archived').length,
        public: data.filter(r => r.isPublic).length,
        private: data.filter(r => !r.isPublic).length,
        users: emails.size,
      });
    });
  }, []);

  const ActiveTab = { access: GovernanceAccessControl, audit: GovernanceAuditLog, versions: GovernanceVersionControl }[activeTab];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="border-b border-white/5 px-6 py-4 bg-white/[0.01] flex-shrink-0">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <Link to="/collaboration" className="p-1.5 rounded-lg text-white/30 hover:text-white/70 hover:bg-white/5 transition-all">
              <ChevronLeft className="w-4 h-4" />
            </Link>
            <div className="w-9 h-9 rounded-xl bg-cyan-400/10 border border-cyan-400/20 flex items-center justify-center">
              <Shield className="w-4 h-4 text-cyan-400" />
            </div>
            <div>
              <h1 className="text-lg font-bold">Data Governance</h1>
              <p className="text-xs text-muted-foreground">Access control · Audit logs · Version history</p>
            </div>
          </div>
          {/* KPI strip */}
          <div className="flex items-center gap-4 flex-wrap">
            {[
              { icon: BarChart3, label: 'Reports', value: stats.reports, color: 'text-cyan-400' },
              { icon: Globe,     label: 'Public',  value: stats.public,  color: 'text-green-400' },
              { icon: Lock,      label: 'Private', value: stats.private, color: 'text-amber-400' },
              { icon: Users,     label: 'Users',   value: stats.users,   color: 'text-purple-400' },
            ].map(s => (
              <div key={s.label} className="flex items-center gap-1.5 text-xs">
                <s.icon className={`w-3.5 h-3.5 ${s.color}`} />
                <span className={`font-bold font-mono ${s.color}`}>{s.value}</span>
                <span className="text-white/30">{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div className="border-b border-white/5 px-6 flex-shrink-0 bg-white/[0.005] overflow-x-auto">
        <div className="max-w-7xl mx-auto flex gap-0.5 pt-2">
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-t-xl text-xs font-medium transition-all whitespace-nowrap border-b-2 ${
                activeTab === tab.id
                  ? `bg-white/8 border-cyan-400 text-white`
                  : 'border-transparent text-white/35 hover:text-white/65 hover:bg-white/4'
              }`}>
              <tab.icon className={`w-3.5 h-3.5 ${activeTab === tab.id ? tab.color : ''}`} />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        <motion.div key={activeTab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.13 }}>
          <ActiveTab reports={reports} user={user} />
        </motion.div>
      </div>
    </div>
  );
}