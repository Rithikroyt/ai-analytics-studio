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
  { id: 'executive', label: 'Executive Summary', icon: '📄', emoji: FileText, color: 'text-cyan-400', border: 'border-cyan-400/20', bg: 'bg-cyan-400/5', desc: 'High-level narrative with KPIs, trends, and strategic recommendations.' },
  { id: 'board', label: 'Board Memo', icon: '🏛️', emoji: BarChart3, color: 'text-purple-400', border: 'border-purple-400/20', bg: 'bg-purple-400/5', desc: 'Formal board-ready memo with data evidence and strategic actions.' },
  { id: 'kpi_trend', label: 'KPI & Trend Report', icon: '📈', emoji: TrendingUp, color: 'text-teal-400', border: 'border-teal-400/20', bg: 'bg-teal-400/5', desc: 'Detailed KPI performance with period-over-period trend decomposition.' },
  { id: 'anomaly', label: 'Anomaly Report', icon: '⚠️', emoji: AlertTriangle, color: 'text-amber-400', border: 'border-amber-400/20', bg: 'bg-amber-400/5', desc: 'Detailed anomaly breakdown with severity ratings and mitigation steps.' },
  { id: 'forecast', label: 'Forecast Report', icon: '🔮', emoji: TrendingUp, color: 'text-blue-400', border: 'border-blue-400/20', bg: 'bg-blue-400/5', desc: 'Forward-looking analysis with projections, assumptions, and confidence limits.' },
  { id: 'quality', label: 'Data Quality Report', icon: '🔍', emoji: Shield, color: 'text-white/60', border: 'border-white/15', bg: 'bg-white/3', desc: 'Data profiling, issue log, quality score breakdown, and remediation steps.' },
  { id: 'feedback', label: 'Feedback & Survey Insights', icon: '💬', emoji: MessageSquare, color: 'text-pink-400', border: 'border-pink-400/20', bg: 'bg-pink-400/5', desc: 'Satisfaction scores, NPS analysis, sentiment patterns, and response summaries.' },
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
    return `
Dataset: ${table.name} (${table.rowCount?.toLocaleString()} rows, ${table.columns?.length} columns)
Quality Score: ${table.qualityScore}%
Issues: ${table.issues?.map(i => i.message).join('; ') || 'None'}
Primary KPI: ${r.primaryLabel} = ${fmt(r.totalValue)}
Growth Rate: ${r.growthRate != null ? `${r.growthRate}%` : 'N/A'}
Top Segments: ${r.breakdownData?.slice(0, 5).map(b => `${b.name}: ${fmt(b.value)}`).join(', ') || 'N/A'}
Anomalies (${r.anomalies?.length || 0}): ${r.anomalies?.slice(0, 3).map(a => `${a.date || 'row'}: z=${a.zScore}, severity=${a.severity}`).join('; ') || 'None'}
Key Correlations: ${r.correlations?.slice(0, 3).map(c => `${c.colA}↔${c.colB} r=${c.r}`).join(', ') || 'None'}
Forecast Available: ${r.canForecast ? `Yes (${r.forecastData?.length} periods)` : 'No (no date column)'}
Executive Summary: ${r.executiveSummary || 'N/A'}
Recommendations: ${r.recommendations?.map(rec => `[${rec.priority}] ${rec.action}`).join(' | ') || 'None'}
    `.trim();
  };

  const generateReport = async (type) => {
    if (!analysisResults || !table) return;
    setGenerating(type);
    const ctx = buildContext();
    const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    const prompts = {
      executive: `Write a professional EXECUTIVE SUMMARY REPORT. Date: ${today}
Context:
${ctx}

Format with these exact sections:
## Executive Summary
## Performance Overview  
## Key Findings
## Risk Assessment
## Strategic Recommendations
## Conclusion

Use professional business language. Include specific numbers. Keep each section 2-3 paragraphs. 400-500 words total.`,

      board: `Write a formal BOARD OF DIRECTORS MEMO. Date: ${today}
Context:
${ctx}

Format:
TO: Board of Directors
FROM: Analytics Team
RE: ${table.name} Performance Analysis
DATE: ${today}

## Executive Overview
## Performance Analysis
## Risk & Anomaly Assessment  
## Strategic Recommendations
## Next Steps

Formal, concise, board-appropriate language. 300-400 words.`,

      kpi_trend: `Write a KPI & TREND ANALYSIS REPORT. Date: ${today}
Context:
${ctx}

Format:
## KPI Performance Summary
## Key Metrics Dashboard
## Period-Over-Period Analysis
## Trend Decomposition
## Leading vs Lagging Indicators
## KPI Health Assessment
## Improvement Roadmap

Data-focused, executive language. Include specific numbers. 400-500 words.`,

      feedback: `Write a FEEDBACK & SURVEY INSIGHTS REPORT. Date: ${today}
Context:
${ctx}

Format:
## Feedback Analysis Overview
## Satisfaction Score Breakdown
## NPS & Engagement Trends
## Top Positive Themes
## Top Areas for Improvement
## Segment-Level Sentiment Analysis
## Recommended Actions
## Priority Response Plan

Focus on satisfaction, NPS, engagement, completion metrics. Professional and actionable. 350-450 words.`,

      anomaly: `Write a DATA ANOMALY INVESTIGATION REPORT. Date: ${today}
Context:
${ctx}

Format with:
## Anomaly Detection Summary
## Anomaly Inventory
## Severity Assessment
## Root Cause Hypotheses
## Impact Analysis
## Recommended Mitigation Steps

Technical but readable. Include a clear anomaly table. 350-450 words.`,

      forecast: `Write a FORECAST & TREND ANALYSIS REPORT. Date: ${today}
Context:
${ctx}

Format:
## Forecast Overview
## Methodology & Assumptions
## Trend Analysis
## 6-Period Forward Projection
## Confidence & Uncertainty
## Scenario Planning (Bull/Base/Bear case)
## Strategic Implications

Professional financial language. Include specific projected figures. 350-450 words.`,

      quality: `Write a DATA QUALITY ASSESSMENT REPORT. Date: ${today}
Context:
${ctx}

Format:
## Data Quality Overview
## Quality Score Breakdown
## Issue Inventory
## Column-Level Profile
## Missing Data Analysis
## Duplicate & Anomaly Summary
## Remediation Recommendations
## Quality Improvement Roadmap

Technical but clear. Include a quality metrics table. Reference the actual score and issues. 350-450 words.`,
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

  const printReport = (report) => {
    const win = window.open('', '_blank');
    win.document.write(`<!DOCTYPE html><html><head>
      <title>${report.label} — ${report.tableName}</title>
      <style>
        body { font-family: 'Georgia', serif; max-width: 800px; margin: 40px auto; padding: 0 40px; color: #1a1a2e; line-height: 1.7; }
        h1 { font-size: 28px; border-bottom: 3px solid #0d7d7d; padding-bottom: 12px; margin-bottom: 8px; color: #0d2137; }
        h2 { font-size: 18px; margin-top: 28px; color: #0d2137; border-bottom: 1px solid #e0e0e0; padding-bottom: 6px; }
        .meta { color: #666; font-size: 13px; margin-bottom: 32px; }
        p { margin: 12px 0; }
        ul, ol { padding-left: 24px; }
        li { margin: 6px 0; }
        @media print { body { margin: 0; } }
      </style>
    </head><body>
      <h1>${report.label}</h1>
      <div class="meta">Dataset: ${report.tableName} · Generated: ${new Date(report.generatedAt).toLocaleString()}</div>
      <div>${report.content.replace(/\n/g, '<br>').replace(/## (.*)/g, '<h2>$1</h2>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}</div>
    </body></html>`);
    win.document.close();
    setTimeout(() => win.print(), 500);
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
                        <Printer className="w-3 h-3" /> PDF
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