/**
 * Decision Intelligence Reports — Phase 4 Upgrade
 * 14 report types · 17-section structure · Save as SharedReport · Export markdown
 */
import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useWorkspaceStore } from '@/lib/store';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText, Loader2, CheckCircle2, AlertTriangle, TrendingUp, Zap,
  Download, Eye, Brain, Shield, Target, BarChart2, Trash2, Save,
  Users, ShoppingCart, Activity, DollarSign, BookOpen, ChevronDown, ChevronUp
} from 'lucide-react';

const REPORT_TYPES = [
  { id: 'executive_summary',  name: 'Executive Summary',        icon: Target,       color: 'cyan',    persona: 'Principal Business Analyst', desc: 'High-level strategic KPI overview with decisions and risks' },
  { id: 'board_memo',         name: 'Board Memo',               icon: BookOpen,     color: 'blue',    persona: 'Principal Business Analyst', desc: 'Concise board-level memo with key metrics and recommendations' },
  { id: 'data_quality_audit', name: 'Data Quality Audit',       icon: Shield,       color: 'amber',   persona: 'Principal Data Analyst',     desc: 'DQ scorecard: Completeness, Validity, Uniqueness, Consistency, Timeliness' },
  { id: 'sql_analysis',       name: 'SQL Analysis Report',      icon: FileText,     color: 'green',   persona: 'Principal Data Analyst',     desc: 'Query-driven findings with SQL logic and business interpretation' },
  { id: 'forecast_report',    name: 'Forecast Report',          icon: TrendingUp,   color: 'teal',    persona: 'Principal Business Analyst', desc: 'Time-series projections, confidence intervals, planning scenarios' },
  { id: 'rfm_report',         name: 'RFM Customer Report',      icon: Users,        color: 'purple',  persona: 'Growth Analyst',             desc: 'Champions, loyal, at-risk, lost customers — segment action plan' },
  { id: 'funnel_report',      name: 'Funnel Analysis Report',   icon: Activity,     color: 'pink',    persona: 'Growth Analyst',             desc: 'Stage conversion rates, drop-off, biggest leakage point' },
  { id: 'cohort_report',      name: 'Cohort Retention Report',  icon: BarChart2,    color: 'indigo',  persona: 'Growth Analyst',             desc: 'Monthly cohorts, M0–M12 retention, best/worst performing cohorts' },
  { id: 'churn_report',       name: 'Churn Risk Report',        icon: AlertTriangle,color: 'red',     persona: 'Growth Analyst',             desc: 'At-risk segments, revenue at risk, intervention recommendations' },
  { id: 'anomaly_risk',       name: 'Anomaly & Risk Report',    icon: AlertTriangle,color: 'orange',  persona: 'Operations Analyst',         desc: 'Z-score outliers, IQR violations, business risk flags' },
  { id: 'cfo_report',         name: 'CFO Financial Report',     icon: DollarSign,   color: 'cyan',    persona: 'CFO Analyst',                desc: 'Revenue, margin, cost, burn rate, financial risk, variance' },
  { id: 'growth_report',      name: 'Growth Report',            icon: Zap,          color: 'green',   persona: 'Growth Analyst',             desc: 'LTV/CAC, RFM funnel, retention, growth levers' },
  { id: 'operations_report',  name: 'Operations Report',        icon: Activity,     color: 'teal',    persona: 'Operations Analyst',         desc: 'SLA adherence, cycle time, throughput, bottlenecks, efficiency' },
  { id: 'project_doc_report', name: 'Project Documentation',    icon: BookOpen,     color: 'blue',    persona: 'Principal Business Analyst', desc: 'Technical architecture, methodology, findings, and appendix' },
];

