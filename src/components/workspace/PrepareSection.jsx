import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWorkspaceStore } from '@/lib/store';
import {
  CheckCircle2, AlertTriangle, Database, Calendar, Hash, Tag, Key,
  TrendingUp, ChevronRight, Info, Shield, FileText, Sparkles, Loader2,
  Eye, EyeOff, ArrowRight, BarChart3, Activity
} from 'lucide-react';
import { runAIAnalysis } from '@/lib/aiAnalyzer';

const TYPE_META = {
  date:    { color: 'text-teal-400',   bg: 'bg-teal-400/10',   border: 'border-teal-400/25',   icon: Calendar,    label: 'Date' },
  numeric: { color: 'text-blue-400',   bg: 'bg-blue-400/10',   border: 'border-blue-400/25',   icon: Hash,        label: 'Numeric' },
  category:{ color: 'text-purple-400', bg: 'bg-purple-400/10', border: 'border-purple-400/25', icon: Tag,         label: 'Category' },
  id:      { color: 'text-amber-400',  bg: 'bg-amber-400/10',  border: 'border-amber-400/25',  icon: Key,         label: 'ID' },
  text:    { color: 'text-white/40',   bg: 'bg-white/5',       border: 'border-white/10',      icon: FileText,    label: 'Text' },
};

const ANALYSIS_STEPS = [
  { label: 'Profiling columns & computing descriptive statistics…', icon: BarChart3 },
  { label: 'Running anomaly detection (Z-score + IQR)…', icon: Activity },
  { label: 'Calculating Pearson correlations across numeric columns…', icon: TrendingUp },
  { label: 'Building semantic model & KPI inference…', icon: Database },
  { label: 'Calling AI model for chart layout & insights…', icon: Sparkles },
  { label: 'Finalizing executive dashboard…', icon: CheckCircle2 },
];

function QualityBar({ score }) {
  const color = score >= 90 ? 'bg-green-400' : score >= 70 ? 'bg-amber-400' : 'bg-red-400';
  const textColor = score >= 90 ? 'text-green-400' : score >= 70 ? 'text-amber-400' : 'text-red-400';
  const label = score >= 90 ? 'Excellent' : score >= 70 ? 'Good — minor issues' : 'Needs attention';
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-2 flex-1 w-40 bg-white/5 rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-700 ${color}`} style={{ width: `${score}%` }} />
          </div>
          <span className={`text-lg font-black font-mono ${textColor}`}>{score}%</span>
        </div>
      </div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function TypeBadge({ type }) {
  const meta = TYPE_META[type] || TYPE_META.text;
  const Icon = meta.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${meta.color} ${meta.bg} ${meta.border}`}>
      <Icon className="w-2.5 h-2.5" />{meta.label}
    </span>
  );
}

