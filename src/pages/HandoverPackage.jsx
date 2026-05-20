/**
 * HandoverPackage — Phase 13: Sale-Ready Product Package
 * Sale Readiness Score, feature list, handover checklist, buyer documentation
 */
import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import {
  Package, CheckCircle2, XCircle, AlertTriangle, Download, FileText,
  Shield, Zap, TrendingUp, Database, Brain, BarChart2, Target, Star,
  Users, Code2, BookOpen, Clipboard, DollarSign, Globe
} from 'lucide-react';

const CHECKLIST = [
  { id: 'public_app', label: 'Public app accessible and loads', category: 'deployment' },
  { id: 'demo_dataset', label: 'Demo dataset available and loaded', category: 'demo' },
  { id: 'upload_flow', label: 'Upload flow works (CSV/XLSX)', category: 'features' },
  { id: 'data_quality', label: 'Data Quality scores are calculated', category: 'features' },
  { id: 'semantic_metrics', label: 'Semantic Metric Store has entries', category: 'features' },
  { id: 'sql_validation', label: 'SQL Workbench validates unsafe queries', category: 'features' },
  { id: 'agent_studio', label: 'Agent Studio returns structured answers', category: 'features' },
  { id: 'visual_builder', label: 'Visual Builder creates charts', category: 'features' },
  { id: 'reports_export', label: 'Decision Reports generate successfully', category: 'features' },
  { id: 'pdf_export', label: 'Project Documentation PDF exports', category: 'features' },
  { id: 'admin_portal', label: 'Admin Portal is accessible', category: 'admin' },
  { id: 'observability', label: 'Observability logs agent traces', category: 'admin' },
  { id: 'benchmark', label: 'Benchmark Center has test questions', category: 'admin' },
  { id: 'no_placeholders', label: 'No placeholder text visible', category: 'polish' },
  { id: 'no_fake_features', label: 'No fake/hallucinated features', category: 'polish' },
  { id: 'product_doc', label: 'Product document ready', category: 'documentation' },
  { id: 'handover_doc', label: 'Handover document ready', category: 'documentation' },
  { id: 'setup_instructions', label: 'Setup instructions documented', category: 'documentation' },
];

const FEATURE_MATRIX = [
  { module: 'Data Engineering Studio', features: ['CSV/XLSX Upload', 'Schema Inference', 'Column Profiling', 'Data Versioning', 'Processing Logs'], status: 'complete' },
  { module: 'Data Quality & Validation', features: ['5 Quality Dimensions', 'Quality Score Formula', 'Data Readiness Score', 'Contract Validation', 'Cleaning Report'], status: 'complete' },
  { module: 'Semantic Metric Store', features: ['Metric Definitions', 'Formula Validation', 'Metric Certification', 'Domain Classification', 'Default Metrics Library'], status: 'complete' },
  { module: 'SQL Python Workbench', features: ['SQL Editor', 'NL-to-SQL', 'SQL Validation', '15 Templates', 'Query History', 'Chart from Result'], status: 'complete' },
  { module: 'Visual Builder', features: ['Chart Gallery', 'Tableau-style Shelves', 'Explain Chart', 'View SQL', 'Chart Spec JSON'], status: 'complete' },
  { module: 'AI Agent Studio', features: ['5 Principal Analysts', 'F-D-E-A-R Reasoning', 'Structured Output', 'Data Sufficiency Score', 'Agent Traces'], status: 'complete' },
  { module: 'Advanced Analytics', features: ['RFM Segmentation', 'Funnel Analysis', 'Cohort Retention', 'Forecasting', 'Anomaly Detection', 'CLV'], status: 'complete' },
  { module: 'Decision Reports', features: ['8 Report Types', 'What/Why/Risk/Action', 'Evidence-backed', 'PDF Export', 'Confidence Scores'], status: 'complete' },
  { module: 'Admin Observability', features: ['Agent Trace Logging', 'Quality KPIs', 'SQL Failures', 'Missing Fields', 'Feedback Rating'], status: 'complete' },
  { module: 'Project Documentation', features: ['22 PDF Sections', 'Architecture Diagrams', 'Code Snippets', 'Screenshot Management', 'Version History'], status: 'complete' },
];

const SALE_WEIGHTS = [
  { key: 'FeatureCompleteness', weight: 0.20, label: 'Feature Completeness' },
  { key: 'Reliability', weight: 0.20, label: 'Reliability & Stability' },
  { key: 'DocumentationQuality', weight: 0.15, label: 'Documentation Quality' },
  { key: 'DemoQuality', weight: 0.15, label: 'Demo Quality' },
  { key: 'AdminControls', weight: 0.10, label: 'Admin Controls' },
  { key: 'TestCoverage', weight: 0.10, label: 'Test Coverage' },
  { key: 'TransferReadiness', weight: 0.10, label: 'Transfer Readiness' },
];

