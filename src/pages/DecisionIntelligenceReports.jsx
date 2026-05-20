/**
 * DecisionIntelligenceReports — Phase 10: Decision Intelligence Reports
 * What happened · Why · Evidence · Risk · Action · Impact · Limitations · Next
 */
import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useWorkspaceStore } from '@/lib/store';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText, Loader2, CheckCircle2, AlertTriangle, TrendingUp, Zap,
  Download, Eye, Brain, Shield, Target, BarChart2, RefreshCw, Plus, Trash2,
  FolderOpen, ExternalLink
} from 'lucide-react';

const REPORT_TYPES = [
  { id: 'executive_summary', name: 'Executive Summary', icon: Target, color: 'cyan', desc: 'High-level strategic overview with KPIs, trends, and decisions' },
  { id: 'data_quality_audit', name: 'Data Quality Audit', icon: Shield, color: 'amber', desc: 'Completeness, validity, uniqueness, consistency, timeliness scores' },
  { id: 'sql_analysis', name: 'SQL Analysis Report', icon: FileText, color: 'green', desc: 'Query-driven findings with charts and business interpretation' },
  { id: 'cfo_report', name: 'CFO Report', icon: TrendingUp, color: 'purple', desc: 'Revenue, margin, cost, risk, and financial decision intelligence' },
  { id: 'growth_report', name: 'Growth Report', icon: Zap, color: 'pink', desc: 'RFM, funnel, retention, LTV/CAC, and growth levers' },
  { id: 'operations_report', name: 'Operations Report', icon: BarChart2, color: 'teal', desc: 'SLA, cycle time, throughput, bottlenecks, efficiency' },
  { id: 'anomaly_risk', name: 'Anomaly & Risk Report', icon: AlertTriangle, color: 'red', desc: 'Statistical outliers, Z-scores, business risk flags' },
  { id: 'startup_validation', name: 'Startup Validation', icon: CheckCircle2, color: 'blue', desc: 'Product-market fit signals, unit economics, traction metrics' },
];

const COLOR_MAP = {
  cyan: 'text-cyan-400 bg-cyan-400/10 border-cyan-400/20',
  amber: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
  green: 'text-green-400 bg-green-400/10 border-green-400/20',
  purple: 'text-purple-400 bg-purple-400/10 border-purple-400/20',
  pink: 'text-pink-400 bg-pink-400/10 border-pink-400/20',
  teal: 'text-teal-400 bg-teal-400/10 border-teal-400/20',
  red: 'text-red-400 bg-red-400/10 border-red-400/20',
  blue: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
};

function ReportSection({ title, icon: SectionIcon, color = 'cyan', children }) {
  const [open, setOpen] = useState(true);
  return (
    <div className={`rounded-2xl border overflow-hidden ${color === 'cyan' ? 'border-cyan-400/15' : color === 'amber' ? 'border-amber-400/15' : color === 'green' ? 'border-green-400/15' : color === 'purple' ? 'border-purple-400/15' : color === 'red' ? 'border-red-400/15' : 'border-white/10'}`}>
      <button onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-2 px-5 py-3 bg-white/2 hover:bg-white/3 transition-all text-left">
        {SectionIcon && <SectionIcon className={`w-4 h-4 ${color === 'cyan' ? 'text-cyan-400' : color === 'amber' ? 'text-amber-400' : color === 'green' ? 'text-green-400' : color === 'purple' ? 'text-purple-400' : color === 'red' ? 'text-red-400' : 'text-white/50'}`} />}
        <span className="text-sm font-bold text-white/80">{title}</span>
      </button>
      {open && <div className="px-5 py-4">{children}</div>}
    </div>
  );
}

