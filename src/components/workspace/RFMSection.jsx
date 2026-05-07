/**
 * RFMSection — Customer Segmentation via RFM Analysis
 * Recency · Frequency · Monetary → Champions / Loyal / At Risk / Hibernating / Big Spenders
 */
import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useWorkspaceStore } from '@/lib/store';
import {
  Users, Database, ArrowRight, TrendingUp, Crown,
  AlertTriangle, Clock, DollarSign, Target, Download
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const TOOLTIP_STYLE = { backgroundColor: 'rgba(5,10,24,0.97)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, fontSize: 11, color: '#e2e8f0' };
const axisStyle = { fontSize: 9, fill: 'rgba(255,255,255,0.3)' };

const SEGMENTS = {
  '555': { label: 'Champions', color: '#00e5ff', desc: 'Bought recently, often, spend most' },
  '554': { label: 'Champions', color: '#00e5ff', desc: 'Bought recently, often, spend most' },
  '544': { label: 'Champions', color: '#00e5ff', desc: 'Bought recently, often, spend most' },
  '545': { label: 'Champions', color: '#00e5ff', desc: 'Bought recently, often, spend most' },
  '454': { label: 'Loyal Customers', color: '#4caf50', desc: 'Regular buyers with strong value' },
  '445': { label: 'Loyal Customers', color: '#4caf50', desc: 'Regular buyers with strong value' },
  '444': { label: 'Loyal Customers', color: '#4caf50', desc: 'Regular buyers with strong value' },
  '455': { label: 'Loyal Customers', color: '#4caf50', desc: 'Regular buyers with strong value' },
  '355': { label: 'Potential Loyalists', color: '#7b2fff', desc: 'Recent customers, frequent, medium spend' },
  '354': { label: 'Potential Loyalists', color: '#7b2fff', desc: 'Recent customers, frequent, medium spend' },
  '345': { label: 'Potential Loyalists', color: '#7b2fff', desc: 'Recent customers, frequent, medium spend' },
  '344': { label: 'Potential Loyalists', color: '#7b2fff', desc: 'Recent customers, frequent, medium spend' },
  '255': { label: 'At Risk', color: '#ff6b35', desc: 'High value but haven\'t bought lately' },
  '254': { label: 'At Risk', color: '#ff6b35', desc: 'High value but haven\'t bought lately' },
  '245': { label: 'At Risk', color: '#ff6b35', desc: 'High value but haven\'t bought lately' },
  '155': { label: 'At Risk', color: '#ff6b35', desc: 'High value but haven\'t bought lately' },
  '111': { label: 'Hibernating', color: '#9e9e9e', desc: 'Low scores across all dimensions' },
  '112': { label: 'Hibernating', color: '#9e9e9e', desc: 'Low scores across all dimensions' },
  '121': { label: 'Hibernating', color: '#9e9e9e', desc: 'Low scores across all dimensions' },
  '122': { label: 'Hibernating', color: '#9e9e9e', desc: 'Low scores across all dimensions' },
};

function getSegment(rScore, fScore, mScore) {
  const key = `${rScore}${fScore}${mScore}`;
  if (SEGMENTS[key]) return SEGMENTS[key];
  const r = Number(rScore), f = Number(fScore), m = Number(mScore);
  const avg = (r + f + m) / 3;
  if (m >= 4) return { label: 'Big Spenders', color: '#ffcc02', desc: 'High monetary value' };
  if (avg >= 4) return { label: 'Champions', color: '#00e5ff', desc: 'Top performers' };
  if (avg >= 3) return { label: 'Loyal Customers', color: '#4caf50', desc: 'Consistent buyers' };
  if (r <= 2 && f <= 2) return { label: 'Hibernating', color: '#9e9e9e', desc: 'Inactive customers' };
  if (r <= 2) return { label: 'At Risk', color: '#ff6b35', desc: 'Not buying recently' };
  return { label: 'Potential Loyalists', color: '#7b2fff', desc: 'Growing customers' };
}

function qcut(values, n = 5) {
  const sorted = [...values].sort((a, b) => a - b);
  const result = new Array(values.length);
  values.forEach((v, i) => {
    const rank = sorted.indexOf(v);
    const bucket = Math.min(n, Math.floor((rank / sorted.length) * n) + 1);
    result[i] = bucket;
  });
  return result;
}

function buildRFM(rows, customerCol, dateCol, revenueCol) {
  const now = new Date();
  const customerData = {};

  rows.forEach(row => {
    const id = String(row[customerCol] || '');
    if (!id) return;
    if (!customerData[id]) customerData[id] = { id, dates: [], revenue: 0, count: 0 };
    if (dateCol && row[dateCol]) {
      const d = new Date(row[dateCol]);
      if (!isNaN(d)) customerData[id].dates.push(d);
    }
    const rev = Number(row[revenueCol]);
    if (!isNaN(rev)) { customerData[id].revenue += rev; customerData[id].count++; }
  });

  const customers = Object.values(customerData);
  const recencies = customers.map(c => {
    if (!c.dates.length) return 999;
    const maxDate = new Date(Math.max(...c.dates.map(d => d.getTime())));
    return Math.round((now - maxDate) / (1000 * 60 * 60 * 24));
  });
  const frequencies = customers.map(c => c.count || 1);
  const monetaries = customers.map(c => c.revenue || 0);

  // Recency: lower = better → invert score
  const rScores = qcut(recencies.map(r => -r));
  const fScores = qcut(frequencies);
  const mScores = qcut(monetaries);

  return customers.map((c, i) => {
    const seg = getSegment(rScores[i], fScores[i], mScores[i]);
    return {
      id: c.id,
      recency: recencies[i],
      frequency: frequencies[i],
      monetary: +c.revenue.toFixed(2),
      r_score: rScores[i],
      f_score: fScores[i],
      m_score: mScores[i],
      rfm_score: `${rScores[i]}${fScores[i]}${mScores[i]}`,
      segment: seg.label,
      segmentColor: seg.color,
    };
  });
}

const fmtV = v => {
  if (v == null) return '—';
  const n = Number(v);
  if (isNaN(n)) return String(v);
  if (Math.abs(n) >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (Math.abs(n) >= 1e3) return `${(n / 1e3).toFixed(0)}K`;
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
};

export default function RFMSection() {
  const { getActiveTable, setActiveSection } = useWorkspaceStore();
  const table = getActiveTable();

  const [customerCol, setCustomerCol] = useState('');
  const [dateCol, setDateCol] = useState('');
  const [revenueCol, setRevenueCol] = useState('');
  const [computed, setComputed] = useState(false);

  const idCols = (table?.columns || []).filter(c => c.type === 'id' || c.type === 'category');
  const dateCols = (table?.columns || []).filter(c => c.type === 'date' || /date|month|time/i.test(c.name));
  const numCols = (table?.columns || []).filter(c => c.type === 'numeric');

  const rfmData = useMemo(() => {
    if (!computed || !customerCol || !revenueCol) return [];
    return buildRFM(table?.rows || [], customerCol, dateCol, revenueCol);
  }, [computed, customerCol, dateCol, revenueCol, table?.rows]);

  const segmentSummary = useMemo(() => {
    if (!rfmData.length) return [];
    const groups = {};
    rfmData.forEach(c => {
      if (!groups[c.segment]) groups[c.segment] = { segment: c.segment, color: c.segmentColor, count: 0, totalRevenue: 0 };
      groups[c.segment].count++;
      groups[c.segment].totalRevenue += c.monetary;
    });
    return Object.values(groups).sort((a, b) => b.totalRevenue - a.totalRevenue);
  }, [rfmData]);

  const downloadCSV = () => {
    if (!rfmData.length) return;
    const cols = ['id', 'recency', 'frequency', 'monetary', 'r_score', 'f_score', 'm_score', 'rfm_score', 'segment'];
    const csv = [cols.join(','), ...rfmData.map(r => cols.map(c => r[c]).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'rfm_scores.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  if (!table) return (
    <div className="p-8 flex flex-col items-center justify-center min-h-[500px] text-center">
      <Users className="w-12 h-12 text-white/20 mb-4" />
      <h2 className="text-lg font-semibold mb-2">RFM Analysis</h2>
      <p className="text-sm text-muted-foreground mb-5">Upload customer transaction data to run RFM segmentation.</p>
      <button onClick={() => setActiveSection('intake')} className="flex items-center gap-2 px-5 py-2.5 bg-cyan-400/10 border border-cyan-400/20 text-cyan-400 rounded-xl text-sm font-semibold">Upload Data <ArrowRight className="w-4 h-4" /></button>
    </div>
  );

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6 overflow-auto">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-2 mb-1">
          <Users className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-mono text-white/40 uppercase tracking-widest">Business Segmentation</span>
        </div>
        <h1 className="text-2xl font-bold mb-1">RFM Customer Segmentation</h1>
        <p className="text-sm text-muted-foreground">Recency · Frequency · Monetary — buckets customers into actionable segments using quintile scoring.</p>
      </motion.div>

      {/* Formula reference */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: Clock, color: 'text-cyan-400', label: 'Recency (R)', formula: 'Days since last purchase', note: 'Lower = better → Score 5' },
          { icon: TrendingUp, color: 'text-purple-400', label: 'Frequency (F)', formula: 'Count of purchases', note: 'Higher = better → Score 5' },
          { icon: DollarSign, color: 'text-green-400', label: 'Monetary (M)', formula: '∑ Revenue', note: 'Higher = better → Score 5' },
        ].map(m => (
          <div key={m.label} className="p-4 rounded-xl border border-white/8 bg-white/2">
            <div className={`flex items-center gap-1.5 text-xs font-semibold mb-2 ${m.color}`}><m.icon className="w-3.5 h-3.5" />{m.label}</div>
            <div className="font-mono text-xs text-white/60 mb-1">{m.formula}</div>
            <div className="text-xs text-white/35">{m.note}</div>
          </div>
        ))}
      </div>

      {/* Config */}
      <div className="glass-card rounded-2xl p-5 border border-white/8 space-y-4">
        <div className="text-xs font-semibold text-white/40 uppercase tracking-widest">Column Mapping</div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">Customer ID Column</label>
            <select value={customerCol} onChange={e => { setCustomerCol(e.target.value); setComputed(false); }} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none">
              <option value="">Select…</option>
              {idCols.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
              {(table.columns || []).map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">Date Column <span className="text-white/25">(optional)</span></label>
            <select value={dateCol} onChange={e => { setDateCol(e.target.value); setComputed(false); }} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none">
              <option value="">No date</option>
              {dateCols.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">Revenue / Value Column</label>
            <select value={revenueCol} onChange={e => { setRevenueCol(e.target.value); setComputed(false); }} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none">
              <option value="">Select…</option>
              {numCols.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
            </select>
          </div>
        </div>
        <button onClick={() => setComputed(true)} disabled={!customerCol || !revenueCol}
          className="flex items-center gap-2 px-5 py-2.5 bg-cyan-400 rounded-xl font-bold text-sm hover:bg-cyan-300 transition-all disabled:opacity-40"
          style={{ color: 'hsl(222,47%,6%)' }}>
          <Target className="w-4 h-4" /> Compute RFM Scores
        </button>
      </div>

      {rfmData.length > 0 && (
        <>
          {/* Segment summary */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {segmentSummary.map(seg => (
              <div key={seg.segment} className="p-4 rounded-2xl border text-center" style={{ background: `${seg.color}08`, borderColor: `${seg.color}25` }}>
                <div className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: seg.color }}>{seg.segment}</div>
                <div className="text-2xl font-black font-mono" style={{ color: seg.color }}>{seg.count}</div>
                <div className="text-xs text-white/35 mt-1">{fmtV(seg.totalRevenue)} total</div>
              </div>
            ))}
          </div>

          {/* Chart */}
          <div className="rounded-2xl p-5 border border-white/8">
            <div className="flex items-center justify-between mb-4">
              <div className="font-semibold text-sm">Segment Distribution by Revenue</div>
              <button onClick={downloadCSV} className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 px-2 py-1.5 border border-white/8 rounded-lg hover:bg-white/5 transition-all">
                <Download className="w-3 h-3" /> Export RFM CSV
              </button>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={segmentSummary} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="segment" tick={{ ...axisStyle, fontSize: 8 }} tickLine={false} axisLine={false} />
                <YAxis tick={axisStyle} tickFormatter={fmtV} tickLine={false} axisLine={false} width={44} />
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={v => [fmtV(v), 'Total Revenue']} />
                <Bar dataKey="totalRevenue" radius={[4, 4, 0, 0]}>
                  {segmentSummary.map((seg, i) => <Cell key={i} fill={seg.color} fillOpacity={0.85} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Customer table */}
          <div className="rounded-2xl border border-white/8 overflow-hidden">
            <div className="px-4 py-3 border-b border-white/8 bg-white/2 flex items-center justify-between">
              <span className="text-xs font-semibold text-white/60">{rfmData.length} customers scored</span>
            </div>
            <div className="overflow-auto max-h-72">
              <table className="w-full text-xs">
                <thead className="sticky top-0"><tr className="bg-navy-800 border-b border-white/8">
                  {['Customer', 'Recency (days)', 'Frequency', 'Monetary', 'R', 'F', 'M', 'Segment'].map(h => (
                    <th key={h} className="px-3 py-2.5 text-left text-white/40 font-medium whitespace-nowrap">{h}</th>
                  ))}
                </tr></thead>
                <tbody>{rfmData.slice(0, 50).map((c, i) => (
                  <tr key={i} className={`border-b border-white/5 hover:bg-white/2 ${i % 2 === 0 ? '' : 'bg-white/[0.01]'}`}>
                    <td className="px-3 py-2 font-mono text-white/70 truncate max-w-24">{c.id}</td>
                    <td className="px-3 py-2 font-mono text-white/55">{c.recency}</td>
                    <td className="px-3 py-2 font-mono text-white/55">{c.frequency}</td>
                    <td className="px-3 py-2 font-mono text-white/55">{fmtV(c.monetary)}</td>
                    <td className="px-3 py-2 font-mono text-cyan-400">{c.r_score}</td>
                    <td className="px-3 py-2 font-mono text-purple-400">{c.f_score}</td>
                    <td className="px-3 py-2 font-mono text-green-400">{c.m_score}</td>
                    <td className="px-3 py-2">
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold" style={{ background: `${c.segmentColor}18`, color: c.segmentColor }}>{c.segment}</span>
                    </td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}