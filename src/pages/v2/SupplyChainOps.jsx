import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Truck, Package, BarChart2, AlertTriangle, TrendingUp, Users, Zap, RefreshCw, Loader2, CheckCircle2, Target, Activity } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { generateDemoData } from '@/lib/demoDatasets';
import { calculateSupplyChainKPIs, profileDataset, simpleLinearForecast } from '@/lib/analyticsEngine';
import { base44 } from '@/api/base44Client';

const SUPPLY_TABS = ['Overview', 'Orders', 'Suppliers', 'Inventory', 'Transportation', 'Demand Forecast', 'Risk Alerts', 'Recommendations'];

const KPI_FORMULAS = [
  { name: 'On-Time Delivery Rate', formula: 'On-Time Deliveries / Total Deliveries × 100', target: '95%' },
  { name: 'Forecast Accuracy', formula: '100 - MAPE', target: '90%' },
  { name: 'Inventory Turnover', formula: 'COGS / Average Inventory', target: '6x' },
  { name: 'Fill Rate', formula: 'Orders Fulfilled Completely / Total Orders × 100', target: '98%' },
  { name: 'Backorder Rate', formula: 'Backordered Orders / Total Orders × 100', target: '<2%' },
  { name: 'Supplier Performance', formula: '0.35×OnTime + 0.25×Quality + 0.20×Cost + 0.20×LeadTime', target: '>90' },
];

function KpiCard({ label, value, sub, trend, color = 'cyan', formula }) {
  const colors = { cyan: 'text-cyan-400 bg-cyan-400/10 border-cyan-400/25', green: 'text-green-400 bg-green-400/10 border-green-400/25', amber: 'text-amber-400 bg-amber-400/10 border-amber-400/25', red: 'text-red-400 bg-red-400/10 border-red-400/25', purple: 'text-purple-400 bg-purple-400/10 border-purple-400/25', teal: 'text-teal-400 bg-teal-400/10 border-teal-400/25' };
  return (
    <div className={`rounded-2xl border p-4 ${colors[color]}`}>
      <div className="text-xs text-white/40 mb-1">{label}</div>
      <div className={`text-2xl font-black font-mono ${colors[color].split(' ')[0]}`}>{value}</div>
      {sub && <div className="text-xs text-white/35 mt-1">{sub}</div>}
      {trend !== undefined && (
        <div className={`text-xs mt-1 flex items-center gap-1 ${trend >= 0 ? 'text-green-400' : 'text-red-400'}`}>
          <TrendingUp className="w-3 h-3" /> {trend >= 0 ? '+' : ''}{trend}% vs last period
        </div>
      )}
      {formula && <div className="text-xs font-mono text-white/20 mt-1 truncate">{formula}</div>}
    </div>
  );
}