export default function PrepareSection() {
  const { getActiveTable, setActiveSection, setAnalysisResults } = useWorkspaceStore();
  const activeTable = getActiveTable();
  const [analyzing, setAnalyzing] = useState(false);
  const [done, setDone] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [showFullSchema, setShowFullSchema] = useState(false);

  if (!activeTable) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[500px] text-center">
        <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/8 flex items-center justify-center mx-auto mb-4">
          <Database className="w-7 h-7 text-white/25" />
        </div>
        <h2 className="text-lg font-semibold mb-2">No Data Yet</h2>
        <p className="text-muted-foreground text-sm mb-6">Upload a file in the Intake section to begin data profiling and analysis.</p>
        <button onClick={() => setActiveSection('intake')}
          className="flex items-center gap-2 px-5 py-2.5 bg-cyan-400/10 border border-cyan-400/20 text-cyan-400 rounded-xl text-sm font-semibold hover:bg-cyan-400/15 transition-colors">
          Go to Intake <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    );
  }

  const { columns, qualityScore, issues, rowCount, name } = activeTable;
  const dateColumns = columns.filter(c => c.type === 'date');
  const numericColumns = columns.filter(c => c.type === 'numeric');
  const catColumns = columns.filter(c => c.type === 'category');
  const idColumns = columns.filter(c => c.type === 'id');
  const displayedColumns = showFullSchema ? columns : columns.slice(0, 8);

  const handleAnalyze = async () => {
    setAnalyzing(true);
    setDone(false);
    try {
      for (let i = 0; i < ANALYSIS_STEPS.length - 1; i++) {
        setStepIndex(i);
        await new Promise(r => setTimeout(r, i === 4 ? 300 : 250));
      }
      setStepIndex(4);
      let analysis;
      try {
        analysis = await runAIAnalysis(activeTable);
      } catch {
        // Fallback to local analysis if LLM call fails
        const { buildAnalysis, inferColumns } = await import('@/lib/sampleData');
        analysis = buildAnalysis(activeTable.rows, activeTable.columns, activeTable.name);
      }
      setStepIndex(5);
      setAnalysisResults(analysis);
      await new Promise(r => setTimeout(r, 400));
      setDone(true);
      setTimeout(() => setActiveSection('story'), 500);
    } catch (e) {
      setStepIndex(0);
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold mb-1">Prepare & Profile</h1>
        <p className="text-sm text-muted-foreground">Auto-detected schema, quality assessment, and column classifications for <span className="text-white/70 font-mono">{name}</span>.</p>
      </motion.div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="glass-card rounded-xl p-4 border border-white/8 col-span-2 md:col-span-1">
          <div className="flex items-center gap-1.5 mb-3 text-xs text-white/40 uppercase tracking-widest">
            <Shield className="w-3 h-3 text-cyan-400" /> Quality
          </div>
          <QualityBar score={qualityScore} />
        </div>
        <div className="glass-card rounded-xl p-4 border border-white/8">
          <div className="text-xs text-muted-foreground mb-1 uppercase tracking-widest">Rows</div>
          <div className="text-xl font-black text-cyan-400 font-mono">{rowCount?.toLocaleString()}</div>
          <div className="text-xs text-muted-foreground mt-0.5">{columns.length} columns</div>
        </div>
        <div className="glass-card rounded-xl p-4 border border-white/8">
          <div className="text-xs text-muted-foreground mb-2 uppercase tracking-widest">Numeric</div>
          <div className="text-xl font-black text-blue-400 font-mono">{numericColumns.length}</div>
          <div className="text-xs text-muted-foreground mt-0.5">KPI candidates</div>
        </div>
        <div className="glass-card rounded-xl p-4 border border-white/8">
          <div className="text-xs text-muted-foreground mb-2 uppercase tracking-widest">Category</div>
          <div className="text-xl font-black text-purple-400 font-mono">{catColumns.length}</div>
          <div className="text-xs text-muted-foreground mt-0.5">Dimensions</div>
        </div>
      </div>

      {/* Inferred KPI / Date / Dimension */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {numericColumns[0] && (
          <div className="glass-card p-4 rounded-xl border border-blue-400/20 bg-blue-400/5">
            <div className="flex items-center gap-1.5 text-blue-400 text-xs font-semibold mb-2 uppercase tracking-widest">
              <TrendingUp className="w-3.5 h-3.5" /> Suggested Primary KPI
            </div>
            <div className="font-mono text-sm font-semibold text-white/80">{numericColumns[0].name.replace(/_/g, ' ')}</div>
            <div className="text-xs text-white/30 mt-1">{numericColumns.length} numeric column{numericColumns.length !== 1 ? 's' : ''} available</div>
          </div>
        )}
        {dateColumns[0] ? (
          <div className="glass-card p-4 rounded-xl border border-teal-400/20 bg-teal-400/5">
            <div className="flex items-center gap-1.5 text-teal-400 text-xs font-semibold mb-2 uppercase tracking-widest">
              <Calendar className="w-3.5 h-3.5" /> Date / Time Field
            </div>
            <div className="font-mono text-sm font-semibold text-white/80">{dateColumns[0].name.replace(/_/g, ' ')}</div>
            <div className="text-xs text-green-400 mt-1 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Forecasting enabled</div>
          </div>
        ) : (
          <div className="glass-card p-4 rounded-xl border border-amber-400/20 bg-amber-400/5">
            <div className="flex items-center gap-1.5 text-amber-400 text-xs font-semibold mb-2 uppercase tracking-widest">
              <Calendar className="w-3.5 h-3.5" /> Date / Time Field
            </div>
            <div className="text-sm text-white/50">None detected</div>
            <div className="text-xs text-amber-400/70 mt-1">Forecasting disabled</div>
          </div>
        )}
        {catColumns[0] && (
          <div className="glass-card p-4 rounded-xl border border-purple-400/20 bg-purple-400/5">
            <div className="flex items-center gap-1.5 text-purple-400 text-xs font-semibold mb-2 uppercase tracking-widest">
              <Tag className="w-3.5 h-3.5" /> Primary Dimension
            </div>
            <div className="font-mono text-sm font-semibold text-white/80">{catColumns[0].name.replace(/_/g, ' ')}</div>
            <div className="text-xs text-white/30 mt-1">{catColumns.length} dimension{catColumns.length !== 1 ? 's' : ''} for segmentation</div>
          </div>
        )}
      </div>

      {/* Issues */}
      <AnimatePresence>
        {issues?.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
            <div className="text-xs font-semibold text-white/40 uppercase tracking-widest">Data Quality Issues</div>
            {issues.map((issue, i) => (
              <div key={i} className="flex items-start gap-3 p-3 bg-amber-400/5 border border-amber-400/20 rounded-xl">
                <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-amber-400/90 leading-relaxed">{issue.message}</div>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {!dateColumns.length && numericColumns.length > 0 && (
        <div className="flex items-start gap-3 p-4 bg-blue-400/5 border border-blue-400/20 rounded-xl">
          <Info className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-blue-400">No date column detected — time-series forecasting is disabled. Descriptive statistics, anomaly detection, correlations, and breakdown analysis will be used instead.</div>
        </div>
      )}

      {/* Schema table */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="text-xs font-semibold text-white/40 uppercase tracking-widest">Inferred Schema ({columns.length} columns)</div>
          {columns.length > 8 && (
            <button onClick={() => setShowFullSchema(v => !v)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
              {showFullSchema ? <><EyeOff className="w-3 h-3" /> Show less</> : <><Eye className="w-3 h-3" /> Show all {columns.length}</>}
            </button>
          )}
        </div>
        <div className="overflow-auto rounded-xl border border-white/8">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/8 bg-white/3">
                {['Column', 'Type', 'Unique', 'Missing', 'Min', 'Max', 'Sample'].map(h => (
                  <th key={h} className="px-3 py-2.5 text-left text-xs text-muted-foreground font-medium whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {displayedColumns.map((col) => (
                <tr key={col.name} className="border-b border-white/5 hover:bg-white/2 transition-colors">
                  <td className="px-3 py-2.5 font-mono text-xs text-white/80 whitespace-nowrap">{col.name}</td>
                  <td className="px-3 py-2.5"><TypeBadge type={col.type} /></td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground font-mono">{col.uniqueCount?.toLocaleString()}</td>
                  <td className="px-3 py-2.5 text-xs">
                    <span className={col.nullCount > 0 ? 'text-amber-400 font-mono' : 'text-muted-foreground font-mono'}>{col.nullCount || '0'}</span>
                  </td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground font-mono">{col.min != null ? String(col.min).slice(0, 12) : '—'}</td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground font-mono">{col.max != null ? String(col.max).slice(0, 12) : '—'}</td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground max-w-40 truncate">{col.sample?.slice(0, 3).map(v => String(v)).join(', ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!showFullSchema && columns.length > 8 && (
          <div className="text-center mt-2 text-xs text-white/30">+{columns.length - 8} more columns</div>
        )}
      </div>

      {/* Analysis button + progress */}
      <div className="space-y-3">
        <button onClick={handleAnalyze} disabled={analyzing || done}
          className="w-full flex items-center justify-center gap-2 py-4 bg-cyan-400 rounded-xl font-bold text-sm hover:bg-cyan-300 transition-all disabled:opacity-60 relative overflow-hidden"
          style={{ color: 'hsl(222,47%,6%)' }}>
          {analyzing ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> {ANALYSIS_STEPS[stepIndex]?.label}</>
          ) : done ? (
            <><CheckCircle2 className="w-4 h-4" /> Analysis Complete — Redirecting to Dashboard…</>
          ) : (
            <><Sparkles className="w-4 h-4" /> Run AI Analysis & Generate Dashboard <ChevronRight className="w-4 h-4" /></>
          )}
        </button>

        {analyzing && (
          <div className="space-y-2">
            <div className="flex gap-1">
              {ANALYSIS_STEPS.map((step, i) => (
                <div key={i} className={`flex-1 h-1 rounded-full transition-all duration-500 ${i <= stepIndex ? 'bg-cyan-400' : 'bg-white/10'}`} />
              ))}
            </div>
            <div className="space-y-1">
              {ANALYSIS_STEPS.map((step, i) => {
                const Icon = step.icon;
                return (
                  <div key={i} className={`flex items-center gap-2 text-xs transition-all ${i === stepIndex ? 'text-cyan-400' : i < stepIndex ? 'text-green-400/60' : 'text-white/20'}`}>
                    {i < stepIndex ? <CheckCircle2 className="w-3 h-3" /> : i === stepIndex ? <Loader2 className="w-3 h-3 animate-spin" /> : <Icon className="w-3 h-3" />}
                    {step.label}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}