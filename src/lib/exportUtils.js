/**
 * exportUtils.js — PDF and Excel export for AI analysis reports
 */
import * as XLSX from 'xlsx';

// ─── Excel export ──────────────────────────────────────────────────
export function exportToExcel({ messages, tableName, analysisResults }) {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Analysis Q&A
  const qaRows = [['Role', 'Content', 'Confidence', 'Methodology', 'Charts']];
  messages.forEach(msg => {
    qaRows.push([
      msg.role === 'user' ? 'User' : 'AI Analyst',
      msg.content?.replace(/[#*`]/g, '').slice(0, 32000) || '',
      msg.confidence ? `${msg.confidence}%` : '',
      msg.methodology || '',
      msg.charts?.map(c => c.title).join('; ') || '',
    ]);
  });
  const wsQA = XLSX.utils.aoa_to_sheet(qaRows);
  wsQA['!cols'] = [{ wch: 12 }, { wch: 80 }, { wch: 14 }, { wch: 30 }, { wch: 40 }];
  XLSX.utils.book_append_sheet(wb, wsQA, 'AI Analysis');

  // Sheet 2: Chart data (all charts from all messages)
  const allCharts = messages.flatMap(m => m.charts || []);
  if (allCharts.length > 0) {
    allCharts.forEach((chart, idx) => {
      if (!chart.data?.length) return;
      const rows = [Object.keys(chart.data[0])];
      chart.data.forEach(row => rows.push(Object.values(row)));
      const ws = XLSX.utils.aoa_to_sheet(rows);
      const sheetName = (chart.title || `Chart ${idx + 1}`).slice(0, 28);
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
    });
  }

  // Sheet 3: Summary stats from analysisResults
  if (analysisResults) {
    const statsRows = [
      ['Metric', 'Value'],
      ['Dataset', tableName || ''],
      ['Primary KPI', analysisResults.primaryLabel || ''],
      ['Total Value', analysisResults.totalValue ?? ''],
      ['Growth Rate', analysisResults.growthRate != null ? `${analysisResults.growthRate}%` : ''],
      ['Anomalies Detected', analysisResults.anomalies?.length ?? 0],
      [],
      ['Executive Summary'],
      [analysisResults.executiveSummary || ''],
      [],
      ['Key Findings'],
      ...(analysisResults.keyFindings || []).map(f => [f]),
      [],
      ['Recommendations'],
      ...(analysisResults.recommendations || []).map(r => [`[${r.priority?.toUpperCase()}] ${r.action}`]),
    ];
    const wsStats = XLSX.utils.aoa_to_sheet(statsRows);
    wsStats['!cols'] = [{ wch: 24 }, { wch: 60 }];
    XLSX.utils.book_append_sheet(wb, wsStats, 'Summary');
  }

  XLSX.writeFile(wb, `AI_Analysis_${tableName || 'Report'}_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

// ─── PDF export via print ──────────────────────────────────────────
export function exportToPDF({ messages, tableName, analysisResults, savedCharts = [] }) {
  const fmtV = (v) => {
    if (v == null) return '—';
    const n = Number(v);
    if (!isNaN(n)) {
      if (Math.abs(n) >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
      if (Math.abs(n) >= 1e3) return `${(n / 1e3).toFixed(0)}K`;
      return n.toLocaleString();
    }
    return String(v);
  };

  const kpis = analysisResults ? `
    <div style="display:flex;gap:16px;flex-wrap:wrap;margin-bottom:24px">
      ${analysisResults.primaryLabel ? `<div style="background:#0a0f1e;border:1px solid #1e3a5f;border-radius:10px;padding:12px 18px;min-width:120px">
        <div style="font-size:10px;color:#7dd3fc;text-transform:uppercase;letter-spacing:1px">${analysisResults.primaryLabel}</div>
        <div style="font-size:22px;font-weight:900;color:#00e5ff;font-family:monospace">${fmtV(analysisResults.totalValue)}</div>
      </div>` : ''}
      ${analysisResults.growthRate != null ? `<div style="background:#0a0f1e;border:1px solid #1e3a5f;border-radius:10px;padding:12px 18px;min-width:120px">
        <div style="font-size:10px;color:#7dd3fc;text-transform:uppercase;letter-spacing:1px">Growth Rate</div>
        <div style="font-size:22px;font-weight:900;color:${Number(analysisResults.growthRate)>=0?'#4caf50':'#f44336'};font-family:monospace">${Number(analysisResults.growthRate)>=0?'+':''}${analysisResults.growthRate}%</div>
      </div>` : ''}
      ${analysisResults.anomalies?.length > 0 ? `<div style="background:#0a0f1e;border:1px solid #1e3a5f;border-radius:10px;padding:12px 18px;min-width:120px">
        <div style="font-size:10px;color:#7dd3fc;text-transform:uppercase;letter-spacing:1px">Anomalies</div>
        <div style="font-size:22px;font-weight:900;color:#ff6b35;font-family:monospace">${analysisResults.anomalies.length}</div>
      </div>` : ''}
    </div>
  ` : '';

  const conversationHtml = messages.map(msg => {
    if (msg.role === 'user') {
      return `<div style="margin:12px 0;padding:10px 14px;background:#0d1a2a;border-left:3px solid #00e5ff;border-radius:6px;font-size:13px;color:#94a3b8"><strong style="color:#e2e8f0">Q:</strong> ${msg.content}</div>`;
    }
    const chartTables = (msg.charts || []).map(chart => {
      if (!chart.data?.length) return '';
      const headers = Object.keys(chart.data[0]);
      return `
        <div style="margin:10px 0">
          <div style="font-size:10px;color:#00e5ff;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px">${chart.title || 'Chart Data'}</div>
          <table style="width:100%;border-collapse:collapse;font-size:11px">
            <thead><tr>${headers.map(h => `<th style="padding:5px 8px;background:#0d1a2a;border:1px solid #1e3a5f;color:#7dd3fc;text-align:left">${h}</th>`).join('')}</tr></thead>
            <tbody>${chart.data.slice(0, 20).map(row =>
              `<tr>${headers.map(h => `<td style="padding:5px 8px;border:1px solid #0f1f35;color:#cbd5e1">${row[h] ?? ''}</td>`).join('')}</tr>`
            ).join('')}</tbody>
          </table>
        </div>`;
    }).join('');

    const cleanContent = (msg.content || '')
      .replace(/^##\s+(.+)$/gm, '<h3 style="color:#00e5ff;font-size:13px;margin:10px 0 4px">$1</h3>')
      .replace(/^###\s+(.+)$/gm, '<h4 style="color:#7dd3fc;font-size:12px;margin:8px 0 3px">$1</h4>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/`([^`]+)`/g, '<code style="background:#0d1a2a;padding:1px 4px;border-radius:3px;font-family:monospace;color:#a5f3fc">$1</code>')
      .replace(/^[-*]\s+(.+)$/gm, '<li style="margin:2px 0;color:#cbd5e1">$1</li>')
      .replace(/\n\n/g, '</p><p style="color:#cbd5e1;margin:6px 0">');

    return `
      <div style="margin:12px 0;padding:14px;background:#080e1c;border:1px solid #1a2a40;border-radius:8px">
        <div style="font-size:12px;color:#cbd5e1;line-height:1.6">${cleanContent}</div>
        ${msg.confidence ? `<div style="margin-top:8px;font-size:10px;color:#4ade80">Confidence: ${msg.confidence}% · ${msg.methodology || ''}</div>` : ''}
        ${chartTables}
      </div>`;
  }).join('');

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>AI Analysis Report — ${tableName || 'Dataset'}</title>
  <style>
    @page { margin: 20mm 15mm; size: A4; }
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #060c18; color: #e2e8f0; margin: 0; padding: 20px; font-size: 13px; }
    h1 { color: #00e5ff; font-size: 22px; border-bottom: 2px solid #00e5ff33; padding-bottom: 8px; }
    h2 { color: #7dd3fc; font-size: 15px; margin-top: 24px; border-bottom: 1px solid #1e3a5f; padding-bottom: 4px; }
    .meta { font-size: 11px; color: #64748b; margin-bottom: 20px; }
    table { page-break-inside: avoid; }
    li { margin: 3px 0; }
  </style>
</head>
<body>
  <h1>🤖 AI Analysis Report</h1>
  <div class="meta">Dataset: <strong style="color:#00e5ff">${tableName || 'Unknown'}</strong> · Generated: ${new Date().toLocaleString()} · AI Analyst Platform</div>

  ${kpis}

  ${analysisResults?.executiveSummary ? `<h2>Executive Summary</h2><p style="color:#94a3b8;line-height:1.7">${analysisResults.executiveSummary}</p>` : ''}

  <h2>AI Analysis Conversation</h2>
  ${conversationHtml || '<p style="color:#64748b">No analysis performed yet.</p>'}

  ${analysisResults?.recommendations?.length ? `
  <h2>Recommendations</h2>
  <table style="width:100%;border-collapse:collapse;font-size:12px">
    <thead><tr>
      <th style="padding:6px 10px;background:#0d1a2a;border:1px solid #1e3a5f;color:#7dd3fc;text-align:left">Priority</th>
      <th style="padding:6px 10px;background:#0d1a2a;border:1px solid #1e3a5f;color:#7dd3fc;text-align:left">Action</th>
    </tr></thead>
    <tbody>${analysisResults.recommendations.map(r => `
      <tr>
        <td style="padding:5px 10px;border:1px solid #0f1f35;color:${r.priority==='high'||r.priority==='critical'?'#f87171':'#fbbf24'};font-weight:600;text-transform:uppercase;font-size:10px">${r.priority}</td>
        <td style="padding:5px 10px;border:1px solid #0f1f35;color:#cbd5e1">${r.action}</td>
      </tr>`).join('')}
    </tbody>
  </table>` : ''}

  ${savedCharts.length ? `
  <h2>Saved Dashboard Charts — Data Tables</h2>
  ${savedCharts.map(sc => {
    if (!sc.chart?.data?.length) return '';
    const headers = Object.keys(sc.chart.data[0]);
    return `
      <div style="margin:12px 0;page-break-inside:avoid">
        <div style="font-size:11px;color:#00e5ff;font-weight:700;margin-bottom:4px">${sc.label || sc.chart.title || 'Chart'}</div>
        <table style="width:100%;border-collapse:collapse;font-size:11px">
          <thead><tr>${headers.map(h => `<th style="padding:5px 8px;background:#0d1a2a;border:1px solid #1e3a5f;color:#7dd3fc;text-align:left">${h}</th>`).join('')}</tr></thead>
          <tbody>${sc.chart.data.slice(0, 25).map(row =>
            `<tr>${headers.map(h => `<td style="padding:4px 8px;border:1px solid #0f1f35;color:#cbd5e1">${row[h] ?? ''}</td>`).join('')}</tr>`
          ).join('')}</tbody>
        </table>
      </div>`;
  }).join('')}` : ''}

  <div style="margin-top:32px;padding-top:12px;border-top:1px solid #1e3a5f;font-size:10px;color:#475569">
    AI Agent Data Analytics Tool · Report generated ${new Date().toLocaleString()}
  </div>
</body>
</html>`;

  const win = window.open('', '_blank');
  win.document.write(html);
  win.document.close();
  setTimeout(() => win.print(), 400);
}