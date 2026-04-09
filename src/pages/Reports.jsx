/**
 * Reports — Group saved charts into PDF/web dashboards with scheduled email delivery
 */
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText, Plus, Trash2, Mail, ChevronLeft, Loader2, CheckCircle2,
  Sparkles, Download, Calendar, Clock, X, Eye, BarChart2,
  Send, RefreshCw, Settings, BookOpen, Printer, Globe
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useWorkspaceStore } from '@/lib/store';
import { base44 } from '@/api/base44Client';

const SCHEDULES = [
  { id: 'manual', label: 'Manual only' },
  { id: 'daily', label: 'Daily (9 AM)' },
  { id: 'weekly_mon', label: 'Weekly — Monday' },
  { id: 'weekly_fri', label: 'Weekly — Friday' },
  { id: 'monthly', label: 'Monthly (1st)' },
];

const FORMATS = [
  { id: 'pdf', label: 'PDF Report', icon: FileText, color: 'text-red-400', bg: 'bg-red-400/10', border: 'border-red-400/20' },
  { id: 'web', label: 'Web Dashboard', icon: Globe, color: 'text-blue-400', bg: 'bg-blue-400/10', border: 'border-blue-400/20' },
  { id: 'email', label: 'Email Digest', icon: Mail, color: 'text-green-400', bg: 'bg-green-400/10', border: 'border-green-400/20' },
];

function EmptyState() {
  return (
    <div className="text-center py-16 px-6 border border-white/5 rounded-2xl">
      <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/8 flex items-center justify-center mx-auto mb-4">
        <FileText className="w-7 h-7 text-white/25" />
      </div>
      <h3 className="font-semibold text-base mb-2">No reports yet</h3>
      <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto leading-relaxed">
        Create a report to bundle saved charts into a shareable PDF or web dashboard. Schedule it to auto-email your team.
      </p>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Link to="/dashboards" className="inline-flex items-center gap-2 px-4 py-2.5 bg-cyan-400/10 border border-cyan-400/20 text-cyan-400 rounded-xl text-sm font-semibold hover:bg-cyan-400/15 transition-all">
          <BarChart2 className="w-4 h-4" /> View Saved Charts
        </Link>
        <Link to="/workspace" className="inline-flex items-center gap-2 px-4 py-2.5 glass border border-white/10 rounded-xl text-sm font-semibold hover:border-white/20 transition-all">
          <Sparkles className="w-4 h-4" /> Generate AI Analysis
        </Link>
      </div>
    </div>
  );
}

