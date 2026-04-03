import { useState } from 'react';
import { motion } from 'framer-motion';
import { useWorkspaceStore } from '@/lib/store';
import { Database, BarChart3, Brain, FileText, Zap, ArrowRight, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import { runAIAnalysis } from '@/lib/aiAnalyzer';

const bundles = [
  { key: 'sales', label: 'Sales & Revenue', desc: '2,304 rows · 12 columns · 2023–2024', icon: '📊', color: 'border-cyan-400/30 bg-cyan-400/5' },
  { key: 'workforce', label: 'Workforce & Payroll', desc: '131 employees · 10 columns', icon: '👥', color: 'border-teal-400/30 bg-teal-400/5' },
  { key: 'healthcare', label: 'Healthcare Operations', desc: '84 rows · 11 columns · 12 months', icon: '🏥', color: 'border-blue-400/30 bg-blue-400/5' },
];

const quickActions = [
  { id: 'intake', icon: Database, label: 'Upload Data', desc: 'Add CSV, XLSX, or JSON files', color: 'text-cyan-400', bg: 'bg-cyan-400/10' },
  { id: 'story', icon: BarChart3, label: 'View Dashboard', desc: 'Storytelling analytics', color: 'text-teal-400', bg: 'bg-teal-400/10' },
  { id: 'analyst', icon: Brain, label: 'Ask AI Analyst', desc: 'Natural language analysis', color: 'text-purple-400', bg: 'bg-purple-400/10' },
  { id: 'reports', icon: FileText, label: 'Generate Report', desc: 'Export board-ready docs', color: 'text-pink-400', bg: 'bg-pink-400/10' },
];

export default function OverviewSection() {
  const { loadSampleBundle, setActiveSection, setAnalysisResults, tables, analysisResults } = useWorkspaceStore();
  const [loadingBundle, setLoadingBundle] = useState('');

  const handleLoadBundle = async (key) => {
    setLoadingBundle(key);
    loadSampleBundle(key);
    // Get the loaded table from store after bundle load
    const { sampleBundles } = await import('@/lib/sampleData');
    const bundle = sampleBundles[key];
    if (bundle?.tables?.[0]) {
      try {
        const analysis = await runAIAnalysis(bundle.tables[0]);
        setAnalysisResults(analysis);
      } catch (e) {
        // Fallback to static analysis
        setAnalysisResults(bundle.analysisResults);
      }
    }
    setLoadingBundle('');
    setActiveSection('story');
  };

  return (
    <div className="p-8 space-y-10 max-w-5xl mx-auto">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-black mb-2">Welcome to AI Agent Data Analytics Tool</h1>
        <p className="text-muted-foreground">Upload your data or start with a sample bundle to explore the full platform.</p>
      </motion.div>

      {/* Quick actions */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {quickActions.map((action, i) => (
            <motion.button
              key={action.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              onClick={() => setActiveSection(action.id)}
              className="glass-card rounded-2xl p-5 text-left border border-white/5 hover:border-white/10 transition-all group"
            >
              <div className={`w-9 h-9 rounded-xl ${action.bg} flex items-center justify-center mb-3`}>
                <action.icon className={`w-4 h-4 ${action.color}`} />
              </div>
              <div className="font-semibold text-sm mb-1">{action.label}</div>
              <div className="text-xs text-muted-foreground">{action.desc}</div>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Current workspace status */}
      {tables.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest mb-4">Active Dataset</h2>
          <div className="glass-card rounded-2xl p-6 border border-cyan-400/15">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                  <span className="font-semibold">{tables[0].name}</span>
                </div>
                <div className="text-sm text-muted-foreground">{tables[0].rowCount?.toLocaleString()} rows · {tables[0].columns?.length} columns · Quality Score: {tables[0].qualityScore}%</div>
                {tables[0].issues?.length > 0 && (
                  <div className="flex items-center gap-1.5 mt-2 text-xs text-amber-400">
                    <AlertTriangle className="w-3 h-3" />
                    {tables[0].issues.length} data quality {tables[0].issues.length === 1 ? 'issue' : 'issues'} detected
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <button onClick={() => setActiveSection('story')} className="text-xs px-3 py-1.5 bg-cyan-400/10 border border-cyan-400/20 text-cyan-400 rounded-lg hover:bg-cyan-400/20 transition-colors flex items-center gap-1">
                  View Story <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
            {analysisResults && (
              <div className="mt-4 pt-4 border-t border-white/5">
                <div className="text-xs text-muted-foreground leading-relaxed">{analysisResults.executiveSummary}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Sample bundles */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest mb-4">Sample Bundles</h2>
        <p className="text-sm text-muted-foreground mb-4">Load a pre-built dataset to explore the full platform immediately.</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {bundles.map((b, i) => (
            <motion.button
              key={b.key}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              onClick={() => handleLoadBundle(b.key)}
              disabled={!!loadingBundle}
              className={`glass-card rounded-2xl p-5 text-left border ${b.color} hover:scale-[1.02] transition-all`}
            >
              <div className="text-3xl mb-3">{b.icon}</div>
              <div className="font-semibold text-sm mb-1">{b.label}</div>
              <div className="text-xs text-muted-foreground mb-3">{b.desc}</div>
              <div className="flex items-center gap-1 text-xs text-cyan-400">
                {loadingBundle === b.key ? <><Loader2 className="w-3 h-3 animate-spin" /> Analyzing…</> : <><Zap className="w-3 h-3" /> Load & AI Analyze</>}
              </div>
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
}