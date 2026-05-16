/**
 * Data Lineage Viewer — Complete path from raw sources through transformations to dashboards
 */
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useWorkspaceStore } from '@/lib/store';
import {
  GitBranch, Database, ArrowRight, Layers, Star, BarChart2,
  Shield, RefreshCw, Search, Filter, Eye, AlertTriangle, CheckCircle2, Plus
} from 'lucide-react';

const LAYER_META = {
  source:  { color: '#00e5ff', label: 'Source System', icon: Database },
  bronze:  { color: '#cd7f32', label: 'Bronze (Raw)',   icon: Database },
  silver:  { color: '#c0c0c0', label: 'Silver (Clean)', icon: Layers },
  gold:    { color: '#ffd700', label: 'Gold (KPI Mart)',icon: Star },
  semantic:{ color: '#a855f7', label: 'Semantic Layer', icon: Layers },
  report:  { color: '#ff6b35', label: 'Dashboard/Report', icon: BarChart2 },
};

const STATIC_NODES = [
  { id: 'src_crm',  label: 'Salesforce CRM',      layer: 'source',   x: 5,  y: 15 },
  { id: 'src_hr',   label: 'HR System (BambooHR)', layer: 'source',   x: 5,  y: 45 },
  { id: 'src_evt',  label: 'Event Stream (Kafka)', layer: 'source',   x: 5,  y: 75 },
  { id: 'b_sales',  label: 'raw_sales_2024',       layer: 'bronze',   x: 22, y: 10 },
  { id: 'b_hr',     label: 'raw_hr_dump',          layer: 'bronze',   x: 22, y: 35 },
  { id: 'b_events', label: 'raw_events_stream',    layer: 'bronze',   x: 22, y: 60 },
  { id: 'b_crm',    label: 'raw_crm_export',       layer: 'bronze',   x: 22, y: 82 },
  { id: 's_sales',  label: 'sales_cleaned',        layer: 'silver',   x: 42, y: 15 },
  { id: 's_emp',    label: 'employees_enriched',   layer: 'silver',   x: 42, y: 42 },
  { id: 's_sess',   label: 'events_sessionized',   layer: 'silver',   x: 42, y: 68 },
  { id: 'g_rev',    label: 'revenue_mart',         layer: 'gold',     x: 62, y: 12 },
  { id: 'g_head',   label: 'headcount_kpis',       layer: 'gold',     x: 62, y: 35 },
  { id: 'g_funnel', label: 'funnel_metrics',       layer: 'gold',     x: 62, y: 58 },
  { id: 'g_churn',  label: 'churn_cohorts',        layer: 'gold',     x: 62, y: 80 },
  { id: 'sem_rev',  label: 'Revenue KPIs',         layer: 'semantic', x: 78, y: 20 },
  { id: 'sem_ops',  label: 'Ops KPIs',             layer: 'semantic', x: 78, y: 55 },
  { id: 'rpt_exec', label: 'Exec Dashboard',       layer: 'report',   x: 93, y: 12 },
  { id: 'rpt_churn',label: 'Churn Report',         layer: 'report',   x: 93, y: 35 },
  { id: 'rpt_hrm',  label: 'HR Analytics',         layer: 'report',   x: 93, y: 58 },
  { id: 'rpt_ops',  label: 'Ops Dashboard',        layer: 'report',   x: 93, y: 78 },
];

const STATIC_EDGES = [
  ['src_crm','b_sales'],['src_crm','b_crm'],
  ['src_hr','b_hr'],
  ['src_evt','b_events'],
  ['b_sales','s_sales'],['b_crm','s_sales'],
  ['b_hr','s_emp'],['b_events','s_sess'],
  ['s_sales','g_rev'],['s_sales','g_funnel'],
  ['s_emp','g_head'],['s_sess','g_funnel'],['s_sess','g_churn'],
  ['g_rev','sem_rev'],['g_funnel','sem_rev'],['g_funnel','sem_ops'],
  ['g_head','sem_ops'],['g_churn','sem_ops'],
  ['sem_rev','rpt_exec'],['sem_rev','rpt_churn'],
  ['sem_ops','rpt_hrm'],['sem_ops','rpt_ops'],['sem_ops','rpt_exec'],
];

