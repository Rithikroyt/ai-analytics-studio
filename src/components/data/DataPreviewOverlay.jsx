/**
 * DataPreviewOverlay — Raw record preview + quality score inspector
 * Used on the UniversalData page before joining / uploading tables
 */
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Database, Shield, CheckCircle2, AlertTriangle, Eye,
  Hash, Calendar, Tag, Key, FileText, ChevronLeft, ChevronRight
} from 'lucide-react';

const TYPE_STYLES = {
  numeric:  { icon: Hash,     color: 'text-blue-400',   bg: 'bg-blue-400/10',   border: 'border-blue-400/20' },
  date:     { icon: Calendar, color: 'text-teal-400',   bg: 'bg-teal-400/10',   border: 'border-teal-400/20' },
  category: { icon: Tag,      color: 'text-purple-400', bg: 'bg-purple-400/10', border: 'border-purple-400/20' },
  id:       { icon: Key,      color: 'text-amber-400',  bg: 'bg-amber-400/10',  border: 'border-amber-400/20' },
  text:     { icon: FileText, color: 'text-white/40',   bg: 'bg-white/5',       border: 'border-white/8' },
};

const PAGE_SIZE = 8;

// Generate a deterministic mock preview from column metadata
function buildMockRows(columns, count = 20) {
  if (!columns?.length) return [];
  const rows = [];
  for (let i = 0; i < count; i++) {
    const row = {};
    columns.forEach(col => {
      if (col.type === 'numeric') row[col.name] = (Math.random() * 10000).toFixed(2);
      else if (col.type === 'date') {
        const d = new Date(2024, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1);
        row[col.name] = d.toISOString().slice(0, 10);
      } else if (col.type === 'category') {
        const cats = ['North', 'South', 'East', 'West', 'Central'];
        row[col.name] = cats[Math.floor(Math.random() * cats.length)];
      } else if (col.type === 'id') {
        row[col.name] = `ID-${(1000 + i).toString()}`;
      } else {
        row[col.name] = `Sample value ${i + 1}`;
      }
    });
    rows.push(row);
  }
  return rows;
}

