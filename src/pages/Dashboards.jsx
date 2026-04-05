import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWorkspaceStore } from '@/lib/store';
import { Link } from 'react-router-dom';
import AnalystChart from '@/components/workspace/analyst/AnalystChart';
import { exportToPDF, exportToExcel } from '@/lib/exportUtils';
import {
  LayoutDashboard, Trash2, Pencil, Check, X, Plus, Download,
  FileSpreadsheet, FileText, Sparkles, BarChart2, Database, BookOpen, Bell
} from 'lucide-react';

function DashboardCard({ item, onDelete, onRename }) {
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState(item.label || item.chart?.title || 'Untitled');

  const handleRename = () => {
    onRename(item.id, label);
    setEditing(false);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      className="rounded-2xl border border-white/8 bg-white/3 p-4 flex flex-col gap-3"
    >
      {/* Card header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          {editing ? (
            <div className="flex items-center gap-1.5">
              <input
                autoFocus
                value={label}
                onChange={e => setLabel(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleRename(); if (e.key === 'Escape') setEditing(false); }}
                className="flex-1 bg-white/8 border border-white/15 rounded-lg px-2 py-1 text-sm text-foreground focus:outline-none focus:border-cyan-400/40"
              />
              <button onClick={handleRename} className="text-cyan-400 hover:text-cyan-300"><Check className="w-3.5 h-3.5" /></button>
              <button onClick={() => setEditing(false)} className="text-white/40 hover:text-white/70"><X className="w-3.5 h-3.5" /></button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <BarChart2 className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
              <span className="text-sm font-semibold truncate">{label}</span>
            </div>
          )}
          <div className="text-xs text-white/30 mt-0.5 ml-5">
            {item.chart?.subtitle && <span className="mr-2">{item.chart.subtitle}</span>}
            {item.savedAt && <span>{new Date(item.savedAt).toLocaleDateString()}</span>}
            {item.datasetName && <span className="ml-1.5">· {item.datasetName}</span>}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setEditing(true)} className="p-1.5 rounded-lg text-white/30 hover:text-white/70 hover:bg-white/8 transition-all">
            <Pencil className="w-3 h-3" />
          </button>
          <button onClick={() => onDelete(item.id)} className="p-1.5 rounded-lg text-white/30 hover:text-red-400 hover:bg-red-400/10 transition-all">
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Chart */}
      <div className="flex-1">
        <AnalystChart chart={item.chart} height={200} />
      </div>

      {/* Insight snippet */}
      {item.insight && (
        <p className="text-xs text-white/35 leading-relaxed border-t border-white/6 pt-2 line-clamp-2">
          {item.insight}
        </p>
      )}
    </motion.div>
  );
}

