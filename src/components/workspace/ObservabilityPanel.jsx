/**
 * ObservabilityPanel — Tracing, latency, error rates, alerts
 */
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { obs } from '@/lib/observability';
import { Activity, AlertTriangle, CheckCircle2, Clock, Zap, Database, Brain, RefreshCw, Trash2 } from 'lucide-react';

const fmtMs = ms => ms >= 1000 ? `${(ms/1000).toFixed(1)}s` : `${ms}ms`;
const TYPE_LABELS = { tool_call: 'Tool Call', llm_call: 'LLM Call', sql_run: 'SQL Run', error: 'Error', chart_explain: 'Chart Explain', ai_fallback: 'AI Fallback' };
const TYPE_COLORS = { tool_call: 'text-cyan-400', llm_call: 'text-purple-400', sql_run: 'text-teal-400', error: 'text-red-400', chart_explain: 'text-blue-400', ai_fallback: 'text-amber-400' };

export default function ObservabilityPanel() {
  const [logs, setLogs] = useState([]);
  const [metrics, setMetrics] = useState({});
  const [alerts, setAlerts] = useState([]);
  const [filterType, setFilterType] = useState('all');
  const [tab, setTab] = useState('metrics');

  const refresh = () => {
    setLogs(obs.getLogs().slice(-100).reverse());
    setMetrics(obs.getMetrics());
    setAlerts(obs.getAlerts());
  };

  useEffect(() => {
    refresh();
    const unsub = obs.subscribe(() => {
      setLogs(obs.getLogs().slice(-100).reverse());
      setMetrics(obs.getMetrics());
      setAlerts(obs.getAlerts());
    });
    return unsub;
  }, []);

  const filteredLogs = filterType === 'all' ? logs : logs.filter(l => l.type === filterType);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold mb-1">Observability</h1>
            <p className="text-sm text-muted-foreground">Tool call tracing · Latency metrics · Error rates · AI fallback alerts</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={refresh} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white/50 hover:text-white/80 transition-all">
              <RefreshCw className="w-3 h-3" /> Refresh
            </button>
            <button onClick={() => { obs.clear(); refresh(); }} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-red-400/8 border border-red-400/20 text-red-400/70 hover:text-red-400 transition-all">
              <Trash2 className="w-3 h-3" /> Clear
            </button>
          </div>
        </div>
      </motion.div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((alert, i) => (
            <div key={i} className={`flex items-center gap-3 p-3 rounded-xl border text-sm ${alert.level === 'error' ? 'bg-red-400/5 border-red-400/20 text-red-400' : 'bg-amber-400/5 border-amber-400/20 text-amber-400'}`}>
              <AlertTriangle className="w-4 h-4 flex-shrink-0" /> {alert.msg}
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-0.5 border-b border-white/5">
        {['metrics', 'trace'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-xs font-semibold rounded-t-xl transition-all capitalize ${tab === t ? 'bg-white/8 text-cyan-400 border-t border-x border-white/10' : 'text-white/35 hover:text-white/65'}`}>
            {t === 'metrics' ? '📊 Metrics' : '🔍 Trace Log'}
          </button>
        ))}
      </div>

      {tab === 'metrics' && (
        <div className="space-y-4">
          {Object.keys(metrics).length === 0 ? (
            <div className="text-center py-12 text-sm text-white/30">
              No events recorded yet. Use the workspace to generate telemetry.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {Object.entries(metrics).map(([type, data]) => (
                <motion.div key={type} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  className="rounded-2xl p-4 border border-white/8 bg-white/2">
                  <div className={`text-xs font-semibold uppercase tracking-widest mb-3 ${TYPE_COLORS[type] || 'text-white/50'}`}>
                    {TYPE_LABELS[type] || type}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      ['Calls', data.count],
                      ['Error Rate', `${data.errorRate}%`],
                      ['Avg Latency', data.avgLatency ? fmtMs(data.avgLatency) : '—'],
                      ['P95 Latency', data.p95 ? fmtMs(data.p95) : '—'],
                    ].map(([l, v]) => (
                      <div key={l}>
                        <div className="text-xs text-white/25">{l}</div>
                        <div className={`text-sm font-mono font-bold ${l === 'Error Rate' && data.errorRate > 0 ? 'text-red-400' : 'text-white/70'}`}>{v}</div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'trace' && (
        <div className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            {['all', 'tool_call', 'llm_call', 'sql_run', 'error', 'ai_fallback'].map(type => (
              <button key={type} onClick={() => setFilterType(type)}
                className={`text-xs px-3 py-1 rounded-full border transition-all ${filterType === type ? 'bg-white/10 border-white/20 text-white' : 'bg-white/4 border-white/8 text-white/35 hover:text-white/65'}`}>
                {TYPE_LABELS[type] || type}
              </button>
            ))}
          </div>
          {filteredLogs.length === 0 ? (
            <div className="text-center py-12 text-sm text-white/30">No trace events. Run some analyses first.</div>
          ) : (
            <div className="rounded-xl border border-white/8 overflow-hidden">
              <div className="overflow-auto max-h-96">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-white/5 border-b border-white/8">
                      {['Time', 'Type', 'Detail', 'Status', 'Latency'].map(h => (
                        <th key={h} className="px-3 py-2.5 text-left text-white/40 font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLogs.map((log, i) => (
                      <tr key={log.id} className="border-b border-white/5 hover:bg-white/2 transition-colors">
                        <td className="px-3 py-2 font-mono text-white/30">{new Date(log.ts).toLocaleTimeString()}</td>
                        <td className="px-3 py-2">
                          <span className={`font-semibold ${TYPE_COLORS[log.type] || 'text-white/50'}`}>{TYPE_LABELS[log.type] || log.type}</span>
                        </td>
                        <td className="px-3 py-2 text-white/55 max-w-48 truncate">
                          {log.tool || log.model || log.error || log.reason || '—'}
                        </td>
                        <td className="px-3 py-2">
                          {log.status === 'success' && <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />}
                          {log.status === 'error' && <AlertTriangle className="w-3.5 h-3.5 text-red-400" />}
                          {log.status === 'running' && <Activity className="w-3.5 h-3.5 text-amber-400" />}
                          {!log.status && <span className="text-white/20">—</span>}
                        </td>
                        <td className="px-3 py-2 font-mono text-white/40">{log.latencyMs ? fmtMs(log.latencyMs) : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}