/**
 * AdminModuleUsage — Shows which analysts use which modules, error logs by feature, adoption rates
 */
import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LineChart, Line } from 'recharts';

const PALETTE = ['#00e5ff', '#a855f7', '#4caf50', '#ff6b35', '#ffcc02', '#ff2d7a', '#60a5fa', '#34d399'];
const AXIS = { fontSize: 9, fill: 'rgba(255,255,255,0.35)' };
const TT = { backgroundColor: 'rgba(4,9,20,0.97)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, fontSize: 11 };

const MODULE_LABELS = {
  'visualbuilder': 'Chart Builder', 'analyst': 'AI Analyst', 'sql': 'SQL Studio',
  'data_explorer': 'Data Explorer', 'forecast': 'Forecast', 'ml': 'ML Workbench',
  'rfm': 'RFM Segments', 'funnel': 'Funnel', 'cohort': 'Cohort', 'clv': 'CLV',
  'overview': 'Overview', 'reports': 'Reports', 'governance': 'Governance',
  'stories': 'Story Builder', 'collaboration': 'Collaboration', 'alerts': 'Alerts',
  'notebook': 'Notebook', 'what_if': 'What-If', 'semantic': 'Metric Store',
  'intake': 'Data Upload',
};

function Badge({ count, color }) {
  return (
    <span className="text-xs px-1.5 py-0.5 rounded font-mono font-bold"
      style={{ color, background: `${color}20`, border: `1px solid ${color}30` }}>{count}</span>
  );
}

export default function AdminModuleUsage({ recentEvents = [], recentErrors = [] }) {
  // Module adoption: count unique users per module
  const moduleAdoption = useMemo(() => {
    const moduleUsers = {};
    const moduleCount = {};
    recentEvents.forEach(e => {
      const mod = e.feature || (e.page?.split('/')[1]) || 'unknown';
      if (!mod || mod === 'unknown') return;
      if (!moduleUsers[mod]) moduleUsers[mod] = new Set();
      moduleUsers[mod].add(e.userEmail);
      moduleCount[mod] = (moduleCount[mod] || 0) + 1;
    });
    return Object.entries(moduleUsers)
      .map(([mod, users]) => ({
        module: MODULE_LABELS[mod] || mod,
        uniqueUsers: users.size,
        totalEvents: moduleCount[mod] || 0,
        adoption: Math.round((users.size / Math.max(1, new Set(recentEvents.map(e => e.userEmail)).size)) * 100),
      }))
      .sort((a, b) => b.totalEvents - a.totalEvents)
      .slice(0, 15);
  }, [recentEvents]);

  // Analyst × module matrix
  const analystModuleMatrix = useMemo(() => {
    const matrix = {}; // { email: { mod: count } }
    recentEvents.forEach(e => {
      const mod = e.feature || 'other';
      const email = e.userEmail?.split('@')[0] || 'anon';
      if (!matrix[email]) matrix[email] = {};
      matrix[email][mod] = (matrix[email][mod] || 0) + 1;
    });
    const analysts = Object.keys(matrix).slice(0, 10);
    const topMods = moduleAdoption.slice(0, 6).map(m => {
      const key = Object.keys(MODULE_LABELS).find(k => MODULE_LABELS[k] === m.module) || m.module;
      return key;
    });
    return { analysts, topMods, matrix };
  }, [recentEvents, moduleAdoption]);

  // Errors by module
  const errorsByModule = useMemo(() => {
    const errs = {};
    recentErrors.forEach(e => {
      const mod = e.feature || 'unknown';
      errs[mod] = (errs[mod] || 0) + 1;
    });
    return Object.entries(errs).map(([mod, count]) => ({
      module: MODULE_LABELS[mod] || mod,
      count,
    })).sort((a, b) => b.count - a.count).slice(0, 10);
  }, [recentErrors]);

  // Error rate per module
  const errorRateByModule = useMemo(() => {
    return moduleAdoption.map(m => {
      const key = Object.keys(MODULE_LABELS).find(k => MODULE_LABELS[k] === m.module) || m.module;
      const errs = recentErrors.filter(e => e.feature === key).length;
      return { module: m.module, errorRate: m.totalEvents > 0 ? Math.round((errs / m.totalEvents) * 100) : 0, errors: errs, events: m.totalEvents };
    }).filter(m => m.events > 0);
  }, [moduleAdoption, recentErrors]);

  return (
    <div className="space-y-6">
      {/* Module adoption bar chart */}
      <div className="glass-card rounded-2xl border border-white/8 p-5">
        <h3 className="text-sm font-bold mb-4 text-white/80">Module Adoption — Events & Unique Users</h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={moduleAdoption} margin={{ top: 4, right: 16, bottom: 40, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis dataKey="module" tick={{ ...AXIS, fontSize: 8 }} tickLine={false} axisLine={false} angle={-35} textAnchor="end" interval={0} />
            <YAxis tick={AXIS} tickLine={false} axisLine={false} width={36} />
            <Tooltip contentStyle={TT} />
            <Bar dataKey="totalEvents" name="Total Events" radius={[4, 4, 0, 0]}>
              {moduleAdoption.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} fillOpacity={0.8} />)}
            </Bar>
            <Bar dataKey="uniqueUsers" name="Unique Users" radius={[4, 4, 0, 0]} fill="#ffffff" fillOpacity={0.15} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Analyst × Module heatmap */}
      <div className="glass-card rounded-2xl border border-white/8 p-5">
        <h3 className="text-sm font-bold mb-4 text-white/80">Analyst × Module Usage Matrix</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs min-w-max">
            <thead>
              <tr className="border-b border-white/8">
                <th className="px-3 py-2 text-left text-white/35 font-semibold">Analyst</th>
                {analystModuleMatrix.topMods.map(mod => (
                  <th key={mod} className="px-3 py-2 text-center text-white/35 font-semibold whitespace-nowrap">
                    {MODULE_LABELS[mod] || mod}
                  </th>
                ))}
                <th className="px-3 py-2 text-right text-white/35">Total</th>
              </tr>
            </thead>
            <tbody>
              {analystModuleMatrix.analysts.map((analyst, ai) => {
                const userMods = analystModuleMatrix.matrix[analyst] || {};
                const total = Object.values(userMods).reduce((a, b) => a + b, 0);
                const maxVal = Math.max(...analystModuleMatrix.topMods.map(m => userMods[m] || 0), 1);
                return (
                  <tr key={analyst} className="border-b border-white/5 hover:bg-white/2">
                    <td className="px-3 py-2 text-white/60 font-medium">{analyst}</td>
                    {analystModuleMatrix.topMods.map(mod => {
                      const count = userMods[mod] || 0;
                      const intensity = count / maxVal;
                      return (
                        <td key={mod} className="px-3 py-2 text-center">
                          {count > 0 ? (
                            <span className="inline-block px-2 py-0.5 rounded text-xs font-mono font-bold"
                              style={{ background: `rgba(0,229,255,${0.08 + intensity * 0.35})`, color: `rgba(0,229,255,${0.5 + intensity * 0.5})` }}>
                              {count}
                            </span>
                          ) : <span className="text-white/15">—</span>}
                        </td>
                      );
                    })}
                    <td className="px-3 py-2 text-right font-mono text-white/50">{total}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Error rates by module */}
      <div className="grid grid-cols-2 gap-4">
        <div className="glass-card rounded-2xl border border-white/8 p-5">
          <h3 className="text-sm font-bold mb-4 text-white/80">Errors by Module</h3>
          <div className="space-y-2">
            {errorsByModule.length === 0 && <p className="text-xs text-white/25">No errors recorded.</p>}
            {errorsByModule.map((e, i) => (
              <div key={e.module} className="flex items-center gap-2 text-xs">
                <span className="text-white/40 w-32 truncate">{e.module}</span>
                <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-red-400/70"
                    style={{ width: `${Math.min(100, (e.count / (errorsByModule[0]?.count || 1)) * 100)}%` }} />
                </div>
                <Badge count={e.count} color="#ef4444" />
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card rounded-2xl border border-white/8 p-5">
          <h3 className="text-sm font-bold mb-4 text-white/80">Error Rate % by Module</h3>
          <div className="space-y-2">
            {errorRateByModule.filter(m => m.errors > 0).length === 0 && <p className="text-xs text-white/25">No errors in active modules.</p>}
            {errorRateByModule.filter(m => m.errors > 0).slice(0, 8).map(m => (
              <div key={m.module} className="flex items-center gap-2 text-xs">
                <span className="text-white/40 w-32 truncate">{m.module}</span>
                <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${Math.min(100, m.errorRate)}%`, background: m.errorRate > 10 ? '#ef4444' : m.errorRate > 5 ? '#ffcc02' : '#4caf50' }} />
                </div>
                <span className="font-mono text-white/40 w-10 text-right">{m.errorRate}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Adoption rate summary */}
      <div className="glass-card rounded-2xl border border-white/8 p-5">
        <h3 className="text-sm font-bold mb-4 text-white/80">Module Adoption Rate (% of all users)</h3>
        <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
          {moduleAdoption.slice(0, 10).map((m, i) => (
            <div key={m.module} className="p-3 rounded-xl bg-white/3 border border-white/8 text-center">
              <div className="text-xl font-black font-mono" style={{ color: PALETTE[i % PALETTE.length] }}>{m.adoption}%</div>
              <div className="text-xs text-white/40 mt-1 truncate">{m.module}</div>
              <div className="text-xs text-white/25">{m.uniqueUsers} users</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}