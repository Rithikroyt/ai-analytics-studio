import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWorkspaceStore } from '@/lib/store';
import {
  Download, FileText, Loader2, CheckCircle2, Database,
  Sparkles, Printer, AlertCircle, FileSpreadsheet, BarChart3,
  TrendingUp, AlertTriangle, Shield, MessageSquare, Copy
} from 'lucide-react';
import { base44 } from '@/api/base44Client';

const reportTypes = [
  { id: 'executive', label: 'Executive Summary',        icon: '📄', emoji: FileText,     color: 'text-cyan-400',   border: 'border-cyan-400/20',   bg: 'bg-cyan-400/5',   desc: 'C-suite narrative: KPIs, trend, risk, and strategic recommendations.' },
  { id: 'board',     label: 'Board Memo',               icon: '🏛️', emoji: BarChart3,    color: 'text-purple-400', border: 'border-purple-400/20', bg: 'bg-purple-400/5', desc: 'Formal board-ready memo with data evidence and prioritised actions.' },
  { id: 'kpi_trend', label: 'KPI & Trend Report',       icon: '📈', emoji: TrendingUp,   color: 'text-teal-400',   border: 'border-teal-400/20',   bg: 'bg-teal-400/5',   desc: 'Period-over-period KPI decomposition, trend signals, and forecasts.' },
  { id: 'anomaly',   label: 'Anomaly & Risk Report',    icon: '⚠️', emoji: AlertTriangle, color: 'text-amber-400',  border: 'border-amber-400/20',  bg: 'bg-amber-400/5',  desc: 'Severity-ranked anomaly inventory with root-cause hypotheses and mitigations.' },
  { id: 'forecast',  label: 'Forecast Report',          icon: '🔮', emoji: TrendingUp,   color: 'text-blue-400',   border: 'border-blue-400/20',   bg: 'bg-blue-400/5',   desc: 'Bull / Base / Bear projections with assumptions and confidence bounds.' },
  { id: 'quality',   label: 'Data Quality Audit',       icon: '🔍', emoji: Shield,       color: 'text-white/60',   border: 'border-white/15',      bg: 'bg-white/3',      desc: 'Column-level profiling, issue log, quality score, and remediation roadmap.' },
  { id: 'feedback',  label: 'Feedback & Survey Insights',icon: '💬', emoji: MessageSquare,color: 'text-pink-400',   border: 'border-pink-400/20',   bg: 'bg-pink-400/5',   desc: 'NPS, satisfaction scores, sentiment patterns, and response theme analysis.' },
];

