/**
 * exportUtils — Professional PDF & CSV export utilities
 * Uses jsPDF for PDF generation, built-in for CSV
 */
import { jsPDF } from 'jspdf';

const fmtV = v => {
  if (v == null || isNaN(Number(v))) return String(v ?? '');
  const n = Number(v);
  if (Math.abs(n) >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (Math.abs(n) >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (Math.abs(n) >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
};

// ── CSV Export ───────────────────────────────────────────────────
export function exportCSV(rows, columns, filename = 'export') {
  const headers = columns.map(c => `"${c}"`).join(',');
  const body = rows.map(row =>
    columns.map(c => {
      const val = String(row[c] ?? '');
      return val.includes(',') || val.includes('"') ? `"${val.replace(/"/g, '""')}"` : val;
    }).join(',')
  ).join('\n');
  const blob = new Blob([headers + '\n' + body], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Insights CSV Export ─────────────────────────────────────────
export function exportInsightsCSV(analysisResults, tableName) {
  const r = analysisResults;
  const rows = [
    ['section', 'field', 'value'],
    ['Overview', 'Dataset', tableName || ''],
    ['Overview', 'Primary KPI', r?.primaryLabel || ''],
    ['Overview', 'KPI Value', fmtV(r?.totalValue)],
    ['Overview', 'Growth Rate', r?.growthRate != null ? `${r.growthRate}%` : 'N/A'],
    ['Overview', 'Anomaly Count', r?.anomalies?.length ?? 0],
    ...(r?.breakdownData?.map(b => ['Segments', b.name, fmtV(b.value)]) || []),
    ...(r?.recommendations?.map(rec => ['Recommendations', rec.priority, rec.action]) || []),
    ...(r?.anomalies?.map(a => ['Anomalies', a.date || 'period', `value=${fmtV(a.value)} expected=${fmtV(a.expected)} severity=${a.severity}`]) || []),
    ...(r?.correlations?.map(c => ['Correlations', `${c.colA} ↔ ${c.colB}`, `r=${c.r}`]) || []),
  ];
  exportCSV(rows.slice(1), rows[0], `${tableName || 'insights'}_insights`);
}

// ── Professional PDF Report ─────────────────────────────────────
export function exportReportPDF(report, analysisResults, table) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const r = analysisResults || {};
  const pageW = 210, margin = 20, contentW = pageW - margin * 2;
  let y = 20;

  const addText = (text, opts = {}) => {
    const { fontSize = 10, color = [40, 40, 60], bold = false, indent = 0 } = opts;
    doc.setFontSize(fontSize);
    doc.setTextColor(...color);
    if (bold) doc.setFont('helvetica', 'bold');
    else doc.setFont('helvetica', 'normal');
    const lines = doc.splitTextToSize(String(text), contentW - indent);
    if (y + lines.length * (fontSize * 0.4) > 270) { doc.addPage(); y = 20; }
    doc.text(lines, margin + indent, y);
    y += lines.length * (fontSize * 0.42) + 2;
    return y;
  };

  const addDivider = (color = [220, 220, 235]) => {
    doc.setDrawColor(...color);
    doc.setLineWidth(0.3);
    doc.line(margin, y, pageW - margin, y);
    y += 4;
  };

  const addBox = (content, bgColor = [245, 247, 255], borderColor = [180, 180, 220]) => {
    const lines = doc.splitTextToSize(content, contentW - 8);
    const h = lines.length * 4.5 + 6;
    if (y + h > 270) { doc.addPage(); y = 20; }
    doc.setFillColor(...bgColor);
    doc.setDrawColor(...borderColor);
    doc.roundedRect(margin, y, contentW, h, 2, 2, 'FD');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(40, 40, 80);
    doc.text(lines, margin + 4, y + 5);
    y += h + 4;
  };

  // ── Header ──
  doc.setFillColor(15, 23, 50);
  doc.rect(0, 0, 210, 40, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(0, 220, 255);
  doc.text(report?.label || report?.title || 'Analytics Report', margin, 18);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(160, 180, 210);
  doc.text(`Generated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, margin, 26);
  if (table?.name) doc.text(`Dataset: ${table.name}  |  Rows: ${table.rowCount?.toLocaleString()}  |  Quality: ${table.qualityScore}%`, margin, 32);
  y = 50;

  // ── KPI Strip ──
  addText('KEY PERFORMANCE INDICATORS', { fontSize: 8, color: [100, 100, 140], bold: true });
  y += 1;
  const kpis = [
    [r.primaryLabel || 'Primary KPI', fmtV(r.totalValue)],
    ['Growth Rate', r.growthRate != null ? `${r.growthRate}%` : 'N/A'],
    ['Anomalies', r.anomalies?.length ?? 0],
    ['Quality Score', `${table?.qualityScore ?? '—'}%`],
  ];
  const colW = contentW / 4;
  kpis.forEach(([label, value], i) => {
    const x = margin + i * colW;
    doc.setFillColor(240, 242, 255);
    doc.roundedRect(x, y, colW - 2, 16, 1.5, 1.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(30, 30, 80);
    doc.text(String(value), x + (colW - 2) / 2, y + 8, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(120, 120, 160);
    doc.text(label, x + (colW - 2) / 2, y + 13, { align: 'center' });
  });
  y += 22;
  addDivider();

  // ── Report content ──
  if (report?.content) {
    addText('REPORT CONTENT', { fontSize: 8, color: [100, 100, 140], bold: true });
    y += 1;
    const paragraphs = report.content.split(/\n{2,}/).filter(Boolean);
    paragraphs.forEach(para => {
      const cleaned = para.replace(/#{1,4} /g, '').replace(/\*\*/g, '');
      if (cleaned.match(/^[A-Z][A-Z\s]+$/)) {
        addText(cleaned, { fontSize: 10, color: [30, 30, 80], bold: true });
      } else {
        addText(cleaned, { fontSize: 9, color: [60, 60, 90], indent: 2 });
        y += 1;
      }
    });
  }

  // ── Segments ──
  if (r.breakdownData?.length) {
    addDivider();
    addText('TOP SEGMENTS', { fontSize: 8, color: [100, 100, 140], bold: true });
    y += 1;
    r.breakdownData.slice(0, 8).forEach((seg, i) => {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(50, 50, 80);
      doc.text(`${i + 1}. ${seg.name}`, margin + 4, y);
      doc.setFont('helvetica', 'bold');
      doc.text(fmtV(seg.value), margin + contentW - 20, y, { align: 'right' });
      y += 5;
    });
  }

  // ── Recommendations ──
  if (r.recommendations?.length) {
    addDivider();
    addText('STRATEGIC RECOMMENDATIONS', { fontSize: 8, color: [100, 100, 140], bold: true });
    y += 1;
    r.recommendations.forEach(rec => {
      addBox(`[${(rec.priority || 'MED').toUpperCase()}] ${rec.action}`);
    });
  }

  // ── Footer ──
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(160, 160, 180);
    doc.text(`OmniData AI Analytics · ${report?.label || 'Report'} · Page ${i} of ${pageCount}`, pageW / 2, 290, { align: 'center' });
  }

  doc.save(`${(report?.label || report?.title || 'report').replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`);
}

// ── Predictive Dashboard PDF ────────────────────────────────────
export function exportPredictivePDF(analysisResults, table, narrative, scenarios) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const r = analysisResults || {};
  const pageW = 297, pageH = 210, margin = 18, contentW = pageW - margin * 2;
  let y = 20;

  // Header
  doc.setFillColor(15, 23, 50);
  doc.rect(0, 0, pageW, 38, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(168, 85, 247);
  doc.text('Predictive Insights Dashboard', margin, 18);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(160, 180, 210);
  doc.text(`${table?.name || 'Dataset'}  ·  Generated ${new Date().toLocaleDateString()}`, margin, 28);
  doc.text(`${table?.rowCount?.toLocaleString() || 0} rows  ·  Quality: ${table?.qualityScore || 0}%  ·  Growth: ${r.growthRate != null ? `${r.growthRate}%` : 'N/A'}`, margin, 34);
  y = 46;

  // KPI row
  const kpis = [
    { label: r.primaryLabel || 'KPI', val: fmtV(r.totalValue), color: [168, 85, 247] },
    { label: 'Growth Rate', val: r.growthRate != null ? `${r.growthRate}%` : '—', color: r.growthRate >= 0 ? [74, 222, 128] : [248, 113, 113] },
    { label: 'Forecast Periods', val: r.forecastData?.length || 0, color: [0, 229, 255] },
    { label: 'Anomalies', val: r.anomalies?.length || 0, color: r.anomalies?.length ? [251, 146, 60] : [74, 222, 128] },
    { label: 'Trend Periods', val: r.trendData?.length || 0, color: [147, 197, 253] },
  ];
  const kpiW = contentW / kpis.length;
  kpis.forEach(({ label, val, color }, i) => {
    const x = margin + i * kpiW;
    doc.setFillColor(245, 242, 255);
    doc.roundedRect(x, y, kpiW - 3, 18, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(...color);
    doc.text(String(val), x + (kpiW - 3) / 2, y + 8, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100, 100, 140);
    doc.text(label, x + (kpiW - 3) / 2, y + 14, { align: 'center' });
  });
  y += 25;

  // Narrative
  if (narrative) {
    doc.setFillColor(248, 245, 255);
    doc.setDrawColor(168, 85, 247);
    doc.setLineWidth(0.5);
    const narLines = doc.splitTextToSize(narrative, contentW - 8);
    const narH = Math.min(narLines.length * 4.2 + 8, 50);
    doc.roundedRect(margin, y, contentW, narH, 2, 2, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(100, 50, 160);
    doc.text('AI FORECAST NARRATIVE', margin + 4, y + 5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(60, 40, 90);
    const bodyLines = doc.splitTextToSize(narrative, contentW - 10);
    doc.text(bodyLines.slice(0, Math.floor((narH - 10) / 4.2)), margin + 4, y + 10);
    y += narH + 6;
  }

  // Scenarios
  if (scenarios) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 140);
    doc.text('SCENARIO ANALYSIS', margin, y);
    y += 5;
    const scenW = contentW / 3;
    [
      { label: 'Base Case', color: [168, 85, 247], end: scenarios.base?.[scenarios.base.length - 1]?.value, note: 'Current trend' },
      { label: 'Bull Case (+20%)', color: [74, 222, 128], end: scenarios.bull?.[scenarios.bull.length - 1]?.value, note: 'Optimistic' },
      { label: 'Bear Case (−20%)', color: [248, 113, 113], end: scenarios.bear?.[scenarios.bear.length - 1]?.value, note: 'Conservative' },
    ].forEach(({ label, color, end, note }, i) => {
      const x = margin + i * scenW;
      doc.setFillColor(248, 248, 255);
      doc.roundedRect(x, y, scenW - 3, 18, 2, 2, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(...color);
      doc.text(fmtV(end), x + (scenW - 3) / 2, y + 8, { align: 'center' });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(100, 100, 130);
      doc.text(`${label} · ${note}`, x + (scenW - 3) / 2, y + 14, { align: 'center' });
    });
    y += 24;
  }

  // Anomalies
  if (r.anomalies?.length) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 140);
    doc.text(`ANOMALY REGISTER (${r.anomalies.length} detected)`, margin, y);
    y += 5;
    r.anomalies.slice(0, 5).forEach(a => {
      const isHigh = a.severity === 'high';
      doc.setFillColor(isHigh ? 255 : 255, isHigh ? 245 : 250, isHigh ? 245 : 230);
      doc.roundedRect(margin, y, contentW, 7, 1, 1, 'F');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(60, 30, 30);
      doc.text(`${a.date || '—'}  Actual: ${fmtV(a.value)}  Expected: ${fmtV(a.expected)}  z=${a.zScore}σ  [${(a.severity || '').toUpperCase()}]`, margin + 3, y + 4.5);
      y += 9;
    });
  }

  // Footer
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(160, 160, 190);
  doc.text('OmniData AI · Predictive Insights Dashboard · Confidential', pageW / 2, pageH - 6, { align: 'center' });

  doc.save(`predictive_insights_${table?.name || 'dashboard'}_${new Date().toISOString().slice(0, 10)}.pdf`);
}