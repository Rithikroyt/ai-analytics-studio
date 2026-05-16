/**
 * Strategic KPI Board — Phase 3 + 4: CXO Balanced Scorecard + OKR Tracking
 * Framework: Balanced Scorecard (Kaplan/Norton) + OKR (Google/Intel model) + SMART goals
 * Think: Tableau + Power BI Executive + Workboard combined
 */
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import {
  Target, TrendingUp, TrendingDown, BarChart2, Users, DollarSign,
  Shield, CheckCircle2, Circle, AlertTriangle, Plus, Edit3,
  Zap, ArrowUpRight, ArrowDownRight, Clock, Star, Activity,
  ChevronDown, ChevronUp, RefreshCw, Brain
} from 'lucide-react';

const BSC_PERSPECTIVES = [
  {
    name: 'Financial', color: '#4caf50', icon: DollarSign,
    desc: 'How do we look to shareholders?',
    kpis: [
      { name: 'ARR Growth', target: 25, actual: 18.4, unit: '%', trend: 'up' },
      { name: 'Gross Margin', target: 75, actual: 71.4, unit: '%', trend: 'up' },
      { name: 'CAC Payback', target: 12, actual: 14.2, unit: 'months', trend: 'down', lowerIsBetter: true },
      { name: 'Net Revenue Retention', target: 120, actual: 118, unit: '%', trend: 'up' },
    ]
  },
  {
    name: 'Customer', color: '#00e5ff', icon: Users,
    desc: 'How do customers see us?',
    kpis: [
      { name: 'NPS Score', target: 75, actual: 72, unit: 'pts', trend: 'up' },
      { name: 'CSAT', target: 4.5, actual: 4.3, unit: '/5', trend: 'up' },
      { name: 'Churn Rate', target: 2.5, actual: 3.8, unit: '%', trend: 'down', lowerIsBetter: true },
      { name: 'Activation Rate', target: 85, actual: 79, unit: '%', trend: 'up' },
    ]
  },
  {
    name: 'Internal Process', color: '#a855f7', icon: Activity,
    desc: 'What must we excel at?',
    kpis: [
      { name: 'Sales Cycle Days', target: 30, actual: 38, unit: 'days', trend: 'down', lowerIsBetter: true },
      { name: 'MQL→SQL Conv.', target: 30, actual: 24.8, unit: '%', trend: 'down' },
      { name: 'Support SLA', target: 95, actual: 91, unit: '%', trend: 'up' },
      { name: 'Deploy Frequency', target: 14, actual: 18, unit: '/month', trend: 'up' },
    ]
  },
  {
    name: 'Learning & Growth', color: '#ffcc02', icon: Brain,
    desc: 'How will we sustain excellence?',
    kpis: [
      { name: 'Employee NPS', target: 50, actual: 44, unit: 'pts', trend: 'up' },
      { name: 'Training Hours', target: 40, actual: 28, unit: 'hrs/yr', trend: 'down' },
      { name: 'Feature Adoption', target: 70, actual: 58, unit: '%', trend: 'up' },
      { name: 'AI Usage Rate', target: 80, actual: 72, unit: '%', trend: 'up' },
    ]
  },
];

const OKRS = [
  {
    objective: 'Achieve market leadership in Mid-Market segment',
    owner: 'CEO', quarter: 'Q2 2026', progress: 62,
    keyResults: [
      { kr: 'Grow MRR from $1.2M to $1.8M', progress: 71 },
      { kr: 'Close 50 Mid-Market accounts (>500 seats)', progress: 58 },
      { kr: 'Achieve NPS ≥75 in Mid-Market segment', progress: 60 },
    ]
  },
  {
    objective: 'Reduce operational costs by 20% through automation',
    owner: 'COO', quarter: 'Q2 2026', progress: 44,
    keyResults: [
      { kr: 'Automate 15 manual reporting workflows', progress: 67 },
      { kr: 'Reduce support ticket volume by 30%', progress: 40 },
      { kr: 'Deploy AI-assisted QA in all product teams', progress: 25 },
    ]
  },
  {
    objective: 'Build a world-class data-driven culture',
    owner: 'CDO', quarter: 'Q2 2026', progress: 55,
    keyResults: [
      { kr: 'All teams use OmniData dashboards weekly', progress: 78 },
      { kr: 'Train 100% of staff on AI Analytics tools', progress: 44 },
      { kr: 'Launch governed metric store with 50+ KPIs', progress: 45 },
    ]
  },
];

