/**
 * DataLineageView — Visual graph showing how raw data flows into reports & dashboard metrics
 */
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useWorkspaceStore } from '@/lib/store';
import {
  Database, BarChart2, FileText, Zap, GitBranch, ArrowRight,
  Loader2, RefreshCw, AlertTriangle, CheckCircle2, Eye, Filter
} from 'lucide-react';

const NODE_CONFIGS = {
  source: { icon: Database, color: '#00e5ff', label: 'Source Table' },
  transform: { icon: GitBranch, color: '#7b2fff', label: 'Transformation' },
  metric: { icon: Zap, color: '#4caf50', label: 'Metric / KPI' },
  report: { icon: FileText, color: '#ffcc02', label: 'Report' },
  dashboard: { icon: BarChart2, color: '#ff2d7a', label: 'Dashboard' },
};

const TRANSFORM_LABELS = {
  direct: 'Direct',
  aggregation: 'Aggregate',
  join: 'JOIN',
  formula: 'Formula',
  filter: 'Filter',
  ml_feature: 'ML Feature',
};

function NodeBadge({ type, label, subtitle, onClick, selected, critical }) {
  const cfg = NODE_CONFIGS[type] || NODE_CONFIGS.source;
  const Icon = cfg.icon;
  return (
    <button onClick={onClick}
      className={`flex flex-col items-center p-3 rounded-2xl border transition-all min-w-[90px] text-center ${
        selected ? 'shadow-lg' : critical ? 'border-amber-400/25 bg-amber-400/5' : 'border-white/8 bg-white/3 hover:border-white/15'
      }`}
      style={selected ? { borderColor: `${cfg.color}50`, background: `${cfg.color}12`, boxShadow: `0 0 16px ${cfg.color}20` } : {}}>
      <div className="w-8 h-8 rounded-xl flex items-center justify-center mb-1.5"
        style={{ background: `${cfg.color}20`, border: `1px solid ${cfg.color}30` }}>
        <Icon className="w-4 h-4" style={{ color: cfg.color }} />
      </div>
      <div className="text-xs font-semibold leading-tight">{label}</div>
      {subtitle && <div className="text-xs text-white/30 mt-0.5 leading-tight">{subtitle}</div>}
      {critical && <div className="text-xs text-amber-400 mt-1 flex items-center gap-0.5"><AlertTriangle className="w-2.5 h-2.5" /> critical</div>}
    </button>
  );
}

function FlowArrow({ label }) {
  return (
    <div className="flex flex-col items-center gap-0.5 flex-shrink-0">
      <div className="h-px w-8 bg-white/15" />
      <ArrowRight className="w-4 h-4 text-white/25 -mx-2" />
      {label && <div className="text-xs text-white/25 whitespace-nowrap px-1 py-0.5 bg-white/5 rounded-full">{label}</div>}
    </div>
  );
}

