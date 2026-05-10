/**
 * DataPipelineFlow — Visual graph of data flow:
 * Ingestion → Quality → Semantic → Predictive Models → Reports/Dashboards
 */
import { useState } from 'react';
import { motion } from 'framer-motion';
import { useWorkspaceStore } from '@/lib/store';
import {
  Upload, Shield, Brain, BarChart2, FileText, ArrowRight,
  CheckCircle2, AlertTriangle, Clock, TrendingUp, Database,
  Layers, ChevronDown, ChevronUp
} from 'lucide-react';

const STAGE_COLORS = {
  ingestion:  { color: 'text-cyan-400',   bg: 'bg-cyan-400/10',   border: 'border-cyan-400/25',   glow: 'rgba(0,229,255,0.15)' },
  quality:    { color: 'text-amber-400',  bg: 'bg-amber-400/10',  border: 'border-amber-400/25',  glow: 'rgba(255,204,0,0.15)'  },
  semantic:   { color: 'text-blue-400',   bg: 'bg-blue-400/10',   border: 'border-blue-400/25',   glow: 'rgba(96,165,250,0.15)' },
  predictive: { color: 'text-purple-400', bg: 'bg-purple-400/10', border: 'border-purple-400/25', glow: 'rgba(167,139,250,0.15)'},
  output:     { color: 'text-green-400',  bg: 'bg-green-400/10',  border: 'border-green-400/25',  glow: 'rgba(74,222,128,0.15)' },
};

const PIPELINE_STAGES = [
  {
    id: 'ingestion',
    label: 'Data Ingestion',
    icon: Upload,
    description: 'Raw files uploaded and parsed (CSV, Excel, JSON)',
    steps: ['File upload & parsing', 'Schema detection', 'Column type inference', 'Row count validation'],
  },
  {
    id: 'quality',
    label: 'Quality & Governance',
    icon: Shield,
    description: 'Quality scoring, policy enforcement, anomaly flagging',
    steps: ['Null / missing value scan', 'Duplicate detection', 'Policy rule evaluation', 'Compliance check (GDPR/HIPAA)'],
  },
  {
    id: 'semantic',
    label: 'Semantic Layer',
    icon: Layers,
    description: 'KPI identification, metric definitions, relationship mapping',
    steps: ['KPI column detection', 'Date & segment tagging', 'Metric store sync', 'Relationship inference'],
  },
  {
    id: 'predictive',
    label: 'Predictive Models',
    icon: Brain,
    description: 'Forecasting, anomaly detection, ML model training',
    steps: ['Trend forecasting', 'Anomaly detection', 'ML model training', 'What-if simulation'],
  },
  {
    id: 'output',
    label: 'Reports & Dashboards',
    icon: FileText,
    description: 'AI narratives, shared reports, executive dashboards',
    steps: ['AI narrative generation', 'Chart & dashboard save', 'Report sharing & comments', 'Alert & digest delivery'],
  },
];

function StatusDot({ status }) {
  if (status === 'active') return <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse inline-block" />;
  if (status === 'warning') return <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />;
  return <span className="w-2 h-2 rounded-full bg-white/15 inline-block" />;
}

