import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Loader2, BarChart2, Users, Target, Zap, DollarSign, Activity, ChevronRight, Copy, CheckCircle2 } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, FunnelChart, Funnel, LabelList, PieChart, Pie, Cell } from 'recharts';
import { base44 } from '@/api/base44Client';
import { DEMO_DATASETS, generateDemoData } from '@/lib/demoDatasets';
import { calculateMarketingKPIs, calculateABTest } from '@/lib/analyticsEngine';

const TABS = [
  { id: 'overview', label: '📊 Overview' },
  { id: 'campaigns', label: '📣 Campaign Performance' },
  { id: 'funnel', label: '🔻 Funnel Analysis' },
  { id: 'segments', label: '👥 Segmentation' },
  { id: 'clv', label: '💎 CLV Modeling' },
  { id: 'ab_test', label: '🧪 A/B Testing' },
  { id: 'ai_insights', label: '🧠 AI Insights' },
];

const COLORS = ['#00f5ff', '#a855f7', '#ec4899', '#f59e0b', '#22c55e', '#3b82f6'];

function KPICard({ label, value, sub, color = 'text-cyan-400', formula }) {
  return (
    <div className="glass-card rounded-2xl border border-white/8 p-4">
      <div className="text-xs text-white/40 mb-1">{label}</div>
      <div className={`text-2xl font-black font-mono ${color}`}>{value}</div>
      {sub && <div className="text-xs text-white/30 mt-1">{sub}</div>}
      {formula && <div className="text-xs text-white/20 font-mono mt-1 truncate" title={formula}>{formula}</div>}
    </div>
  );
}

