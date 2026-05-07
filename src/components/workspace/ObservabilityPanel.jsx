/**
 * ObservabilityPanel — Tool-call tracing, latency, error rate, cost monitoring
 * Phase 8: Enterprise observability layer
 */
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Activity, AlertTriangle, CheckCircle2, Clock, Zap, Database, BarChart3, RefreshCw, Trash2 } from 'lucide-react';
import { obs } from '@/lib/observability';

const TYPE_CONFIG = {
  tool_call:    { color: 'text-cyan-400',   bg: 'bg-cyan-400/10',   icon: Zap },
  llm_call:     { color: 'text-purple-400', bg: 'bg-purple-400/10', icon: Activity },
  sql:          { color: 'text-teal-400',   bg: 'bg-teal-400/10',   icon: Database },
  chart_render: { color: 'text-blue-400',   bg: 'bg-blue-400/10',   icon: BarChart3 },
  report:       { color: 'text-green-400',  bg: 'bg-green-400/10',  icon: CheckCircle2 },
  error:        { color: 'text-red-400',    bg: 'bg-red-400/10',    icon: AlertTriangle },
};

function MetricCard({ label, value, sub, color = 'text-white/60' }) {
  return (
    <div className="p-4 rounded-xl border border-white/8 bg-white/2">
      <div className="text-xs text-white/35 uppercase tracking-widest mb-1">{label}</div>
      <div className={`text-xl font-black font-mono ${color}`}>{value}</div>
      {sub && <div className="text-xs text-white/25 mt-0.5">{sub}</div>}
    </div>
  );
}

