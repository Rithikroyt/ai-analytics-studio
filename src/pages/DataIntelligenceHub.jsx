/**
 * Data Intelligence Hub — Phase 1: Enterprise Data Engineering Mastery
 * Data lineage, quality contracts, medallion architecture view, schema registry,
 * data profiling, and enterprise governance in one unified hub.
 * Think: Azure Purview + Databricks + dbt combined
 */
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import {
  Database, GitBranch, Shield, CheckCircle2, AlertTriangle, Clock,
  BarChart2, FileText, Layers, Search, RefreshCw, ChevronRight,
  Activity, TrendingUp, Zap, Eye, Lock, Unlock, Filter,
  ArrowRight, Star, AlertCircle, Circle
} from 'lucide-react';

const MEDALLION_LAYERS = [
  {
    name: 'Bronze', color: '#cd7f32', icon: Database,
    desc: 'Raw ingested data — immutable, append-only',
    tables: ['raw_sales_2024', 'raw_hr_dump', 'raw_events_stream', 'raw_crm_export'],
    stats: { tables: 4, rows: '2.4M', size: '1.2GB', freshness: '5 min' }
  },
  {
    name: 'Silver', color: '#c0c0c0', icon: Layers,
    desc: 'Cleansed, deduplicated, typed, enriched',
    tables: ['sales_cleaned', 'employees_enriched', 'events_sessionized', 'customers_deduped'],
    stats: { tables: 4, rows: '2.1M', size: '0.9GB', freshness: '15 min' }
  },
  {
    name: 'Gold', color: '#ffd700', icon: Star,
    desc: 'Business-ready, KPI-aligned, optimized',
    tables: ['revenue_mart', 'headcount_kpis', 'funnel_metrics', 'churn_cohorts'],
    stats: { tables: 4, rows: '180K', size: '120MB', freshness: '1 hr' }
  },
];

const QUALITY_RULES = [
  { name: 'Completeness', status: 'pass', score: 98, desc: 'No critical nulls in required fields' },
  { name: 'Uniqueness', status: 'pass', score: 99.7, desc: 'Duplicate rate <0.3%' },
  { name: 'Freshness', status: 'warn', score: 78, desc: 'Some sources >24hr old' },
  { name: 'Referential Integrity', status: 'pass', score: 100, desc: 'All foreign keys resolved' },
  { name: 'Value Range', status: 'warn', score: 85, desc: '3 columns with outliers detected' },
  { name: 'Schema Drift', status: 'pass', score: 100, desc: 'No unexpected schema changes' },
  { name: 'Volume Anomaly', status: 'fail', score: 42, desc: 'events_stream row count -68% vs baseline' },
  { name: 'Timeliness', status: 'pass', score: 94, desc: 'SLA met within 1hr window' },
];

const LINEAGE_NODES = [
  { id: 'src1', label: 'Salesforce CRM',   type: 'source',  x: 10, y: 20 },
  { id: 'src2', label: 'HR System',        type: 'source',  x: 10, y: 50 },
  { id: 'src3', label: 'Event Stream',     type: 'source',  x: 10, y: 80 },
  { id: 'b1',   label: 'raw_sales',        type: 'bronze',  x: 30, y: 20 },
  { id: 'b2',   label: 'raw_hr',           type: 'bronze',  x: 30, y: 50 },
  { id: 'b3',   label: 'raw_events',       type: 'bronze',  x: 30, y: 80 },
  { id: 's1',   label: 'sales_cleaned',    type: 'silver',  x: 55, y: 25 },
  { id: 's2',   label: 'employees_merged', type: 'silver',  x: 55, y: 60 },
  { id: 'g1',   label: 'revenue_mart',     type: 'gold',    x: 78, y: 20 },
  { id: 'g2',   label: 'funnel_metrics',   type: 'gold',    x: 78, y: 55 },
  { id: 'g3',   label: 'churn_cohorts',    type: 'gold',    x: 78, y: 80 },
  { id: 'rpt1', label: 'Exec Dashboard',   type: 'report',  x: 95, y: 30 },
  { id: 'rpt2', label: 'Churn Report',     type: 'report',  x: 95, y: 65 },
];

