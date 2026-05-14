import { useState } from 'react';
import { AlertTriangle, CheckCircle2, RefreshCw, AlertCircle } from 'lucide-react';
import { base44 } from '@/api/base44Client';

function SeverityBadge({ severity }) {
  const colors = {
    critical: 'bg-red-400/20 text-red-400 border-red-400/30',
    high: 'bg-orange-400/20 text-orange-400 border-orange-400/30',
    medium: 'bg-yellow-400/20 text-yellow-400 border-yellow-400/30',
    low: 'bg-blue-400/20 text-blue-400 border-blue-400/30',
  };
  return <span className={`text-xs px-2 py-0.5 rounded-full border ${colors[severity] || colors.medium}`}>{severity || 'medium'}</span>;
}

export default function AdminErrorLogs({ errors = [], onRefresh }) {
  const [filter, setFilter] = useState('all');
  const [markingId, setMarkingId] = useState(null);

  const filtered = errors.filter(e => filter === 'all' || e.severity === filter || (filter === 'unresolved' && !e.resolved));

  const markResolved = async (error) => {
    setMarkingId(error.id);
    try {
      await base44.entities.AppErrorLog.update(error.id, { resolved: true });
      await base44.functions.invoke('logAdminAction', {
        action: 'marked_error_resolved',
        targetEntity: 'AppErrorLog',
        targetId: error.id,
        details: { errorMessage: error.errorMessage },
      });
      onRefresh();
    } catch { }
    setMarkingId(null);
  };

  const unresolved = errors.filter(e => !e.resolved).length;
  const critical = errors.filter(e => e.severity === 'critical').length;

  return (
    <div className="space-y-5">
      {/* Summary */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Errors', value: errors.length, color: '#ef4444' },
          { label: 'Unresolved', value: unresolved, color: '#f97316' },
          { label: 'Critical', value: critical, color: '#dc2626' },
          { label: 'Resolved', value: errors.length - unresolved, color: '#4caf50' },
        ].map(k => (
          <div key={k.label} className="glass-card rounded-xl border border-white/8 p-4 text-center">
            <div className="text-2xl font-black font-mono" style={{ color: k.color }}>{k.value}</div>
            <div className="text-xs text-white/30 mt-1">{k.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        {['all', 'unresolved', 'critical', 'high', 'medium', 'low'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`text-xs px-3 py-1.5 rounded-xl border transition-all ${filter === f ? 'bg-red-400/15 border-red-400/25 text-red-400' : 'border-white/8 text-white/35 hover:text-white/60 hover:border-white/15'}`}>
            {f}
          </button>
        ))}
        <span className="text-xs text-white/25 ml-auto">{filtered.length} records</span>
      </div>

      {/* Table */}
      <div className="glass-card rounded-2xl border border-white/8 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-white/8 bg-white/2">
                {['Time', 'User', 'Page', 'Feature', 'Error', 'Severity', 'Status', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-white/30 font-semibold whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-10 text-center text-white/25">No error logs found</td></tr>
              )}
              {filtered.map((e, i) => (
                <tr key={i} className="border-b border-white/5 hover:bg-white/2 transition-colors">
                  <td className="px-4 py-3 text-white/30 whitespace-nowrap">{e.timestamp?.slice(0, 16).replace('T', ' ')}</td>
                  <td className="px-4 py-3 text-white/50 max-w-28 truncate">{e.userEmail || '—'}</td>
                  <td className="px-4 py-3 text-white/40 max-w-24 truncate">{e.page || '—'}</td>
                  <td className="px-4 py-3 text-white/40">{e.feature || '—'}</td>
                  <td className="px-4 py-3 text-white/65 max-w-64 truncate" title={e.errorMessage}>{e.errorMessage}</td>
                  <td className="px-4 py-3"><SeverityBadge severity={e.severity} /></td>
                  <td className="px-4 py-3">
                    {e.resolved
                      ? <span className="flex items-center gap-1 text-green-400"><CheckCircle2 className="w-3 h-3" />Resolved</span>
                      : <span className="flex items-center gap-1 text-red-400"><AlertCircle className="w-3 h-3" />Open</span>}
                  </td>
                  <td className="px-4 py-3">
                    {!e.resolved && (
                      <button onClick={() => markResolved(e)} disabled={markingId === e.id}
                        className="text-xs text-white/25 hover:text-green-400 transition-colors">
                        {markingId === e.id ? '…' : 'Resolve'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}