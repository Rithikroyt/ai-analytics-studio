/**
 * Decision Intelligence Reports Center
 * 12 report types — all backed by the generateDecisionReport backend function
 */
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useWorkspaceStore } from '@/lib/store';
import { Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import {
  FileText, ChevronLeft, Loader2, Sparkles, Download, Copy,
  CheckCircle2, Brain, BarChart2, AlertTriangle, TrendingUp,
  Users, Filter, Target, Zap, BookOpen, Briefcase, FlaskConical,
  X, Eye, RefreshCw, Database,
} from 'lucide-react';

const REPORT_TYPES = [
  { id: 'executive_summary',   label: 'Executive Summary',       icon: Briefcase,     color: '#00e5ff', desc: 'What happened, why, and what to do next.' },
  { id: 'board_memo',          label: 'Board Memo',              icon: BookOpen,      color: '#a855f7', desc: 'One-page strategic brief for the board.' },
  { id: 'data_quality_audit',  label: 'Data Quality Audit',      icon: FlaskConical,  color: '#4caf50', desc: 'Completeness, validity, uniqueness scored.' },
  { id: 'kpi_trend',           label: 'KPI & Trend Report',      icon: TrendingUp,    color: '#ffcc02', desc: 'KPI performance, trends, and correlations.' },
  { id: 'anomaly_risk',        label: 'Anomaly & Risk Report',   icon: AlertTriangle, color: '#ef4444', desc: 'Detected anomalies and risk assessment.' },
  { id: 'contribution_analysis',label: 'Contribution Analysis',  icon: Target,        color: '#00bfa5', desc: 'Which segments drove the change?' },
  { id: 'rfm_customer',        label: 'RFM Customer Report',     icon: Users,         color: '#ff6b35', desc: 'Champions, at-risk, hibernating segments.' },
  { id: 'funnel_analysis',     label: 'Funnel Analysis',         icon: Filter,        color: '#60a5fa', desc: 'Stage-by-stage conversion and drop-off.' },
  { id: 'forecast_report',     label: 'Forecast Report',         icon: BarChart2,     color: '#f472b6', desc: 'Base/bull/bear scenario projections.' },
  { id: 'what_if_simulation',  label: 'What-If Simulation',      icon: Zap,           color: '#fb923c', desc: 'Projected impact of parameter changes.' },
  { id: 'startup_validation',  label: 'Startup Validation',      icon: Brain,         color: '#34d399', desc: 'Unit economics, PMF, and runway analysis.' },
  { id: 'insight_digest',      label: 'Insight Digest',          icon: Sparkles,      color: '#e879f9', desc: 'Narrative synthesis of all findings.' },
];

function ReportTypeCard({ rt, selected, onClick }) {
  const Icon = rt.icon;
  return (
    <button onClick={() => onClick(rt)}
      className={`text-left p-4 rounded-2xl border transition-all ${selected ? 'border-opacity-40' : 'border-white/8 hover:border-white/18 hover:bg-white/3'}`}
      style={selected ? { borderColor: `${rt.color}40`, background: `${rt.color}0c` } : {}}>
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: `${rt.color}18`, border: `1px solid ${rt.color}25` }}>
          <Icon className="w-4 h-4" style={{ color: rt.color }} />
        </div>
        <div className="min-w-0">
          <div className="text-xs font-bold" style={{ color: selected ? rt.color : 'rgba(255,255,255,0.7)' }}>{rt.label}</div>
          <div className="text-xs text-white/30 mt-0.5 leading-tight">{rt.desc}</div>
        </div>
      </div>
    </button>
  );
}

