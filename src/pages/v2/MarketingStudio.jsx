import { useState, useEffect } from 'react';
import { TrendingUp, Target, Users, Zap, BarChart2, RefreshCw, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, FunnelChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { generateDemoData } from '@/lib/demoDatasets';
import { calculateMarketingKPIs, calculateABTest, simpleLinearForecast } from '@/lib/analyticsEngine';
import { base44 } from '@/api/base44Client';

const MARKETING_TABS = ['Overview', 'Campaign Performance', 'Funnel Analysis', 'Customer Segmentation', 'A/B Testing', 'Churn Analysis', 'CLV Modeling', 'Channel ROI', 'Recommendations'];

const COLORS = ['#00f5ff', '#ff2d7a', '#a855f7', '#4caf50', '#ffcc02', '#ff6b35', '#00bcd4'];

function KpiCard({ label, value, sub, color = 'cyan', formula }) {
  const c = { cyan: 'text-cyan-400 bg-cyan-400/10 border-cyan-400/25', pink: 'text-pink-400 bg-pink-400/10 border-pink-400/25', purple: 'text-purple-400 bg-purple-400/10 border-purple-400/25', green: 'text-green-400 bg-green-400/10 border-green-400/25', amber: 'text-amber-400 bg-amber-400/10 border-amber-400/25' };
  return (
    <div className={`rounded-2xl border p-4 ${c[color]}`}>
      <div className="text-xs text-white/40 mb-1">{label}</div>
      <div className={`text-2xl font-black font-mono ${c[color].split(' ')[0]}`}>{value}</div>
      {sub && <div className="text-xs text-white/35 mt-0.5">{sub}</div>}
      {formula && <div className="font-mono text-xs text-white/20 mt-1">{formula}</div>}
    </div>
  );
}

export default function MarketingStudio() {
  const [activeTab, setActiveTab] = useState('Overview');
  const [data, setData] = useState([]);
  const [kpis, setKpis] = useState(null);
  const [channelStats, setChannelStats] = useState([]);
  const [aiInsights, setAiInsights] = useState('');
  const [loadingAI, setLoadingAI] = useState(false);

  // A/B test state
  const [abForm, setAbForm] = useState({ controlConv: 120, controlVisit: 2000, variantConv: 145, variantVisit: 2000 });
  const [abResult, setAbResult] = useState(null);

  useEffect(() => { loadData(); }, []);

  const loadData = () => {
    const rows = generateDemoData('marketing_campaigns');
    setData(rows);
    setKpis(calculateMarketingKPIs(rows));

    // Channel stats
    const chanMap = {};
    rows.forEach(r => {
      const ch = r.channel || 'Unknown';
      if (!chanMap[ch]) chanMap[ch] = { channel: ch, campaigns: 0, spend: 0, revenue: 0, clicks: 0, impressions: 0, conversions: 0 };
      chanMap[ch].campaigns++;
      chanMap[ch].spend += Number(String(r.spend || '').replace(/[$,]/g, '')) || 0;
      chanMap[ch].revenue += Number(r.revenue) || 0;
      chanMap[ch].clicks += Number(r.clicks) || 0;
      chanMap[ch].impressions += Number(r.impressions) || 0;
      chanMap[ch].conversions += Number(r.conversions) || 0;
    });

    const stats = Object.values(chanMap).map(ch => ({
      ...ch,
      spend: Math.round(ch.spend * 100) / 100,
      revenue: Math.round(ch.revenue * 100) / 100,
      roas: ch.spend > 0 ? Math.round((ch.revenue / ch.spend) * 100) / 100 : 0,
      ctr: ch.impressions > 0 ? Math.round((ch.clicks / ch.impressions) * 10000) / 100 : 0,
      cac: ch.conversions > 0 ? Math.round((ch.spend / ch.conversions) * 100) / 100 : 0,
    })).sort((a, b) => b.revenue - a.revenue);
    setChannelStats(stats);
  };

  const runABTest = () => {
    const result = calculateABTest(abForm.controlConv, abForm.controlVisit, abForm.variantConv, abForm.variantVisit);
    setAbResult(result);
  };

  const handleAIInsights = async () => {
    setLoadingAI(true);
    try {
      const topChannel = channelStats[0]?.channel || 'N/A';
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `Act as a Senior Marketing Analyst. Analyze these marketing KPIs and provide strategic recommendations:

Total Impressions: ${kpis?.impressions?.toLocaleString()}
Total Clicks: ${kpis?.clicks?.toLocaleString()}
CTR: ${kpis?.ctr}%
Conversions: ${kpis?.conversions?.toLocaleString()}
Conversion Rate: ${kpis?.conversionRate}%
Total Spend: $${kpis?.totalSpend?.toLocaleString()}
Total Revenue: $${kpis?.totalRevenue?.toLocaleString()}
ROAS: ${kpis?.roas}x
CAC: $${kpis?.cac}
Best Channel: ${topChannel}

Provide: 1 executive summary paragraph, 5 evidence bullets, 4 strategic recommendations, and budget allocation advice.`
      });
      setAiInsights(res);
    } catch (e) {
      setAiInsights(`Error: ${e.message}`);
    }
    setLoadingAI(false);
  };

  // Funnel data
  const funnelData = [
    { stage: 'Impressions', value: kpis?.impressions || 150000, pct: 100 },
    { stage: 'Clicks', value: kpis?.clicks || 8500, pct: kpis && kpis.impressions > 0 ? Math.round(kpis.clicks / kpis.impressions * 100) : 5.7 },
    { stage: 'Leads', value: Math.round((kpis?.clicks || 8500) * 0.12), pct: 12 },
    { stage: 'Trials', value: Math.round((kpis?.clicks || 8500) * 0.05), pct: 5 },
    { stage: 'Customers', value: kpis?.conversions || 420, pct: kpis && kpis.clicks > 0 ? Math.round(kpis.conversions / kpis.clicks * 100) : 4.9 },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-white/6 px-6 py-4 bg-navy-800/50 backdrop-blur sticky top-0 z-20">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-pink-400/10 border border-pink-400/20 flex items-center justify-center">
              <TrendingUp className="w-4.5 h-4.5 text-pink-400" />
            </div>
            <div>
              <h1 className="text-base font-bold">Marketing Analytics Studio</h1>
              <p className="text-xs text-white/40">{data.length} campaigns · Real formulas · A/B testing · AI insights</p>
            </div>
          </div>
          <button onClick={loadData} className="p-2 rounded-lg text-white/30 hover:text-white/60 hover:bg-white/5">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
        <div className="max-w-7xl mx-auto mt-3 flex gap-1 overflow-x-auto pb-1">
          {MARKETING_TABS.map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${activeTab === tab ? 'bg-pink-400/15 text-pink-400 border border-pink-400/25' : 'text-white/40 hover:text-white/70 hover:bg-white/5'}`}>
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {activeTab === 'Overview' && kpis && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <KpiCard label="Total Impressions" value={kpis.impressions.toLocaleString()} color="cyan" formula="SUM(impressions)" />
              <KpiCard label="CTR" value={`${kpis.ctr}%`} color="pink" formula="Clicks / Impressions × 100" />
              <KpiCard label="Conversion Rate" value={`${kpis.conversionRate}%`} color="purple" formula="Conversions / Clicks × 100" />
              <KpiCard label="ROAS" value={`${kpis.roas}x`} color="green" formula="Revenue / Spend" />
              <KpiCard label="CAC" value={`$${kpis.cac}`} color="amber" formula="Spend / New Customers" />
              <KpiCard label="Total Spend" value={`$${kpis.totalSpend.toLocaleString()}`} color="pink" formula="SUM(spend)" />
              <KpiCard label="Total Revenue" value={`$${kpis.totalRevenue.toLocaleString()}`} color="cyan" formula="SUM(revenue)" />
              <KpiCard label="Total Clicks" value={kpis.clicks.toLocaleString()} color="purple" formula="SUM(clicks)" />
              <KpiCard label="Conversions" value={kpis.conversions.toLocaleString()} color="green" formula="SUM(conversions)" />
              <KpiCard label="CPC" value={`$${kpis.cpc}`} color="amber" formula="Spend / Clicks" />
            </div>

            {/* Channel ROAS Chart */}
            <div className="glass-card rounded-2xl border border-white/8 p-5">
              <div className="text-sm font-bold mb-3">ROAS by Channel</div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={channelStats}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="channel" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} />
                  <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} />
                  <Tooltip contentStyle={{ background: 'hsl(222,44%,9%)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }} />
                  <Bar dataKey="roas" fill="#ff2d7a" radius={[4, 4, 0, 0]} name="ROAS" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* AI Insights */}
            <div className="glass-card rounded-2xl border border-pink-400/20 p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="font-bold text-sm text-pink-400">AI Marketing Intelligence</div>
                <button onClick={handleAIInsights} disabled={loadingAI}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-pink-400/10 border border-pink-400/25 text-pink-400 rounded-xl text-xs font-semibold hover:bg-pink-400/15 disabled:opacity-50">
                  {loadingAI ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                  {loadingAI ? 'Analyzing…' : 'Generate AI Insights'}
                </button>
              </div>
              {aiInsights ? (
                <p className="text-sm text-white/70 leading-relaxed whitespace-pre-line">{aiInsights}</p>
              ) : (
                <p className="text-xs text-white/30">Click "Generate AI Insights" for deep marketing analysis and budget recommendations.</p>
              )}
            </div>
          </div>
        )}

        {activeTab === 'Campaign Performance' && (
          <div className="overflow-x-auto">
            <div className="text-sm font-bold mb-3">Campaign Performance Table</div>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/8">
                  {['Channel', 'Campaigns', 'Spend', 'Revenue', 'ROAS', 'Clicks', 'CTR%', 'Conversions', 'CAC'].map(h => (
                    <th key={h} className="text-left py-2 px-2 text-white/40 font-semibold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {channelStats.map((ch, i) => (
                  <tr key={i} className="border-b border-white/4 hover:bg-white/2">
                    <td className="py-2.5 px-2 font-semibold text-white/80">{ch.channel}</td>
                    <td className="py-2.5 px-2 text-white/50">{ch.campaigns}</td>
                    <td className="py-2.5 px-2 font-mono text-white/60">${ch.spend.toLocaleString()}</td>
                    <td className="py-2.5 px-2 font-mono text-white/60">${ch.revenue.toLocaleString()}</td>
                    <td className={`py-2.5 px-2 font-mono font-bold ${ch.roas >= 3 ? 'text-green-400' : ch.roas >= 1.5 ? 'text-amber-400' : 'text-red-400'}`}>{ch.roas}x</td>
                    <td className="py-2.5 px-2 text-white/50">{ch.clicks.toLocaleString()}</td>
                    <td className="py-2.5 px-2 text-white/60">{ch.ctr}%</td>
                    <td className="py-2.5 px-2 text-white/60">{ch.conversions}</td>
                    <td className="py-2.5 px-2 font-mono text-white/60">${ch.cac}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'Funnel Analysis' && (
          <div className="space-y-4">
            <div className="text-sm font-bold">Marketing Funnel</div>
            <div className="space-y-2 max-w-lg">
              {funnelData.map((stage, i) => (
                <div key={i} className="relative">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-white/70">{stage.stage}</span>
                    <div className="flex gap-3">
                      <span className="font-mono text-xs text-white/50">{stage.value.toLocaleString()}</span>
                      {i > 0 && <span className="text-xs text-red-400">↓ {100 - stage.pct}% drop</span>}
                    </div>
                  </div>
                  <div className="bg-white/5 rounded-full h-8 overflow-hidden">
                    <div className="h-8 rounded-full flex items-center pl-3 transition-all duration-700"
                      style={{ width: `${Math.max(stage.pct, 5)}%`, background: `linear-gradient(90deg, ${COLORS[i]}, ${COLORS[i]}88)` }}>
                      <span className="text-xs font-bold text-white">{stage.pct}%</span>
                    </div>
                  </div>
                  {i < funnelData.length - 1 && (
                    <div className="text-xs text-white/25 mt-1 font-mono">
                      Drop-off: ({stage.value.toLocaleString()} - {funnelData[i + 1].value.toLocaleString()}) / {stage.value.toLocaleString()} × 100 = {Math.round((stage.value - funnelData[i + 1].value) / stage.value * 100)}%
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'A/B Testing' && (
          <div className="space-y-5 max-w-xl">
            <div className="text-sm font-bold">A/B Test Calculator</div>
            <div className="glass-card rounded-2xl border border-white/8 p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs font-bold text-white/50 mb-2">CONTROL</div>
                  <div className="space-y-2">
                    <input type="number" value={abForm.controlVisit} onChange={e => setAbForm(f => ({ ...f, controlVisit: Number(e.target.value) }))}
                      placeholder="Visitors" className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-xs focus:outline-none" />
                    <input type="number" value={abForm.controlConv} onChange={e => setAbForm(f => ({ ...f, controlConv: Number(e.target.value) }))}
                      placeholder="Conversions" className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-xs focus:outline-none" />
                  </div>
                </div>
                <div>
                  <div className="text-xs font-bold text-white/50 mb-2">VARIANT</div>
                  <div className="space-y-2">
                    <input type="number" value={abForm.variantVisit} onChange={e => setAbForm(f => ({ ...f, variantVisit: Number(e.target.value) }))}
                      placeholder="Visitors" className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-xs focus:outline-none" />
                    <input type="number" value={abForm.variantConv} onChange={e => setAbForm(f => ({ ...f, variantConv: Number(e.target.value) }))}
                      placeholder="Conversions" className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-xs focus:outline-none" />
                  </div>
                </div>
              </div>
              <button onClick={runABTest} className="w-full py-2.5 bg-pink-400 text-white rounded-xl text-sm font-bold hover:bg-pink-300">
                Calculate A/B Test
              </button>
            </div>

            {abResult && (
              <div className={`rounded-2xl border p-5 space-y-3 ${abResult.significant ? 'bg-green-400/5 border-green-400/20' : 'bg-white/3 border-white/10'}`}>
                <div className={`text-lg font-black ${abResult.significant ? 'text-green-400' : 'text-white/60'}`}>
                  {abResult.winner}
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-white/40">Control Rate:</span> <span className="font-mono">{abResult.controlRate}%</span></div>
                  <div><span className="text-white/40">Variant Rate:</span> <span className="font-mono">{abResult.variantRate}%</span></div>
                  <div><span className="text-white/40">Lift:</span> <span className={`font-mono font-bold ${abResult.lift > 0 ? 'text-green-400' : 'text-red-400'}`}>{abResult.lift > 0 ? '+' : ''}{abResult.lift}%</span></div>
                  <div><span className="text-white/40">Z-Score:</span> <span className="font-mono">{abResult.zScore}</span></div>
                  <div><span className="text-white/40">P-Value:</span> <span className="font-mono">{abResult.pValue}</span></div>
                  <div><span className="text-white/40">Significant:</span> <span className={abResult.significant ? 'text-green-400 font-bold' : 'text-red-400'}>{abResult.significant ? 'Yes (p < 0.05)' : 'No'}</span></div>
                </div>
                <div className="font-mono text-xs text-white/25">
                  Z = (p2 - p1) / √(SE1² + SE2²) | p-value = 2 × (1 - Φ(|Z|))
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'CLV Modeling' && (
          <div className="space-y-4 max-w-lg">
            <div className="text-sm font-bold">Customer Lifetime Value Model</div>
            <div className="glass-card rounded-2xl border border-white/8 p-5 space-y-3">
              {[
                { label: 'Average Order Value (AOV)', formula: 'AOV = Revenue / Number of Orders', example: '$124.50', color: 'cyan' },
                { label: 'Purchase Frequency', formula: 'PF = Orders / Unique Customers per Year', example: '4.2x / year', color: 'purple' },
                { label: 'Customer Lifespan', formula: 'CL = 1 / Churn Rate', example: '2.5 years', color: 'green' },
                { label: 'CLV', formula: 'CLV = AOV × Purchase Frequency × Customer Lifespan', example: '$1,307', color: 'pink' },
                { label: 'CAC', formula: 'CAC = Total Marketing Spend / New Customers Acquired', example: `$${kpis?.cac || 0}`, color: 'amber' },
                { label: 'CLV:CAC Ratio', formula: 'CLV / CAC (target: > 3x)', example: `${kpis?.cac > 0 ? (1307 / kpis.cac).toFixed(1) : 'N/A'}x`, color: 'teal' },
              ].map((item, i) => (
                <div key={i} className="py-2 border-b border-white/5">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-xs font-semibold text-white/70">{item.label}</div>
                      <div className="font-mono text-xs text-white/30 mt-0.5">{item.formula}</div>
                    </div>
                    <div className={`font-mono text-sm font-bold ${item.color === 'cyan' ? 'text-cyan-400' : item.color === 'purple' ? 'text-purple-400' : item.color === 'green' ? 'text-green-400' : item.color === 'pink' ? 'text-pink-400' : item.color === 'amber' ? 'text-amber-400' : 'text-teal-400'}`}>
                      {item.example}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {['Customer Segmentation', 'Churn Analysis', 'Channel ROI', 'Recommendations'].includes(activeTab) && (
          <div className="space-y-4">
            <div className="text-sm font-bold">{activeTab}</div>
            {activeTab === 'Recommendations' && (
              <div className="space-y-3">
                {[
                  { priority: 'High', text: `${channelStats[0]?.channel || 'Top channel'} has the highest ROAS (${channelStats[0]?.roas}x). Increase budget allocation by 20–30%.`, color: 'green' },
                  { priority: 'High', text: `CAC of $${kpis?.cac} should be benchmarked against CLV. Aim for CLV:CAC ratio > 3x.`, color: 'green' },
                  { priority: 'Medium', text: 'Implement cohort analysis to track customer retention by acquisition month.', color: 'amber' },
                  { priority: 'Medium', text: 'Run A/B tests on landing page CTAs to improve conversion rate beyond current benchmark.', color: 'amber' },
                  { priority: 'Low', text: 'Build email nurture sequences for leads that did not convert to reduce CAC.', color: 'blue' },
                ].map((rec, i) => (
                  <div key={i} className={`flex items-start gap-3 p-4 rounded-xl ${rec.color === 'green' ? 'bg-green-400/5 border border-green-400/15' : rec.color === 'amber' ? 'bg-amber-400/5 border border-amber-400/15' : 'bg-blue-400/5 border border-blue-400/15'}`}>
                    <span className={`px-1.5 py-0.5 rounded text-xs font-bold flex-shrink-0 ${rec.color === 'green' ? 'bg-green-400/15 text-green-400' : rec.color === 'amber' ? 'bg-amber-400/15 text-amber-400' : 'bg-blue-400/15 text-blue-400'}`}>{rec.priority}</span>
                    <p className="text-sm text-white/70">{rec.text}</p>
                  </div>
                ))}
              </div>
            )}
            {activeTab === 'Customer Segmentation' && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                {[
                  { label: 'Champions', desc: 'High frequency, high value', count: Math.round(data.length * 0.15), color: 'cyan' },
                  { label: 'Loyal Customers', desc: 'Regular buyers', count: Math.round(data.length * 0.25), color: 'green' },
                  { label: 'At Risk', desc: 'Decreasing engagement', count: Math.round(data.length * 0.20), color: 'amber' },
                  { label: 'Churned', desc: 'No activity 90+ days', count: Math.round(data.length * 0.10), color: 'red' },
                ].map(seg => (
                  <div key={seg.label} className={`rounded-2xl border p-4 ${seg.color === 'cyan' ? 'bg-cyan-400/10 border-cyan-400/25' : seg.color === 'green' ? 'bg-green-400/10 border-green-400/25' : seg.color === 'amber' ? 'bg-amber-400/10 border-amber-400/25' : 'bg-red-400/10 border-red-400/25'}`}>
                    <div className={`text-lg font-black font-mono ${seg.color === 'cyan' ? 'text-cyan-400' : seg.color === 'green' ? 'text-green-400' : seg.color === 'amber' ? 'text-amber-400' : 'text-red-400'}`}>{seg.count}</div>
                    <div className="text-xs font-bold mt-1">{seg.label}</div>
                    <div className="text-xs text-white/35 mt-0.5">{seg.desc}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}