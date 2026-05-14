import { ClipboardList, Shield } from 'lucide-react';

function fmt(dt) {
  if (!dt) return '—';
  return new Date(dt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

const ACTION_COLORS = {
  viewed_user_detail: 'text-cyan-400',
  marked_error_resolved: 'text-green-400',
  exported_data: 'text-yellow-400',
  changed_role: 'text-orange-400',
  blocked_user: 'text-red-400',
  deleted_record: 'text-red-400',
};

export default function AdminAuditLog({ logs = [] }) {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-red-400" />
          <span className="font-bold text-sm">Admin Audit Trail</span>
        </div>
        <span className="text-xs text-white/25">{logs.length} actions recorded</span>
      </div>

      {logs.length === 0 ? (
        <div className="glass-card rounded-2xl border border-white/8 p-12 text-center">
          <ClipboardList className="w-10 h-10 mx-auto mb-3 text-white/15" />
          <p className="text-sm text-white/30">No admin actions recorded yet.</p>
          <p className="text-xs text-white/20 mt-1">Actions like viewing user details or resolving errors will appear here.</p>
        </div>
      ) : (
        <div className="glass-card rounded-2xl border border-white/8 overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-white/8 bg-white/2">
                {['Time', 'Admin', 'Action', 'Target Entity', 'Target ID'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-white/30 font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {logs.map((log, i) => (
                <tr key={i} className="border-b border-white/5 hover:bg-white/2 transition-colors">
                  <td className="px-4 py-3 text-white/30 whitespace-nowrap">{fmt(log.timestamp)}</td>
                  <td className="px-4 py-3 text-white/55">{log.adminEmail}</td>
                  <td className="px-4 py-3">
                    <span className={`font-semibold ${ACTION_COLORS[log.action] || 'text-white/55'}`}>
                      {(log.action || '').replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-white/35">{log.targetEntity || '—'}</td>
                  <td className="px-4 py-3 text-white/30 max-w-48 truncate">{log.targetId || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}