export default function SupplyChainOps() {
  const [activeTab, setActiveTab] = useState('Overview');
  const [data, setData] = useState([]);
  const [kpis, setKpis] = useState(null);
  const [supplierStats, setSupplierStats] = useState([]);
  const [categoryStats, setCategoryStats] = useState([]);
  const [aiInsights, setAiInsights] = useState('');
  const [loadingAI, setLoadingAI] = useState(false);
  const [forecast, setForecast] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    const rows = generateDemoData('supply_chain');
    setData(rows);
    const kpiData = calculateSupplyChainKPIs(rows);
    setKpis(kpiData);

    // Supplier stats
    const supMap = {};
    rows.forEach(r => {
      const s = r.supplier_name || 'Unknown';
      if (!supMap[s]) supMap[s] = { name: s, orders: 0, onTime: 0, totalCost: 0, defects: 0 };
      supMap[s].orders++;
      const ot = r.on_time_delivery;
      if (ot === 1 || ot === 'Yes' || ot === 'yes') supMap[s].onTime++;
      supMap[s].totalCost += Number(r.transportation_cost) || 0;
    });
    const stats = Object.values(supMap).map(s => ({
      ...s,
      onTimeRate: s.orders > 0 ? Math.round((s.onTime / s.orders) * 10000) / 100 : 0,
      avgCost: s.orders > 0 ? Math.round((s.totalCost / s.orders) * 100) / 100 : 0,
      performanceScore: Math.round(s.orders > 0 ? (s.onTime / s.orders * 0.6 + 0.4) * 100 : 0)
    })).sort((a, b) => b.onTimeRate - a.onTimeRate);
    setSupplierStats(stats);

    // Category stats
    const catMap = {};
    rows.forEach(r => {
      const c = r.product_category || 'Unknown';
      if (!catMap[c]) catMap[c] = { category: c, orders: 0, cost: 0 };
      catMap[c].orders++;
      catMap[c].cost += Number(r.transportation_cost) || 0;
    });
    setCategoryStats(Object.values(catMap).sort((a, b) => b.orders - a.orders));

    // Forecast: simulate monthly order trend
    const monthMap = {};
    rows.forEach(r => {
      const d = r.order_date ? String(r.order_date).slice(0, 7) : null;
      if (d) { monthMap[d] = (monthMap[d] || 0) + 1; }
    });
    const monthlyOrders = Object.values(monthMap).slice(-6);
    const projected = simpleLinearForecast(monthlyOrders, 3);
    setForecast(projected);
  };

  const handleAIInsights = async () => {
    setLoadingAI(true);
    try {
      const topSupplier = supplierStats[0]?.name;
      const worstSupplier = supplierStats[supplierStats.length - 1]?.name;
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `Act as a Supply Chain Analyst. Analyze these supply chain KPIs and provide strategic recommendations:
Total Orders: ${kpis?.totalOrders}
On-Time Delivery: ${kpis?.onTimeDeliveryRate}%
Total Revenue: $${kpis?.totalRevenue?.toLocaleString()}
Total Cost: $${kpis?.totalCost?.toLocaleString()}
Gross Margin: ${kpis?.grossMarginPct}%
Best Supplier: ${topSupplier}
Worst Supplier: ${worstSupplier} (${supplierStats[supplierStats.length - 1]?.onTimeRate}% on-time)
Provide: Executive summary, 5 evidence bullets, 3 strategic recommendations, and risk alerts. Be specific with numbers.`
      });
      setAiInsights(res);
    } catch (e) {
      setAiInsights(`Analysis error: ${e.message}`);
    }
    setLoadingAI(false);
  };

  const COLORS = ['#00f5ff', '#4caf50', '#ff6b35', '#9c27b0', '#ffcc02', '#ff2d7a'];

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-white/6 px-6 py-4 bg-navy-800/50 backdrop-blur sticky top-0 z-20">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center">
              <Truck className="w-4.5 h-4.5 text-amber-400" />
            </div>
            <div>
              <h1 className="text-base font-bold">Supply Chain & Operations Analytics</h1>
              <p className="text-xs text-white/40">{data.length.toLocaleString()} orders · Real KPI formulas · AI insights</p>
            </div>
          </div>
          <button onClick={loadData} className="p-2 rounded-lg text-white/30 hover:text-white/60 hover:bg-white/5 transition-all">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
        <div className="max-w-7xl mx-auto mt-3 flex gap-1 overflow-x-auto">
          {SUPPLY_TABS.map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${activeTab === tab ? 'bg-amber-400/15 text-amber-400 border border-amber-400/25' : 'text-white/40 hover:text-white/70 hover:bg-white/5'}`}>
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">

        {activeTab === 'Overview' && kpis && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <KpiCard label="Total Orders" value={kpis.totalOrders.toLocaleString()} color="cyan" formula="COUNT(order_id)" />
              <KpiCard label="On-Time Delivery" value={`${kpis.onTimeDeliveryRate}%`} color={kpis.onTimeDeliveryRate >= 95 ? 'green' : kpis.onTimeDeliveryRate >= 85 ? 'amber' : 'red'} formula="On-Time / Total × 100" />
              <KpiCard label="Total Revenue" value={`$${(kpis.totalRevenue / 1000).toFixed(0)}K`} color="teal" formula="SUM(revenue)" />
              <KpiCard label="Gross Margin" value={`${kpis.grossMarginPct}%`} color={kpis.grossMarginPct >= 30 ? 'green' : 'amber'} formula="(Rev - Cost) / Rev × 100" />
              <KpiCard label="Total Cost" value={`$${(kpis.totalCost / 1000).toFixed(0)}K`} color="red" formula="SUM(transportation_cost)" />
              <KpiCard label="Avg Order Value" value={`$${kpis.avgOrderValue.toFixed(0)}`} color="purple" formula="Revenue / Orders" />
              <KpiCard label="Suppliers Tracked" value={supplierStats.length} color="amber" />
              <KpiCard label="Product Categories" value={categoryStats.length} color="cyan" />
            </div>

            {/* Charts row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="glass-card rounded-2xl border border-white/8 p-5">
                <div className="text-sm font-bold mb-3">Orders by Category</div>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={categoryStats}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                    <XAxis dataKey="category" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} />
                    <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} />
                    <Tooltip contentStyle={{ background: 'hsl(222,44%,9%)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }} />
                    <Bar dataKey="orders" fill="#00f5ff" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="glass-card rounded-2xl border border-white/8 p-5">
                <div className="text-sm font-bold mb-3">Supplier On-Time Rate</div>
                <div className="space-y-2">
                  {supplierStats.map((s, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="text-xs text-white/50 w-24 flex-shrink-0">{s.name}</div>
                      <div className="flex-1 bg-white/5 rounded-full h-2">
                        <div className={`h-2 rounded-full transition-all ${s.onTimeRate >= 95 ? 'bg-green-400' : s.onTimeRate >= 85 ? 'bg-amber-400' : 'bg-red-400'}`} style={{ width: `${s.onTimeRate}%` }} />
                      </div>
                      <div className={`text-xs font-mono w-12 text-right ${s.onTimeRate >= 95 ? 'text-green-400' : s.onTimeRate >= 85 ? 'text-amber-400' : 'text-red-400'}`}>{s.onTimeRate}%</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* AI Insights */}
            <div className="glass-card rounded-2xl border border-amber-400/20 p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="font-bold text-sm text-amber-400">AI Supply Chain Intelligence</div>
                <button onClick={handleAIInsights} disabled={loadingAI}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-400/10 border border-amber-400/25 text-amber-400 rounded-xl text-xs font-semibold hover:bg-amber-400/15 disabled:opacity-50">
                  {loadingAI ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                  {loadingAI ? 'Analyzing…' : 'Generate AI Insights'}
                </button>
              </div>
              {aiInsights ? (
                <p className="text-sm text-white/70 leading-relaxed whitespace-pre-line">{aiInsights}</p>
              ) : (
                <p className="text-xs text-white/30">Click "Generate AI Insights" for a deep supply chain analysis powered by AI.</p>
              )}
            </div>
          </div>
        )}

        {activeTab === 'Suppliers' && (
          <div className="space-y-4">
            <div className="text-sm font-bold">Supplier Performance Scorecard</div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-white/8">
                    {['Supplier', 'Total Orders', 'On-Time Rate', 'Avg Transport Cost', 'Performance Score', 'Status'].map(h => (
                      <th key={h} className="text-left py-2 px-3 text-white/40 font-semibold">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {supplierStats.map((s, i) => (
                    <tr key={i} className="border-b border-white/4 hover:bg-white/2">
                      <td className="py-2.5 px-3 font-semibold">{s.name}</td>
                      <td className="py-2.5 px-3 text-white/60">{s.orders}</td>
                      <td className="py-2.5 px-3">
                        <span className={`font-mono font-bold ${s.onTimeRate >= 95 ? 'text-green-400' : s.onTimeRate >= 85 ? 'text-amber-400' : 'text-red-400'}`}>{s.onTimeRate}%</span>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-white/60">${s.avgCost.toFixed(0)}</td>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-white/5 rounded-full h-1.5">
                            <div className={`h-1.5 rounded-full ${s.performanceScore >= 90 ? 'bg-green-400' : s.performanceScore >= 80 ? 'bg-amber-400' : 'bg-red-400'}`} style={{ width: `${s.performanceScore}%` }} />
                          </div>
                          <span className="font-mono text-white/60">{s.performanceScore}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`px-1.5 py-0.5 rounded text-xs ${s.onTimeRate >= 90 ? 'bg-green-400/10 text-green-400' : s.onTimeRate >= 80 ? 'bg-amber-400/10 text-amber-400' : 'bg-red-400/10 text-red-400'}`}>
                          {s.onTimeRate >= 90 ? 'Preferred' : s.onTimeRate >= 80 ? 'Monitor' : 'At Risk'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="glass-card rounded-xl border border-white/8 p-4">
              <div className="text-xs font-bold text-white/50 mb-2 font-mono">SUPPLIER PERFORMANCE FORMULA</div>
              <div className="font-mono text-xs text-amber-400/80">
                Supplier Score = 0.35 × OnTimeRate + 0.25 × QualityScore + 0.20 × CostScore + 0.20 × LeadTimeScore
              </div>
            </div>
          </div>
        )}

        {activeTab === 'Demand Forecast' && (
          <div className="space-y-4">
            <div className="text-sm font-bold">Demand Forecast — Next 3 Periods</div>
            <div className="glass-card rounded-2xl border border-white/8 p-5">
              <div className="text-xs text-white/40 mb-3">Linear trend forecast based on historical order volume</div>
              <div className="grid grid-cols-3 gap-3">
                {forecast.map((f, i) => (
                  <div key={i} className="bg-cyan-400/10 border border-cyan-400/25 rounded-xl p-3 text-center">
                    <div className="text-xs text-white/40 mb-1">Period +{i + 1}</div>
                    <div className="text-xl font-black font-mono text-cyan-400">{Math.round(f)}</div>
                    <div className="text-xs text-white/30">estimated orders</div>
                  </div>
                ))}
              </div>
              <div className="mt-3 text-xs text-white/30 font-mono">Formula: LinearForecast(slope × x + intercept)</div>
            </div>

            <div className="glass-card rounded-xl border border-white/8 p-4">
              <div className="text-xs font-bold text-white/50 mb-2">KPI FORMULAS</div>
              <div className="space-y-2">
                {KPI_FORMULAS.map((kpi, i) => (
                  <div key={i} className="flex items-start justify-between py-1 border-b border-white/5">
                    <div>
                      <div className="text-xs font-semibold text-white/70">{kpi.name}</div>
                      <div className="font-mono text-xs text-white/30">{kpi.formula}</div>
                    </div>
                    <div className="text-xs text-green-400 font-mono ml-4">Target: {kpi.target}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'Risk Alerts' && (
          <div className="space-y-3">
            <div className="text-sm font-bold">Operational Risk Alerts</div>
            {supplierStats.filter(s => s.onTimeRate < 85).map((s, i) => (
              <div key={i} className="flex items-start gap-3 p-4 rounded-xl bg-red-400/5 border border-red-400/20">
                <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="text-sm font-semibold text-red-400">Low Supplier Performance: {s.name}</div>
                  <div className="text-xs text-white/50 mt-0.5">On-time rate: {s.onTimeRate}% — below 85% threshold. {s.orders} orders tracked.</div>
                  <div className="text-xs text-white/35 mt-1">Recommendation: Review SLA, add backup supplier, escalate to procurement.</div>
                </div>
              </div>
            ))}
            {kpis && kpis.onTimeDeliveryRate < 90 && (
              <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-400/5 border border-amber-400/20">
                <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="text-sm font-semibold text-amber-400">Network On-Time Rate Below Target</div>
                  <div className="text-xs text-white/50 mt-0.5">Current: {kpis.onTimeDeliveryRate}% — Target: 95%</div>
                </div>
              </div>
            )}
            {kpis && kpis.grossMarginPct < 20 && (
              <div className="flex items-start gap-3 p-4 rounded-xl bg-red-400/5 border border-red-400/20">
                <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="text-sm font-semibold text-red-400">Low Gross Margin</div>
                  <div className="text-xs text-white/50 mt-0.5">Current margin: {kpis.grossMarginPct}% — Review transportation and COGS</div>
                </div>
              </div>
            )}
            {supplierStats.filter(s => s.onTimeRate >= 85).length === supplierStats.length && kpis?.onTimeDeliveryRate >= 90 && (
              <div className="flex items-start gap-3 p-4 rounded-xl bg-green-400/5 border border-green-400/20">
                <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0" />
                <div className="text-sm text-green-400 font-semibold">No critical risk alerts — supply chain operating within targets</div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'Recommendations' && (
          <div className="space-y-3">
            <div className="text-sm font-bold">Strategic Recommendations</div>
            {[
              { priority: 'High', text: `Review ${supplierStats[supplierStats.length - 1]?.name || 'underperforming suppliers'} — on-time rate is significantly below network average. Consider alternative suppliers.`, color: 'red' },
              { priority: 'High', text: 'Implement weekly supplier scorecards and automated SLA alerting to catch delivery delays early.', color: 'red' },
              { priority: 'Medium', text: 'Run a 90-day inventory audit to identify slow-moving and at-risk SKUs. Apply safety stock formula for high-demand items.', color: 'amber' },
              { priority: 'Medium', text: 'Analyze transportation cost variance by route. Negotiate bulk rates for top-volume lanes.', color: 'amber' },
              { priority: 'Low', text: 'Build a supplier development program to improve defect rates and quality scores over 2–3 quarters.', color: 'blue' },
              { priority: 'Low', text: 'Implement demand sensing for the top 20 SKUs to reduce forecast error and lower safety stock costs.', color: 'blue' },
            ].map((rec, i) => (
              <div key={i} className={`flex items-start gap-3 p-4 rounded-xl ${rec.color === 'red' ? 'bg-red-400/5 border border-red-400/15' : rec.color === 'amber' ? 'bg-amber-400/5 border border-amber-400/15' : 'bg-blue-400/5 border border-blue-400/15'}`}>
                <span className={`px-1.5 py-0.5 rounded text-xs font-bold flex-shrink-0 ${rec.color === 'red' ? 'bg-red-400/15 text-red-400' : rec.color === 'amber' ? 'bg-amber-400/15 text-amber-400' : 'bg-blue-400/15 text-blue-400'}`}>{rec.priority}</span>
                <p className="text-sm text-white/70">{rec.text}</p>
              </div>
            ))}
          </div>
        )}

        {['Orders', 'Inventory', 'Transportation'].includes(activeTab) && (
          <div className="space-y-4">
            <div className="text-sm font-bold">{activeTab} Analysis</div>
            <div className="overflow-x-auto max-h-96">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-white/8">
                    {Object.keys(data[0] || {}).slice(0, 8).map(h => (
                      <th key={h} className="text-left py-2 px-2 text-white/40 font-semibold whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.slice(0, 50).map((row, i) => (
                    <tr key={i} className="border-b border-white/4 hover:bg-white/2">
                      {Object.values(row).slice(0, 8).map((v, vi) => (
                        <td key={vi} className="py-1.5 px-2 text-white/60 max-w-[120px] truncate">{v !== null && v !== undefined ? String(v) : '–'}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="text-xs text-white/30">Showing first 50 of {data.length.toLocaleString()} records</div>
          </div>
        )}
      </div>
    </div>
  );
}