const COLOR_MAP = {
  cyan:    { text: 'text-cyan-400',    bg: 'bg-cyan-400/10',    border: 'border-cyan-400/20' },
  amber:   { text: 'text-amber-400',   bg: 'bg-amber-400/10',   border: 'border-amber-400/20' },
  green:   { text: 'text-green-400',   bg: 'bg-green-400/10',   border: 'border-green-400/20' },
  purple:  { text: 'text-purple-400',  bg: 'bg-purple-400/10',  border: 'border-purple-400/20' },
  pink:    { text: 'text-pink-400',    bg: 'bg-pink-400/10',    border: 'border-pink-400/20' },
  teal:    { text: 'text-teal-400',    bg: 'bg-teal-400/10',    border: 'border-teal-400/20' },
  red:     { text: 'text-red-400',     bg: 'bg-red-400/10',     border: 'border-red-400/20' },
  blue:    { text: 'text-blue-400',    bg: 'bg-blue-400/10',    border: 'border-blue-400/20' },
  orange:  { text: 'text-orange-400',  bg: 'bg-orange-400/10',  border: 'border-orange-400/20' },
  indigo:  { text: 'text-indigo-400',  bg: 'bg-indigo-400/10',  border: 'border-indigo-400/20' },
};

const REPORT_SECTIONS = [
  'Business Question', 'Dataset Used', 'Data Quality Score', 'Data Sufficiency Score',
  'Metrics Used', 'Methodology', 'Key Findings', 'Evidence', 'Root Cause / Driver Analysis',
  'Business Impact', 'Risks', 'Recommendations', 'Confidence Score', 'Limitations',
  'Next Steps', 'Appendix (SQL/Python)',
];

