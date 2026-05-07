import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWorkspaceStore } from '@/lib/store';
import { Link } from 'react-router-dom';
import AnalystChart from '@/components/workspace/analyst/AnalystChart';
import { exportCSV, exportInsightsCSV } from '@/lib/exportUtils.js';
import {
  LayoutDashboard, Trash2, Pencil, Check, X, Plus, Download,
  FileSpreadsheet, FileText, Sparkles, BarChart2, Database,
  BookOpen, Bell, ArrowRight, Filter, Grid3X3, List, ExternalLink
} from 'lucide-react';

function DashboardCard({ item, onDelete, onRename, view }) {
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState(item.label || item.chart?.title || 'Untitled');

  const handleRename = () => { onRename(item.id, label); setEditing(false); };

  if (view === 'list') {
    return (
      <motion.div layout initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }}
        className="flex items-center gap-4 p-4 rounded-xl border border-white/8 bg-white/2 hover:bg-white/4 transition-all group">
        <div className="w-9 h-9 rounded-xl bg-cyan-400/10 flex items-center justify-center flex-shrink-0">
          <BarChart2 className="w-4 h-4 text-cyan-400" />
        </div>
        <div className="flex-1 min-w-0">
          {editing ? (
            <div className="flex items-center gap-1.5">
              <input autoFocus value={label} onChange={e => setLabel(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleRename(); if (e.key === 'Escape') setEditing(false); }}
                className="flex-1 bg-white/8 border border-white/15 rounded-lg px-2 py-1 text-sm focus:outline-none focus:border-cyan-400/40" />
              <button onClick={handleRename} className="text-cyan-400"><Check className="w-3.5 h-3.5" /></button>
              <button onClick={() => setEditing(false)} className="text-white/40"><X className="w-3.5 h-3.5" /></button>
            </div>
          ) : (
            <div className="font-semibold text-sm truncate">{label}</div>
          )}
          <div className="text-xs text-white/30 mt-0.5">
            {item.chart?.type} · {item.datasetName} · {item.savedAt && new Date(item.savedAt).toLocaleDateString()}
          </div>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => setEditing(true)} className="p-1.5 rounded-lg text-white/40 hover:text-white/80 hover:bg-white/8 transition-all"><Pencil className="w-3.5 h-3.5" /></button>
          <button onClick={() => onDelete(item.id)} className="p-1.5 rounded-lg text-white/40 hover:text-red-400 hover:bg-red-400/10 transition-all"><Trash2 className="w-3.5 h-3.5" /></button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div layout initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }}
      className="rounded-2xl border border-white/8 bg-white/3 p-4 flex flex-col gap-3 hover:border-white/15 transition-all group">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          {editing ? (
            <div className="flex items-center gap-1.5">
              <input autoFocus value={label} onChange={e => setLabel(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleRename(); if (e.key === 'Escape') setEditing(false); }}
                className="flex-1 bg-white/8 border border-white/15 rounded-lg px-2 py-1 text-sm text-foreground focus:outline-none focus:border-cyan-400/40" />
              <button onClick={handleRename} className="text-cyan-400 hover:text-cyan-300"><Check className="w-3.5 h-3.5" /></button>
              <button onClick={() => setEditing(false)} className="text-white/40 hover:text-white/70"><X className="w-3.5 h-3.5" /></button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <BarChart2 className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
              <span className="text-sm font-semibold truncate">{label}</span>
            </div>
          )}
          <div className="text-xs text-white/25 mt-0.5 ml-5 flex items-center gap-1.5 flex-wrap">
            {item.chart?.type && <span className="px-1.5 py-0.5 bg-white/5 rounded text-white/35">{item.chart.type}</span>}
            {item.datasetName && <span className="text-white/25">{item.datasetName}</span>}
            {item.savedAt && <span className="text-white/20">{new Date(item.savedAt).toLocaleDateString()}</span>}
          </div>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => setEditing(true)} className="p-1.5 rounded-lg text-white/30 hover:text-white/70 hover:bg-white/8 transition-all"><Pencil className="w-3 h-3" /></button>
          <button onClick={() => onDelete(item.id)} className="p-1.5 rounded-lg text-white/30 hover:text-red-400 hover:bg-red-400/10 transition-all"><Trash2 className="w-3 h-3" /></button>
        </div>
      </div>

      <div className="flex-1">
        <AnalystChart chart={item.chart} height={190} />
      </div>

      {item.insight && (
        <p className="text-xs text-white/30 leading-relaxed border-t border-white/6 pt-2.5 line-clamp-2 italic">{item.insight}</p>
      )}
    </motion.div>
  );
}

