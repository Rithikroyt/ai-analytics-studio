/**
 * Demo Mode — Guided Tour for OmniData AI Analytics Studio
 * Showcases full workflow: Dataset → Quality → Clean → KPIs → SQL → Chart → AI → Report → Admin
 */
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { DEMO_DATASETS } from '@/lib/demoDatasets';
import { useWorkspaceStore } from '@/lib/store';
import {
  CheckCircle2, Circle, ChevronRight, ChevronDown, ChevronUp,
  Play, Zap, Database, Shield, BarChart2, Brain, FileText,
  TrendingUp, Eye, Package, ArrowRight, Download, Users,
  Target, Activity, Star, BookOpen, Sparkles
} from 'lucide-react';

const DEMO_STEPS = [
  {
    id: 'dataset',
    num: '01',
    label: 'Choose Demo Dataset',
    icon: Database,
    color: 'text-cyan-400',
    border: 'border-cyan-400/20',
    bg: 'bg-cyan-400/8',
    desc: 'Select a pre-built demo dataset to get started instantly without uploading a file.',
    action: 'Select Dataset Below',
    link: null,
  },
  {
    id: 'quality',
    num: '02',
    label: 'View Data Quality Score',
    icon: Shield,
    color: 'text-amber-400',
    border: 'border-amber-400/20',
    bg: 'bg-amber-400/8',
    desc: 'After loading the dataset, the Data Quality Engine runs automatically and scores your data across 5 dimensions.',
    action: 'Go to Data Engineering',
    link: '/data-engineering',
  },
  {
    id: 'clean',
    num: '03',
    label: 'Clean Dataset',
    icon: Zap,
    color: 'text-teal-400',
    border: 'border-teal-400/20',
    bg: 'bg-teal-400/8',
    desc: 'Run the automated cleaning pipeline — fix nulls, remove duplicates, standardize types.',
    action: 'Data Engineering Studio',
    link: '/data-engineering',
  },
  {
    id: 'kpis',
    num: '04',
    label: 'Define KPIs / Metrics',
    icon: Target,
    color: 'text-purple-400',
    border: 'border-purple-400/20',
    bg: 'bg-purple-400/8',
    desc: 'Go to Semantic Metric Store. Define Revenue, Margin, or Churn metrics with business definitions and formulas.',
    action: 'Semantic Metric Store',
    link: '/semantic-metrics',
  },
  {
    id: 'sql',
    num: '05',
    label: 'Run SQL Query',
    icon: Activity,
    color: 'text-green-400',
    border: 'border-green-400/20',
    bg: 'bg-green-400/8',
    desc: 'Use the SQL Workbench to run a natural language query like "monthly revenue trend". The AI generates validated SQL.',
    action: 'SQL Workbench',
    link: '/sql-workbench',
  },
  {
    id: 'chart',
    num: '06',
    label: 'Build a Chart',
    icon: BarChart2,
    color: 'text-pink-400',
    border: 'border-pink-400/20',
    bg: 'bg-pink-400/8',
    desc: 'Open Visual Builder. Drag fields to X/Y axes, select a chart type, and preview your visualization instantly.',
    action: 'Visual Builder',
    link: '/visual-builder',
  },
  {
    id: 'explain',
    num: '07',
    label: 'Explain the Chart (AI)',
    icon: Brain,
    color: 'text-blue-400',
    border: 'border-blue-400/20',
    bg: 'bg-blue-400/8',
    desc: 'Click "Explain Chart (AI)" in Visual Builder. The AI returns: what it shows, top insight, business meaning, and recommendations.',
    action: 'Visual Builder → Explain',
    link: '/visual-builder',
  },
  {
    id: 'agent',
    num: '08',
    label: 'Ask the AI Analyst',
    icon: Brain,
    color: 'text-purple-400',
    border: 'border-purple-400/20',
    bg: 'bg-purple-400/8',
    desc: 'Go to Agent Studio. Choose a persona and ask a question like "What are the top retention recommendations?"',
    action: 'Agent Studio',
    link: '/agent-studio',
  },
  {
    id: 'report',
    num: '09',
    label: 'Generate a Report',
    icon: FileText,
    color: 'text-orange-400',
    border: 'border-orange-400/20',
    bg: 'bg-orange-400/8',
    desc: 'Go to Decision Reports, select "Executive Summary", add optional context, and generate a full 17-section report.',
    action: 'Decision Reports',
    link: '/decision-reports',
  },
  {
    id: 'admin',
    num: '10',
    label: 'View Admin Trace',
    icon: Eye,
    color: 'text-teal-400',
    border: 'border-teal-400/20',
    bg: 'bg-teal-400/8',
    desc: 'Go to Observability Center → Agent Quality tab. Every AI question is traced with confidence score, SQL, and quality.',
    action: 'Observability Center',
    link: '/observability',
  },
  {
    id: 'export',
    num: '11',
    label: 'Export Project Documentation',
    icon: Package,
    color: 'text-amber-400',
    border: 'border-amber-400/20',
    bg: 'bg-amber-400/8',
    desc: 'Go to Admin → Project Documentation. Fill metadata and click "Generate PDF" to produce a full project report.',
    action: 'Project Documentation',
    link: '/admin/project-documentation',
  },
];

