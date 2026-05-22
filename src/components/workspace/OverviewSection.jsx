import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWorkspaceStore } from '@/lib/store';
import {
  Database, BarChart3, Brain, FileText, Zap,
  CheckCircle2, AlertTriangle, Loader2,
  Activity, Upload, Layers, GitBranch,
  Bot, PieChart, Link2, Wand2, TrendingUp,
  Sparkles, ArrowRight, Shield, Terminal, FlaskConical
} from 'lucide-react';
import { Link } from 'react-router-dom';
import KPIStrip from '@/components/workspace/KPIStrip';
import StorytellingHeader from '@/components/workspace/StorytellingHeader';

const bundles = [
  { key: 'sales_revenue',        label: 'Sales & Revenue',          desc: '350 orders · 20 cols · 2023–2024', icon: '📊', color: 'border-cyan-400/30 bg-cyan-400/5',   tag: 'Revenue · Gross Profit · RFM · Forecast · Geo', kpis: ['Revenue', 'Gross Profit', 'Gross Margin %', 'Units Sold'] },
  { key: 'hr_workforce',         label: 'HR / Workforce',           desc: '280 employees · 14 columns',          icon: '👥', color: 'border-purple-400/30 bg-purple-400/5',  tag: 'Attrition · Salary · Performance · Tenure', kpis: ['Attrition Rate', 'Avg Salary', 'Performance Score', 'Tenure'] },
  { key: 'finance_operations',   label: 'Finance / Operations',     desc: '240 transactions · 13 cols · P&L',     icon: '💰', color: 'border-green-400/30 bg-green-400/5',  tag: 'Revenue · Cost · Budget Variance · Vendor · Anomaly', kpis: ['Revenue', 'Cost', 'Gross Margin %', 'Budget Variance'] },
  { key: 'appointments_healthcare', label: 'Appointments / Healthcare', desc: '320 appts · 11 cols · No-Show Analysis', icon: '🏥', color: 'border-blue-400/30 bg-blue-400/5',  tag: 'No-Show · Wait Time · Ops · Forecast', kpis: ['No-Show Rate', 'Avg Wait Time', 'Completion Rate', 'Dept Throughput'] },
];

