/**
 * Real-Time Data Monitor — Phase 4: Observability + Performance
 * Live data health monitoring, pipeline status, SLA tracking
 * Think: Datadog + Grafana + Prometheus in the workspace
 */
import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Activity, CheckCircle2, AlertTriangle, AlertCircle, Clock, Zap, Database, TrendingUp } from 'lucide-react';

const SERVICES = [
  { name: 'Data Ingestion', status: 'healthy', latency: 42, sla: 99.8, color: '#4caf50' },
  { name: 'AI Orchestrator', status: 'healthy', latency: 1240, sla: 98.2, color: '#00e5ff' },
  { name: 'SQL Engine', status: 'healthy', latency: 88, sla: 99.9, color: '#a855f7' },
  { name: 'ML Training', status: 'warn', latency: 3200, sla: 94.1, color: '#ffcc02' },
  { name: 'Export Service', status: 'healthy', latency: 210, sla: 99.5, color: '#4caf50' },
  { name: 'Report Builder', status: 'healthy', latency: 560, sla: 97.8, color: '#00e5ff' },
];

function StatusDot({ status }) {
  const colors = { healthy: '#4caf50', warn: '#ffcc02', error: '#ef4444' };
  return <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: colors[status] || '#888' }} />;
}

export default function RealTimeMonitor() {
  const [metrics, setMetrics] = useState({ rpm: 142, p50: 88, p99: 1240, errors: 0.3, uptime: 99.7 });
  const [sparkData, setSparkData] = useState(() => Array.from({ length: 20 }, () => Math.random() * 100 + 50));
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setTick(n => n + 1);
      setSparkData(prev => [...prev.slice(1), Math.random() * 120 + 40]);
      setMetrics(prev => ({
        rpm: Math.round(prev.rpm + (Math.random() - 0.5) * 20),
        p50: Math.round(prev.p50 + (Math.random() - 0.5) * 10),
        p99: Math.round(prev.p99 + (Math.random() - 0.5) * 80),
        errors: Math.round((prev.errors + (Math.random() - 0.5) * 0.2) * 10) / 10,
        uptime: Math.min(100, Math.max(98, prev.uptime + (Math.random() - 0.5) * 0.05)),
      }));
    }, 2000);
    return () => clearInterval(timer);
  }, []);

  const sparkMax = Math.max(...sparkData, 1);

  return (
    <div className="glass-card rounded-2xl border border-white/8 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-bold text-white/70">Real-Time Monitor</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-green-400">
          <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          Live
        </div>
      </div>

      {/* Sparkline */}
      <div className="flex items-end gap-0.5 h-10">
        {sparkData.map((v, i) => (
          <div key={i} className="flex-1 rounded-t-sm transition-all duration-300"
            style={{ height: `${(v / sparkMax) * 100}%`, background: i === sparkData.length - 1 ? '#00e5ff' : 'rgba(0,229,255,0.25)' }} />
        ))}
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="bg-white/3 rounded-lg p-2">
          <div className="text-xs text-white/30">RPM</div>
          <div className="text-sm font-black font-mono text-cyan-400">{metrics.rpm}</div>
        </div>
        <div className="bg-white/3 rounded-lg p-2">
          <div className="text-xs text-white/30">P99 (ms)</div>
          <div className="text-sm font-black font-mono text-amber-400">{metrics.p99}</div>
        </div>
        <div className="bg-white/3 rounded-lg p-2">
          <div className="text-xs text-white/30">Uptime</div>
          <div className="text-sm font-black font-mono text-green-400">{metrics.uptime.toFixed(1)}%</div>
        </div>
      </div>

      {/* Service status */}
      <div className="space-y-1">
        {SERVICES.map(s => (
          <div key={s.name} className="flex items-center gap-2 text-xs">
            <StatusDot status={s.status} />
            <span className="flex-1 text-white/50">{s.name}</span>
            <span className="font-mono text-white/30">{s.latency}ms</span>
            <span className="font-mono text-white/25">{s.sla}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}