export default function Dashboards() {
  const { savedCharts, removeSavedChart, renameSavedChart, chatMessages, analysisResults, getActiveTable } = useWorkspaceStore();
  const activeTable = getActiveTable();
  const [exportLoading, setExportLoading] = useState('');

  const handleExportPDF = () => {
    setExportLoading('pdf');
    setTimeout(() => {
      exportToPDF({
        messages: chatMessages,
        tableName: activeTable?.name,
        analysisResults,
        savedCharts,
      });
      setExportLoading('');
    }, 100);
  };

  const handleExportExcel = () => {
    setExportLoading('excel');
    setTimeout(() => {
      exportToExcel({
        messages: chatMessages,
        tableName: activeTable?.name,
        analysisResults,
      });
      setExportLoading('');
    }, 100);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-white/5 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-400/10 border border-cyan-400/20 flex items-center justify-center">
              <LayoutDashboard className="w-4 h-4 text-cyan-400" />
            </div>
            <div>
              <h1 className="text-lg font-bold">My Dashboards</h1>
              <p className="text-xs text-muted-foreground">{savedCharts.length} saved chart{savedCharts.length !== 1 ? 's' : ''}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Export buttons */}
            <button
              onClick={handleExportExcel}
              disabled={exportLoading === 'excel'}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-green-400/10 border border-green-400/20 text-green-400 hover:bg-green-400/15 transition-all disabled:opacity-50"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              {exportLoading === 'excel' ? 'Exporting…' : 'Export Excel'}
            </button>
            <button
              onClick={handleExportPDF}
              disabled={exportLoading === 'pdf'}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-blue-400/10 border border-blue-400/20 text-blue-400 hover:bg-blue-400/15 transition-all disabled:opacity-50"
            >
              <FileText className="w-3.5 h-3.5" />
              {exportLoading === 'pdf' ? 'Generating…' : 'Export PDF'}
            </button>
            <Link
              to="/story-builder"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-purple-400/10 border border-purple-400/20 text-purple-400 hover:bg-purple-400/15 transition-all"
            >
              <BookOpen className="w-3.5 h-3.5" />
              Story Builder
            </Link>
            <Link
              to="/alerts"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-amber-400/10 border border-amber-400/20 text-amber-400 hover:bg-amber-400/15 transition-all"
            >
              <Bell className="w-3.5 h-3.5" />
              Alerts
            </Link>
            <Link
              to="/workspace"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-cyan-400/10 border border-cyan-400/20 text-cyan-400 hover:bg-cyan-400/15 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Charts
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Export info bar */}
        {chatMessages.length > 0 && (
          <div className="mb-5 flex items-center gap-3 p-3 rounded-xl bg-purple-400/5 border border-purple-400/15 text-xs text-purple-300">
            <Sparkles className="w-3.5 h-3.5 flex-shrink-0" />
            <span>
              Your full AI analysis report ({chatMessages.filter(m=>m.role==='assistant').length} AI responses, {chatMessages.flatMap(m=>m.charts||[]).length} charts) is ready to export as PDF or Excel.
            </span>
            <div className="flex gap-1.5 ml-auto">
              <button onClick={handleExportPDF} className="px-2.5 py-1 rounded-lg bg-blue-400/15 text-blue-300 hover:bg-blue-400/25 transition-all">PDF</button>
              <button onClick={handleExportExcel} className="px-2.5 py-1 rounded-lg bg-green-400/15 text-green-300 hover:bg-green-400/25 transition-all">Excel</button>
            </div>
          </div>
        )}

        {/* Empty state */}
        {savedCharts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/8 flex items-center justify-center mx-auto mb-4">
              <LayoutDashboard className="w-7 h-7 text-white/25" />
            </div>
            <h2 className="text-lg font-semibold mb-2">No saved charts yet</h2>
            <p className="text-sm text-muted-foreground max-w-sm mb-6">
              Go to the AI Analyst in the Workspace, ask questions, and click{' '}
              <span className="text-cyan-400 font-medium">"Save to Dashboard"</span> on any chart to pin it here.
            </p>
            <Link
              to="/workspace"
              className="flex items-center gap-2 px-5 py-2.5 bg-cyan-400/10 border border-cyan-400/20 text-cyan-400 rounded-xl text-sm font-semibold hover:bg-cyan-400/15 transition-all"
            >
              <Sparkles className="w-4 h-4" /> Open AI Analyst
            </Link>
          </div>
        ) : (
          <>
            {/* Dataset group headers */}
            {(() => {
              const groups = {};
              savedCharts.forEach(item => {
                const key = item.datasetName || 'Unknown Dataset';
                if (!groups[key]) groups[key] = [];
                groups[key].push(item);
              });
              return Object.entries(groups).map(([datasetName, items]) => (
                <div key={datasetName} className="mb-8">
                  <div className="flex items-center gap-2 mb-3">
                    <Database className="w-3.5 h-3.5 text-cyan-400/60" />
                    <span className="text-xs text-white/40 uppercase tracking-widest">{datasetName}</span>
                    <span className="text-xs text-white/25">· {items.length} chart{items.length !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    <AnimatePresence>
                      {items.map(item => (
                        <DashboardCard
                          key={item.id}
                          item={item}
                          onDelete={removeSavedChart}
                          onRename={renameSavedChart}
                        />
                      ))}
                    </AnimatePresence>
                  </div>
                </div>
              ));
            })()}
          </>
        )}
      </div>
    </div>
  );
}