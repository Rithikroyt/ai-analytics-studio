/**
 * UnifiedExportButton — Download current data as Excel, PDF, or CSV
 * Drop-in button for Reports and Workbench pages
 */
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, FileSpreadsheet, FileText, File, Loader2, CheckCircle2 } from 'lucide-react';
import { useWorkspaceStore } from '@/lib/store';

function exportCSV(rows, columns, fileName) {
  if (!rows?.length || !columns?.length) return;
  const header = columns.map(c => (typeof c === 'string' ? c : c.name)).join(',');
  const body = rows.map(row =>
    columns.map(c => {
      const key = typeof c === 'string' ? c : c.name;
      const val = String(row[key] ?? '');
      return val.includes(',') || val.includes('"') ? `"${val.replace(/"/g, '""')}"` : val;
    }).join(',')
  ).join('\n');
  const blob = new Blob([header + '\n' + body], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `${fileName}_${new Date().toISOString().slice(0, 10)}.csv`; a.click();
  URL.revokeObjectURL(url);
}

function exportExcel(rows, columns, fileName) {
  // Build TSV as Excel-compatible download
  if (!rows?.length || !columns?.length) return;
  const header = columns.map(c => typeof c === 'string' ? c : c.name).join('\t');
  const body = rows.map(row =>
    columns.map(c => {
      const key = typeof c === 'string' ? c : c.name;
      return String(row[key] ?? '');
    }).join('\t')
  ).join('\n');
  const blob = new Blob([header + '\n' + body], { type: 'application/vnd.ms-excel' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `${fileName}_${new Date().toISOString().slice(0, 10)}.xls`; a.click();
  URL.revokeObjectURL(url);
}

function exportPDF(rows, columns, fileName, analysisResults) {
  const cols = columns.slice(0, 8);
  const colNames = cols.map(c => typeof c === 'string' ? c : c.name);
  const tableRows = (rows || []).slice(0, 100).map(row =>
    `<tr>${colNames.map(k => `<td>${String(row[k] ?? '—').slice(0, 50)}</td>`).join('')}</tr>`
  ).join('');
  const r = analysisResults;
  const html = `<!DOCTYPE html><html><head><title>${fileName}</title>
  <style>
    body { font-family: 'Helvetica', sans-serif; max-width: 950px; margin: 40px auto; padding: 0 40px; color: #1a1a2e; }
    .header { border-bottom: 3px solid #00c9c9; padding-bottom: 16px; margin-bottom: 24px; }
    h1 { font-size: 24px; color: #0d2137; margin: 0 0 4px; }
    .meta { font-size: 12px; color: #666; }
    .kpis { display: flex; gap: 16px; margin: 20px 0; }
    .kpi { background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 12px 16px; flex: 1; }
    .kpi-val { font-size: 20px; font-weight: 900; color: #0369a1; font-family: monospace; }
    .kpi-lbl { font-size: 11px; color: #0369a1; text-transform: uppercase; letter-spacing: 0.05em; margin-top: 2px; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 16px; }
    th { background: #f0f9ff; padding: 8px 10px; text-align: left; font-weight: 600; color: #0369a1; border: 1px solid #e0e0e0; }
    td { padding: 7px 10px; border: 1px solid #e0e0e0; color: #334155; }
    tr:nth-child(even) { background: #fafafa; }
    .footer { margin-top: 40px; font-size: 10px; color: #999; border-top: 1px solid #e0e0e0; padding-top: 12px; }
    @media print { body { margin: 0; } }
  </style></head><body>
  <div class="header">
    <h1>${fileName} — Data Export</h1>
    <div class="meta">Generated ${new Date().toLocaleString()} · ${rows?.length?.toLocaleString() || 0} rows · ${columns?.length} columns</div>
  </div>
  ${r ? `<div class="kpis">
    <div class="kpi"><div class="kpi-val">${r.totalValue?.toLocaleString() || '—'}</div><div class="kpi-lbl">${r.primaryLabel || 'Primary KPI'}</div></div>
    <div class="kpi"><div class="kpi-val">${r.growthRate != null ? (r.growthRate > 0 ? '+' : '') + r.growthRate + '%' : '—'}</div><div class="kpi-lbl">Growth Rate</div></div>
    <div class="kpi"><div class="kpi-val">${r.anomalies?.length || 0}</div><div class="kpi-lbl">Anomalies</div></div>
  </div>` : ''}
  <table>
    <thead><tr>${colNames.map(c => `<th>${c}</th>`).join('')}</tr></thead>
    <tbody>${tableRows}</tbody>
  </table>
  ${rows?.length > 100 ? `<p style="font-size:11px;color:#999;margin-top:8px;">Showing first 100 of ${rows.length.toLocaleString()} rows.</p>` : ''}
  <div class="footer">OmniData AI Analytics Studio · ${fileName} · Confidential</div>
  </body></html>`;
  const win = window.open('', '_blank');
  win.document.write(html);
  win.document.close();
  setTimeout(() => win.print(), 500);
}

export default function UnifiedExportButton({ rows: propRows, columns: propCols, fileName: propFileName, className = '' }) {
  const { getActiveTable, analysisResults } = useWorkspaceStore();
  const table = getActiveTable();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState('');
  const [done, setDone] = useState('');
  const ref = useRef(null);

  const rows = propRows || table?.rows || [];
  const columns = propCols || table?.columns || [];
  const fileName = propFileName || table?.name || 'export';

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleExport = async (type) => {
    setLoading(type);
    setOpen(false);
    await new Promise(r => setTimeout(r, 100));
    if (type === 'csv') exportCSV(rows, columns, fileName);
    else if (type === 'excel') exportExcel(rows, columns, fileName);
    else if (type === 'pdf') exportPDF(rows, columns, fileName, analysisResults);
    setLoading('');
    setDone(type);
    setTimeout(() => setDone(''), 2500);
  };

  const OPTIONS = [
    { id: 'csv',   label: 'Professional CSV',   sub: 'Clean, UTF-8 encoded',      icon: File,          color: 'text-teal-400',  bg: 'bg-teal-400/10',  border: 'border-teal-400/20' },
    { id: 'excel', label: 'Excel Workbook',      sub: 'XLS format, all columns',   icon: FileSpreadsheet, color: 'text-green-400', bg: 'bg-green-400/10', border: 'border-green-400/20' },
    { id: 'pdf',   label: 'PDF Report',          sub: 'Formatted, print-ready',    icon: FileText,      color: 'text-blue-400',  bg: 'bg-blue-400/10',  border: 'border-blue-400/20' },
  ];

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        onClick={() => setOpen(v => !v)}
        disabled={!!loading}
        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold transition-all disabled:opacity-50 ${
          done ? 'bg-green-400/10 border-green-400/20 text-green-400' : 'bg-white/5 border-white/10 text-white/60 hover:text-white/90 hover:bg-white/8'
        }`}
      >
        {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> :
         done    ? <CheckCircle2 className="w-3.5 h-3.5" /> :
                   <Download className="w-3.5 h-3.5" />}
        {loading ? 'Exporting…' : done ? 'Exported!' : 'Export'}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 6 }}
            className="absolute right-0 top-full mt-1.5 z-50 w-56 glass-card rounded-xl border border-white/12 shadow-2xl overflow-hidden"
          >
            <div className="px-3 py-2 border-b border-white/5 text-xs text-white/30 uppercase tracking-widest">
              Download as
            </div>
            {OPTIONS.map(opt => {
              const Icon = opt.icon;
              return (
                <button key={opt.id} onClick={() => handleExport(opt.id)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-white/5 transition-all text-left">
                  <div className={`w-7 h-7 rounded-lg ${opt.bg} border ${opt.border} flex items-center justify-center flex-shrink-0`}>
                    <Icon className={`w-3.5 h-3.5 ${opt.color}`} />
                  </div>
                  <div>
                    <div className={`text-xs font-semibold ${opt.color}`}>{opt.label}</div>
                    <div className="text-xs text-white/25">{opt.sub}</div>
                  </div>
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}