function DatasetCard({ dataset, selected, onSelect }) {
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      onClick={() => onSelect(dataset)}
      className={`w-full text-left p-5 rounded-2xl border transition-all ${
        selected ? `${dataset.borderClass} ${dataset.bgClass}` : 'border-white/8 bg-white/2 hover:border-white/15'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className={`text-2xl flex-shrink-0 mt-0.5`}>{dataset.emoji}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-sm font-bold ${selected ? dataset.colorClass : 'text-white/75'}`}>{dataset.name}</span>
            {selected && <CheckCircle2 className={`w-3.5 h-3.5 ${dataset.colorClass}`} />}
          </div>
          <p className="text-xs text-white/45 leading-relaxed mb-2">{dataset.description}</p>
          <div className="flex flex-wrap gap-1">
            {dataset.kpis.slice(0, 3).map(k => (
              <span key={k} className="text-xs px-2 py-0.5 rounded-lg bg-white/5 border border-white/8 text-white/40">{k}</span>
            ))}
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <div className={`text-xs font-mono ${dataset.colorClass}`}>{dataset.rows.length} rows</div>
          <div className="text-xs text-white/25">{dataset.columns.length} cols</div>
        </div>
      </div>
    </motion.button>
  );
}

function StepCard({ step, index, completed, active, onToggle }) {
  const Icon = step.icon;
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className={`rounded-2xl border transition-all ${
        active ? `${step.border} ${step.bg}` :
        completed ? 'border-green-400/20 bg-green-400/5' :
        'border-white/8 bg-white/2'
      }`}
    >
      <div className="flex items-center gap-4 p-4">
        <button
          onClick={() => onToggle(step.id)}
          className={`w-7 h-7 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
            completed ? 'bg-green-400 border-green-400' : active ? `border-current ${step.color}` : 'border-white/20'
          }`}
        >
          {completed ? <CheckCircle2 className="w-4 h-4 text-background" /> : <span className={`text-xs font-black ${active ? step.color : 'text-white/30'}`}>{step.num}</span>}
        </button>
        <div className="flex-1 min-w-0">
          <div className={`text-sm font-bold ${completed ? 'text-white/40 line-through' : active ? step.color : 'text-white/70'}`}>{step.label}</div>
          {active && <p className="text-xs text-white/50 mt-1 leading-relaxed">{step.desc}</p>}
        </div>
        {step.link && (
          <Link to={step.link} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold flex-shrink-0 transition-all ${step.bg} border ${step.border} ${step.color} hover:opacity-80`}>
            <ArrowRight className="w-3 h-3" /> Go
          </Link>
        )}
      </div>
    </motion.div>
  );
}

export default function DemoMode() {
  const [selectedDataset, setSelectedDataset] = useState(null);
  const [completedSteps, setCompletedSteps] = useState(new Set());
  const [activeStep, setActiveStep] = useState('dataset');
  const { addTable, setActiveTable } = useWorkspaceStore();

  const toggleStep = (stepId) => {
    setCompletedSteps(prev => {
      const next = new Set(prev);
      if (next.has(stepId)) next.delete(stepId);
      else next.add(stepId);
      return next;
    });
  };

  const loadDataset = (dataset) => {
    setSelectedDataset(dataset);
    // Load into workspace store
    const tableObj = {
      id: dataset.id,
      name: dataset.name,
      rows: dataset.rows,
      columns: dataset.columns,
      qualityScore: 85,
      readinessScore: 82,
    };
    addTable(tableObj);
    setActiveTable(dataset.id);
    toggleStep('dataset');
    setActiveStep('quality');
  };

  const progress = Math.round((completedSteps.size / DEMO_STEPS.length) * 100);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-white/8 px-8 py-6">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-400/15 border border-cyan-400/25 flex items-center justify-center">
              <Play className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h1 className="text-xl font-black">Guided Demo Mode</h1>
              <p className="text-xs text-muted-foreground">Follow the 11-step flow to experience the full OmniData platform</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-sm font-black text-cyan-400">{completedSteps.size}/{DEMO_STEPS.length}</div>
              <div className="text-xs text-white/30">steps done</div>
            </div>
            <div className="w-32 h-2 rounded-full bg-white/8 overflow-hidden">
              <motion.div className="h-full bg-cyan-400 rounded-full" animate={{ width: `${progress}%` }} />
            </div>
            <div className={`text-sm font-black ${progress === 100 ? 'text-green-400' : 'text-white/50'}`}>{progress}%</div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-8 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Dataset selector */}
        <div className="space-y-4">
          <div className="text-xs text-white/30 uppercase tracking-widest font-semibold">Step 1 — Choose Dataset</div>
          {DEMO_DATASETS.map(ds => (
            <DatasetCard
              key={ds.id}
              dataset={ds}
              selected={selectedDataset?.id === ds.id}
              onSelect={loadDataset}
            />
          ))}

          {selectedDataset && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className={`p-4 rounded-2xl border ${selectedDataset.borderClass} ${selectedDataset.bgClass}`}>
              <div className={`text-xs font-bold ${selectedDataset.colorClass} mb-3 uppercase tracking-widest`}>Sample Questions</div>
              <div className="space-y-2">
                {selectedDataset.suggestedQuestions.slice(0, 5).map((q, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-white/55">
                    <ChevronRight className={`w-3 h-3 ${selectedDataset.colorClass} flex-shrink-0 mt-0.5`} />
                    {q}
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </div>

        {/* Right: Steps checklist */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs text-white/30 uppercase tracking-widest font-semibold">Demo Checklist — 11 Steps</div>
            <button onClick={() => setCompletedSteps(new Set())}
              className="text-xs text-white/25 hover:text-white/50 transition-all px-2 py-1 rounded-lg hover:bg-white/5">
              Reset
            </button>
          </div>

          {DEMO_STEPS.map((step, i) => (
            <StepCard
              key={step.id}
              step={step}
              index={i}
              completed={completedSteps.has(step.id)}
              active={activeStep === step.id && !completedSteps.has(step.id)}
              onToggle={toggleStep}
            />
          ))}

          {progress === 100 && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              className="p-6 rounded-2xl border border-green-400/25 bg-green-400/8 text-center">
              <Star className="w-8 h-8 text-green-400 mx-auto mb-2" />
              <div className="text-lg font-black text-green-400 mb-1">Demo Complete!</div>
              <p className="text-sm text-white/50 mb-4">You've completed the full OmniData workflow demo.</p>
              <div className="flex flex-wrap gap-3 justify-center">
                <Link to="/handover" className="px-4 py-2 bg-amber-400/15 border border-amber-400/25 text-amber-400 rounded-xl text-xs font-bold hover:bg-amber-400/20 transition-all">
                  View Sale Package
                </Link>
                <Link to="/decision-reports" className="px-4 py-2 bg-cyan-400/15 border border-cyan-400/25 text-cyan-400 rounded-xl text-xs font-bold hover:bg-cyan-400/20 transition-all">
                  Generate Report
                </Link>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}