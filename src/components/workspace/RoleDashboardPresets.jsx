/**
 * RoleDashboardPresets — personalized dashboard views for the 4 core analyst roles.
 */
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWorkspaceStore } from '@/lib/store';
import {
  BarChart2, Brain, TrendingUp, Briefcase, ChevronRight, Zap,
  Database, FileText, Target, Activity, Shield, Sparkles,
  ArrowRight, CheckCircle2, Star, Loader2
} from 'lucide-react';

const ROLES = [
  {
    id: 'data_analyst',
    label: 'Data Analyst',
    icon: BarChart2,
    color: 'text-cyan-400',
    bg: 'bg-cyan-400/10',
    border: 'border-cyan-400/30',
    desc: 'Explore, clean, visualize, and report on data with SQL and charts.',
    workflow: ['Upload Data', 'Profile & Clean', 'SQL Studio', 'Build Charts', 'AI Analysis', 'Export Report'],
    tools: [
      { section: 'intake', label: 'Upload Data', icon: Database, color: 'text-cyan-400' },
      { section: 'quality', label: 'Data Quality', icon: Shield, color: 'text-green-400' },
      { section: 'sql', label: 'SQL Studio', icon: FileText, color: 'text-blue-400' },
      { section: 'visual', label: 'Visual Builder', icon: BarChart2, color: 'text-teal-400' },
      { section: 'analyst', label: 'AI Analyst', icon: Brain, color: 'text-purple-400' },
      { section: 'reports', label: 'Reports', icon: FileText, color: 'text-pink-400' },
    ],
    questions: [
      'What are the top trends in this dataset?',
      'Which columns have data quality issues?',
      'Show me the distribution of key metrics',
      'What KPIs should I track?',
      'Are there any anomalies or outliers?',
    ],
    bundle: 'sales_revenue',
  },
  {
    id: 'business_analyst',
    label: 'Business Analyst',
    icon: Briefcase,
    color: 'text-blue-400',
    bg: 'bg-blue-400/10',
    border: 'border-blue-400/30',
    desc: 'Frame problems, define KPIs, build business cases, and recommend actions.',
    workflow: ['Define Problem', 'Load Data', 'KPI Analysis', 'Gap Analysis', 'Decision Matrix', 'Stakeholder Report'],
    tools: [
      { section: 'intake', label: 'Load Data', icon: Database, color: 'text-cyan-400' },
      { section: 'statistics', label: 'Statistics', icon: Activity, color: 'text-indigo-400' },
      { section: 'compare', label: 'Compare', icon: Target, color: 'text-amber-400' },
      { section: 'analyst', label: 'AI Analyst', icon: Brain, color: 'text-purple-400' },
      { section: 'contribution', label: 'Contribution', icon: BarChart2, color: 'text-teal-400' },
      { section: 'reports', label: 'Reports', icon: FileText, color: 'text-pink-400' },
    ],
    questions: [
      'Why are costs increasing faster than revenue?',
      'What are the key business risks?',
      'Create a problem statement and root cause analysis',
      'What gaps exist between current and desired state?',
      'Which segment needs the most attention?',
    ],
    bundle: 'finance_operations',
  },
  {
    id: 'marketing_analyst',
    label: 'Marketing Analyst',
    icon: TrendingUp,
    color: 'text-pink-400',
    bg: 'bg-pink-400/10',
    border: 'border-pink-400/30',
    desc: 'Analyze campaigns, funnels, CLV, CAC, and A/B tests for growth.',
    workflow: ['Campaign Data', 'Funnel Analysis', 'Segmentation', 'CLV / CAC', 'A/B Tests', 'Growth Report'],
    tools: [
      { section: 'intake', label: 'Load Data', icon: Database, color: 'text-cyan-400' },
      { section: 'funnel', label: 'Funnel Analysis', icon: Target, color: 'text-pink-400' },
      { section: 'rfm', label: 'RFM Segments', icon: TrendingUp, color: 'text-orange-400' },
      { section: 'clv', label: 'CLV Model', icon: Star, color: 'text-amber-400' },
      { section: 'abtest', label: 'A/B Testing', icon: Zap, color: 'text-purple-400' },
      { section: 'analyst', label: 'AI Analyst', icon: Brain, color: 'text-purple-400' },
    ],
    questions: [
      'Which campaign channel has the best ROAS?',
      'Calculate CAC, ROAS, and CLV from this data',
      'Which customer segments are most valuable?',
      'What is the funnel conversion rate and drop-off?',
      'Identify churn risk signals',
    ],
    bundle: 'marketing_campaigns',
  },
  {
    id: 'data_scientist',
    label: 'Data Scientist',
    icon: Brain,
    color: 'text-purple-400',
    bg: 'bg-purple-400/10',
    border: 'border-purple-400/30',
    desc: 'Build ML models, forecast, detect anomalies, and explain predictions.',
    workflow: ['Feature Engineering', 'Model Selection', 'Train & Evaluate', 'Forecast', 'Explain (SHAP)', 'Deploy'],
    tools: [
      { section: 'intake', label: 'Load Data', icon: Database, color: 'text-cyan-400' },
      { section: 'statistics', label: 'Statistics', icon: Activity, color: 'text-indigo-400' },
      { section: 'cohort', label: 'Cohort Analysis', icon: Target, color: 'text-teal-400' },
      { section: 'sql', label: 'Python / SQL', icon: FileText, color: 'text-green-400' },
      { section: 'analyst', label: 'AI Scientist', icon: Brain, color: 'text-purple-400' },
      { section: 'observability', label: 'Observability', icon: Activity, color: 'text-white/60' },
    ],
    questions: [
      'What ML model should I use to predict this outcome?',
      'Run a feature importance and correlation analysis',
      'Detect anomalies in the time series data',
      'Cluster customers into meaningful segments',
      'What is the 6-month forecast?',
    ],
    bundle: 'hr_workforce',
  },
];