export default function ObservabilityPanel() {
  const [logs, setLogs] = useState([]);
  const [metrics, setMetrics] = useState({});
  const [alerts, setAlerts] = useState([]);
  const [activeFilter, setActiveFilter] = useState('all');
  const [autoRefresh, setAutoRefresh] = useState(true);

  const refresh = () => {
    setLogs(obs.getLogs(activeFilter === 'all' ? null : activeFilter, 100));
    setMetrics(obs.getMetrics());
    setAlerts(obs.getAlerts());
  };

  useEffect(() => {
    refresh();
    if (!autoRefresh) return;
    const interval = setInterval(refresh, 2000);
    return () => clearInterval(interval);
  }, [activeFilter, autoRefresh]);

  const totalEvents = Object.values(metrics).reduce((s, m) => s + m.count, 0);
  const totalErrors = Object.values(metrics).filter(m => m.type === 'error').reduce((s, m) => s + m.count, 0);
  const toolCalls = metrics.tool_call?.count || 0;
  const llmCalls = metrics.llm_call?.count || 0;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6 overflow-auto">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Activity className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-mono text-white/40 uppercase tracking-widest">Platform Observability</span>
            </div>
            <h1 className="text-2xl font-bold mb-1">Observability & Tracing</h1>
            <p className="text-sm text-muted-foreground">Real-time tracing of tool calls, LLM calls, SQL execution, and errors. Uptime: {obs.getUptime()}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setAutoRefresh(v => !v)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs border transition-all ${autoRefresh ? 'bg-green-400/10 border-green-400/25 text-green-400' : 'bg-white/5 border-white/10 text-white/40'}`}>
              <div className={`w-1.5 h-1.5 rounded-full ${autoRefresh ? 'bg-green-400 animate-pulse' : 'bg-white/30'}`} />
              {autoRefresh ? 'Live' : 'Paused'}
            </button>
            <button onClick={refresh} className="p-1.5 rounded-xl text-white/30 hover:text-white/60 hover:bg-white/5 transition-all" title="Refresh">
              <RefreshCw className="w-4 h-4" />
            </button>
            <button onClick={() => { obs.clear(); refresh(); }} className="p-1.5 rounded-xl text-white/30 hover:text-red-400 hover:bg-red-400/5 transition-all" title="Clear logs">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </motion.div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((alert, i) => (
            <div key={i} className={`flex items-center gap-3 p-3 rounded-xl border text-sm ${alert.level === 'critical' ? 'bg-red-400/5 border-red-400/20 text-red-400' : 'bg-amber-400/5 border-amber-400/20 text-amber-400'}`}>
              <AlertTriangle className="w-4 h-4 flex-shrink-0" /> {alert.message}
            </div>
          ))}
        </div>
      )}

      {/* KPI metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard label="Total Events" value={totalEvents.toLocaleString()} sub={`Uptime: ${obs.getUptime()}`} color="text-cyan-400" />
        <MetricCard label="Tool Calls" value={toolCalls} sub={metrics.tool_call ? `Avg: ${metrics.tool_call.avgLatency || 'N/A'}` : 'None yet'} color="text-purple-400" />
        <MetricCard label="LLM Calls" value={llmCalls} sub={metrics.llm_call ? `Avg: ${metrics.llm_call.avgLatency || 'N/A'}` : 'None yet'} color="text-teal-400" />
        <MetricCard label="Errors" value={metrics.error?.count || 0} sub={metrics.error ? `${metrics.error.errorRate} rate` : 'No errors'} color={metrics.error?.count > 0 ? 'text-red-400' : 'text-green-400'} />
      </div>

      {/* Per-type metrics */}
      {Object.entries(metrics).length > 0 && (
        <div className="rounded-2xl border border-white/8 overflow-hidden">
          <div className="px-4 py-3 bg-white/2 border-b border-white/8 text-xs font-semibold text-white/40 uppercase tracking-widest">Performance by Operation Type</div>
          <div className="divide-y divide-white/5">
            {Object.entries(metrics).map(([type, m]) => {
              const cfg = TYPE_CONFIG[type] || TYPE_CONFIG.tool_call;
              const Icon = cfg.icon;
              return (
                <div key={type} className="flex items-center gap-4 px-4 py-3 hover:bg-white/2 transition-colors">
                  <div className={`w-7 h-7 rounded-lg ${cfg.bg} flex items-center justify-center flex-shrink-0`}>
                    <Icon className={`w-3.5 h-3.5 ${cfg.color}`} />
                  </div>
                  <div className="flex-1 font-mono text-sm text-white/70">{type.replace(/_/g, ' ')}</div>
                  <div className="flex items-center gap-6 text-xs">
                    <div className="text-center">
                      <div className="text-white/25 mb-0.5">Count</div>
                      <div className={`font-mono font-bold ${cfg.color}`}>{m.count}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-white/25 mb-0.5">Errors</div>
                      <div className={`font-mono font-bold ${m.errorRate !== '0%' ? 'text-red-400' : 'text-green-400'}`}>{m.errorRate}</div>
                    </div>
                    {m.avgLatency && (
                      <div className="text-center">
                        <div className="text-white/25 mb-0.5">Avg Latency</div>
                        <div className="font-mono font-bold text-white/60">{m.avgLatency}</div>
                      </div>
                    )}
                    {m.p95 && (
                      <div className="text-center hidden md:block">
                        <div className="text-white/25 mb-0.5">P95</div>
                        <div className="font-mono font-bold text-white/45">{m.p95}</div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Event log */}
      <div className="rounded-2xl border border-white/8 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 bg-white/2 border-b border-white/8">
          <span className="text-xs font-semibold text-white/40 uppercase tracking-widest">Event Log ({logs.length})</span>
          <div className="flex items-center gap-1.5">
            {['all', 'tool_call', 'llm_call', 'sql', 'error'].map(f => (
              <button key={f} onClick={() => setActiveFilter(f)}
                className={`px-2 py-1 rounded-lg text-xs transition-all ${activeFilter === f ? 'bg-cyan-400/15 text-cyan-400 border border-cyan-400/25' : 'text-white/30 hover:text-white/60 hover:bg-white/5 border border-transparent'}`}>
                {f === 'all' ? 'All' : f.replace(/_/g, ' ')}
              </button>
            ))}
          </div>
        </div>
        {logs.length === 0 ? (
          <div className="text-center py-12 text-xs text-white/25">
            No events yet. Use the AI Analyst, SQL Studio, or run reports to see traces here.
          </div>
        ) : (
          <div className="divide-y divide-white/5 max-h-80 overflow-auto">
            {logs.map(event => {
              const cfg = TYPE_CONFIG[event.type] || TYPE_CONFIG.tool_call;
              const Icon = cfg.icon;
              const time = new Date(event.ts).toLocaleTimeString();
              return (
                <div key={event.id} className="flex items-start gap-3 px-4 py-2.5 hover:bg-white/2 transition-colors">
                  <div className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 mt-0.5 ${cfg.bg}`}>
                    <Icon className={`w-2.5 h-2.5 ${cfg.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs font-semibold ${cfg.color}`}>{event.type.replace(/_/g, ' ')}</span>
                      {event.toolName && <span className="text-xs text-white/45 font-mono">{event.toolName}</span>}
                      {event.model && <span className="text-xs text-white/35 font-mono">{event.model}</span>}
                      {event.latencyMs && <span className="text-xs text-white/25 font-mono ml-auto">{event.latencyMs}ms</span>}
                    </div>
                    {event.message && <div className="text-xs text-red-400/70 mt-0.5 truncate">{event.message}</div>}
                    {event.question && <div className="text-xs text-white/30 mt-0.5 truncate">{event.question}</div>}
                  </div>
                  <div className="text-xs text-white/20 flex-shrink-0 font-mono">{time}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}