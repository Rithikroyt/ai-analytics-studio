import { useState } from 'react';
import { motion } from 'framer-motion';
import { useWorkspaceStore } from '@/lib/store';
import { CheckCircle2, AlertTriangle, Database, Calendar, Hash, Tag, Key, TrendingUp, ChevronRight, Info, Shield, FileText } from 'lucide-react';
import { buildTableAnalysis } from '@/lib/dataParser';

const typeColors = { date: 'text-teal-400 bg-teal-400/10', numeric: 'text-blue-400 bg-blue-400/10', category: 'text-purple-400 bg-purple-400/10', id: 'text-amber-400 bg-amber-400/10', text: 'text-muted-foreground bg-white/5' };
const typeIcons = { date: Calendar, numeric: Hash, category: Tag, id: Key, text: FileText };

function QualityBar({ score }) {
  const color = score >= 90 ? 'bg-green-400' : score >= 70 ? 'bg-amber-400' : 'bg-red-400';
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-sm font-mono font-semibold">{score}%</span>
    </div>
  );
}

export default function PrepareSection() {
  const { getActiveTable, setActiveSection, setAnalysisResults, tables } = useWorkspaceStore();
  const activeTable = getActiveTable();
  const [confirmed, setConfirmed] = useState(false);

  if (!activeTable) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[400px] text-center">
        <Database className="w-12 h-12 text-muted-foreground mb-4" />
        <h2 className="text-lg font-semibold mb-2">No Data Yet</h2>
        <p className="text-muted-foreground text-sm mb-4">Upload a file first to begin profiling.</p>
        <button onClick={() => setActiveSection('intake')} className="px-4 py-2 bg-cyan-400/10 border border-cyan-400/20 text-cyan-400 rounded-lg text-sm">Go to Intake</button>
      </div>
    );
  }

  const { columns, qualityScore, issues, rowCount, name } = activeTable;
  const dateColumns = columns.filter(c => c.type === 'date');
  const numericColumns = columns.filter(c => c.type === 'numeric');
  const catColumns = columns.filter(c => c.type === 'category');
  const idColumns = columns.filter(c => c.type === 'id');

  const handleConfirmAndAnalyze = () => {
    const analysis = buildTableAnalysis(activeTable);
    setAnalysisResults(analysis);
    setConfirmed(true);
    setTimeout(() => setActiveSection('story'), 600);
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold mb-2">Prepare & Profile</h1>
        <p className="text-muted-foreground text-sm">Review the auto-detected schema, quality scores, and column classifications.</p>
      </motion.div>

      {/* Quality summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-card rounded-2xl p-5 border border-white/5 col-span-1">
          <div className="flex items-center gap-2 mb-3">
            <Shield className="w-4 h-4 text-cyan-400" />
            <span className="text-sm font-semibold">Quality Score</span>
          </div>
          <QualityBar score={qualityScore} />
          <div className="text-xs text-muted-foreground mt-2">
            {qualityScore >= 90 ? 'Excellent data quality' : qualityScore >= 70 ? 'Good — minor issues' : 'Needs attention'}
          </div>
        </div>
        <div className="glass-card rounded-2xl p-5 border border-white/5">
          <div className="text-xs text-muted-foreground mb-1">Table</div>
          <div className="font-semibold truncate">{name}</div>
          <div className="text-xs text-muted-foreground mt-2">{rowCount?.toLocaleString()} rows · {columns.length} columns</div>
        </div>
        <div className="glass-card rounded-2xl p-5 border border-white/5">
          <div className="text-xs text-muted-foreground mb-2">Column Types</div>
          <div className="flex flex-wrap gap-2">
            {[['date', dateColumns.length], ['numeric', numericColumns.length], ['category', catColumns.length], ['id', idColumns.length]].map(([type, count]) => count > 0 && (
              <span key={type} className={`px-2 py-0.5 rounded text-xs font-medium ${typeColors[type]}`}>{count} {type}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Issues */}
      {issues?.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">Data Issues</h2>
          {issues.map((issue, i) => (
            <div key={i} className="flex items-start gap-3 p-3 bg-amber-400/5 border border-amber-400/20 rounded-xl">
              <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-amber-400">{issue.message}</div>
            </div>
          ))}
        </div>
      )}

      {/* Inferred schema */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest mb-3">Inferred Schema</h2>
        <div className="overflow-auto rounded-2xl border border-white/5">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5 bg-white/2">
                {['Column', 'Type', 'Unique', 'Missing', 'Sample Values'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs text-muted-foreground font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {columns.map((col) => (
                <tr key={col.name} className="border-b border-white/5 hover:bg-white/2 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-foreground">{col.name}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${typeColors[col.type]}`}>{col.type}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground font-mono">{col.uniqueCount}</td>
                  <td className="px-4 py-3 text-xs">
                    <span className={col.nullCount > 0 ? 'text-amber-400' : 'text-muted-foreground'}>
                      {col.nullCount}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{col.sample?.slice(0,3).join(', ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Suggested keys */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {dateColumns[0] && (
          <div className="glass-card p-4 rounded-xl border border-teal-400/20">
            <div className="flex items-center gap-2 text-teal-400 text-xs font-semibold mb-2"><Calendar className="w-3.5 h-3.5" /> Date Field</div>
            <div className="font-mono text-sm">{dateColumns[0].name}</div>
          </div>
        )}
        {numericColumns[0] && (
          <div className="glass-card p-4 rounded-xl border border-blue-400/20">
            <div className="flex items-center gap-2 text-blue-400 text-xs font-semibold mb-2"><TrendingUp className="w-3.5 h-3.5" /> Primary KPI</div>
            <div className="font-mono text-sm">{numericColumns[0].name}</div>
          </div>
        )}
        {catColumns[0] && (
          <div className="glass-card p-4 rounded-xl border border-purple-400/20">
            <div className="flex items-center gap-2 text-purple-400 text-xs font-semibold mb-2"><Tag className="w-3.5 h-3.5" /> Primary Dimension</div>
            <div className="font-mono text-sm">{catColumns[0].name}</div>
          </div>
        )}
      </div>

      {!dateColumns[0] && numericColumns.length > 0 && (
        <div className="flex items-start gap-3 p-4 bg-blue-400/5 border border-blue-400/20 rounded-xl">
          <Info className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-blue-400">No date column detected — forecasting will be disabled. Descriptive analytics and anomaly detection will be used instead.</div>
        </div>
      )}

      <button
        onClick={handleConfirmAndAnalyze}
        disabled={confirmed}
        className="w-full flex items-center justify-center gap-2 py-3.5 bg-cyan-400 rounded-xl font-bold text-sm hover:bg-cyan-300 transition-all disabled:opacity-50"
        style={{ color: 'hsl(222,47%,6%)' }}
      >
        {confirmed ? <><CheckCircle2 className="w-4 h-4" /> Analysis running…</> : <>Run Analysis & Generate Story <ChevronRight className="w-4 h-4" /></>}
      </button>
    </div>
  );
}