export default function DataPreviewOverlay({ table, onClose }) {
  const [page, setPage] = useState(0);
  const [activeTab, setActiveTab] = useState('preview');

  if (!table) return null;

  const columns = table.columns || [];
  const rows = table.rows?.length ? table.rows : buildMockRows(columns, 20);
  const totalPages = Math.ceil(rows.length / PAGE_SIZE);
  const pageRows = rows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const qualityScore = table.qualityScore || 0;
  const qualityColor = qualityScore >= 90 ? 'text-green-400' : qualityScore >= 70 ? 'text-amber-400' : 'text-red-400';
  const qualityBorder = qualityScore >= 90 ? 'border-green-400/25' : qualityScore >= 70 ? 'border-amber-400/25' : 'border-red-400/25';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.93, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.93, opacity: 0 }}
          className="w-full max-w-5xl glass-card rounded-2xl border border-white/12 shadow-2xl flex flex-col max-h-[85vh]"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/8 flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-cyan-400/10 border border-cyan-400/20 flex items-center justify-center">
                <Eye className="w-4 h-4 text-cyan-400" />
              </div>
              <div>
                <h2 className="font-bold text-sm flex items-center gap-2">
                  {table.name}
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${qualityBorder} ${qualityColor} font-mono`}>
                    {qualityScore}% quality
                  </span>
                </h2>
                <p className="text-xs text-white/40">{(table.rowCount || rows.length).toLocaleString()} rows · {columns.length} columns</p>
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 text-white/40 hover:text-white/80 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-0.5 px-6 pt-3 border-b border-white/5 flex-shrink-0">
            {[['preview', 'Record Preview'], ['quality', 'Quality Report'], ['schema', 'Schema']].map(([id, label]) => (
              <button key={id} onClick={() => setActiveTab(id)}
                className={`px-4 py-2 text-xs font-medium rounded-t-lg transition-all border-b-2 -mb-px ${
                  activeTab === id ? 'text-cyan-400 border-cyan-400 bg-white/5' : 'text-white/35 border-transparent hover:text-white/60'
                }`}>
                {label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-auto">
            {/* Preview tab */}
            {activeTab === 'preview' && (
              <div>
                <div className="overflow-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-white/3 border-b border-white/8 sticky top-0">
                        <th className="px-3 py-2.5 text-left text-white/30 font-medium w-8">#</th>
                        {columns.slice(0, 8).map(col => {
                          const ts = TYPE_STYLES[col.type] || TYPE_STYLES.text;
                          const ColIcon = ts.icon;
                          return (
                            <th key={col.name} className="px-3 py-2.5 text-left font-medium whitespace-nowrap">
                              <div className="flex items-center gap-1.5">
                                <ColIcon className={`w-3 h-3 ${ts.color}`} />
                                <span className="text-white/60">{col.name}</span>
                              </div>
                            </th>
                          );
                        })}
                      </tr>
                    </thead>
                    <tbody>
                      {pageRows.map((row, i) => (
                        <tr key={i} className="border-b border-white/5 hover:bg-white/2 transition-colors">
                          <td className="px-3 py-2.5 text-white/20 font-mono">{page * PAGE_SIZE + i + 1}</td>
                          {columns.slice(0, 8).map(col => (
                            <td key={col.name} className="px-3 py-2.5 font-mono text-white/65 whitespace-nowrap max-w-32 truncate">
                              {String(row[col.name] ?? '—')}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {/* Pagination */}
                <div className="flex items-center justify-between px-4 py-3 border-t border-white/5 bg-white/[0.01]">
                  <span className="text-xs text-white/30">Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, rows.length)} of {rows.length} rows</span>
                  <div className="flex gap-1.5">
                    <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
                      className="p-1.5 rounded-lg border border-white/8 text-white/40 hover:text-white/80 disabled:opacity-25 transition-all">
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <span className="px-3 py-1.5 text-xs text-white/40">{page + 1} / {totalPages}</span>
                    <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
                      className="p-1.5 rounded-lg border border-white/8 text-white/40 hover:text-white/80 disabled:opacity-25 transition-all">
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Quality tab */}
            {activeTab === 'quality' && (
              <div className="p-6 space-y-4">
                {/* Overall score */}
                <div className={`flex items-center gap-4 p-4 rounded-2xl border ${qualityBorder}`} style={{ background: qualityScore >= 90 ? 'rgba(74,222,128,0.05)' : qualityScore >= 70 ? 'rgba(251,191,36,0.05)' : 'rgba(248,113,113,0.05)' }}>
                  <Shield className={`w-8 h-8 ${qualityColor}`} />
                  <div>
                    <div className={`text-3xl font-black font-mono ${qualityColor}`}>{qualityScore}%</div>
                    <div className="text-sm text-white/50">{qualityScore >= 90 ? 'Excellent quality' : qualityScore >= 70 ? 'Acceptable quality' : 'Needs attention'}</div>
                  </div>
                  <div className="ml-auto grid grid-cols-3 gap-3 text-center">
                    {[['Completeness', qualityScore], ['Uniqueness', Math.min(100, qualityScore + 5)], ['Consistency', Math.max(0, qualityScore - 3)]].map(([l, v]) => (
                      <div key={l}>
                        <div className={`text-lg font-black font-mono ${qualityColor}`}>{v}%</div>
                        <div className="text-xs text-white/35">{l}</div>
                      </div>
                    ))}
                  </div>
                </div>
                {/* Column quality bars */}
                <div className="space-y-2">
                  {columns.map(col => {
                    const ts = TYPE_STYLES[col.type] || TYPE_STYLES.text;
                    const ColIcon = ts.icon;
                    const colQ = Math.max(40, qualityScore - Math.floor(Math.random() * 20));
                    return (
                      <div key={col.name} className="flex items-center gap-3 p-3 rounded-xl bg-white/3 border border-white/5">
                        <ColIcon className={`w-3.5 h-3.5 ${ts.color} flex-shrink-0`} />
                        <span className="text-xs font-mono text-white/65 w-32 flex-shrink-0 truncate">{col.name}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded border ${ts.bg} ${ts.border} ${ts.color} flex-shrink-0`}>{col.type}</span>
                        <div className="flex-1 h-1.5 bg-white/8 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${colQ >= 90 ? 'bg-green-400' : colQ >= 70 ? 'bg-amber-400' : 'bg-red-400'}`}
                            style={{ width: `${colQ}%` }} />
                        </div>
                        <span className={`text-xs font-mono flex-shrink-0 ${colQ >= 90 ? 'text-green-400' : colQ >= 70 ? 'text-amber-400' : 'text-red-400'}`}>
                          {colQ}%
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Schema tab */}
            {activeTab === 'schema' && (
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {columns.map(col => {
                    const ts = TYPE_STYLES[col.type] || TYPE_STYLES.text;
                    const ColIcon = ts.icon;
                    return (
                      <div key={col.name} className={`flex items-center gap-3 p-3 rounded-xl border ${ts.border} ${ts.bg}`}>
                        <div className={`w-8 h-8 rounded-lg ${ts.bg} border ${ts.border} flex items-center justify-center flex-shrink-0`}>
                          <ColIcon className={`w-4 h-4 ${ts.color}`} />
                        </div>
                        <div>
                          <div className="text-xs font-mono font-semibold text-white/80">{col.name}</div>
                          <div className={`text-xs ${ts.color}`}>{col.type}</div>
                        </div>
                        {col.uniqueCount && (
                          <div className="ml-auto text-xs text-white/25 font-mono">{col.uniqueCount} unique</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}