const quickActions = [
  { id: 'intake',   icon: Upload,   label: 'Upload Data',     desc: 'CSV, XLSX, JSON — no size limit',      color: 'text-cyan-400',   bg: 'bg-cyan-400/10',   border: 'border-cyan-400/20' },
  { id: 'quality',  icon: Shield,   label: 'Quality Studio',  desc: 'Missing, duplicates, cleaning',         color: 'text-green-400',  bg: 'bg-green-400/10',  border: 'border-green-400/20' },
  { id: 'workbook', icon: BarChart3, label: 'Dashboard',      desc: 'Scorecards, trends, distributions',     color: 'text-teal-400',   bg: 'bg-teal-400/10',   border: 'border-teal-400/20' },
  { id: 'visual',   icon: Wand2,    label: 'Visual Builder',  desc: 'Tableau-style chart creation',          color: 'text-amber-400',  bg: 'bg-amber-400/10',  border: 'border-amber-400/20' },
  { id: 'analyst',  icon: Brain,    label: 'AI Analyst',      desc: 'Tool-based, grounded analysis',         color: 'text-purple-400', bg: 'bg-purple-400/10', border: 'border-purple-400/20' },
  { id: 'reports',  icon: FileText, label: 'Reports',         desc: 'Board memos & executive PDFs',          color: 'text-pink-400',   bg: 'bg-pink-400/10',   border: 'border-pink-400/20' },
  { id: 'sql',      icon: Terminal, label: 'SQL Studio',      desc: 'Natural language to SQL',               color: 'text-blue-400',   bg: 'bg-blue-400/10',   border: 'border-blue-400/20' },
  { id: 'rfm',      icon: TrendingUp, label: 'RFM Segments', desc: 'Customer segmentation analysis',        color: 'text-orange-400', bg: 'bg-orange-400/10', border: 'border-orange-400/20' },
  { id: 'statistics', icon: Activity, label: 'Statistics',   desc: 'Distributions, correlation, outliers',  color: 'text-indigo-400', bg: 'bg-indigo-400/10', border: 'border-indigo-400/20' },
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
  const { loadSampleBundle, setActiveSection, tables, analysisResults, savedCharts, stories, alerts } = useWorkspaceStore();
  const [loadingBundle, setLoadingBundle] = useState('');

  const handleLoadBundle = async (key) => {
    setLoadingBundle(key);
    try {
      loadSampleBundle(key);
      await new Promise(r => setTimeout(r, 150));
    } catch {}
    setLoadingBundle('');
    setActiveSection('story');
  };

  const r = analysisResults;
  const activeTable = tables[0] || null;
  const hasData = tables.length > 0;

  return (
    <div className="p-6 space-y-8 max-w-6xl mx-auto overflow-auto">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-2 mb-2">
          <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          <span className="text-xs font-mono text-white/40 uppercase tracking-widest">AI Agent Analytics Workspace</span>
        </div>
        <h1 className="text-2xl font-black mb-1">
          {hasData ? `Analysis Ready` : 'Welcome'}
        </h1>
        <p className="text-sm text-muted-foreground">
          {hasData ? 'Your workspace has active data. Jump to any module below.' : 'Upload data or load a sample bundle to begin.'}
        </p>
      </motion.div>

      {/* KPI Strip — top row when data available */}
      {hasData && r && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <KPIStrip table={activeTable} results={r} />
        </motion.div>
      )}

      {/* Story frames */}
      {hasData && r && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <StorytellingHeader table={activeTable} results={r} />
        </motion.div>
      )}

      {/* Dataset status card when data loaded but no analysis */}
      {activeTable && !r && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="glass-card rounded-2xl p-5 border border-cyan-400/15 bg-cyan-400/3">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <CheckCircle2 className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                <span className="font-bold text-base">{activeTable.name}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-400/10 text-cyan-400 border border-cyan-400/20">Active</span>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Shield className={`w-3 h-3 ${activeTable.qualityScore >= 90 ? 'text-green-400' : 'text-amber-400'}`} />
                  {activeTable.qualityScore}% quality
                </div>
              </div>
              <div className="text-sm text-muted-foreground">
                {activeTable.rowCount?.toLocaleString()} rows · {activeTable.columns?.length} columns
              </div>
            </div>
            <div className="flex flex-col gap-2 flex-shrink-0">
              <button onClick={() => setActiveSection('prepare')}
                className="text-xs px-4 py-2 bg-green-400/10 border border-green-400/20 text-green-400 rounded-xl hover:bg-green-400/20 transition-colors flex items-center gap-1.5 whitespace-nowrap">
                <Sparkles className="w-3.5 h-3.5" /> Run Analysis
              </button>
              <button onClick={() => setActiveSection('analyst')}
                className="text-xs px-4 py-2 bg-purple-400/10 border border-purple-400/20 text-purple-400 rounded-xl hover:bg-purple-400/20 transition-colors flex items-center gap-1.5 whitespace-nowrap">
                <Bot className="w-3.5 h-3.5" /> Ask AI Analyst
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Quick actions */}
      <div>
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-4">Workspace Modules</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {quickActions.map((action, i) => (
            <motion.button key={action.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              onClick={() => setActiveSection(action.id)}
              className={`glass-card rounded-xl p-4 text-left border ${action.border} hover:scale-[1.02] transition-all`}>
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
        <div className="flex items-center gap-3 mb-3">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Sample Bundles</h2>
          <span className="text-xs text-white/25">— demo-ready, zero setup</span>
        </div>
        <p className="text-sm text-muted-foreground mb-4">Load a pre-built dataset with full AI analysis, charts, and insights to explore the platform immediately.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {bundles.map((b, i) => (
            <motion.button key={b.key} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
              onClick={() => handleLoadBundle(b.key)}
              disabled={!!loadingBundle}
              className={`glass-card rounded-2xl p-5 text-left border ${b.color} hover:scale-[1.01] transition-all disabled:opacity-60 group`}>
              <div className="text-3xl mb-3">{b.icon}</div>
              <div className="font-bold text-sm mb-1">{b.label}</div>
              <div className="text-xs text-muted-foreground mb-2">{b.desc}</div>
              <div className="flex flex-wrap gap-1 mb-3">
                {b.kpis.map(k => (
                  <span key={k} className="text-xs px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-white/40 font-mono">{k}</span>
                ))}
              </div>
              <div className="text-xs text-white/30 mb-3 leading-relaxed">{b.tag}</div>
              <div className="flex items-center gap-1 text-xs text-cyan-400">
                {loadingBundle === b.key ? <><Loader2 className="w-3 h-3 animate-spin" /> Loading…</> : <><Zap className="w-3 h-3" /> Load &amp; AI Analyze</>}
              </div>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Navigation links */}
      <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-white/5">
        <span className="text-xs text-white/25">Other modules:</span>
        {[
          { to: '/dashboards', icon: PieChart, label: 'Dashboards', color: 'text-cyan-400' },
          { to: '/story-builder', icon: FileText, label: 'Story Builder', color: 'text-purple-400' },
          { to: '/alerts', icon: Activity, label: 'Alerts', color: 'text-amber-400' },
          { to: '/workbench', icon: Zap, label: 'Workbench', color: 'text-cyan-400' },
      { to: '/integrations', icon: Link2, label: 'Integrations', color: 'text-cyan-400' },
          { to: '/data-mapping', icon: Wand2, label: 'Data Mapping', color: 'text-purple-400' },
          { to: '/reports', icon: FileText, label: 'Reports', color: 'text-blue-400' },
        ].map(link => (
          <Link key={link.to} to={link.to}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-lg border border-white/8 hover:border-white/15">
            <link.icon className={`w-3.5 h-3.5 ${link.color}`} /> {link.label}
          </Link>
        ))}
      </div>
    </div>
  );
}