function KPICard({ kpi, perspectiveColor }) {
  const pct = Math.min(100, (kpi.actual / kpi.target) * 100);
  const onTrack = kpi.lowerIsBetter ? kpi.actual <= kpi.target : kpi.actual >= kpi.target * 0.9;
  const overAchieve = kpi.lowerIsBetter ? kpi.actual < kpi.target * 0.85 : kpi.actual >= kpi.target;
  const statusColor = overAchieve ? '#4caf50' : onTrack ? '#ffcc02' : '#ef4444';
  const gap = kpi.lowerIsBetter
    ? kpi.actual > kpi.target ? `+${(kpi.actual - kpi.target).toFixed(1)}${kpi.unit} over` : `On target`
    : kpi.actual >= kpi.target ? `+${(kpi.actual - kpi.target).toFixed(1)} ahead` : `${(kpi.target - kpi.actual).toFixed(1)}${kpi.unit} gap`;

  return (
    <div className="bg-white/3 rounded-xl p-3 border border-white/6 hover:border-white/12 transition-all">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-semibold text-white/70">{kpi.name}</span>
        {kpi.trend === 'up' ? <ArrowUpRight className="w-3 h-3 text-green-400" /> : <ArrowDownRight className="w-3 h-3 text-red-400" />}
      </div>
      <div className="flex items-baseline gap-1 mb-2">
        <span className="text-xl font-black font-mono" style={{ color: statusColor }}>{kpi.actual}</span>
        <span className="text-xs text-white/30">{kpi.unit}</span>
        <span className="text-xs text-white/25 ml-1">/ {kpi.target}{kpi.unit} target</span>
      </div>
      <div className="w-full h-1.5 bg-white/8 rounded-full overflow-hidden mb-1">
        <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, pct)}%`, background: statusColor }} />
      </div>
      <div className="text-xs" style={{ color: statusColor }}>{gap}</div>
    </div>
  );
}

function OKRCard({ okr }) {
  const [open, setOpen] = useState(true);
  const statusColor = okr.progress >= 70 ? '#4caf50' : okr.progress >= 40 ? '#ffcc02' : '#ef4444';
  return (
    <div className="glass-card rounded-2xl border border-white/8 overflow-hidden">
      <button onClick={() => setOpen(v => !v)} className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/2 transition-colors">
        <div className="flex items-start gap-3 text-left">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
            style={{ background: `${statusColor}18`, border: `1px solid ${statusColor}30` }}>
            <Target className="w-4 h-4" style={{ color: statusColor }} />
          </div>
          <div>
            <div className="font-bold text-sm text-white/90 mb-0.5">{okr.objective}</div>
            <div className="text-xs text-white/30">{okr.owner} · {okr.quarter}</div>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0 ml-4">
          <div className="text-right">
            <div className="text-lg font-black font-mono" style={{ color: statusColor }}>{okr.progress}%</div>
            <div className="text-xs text-white/25">progress</div>
          </div>
          {open ? <ChevronUp className="w-4 h-4 text-white/30" /> : <ChevronDown className="w-4 h-4 text-white/30" />}
        </div>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
            <div className="px-5 pb-4 space-y-2 border-t border-white/5">
              {okr.keyResults.map((kr, i) => (
                <div key={i} className="flex items-center gap-3 text-xs py-2">
                  <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" style={{ color: kr.progress >= 70 ? '#4caf50' : kr.progress >= 40 ? '#ffcc02' : '#ef4444' }} />
                  <span className="flex-1 text-white/60">{kr.kr}</span>
                  <div className="w-20 h-1.5 bg-white/8 rounded-full overflow-hidden flex-shrink-0">
                    <div className="h-full rounded-full" style={{ width: `${kr.progress}%`, background: kr.progress >= 70 ? '#4caf50' : kr.progress >= 40 ? '#ffcc02' : '#ef4444' }} />
                  </div>
                  <span className="w-8 text-right font-mono text-white/35">{kr.progress}%</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const TABS = ['Balanced Scorecard', 'OKR Tracker', 'KPI Trends', 'Benchmark'];

export default function StrategicKPIBoard() {
  const [tab, setTab] = useState('Balanced Scorecard');
  const [metrics, setMetrics] = useState([]);

  useEffect(() => {
    base44.entities.GovernedMetric.list('-created_date', 20).then(r => setMetrics(r || [])).catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-white/8 px-8 py-5 flex items-center justify-between"
        style={{ background: 'linear-gradient(135deg, rgba(76,175,80,0.05) 0%, rgba(0,229,255,0.04) 100%)' }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-green-400/15 border border-green-400/25 flex items-center justify-center">
            <Target className="w-5 h-5 text-green-400" />
          </div>
          <div>
            <h1 className="text-xl font-black">Strategic KPI Board</h1>
            <p className="text-xs text-muted-foreground">Balanced Scorecard · OKR Tracker · Benchmark Analytics · CXO Decision Layer</p>
          </div>
        </div>
        <div className="flex gap-0.5 p-1 bg-white/5 rounded-xl border border-white/8">
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all ${tab === t ? 'bg-white/10 text-white/90' : 'text-white/35 hover:text-white/65'}`}>
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="p-6 max-w-[1400px] mx-auto space-y-6">

        {/* Balanced Scorecard */}
        {tab === 'Balanced Scorecard' && (
          <div className="space-y-5">
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/3 border border-white/8 text-xs text-white/50">
              <Shield className="w-3.5 h-3.5 text-cyan-400" />
              Framework: Kaplan & Norton Balanced Scorecard — 4 perspectives, 16 KPIs, Q2 2026
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {BSC_PERSPECTIVES.map(p => (
                <motion.div key={p.name} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  className="glass-card rounded-2xl border border-white/8 overflow-hidden">
                  <div className="px-5 py-4 border-b border-white/8 flex items-center gap-3"
                    style={{ background: `${p.color}08` }}>
                    <p.icon className="w-4 h-4" style={{ color: p.color }} />
                    <div>
                      <div className="font-bold text-sm" style={{ color: p.color }}>{p.name} Perspective</div>
                      <div className="text-xs text-white/35">{p.desc}</div>
                    </div>
                  </div>
                  <div className="p-4 grid grid-cols-2 gap-2">
                    {p.kpis.map(kpi => <KPICard key={kpi.name} kpi={kpi} perspectiveColor={p.color} />)}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* OKR Tracker */}
        {tab === 'OKR Tracker' && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/3 border border-white/8 text-xs text-white/50">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              OKR Framework (Google / Intel model) — Q2 2026 · 3 Objectives · 9 Key Results
            </div>
            {OKRS.map((okr, i) => <OKRCard key={i} okr={okr} />)}
          </div>
        )}

        {/* KPI Trends */}
        {tab === 'KPI Trends' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {BSC_PERSPECTIVES.flatMap(p => p.kpis).slice(0, 8).map((kpi, i) => {
              const data = Array.from({ length: 12 }, (_, j) => ({
                v: Math.max(0, kpi.actual * (0.75 + (j / 12) * 0.35 + (Math.random() - 0.5) * 0.1))
              }));
              const max = Math.max(...data.map(d => d.v));
              return (
                <div key={kpi.name} className="glass-card rounded-2xl p-4 border border-white/8">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-bold">{kpi.name}</span>
                    <span className="text-xs font-mono text-cyan-400">{kpi.actual}{kpi.unit}</span>
                  </div>
                  <div className="flex items-end gap-1 h-14">
                    {data.map((d, j) => (
                      <div key={j} className="flex-1 rounded-t-sm transition-all"
                        style={{ height: `${(d.v / max) * 100}%`, background: j === 11 ? '#00e5ff' : 'rgba(0,229,255,0.25)' }} />
                    ))}
                  </div>
                  <div className="flex justify-between text-xs text-white/20 mt-1">
                    <span>Jan</span><span>Jun</span><span>Dec</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Benchmark */}
        {tab === 'Benchmark' && (
          <div className="space-y-4">
            <div className="px-4 py-3 rounded-xl bg-white/3 border border-white/8 text-xs text-white/50">
              Industry benchmark data sourced from Bessemer Venture Partners State of the Cloud 2025 report
            </div>
            <div className="glass-card rounded-2xl border border-white/8 overflow-hidden">
              <table className="w-full text-xs">
                <thead><tr className="border-b border-white/8 bg-white/3">
                  <th className="px-4 py-3 text-left text-white/35">KPI</th>
                  <th className="px-4 py-3 text-right text-white/35">Our Performance</th>
                  <th className="px-4 py-3 text-right text-white/35">Industry Median</th>
                  <th className="px-4 py-3 text-right text-white/35">Top Quartile</th>
                  <th className="px-4 py-3 text-left text-white/35">Position</th>
                </tr></thead>
                <tbody>
                  {[
                    { kpi: 'ARR Growth %', ours: 18.4, median: 15, top: 35 },
                    { kpi: 'Gross Margin %', ours: 71.4, median: 68, top: 78 },
                    { kpi: 'NRR %', ours: 118, median: 110, top: 130 },
                    { kpi: 'CAC Payback (mo)', ours: 14.2, median: 18, top: 10, lowerBetter: true },
                    { kpi: 'Churn Rate %', ours: 3.8, median: 5, top: 2, lowerBetter: true },
                    { kpi: 'LTV/CAC', ours: 6.2, median: 4.5, top: 8 },
                  ].map(r => {
                    const isTop = r.lowerBetter ? r.ours <= r.top : r.ours >= r.top;
                    const isAbove = r.lowerBetter ? r.ours <= r.median : r.ours >= r.median;
                    return (
                      <tr key={r.kpi} className="border-b border-white/5 hover:bg-white/2">
                        <td className="px-4 py-3 font-semibold text-white/75">{r.kpi}</td>
                        <td className="px-4 py-3 text-right font-mono font-bold" style={{ color: isAbove ? '#4caf50' : '#ef4444' }}>{r.ours}</td>
                        <td className="px-4 py-3 text-right font-mono text-white/40">{r.median}</td>
                        <td className="px-4 py-3 text-right font-mono text-amber-400">{r.top}</td>
                        <td className="px-4 py-3">
                          <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                            style={{ color: isTop ? '#4caf50' : isAbove ? '#ffcc02' : '#ef4444', background: `${isTop ? '#4caf50' : isAbove ? '#ffcc02' : '#ef4444'}15`, border: `1px solid ${isTop ? '#4caf50' : isAbove ? '#ffcc02' : '#ef4444'}30` }}>
                            {isTop ? '🏆 Top Quartile' : isAbove ? '✅ Above Median' : '⚠ Below Median'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}