const fmt = (v) => {
  if (v == null) return 'N/A';
  if (v >= 1e9) return `${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `${(v / 1e3).toFixed(0)}K`;
  return v?.toLocaleString?.() || String(v);
};

export default function ReportsSection() {
  const { analysisResults, getActiveTable, setActiveSection, addReport } = useWorkspaceStore();
  const table = getActiveTable();
  const [generating, setGenerating] = useState('');
  const [generated, setGenerated] = useState({});
  const [expandedReport, setExpandedReport] = useState(null);
  const [copied, setCopied] = useState('');

  const buildContext = () => {
    if (!analysisResults || !table) return '';
    const r = analysisResults;
    const numCols = table.columns?.filter(c => c.type === 'numeric') || [];
    const catCols = table.columns?.filter(c => c.type === 'category') || [];
    const colStats = numCols.slice(0, 6).map(c => {
      const vals = (table.rows || []).map(row => Number(row[c.name])).filter(v => !isNaN(v));
      if (!vals.length) return '';
      const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
      const std = Math.sqrt(vals.reduce((a, b) => a + (b - mean) ** 2, 0) / vals.length);
      const sorted = [...vals].sort((a, b) => a - b);
      return `  ${c.name}: mean=${fmt(mean)}, std=${fmt(std)}, min=${fmt(sorted[0])}, max=${fmt(sorted[sorted.length-1])}, n=${vals.length}`;
    }).filter(Boolean).join('\n');
    return `
Dataset: ${table.name} (${table.rowCount?.toLocaleString()} rows, ${table.columns?.length} columns)
Quality Score: ${table.qualityScore}%
Issues: ${table.issues?.map(i => i.message).join('; ') || 'None'}
Numeric Columns: ${numCols.map(c => c.name).join(', ') || 'None'}
Category Columns: ${catCols.map(c => c.name).join(', ') || 'None'}
Primary KPI: ${r.primaryLabel} = ${fmt(r.totalValue)}
Secondary KPI: ${r.secondLabel || 'N/A'} = ${fmt(r.secondValue)}
Growth Rate: ${r.growthRate != null ? `${r.growthRate}%` : 'N/A (no date column)'}
Top Segments: ${r.breakdownData?.slice(0, 5).map(b => `${b.name}: ${fmt(b.value)}`).join(', ') || 'N/A'}
Anomalies (${r.anomalies?.length || 0}): ${r.anomalies?.slice(0, 3).map(a => `${a.date || 'row'}: z=${a.zScore}, severity=${a.severity}`).join('; ') || 'None'}
Key Correlations: ${r.correlations?.slice(0, 3).map(c => `${c.colA}↔${c.colB} r=${c.r}`).join(', ') || 'None'}
Forecast Available: ${r.canForecast ? `Yes (${r.forecastData?.length} periods ahead)` : 'No (no date column)'}
Forecast Values: ${r.forecastData?.slice(0, 3).map(f => `${f.date}: ${fmt(f.value)}`).join(', ') || 'N/A'}
Executive Summary: ${r.executiveSummary || 'N/A'}
Key Findings: ${r.keyFindings?.join(' | ') || 'N/A'}
Recommendations: ${r.recommendations?.map(rec => `[${rec.priority}] ${rec.action}`).join(' | ') || 'None'}

COLUMN STATISTICS:
${colStats || 'N/A'}
    `.trim();
  };

  const generateReport = async (type) => {
    if (!analysisResults || !table) return;
    setGenerating(type);
    const ctx = buildContext();
    const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    const prompts = {
      executive: `Write a professional EXECUTIVE SUMMARY REPORT. Date: ${today}.
Context:
${ctx}

Format with EXACTLY these sections using ## headers:
## Executive Summary
## Business Performance Overview
## Key Findings & Insights
## Risk Assessment
## Strategic Recommendations
## Appendix: Methodology Notes

RULES: Professional C-suite language. INCLUDE specific numbers from the context (totals, %, growth rates). Each section 2-3 paragraphs. Include a **Key Takeaways** bullet list in the first section. Reference anomaly counts, top segments, correlation insights. 500-600 words.`,

      board: `Write a formal BOARD OF DIRECTORS MEMO. Date: ${today}.
Context:
${ctx}

Format:
TO: Board of Directors
FROM: Analytics Intelligence Team
RE: ${table.name} — Performance Analysis
DATE: ${today}
CLASSIFICATION: Confidential

## 1. Executive Overview
## 2. Financial & Operational Performance
## 3. Key Metrics Dashboard
## 4. Anomaly & Risk Register
## 5. Strategic Recommendations
## 6. Requested Board Actions
## Appendix: Data Provenance

RULES: Formal, concise, board-appropriate language. Include a metrics table (Markdown). Specific numbers only. 400-500 words.`,

      kpi_trend: `Write a KPI & TREND ANALYSIS REPORT. Date: ${today}.
Context:
${ctx}

Format:
## KPI Executive Dashboard
## Primary Metric Performance
## Period-over-Period Analysis
## Trend Signal Assessment
## Secondary Metrics Review
## Leading vs Lagging Indicators
## Forecast Outlook
## Improvement Roadmap

RULES: Include a KPI Summary Table (Markdown). State growth rates, trend direction, and statistical basis (z-score, correlation). Reference forecast values if available. 450-550 words.`,

      feedback: `Write a FEEDBACK & SURVEY INSIGHTS REPORT. Date: ${today}.
Context:
${ctx}

Format:
## Feedback Analysis Overview
## Satisfaction Score Summary
## NPS & Loyalty Trends
## Top Positive Themes
## Critical Pain Points
## Segment-Level Sentiment Analysis
## Statistical Confidence Assessment
## Priority Action Plan
## Methodology Notes

RULES: Focus on satisfaction, NPS, engagement, completion metrics. Include a Sentiment Summary Table (Markdown). Professional and evidence-based. 400-500 words.`,

      anomaly: `Write a DATA ANOMALY & RISK INVESTIGATION REPORT. Date: ${today}.
Context:
${ctx}

Format:
## Anomaly Detection Summary
## Severity-Ranked Anomaly Register
## Statistical Methodology
## Root Cause Hypotheses
## Business Impact Assessment
## Correlated Risk Signals
## Mitigation Playbook
## Monitoring Recommendations

RULES: Include an Anomaly Inventory Table (Markdown) with date, value, expected, z-score, severity columns. Reference z-score thresholds (|z|>2 = medium, |z|>3 = high). Technical but executive-readable. 400-500 words.`,

      forecast: `Write a FORECAST & SCENARIO ANALYSIS REPORT. Date: ${today}.
Context:
${ctx}

Format:
## Forecast Executive Summary
## Methodology & Model Assumptions
## Historical Trend Analysis
## Base Case Projection (next 6 periods)
## Bull Case Scenario (+20% upside)
## Bear Case Scenario (-20% downside)
## Confidence Intervals & Uncertainty
## Key Risk Factors
## Strategic Implications

RULES: Include a Scenario Comparison Table (Markdown). State model type (Exp. Smoothing + Linear Regression blend). Include specific forecast values from context. Professional financial language. 450-550 words.`,

      quality: `Write a DATA QUALITY AUDIT REPORT. Date: ${today}.
Context:
${ctx}

Format:
## Data Quality Executive Summary
## Overall Quality Score Assessment
## Column-Level Quality Profile
## Missing Data Analysis
## Duplicate & Consistency Audit
## Statistical Integrity Assessment
## Issue Severity Register
## Remediation Roadmap
## Quality Governance Recommendations

RULES: Include a Quality Metrics Summary Table (Markdown) with column name, type, missing %, unique count. Reference the actual quality score (${table.qualityScore}%). Technical but clear. 400-500 words.`,
    };

    try {
      const content = await base44.integrations.Core.InvokeLLM({ prompt: prompts[type] });
      const report = {
        id: `${type}-${Date.now()}`,
        type,
        label: reportTypes.find(r => r.id === type)?.label,
        content,
        generatedAt: new Date().toISOString(),
        tableName: table.name,
      };
      addReport(report);
      setGenerated(g => ({ ...g, [type]: report }));
      setExpandedReport(type);
    } catch (e) {
      setGenerated(g => ({ ...g, [type]: { content: 'Report generation failed. Please try again.', error: true } }));
    }
    setGenerating('');
  };

  const downloadTxt = (report) => {
    const blob = new Blob([report.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${report.label?.replace(/\s+/g, '_')}_${report.tableName}_${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyReport = async (report) => {
    await navigator.clipboard.writeText(report.content);
    setCopied(report.id);
    setTimeout(() => setCopied(''), 2000);
  };

  const buildReportHTML = (report) => {
    const r = analysisResults;
    const topSegments = r?.breakdownData?.slice(0, 5).map(b =>
      `<tr><td>${b.name}</td><td>${fmt(b.value)}</td><td>${r.totalValue ? (b.value/r.totalValue*100).toFixed(1)+'%' : '—'}</td></tr>`
    ).join('') || '<tr><td colspan="3">No segment data</td></tr>';
    const anomalyRows = r?.anomalies?.slice(0, 8).map(a =>
      `<tr><td>${a.date || '—'}</td><td>${fmt(a.value)}</td><td>${fmt(a.expected)}</td><td>${a.zScore}σ</td><td class="sev-${a.severity}">${a.severity?.toUpperCase()}</td></tr>`
    ).join('') || '<tr><td colspan="5">No anomalies detected</td></tr>';
    const content = (report.content || '')
      .replace(/\n/g, '<br>')
      .replace(/## (.*?)(<br>|$)/g, '<h2>$1</h2>')
      .replace(/### (.*?)(<br>|$)/g, '<h3>$1</h3>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\| (.*?) \|/g, (m) => '<tr>' + m.split('|').filter(Boolean).map(c => `<td>${c.trim()}</td>`).join('') + '</tr>')
      .replace(/((<tr>.*<\/tr>\s*)+)/g, '<table class="data-table">$1</table>');
    return `<!DOCTYPE html><html lang="en"><head>
<meta charset="UTF-8">
<title>${report.label} — ${report.tableName}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Georgia', serif; background: #fafafa; color: #1a1a2e; }
  .page { max-width: 900px; margin: 0 auto; padding: 60px 60px 80px; background: #fff; min-height: 100vh; }
  .header { border-bottom: 3px solid #0d7d7d; padding-bottom: 20px; margin-bottom: 32px; }
  .header h1 { font-size: 28px; color: #0d2137; font-weight: 700; margin-bottom: 6px; }
  .meta-strip { display: flex; gap: 24px; margin-top: 10px; flex-wrap: wrap; }
  .meta-item { font-size: 12px; color: #666; }
  .meta-item strong { color: #0d2137; }
  .kpi-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin: 24px 0; }
  .kpi-card { background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 16px; }
  .kpi-card .label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: #0369a1; margin-bottom: 4px; }
  .kpi-card .value { font-size: 22px; font-weight: 700; color: #0d2137; font-family: 'Courier New', monospace; }
  .kpi-card .sub { font-size: 11px; color: #0369a1; margin-top: 4px; }
  h2 { font-size: 18px; color: #0d2137; border-bottom: 1px solid #e0e0e0; padding-bottom: 8px; margin: 28px 0 12px; font-weight: 600; }
  h3 { font-size: 14px; color: #0d2137; margin: 20px 0 8px; font-weight: 600; }
  p, br { line-height: 1.75; margin-bottom: 12px; font-size: 14px; }
  ul, ol { padding-left: 22px; margin: 10px 0; }
  li { margin: 5px 0; font-size: 14px; line-height: 1.6; }
  .data-table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 12px; }
  .data-table th, .data-table td { border: 1px solid #e0e0e0; padding: 8px 12px; text-align: left; }
  .data-table th { background: #f0f9ff; font-weight: 600; color: #0369a1; }
  .data-table tr:nth-child(even) { background: #fafafa; }
  .sev-high { color: #dc2626; font-weight: 700; }
  .sev-medium { color: #d97706; font-weight: 600; }
  .content { font-size: 14px; line-height: 1.8; }
  .footer { margin-top: 48px; padding-top: 16px; border-top: 1px solid #e0e0e0; font-size: 11px; color: #999; display: flex; justify-content: space-between; }
  .badge { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; }
  .badge-quality { background: ${table.qualityScore >= 90 ? '#dcfce7' : table.qualityScore >= 70 ? '#fef9c3' : '#fee2e2'}; color: ${table.qualityScore >= 90 ? '#166534' : table.qualityScore >= 70 ? '#854d0e' : '#991b1b'}; }
  @media print { body { background: #fff; } .page { padding: 40px; } }
</style>
</head><body><div class="page">
<div class="header">
  <h1>${report.label}</h1>
  <div class="meta-strip">
    <div class="meta-item"><strong>Dataset:</strong> ${report.tableName}</div>
    <div class="meta-item"><strong>Generated:</strong> ${new Date(report.generatedAt).toLocaleString()}</div>
    <div class="meta-item"><strong>Rows Analyzed:</strong> ${table.rowCount?.toLocaleString()}</div>
    <div class="meta-item"><strong>Quality Score:</strong> <span class="badge badge-quality">${table.qualityScore}%</span></div>
    ${r?.growthRate != null ? `<div class="meta-item"><strong>Trend:</strong> ${r.growthRate > 0 ? '+' : ''}${r.growthRate}%</div>` : ''}
  </div>
</div>
<div class="kpi-grid">
  <div class="kpi-card"><div class="label">${r?.primaryLabel || 'Primary KPI'}</div><div class="value">${fmt(r?.totalValue)}</div><div class="sub">${r?.growthRate != null ? (r.growthRate > 0 ? '▲' : '▼') + ' ' + Math.abs(r.growthRate) + '% trend' : 'No trend data'}</div></div>
  <div class="kpi-card"><div class="label">Records Analyzed</div><div class="value">${table.rowCount?.toLocaleString()}</div><div class="sub">${table.columns?.length} columns profiled</div></div>
  <div class="kpi-card"><div class="label">Anomalies Detected</div><div class="value">${r?.anomalies?.length || 0}</div><div class="sub">${r?.anomalies?.length ? 'Requires investigation' : 'All within normal range'}</div></div>
</div>
${r?.breakdownData?.length ? `<h2>Segment Breakdown</h2><table class="data-table"><thead><tr><th>Segment</th><th>Value</th><th>Share</th></tr></thead><tbody>${topSegments}</tbody></table>` : ''}
${r?.anomalies?.length ? `<h2>Anomaly Register</h2><table class="data-table"><thead><tr><th>Date/Period</th><th>Actual</th><th>Expected</th><th>Z-Score</th><th>Severity</th></tr></thead><tbody>${anomalyRows}</tbody></table>` : ''}
<h2>Report Content</h2>
<div class="content">${content}</div>
<div class="footer">
  <span>OmniData AI Analytics · ${report.label} · Confidential</span>
  <span>Generated ${new Date(report.generatedAt).toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' })}</span>
</div>
</div></body></html>`;
  };

  const printReport = (report) => {
    const win = window.open('', '_blank');
    win.document.write(buildReportHTML(report));
    win.document.close();
    setTimeout(() => win.print(), 600);
  };

  const downloadHTML = (report) => {
    const html = buildReportHTML(report);
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${report.label?.replace(/\s+/g, '_')}_${report.tableName}_${new Date().toISOString().slice(0,10)}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadBundle = () => {
    if (!table) return;
    // Download cleaned CSV
    const cols = table.columns?.map(c => c.name).join(',');
    const rowsStr = table.rows?.map(row =>
      table.columns?.map(c => {
        const val = String(row[c.name] ?? '');
        return val.includes(',') ? `"${val}"` : val;
      }).join(',')
    ).join('\n');
    const csvBlob = new Blob([cols + '\n' + rowsStr], { type: 'text/csv' });
    const csvUrl = URL.createObjectURL(csvBlob);
    const csvA = document.createElement('a');
    csvA.href = csvUrl; csvA.download = `${table.name}_data.csv`; csvA.click();
    URL.revokeObjectURL(csvUrl);
    // Download insights CSV
    const r = analysisResults;
    const insightLines = [
      'Section,Field,Value',
      `KPI,Primary Metric,${r?.primaryLabel || ''}`,
      `KPI,Total Value,${r?.totalValue || ''}`,
      `KPI,Growth Rate,${r?.growthRate ?? ''}%`,
      `KPI,Quality Score,${table.qualityScore}%`,
      ...(r?.recommendations || []).map(rec => `Recommendation,${rec.priority},"${rec.action}"`),
      ...(r?.anomalies || []).map(a => `Anomaly,${a.date},"value=${a.value} expected=${a.expected} z=${a.zScore} ${a.severity}"`),
    ].join('\n');
    const insBlob = new Blob([insightLines], { type: 'text/csv' });
    const insUrl = URL.createObjectURL(insBlob);
    const insA = document.createElement('a');
    insA.href = insUrl; insA.download = `${table.name}_insights.csv`; insA.click();
    URL.revokeObjectURL(insUrl);
    // Download generated reports as one TXT
    const reportTexts = Object.values(generated)
      .filter(g => g?.content && !g.error)
      .map(g => `===== ${g.label} =====\n${g.content}`).join('\n\n');
    if (reportTexts) {
      const txtBlob = new Blob([reportTexts], { type: 'text/plain' });
      const txtUrl = URL.createObjectURL(txtBlob);
      const txtA = document.createElement('a');
      txtA.href = txtUrl; txtA.download = `${table.name}_reports.txt`; txtA.click();
      URL.revokeObjectURL(txtUrl);
    }
  };

  const downloadCSV = () => {
    if (!table) return;
    const cols = table.columns?.map(c => c.name).join(',');
    const rowsStr = table.rows?.map(row =>
      table.columns?.map(c => {
        const val = String(row[c.name] ?? '');
        return val.includes(',') ? `"${val}"` : val;
      }).join(',')
    ).join('\n');
    const blob = new Blob([cols + '\n' + rowsStr], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${table.name}_cleaned_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!analysisResults || !table) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[500px] text-center">
        <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/8 flex items-center justify-center mx-auto mb-4">
          <FileText className="w-7 h-7 text-white/25" />
        </div>
        <h2 className="text-lg font-semibold mb-2">No Analysis Available</h2>
        <p className="text-muted-foreground text-sm mb-6 max-w-sm">
          Load data and run AI analysis in the Prepare section to unlock report generation.
        </p>
        <button onClick={() => setActiveSection('intake')}
          className="flex items-center gap-2 px-5 py-2.5 bg-cyan-400/10 border border-cyan-400/20 text-cyan-400 rounded-xl text-sm font-semibold hover:bg-cyan-400/15 transition-colors">
          Upload Data
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold mb-1">Reports & Export</h1>
        <p className="text-sm text-muted-foreground">Generate AI-written board-ready reports or export cleaned data for distribution.</p>
      </motion.div>

      {/* Context strip */}
      <div className="flex flex-wrap gap-3 p-4 glass rounded-xl border border-white/5">
        <div className="text-xs text-white/40 uppercase tracking-widest self-center mr-2">Source:</div>
        {[
          { label: table.name, color: 'text-cyan-400' },
          { label: `${table.rowCount?.toLocaleString()} rows`, color: 'text-white/50' },
          { label: `Quality ${table.qualityScore}%`, color: table.qualityScore >= 90 ? 'text-green-400' : 'text-amber-400' },
          { label: `${analysisResults.anomalies?.length || 0} anomalies`, color: 'text-red-400/70' },
        ].map((item, i) => (
          <span key={i} className={`text-xs font-medium ${item.color}`}>{item.label}</span>
        )).reduce((prev, curr, i) => [prev, <span key={`sep-${i}`} className="text-white/15">·</span>, curr])}
      </div>

      {/* Report cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {reportTypes.map((r) => {
          const isGenerating = generating === r.id;
          const reportData = generated[r.id];
          const isGenerated = !!reportData;
          const isExpanded = expandedReport === r.id;
          return (
            <motion.div key={r.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              className={`glass-card rounded-2xl border ${r.border} ${r.bg} transition-all`}>
              <div className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{r.icon}</span>
                    <div>
                      <div className="font-semibold text-sm">{r.label}</div>
                      <div className="text-xs text-muted-foreground mt-0.5 leading-relaxed max-w-52">{r.desc}</div>
                    </div>
                  </div>
                  {isGenerated && !reportData?.error && <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0 mt-1" />}
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button onClick={() => generateReport(r.id)} disabled={!!generating}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all disabled:opacity-40 ${r.color} bg-white/8 border border-white/12 hover:bg-white/12`}>
                    {isGenerating ? <><Loader2 className="w-3 h-3 animate-spin" /> Generating…</> : <><Sparkles className="w-3 h-3" /> {isGenerated ? 'Regenerate' : 'Generate'}</>}
                  </button>

                  {isGenerated && !reportData?.error && (
                    <>
                      <button onClick={() => setExpandedReport(isExpanded ? null : r.id)}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs text-white/50 hover:text-white/80 border border-white/8 hover:bg-white/5 transition-all">
                        {isExpanded ? 'Collapse' : 'Preview'}
                      </button>
                      <button onClick={() => downloadTxt(reportData)}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs text-white/50 hover:text-white/80 border border-white/8 hover:bg-white/5 transition-all">
                        <Download className="w-3 h-3" /> TXT
                      </button>
                      <button onClick={() => printReport(reportData)}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs text-white/50 hover:text-white/80 border border-white/8 hover:bg-white/5 transition-all">
                        <Printer className="w-3 h-3" /> Print/PDF
                      </button>
                      <button onClick={() => downloadHTML(reportData)}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs text-white/50 hover:text-white/80 border border-white/8 hover:bg-white/5 transition-all">
                        <Download className="w-3 h-3" /> HTML
                      </button>
                      <button onClick={() => copyReport(reportData)}
                        className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs border transition-all ${copied === reportData.id ? 'text-green-400 border-green-400/25' : 'text-white/50 hover:text-white/80 border-white/8 hover:bg-white/5'}`}>
                        {copied === reportData.id ? <><CheckCircle2 className="w-3 h-3" /> Copied</> : <><Copy className="w-3 h-3" /> Copy</>}
                      </button>
                    </>
                  )}
                </div>
              </div>

              <AnimatePresence>
                {isExpanded && isGenerated && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden border-t border-white/8">
                    <div className={`p-4 text-xs leading-relaxed max-h-64 overflow-y-auto font-mono whitespace-pre-wrap ${reportData?.error ? 'text-red-400' : 'text-white/65'}`}>
                      {reportData?.content}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>

      {/* Export section */}
      <div className="glass-card rounded-2xl p-5 border border-teal-400/15 space-y-4">
        <h2 className="text-sm font-semibold text-white/60 uppercase tracking-widest">Data Exports</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="flex items-center justify-between p-4 rounded-xl bg-teal-400/5 border border-teal-400/20">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-teal-400/10 flex items-center justify-center">
                <Database className="w-4 h-4 text-teal-400" />
              </div>
              <div>
                <div className="font-semibold text-sm">Cleaned Dataset</div>
                <div className="text-xs text-muted-foreground">{table.name} · {table.rowCount?.toLocaleString()} rows · CSV</div>
              </div>
            </div>
            <button onClick={downloadCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-400/10 border border-teal-400/20 text-teal-400 rounded-lg text-xs font-semibold hover:bg-teal-400/15 transition-colors">
              <Download className="w-3.5 h-3.5" /> Export
            </button>
          </div>

          {analysisResults.anomalies?.length > 0 && (
            <div className="flex items-center justify-between p-4 rounded-xl bg-amber-400/5 border border-amber-400/20">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-amber-400/10 flex items-center justify-center">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                </div>
                <div>
                  <div className="font-semibold text-sm">Anomaly Data</div>
                  <div className="text-xs text-muted-foreground">{analysisResults.anomalies.length} anomalies · CSV</div>
                </div>
              </div>
              <button onClick={() => {
                const cols = 'date,value,expected,severity,z_score';
                const rows = analysisResults.anomalies.map(a => `${a.date},${a.value},${a.expected},${a.severity},${a.zScore}`).join('\n');
                const blob = new Blob([cols + '\n' + rows], { type: 'text/csv' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url; a.download = 'anomalies.csv'; a.click();
                URL.revokeObjectURL(url);
              }} className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-400/10 border border-amber-400/20 text-amber-400 rounded-lg text-xs font-semibold hover:bg-amber-400/15 transition-colors">
                <Download className="w-3.5 h-3.5" /> Export
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Bundle export */}
      <div className="flex items-center justify-between p-4 rounded-2xl border border-purple-400/15 bg-purple-400/5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-purple-400/10 flex items-center justify-center">
            <Download className="w-4 h-4 text-purple-400" />
          </div>
          <div>
            <div className="font-semibold text-sm">Download Full Bundle</div>
            <div className="text-xs text-muted-foreground">Cleaned data CSV + AI insights CSV + all generated reports TXT</div>
          </div>
        </div>
        <button onClick={downloadBundle}
          className="flex items-center gap-1.5 px-4 py-2 bg-purple-400/15 border border-purple-400/25 text-purple-400 rounded-xl text-xs font-semibold hover:bg-purple-400/20 transition-all whitespace-nowrap">
          <Download className="w-3.5 h-3.5" /> Export Bundle
        </button>
      </div>

      <div className="flex items-start gap-3 p-4 bg-white/3 rounded-xl border border-white/5 text-sm text-muted-foreground">
        <Printer className="w-4 h-4 mt-0.5 flex-shrink-0 text-white/30" />
        <span className="text-xs leading-relaxed">Click <strong className="text-white/50">PDF</strong> on any report to open a print-ready version in a new tab. Use your browser's Print (Ctrl+P / Cmd+P) and select "Save as PDF" for a formatted PDF document.</span>
      </div>
    </div>
  );
}