/**
 * Sample Dashboards — 3 pre-built demo dashboards
 * Sales Executive · Customer Segmentation · HR Attrition
 */
import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { DEMO_DATASETS } from '@/lib/demoDatasets';
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend
} from 'recharts';
import {
  TrendingUp, TrendingDown, Users, DollarSign, Target, AlertTriangle,
  Activity, BarChart2, Brain, ChevronRight
} from 'lucide-react';
import { Link } from 'react-router-dom';

const COLORS = ['#00e5ff', '#a855f7', '#4ade80', '#f59e0b', '#f87171', '#60a5fa', '#fb923c'];

const ttStyle = { background: 'hsl(222,44%,9%)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, fontSize: 11 };
const axStyle = { fill: 'rgba(255,255,255,0.3)', fontSize: 10 };

function KPICard({ label, value, change, up, color, icon: Icon, sub }) {
  return (
    <div className="p-4 rounded-2xl border border-white/8 bg-white/2">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          {Icon && <Icon className={`w-3.5 h-3.5 ${color}`} />}
          <span className="text-xs text-white/40">{label}</span>
        </div>
        {change && (
          <span className={`text-xs font-semibold ${up ? 'text-green-400' : 'text-red-400'}`}>
            {up ? '↑' : '↓'} {change}
          </span>
        )}
      </div>
      <div className={`text-2xl font-black ${color}`}>{value}</div>
      {sub && <div className="text-xs text-white/25 mt-0.5">{sub}</div>}
    </div>
  );
}

function InsightBadge({ text, type = 'info' }) {
  const styles = {
    info: 'bg-cyan-400/8 border-cyan-400/15 text-cyan-400/80',
    warn: 'bg-amber-400/8 border-amber-400/15 text-amber-400/80',
    good: 'bg-green-400/8 border-green-400/15 text-green-400/80',
    risk: 'bg-red-400/8 border-red-400/15 text-red-400/80',
  };
  return (
    <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs ${styles[type]}`}>
      <Brain className="w-3 h-3" /> {text}
    </div>
  );
}

// ── Sales Dashboard ────────────────────────────────────────────────────────────
function SalesDashboard() {
  const ds = DEMO_DATASETS.find(d => d.id === 'sales_ecommerce');
  const rows = ds.rows;
  const [regionFilter, setRegionFilter] = useState('All');

  const filtered = regionFilter === 'All' ? rows : rows.filter(r => r.region === regionFilter);
  const regions = ['All', ...new Set(rows.map(r => r.region))];

  const totalRevenue = filtered.reduce((a, r) => a + r.revenue, 0);
  const totalProfit = filtered.reduce((a, r) => a + r.gross_profit, 0);
  const totalUnits = filtered.reduce((a, r) => a + r.units_sold, 0);
  const churnCount = filtered.filter(r => r.churn_flag === 1).length;
  const margin = Math.round(totalProfit / totalRevenue * 100);

  const byRegion = regions.filter(r => r !== 'All').map(region => ({
    region,
    revenue: Math.round(rows.filter(r2 => r2.region === region).reduce((a, r2) => a + r2.revenue, 0) / 1000),
    profit: Math.round(rows.filter(r2 => r2.region === region).reduce((a, r2) => a + r2.gross_profit, 0) / 1000),
  }));

  const byCategory = [...new Set(rows.map(r => r.category))].map(cat => ({
    category: cat.split(' ')[0],
    revenue: Math.round(rows.filter(r => r.category === cat).reduce((a, r) => a + r.revenue, 0) / 1000),
  })).sort((a, b) => b.revenue - a.revenue);

  const bySegment = [...new Set(rows.map(r => r.segment))].map(seg => ({
    name: seg,
    value: Math.round(rows.filter(r => r.segment === seg).reduce((a, r) => a + r.revenue, 0) / 1000),
  }));

  const monthlyData = [];
  const months = {};
  rows.forEach(r => {
    const m = r.date?.slice(0, 7);
    if (!months[m]) months[m] = { month: m, revenue: 0, profit: 0 };
    months[m].revenue += r.revenue;
    months[m].profit += r.gross_profit;
  });
  Object.values(months).sort((a, b) => a.month.localeCompare(b.month)).slice(-12).forEach(m => {
    monthlyData.push({ month: m.month.slice(5), revenue: Math.round(m.revenue / 1000), profit: Math.round(m.profit / 1000) });
  });

  return (
    <div className="space-y-5">
      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-white/30">Filter by Region:</span>
        {regions.map(r => (
          <button key={r} onClick={() => setRegionFilter(r)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${regionFilter === r ? 'bg-cyan-400/15 border-cyan-400/25 text-cyan-400' : 'border-white/8 text-white/35 hover:border-white/20'}`}>
            {r}
          </button>
        ))}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <KPICard label="Total Revenue" value={`$${(totalRevenue / 1000).toFixed(0)}K`} change="18.4%" up icon={DollarSign} color="text-cyan-400" sub="vs last period" />
        <KPICard label="Gross Profit" value={`$${(totalProfit / 1000).toFixed(0)}K`} change="12.1%" up icon={TrendingUp} color="text-green-400" sub={`${margin}% margin`} />
        <KPICard label="Units Sold" value={totalUnits.toLocaleString()} change="6.3%" up icon={Activity} color="text-purple-400" />
        <KPICard label="Avg Order" value={`$${Math.round(totalRevenue / filtered.length).toLocaleString()}`} icon={Target} color="text-blue-400" />
        <KPICard label="Churn Flags" value={churnCount} change={`${Math.round(churnCount / filtered.length * 100)}%`} up={false} icon={AlertTriangle} color="text-red-400" sub="at-risk orders" />
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 rounded-2xl border border-white/8 bg-white/2">
          <div className="text-xs font-semibold text-white/50 mb-3 uppercase tracking-widest">Revenue Trend (Monthly, $K)</div>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={monthlyData}>
              <defs><linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#00e5ff" stopOpacity={0.25}/><stop offset="95%" stopColor="#00e5ff" stopOpacity={0}/></linearGradient></defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="month" tick={axStyle} />
              <YAxis tick={axStyle} />
              <Tooltip contentStyle={ttStyle} />
              <Area type="monotone" dataKey="revenue" stroke="#00e5ff" strokeWidth={2} fill="url(#revGrad)" name="Revenue $K" />
              <Line type="monotone" dataKey="profit" stroke="#4ade80" strokeWidth={1.5} dot={false} name="Profit $K" />
            </AreaChart>
          </ResponsiveContainer>
          <InsightBadge text="Q4 revenue outperformed Q3 by 22% — Enterprise segment driving growth." type="good" />
        </div>

        <div className="p-4 rounded-2xl border border-white/8 bg-white/2">
          <div className="text-xs font-semibold text-white/50 mb-3 uppercase tracking-widest">Revenue by Region ($K)</div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={byRegion}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="region" tick={axStyle} />
              <YAxis tick={axStyle} />
              <Tooltip contentStyle={ttStyle} />
              <Bar dataKey="revenue" name="Revenue $K" radius={[4,4,0,0]}>
                {byRegion.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <InsightBadge text="North region leads revenue. West shows highest growth potential." type="info" />
        </div>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl border border-white/8 bg-white/2">
          <div className="text-xs font-semibold text-white/50 mb-3 uppercase tracking-widest">Revenue by Segment</div>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={bySegment} cx="50%" cy="50%" outerRadius={60} dataKey="value" nameKey="name" label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`} labelLine={false} fontSize={9}>
                {bySegment.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={ttStyle} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="md:col-span-2 p-4 rounded-2xl border border-white/8 bg-white/2">
          <div className="text-xs font-semibold text-white/50 mb-3 uppercase tracking-widest">Revenue by Product Category ($K)</div>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={byCategory} layout="vertical">
              <XAxis type="number" tick={axStyle} />
              <YAxis dataKey="category" type="category" tick={axStyle} width={80} />
              <Tooltip contentStyle={ttStyle} />
              <Bar dataKey="revenue" name="Revenue $K" fill="#00e5ff" radius={[0,4,4,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recommendations */}
      <div className="p-4 rounded-2xl border border-purple-400/15 bg-purple-400/5">
        <div className="flex items-center gap-2 mb-3 text-xs font-bold text-purple-400 uppercase tracking-widest">
          <Brain className="w-3.5 h-3.5" /> AI Recommendations
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-white/55">
          {[
            { action: 'Prioritize North region upsell campaigns', impact: 'High', effort: 'Low' },
            { action: 'Reduce SMB discount to protect margins', impact: 'Medium', effort: 'Low' },
            { action: 'Investigate October churn spike', impact: 'High', effort: 'Medium' },
          ].map((r, i) => (
            <div key={i} className="p-3 rounded-xl bg-white/3 border border-white/8">
              <div className="font-semibold text-white/70 mb-1">{r.action}</div>
              <div className="text-white/35">Impact: <span className={r.impact === 'High' ? 'text-green-400' : 'text-amber-400'}>{r.impact}</span> · Effort: {r.effort}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Customer Segmentation Dashboard ───────────────────────────────────────────
function CustomerDashboard() {
  const ds = DEMO_DATASETS.find(d => d.id === 'customer_segmentation');
  const rows = ds.rows;

  const segments = [...new Set(rows.map(r => r.segment))].map(seg => {
    const s = rows.filter(r => r.segment === seg);
    return {
      name: seg, count: s.length,
      avgLtv: Math.round(s.reduce((a, r) => a + r.ltv, 0) / s.length),
      avgChurn: Math.round(s.reduce((a, r) => a + r.churn_probability, 0) / s.length),
      avgNps: Math.round(s.reduce((a, r) => a + r.nps_score, 0) / s.length * 10) / 10,
    };
  });

  const channels = [...new Set(rows.map(r => r.acquisition_channel))].map(ch => ({
    channel: ch,
    count: rows.filter(r => r.acquisition_channel === ch).length,
    avgLtv: Math.round(rows.filter(r => r.acquisition_channel === ch).reduce((a, r) => a + r.ltv, 0) / rows.filter(r => r.acquisition_channel === ch).length),
  }));

  const totalCustomers = rows.length;
  const champions = rows.filter(r => r.segment === 'Champions').length;
  const atRisk = rows.filter(r => r.segment === 'At Risk').length;
  const avgLtv = Math.round(rows.reduce((a, r) => a + r.ltv, 0) / rows.length);
  const avgNps = Math.round(rows.reduce((a, r) => a + r.nps_score, 0) / rows.length * 10) / 10;

  const rfmBuckets = [
    { range: '80-100', count: rows.filter(r => r.rfm_score >= 80).length },
    { range: '60-79', count: rows.filter(r => r.rfm_score >= 60 && r.rfm_score < 80).length },
    { range: '40-59', count: rows.filter(r => r.rfm_score >= 40 && r.rfm_score < 60).length },
    { range: '20-39', count: rows.filter(r => r.rfm_score >= 20 && r.rfm_score < 40).length },
    { range: '0-19', count: rows.filter(r => r.rfm_score < 20).length },
  ];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <KPICard label="Total Customers" value={totalCustomers} icon={Users} color="text-amber-400" />
        <KPICard label="Champions" value={champions} change={`${Math.round(champions/totalCustomers*100)}%`} up icon={Target} color="text-cyan-400" sub="top tier" />
        <KPICard label="At Risk" value={atRisk} change={`${Math.round(atRisk/totalCustomers*100)}%`} up={false} icon={AlertTriangle} color="text-red-400" />
        <KPICard label="Avg LTV" value={`$${avgLtv.toLocaleString()}`} icon={DollarSign} color="text-green-400" />
        <KPICard label="Avg NPS" value={avgNps} icon={Target} color="text-purple-400" sub="/10 score" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 rounded-2xl border border-white/8 bg-white/2">
          <div className="text-xs font-semibold text-white/50 mb-3 uppercase tracking-widest">Avg LTV by Segment ($)</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={segments}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="name" tick={{ ...axStyle, fontSize: 9 }} angle={-20} textAnchor="end" height={50} />
              <YAxis tick={axStyle} />
              <Tooltip contentStyle={ttStyle} />
              <Bar dataKey="avgLtv" name="Avg LTV $" radius={[4,4,0,0]}>
                {segments.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <InsightBadge text="Champions have 4x the LTV of At Risk customers." type="good" />
        </div>

        <div className="p-4 rounded-2xl border border-white/8 bg-white/2">
          <div className="text-xs font-semibold text-white/50 mb-3 uppercase tracking-widest">RFM Score Distribution</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={rfmBuckets}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="range" tick={axStyle} />
              <YAxis tick={axStyle} />
              <Tooltip contentStyle={ttStyle} />
              <Bar dataKey="count" name="Customers" fill="#f59e0b" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
          <InsightBadge text="32% of customers score below 40 — immediate re-engagement needed." type="warn" />
        </div>
      </div>

      <div className="p-4 rounded-2xl border border-white/8 bg-white/2">
        <div className="text-xs font-semibold text-white/50 mb-3 uppercase tracking-widest">Churn Probability vs Avg LTV by Segment</div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead><tr className="border-b border-white/8">
              {['Segment', 'Customers', 'Avg LTV', 'Avg Churn Risk', 'Avg NPS', 'Priority'].map(h => (
                <th key={h} className="text-left px-3 py-2 text-white/30 font-mono">{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {segments.sort((a, b) => b.avgLtv - a.avgLtv).map((seg, i) => (
                <tr key={i} className="border-b border-white/5 hover:bg-white/2">
                  <td className="px-3 py-2 font-semibold text-white/75">{seg.name}</td>
                  <td className="px-3 py-2 text-white/50">{seg.count}</td>
                  <td className="px-3 py-2 text-green-400 font-mono">${seg.avgLtv.toLocaleString()}</td>
                  <td className={`px-3 py-2 font-mono ${seg.avgChurn > 50 ? 'text-red-400' : 'text-amber-400'}`}>{seg.avgChurn}%</td>
                  <td className="px-3 py-2 text-cyan-400 font-mono">{seg.avgNps}/10</td>
                  <td className="px-3 py-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs border ${seg.avgChurn > 50 ? 'bg-red-400/10 border-red-400/20 text-red-400' : seg.avgLtv > avgLtv ? 'bg-green-400/10 border-green-400/20 text-green-400' : 'bg-white/5 border-white/10 text-white/30'}`}>
                      {seg.avgChurn > 50 ? '🔴 Urgent' : seg.avgLtv > avgLtv ? '🟢 Retain' : '🟡 Monitor'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── HR Attrition Dashboard ─────────────────────────────────────────────────────
function HRDashboard() {
  const ds = DEMO_DATASETS.find(d => d.id === 'hr_attrition');
  const rows = ds.rows;

  const totalEmp = rows.length;
  const attritionCount = rows.filter(r => r.attrition === 1).length;
  const attritionRate = Math.round(attritionCount / totalEmp * 100);
  const avgSalary = Math.round(rows.reduce((a, r) => a + r.salary, 0) / totalEmp);
  const avgSatisfaction = Math.round(rows.reduce((a, r) => a + r.satisfaction_score, 0) / totalEmp * 10) / 10;
  const avgTenure = Math.round(rows.reduce((a, r) => a + r.tenure_months, 0) / totalEmp);

  const byDept = [...new Set(rows.map(r => r.department))].map(dept => {
    const d = rows.filter(r => r.department === dept);
    const at = d.filter(r => r.attrition === 1).length;
    return {
      dept: dept.slice(0, 8),
      attritionRate: Math.round(at / d.length * 100),
      avgSatisfaction: Math.round(d.reduce((a, r) => a + r.satisfaction_score, 0) / d.length * 10) / 10,
      avgSalary: Math.round(d.reduce((a, r) => a + r.salary, 0) / d.length / 1000),
      count: d.length,
    };
  }).sort((a, b) => b.attritionRate - a.attritionRate);

  const tenureBuckets = [
    { range: '0-12mo', attrition: Math.round(rows.filter(r => r.tenure_months <= 12 && r.attrition === 1).length / Math.max(1, rows.filter(r => r.tenure_months <= 12).length) * 100) },
    { range: '1-2yr', attrition: Math.round(rows.filter(r => r.tenure_months > 12 && r.tenure_months <= 24 && r.attrition === 1).length / Math.max(1, rows.filter(r => r.tenure_months > 12 && r.tenure_months <= 24).length) * 100) },
    { range: '2-5yr', attrition: Math.round(rows.filter(r => r.tenure_months > 24 && r.tenure_months <= 60 && r.attrition === 1).length / Math.max(1, rows.filter(r => r.tenure_months > 24 && r.tenure_months <= 60).length) * 100) },
    { range: '5-10yr', attrition: Math.round(rows.filter(r => r.tenure_months > 60 && r.tenure_months <= 120 && r.attrition === 1).length / Math.max(1, rows.filter(r => r.tenure_months > 60 && r.tenure_months <= 120).length) * 100) },
    { range: '10yr+', attrition: Math.round(rows.filter(r => r.tenure_months > 120 && r.attrition === 1).length / Math.max(1, rows.filter(r => r.tenure_months > 120).length) * 100) },
  ];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <KPICard label="Total Employees" value={totalEmp} icon={Users} color="text-purple-400" />
        <KPICard label="Attrition Rate" value={`${attritionRate}%`} change="2.1%" up={false} icon={TrendingDown} color="text-red-400" sub={`${attritionCount} left`} />
        <KPICard label="Avg Salary" value={`$${Math.round(avgSalary/1000)}K`} icon={DollarSign} color="text-green-400" />
        <KPICard label="Avg Satisfaction" value={avgSatisfaction} icon={Target} color="text-cyan-400" sub="/5.0 scale" />
        <KPICard label="Avg Tenure" value={`${avgTenure}mo`} icon={Activity} color="text-amber-400" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 rounded-2xl border border-white/8 bg-white/2">
          <div className="text-xs font-semibold text-white/50 mb-3 uppercase tracking-widest">Attrition Rate by Department (%)</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={byDept}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="dept" tick={axStyle} />
              <YAxis tick={axStyle} />
              <Tooltip contentStyle={ttStyle} />
              <Bar dataKey="attritionRate" name="Attrition %" radius={[4,4,0,0]}>
                {byDept.map((d, i) => <Cell key={i} fill={d.attritionRate > 20 ? '#f87171' : d.attritionRate > 10 ? '#f59e0b' : '#4ade80'} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <InsightBadge text="Sales and Engineering have highest attrition — address compensation and culture." type="risk" />
        </div>

        <div className="p-4 rounded-2xl border border-white/8 bg-white/2">
          <div className="text-xs font-semibold text-white/50 mb-3 uppercase tracking-widest">Attrition Rate by Tenure Band (%)</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={tenureBuckets}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="range" tick={axStyle} />
              <YAxis tick={axStyle} />
              <Tooltip contentStyle={ttStyle} />
              <Bar dataKey="attrition" name="Attrition %" fill="#a855f7" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
          <InsightBadge text="First-year attrition is highest — improve onboarding and early-stage support." type="warn" />
        </div>
      </div>

      <div className="p-4 rounded-2xl border border-purple-400/15 bg-purple-400/5">
        <div className="flex items-center gap-2 mb-3 text-xs font-bold text-purple-400 uppercase tracking-widest">
          <Brain className="w-3.5 h-3.5" /> HR Recommendations
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-white/55">
          {[
            { action: 'Implement 90-day onboarding reviews for new hires', impact: 'High', effort: 'Low' },
            { action: 'Increase salaries in Sales dept by 8-12%', impact: 'High', effort: 'Medium' },
            { action: 'Mandate satisfaction surveys for tenures < 12mo', impact: 'Medium', effort: 'Low' },
          ].map((r, i) => (
            <div key={i} className="p-3 rounded-xl bg-white/3 border border-white/8">
              <div className="font-semibold text-white/70 mb-1">{r.action}</div>
              <div className="text-white/35">Impact: <span className={r.impact === 'High' ? 'text-green-400' : 'text-amber-400'}>{r.impact}</span> · Effort: {r.effort}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
const DASHBOARDS = [
  { id: 'sales', label: 'Sales Executive', emoji: '📊', color: 'text-cyan-400', border: 'border-cyan-400/20', bg: 'bg-cyan-400/8', component: SalesDashboard },
  { id: 'customers', label: 'Customer Segmentation', emoji: '🎯', color: 'text-amber-400', border: 'border-amber-400/20', bg: 'bg-amber-400/8', component: CustomerDashboard },
  { id: 'hr', label: 'HR Attrition', emoji: '👥', color: 'text-purple-400', border: 'border-purple-400/20', bg: 'bg-purple-400/8', component: HRDashboard },
];

function Star({ className }) { return <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>; }

export default function SampleDashboards() {
  const [tab, setTab] = useState('sales');
  const current = DASHBOARDS.find(d => d.id === tab);
  const Component = current.component;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="border-b border-white/8 px-8 py-5 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-400/15 border border-cyan-400/25 flex items-center justify-center">
            <BarChart2 className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <h1 className="text-xl font-black">Sample Dashboards</h1>
            <p className="text-xs text-muted-foreground">3 pre-built demo dashboards · KPIs · Charts · AI Insights · Recommendations</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/demo-mode" className="text-xs px-3 py-1.5 rounded-xl bg-cyan-400/10 border border-cyan-400/20 text-cyan-400 hover:bg-cyan-400/15 transition-all">
            ← Guided Demo
          </Link>
          <Link to="/visual-builder" className="text-xs px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-white/50 hover:text-white/80 transition-all">
            Build Your Own →
          </Link>
        </div>
      </div>

      <div className="flex gap-0 border-b border-white/8 px-8 flex-shrink-0">
        {DASHBOARDS.map(d => (
          <button key={d.id} onClick={() => setTab(d.id)}
            className={`flex items-center gap-2 px-5 py-3 text-xs font-semibold border-b-2 transition-all ${tab === d.id ? `${d.border} ${d.color}` : 'border-transparent text-white/35 hover:text-white/60'}`}
            style={tab === d.id ? { borderBottomColor: 'currentColor' } : {}}>
            <span>{d.emoji}</span> {d.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-8">
        <motion.div key={tab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
          <Component />
        </motion.div>
      </div>
    </div>
  );
}