function ReportCard({ report, savedCharts, onDelete, onSend, onPreview, sending }) {
  const chartCount = report.chartIds?.length || 0;
  const format = FORMATS.find(f => f.id === report.format) || FORMATS[0];
  const FormatIcon = format.icon;
  const schedule = SCHEDULES.find(s => s.id === report.schedule) || SCHEDULES[0];

  return (
    <motion.div layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }}
      className="glass-card rounded-2xl border border-white/10 overflow-hidden">
      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-start gap-3">
            <div className={`w-10 h-10 rounded-xl ${format.bg} border ${format.border} flex items-center justify-center flex-shrink-0`}>
              <FormatIcon className={`w-5 h-5 ${format.color}`} />
            </div>
            <div>
              <div className="font-bold text-sm">{report.title}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{report.description || 'No description'}</div>
            </div>
          </div>
          <button onClick={() => onDelete(report.id)} className="p-1.5 text-white/25 hover:text-red-400 transition-colors flex-shrink-0">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Metadata strip */}
        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mb-4">
          <span className="flex items-center gap-1"><BarChart2 className="w-3 h-3" /> {chartCount} chart{chartCount !== 1 ? 's' : ''}</span>
          <span className={`flex items-center gap-1 ${format.color}`}><FormatIcon className="w-3 h-3" /> {format.label}</span>
          <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {schedule.label}</span>
          {report.recipients?.length > 0 && <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {report.recipients.length} recipient{report.recipients.length !== 1 ? 's' : ''}</span>}
          {report.lastSent && <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Sent {new Date(report.lastSent).toLocaleDateString()}</span>}
        </div>

        {/* Chart previews */}
        {chartCount > 0 && (
          <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1">
            {report.chartIds.slice(0, 5).map(id => {
              const chart = savedCharts.find(c => c.id === id);
              return chart ? (
                <div key={id} className="flex-shrink-0 px-2.5 py-1.5 bg-white/5 border border-white/8 rounded-lg text-xs text-white/50 whitespace-nowrap">
                  {chart.label || chart.chart?.title || 'Chart'}
                </div>
              ) : null;
            })}
            {chartCount > 5 && <div className="flex-shrink-0 px-2 py-1.5 text-xs text-white/30">+{chartCount - 5} more</div>}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => onPreview(report)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-white/50 hover:text-white/80 border border-white/8 hover:bg-white/5 transition-all">
            <Eye className="w-3 h-3" /> Preview
          </button>
          <button onClick={() => onSend(report)} disabled={sending === report.id}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-purple-400/10 border border-purple-400/20 text-purple-400 hover:bg-purple-400/15 transition-all disabled:opacity-50">
            {sending === report.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
            {sending === report.id ? 'Sending…' : 'Send Now'}
          </button>
          <button onClick={() => generatePDF(report, savedCharts)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-white/50 hover:text-white/80 border border-white/8 hover:bg-white/5 transition-all">
            <Printer className="w-3 h-3" /> Export PDF
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function generatePDF(report, savedCharts) {
  const charts = (report.chartIds || []).map(id => savedCharts.find(c => c.id === id)).filter(Boolean);
  const win = window.open('', '_blank');
  win.document.write(`<!DOCTYPE html><html><head>
    <title>${report.title}</title>
    <style>
      body { font-family: 'Helvetica', sans-serif; max-width: 900px; margin: 40px auto; padding: 0 40px; color: #1a1a2e; line-height: 1.7; }
      .header { border-bottom: 3px solid #00c9c9; padding-bottom: 16px; margin-bottom: 32px; }
      h1 { font-size: 28px; margin: 0 0 4px; color: #0d2137; }
      .meta { color: #666; font-size: 13px; }
      .chart-card { border: 1px solid #e0e0e0; border-radius: 12px; padding: 20px; margin-bottom: 24px; page-break-inside: avoid; }
      .chart-title { font-size: 16px; font-weight: 700; margin-bottom: 4px; }
      .chart-insight { font-size: 13px; color: #555; margin-top: 8px; }
      .dataset { font-size: 12px; color: #888; }
      .footer { margin-top: 48px; border-top: 1px solid #e0e0e0; padding-top: 16px; font-size: 12px; color: #999; text-align: center; }
      @media print { body { margin: 0; } }
    </style>
  </head><body>
    <div class="header">
      <h1>${report.title}</h1>
      <div class="meta">${report.description || ''} · Generated ${new Date().toLocaleString()} · ${charts.length} charts</div>
    </div>
    ${charts.map((c, i) => `
      <div class="chart-card">
        <div class="chart-title">${i + 1}. ${c.label || c.chart?.title || 'Chart'}</div>
        <div class="dataset">Source: ${c.datasetName || 'Dataset'}</div>
        ${c.insight ? `<div class="chart-insight">${c.insight}</div>` : ''}
      </div>
    `).join('')}
    <div class="footer">AI Agent Analytics · ${report.title} · Confidential</div>
  </body></html>`);
  win.document.close();
  setTimeout(() => win.print(), 400);
}

export default function Reports() {
  const { savedCharts, analysisResults, getActiveTable } = useWorkspaceStore();
  const table = getActiveTable();

  const [reports, setReports] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [sending, setSending] = useState('');
  const [sentToast, setSentToast] = useState('');
  const [previewReport, setPreviewReport] = useState(null);
  const [form, setForm] = useState({
    title: '', description: '', chartIds: [], format: 'pdf',
    schedule: 'manual', recipients: '', includeAISummary: true,
  });

  const handleCreate = () => {
    if (!form.title) return;
    const recipientList = form.recipients.split(',').map(r => r.trim()).filter(Boolean);
    const newReport = {
      id: Date.now().toString(),
      ...form,
      recipients: recipientList,
      createdAt: new Date().toISOString(),
      lastSent: null,
    };
    setReports(r => [newReport, ...r]);
    setForm({ title: '', description: '', chartIds: [], format: 'pdf', schedule: 'manual', recipients: '', includeAISummary: true });
    setShowForm(false);
  };

  const handleDelete = (id) => setReports(r => r.filter(x => x.id !== id));

  const handleSend = async (report) => {
    if (!report.recipients?.length) {
      alert('No recipients configured. Edit the report to add email addresses.');
      return;
    }
    setSending(report.id);
    try {
      const charts = (report.chartIds || []).map(id => savedCharts.find(c => c.id === id)).filter(Boolean);
      const chartList = charts.map(c => `• ${c.label || c.chart?.title || 'Chart'} (${c.datasetName || 'dataset'})`).join('\n');
      let aiSummary = '';
      if (report.includeAISummary && analysisResults) {
        aiSummary = `\n\nAI Insight: ${analysisResults.executiveSummary || 'Analysis available in workspace.'}`;
      }
      const body = `Hi,\n\nYour scheduled report "${report.title}" is ready.\n\n${report.description ? report.description + '\n\n' : ''}Charts included:\n${chartList}${aiSummary}\n\nGenerated: ${new Date().toLocaleString()}\n\n—AI Agent Analytics`;

      for (const recipient of report.recipients) {
        await base44.integrations.Core.SendEmail({
          to: recipient,
          subject: `📊 ${report.title} — ${new Date().toLocaleDateString()}`,
          body,
        });
      }
      setReports(r => r.map(x => x.id === report.id ? { ...x, lastSent: new Date().toISOString() } : x));
      setSentToast(`"${report.title}" sent to ${report.recipients.length} recipient${report.recipients.length !== 1 ? 's' : ''}`);
      setTimeout(() => setSentToast(''), 4000);
    } catch (e) {
      alert(`Failed to send: ${e.message}`);
    }
    setSending('');
  };

  const toggleChartId = (id) => {
    setForm(f => ({
      ...f,
      chartIds: f.chartIds.includes(id) ? f.chartIds.filter(x => x !== id) : [...f.chartIds, id],
    }));
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Toast */}
      <AnimatePresence>
        {sentToast && (
          <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-green-400/15 border border-green-400/30 text-green-400 text-xs font-medium shadow-2xl">
            <CheckCircle2 className="w-3.5 h-3.5" /> {sentToast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="border-b border-white/5 px-6 py-4 sticky top-0 z-10 bg-background/95 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link to="/workspace" className="p-1.5 rounded-lg text-white/40 hover:text-white/80 hover:bg-white/5 transition-all">
              <ChevronLeft className="w-4 h-4" />
            </Link>
            <div className="w-9 h-9 rounded-xl bg-blue-400/10 border border-blue-400/20 flex items-center justify-center">
              <FileText className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <h1 className="text-lg font-bold">Reports</h1>
              <p className="text-xs text-muted-foreground">{reports.length} report{reports.length !== 1 ? 's' : ''} · Group charts into scheduled PDFs & emails</p>
            </div>
          </div>
          <button onClick={() => setShowForm(v => !v)}
            className="flex items-center gap-1.5 px-3 py-2 bg-blue-400/10 border border-blue-400/20 text-blue-400 rounded-xl text-xs font-semibold hover:bg-blue-400/15 transition-all">
            <Plus className="w-3.5 h-3.5" /> New Report
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-6 space-y-6">
        {/* Create form */}
        <AnimatePresence>
          {showForm && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              className="glass-card rounded-2xl p-6 border border-blue-400/20">
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-bold text-sm">Create New Report</h3>
                <button onClick={() => setShowForm(false)} className="text-white/40 hover:text-white/70"><X className="w-4 h-4" /></button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="text-xs text-muted-foreground mb-1 block">Report Title *</label>
                  <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                    placeholder="e.g. Weekly Sales Performance"
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-blue-400/30" />
                </div>
                <div className="md:col-span-2">
                  <label className="text-xs text-muted-foreground mb-1 block">Description (optional)</label>
                  <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    placeholder="Brief note for recipients"
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-blue-400/30" />
                </div>

                {/* Format selector */}
                <div>
                  <label className="text-xs text-muted-foreground mb-2 block">Output Format</label>
                  <div className="flex gap-2 flex-wrap">
                    {FORMATS.map(fmt => (
                      <button key={fmt.id} onClick={() => setForm(f => ({ ...f, format: fmt.id }))}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${form.format === fmt.id ? `${fmt.bg} ${fmt.border} ${fmt.color}` : 'bg-white/3 border-white/8 text-white/40 hover:border-white/15'}`}>
                        <fmt.icon className="w-3.5 h-3.5" /> {fmt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Schedule */}
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Auto-send Schedule</label>
                  <select value={form.schedule} onChange={e => setForm(f => ({ ...f, schedule: e.target.value }))}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-blue-400/30 text-foreground">
                    {SCHEDULES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                  </select>
                </div>

                {/* Recipients */}
                <div className="md:col-span-2">
                  <label className="text-xs text-muted-foreground mb-1 block">Email Recipients (comma-separated)</label>
                  <input value={form.recipients} onChange={e => setForm(f => ({ ...f, recipients: e.target.value }))}
                    placeholder="ceo@company.com, team@company.com"
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-blue-400/30" />
                </div>

                {/* AI Summary toggle */}
                <div className="md:col-span-2 flex items-center gap-3">
                  <button onClick={() => setForm(f => ({ ...f, includeAISummary: !f.includeAISummary }))}
                    className={`w-10 h-6 rounded-full border transition-all ${form.includeAISummary ? 'bg-purple-400 border-purple-400' : 'bg-white/10 border-white/20'}`}>
                    <div className={`w-4 h-4 rounded-full bg-white mx-auto transition-all ${form.includeAISummary ? 'translate-x-2' : '-translate-x-2'}`} />
                  </button>
                  <div>
                    <div className="text-xs font-medium">Include AI Executive Summary</div>
                    <div className="text-xs text-muted-foreground">Prepend AI-generated insight from your workspace analysis</div>
                  </div>
                </div>

                {/* Chart selection */}
                <div className="md:col-span-2">
                  <label className="text-xs text-muted-foreground mb-2 block">
                    Select Charts to Include ({form.chartIds.length} selected)
                  </label>
                  {savedCharts.length === 0 ? (
                    <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-400/5 border border-amber-400/20 text-xs text-amber-400">
                      <BarChart2 className="w-3.5 h-3.5" />
                      No saved charts yet. Save charts from the AI Analyst to include them in reports.
                      <Link to="/workspace" className="text-cyan-400 hover:underline ml-1">Go to Workspace</Link>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                      {savedCharts.map(c => {
                        const selected = form.chartIds.includes(c.id);
                        return (
                          <button key={c.id} onClick={() => toggleChartId(c.id)}
                            className={`flex items-start gap-2 p-2.5 rounded-xl text-left text-xs border transition-all ${selected ? 'bg-blue-400/10 border-blue-400/25 text-blue-400' : 'bg-white/3 border-white/8 text-white/50 hover:border-white/15'}`}>
                            <div className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 mt-0.5 ${selected ? 'bg-blue-400' : 'bg-white/10'}`}>
                              {selected && <CheckCircle2 className="w-3 h-3 text-navy-900" />}
                            </div>
                            <span className="truncate leading-tight">{c.label || c.chart?.title || 'Chart'}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-2 mt-5">
                <button onClick={handleCreate} disabled={!form.title}
                  className="flex items-center gap-1.5 px-5 py-2 bg-blue-400/15 border border-blue-400/25 text-blue-400 rounded-xl text-xs font-semibold hover:bg-blue-400/20 transition-all disabled:opacity-40">
                  <FileText className="w-3.5 h-3.5" /> Create Report
                </button>
                <button onClick={() => setShowForm(false)} className="px-4 py-2 text-white/40 hover:text-white/70 text-xs rounded-xl border border-white/8 hover:bg-white/5 transition-all">Cancel</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Reports grid */}
        {reports.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <AnimatePresence>
              {reports.map(report => (
                <ReportCard key={report.id} report={report} savedCharts={savedCharts}
                  onDelete={handleDelete} onSend={handleSend} onPreview={setPreviewReport} sending={sending} />
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* Schedule info */}
        <div className="flex items-start gap-3 p-4 glass rounded-xl border border-white/5 text-xs text-muted-foreground">
          <Calendar className="w-4 h-4 flex-shrink-0 mt-0.5 text-blue-400/60" />
          <span>
            <strong className="text-white/50">Scheduled delivery:</strong> Reports marked with a recurring schedule auto-send to recipients at the configured time. In production, this connects to a backend cron scheduler. Click "Send Now" to deliver immediately.
          </span>
        </div>
      </div>

      {/* Preview modal */}
      <AnimatePresence>
        {previewReport && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
            onClick={() => setPreviewReport(null)}>
            <motion.div initial={{ scale: 0.93, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.93, opacity: 0 }}
              className="glass-card rounded-2xl p-6 w-full max-w-lg border border-white/12 shadow-2xl max-h-[80vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold">{previewReport.title}</h3>
                <button onClick={() => setPreviewReport(null)} className="text-white/40 hover:text-white/70"><X className="w-4 h-4" /></button>
              </div>
              {previewReport.description && <p className="text-sm text-muted-foreground mb-4">{previewReport.description}</p>}
              <div className="space-y-2 mb-4">
                {(previewReport.chartIds || []).map(id => {
                  const c = savedCharts.find(x => x.id === id);
                  return c ? (
                    <div key={id} className="flex items-center gap-3 p-3 rounded-xl bg-white/3 border border-white/8">
                      <BarChart2 className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                      <div>
                        <div className="text-xs font-semibold">{c.label || c.chart?.title || 'Chart'}</div>
                        <div className="text-xs text-muted-foreground">{c.datasetName}</div>
                      </div>
                    </div>
                  ) : null;
                })}
                {!previewReport.chartIds?.length && <div className="text-xs text-white/30 text-center py-4">No charts selected</div>}
              </div>
              {previewReport.includeAISummary && analysisResults?.executiveSummary && (
                <div className="p-3 rounded-xl bg-purple-400/5 border border-purple-400/20 text-xs text-white/60 leading-relaxed mb-4">
                  <div className="text-purple-400 font-semibold mb-1 flex items-center gap-1"><Sparkles className="w-3 h-3" /> AI Executive Summary</div>
                  {analysisResults.executiveSummary}
                </div>
              )}
              <div className="flex gap-2">
                <button onClick={() => { generatePDF(previewReport, savedCharts); setPreviewReport(null); }}
                  className="flex items-center gap-1.5 px-4 py-2 bg-blue-400/10 border border-blue-400/20 text-blue-400 rounded-xl text-xs font-semibold hover:bg-blue-400/15 transition-all">
                  <Printer className="w-3.5 h-3.5" /> Export PDF
                </button>
                <button onClick={() => { handleSend(previewReport); setPreviewReport(null); }}
                  className="flex items-center gap-1.5 px-4 py-2 bg-green-400/10 border border-green-400/20 text-green-400 rounded-xl text-xs font-semibold hover:bg-green-400/15 transition-all">
                  <Send className="w-3.5 h-3.5" /> Send Now
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}