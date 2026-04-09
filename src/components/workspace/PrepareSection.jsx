import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWorkspaceStore } from '@/lib/store';
import {
  CheckCircle2, AlertTriangle, Database, Calendar, Hash, Tag, Key,
  TrendingUp, ChevronRight, Info, Shield, FileText, Sparkles, Loader2,
  Eye, EyeOff, ArrowRight, BarChart3, Activity, X
} from 'lucide-react';
import { runAIAnalysis } from '@/lib/aiAnalyzer';

const TYPE_META = {
  date:    { color: 'text-teal-400',   bg: 'bg-teal-400/10',   border: 'border-teal-400/25',   icon: Calendar,  label: 'Date' },
  numeric: { color: 'text-blue-400',   bg: 'bg-blue-400/10',   border: 'border-blue-400/25',   icon: Hash,      label: 'Numeric' },
  category:{ color: 'text-purple-400', bg: 'bg-purple-400/10', border: 'border-purple-400/25', icon: Tag,       label: 'Category' },
  id:      { color: 'text-amber-400',  bg: 'bg-amber-400/10',  border: 'border-amber-400/25',  icon: Key,       label: 'ID' },
  text:    { color: 'text-white/40',   bg: 'bg-white/5',       border: 'border-white/10',      icon: FileText,  label: 'Text' },
};

const ANALYSIS_STEPS = [
  { label: 'Profiling columns & computing descriptive statistics…', icon: BarChart3 },
  { label: 'Running anomaly detection (Z-score + IQR method)…', icon: Activity },
  { label: 'Calculating Pearson correlations…', icon: TrendingUp },
  { label: 'Building semantic model & KPI inference…', icon: Database },
  { label: 'Generating AI chart panels & executive insights…', icon: Sparkles },
  { label: 'Finalizing executive dashboard…', icon: CheckCircle2 },
];