function StageNode({ stage, tableData, isLast, index }) {
  const [expanded, setExpanded] = useState(false);
  const sc = STAGE_COLORS[stage.id];
  const Icon = stage.icon;

  // Derive live status from workspace data
  const status = deriveStatus(stage.id, tableData);
  const metric = deriveMetric(stage.id, tableData);

  return (
    <div className="flex items-start gap-2">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.1 }}
        className="flex-1"
      >
        <div
          className={`rounded-2xl border p-4 cursor-pointer transition-all hover:shadow-lg ${sc.border} ${sc.bg}`}
          style={{ boxShadow: expanded ? `0 0 20px ${sc.glow}` : undefined }}
          onClick={() => setExpanded(v => !v)}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${sc.bg} border ${sc.border}`}>
                <Icon className={`w-4 h-4 ${sc.color}`} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm">{stage.label}</span>
                  <StatusDot status={status} />
                </div>
                <div className="text-xs text-white/40 mt-0.5">{stage.description}</div>
              </div>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              {metric && (
                <div className={`text-xs font-mono font-bold ${sc.color}`}>{metric}</div>
              )}
              {expanded ? <ChevronUp className="w-3.5 h-3.5 text-white/30" /> : <ChevronDown className="w-3.5 h-3.5 text-white/30" />}
            </div>
          </div>

          {/* Expanded steps */}
          {expanded && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
              className="mt-3 pt-3 border-t border-white/8 grid grid-cols-2 gap-1.5">
              {stage.steps.map((step, i) => (
                <div key={step} className="flex items-center gap-2 text-xs text-white/55">
                  <CheckCircle2 className={`w-3 h-3 flex-shrink-0 ${status !== 'idle' ? sc.color : 'text-white/15'}`} />
                  {step}
                </div>
              ))}
            </motion.div>
          )}
        </div>
      </motion.div>

      {/* Arrow connector */}
      {!isLast && (
        <div className="flex flex-col items-center justify-center self-stretch pt-4 px-1">
          <div className="h-full flex items-center">
            <ArrowRight className="w-5 h-5 text-white/15" />
          </div>
        </div>
      )}
    </div>
  );
}

function deriveStatus(stageId, tableData) {
  if (!tableData) return 'idle';
  if (stageId === 'ingestion') return tableData.rowCount > 0 ? 'active' : 'idle';
  if (stageId === 'quality') return tableData.qualityScore != null ? (tableData.qualityScore < 70 ? 'warning' : 'active') : 'idle';
  if (stageId === 'semantic') return tableData.primaryMetric ? 'active' : 'idle';
  if (stageId === 'predictive') return tableData.rowCount > 50 ? 'active' : 'idle';
  if (stageId === 'output') return tableData.qualityScore > 0 ? 'active' : 'idle';
  return 'idle';
}

function deriveMetric(stageId, tableData) {
  if (!tableData) return null;
  if (stageId === 'ingestion') return tableData.rowCount ? `${tableData.rowCount.toLocaleString()} rows` : null;
  if (stageId === 'quality') return tableData.qualityScore != null ? `${tableData.qualityScore}% score` : null;
  if (stageId === 'semantic') return tableData.primaryMetric ? tableData.primaryMetric : null;
  if (stageId === 'predictive') return tableData.rowCount > 50 ? 'Ready' : 'Insufficient data';
  if (stageId === 'output') return null;
  return null;
}

export default function DataPipelineFlow() {
  const { tables, getActiveTable } = useWorkspaceStore();
  const activeTable = getActiveTable();

  const allTables = tables || [];
  const hasData = allTables.length > 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-black mb-1">Data Pipeline Flow</h2>
        <p className="text-sm text-muted-foreground">
          Visual map of how data moves from raw ingestion through quality checks, semantic enrichment, predictive models, and into final reports.
        </p>
      </div>

      {/* Active dataset indicator */}
      {activeTable ? (
        <div className="flex items-center gap-3 p-3 rounded-xl bg-cyan-400/5 border border-cyan-400/15 text-xs">
          <Database className="w-4 h-4 text-cyan-400 flex-shrink-0" />
          <span className="text-white/60">Active dataset:</span>
          <span className="text-cyan-400 font-semibold">{activeTable.name}</span>
          <span className="text-white/30">·</span>
          <span className="text-white/50">{activeTable.rowCount?.toLocaleString()} rows · {activeTable.qualityScore ?? '—'}% quality</span>
        </div>
      ) : (
        <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-400/5 border border-amber-400/15 text-xs text-amber-400/80">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          No dataset loaded — upload data in the Workspace to see live pipeline status.
        </div>
      )}

      {/* Pipeline stages — horizontal scroll on mobile, flex row on desktop */}
      <div className="overflow-x-auto pb-2">
        <div className="flex items-start gap-0 min-w-max md:min-w-0 md:grid md:grid-cols-5">
          {PIPELINE_STAGES.map((stage, i) => (
            <StageNode
              key={stage.id}
              stage={stage}
              tableData={activeTable}
              isLast={i === PIPELINE_STAGES.length - 1}
              index={i}
            />
          ))}
        </div>
      </div>

      {/* Per-table summary table */}
      {allTables.length > 1 && (
        <div className="glass-card rounded-2xl border border-white/8 overflow-hidden">
          <div className="px-5 py-3 border-b border-white/8 text-xs font-semibold text-white/50 uppercase tracking-widest">All Datasets in Pipeline</div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/5 bg-white/2">
                  {['Dataset', 'Rows', 'Quality', 'Primary KPI', 'Status'].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left text-white/35 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {allTables.map((t, i) => (
                  <tr key={t.id || i} className="border-b border-white/5 hover:bg-white/2">
                    <td className="px-4 py-2.5 font-semibold text-white/70">{t.name}</td>
                    <td className="px-4 py-2.5 font-mono text-white/50">{t.rowCount?.toLocaleString() ?? '—'}</td>
                    <td className="px-4 py-2.5">
                      <span className={`font-mono font-bold ${(t.qualityScore ?? 0) >= 80 ? 'text-green-400' : 'text-amber-400'}`}>
                        {t.qualityScore ?? '—'}%
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-white/50">{t.primaryMetric ?? '—'}</td>
                    <td className="px-4 py-2.5">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${t.rowCount > 0 ? 'bg-green-400/10 text-green-400' : 'bg-white/5 text-white/30'}`}>
                        {t.rowCount > 0 ? 'Active' : 'Empty'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs text-white/40">
        <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-green-400" /> Active stage</div>
        <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-400" /> Needs attention</div>
        <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-white/15" /> Not started</div>
        <div className="ml-auto text-white/25">Click any stage to expand its steps</div>
      </div>
    </div>
  );
}