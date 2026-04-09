import { useState } from 'react';
import { motion } from 'framer-motion';
import { useWorkspaceStore } from '@/lib/store';
import {
  Database, BarChart3, Brain, FileText, Zap, ArrowRight,
  CheckCircle2, AlertTriangle, Loader2, TrendingUp, TrendingDown,
  Activity, Target, Upload, Layers, GitBranch, Shield,
  Sparkles, Bot, Clock, PieChart
} from 'lucide-react';
import { runAIAnalysis } from '@/lib/aiAnalyzer';
import { Link } from 'react-router-dom';

const bundles = [
  { key: 'sales', label: 'Sales & Revenue', desc: '2,304 rows · 12 cols · 2023–2024', icon: '📊', color: 'border-cyan-400/30 bg-cyan-400/5', tag: 'Revenue · Forecast · Regional' },
  { key: 'workforce', label: 'Workforce & Payroll', desc: '131 employees · 10 columns', icon: '👥', color: 'border-teal-400/30 bg-teal-400/5', tag: 'HR · Attrition · Salary Bands' },
  { key: 'healthcare', label: 'Healthcare Operations', desc: '84 rows · 11 cols · 12 months', icon: '🏥', color: 'border-blue-400/30 bg-blue-400/5', tag: 'Clinical · Quality · Throughput' },
  { key: 'education', label: 'Student Engagement', desc: '480 rows · 12 cols · 2024', icon: '🎓', color: 'border-purple-400/30 bg-purple-400/5', tag: 'Retention · Completion · Revenue' },
];

const quickActions = [
  { id: 'intake', icon: Upload, label: 'Upload Data', desc: 'Add CSV, XLSX, or JSON files', color: 'text-cyan-400', bg: 'bg-cyan-400/10', border: 'border-cyan-400/20' },
  { id: 'story', icon: BarChart3, label: 'View Dashboard', desc: 'Storytelling analytics view', color: 'text-teal-400', bg: 'bg-teal-400/10', border: 'border-teal-400/20' },
  { id: 'analyst', icon: Brain, label: 'Ask AI Analyst', desc: 'Natural language analysis', color: 'text-purple-400', bg: 'bg-purple-400/10', border: 'border-purple-400/20' },
  { id: 'reports', icon: FileText, label: 'Generate Report', desc: 'Export board-ready docs', color: 'text-pink-400', bg: 'bg-pink-400/10', border: 'border-pink-400/20' },
  { id: 'sql', icon: GitBranch, label: 'SQL Studio', desc: 'Query with natural language', color: 'text-amber-400', bg: 'bg-amber-400/10', border: 'border-amber-400/20' },
  { id: 'compare', icon: Layers, label: 'Compare Datasets', desc: 'Side-by-side delta analysis', color: 'text-blue-400', bg: 'bg-blue-400/10', border: 'border-blue-400/20' },
];