const TRANSFORM_MAP = {
  'b_sales-s_sales':  'JOIN + DEDUP + type cast',
  'b_crm-s_sales':    'UNION + NULL fill',
  'b_hr-s_emp':       'Enrich + Normalize dept names',
  'b_events-s_sess':  'Sessionize (30min gap)',
  's_sales-g_rev':    'SUM(revenue) GROUP BY period',
  's_emp-g_head':     'COUNT(distinct) + JOIN salary',
  's_sess-g_funnel':  'Funnel stage aggregation',
  's_sess-g_churn':   'Cohort retention formula',
};

function ImpactSidebar({ node, edges, nodes }) {
  if (!node) return (
    <div className="text-center text-white/20 text-sm py-10">
      <Eye className="w-8 h-8 mx-auto mb-2 opacity-30" />
      Click any node to see lineage details
    </div>
  );
  const meta = LAYER_META[node.layer];
  const downstreamEdges = edges.filter(([f]) => f === node.id);
  const upstreamEdges = edges.filter(([, t]) => t === node.id);
  const downstreamNodes = downstreamEdges.map(([, t]) => nodes.find(n => n.id === t)).filter(Boolean);
  const upstreamNodes = upstreamEdges.map(([f]) => nodes.find(n => n.id === f)).filter(Boolean);

  return (
    <div className="space-y-4">
      <div className="rounded-xl p-4 border" style={{ background: `${meta.color}08`, borderColor: `${meta.color}25` }}>
        <div className="text-xs font-bold mb-1" style={{ color: meta.color }}>{meta.label}</div>
        <div className="font-bold text-sm text-white/90">{node.label}</div>
      </div>

      {upstreamNodes.length > 0 && (
        <div>
          <div className="text-xs text-white/30 uppercase tracking-widest mb-2">← Upstream Sources</div>
          {upstreamNodes.map(n => {
            const t = TRANSFORM_MAP[`${n.id}-${node.id}`];
            return (
              <div key={n.id} className="flex items-start gap-2 text-xs py-1.5 border-b border-white/5">
                <div className="w-2 h-2 rounded-full mt-1 flex-shrink-0" style={{ background: LAYER_META[n.layer]?.color }} />
                <div>
                  <div className="text-white/60">{n.label}</div>
                  {t && <div className="text-white/25 font-mono mt-0.5">{t}</div>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {downstreamNodes.length > 0 && (
        <div>
          <div className="text-xs text-white/30 uppercase tracking-widest mb-2">→ Downstream Consumers</div>
          {downstreamNodes.map(n => (
            <div key={n.id} className="flex items-center gap-2 text-xs py-1.5 border-b border-white/5">
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: LAYER_META[n.layer]?.color }} />
              <span className="text-white/60">{n.label}</span>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-1">
        <div className="text-xs text-white/30 uppercase tracking-widest mb-2">Quality Checks</div>
        {[
          { label: 'Schema validated', pass: true },
          { label: 'No null violations', pass: node.layer !== 'bronze' },
          { label: 'Row count stable', pass: true },
          { label: 'SLA met (<1hr)', pass: node.layer === 'gold' || node.layer === 'report' },
        ].map((c, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            {c.pass ? <CheckCircle2 className="w-3 h-3 text-green-400" /> : <AlertTriangle className="w-3 h-3 text-amber-400" />}
            <span className={c.pass ? 'text-white/50' : 'text-amber-400/70'}>{c.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DataLineageViewer() {
  const [selected, setSelected] = useState(null);
  const [hoveredEdge, setHoveredEdge] = useState(null);
  const [filter, setFilter] = useState('all');
  const [dbLineage, setDbLineage] = useState([]);

  useEffect(() => {
    base44.entities.DataLineage.list('-created_date', 30).then(r => setDbLineage(r || [])).catch(() => {});
  }, []);

  const W = 700, H = 280;
  const getPos = (px, py) => ({ x: (px / 100) * W, y: (py / 100) * H });

  const visibleNodes = filter === 'all' ? STATIC_NODES : STATIC_NODES.filter(n => n.layer === filter);
  const visibleIds = new Set(visibleNodes.map(n => n.id));
  const visibleEdges = STATIC_EDGES.filter(([f, t]) => visibleIds.has(f) && visibleIds.has(t));

  const selectedNode = STATIC_NODES.find(n => n.id === selected);

  // Highlight connected nodes
  const connectedIds = selected ? new Set([
    selected,
    ...STATIC_EDGES.filter(([f, t]) => f === selected || t === selected).flatMap(([f, t]) => [f, t])
  ]) : null;

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-white/8 px-8 py-5 flex items-center justify-between"
        style={{ background: 'linear-gradient(135deg, rgba(205,127,50,0.05) 0%, rgba(0,229,255,0.04) 100%)' }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-400/15 border border-amber-400/25 flex items-center justify-center">
            <GitBranch className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h1 className="text-xl font-black">Data Lineage Viewer</h1>
            <p className="text-xs text-muted-foreground">End-to-end lineage · Source → Bronze → Silver → Gold → Semantic → Reports</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {Object.entries(LAYER_META).map(([key, meta]) => (
            <button key={key} onClick={() => setFilter(filter === key ? 'all' : key)}
              className="text-xs px-2.5 py-1 rounded-lg transition-all capitalize"
              style={filter === key ? { background: `${meta.color}20`, color: meta.color, border: `1px solid ${meta.color}40` } : { color: 'rgba(255,255,255,0.3)', border: '1px solid transparent' }}>
              {key}
            </button>
          ))}
        </div>
      </div>

      <div className="p-6 max-w-[1400px] mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
          {/* Main graph */}
          <div className="lg:col-span-3 glass-card rounded-2xl border border-white/8 p-5">
            <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
              <GitBranch className="w-4 h-4 text-amber-400" /> End-to-End Data Lineage Graph
            </h3>
            <div className="overflow-x-auto">
              <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ minWidth: 540 }}>
                <defs>
                  <marker id="arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                    <path d="M0,0 L0,6 L6,3 z" fill="rgba(255,255,255,0.15)" />
                  </marker>
                </defs>

                {/* Edges */}
                {visibleEdges.map(([from, to]) => {
                  const f = STATIC_NODES.find(n => n.id === from);
                  const t = STATIC_NODES.find(n => n.id === to);
                  if (!f || !t) return null;
                  const fp = getPos(f.x, f.y);
                  const tp = getPos(t.x, t.y);
                  const mx = (fp.x + tp.x) / 2;
                  const isHighlighted = connectedIds && connectedIds.has(from) && connectedIds.has(to);
                  const key = `${from}-${to}`;
                  return (
                    <path key={key}
                      d={`M ${fp.x + 30} ${fp.y} C ${mx} ${fp.y}, ${mx} ${tp.y}, ${tp.x - 30} ${tp.y}`}
                      fill="none"
                      stroke={isHighlighted ? '#00e5ff' : hoveredEdge === key ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.1)'}
                      strokeWidth={isHighlighted ? 2 : 1.2}
                      strokeDasharray={isHighlighted ? '0' : '5 4'}
                      markerEnd="url(#arrow)"
                      onMouseEnter={() => setHoveredEdge(key)}
                      onMouseLeave={() => setHoveredEdge(null)}
                      style={{ cursor: 'pointer', transition: 'all 0.2s' }}
                    />
                  );
                })}

                {/* Transform labels on edge hover */}
                {hoveredEdge && TRANSFORM_MAP[hoveredEdge] && (() => {
                  const [from, to] = hoveredEdge.split('-');
                  const f = STATIC_NODES.find(n => n.id === from);
                  const t = STATIC_NODES.find(n => n.id === to);
                  if (!f || !t) return null;
                  const fp = getPos(f.x, f.y);
                  const tp = getPos(t.x, t.y);
                  const mx = (fp.x + tp.x) / 2;
                  const my = (fp.y + tp.y) / 2 - 10;
                  return (
                    <g>
                      <rect x={mx - 55} y={my - 10} width={110} height={18} rx={4} fill="rgba(8,14,30,0.92)" stroke="rgba(255,255,255,0.15)" strokeWidth={1} />
                      <text x={mx} y={my + 3} textAnchor="middle" fill="rgba(255,255,255,0.55)" fontSize={7.5}>{TRANSFORM_MAP[hoveredEdge]}</text>
                    </g>
                  );
                })()}

                {/* Layer labels */}
                {Object.entries(LAYER_META).map(([key, meta]) => {
                  const xPcts = { source: 5, bronze: 22, silver: 42, gold: 62, semantic: 78, report: 93 };
                  const xPct = xPcts[key];
                  if (!xPct) return null;
                  return (
                    <text key={key} x={(xPct / 100) * W} y={8} textAnchor="middle" fill={meta.color}
                      fontSize={7.5} fontWeight={700} opacity={0.7}>
                      {meta.label}
                    </text>
                  );
                })}

                {/* Nodes */}
                {visibleNodes.map(n => {
                  const p = getPos(n.x, n.y);
                  const meta = LAYER_META[n.layer];
                  const col = meta?.color || '#888';
                  const isSelected = selected === n.id;
                  const isDimmed = connectedIds && !connectedIds.has(n.id);
                  return (
                    <g key={n.id} transform={`translate(${p.x - 28}, ${p.y - 12})`}
                      onClick={() => setSelected(selected === n.id ? null : n.id)}
                      style={{ cursor: 'pointer', opacity: isDimmed ? 0.25 : 1, transition: 'opacity 0.2s' }}>
                      <rect width={56} height={22} rx={6}
                        fill={isSelected ? `${col}30` : `${col}12`}
                        stroke={col} strokeOpacity={isSelected ? 1 : 0.4} strokeWidth={isSelected ? 1.5 : 1}
                        style={{ filter: isSelected ? `drop-shadow(0 0 6px ${col}60)` : 'none' }} />
                      <text x={28} y={14} textAnchor="middle" fill={col}
                        fontSize={7.2} fontWeight={600} opacity={0.9}>
                        {n.label.slice(0, 13)}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-white/5">
              {Object.entries(LAYER_META).map(([key, meta]) => (
                <div key={key} className="flex items-center gap-1.5 text-xs text-white/40">
                  <div className="w-3 h-3 rounded-sm" style={{ background: `${meta.color}30`, border: `1px solid ${meta.color}60` }} />
                  {meta.label}
                </div>
              ))}
            </div>
          </div>

          {/* Details panel */}
          <div className="glass-card rounded-2xl border border-white/8 p-5">
            <h3 className="text-sm font-bold mb-4">Node Details</h3>
            <ImpactSidebar node={selectedNode} edges={STATIC_EDGES} nodes={STATIC_NODES} />
          </div>
        </div>

        {/* DB lineage records */}
        {dbLineage.length > 0 && (
          <div className="mt-5 glass-card rounded-2xl border border-white/8 overflow-hidden">
            <div className="px-5 py-4 border-b border-white/8 flex items-center gap-2">
              <Database className="w-4 h-4 text-cyan-400" />
              <h3 className="font-bold text-sm">Registered Lineage Records ({dbLineage.length})</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead><tr className="border-b border-white/8 bg-white/3">
                  <th className="px-4 py-3 text-left text-white/35 font-semibold">Source Table</th>
                  <th className="px-4 py-3 text-left text-white/35 font-semibold">Target Table</th>
                  <th className="px-4 py-3 text-left text-white/35 font-semibold">Transform</th>
                  <th className="px-4 py-3 text-left text-white/35 font-semibold">Impacted Reports</th>
                </tr></thead>
                <tbody>
                  {dbLineage.slice(0, 10).map((l, i) => (
                    <tr key={i} className="border-b border-white/5 hover:bg-white/2">
                      <td className="px-4 py-2.5 text-cyan-400 font-mono">{l.sourceTable}</td>
                      <td className="px-4 py-2.5 text-purple-400 font-mono">{l.targetTable}</td>
                      <td className="px-4 py-2.5 text-white/45 capitalize">{l.transformationType}</td>
                      <td className="px-4 py-2.5 text-white/30">{l.impactedReports?.join(', ') || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}