function LineageRow({ flow, selected, onSelect }) {
  return (
    <div className="flex items-start gap-2 overflow-x-auto pb-1">
      {/* Source */}
      <NodeBadge type="source" label={flow.sourceTable} subtitle={flow.sourceColumn}
        selected={selected === `src_${flow.sourceTable}`} onClick={() => onSelect(`src_${flow.sourceTable}`)}
        critical={flow.critical} />
      <FlowArrow label={TRANSFORM_LABELS[flow.transformationType] || flow.transformationType} />
      {/* Target (metric or report) */}
      <NodeBadge
        type={flow.targetTable?.toLowerCase().includes('report') ? 'report' : flow.targetTable?.toLowerCase().includes('kpi') || flow.targetColumn ? 'metric' : 'dashboard'}
        label={flow.targetTable} subtitle={flow.targetColumn}
        selected={selected === `tgt_${flow.targetTable}`} onClick={() => onSelect(`tgt_${flow.targetTable}`)} />
      {/* Downstream reports */}
      {flow.impactedReports?.length > 0 && (
        <>
          <FlowArrow label="used in" />
          <div className="flex gap-2">
            {flow.impactedReports.slice(0, 3).map(r => (
              <NodeBadge key={r} type="report" label={r}
                selected={selected === `rep_${r}`} onClick={() => onSelect(`rep_${r}`)} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function DataLineageView() {
  const { tables, savedCharts } = useWorkspaceStore();
  const [lineageData, setLineageData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(null);
  const [filterType, setFilterType] = useState('all');
  const [showImpact, setShowImpact] = useState(false);

  const buildLineage = async () => {
    setLoading(true);
    try {
      const metrics = await base44.entities.GovernedMetric.list('-created_date', 20).catch(() => []);
      const reports = await base44.entities.SharedReport.list('-created_date', 20).catch(() => []);
      const lineageRecords = await base44.entities.DataLineage.list('-created_date', 100).catch(() => []);

      // If we have stored lineage records, use those; otherwise build from scratch via backend
      if (lineageRecords.length > 0) {
        const nodes = buildNodesFromRecords(lineageRecords, tables);
        const edges = buildEdgesFromRecords(lineageRecords);
        setLineageData({ flows: lineageRecords, nodes, edges, source: 'stored' });
      } else {
        const res = await base44.functions.invoke('buildDataLineage', { tables, metrics, reports });
        const data = res.data;
        // Convert backend nodes/edges into flow objects for our view
        const flows = edgesToFlows(data?.edges || [], data?.nodes || []);
        setLineageData({ flows, nodes: data?.nodes || [], edges: data?.edges || [], criticalPath: data?.criticalPath || [], impactMap: data?.impactMap || {}, source: 'generated' });
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  // Auto-build if we have tables
  useEffect(() => {
    if (tables?.length > 0) buildLineage();
  }, []);

  const buildNodesFromRecords = (records, tables) => {
    const seen = new Set();
    const nodes = [];
    records.forEach(r => {
      if (!seen.has(r.sourceTable)) { seen.add(r.sourceTable); nodes.push({ id: r.sourceTable, label: r.sourceTable, type: 'source' }); }
      if (!seen.has(r.targetTable)) { seen.add(r.targetTable); nodes.push({ id: r.targetTable, label: r.targetTable, type: r.targetTable?.includes('KPI') ? 'metric' : 'report' }); }
    });
    return nodes;
  };

  const buildEdgesFromRecords = (records) => records.map(r => ({ from: r.sourceTable, to: r.targetTable, label: r.transformationType || 'direct' }));

  const edgesToFlows = (edges, nodes) => {
    return edges.slice(0, 20).map((e, i) => ({
      id: String(i),
      sourceTable: e.from,
      targetTable: e.to,
      transformationType: e.label || 'direct',
      impactedReports: [],
    }));
  };

  const flows = lineageData?.flows || [];
  const filteredFlows = filterType === 'all' ? flows : flows.filter(f => f.transformationType === filterType);

  // Impact panel for selected node
  const impactedBy = selected ? flows.filter(f =>
    `tgt_${f.targetTable}` === selected || `src_${f.sourceTable}` === selected
  ) : [];

  const transformTypes = [...new Set(flows.map(f => f.transformationType).filter(Boolean))];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-black">Data Lineage Graph</h2>
          <p className="text-sm text-muted-foreground">Trace how raw data flows from source tables into reports, KPIs, and dashboards</p>
        </div>
        <button onClick={buildLineage} disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-green-400/10 border border-green-400/20 text-green-400 text-xs font-semibold rounded-xl hover:bg-green-400/15 transition-all disabled:opacity-50">
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          {loading ? 'Building…' : 'Rebuild Graph'}
        </button>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3">
        {Object.entries(NODE_CONFIGS).map(([type, cfg]) => {
          const Icon = cfg.icon;
          return (
            <div key={type} className="flex items-center gap-1.5 text-xs text-white/40">
              <Icon className="w-3.5 h-3.5" style={{ color: cfg.color }} />
              {cfg.label}
            </div>
          );
        })}
      </div>

      {/* Filters */}
      {transformTypes.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="w-3.5 h-3.5 text-white/30" />
          <button onClick={() => setFilterType('all')}
            className={`text-xs px-3 py-1 rounded-lg border transition-all ${filterType === 'all' ? 'bg-white/10 border-white/20 text-white' : 'border-white/8 text-white/35 hover:text-white/60'}`}>
            All
          </button>
          {transformTypes.map(t => (
            <button key={t} onClick={() => setFilterType(t)}
              className={`text-xs px-3 py-1 rounded-lg border transition-all ${filterType === t ? 'bg-white/10 border-white/20 text-white' : 'border-white/8 text-white/35 hover:text-white/60'}`}>
              {TRANSFORM_LABELS[t] || t}
            </button>
          ))}
        </div>
      )}

      {/* Graph */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <Loader2 className="w-8 h-8 text-green-400 animate-spin mx-auto mb-3" />
            <div className="text-sm text-muted-foreground">Building lineage graph…</div>
          </div>
        </div>
      )}

      {!loading && filteredFlows.length === 0 && (
        <div className="text-center py-16 border border-white/5 rounded-2xl">
          <GitBranch className="w-10 h-10 text-white/10 mx-auto mb-3" />
          <h3 className="font-semibold mb-1">No lineage data</h3>
          <p className="text-sm text-muted-foreground mb-4">Load a dataset and define metrics to visualize data flow.</p>
          <button onClick={buildLineage} className="text-xs px-4 py-2 bg-green-400/10 border border-green-400/20 text-green-400 rounded-xl hover:bg-green-400/15 transition-all">
            Generate Lineage
          </button>
        </div>
      )}

      {!loading && filteredFlows.length > 0 && (
        <div className="glass-card rounded-2xl border border-white/8 p-5 space-y-4">
          <div className="text-xs text-white/30 uppercase tracking-widest mb-1">{filteredFlows.length} data flows · click any node for impact</div>
          {filteredFlows.map((flow, i) => (
            <motion.div key={flow.id || i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}>
              <LineageRow flow={flow} selected={selected} onSelect={setSelected} />
              {i < filteredFlows.length - 1 && <div className="border-b border-white/5 mt-3" />}
            </motion.div>
          ))}
        </div>
      )}

      {/* Impact Panel */}
      <AnimatePresence>
        {selected && impactedBy.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
            className="glass-card rounded-2xl border border-cyan-400/20 bg-cyan-400/3 p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-sm font-bold text-cyan-400">
                <Eye className="w-4 h-4" /> Impact Analysis — {selected.replace(/^(src_|tgt_|rep_)/, '')}
              </div>
              <button onClick={() => setSelected(null)} className="text-white/30 hover:text-white/60 text-xs">✕</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {impactedBy.map((f, i) => (
                <div key={i} className="flex items-center gap-2 text-xs p-2 rounded-lg bg-white/3 border border-white/8">
                  <ArrowRight className="w-3 h-3 text-cyan-400 flex-shrink-0" />
                  <span className="text-white/60">{f.sourceTable}</span>
                  <span className="text-white/25 px-1">→</span>
                  <span className="text-cyan-400">{f.targetTable}</span>
                  {f.transformationType && <span className="ml-auto text-white/25 bg-white/5 px-1.5 py-0.5 rounded-full">{TRANSFORM_LABELS[f.transformationType] || f.transformationType}</span>}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Summary stats */}
      {lineageData && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Source Tables', value: new Set(flows.map(f => f.sourceTable)).size, color: 'text-cyan-400' },
            { label: 'Transformations', value: flows.length, color: 'text-purple-400' },
            { label: 'Reports/KPIs', value: new Set(flows.map(f => f.targetTable)).size, color: 'text-amber-400' },
            { label: 'Critical Paths', value: lineageData.criticalPath?.length || flows.filter(f => f.critical).length || 0, color: 'text-red-400' },
          ].map(s => (
            <div key={s.label} className="glass-card rounded-xl p-3 border border-white/8 text-center">
              <div className={`text-xl font-black font-mono ${s.color}`}>{s.value}</div>
              <div className="text-xs text-white/35 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}