export default function Dashboards() {
  const { savedCharts, removeSavedChart, renameSavedChart, chatMessages, analysisResults, getActiveTable } = useWorkspaceStore();
  const activeTable = getActiveTable();
  const [exportLoading, setExportLoading] = useState('');
  const [view, setView] = useState('grid');
  const [filterDataset, setFilterDataset] = useState('all');

  const datasets = [...new Set(savedCharts.map(c => c.datasetName || 'Unknown'))];

  const filteredCharts = filterDataset === 'all'
    ? savedCharts
    : savedCharts.filter(c => (c.datasetName || 'Unknown') === filterDataset);

  const handleExportPDF = () => {
    setExportLoading('pdf');
    setTimeout(() => { exportInsightsCSV(analysisResults, activeTable?.name); setExportLoading(''); }, 100);
  };

  const handleExportExcel = () => {
    setExportLoading('excel');
    setTimeout(() => {
      const cols = activeTable?.columns?.map(c => c.name) || [];
      exportCSV(activeTable?.rows?.slice(0, 5000) || [], cols, activeTable?.name || 'dashboard');
      setExportLoading('');
    }, 100);
  };

  const groupedCharts = (() => {
    const groups = {};
    filteredCharts.forEach(item => {
      const key = item.datasetName || 'Unknown Dataset';
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
    });
    return groups;
  })();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-white/5 px-6 py-4 sticky top-0 z-10 bg-background/95 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-400/10 border border-cyan-400/20 flex items-center justify-center">
              <LayoutDashboard className="w-4 h-4 text-cyan-400" />
            </div>
            <div>
              <h1 className="text-lg font-bold">My Dashboards</h1>
              <p className="text-xs text-muted-foreground">{savedCharts.length} saved chart{savedCharts.length !== 1 ? 's' : ''} across {datasets.length} dataset{datasets.length !== 1 ? 's' : ''}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* View toggle */}
            <div className="flex items-center bg-white/5 border border-white/8 rounded-lg p-0.5">
              <button onClick={() => setView('grid')} className={`p-1.5 rounded transition-all ${view === 'grid' ? 'bg-white/10 text-white' : 'text-white/35 hover:text-white/70'}`}><Grid3X3 className="w-3.5 h-3.5" /></button>
              <button onClick={() => setView('list')} className={`p-1.5 rounded transition-all ${view === 'list' ? 'bg-white/10 text-white' : 'text-white/35 hover:text-white/70'}`}><List className="w-3.5 h-3.5" /></button>
            </div>

            {/* Dataset filter */}
            {datasets.length > 1 && (
              <select value={filterDataset} onChange={e => setFilterDataset(e.target.value)}
                className="px-3 py-1.5 bg-white/5 border border-white/8 rounded-lg text-xs text-muted-foreground focus:outline-none focus:border-cyan-400/30">
                <option value="all">All datasets</option>
                {datasets.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            )}

            <button onClick={handleExportExcel} disabled={exportLoading === 'excel'}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-green-400/10 border border-green-400/20 text-green-400 hover:bg-green-400/15 transition-all disabled:opacity-50">
              <FileSpreadsheet className="w-3.5 h-3.5" />{exportLoading === 'excel' ? 'Exporting…' : 'Excel'}
            </button>
            <button onClick={handleExportPDF} disabled={exportLoading === 'pdf'}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-blue-400/10 border border-blue-400/20 text-blue-400 hover:bg-blue-400/15 transition-all disabled:opacity-50">
              <FileText className="w-3.5 h-3.5" />{exportLoading === 'pdf' ? 'Generating…' : 'PDF'}
            </button>
            <Link to="/story-builder" className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-purple-400/10 border border-purple-400/20 text-purple-400 hover:bg-purple-400/15 transition-all">
              <BookOpen className="w-3.5 h-3.5" /> Story Builder
            </Link>
            <Link to="/alerts" className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-amber-400/10 border border-amber-400/20 text-amber-400 hover:bg-amber-400/15 transition-all">
              <Bell className="w-3.5 h-3.5" /> Alerts
            </Link>
            <Link to="/workspace" className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-cyan-400 font-bold hover:bg-cyan-300 transition-all"
              style={{ color: 'hsl(222,47%,6%)' }}>
              <Plus className="w-3.5 h-3.5" /> Add Charts
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* AI report export banner */}
        {chatMessages.length > 0 && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
            className="mb-5 flex items-center gap-3 p-3.5 rounded-xl bg-purple-400/5 border border-purple-400/15 text-xs text-purple-300">
            <Sparkles className="w-4 h-4 flex-shrink-0 text-purple-400" />
            <span className="flex-1">Your full AI Analyst session — {chatMessages.filter(m => m.role === 'assistant').length} AI responses with {chatMessages.flatMap(m => m.charts || []).length} charts — is ready to export.</span>
            <div className="flex gap-1.5">
              <button onClick={handleExportPDF} className="px-2.5 py-1 rounded-lg bg-blue-400/15 text-blue-300 hover:bg-blue-400/25 transition-all font-medium">PDF</button>
              <button onClick={handleExportExcel} className="px-2.5 py-1 rounded-lg bg-green-400/15 text-green-300 hover:bg-green-400/25 transition-all font-medium">Excel</button>
            </div>
          </motion.div>
        )}

        {/* Empty state */}
        {savedCharts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-28 text-center">
            <div className="w-20 h-20 rounded-3xl bg-white/3 border border-white/8 flex items-center justify-center mx-auto mb-5">
              <LayoutDashboard className="w-9 h-9 text-white/15" />
            </div>
            <h2 className="text-xl font-bold mb-2">No saved charts yet</h2>
            <p className="text-sm text-muted-foreground max-w-sm mb-8 leading-relaxed">
              Open the AI Analyst in the Workspace, ask questions about your data, and click <span className="text-cyan-400 font-medium">"Save to Dashboard"</span> on any chart to pin it here.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 items-center">
              <Link to="/workspace" className="flex items-center gap-2 px-6 py-3 bg-cyan-400 rounded-xl text-sm font-bold hover:bg-cyan-300 transition-all"
                style={{ color: 'hsl(222,47%,6%)' }}>
                <Sparkles className="w-4 h-4" /> Open AI Analyst
              </Link>
              <Link to="/workspace" className="flex items-center gap-2 px-6 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-muted-foreground hover:text-foreground hover:bg-white/8 transition-all">
                <BarChart2 className="w-4 h-4" /> View Story Dashboard
              </Link>
            </div>

            {/* Feature hints */}
            <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl text-left">
              {[
                { icon: Sparkles, color: 'text-purple-400', bg: 'bg-purple-400/10', title: 'Ask AI Analyst', desc: 'Ask any question in plain English and get data-grounded chart answers.' },
                { icon: Download, color: 'text-blue-400', bg: 'bg-blue-400/10', title: 'Export Everything', desc: 'Export your full AI analysis session as a PDF or Excel workbook.' },
                { icon: BookOpen, color: 'text-teal-400', bg: 'bg-teal-400/10', title: 'Build Stories', desc: 'Drag saved charts into Story Builder and create executive presentations.' },
              ].map((f, i) => (
                <div key={i} className="glass-card rounded-xl p-4 border border-white/5">
                  <div className={`w-8 h-8 rounded-xl ${f.bg} flex items-center justify-center mb-3`}>
                    <f.icon className={`w-4 h-4 ${f.color}`} />
                  </div>
                  <div className="font-semibold text-sm mb-1">{f.title}</div>
                  <div className="text-xs text-muted-foreground leading-relaxed">{f.desc}</div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          Object.entries(groupedCharts).map(([datasetName, items]) => (
            <div key={datasetName} className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <Database className="w-3.5 h-3.5 text-cyan-400/60" />
                <span className="text-xs text-white/50 uppercase tracking-widest font-semibold">{datasetName}</span>
                <span className="text-xs text-white/25">· {items.length} chart{items.length !== 1 ? 's' : ''}</span>
              </div>
              {view === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  <AnimatePresence>
                    {items.map(item => (
                      <DashboardCard key={item.id} item={item} view="grid" onDelete={removeSavedChart} onRename={renameSavedChart} />
                    ))}
                  </AnimatePresence>
                </div>
              ) : (
                <div className="space-y-2">
                  <AnimatePresence>
                    {items.map(item => (
                      <DashboardCard key={item.id} item={item} view="list" onDelete={removeSavedChart} onRename={renameSavedChart} />
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}