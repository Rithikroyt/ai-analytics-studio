/**
 * Anomaly Detection Module — Z-score + IQR
 */
import { useState } from 'react';
import { Play, AlertTriangle, CheckCircle2 } from 'lucide-react';

function detectAnomalies(rows, columns) {
  const numCols = columns.filter(col => {
    const name = col.name || col;
    const vals = rows.slice(0, 50).map(r => parseFloat(r[name])).filter(v => !isNaN(v));
    return vals.length > rows.slice(0, 50).length * 0.5;
  });

  const colResults = numCols.slice(0, 8).map(col => {
    const name = col.name || col;
    const vals = rows.map(r => parseFloat(r[name])).filter(v => !isNaN(v));
    if (vals.length < 5) return null;
    const n = vals.length;
    const mean = vals.reduce((a, b) => a + b, 0) / n;
    const std = Math.sqrt(vals.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / n);
    const sorted = [...vals].sort((a, b) => a - b);
    const q1 = sorted[Math.floor(n * 0.25)];
    const q3 = sorted[Math.floor(n * 0.75)];
    const iqr = q3 - q1;

    const anomalies = rows.reduce((acc, row, idx) => {
      const v = parseFloat(row[name]);
      if (isNaN(v)) return acc;
      const zScore = std > 0 ? Math.abs((v - mean) / std) : 0;
      const isIQR = v < q1 - 1.5 * iqr || v > q3 + 1.5 * iqr;
      const isZ = zScore > 3;
      if (isIQR || isZ) {
        acc.push({
          rowIndex: idx, value: v, zScore: Math.round(zScore * 100) / 100,
          method: isZ && isIQR ? 'Z-score + IQR' : isZ ? 'Z-score' : 'IQR',
          severity: zScore > 4 ? 'High' : zScore > 3 ? 'Medium' : 'Low',
          direction: v > mean ? 'above' : 'below',
        });
      }
      return acc;
    }, []).slice(0, 20);

    return {
      column: name, mean: Math.round(mean * 100) / 100, std: Math.round(std * 100) / 100,
      q1: Math.round(q1 * 100) / 100, q3: Math.round(q3 * 100) / 100,
      iqr: Math.round(iqr * 100) / 100,
      anomalyCount: anomalies.length,
      anomalyRate: Math.round((anomalies.length / n) * 100 * 10) / 10,
      topAnomalies: anomalies.slice(0, 5),
    };
  }).filter(Boolean);

  const totalAnomalies = colResults.reduce((s, c) => s + c.anomalyCount, 0);
  const highSeverity = colResults.filter(c => c.topAnomalies.some(a => a.severity === 'High')).length;

  return { colResults, totalAnomalies, highSeverity };
}

const SEVERITY_COLORS = { High: 'text-red-400 bg-red-400/10 border-red-400/20', Medium: 'text-amber-400 bg-amber-400/10 border-amber-400/20', Low: 'text-blue-400 bg-blue-400/10 border-blue-400/20' };

export default function AnomalyDetection({ rows = [], columns = [] }) {
  const [result, setResult] = useState(null);

  const run = () => {
    if (!rows.length) return;
    setResult(detectAnomalies(rows, columns));
  };

  return (
    <div className="space-y-6">
      <div className="p-4 rounded-xl bg-red-400/5 border border-red-400/15 text-xs text-white/55 leading-relaxed">
        <strong className="text-red-400">Anomaly Detection</strong> — Uses Z-score (flag |Z| &gt; 3σ) and IQR (flag beyond Q1−1.5×IQR or Q3+1.5×IQR) to identify statistically unusual values in numeric columns.
      </div>

      <button onClick={run} disabled={!rows.length}
        className="flex items-center gap-2 px-5 py-2.5 bg-red-400/15 border border-red-400/25 text-red-400 rounded-xl text-sm font-bold disabled:opacity-40 hover:bg-red-400/20 transition-all">
        <Play className="w-4 h-4" /> Detect Anomalies
      </button>

      {!rows.length && <div className="text-xs text-amber-400">Load a dataset first.</div>}

      {result && (
        <div className="space-y-5">
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Columns Scanned', value: result.colResults.length, color: 'text-cyan-400' },
              { label: 'Total Anomalies', value: result.totalAnomalies, color: result.totalAnomalies > 0 ? 'text-red-400' : 'text-green-400' },
              { label: 'High Severity Cols', value: result.highSeverity, color: result.highSeverity > 0 ? 'text-red-400' : 'text-green-400' },
            ].map(s => (
              <div key={s.label} className="p-3 rounded-xl bg-white/3 border border-white/8 text-center">
                <div className={`text-2xl font-black ${s.color}`}>{s.value}</div>
                <div className="text-xs text-white/35">{s.label}</div>
              </div>
            ))}
          </div>

          {result.totalAnomalies === 0 && (
            <div className="p-4 rounded-xl bg-green-400/8 border border-green-400/20 flex items-center gap-2 text-green-400 text-sm">
              <CheckCircle2 className="w-4 h-4" /> No statistical anomalies detected. Data appears within normal distribution ranges.
            </div>
          )}

          {result.colResults.map(col => col.anomalyCount > 0 && (
            <div key={col.column} className="rounded-2xl border border-white/8 bg-white/2 p-4 space-y-3">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span className="font-bold text-sm text-white/80">{col.column}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-red-400/10 border border-red-400/20 text-red-400">{col.anomalyCount} anomalies ({col.anomalyRate}%)</span>
              </div>
              <div className="grid grid-cols-4 gap-2 text-xs">
                {[['Mean', col.mean], ['Std Dev', col.std], ['Q1', col.q1], ['Q3', col.q3]].map(([k, v]) => (
                  <div key={k} className="text-center p-2 rounded-lg bg-white/3">
                    <div className="text-white/30">{k}</div>
                    <div className="font-mono font-bold text-white/70">{v}</div>
                  </div>
                ))}
              </div>
              <div className="space-y-1">
                {col.topAnomalies.map((a, i) => (
                  <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-xl bg-white/2 border border-white/6 text-xs">
                    <span className={`px-2 py-0.5 rounded-full text-xs border ${SEVERITY_COLORS[a.severity]}`}>{a.severity}</span>
                    <span className="font-mono text-white/70">Row {a.rowIndex + 1}: <strong>{a.value}</strong></span>
                    <span className="text-white/35">{a.direction} mean</span>
                    <span className="text-white/30 ml-auto font-mono">Z={a.zScore} · {a.method}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}

          <div className="p-3 rounded-xl bg-white/3 border border-white/8 text-xs text-white/40">
            <strong className="text-white/55">Business Impact:</strong> High-severity anomalies may indicate data entry errors, fraud, system glitches, or real business events. Investigate before including in aggregate metrics.
          </div>
        </div>
      )}
    </div>
  );
}