function GeneratedReport({ report, onExport }) {
  if (!report) return null;
  const r = report;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="p-5 rounded-2xl border border-cyan-400/20 bg-cyan-400/5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-black text-white/90">{r.title || 'Decision Intelligence Report'}</h2>
            <p className="text-xs text-white/40 mt-1">{r.dataset_name} · Generated {new Date().toLocaleDateString()} · Confidence: {r.confidence_score || 0}%</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onExport} className="flex items-center gap-1.5 px-3 py-2 bg-cyan-400/15 border border-cyan-400/25 text-cyan-400 rounded-xl text-xs font-semibold hover:bg-cyan-400/20 transition-all">
              <Download className="w-3.5 h-3.5" /> Export PDF
            </button>
            <a href="/integrations" className="flex items-center gap-1.5 px-3 py-2 bg-green-400/10 border border-green-400/20 text-green-400 rounded-xl text-xs font-semibold hover:bg-green-400/15 transition-all">
              <FolderOpen className="w-3.5 h-3.5" /> Save to Drive <ExternalLink className="w-3 h-3 ml-0.5 opacity-60" />
            </a>
          </div>
        </div>
      </div>

      <ReportSection title="What Happened — Executive Summary" icon={Eye} color="cyan">
        <p className="text-sm text-white/70 leading-relaxed">{r.executive_summary || r.what_happened || 'No summary available.'}</p>
      </ReportSection>

      {r.why_it_happened && (
        <ReportSection title="Why Did It Happen — Root Cause" icon={Brain} color="purple">
          <p className="text-sm text-white/70 leading-relaxed">{r.why_it_happened}</p>
        </ReportSection>
      )}

      {r.evidence?.length > 0 && (
        <ReportSection title="Evidence" icon={FileText} color="green">
          <div className="space-y-2">
            {r.evidence.map((e, i) => (
              <div key={i} className="p-3 rounded-xl bg-white/3 border border-white/8 text-xs">
                <div className="font-semibold text-white/70">{e.finding}</div>
                <div className="text-white/40 mt-0.5">{e.method} {e.value ? `→ ${e.value}` : ''}</div>
              </div>
            ))}
          </div>
        </ReportSection>
      )}

      {r.risk_assessment && (
        <ReportSection title="Risk Assessment" icon={AlertTriangle} color="red">
          <p className="text-sm text-white/70 leading-relaxed">{r.risk_assessment}</p>
        </ReportSection>
      )}

      {r.recommendations?.length > 0 && (
        <ReportSection title="Recommended Actions" icon={Target} color="amber">
          <div className="space-y-3">
            {r.recommendations.map((rec, i) => (
              <div key={i} className="p-3 rounded-xl bg-white/2 border border-white/8">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-sm font-semibold text-white/80">{rec.action}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${rec.priority === 'High' ? 'bg-red-400/10 border-red-400/20 text-red-400' : rec.priority === 'Medium' ? 'bg-amber-400/10 border-amber-400/20 text-amber-400' : 'bg-green-400/10 border-green-400/20 text-green-400'}`}>
                    {rec.priority}
                  </span>
                </div>
                <div className="text-xs text-white/40">
                  Impact: {rec.expected_impact} · Effort: {rec.effort} · Owner: {rec.owner}
                </div>
              </div>
            ))}
          </div>
        </ReportSection>
      )}

      {r.limitations?.length > 0 && (
        <ReportSection title="Limitations & Disclaimer" icon={AlertTriangle} color="amber">
          <ul className="space-y-1">
            {r.limitations.map((l, i) => (
              <li key={i} className="text-xs text-amber-400/70 flex items-start gap-1.5">
                <span className="text-amber-400/50 mt-0.5">•</span>{l}
              </li>
            ))}
          </ul>
          <p className="text-xs text-white/25 mt-3 italic">This report is AI-generated and should be reviewed by a qualified analyst before making business decisions.</p>
        </ReportSection>
      )}

      {r.next_questions?.length > 0 && (
        <ReportSection title="Next Questions to Investigate" icon={TrendingUp} color="cyan">
          <div className="flex flex-wrap gap-2">
            {r.next_questions.map((q, i) => (
              <span key={i} className="text-xs px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-white/55">{q}</span>
            ))}
          </div>
        </ReportSection>
      )}
    </div>
  );
}