function CollapsibleSection({ title, icon: Icon, color = 'cyan', children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  const cm = COLOR_MAP[color] || COLOR_MAP.cyan;
  return (
    <div className={`rounded-2xl border overflow-hidden ${cm.border}`}>
      <button onClick={() => setOpen(v => !v)}
        className={`w-full flex items-center justify-between gap-2 px-5 py-3 ${cm.bg} hover:opacity-90 transition-all text-left`}>
        <div className="flex items-center gap-2">
          {Icon && <Icon className={`w-4 h-4 ${cm.text}`} />}
          <span className="text-sm font-bold text-white/85">{title}</span>
        </div>
        {open ? <ChevronUp className="w-3.5 h-3.5 text-white/30" /> : <ChevronDown className="w-3.5 h-3.5 text-white/30" />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden">
            <div className="px-5 py-4">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function GeneratedReport({ report, reportType, onExport, onSave }) {
  if (!report) return null;
  const r = report;
  const cm = COLOR_MAP[reportType?.color] || COLOR_MAP.cyan;

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      {/* Header */}
      <div className={`p-5 rounded-2xl border ${cm.border} ${cm.bg}`}>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-lg font-black text-white/90">{r.title || reportType?.name || 'Report'}</h2>
            <p className="text-xs text-white/40 mt-1">
              {r.dataset_name || 'Dataset'} · Generated {new Date().toLocaleDateString()} · Confidence: <span className={cm.text}>{r.confidence_score || 0}%</span>
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={onSave} className="flex items-center gap-1.5 px-3 py-2 bg-green-400/10 border border-green-400/20 text-green-400 rounded-xl text-xs font-semibold hover:bg-green-400/15 transition-all">
              <Save className="w-3.5 h-3.5" /> Save Report
            </button>
            <button onClick={onExport} className="flex items-center gap-1.5 px-3 py-2 bg-white/8 border border-white/15 text-white/70 rounded-xl text-xs font-semibold hover:bg-white/12 transition-all">
              <Download className="w-3.5 h-3.5" /> Export MD
            </button>
          </div>
        </div>
      </div>

      {/* Data quality / sufficiency scores */}
      {(r.data_quality_score || r.data_sufficiency?.score) && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Confidence', value: `${r.confidence_score || 0}%`, color: (r.confidence_score || 0) >= 70 ? 'text-green-400' : 'text-amber-400' },
            { label: 'Data Sufficiency', value: `${r.data_sufficiency?.score || 0}%`, color: (r.data_sufficiency?.score || 0) >= 70 ? 'text-green-400' : 'text-amber-400' },
            { label: 'DQ Score', value: r.data_quality_score ? `${r.data_quality_score}%` : '—', color: 'text-cyan-400' },
            { label: 'Metrics Used', value: r.tools_used?.length || r.metricsUsed?.length || '—', color: 'text-purple-400' },
          ].map(m => (
            <div key={m.label} className="p-3 rounded-xl bg-white/3 border border-white/8 text-center">
              <div className={`text-xl font-black ${m.color}`}>{m.value}</div>
              <div className="text-xs text-white/30 mt-0.5">{m.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Report Sections */}
      <CollapsibleSection title="Business Question & Methodology" icon={Target} color={reportType?.color || 'cyan'}>
        <div className="space-y-2">
          <div className="text-xs text-white/30 font-semibold">Business Question</div>
          <p className="text-sm text-white/70">{r.business_question || r.userQuestion || 'Analysis of dataset metrics and trends.'}</p>
          {r.methodology && (
            <>
              <div className="text-xs text-white/30 font-semibold mt-3">Methodology</div>
              <p className="text-sm text-white/60">{r.methodology}</p>
            </>
          )}
          {r.metrics_used?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {r.metrics_used.map((m, i) => (
                <span key={i} className="text-xs px-2 py-0.5 rounded-lg bg-white/5 border border-white/10 text-white/50">{m}</span>
              ))}
            </div>
          )}
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Key Findings — Executive Summary" icon={Eye} color={reportType?.color || 'cyan'}>
        <p className="text-sm text-white/70 leading-relaxed">{r.executive_summary || r.what_happened || 'No summary available.'}</p>
      </CollapsibleSection>

      {r.why_it_happened && (
        <CollapsibleSection title="Root Cause & Driver Analysis" icon={Brain} color="purple">
          <p className="text-sm text-white/70 leading-relaxed">{r.why_it_happened}</p>
        </CollapsibleSection>
      )}

      {r.evidence?.length > 0 && (
        <CollapsibleSection title="Evidence & Supporting Data" icon={FileText} color="green">
          <div className="space-y-2">
            {r.evidence.map((e, i) => (
              <div key={i} className="p-3 rounded-xl bg-white/3 border border-white/8">
                <div className="text-xs font-semibold text-white/75">{e.finding}</div>
                <div className="text-xs text-white/40 mt-0.5">{e.method}{e.value ? ` → ${e.value}` : ''}</div>
                {e.sql && <code className="text-xs text-green-400/60 font-mono block mt-1 bg-black/20 rounded px-2 py-1">{e.sql}</code>}
              </div>
            ))}
          </div>
        </CollapsibleSection>
      )}

      {r.risk_assessment && (
        <CollapsibleSection title="Risk Assessment" icon={AlertTriangle} color="red">
          <p className="text-sm text-white/70 leading-relaxed">{r.risk_assessment}</p>
          {r.risks?.length > 0 && (
            <div className="mt-3 space-y-2">
              {r.risks.map((risk, i) => (
                <div key={i} className="p-3 rounded-xl bg-red-400/5 border border-red-400/15 flex items-start gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-red-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <div className="text-xs font-semibold text-red-400/80">{risk.risk}</div>
                    <div className="text-xs text-white/35 mt-0.5">Likelihood: {risk.likelihood} · Impact: {risk.impact}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CollapsibleSection>
      )}

      {r.recommendations?.length > 0 && (
        <CollapsibleSection title="Recommended Actions" icon={Target} color="amber">
          <div className="space-y-3">
            {r.recommendations.map((rec, i) => (
              <div key={i} className="p-3 rounded-xl bg-white/3 border border-white/8">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-sm font-semibold text-white/80">{rec.action}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${rec.priority === 'High' ? 'bg-red-400/10 border-red-400/20 text-red-400' : rec.priority === 'Medium' ? 'bg-amber-400/10 border-amber-400/20 text-amber-400' : 'bg-green-400/10 border-green-400/20 text-green-400'}`}>
                    {rec.priority}
                  </span>
                </div>
                <div className="text-xs text-white/40">
                  Impact: {rec.expected_impact} · Effort: {rec.effort} · Owner: {rec.owner}
                  {rec.timeline && ` · Timeline: ${rec.timeline}`}
                </div>
              </div>
            ))}
          </div>
        </CollapsibleSection>
      )}

      {r.business_impact && (
        <CollapsibleSection title="Business Impact" icon={TrendingUp} color="green">
          <p className="text-sm text-white/70 leading-relaxed">{r.business_impact}</p>
        </CollapsibleSection>
      )}

      {r.next_questions?.length > 0 && (
        <CollapsibleSection title="Next Steps & Follow-Up Questions" icon={Zap} color="teal" defaultOpen={false}>
          <div className="flex flex-wrap gap-2">
            {r.next_questions.map((q, i) => (
              <span key={i} className="text-xs px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-white/55">{q}</span>
            ))}
          </div>
        </CollapsibleSection>
      )}

      {r.limitations?.length > 0 && (
        <CollapsibleSection title="Limitations & Disclaimer" icon={AlertTriangle} color="amber" defaultOpen={false}>
          <ul className="space-y-1.5">
            {r.limitations.map((l, i) => (
              <li key={i} className="text-xs text-amber-400/70 flex items-start gap-1.5">
                <span className="text-amber-400/40 mt-0.5">•</span>{l}
              </li>
            ))}
          </ul>
          <p className="text-xs text-white/20 mt-3 italic">AI-generated report. Review with a qualified analyst before business decisions.</p>
        </CollapsibleSection>
      )}

      {(r.sql_generated || r.generated_python) && (
        <CollapsibleSection title="Appendix — SQL / Python Logic" icon={FileText} color="green" defaultOpen={false}>
          {r.sql_generated && (
            <div className="mb-3">
              <div className="text-xs text-white/30 font-semibold mb-1">SQL</div>
              <code className="text-xs text-green-400/70 font-mono block bg-black/20 rounded-xl px-4 py-3 whitespace-pre-wrap">{r.sql_generated}</code>
            </div>
          )}
          {r.generated_python && (
            <div>
              <div className="text-xs text-white/30 font-semibold mb-1">Python</div>
              <code className="text-xs text-purple-400/70 font-mono block bg-black/20 rounded-xl px-4 py-3 whitespace-pre-wrap">{r.generated_python}</code>
            </div>
          )}
        </CollapsibleSection>
      )}
    </motion.div>
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
        name: activeTable.name,
        rowCount: activeTable.rows?.length,
        columns: activeTable.columns?.slice(0, 25),
        rows: activeTable.rows?.slice(0, 50),
      } : null;

      const res = await base44.functions.invoke('runAgentOrchestrator', {
        question: `Generate a comprehensive ${selectedType.name}. Include: Business Question, Methodology, Key Findings (with specific numbers), Root Cause Analysis, Risk Assessment, Prioritized Recommendations (with impact/effort/owner), Business Impact, Limitations, and Next Steps. ${customContext}`,
        persona: selectedType.persona,
        tableData: tableContext,
        reportMode: true,
        reportType: selectedType.id,
        sessionId: `report_${Date.now()}`,
      });

      const data = res.data;
      const fullReport = {
        ...data,
        title: `${selectedType.name} — ${activeTable?.name || 'Dataset'}`,
        dataset_name: activeTable?.name || 'Unknown Dataset',
        what_happened: data.executive_summary,
        why_it_happened: data.root_cause,
        reportType: selectedType.id,
      };
      setReport(fullReport);
    } catch (e) {
      setReport({
        executive_summary: `Report generation failed: ${e.message}. Ensure a dataset is loaded and try again.`,
        recommendations: [],
        limitations: ['Report generation failed — check dataset and retry'],
        title: 'Generation Error',
        confidence_score: 0,
      });
    }
    setGenerating(false);
  };

  const handleSave = async () => {
    if (!report) return;
    try {
      await base44.entities.SharedReport.create({
        title: report.title,
        content: JSON.stringify(report),
        reportType: selectedType?.id || 'general',
        datasetName: activeTable?.name,
        confidenceScore: report.confidence_score,
        createdBy: '',
      }).catch(() => {});
      setSavedReports(r => [{
        id: Date.now(), type: selectedType?.id, name: selectedType?.name,
        dataset: activeTable?.name, generatedAt: new Date().toLocaleString(),
        confidence: report.confidence_score,
        reportData: report,
      }, ...r.slice(0, 14)]);
    } catch (e) {}
  };

  const handleExport = () => {
    if (!report) return;
    const sections = [
      `# ${report.title}`,
      `**Dataset:** ${report.dataset_name || 'N/A'}  **Generated:** ${new Date().toLocaleDateString()}  **Confidence:** ${report.confidence_score || 0}%`,
      `\n## Business Question\n${report.business_question || 'N/A'}`,
      `\n## Executive Summary\n${report.executive_summary || 'N/A'}`,
      `\n## Root Cause Analysis\n${report.why_it_happened || 'N/A'}`,
      report.evidence?.length > 0 ? `\n## Evidence\n${report.evidence.map(e => `- **${e.finding}** — ${e.method}${e.value ? ` → ${e.value}` : ''}`).join('\n')}` : '',
      `\n## Risk Assessment\n${report.risk_assessment || 'N/A'}`,
      report.recommendations?.length > 0 ? `\n## Recommendations\n${report.recommendations.map((r, i) => `${i + 1}. **${r.action}** [${r.priority}] — Impact: ${r.expected_impact}, Effort: ${r.effort}, Owner: ${r.owner}`).join('\n')}` : '',
      `\n## Business Impact\n${report.business_impact || 'N/A'}`,
      `\n## Limitations\n${report.limitations?.map(l => `- ${l}`).join('\n') || 'None stated'}`,
      `\n## Next Steps\n${report.next_questions?.map(q => `- ${q}`).join('\n') || 'N/A'}`,
      report.sql_generated ? `\n## Appendix — SQL\n\`\`\`sql\n${report.sql_generated}\n\`\`\`` : '',
    ].filter(Boolean).join('\n');

    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([sections], { type: 'text/markdown' }));
    a.download = `${report.title?.replace(/\s+/g, '_').toLowerCase()}_${Date.now()}.md`;
    a.click();
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="border-b border-white/8 px-8 py-5 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-400/15 border border-amber-400/25 flex items-center justify-center">
            <FileText className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h1 className="text-xl font-black">Decision Intelligence Reports</h1>
            <p className="text-xs text-muted-foreground">14 report types · Business Question · Methodology · Evidence · Risks · Recommendations · Confidence · Appendix</p>
          </div>
        </div>
        {activeTable ? (
          <div className="text-xs text-cyan-400/70 px-3 py-1.5 rounded-xl bg-cyan-400/8 border border-cyan-400/15 font-mono">{activeTable.name} · {activeTable.rows?.length?.toLocaleString()} rows</div>
        ) : (
          <div className="text-xs text-amber-400/70 px-3 py-1.5 rounded-xl bg-amber-400/8 border border-amber-400/15">⚠ Load dataset first</div>
        )}
      </div>

      <div className="flex gap-0 border-b border-white/8 px-8">
        {[
          { id: 'generate', label: 'Generate Report' },
          { id: 'saved', label: `Saved Reports (${savedReports.length})` },
          { id: 'structure', label: 'Report Structure' },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-3 text-xs font-semibold border-b-2 transition-all ${tab === t.id ? 'border-amber-400 text-amber-400' : 'border-transparent text-white/35 hover:text-white/60'}`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-8">
        {tab === 'generate' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Report type selector */}
            <div className="space-y-3">
              <div className="text-xs text-white/30 uppercase tracking-widest font-semibold">Select Report Type</div>
              <div className="space-y-1.5 max-h-[70vh] overflow-y-auto pr-1">
                {REPORT_TYPES.map(rt => {
                  const cm = COLOR_MAP[rt.color] || COLOR_MAP.cyan;
                  return (
                    <button key={rt.id} onClick={() => setSelectedType(rt)}
                      className={`w-full text-left p-3 rounded-xl border transition-all ${selectedType?.id === rt.id ? `${cm.border} ${cm.bg}` : 'border-white/8 bg-white/2 hover:border-white/15'}`}>
                      <div className="flex items-center gap-2 mb-0.5">
                        <rt.icon className={`w-3.5 h-3.5 ${cm.text}`} />
                        <span className={`text-xs font-semibold ${selectedType?.id === rt.id ? cm.text : 'text-white/75'}`}>{rt.name}</span>
                      </div>
                      <p className="text-xs text-white/30 leading-relaxed">{rt.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Main area */}
            <div className="lg:col-span-2 space-y-4">
              {!activeTable && (
                <div className="p-4 rounded-xl bg-amber-400/8 border border-amber-400/20 text-sm text-amber-400">
                  ⚠ No dataset loaded. Go to Workspace to upload and select a dataset first.
                </div>
              )}

              {selectedType && (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-white/35 mb-1.5 block">Additional Context (optional)</label>
                    <textarea value={customContext} onChange={e => setCustomContext(e.target.value)} rows={3}
                      placeholder="e.g. Focus on Q4 performance, compare to last year, stakeholder is the board, highlight risks in North region…"
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none resize-none" />
                  </div>
                  <button onClick={generateReport} disabled={generating || !activeTable}
                    className="w-full py-3 bg-amber-400/15 border border-amber-400/25 text-amber-400 rounded-xl text-sm font-bold hover:bg-amber-400/20 transition-all disabled:opacity-40 flex items-center justify-center gap-2">
                    {generating ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating {selectedType.name}…</> : <><FileText className="w-4 h-4" /> Generate {selectedType.name}</>}
                  </button>
                </div>
              )}

              {report && (
                <GeneratedReport
                  report={report}
                  reportType={selectedType}
                  onExport={handleExport}
                  onSave={handleSave}
                />
              )}
            </div>
          </div>
        )}

        {tab === 'saved' && (
          <div className="space-y-3 max-w-3xl">
            {savedReports.length === 0 ? (
              <div className="text-center py-12 text-sm text-white/30">
                <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />No reports saved yet.
              </div>
            ) : savedReports.map(r => (
              <motion.div key={r.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                className="p-4 rounded-2xl border border-white/8 bg-white/2 flex items-center gap-4">
                <FileText className="w-8 h-8 text-amber-400 flex-shrink-0" />
                <div className="flex-1">
                  <div className="font-semibold text-sm text-white/80">{r.name}</div>
                  <div className="text-xs text-white/35">{r.dataset} · {r.generatedAt} · Confidence: {r.confidence}%</div>
                </div>
                <button onClick={() => setSavedReports(s => s.filter(x => x.id !== r.id))}
                  className="p-1.5 text-white/20 hover:text-red-400 transition-all">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            ))}
          </div>
        )}

        {tab === 'structure' && (
          <div className="max-w-2xl space-y-4">
            <div className="p-4 rounded-xl bg-amber-400/5 border border-amber-400/15 text-xs text-white/60">
              Every Decision Intelligence Report includes all 17 sections below. Each section is AI-generated from your live dataset.
            </div>
            <div className="space-y-2">
              {REPORT_SECTIONS.map((section, i) => (
                <div key={section} className="flex items-center gap-3 p-3 rounded-xl bg-white/2 border border-white/8">
                  <span className="text-xs font-mono text-amber-400/60 w-6">{String(i + 1).padStart(2, '0')}</span>
                  <span className="text-sm text-white/70">{section}</span>
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-400 ml-auto" />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}