/**
 * Marketing Analyst Workspace — Phase 3
 * Campaigns · CAC/ROAS/LTV · Attribution · A/B Tests · Funnel · Personas
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingUp, ChevronLeft, BarChart2, Users, Zap,
  Target, Activity, Loader2, Download, CheckCircle2
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import ExportToPptx from '@/components/export/ExportToPptx';

// ── Marketing Algorithms ──────────────────────────────────────────
function calcCTR(clicks, impressions) { return impressions > 0 ? ((clicks / impressions) * 100).toFixed(2) : '0'; }
function calcCPC(spend, clicks) { return clicks > 0 ? (spend / clicks).toFixed(2) : '0'; }
function calcCPA(spend, conversions) { return conversions > 0 ? (spend / conversions).toFixed(2) : '0'; }
function calcCAC(totalCost, newCustomers) { return newCustomers > 0 ? (totalCost / newCustomers).toFixed(2) : '0'; }
function calcROAS(revenue, spend) { return spend > 0 ? (revenue / spend).toFixed(2) : '0'; }
function calcLTV(aov, freq, lifespan) { return (aov * freq * lifespan).toFixed(2); }
function calcLTVCACRatio(ltv, cac) { return cac > 0 ? (ltv / cac).toFixed(2) : '0'; }
function calcConversionRate(conversions, visitors) { return visitors > 0 ? ((conversions / visitors) * 100).toFixed(2) : '0'; }
function calcChurnRate(lost, starting) { return starting > 0 ? ((lost / starting) * 100).toFixed(2) : '0'; }

function abTestZScore(convA, visA, convB, visB) {
  const pA = convA / visA;
  const pB = convB / visB;
  const pooled = (convA + convB) / (visA + visB);
  const se = Math.sqrt(pooled * (1 - pooled) * (1 / visA + 1 / visB));
  const z = Math.abs((pB - pA) / se);
  const uplift = ((pB - pA) / pA * 100).toFixed(1);
  const significant = z >= 1.96;
  const confidence = Math.min(99.9, (1 - Math.exp(-0.8 * z)) * 100).toFixed(1);
  return { pA: (pA * 100).toFixed(2), pB: (pB * 100).toFixed(2), z: z.toFixed(2), uplift, significant, confidence };
}

function linearAttribution(revenue, channels) {
  if (!channels.length) return [];
  const credit = revenue / channels.length;
  return channels.map(c => ({ channel: c, revenue: credit.toFixed(2), pct: (100 / channels.length).toFixed(1) }));
}

function timeDecayAttribution(revenue, touchpoints, decay = 0.1) {
  const weights = touchpoints.map(t => Math.exp(-decay * t.days));
  const total = weights.reduce((a, b) => a + b, 0);
  return touchpoints.map((t, i) => ({
    channel: t.channel,
    revenue: (revenue * weights[i] / total).toFixed(2),
    pct: (weights[i] / total * 100).toFixed(1),
  }));
}

const TABS = [
  { id: 'campaign', label: 'Campaign Studio', icon: BarChart2 },
  { id: 'kpicalc', label: 'CAC/ROAS/LTV', icon: Target },
  { id: 'attribution', label: 'Attribution Engine', icon: Activity },
  { id: 'abtest', label: 'A/B Test Lab', icon: Zap },
  { id: 'funnel', label: 'Funnel Analysis', icon: TrendingUp },
  { id: 'persona', label: 'Persona Generator', icon: Users },
];

// ── Campaign Studio ───────────────────────────────────────────────
function CampaignStudio() {
  const [campaigns, setCampaigns] = useState([
    { name: 'Google Search Q2', channel: 'Google Ads', spend: 15000, impressions: 280000, clicks: 8400, leads: 420, conversions: 84, revenue: 67200 },
    { name: 'Meta Retargeting', channel: 'Meta Ads', spend: 8000, impressions: 540000, clicks: 10800, leads: 216, conversions: 43, revenue: 34400 },
    { name: 'LinkedIn B2B', channel: 'LinkedIn', spend: 12000, impressions: 95000, clicks: 1900, leads: 285, conversions: 57, revenue: 85500 },
    { name: 'Email Newsletter', channel: 'Email', spend: 2000, impressions: 45000, clicks: 5850, leads: 351, conversions: 70, revenue: 28000 },
  ]);
  const [ai, setAi] = useState(null);
  const [loading, setLoading] = useState(false);

  const enriched = campaigns.map(c => ({
    ...c,
    ctr: calcCTR(c.clicks, c.impressions),
    cpc: calcCPC(c.spend, c.clicks),
    cpa: calcCPA(c.spend, c.conversions),
    roas: calcROAS(c.revenue, c.spend),
    conv_rate: calcConversionRate(c.conversions, c.clicks),
  }));

  const getAIInsight = async () => {
    setLoading(true);
    try {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a Senior Marketing Analyst. Analyze these campaigns:
${JSON.stringify(enriched, null, 2)}

Provide structured analysis JSON:
{
  "best_roas_campaign": "",
  "worst_roas_campaign": "",
  "scale_recommendation": "",
  "stop_recommendation": "",
  "budget_reallocation": "",
  "next_experiment": "",
  "projected_revenue_uplift": "",
  "summary": "3-4 paragraph detailed analysis with specific numbers"
}`,
        response_json_schema: {
          type: 'object',
          properties: {
            best_roas_campaign: { type: 'string' },
            worst_roas_campaign: { type: 'string' },
            scale_recommendation: { type: 'string' },
            stop_recommendation: { type: 'string' },
            budget_reallocation: { type: 'string' },
            next_experiment: { type: 'string' },
            projected_revenue_uplift: { type: 'string' },
            summary: { type: 'string' },
          },
        },
      });
      setAi(res);
    } catch (e) { toast.error(e.message); }
    setLoading(false);
  };

  return (
    <div className="space-y-4">
      <div className="text-xs text-white/30 mb-2">Edit campaigns below · All marketing metrics auto-calculated</div>
      <div className="overflow-auto rounded-xl border border-white/10">
        <table className="w-full text-xs border-collapse">
          <thead><tr className="bg-white/5 border-b border-white/10">
            {['Campaign','Channel','Spend ($)','Impressions','Clicks','Conversions','Revenue ($)','CTR%','CPC','CPA','ROAS'].map(h=><th key={h} className="text-left px-3 py-2.5 text-white/40 font-semibold whitespace-nowrap">{h}</th>)}
          </tr></thead>
          <tbody>{enriched.map((c,i)=><tr key={i} className="border-b border-white/5 hover:bg-white/2">
            <td className="px-3 py-2.5 font-semibold text-white/80">{c.name}</td>
            <td className="px-3 py-2.5 text-white/50">{c.channel}</td>
            <td className="px-3 py-2.5 text-white/60">${c.spend.toLocaleString()}</td>
            <td className="px-3 py-2.5 text-white/60">{c.impressions.toLocaleString()}</td>
            <td className="px-3 py-2.5 text-white/60">{c.clicks.toLocaleString()}</td>
            <td className="px-3 py-2.5 text-white/60">{c.conversions}</td>
            <td className="px-3 py-2.5 text-green-400 font-semibold">${c.revenue.toLocaleString()}</td>
            <td className="px-3 py-2.5 text-cyan-400">{c.ctr}%</td>
            <td className="px-3 py-2.5 text-white/50">${c.cpc}</td>
            <td className="px-3 py-2.5 text-white/50">${c.cpa}</td>
            <td className={`px-3 py-2.5 font-bold ${Number(c.roas)>=3?'text-green-400':Number(c.roas)>=2?'text-amber-400':'text-red-400'}`}>{c.roas}x</td>
          </tr>)}</tbody>
        </table>
      </div>
      <div className="flex gap-3">
        <button onClick={getAIInsight} disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-pink-400/15 border border-pink-400/25 text-pink-400 rounded-xl text-xs font-bold hover:bg-pink-400/20 disabled:opacity-40 transition-all">
          {loading?<Loader2 className="w-3.5 h-3.5 animate-spin"/>:<Zap className="w-3.5 h-3.5"/>}
          {loading?'Analyzing…':'AI Campaign Analysis'}
        </button>
        <ExportToPptx title="Campaign Performance Report" subtitle="Marketing Analytics"
          filename="campaign_performance"
          slides={[
            { heading: 'Campaign Overview', table: { headers: ['Campaign','ROAS','CTR%','CPA'], rows: enriched.map(c=>[c.name,`${c.roas}x`,`${c.ctr}%`,`$${c.cpa}`]) } },
            ...(ai ? [{ heading: 'AI Recommendations', bullets: [ai.scale_recommendation, ai.stop_recommendation, ai.budget_reallocation, ai.next_experiment] }] : []),
          ]}
        />
      </div>
      {ai && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[['Best ROAS',ai.best_roas_campaign,'text-green-400'],['Worst ROAS',ai.worst_roas_campaign,'text-red-400'],['Scale',ai.scale_recommendation,'text-cyan-400'],['Uplift',ai.projected_revenue_uplift,'text-purple-400']].map(([l,v,c])=><div key={l} className="p-3 bg-white/3 border border-white/8 rounded-xl text-center"><div className={`text-xs font-bold ${c} mb-1 leading-snug`}>{v}</div><div className="text-xs text-white/30">{l}</div></div>)}
          </div>
          <Section title="AI Marketing Analysis" color="pink">{ai.summary}</Section>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Section title="Scale This Campaign" color="green">{ai.scale_recommendation}</Section>
            <Section title="Stop / Reduce Budget" color="red">{ai.stop_recommendation}</Section>
            <Section title="Budget Reallocation" color="cyan">{ai.budget_reallocation}</Section>
            <Section title="Next Experiment" color="purple">{ai.next_experiment}</Section>
          </div>
        </motion.div>
      )}
    </div>
  );
}

// ── KPI Calculator ────────────────────────────────────────────────
function KPICalculator() {
  const [v, setV] = useState({ spend: '', newCustomers: '', aov: '', freq: '', lifespan: '', lost: '', starting: '', conversions: '', visitors: '', revenue: '' });
  const update = (k, val) => setV(p => ({ ...p, [k]: val }));
  const n = k => Number(v[k]) || 0;

  const metrics = [
    { label: 'CAC', value: `$${calcCAC(n('spend'), n('newCustomers'))}`, formula: 'Spend / New Customers', color: 'text-red-400' },
    { label: 'ROAS', value: `${calcROAS(n('revenue'), n('spend'))}x`, formula: 'Revenue / Spend', color: 'text-green-400' },
    { label: 'LTV', value: `$${calcLTV(n('aov'), n('freq'), n('lifespan'))}`, formula: 'AOV × Freq × Lifespan', color: 'text-cyan-400' },
    { label: 'LTV:CAC', value: `${calcLTVCACRatio(calcLTV(n('aov'), n('freq'), n('lifespan')), calcCAC(n('spend'), n('newCustomers')))}x`, formula: 'LTV / CAC (target: >3)', color: 'text-purple-400' },
    { label: 'Churn Rate', value: `${calcChurnRate(n('lost'), n('starting'))}%`, formula: 'Lost / Starting × 100', color: 'text-orange-400' },
    { label: 'Conversion Rate', value: `${calcConversionRate(n('conversions'), n('visitors'))}%`, formula: 'Conversions / Visitors × 100', color: 'text-teal-400' },
    { label: 'CPC', value: `$${calcCPC(n('spend'), n('conversions'))}`, formula: 'Spend / Clicks', color: 'text-amber-400' },
    { label: 'CPA', value: `$${calcCPA(n('spend'), n('conversions'))}`, formula: 'Spend / Conversions', color: 'text-pink-400' },
  ];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {[['spend','Marketing Spend ($)'],['newCustomers','New Customers'],['revenue','Campaign Revenue ($)'],['aov','Avg Order Value ($)'],['freq','Purchase Frequency (yr)'],['lifespan','Customer Lifespan (yr)'],['conversions','Conversions'],['visitors','Visitors / Clicks'],['lost','Lost Customers'],['starting','Starting Customers']].map(([k,l])=>(
          <div key={k}><label className="text-xs text-white/40 block mb-1">{l}</label>
            <input type="number" value={v[k]} onChange={e=>update(k,e.target.value)} placeholder="0"
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none"/></div>
        ))}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {metrics.map(m=>(
          <div key={m.label} className="p-4 bg-white/3 border border-white/8 rounded-xl text-center">
            <div className={`text-2xl font-black ${m.color} mb-1`}>{m.value}</div>
            <div className="text-xs text-white/60 font-semibold mb-1">{m.label}</div>
            <div className="text-xs text-white/25 font-mono">{m.formula}</div>
          </div>
        ))}
      </div>
      <div className="p-4 bg-white/3 border border-white/8 rounded-xl">
        <div className="text-xs text-white/40 font-semibold mb-2 uppercase tracking-widest">Marketing Formulas Reference</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
          {['CTR = Clicks / Impressions × 100','CPC = Ad Spend / Clicks','CPA = Spend / Conversions','CAC = Total Cost / New Customers','ROAS = Revenue / Spend','LTV = AOV × Frequency × Lifespan','LTV:CAC = LTV / CAC  (healthy >3)','Churn = Lost / Starting × 100','Retention = Retained / Starting × 100','Lead-to-Customer = Customers / Leads × 100'].map(f=>(
            <div key={f} className="text-xs font-mono text-cyan-400/60 bg-white/3 rounded px-2 py-1">{f}</div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Attribution Engine ────────────────────────────────────────────
function AttributionEngine() {
  const [revenue, setRevenue] = useState(50000);
  const [model, setModel] = useState('linear');
  const [channels, setChannels] = useState([
    { channel: 'Email', days: 30 },
    { channel: 'Google Ads', days: 14 },
    { channel: 'LinkedIn', days: 7 },
    { channel: 'Direct', days: 1 },
  ]);

  const results = model === 'first' ? channels.map((c,i) => ({ channel: c.channel, revenue: i === 0 ? revenue.toFixed(2) : '0.00', pct: i === 0 ? '100' : '0' }))
    : model === 'last' ? channels.map((c,i) => ({ channel: c.channel, revenue: i === channels.length - 1 ? revenue.toFixed(2) : '0.00', pct: i === channels.length - 1 ? '100' : '0' }))
    : model === 'linear' ? linearAttribution(revenue, channels.map(c => c.channel))
    : timeDecayAttribution(revenue, channels);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {[['first','First-Touch'],['last','Last-Touch'],['linear','Linear'],['timedecay','Time-Decay']].map(([m,l])=>(
          <button key={m} onClick={()=>setModel(m)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${model===m?'bg-pink-400/15 border border-pink-400/25 text-pink-400':'bg-white/5 border border-white/10 text-white/40 hover:text-white/70'}`}>
            {l}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="text-xs text-white/40 block mb-1">Total Campaign Revenue ($)</label>
          <input type="number" value={revenue} onChange={e=>setRevenue(Number(e.target.value))} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none"/></div>
        <div><label className="text-xs text-white/40 block mb-1">Touchpoints (in order, days before conversion)</label>
          <div className="flex gap-2">{channels.map((c,i)=><input key={i} type="number" value={c.days} onChange={e=>setChannels(ch=>ch.map((x,j)=>j===i?{...x,days:Number(e.target.value)}:x))} className="w-16 px-2 py-1 bg-white/5 border border-white/10 rounded-lg text-xs text-center focus:outline-none" title={c.channel}/>)}</div>
        </div>
      </div>
      <div className="overflow-auto rounded-xl border border-white/10">
        <table className="w-full text-xs border-collapse">
          <thead><tr className="bg-white/5 border-b border-white/10">{['Channel','Days Before','Attributed Revenue','Share %'].map(h=><th key={h} className="text-left px-3 py-2.5 text-white/40">{h}</th>)}</tr></thead>
          <tbody>{results.map((r,i)=><tr key={i} className="border-b border-white/5">
            <td className="px-3 py-2 text-white/80 font-semibold">{r.channel}</td>
            <td className="px-3 py-2 text-white/40">{channels[i]?.days} days</td>
            <td className="px-3 py-2 text-green-400 font-bold">${Number(r.revenue).toLocaleString()}</td>
            <td className="px-3 py-2"><div className="flex items-center gap-2"><div className="h-1.5 rounded-full bg-pink-400" style={{width:`${r.pct}%`,maxWidth:'120px'}}/><span className="text-white/60">{r.pct}%</span></div></td>
          </tr>)}</tbody>
        </table>
      </div>
      <div className="text-xs text-white/25 bg-white/3 rounded-xl px-4 py-3 font-mono">
        {model==='timedecay'?'Weight = e^(-0.1 × days_before_conversion) — recent touchpoints get more credit':
         model==='first'?'100% credit to the first touchpoint (awareness-focused)':
         model==='last'?'100% credit to the last touchpoint (conversion-focused)':
         'Revenue credit equally distributed across all touchpoints'}
      </div>
    </div>
  );
}

// ── A/B Test Lab ──────────────────────────────────────────────────
function ABTestLab() {
  const [f, setF] = useState({ nameA: 'Variant A', convA: 120, visA: 2000, nameB: 'Variant B', convB: 150, visB: 1950 });
  const n = k => Number(f[k]) || 0;
  const result = n('convA') && n('visA') && n('convB') && n('visB') ? abTestZScore(n('convA'), n('visA'), n('convB'), n('visB')) : null;

  return (
    <div className="space-y-4 max-w-xl">
      <div className="grid grid-cols-2 gap-4">
        {[['A','nameA','convA','visA'],['B','nameB','convB','visB']].map(([label,nk,ck,vk])=>(
          <div key={label} className="p-4 bg-white/3 border border-white/8 rounded-xl space-y-3">
            <div className="text-xs font-bold text-white/60">Variant {label}</div>
            <div><label className="text-xs text-white/40 block mb-1">Name</label>
              <input value={f[nk]} onChange={e=>setF(p=>({...p,[nk]:e.target.value}))} className="w-full px-2 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs focus:outline-none"/></div>
            <div><label className="text-xs text-white/40 block mb-1">Conversions</label>
              <input type="number" value={f[ck]} onChange={e=>setF(p=>({...p,[ck]:e.target.value}))} className="w-full px-2 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs focus:outline-none"/></div>
            <div><label className="text-xs text-white/40 block mb-1">Visitors</label>
              <input type="number" value={f[vk]} onChange={e=>setF(p=>({...p,[vk]:e.target.value}))} className="w-full px-2 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs focus:outline-none"/></div>
          </div>
        ))}
      </div>

      {result && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
          <div className={`p-4 rounded-xl border text-center ${result.significant ? 'border-green-400/25 bg-green-400/8' : 'border-amber-400/25 bg-amber-400/8'}`}>
            <div className={`text-2xl font-black mb-1 ${result.significant ? 'text-green-400' : 'text-amber-400'}`}>
              {result.significant ? '✓ STATISTICALLY SIGNIFICANT' : '⚠ NOT SIGNIFICANT YET'}
            </div>
            <div className="text-sm text-white/60">Confidence: <strong className={result.significant?'text-green-400':'text-amber-400'}>{result.confidence}%</strong> (need ≥95%)</div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Kpi label={`${f.nameA} Rate`} value={`${result.pA}%`} color="text-blue-400"/>
            <Kpi label={`${f.nameB} Rate`} value={`${result.pB}%`} color="text-pink-400"/>
            <Kpi label="Uplift" value={`${result.uplift}%`} color={Number(result.uplift)>0?'text-green-400':'text-red-400'}/>
            <Kpi label="Z-Score" value={result.z} color="text-cyan-400"/>
          </div>
          <div className="text-xs text-white/30 font-mono bg-white/3 rounded-xl px-4 py-3">
            Formula: z = (pB - pA) / √(p_pooled × (1-p_pooled) × (1/n1 + 1/n2)) · Significant if |z| ≥ 1.96 (95% CI)
          </div>
          {result.significant && (
            <div className={`p-3 rounded-xl border ${Number(result.uplift)>0?'border-green-400/20 bg-green-400/8':'border-red-400/20 bg-red-400/8'}`}>
              <strong className={Number(result.uplift)>0?'text-green-400':'text-red-400'}>Winner: {Number(result.uplift)>0?f.nameB:f.nameA}</strong>
              <span className="text-xs text-white/60 ml-2">with {Math.abs(result.uplift)}% {Number(result.uplift)>0?'improvement':'decline'} in conversion rate</span>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}

// ── Funnel Analysis ───────────────────────────────────────────────
function FunnelAnalysis() {
  const [stages, setStages] = useState([
    { name: 'Awareness', users: 100000 },
    { name: 'Interest', users: 35000 },
    { name: 'Consideration', users: 12000 },
    { name: 'Intent', users: 4200 },
    { name: 'Purchase', users: 840 },
  ]);
  const [loading, setLoading] = useState(false);
  const [ai, setAi] = useState(null);

  const getAnalysis = async () => {
    setLoading(true);
    const enriched = stages.map((s, i) => ({
      ...s,
      drop_off: i > 0 ? (((stages[i - 1].users - s.users) / stages[i - 1].users) * 100).toFixed(1) : '0',
      conversion_rate: i > 0 ? ((s.users / stages[i - 1].users) * 100).toFixed(1) : '100',
    }));
    try {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `Analyze this marketing funnel and identify the biggest drop-off, root cause, and specific recommendations:
${JSON.stringify(enriched, null, 2)}
Return JSON: {"biggest_leakage_stage":"","drop_off_pct":"","root_cause":"","recommendations":["",""],"overall_conversion":"","revenue_impact":"","priority_fix":""}`,
        response_json_schema: { type: 'object', properties: { biggest_leakage_stage: { type: 'string' }, drop_off_pct: { type: 'string' }, root_cause: { type: 'string' }, recommendations: { type: 'array', items: { type: 'string' } }, overall_conversion: { type: 'string' }, revenue_impact: { type: 'string' }, priority_fix: { type: 'string' } } },
      });
      setAi(res);
    } catch (e) { toast.error(e.message); }
    setLoading(false);
  };

  const maxUsers = stages[0]?.users || 1;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-5 gap-2">
        {stages.map((s, i) => (
          <div key={i} className="text-center">
            <input value={s.name} onChange={e => setStages(st => st.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} className="w-full px-2 py-1 bg-white/5 border border-white/10 rounded text-xs text-center mb-2 focus:outline-none" />
            <input type="number" value={s.users} onChange={e => setStages(st => st.map((x, j) => j === i ? { ...x, users: Number(e.target.value) } : x))} className="w-full px-2 py-1 bg-white/5 border border-white/10 rounded text-xs text-center focus:outline-none" />
          </div>
        ))}
      </div>
      <div className="space-y-2">
        {stages.map((s, i) => {
          const pct = (s.users / maxUsers * 100).toFixed(0);
          const drop = i > 0 ? (((stages[i - 1].users - s.users) / stages[i - 1].users) * 100).toFixed(1) : null;
          return (
            <div key={i} className="flex items-center gap-3">
              <div className="w-24 text-xs text-white/60 text-right flex-shrink-0">{s.name}</div>
              <div className="flex-1 h-6 bg-white/5 rounded-lg overflow-hidden">
                <div className="h-full bg-gradient-to-r from-pink-400 to-pink-500/50 rounded-lg transition-all" style={{ width: `${pct}%` }} />
              </div>
              <div className="w-20 text-xs text-white/60 flex-shrink-0">{s.users.toLocaleString()} ({pct}%)</div>
              {drop && <div className="w-16 text-xs text-red-400 flex-shrink-0">-{drop}%</div>}
            </div>
          );
        })}
      </div>
      <div className="flex gap-2">
        <button onClick={getAnalysis} disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-pink-400/15 border border-pink-400/25 text-pink-400 rounded-xl text-xs font-bold hover:bg-pink-400/20 disabled:opacity-40 transition-all">
          {loading?<Loader2 className="w-3.5 h-3.5 animate-spin"/>:<Zap className="w-3.5 h-3.5"/>}
          {loading?'Analyzing…':'AI Funnel Analysis'}
        </button>
      </div>
      {ai && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <Kpi label="Biggest Leakage" value={ai.biggest_leakage_stage} color="text-red-400"/>
            <Kpi label="Drop-off" value={ai.drop_off_pct} color="text-orange-400"/>
            <Kpi label="Overall Conv." value={ai.overall_conversion} color="text-green-400"/>
          </div>
          <Section title="Root Cause" color="red">{ai.root_cause}</Section>
          <Section title="Priority Fix" color="amber">{ai.priority_fix}</Section>
          <Section title="Recommendations" color="green">
            <ul>{ai.recommendations?.map((r,i)=><li key={i} className="flex items-start gap-2 text-xs text-white/70 mb-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-green-400 flex-shrink-0 mt-0.5"/>{r}</li>)}</ul>
          </Section>
        </motion.div>
      )}
    </div>
  );
}

// ── Persona Generator ─────────────────────────────────────────────
function PersonaGenerator() {
  const [segment, setSegment] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    if (!segment.trim()) return;
    setLoading(true);
    try {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `Generate 3 detailed customer personas for: "${segment}"
Return JSON:
{
  "personas": [{
    "name": "",
    "segment": "",
    "age_range": "",
    "job_title": "",
    "income": "",
    "pain_points": ["",""],
    "goals": ["",""],
    "best_channel": "",
    "offer_strategy": "",
    "ltv_estimate": "",
    "revenue_opportunity": "",
    "key_message": ""
  }]
}`,
        response_json_schema: { type: 'object', properties: { personas: { type: 'array', items: { type: 'object' } } } },
      });
      setResult(res);
    } catch (e) { toast.error(e.message); }
    setLoading(false);
  };

  return (
    <div className="space-y-4">
      <div><label className="text-xs text-white/40 block mb-1">Customer Segment or Business Type</label>
        <input value={segment} onChange={e=>setSegment(e.target.value)} placeholder="e.g. SaaS B2B mid-market, ecommerce fashion 25-35 women, healthcare IT buyers"
          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none"/></div>
      <button onClick={generate} disabled={loading||!segment.trim()}
        className="flex items-center gap-2 px-5 py-2.5 bg-pink-400/15 border border-pink-400/25 text-pink-400 rounded-xl text-sm font-bold hover:bg-pink-400/20 disabled:opacity-40 transition-all">
        {loading?<Loader2 className="w-4 h-4 animate-spin"/>:<Users className="w-4 h-4"/>}
        {loading?'Generating Personas…':'Generate Customer Personas'}
      </button>

      {result && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {result.personas?.map((p, i) => (
            <div key={i} className="p-4 bg-white/3 border border-pink-400/20 rounded-2xl space-y-3">
              <div className="text-sm font-black text-pink-400">{p.name}</div>
              <div className="text-xs text-white/50">{p.segment} · {p.age_range} · {p.job_title}</div>
              <div className="text-xs text-white/40">Income: {p.income}</div>
              <div><div className="text-xs text-white/30 mb-1 font-semibold">Pain Points</div>
                {p.pain_points?.map((pp,j)=><div key={j} className="text-xs text-white/60 mb-1">• {pp}</div>)}</div>
              <div><div className="text-xs text-white/30 mb-1 font-semibold">Goals</div>
                {p.goals?.map((g,j)=><div key={j} className="text-xs text-white/60 mb-1">✓ {g}</div>)}</div>
              <div className="p-2 bg-pink-400/8 rounded-lg">
                <div className="text-xs text-pink-400 font-semibold">Best Channel: {p.best_channel}</div>
                <div className="text-xs text-white/50 mt-1">{p.offer_strategy}</div>
              </div>
              <div className="text-xs text-green-400 font-semibold">LTV: {p.ltv_estimate} · Opportunity: {p.revenue_opportunity}</div>
            </div>
          ))}
        </motion.div>
      )}
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────
function Kpi({ label, value, color }) {
  return (
    <div className="p-3 rounded-xl bg-white/3 border border-white/8 text-center">
      <div className={`text-xl font-black ${color} leading-snug`}>{value}</div>
      <div className="text-xs text-white/30 mt-0.5">{label}</div>
    </div>
  );
}
const COLOR_CLASSES = { pink: 'border-pink-400/20 bg-pink-400/5', green: 'border-green-400/20 bg-green-400/5', red: 'border-red-400/20 bg-red-400/5', cyan: 'border-cyan-400/20 bg-cyan-400/5', purple: 'border-purple-400/20 bg-purple-400/5', amber: 'border-amber-400/20 bg-amber-400/5' };
function Section({ title, color = 'pink', children }) {
  const c = COLOR_CLASSES[color] || COLOR_CLASSES.pink;
  return (
    <div className={`rounded-xl border ${c} overflow-hidden`}>
      <div className={`px-4 py-2.5 text-xs font-bold text-white/70 uppercase tracking-widest`}>{title}</div>
      <div className="px-4 py-3">{typeof children === 'string' ? <p className="text-sm text-white/70 leading-relaxed">{children}</p> : children}</div>
    </div>
  );
}

const TAB_COMPONENTS = { campaign: CampaignStudio, kpicalc: KPICalculator, attribution: AttributionEngine, abtest: ABTestLab, funnel: FunnelAnalysis, persona: PersonaGenerator };

export default function MarketingAnalystWorkspace() {
  const [activeTab, setActiveTab] = useState('campaign');
  const ActiveTab = TAB_COMPONENTS[activeTab];
  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-white/5 px-6 py-4 sticky top-0 z-10 bg-background/95 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link to="/role-select" className="p-1.5 rounded-lg text-white/40 hover:text-white/80 hover:bg-white/5 transition-all"><ChevronLeft className="w-4 h-4"/></Link>
            <div className="w-9 h-9 rounded-xl bg-pink-400/10 border border-pink-400/20 flex items-center justify-center"><TrendingUp className="w-4 h-4 text-pink-400"/></div>
            <div><h1 className="text-lg font-bold">Marketing Analyst Workspace</h1>
              <p className="text-xs text-muted-foreground">Campaign · CAC/ROAS/LTV · Attribution · A/B Tests · Funnel · Personas</p></div>
          </div>
          <Link to="/workspace" className="flex items-center gap-1.5 px-3 py-2 bg-cyan-400/10 border border-cyan-400/20 text-cyan-400 rounded-xl text-xs font-semibold hover:bg-cyan-400/15 transition-all"><Zap className="w-3.5 h-3.5"/> Full Workspace</Link>
        </div>
      </div>
      <div className="border-b border-white/8 px-6">
        <div className="max-w-6xl mx-auto flex gap-0 overflow-x-auto">
          {TABS.map(t=><button key={t.id} onClick={()=>setActiveTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-3 text-xs font-semibold border-b-2 whitespace-nowrap transition-all ${activeTab===t.id?'border-pink-400 text-pink-400':'border-transparent text-white/35 hover:text-white/60'}`}>
            <t.icon className="w-3.5 h-3.5"/>{t.label}
          </button>)}
        </div>
      </div>
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