export default function HandoverPackage() {
  const [checklist, setChecklist] = useState(() =>
    Object.fromEntries(CHECKLIST.map(c => [c.id, false]))
  );
  const [tab, setTab] = useState('readiness');
  const [scores, setScores] = useState({
    FeatureCompleteness: 85, Reliability: 80, DocumentationQuality: 75,
    DemoQuality: 70, AdminControls: 90, TestCoverage: 65, TransferReadiness: 75,
  });

  const saleReadinessScore = Math.round(
    SALE_WEIGHTS.reduce((sum, w) => sum + w.weight * (scores[w.key] || 0), 0)
  );
  const checkedCount = Object.values(checklist).filter(Boolean).length;
  const checklistPct = Math.round(checkedCount / CHECKLIST.length * 100);

  const TABS = [
    { id: 'readiness', label: 'Sale Readiness' },
    { id: 'features', label: 'Feature Matrix' },
    { id: 'checklist', label: `Checklist (${checkedCount}/${CHECKLIST.length})` },
    { id: 'package', label: 'Handover Package' },
  ];

  const exportChecklist = () => {
    const lines = CHECKLIST.map(c => `[${checklist[c.id] ? 'x' : ' '}] ${c.label}`);
    const txt = `OmniData AI — Handover Checklist\nGenerated: ${new Date().toLocaleDateString()}\nScore: ${checklistPct}%\n\n${lines.join('\n')}`;
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([txt], { type: 'text/plain' }));
    a.download = 'handover_checklist.txt'; a.click();
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-white/8 px-8 py-5">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-400/15 border border-amber-400/25 flex items-center justify-center">
              <Package className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h1 className="text-xl font-black">Buyer Handover Package</h1>
              <p className="text-xs text-muted-foreground">Sale Readiness · Feature Matrix · Checklist · $20K–$25K Product</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className={`px-5 py-2 rounded-xl border text-center ${saleReadinessScore >= 80 ? 'bg-green-400/10 border-green-400/20' : saleReadinessScore >= 60 ? 'bg-amber-400/10 border-amber-400/20' : 'bg-red-400/10 border-red-400/20'}`}>
              <div className={`text-2xl font-black ${saleReadinessScore >= 80 ? 'text-green-400' : saleReadinessScore >= 60 ? 'text-amber-400' : 'text-red-400'}`}>{saleReadinessScore}%</div>
              <div className="text-xs text-white/30">Sale Readiness</div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-0 border-b border-white/8 px-8">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-3 text-xs font-semibold border-b-2 transition-all ${tab === t.id ? 'border-amber-400 text-amber-400' : 'border-transparent text-white/35 hover:text-white/60'}`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="p-8">
        {/* Sale Readiness Tab */}
        {tab === 'readiness' && (
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="p-6 rounded-2xl border border-amber-400/20 bg-amber-400/5 text-center">
              <div className="text-6xl font-black text-amber-400 mb-2">{saleReadinessScore}%</div>
              <p className="text-sm text-white/50">Sale Readiness Score</p>
              <p className="text-xs text-white/30 font-mono mt-1">0.20×Feature + 0.20×Reliability + 0.15×Docs + 0.15×Demo + 0.10×Admin + 0.10×Tests + 0.10×Transfer</p>
            </div>

            <div className="space-y-4">
              {SALE_WEIGHTS.map(w => (
                <div key={w.key}>
                  <div className="flex items-center justify-between mb-1.5 text-xs">
                    <span className="text-white/60">{w.label} <span className="text-white/25">({Math.round(w.weight * 100)}%)</span></span>
                    <div className="flex items-center gap-2">
                      <input type="range" min={0} max={100} step={5} value={scores[w.key] || 0}
                        onChange={e => setScores(s => ({ ...s, [w.key]: parseInt(e.target.value) }))}
                        className="w-24" />
                      <span className={`font-black w-8 text-right ${scores[w.key] >= 80 ? 'text-green-400' : scores[w.key] >= 60 ? 'text-amber-400' : 'text-red-400'}`}>{scores[w.key]}%</span>
                    </div>
                  </div>
                  <div className="h-2 rounded-full bg-white/8 overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${scores[w.key] >= 80 ? 'bg-green-400' : scores[w.key] >= 60 ? 'bg-amber-400' : 'bg-red-400'}`} style={{ width: `${scores[w.key]}%` }} />
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 rounded-2xl border border-white/8 bg-white/2">
              <div className="flex items-center gap-2 mb-3 text-sm font-bold text-white/70"><DollarSign className="w-4 h-4 text-green-400" /> Estimated Sale Value</div>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-3 rounded-xl bg-white/3 border border-white/8"><div className="text-xl font-black text-green-400">$15K</div><div className="text-xs text-white/30">Conservative</div></div>
                <div className="p-3 rounded-xl bg-amber-400/10 border border-amber-400/20"><div className="text-xl font-black text-amber-400">$20K</div><div className="text-xs text-white/30">Target</div></div>
                <div className="p-3 rounded-xl bg-white/3 border border-white/8"><div className="text-xl font-black text-cyan-400">$25K</div><div className="text-xs text-white/30">Premium</div></div>
              </div>
            </div>
          </div>
        )}

        {/* Feature Matrix Tab */}
        {tab === 'features' && (
          <div className="space-y-3">
            {FEATURE_MATRIX.map((module, i) => (
              <motion.div key={module.module} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                className="p-4 rounded-2xl border border-white/8 bg-white/2">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-white/80">{module.module}</span>
                    <span className="px-1.5 py-0.5 rounded bg-green-400/15 text-green-400 text-xs">✓ {module.status}</span>
                  </div>
                  <span className="text-xs text-white/30">{module.features.length} features</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {module.features.map(f => (
                    <span key={f} className="text-xs px-2 py-0.5 rounded-lg bg-white/5 border border-white/8 text-white/50">{f}</span>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Checklist Tab */}
        {tab === 'checklist' && (
          <div className="max-w-2xl mx-auto space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className={`text-2xl font-black ${checklistPct >= 80 ? 'text-green-400' : checklistPct >= 60 ? 'text-amber-400' : 'text-red-400'}`}>{checklistPct}% Complete</div>
                <div className="text-xs text-white/30">{checkedCount} of {CHECKLIST.length} items</div>
              </div>
              <button onClick={exportChecklist} className="flex items-center gap-1.5 px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white/50 hover:text-white/80 transition-all">
                <Download className="w-3 h-3" /> Export
              </button>
            </div>
            {['deployment', 'features', 'admin', 'polish', 'documentation'].map(cat => (
              <div key={cat} className="rounded-2xl border border-white/8 overflow-hidden">
                <div className="px-4 py-2 bg-white/3 text-xs font-semibold text-white/40 uppercase tracking-widest">{cat}</div>
                {CHECKLIST.filter(c => c.category === cat).map(item => (
                  <label key={item.id} className="flex items-center gap-3 px-4 py-3 border-b border-white/5 cursor-pointer hover:bg-white/2 transition-all">
                    <input type="checkbox" checked={checklist[item.id]} onChange={e => setChecklist(c => ({ ...c, [item.id]: e.target.checked }))} className="rounded" />
                    <span className={`text-sm ${checklist[item.id] ? 'text-white/40 line-through' : 'text-white/70'}`}>{item.label}</span>
                    {checklist[item.id] && <CheckCircle2 className="w-3.5 h-3.5 text-green-400 ml-auto" />}
                  </label>
                ))}
              </div>
            ))}
          </div>
        )}

        {/* Handover Package Tab */}
        {tab === 'package' && (
          <div className="max-w-3xl mx-auto grid grid-cols-2 gap-4">
            {[
              { icon: FileText, label: 'Feature List Document', desc: '50+ features documented with screenshots', ready: true },
              { icon: Code2, label: 'Technical Architecture', desc: 'Entity schema, functions, data pipeline', ready: true },
              { icon: BookOpen, label: 'User Guide', desc: 'Step-by-step guide for end users', ready: false },
              { icon: Shield, label: 'Admin Guide', desc: 'Setup, configuration, and admin controls', ready: false },
              { icon: Brain, label: 'AI Agent Documentation', desc: 'Personas, tools, orchestration flow', ready: true },
              { icon: Database, label: 'SQL Template Library', desc: '15 production-ready SQL templates', ready: true },
              { icon: Target, label: 'Demo Dataset + Script', desc: 'Sample data + 10-minute demo walkthrough', ready: false },
              { icon: TrendingUp, label: 'Roadmap Document', desc: 'Next 6-month feature roadmap', ready: false },
              { icon: AlertTriangle, label: 'Known Limitations', desc: 'Honest limitations and workarounds', ready: true },
              { icon: Clipboard, label: 'Setup Instructions', desc: 'Environment, secrets, onboarding steps', ready: false },
              { icon: Globe, label: 'Handover Checklist', desc: 'Complete buyer acceptance checklist', ready: true },
              { icon: Star, label: 'Prompt Library', desc: '50+ tested prompts for Agent Studio', ready: false },
            ].map(item => (
              <div key={item.label} className={`p-4 rounded-2xl border ${item.ready ? 'border-green-400/20 bg-green-400/5' : 'border-white/8 bg-white/2'} flex items-start gap-3`}>
                <item.icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${item.ready ? 'text-green-400' : 'text-white/30'}`} />
                <div className="flex-1">
                  <div className="text-sm font-semibold text-white/80">{item.label}</div>
                  <div className="text-xs text-white/35 mt-0.5">{item.desc}</div>
                </div>
                {item.ready ? <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" /> : <span className="text-xs text-white/25 flex-shrink-0">pending</span>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}