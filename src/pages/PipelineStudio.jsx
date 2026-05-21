/**
 * Pipeline Studio — Phase 4 Upgrade
 * DBT/Airflow-style DAG visualization · 10-step data pipeline · Run history · Step logs
 */
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useWorkspaceStore } from '@/lib/store';
import {
  Play, CheckCircle2, AlertTriangle, Loader2, RefreshCw, XCircle,
  Database, Scissors, BarChart2, FileText, Zap, Clock,
  ChevronRight, Activity, GitMerge, History, ChevronLeft,
  Brain, Layers, Eye, Download, Info, RotateCcw, Terminal
} from 'lucide-react';
import { Link } from 'react-router-dom';

const PIPELINE_STEPS = [
  { id: 'raw_upload',        label: 'Raw Upload',           layer: 'Raw Layer',        icon: Database,   color: 'text-white/60',    desc: 'Source CSV/XLSX/JSON/API data ingested as-is' },
  { id: 'data_profiling',    label: 'Data Profiling',       layer: 'Staging Layer',    icon: Eye,        color: 'text-cyan-400',    desc: 'Column types, missing rates, uniqueness, distribution' },
  { id: 'data_cleaning',     label: 'Data Cleaning',        layer: 'Staging Layer',    icon: Scissors,   color: 'text-amber-400',   desc: 'Normalize names, fill nulls, remove duplicates, fix types' },
  { id: 'transformation',    label: 'Transformation',       layer: 'Intermediate Layer',icon: Layers,    color: 'text-purple-400',  desc: 'Calculated fields, joins, aggregations, reshaping' },
  { id: 'semantic_metrics',  label: 'Semantic Metrics',     layer: 'Semantic Layer',   icon: Zap,        color: 'text-yellow-400',  desc: 'Certified metric definitions, dimensions, formulas' },
  { id: 'sql_analysis',      label: 'SQL / Python Analysis',layer: 'Mart Layer',       icon: FileText,   color: 'text-green-400',   desc: 'Fact/dimension structure, analytical queries, aggregations' },
  { id: 'visual_builder',    label: 'Visual Builder',       layer: 'BI Layer',         icon: BarChart2,  color: 'text-teal-400',    desc: 'Chart specs, Tableau-style shelves, tooltip definitions' },
  { id: 'ai_analysis',       label: 'AI Agent Analysis',    layer: 'AI Layer',         icon: Brain,      color: 'text-pink-400',    desc: 'F-D-E-A-R reasoning, structured evidence, recommendations' },
  { id: 'report_generation', label: 'Report Generation',    layer: 'AI Layer',         icon: Activity,   color: 'text-orange-400',  desc: 'Decision Intelligence Reports with What/Why/Risk/Action' },
  { id: 'doc_export',        label: 'Documentation Export', layer: 'Documentation',    icon: Download,   color: 'text-blue-400',    desc: 'Project PDF, architecture diagrams, methodology export' },
];

const PIPELINE_TEMPLATES = [
  {
    id: 'full',
    name: 'Full Data Pipeline',
    desc: 'End-to-end: Raw → Profile → Clean → Transform → Metrics → SQL → Visual → AI → Report → Export',
    steps: PIPELINE_STEPS.map(s => s.id),
    color: 'text-purple-400', border: 'border-purple-400/25', bg: 'bg-purple-400/8',
  },
  {
    id: 'cleaning',
    name: 'Cleaning Pipeline',
    desc: 'Raw → Profile → Clean → Validate',
    steps: ['raw_upload', 'data_profiling', 'data_cleaning'],
    color: 'text-amber-400', border: 'border-amber-400/25', bg: 'bg-amber-400/8',
  },
  {
    id: 'analytics',
    name: 'Analytics Pipeline',
    desc: 'Profile → Metrics → SQL → Visual Builder → AI Analysis',
    steps: ['data_profiling', 'semantic_metrics', 'sql_analysis', 'visual_builder', 'ai_analysis'],
    color: 'text-cyan-400', border: 'border-cyan-400/25', bg: 'bg-cyan-400/8',
  },
  {
    id: 'reporting',
    name: 'Reporting Pipeline',
    desc: 'AI Analysis → Report Generation → Documentation Export',
    steps: ['ai_analysis', 'report_generation', 'doc_export'],
    color: 'text-teal-400', border: 'border-teal-400/25', bg: 'bg-teal-400/8',
  },
];

