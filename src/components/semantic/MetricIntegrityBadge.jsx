/**
 * MetricIntegrityBadge — displays MetricIntegrityScore with breakdown tooltip
 * Score = 0.30*FormulaValidity + 0.25*SourceColumnFit + 0.20*AggregationCorrectness + 0.15*BusinessDefinition + 0.10*Certification
 */
import { useState } from 'react';
import { Shield, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';

export function computeMetricIntegrityScore(metric) {
  const fv = metric.formula?.length > 5 ? (metric.formula.includes('SUM(') || metric.formula.includes('AVG(') || metric.formula.includes('COUNT(') ? 95 : 70) : 30;
  const scf = (metric.sourceColumns?.length || 0) > 0 ? Math.min(100, 60 + metric.sourceColumns.length * 15) : 25;
  const ac = metric.aggregationType && metric.aggregationType !== 'custom' ? 90 : metric.aggregationType === 'custom' ? 70 : 20;
  const bd = (metric.businessDefinition?.length || 0) > 30 ? 90 : (metric.businessDefinition?.length || 0) > 10 ? 65 : 20;
  const cert = metric.certified ? 100 : 0;
  return Math.round(0.30 * fv + 0.25 * scf + 0.20 * ac + 0.15 * bd + 0.10 * cert);
}

export default function MetricIntegrityBadge({ metric, showBreakdown = false }) {
  const [tooltip, setTooltip] = useState(false);
  const score = metric.integrityScore || computeMetricIntegrityScore(metric);

  const color = score >= 80 ? '#4ade80' : score >= 60 ? '#fbbf24' : '#f87171';
  const label = score >= 80 ? 'High Integrity' : score >= 60 ? 'Moderate' : 'Low Integrity';
  const Icon = score >= 80 ? CheckCircle2 : score >= 60 ? AlertTriangle : XCircle;

  const breakdown = {
    'Formula Validity (30%)': metric.formula?.length > 5 ? 90 : 30,
    'Source Column Fit (25%)': (metric.sourceColumns?.length || 0) > 0 ? 85 : 25,
    'Aggregation Type (20%)': metric.aggregationType ? 90 : 20,
    'Business Definition (15%)': (metric.businessDefinition?.length || 0) > 20 ? 85 : 20,
    'Certification (10%)': metric.certified ? 100 : 0,
  };

  return (
    <div className="relative inline-block">
      <button
        onMouseEnter={() => setTooltip(true)}
        onMouseLeave={() => setTooltip(false)}
        className="flex items-center gap-1.5 px-2 py-1 rounded-lg border text-xs font-bold transition-all"
        style={{ color, borderColor: `${color}30`, background: `${color}10` }}
      >
        <Icon className="w-3 h-3" />
        {score} — {label}
      </button>

      {tooltip && showBreakdown && (
        <div className="absolute z-50 bottom-full mb-2 left-0 w-64 p-3 rounded-xl border border-white/10 bg-background shadow-2xl space-y-2">
          <div className="text-xs font-bold text-white/60 mb-2 flex items-center gap-1.5">
            <Shield className="w-3 h-3" /> Metric Integrity Breakdown
          </div>
          {Object.entries(breakdown).map(([key, val]) => (
            <div key={key} className="space-y-0.5">
              <div className="flex justify-between text-xs">
                <span className="text-white/40">{key}</span>
                <span className="font-mono font-bold" style={{ color: val >= 80 ? '#4ade80' : val >= 50 ? '#fbbf24' : '#f87171' }}>{val}%</span>
              </div>
              <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${val}%`, background: val >= 80 ? '#4ade80' : val >= 50 ? '#fbbf24' : '#f87171' }} />
              </div>
            </div>
          ))}
          <div className="pt-1 border-t border-white/8 text-xs text-white/30">
            MetricIntegrityScore = 0.30×Formula + 0.25×SourceFit + 0.20×Aggregation + 0.15×Definition + 0.10×Cert
          </div>
        </div>
      )}
    </div>
  );
}