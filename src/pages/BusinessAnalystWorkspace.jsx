/**
 * Business Analyst Workspace — Phase 3
 * Full BA workflow: Problem Framing, BRD, Process Maps, ROI, Stakeholders, UAT, Gap Analysis
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Briefcase, ChevronLeft, FileText, Map, DollarSign,
  Users, ClipboardList, Zap, Download, Loader2,
  CheckCircle2, AlertTriangle, Target, ArrowRight
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import ExportToPptx from '@/components/export/ExportToPptx';

// ── Algorithms ────────────────────────────────────────────────────
function calcROI(benefit, cost) {
  if (!cost || cost <= 0) return null;
  return (((benefit - cost) / cost) * 100).toFixed(1);
}
function calcPayback(initialCost, monthlyBenefit, monthlyCost = 0) {
  const net = monthlyBenefit - monthlyCost;
  if (net <= 0) return 'No payback';
  return (initialCost / net).toFixed(1) + ' months';
}
function calcBizImpact(revenue, cost, customer, ops, risk) {
  return ((revenue * 0.30) + (cost * 0.25) + (customer * 0.20) + (ops * 0.15) + (risk * 0.10)).toFixed(1);
}
function calcReqPriority(bv, tc, rr, effort) {
  return (((bv + tc + rr) / Math.max(effort, 1))).toFixed(2);
}

const TABS = [
  { id: 'problem', label: 'Problem Framing', icon: Target },
  { id: 'brd', label: 'BRD Generator', icon: FileText },
  { id: 'process', label: 'Process Map', icon: Map },
  { id: 'roi', label: 'ROI Calculator', icon: DollarSign },
  { id: 'stakeholders', label: 'Stakeholders', icon: Users },
  { id: 'uat', label: 'UAT Test Cases', icon: ClipboardList },
];

// ── Problem Framing ───────────────────────────────────────────────
function ProblemFramingTab() {
  const [problem, setProblem] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const analyze = async () => {
    if (!problem.trim()) return;
    setLoading(true);
    try {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a Senior Business Analyst. Frame this business problem using structured analysis:

Problem: "${problem}"

Return a detailed JSON with exactly these fields:
{
  "problem_statement": "clear one-paragraph problem statement",
  "scope": "what is in and out of scope",
  "background": "business context and history",
  "impact_areas": ["list", "of", "impacted", "areas"],
  "stakeholders": [{"name":"role name","power":"High/Med/Low","interest":"High/Med/Low","impact":"description"}],
  "kpis": [{"name":"KPI name","formula":"formula","current":"current value estimate","target":"target"}],
  "root_causes": ["root cause 1","root cause 2"],
  "business_impact_score": <number 0-100>,
  "urgency": "Critical/High/Medium/Low",
  "recommended_approach": "3-4 sentence recommended solution approach",
  "risks": [{"risk":"description","likelihood":"H/M/L","impact":"H/M/L"}],
  "success_criteria": ["criterion 1","criterion 2"]
}`,
        response_json_schema: {
          type: 'object',
          properties: {
            problem_statement: { type: 'string' },
            scope: { type: 'string' },
            background: { type: 'string' },
            impact_areas: { type: 'array', items: { type: 'string' } },
            stakeholders: { type: 'array', items: { type: 'object' } },
            kpis: { type: 'array', items: { type: 'object' } },
            root_causes: { type: 'array', items: { type: 'string' } },
            business_impact_score: { type: 'number' },
            urgency: { type: 'string' },
            recommended_approach: { type: 'string' },
            risks: { type: 'array', items: { type: 'object' } },
            success_criteria: { type: 'array', items: { type: 'string' } },
          },
        },
      });
      setResult(res);
    } catch (e) { toast.error(e.message); }
    setLoading(false);
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="text-xs text-white/40 block mb-1.5">Describe the Business Problem</label>
        <textarea value={problem} onChange={e => setProblem(e.target.value)} rows={4}
          placeholder="e.g. Our sales conversion rate dropped 22% in Q3. The North region is underperforming. Customer complaints increased 40%..."
          className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none resize-none" />
      </div>
      <button onClick={analyze} disabled={loading || !problem.trim()}
        className="flex items-center gap-2 px-5 py-2.5 bg-blue-400/15 border border-blue-400/25 text-blue-400 rounded-xl text-sm font-bold hover:bg-blue-400/20 transition-all disabled:opacity-40">
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Target className="w-4 h-4" />}
        {loading ? 'Analyzing…' : 'Frame Business Problem'}
      </button>

      {result && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Kpi label="Business Impact Score" value={`${result.business_impact_score}/100`} color="text-blue-400" />
            <Kpi label="Urgency" value={result.urgency} color={result.urgency === 'Critical' ? 'text-red-400' : 'text-amber-400'} />
            <Kpi label="Stakeholders" value={result.stakeholders?.length || 0} color="text-purple-400" />
            <Kpi label="KPIs Defined" value={result.kpis?.length || 0} color="text-cyan-400" />
          </div>
          <Section title="Problem Statement" color="blue">{result.problem_statement}</Section>
          <Section title="Scope" color="blue">{result.scope}</Section>
          <Section title="Root Causes" color="red">
            <ul className="space-y-1">{result.root_causes?.map((r, i) => <li key={i} className="flex items-start gap-2 text-xs text-white/70"><AlertTriangle className="w-3.5 h-3.5 text-red-400 flex-shrink-0 mt-0.5"/>{r}</li>)}</ul>
          </Section>
          <Section title="KPI Success Measures" color="cyan">
            <div className="overflow-auto"><table className="w-full text-xs border-collapse">
              <thead><tr className="border-b border-white/10">{['KPI','Formula','Current','Target'].map(h=><th key={h} className="text-left px-2 py-1.5 text-white/40">{h}</th>)}</tr></thead>
              <tbody>{result.kpis?.map((k,i)=><tr key={i} className="border-b border-white/5"><td className="px-2 py-1.5 text-white/80">{k.name}</td><td className="px-2 py-1.5 text-cyan-400 font-mono">{k.formula}</td><td className="px-2 py-1.5 text-white/50">{k.current}</td><td className="px-2 py-1.5 text-green-400">{k.target}</td></tr>)}</tbody>
            </table></div>
          </Section>
          <Section title="Recommended Approach" color="green">{result.recommended_approach}</Section>
          <Section title="Success Criteria" color="teal">
            <ul className="space-y-1">{result.success_criteria?.map((c,i)=><li key={i} className="flex items-start gap-2 text-xs text-white/70"><CheckCircle2 className="w-3.5 h-3.5 text-teal-400 flex-shrink-0 mt-0.5"/>{c}</li>)}</ul>
          </Section>
          <ExportToPptx title="Business Problem Analysis" subtitle={problem.slice(0,60)}
            filename="ba_problem_analysis"
            slides={[
              { heading: 'Problem Statement', bullets: [result.problem_statement, `Urgency: ${result.urgency}`, `Impact Score: ${result.business_impact_score}/100`] },
              { heading: 'Root Causes', bullets: result.root_causes },
              { heading: 'KPI Success Measures', table: { headers: ['KPI','Formula','Target'], rows: result.kpis?.map(k=>[k.name,k.formula,k.target]) || [] } },
              { heading: 'Recommended Approach', bullets: [result.recommended_approach] },
            ]}
          />
        </motion.div>
      )}
    </div>
  );
}

// ── BRD Generator ─────────────────────────────────────────────────
function BRDTab() {
  const [form, setForm] = useState({ project: '', context: '', requester: '', deadline: '' });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    if (!form.project.trim()) return;
    setLoading(true);
    try {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a Senior Business Analyst. Generate a complete Business Requirements Document (BRD) for:
Project: "${form.project}"
Context: "${form.context}"
Requested By: "${form.requester}"
Deadline: "${form.deadline}"

Return a detailed JSON:
{
  "project_title": "",
  "executive_summary": "2-3 paragraphs",
  "business_objective": "",
  "scope_in": ["item1","item2"],
  "scope_out": ["item1","item2"],
  "assumptions": ["assumption1","assumption2"],
  "constraints": ["constraint1","constraint2"],
  "functional_requirements": [{"id":"FR-001","requirement":"","priority":"Must/Should/Could","effort":"H/M/L","business_value":"H/M/L"}],
  "non_functional_requirements": [{"id":"NFR-001","category":"Performance/Security/Usability","requirement":"","priority":"H/M/L"}],
  "business_rules": ["rule1","rule2"],
  "user_stories": [{"id":"US-001","role":"","want":"","so_that":"","acceptance_criteria":[""]}],
  "data_requirements": ["data req 1"],
  "integration_points": ["system 1"],
  "kpis": [{"name":"","formula":"","target":""}],
  "risks": [{"risk":"","likelihood":"H/M/L","impact":"H/M/L","mitigation":""}],
  "dependencies": ["dep1"],
  "timeline_phases": [{"phase":"","duration":"","deliverables":[""]}],
  "roi_estimate": {"benefit":"estimated annual benefit","cost":"estimated implementation cost","roi_pct":"estimated ROI %","payback":"payback period"}
}`,
        response_json_schema: {
          type: 'object',
          properties: {
            project_title: { type: 'string' },
            executive_summary: { type: 'string' },
            business_objective: { type: 'string' },
            scope_in: { type: 'array', items: { type: 'string' } },
            scope_out: { type: 'array', items: { type: 'string' } },
            assumptions: { type: 'array', items: { type: 'string' } },
            constraints: { type: 'array', items: { type: 'string' } },
            functional_requirements: { type: 'array', items: { type: 'object' } },
            non_functional_requirements: { type: 'array', items: { type: 'object' } },
            business_rules: { type: 'array', items: { type: 'string' } },
            user_stories: { type: 'array', items: { type: 'object' } },
            kpis: { type: 'array', items: { type: 'object' } },
            risks: { type: 'array', items: { type: 'object' } },
            timeline_phases: { type: 'array', items: { type: 'object' } },
            roi_estimate: { type: 'object' },
          },
        },
      });
      setResult(res);
    } catch (e) { toast.error(e.message); }
    setLoading(false);
  };

  const downloadBRD = () => {
    if (!result) return;
    const md = [
      `# Business Requirements Document`,
      `## ${result.project_title}`,
      `**Date:** ${new Date().toLocaleDateString()} | **Requested By:** ${form.requester}`,
      `\n### Executive Summary\n${result.executive_summary}`,
      `\n### Business Objective\n${result.business_objective}`,
      `\n### Scope In\n${result.scope_in?.map(s=>`- ${s}`).join('\n')}`,
      `\n### Scope Out\n${result.scope_out?.map(s=>`- ${s}`).join('\n')}`,
      `\n### Functional Requirements\n${result.functional_requirements?.map(r=>`**${r.id}** [${r.priority}] — ${r.requirement}`).join('\n')}`,
      `\n### User Stories\n${result.user_stories?.map(u=>`**${u.id}:** As a ${u.role}, I want ${u.want}, so that ${u.so_that}`).join('\n')}`,
      `\n### Risks\n${result.risks?.map(r=>`- ${r.risk} [L:${r.likelihood} I:${r.impact}] → ${r.mitigation}`).join('\n')}`,
      `\n### ROI Estimate\nBenefit: ${result.roi_estimate?.benefit} | Cost: ${result.roi_estimate?.cost} | ROI: ${result.roi_estimate?.roi_pct} | Payback: ${result.roi_estimate?.payback}`,
    ].join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([md], { type: 'text/markdown' }));
    a.download = `BRD_${form.project.replace(/\s+/g,'_')}.md`;
    a.click();
    toast.success('BRD downloaded!');
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div><label className="text-xs text-white/40 block mb-1">Project Name *</label>
          <input value={form.project} onChange={e=>setForm(f=>({...f,project:e.target.value}))} placeholder="e.g. CRM Upgrade 2026"
            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none"/></div>
        <div><label className="text-xs text-white/40 block mb-1">Requested By</label>
          <input value={form.requester} onChange={e=>setForm(f=>({...f,requester:e.target.value}))} placeholder="e.g. VP of Sales"
            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none"/></div>
      </div>
      <div><label className="text-xs text-white/40 block mb-1">Business Context</label>
        <textarea value={form.context} onChange={e=>setForm(f=>({...f,context:e.target.value}))} rows={3}
          placeholder="Describe the business problem, current state, and why this project is needed..."
          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none resize-none"/></div>

      <div className="flex gap-3">
        <button onClick={generate} disabled={loading || !form.project.trim()}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-400/15 border border-blue-400/25 text-blue-400 rounded-xl text-sm font-bold hover:bg-blue-400/20 disabled:opacity-40 transition-all">
          {loading ? <Loader2 className="w-4 h-4 animate-spin"/> : <FileText className="w-4 h-4"/>}
          {loading ? 'Generating BRD…' : 'Generate Full BRD'}
        </button>
        {result && <button onClick={downloadBRD} className="flex items-center gap-2 px-4 py-2.5 bg-green-400/10 border border-green-400/20 text-green-400 rounded-xl text-sm font-bold hover:bg-green-400/15 transition-all">
          <Download className="w-4 h-4"/> Download BRD (.md)
        </button>}
      </div>

      {result && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <Section title="Executive Summary" color="blue">{result.executive_summary}</Section>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Section title="Scope — In" color="green">
              <ul>{result.scope_in?.map((s,i)=><li key={i} className="text-xs text-white/70 flex items-start gap-2 mb-1"><CheckCircle2 className="w-3 h-3 text-green-400 mt-0.5 flex-shrink-0"/>{s}</li>)}</ul>
            </Section>
            <Section title="Scope — Out" color="red">
              <ul>{result.scope_out?.map((s,i)=><li key={i} className="text-xs text-white/50 flex items-start gap-2 mb-1"><span className="text-red-400 mt-0.5 flex-shrink-0">✗</span>{s}</li>)}</ul>
            </Section>
          </div>
          <Section title="Functional Requirements" color="blue">
            <div className="overflow-auto"><table className="w-full text-xs border-collapse">
              <thead><tr className="border-b border-white/10">{['ID','Requirement','Priority','Effort','Value'].map(h=><th key={h} className="text-left px-2 py-1.5 text-white/40">{h}</th>)}</tr></thead>
              <tbody>{result.functional_requirements?.map((r,i)=><tr key={i} className="border-b border-white/5"><td className="px-2 py-1.5 font-mono text-blue-400">{r.id}</td><td className="px-2 py-1.5 text-white/80">{r.requirement}</td><td className={`px-2 py-1.5 font-bold ${r.priority==='Must'?'text-red-400':r.priority==='Should'?'text-amber-400':'text-green-400'}`}>{r.priority}</td><td className="px-2 py-1.5 text-white/50">{r.effort}</td><td className="px-2 py-1.5 text-white/50">{r.business_value}</td></tr>)}</tbody>
            </table></div>
          </Section>
          <Section title="User Stories" color="purple">
            {result.user_stories?.map((u,i)=><div key={i} className="mb-3 p-3 bg-white/3 rounded-xl border border-white/8">
              <div className="text-xs font-bold text-purple-400 mb-1">{u.id}</div>
              <div className="text-xs text-white/70">As a <strong>{u.role}</strong>, I want <strong>{u.want}</strong>, so that <strong>{u.so_that}</strong></div>
            </div>)}
          </Section>
          <Section title="ROI Estimate" color="cyan">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[['Benefit',result.roi_estimate?.benefit,'text-green-400'],['Cost',result.roi_estimate?.cost,'text-red-400'],['ROI',result.roi_estimate?.roi_pct,'text-cyan-400'],['Payback',result.roi_estimate?.payback,'text-amber-400']].map(([l,v,c])=><Kpi key={l} label={l} value={v||'—'} color={c}/>)}
            </div>
          </Section>
          <ExportToPptx title={`BRD: ${result.project_title}`} subtitle={`Requested by: ${form.requester}`}
            filename={`BRD_${form.project.replace(/\s+/g,'_')}`}
            slides={[
              { heading: 'Executive Summary', bullets: [result.executive_summary] },
              { heading: 'Functional Requirements', table: { headers: ['ID','Requirement','Priority'], rows: result.functional_requirements?.map(r=>[r.id,r.requirement,r.priority])||[] } },
              { heading: 'User Stories', bullets: result.user_stories?.map(u=>`${u.id}: As a ${u.role}, I want ${u.want}`)||[] },
              { heading: 'ROI & Timeline', bullets: [`Benefit: ${result.roi_estimate?.benefit}`,`Cost: ${result.roi_estimate?.cost}`,`ROI: ${result.roi_estimate?.roi_pct}`,`Payback: ${result.roi_estimate?.payback}`] },
            ]}
          />
        </motion.div>
      )}
    </div>
  );
}

// ── Process Map ───────────────────────────────────────────────────
function ProcessMapTab() {
  const [process, setProcess] = useState('');
  const [mapType, setMapType] = useState('current');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    if (!process.trim()) return;
    setLoading(true);
    try {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a Senior Business Analyst. Generate a ${mapType}-state process map for: "${process}"

Return JSON:
{
  "process_name": "",
  "description": "",
  "mermaid_diagram": "valid Mermaid flowchart LR diagram code (use -- for edges, no special chars in labels)",
  "steps": [{"step_number":1,"actor":"","action":"","input":"","output":"","pain_points":[""],"time_estimate":""}],
  "bottlenecks": ["bottleneck 1"],
  "improvements": ["improvement 1"],
  "kpis": [{"name":"","formula":"","target":""}]
}`,
        response_json_schema: {
          type: 'object',
          properties: {
            process_name: { type: 'string' },
            description: { type: 'string' },
            mermaid_diagram: { type: 'string' },
            steps: { type: 'array', items: { type: 'object' } },
            bottlenecks: { type: 'array', items: { type: 'string' } },
            improvements: { type: 'array', items: { type: 'string' } },
            kpis: { type: 'array', items: { type: 'object' } },
          },
        },
      });
      setResult(res);
    } catch (e) { toast.error(e.message); }
    setLoading(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {['current','future'].map(t=><button key={t} onClick={()=>setMapType(t)}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${mapType===t?'bg-blue-400/15 border border-blue-400/25 text-blue-400':'bg-white/5 border border-white/10 text-white/40 hover:text-white/70'}`}>
          {t==='current'?'Current-State':'Future-State'} Map
        </button>)}
      </div>
      <div><label className="text-xs text-white/40 block mb-1">Describe the Process</label>
        <textarea value={process} onChange={e=>setProcess(e.target.value)} rows={3}
          placeholder="e.g. Sales order approval process, Customer onboarding workflow, Data reporting pipeline..."
          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none resize-none"/></div>
      <button onClick={generate} disabled={loading||!process.trim()}
        className="flex items-center gap-2 px-5 py-2.5 bg-blue-400/15 border border-blue-400/25 text-blue-400 rounded-xl text-sm font-bold hover:bg-blue-400/20 disabled:opacity-40 transition-all">
        {loading?<Loader2 className="w-4 h-4 animate-spin"/>:<Map className="w-4 h-4"/>}
        {loading?'Generating Map…':`Generate ${mapType==='current'?'Current':'Future'}-State Map`}
      </button>

      {result && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <Section title="Process Description" color="blue">{result.description}</Section>
          {result.mermaid_diagram && (
            <Section title="Process Flow (Mermaid Diagram)" color="cyan">
              <div className="bg-black/30 rounded-xl p-4 border border-white/8">
                <pre className="text-xs text-cyan-400/80 font-mono whitespace-pre-wrap overflow-auto">{result.mermaid_diagram}</pre>
              </div>
              <p className="text-xs text-white/30 mt-2">Copy the diagram code above and paste it at mermaid.live to render visually.</p>
            </Section>
          )}
          <Section title="Process Steps" color="blue">
            <div className="space-y-2">
              {result.steps?.map((s,i)=><div key={i} className="p-3 bg-white/3 rounded-xl border border-white/8">
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-5 h-5 rounded-full bg-blue-400/20 text-blue-400 text-xs font-bold flex items-center justify-center flex-shrink-0">{s.step_number}</span>
                  <span className="text-xs font-semibold text-white/80">{s.action}</span>
                  <span className="text-xs text-white/35 ml-auto">Actor: {s.actor} · {s.time_estimate}</span>
                </div>
                {s.pain_points?.length>0 && <div className="ml-7 text-xs text-red-400/70">⚠ {s.pain_points.join(', ')}</div>}
              </div>)}
            </div>
          </Section>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Section title="Bottlenecks" color="red">
              <ul>{result.bottlenecks?.map((b,i)=><li key={i} className="text-xs text-white/70 flex gap-2 mb-1"><AlertTriangle className="w-3.5 h-3.5 text-red-400 flex-shrink-0 mt-0.5"/>{b}</li>)}</ul>
            </Section>
            <Section title="Improvements" color="green">
              <ul>{result.improvements?.map((b,i)=><li key={i} className="text-xs text-white/70 flex gap-2 mb-1"><CheckCircle2 className="w-3.5 h-3.5 text-green-400 flex-shrink-0 mt-0.5"/>{b}</li>)}</ul>
            </Section>
          </div>
        </motion.div>
      )}
    </div>
  );
}

// ── ROI Calculator ────────────────────────────────────────────────
function ROITab() {
  const [form, setForm] = useState({ initialCost: '', monthlyBenefit: '', monthlyCost: '', annualBenefit: '', revenueImpact: 50, costImpact: 30, customerImpact: 60, opsImpact: 40, riskImpact: 70 });
  const roi = form.annualBenefit && form.initialCost ? calcROI(Number(form.annualBenefit), Number(form.initialCost)) : null;
  const payback = form.initialCost && form.monthlyBenefit ? calcPayback(Number(form.initialCost), Number(form.monthlyBenefit), Number(form.monthlyCost||0)) : null;
  const bizScore = calcBizImpact(form.revenueImpact, form.costImpact, form.customerImpact, form.opsImpact, form.riskImpact);

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="grid grid-cols-2 gap-4">
        {[['initialCost','Initial Investment ($)',''],['annualBenefit','Annual Benefit ($)',''],['monthlyBenefit','Monthly Benefit ($)',''],['monthlyCost','Monthly Ongoing Cost ($)','0']].map(([k,l,ph])=>(
          <div key={k}><label className="text-xs text-white/40 block mb-1">{l}</label>
            <input type="number" value={form[k]} onChange={e=>setForm(f=>({...f,[k]:e.target.value}))} placeholder={ph}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none"/></div>
        ))}
      </div>

      {(roi || payback) && (
        <div className="grid grid-cols-2 gap-3">
          <Kpi label="ROI %" value={roi ? `${roi}%` : '—'} color={Number(roi)>0?'text-green-400':'text-red-400'}/>
          <Kpi label="Payback Period" value={payback||'—'} color="text-cyan-400"/>
        </div>
      )}

      <div className="space-y-3">
        <div className="text-xs text-white/40 font-semibold uppercase tracking-widest">Business Impact Score Inputs (0–100)</div>
        {[['revenueImpact','Revenue Impact','text-green-400'],['costImpact','Cost Reduction Impact','text-blue-400'],['customerImpact','Customer Impact','text-purple-400'],['opsImpact','Operational Efficiency','text-teal-400'],['riskImpact','Risk Reduction','text-amber-400']].map(([k,l,c])=>(
          <div key={k} className="flex items-center gap-3">
            <label className="text-xs text-white/50 w-48 flex-shrink-0">{l}</label>
            <input type="range" min={0} max={100} value={form[k]} onChange={e=>setForm(f=>({...f,[k]:Number(e.target.value)}))} className="flex-1"/>
            <span className={`text-xs font-bold w-8 text-right ${c}`}>{form[k]}</span>
          </div>
        ))}
        <div className="p-3 bg-blue-400/10 border border-blue-400/20 rounded-xl flex items-center justify-between">
          <span className="text-xs text-white/60">Business Impact Score</span>
          <span className="text-xl font-black text-blue-400">{bizScore} / 100</span>
        </div>
        <p className="text-xs text-white/30 font-mono">Formula: (Revenue×0.30) + (Cost×0.25) + (Customer×0.20) + (Ops×0.15) + (Risk×0.10)</p>
      </div>
    </div>
  );
}

// ── Stakeholder Matrix ────────────────────────────────────────────
function StakeholderTab() {
  const [project, setProject] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    if (!project.trim()) return;
    setLoading(true);
    try {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `Generate a Stakeholder & Requirements Matrix for project: "${project}"
Return JSON:
{
  "stakeholders": [{"name":"","role":"","power":"High/Med/Low","interest":"High/Med/Low","need":"","priority":"High/Med/Low","risk":"","decision_power":"Yes/No","engagement_strategy":""}],
  "user_stories": [{"id":"US-001","role":"","want":"","so_that":"","priority_score":<number>,"acceptance_criteria":[""]}],
  "raci_matrix": [{"task":"","responsible":"","accountable":"","consulted":"","informed":""}]
}`,
        response_json_schema: {
          type: 'object',
          properties: {
            stakeholders: { type: 'array', items: { type: 'object' } },
            user_stories: { type: 'array', items: { type: 'object' } },
            raci_matrix: { type: 'array', items: { type: 'object' } },
          },
        },
      });
      setResult(res);
    } catch (e) { toast.error(e.message); }
    setLoading(false);
  };

  return (
    <div className="space-y-4">
      <div><label className="text-xs text-white/40 block mb-1">Project / Initiative Name</label>
        <input value={project} onChange={e=>setProject(e.target.value)} placeholder="e.g. CRM Upgrade, Reporting Automation, Sales Dashboard"
          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none"/></div>
      <button onClick={generate} disabled={loading||!project.trim()}
        className="flex items-center gap-2 px-5 py-2.5 bg-blue-400/15 border border-blue-400/25 text-blue-400 rounded-xl text-sm font-bold hover:bg-blue-400/20 disabled:opacity-40 transition-all">
        {loading?<Loader2 className="w-4 h-4 animate-spin"/>:<Users className="w-4 h-4"/>}
        {loading?'Generating…':'Generate Stakeholder Matrix'}
      </button>

      {result && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <Section title="Stakeholder Matrix" color="blue">
            <div className="overflow-auto"><table className="w-full text-xs border-collapse">
              <thead><tr className="border-b border-white/10">{['Name','Role','Power','Interest','Need','Decision Power','Strategy'].map(h=><th key={h} className="text-left px-2 py-1.5 text-white/40 whitespace-nowrap">{h}</th>)}</tr></thead>
              <tbody>{result.stakeholders?.map((s,i)=><tr key={i} className="border-b border-white/5">
                <td className="px-2 py-2 font-semibold text-white/80">{s.name}</td>
                <td className="px-2 py-2 text-white/50">{s.role}</td>
                <td className={`px-2 py-2 font-bold ${s.power==='High'?'text-red-400':s.power==='Med'?'text-amber-400':'text-green-400'}`}>{s.power}</td>
                <td className={`px-2 py-2 font-bold ${s.interest==='High'?'text-blue-400':s.interest==='Med'?'text-purple-400':'text-white/40'}`}>{s.interest}</td>
                <td className="px-2 py-2 text-white/60 max-w-xs">{s.need}</td>
                <td className="px-2 py-2 text-white/50">{s.decision_power}</td>
                <td className="px-2 py-2 text-white/40">{s.engagement_strategy}</td>
              </tr>)}</tbody>
            </table></div>
          </Section>
          <Section title="Prioritized User Stories" color="purple">
            {result.user_stories?.map((u,i)=><div key={i} className="mb-2 p-3 bg-white/3 rounded-xl border border-white/8 flex justify-between items-start gap-2">
              <div><div className="text-xs font-bold text-purple-400">{u.id}</div>
                <div className="text-xs text-white/70 mt-0.5">As a <strong>{u.role}</strong>, I want <strong>{u.want}</strong>, so that <strong>{u.so_that}</strong></div>
                {u.acceptance_criteria?.length>0 && <div className="text-xs text-white/40 mt-1">✓ {u.acceptance_criteria.join(' | ')}</div>}
              </div>
              <div className="text-xs text-white/40 flex-shrink-0">Priority: <span className="font-bold text-purple-400">{u.priority_score}</span></div>
            </div>)}
          </Section>
        </motion.div>
      )}
    </div>
  );
}

// ── UAT Test Cases ────────────────────────────────────────────────
function UATTab() {
  const [feature, setFeature] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [statuses, setStatuses] = useState({});

  const generate = async () => {
    if (!feature.trim()) return;
    setLoading(true);
    try {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `Generate comprehensive UAT test cases for feature: "${feature}"
Return JSON:
{
  "feature_name": "",
  "test_cases": [{"id":"TC-001","test_scenario":"","preconditions":"","test_steps":["step 1"],"expected_result":"","actual_result":"TBD","severity":"Critical/High/Medium/Low","test_type":"Functional/UI/Integration/Performance"}]
}`,
        response_json_schema: {
          type: 'object',
          properties: {
            feature_name: { type: 'string' },
            test_cases: { type: 'array', items: { type: 'object' } },
          },
        },
      });
      setResult(res);
    } catch (e) { toast.error(e.message); }
    setLoading(false);
  };

  const toggleStatus = (id) => setStatuses(s => ({ ...s, [id]: s[id] === 'pass' ? 'fail' : s[id] === 'fail' ? null : 'pass' }));

  return (
    <div className="space-y-4">
      <div><label className="text-xs text-white/40 block mb-1">Feature / Module to Test</label>
        <textarea value={feature} onChange={e=>setFeature(e.target.value)} rows={2}
          placeholder="e.g. User login and authentication, Sales report generation, Customer data import..."
          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none resize-none"/></div>
      <button onClick={generate} disabled={loading||!feature.trim()}
        className="flex items-center gap-2 px-5 py-2.5 bg-blue-400/15 border border-blue-400/25 text-blue-400 rounded-xl text-sm font-bold hover:bg-blue-400/20 disabled:opacity-40 transition-all">
        {loading?<Loader2 className="w-4 h-4 animate-spin"/>:<ClipboardList className="w-4 h-4"/>}
        {loading?'Generating UAT…':'Generate UAT Test Cases'}
      </button>

      {result && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs text-white/40">{result.test_cases?.length} test cases generated for <strong className="text-white/70">{result.feature_name}</strong></div>
            <div className="flex gap-2 text-xs">
              <span className="text-green-400">{Object.values(statuses).filter(s=>s==='pass').length} Pass</span>
              <span className="text-red-400">{Object.values(statuses).filter(s=>s==='fail').length} Fail</span>
            </div>
          </div>
          {result.test_cases?.map((tc,i)=>(
            <div key={i} className={`p-3 rounded-xl border transition-all ${statuses[tc.id]==='pass'?'border-green-400/25 bg-green-400/5':statuses[tc.id]==='fail'?'border-red-400/25 bg-red-400/5':'border-white/8 bg-white/2'}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono text-blue-400">{tc.id}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded font-bold ${tc.severity==='Critical'?'bg-red-400/15 text-red-400':tc.severity==='High'?'bg-orange-400/15 text-orange-400':'bg-amber-400/15 text-amber-400'}`}>{tc.severity}</span>
                    <span className="text-xs text-white/30">{tc.test_type}</span>
                  </div>
                  <div className="text-xs font-semibold text-white/80 mb-1">{tc.test_scenario}</div>
                  <div className="text-xs text-white/50 mb-1">Expected: {tc.expected_result}</div>
                  <div className="text-xs text-white/30">Steps: {tc.test_steps?.join(' → ')}</div>
                </div>
                <div className="flex gap-1.5 flex-shrink-0">
                  <button onClick={()=>setStatuses(s=>({...s,[tc.id]:'pass'}))} className={`px-2 py-1 rounded-lg text-xs font-bold transition-all ${statuses[tc.id]==='pass'?'bg-green-400 text-black':'bg-green-400/10 text-green-400 hover:bg-green-400/20'}`}>✓ Pass</button>
                  <button onClick={()=>setStatuses(s=>({...s,[tc.id]:'fail'}))} className={`px-2 py-1 rounded-lg text-xs font-bold transition-all ${statuses[tc.id]==='fail'?'bg-red-400 text-white':'bg-red-400/10 text-red-400 hover:bg-red-400/20'}`}>✗ Fail</button>
                </div>
              </div>
            </div>
          ))}
        </motion.div>
      )}
    </div>
  );
}

// ── Helper components ─────────────────────────────────────────────
function Kpi({ label, value, color }) {
  return (
    <div className="p-3 rounded-xl bg-white/3 border border-white/8 text-center">
      <div className={`text-xl font-black ${color}`}>{value}</div>
      <div className="text-xs text-white/30 mt-0.5">{label}</div>
    </div>
  );
}

const COLOR_CLASSES = {
  blue: { border: 'border-blue-400/20', bg: 'bg-blue-400/5', icon: 'text-blue-400' },
  green: { border: 'border-green-400/20', bg: 'bg-green-400/5', icon: 'text-green-400' },
  red: { border: 'border-red-400/20', bg: 'bg-red-400/5', icon: 'text-red-400' },
  cyan: { border: 'border-cyan-400/20', bg: 'bg-cyan-400/5', icon: 'text-cyan-400' },
  teal: { border: 'border-teal-400/20', bg: 'bg-teal-400/5', icon: 'text-teal-400' },
  purple: { border: 'border-purple-400/20', bg: 'bg-purple-400/5', icon: 'text-purple-400' },
  amber: { border: 'border-amber-400/20', bg: 'bg-amber-400/5', icon: 'text-amber-400' },
};

function Section({ title, color = 'cyan', children }) {
  const c = COLOR_CLASSES[color] || COLOR_CLASSES.cyan;
  return (
    <div className={`rounded-xl border ${c.border} overflow-hidden`}>
      <div className={`px-4 py-2.5 ${c.bg} text-xs font-bold text-white/70 uppercase tracking-widest`}>{title}</div>
      <div className="px-4 py-3">{typeof children === 'string' ? <p className="text-sm text-white/70 leading-relaxed">{children}</p> : children}</div>
    </div>
  );
}

const TAB_COMPONENTS = {
  problem: ProblemFramingTab,
  brd: BRDTab,
  process: ProcessMapTab,
  roi: ROITab,
  stakeholders: StakeholderTab,
  uat: UATTab,
};

export default function BusinessAnalystWorkspace() {
  const [activeTab, setActiveTab] = useState('problem');
  const ActiveTab = TAB_COMPONENTS[activeTab];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-white/5 px-6 py-4 sticky top-0 z-10 bg-background/95 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link to="/role-select" className="p-1.5 rounded-lg text-white/40 hover:text-white/80 hover:bg-white/5 transition-all">
              <ChevronLeft className="w-4 h-4"/>
            </Link>
            <div className="w-9 h-9 rounded-xl bg-blue-400/10 border border-blue-400/20 flex items-center justify-center">
              <Briefcase className="w-4 h-4 text-blue-400"/>
            </div>
            <div>
              <h1 className="text-lg font-bold">Business Analyst Workspace</h1>
              <p className="text-xs text-muted-foreground">Problem Framing · BRD · Process Maps · ROI · Stakeholders · UAT</p>
            </div>
          </div>
          <Link to="/workspace" className="flex items-center gap-1.5 px-3 py-2 bg-cyan-400/10 border border-cyan-400/20 text-cyan-400 rounded-xl text-xs font-semibold hover:bg-cyan-400/15 transition-all">
            <Zap className="w-3.5 h-3.5"/> Full Workspace
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-white/8 px-6">
        <div className="max-w-6xl mx-auto flex gap-0 overflow-x-auto">
          {TABS.map(t=>(
            <button key={t.id} onClick={()=>setActiveTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-3 text-xs font-semibold border-b-2 whitespace-nowrap transition-all ${activeTab===t.id?'border-blue-400 text-blue-400':'border-transparent text-white/35 hover:text-white/60'}`}>
              <t.icon className="w-3.5 h-3.5"/> {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-6 py-6">
        <AnimatePresence mode="wait">
          <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}>
            <ActiveTab />
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}