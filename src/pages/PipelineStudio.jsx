/**
 * Pipeline Studio — ETL Pipeline visualization and execution
 * Plan → Execute → Monitor pipelines with step-by-step logs
 */
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useWorkspaceStore } from '@/lib/store';
import {
  Play, CheckCircle2, AlertTriangle, Loader2, RefreshCw,
  Database, Scissors, BarChart2, FileText, Zap, Clock,
  ChevronRight, Activity, GitMerge, History, ChevronLeft
} from 'lucide-react';
import { Link } from 'react-router-dom';

const PIPELINE_TEMPLATES = [
  {
    id: 'data_cleaning',
    name: 'Data Cleaning Pipeline',
    description: 'Upload → Profile → Clean → Remove Duplicates → Fix Types → Export',
    icon: Scissors, color: 'text-amber-400', bg: 'bg-amber-400/10', border: 'border-amber-400/20',
    steps: ['profile', 'clean', 'kpi_ready'],
    stepLabels: { profile: 'Profile Dataset', clean: 'Clean & Normalize', kpi_ready: 'KPI Readiness Check' },
  },
  {
    id: 'analysis_pipeline',
    name: 'Analysis Pipeline',
    description: 'Dataset → Profile → KPIs → Semantic Layer → AI Insights',
    icon: BarChart2, color: 'text-cyan-400', bg: 'bg-cyan-400/10', border: 'border-cyan-400/20',
    steps: ['profile', 'kpi_ready'],
    stepLabels: { profile: 'Profile Dataset', kpi_ready: 'Identify KPIs & Dimensions' },
  },
  {
    id: 'full_pipeline',
    name: 'Full Processing Pipeline',
    description: 'Upload → Profile → Clean → KPI Ready → Generate Report',
    icon: GitMerge, color: 'text-purple-400', bg: 'bg-purple-400/10', border: 'border-purple-400/20',
    steps: ['profile', 'clean', 'kpi_ready'],
    stepLabels: { profile: 'Profile Dataset', clean: 'Clean Data', kpi_ready: 'KPI & Dimension Detection' },
  },
];

const STATUS_COLORS = {
  running: 'text-cyan-400 bg-cyan-400/10 border-cyan-400/20',
  success: 'text-green-400 bg-green-400/10 border-green-400/20',
  failed: 'text-red-400 bg-red-400/10 border-red-400/20',
  partial: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
  pending: 'text-white/30 bg-white/5 border-white/10',
};