export default function DecisionReports() {
  const { getActiveTable, analysisResults, savedCharts } = useWorkspaceStore();
  const table = getActiveTable();
  const [selectedType, setSelectedType] = useState(REPORT_TYPES[0]);
  const [generating, setGenerating] = useState(false);
  const [reports, setReports] = useState([]);
  const [activeReport, setActiveReport] = useState(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  const handleGenerate = async () => {
    if (!table && !analysisResults) {
      setError('Load a dataset in the Workspace first.');
      return;
    }
    setGenerating(true);
    setError('');
    try {
      const res = await base44.functions.invoke('generateDecisionReport', {
        reportType: selectedType.id,
        tableContext: {
          name: table?.name || 'Dataset',
          rowCount: table?.rowCount || table?.rows?.length || 0,
          columnCount: table?.columns?.length || 0,
          qualityScore: table?.qualityScore || analysisResults?.qualityScore || 75,
          columns: table?.columns || [],
          qualityBreakdown: table?.qualityBreakdown,
          missingCells: table?.missingCells,
          issues: table?.issues || [],
        },
        analysisResults: analysisResults || {},
      });
      if (res.data?.error) throw new Error(res.data.error);
      const report = {
        id: Date.now().toString(),
        type: selectedType,
        ...res.data,
        generatedAt: new Date().toISOString(),
      };
      setReports(prev => [report, ...prev]);
      setActiveReport(report);
    } catch (e) {
      setError(e.message || 'Generation failed');
    }
    setGenerating(false);
  };

  const copyReport = () => {
    if (activeReport?.content) {
      navigator.clipboard.writeText(activeReport.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const downloadReport = () => {
    if (!activeReport) return;
    const blob = new Blob([activeReport.content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeReport.type?.label || 'report'}-${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="border-b border-white/8 px-8 py-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <Link to="/workspace" className="p-1.5 rounded-lg text-white/30 hover:text-white/70 hover:bg-white/5 transition-all">
            <ChevronLeft className="w-4 h-4" />
          </Link>
          <div className="w-9 h-9 rounded-xl bg-blue-400/10 border border-blue-400/20 flex items-center justify-center">
            <FileText className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <h1 className="text-lg font-bold">Decision Intelligence Reports</h1>
            <p className="text-xs text-muted-foreground">12 report types · AI-generated · Methodology + Confidence included</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {table && <span className="text-xs text-white/30 flex items-center gap-1.5"><Database className="w-3.5 h-3.5" />{table.name} · {(table.rowCount || table.rows?.length)?.toLocaleString()} rows</span>}
          <button onClick={handleGenerate} disabled={generating}
            className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold bg-blue-500 hover:bg-blue-400 text-white transition-all disabled:opacity-40">
            {generating ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating…</> : <><Sparkles className="w-4 h-4" /> Generate {selectedType.label}</>}
          </button>
        </div>
      </div>

      {error && (
        <div className="mx-8 mt-4 flex items-center gap-2 p-3 rounded-xl bg-red-400/8 border border-red-400/20 text-red-400 text-sm">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />{error}
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* Left: report type selector */}
        <div className="w-72 flex-shrink-0 border-r border-white/8 overflow-y-auto p-4 space-y-2">
          <div className="text-xs text-white/25 font-semibold uppercase tracking-widest mb-3">Report Type</div>
          {REPORT_TYPES.map(rt => (
            <ReportTypeCard key={rt.id} rt={rt} selected={selectedType.id === rt.id} onClick={setSelectedType} />
          ))}
        </div>

        {/* Center: report history list */}
        {reports.length > 0 && !activeReport && (
          <div className="w-64 flex-shrink-0 border-r border-white/8 overflow-y-auto p-4 space-y-2">
            <div className="text-xs text-white/25 font-semibold uppercase tracking-widest mb-3">Generated Reports</div>
            {reports.map(r => (
              <button key={r.id} onClick={() => setActiveReport(r)}
                className="w-full text-left p-3 rounded-xl border border-white/8 hover:border-white/18 hover:bg-white/3 transition-all">
                <div className="text-xs font-semibold text-white/65">{r.type?.label}</div>
                <div className="text-xs text-white/30 mt-0.5">{new Date(r.generatedAt).toLocaleTimeString()}</div>
                <div className="text-xs text-white/20 mt-0.5">{r.wordCount} words</div>
              </button>
            ))}
          </div>
        )}

        {/* Right: report content */}
        <div className="flex-1 overflow-y-auto">
          {!activeReport ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center space-y-4 max-w-sm">
                <div className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center"
                  style={{ background: `${selectedType.color}15`, border: `1px solid ${selectedType.color}25` }}>
                  {(() => { const Icon = selectedType.icon; return <Icon className="w-8 h-8" style={{ color: selectedType.color }} />; })()}
                </div>
                <div>
                  <h3 className="font-bold text-lg">{selectedType.label}</h3>
                  <p className="text-sm text-white/40 mt-1">{selectedType.desc}</p>
                </div>
                <p className="text-xs text-white/25">Select a report type and click "Generate" to create a professional report from your dataset.</p>
                {!table && (
                  <div className="p-3 rounded-xl bg-amber-400/8 border border-amber-400/20 text-xs text-amber-400">
                    No dataset loaded. <Link to="/workspace" className="underline">Upload data in Workspace</Link> first.
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-8 max-w-4xl mx-auto">
              {/* Report header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <button onClick={() => setActiveReport(null)} className="text-white/30 hover:text-white/60"><X className="w-4 h-4" /></button>
                  <div>
                    <div className="font-bold">{activeReport.type?.label}</div>
                    <div className="text-xs text-white/30">{activeReport.tableName} · {new Date(activeReport.generatedAt).toLocaleString()} · {activeReport.wordCount} words</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {activeReport.confidence > 0 && (
                    <span className="text-xs px-2 py-1 rounded-full bg-white/5 border border-white/8 text-white/40">
                      Confidence: {activeReport.confidence}%
                    </span>
                  )}
                  <button onClick={copyReport}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border border-white/10 hover:bg-white/5 text-white/40 hover:text-white/70 transition-all">
                    {copied ? <CheckCircle2 className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                  <button onClick={downloadReport}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-blue-400/10 border border-blue-400/20 text-blue-400 hover:bg-blue-400/15 transition-all">
                    <Download className="w-3 h-3" /> Download
                  </button>
                  <button onClick={handleGenerate} disabled={generating}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border border-white/10 hover:bg-white/5 text-white/40 hover:text-white/70 transition-all disabled:opacity-40">
                    <RefreshCw className={`w-3 h-3 ${generating ? 'animate-spin' : ''}`} /> Regenerate
                  </button>
                </div>
              </div>

              {/* Report content */}
              <div className="glass-card rounded-2xl border border-white/8 p-8">
                <ReactMarkdown
                  className="prose prose-sm prose-invert max-w-none [&_h1]:text-xl [&_h1]:font-black [&_h1]:text-white [&_h2]:text-base [&_h2]:font-bold [&_h2]:text-white/90 [&_h2]:mt-6 [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:text-white/80 [&_p]:text-white/65 [&_p]:leading-relaxed [&_li]:text-white/65 [&_strong]:text-white/85 [&_code]:bg-white/8 [&_code]:text-cyan-400 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_blockquote]:border-l-2 [&_blockquote]:border-cyan-400/40 [&_blockquote]:pl-4 [&_blockquote]:text-white/50"
                  components={{
                    h2: ({ children }) => <h2 className="text-base font-bold text-white/90 mt-6 mb-3 pb-1.5 border-b border-white/8">{children}</h2>,
                    table: ({ children }) => <div className="overflow-x-auto my-4"><table className="w-full text-xs border-collapse">{children}</table></div>,
                    th: ({ children }) => <th className="px-3 py-2 text-left text-white/40 font-semibold border border-white/8 bg-white/3">{children}</th>,
                    td: ({ children }) => <td className="px-3 py-2 text-white/65 border border-white/8">{children}</td>,
                  }}>
                  {activeReport.content}
                </ReactMarkdown>
              </div>

              {/* Metadata footer */}
              <div className="mt-4 p-3 rounded-xl bg-white/2 border border-white/5 text-xs text-white/25 flex items-center gap-4 flex-wrap">
                <span>Methodology: {activeReport.methodology || 'AI + Descriptive Statistics'}</span>
                <span>·</span>
                <span>Generated: {new Date(activeReport.generatedAt).toLocaleString()}</span>
                <span>·</span>
                <span>OmniData AI Analytics Studio</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}