function WorkflowStep({ step, index, colorClass }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black border ${colorClass} flex-shrink-0`}
        style={{ borderColor: 'rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.06)' }}>
        {index + 1}
      </div>
      <span className="text-xs text-white/55 whitespace-nowrap">{step}</span>
      {index < 5 && <ChevronRight className="w-3 h-3 text-white/15 flex-shrink-0" />}
    </div>
  );
}

export default function RoleDashboardPresets() {
  const [selectedRole, setSelectedRole] = useState(null);
  const [loadingBundle, setLoadingBundle] = useState(false);
  const { setActiveSection, loadSampleBundle, tables } = useWorkspaceStore();

  const role = ROLES.find(r => r.id === selectedRole);

  const handleLoadBundle = async (bundleKey) => {
    setLoadingBundle(true);
    loadSampleBundle(bundleKey);
    await new Promise(res => setTimeout(res, 250));
    setLoadingBundle(false);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6 overflow-auto">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
          <span className="text-xs font-mono text-white/40 uppercase tracking-widest">Role-Based Workspaces</span>
        </div>
        <h1 className="text-2xl font-black mb-1">Dashboard Presets</h1>
        <p className="text-sm text-muted-foreground">Choose your role for a personalized workspace — tools, KPIs, and workflows tailored to your function.</p>
      </motion.div>

      {/* Role selector cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {ROLES.map((r, i) => (
          <motion.button
            key={r.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
            onClick={() => setSelectedRole(selectedRole === r.id ? null : r.id)}
            className={`text-left glass-card rounded-2xl p-5 border transition-all hover:scale-[1.02] ${selectedRole === r.id ? `${r.border} ${r.bg}` : 'border-white/8 hover:border-white/18'}`}
          >
            <div className={`w-10 h-10 rounded-xl ${r.bg} border ${r.border} flex items-center justify-center mb-3`}>
              <r.icon className={`w-5 h-5 ${r.color}`} />
            </div>
            <div className={`font-bold text-sm mb-1 ${r.color}`}>{r.label}</div>
            <div className="text-xs text-white/40 leading-relaxed mb-3">{r.desc}</div>
            <div className={`flex items-center gap-1 text-xs font-semibold ${selectedRole === r.id ? r.color : 'text-white/30'}`}>
              <span>{selectedRole === r.id ? 'Active' : 'Select'}</span>
              <ArrowRight className="w-3 h-3" />
            </div>
          </motion.button>
        ))}
      </div>

      {/* Expanded role workspace panel */}
      <AnimatePresence>
        {role && (
          <motion.div
            key={role.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className={`glass-card rounded-3xl border p-6 space-y-6 ${role.border}`}
          >
            {/* Header row */}
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-2xl ${role.bg} border ${role.border} flex items-center justify-center`}>
                  <role.icon className={`w-6 h-6 ${role.color}`} />
                </div>
                <div>
                  <h2 className={`text-xl font-black ${role.color}`}>{role.label} Workspace</h2>
                  <p className="text-sm text-white/45">{role.desc}</p>
                </div>
              </div>
              <button
                onClick={() => handleLoadBundle(role.bundle)}
                disabled={loadingBundle}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold border transition-all disabled:opacity-50 ${role.bg} ${role.border} ${role.color}`}
              >
                {loadingBundle
                  ? (<><Loader2 className="w-4 h-4 animate-spin" /><span>Loading...</span></>)
                  : (<><Zap className="w-4 h-4" /><span>Load Sample Data</span></>)
                }
              </button>
            </div>

            {/* Workflow */}
            <div>
              <div className="text-xs font-bold text-white/30 uppercase tracking-widest mb-3">Workflow</div>
              <div className="flex items-center gap-1 flex-wrap">
                {role.workflow.map((step, i) => (
                  <WorkflowStep key={step} step={step} index={i} colorClass={role.color} />
                ))}
              </div>
            </div>

            {/* Tools + Questions grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <div className="text-xs font-bold text-white/30 uppercase tracking-widest mb-3">Recommended Tools</div>
                <div className="grid grid-cols-2 gap-2">
                  {role.tools.map(tool => (
                    <button
                      key={tool.section}
                      onClick={() => setActiveSection(tool.section)}
                      className="flex items-center gap-2 px-3 py-2.5 glass-card rounded-xl border border-white/8 hover:border-white/20 text-left transition-all group"
                    >
                      <tool.icon className={`w-4 h-4 ${tool.color} flex-shrink-0`} />
                      <span className="text-xs text-white/55 group-hover:text-white/90 transition-colors">{tool.label}</span>
                      <ChevronRight className="w-3 h-3 text-white/15 group-hover:text-white/45 ml-auto" />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-xs font-bold text-white/30 uppercase tracking-widest mb-3">Example AI Analyst Questions</div>
                <div className="space-y-2">
                  {role.questions.map((q, i) => (
                    <button
                      key={i}
                      onClick={() => setActiveSection('analyst')}
                      className="w-full text-left flex items-start gap-2 px-3 py-2 bg-white/3 border border-white/6 rounded-xl hover:border-white/15 hover:bg-white/5 transition-all group"
                    >
                      <CheckCircle2 className={`w-3.5 h-3.5 flex-shrink-0 mt-0.5 ${role.color}`} />
                      <span className="text-xs text-white/50 group-hover:text-white/80 leading-relaxed transition-colors">{q}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Dataset status */}
            {tables.length > 0 && (
              <div className="flex items-center gap-3 p-3 bg-green-400/5 border border-green-400/15 rounded-xl">
                <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
                <span className="text-xs text-green-400">
                  Dataset ready: <strong>{tables[0]?.name}</strong> &middot; {tables[0]?.rowCount?.toLocaleString()} rows
                </span>
                <button onClick={() => setActiveSection('analyst')} className="ml-auto text-xs font-bold text-green-400 hover:opacity-80 flex items-center gap-1">
                  Ask AI Analyst <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}