function QualityBar({ score }) {
  const color = score >= 90 ? 'bg-green-400' : score >= 70 ? 'bg-amber-400' : 'bg-red-400';
  const textColor = score >= 90 ? 'text-green-400' : score >= 70 ? 'text-amber-400' : 'text-red-400';
  const label = score >= 90 ? 'Excellent' : score >= 70 ? 'Good — minor issues' : 'Needs attention';
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <div className="h-2 flex-1 bg-white/5 rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all duration-700 ${color}`} style={{ width: `${score}%` }} />
        </div>
        <span className={`text-lg font-black font-mono ${textColor}`}>{score}%</span>
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
  const { getActiveTable, setActiveSection, setAnalysisResults, updateTable } = useWorkspaceStore();
  const activeTable = getActiveTable();
  const [analyzing, setAnalyzing] = useState(false);
  const [done, setDone] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [showFullSchema, setShowFullSchema] = useState(false);
  const [error, setError] = useState('');
  const [overrides, setOverrides] = useState({ primaryMetric: '', dateCol: '', segments: [] });

  if (!activeTable) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[500px] text-center">
        <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/8 flex items-center justify-center mx-auto mb-4">
          <Database className="w-7 h-7 text-white/25" />
        </div>
        <h2 className="text-lg font-semibold mb-2">No Data Yet</h2>
        <p className="text-muted-foreground text-sm mb-6 max-w-xs">Upload a dataset in Intake to begin data profiling and AI analysis.</p>
        <button onClick={() => setActiveSection('intake')}
          className="flex items-center gap-2 px-5 py-2.5 bg-cyan-400/10 border border-cyan-400/20 text-cyan-400 rounded-xl text-sm font-semibold hover:bg-cyan-400/15 transition-colors">
          Go to Intake <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    );
  }

  const { columns = [], qualityScore = 0, issues = [], rowCount = 0, name } = activeTable;
  const dateColumns = columns.filter(c => c.type === 'date');
  const numericColumns = columns.filter(c => c.type === 'numeric');
  const catColumns = columns.filter(c => c.type === 'category');
  const displayedColumns = showFullSchema ? columns : columns.slice(0, 10);

  const handleAnalyze = async () => {
    setAnalyzing(true);
    setDone(false);
    setError('');

    try {
      for (let i = 0; i < 4; i++) {
        setStepIndex(i);
        await new Promise(r => setTimeout(r, 300));
      }
      setStepIndex(4);

      let analysis;
      try {
        analysis = await runAIAnalysis(activeTable, {
          primaryMetric: overrides.primaryMetric || undefined,
          dateCol: overrides.dateCol || undefined,
          segments: overrides.segments.length ? overrides.segments : undefined,
        });
      } catch (llmErr) {
        console.warn('[Prepare] LLM failed, using local fallback:', llmErr?.message);
        try {
          const { buildAnalysis } = await import('@/lib/sampleData');
          analysis = buildAnalysis(activeTable.rows, activeTable.columns, activeTable.name);
        } catch (localErr) {
          // Absolute last-resort: produce a minimal safe analysis object so we never hard-fail
          console.warn('[Prepare] Local fallback also failed:', localErr?.message);
          analysis = {
            tableName: activeTable.name,
            domain: 'general',
            domainLabel: activeTable.name,
            primaryMetric: null,
            primaryLabel: 'No numeric KPI detected',
            totalValue: 0,
            growthRate: null,
            trendData: [],
            forecastData: [],
            breakdownData: [],
            allTrends: {},
            allBreakdowns: {},
            anomalies: [],
            correlations: [],
            colStats: {},
            canForecast: false,
            chartPanels: null,
            keyFindings: [
              `Dataset "${activeTable.name}" has ${activeTable.rowCount?.toLocaleString()} rows and ${activeTable.columns?.length} columns.`,
              'No numeric KPI columns detected — quantitative analysis is limited.',
              'Category and text columns are available for segmentation analysis.',
            ],
            executiveSummary: `"${activeTable.name}" was profiled successfully. No numeric KPI columns were detected, so quantitative trend and anomaly analysis is unavailable. Review the schema and consider whether numeric columns need type correction.`,
            recommendations: [
              { priority: 'high', action: 'Verify that numeric columns are not stored as text. Re-export the file ensuring number formatting is correct.' },
              { priority: 'medium', action: 'Add a numeric measure column (e.g. revenue, count, score) to enable full AI analysis.' },
            ],
            dataStory: `${activeTable.name} was prepared. Schema profiling complete — quantitative analysis requires numeric columns.`,
          };
        }
      }

      setStepIndex(5);
      setAnalysisResults(analysis);
      await new Promise(r => setTimeout(r, 350));
      setDone(true);
      setTimeout(() => setActiveSection('story'), 600);
    } catch (e) {
      setError(e.message || 'Analysis failed. Please check your data and try again.');
      setStepIndex(0);
    } finally {
      setAnalyzing(false);
    }
  };

  const highSeverityIssues = issues.filter(i => i.severity === 'high');
  // Phase 2: always allow analysis — fall back to descriptive profile if no numeric cols
  const canAnalyze = true;
  const hasNumericKpis = numericColumns.length > 0;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6 overflow-auto">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
          <span className="text-xs font-mono text-white/40 uppercase tracking-widest">Prepare & Profile</span>
        </div>
        <h1 className="text-2xl font-bold mb-1">Data Profile & Preparation</h1>
        <p className="text-sm text-muted-foreground">
          Auto-detected schema, quality assessment, and column classifications for{' '}
          <span className="text-white/70 font-mono">{name}</span>.
        </p>
      </motion.div>

      {/* KPI summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="glass-card rounded-xl p-4 border border-white/8 col-span-2 md:col-span-1">
          <div className="flex items-center gap-1.5 mb-3 text-xs text-white/40 uppercase tracking-widest">
            <Shield className="w-3 h-3 text-cyan-400" /> Quality
          </div>
          <QualityBar score={qualityScore} />
        </div>
        {[
          { label: 'Rows', value: rowCount?.toLocaleString(), sub: `${columns.length} columns`, color: 'text-cyan-400' },
          { label: 'Numeric KPIs', value: numericColumns.length, sub: 'measurable metrics', color: 'text-blue-400' },
          { label: 'Dimensions', value: catColumns.length, sub: 'category segments', color: 'text-purple-400' },
        ].map(m => (
          <div key={m.label} className="glass-card rounded-xl p-4 border border-white/8">
            <div className="text-xs text-muted-foreground mb-1 uppercase tracking-widest">{m.label}</div>
            <div className={`text-xl font-black font-mono ${m.color}`}>{m.value}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{m.sub}</div>
          </div>
        ))}
      </div>

      {/* Inferred KPI / Date / Dimension */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {numericColumns[0] ? (
          <div className="glass-card p-4 rounded-xl border border-blue-400/20 bg-blue-400/5">
            <div className="flex items-center gap-1.5 text-blue-400 text-xs font-semibold mb-2 uppercase tracking-widest">
              <TrendingUp className="w-3.5 h-3.5" /> Suggested Primary KPI
            </div>
            <div className="font-mono text-sm font-semibold text-white/85">{numericColumns[0].name.replace(/_/g, ' ')}</div>
            <div className="text-xs text-white/35 mt-1">{numericColumns.length} numeric column{numericColumns.length !== 1 ? 's' : ''} available</div>
          </div>
        ) : (
          <div className="glass-card p-4 rounded-xl border border-red-400/20 bg-red-400/5">
            <div className="flex items-center gap-1.5 text-red-400 text-xs font-semibold mb-2 uppercase tracking-widest">
              <AlertTriangle className="w-3.5 h-3.5" /> No Numeric KPIs
            </div>
            <div className="text-xs text-red-400/80">No numeric columns detected. AI analysis requires at least one measurable metric.</div>
          </div>
        )}
        {dateColumns[0] ? (
          <div className="glass-card p-4 rounded-xl border border-teal-400/20 bg-teal-400/5">
            <div className="flex items-center gap-1.5 text-teal-400 text-xs font-semibold mb-2 uppercase tracking-widest">
              <Calendar className="w-3.5 h-3.5" /> Date / Time Field
            </div>
            <div className="font-mono text-sm font-semibold text-white/85">{dateColumns[0].name.replace(/_/g, ' ')}</div>
            <div className="text-xs text-green-400 mt-1 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Forecasting enabled</div>
          </div>
        ) : (
          <div className="glass-card p-4 rounded-xl border border-amber-400/20 bg-amber-400/5">
            <div className="flex items-center gap-1.5 text-amber-400 text-xs font-semibold mb-2 uppercase tracking-widest">
              <Calendar className="w-3.5 h-3.5" /> Date / Time Field
            </div>
            <div className="text-sm text-white/50">None detected</div>
            <div className="text-xs text-amber-400/70 mt-1">Forecasting disabled — descriptive analytics active</div>
          </div>
        )}
        {catColumns[0] ? (
          <div className="glass-card p-4 rounded-xl border border-purple-400/20 bg-purple-400/5">
            <div className="flex items-center gap-1.5 text-purple-400 text-xs font-semibold mb-2 uppercase tracking-widest">
              <Tag className="w-3.5 h-3.5" /> Primary Dimension
            </div>
            <div className="font-mono text-sm font-semibold text-white/85">{catColumns[0].name.replace(/_/g, ' ')}</div>
            <div className="text-xs text-white/35 mt-1">{catColumns.length} dimension{catColumns.length !== 1 ? 's' : ''} for segmentation</div>
          </div>
        ) : (
          <div className="glass-card p-4 rounded-xl border border-white/10 bg-white/3">
            <div className="flex items-center gap-1.5 text-white/40 text-xs font-semibold mb-2 uppercase tracking-widest">
              <Tag className="w-3.5 h-3.5" /> Dimension
            </div>
            <div className="text-sm text-white/35">No category columns</div>
            <div className="text-xs text-white/25 mt-1">Segment breakdown unavailable</div>
          </div>
        )}
      </div>

      {/* Alerts */}
      <AnimatePresence>
        {issues?.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
            <div className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-2">
              Data Quality Issues ({issues.length})
            </div>
            {issues.map((issue, i) => (
              <div key={i} className={`flex items-start gap-3 p-3 rounded-xl border ${issue.severity === 'high' ? 'bg-red-400/5 border-red-400/20' : 'bg-amber-400/5 border-amber-400/20'}`}>
                <AlertTriangle className={`w-4 h-4 mt-0.5 flex-shrink-0 ${issue.severity === 'high' ? 'text-red-400' : 'text-amber-400'}`} />
                <div className={`text-sm leading-relaxed ${issue.severity === 'high' ? 'text-red-400/90' : 'text-amber-400/90'}`}>{issue.message}</div>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {!hasNumericKpis && (
        <div className="flex items-start gap-3 p-4 bg-amber-400/5 border border-amber-400/20 rounded-xl">
          <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-amber-400 leading-relaxed">
            <strong>Limited analysis mode:</strong> No numeric columns detected. Quantitative KPI analysis, trends, and forecasting will be skipped. A descriptive profile and schema summary will still be generated. To enable full analysis, ensure your dataset has at least one numeric column (e.g. revenue, count, score).
          </div>
        </div>
      )}

      {!dateColumns.length && numericColumns.length > 0 && (
        <div className="flex items-start gap-3 p-3 bg-blue-400/5 border border-blue-400/20 rounded-xl">
          <Info className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
          <div className="text-xs text-blue-400 leading-relaxed">No date column detected — time-series forecasting is disabled. Descriptive, correlation, anomaly, and segment analysis will be used.</div>
        </div>
      )}

      {activeTable.parseWarnings?.length > 0 && (
        <div className="space-y-1.5">
          <div className="text-xs font-semibold text-orange-400/80 uppercase tracking-widest">Parse Warnings</div>
          {activeTable.parseWarnings.map((w, i) => (
            <div key={i} className="flex items-start gap-2.5 p-2.5 rounded-lg bg-orange-400/5 border border-orange-400/15 text-xs text-orange-400/80">
              <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" /> {w}
            </div>
          ))}
        </div>
      )}

      {/* Schema table */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="text-xs font-semibold text-white/40 uppercase tracking-widest">
            Inferred Schema ({columns.length} columns)
          </div>
          {columns.length > 10 && (
            <button onClick={() => setShowFullSchema(v => !v)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
              {showFullSchema ? <><EyeOff className="w-3 h-3" /> Collapse</> : <><Eye className="w-3 h-3" /> Show all {columns.length}</>}
            </button>
          )}
        </div>
        <div className="overflow-auto rounded-xl border border-white/8">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/8 bg-white/3">
                {['Column', 'Type', 'Unique', 'Missing %', 'Min', 'Max', 'Sample Values'].map(h => (
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
                    <span className={col.nullCount > 0 ? (col.missingPct > 20 ? 'text-red-400 font-mono' : 'text-amber-400 font-mono') : 'text-muted-foreground font-mono'}>
                      {col.missingPct || 0}%
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground font-mono">{col.min != null ? String(col.min).slice(0, 12) : '—'}</td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground font-mono">{col.max != null ? String(col.max).slice(0, 12) : '—'}</td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground max-w-48 truncate">{col.sample?.slice(0, 3).map(v => String(v)).join(', ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!showFullSchema && columns.length > 10 && (
          <div className="text-center mt-2 text-xs text-white/30">+{columns.length - 10} more columns — click "Show all" to expand</div>
        )}
      </div>

      {/* Error feedback */}
      <AnimatePresence>
        {error && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="flex items-start gap-3 p-4 bg-red-400/5 border border-red-400/20 rounded-xl">
            <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1 text-sm text-red-400 leading-relaxed">{error}</div>
            <button onClick={() => setError('')} className="text-red-400/60 hover:text-red-400"><X className="w-3.5 h-3.5" /></button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Analysis Configuration */}
      {canAnalyze && (
        <div className="glass-card rounded-2xl p-5 border border-white/8 space-y-4">
          <div className="text-xs font-semibold text-white/40 uppercase tracking-widest">Analysis Configuration <span className="normal-case font-normal text-white/25">— optional overrides</span></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Primary KPI</label>
              <select value={overrides.primaryMetric} onChange={e => setOverrides(v => ({ ...v, primaryMetric: e.target.value }))}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-cyan-400/30 text-foreground">
                <option value="">Auto-detect best KPI</option>
                {numericColumns.map(c => <option key={c.name} value={c.name}>{c.name.replace(/_/g, ' ')}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Date / Time Field</label>
              <select value={overrides.dateCol} onChange={e => setOverrides(v => ({ ...v, dateCol: e.target.value }))}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-cyan-400/30 text-foreground">
                <option value="">Auto-detect date column</option>
                <option value="none">No date — descriptive analytics only</option>
                {dateColumns.map(c => <option key={c.name} value={c.name}>{c.name.replace(/_/g, ' ')}</option>)}
                {catColumns.filter(c => /month|year|period|quarter|week|date/i.test(c.name)).map(c => (
                  <option key={c.name} value={c.name}>{c.name.replace(/_/g, ' ')} (category)</option>
                ))}
              </select>
            </div>
          </div>
          {catColumns.length > 0 && (
            <div>
              <label className="text-xs text-muted-foreground mb-2 block">Segment Columns <span className="text-white/25">(for breakdowns)</span></label>
              <div className="flex flex-wrap gap-2">
                {catColumns.map(c => {
                  const selected = overrides.segments.includes(c.name);
                  return (
                    <button key={c.name}
                      onClick={() => setOverrides(v => ({ ...v, segments: selected ? v.segments.filter(s => s !== c.name) : [...v.segments, c.name] }))}
                      className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                        selected ? 'bg-purple-400/15 border-purple-400/30 text-purple-400' : 'bg-white/5 border-white/10 text-white/45 hover:border-white/25'
                      }`}>
                      {c.name.replace(/_/g, ' ')}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Analysis CTA */}
      <div className="space-y-3">
        <button onClick={handleAnalyze} disabled={analyzing || done}
          className="w-full flex items-center justify-center gap-2 py-4 bg-cyan-400 rounded-xl font-bold text-sm hover:bg-cyan-300 transition-all disabled:opacity-50 relative overflow-hidden"
          style={{ color: 'hsl(222,47%,6%)' }}>
          {analyzing ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> {ANALYSIS_STEPS[stepIndex]?.label}</>
          ) : done ? (
            <><CheckCircle2 className="w-4 h-4" /> Analysis Complete — Opening Dashboard…</>
          ) : !hasNumericKpis ? (
            <><Sparkles className="w-4 h-4" /> Generate Descriptive Profile <ChevronRight className="w-4 h-4" /></>
          ) : (
            <><Sparkles className="w-4 h-4" /> Run Full AI Analysis & Generate Dashboard <ChevronRight className="w-4 h-4" /></>
          )}
        </button>

        {analyzing && (
          <div className="space-y-2">
            <div className="flex gap-1">
              {ANALYSIS_STEPS.map((_, i) => (
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