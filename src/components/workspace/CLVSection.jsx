/**
 * CLVSection — Customer Lifetime Value Analysis
 * CLV = AOV × Frequency × Margin × Lifespan
 * Graceful degradation when margin column absent
 */
import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useWorkspaceStore } from '@/lib/store';
import { computeCLV } from '@/lib/clvEngine';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { DollarSign, Users, TrendingUp, Star, Download, ArrowRight, Info } from 'lucide-react';

const TIER_META = {
  Champion:   { color: '#00e5ff', bg: 'bg-cyan-400/10',   border: 'border-cyan-400/20',   emoji: '👑' },
  'High Value':{ color: '#4caf50', bg: 'bg-green-400/10',  border: 'border-green-400/20',  emoji: '⭐' },
  'Mid Value': { color: '#7b2fff', bg: 'bg-purple-400/10', border: 'border-purple-400/20', emoji: '📈' },
  'Low Value': { color: '#fbbf24', bg: 'bg-amber-400/10',  border: 'border-amber-400/20',  emoji: '⚠️' },
  'At Risk':   { color: '#f87171', bg: 'bg-red-400/10',    border: 'border-red-400/20',    emoji: '🔴' },
};

const TOOLTIP_STYLE = { backgroundColor:'rgba(5,10,24,0.97)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:10, fontSize:11, color:'#e2e8f0' };
const axisStyle = { fontSize:9, fill:'rgba(255,255,255,0.3)' };
const fmtV = v => { if (v == null || isNaN(v)) return '—'; const n = Number(v); if (n >= 1e6) return `${(n/1e6).toFixed(1)}M`; if (n >= 1e3) return `${(n/1e3).toFixed(0)}K`; return n.toLocaleString(undefined, { maximumFractionDigits:0 }); };

export default function CLVSection() {
  const { getActiveTable, setActiveSection } = useWorkspaceStore();
  const table = getActiveTable();

  const columns = table?.columns || [];
  const catCols = columns.filter(c => c.type === 'category' || c.type === 'id');
  const numCols = columns.filter(c => c.type === 'numeric');
  const dateCols = columns.filter(c => c.type === 'date');

  const [customerCol, setCustomerCol] = useState(() => catCols[0]?.name || '');
  const [revenueCol, setRevenueCol] = useState(() => numCols[0]?.name || '');
  const [dateCol, setDateCol] = useState(() => dateCols[0]?.name || '');
  const [marginCol, setMarginCol] = useState('');
  const [activeTab, setActiveTab] = useState('overview');

  const clv = useMemo(() => {
    if (!table?.rows || !customerCol || !revenueCol) return null;
    return computeCLV(table.rows, customerCol, revenueCol, dateCol || null, marginCol || null);
  }, [table, customerCol, revenueCol, dateCol, marginCol]);

  const exportCSV = () => {
    if (!clv) return;
    const headers = 'customer_id,total_revenue,transactions,aov,lifespan_months,clv,tier';
    const rows = clv.customers.map(c => `${c.customerId},${c.totalRevenue},${c.txCount},${c.aov},${c.lifespanMonths},${c.clv},${c.tier}`);
    const blob = new Blob([[headers, ...rows].join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'clv_analysis.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  if (!table) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[500px] text-center">
        <DollarSign className="w-12 h-12 text-white/15 mb-4" />
        <h2 className="text-lg font-semibold mb-2">Customer Lifetime Value</h2>
        <p className="text-sm text-muted-foreground mb-5">Upload a dataset with customer IDs and revenue to compute CLV.</p>
        <button onClick={() => setActiveSection('intake')} className="flex items-center gap-2 px-5 py-2.5 bg-cyan-400/10 border border-cyan-400/20 text-cyan-400 rounded-xl text-sm font-semibold hover:bg-cyan-400/15 transition-colors">
          Upload Data <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold mb-1">Customer Lifetime Value</h1>
          <p className="text-sm text-muted-foreground">CLV = AOV × Purchase Frequency × {clv?.hasMargin ? 'Margin × ' : ''}Lifespan</p>
        </div>
        {clv && (
          <button onClick={exportCSV} className="flex items-center gap-2 px-4 py-2 bg-cyan-400/10 border border-cyan-400/20 text-cyan-400 rounded-xl text-sm font-semibold hover:bg-cyan-400/15 transition-colors">
            <Download className="w-3.5 h-3.5" /> Export CSV
          </button>
        )}
      </div>

      {/* Column pickers */}
      <div className="glass-card rounded-2xl p-5 border border-white/8 grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Customer ID', value: customerCol, setter: setCustomerCol, options: catCols, color: 'text-cyan-400' },
          { label: 'Revenue Column', value: revenueCol, setter: setRevenueCol, options: numCols, color: 'text-green-400' },
          { label: 'Date Column', value: dateCol, setter: setDateCol, options: dateCols, color: 'text-teal-400', optional: true },
          { label: 'Margin % (optional)', value: marginCol, setter: setMarginCol, options: numCols, color: 'text-amber-400', optional: true },
        ].map(({ label, value, setter, options, color, optional }) => (
          <div key={label}>
            <label className={`text-xs ${color} mb-1.5 block font-medium`}>{label}</label>
            <select value={value} onChange={e => setter(e.target.value)}
              className="w-full px-2.5 py-2 bg-white/5 border border-white/10 rounded-xl text-xs focus:outline-none focus:border-cyan-400/30 text-foreground">
              {optional && <option value="">— Optional —</option>}
              {!optional && <option value="">— Select —</option>}
              {options.map(c => <option key={c.name} value={c.name}>{c.name.replace(/_/g,' ')}</option>)}
            </select>
          </div>
        ))}
      </div>

      {!clv?.hasMargin && clv && (
        <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-400/5 border border-amber-400/15 text-xs text-amber-400/80">
          <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
          No margin column selected. CLV is computed as total revenue per customer. Add a margin % column for the full formula.
        </div>
      )}

      {clv && (
        <>
          {/* KPI row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Total Customers', value: clv.totalCustomers.toLocaleString(), icon: Users, color: '#00e5ff' },
              { label: 'Avg CLV', value: fmtV(clv.avgCLV), icon: DollarSign, color: '#4caf50' },
              { label: 'Total CLV', value: fmtV(clv.totalCLV), icon: TrendingUp, color: '#7b2fff' },
              { label: 'Top 10% Revenue', value: `${clv.top10Pct}%`, icon: Star, color: '#fbbf24' },
            ].map((kpi, i) => (
              <motion.div key={kpi.label} initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} transition={{ delay:i*0.05 }}
                className="rounded-2xl p-4 border border-white/8 bg-white/2">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-white/35 uppercase tracking-wider">{kpi.label}</span>
                  <kpi.icon className="w-3.5 h-3.5" style={{ color: kpi.color }} />
                </div>
                <div className="text-2xl font-black font-mono" style={{ color: kpi.color }}>{kpi.value}</div>
              </motion.div>
            ))}
          </div>

          {/* Tabs */}
          <div className="flex gap-1 border-b border-white/5">
            {['overview', 'tiers', 'customers'].map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 text-xs font-semibold rounded-t-xl transition-all capitalize ${activeTab===tab ? 'bg-white/8 text-cyan-400 border-t border-x border-white/10' : 'text-white/35 hover:text-white/65'}`}>
                {tab}
              </button>
            ))}
          </div>

          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="glass-card rounded-2xl p-5 border border-white/8">
                <div className="font-semibold text-sm mb-4">CLV Distribution by Tier</div>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={clv.tierSummary} margin={{ top:4, right:8, bottom:4, left:0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                    <XAxis dataKey="tier" tick={{ ...axisStyle, fontSize:9 }} tickLine={false} axisLine={false} />
                    <YAxis tick={axisStyle} tickFormatter={fmtV} tickLine={false} axisLine={false} width={44} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} formatter={fmtV} />
                    <Bar dataKey="totalCLV" radius={[4,4,0,0]}>
                      {clv.tierSummary.map((t, i) => <Cell key={i} fill={TIER_META[t.tier]?.color || '#6b7280'} fillOpacity={0.85} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="glass-card rounded-2xl p-5 border border-white/8">
                <div className="font-semibold text-sm mb-4">Customer Count by Tier</div>
                <div className="space-y-3">
                  {clv.tierSummary.map((tier, i) => {
                    const meta = TIER_META[tier.tier];
                    return (
                      <div key={tier.tier} className="flex items-center gap-3">
                        <span className="text-lg w-6 flex-shrink-0">{meta?.emoji}</span>
                        <div className="flex-1">
                          <div className="flex justify-between text-xs mb-1">
                            <span className="font-medium" style={{ color: meta?.color }}>{tier.tier}</span>
                            <span className="text-white/45">{tier.count} customers · Avg {fmtV(tier.avgCLV)}</span>
                          </div>
                          <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width:`${tier.pct}%`, background: meta?.color }} />
                          </div>
                        </div>
                        <span className="text-xs font-mono text-white/40 w-10 text-right">{tier.pct}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'tiers' && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {clv.tierSummary.map(tier => {
                const meta = TIER_META[tier.tier];
                return (
                  <motion.div key={tier.tier} initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }}
                    className={`rounded-2xl p-5 border ${meta?.border} ${meta?.bg}`}>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-2xl">{meta?.emoji}</span>
                      <div>
                        <div className="font-semibold text-sm" style={{ color: meta?.color }}>{tier.tier}</div>
                        <div className="text-xs text-white/35">{tier.count} customers</div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div><div className="text-white/30 mb-0.5">Total CLV</div><div className="font-mono font-bold" style={{ color: meta?.color }}>{fmtV(tier.totalCLV)}</div></div>
                      <div><div className="text-white/30 mb-0.5">Avg CLV</div><div className="font-mono font-bold" style={{ color: meta?.color }}>{fmtV(tier.avgCLV)}</div></div>
                      <div><div className="text-white/30 mb-0.5">Share</div><div className="font-mono text-white/60">{tier.pct}%</div></div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}

          {activeTab === 'customers' && (
            <div className="overflow-hidden rounded-xl border border-white/8">
              <div className="overflow-auto max-h-96">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-white/5 border-b border-white/8">
                      {['Customer', 'CLV', 'Revenue', 'Transactions', 'AOV', 'Lifespan', 'Tier'].map(h => (
                        <th key={h} className="px-3 py-2.5 text-left text-white/40 font-medium whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {clv.customers.slice(0, 200).map((c, i) => {
                      const meta = TIER_META[c.tier];
                      return (
                        <tr key={i} className="border-b border-white/5 hover:bg-white/2 transition-colors">
                          <td className="px-3 py-2 font-mono text-white/70">{String(c.customerId).slice(0, 20)}</td>
                          <td className="px-3 py-2 font-mono font-bold" style={{ color: meta?.color }}>{fmtV(c.clv)}</td>
                          <td className="px-3 py-2 font-mono text-white/55">{fmtV(c.totalRevenue)}</td>
                          <td className="px-3 py-2 font-mono text-white/55">{c.txCount}</td>
                          <td className="px-3 py-2 font-mono text-white/55">{fmtV(c.aov)}</td>
                          <td className="px-3 py-2 font-mono text-white/55">{c.lifespanMonths}mo</td>
                          <td className="px-3 py-2">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${meta?.bg} ${meta?.border} border`} style={{ color: meta?.color }}>{c.tier}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {clv.customers.length > 200 && (
                <div className="px-4 py-2 text-xs text-white/25 border-t border-white/5">Showing 200 of {clv.customers.length.toLocaleString()} customers. Export CSV for full list.</div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}