function StepCard({ step, result, label }) {
  return (
    <div className={`flex items-start gap-3 p-3 rounded-xl border ${result ? (result.status === 'success' ? 'border-green-400/15 bg-green-400/3' : 'border-red-400/15 bg-red-400/3') : 'border-white/8 bg-white/2'}`}>
      <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${result?.status === 'success' ? 'bg-green-400/15' : result?.status === 'failed' ? 'bg-red-400/15' : 'bg-white/8'}`}>
        {result?.status === 'success' ? <CheckCircle2 className="w-4 h-4 text-green-400" /> :
         result?.status === 'failed' ? <AlertTriangle className="w-4 h-4 text-red-400" /> :
         result?.status === 'running' ? <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" /> :
         <Clock className="w-4 h-4 text-white/25" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-white/80">{label}</div>
        {result?.durationMs && <div className="text-xs text-white/30 mt-0.5">{result.durationMs}ms</div>}
        {result?.output && (
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {Object.entries(result.output).map(([k, v]) => (
              <span key={k} className="text-xs px-2 py-0.5 rounded-full bg-white/5 border border-white/8 text-white/50">
                {k.replace(/_/g,' ')}: <span className="text-white/75">{typeof v === 'object' ? JSON.stringify(v).slice(0,40) : String(v)}</span>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function PipelineStudio() {
  const { getActiveTable } = useWorkspaceStore();
  const activeTable = getActiveTable();
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [activeStep, setActiveStep] = useState(null);

  useEffect(() => {
    base44.entities.PipelineRun.list('-created_date', 20)
      .then(runs => setHistory(runs))
      .catch(() => {})
      .finally(() => setLoadingHistory(false));
  }, []);

  const runPipeline = async () => {
    if (!selectedTemplate || !activeTable) return;
    setRunning(true);
    setResult(null);

    // Simulate step-by-step progress
    for (const step of selectedTemplate.steps) {
      setActiveStep(step);
      await new Promise(r => setTimeout(r, 300));
    }

    try {
      const res = await base44.functions.invoke('runPipelineJob', {
        pipelineName: selectedTemplate.name,
        steps: selectedTemplate.steps,
        tableData: {
          name: activeTable.name,
          rows: activeTable.rows?.slice(0, 500) || [],
          columns: activeTable.columns || [],
        },
      });
      setResult(res.data);
      // Refresh history
      const runs = await base44.entities.PipelineRun.list('-created_date', 20).catch(() => []);
      setHistory(runs);
    } catch (e) {
      setResult({ error: e.message });
    }
    setActiveStep(null);
    setRunning(false);
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
            <div className="w-9 h-9 rounded-xl bg-purple-400/10 border border-purple-400/20 flex items-center justify-center">
              <GitMerge className="w-4 h-4 text-purple-400" />
            </div>
            <div>
              <h1 className="text-lg font-bold">Pipeline Studio</h1>
              <p className="text-xs text-muted-foreground">ETL pipeline execution with step-by-step monitoring</p>
            </div>
          </div>
          {activeTable && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-cyan-400/8 border border-cyan-400/15 text-xs text-cyan-400">
              <Database className="w-3.5 h-3.5" />
              {activeTable.name} · {activeTable.rows?.length} rows
            </div>
          )}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Template selector */}
        <div className="lg:col-span-2 space-y-5">
          <div>
            <h2 className="text-sm font-semibold text-white/60 uppercase tracking-widest mb-3">Pipeline Templates</h2>
            <div className="grid gap-3">
              {PIPELINE_TEMPLATES.map(t => (
                <button key={t.id} onClick={() => setSelectedTemplate(t)}
                  className={`w-full text-left p-4 rounded-2xl border transition-all ${selectedTemplate?.id === t.id ? `${t.bg} ${t.border}` : 'bg-white/2 border-white/8 hover:border-white/18 hover:bg-white/4'}`}>
                  <div className="flex items-start gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${t.bg} border ${t.border}`}>
                      <t.icon className={`w-4 h-4 ${t.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm text-white/90">{t.name}</div>
                      <div className="text-xs text-white/40 mt-0.5 leading-relaxed">{t.description}</div>
                      <div className="flex items-center gap-1 mt-2 flex-wrap">
                        {t.steps.map((s, i) => (
                          <div key={s} className="flex items-center gap-1">
                            <span className="text-xs px-2 py-0.5 rounded-full bg-white/5 border border-white/8 text-white/40">{t.stepLabels[s]}</span>
                            {i < t.steps.length - 1 && <ChevronRight className="w-3 h-3 text-white/20" />}
                          </div>
                        ))}
                      </div>
                    </div>
                    {selectedTemplate?.id === t.id && <CheckCircle2 className={`w-4 h-4 ${t.color} flex-shrink-0`} />}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {!activeTable && (
            <div className="text-center py-8 text-sm text-white/30 border border-white/5 rounded-2xl bg-white/1">
              Load a dataset in the Workspace to run pipelines
            </div>
          )}

          {selectedTemplate && activeTable && (
            <button onClick={runPipeline} disabled={running}
              className="w-full flex items-center justify-center gap-2 px-5 py-3.5 bg-purple-400/15 border border-purple-400/25 text-purple-400 rounded-2xl font-bold text-sm hover:bg-purple-400/25 transition-all disabled:opacity-40">
              {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              {running ? 'Running Pipeline…' : `Run ${selectedTemplate.name}`}
            </button>
          )}

          {/* Results */}
          <AnimatePresence>
            {(running || result) && selectedTemplate && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                <h3 className="text-sm font-semibold text-white/60 uppercase tracking-widest">Pipeline Steps</h3>
                {selectedTemplate.steps.map((step, i) => {
                  const stepResult = result?.steps?.find(s => s.step === step);
                  const isActive = activeStep === step && running;
                  return (
                    <StepCard key={step} step={step} label={selectedTemplate.stepLabels[step]}
                      result={isActive ? { status: 'running' } : stepResult} />
                  );
                })}

                {result && !result.error && (
                  <div className="mt-4 p-4 rounded-2xl bg-green-400/5 border border-green-400/15 space-y-3">
                    <div className="flex items-center gap-2 text-green-400 font-semibold text-sm">
                      <CheckCircle2 className="w-4 h-4" /> Pipeline Complete
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {[
                        { label: 'Quality Score', value: `${result.profile?.qualityScore || 0}%`, color: 'text-green-400' },
                        { label: 'Completeness', value: `${result.profile?.completeness || 0}%`, color: 'text-cyan-400' },
                        { label: 'Duplicates Removed', value: result.issues?.duplicates_removed || 0, color: 'text-amber-400' },
                        { label: 'Missing Filled', value: result.issues?.missing_filled || 0, color: 'text-purple-400' },
                      ].map(m => (
                        <div key={m.label} className="p-3 rounded-xl bg-white/3 border border-white/8 text-center">
                          <div className={`text-lg font-black ${m.color}`}>{m.value}</div>
                          <div className="text-xs text-white/30 mt-0.5">{m.label}</div>
                        </div>
                      ))}
                    </div>
                    <div className="text-xs text-white/30">Duration: {result.durationMs}ms</div>
                  </div>
                )}

                {result?.error && (
                  <div className="p-3 rounded-xl bg-red-400/8 border border-red-400/20 text-sm text-red-400">
                    Error: {result.error}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right: History */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 mb-3">
            <History className="w-4 h-4 text-white/30" />
            <h2 className="text-sm font-semibold text-white/60 uppercase tracking-widest">Run History</h2>
          </div>
          {loadingHistory ? (
            <div className="text-center py-8"><Loader2 className="w-5 h-5 animate-spin text-white/20 mx-auto" /></div>
          ) : history.length === 0 ? (
            <div className="text-center py-8 text-xs text-white/25 border border-white/5 rounded-2xl">No pipeline runs yet</div>
          ) : (
            history.map(run => (
              <div key={run.id} className="p-3 rounded-xl bg-white/2 border border-white/8">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-semibold text-white/70 truncate">{run.pipelineName}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${STATUS_COLORS[run.status] || STATUS_COLORS.pending}`}>{run.status}</span>
                </div>
                <div className="text-xs text-white/25">{run.durationMs ? `${run.durationMs}ms` : ''} · {run.created_date ? new Date(run.created_date).toLocaleDateString() : ''}</div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}