export default function DecisionIntelligenceReports() {
  const { getActiveTable } = useWorkspaceStore();
  const activeTable = getActiveTable();
  const [selectedType, setSelectedType] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [report, setReport] = useState(null);
  const [savedReports, setSavedReports] = useState([]);
  const [customContext, setCustomContext] = useState('');
  const [tab, setTab] = useState('generate');

  const generateReport = async () => {
    if (!selectedType) return;
    setGenerating(true);
    setReport(null);
    try {
      const tableContext = activeTable ? {
        name: activeTable.name, rowCount: activeTable.rows?.length,
        columns: activeTable.columns?.slice(0, 25), rows: activeTable.rows?.slice(0, 50),
      } : null;

      const res = await base44.functions.invoke('runAgentOrchestrator', {
        question: `Generate a ${selectedType.name} for this dataset. ${customContext}`,
        persona: selectedType.id === 'cfo_report' ? 'CFO Analyst' :
                 selectedType.id === 'growth_report' ? 'Growth Analyst' :
                 selectedType.id === 'operations_report' ? 'Operations Analyst' : 'Principal Business Analyst',
        tableData: tableContext,
        reportMode: true,
        reportType: selectedType.id,
        sessionId: `report_${Date.now()}`,
      });

      const data = res.data;
      setReport({
        ...data,
        title: `${selectedType.name} — ${activeTable?.name || 'Dataset'}`,
        dataset_name: activeTable?.name || 'Unknown Dataset',
        what_happened: data.executive_summary,
        why_it_happened: data.root_cause,
      });

      // Save to list
      setSavedReports(r => [{
        id: Date.now(), type: selectedType.id, name: selectedType.name,
        dataset: activeTable?.name, generatedAt: new Date().toLocaleString(),
        confidence: data.confidence_score,
      }, ...r.slice(0, 9)]);
    } catch (e) {
      setReport({ executive_summary: `Report generation failed: ${e.message}. Ensure a dataset is loaded and try again.`, recommendations: [], limitations: ['Report generation failed'], title: 'Error', confidence_score: 0 });
    }
    setGenerating(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-white/8 px-8 py-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-400/15 border border-amber-400/25 flex items-center justify-center">
            <FileText className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h1 className="text-xl font-black">Decision Intelligence Reports</h1>
            <p className="text-xs text-muted-foreground">What · Why · Evidence · Risk · Action · Impact · Limitations · Next</p>
          </div>
          <a href="/integrations" className="ml-auto hidden md:flex items-center gap-2 px-3 py-2 bg-green-400/8 border border-green-400/20 text-green-400 rounded-xl text-xs font-semibold hover:bg-green-400/12 transition-all">
            <FolderOpen className="w-3.5 h-3.5" />
            Connect Google Drive for auto-export
            <ExternalLink className="w-3 h-3 opacity-60" />
          </a>
        </div>
      </div>

      <div className="flex gap-0 border-b border-white/8 px-8">
        {[{ id: 'generate', label: 'Generate Report' }, { id: 'saved', label: `Saved Reports (${savedReports.length})` }].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-3 text-xs font-semibold border-b-2 transition-all ${tab === t.id ? 'border-amber-400 text-amber-400' : 'border-transparent text-white/35 hover:text-white/60'}`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="p-8">
        {tab === 'generate' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-white/60">Select Report Type</h3>
              <div className="grid gap-2">
                {REPORT_TYPES.map(rt => (
                  <button key={rt.id} onClick={() => setSelectedType(rt)}
                    className={`text-left p-3 rounded-xl border transition-all ${selectedType?.id === rt.id ? `border-amber-400/30 bg-amber-400/8` : 'border-white/8 bg-white/2 hover:border-white/15'}`}>
                    <div className="flex items-center gap-2 mb-0.5">
                      <rt.icon className={`w-3.5 h-3.5 ${COLOR_MAP[rt.color]?.split(' ')[0] || 'text-white/50'}`} />
                      <span className="text-xs font-semibold text-white/80">{rt.name}</span>
                    </div>
                    <p className="text-xs text-white/30 leading-relaxed">{rt.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="lg:col-span-2 space-y-4">
              {!activeTable && (
                <div className="p-4 rounded-xl bg-amber-400/8 border border-amber-400/20 text-sm text-amber-400">
                  ⚠ No dataset loaded. Go to Workspace to upload and select a dataset first.
                </div>
              )}

              {selectedType && (
                <div className="space-y-4">
                  <div className={`p-4 rounded-xl border ${COLOR_MAP[selectedType.color]?.replace('text-', 'border-').replace('/10', '/20') || 'border-white/10'} bg-white/2`}>
                    <div className="flex items-center gap-2 mb-1">
                      <selectedType.icon className={`w-4 h-4 ${COLOR_MAP[selectedType.color]?.split(' ')[0] || 'text-white/50'}`} />
                      <span className="text-sm font-bold text-white/80">{selectedType.name}</span>
                    </div>
                    <p className="text-xs text-white/40">{selectedType.desc}</p>
                  </div>
                  <div>
                    <label className="text-xs text-white/35 mb-1.5 block">Additional Context (optional)</label>
                    <textarea value={customContext} onChange={e => setCustomContext(e.target.value)} rows={3}
                      placeholder="e.g. Focus on Q4 performance, compare to industry benchmarks, stakeholder is the board…"
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none resize-none" />
                  </div>
                  <button onClick={generateReport} disabled={generating || !activeTable}
                    className="w-full py-3 bg-amber-400/15 border border-amber-400/25 text-amber-400 rounded-xl text-sm font-bold hover:bg-amber-400/20 transition-all disabled:opacity-40 flex items-center justify-center gap-2">
                    {generating ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating Report…</> : <><FileText className="w-4 h-4" /> Generate {selectedType.name}</>}
                  </button>
                </div>
              )}

              {report && <GeneratedReport report={report} onExport={() => {}} />}
            </div>
          </div>
        )}

        {tab === 'saved' && (
          <div className="space-y-4">
            {savedReports.length === 0 ? (
              <div className="text-center py-12 text-sm text-white/30">No reports generated yet.</div>
            ) : savedReports.map(r => (
              <div key={r.id} className="p-4 rounded-2xl border border-white/8 bg-white/2 flex items-center gap-4">
                <FileText className="w-8 h-8 text-amber-400 flex-shrink-0" />
                <div className="flex-1">
                  <div className="font-semibold text-sm">{r.name}</div>
                  <div className="text-xs text-white/35">{r.dataset} · {r.generatedAt} · Confidence: {r.confidence}%</div>
                </div>
                <button onClick={() => setSavedReports(s => s.filter(x => x.id !== r.id))} className="p-1.5 text-white/20 hover:text-red-400 transition-all"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}