export default function MarketingStudio() {
  const [activeTab, setActiveTab] = useState('overview');
  const [activeDataset, setActiveDataset] = useState(null);
  const [rows, setRows] = useState([]);
  const [aiInsight, setAiInsight] = useState(null);
  const [loadingAI, setLoadingAI] = useState(false);
  const [abControl, setAbControl] = useState({ conversions: 120, visitors: 2000 });
  const [abVariant, setAbVariant] = useState({ conversions: 165, visitors: 2100 });
  const [abResult, setAbResult] = useState(null);

  const loadDataset = (ds) => {
    const data = generateDemoData(ds.id);
    setActiveDataset(ds);
    setRows(data);
    setAiInsight(null);
  };

  const kpis = useMemo(() => rows.length ? calculateMarketingKPIs(rows) : null, [rows]);

  // Build channel breakdown
  const channelData = useMemo(() => {
    if (!rows.length) return [];
    const grouped = {};
    rows.forEach(r => {
      const ch = r.channel || r.campaign_name || 'Unknown';
      if (!grouped[ch]) grouped[ch] = { channel: ch, spend: 0, revenue: 0, conversions: 0, clicks: 0, impressions: 0 };
      const spend = Number(String(r.spend || 0).replace(/[$,]/g, '')) || 0;
      grouped[ch].spend += spend;
      grouped[ch].revenue += Number(r.revenue) || 0;
      grouped[ch].conversions += Number(r.conversions) || 0;
      grouped[ch].clicks += Number(r.clicks) || 0;
      grouped[ch].impressions += Number(r.impressions) || 0;
    });
    return Object.values(grouped).map(g => ({
      ...g,
      roas: g.spend > 0 ? (g.revenue / g.spend).toFixed(2) : 0,
      ctr: g.impressions > 0 ? (g.clicks / g.impressions * 100).toFixed(2) : 0,
      convRate: g.clicks > 0 ? (g.conversions / g.clicks * 100).toFixed(2) : 0,
    })).sort((a, b) => b.revenue - a.revenue).slice(0, 8);
  }, [rows]);

  const funnelData = useMemo(() => {
    if (!kpis) return [];
    return [
      { name: 'Impressions', value: kpis.impressions, fill: '#00f5ff' },
      { name: 'Clicks', value: kpis.clicks, fill: '#a855f7' },
      { name: 'Conversions', value: kpis.conversions, fill: '#ec4899' },
    ].filter(s => s.value > 0);
  }, [kpis]);

  const runABTest = () => {
    const result = calculateABTest(abControl.conversions, abControl.visitors, abVariant.conversions, abVariant.visitors);
    setAbResult(result);
  };

  const getAIInsights = async () => {
    if (!rows.length) return;
    setLoadingAI(true);
    try {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a Senior Marketing Analyst. Analyze this marketing dataset and provide deep insights.

Dataset: ${activeDataset?.name}
Total records: ${rows.length}
KPIs: ${JSON.stringify(kpis, null, 2)}
Top channels: ${channelData.slice(0, 5).map(c => `${c.channel}: spend=${c.spend}, revenue=${c.revenue}, ROAS=${c.roas}`).join('; ')}

Provide:
1. Executive summary (2-3 paragraphs with specific numbers)
2. Top performing channel and why
3. Underperforming channels that need attention
4. Budget reallocation recommendation
5. Funnel optimization opportunity
6. 4 specific, actionable recommendations with expected impact

Be specific, data-driven. Use actual numbers from the KPIs provided.`,
        response_json_schema: {
          type: 'object',
          properties: {
            executiveSummary: { type: 'string' },
            topChannel: { type: 'string' },
            underperformers: { type: 'array', items: { type: 'string' } },
            budgetRecommendation: { type: 'string' },
            funnelOpportunity: { type: 'string' },
            recommendations: { type: 'array', items: { type: 'string' } },
          }
        }
      });
      setAiInsight(res);
    } catch (e) {
      setAiInsight({ executiveSummary: `Error: ${e.message}`, recommendations: [] });
    }
    setLoadingAI(false);
  };

  const noDataState = (
    <div className="text-center py-20 text-white/25">
      <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-20" />
      <div>Load a dataset to see analytics</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-white/6 px-6 py-4 bg-navy-800/50 backdrop-blur sticky top-0 z-20">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-pink-400/10 border border-pink-400/20 flex items-center justify-center">
              <TrendingUp className="w-4.5 h-4.5 text-pink-400" />
            </div>
            <div>
              <h1 className="text-base font-bold">Marketing Analytics Studio</h1>
              <p className="text-xs text-white/40">Campaigns · Funnel · CLV · CAC · ROAS · A/B Testing · Segmentation</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {DEMO_DATASETS.filter(d => ['marketing_campaigns', 'ecommerce', 'saas_subscriptions'].includes(d.id)).map(ds => (
              <button key={ds.id} onClick={() => loadDataset(ds)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${activeDataset?.id === ds.id ? 'border-pink-400/30 bg-pink-400/10 text-pink-400' : 'border-white/10 text-white/40 hover:text-white/70'}`}>
                {ds.icon} {ds.name}
              </button>
            ))}
          </div>
        </div>
        <div className="max-w-7xl mx-auto mt-3 flex gap-1 overflow-x-auto pb-1">
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-pink-400/15 text-pink-400 border border-pink-400/25' : 'text-white/40 hover:text-white/70 hover:bg-white/5'}`}>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">

        {/* ── OVERVIEW ── */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {!kpis ? noDataState : (
              <>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  <KPICard label="Total Impressions" value={kpis.impressions.toLocaleString()} color="text-cyan-400" />
                  <KPICard label="Total Clicks" value={kpis.clicks.toLocaleString()} sub={`CTR: ${kpis.ctr}%`} color="text-purple-400" formula="CTR = Clicks / Impressions × 100" />
                  <KPICard label="Conversions" value={kpis.conversions.toLocaleString()} sub={`Conv Rate: ${kpis.conversionRate}%`} color="text-pink-400" formula="Conv Rate = Conversions / Clicks × 100" />
                  <KPICard label="Total Spend" value={`$${kpis.totalSpend.toLocaleString()}`} sub={`CPC: $${kpis.cpc}`} color="text-amber-400" formula="CPC = Spend / Clicks" />
                  <KPICard label="Total Revenue" value={`$${kpis.totalRevenue.toLocaleString()}`} sub={`ROAS: ${kpis.roas}x`} color="text-green-400" formula="ROAS = Revenue / Spend" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="glass-card rounded-xl border border-white/8 p-3">
                    <div className="text-xs text-white/40 mb-1">CAC</div>
                    <div className="text-xl font-black text-pink-400">${kpis.cac.toLocaleString()}</div>
                    <div className="text-xs text-white/25 font-mono mt-1">CAC = Spend / New Customers</div>
                  </div>
                  <div className="glass-card rounded-xl border border-white/8 p-3">
                    <div className="text-xs text-white/40 mb-1">Gross ROAS</div>
                    <div className={`text-xl font-black ${kpis.roas >= 3 ? 'text-green-400' : kpis.roas >= 1.5 ? 'text-yellow-400' : 'text-red-400'}`}>{kpis.roas}x</div>
                    <div className="text-xs text-white/25 mt-1">{kpis.roas >= 3 ? 'Excellent' : kpis.roas >= 1.5 ? 'Acceptable' : 'Below target'}</div>
                  </div>
                  <div className="glass-card rounded-xl border border-white/8 p-3">
                    <div className="text-xs text-white/40 mb-1">Avg CTR</div>
                    <div className={`text-xl font-black ${kpis.ctr >= 3 ? 'text-green-400' : kpis.ctr >= 1 ? 'text-yellow-400' : 'text-red-400'}`}>{kpis.ctr}%</div>
                    <div className="text-xs text-white/25 mt-1">{kpis.ctr >= 3 ? 'High engagement' : kpis.ctr >= 1 ? 'Average' : 'Low engagement'}</div>
                  </div>
                </div>

                {channelData.length > 0 && (
                  <div className="glass-card rounded-2xl border border-white/8 p-5">
                    <div className="text-sm font-bold mb-4">Revenue by Channel</div>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={channelData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                        <XAxis dataKey="channel" tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.4)' }} />
                        <YAxis tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.4)' }} />
                        <Tooltip contentStyle={{ background: 'hsl(222,44%,9%)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 11 }} />
                        <Bar dataKey="revenue" fill="#ec4899" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ── CAMPAIGN PERFORMANCE ── */}
        {activeTab === 'campaigns' && (
          <div className="space-y-4">
            {!channelData.length ? noDataState : (
              <>
                <div className="text-sm font-bold">Campaign Performance Table</div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-white/8">
                        {['Channel', 'Impressions', 'Clicks', 'CTR %', 'Conversions', 'Conv Rate %', 'Spend', 'Revenue', 'ROAS'].map(h => (
                          <th key={h} className="text-left py-2.5 px-3 text-white/40 font-semibold whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {channelData.map((row, i) => (
                        <tr key={i} className="border-b border-white/4 hover:bg-white/2">
                          <td className="py-2.5 px-3 font-semibold">{row.channel}</td>
                          <td className="py-2.5 px-3 text-white/60">{row.impressions.toLocaleString()}</td>
                          <td className="py-2.5 px-3 text-white/60">{row.clicks.toLocaleString()}</td>
                          <td className="py-2.5 px-3"><span className={`px-1.5 py-0.5 rounded text-xs ${Number(row.ctr) >= 3 ? 'bg-green-400/10 text-green-400' : 'bg-yellow-400/10 text-yellow-400'}`}>{row.ctr}%</span></td>
                          <td className="py-2.5 px-3 text-white/60">{row.conversions.toLocaleString()}</td>
                          <td className="py-2.5 px-3"><span className={`px-1.5 py-0.5 rounded text-xs ${Number(row.convRate) >= 3 ? 'bg-green-400/10 text-green-400' : 'bg-yellow-400/10 text-yellow-400'}`}>{row.convRate}%</span></td>
                          <td className="py-2.5 px-3 text-white/60">${row.spend.toLocaleString()}</td>
                          <td className="py-2.5 px-3 font-semibold text-green-400">${row.revenue.toLocaleString()}</td>
                          <td className="py-2.5 px-3"><span className={`px-1.5 py-0.5 rounded text-xs font-bold ${Number(row.roas) >= 3 ? 'bg-green-400/10 text-green-400' : Number(row.roas) >= 1.5 ? 'bg-yellow-400/10 text-yellow-400' : 'bg-red-400/10 text-red-400'}`}>{row.roas}x</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── FUNNEL ── */}
        {activeTab === 'funnel' && (
          <div className="space-y-6">
            {!kpis ? noDataState : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="glass-card rounded-2xl border border-white/8 p-5">
                  <div className="text-sm font-bold mb-4">Marketing Funnel</div>
                  <div className="space-y-2">
                    {funnelData.map((stage, i) => {
                      const pct = i === 0 ? 100 : funnelData[0].value > 0 ? (stage.value / funnelData[0].value * 100).toFixed(1) : 0;
                      const stepPct = i > 0 && funnelData[i - 1].value > 0 ? (stage.value / funnelData[i - 1].value * 100).toFixed(1) : 100;
                      return (
                        <div key={stage.name}>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-white/60">{stage.name}</span>
                            <span className="font-bold text-white">{stage.value.toLocaleString()}</span>
                          </div>
                          <div className="bg-white/5 rounded-full h-6 relative overflow-hidden">
                            <div className="h-6 rounded-full flex items-center px-2 text-xs font-bold"
                              style={{ width: `${pct}%`, background: stage.fill, color: 'hsl(222,47%,6%)' }}>
                              {pct}%
                            </div>
                          </div>
                          {i > 0 && <div className="text-xs text-white/30 mt-0.5">Step conversion: {stepPct}% · Drop-off: {(100 - Number(stepPct)).toFixed(1)}%</div>}
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="glass-card rounded-xl border border-white/8 p-4">
                    <div className="text-xs font-bold text-white/50 mb-3">FUNNEL FORMULAS</div>
                    <div className="space-y-2 font-mono text-xs">
                      <div><span className="text-cyan-400">CTR</span> = Clicks / Impressions × 100</div>
                      <div><span className="text-purple-400">Conv Rate</span> = Conversions / Clicks × 100</div>
                      <div><span className="text-pink-400">Drop-off</span> = (Prev - Current) / Prev × 100</div>
                      <div><span className="text-amber-400">CAC</span> = Total Spend / New Customers</div>
                      <div><span className="text-green-400">ROAS</span> = Revenue / Spend</div>
                      <div><span className="text-blue-400">CLV</span> = AOV × Purchase Freq × Lifespan</div>
                    </div>
                  </div>
                  <div className="glass-card rounded-xl border border-white/8 p-4">
                    <div className="text-xs font-bold text-white/50 mb-2">BENCHMARK</div>
                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between"><span className="text-white/50">CTR (good)</span><span className="text-green-400">&gt; 3%</span></div>
                      <div className="flex justify-between"><span className="text-white/50">Conv Rate (good)</span><span className="text-green-400">&gt; 3%</span></div>
                      <div className="flex justify-between"><span className="text-white/50">ROAS (good)</span><span className="text-green-400">&gt; 3x</span></div>
                      <div className="flex justify-between"><span className="text-white/50">CTR (average)</span><span className="text-yellow-400">1–3%</span></div>
                      <div className="flex justify-between"><span className="text-white/50">ROAS (break-even)</span><span className="text-yellow-400">1.5–3x</span></div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── SEGMENTATION ── */}
        {activeTab === 'segments' && (
          <div className="space-y-4">
            {!rows.length ? noDataState : (
              <>
                <div className="text-sm font-bold mb-4">RFM Customer Segmentation</div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    { segment: 'Champions', desc: 'Best customers — recent, frequent, high spend', color: 'text-green-400', border: 'border-green-400/25', bg: 'bg-green-400/10', action: 'Reward & upsell — they can promote your brand' },
                    { segment: 'Loyal Customers', desc: 'Buy regularly — respond well to offers', color: 'text-cyan-400', border: 'border-cyan-400/25', bg: 'bg-cyan-400/10', action: 'Offer membership programs and early access' },
                    { segment: 'At Risk', desc: 'Were once active — now showing churn signals', color: 'text-red-400', border: 'border-red-400/25', bg: 'bg-red-400/10', action: 'Send win-back campaigns with special offers' },
                    { segment: 'Potential Loyalists', desc: 'Recent customers with moderate frequency', color: 'text-purple-400', border: 'border-purple-400/25', bg: 'bg-purple-400/10', action: 'Offer loyalty program to increase frequency' },
                    { segment: 'New Customers', desc: 'Bought recently but not yet frequent', color: 'text-blue-400', border: 'border-blue-400/25', bg: 'bg-blue-400/10', action: 'Onboard well and guide to second purchase' },
                    { segment: 'Need Attention', desc: 'Low recency, frequency, and monetary', color: 'text-amber-400', border: 'border-amber-400/25', bg: 'bg-amber-400/10', action: 'Limited-time offer or survey to understand why' },
                  ].map(seg => (
                    <div key={seg.segment} className={`glass-card rounded-xl border ${seg.border} p-4`}>
                      <div className={`font-bold text-sm ${seg.color} mb-1`}>{seg.segment}</div>
                      <div className="text-xs text-white/50 mb-3">{seg.desc}</div>
                      <div className={`text-xs px-2 py-1.5 rounded-lg ${seg.bg} ${seg.color} leading-relaxed`}>
                        → {seg.action}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="glass-card rounded-xl border border-white/8 p-4">
                  <div className="text-xs font-mono text-cyan-400/70">
                    RFM Score = Recency Score (1-5) + Frequency Score (1-5) + Monetary Score (1-5)<br />
                    Champions: R≥4 AND F≥4 | Loyal: R≥3 AND F≥3 | At Risk: R≤2 AND F≥3
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── CLV MODELING ── */}
        {activeTab === 'clv' && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="glass-card rounded-2xl border border-white/8 p-5">
                <div className="text-sm font-bold mb-4">CLV Calculator</div>
                <div className="space-y-3">
                  {[
                    { label: 'Average Order Value (AOV)', key: 'aov', default: 85, formula: 'Revenue / Number of Orders' },
                    { label: 'Purchase Frequency (per year)', key: 'freq', default: 4, formula: 'Orders / Unique Customers per Year' },
                    { label: 'Customer Lifespan (years)', key: 'lifespan', default: 3, formula: 'Average customer retention period' },
                    { label: 'Gross Margin %', key: 'margin', default: 45, formula: '(Revenue - COGS) / Revenue × 100' },
                    { label: 'Discount Rate %', key: 'discount', default: 10, formula: 'Minimum ROI threshold' },
                  ].map(field => (
                    <div key={field.key}>
                      <label className="text-xs text-white/50">{field.label}</label>
                      <div className="text-xs text-white/25 font-mono mb-1">{field.formula}</div>
                      <input type="number" defaultValue={field.default} id={`clv-${field.key}`}
                        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm focus:outline-none" />
                    </div>
                  ))}
                  <button onClick={() => {
                    const aov = Number(document.getElementById('clv-aov').value);
                    const freq = Number(document.getElementById('clv-freq').value);
                    const lifespan = Number(document.getElementById('clv-lifespan').value);
                    const margin = Number(document.getElementById('clv-margin').value) / 100;
                    const discount = Number(document.getElementById('clv-discount').value) / 100;
                    const historicCLV = aov * freq * lifespan;
                    const predictiveCLV = (aov * freq * margin) / discount;
                    alert(`Historic CLV: $${historicCLV.toLocaleString()}\nPredictive CLV: $${predictiveCLV.toLocaleString()}\n\nHistoric = AOV × Frequency × Lifespan\nPredictive = (AOV × Frequency × Margin) / Discount Rate`);
                  }} className="w-full py-2.5 bg-pink-400 text-white rounded-xl text-sm font-bold hover:bg-pink-300 transition-all">
                    Calculate CLV
                  </button>
                </div>
              </div>
              <div className="space-y-3">
                <div className="glass-card rounded-xl border border-white/8 p-4">
                  <div className="text-xs font-bold text-white/50 mb-3">CLV FORMULAS</div>
                  <div className="space-y-2 text-xs font-mono">
                    <div className="p-2 bg-white/3 rounded"><span className="text-cyan-400">Historic CLV</span> = AOV × Purchase Frequency × Customer Lifespan</div>
                    <div className="p-2 bg-white/3 rounded"><span className="text-purple-400">Predictive CLV</span> = (AOV × Frequency × Gross Margin) / Discount Rate</div>
                    <div className="p-2 bg-white/3 rounded"><span className="text-pink-400">Churn Rate</span> = Lost Customers / Total Customers × 100</div>
                    <div className="p-2 bg-white/3 rounded"><span className="text-amber-400">Retention Rate</span> = 1 - Churn Rate</div>
                    <div className="p-2 bg-white/3 rounded"><span className="text-green-400">Payback Period</span> = CAC / (AOV × Gross Margin %)</div>
                    <div className="p-2 bg-white/3 rounded"><span className="text-teal-400">LTV/CAC Ratio</span> = CLV / CAC (target &gt; 3x)</div>
                  </div>
                </div>
                <div className="glass-card rounded-xl border border-white/8 p-4">
                  <div className="text-xs font-bold text-white/50 mb-2">BENCHMARKS</div>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between"><span className="text-white/50">LTV/CAC (excellent)</span><span className="text-green-400">&gt; 4x</span></div>
                    <div className="flex justify-between"><span className="text-white/50">LTV/CAC (good)</span><span className="text-cyan-400">3–4x</span></div>
                    <div className="flex justify-between"><span className="text-white/50">LTV/CAC (acceptable)</span><span className="text-yellow-400">2–3x</span></div>
                    <div className="flex justify-between"><span className="text-white/50">LTV/CAC (danger)</span><span className="text-red-400">&lt; 2x</span></div>
                    <div className="flex justify-between"><span className="text-white/50">Payback (SaaS ideal)</span><span className="text-green-400">&lt; 12 months</span></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── A/B TESTING ── */}
        {activeTab === 'ab_test' && (
          <div className="max-w-2xl space-y-5">
            <div className="text-sm font-bold">A/B Test Calculator</div>
            <div className="grid grid-cols-2 gap-4">
              <div className="glass-card rounded-xl border border-white/8 p-4 space-y-3">
                <div className="text-xs font-bold text-white/50">CONTROL (A)</div>
                <div>
                  <label className="text-xs text-white/40">Visitors</label>
                  <input type="number" value={abControl.visitors} onChange={e => setAbControl(c => ({ ...c, visitors: Number(e.target.value) }))}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm focus:outline-none mt-1" />
                </div>
                <div>
                  <label className="text-xs text-white/40">Conversions</label>
                  <input type="number" value={abControl.conversions} onChange={e => setAbControl(c => ({ ...c, conversions: Number(e.target.value) }))}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm focus:outline-none mt-1" />
                </div>
                <div className="text-xs text-cyan-400 font-mono">
                  Rate: {(abControl.conversions / Math.max(abControl.visitors, 1) * 100).toFixed(2)}%
                </div>
              </div>
              <div className="glass-card rounded-xl border border-white/8 p-4 space-y-3">
                <div className="text-xs font-bold text-white/50">VARIANT (B)</div>
                <div>
                  <label className="text-xs text-white/40">Visitors</label>
                  <input type="number" value={abVariant.visitors} onChange={e => setAbVariant(c => ({ ...c, visitors: Number(e.target.value) }))}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm focus:outline-none mt-1" />
                </div>
                <div>
                  <label className="text-xs text-white/40">Conversions</label>
                  <input type="number" value={abVariant.conversions} onChange={e => setAbVariant(c => ({ ...c, conversions: Number(e.target.value) }))}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm focus:outline-none mt-1" />
                </div>
                <div className="text-xs text-purple-400 font-mono">
                  Rate: {(abVariant.conversions / Math.max(abVariant.visitors, 1) * 100).toFixed(2)}%
                </div>
              </div>
            </div>
            <button onClick={runABTest} className="w-full py-3 bg-pink-400/15 border border-pink-400/25 text-pink-400 rounded-xl text-sm font-bold hover:bg-pink-400/20 transition-all">
              Run A/B Test Analysis
            </button>
            {abResult && (
              <div className={`glass-card rounded-2xl border p-5 ${abResult.significant ? 'border-green-400/25 bg-green-400/5' : 'border-yellow-400/25 bg-yellow-400/5'}`}>
                <div className={`text-lg font-black mb-3 ${abResult.significant ? 'text-green-400' : 'text-yellow-400'}`}>
                  {abResult.significant ? '✓ Statistically Significant!' : '⚠ Not Yet Significant'}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                  <div><div className="text-white/40">Control Rate</div><div className="font-bold text-cyan-400">{abResult.controlRate}%</div></div>
                  <div><div className="text-white/40">Variant Rate</div><div className="font-bold text-purple-400">{abResult.variantRate}%</div></div>
                  <div><div className="text-white/40">Lift</div><div className={`font-bold ${abResult.lift > 0 ? 'text-green-400' : 'text-red-400'}`}>{abResult.lift > 0 ? '+' : ''}{abResult.lift}%</div></div>
                  <div><div className="text-white/40">Z-Score</div><div className="font-mono font-bold">{abResult.zScore}</div></div>
                  <div><div className="text-white/40">P-Value</div><div className="font-mono font-bold">{abResult.pValue}</div></div>
                  <div><div className="text-white/40">Winner</div><div className="font-bold">{abResult.winner}</div></div>
                </div>
                <div className="mt-3 text-xs text-white/40 font-mono">
                  SE = √(p×(1-p)/n) | Z = (p1-p2) / √(SE1²+SE2²) | Significant if p-value &lt; 0.05
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── AI INSIGHTS ── */}
        {activeTab === 'ai_insights' && (
          <div className="space-y-5">
            {!rows.length ? (
              <div className="text-center py-12 text-white/30">
                <TrendingUp className="w-10 h-10 mx-auto mb-3 opacity-20" />
                Load a marketing dataset to get AI-powered insights
              </div>
            ) : (
              <>
                <button onClick={getAIInsights} disabled={loadingAI}
                  className="flex items-center gap-2 px-5 py-3 bg-pink-400/15 border border-pink-400/25 text-pink-400 rounded-xl text-sm font-bold hover:bg-pink-400/20 disabled:opacity-50 transition-all">
                  {loadingAI ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                  {loadingAI ? 'Analyzing campaigns…' : 'Generate AI Marketing Insights'}
                </button>
                {aiInsight && (
                  <div className="space-y-4">
                    {aiInsight.executiveSummary && (
                      <div className="glass-card rounded-2xl border border-pink-400/20 p-5">
                        <div className="text-xs font-bold text-pink-400 mb-2">EXECUTIVE SUMMARY</div>
                        <p className="text-sm text-white/70 leading-relaxed whitespace-pre-line">{aiInsight.executiveSummary}</p>
                      </div>
                    )}
                    {aiInsight.topChannel && (
                      <div className="glass-card rounded-xl border border-green-400/20 p-4">
                        <div className="text-xs font-bold text-green-400 mb-2">🏆 TOP PERFORMING CHANNEL</div>
                        <p className="text-sm text-white/70">{aiInsight.topChannel}</p>
                      </div>
                    )}
                    {aiInsight.budgetRecommendation && (
                      <div className="glass-card rounded-xl border border-cyan-400/20 p-4">
                        <div className="text-xs font-bold text-cyan-400 mb-2">💰 BUDGET REALLOCATION</div>
                        <p className="text-sm text-white/70">{aiInsight.budgetRecommendation}</p>
                      </div>
                    )}
                    {aiInsight.recommendations?.length > 0 && (
                      <div className="glass-card rounded-xl border border-white/8 p-4">
                        <div className="text-xs font-bold text-white/50 mb-3">✅ RECOMMENDATIONS</div>
                        <ol className="space-y-2">
                          {aiInsight.recommendations.map((rec, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm">
                              <span className="w-5 h-5 rounded-full bg-pink-400/10 border border-pink-400/25 text-pink-400 flex items-center justify-center text-xs font-bold flex-shrink-0">{i + 1}</span>
                              <span className="text-white/70">{rec}</span>
                            </li>
                          ))}
                        </ol>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}