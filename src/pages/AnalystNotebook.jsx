import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useWorkspaceStore } from '@/lib/store';
import {
  FileText, Plus, Trash2, Play, Loader2, ChevronLeft,
  Code2, BarChart2, Type, Brain, Terminal, X
} from 'lucide-react';
import { Link } from 'react-router-dom';

const CELL_ICONS = {
  sql: Code2,
  python: Terminal,
  chart: BarChart2,
  markdown: Type,
  ai_insight: Brain,
};

export default function AnalystNotebook() {
  const [notebookId] = useState(Date.now().toString());
  const [cells, setCells] = useState([]);
  const [executing, setExecuting] = useState('');

  const handleAddCell = (type) => {
    setCells(c => [...c, {
      id: Date.now().toString(),
      cellType: type,
      content: '',
      output: null,
      status: 'idle',
    }]);
  };

  const handleExecuteCell = async (cell) => {
    setExecuting(cell.id);
    try {
      const result = await base44.functions.invoke('executeNotebookCell', {
        cellType: cell.cellType,
        content: cell.content,
      });
      setCells(c => c.map(cl => cl.id === cell.id ? { ...cl, ...result.data } : cl));
    } catch (e) {
      setCells(c => c.map(cl => cl.id === cell.id ? { ...cl, status: 'error', errorMessage: e.message } : cl));
    }
    setExecuting('');
  };

  const handleDeleteCell = (id) => {
    setCells(c => c.filter(cl => cl.id !== id));
  };

  const handleUpdateCell = (id, content) => {
    setCells(c => c.map(cl => cl.id === id ? { ...cl, content } : cl));
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
            <div className="w-9 h-9 rounded-xl bg-cyan-400/10 border border-cyan-400/20 flex items-center justify-center">
              <FileText className="w-4 h-4 text-cyan-400" />
            </div>
            <div>
              <h1 className="text-lg font-bold">Analyst Notebook</h1>
              <p className="text-xs text-muted-foreground">Cell-based SQL, Python, and AI analysis</p>
            </div>
          </div>
          <div className="flex items-center gap-1 bg-white/5 border border-white/8 rounded-lg p-1">
            {Object.keys(CELL_ICONS).map(type => {
              const Icon = CELL_ICONS[type];
              return (
                <button key={type} onClick={() => handleAddCell(type)}
                  className="p-1.5 rounded-lg text-white/30 hover:text-white/80 hover:bg-white/8 transition-all" title={type}>
                  <Icon className="w-4 h-4" />
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-6 space-y-4">
        {cells.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center border border-white/5 rounded-2xl">
            <FileText className="w-12 h-12 text-white/15 mb-4" />
            <h3 className="font-semibold mb-1">Empty notebook</h3>
            <p className="text-sm text-muted-foreground max-w-xs mb-5">Add cells to start your analysis. Use SQL, Python, charts, or AI insights.</p>
            <div className="flex gap-2 flex-wrap justify-center">
              {Object.entries(CELL_ICONS).map(([type, Icon]) => (
                <button key={type} onClick={() => handleAddCell(type)}
                  className="flex items-center gap-1.5 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-xs hover:bg-white/8 transition-all capitalize">
                  <Icon className="w-3.5 h-3.5" /> {type}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <AnimatePresence>
            {cells.map((cell, i) => {
              const CellIcon = CELL_ICONS[cell.cellType];
              return (
                <motion.div key={cell.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }}
                  className="glass-card rounded-2xl border border-white/8 overflow-hidden">
                  {/* Cell header */}
                  <div className="flex items-center gap-3 px-4 py-2 border-b border-white/5 bg-white/2">
                    <CellIcon className="w-4 h-4 text-white/40" />
                    <span className="text-xs text-white/40 uppercase tracking-wider flex-1">{cell.cellType}</span>
                    <button onClick={() => handleExecuteCell(cell)} disabled={executing === cell.id}
                      className="p-1.5 rounded-lg text-cyan-400 hover:bg-cyan-400/10 transition-all disabled:opacity-50">
                      {executing === cell.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                    </button>
                    <button onClick={() => handleDeleteCell(cell.id)}
                      className="p-1.5 rounded-lg text-white/30 hover:text-red-400 hover:bg-red-400/10 transition-all">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Cell input */}
                  <textarea
                    value={cell.content}
                    onChange={e => handleUpdateCell(cell.id, e.target.value)}
                    placeholder={`Enter ${cell.cellType} code...`}
                    rows={4}
                    className="w-full px-4 py-3 bg-black/20 text-white/80 font-mono text-sm focus:outline-none resize-none"
                  />

                  {/* Cell output */}
                  {cell.output && (
                    <div className="px-4 py-3 border-t border-white/5 bg-white/1">
                      <div className="text-xs text-white/40 mb-2">Output</div>
                      <pre className="text-xs text-white/60 overflow-auto max-h-32">
                        {JSON.stringify(cell.output, null, 2)}
                      </pre>
                    </div>
                  )}

                  {cell.errorMessage && (
                    <div className="px-4 py-3 border-t border-red-400/20 bg-red-400/5">
                      <div className="text-xs text-red-400">Error: {cell.errorMessage}</div>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}