const EDGES = [
  ['src1','b1'],['src2','b2'],['src3','b3'],
  ['b1','s1'],['b2','s1'],['b2','s2'],['b3','s2'],
  ['s1','g1'],['s1','g2'],['s2','g2'],['s2','g3'],
  ['g1','rpt1'],['g2','rpt1'],['g3','rpt2'],
];

const NODE_COLORS = { source: '#00e5ff', bronze: '#cd7f32', silver: '#c0c0c0', gold: '#ffd700', report: '#a855f7' };

function StatusBadge({ status }) {
  const cfg = {
    pass: { color: '#4caf50', label: 'Pass', icon: CheckCircle2 },
    warn: { color: '#ffcc02', label: 'Warn', icon: AlertTriangle },
    fail: { color: '#ef4444', label: 'Fail', icon: AlertCircle },
  }[status] || { color: '#888', label: '—', icon: Circle };
  const Icon = cfg.icon;
  return (
    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-semibold"
      style={{ color: cfg.color, background: `${cfg.color}18`, border: `1px solid ${cfg.color}30` }}>
      <Icon className="w-2.5 h-2.5" /> {cfg.label}
    </span>
  );
}

function LineageGraph() {
  const [hovered, setHovered] = useState(null);
  const W = 600, H = 200;

  const getPos = (pct_x, pct_y) => ({
    x: (pct_x / 100) * W,
    y: (pct_y / 100) * H,
  });

  return (
    <div className="overflow-x-auto">
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ minWidth: 500, maxHeight: 220 }}>
        {/* Edges */}
        {EDGES.map(([from, to]) => {
          const f = LINEAGE_NODES.find(n => n.id === from);
          const t = LINEAGE_NODES.find(n => n.id === to);
          if (!f || !t) return null;
          const fp = getPos(f.x, f.y);
          const tp = getPos(t.x, t.y);
          const mx = (fp.x + tp.x) / 2;
          return (
            <path key={`${from}-${to}`}
              d={`M ${fp.x+28} ${fp.y} C ${mx} ${fp.y}, ${mx} ${tp.y}, ${tp.x-28} ${tp.y}`}
              fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth={1.5} strokeDasharray="4 3" />
          );
        })}
        {/* Nodes */}
        {LINEAGE_NODES.map(n => {
          const p = getPos(n.x, n.y);
          const col = NODE_COLORS[n.type] || '#888';
          const isHov = hovered === n.id;
          return (
            <g key={n.id} transform={`translate(${p.x - 26}, ${p.y - 12})`}
              onMouseEnter={() => setHovered(n.id)} onMouseLeave={() => setHovered(null)}
              style={{ cursor: 'pointer' }}>
              <rect width={52} height={24} rx={6}
                fill={isHov ? `${col}30` : `${col}14`}
                stroke={col} strokeOpacity={isHov ? 0.9 : 0.4} strokeWidth={1.2} />
              <text x={26} y={15} textAnchor="middle" fill={col}
                fontSize={7.5} fontWeight={600} opacity={0.9}>{n.label.slice(0,11)}</text>
            </g>
          );
        })}
        {/* Legend */}
        {Object.entries(NODE_COLORS).map(([type, col], i) => (
          <g key={type} transform={`translate(${10 + i * 115}, 185)`}>
            <rect width={12} height={12} rx={3} fill={`${col}25`} stroke={col} strokeWidth={1} />
            <text x={16} y={10} fill="rgba(255,255,255,0.4)" fontSize={8} textTransform="capitalize">{type}</text>
          </g>
        ))}
      </svg>
    </div>
  );
}

const TABS = ['Medallion Layers', 'Data Quality', 'Lineage Graph', 'Schema Registry'];

