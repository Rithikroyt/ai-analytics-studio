/**
 * ExportMenu — Universal export dropdown for PDF & CSV
 */
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, FileText, Table, ChevronDown, Loader2, CheckCircle2 } from 'lucide-react';
import { exportCSV, exportInsightsCSV, exportReportPDF, exportPredictivePDF } from '@/lib/exportUtils.js';

export default function ExportMenu({ mode = 'report', report, analysisResults, table, narrative, scenarios, trendData }) {
  const [open, setOpen] = useState(false);
  const [exporting, setExporting] = useState('');
  const [done, setDone] = useState('');

  const run = async (type) => {
    setExporting(type);
    setOpen(false);
    await new Promise(r => setTimeout(r, 100));
    try {
      if (type === 'pdf_report') exportReportPDF(report, analysisResults, table);
      else if (type === 'pdf_predictive') exportPredictivePDF(analysisResults, table, narrative, scenarios);
      else if (type === 'csv_data') {
        const cols = table?.columns?.map(c => c.name) || [];
        exportCSV(table?.rows?.slice(0, 5000) || [], cols, table?.name || 'data');
      }
      else if (type === 'csv_insights') exportInsightsCSV(analysisResults, table?.name);
      else if (type === 'csv_trend') exportCSV(trendData || [], ['date', 'value'], 'trend_data');
      setDone(type);
      setTimeout(() => setDone(''), 2500);
    } catch (e) {
      console.error('Export failed:', e);
    }
    setExporting('');
  };

  const options = mode === 'report' ? [
    { id: 'pdf_report', icon: FileText, label: 'Export PDF Report', sub: 'Professional formatted document', color: 'text-purple-400' },
    { id: 'csv_data', icon: Table, label: 'Export Data CSV', sub: 'Raw dataset rows', color: 'text-teal-400' },
    { id: 'csv_insights', icon: Table, label: 'Export Insights CSV', sub: 'KPIs, segments & recommendations', color: 'text-cyan-400' },
  ] : [
    { id: 'pdf_predictive', icon: FileText, label: 'Export Dashboard PDF', sub: 'Forecast, scenarios & anomalies', color: 'text-purple-400' },
    { id: 'csv_trend', icon: Table, label: 'Export Trend CSV', sub: 'Historical trend data points', color: 'text-teal-400' },
    { id: 'csv_insights', icon: Table, label: 'Export Insights CSV', sub: 'KPIs, segments & recommendations', color: 'text-cyan-400' },
  ];

  return (
    <div className="relative">
      <button onClick={() => setOpen(v => !v)} disabled={!!exporting}
        className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition-all disabled:opacity-50 ${done ? 'bg-green-400/10 border-green-400/25 text-green-400' : 'bg-white/5 border-white/10 text-white/50 hover:text-white/80 hover:border-white/20'}`}>
        {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : done ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Download className="w-3.5 h-3.5" />}
        {exporting ? 'Exporting…' : done ? 'Done!' : 'Export'}
        {!exporting && !done && <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />}
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: 6, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 6 }}
              className="absolute right-0 top-10 z-40 w-64 rounded-2xl border border-white/10 shadow-xl py-1.5 overflow-hidden"
              style={{ background: 'hsl(222,44%,9%)' }}>
              {options.map(opt => (
                <button key={opt.id} onClick={() => run(opt.id)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-left">
                  <opt.icon className={`w-4 h-4 flex-shrink-0 ${opt.color}`} />
                  <div>
                    <div className="text-sm font-medium text-white/80">{opt.label}</div>
                    <div className="text-xs text-white/30">{opt.sub}</div>
                  </div>
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}