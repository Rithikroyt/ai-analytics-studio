import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWorkspaceStore } from '@/lib/store';
import { Link } from 'react-router-dom';
import AnalystChart from '@/components/workspace/analyst/AnalystChart';
import ChartSummaryDropdown from '@/components/charts/ChartSummaryDropdown';
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

      <ChartSummaryDropdown
        title={label}
        chartType={item.chart?.type}
        data={item.chart?.data || []}
        xKey={item.chart?.x_key || 'name'}
        yKey={item.chart?.y_key || 'value'}
        description={item.insight || ''}
      />

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
    setTimeout(() => {
      // Build branded HTML PDF with KPI header
      const r = analysisResults;
      const fmtV = v => { if (!v) return '—'; const n = Number(v); if (n >= 1e6) return `${(n/1e6).toFixed(1)}M`; if (n >= 1e3) return `${(n/1e3).toFixed(0)}K`; return n.toLocaleString(); };
      const kpiHeader = r ? `
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin:20px 0;">
          <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;padding:14px;text-align:center;">
            <div style="font-size:11px;color:#0369a1;text-transform:uppercase;letter-spacing:.06em">${r.primaryLabel || 'Primary KPI'}</div>
            <div style="font-size:24px;font-weight:900;color:#0d2137;font-family:monospace">${fmtV(r.totalValue)}</div>
            ${r.growthRate != null ? `<div style="font-size:12px;color:${r.growthRate>=0?'#16a34a':'#dc2626'}">${r.growthRate>=0?'▲':'▼'} ${Math.abs(r.growthRate)}%</div>` : ''}
          </div>
          <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:14px;text-align:center;">
            <div style="font-size:11px;color:#15803d;text-transform:uppercase;letter-spacing:.06em">Records</div>
            <div style="font-size:24px;font-weight:900;color:#0d2137;font-family:monospace">${(activeTable?.rowCount||0).toLocaleString()}</div>
            <div style="font-size:11px;color:#15803d">${activeTable?.columns?.length||0} columns</div>
          </div>
          <div style="background:#fefce8;border:1px solid #fef08a;border-radius:8px;padding:14px;text-align:center;">
            <div style="font-size:11px;color:#a16207;text-transform:uppercase;letter-spacing:.06em">Anomalies</div>
            <div style="font-size:24px;font-weight:900;color:#0d2137;font-family:monospace">${r.anomalies?.length||0}</div>
            <div style="font-size:11px;color:#a16207">Quality: ${activeTable?.qualityScore||'—'}%</div>
          </div>
        </div>
        <div style="margin:16px 0;padding:12px 16px;background:#f8fafc;border-left:4px solid #0ea5e9;border-radius:4px;font-size:13px;color:#334155;line-height:1.6">
          ${r.executiveSummary || r.keyFindings?.[0] || 'AI analysis complete.'}
        </div>` : '';
      const chartsHTML = savedCharts.slice(0, 12).map(c => `
        <div style="break-inside:avoid;margin-bottom:20px;padding:16px;border:1px solid #e2e8f0;border-radius:8px;">
          <div style="font-weight:700;font-size:14px;color:#0d2137;margin-bottom:4px">${c.label || c.chart?.title || 'Chart'}</div>
          <div style="font-size:11px;color:#64748b">${c.datasetName || ''} · ${c.chart?.type || ''}</div>
          ${c.insight ? `<div style="margin-top:8px;font-size:12px;color:#475569;font-style:italic">${c.insight}</div>` : ''}
        </div>`).join('');
      const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
        <title>Dashboard Export — ${activeTable?.name || 'Analytics'}</title>
        <style>*{margin:0;padding:0;box-sizing:border-box;}body{font-family:'Segoe UI',sans-serif;color:#1e293b;background:#fff;}
        .page{max-width:900px;margin:0 auto;padding:40px 50px;}
        .header{border-bottom:3px solid #0ea5e9;padding-bottom:16px;margin-bottom:20px;display:flex;justify-content:space-between;align-items:flex-end;}
        .brand{font-size:22px;font-weight:900;color:#0d2137;}
        .brand span{color:#0ea5e9;}
        .meta{font-size:11px;color:#94a3b8;text-align:right;}
        h2{font-size:15px;color:#0d2137;margin:24px 0 10px;border-bottom:1px solid #e2e8f0;padding-bottom:6px;}
        @media print{body{background:#fff;}.page{padding:30px;}}</style>
      </head><body><div class="page">
        <div class="header">
          <div><div class="brand">OmniData <span>AI Analytics</span></div><div style="font-size:12px;color:#64748b;margin-top:3px">Executive Dashboard Export</div></div>
          <div class="meta">
            <div>${activeTable?.name || 'Dataset'}</div>
            <div>${new Date().toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'})}</div>
          </div>
        </div>
        ${kpiHeader}
        <h2>Saved Charts (${savedCharts.length})</h2>
        ${chartsHTML}
        <div style="margin-top:40px;padding-top:12px;border-top:1px solid #e2e8f0;font-size:10px;color:#94a3b8;display:flex;justify-content:space-between;">
          <span>OmniData AI Analytics Studio · Confidential</span>
          <span>Generated ${new Date().toLocaleDateString()}</span>
        </div>
      </div></body></html>`;
      const win = window.open('', '_blank');
      win.document.write(html);
      win.document.close();
      setTimeout(() => win.print(), 500);
      setExportLoading('');
    }, 100);
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
              <FileText className="w-3.5 h-3.5" />{exportLoading === 'pdf' ? 'Generating…' : 'Branded PDF'}
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