const STATUS_STYLES = {
  pending:  { text: 'text-white/30',   bg: 'bg-white/5',        border: 'border-white/10',      icon: Clock },
  running:  { text: 'text-cyan-400',   bg: 'bg-cyan-400/10',    border: 'border-cyan-400/20',   icon: Loader2 },
  success:  { text: 'text-green-400',  bg: 'bg-green-400/10',   border: 'border-green-400/20',  icon: CheckCircle2 },
  warning:  { text: 'text-amber-400',  bg: 'bg-amber-400/10',   border: 'border-amber-400/20',  icon: AlertTriangle },
  failed:   { text: 'text-red-400',    bg: 'bg-red-400/10',     border: 'border-red-400/20',    icon: XCircle },
  skipped:  { text: 'text-white/25',   bg: 'bg-white/3',        border: 'border-white/8',       icon: ChevronRight },
};

function StepNode({ step, status, duration, warnings, errors, output, onRetry, isActive }) {
  const [expanded, setExpanded] = useState(false);
  const ss = STATUS_STYLES[status] || STATUS_STYLES.pending;
  const Icon = status === 'running' ? Loader2 : ss.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl border transition-all ${ss.border} ${isActive ? ss.bg : 'bg-white/2'}`}
    >
      <div className="flex items-center gap-3 p-3 cursor-pointer" onClick={() => setExpanded(e => !e)}>
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${ss.bg} border ${ss.border}`}>
          <Icon className={`w-4 h-4 ${ss.text} ${status === 'running' ? 'animate-spin' : ''}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-sm font-semibold ${ss.text}`}>{step.label}</span>
            <span className="text-xs text-white/25">{step.layer}</span>
            {duration > 0 && <span className="text-xs text-white/25 font-mono">{duration}ms</span>}
            {warnings?.length > 0 && <span className="text-xs text-amber-400/70">{warnings.length} warn</span>}
            {errors?.length > 0 && <span className="text-xs text-red-400/70">{errors.length} err</span>}
          </div>
          <p className="text-xs text-white/30 mt-0.5 truncate">{step.desc}</p>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full border font-mono ${ss.text} ${ss.bg} ${ss.border}`}>{status}</span>
        {status === 'failed' && onRetry && (
          <button onClick={e => { e.stopPropagation(); onRetry(step.id); }}
            className="flex items-center gap-1 px-2 py-1 bg-red-400/10 border border-red-400/20 text-red-400 rounded-lg text-xs hover:bg-red-400/15 transition-all">
            <RotateCcw className="w-3 h-3" /> Retry
          </button>
        )}
      </div>
      <AnimatePresence>
        {expanded && (status === 'success' || status === 'warning' || status === 'failed') && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className="px-4 pb-4 border-t border-white/5 space-y-2 overflow-hidden">
            {output && Object.entries(output).slice(0, 8).map(([k, v]) => (
              <div key={k} className="flex items-center gap-2 text-xs">
                <span className="text-white/30 w-28 flex-shrink-0">{k.replace(/_/g, ' ')}</span>
                <span className="text-white/60 font-mono">{typeof v === 'object' ? JSON.stringify(v).slice(0, 60) : String(v)}</span>
              </div>
            ))}
            {warnings?.map((w, i) => (
              <div key={i} className="text-xs text-amber-400/70 flex gap-1"><AlertTriangle className="w-3 h-3 flex-shrink-0 mt-0.5" />{w}</div>
            ))}
            {errors?.map((e, i) => (
              <div key={i} className="text-xs text-red-400/70 flex gap-1"><XCircle className="w-3 h-3 flex-shrink-0 mt-0.5" />{e}</div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function DAGView({ steps, stepStatuses }) {
  return (
    <div className="p-4 rounded-2xl border border-white/8 bg-white/1 overflow-x-auto">
      <div className="text-xs text-white/25 uppercase tracking-widest mb-3 font-semibold">DAG — Data Pipeline Graph</div>
      <div className="flex items-center gap-0 min-w-max flex-wrap">
        {steps.map((step, i) => {
          const ss = stepStatuses[step.id] || 'pending';
          const styles = STATUS_STYLES[ss] || STATUS_STYLES.pending;
          return (
            <div key={step.id} className="flex items-center gap-0">
              <div className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl border ${styles.border} ${styles.bg} min-w-[90px] text-center`}>
                <step.icon className={`w-4 h-4 ${styles.text} ${ss === 'running' ? 'animate-spin' : ''}`} />
                <span className={`text-xs font-semibold leading-tight ${styles.text}`}>{step.label}</span>
                <span className="text-xs text-white/20">{step.layer.split(' ')[0]}</span>
              </div>
              {i < steps.length - 1 && (
                <ChevronRight className="w-4 h-4 text-white/15 flex-shrink-0" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function PipelineStudio() {
  const { getActiveTable } = useWorkspaceStore();
  const activeTable = getActiveTable();
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [running, setRunning] = useState(false);
  const [stepStatuses, setStepStatuses] = useState({});
  const [stepOutputs, setStepOutputs] = useState({});
  const [activeStep, setActiveStep] = useState(null);
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [tab, setTab] = useState('run');
  const [runResult, setRunResult] = useState(null);

  useEffect(() => {
    base44.entities.PipelineRun.list('-created_date', 20)
      .then(r => setHistory(r)).catch(() => {})
      .finally(() => setLoadingHistory(false));
  }, []);

  const selectedSteps = selectedTemplate
    ? PIPELINE_STEPS.filter(s => selectedTemplate.steps.includes(s.id))
    : [];

  const simulateStep = async (stepId, delayMs = 600) => {
    setActiveStep(stepId);
    setStepStatuses(prev => ({ ...prev, [stepId]: 'running' }));
    await new Promise(r => setTimeout(r, delayMs));
  };

  const runPipeline = async () => {
    if (!selectedTemplate || !activeTable) return;
    setRunning(true);
    setStepStatuses({});
    setStepOutputs({});
    setRunResult(null);
    const startTime = Date.now();

    for (const stepId of selectedTemplate.steps) {
      await simulateStep(stepId, 400 + Math.random() * 400);
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
      const data = res.data;
      const duration = Date.now() - startTime;

      // Map step results back
      const newStatuses = {};
      const newOutputs = {};
      for (const stepId of selectedTemplate.steps) {
        const stepResult = data?.steps?.find(s => s.step === stepId);
        newStatuses[stepId] = stepResult?.status || 'success';
        newOutputs[stepId] = { output: stepResult?.output, warnings: stepResult?.warnings, errors: stepResult?.errors };
      }
      setStepStatuses(newStatuses);
      setStepOutputs(newOutputs);
      setRunResult({ ...data, duration });

      // Save PipelineRun record
      await base44.entities.PipelineRun.create({
        pipelineName: selectedTemplate.name,
        datasetId: activeTable.name,
        status: Object.values(newStatuses).some(s => s === 'failed') ? 'failed' : 'success',
        steps: selectedTemplate.steps,
        startedAt: new Date(startTime).toISOString(),
        completedAt: new Date().toISOString(),
        durationMs: duration,
        warnings: [],
        errors: [],
      }).catch(() => {});

      const runs = await base44.entities.PipelineRun.list('-created_date', 20).catch(() => []);
      setHistory(runs);
    } catch (e) {
      for (const stepId of selectedTemplate.steps) {
        setStepStatuses(prev => ({ ...prev, [stepId]: prev[stepId] === 'running' ? 'failed' : prev[stepId] || 'pending' }));
      }
      setRunResult({ error: e.message });
    }
    setActiveStep(null);
    setRunning(false);
  };

  const allDone = !running && runResult && !runResult.error;
  const hasError = !running && runResult?.error;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="border-b border-white/8 px-8 py-5 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <Link to="/workspace" className="p-1.5 rounded-lg text-white/30 hover:text-white/70 hover:bg-white/5 transition-all">
            <ChevronLeft className="w-4 h-4" />
          </Link>
          <div className="w-10 h-10 rounded-xl bg-purple-400/15 border border-purple-400/25 flex items-center justify-center">
            <GitMerge className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h1 className="text-xl font-black">Pipeline Studio</h1>
            <p className="text-xs text-muted-foreground">DBT/Airflow-style DAG · Raw → Staging → Intermediate → Mart → Semantic → BI → AI → Docs</p>
          </div>
        </div>
        {activeTable ? (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-cyan-400/8 border border-cyan-400/15 text-xs text-cyan-400">
            <Database className="w-3.5 h-3.5" /> {activeTable.name} · {activeTable.rows?.length?.toLocaleString()} rows
          </div>
        ) : (
          <div className="px-3 py-1.5 rounded-xl bg-amber-400/8 border border-amber-400/15 text-xs text-amber-400">
            ⚠ Load dataset in Workspace first
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-white/8 px-8 flex gap-0">
        {[{ id: 'run', label: 'Run Pipeline', icon: Play }, { id: 'history', label: `Run History (${history.length})`, icon: History }].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-3 text-xs font-semibold border-b-2 transition-all ${tab === t.id ? 'border-purple-400 text-purple-400' : 'border-transparent text-white/35 hover:text-white/65'}`}>
            <t.icon className="w-3.5 h-3.5" />{t.label}
          </button>
        ))}
      </div>

      <div className="flex flex-1 overflow-hidden">
        {tab === 'run' && (
          <>
            {/* Left: Templates */}
            <div className="w-72 border-r border-white/8 p-4 overflow-y-auto space-y-3 flex-shrink-0">
              <div className="text-xs text-white/25 uppercase tracking-widest font-semibold mb-3">Pipeline Templates</div>
              {PIPELINE_TEMPLATES.map(t => (
                <button key={t.id} onClick={() => { setSelectedTemplate(t); setStepStatuses({}); setRunResult(null); }}
                  className={`w-full text-left p-3 rounded-xl border transition-all ${selectedTemplate?.id === t.id ? `${t.bg} ${t.border}` : 'border-white/8 bg-white/2 hover:border-white/18'}`}>
                  <div className={`text-sm font-bold ${selectedTemplate?.id === t.id ? t.color : 'text-white/70'}`}>{t.name}</div>
                  <div className="text-xs text-white/30 mt-0.5 leading-relaxed">{t.desc}</div>
                  <div className="text-xs text-white/20 mt-1.5">{t.steps.length} steps</div>
                </button>
              ))}

              {/* Layer Legend */}
              <div className="mt-4 p-3 rounded-xl bg-white/2 border border-white/8 space-y-1.5">
                <div className="text-xs text-white/30 font-semibold mb-2">Layer Reference</div>
                {[
                  { name: 'Raw Layer', desc: 'Source data as-is', color: 'text-white/40' },
                  { name: 'Staging Layer', desc: 'Cleaned + typed', color: 'text-cyan-400/70' },
                  { name: 'Intermediate', desc: 'Joins + transforms', color: 'text-purple-400/70' },
                  { name: 'Mart Layer', desc: 'Fact/dimension', color: 'text-green-400/70' },
                  { name: 'Semantic Layer', desc: 'Certified metrics', color: 'text-yellow-400/70' },
                  { name: 'BI Layer', desc: 'Charts + dashboards', color: 'text-teal-400/70' },
                  { name: 'AI Layer', desc: 'Agents + reports', color: 'text-pink-400/70' },
                  { name: 'Documentation', desc: 'PDF + export', color: 'text-blue-400/70' },
                ].map(l => (
                  <div key={l.name} className="flex gap-2 text-xs">
                    <span className={`w-28 font-mono ${l.color} flex-shrink-0`}>{l.name}</span>
                    <span className="text-white/25">{l.desc}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: DAG + Steps */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {!selectedTemplate && (
                <div className="flex items-center justify-center h-64 text-white/20 text-sm">
                  <div className="text-center"><GitMerge className="w-10 h-10 mx-auto mb-3 opacity-30" />Select a pipeline template to start</div>
                </div>
              )}

              {selectedTemplate && (
                <>
                  {/* DAG view */}
                  <DAGView steps={selectedSteps} stepStatuses={stepStatuses} />

                  {/* Run button */}
                  <button onClick={runPipeline} disabled={running || !activeTable}
                    className="w-full flex items-center justify-center gap-2 px-5 py-3.5 bg-purple-400/15 border border-purple-400/25 text-purple-400 rounded-2xl font-bold text-sm hover:bg-purple-400/20 transition-all disabled:opacity-40">
                    {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                    {running ? `Running ${selectedTemplate.name}…` : `Run ${selectedTemplate.name}`}
                  </button>

                  {/* Steps */}
                  {(running || Object.keys(stepStatuses).length > 0) && (
                    <div className="space-y-2">
                      <div className="text-xs text-white/25 uppercase tracking-widest font-semibold flex items-center gap-2">
                        <Terminal className="w-3.5 h-3.5" /> Step Execution Log
                      </div>
                      {selectedSteps.map(step => (
                        <StepNode
                          key={step.id}
                          step={step}
                          status={stepStatuses[step.id] || 'pending'}
                          duration={stepOutputs[step.id]?.output?.durationMs}
                          warnings={stepOutputs[step.id]?.warnings}
                          errors={stepOutputs[step.id]?.errors}
                          output={stepOutputs[step.id]?.output}
                          isActive={activeStep === step.id}
                          onRetry={(id) => { /* retry logic */ }}
                        />
                      ))}
                    </div>
                  )}

                  {/* Result summary */}
                  {allDone && (
                    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                      className="p-5 rounded-2xl border border-green-400/20 bg-green-400/5 space-y-3">
                      <div className="flex items-center gap-2 text-green-400 font-bold text-sm">
                        <CheckCircle2 className="w-4 h-4" /> Pipeline Complete · {runResult.duration}ms
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {[
                          { label: 'Quality Score', value: `${runResult?.profile?.qualityScore || runResult?.qualityScore || '—'}%`, color: 'text-green-400' },
                          { label: 'Rows Processed', value: (runResult?.profile?.rowCount || activeTable?.rows?.length || 0).toLocaleString(), color: 'text-cyan-400' },
                          { label: 'Steps Completed', value: selectedTemplate.steps.length, color: 'text-purple-400' },
                          { label: 'Duration', value: `${runResult.duration}ms`, color: 'text-amber-400' },
                        ].map(m => (
                          <div key={m.label} className="p-3 rounded-xl bg-white/4 border border-white/8 text-center">
                            <div className={`text-lg font-black ${m.color}`}>{m.value}</div>
                            <div className="text-xs text-white/30 mt-0.5">{m.label}</div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  {hasError && (
                    <div className="p-4 rounded-xl bg-red-400/8 border border-red-400/20 text-sm text-red-400 flex items-start gap-2">
                      <XCircle className="w-4 h-4 flex-shrink-0 mt-0.5" /> Pipeline error: {runResult.error}
                    </div>
                  )}
                </>
              )}
            </div>
          </>
        )}

        {tab === 'history' && (
          <div className="flex-1 overflow-y-auto p-6">
            {loadingHistory ? (
              <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 text-white/30 animate-spin" /></div>
            ) : history.length === 0 ? (
              <div className="text-center py-16 text-white/25 text-sm">
                <History className="w-10 h-10 mx-auto mb-3 opacity-30" />No pipeline runs yet. Run a pipeline to see history.
              </div>
            ) : (
              <div className="space-y-3 max-w-3xl">
                <div className="text-xs text-white/25 uppercase tracking-widest font-semibold mb-4">Pipeline Run History</div>
                {history.map((run, i) => (
                  <motion.div key={run.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                    className={`p-4 rounded-2xl border transition-all ${run.status === 'success' ? 'border-green-400/15 bg-green-400/3' : run.status === 'failed' ? 'border-red-400/15 bg-red-400/3' : 'border-white/8 bg-white/2'}`}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${run.status === 'success' ? 'bg-green-400' : run.status === 'failed' ? 'bg-red-400' : 'bg-amber-400'}`} />
                        <div>
                          <div className="text-sm font-semibold text-white/80">{run.pipelineName}</div>
                          <div className="text-xs text-white/30 mt-0.5">
                            {run.datasetId} · {run.durationMs ? `${run.durationMs}ms` : '—'} · {run.created_date ? new Date(run.created_date).toLocaleString() : ''}
                          </div>
                        </div>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-semibold ${run.status === 'success' ? 'text-green-400 border-green-400/20 bg-green-400/10' : run.status === 'failed' ? 'text-red-400 border-red-400/20 bg-red-400/10' : 'text-amber-400 border-amber-400/20 bg-amber-400/10'}`}>
                        {run.status}
                      </span>
                    </div>
                    {run.steps?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {run.steps.map(s => (
                          <span key={s} className="text-xs px-1.5 py-0.5 rounded bg-white/5 text-white/25 font-mono">{s}</span>
                        ))}
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}