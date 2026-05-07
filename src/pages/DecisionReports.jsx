import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWorkspaceStore } from '@/lib/store';
import { base44 } from '@/api/base44Client';
import {
  FileText, Plus, Trash2, Loader2, ChevronLeft, Eye,
  Download, Copy
} from 'lucide-react';
import { Link } from 'react-router-dom';

const REPORT_TYPES = [
  { id: 'executive_summary', label: 'Executive Summary', desc: 'What happened, why, what to do' },
  { id: 'data_quality_audit', label: 'Data Quality Audit', desc: 'Completeness, validity, consistency' },
  { id: 'kpi_trend', label: 'KPI Trend Report', desc: 'Performance over time' },
  { id: 'contribution_analysis', label: 'Contribution Analysis', desc: 'Which segment drove change' },
  { id: 'forecast', label: 'Forecast Report', desc: 'Projections and scenarios' },
  { id: 'anomaly_risk', label: 'Anomaly & Risk Report', desc: 'Unusual patterns' },
  { id: 'what_if_simulation', label: 'What-If Simulation', desc: 'Scenario impact analysis' },
  { id: 'board_memo', label: 'Board Memo', desc: 'Formal governance memo' },
  { id: 'customer_rfm', label: 'Customer RFM Report', desc: 'Recency, frequency, monetary' },
  { id: 'funnel_analysis', label: 'Funnel Analysis', desc: 'Conversion and drop-off' },
];

export default function DecisionReports() {
  const { analysisResults, getActiveTable } = useWorkspaceStore();
  const table = getActiveTable();

  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState('');
  const [selectedReport, setSelectedReport] = useState(null);

  const handleGenerateReport = async (reportType) => {
    if (!table) return;
    setGenerating(reportType.id);

    try {
      const result = await base44.functions.invoke('generateDecisionReport', {
        reportType: reportType.id,
        analysisResults: analysisResults || {},
        tableData: table,
        title: `${reportType.label} - ${table.name}`,
      });

      setReports(r => [...r, result.data]);
      setSelectedReport(result.data);
    } catch (e) {
      console.error('Report generation failed:', e);
    }
    setGenerating('');
  };

  const handleDeleteReport = (idx) => {
    setReports(r => r.filter((_, i) => i !== idx));
    setSelectedReport(null);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-white/5 px-6 py-4 sticky top-0 z-10 bg-background/95 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link to="/workspace" className="p-1.5 rounded-lg text-white/40 hover:text-white/80 hover:bg-white/5 transition-all">
              <ChevronLeft className="w-4 h-4" />
            </Link>
            <div className="w-9 h-9 rounded-xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center">
              <FileText className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <h1 className="text-lg font-bold">Decision Reports</h1>
              <p className="text-xs text-muted-foreground">AI-generated board-ready reports</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {selectedReport ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="glass-card rounded-2xl p-8 border border-white/8">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold mb-2">{selectedReport.title}</h2>
                <p className="text-xs text-white/40">{selectedReport.reportType.replace(/_/g, ' ').toUpperCase()}</p>
              </div>
              <button onClick={() => setSelectedReport(null)}
                className="p-2 text-white/30 hover:text-white/70 rounded-lg border border-white/10 hover:bg-white/5 transition-all">
                <FileText className="w-4 h-4" />
              </button>
            </div>

            <div className="prose prose-invert max-w-none mb-6">
              <pre className="text-sm text-white/70 bg-black/30 p-4 rounded-lg overflow-auto max-h-96 leading-relaxed whitespace-pre-wrap">
                {selectedReport.content}
              </pre>
            </div>

            <div className="flex gap-2">
              <button onClick={() => navigator.clipboard.writeText(selectedReport.content)}
                className="flex items-center gap-1.5 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-xs hover:bg-white/8 transition-all">
                <Copy className="w-3.5 h-3.5" /> Copy
              </button>
              <button
                className="flex items-center gap-1.5 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-xs hover:bg-white/8 transition-all">
                <Download className="w-3.5 h-3.5" /> Download PDF
              </button>
            </div>
          </motion.div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              <AnimatePresence>
                {REPORT_TYPES.map(reportType => (
                  <motion.div key={reportType.id}
                    initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                    whileHover={{ scale: 1.02 }}>
                    <button onClick={() => handleGenerateReport(reportType)}
                      disabled={generating === reportType.id}
                      className="w-full h-full rounded-xl p-4 border border-white/10 bg-white/3 hover:bg-white/5 hover:border-amber-400/25 transition-all disabled:opacity-50 text-left space-y-2">
                      <div className="text-xs font-semibold text-white/80">{reportType.label}</div>
                      <div className="text-xs text-white/40">{reportType.desc}</div>
                      {generating === reportType.id && (
                        <div className="flex items-center gap-1.5 text-xs text-amber-400 mt-2">
                          <Loader2 className="w-3 h-3 animate-spin" /> Generating...
                        </div>
                      )}
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {reports.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-semibold text-sm text-white/70">Recent Reports</h3>
                <div className="space-y-2">
                  {reports.map((report, i) => (
                    <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                      className="flex items-center justify-between p-4 rounded-xl border border-white/8 bg-white/3 group hover:bg-white/5 transition-all">
                      <div>
                        <div className="text-sm font-semibold">{report.title}</div>
                        <div className="text-xs text-white/40 mt-1">{report.reportType.replace(/_/g, ' ')}</div>
                      </div>
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => setSelectedReport(report)}
                          className="p-1.5 rounded-lg text-white/40 hover:text-white/80 hover:bg-white/5">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDeleteReport(i)}
                          className="p-1.5 rounded-lg text-white/40 hover:text-red-400 hover:bg-red-400/10">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}