const fmtV = (v) => {
  if (v == null || isNaN(v)) return '—';
  const n = Number(v);
  if (Math.abs(n) >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
  if (Math.abs(n) >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (Math.abs(n) >= 1e3) return `${(n / 1e3).toFixed(0)}K`;
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
};

export default function OverviewSection() {
  const { loadSampleBundle, setActiveSection, setAnalysisResults, tables, analysisResults, savedCharts, stories, alerts } = useWorkspaceStore();
  const [loadingBundle, setLoadingBundle] = useState('');

  const handleLoadBundle = async (key) => {
    setLoadingBundle(key);
    try {
      loadSampleBundle(key);
      const { sampleBundles } = await import('@/lib/sampleData');
      const bundle = sampleBundles[key];
      if (bundle?.tables?.[0]) {
        try {
          const analysis = await runAIAnalysis(bundle.tables[0]);
          setAnalysisResults(analysis);
        } catch (e) {
          setAnalysisResults(bundle.analysisResults);
        }
      }
    } catch (e) {
      // fallback — bundle still loaded from loadSampleBundle
    }
    setLoadingBundle('');
    setActiveSection('story');
  };

  const r = analysisResults;
  const activeTable = tables[0] || null;

  return (
    <div className="p-6 space-y-8 max-w-6xl mx-auto overflow-auto">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          <span className="text-xs font-mono text-white/40 uppercase tracking-widest">AI Agent Analytics Workspace</span>
        </div>
        <h1 className="text-2xl font-black mb-1">Welcome back</h1>
        <p className="text-sm text-muted-foreground">Upload data or load a sample bundle to begin your analysis.</p>
      </motion.div>

      {/* Stats strip — shown when workspace has data */}
      {(tables.length > 0 || savedCharts.length > 0 || stories.length > 0) && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Datasets', value: tables.length, icon: Database, color: 'text-cyan-400', bg: 'bg-cyan-400/10' },
            { label: 'Saved Charts', value: savedCharts.length, icon: BarChart3, color: 'text-teal-400', bg: 'bg-teal-400/10' },
            { label: 'Stories', value: stories.length, icon: FileText, color: 'text-purple-400', bg: 'bg-purple-400/10' },
            { label: 'Active Alerts', value: alerts.filter(a => a.active).length, icon: Activity, color: 'text-amber-400', bg: 'bg-amber-400/10' },
          ].map((stat) => (
            <div key={stat.label} className="glass-card rounded-xl p-4 border border-white/5 flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl ${stat.bg} flex items-center justify-center flex-shrink-0`}>
                <stat.icon className={`w-4 h-4 ${stat.color}`} />
              </div>
              <div>
                <div className={`text-xl font-black ${stat.color}`}>{stat.value}</div>
                <div className="text-xs text-muted-foreground">{stat.label}</div>
              </div>
            </div>
          ))}
        </motion.div>
      )}

      {/* Active dataset status */}
      {activeTable && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="glass-card rounded-2xl p-5 border border-cyan-400/15">
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                <span className="font-semibold">{activeTable.name}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-400/10 text-cyan-400 border border-cyan-400/20">Active</span>
              </div>
              <div className="text-sm text-muted-foreground mb-3">
                {activeTable.rowCount?.toLocaleString()} rows · {activeTable.columns?.length} columns · Quality Score: {activeTable.qualityScore}%
              </div>
              {activeTable.issues?.length > 0 && (
                <div className="flex items-center gap-1.5 text-xs text-amber-400 mb-2">
                  <AlertTriangle className="w-3 h-3" />
                  {activeTable.issues.length} data quality {activeTable.issues.length === 1 ? 'issue' : 'issues'} detected
                </div>
              )}
              {r && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
                  {[
                    { label: r.primaryLabel || 'KPI', value: fmtV(r.totalValue), color: 'text-cyan-400' },
                    { label: 'Growth Rate', value: r.growthRate != null ? `${r.growthRate > 0 ? '+' : ''}${r.growthRate}%` : '—', color: Number(r.growthRate) >= 0 ? 'text-green-400' : 'text-red-400' },
                    { label: 'Anomalies', value: String(r.anomalies?.length || 0), color: (r.anomalies?.length || 0) > 0 ? 'text-amber-400' : 'text-green-400' },
                    { label: 'Correlations', value: String(r.correlations?.length || 0), color: 'text-purple-400' },
                  ].map((m) => (
                    <div key={m.label} className="bg-white/3 rounded-xl p-3 border border-white/5">
                      <div className="text-xs text-muted-foreground mb-1">{m.label}</div>
                      <div className={`text-lg font-black font-mono ${m.color}`}>{m.value}</div>
                    </div>
                  ))}
                </div>
              )}
              {r?.executiveSummary && (
                <div className="mt-3 pt-3 border-t border-white/5 text-xs text-muted-foreground leading-relaxed italic">
                  {r.executiveSummary}
                </div>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <button onClick={() => setActiveSection('story')} className="text-xs px-4 py-2 bg-cyan-400/10 border border-cyan-400/20 text-cyan-400 rounded-xl hover:bg-cyan-400/20 transition-colors flex items-center gap-1.5">
                <BarChart3 className="w-3.5 h-3.5" /> View Dashboard
              </button>
              <button onClick={() => setActiveSection('analyst')} className="text-xs px-4 py-2 bg-purple-400/10 border border-purple-400/20 text-purple-400 rounded-xl hover:bg-purple-400/20 transition-colors flex items-center gap-1.5">
                <Bot className="w-3.5 h-3.5" /> Ask AI Analyst
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Quick actions */}
      <div>
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {quickActions.map((action, i) => (
            <motion.button key={action.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
              onClick={() => setActiveSection(action.id)}
              className={`glass-card rounded-xl p-4 text-left border ${action.border} hover:border-opacity-70 transition-all group`}>
              <div className={`w-8 h-8 rounded-lg ${action.bg} flex items-center justify-center mb-3`}>
                <action.icon className={`w-4 h-4 ${action.color}`} />
              </div>
              <div className="font-semibold text-xs mb-1">{action.label}</div>
              <div className="text-xs text-muted-foreground leading-tight">{action.desc}</div>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Sample bundles */}
      <div>
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2">Sample Bundles</h2>
        <p className="text-sm text-muted-foreground mb-4">Load a pre-built dataset with full AI analysis to explore the platform immediately.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {bundles.map((b, i) => (
            <motion.button key={b.key} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
              onClick={() => handleLoadBundle(b.key)}
              disabled={!!loadingBundle}
              className={`glass-card rounded-2xl p-5 text-left border ${b.color} hover:scale-[1.01] transition-all disabled:opacity-60`}>
              <div className="text-3xl mb-3">{b.icon}</div>
              <div className="font-semibold text-sm mb-1">{b.label}</div>
              <div className="text-xs text-muted-foreground mb-2">{b.desc}</div>
              <div className="text-xs text-white/30 mb-3">{b.tag}</div>
              <div className="flex items-center gap-1 text-xs text-cyan-400">
                {loadingBundle === b.key ? <><Loader2 className="w-3 h-3 animate-spin" /> Analyzing…</> : <><Zap className="w-3 h-3" /> Load & AI Analyze</>}
              </div>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Navigation links */}
      <div className="flex flex-wrap items-center gap-3 pt-2">
        <Link to="/dashboards" className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-lg border border-white/8 hover:border-white/15">
          <PieChart className="w-3.5 h-3.5 text-cyan-400" /> Dashboards
        </Link>
        <Link to="/story-builder" className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-lg border border-white/8 hover:border-white/15">
          <FileText className="w-3.5 h-3.5 text-purple-400" /> Story Builder
        </Link>
        <Link to="/alerts" className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-lg border border-white/8 hover:border-white/15">
          <Activity className="w-3.5 h-3.5 text-amber-400" /> Alerts
        </Link>
      </div>
    </div>
  );
}