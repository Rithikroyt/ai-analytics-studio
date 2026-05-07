import { motion } from 'framer-motion';
import { AlertTriangle, CheckCircle2, Activity } from 'lucide-react';

const fmtV = v => {
  if (v == null || isNaN(v)) return '—';
  const n = Number(v);
  if (Math.abs(n) >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (Math.abs(n) >= 1e3) return `${(n / 1e3).toFixed(0)}K`;
  return n.toLocaleString(undefined, { maximumFractionDigits: 1 });
};

const SEV = {
  high:   { color: 'text-red-400',   bg: 'bg-red-400/10',   border: 'border-red-400/20' },
  medium: { color: 'text-amber-400', bg: 'bg-amber-400/10', border: 'border-amber-400/20' },
  low:    { color: 'text-blue-400',  bg: 'bg-blue-400/10',  border: 'border-blue-400/20' },
};

export default function AnomalyFeed({ anomalies = [], trendData = [] }) {
  const mean = trendData.length ? trendData.reduce((s, d) => s + d.value, 0) / trendData.length : null;

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold text-sm">Anomaly &amp; Risk Signals</h3>
        <p className="text-xs text-white/35 mt-0.5">
          {anomalies.length > 0 ? `${anomalies.length} statistical deviation${anomalies.length > 1 ? 's' : ''} detected` : 'Z-score monitoring — all within normal bounds'}
        </p>
      </div>

      {anomalies.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
          <CheckCircle2 className="w-8 h-8 text-green-400/60" />
          <div className="text-sm text-white/40">No anomalies detected</div>
          <div className="text-xs text-white/25">All data points are within 2σ of expected values</div>
        </div>
      ) : (
        <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
          {anomalies.slice(0, 10).map((a, i) => {
            const sev = SEV[a.severity] || SEV.medium;
            const deviation = mean && a.value ? (((a.value - mean) / mean) * 100).toFixed(1) : null;
            return (
              <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                className={`flex items-center gap-3 p-3 rounded-xl border ${sev.bg} ${sev.border}`}>
                <AlertTriangle className={`w-3.5 h-3.5 flex-shrink-0 ${sev.color}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs text-white/70">{a.date || 'Period'}</span>
                    <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${sev.bg} ${sev.color}`}>
                      {a.severity?.toUpperCase()} z={a.zScore}σ
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 text-xs text-white/40">
                    <span>Actual: <span className="font-mono text-white/65">{fmtV(a.value)}</span></span>
                    <span>Expected: <span className="font-mono">{fmtV(a.expected)}</span></span>
                    {deviation && <span className={sev.color}>{deviation > 0 ? '+' : ''}{deviation}%</span>}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {mean && (
        <div className="flex items-center gap-2 text-xs text-white/25 pt-1 border-t border-white/5">
          <Activity className="w-3 h-3" />
          Baseline mean: {fmtV(mean)} · Threshold: |z| &gt; 2σ
        </div>
      )}
    </div>
  );
}