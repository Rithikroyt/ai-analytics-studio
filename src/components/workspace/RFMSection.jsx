/**
 * RFMSection — Customer Segmentation via RFM Analysis
 * Recency · Frequency · Monetary value scoring with quintile buckets
 */
import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useWorkspaceStore } from '@/lib/store';
import { buildRFM, SEGMENT_META } from '@/lib/rfmEngine';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ScatterChart, Scatter } from 'recharts';
import { Users, TrendingUp, DollarSign, Clock, Database, ArrowRight, Download, Info } from 'lucide-react';

const TOOLTIP_STYLE = { backgroundColor: 'rgba(5,10,24,0.97)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, fontSize: 11, color: '#e2e8f0' };
const axisStyle = { fontSize: 9, fill: 'rgba(255,255,255,0.3)' };
const fmtV = v => { if (v == null || isNaN(v)) return '—'; const n = Number(v); if (n >= 1e6) return `${(n/1e6).toFixed(1)}M`; if (n >= 1e3) return `${(n/1e3).toFixed(0)}K`; return n.toLocaleString(undefined, { maximumFractionDigits: 1 }); };

export default function RFMSection() {
  const { getActiveTable, setActiveSection } = useWorkspaceStore();
  const table = getActiveTable();

  const columns = table?.columns || [];
  const catCols = columns.filter(c => c.type === 'category' || c.type === 'id');
  const dateCols = columns.filter(c => c.type === 'date');
  const numCols = columns.filter(c => c.type === 'numeric');

  const [customerCol, setCustomerCol] = useState(() => catCols[0]?.name || '');
  const [dateCol, setDateCol] = useState(() => dateCols[0]?.name || '');
  const [revenueCol, setRevenueCol] = useState(() => numCols[0]?.name || '');
  const [activeTab, setActiveTab] = useState('overview');

  const rfm = useMemo(() => {
    if (!table?.rows || !customerCol || !dateCol || !revenueCol) return null;
    return buildRFM(table.rows, customerCol, dateCol, revenueCol);
  }, [table, customerCol, dateCol, revenueCol]);

  const exportCSV = () => {
    if (!rfm) return;
    const headers = 'customer_id,recency_days,frequency,monetary,r_score,f_score,m_score,rfm_score,segment';
    const rows = rfm.customers.map(c => `${c.customerId},${c.recency},${c.txCount},${c.totalRevenue.toFixed(2)},${c.r_score},${c.f_score},${c.m_score},${c.rfm_score},${c.segment}`);
    const blob = new Blob([[headers, ...rows].join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'rfm_scores.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  if (!table) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[500px] text-center">
        <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/8 flex items-center justify-center mx-auto mb-4">
          <Users className="w-7 h-7 text-white/25" />
        </div>
        <h2 className="text-lg font-semibold mb-2">RFM Segmentation</h2>
        <p className="text-sm text-muted-foreground mb-5">Upload data with customer IDs, dates, and revenue to run RFM analysis.</p>
        <button onClick={() => setActiveSection('intake')} className="flex items-center gap-2 px-5 py-2.5 bg-cyan-400/10 border border-cyan-400/20 text-cyan-400 rounded-xl text-sm font-semibold hover:bg-cyan-400/15 transition-colors">
          Upload Data <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold mb-1">RFM Customer Segmentation</h1>
            <p className="text-sm text-muted-foreground">Recency · Frequency · Monetary — quintile scoring with automated segment classification.</p>
          </div>
          {rfm && (
            <button onClick={exportCSV} className="flex items-center gap-2 px-4 py-2 bg-cyan-400/10 border border-cyan-400/20 text-cyan-400 rounded-xl text-sm font-semibold hover:bg-cyan-400/15 transition-colors">
              <Download className="w-3.5 h-3.5" /> Export RFM CSV
            </button>
          )}
        </div>
      </motion.div>

      {/* Column pickers */}
      <div className="glass-card rounded-2xl p-5 border border-white/8 grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Customer ID Column', value: customerCol, setter: setCustomerCol, options: catCols, Ic: Users, color: 'text-cyan-400' },
          { label: 'Transaction Date Column', value: dateCol, setter: setDateCol, options: dateCols, Ic: Clock, color: 'text-teal-400' },
          { label: 'Revenue / Value Column', value: revenueCol, setter: setRevenueCol, options: numCols, Ic: DollarSign, color: 'text-green-400' },
        ].map(({ label, value, setter, options, Ic, color }) => (
          <div key={label}>
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1.5">
              <Ic className={`w-3 h-3 ${color}`} /> {label}
            </label>
            <select value={value} onChange={e => setter(e.target.value)}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-cyan-400/30 text-foreground">
              <option value="">— Select column —</option>
              {options.map(c => <option key={c.name} value={c.name}>{c.name.replace(/_/g, ' ')}</option>)}
            </select>
          </div>
        ))}
      </div>

      {!rfm && customerCol && dateCol && revenueCol && (
        <div className="flex items-start gap-3 p-4 bg-amber-400/5 border border-amber-400/20 rounded-xl text-sm text-amber-400">
          <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
          Could not build RFM model. Check that the date column contains valid dates and customer IDs are present.
        </div>
      )}

      {rfm && (
        <>
          {/* Summary KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Total Customers', value: rfm.totalCustomers.toLocaleString(), icon: Users, color: '#00e5ff' },
              { label: 'Avg Recency', value: `${rfm.avgRecency}d`, icon: Clock, color: '#ff6b35' },
              { label: 'Avg Frequency', value: rfm.avgFrequency, icon: TrendingUp, color: '#7b2fff' },
              { label: 'Avg Monetary', value: fmtV(rfm.avgMonetary), icon: DollarSign, color: '#4caf50' },
            ].map((kpi, i) => (
              <motion.div key={kpi.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
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
          <div className="flex gap-1 border-b border-white/5 pb-0">
            {['overview', 'segments', 'customers'].map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 text-xs font-semibold rounded-t-xl transition-all capitalize ${activeTab === tab ? 'bg-white/8 text-cyan-400 border-t border-x border-white/10' : 'text-white/35 hover:text-white/65'}`}>
                {tab}
              </button>
            ))}
          </div>

          {activeTab === 'overview' && (
            <div className="space-y-5">
              <div className="rounded-2xl p-5 border border-white/6">
                <div className="font-semibold text-sm mb-1">Segment Distribution — Customer Count</div>
                <div className="text-xs text-white/30 mb-4">Each segment is based on combined R/F/M quintile scores (1–5)</div>
                <ResponsiveContainer width="100%" height={Math.max(220, rfm.segmentSummary.length * 36)}>
                  <BarChart data={rfm.segmentSummary} layout="vertical" margin={{ top: 4, right: 48, bottom: 4, left: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                    <XAxis type="number" tick={axisStyle} tickLine={false} axisLine={false} />
                    <YAxis dataKey="segment" type="category" tick={{ ...axisStyle, fontSize: 10 }} tickLine={false} axisLine={false} width={130} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v, n) => [v, n === 'count' ? 'Customers' : 'Revenue']} />
                    <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                      {rfm.segmentSummary.map((s, i) => <Cell key={i} fill={s.color || '#00e5ff'} fillOpacity={0.85} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {activeTab === 'segments' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {rfm.segmentSummary.map((seg, i) => (
                <motion.div key={seg.segment} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                  className="rounded-2xl p-4 border" style={{ borderColor: `${seg.color}30`, background: `${seg.color}08` }}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">{seg.emoji}</span>
                    <div>
                      <div className="font-semibold text-sm">{seg.segment}</div>
                      <div className="text-xs text-white/40">{seg.count} customers · {seg.pct}% of base</div>
                    </div>
                    <div className="ml-auto text-right">
                      <div className="font-mono text-sm font-bold" style={{ color: seg.color }}>{fmtV(seg.revenue)}</div>
                      <div className="text-xs text-white/30">revenue</div>
                    </div>
                  </div>
                  <div className="text-xs text-white/50 leading-relaxed border-t border-white/8 pt-2 mt-1">
                    💡 {seg.action}
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {activeTab === 'customers' && (
            <div className="rounded-xl overflow-hidden border border-white/8">
              <div className="overflow-auto max-h-96">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-white/5 border-b border-white/8">
                      {['Customer', 'Recency (days)', 'Frequency', 'Monetary', 'R', 'F', 'M', 'Segment'].map(h => (
                        <th key={h} className="px-3 py-2.5 text-left text-white/40 font-medium whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rfm.customers.slice(0, 200).map((c, i) => (
                      <tr key={i} className="border-b border-white/5 hover:bg-white/2 transition-colors">
                        <td className="px-3 py-2 font-mono text-white/70">{String(c.customerId).slice(0, 20)}</td>
                        <td className="px-3 py-2 font-mono text-white/55">{c.recency}</td>
                        <td className="px-3 py-2 font-mono text-white/55">{c.txCount}</td>
                        <td className="px-3 py-2 font-mono text-white/55">{fmtV(c.totalRevenue)}</td>
                        <td className="px-3 py-2 font-mono text-center" style={{ color: c.r_score >= 4 ? '#4caf50' : c.r_score <= 2 ? '#ff2d7a' : '#ffcc02' }}>{c.r_score}</td>
                        <td className="px-3 py-2 font-mono text-center" style={{ color: c.f_score >= 4 ? '#4caf50' : c.f_score <= 2 ? '#ff2d7a' : '#ffcc02' }}>{c.f_score}</td>
                        <td className="px-3 py-2 font-mono text-center" style={{ color: c.m_score >= 4 ? '#4caf50' : c.m_score <= 2 ? '#ff2d7a' : '#ffcc02' }}>{c.m_score}</td>
                        <td className="px-3 py-2">
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: `${SEGMENT_META[c.segment]?.color || '#ffffff'}15`, color: SEGMENT_META[c.segment]?.color || '#ffffff80' }}>
                            {c.segment}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {rfm.customers.length > 200 && (
                <div className="px-4 py-2 text-xs text-white/25 border-t border-white/5">Showing top 200 of {rfm.customers.length.toLocaleString()} customers. Export CSV for full list.</div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}