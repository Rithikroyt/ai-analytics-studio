/**
 * AnalystExportButton — Export AI Analyst findings to PDF or CSV
 */
import { useState } from 'react';
import { Download, FileText, FileSpreadsheet, Loader2, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

function fmtV(v) {
  if (v == null) return '';
  const n = Number(v);
  if (!isNaN(n) && Math.abs(n) >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (!isNaN(n) && Math.abs(n) >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return String(v);
}

function buildHTML(messages, tableName) {
  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const rows = messages
    .filter(m => m.role === 'assistant')
    .map((m, i) => {
      const userMsg = messages.filter(x => x.role === 'user')[i];
      const insightsHTML = m.insights?.length
        ? `<ul>${m.insights.map(ins => `<li>${ins}</li>`).join('')}</ul>` : '';
      const recsHTML = m.recommendations?.length
        ? `<ul>${m.recommendations.map(r => `<li><strong>[${(r.priority || '').toUpperCase()}]</strong> ${r.action}</li>`).join('')}</ul>` : '';
      const evidenceHTML = m.evidence?.length
        ? `<ul>${m.evidence.map(e => `<li>${e}</li>`).join('')}</ul>` : '';
      return `
        <div class="finding">
          ${userMsg ? `<div class="question">Q: ${userMsg.content}</div>` : ''}
          <div class="answer">${m.answer || ''}</div>
          ${insightsHTML ? `<div class="section-label">Key Insights</div>${insightsHTML}` : ''}
          ${evidenceHTML ? `<div class="section-label">Evidence</div>${evidenceHTML}` : ''}
          ${recsHTML ? `<div class="section-label">Recommendations</div>${recsHTML}` : ''}
          <div class="confidence">Confidence: ${m.confidence ?? '—'}%</div>
        </div>`;
    }).join('');

  return `<!DOCTYPE html><html lang="en"><head>
<meta charset="UTF-8">
<title>AI Analyst Report — ${tableName}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: Georgia, serif; background:#fafafa; color:#1a1a2e; }
  .page { max-width: 860px; margin:0 auto; padding:60px; background:#fff; min-height:100vh; }
  .header { border-bottom:3px solid #0d7d7d; padding-bottom:20px; margin-bottom:32px; }
  .header h1 { font-size:26px; color:#0d2137; margin-bottom:6px; }
  .meta { font-size:12px; color:#666; margin-top:8px; }
  .finding { border:1px solid #e0e0e0; border-radius:8px; padding:20px; margin-bottom:24px; }
  .question { font-size:13px; color:#0369a1; font-weight:600; margin-bottom:10px; background:#f0f9ff; padding:8px 12px; border-radius:6px; }
  .answer { font-size:14px; line-height:1.75; margin-bottom:12px; }
  .section-label { font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.08em; color:#0369a1; margin:12px 0 6px; }
  ul { padding-left:20px; }
  li { font-size:13px; line-height:1.7; margin-bottom:4px; }
  .confidence { margin-top:12px; font-size:11px; color:#888; border-top:1px solid #eee; padding-top:8px; }
  .footer { margin-top:48px; padding-top:16px; border-top:1px solid #e0e0e0; font-size:11px; color:#999; display:flex; justify-content:space-between; }
  @media print { body { background:#fff; } .page { padding:40px; } }
</style>
</head><body><div class="page">
  <div class="header">
    <h1>AI Analyst Report</h1>
    <div class="meta"><strong>Dataset:</strong> ${tableName} &nbsp;·&nbsp; <strong>Generated:</strong> ${today} &nbsp;·&nbsp; <strong>Findings:</strong> ${messages.filter(m => m.role === 'assistant').length}</div>
  </div>
  ${rows || '<p>No findings to export.</p>'}
  <div class="footer">
    <span>OmniData AI · AI Analyst Report · Confidential</span>
    <span>${today}</span>
  </div>
</div></body></html>`;
}

function buildCSV(messages) {
  const headers = ['Question', 'Answer', 'Confidence (%)', 'Insights', 'Recommendations', 'Limitations'];
  const escape = (v) => {
    const s = String(v ?? '').replace(/"/g, '""');
    return s.includes(',') || s.includes('\n') || s.includes('"') ? `"${s}"` : s;
  };
  const dataRows = messages
    .filter(m => m.role === 'assistant')
    .map((m, i) => {
      const userMsg = messages.filter(x => x.role === 'user')[i];
      return [
        escape(userMsg?.content || ''),
        escape(m.answer || ''),
        escape(m.confidence ?? ''),
        escape((m.insights || []).join(' | ')),
        escape((m.recommendations || []).map(r => `[${r.priority}] ${r.action}`).join(' | ')),
        escape((m.limitations || []).join(' | ')),
      ].join(',');
    });
  return [headers.join(','), ...dataRows].join('\n');
}

export default function AnalystExportButton({ messages, tableName }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState('');

  const hasFindings = messages.some(m => m.role === 'assistant' && m.answer);
  if (!hasFindings) return null;

  const exportPDF = async () => {
    setLoading('pdf');
    setOpen(false);
    const html = buildHTML(messages, tableName || 'Dataset');
    const win = window.open('', '_blank');
    win.document.write(html);
    win.document.close();
    setTimeout(() => { win.print(); setLoading(''); }, 600);
  };

  const exportCSV = () => {
    setLoading('csv');
    setOpen(false);
    const csv = buildCSV(messages);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analyst_findings_${(tableName || 'dataset').replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setLoading('');
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white/55 hover:text-white/85 hover:bg-white/10 transition-all"
      >
        {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
        Export
        <ChevronDown className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -4, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.97 }}
              transition={{ duration: 0.1 }}
              className="absolute right-0 top-full mt-1.5 z-50 w-48 rounded-xl border border-white/10 bg-navy-800 shadow-2xl overflow-hidden"
              style={{ background: 'hsl(222,44%,9%)' }}
            >
              <button
                onClick={exportPDF}
                className="w-full flex items-center gap-2.5 px-4 py-3 text-xs text-white/70 hover:text-white hover:bg-white/5 transition-colors"
              >
                <FileText className="w-3.5 h-3.5 text-blue-400" />
                <div className="text-left">
                  <div className="font-semibold">Export as PDF</div>
                  <div className="text-white/30 text-xs">Print-ready findings report</div>
                </div>
              </button>
              <div className="border-t border-white/6" />
              <button
                onClick={exportCSV}
                className="w-full flex items-center gap-2.5 px-4 py-3 text-xs text-white/70 hover:text-white hover:bg-white/5 transition-colors"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-teal-400" />
                <div className="text-left">
                  <div className="font-semibold">Export as CSV</div>
                  <div className="text-white/30 text-xs">Insights data for spreadsheets</div>
                </div>
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}