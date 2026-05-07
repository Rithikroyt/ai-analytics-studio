/**
 * AlertMonitorDashboard — Centralized alert monitoring panel
 * Shows all active alerts with severity, status, and dataset drill-through
 */
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWorkspaceStore } from '@/lib/store';
import { Link } from 'react-router-dom';
import {
  Bell, Shield, AlertTriangle, Info, TrendingDown, TrendingUp, Activity,
  CheckCircle2, Clock, Database, ExternalLink, Filter, X, ChevronRight
} from 'lucide-react';

const SEV = {
  critical: { label: 'Critical', color: 'text-red-400', bg: 'bg-red-400/10', border: 'border-red-400/25', dot: 'bg-red-400' },
  warning:  { label: 'Warning',  color: 'text-amber-400', bg: 'bg-amber-400/10', border: 'border-amber-400/25', dot: 'bg-amber-400' },
  info:     { label: 'Info',     color: 'text-blue-400',  bg: 'bg-blue-400/10',  border: 'border-blue-400/25',  dot: 'bg-blue-400' },
};

const COND_ICON = {
  above:      TrendingUp,
  below:      TrendingDown,
  changes_by: Activity,
  anomaly:    Shield,
};

function timeAgo(iso) {
  if (!iso) return 'Never triggered';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'Just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function AlertMonitorDashboard({ compact = false }) {
  const { alerts, tables } = useWorkspaceStore();
  const [filterSev, setFilterSev] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  const activeAlerts = (alerts || []).filter(a => {
    const sevMatch = filterSev === 'all' || (a.severity || 'warning') === filterSev;
    const statusMatch = filterStatus === 'all'
      || (filterStatus === 'active' && a.active)
      || (filterStatus === 'paused' && !a.active);
    return sevMatch && statusMatch;
  });

  const criticalCount = (alerts || []).filter(a => a.active && a.severity === 'critical').length;
  const warningCount  = (alerts || []).filter(a => a.active && a.severity === 'warning').length;
  const triggeredCount = (alerts || []).filter(a => a.lastTriggered).length;

  return (
    <div className={compact ? '' : 'space-y-4'}>
      {/* Summary KPIs */}
      {!compact && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Critical', value: criticalCount, ...SEV.critical },
            { label: 'Warnings', value: warningCount, ...SEV.warning },
            { label: 'Triggered', value: triggeredCount, color: 'text-purple-400', bg: 'bg-purple-400/10', border: 'border-purple-400/25' },
          ].map(s => (
            <div key={s.label} className={`rounded-xl p-3 border ${s.bg} ${s.border} text-center`}>
              <div className={`text-2xl font-black font-mono ${s.color}`}>{s.value}</div>
              <div className="text-xs text-white/40 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      {!compact && (
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="w-3.5 h-3.5 text-white/30" />
          <div className="flex items-center gap-1 bg-white/5 border border-white/8 rounded-lg p-0.5">
            {['all','critical','warning','info'].map(s => (
              <button key={s} onClick={() => setFilterSev(s)}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-all capitalize ${filterSev === s ? 'bg-white/10 text-white' : 'text-white/35 hover:text-white/60'}`}>
                {s}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1 bg-white/5 border border-white/8 rounded-lg p-0.5">
            {['all','active','paused'].map(s => (
              <button key={s} onClick={() => setFilterStatus(s)}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-all capitalize ${filterStatus === s ? 'bg-white/10 text-white' : 'text-white/35 hover:text-white/60'}`}>
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Alert list */}
      {activeAlerts.length === 0 ? (
        <div className="text-center py-10 border border-white/5 rounded-2xl">
          <Bell className="w-8 h-8 mx-auto mb-3 text-white/15" />
          <p className="text-sm text-white/30">No alerts match your filters.</p>
          <Link to="/alerts" className="text-xs text-cyan-400 hover:underline mt-1 inline-block">Configure Alerts →</Link>
        </div>
      ) : (
        <div className="space-y-2">
          <AnimatePresence>
            {activeAlerts.map((alert, i) => {
              const sev = SEV[alert.severity || 'warning'];
              const CondIcon = COND_ICON[alert.condition] || Activity;
              const relatedTable = tables?.find(t =>
                t.columns?.some(c => c.name === alert.metric)
              );
              return (
                <motion.div key={alert.id || i}
                  initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                  className={`flex items-center gap-3 p-3.5 rounded-xl border transition-all ${alert.active ? `${sev.bg} ${sev.border}` : 'bg-white/2 border-white/5 opacity-50'}`}
                >
                  {/* Severity dot */}
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${sev.dot} ${alert.active ? 'animate-pulse' : ''}`} />

                  {/* Icon */}
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${sev.bg} border ${sev.border}`}>
                    <CondIcon className={`w-3.5 h-3.5 ${sev.color}`} />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-xs text-white/80 truncate">{alert.label}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded-full border ${sev.bg} ${sev.border} ${sev.color}`}>{sev.label}</span>
                      {!alert.active && <span className="text-xs text-white/25">Paused</span>}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                      <span className="text-xs text-white/40">{alert.metric}</span>
                      {alert.threshold && alert.condition !== 'anomaly' && (
                        <span className="text-xs text-white/30">{alert.condition} {alert.unit || ''}{alert.threshold}</span>
                      )}
                      <span className="flex items-center gap-1 text-xs text-white/25">
                        <Clock className="w-3 h-3" /> {timeAgo(alert.lastTriggered)}
                      </span>
                    </div>
                  </div>

                  {/* Dataset drill-through */}
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {relatedTable && (
                      <Link to="/workspace"
                        className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg bg-white/5 border border-white/8 hover:bg-white/10 text-white/40 hover:text-white/80 transition-all"
                        title={`Open ${relatedTable.name}`}>
                        <Database className="w-3 h-3" />
                        <span className="hidden sm:inline truncate max-w-20">{relatedTable.name}</span>
                        <ChevronRight className="w-3 h-3" />
                      </Link>
                    )}
                    <Link to="/alerts"
                      className="p-1.5 rounded-lg text-white/25 hover:text-white/70 hover:bg-white/5 transition-all">
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {!compact && (
        <div className="flex items-center justify-between pt-1">
          <span className="text-xs text-white/25">{activeAlerts.length} alert{activeAlerts.length !== 1 ? 's' : ''} shown</span>
          <Link to="/alerts" className="flex items-center gap-1 text-xs text-cyan-400 hover:underline">
            Manage All Alerts <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
      )}
    </div>
  );
}