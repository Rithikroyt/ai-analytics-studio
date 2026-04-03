/**
 * ExportPanel — Export current dashboard view as PDF or CSV
 * Includes AI insights, chart snapshots, and raw data
 */
import { useState } from 'react';
import { Download, FileText, Table, Loader2, CheckCircle2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const fmtV = (v) => {
  if (v == null) return '';
  const n = Number(v);
  if (!isNaN(n) && Math.abs(n) >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (!isNaN(n) && Math.abs(n) >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return String(v);
};

export default function ExportPanel({ analysisResults, table, onClose }) {
  const [exporting, setExporting] = useState('');
  const [done, setDone] = useState('');

  const exportCSV = () => {
    if (!table?.rows?.length) return;
    setExporting('csv');
    const cols = table.columns?.map(c => c.name) || [];
    const header = cols.join(',');
    const rowsStr = table.rows.map(row =>
      cols.map(c => {
        const val = row[c];
        const s = val == null ? '' : String(val);
        return s.includes(',') || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
      }).join(',')
    ).join('\n');
    const blob = new Blob([header + '\n' + rowsStr], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${table.name || 'export'}_data.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setExporting('');
    setDone('csv');
    setTimeout(() => setDone(''), 2500);
  };

  const exportInsightsCSV = () => {
    if (!analysisResults) return;
    setExporting('insights');
    const rows = [];
    // KPI summary
    rows.push(['Section', 'Field', 'Value']);
    rows.push(['KPI', 'Primary Metric', analysisResults.primaryLabel || '']);
    rows.push(['KPI', 'Total Value', analysisResults.totalValue || '']);
    rows.push(['KPI', 'Growth Rate (%)', analysisResults.growthRate ?? '']);
    rows.push(['KPI', 'Quality Score', table?.qualityScore ?? '']);
    rows.push(['KPI', 'Row Count', table?.rowCount || '']);
    rows.push(['', '', '']);
    // Executive summary
    if (analysisResults.executiveSummary) {
      rows.push(['Executive Summary', '', analysisResults.executiveSummary]);
      rows.push(['', '', '']);
    }
    // Key findings
    analysisResults.keyFindings?.forEach((f, i) => {
      rows.push(['Key Finding', i + 1, f]);
    });
    rows.push(['', '', '']);
    // Recommendations
    analysisResults.recommendations?.forEach((r, i) => {
      rows.push(['Recommendation', r.priority?.toUpperCase(), r.action]);
    });
    rows.push(['', '', '']);
    // Anomalies
    analysisResults.anomalies?.forEach(a => {
      rows.push(['Anomaly', a.date, `Value: ${a.value}, Expected: ${a.expected}, Severity: ${a.severity}, Z-Score: ${a.zScore}`]);
    });
    rows.push(['', '', '']);
    // Breakdown data
    analysisResults.breakdownData?.forEach(b => {
      rows.push(['Segment', b.name, b.value]);
    });

    const csv = rows.map(r => r.map(cell => {
      const s = String(cell ?? '');
      return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
    }).join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${table?.name || 'dashboard'}_ai_insights.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setExporting('');
    setDone('insights');
    setTimeout(() => setDone(''), 2500);
  };

  const exportPDF = async () => {
    setExporting('pdf');
    try {
      // Build a full HTML report page and print it
      const r = analysisResults;
      const t = table;
      const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <title>${t?.name || 'Dashboard'} — AI Analytics Report</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #1a1a2e; background: #fff; padding: 40px; }
    h1 { font-size: 26px; color: #0a0a1a; margin-bottom: 4px; }
    h2 { font-size: 15px; color: #0077b6; margin: 24px 0 10px; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 2px solid #e3f2fd; padding-bottom: 4px; }
    h3 { font-size: 13px; color: #444; margin: 12px 0 6px; }
    .subtitle { color: #666; font-size: 13px; margin-bottom: 30px; }
    .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 28px; }
    .kpi-card { background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 10px; padding: 14px; }
    .kpi-label { font-size: 10px; color: #666; text-transform: uppercase; letter-spacing: 0.08em; }
    .kpi-value { font-size: 22px; font-weight: 900; color: #0077b6; margin: 4px 0; font-family: monospace; }
    .kpi-sub { font-size: 11px; color: #888; }
    .summary-box { background: #f8f9ff; border-left: 4px solid #0077b6; padding: 16px 20px; border-radius: 4px; margin-bottom: 20px; font-size: 13px; line-height: 1.7; color: #333; }
    .findings-list { list-style: none; padding: 0; }
    .findings-list li { padding: 8px 0 8px 18px; border-bottom: 1px solid #f0f0f0; font-size: 13px; color: #444; position: relative; }
    .findings-list li:before { content: '▸'; position: absolute; left: 0; color: #0077b6; }
    .recs-table { width: 100%; border-collapse: collapse; font-size: 12px; }
    .recs-table th { background: #e3f2fd; padding: 8px 12px; text-align: left; font-weight: 600; color: #0077b6; }
    .recs-table td { padding: 8px 12px; border-bottom: 1px solid #f0f0f0; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 10px; font-weight: 700; text-transform: uppercase; }
    .badge-high { background: #fee2e2; color: #dc2626; }
    .badge-medium { background: #fef3c7; color: #d97706; }
    .badge-low { background: #dcfce7; color: #16a34a; }
    .seg-table { width: 100%; border-collapse: collapse; font-size: 12px; }
    .seg-table th { background: #f1f5f9; padding: 8px 12px; text-align: left; font-weight: 600; color: #374151; }
    .seg-table td { padding: 8px 12px; border-bottom: 1px solid #f8fafc; }
    .anomaly-row { background: #fff7ed; }
    .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e5e7eb; font-size: 11px; color: #9ca3af; }
  </style>
</head>
<body>
  <h1>📊 ${t?.name || 'Dataset'} — AI Analytics Report</h1>
  <p class="subtitle">Generated by AI Agent Data Analytics Tool · ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>

  <div class="kpi-grid">
    <div class="kpi-card">
      <div class="kpi-label">Primary KPI</div>
      <div class="kpi-value">${fmtV(r?.totalValue)}</div>
      <div class="kpi-sub">${r?.primaryLabel || 'Total'}</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Growth Rate</div>
      <div class="kpi-value">${r?.growthRate != null ? `${r.growthRate}%` : '—'}</div>
      <div class="kpi-sub">Overall trend</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Data Quality</div>
      <div class="kpi-value">${t?.qualityScore ?? '—'}%</div>
      <div class="kpi-sub">${t?.qualityScore >= 90 ? 'Excellent' : 'Good'}</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Records</div>
      <div class="kpi-value">${t?.rowCount?.toLocaleString() || '—'}</div>
      <div class="kpi-sub">${t?.columns?.length} columns</div>
    </div>
  </div>

  ${r?.executiveSummary ? `<h2>Executive Summary</h2><div class="summary-box">${r.executiveSummary}</div>` : ''}

  ${r?.keyFindings?.length ? `<h2>Key Findings</h2><ul class="findings-list">${r.keyFindings.map(f => `<li>${f}</li>`).join('')}</ul>` : ''}

  ${r?.recommendations?.length ? `
  <h2>AI Recommendations</h2>
  <table class="recs-table">
    <thead><tr><th>Priority</th><th>Recommended Action</th></tr></thead>
    <tbody>${r.recommendations.map(rec => `<tr><td><span class="badge badge-${rec.priority}">${rec.priority}</span></td><td>${rec.action}</td></tr>`).join('')}</tbody>
  </table>` : ''}

  ${r?.breakdownData?.length ? `
  <h2>Segment Breakdown</h2>
  <table class="seg-table">
    <thead><tr><th>Segment</th><th>Value</th><th>Share %</th></tr></thead>
    <tbody>${(() => {
      const total = r.breakdownData.reduce((s, b) => s + b.value, 0);
      return r.breakdownData.slice(0, 10).map(b => `<tr><td>${b.name}</td><td>${b.value?.toLocaleString()}</td><td>${total > 0 ? Math.round(b.value / total * 100) : 0}%</td></tr>`).join('');
    })()}</tbody>
  </table>` : ''}

  ${r?.anomalies?.length ? `
  <h2>Anomalies Detected (${r.anomalies.length})</h2>
  <table class="seg-table">
    <thead><tr><th>Date</th><th>Value</th><th>Expected</th><th>Severity</th><th>Z-Score</th></tr></thead>
    <tbody>${r.anomalies.slice(0, 10).map(a => `<tr class="anomaly-row"><td>${a.date}</td><td>${a.value?.toLocaleString()}</td><td>${a.expected?.toLocaleString()}</td><td>${a.severity?.toUpperCase()}</td><td>${a.zScore}</td></tr>`).join('')}</tbody>
  </table>` : ''}

  <div class="footer">AI Agent Data Analytics Tool · Report generated ${new Date().toISOString()} · Data rows analyzed: ${t?.rowCount?.toLocaleString() || 0}</div>
</body>
</html>`;

      const printWindow = window.open('', '_blank');
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 600);
    } catch (e) {
      console.error('PDF export failed', e);
    }
    setExporting('');
    setDone('pdf');
    setTimeout(() => setDone(''), 2500);
  };

  const exports = [
    {
      id: 'pdf',
      icon: FileText,
      label: 'Export PDF Report',
      desc: 'Full report with KPIs, insights, recommendations & anomalies',
      color: 'text-cyan-400',
      bg: 'bg-cyan-400/10 border-cyan-400/20',
      action: exportPDF,
    },
    {
      id: 'insights',
      icon: FileText,
      label: 'Export AI Insights (CSV)',
      desc: 'KPIs, findings, recommendations, anomalies as spreadsheet',
      color: 'text-purple-400',
      bg: 'bg-purple-400/10 border-purple-400/20',
      action: exportInsightsCSV,
    },
    {
      id: 'csv',
      icon: Table,
      label: 'Export Raw Data (CSV)',
      desc: `All ${table?.rowCount?.toLocaleString() || 0} rows of cleaned data`,
      color: 'text-teal-400',
      bg: 'bg-teal-400/10 border-teal-400/20',
      action: exportCSV,
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96, y: -8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96, y: -8 }}
      className="absolute top-14 right-4 z-50 w-80 glass-card rounded-2xl border border-white/10 shadow-2xl overflow-hidden"
      style={{ background: 'rgba(8,6,20,0.96)', backdropFilter: 'blur(20px)' }}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/8">
        <div className="flex items-center gap-2">
          <Download className="w-4 h-4 text-cyan-400" />
          <span className="font-semibold text-sm">Export Dashboard</span>
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="p-3 space-y-2">
        {exports.map(ex => (
          <button
            key={ex.id}
            onClick={ex.action}
            disabled={!!exporting}
            className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${ex.bg} hover:opacity-90 disabled:opacity-50`}
          >
            {exporting === ex.id ? (
              <Loader2 className={`w-4 h-4 animate-spin flex-shrink-0 ${ex.color}`} />
            ) : done === ex.id ? (
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-green-400" />
            ) : (
              <ex.icon className={`w-4 h-4 flex-shrink-0 ${ex.color}`} />
            )}
            <div>
              <div className={`text-xs font-semibold ${ex.color}`}>{ex.label}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{ex.desc}</div>
            </div>
          </button>
        ))}
      </div>
    </motion.div>
  );
}