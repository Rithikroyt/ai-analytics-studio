/**
 * StorytellingHeader — "What happened / Why / Risk / What next"
 * Appears above dashboards as the narrative context strip
 */
import { motion } from 'framer-motion';
import { Eye, HelpCircle, AlertTriangle, Zap } from 'lucide-react';

const fmtV = (v) => {
  if (v == null || isNaN(v)) return '—';
  const n = Number(v);
  if (Math.abs(n) >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
  if (Math.abs(n) >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (Math.abs(n) >= 1e3) return `${(n / 1e3).toFixed(0)}K`;
  return n.toLocaleString(undefined, { maximumFractionDigits: 1 });
};

export default function StorytellingHeader({ results, table }) {
  if (!results || !table) return null;
  const r = results;

  const frames = [
    {
      label: 'What Happened',
      icon: Eye,
      color: '#00e5ff',
      content: r.executiveSummary
        || (r.primaryLabel && r.totalValue
          ? `${r.primaryLabel} reached ${fmtV(r.totalValue)}${r.growthRate != null ? `, a ${r.growthRate > 0 ? '+' : ''}${r.growthRate}% ${r.growthRate >= 0 ? 'increase' : 'decrease'}` : ''} across ${table.rowCount?.toLocaleString()} records.`
          : `Dataset of ${table.rowCount?.toLocaleString()} rows analyzed across ${table.columns?.length} dimensions.`),
    },
    {
      label: 'Why It Happened',
      icon: HelpCircle,
      color: '#7b2fff',
      content: r.correlations?.length
        ? `Key drivers: ${r.correlations.slice(0, 2).map(c => `${c.colA.replace(/_/g, ' ')} ↔ ${c.colB.replace(/_/g, ' ')} (r=${c.r})`).join('; ')}.`
        : r.keyFindings?.[0] || 'Run AI analysis to identify causal patterns and correlations.',
    },
    {
      label: 'Risk',
      icon: AlertTriangle,
      color: r.anomalies?.length > 0 ? '#ff6b35' : '#4caf50',
      content: r.anomalies?.length > 0
        ? `${r.anomalies.length} anomal${r.anomalies.length > 1 ? 'ies' : 'y'} detected. ${r.anomalies.filter(a => a.severity === 'high').length} high-severity outliers require immediate attention.`
        : table.qualityScore < 70
          ? `Data quality at ${table.qualityScore}% — review missing values and inconsistencies before drawing conclusions.`
          : 'No critical anomalies detected. Data is within expected bounds.',
    },
    {
      label: 'What to Do Next',
      icon: Zap,
      color: '#4caf50',
      content: r.recommendations?.[0]?.action
        || r.keyFindings?.[r.keyFindings.length - 1]
        || 'Ask the AI Analyst for prioritized, evidence-based recommendations tailored to your data.',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
      {frames.map((frame, i) => (
        <motion.div
          key={frame.label}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.06 }}
          className="rounded-2xl p-4 relative overflow-hidden"
          style={{
            background: `${frame.color}08`,
            border: `1px solid ${frame.color}20`,
          }}
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: `${frame.color}18` }}>
              <frame.icon className="w-3 h-3" style={{ color: frame.color }} />
            </div>
            <span className="text-xs font-bold uppercase tracking-widest" style={{ color: frame.color }}>
              {frame.label}
            </span>
          </div>
          <p className="text-xs leading-relaxed text-white/60 line-clamp-3">
            {frame.content}
          </p>
        </motion.div>
      ))}
    </div>
  );
}