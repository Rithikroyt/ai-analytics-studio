/**
 * KPIStrip — Horizontal premium KPI row
 * TOP of every dashboard: big bold numbers, trend indicators
 */
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, AlertTriangle, Shield, Database, Activity } from 'lucide-react';

const fmtV = (v) => {
  if (v == null || isNaN(v)) return '—';
  const n = Number(v);
  if (Math.abs(n) >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
  if (Math.abs(n) >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (Math.abs(n) >= 1e3) return `${(n / 1e3).toFixed(0)}K`;
  return n.toLocaleString(undefined, { maximumFractionDigits: 1 });
};

function KPICard({ label, value, sub, color, icon: IconComp, trend, index }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="flex-1 min-w-0 relative overflow-hidden rounded-2xl p-5"
      style={{
        background: 'rgba(255,255,255,0.03)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,0.07)',
        boxShadow: `0 4px 24px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)`,
      }}
    >
      {/* Glow accent */}
      <div className="absolute top-0 left-0 w-full h-0.5 rounded-t-2xl" style={{ background: `linear-gradient(90deg, transparent, ${color}55, transparent)` }} />

      <div className="flex items-start justify-between mb-3">
        <div className="text-xs font-medium uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.35)' }}>
          {label}
        </div>
        {IconComp && (
          <div className="w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${color}15` }}>
            <IconComp className="w-3.5 h-3.5" style={{ color }} />
          </div>
        )}
      </div>

      <div className="font-black leading-none tabular-nums mb-2" style={{ fontSize: 28, color, letterSpacing: '-0.02em' }}>
        {value}
      </div>

      <div className="flex items-center gap-1.5">
        {trend != null && (
          trend >= 0
            ? <TrendingUp className="w-3 h-3 text-green-400" />
            : <TrendingDown className="w-3 h-3 text-red-400" />
        )}
        <span className="text-xs" style={{ color: trend != null ? (trend >= 0 ? '#4caf50' : '#ff2d7a') : 'rgba(255,255,255,0.3)' }}>
          {sub}
        </span>
      </div>
    </motion.div>
  );
}

export default function KPIStrip({ table, results }) {
  if (!table) return null;
  const r = results || {};

  const kpis = [
    {
      label: 'Total Records',
      value: fmtV(table.rowCount),
      sub: `${table.columns?.length || 0} columns`,
      color: '#00e5ff',
      icon: Database,
    },
    {
      label: r.primaryLabel || 'Primary KPI',
      value: fmtV(r.totalValue),
      sub: r.growthRate != null ? `${r.growthRate > 0 ? '+' : ''}${r.growthRate}% trend` : 'No trend data',
      color: '#7b2fff',
      icon: Activity,
      trend: r.growthRate,
    },
    {
      label: 'Growth Rate',
      value: r.growthRate != null ? `${r.growthRate > 0 ? '+' : ''}${r.growthRate}%` : '—',
      sub: r.growthRate != null ? (r.growthRate >= 0 ? 'Positive momentum' : 'Declining trend') : 'No date column',
      color: r.growthRate >= 0 ? '#4caf50' : '#ff2d7a',
      icon: r.growthRate >= 0 ? TrendingUp : TrendingDown,
      trend: r.growthRate,
    },
    {
      label: 'Anomalies',
      value: String(r.anomalies?.length || 0),
      sub: r.anomalies?.length > 0 ? `${r.anomalies.filter(a => a.severity === 'high' || a.severity === 'critical').length} high severity` : 'All within range',
      color: r.anomalies?.length > 0 ? '#ff6b35' : '#4caf50',
      icon: AlertTriangle,
    },
    {
      label: 'Data Quality',
      value: `${table.qualityScore || 0}%`,
      sub: table.qualityScore >= 90 ? 'Excellent' : table.qualityScore >= 70 ? 'Good' : 'Needs review',
      color: table.qualityScore >= 90 ? '#4caf50' : table.qualityScore >= 70 ? '#ffcc02' : '#ff2d7a',
      icon: Shield,
    },
  ];

  return (
    <div className="flex gap-3 overflow-x-auto pb-1">
      {kpis.map((kpi, i) => (
        <KPICard key={kpi.label} {...kpi} index={i} />
      ))}
    </div>
  );
}