export default function DataIntelligenceHub() {
  const [tab, setTab] = useState('Medallion Layers');
  const [contracts, setContracts] = useState([]);
  const [lineage, setLineage] = useState([]);

  useEffect(() => {
    base44.entities.DataContract.list('-updated_date', 10).then(r => setContracts(r || [])).catch(() => {});
    base44.entities.DataLineage.list('-created_date', 20).then(r => setLineage(r || [])).catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-white/8 px-8 py-5 flex items-center justify-between"
        style={{ background: 'linear-gradient(135deg, rgba(0,229,255,0.04) 0%, rgba(205,127,50,0.04) 100%)' }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-400/15 border border-amber-400/25 flex items-center justify-center">
            <GitBranch className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h1 className="text-xl font-black">Data Intelligence Hub</h1>
            <p className="text-xs text-muted-foreground">Medallion Architecture · Data Lineage · Quality Contracts · Schema Registry</p>
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

        {/* Medallion Layers */}
        {tab === 'Medallion Layers' && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {MEDALLION_LAYERS.map((layer) => (
                <motion.div key={layer.name} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  className="glass-card rounded-2xl p-5 border border-white/8 hover:border-white/15 transition-all">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                      style={{ background: `${layer.color}20`, border: `1px solid ${layer.color}40` }}>
                      <layer.icon className="w-4.5 h-4.5" style={{ color: layer.color }} />
                    </div>
                    <div>
                      <div className="font-bold text-sm" style={{ color: layer.color }}>{layer.name} Layer</div>
                      <div className="text-xs text-white/35">{layer.desc}</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    {Object.entries(layer.stats).map(([k, v]) => (
                      <div key={k} className="bg-white/3 rounded-lg p-2">
                        <div className="text-xs text-white/30 capitalize">{k}</div>
                        <div className="text-sm font-bold font-mono" style={{ color: layer.color }}>{v}</div>
                      </div>
                    ))}
                  </div>
                  <div className="space-y-1">
                    {layer.tables.map(t => (
                      <div key={t} className="flex items-center gap-2 text-xs text-white/45 px-2 py-1.5 rounded-lg bg-white/3 hover:bg-white/5 transition-all">
                        <Database className="w-3 h-3 flex-shrink-0" style={{ color: layer.color }} />
                        {t}
                      </div>
                    ))}
                  </div>
                </motion.div>
              ))}
            </div>
            {/* Pipeline flow */}
            <div className="glass-card rounded-2xl p-5 border border-white/8">
              <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
                <ArrowRight className="w-4 h-4 text-amber-400" /> Data Pipeline Flow
              </h3>
              <div className="flex items-center gap-2 overflow-x-auto pb-2">
                {['Ingest (CSV/API/DB)', 'Bronze (Raw Store)', 'Silver (Clean+Enrich)', 'Gold (KPI Mart)', 'Semantic Layer', 'Analytics / Reports'].map((step, i, arr) => (
                  <div key={step} className="flex items-center gap-2 flex-shrink-0">
                    <div className="px-3 py-2 rounded-xl bg-white/4 border border-white/8 text-xs font-semibold text-white/60 whitespace-nowrap">{step}</div>
                    {i < arr.length - 1 && <ArrowRight className="w-3.5 h-3.5 text-white/20 flex-shrink-0" />}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Data Quality */}
        {tab === 'Data Quality' && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4 mb-4">
              {[
                { label: 'Overall DQ Score', value: '86%', color: '#4caf50', status: 'Healthy' },
                { label: 'Rules Passing', value: `${QUALITY_RULES.filter(r => r.status === 'pass').length}/${QUALITY_RULES.length}`, color: '#00e5ff', status: 'Active' },
                { label: 'Critical Failures', value: QUALITY_RULES.filter(r => r.status === 'fail').length, color: '#ef4444', status: 'Requires Attention' },
              ].map(s => (
                <div key={s.label} className="glass-card rounded-2xl p-4 border border-white/8 text-center">
                  <div className="text-xs text-white/35 mb-1">{s.label}</div>
                  <div className="text-3xl font-black font-mono mb-1" style={{ color: s.color }}>{s.value}</div>
                  <div className="text-xs text-white/30">{s.status}</div>
                </div>
              ))}
            </div>
            <div className="glass-card rounded-2xl border border-white/8 overflow-hidden">
              <table className="w-full text-xs">
                <thead><tr className="border-b border-white/8 bg-white/3">
                  <th className="px-4 py-3 text-left text-white/35 font-semibold">Rule</th>
                  <th className="px-4 py-3 text-left text-white/35 font-semibold">Status</th>
                  <th className="px-4 py-3 text-left text-white/35 font-semibold">Score</th>
                  <th className="px-4 py-3 text-left text-white/35 font-semibold">Description</th>
                </tr></thead>
                <tbody>
                  {QUALITY_RULES.map(r => (
                    <tr key={r.name} className="border-b border-white/5 hover:bg-white/2 transition-colors">
                      <td className="px-4 py-3 font-semibold text-white/75">{r.name}</td>
                      <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-20 h-1.5 bg-white/8 rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${r.score}%`, background: r.status === 'pass' ? '#4caf50' : r.status === 'warn' ? '#ffcc02' : '#ef4444' }} />
                          </div>
                          <span className="font-mono text-white/45">{r.score}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-white/45">{r.desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Lineage Graph */}
        {tab === 'Lineage Graph' && (
          <div className="space-y-4">
            <div className="glass-card rounded-2xl p-5 border border-white/8">
              <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
                <GitBranch className="w-4 h-4 text-amber-400" /> End-to-End Data Lineage
              </h3>
              <LineageGraph />
            </div>
            {lineage.length > 0 && (
              <div className="glass-card rounded-2xl border border-white/8 overflow-hidden">
                <div className="px-4 py-3 border-b border-white/8"><span className="text-sm font-bold">Registered Lineage Records</span></div>
                <table className="w-full text-xs">
                  <thead><tr className="border-b border-white/8 bg-white/3">
                    <th className="px-4 py-3 text-left text-white/35">Source</th>
                    <th className="px-4 py-3 text-left text-white/35">Target</th>
                    <th className="px-4 py-3 text-left text-white/35">Transform</th>
                  </tr></thead>
                  <tbody>
                    {lineage.map((l, i) => (
                      <tr key={i} className="border-b border-white/5 hover:bg-white/2">
                        <td className="px-4 py-2.5 text-cyan-400">{l.sourceTable}</td>
                        <td className="px-4 py-2.5 text-purple-400">{l.targetTable}</td>
                        <td className="px-4 py-2.5 text-white/45 capitalize">{l.transformationType}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Schema Registry */}
        {tab === 'Schema Registry' && (
          <div className="space-y-4">
            <div className="glass-card rounded-2xl p-5 border border-white/8">
              <h3 className="text-sm font-bold mb-4">Column Classification Registry</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { type: 'Currency Measures', color: '#4caf50', examples: ['revenue', 'cost', 'salary', 'price', 'margin'], count: 12 },
                  { type: 'Count Metrics', color: '#00e5ff', examples: ['headcount', 'quantity', 'total_orders', 'visits'], count: 8 },
                  { type: 'Date / Time', color: '#ffcc02', examples: ['created_at', 'order_date', 'period', 'month'], count: 6 },
                  { type: 'Categorical', color: '#a855f7', examples: ['department', 'region', 'status', 'segment', 'type'], count: 15 },
                  { type: 'Rate / Ratio', color: '#ff6b35', examples: ['conversion_rate', 'churn_pct', 'margin_%'], count: 7 },
                  { type: 'Identifiers', color: '#888', examples: ['customer_id', 'order_id', 'uuid', 'employee_id'], count: 9 },
                  { type: 'Geo / Location', color: '#60a5fa', examples: ['country', 'state', 'city', 'region', 'zip'], count: 4 },
                  { type: 'Rank / Score', color: '#f472b6', examples: ['nps_score', 'rating', 'rank', 'percentile'], count: 5 },
                ].map(t => (
                  <div key={t.type} className="bg-white/3 rounded-xl p-3 border border-white/6">
                    <div className="text-xs font-bold mb-1" style={{ color: t.color }}>{t.type}</div>
                    <div className="text-lg font-black font-mono mb-2" style={{ color: t.color }}>{t.count}</div>
                    <div className="space-y-0.5">
                      {t.examples.slice(0, 3).map(e => (
                        <div key={e} className="text-xs text-white/30 font-mono">{e}</div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}