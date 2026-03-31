import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWorkspaceStore } from '@/lib/store';
import { Download, FileText, Loader2, CheckCircle2, Database, Sparkles, Printer, AlertCircle } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const reportTypes = [
  { id: 'executive', label: 'Executive Summary', icon: '📄', desc: 'High-level narrative with KPIs, trends, and recommendations.' },
  { id: 'board', label: 'Board Memo', icon: '🏛️', desc: 'Formal board-ready memo with data evidence and strategic actions.' },
  { id: 'anomaly', label: 'Anomaly Report', icon: '⚠️', desc: 'Detailed breakdown of detected anomalies with severity ratings.' },
  { id: 'forecast', label: 'Forecast Report', icon: '📈', desc: 'Forward-looking analysis with projections and assumptions.' },
  { id: 'quality', label: 'Data Quality Report', icon: '🔍', desc: 'Data profiling, issue log, and quality score breakdown.' },
];

export default function ReportsSection() {
  const { analysisResults, getActiveTable, setActiveSection, addReport, reports } = useWorkspaceStore();
  const table = getActiveTable();
  const [generating, setGenerating] = useState('');
  const [generated, setGenerated] = useState({});

  const generateReport = async (type) => {
    if (!analysisResults || !table) return;
    setGenerating(type);

    const { primaryLabel, totalValue, growthRate, executiveSummary, anomalies, recommendations, trendData, breakdownData } = analysisResults;
    const fmt = (v) => v >= 1e6 ? `${(v/1e6).toFixed(1)}M` : v >= 1e3 ? `${(v/1e3).toFixed(0)}K` : v?.toLocaleString?.();

    const prompts = {
      executive: `Write a professional executive summary report for this business dataset.
Dataset: ${table.name} (${table.rowCount} rows, quality score: ${table.qualityScore}%)
Primary KPI: ${primaryLabel} = ${fmt(totalValue)}, ${growthRate != null ? `${growthRate}% growth` : 'growth N/A'}
Key insight: ${executiveSummary}
Anomalies: ${anomalies?.length || 0}
Top recommendation: ${recommendations?.[0]?.action || 'None'}
Write a 3-paragraph executive summary with clear sections: Performance Overview, Key Findings, Strategic Recommendations.`,

      board: `Write a formal board memo for this business dataset analysis.
Dataset: ${table.name}
KPI: ${primaryLabel} = ${fmt(totalValue)}
Growth: ${growthRate != null ? `${growthRate}%` : 'N/A'}
Top 3 segments: ${breakdownData?.slice(0,3).map(b => b.name).join(', ')}
Anomalies: ${anomalies?.length || 0}
Summary: ${executiveSummary}
Recommendations: ${recommendations?.map(r => r.action).join(' | ')}
Format as a formal board memo with: TO/FROM/RE/DATE header, Executive Summary, Performance Analysis, Risk Assessment, Recommendations.`,

      anomaly: `Write a data anomaly report for this dataset.
Dataset: ${table.name}
Anomalies detected: ${JSON.stringify(anomalies?.slice(0, 5))}
Data quality score: ${table.qualityScore}%
Issues: ${table.issues?.map(i => i.message).join(', ') || 'None'}
Write a professional anomaly report covering: anomaly inventory, severity assessment, root cause hypotheses, and mitigation steps.`,

      forecast: `Write a forecast analysis report for this dataset.
Dataset: ${table.name}
KPI: ${primaryLabel} with ${growthRate != null ? `${growthRate}%` : 'N/A'} growth
Forecast available: ${analysisResults.canForecast}
Trend data points: ${trendData?.length}
Write a forward-looking forecast report with: methodology note, projection narrative, key assumptions, and confidence limitations.`,

      quality: `Write a data quality report for this dataset.
Dataset: ${table.name}
Rows: ${table.rowCount}, Columns: ${table.columns?.length}
Quality score: ${table.qualityScore}%
Issues: ${table.issues?.map(i => i.message).join(', ') || 'None detected'}
Column types: ${table.columns?.map(c => `${c.name}(${c.type})`).join(', ')}
Write a technical data quality report with: quality score breakdown, issue inventory, column profiling summary, and recommended remediation steps.`,
    };

    try {
      const content = await base44.integrations.Core.InvokeLLM({ prompt: prompts[type] });
      const report = { id: `${type}-${Date.now()}`, type, label: reportTypes.find(r => r.id === type)?.label, content, generatedAt: new Date().toISOString(), tableName: table.name };
      addReport(report);
      setGenerated(g => ({ ...g, [type]: report }));
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
    a.download = `${report.label?.replace(/\s+/g, '_')}_${report.tableName}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadCSV = () => {
    if (!table) return;
    const cols = table.columns?.map(c => c.name).join(',');
    const rowsStr = table.rows?.slice(0, 1000).map(row => 
      table.columns?.map(c => JSON.stringify(row[c.name] ?? '')).join(',')
    ).join('\n');
    const blob = new Blob([cols + '\n' + rowsStr], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${table.name}_cleaned.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!analysisResults || !table) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[400px] text-center">
        <FileText className="w-12 h-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground text-sm mb-4">Load data and run analysis to generate reports.</p>
        <button onClick={() => setActiveSection('intake')} className="px-4 py-2 bg-cyan-400/10 border border-cyan-400/20 text-cyan-400 rounded-lg text-sm">Upload Data</button>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold mb-2">Reports & Export</h1>
        <p className="text-muted-foreground text-sm">Generate board-ready reports or export cleaned data.</p>
      </motion.div>

      {/* Report cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {reportTypes.map((r) => {
          const isGenerating = generating === r.id;
          const isGenerated = !!generated[r.id];
          return (
            <motion.div
              key={r.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card rounded-2xl p-5 border border-white/5"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{r.icon}</span>
                  <div>
                    <div className="font-semibold text-sm">{r.label}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{r.desc}</div>
                  </div>
                </div>
                {isGenerated && <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => generateReport(r.id)}
                  disabled={!!generating}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-400/10 border border-cyan-400/20 text-cyan-400 rounded-lg text-xs font-semibold hover:bg-cyan-400/15 transition-colors disabled:opacity-40"
                >
                  {isGenerating ? <><Loader2 className="w-3 h-3 animate-spin" /> Generating…</> : <><Sparkles className="w-3 h-3" /> Generate</>}
                </button>
                {isGenerated && !generated[r.id]?.error && (
                  <button
                    onClick={() => downloadTxt(generated[r.id])}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/8 text-muted-foreground rounded-lg text-xs hover:text-foreground transition-colors"
                  >
                    <Download className="w-3 h-3" /> Download
                  </button>
                )}
              </div>

              {/* Report preview */}
              <AnimatePresence>
                {isGenerated && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mt-4 overflow-hidden">
                    <div className={`p-3 rounded-lg text-xs leading-relaxed max-h-40 overflow-auto ${generated[r.id]?.error ? 'text-red-400' : 'text-muted-foreground'} bg-white/3`}>
                      {generated[r.id]?.content}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>

      {/* CSV Export */}
      <div className="glass-card rounded-2xl p-6 border border-teal-400/15">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-teal-400/10 flex items-center justify-center">
              <Database className="w-4 h-4 text-teal-400" />
            </div>
            <div>
              <div className="font-semibold text-sm">Export Cleaned Data</div>
              <div className="text-xs text-muted-foreground">{table.name} · {table.rowCount?.toLocaleString()} rows · CSV format</div>
            </div>
          </div>
          <button
            onClick={downloadCSV}
            className="flex items-center gap-2 px-4 py-2 bg-teal-400/10 border border-teal-400/20 text-teal-400 rounded-lg text-sm font-semibold hover:bg-teal-400/15 transition-colors"
          >
            <Download className="w-4 h-4" /> Export CSV
          </button>
        </div>
      </div>

      {/* Print note */}
      <div className="flex items-start gap-3 p-4 bg-white/3 rounded-xl border border-white/5 text-sm text-muted-foreground">
        <Printer className="w-4 h-4 mt-0.5 flex-shrink-0" />
        <span>Use your browser's Print function (Ctrl+P) on any report preview for a PDF-ready output.</span>
      </div>
    </div>
  );
}